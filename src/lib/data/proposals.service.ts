import type {
  Proposal,
  ProposalSection,
  ProposalSectionKey,
  ProposalReviewScores,
  ScreeningQuestion,
} from "@/lib/types";
import { throwForFailedResponse } from "@/lib/data/api-error";
import type { proposals, screeningAnswers } from "@/lib/db/schema";

type ProposalRow = typeof proposals.$inferSelect;
type ScreeningRow = typeof screeningAnswers.$inferSelect;

interface ProposalMeta {
  strategyAngle?: string;
  selectedPortfolioIds?: string[];
  humanizedDiff?: Proposal["humanizedDiff"];
  noProofMode?: boolean;
}

const PROPOSAL_SECTION_COUNT = 7;

const STATUS_MAP: Record<ProposalRow["status"], Proposal["status"]> = {
  draft: "draft",
  humanized: "draft",
  final: "draft",
  sent: "sent",
};

function rowToProposal(row: ProposalRow): Proposal {
  const meta = (row.meta ?? {}) as ProposalMeta;
  return {
    id: row.id,
    jobId: row.jobId,
    sections: row.sections as unknown as ProposalSection[],
    review: row.reviewScores as unknown as ProposalReviewScores,
    strategyAngle: meta.strategyAngle ?? "",
    selectedPortfolioIds: meta.selectedPortfolioIds ?? [],
    humanizedDiff: meta.humanizedDiff,
    status: STATUS_MAP[row.status],
    updatedAt: row.updatedAt.toString(),
    noProofMode: meta.noProofMode ?? false,
    partial: (row.sections as unknown as ProposalSection[]).length < PROPOSAL_SECTION_COUNT,
  };
}

interface ScreeningMeta {
  reviewScore?: number;
  consistencyBadge?: "consistent" | "review" | "conflict";
  consistencyNote?: string;
  missingInfoPrompt?: string | null;
  userSuppliedInfo?: string;
}

function rowToScreeningQuestion(row: ScreeningRow): ScreeningQuestion {
  const meta = (row.meta ?? {}) as ScreeningMeta;
  return {
    id: row.id,
    jobId: row.jobId,
    question: row.question,
    answer: row.answer,
    reviewScore: meta.reviewScore ?? row.confidence,
    confidence: row.confidence,
    isLowConfidence: row.needsInput,
    consistencyBadge: meta.consistencyBadge ?? (row.consistencyOk ? "consistent" : "review"),
    consistencyNote: meta.consistencyNote ?? "",
    missingInfoPrompt: meta.missingInfoPrompt ?? undefined,
    userSuppliedInfo: meta.userSuppliedInfo,
  };
}

export type ProposalDraftProgress =
  | { stage: "strategizing" }
  | { stage: "section"; key: ProposalSectionKey; label: string; content: string; alternativeContent: string }
  | { stage: "reviewing" };

/** Draft-triggering fetch — if no proposal exists yet for this job, runs the real pipeline
 * (stages 5, 6, 8, 9, 10) via /api/draft-proposal before returning it. This is where the
 * Phase 1 mock's "auto-create draft shell" becomes an actual Claude call.
 *
 * Streamed (Corrections 02): sections arrive one at a time, Hook first — pass `onProgress` to
 * render them into Proposal Studio as they land instead of waiting on the full draft. */
export async function getProposalByJobId(
  jobId: string,
  onProgress?: (event: ProposalDraftProgress) => void
): Promise<Proposal | null> {
  const existingRes = await fetch(`/api/proposals?jobId=${jobId}`);
  if (!existingRes.ok) await throwForFailedResponse(existingRes, "Couldn't check for an existing proposal.");
  const { proposal: existing } = (await existingRes.json()) as { proposal: ProposalRow | null };
  if (existing) return rowToProposal(existing);

  return streamDraft(jobId, onProgress);
}

/** "Finish generation" — a run that hit the 120s ceiling left a partial draft. Re-entering the
 * pipeline resumes from the stored stage results rather than regenerating what already exists
 * (Corrections 03 §2), so this is the same call as the initial draft. */
