import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

/**
 * Corrections 02 §2's RLS suite, ported to the Neon migration's Layer-1 authorization model
 * (see ALTPITCH_MIGRATION_NEON.md, "Authorization: replacing RLS properly"). Postgres RLS
 * policies are gone; scopedDb(userId) is the thing that now has to prove it can't leak another
 * user's rows. Two real accounts (created via Better Auth's own signUpEmail, in-process — no
 * HTTP server needed since scopedDb takes a plain userId string), every owner-scoped table,
 * cross-user reads/writes must fail.
 */

const PASSWORD = "IsolationTestPassword123!";

let userAId: string;
let userBId: string;
let jobAId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set — this suite needs a live Neon database, no mock exists.");
  }

  const suffix = Date.now();
  const [a, b] = await Promise.all([
    auth.api.signUpEmail({ body: { email: `isolation-test-a-${suffix}@altpitch.dev`, password: PASSWORD, name: "Isolation Test A" } }),
    auth.api.signUpEmail({ body: { email: `isolation-test-b-${suffix}@altpitch.dev`, password: PASSWORD, name: "Isolation Test B" } }),
  ]);
  userAId = a.user.id;
  userBId = b.user.id;

  // A job owned by User A — the row every cross-user test below tries to reach as User B.
  const jobA = await scopedDb(userAId).jobs.insert({ rawPost: "Isolation test job", status: "analyzed" });
  jobAId = jobA.id;
});

afterAll(async () => {
  // Cascades (jobs, profiles, usage_credits, sessions, accounts) via each table's
  // onDelete: "cascade" FK to user.id — one delete cleans up everything these tests created.
  for (const id of [userAId, userBId]) {
    if (id) await db.delete(schema.user).where(eq(schema.user.id, id)).catch(() => {});
  }
});

