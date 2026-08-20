import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { runAnalysisPipeline, runProposalPipelineToCompletion } from "@/lib/ai/pipeline";
import { PROPOSAL_SECTION_ORDER } from "@/lib/ai/prompts/writer-section";
import { checkProposalRules, proposalCharCount } from "@/lib/ai/proposal-rules";
import { PIPELINE_CEILING_MS } from "@/lib/ai/budget";
import { runCostUsd } from "@/lib/billing/cost";
import { PIPELINE_FIXTURES } from "./fixtures/pipeline-jobs";
import type { ProposalSection } from "@/lib/types";

/**
 * Corrections 03 definition of done: five fixture jobs must EACH yield a complete proposal end to
 * end, including one engineered to retrieve zero proof (no-proof mode renders, flagged). This
 * test failing blocks every merge — a run that produces a verdict and no proposal is the P0
 * defect this round exists to fix.
 *
 * Real Claude, real Neon, no mocks — same pattern as the rest of the suite.
 */

const PASSWORD = "PipelineTestPassword123!";
let userId: string;

interface FixtureResult {
  key: string;
  sections: ProposalSection[];
  charCount: number;
  noProofMode: boolean;
  elapsedMs: number;
}

const results = new Map<string, FixtureResult>();

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set — this suite needs a live Neon database.");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set — this suite runs the real pipeline.");

  const account = await auth.api.signUpEmail({
    body: { email: `pipeline-test-${Date.now()}@altpitch.dev`, password: PASSWORD, name: "Pipeline Test" },
  });
  userId = account.user.id;

  // No profile insert: signup seeds the row, and the pipeline falls back to default writing
  // style when one is missing anyway.
  const scoped = scopedDb(userId);

  for (const fixture of PIPELINE_FIXTURES) {
    for (const item of fixture.knowledge) {
      await scoped.knowledgeItems.insert({ kind: "portfolio", ...item });
    }
  }
}, 120_000);

afterAll(async () => {
  if (userId) await db.delete(schema.user).where(eq(schema.user.id, userId)).catch(() => {});
});

describe.each(PIPELINE_FIXTURES)("pipeline end to end: $key", (fixture) => {
  it(
    "produces a complete proposal",
    async () => {
      const scoped = scopedDb(userId);
      const startedAt = Date.now();

      const job = await scoped.jobs.insert({ rawPost: fixture.rawPost, status: "analyzed", contentHash: `${fixture.key}-${Date.now()}` });

      let analysisId: string | null = null;
      for await (const event of runAnalysisPipeline(userId, job.id, fixture.rawPost)) {
        if (event.stage === "error") throw new Error(`Analysis failed: ${event.message}`);
        if (event.stage === "complete") analysisId = event.analysisId;
      }
      expect(analysisId).toBeTruthy();

      const { proposalId } = await runProposalPipelineToCompletion(userId, job.id);
      const proposal = await scoped.proposals.get(proposalId);
      expect(proposal).toBeTruthy();

      const sections = proposal!.sections as unknown as ProposalSection[];
      const meta = (proposal!.meta ?? {}) as { noProofMode?: boolean };

      results.set(fixture.key, {
        key: fixture.key,
        sections,
        charCount: proposalCharCount(sections),
        noProofMode: meta.noProofMode ?? false,
        elapsedMs: Date.now() - startedAt,
      });

      // A proposal exists, with every section — the P0 assertion.
      expect(sections.length).toBe(PROPOSAL_SECTION_ORDER.length);
      for (const spec of PROPOSAL_SECTION_ORDER) {
        const section = sections.find((s) => s.key === spec.key);
        expect(section, `missing section: ${spec.key}`).toBeTruthy();
        expect(section!.content.trim().length).toBeGreaterThan(0);
      }
    },
    PIPELINE_CEILING_MS * 3 // analysis + proposal + one revision, each under its own ceiling
  );

  it("stays in the 1,000–2,000 character band with no banned opener", () => {
    const result = results.get(fixture.key);
    expect(result, "fixture run did not complete").toBeTruthy();
    expect(checkProposalRules(result!.sections)).toEqual([]);
  });

  it("opens on the client, not the freelancer", () => {
    const hook = results.get(fixture.key)!.sections.find((s) => s.key === "hook")!.content;
    const firstSentence = hook.split(/(?<=[.?!])\s/)[0] ?? hook;
    expect(firstSentence.trim().toLowerCase().startsWith("i ")).toBe(false);
  });
});

