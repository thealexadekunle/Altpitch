import { z } from "zod";
import type { ProposalSectionKey } from "@/lib/types";

/**
 * One schema per pipeline stage output. Each mirrors the shape `lib/types` already defines —
 * Claude is prompted to emit JSON matching the app's own types directly, so there is no
 * separate "API shape" to transform at this boundary. Claude output is untrusted input:
 * every stage response is parsed through its schema before touching the database or the UI.
 */

/** Every "optional" field below uses this, not bare `.optional()` — Claude routinely emits an
 * explicit `null` for a field it has no data for rather than omitting the key, and a bare
 * `.optional()` schema rejects that (found via the adversarial fixture tests, not a hypothetical:
 * a real, non-adversarial job post with an unstated client country failed validation on this). */
function nullableOptional<T extends z.ZodTypeAny>(schema: T) {
  return schema.nullable().optional();
}

export const ScoreWithRationaleSchema = z.object({
  score: z.number().int().min(0).max(100),
  label: z.string(),
  rationale: z.string(),
});

// ---------------------------------------------------------------------------
// Stage 1 — Parser: raw post -> structured job
// ---------------------------------------------------------------------------
export const ParsedJobSchema = z.object({
  title: z.string(),
  niche: z.enum(["web-design", "seo", "branding", "e-commerce", "email-marketing", "copywriting", "other"]),
  budget: z.object({
    type: z.enum(["fixed", "hourly"]),
    min: nullableOptional(z.number()),
    max: nullableOptional(z.number()),
    amount: nullableOptional(z.number()),
    currency: z.string().default("USD"),
  }),
  clientCountry: nullableOptional(z.string()),
  deliverables: z.array(z.string()).describe("Explicitly stated deliverables only — no inference yet"),
  screeningQuestions: z.array(z.string()).describe("Verbatim screening questions from the post, if any"),
  redFlagCandidates: z.array(z.string()).describe("Phrases worth flagging for the risk stage, not yet scored"),
});
export type ParsedJob = z.infer<typeof ParsedJobSchema>;

// ---------------------------------------------------------------------------
// Stage 2 — Job Analyzer: hidden requirements, urgency, risks, niche confirmation
// ---------------------------------------------------------------------------
export const DeliverableSchema = z.object({
  text: z.string(),
  isHidden: z.boolean(),
  rationale: nullableOptional(z.string()),
});

export const JobAnalyzerOutputSchema = z.object({
  deliverables: z.array(DeliverableSchema),
  urgency: z.enum(["low", "medium", "high"]),
  redFlags: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high"]),
      title: z.string(),
      description: z.string(),
      rationale: z.string(),
    })
  ),
});
export type JobAnalyzerOutput = z.infer<typeof JobAnalyzerOutputSchema>;

// ---------------------------------------------------------------------------
// Stage 3 — Client Analyzer: decision style, values, objections
// ---------------------------------------------------------------------------
export const ClientProfileSchema = z.object({
  decisionStyle: z.string(),
  inferredValues: z.array(z.string()),
  hiringHistory: nullableOptional(z.string()),
  paymentVerified: z.boolean(),
  spendTier: nullableOptional(z.string()),
  rating: nullableOptional(z.number().min(0).max(5)),
  jobsPosted: nullableOptional(z.number().int()),
  hireRate: nullableOptional(z.number().min(0).max(100)),
  rationale: z.string(),
});
export type ClientProfileOutput = z.infer<typeof ClientProfileSchema>;

// ---------------------------------------------------------------------------
// Stage 4 — Scorer: fit, win probability, ROI, competition, confidence, verdict
// ---------------------------------------------------------------------------
export const ScorerOutputSchema = z.object({
  verdict: z.enum(["apply", "skip", "borderline"]),
  fitScore: z.number().int().min(0).max(100),
  winProbability: z.number().int().min(0).max(100),
  roiScore: z.number().int().min(0).max(100),
  competitionEstimate: z.enum(["low", "medium", "high"]),
  confidence: z.number().int().min(0).max(100),
  scoreBreakdown: z.array(ScoreWithRationaleSchema),
  competitionRationale: z.string(),
  verdictRationale: z.string(),
});
export type ScorerOutput = z.infer<typeof ScorerOutputSchema>;

// ---------------------------------------------------------------------------
// Stage 6 — Strategist: angle, opening insight, proof selection
// ---------------------------------------------------------------------------
const VERDICT_WORDS = new Set(["apply", "skip", "borderline", "pass"]);

export const StrategistOutputSchema = z.object({
  strategyAngle: z
    .string()
    .min(15, "strategyAngle must be a real sentence, not a one-word verdict")
    .refine((v) => !VERDICT_WORDS.has(v.trim().toLowerCase()), {
      message: 'strategyAngle must not be a bare verdict word like "skip" — the user already decided to draft this proposal',
    }),
  /** Deliberately NOT `.uuid()`. When the Retriever returns nothing, the model reliably emits
   * placeholder ids ("item-1", ""), which failed validation twice and threw before the proposal
   * row was ever inserted — the cause of runs that produced a verdict and no proposal at all.
   * The orchestrator filters these against the retrieved ids instead, so a bad id is dropped,
   * not fatal. */
  selectedPortfolioIds: z.array(z.string()).max(3),
});
export type StrategistOutput = z.infer<typeof StrategistOutputSchema>;