describe("scopedDb: owner-scoped tables refuse cross-user access", () => {
  it("jobs: User B cannot read, update, or delete User A's job", async () => {
    const scopedB = scopedDb(userBId);

    const readAsB = await scopedB.jobs.get(jobAId);
    expect(readAsB).toBeUndefined();

    const updateAsB = await scopedB.jobs.update(jobAId, { status: "hired" });
    expect(updateAsB).toBeUndefined();

    const [stillAnalyzed] = await db.select({ status: schema.jobs.status }).from(schema.jobs).where(eq(schema.jobs.id, jobAId));
    expect(stillAnalyzed.status).toBe("analyzed"); // unchanged — User B's update touched 0 rows

    await scopedB.jobs.remove(jobAId);
    const [stillExists] = await db.select({ id: schema.jobs.id }).from(schema.jobs).where(eq(schema.jobs.id, jobAId));
    expect(stillExists?.id).toBe(jobAId); // still there — User B's delete touched 0 rows
  });

  it("jobs: User B cannot list User A's jobs via a broad list()", async () => {
    const jobsAsB = await scopedDb(userBId).jobs.list();
    expect(jobsAsB.some((j) => j.id === jobAId)).toBe(false);
  });

  it("profiles: User B cannot read or update User A's profile", async () => {
    const scopedB = scopedDb(userBId);

    const readAsB = await scopedB.profiles.get(userAId);
    expect(readAsB).toBeUndefined();

    const updateAsB = await scopedB.profiles.update(userAId, { name: "Hijacked" });
    expect(updateAsB).toBeUndefined();
  });

  it("knowledgeItems: User B cannot read or write User A's items", async () => {
    const scopedA = scopedDb(userAId);
    const scopedB = scopedDb(userBId);

    const item = await scopedA.knowledgeItems.insert({ kind: "faq", title: "Isolation test FAQ", body: "test" });

    const readAsB = await scopedB.knowledgeItems.get(item.id);
    expect(readAsB).toBeUndefined();

    const updateAsB = await scopedB.knowledgeItems.update(item.id, { title: "Hijacked" });
    expect(updateAsB).toBeUndefined();

    await scopedA.knowledgeItems.remove(item.id);
  });

  it("attachments: User B cannot read User A's attachment row", async () => {
    const scopedA = scopedDb(userAId);
    const scopedB = scopedDb(userBId);

    const attachment = await scopedA.attachments.insert({
      filename: "test.txt",
      mime: "text/plain",
      size: 10,
      storagePath: `${userAId}/pending/test.txt`,
    });

    const readAsB = await scopedB.attachments.get(attachment.id);
    expect(readAsB).toBeUndefined();

    await scopedA.attachments.remove(attachment.id);
  });

  it("outcomes: User B cannot read User A's outcomes", async () => {
    const scopedA = scopedDb(userAId);
    const scopedB = scopedDb(userBId);

    const outcome = await scopedA.outcomes.insert({ jobId: jobAId, event: "sent" });

    const readAsB = await scopedB.outcomes.get(outcome.id);
    expect(readAsB).toBeUndefined();

    await scopedA.outcomes.remove(outcome.id);
  });

  it("analyses: User B cannot read, update, or delete User A's analysis", async () => {
    const scopedA = scopedDb(userAId);
    const scopedB = scopedDb(userBId);

    const analysis = await scopedA.analyses.insert({
      jobId: jobAId,
      verdict: "apply",
      fitScore: 80,
      winProbability: 60,
      roiScore: 70,
      competition: 40,
      confidence: 75,
    });

    const readAsB = await scopedB.analyses.get(analysis.id);
    expect(readAsB).toBeUndefined();

    const updateAsB = await scopedB.analyses.update(analysis.id, { fitScore: 0 });
    expect(updateAsB).toBeUndefined();

    const [stillEighty] = await db.select({ fitScore: schema.analyses.fitScore }).from(schema.analyses).where(eq(schema.analyses.id, analysis.id));
    expect(stillEighty.fitScore).toBe(80); // unchanged — User B's update touched 0 rows

    await scopedA.analyses.remove(analysis.id);
  });

  it("proposals: User B cannot read, update, or delete User A's proposal", async () => {
    const scopedA = scopedDb(userAId);
    const scopedB = scopedDb(userBId);

    const proposal = await scopedA.proposals.insert({ jobId: jobAId });

    const readAsB = await scopedB.proposals.get(proposal.id);
    expect(readAsB).toBeUndefined();

    const updateAsB = await scopedB.proposals.update(proposal.id, { status: "sent" });
    expect(updateAsB).toBeUndefined();

    const [stillDraft] = await db.select({ status: schema.proposals.status }).from(schema.proposals).where(eq(schema.proposals.id, proposal.id));
    expect(stillDraft.status).toBe("draft"); // unchanged — User B's update touched 0 rows

    await scopedA.proposals.remove(proposal.id);
  });

  it("screeningAnswers: User B cannot read, update, or delete User A's screening answer", async () => {
    const scopedA = scopedDb(userAId);
    const scopedB = scopedDb(userBId);

    const answer = await scopedA.screeningAnswers.insert({ jobId: jobAId, question: "Have you done this before?" });

    const readAsB = await scopedB.screeningAnswers.get(answer.id);
    expect(readAsB).toBeUndefined();

    const updateAsB = await scopedB.screeningAnswers.update(answer.id, { answer: "Hijacked" });
    expect(updateAsB).toBeUndefined();

    const [stillBlank] = await db
      .select({ answer: schema.screeningAnswers.answer })
      .from(schema.screeningAnswers)
      .where(eq(schema.screeningAnswers.id, answer.id));
    expect(stillBlank.answer).toBe(""); // unchanged — User B's update touched 0 rows

    await scopedA.screeningAnswers.remove(answer.id);
  });

  it("pipelineRuns: User B cannot read User A's pipeline run logs", async () => {
    const scopedA = scopedDb(userAId);
    const scopedB = scopedDb(userBId);

    const run = await scopedA.pipelineRuns.insert({ jobId: jobAId, stage: "parser", model: "test", inputHash: "abc123" });

    const readAsA = await scopedA.pipelineRuns.get(run.id);
    expect(readAsA?.id).toBe(run.id); // owner can read their own

    const readAsB = await scopedB.pipelineRuns.get(run.id);
    expect(readAsB).toBeUndefined();

    await scopedA.pipelineRuns.remove(run.id);
  });

  it("subscriptions: User B cannot read User A's subscription", async () => {
    const scopedA = scopedDb(userAId);
    const scopedB = scopedDb(userBId);

    const sub = await scopedA.subscriptions.insert({ plan: "trial", status: "trialing" });

    const readAsB = await scopedB.subscriptions.get(sub.id);
    expect(readAsB).toBeUndefined();

    const readAsA = await scopedA.subscriptions.get(sub.id);
    expect(readAsA?.id).toBe(sub.id);
  });

  it("usageCredits: User B cannot read or spend User A's trial credits (seeded on signup)", async () => {
    const scopedB = scopedDb(userBId);

    const [creditsRow] = await db.select().from(schema.usageCredits).where(eq(schema.usageCredits.userId, userAId));
    expect(creditsRow).toBeDefined(); // the databaseHooks signup seed actually ran

    const readAsB = await scopedB.usageCredits.get(creditsRow.id);
    expect(readAsB).toBeUndefined();

    const updateAsB = await scopedB.usageCredits.update(creditsRow.id, { used: 999 });
    expect(updateAsB).toBeUndefined();
  });
});
