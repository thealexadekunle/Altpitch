import "server-only";
import { eq } from "drizzle-orm";
import { scopedDb } from "@/lib/db/scoped";
import { attachments as attachmentsTable, screeningAnswers as screeningAnswersTable } from "@/lib/db/schema";
import { runStage } from "@/lib/ai/client";
import { RunBudget } from "@/lib/ai/budget";
import { retrieveKnowledgeItems } from "@/lib/ai/retriever";
import { checkProposalRules, proposalCharCount } from "@/lib/ai/proposal-rules";
import { buildAttachmentContentBlocks } from "@/lib/ai/attachment-extract";
import { getActiveInsights } from "@/lib/insights/generate";
import {
  ParsedJobSchema,
  JobAnalyzerOutputSchema,
  ClientProfileSchema,
  ScorerOutputSchema,
  PsychologyOutputSchema,
  StrategistOutputSchema,
  writerSectionsSchemaFor,
  ScreeningOutputSchema,
  ReviewerOutputSchema,
  type ParsedJob,
  type ScorerOutput,
  type PsychologyOutput,
  type ReviewerOutput,
  type ScreeningOutput,
  type StrategistOutput,
  type WriterSectionsOutput,
} from "@/lib/ai/schemas";
import { buildParserPrompt } from "@/lib/ai/prompts/parser";
import { buildJobAnalyzerPrompt } from "@/lib/ai/prompts/job-analyzer";
import { buildClientAnalyzerPrompt } from "@/lib/ai/prompts/client-analyzer";
import { buildScorerPrompt } from "@/lib/ai/prompts/scorer";
import { buildPsychologyPrompt } from "@/lib/ai/prompts/psychology";
import { buildStrategistPrompt } from "@/lib/ai/prompts/strategist";
import {
  buildOpeningPrompt,
  buildBodyPrompt,
  buildRevisionPrompt,
  ALL_SECTION_KEYS,
  BODY_KEYS,
  OPENING_KEYS,
  PROPOSAL_SECTION_ORDER,
  type SectionContext,
} from "@/lib/ai/prompts/writer-section";
import { buildScreeningPrompt } from "@/lib/ai/prompts/screening";
import { buildReviewerPrompt } from "@/lib/ai/prompts/reviewer";
import type { ClientQuestion, ProposalSection, ProposalSectionKey } from "@/lib/types";
import type { WritingStyle } from "@/lib/ai/writing-style";

/** Manual questions the user typed win the dedupe — auto-detected ones from the Parser fill in
 * around them. Matched on normalized text so "Can you start this week?" and "can you start this
 * week" collapse to one entry. */
function mergeClientQuestions(manual: string[], auto: string[]): ClientQuestion[] {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/[?.!]+$/, "");
  const seen = new Set<string>();
  const merged: ClientQuestion[] = [];

  for (const text of manual) {
    const trimmed = text.trim();
    if (!trimmed || seen.has(normalize(trimmed))) continue;
    seen.add(normalize(trimmed));
    merged.push({ id: crypto.randomUUID(), text: trimmed, source: "manual" });
  }
  for (const text of auto) {
    const trimmed = text.trim();
    if (!trimmed || seen.has(normalize(trimmed))) continue;
    seen.add(normalize(trimmed));
    merged.push({ id: crypto.randomUUID(), text: trimmed, source: "auto" });
  }
  return merged;
}

export type AnalysisProgressEvent =
  | { stage: "parsing" }
  | { stage: "scoring" }
  | { stage: "breakdown" }
  | { stage: "complete"; jobId: string; analysisId: string }
  | { stage: "error"; message: string };

type StoredParsed = ParsedJob & { clientQuestions?: ClientQuestion[] };

/**
 * Stages 1–4 + 7 (Parser, Job Analyzer, Client Analyzer, Scorer, Psychology). Streamed as SSE —
 * stages 1–4 map onto the staged skeleton the Phase 1 UI already designed for this latency.
 * Psychology runs here too (not stage 6/8/9, which need retrieved proof and don't exist until
 * "Draft proposal") so /jobs/[id] can render the Psychology tab immediately, matching Phase 1.
 *
 * Parallelized (Corrections 02): Job Analyzer and Client Analyzer both depend only on the Parser
 * output, so they run concurrently. Psychology depends only on the Parser output + Client
 * Analyzer's clientProfile — not on the Scorer — so it runs concurrently with the Scorer too.
 * That cuts 5 serial Claude calls down to 3 serial rounds.
 *
 * Progressive persistence: `jobs.parsed` is written immediately after Stage 1, before Stages
 * 2–4/7 even start. If parsing already succeeded on a prior attempt (title is non-empty), it's
 * reused instead of re-running — a lightweight resume primitive for serverless timeouts, without
 * a full job-queue system.
 */