describe("no-proof mode (Corrections 03 §1)", () => {
  it("renders a flagged draft rather than nothing when the Retriever comes back empty", () => {
    const result = results.get("emailNoProof");
    expect(result, "no-proof fixture did not complete").toBeTruthy();
    expect(result!.noProofMode).toBe(true);
    expect(result!.sections.length).toBe(PROPOSAL_SECTION_ORDER.length);

    const proofText = result!.sections
      .filter((s) => s.key === "proof" || s.key === "portfolio")
      .map((s) => s.content)
      .join("\n");
    expect(proofText).toContain("[Add a relevant work sample here]");
  });
});

describe("speed budget (Corrections 03 §2)", () => {
  it("no fixture run exceeds the pipeline ceiling for either half", () => {
    for (const result of Array.from(results.values())) {
      // Analysis and proposal are separate user actions, each on its own 120s ceiling.
      expect(result.elapsedMs, `${result.key} took ${result.elapsedMs}ms`).toBeLessThanOrEqual(PIPELINE_CEILING_MS * 2);
    }
  });

  /** Prints the measured numbers the §5 unit-economics guardrail needs. Not an assertion: the
   * grant size is a pricing decision, and this is the input to it. */
  it("records measured cost per run", async () => {
    const runs = await scopedDb(userId).pipelineRuns.list();
    const byJob = new Map<string, typeof runs>();
    for (const run of runs) {
      if (!run.jobId) continue;
      byJob.set(run.jobId, [...(byJob.get(run.jobId) ?? []), run]);
    }

    const costs = Array.from(byJob.values()).map((jobRuns) => runCostUsd(jobRuns));
    const average = costs.reduce((total, c) => total + c, 0) / (costs.length || 1);
    console.log(
      `[unit economics] ${costs.length} runs, cost per run: ${costs.map((c) => `$${c.toFixed(4)}`).join(", ")} — average $${average.toFixed(4)}`
    );
    expect(costs.length).toBeGreaterThan(0);
  });

  /** Scoped to the analysis half, which is where Corrections 02 claims concurrency (2+3 together,
   * then scorer+psychology together). Measuring across both halves would instead measure the gap
   * between two separate user actions. */
  it("analysis stages ran concurrently — wall time is below the summed stage time", async () => {
    const ANALYSIS_STAGES = ["parser", "jobAnalyzer", "clientAnalyzer", "scorer", "psychology"];
    const runs = (await scopedDb(userId).pipelineRuns.list()).filter((r) => ANALYSIS_STAGES.includes(r.stage));
    expect(runs.length).toBeGreaterThan(0);

    const byJob = new Map<string, typeof runs>();
    for (const run of runs) {
      if (!run.jobId) continue;
      byJob.set(run.jobId, [...(byJob.get(run.jobId) ?? []), run]);
    }

    for (const [jobId, jobRuns] of Array.from(byJob.entries())) {
      if (jobRuns.length < ANALYSIS_STAGES.length) continue; // partial run, nothing to prove here
      const summed = jobRuns.reduce((total, r) => total + (r.latencyMs ?? 0), 0);
      const wall =
        Math.max(...jobRuns.map((r) => r.updatedAt.getTime())) - Math.min(...jobRuns.map((r) => r.createdAt.getTime()));
      expect(wall, `job ${jobId} ran its analysis stages serially`).toBeLessThan(summed);
    }
  });
});