export async function finishProposalDraft(
  jobId: string,
  onProgress?: (event: ProposalDraftProgress) => void
): Promise<Proposal | null> {
  return streamDraft(jobId, onProgress);
}

async function streamDraft(
  jobId: string,
  onProgress?: (event: ProposalDraftProgress) => void
): Promise<Proposal | null> {
  const res = await fetch("/api/draft-proposal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  });

  if (!res.ok || !res.body) {
    await throwForFailedResponse(res, "Failed to draft proposal.");
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let proposalId: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      const event = JSON.parse(part.slice(6)) as
        | ProposalDraftProgress
        | { stage: "complete"; proposalId: string; screeningAnswerIds: string[]; partial: boolean }
        | { stage: "error"; message: string };

      if (event.stage === "error") throw new Error(event.message);
      if (event.stage === "complete") {
        proposalId = event.proposalId;
      } else {
        onProgress?.(event);
      }
    }
  }

  if (!proposalId) throw new Error("Proposal stream ended unexpectedly.");
  return getProposal(proposalId);
}

export async function getProposal(id: string): Promise<Proposal | null> {
  const res = await fetch(`/api/proposals/${id}`);
  if (!res.ok) await throwForFailedResponse(res, "Couldn't load proposal.");
  const { proposal } = (await res.json()) as { proposal: ProposalRow | null };
  return proposal ? rowToProposal(proposal) : null;
}

export async function updateProposalSection(
  proposalId: string,
  key: ProposalSectionKey,
  content: string
): Promise<Proposal> {
  const proposal = await getProposal(proposalId);
  if (!proposal) throw new Error("Proposal not found");

  const sections = proposal.sections.map((s) => (s.key === key ? { ...s, content } : s));

  const res = await fetch(`/api/proposals/${proposalId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sections }),
  });
  if (!res.ok) await throwForFailedResponse(res, "Couldn't update section.");

  const { proposal: updated } = (await res.json()) as { proposal: ProposalRow };
  return rowToProposal(updated);
}

/** Real Writer call for one section (see /api/rewrite-section), replacing the Phase 1 mock's
 * content/alternativeContent swap. */
export async function rewriteSection(proposalId: string, key: ProposalSectionKey): Promise<Proposal> {
  const res = await fetch("/api/rewrite-section", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proposalId, sectionKey: key }),
  });

  if (!res.ok) {
    await throwForFailedResponse(res, "Rewrite failed.");
  }

  const proposal = await getProposal(proposalId);
  if (!proposal) throw new Error("Proposal not found after rewrite.");
  return proposal;
}

/** "Tighten" — real rewrite of one screening answer to a shorter variant (see /api/tighten-answer). */
export async function tightenAnswer(questionId: string, jobId: string): Promise<ScreeningQuestion[]> {
  const res = await fetch("/api/tighten-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId }),
  });

  if (!res.ok) {
    await throwForFailedResponse(res, "Tighten failed.");
  }

  return getScreeningQuestions(jobId);
}

export async function getScreeningQuestions(jobId: string): Promise<ScreeningQuestion[]> {
  const res = await fetch(`/api/screening-answers?jobId=${jobId}`);
  if (!res.ok) await throwForFailedResponse(res, "Couldn't load screening questions.");
  const { answers } = (await res.json()) as { answers: ScreeningRow[] };
  return answers.map(rowToScreeningQuestion);
}

export async function updateScreeningAnswer(
  jobId: string,
  questionId: string,
  answer: string,
  userSuppliedInfo?: string
): Promise<ScreeningQuestion[]> {
  const res = await fetch(`/api/screening-answers/${questionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer, userSuppliedInfo }),
  });
  if (!res.ok) await throwForFailedResponse(res, "Couldn't update answer.");

  return getScreeningQuestions(jobId);
}

export function proposalToPlainText(proposal: Proposal): string {
  return proposal.sections.map((s) => `${s.label.toUpperCase()}\n${s.content}`).join("\n\n");
}