export async function* runAnalysisPipeline(
  userId: string,
  jobId: string,
  rawText: string,
  manualQuestions: string[] = []
): AsyncGenerator<AnalysisProgressEvent> {
  const scoped = scopedDb(userId);
  const budget = new RunBudget();
  try {
    yield { stage: "parsing" };

    const jobRow = await scoped.jobs.get(jobId);
    const existingParsed = jobRow?.parsed as StoredParsed | null;

    let parsed: ParsedJob;
    if (existingParsed?.title) {
      parsed = existingParsed;
    } else {
      const attachmentRows = await scoped.attachments.list({ where: eq(attachmentsTable.jobId, jobId) });
      const attachmentBlocks = await buildAttachmentContentBlocks(attachmentRows);
      const parserPrompt = buildParserPrompt(rawText, attachmentBlocks);
      parsed = await runStage({
        stage: "parser",
        ...parserPrompt,
        schema: ParsedJobSchema,
        userId,
        jobId,
        timeoutMs: budget.allowanceFor("parser"),
      });

      const clientQuestions = mergeClientQuestions(manualQuestions, parsed.screeningQuestions);
      await scoped.jobs.update(jobId, { parsed: { ...parsed, clientQuestions } });
    }

    yield { stage: "scoring" };
    const jobAnalyzerPrompt = buildJobAnalyzerPrompt(parsed);
    const clientAnalyzerPrompt = buildClientAnalyzerPrompt(rawText, parsed);
    const [jobAnalysis, clientProfile] = await Promise.all([
      runStage({ stage: "jobAnalyzer", ...jobAnalyzerPrompt, schema: JobAnalyzerOutputSchema, userId, jobId, timeoutMs: budget.allowanceFor("jobAnalyzer") }),
      runStage({ stage: "clientAnalyzer", ...clientAnalyzerPrompt, schema: ClientProfileSchema, userId, jobId, timeoutMs: budget.allowanceFor("clientAnalyzer") }),
    ]);

    yield { stage: "breakdown" };
    const scorerPrompt = buildScorerPrompt({ parsed, jobAnalysis, clientProfile });
    const psychologyPrompt = buildPsychologyPrompt(parsed, clientProfile);
    const [scorer, psychology] = await Promise.all([
      runStage({ stage: "scorer", ...scorerPrompt, schema: ScorerOutputSchema, userId, jobId, timeoutMs: budget.allowanceFor("scorer") }),
      runStage({ stage: "psychology", ...psychologyPrompt, schema: PsychologyOutputSchema, userId, jobId, timeoutMs: budget.allowanceFor("psychology") }),
    ]);

    const analysisRow = await scoped.analyses.insert({
      jobId,
      verdict: scorer.verdict,
      fitScore: scorer.fitScore,
      winProbability: scorer.winProbability,
      roiScore: scorer.roiScore,
      competition: scorer.competitionEstimate === "low" ? 25 : scorer.competitionEstimate === "medium" ? 55 : 85,
      confidence: scorer.confidence,
      breakdown: {
        deliverables: jobAnalysis.deliverables,
        redFlags: jobAnalysis.redFlags,
        clientProfile,
        scoreBreakdown: scorer.scoreBreakdown,
        competitionRationale: scorer.competitionRationale,
        verdictRationale: scorer.verdictRationale,
        competitionEstimate: scorer.competitionEstimate,
      },
      psychology,
      rationale: { verdictRationale: scorer.verdictRationale },
    });

    if (!analysisRow) throw new Error("Failed to persist analysis");

    yield { stage: "complete", jobId, analysisId: analysisRow.id };
  } catch (err) {
    yield { stage: "error", message: err instanceof Error ? err.message : "Analysis pipeline failed" };
  }
}

interface DraftProposalResult {
  proposalId: string;
  screeningAnswerIds: string[];
  partial: boolean;
}

export type ProposalProgressEvent =
  | { stage: "strategizing" }
  | { stage: "section"; key: ProposalSectionKey; label: string; content: string; alternativeContent: string }
  | { stage: "reviewing" }
  | { stage: "complete"; proposalId: string; screeningAnswerIds: string[]; partial: boolean; noProofMode: boolean }
  | { stage: "error"; message: string };