// ---------------------------------------------------------------------------
// Stage 7 — Psychology: fears, desired outcomes, trust triggers, opening angle
// ---------------------------------------------------------------------------
export const PsychologyOutputSchema = z.object({
  fears: z.array(z.string()),
  desiredOutcomes: z.array(z.string()),
  trustTriggers: z.array(z.string()),
  bestOpeningAngle: z.string(),
  rationale: z.string(),
});
export type PsychologyOutput = z.infer<typeof PsychologyOutputSchema>;

// ---------------------------------------------------------------------------
// Stage 8 — Writer: proposal sections. Never sees knowledge items the Retriever
// didn't return — that's how "never invent experience" is enforced structurally.
// ---------------------------------------------------------------------------
export const ProposalSectionKeySchema = z.enum([
  "hook",
  "businessProblem",
  "solution",
  "proof",
  "portfolio",
  "question",
  "cta",
]);

export const WriterOutputSchema = z.object({
  sections: z
    .array(
      z.object({
        key: ProposalSectionKeySchema,
        label: z.string(),
        content: z.string(),
        alternativeContent: z.string(),
      })
    )
    .length(7),
});
export type WriterOutput = z.infer<typeof WriterOutputSchema>;

/** What a Writer call actually returns (Corrections 03): keys and prose, nothing else. Labels come
 * from PROPOSAL_SECTION_ORDER and the alternative is generated on demand by "Rewrite section" —
 * eagerly generating an unused alternative for all seven sections doubled every draft. */
export const WriterSectionsSchema = z.object({
  sections: z
    .array(
      z.object({
        key: ProposalSectionKeySchema,
        content: z.string().min(1),
      })
    )
    .min(1),
});
export type WriterSectionsOutput = z.infer<typeof WriterSectionsSchema>;

/** A Writer call that silently drops a section leaves a proposal with a hole in it. Requiring the
 * exact key set means a miss fails validation, which routes it through the same single retry as
 * any other malformed response instead of reaching the database. */
export function writerSectionsSchemaFor(keys: readonly ProposalSectionKey[]) {
  return WriterSectionsSchema.refine(
    (value) => keys.every((key) => value.sections.some((section) => section.key === key && section.content.trim())),
    { message: `sections must include all of: ${keys.join(", ")} — every key, each with content` }
  );
}

/** One-section rewrite, used by "Rewrite section" in Proposal Studio. */
export const SectionRewriteSchema = z.object({
  content: z.string(),
});
export type SectionRewriteOutput = z.infer<typeof SectionRewriteSchema>;

// ---------------------------------------------------------------------------
// Stage 9 — Screening: per-question answers, confidence, consistency check
// ---------------------------------------------------------------------------
const answerWordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const ScreeningOutputSchema = z.object({
  answers: z.array(
    z.object({
      question: z.string(),
      answer: z
        .string()
        .refine((a) => answerWordCount(a) <= 120, {
          message: "Answer exceeds the 120-word hard ceiling — tighten it: direct answer, one line of proof, stop.",
        }),
      confidence: z.number().int().min(0).max(100),
      isLowConfidence: z.boolean(),
      consistencyBadge: z.enum(["consistent", "review", "conflict"]),
      consistencyNote: z.string(),
      missingInfoPrompt: nullableOptional(z.string()),
    })
  ),
});
export type ScreeningOutput = z.infer<typeof ScreeningOutputSchema>;

/** "Tighten" — real rewrite of one screening answer to a shorter variant. */
export const TightenAnswerSchema = z.object({
  answer: z.string().refine((a) => answerWordCount(a) <= 120, {
    message: "Tightened answer still exceeds the 120-word ceiling.",
  }),
});
export type TightenAnswerOutput = z.infer<typeof TightenAnswerSchema>;

// ---------------------------------------------------------------------------
// Stage 10 — Reviewer: proposal + answers -> scores. One revision pass max.
// ---------------------------------------------------------------------------
export const ReviewerOutputSchema = z.object({
  review: z.object({
    relevance: ScoreWithRationaleSchema,
    specificity: ScoreWithRationaleSchema,
    readability: ScoreWithRationaleSchema,
    authenticity: ScoreWithRationaleSchema,
    trust: ScoreWithRationaleSchema,
    ctaStrength: ScoreWithRationaleSchema,
    predictedReplyLikelihood: ScoreWithRationaleSchema,
  }),
  needsRevision: z.boolean(),
  revisionNote: nullableOptional(z.string()),
});
export type ReviewerOutput = z.infer<typeof ReviewerOutputSchema>;
