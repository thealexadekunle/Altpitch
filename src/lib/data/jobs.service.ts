import type {
  AnalysisStage,
  AnalyzeJobInput,
  AnalyzeJobResult,
  AttachmentMeta,
  ClientProfile,
  ClientQuestion,
  Deliverable,
  JobAnalysis,
  JobSummary,
  Niche,
  PsychologyRead,
  RedFlag,
  ScoreWithRationale,
  Verdict,
} from "@/lib/types";
import { throwForFailedResponse } from "@/lib/data/api-error";
import type { jobs, analyses } from "@/lib/db/schema";

type JobRow = typeof jobs.$inferSelect;
type AnalysisRow = typeof analyses.$inferSelect;

interface ParsedJobShape {
  title: string;
  niche: Niche;
  budget: { type: "fixed" | "hourly"; min?: number; max?: number; amount?: number; currency: string };
  clientCountry?: string;
  clientQuestions?: ClientQuestion[];
}

interface AnalysisBreakdown {
  deliverables: Deliverable[];
  redFlags: RedFlag[];
  clientProfile: ClientProfile;
  scoreBreakdown: ScoreWithRationale[];
  competitionRationale: string;
  verdictRationale: string;
  competitionEstimate: "low" | "medium" | "high";
}

function toJobAnalysis(
  job: JobRow,
  analysis: AnalysisRow | null,
  hasProposal: boolean,
  proposalId?: string,
  attachments: AttachmentMeta[] = []
): JobAnalysis {
  const parsed = job.parsed as unknown as ParsedJobShape;
  const breakdown = (analysis?.breakdown ?? {}) as Partial<AnalysisBreakdown>;
  const psychology = (analysis?.psychology ?? {}) as Partial<PsychologyRead>;

  return {
    id: job.id,
    title: parsed?.title ?? "Untitled job",
    niche: parsed?.niche ?? "other",
    budget: parsed?.budget ?? { type: "fixed", currency: "USD" },
    clientCountry: parsed?.clientCountry,
    postedAt: job.createdAt.toString(),
    analyzedAt: job.createdAt.toString(),
    verdict: (analysis?.verdict ?? "borderline") as Verdict,
    fitScore: analysis?.fitScore ?? 0,
    winProbability: analysis?.winProbability ?? 0,
    roiScore: analysis?.roiScore ?? 0,
    competitionEstimate: breakdown.competitionEstimate ?? "medium",
    confidence: analysis?.confidence ?? 0,
    rawTextPreview: job.rawPost.slice(0, 140) + (job.rawPost.length > 140 ? "…" : ""),
    rawText: job.rawPost,
    deliverables: breakdown.deliverables ?? [],
    clientProfile: breakdown.clientProfile ?? {
      decisionStyle: "",
      inferredValues: [],
      paymentVerified: false,
      rationale: "",
    },
    redFlags: breakdown.redFlags ?? [],
    psychology: {
      fears: psychology.fears ?? [],
      desiredOutcomes: psychology.desiredOutcomes ?? [],
      trustTriggers: psychology.trustTriggers ?? [],
      bestOpeningAngle: psychology.bestOpeningAngle ?? "",
      rationale: psychology.rationale ?? "",
    },
    scoreBreakdown: breakdown.scoreBreakdown ?? [],
    competitionRationale: breakdown.competitionRationale ?? "",
    verdictRationale: breakdown.verdictRationale ?? "",
    screeningQuestions: [],
    clientQuestions: parsed?.clientQuestions ?? [],
    attachments,
    questionCount: (parsed?.clientQuestions ?? []).length,
    hasAttachments: attachments.length > 0,
    hasProposal,
    proposalId,
  };
}

function toJobSummary(analysis: JobAnalysis): JobSummary {
  return {
    id: analysis.id,
    title: analysis.title,
    niche: analysis.niche,
    budget: analysis.budget,
    clientCountry: analysis.clientCountry,
    postedAt: analysis.postedAt,
    analyzedAt: analysis.analyzedAt,
    verdict: analysis.verdict,
    fitScore: analysis.fitScore,
    winProbability: analysis.winProbability,
    roiScore: analysis.roiScore,
    competitionEstimate: analysis.competitionEstimate,
    confidence: analysis.confidence,
    rawTextPreview: analysis.rawTextPreview,
    questionCount: analysis.questionCount,
    hasAttachments: analysis.hasAttachments,
  };
}

export async function listJobs(): Promise<JobSummary[]> {
  const res = await fetch("/api/jobs");
  if (!res.ok) await throwForFailedResponse(res, "Couldn't load jobs.");
  const { jobs: jobRows, analyses: analysisRows, attachments: attachmentRows } = (await res.json()) as {
    jobs: JobRow[];
    analyses: AnalysisRow[];
    attachments: { jobId: string | null }[];
  };

  const analysesByJobId = new Map(analysisRows.map((a) => [a.jobId, a]));
  const jobIdsWithAttachments = new Set(attachmentRows.map((a) => a.jobId));

  return jobRows
    .map((job) => ({
      ...toJobSummary(toJobAnalysis(job, analysesByJobId.get(job.id) ?? null, false)),
      hasAttachments: jobIdsWithAttachments.has(job.id),
    }))
    .sort((a, b) => b.winProbability - a.winProbability);
}

export async function getJob(id: string): Promise<JobAnalysis | null> {
  const res = await fetch(`/api/jobs/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) await throwForFailedResponse(res, "Couldn't load job.");

  const { job, analysis, proposal, attachments } = (await res.json()) as {
    job: JobRow;
    analysis: AnalysisRow | null;
    proposal: { id: string } | null;
    attachments: AttachmentMeta[];
  };

  return toJobAnalysis(job, analysis, Boolean(proposal), proposal?.id, attachments);
}

export async function analyzeJob(
  input: AnalyzeJobInput,
  onProgress?: (stage: AnalysisStage) => void
): Promise<AnalyzeJobResult> {
  if (!input.rawText.trim()) {
    throw new Error("Job post text is required.");
  }

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok || !res.body) {
    await throwForFailedResponse(res, "Analysis failed.");
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: { jobId: string } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      const event = JSON.parse(part.slice(6)) as
        | { stage: "parsing" | "scoring" | "breakdown" }
        | { stage: "complete"; jobId: string; analysisId?: string; cached?: boolean }
        | { stage: "error"; message: string };

      if (event.stage === "error") throw new Error(event.message);
      if (event.stage === "complete") {
        result = event;
      } else {
        onProgress?.(event.stage);
      }
    }
  }

  if (!result) throw new Error("Analysis stream ended unexpectedly.");

  const analysis = await getJob(result.jobId);
  if (!analysis) throw new Error("Analysis completed but the job could not be loaded.");

  return { jobId: result.jobId, analysis };
}

export async function getTodaysQueue(): Promise<JobSummary[]> {
  const jobs = await listJobs();
  return jobs.filter((j) => j.verdict !== "skip").slice(0, 6);
}