/** Writer output -> stored section rows. Labels come from the canonical order, and the
 * alternative starts empty: it's generated on demand by "Rewrite section" (Corrections 03 §2 —
 * eagerly writing an unused alternative for all seven sections doubled every draft). */
function toStoredSections(written: WriterSectionsOutput["sections"]): ProposalSection[] {
  return PROPOSAL_SECTION_ORDER.map((spec) => {
    const match = written.find((w) => w.key === spec.key);
    return { key: spec.key, label: spec.label, content: match?.content ?? "", alternativeContent: "" };
  }).filter((s) => s.content.length > 0);
}

/**
 * Stages 5, 6, 8, 9, 10 (Retriever, Strategist, Writer, Screening, Reviewer). Runs when the user
 * hits "Draft proposal".
 *
 * Corrections 03 §1 — the pipeline ALWAYS produces a proposal. Three things guarantee it:
 * the proposal row is inserted before any Writer call, so a later failure leaves a resumable
 * draft rather than nothing; Strategist ids are filtered against what the Retriever actually
 * returned instead of being schema-validated as uuids (a placeholder id used to throw here,
 * before the row existed, which is why runs produced a verdict and no proposal); and an empty
 * Retriever result switches the Writer into no-proof mode rather than blocking the write.
 *
 * §2 — the whole run is on a RunBudget. Each stage gets the smaller of its own timeout and
 * whatever is left of the 120s ceiling; once the budget is exhausted the remaining stages are
 * skipped and everything completed so far is returned as a partial, which the Studio can resume
 * from because each stage persists as it lands.
 *
 * Two Writer calls, not fourteen: the opening block is awaited alone so the mirror reaches the
 * Studio first, then the body. A revision is one more call, not a re-run of every section.
 */
