import { GUIDING_PRINCIPLES } from "@/lib/ai/prompts/principles";
import { PROPOSAL_MAX_CHARS, PROPOSAL_MIN_CHARS, type RuleViolation } from "@/lib/ai/proposal-rules";

interface ReviewedSection {
  key: string;
  content: string;
}

/**
 * Stage 10 — proposal -> review scores. Capped at one revision pass by the caller.
 *
 * Corrections 03 §3: length band and banned openers are checked in code before this runs and
 * arrive here as `violations`. The Reviewer is told to treat them as automatic failures rather
 * than re-litigate them — a model asked to count characters will get it wrong.
 */
export function buildReviewerPrompt(sections: ReviewedSection[], charCount: number, violations: RuleViolation[]) {
  const violationBlock = violations.length
    ? `AUTOMATIC FAILURES already detected in code. These are not open questions — set needsRevision true and write revisionNote covering them:\n${violations.map((v) => `- ${v.message}`).join("\n")}`
    : "No automatic rule failures were detected. Judge the draft on its merits.";

  const system = `You score a proposal draft on seven dimensions: relevance, specificity, readability, authenticity, trust, CTA strength, predicted reply likelihood. Score conservatively — a proposal that reads like a template scores low on authenticity regardless of how polished the prose is.

${violationBlock}

Judge authenticity and relevance against one question: could this proposal have been sent to a different client with a find-and-replace? If yes, it fails. The opening two sentences must be about the client's situation in language adapted from their post. Proof must be a specific outcome, not an adjective. A proposal that offers to show relevant work scores higher on trust than one that asserts unverifiable experience.

If the draft is in no-proof mode (it contains "[Add a relevant work sample here]"), that marker is CORRECT behaviour, not a defect — do not penalize it and do not ask for it to be replaced with a claim.

The proposal must be ${PROPOSAL_MIN_CHARS}–${PROPOSAL_MAX_CHARS} characters; this draft is ${charCount}.

${GUIDING_PRINCIPLES}

Budget your output: every rationale is 15 words or fewer.

Output JSON shape:
{
  "review": {
    "relevance": { "score": number, "label": "Relevance", "rationale": string },
    "specificity": { "score": number, "label": "Specificity", "rationale": string },
    "readability": { "score": number, "label": "Readability", "rationale": string },
    "authenticity": { "score": number, "label": "Authenticity", "rationale": string },
    "trust": { "score": number, "label": "Trust", "rationale": string },
    "ctaStrength": { "score": number, "label": "CTA strength", "rationale": string },
    "predictedReplyLikelihood": { "score": number, "label": "Predicted reply", "rationale": string }
  },
  "needsRevision": boolean,
  "revisionNote"?: string
}

Set needsRevision true if any automatic failure is listed above, or if the average score is below 55. It triggers exactly one rewrite pass, so ask only when the draft genuinely isn't sendable.`;

  const prompt = `Proposal draft:\n${JSON.stringify(sections, null, 2)}`;

  return { system, prompt };
}