export async function* runProposalPipeline(userId: string, jobId: string): AsyncGenerator<ProposalProgressEvent> {
  const scoped = scopedDb(userId);
  const budget = new RunBudget();
  try {
    yield { stage: "strategizing" };

    const [job, analysis, profile] = await Promise.all([
      scoped.jobs.get(jobId),
      scoped.analyses.get(jobId, "jobId"),
      scoped.profiles.get(userId),
    ]);

    if (!job) throw new Error("Job not found");
    if (!analysis) throw new Error("Analysis not found");

    const parsed = job.parsed as unknown as StoredParsed;

    const breakdown = analysis.breakdown as {
      competitionEstimate?: "low" | "medium" | "high";
      scoreBreakdown: ScorerOutput["scoreBreakdown"];
      competitionRationale: string;
      verdictRationale: string;
    };

    const scorerLike: ScorerOutput = {
      verdict: analysis.verdict,
      fitScore: analysis.fitScore,
      winProbability: analysis.winProbability,
      roiScore: analysis.roiScore,
      competitionEstimate: breakdown.competitionEstimate ?? "medium",
      confidence: analysis.confidence,
      scoreBreakdown: breakdown.scoreBreakdown,
      competitionRationale: breakdown.competitionRationale,
      verdictRationale: breakdown.verdictRationale,
    };

    const retrieved = await retrieveKnowledgeItems(scoped, parsed.niche);
    const noProofMode = retrieved.length === 0;
    const retrievedIds = new Set(retrieved.map((r) => r.id));

    // Resume path ("Finish generation"): a run that hit the ceiling left a draft row with
    // whatever it managed to write. Reuse it — re-running stages that already produced stored
    // results is the hidden multiplier Corrections 03 §2 bans.
    const existingDraft = await scoped.proposals.get(jobId, "jobId");
    const existingMeta = (existingDraft?.meta ?? {}) as { strategyAngle?: string; selectedPortfolioIds?: string[] };

    let strategy: StrategistOutput;
    if (existingMeta.strategyAngle) {
      strategy = {
        strategyAngle: existingMeta.strategyAngle,
        selectedPortfolioIds: (existingMeta.selectedPortfolioIds ?? []).filter((id) => retrievedIds.has(id)),
      };
    } else {
      const activeInsights = (await getActiveInsights(userId)).map((i) => i.message);
      const strategyRaw = await runStage({
        stage: "strategist",
        ...buildStrategistPrompt(scorerLike, retrieved, parsed, activeInsights),
        schema: StrategistOutputSchema,
        userId,
        jobId,
        timeoutMs: budget.allowanceFor("strategist"),
      });
      // Anything the model named that the Retriever didn't return is dropped, not trusted.
      strategy = {
        strategyAngle: strategyRaw.strategyAngle,
        selectedPortfolioIds: strategyRaw.selectedPortfolioIds.filter((id) => retrievedIds.has(id)),
      };
    }

    const psychology = analysis.psychology as unknown as PsychologyOutput;

    const writingStyleRaw = (profile?.writingStyle ?? {}) as Partial<WritingStyle>;
    const writingStyle: WritingStyle = {
      tone: writingStyleRaw.tone ?? "professional",
      formality: writingStyleRaw.formality ?? 60,
      maxProposalWords: writingStyleRaw.maxProposalWords ?? 250,
      avoidPhrases: writingStyleRaw.avoidPhrases ?? [],
      preferredOpening: writingStyleRaw.preferredOpening ?? "",
      answerLength: writingStyleRaw.answerLength ?? "standard",
    };

    // Created up front with empty sections: from here on, a failure yields a resumable draft.
    const proposalRow =
      existingDraft ??
      (await scoped.proposals.insert({
        jobId,
        sections: [],
        reviewScores: {},
        status: "draft",
        meta: {
          strategyAngle: strategy.strategyAngle,
          selectedPortfolioIds: strategy.selectedPortfolioIds,
          noProofMode,
        },
      }));
    if (!proposalRow) throw new Error("Failed to persist proposal");
    const proposalId = proposalRow.id;
    const storedSections = (proposalRow.sections ?? []) as unknown as ProposalSection[];

    const context: SectionContext = {
      parsed,
      analysis: scorerLike,
      strategy,
      psychology,
      retrieved,
      writingStyle,
      noProofMode,
    };

    const written: WriterSectionsOutput["sections"] = storedSections.map((s) => ({ key: s.key, content: s.content }));
    const has = (key: ProposalSectionKey) => written.some((w) => w.key === key);

    let sections = toStoredSections(written);
    for (const section of sections) {
      yield { stage: "section", key: section.key, label: section.label, content: section.content, alternativeContent: "" };
    }

    // Opening first, awaited alone, so the mirror reaches the Studio before anything else.
    if (!has("hook")) {
      const opening = await runStage({
        stage: "writer",
        ...buildOpeningPrompt(context),
        schema: writerSectionsSchemaFor(OPENING_KEYS),
        userId,
        jobId,
        proposalId,
        timeoutMs: budget.allowanceFor("writer"),
      });
      written.push(...opening.sections);
      sections = toStoredSections(written);
      await scoped.proposals.update(proposalId, { sections });
      for (const section of toStoredSections(opening.sections)) {
        yield { stage: "section", key: section.key, label: section.label, content: section.content, alternativeContent: "" };
      }
    }

    if (!has("cta") && !budget.exhausted) {
      // A failure here leaves the opening that already landed on the row: the user gets a partial
      // draft and a "finish generation" button, never an empty studio.
      const body = await runStage({
        stage: "writer",
        ...buildBodyPrompt(context, written),
        schema: writerSectionsSchemaFor(BODY_KEYS),
        userId,
        jobId,
        proposalId,
        timeoutMs: budget.allowanceFor("writer"),
      }).catch(() => null);

      if (body) {
        written.push(...body.sections);
        sections = toStoredSections(written);
        await scoped.proposals.update(proposalId, { sections });
        for (const section of toStoredSections(body.sections)) {
          yield { stage: "section", key: section.key, label: section.label, content: section.content, alternativeContent: "" };
        }
      }
    }

    // On a resume the answers may already exist — inserting again would double them.
    const existingAnswers = await scoped.screeningAnswers.list({ where: eq(screeningAnswersTable.jobId, jobId) });

    const mergedQuestions = parsed.clientQuestions ?? [];
    const questions = mergedQuestions.length
      ? mergedQuestions.map((q) => q.text)
      : (parsed.screeningQuestions ?? []); // back-compat: jobs analyzed before client questions shipped
    const knowledgeContext = JSON.stringify(retrieved.map((r) => ({ title: r.title, body: r.body })));

    const reviewAndScreen = async (current: ProposalSection[]) => {
      const forModel = current.map((s) => ({ key: s.key, content: s.content }));
      const violations = checkProposalRules(forModel);
      const charCount = proposalCharCount(forModel);

      const reviewerPromise = runStage({
        stage: "reviewer",
        ...buildReviewerPrompt(forModel, charCount, violations),
        schema: ReviewerOutputSchema,
        userId,
        jobId,
        proposalId,
        timeoutMs: budget.allowanceFor("reviewer"),
      });
      const screeningPromise =
        questions.length > 0 && existingAnswers.length === 0
          ? runStage({
              stage: "screening",
              ...buildScreeningPrompt(questions, forModel, knowledgeContext, writingStyle.answerLength),
              schema: ScreeningOutputSchema,
              userId,
              jobId,
              proposalId,
              timeoutMs: budget.allowanceFor("screening"),
            })
          : Promise.resolve(null);

      const [reviewerOutput, screeningOutput] = await Promise.all([reviewerPromise, screeningPromise]);
      return { reviewerOutput, screeningOutput, violations };
    };

    let reviewerOutput: ReviewerOutput | null = null;
    let screeningOutput: ScreeningOutput | null = null;

    if (!budget.exhausted) {
      yield { stage: "reviewing" };

      // The draft is written and persisted by this point. Review and screening are polish: if
      // either fails or times out, the run returns a partial proposal rather than nothing.
      const first = await reviewAndScreen(sections).catch(() => null);
      reviewerOutput = first?.reviewerOutput ?? null;
      screeningOutput = first?.screeningOutput ?? null;

      // Exactly one revision pass, and it is one Claude call for the whole proposal.
      const needsRevision = first !== null && (first.violations.length > 0 || first.reviewerOutput.needsRevision);
      if (needsRevision && !budget.exhausted) {
        // The revision is an improvement pass on a sendable draft. If it fails, the unrevised
        // draft stands — it is still a proposal, and its violations are recorded on the row.
        const revised = await runStage({
          stage: "writer",
          ...buildRevisionPrompt(
            context,
            sections.map((s) => ({ key: s.key, content: s.content })),
            first!.violations,
            first!.reviewerOutput.revisionNote ?? null
          ),
          schema: writerSectionsSchemaFor(ALL_SECTION_KEYS),
          userId,
          jobId,
          proposalId,
          timeoutMs: budget.allowanceFor("writer"),
        }).catch(() => null);

        if (revised) {
          sections = toStoredSections(revised.sections);
          await scoped.proposals.update(proposalId, { sections });
        }

        if (revised && !budget.exhausted) {
          const second = await reviewAndScreen(sections).catch(() => null);
          reviewerOutput = second?.reviewerOutput ?? reviewerOutput;
          screeningOutput = second?.screeningOutput ?? screeningOutput;
        }
      }
    }

    const finalViolations = checkProposalRules(sections.map((s) => ({ key: s.key, content: s.content })));
    const updated = await scoped.proposals.update(proposalId, {
      sections,
      reviewScores: reviewerOutput?.review ?? {},
      meta: {
        strategyAngle: strategy.strategyAngle,
        selectedPortfolioIds: strategy.selectedPortfolioIds,
        noProofMode,
        charCount: proposalCharCount(sections.map((s) => ({ key: s.key, content: s.content }))),
        ruleViolations: finalViolations,
        elapsedMs: budget.elapsedMs,
      },
    });
    if (!updated) throw new Error("Failed to persist final proposal");

    let screeningAnswerIds: string[] = existingAnswers.map((a) => a.id);
    if (screeningOutput) {
      const inserted = await scoped.screeningAnswers.insertMany(
        screeningOutput.answers.map((a) => ({
          jobId,
          question: a.question,
          answer: a.answer,
          confidence: a.confidence,
          consistencyOk: a.consistencyBadge === "consistent",
          needsInput: a.isLowConfidence,
          meta: {
            reviewScore: a.confidence,
            consistencyBadge: a.consistencyBadge,
            consistencyNote: a.consistencyNote,
            missingInfoPrompt: a.missingInfoPrompt ?? null,
          },
        }))
      );
      screeningAnswerIds = inserted.map((r) => r.id);
    }

    const partial = sections.length < PROPOSAL_SECTION_ORDER.length || reviewerOutput === null;
    yield { stage: "complete", proposalId, screeningAnswerIds, partial, noProofMode };
  } catch (err) {
    yield { stage: "error", message: err instanceof Error ? err.message : "Proposal pipeline failed" };
  }
}

/** Non-streaming wrapper for callers that just want the final result (e.g. tests, admin tools). */
export async function runProposalPipelineToCompletion(userId: string, jobId: string): Promise<DraftProposalResult> {
  let result: DraftProposalResult | null = null;
  for await (const event of runProposalPipeline(userId, jobId)) {
    if (event.stage === "error") throw new Error(event.message);
    if (event.stage === "complete") {
      result = { proposalId: event.proposalId, screeningAnswerIds: event.screeningAnswerIds, partial: event.partial };
    }
  }
  if (!result) throw new Error("Proposal pipeline ended without completing");
  return result;
}
