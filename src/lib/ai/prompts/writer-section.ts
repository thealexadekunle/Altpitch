import { GUIDING_PRINCIPLES } from "@/lib/ai/prompts/principles";
import { getNichePack } from "@/lib/ai/niches";
import {
  PROPOSAL_MAX_CHARS,
  PROPOSAL_MIN_CHARS,
  PROPOSAL_TARGET_CHARS,
  SECTION_CHAR_TARGET,
  type RuleViolation,
} from "@/lib/ai/proposal-rules";
import type { ParsedJob, PsychologyOutput, ScorerOutput, StrategistOutput } from "@/lib/ai/schemas";
import type { WritingStyle } from "@/lib/ai/writing-style";
import type { ProposalSectionKey } from "@/lib/types";

interface RetrievedItem {
  id: string;
  title: string;
  body: string;
  outcomeMetric?: string | null;
}

export interface SectionContext {
  parsed: ParsedJob;
  analysis: ScorerOutput;
  strategy: StrategistOutput;
  psychology: PsychologyOutput;
  retrieved: RetrievedItem[];
  writingStyle: WritingStyle;
  /** Corrections 03 §1 — Retriever came back empty. Write the draft anyway, mark the gap. */
  noProofMode: boolean;
}

interface WrittenSection {
  key: ProposalSectionKey;
  content: string;
}

export const PROPOSAL_SECTION_ORDER: { key: ProposalSectionKey; label: string; instruction: string }[] = [
  {
    key: "hook",
    label: "Hook",
    instruction:
      "The mirror. Name this client's situation in language adapted from their own post — their goal, their constraint, or the thing they emphasized. No greeting, no self-introduction, no mention of the freelancer at all.",
  },
  {
    key: "businessProblem",
    label: "Business problem",
    instruction:
      "What the status quo is costing them, in their terms, grounded in the psychology read. Still their world, not the freelancer's résumé.",
  },
  { key: "solution", label: "Solution", instruction: "A phased approach with concrete deliverables and a timeline. Specific enough to argue with." },
  { key: "proof", label: "Proof", instruction: "The single most relevant retrieved outcome, stated as a result, not an adjective." },
  { key: "portfolio", label: "Portfolio", instruction: "Name the most relevant retrieved item and why it maps, then offer to share it." },
  { key: "question", label: "Question", instruction: "The one question worth this client's time — the niche pack names it." },
  { key: "cta", label: "CTA", instruction: "A small, low-friction next step with a clear ask." },
];

export const OPENING_KEYS: ProposalSectionKey[] = ["hook", "businessProblem"];
export const BODY_KEYS: ProposalSectionKey[] = ["solution", "proof", "portfolio", "question", "cta"];
export const ALL_SECTION_KEYS: ProposalSectionKey[] = [...OPENING_KEYS, ...BODY_KEYS];

function sectionSpecList(keys: ProposalSectionKey[]) {
  return PROPOSAL_SECTION_ORDER.filter((s) => keys.includes(s.key))
    .map((s) => `- "${s.key}" (${s.label}, ~${SECTION_CHAR_TARGET[s.key]} characters): ${s.instruction}`)
    .join("\n");
}

/**
 * Shared Writer system prompt. Corrections 03 §3: one person writing to one specific client.
 *
 * Three mechanisms do the work — the mirror-first opening (banned openers are also checked in
 * code, see proposal-rules.ts), the niche pack that decides what proof convinces here, and the
 * psychology payload, which is required input rather than background colour: the chosen trust
 * trigger has to be identifiable in the draft.
 */
function buildWriterSystem(context: SectionContext, keys: ProposalSectionKey[]) {
  const { parsed, psychology, retrieved, writingStyle, noProofMode } = context;
  const pack = getNichePack(parsed.niche);

  const proofRule = noProofMode
    ? `NO-PROOF MODE: the knowledge base returned nothing relevant to this job. Write the proposal anyway. In the "proof" and "portfolio" sections, do NOT invent, imply, or vaguely gesture at past work. Write the section around the approach instead, and end it with this exact inline marker on its own line: [Add a relevant work sample here]. A visible gap is a draft the user can fix; a fabricated claim destroys the deal.`
    : `You may only cite the retrieved items below. Reference the SINGLE most relevant one specifically — its outcome, with the number, never adjectives about it. Then include a natural line offering to share that work (the export attaches its link or file). Claiming unverifiable experience destroys trust; offering to show specific relevant work converts.`;

  return `You write an Upwork proposal as one person writing to one specific client. You are writing these sections:

${sectionSpecList(keys)}

NICHE: ${pack.label}
- What convinces here: ${pack.proof}
- Register: ${pack.register}
- Opening guidance: ${pack.hook}
- The question worth asking here: ${pack.question}

PSYCHOLOGY (required input, not background — the trust trigger you pick must be identifiable in the draft):
- Fears: ${psychology.fears.join("; ") || "(none read)"}
- Desired outcomes: ${psychology.desiredOutcomes.join("; ") || "(none read)"}
- Trust triggers: ${psychology.trustTriggers.join("; ") || "(none read)"}
- Best opening angle: ${psychology.bestOpeningAngle}

HARD RULES:
- The whole proposal is ${PROPOSAL_MIN_CHARS}–${PROPOSAL_MAX_CHARS} characters, target ~${PROPOSAL_TARGET_CHARS}. Respect the per-section character targets above. Clients skim 30 proposals; the ones that get read fit on one screen.
- The first two sentences are about the client's situation. Never open with a greeting, "I am excited", "I came across your job post", "With X years of experience", or any sentence whose subject is the freelancer.
- ${proofRule}
- No pleasantries, no preamble, no summary of what you are about to say.
- Write plain sentences. No em-dash-heavy prose, no bulleted brochure copy unless the solution section genuinely reads better as steps.

STYLE: tone "${writingStyle.tone}", formality ${writingStyle.formality}/100.${writingStyle.avoidPhrases.length ? ` Never use these phrases: ${writingStyle.avoidPhrases.join(", ")}.` : ""}${writingStyle.preferredOpening ? ` The user's preferred opening pattern, if it does not conflict with the mirror rule: ${writingStyle.preferredOpening}.` : ""}

${GUIDING_PRINCIPLES}

Retrieved proof (${retrieved.length} item${retrieved.length === 1 ? "" : "s"}${noProofMode ? " — EMPTY, no-proof mode" : ""}):
${JSON.stringify(retrieved, null, 2)}

Output JSON shape, exactly these keys in this order:
{ "sections": [ ${keys.map((k) => `{ "key": "${k}", "content": string }`).join(", ")} ] }`;
}

function buildContextBlock(context: SectionContext) {
  const { parsed, analysis, strategy } = context;
  return `Job post (structured):\n${JSON.stringify(parsed, null, 2)}\n\nAnalysis:\n${JSON.stringify({ verdict: analysis.verdict, fitScore: analysis.fitScore, winProbability: analysis.winProbability, competitionEstimate: analysis.competitionEstimate, verdictRationale: analysis.verdictRationale }, null, 2)}\n\nStrategy angle:\n${strategy.strategyAngle}`;
}

/** Call 1 — the opening block. Awaited alone so the mirror reaches the Studio first. */
export function buildOpeningPrompt(context: SectionContext) {
  return {
    system: buildWriterSystem(context, OPENING_KEYS),
    prompt: `${buildContextBlock(context)}\n\nWrite the opening: "hook" then "businessProblem".`,
  };
}

/** Call 2 — everything after the opening, written to be consistent with it. */
export function buildBodyPrompt(context: SectionContext, opening: WrittenSection[]) {
  return {
    system: buildWriterSystem(context, BODY_KEYS),
    prompt: `${buildContextBlock(context)}\n\nThe opening is already written — continue from it, don't repeat or contradict it:\n${JSON.stringify(opening, null, 2)}\n\nWrite the remaining sections.`,
  };
}

/**
 * The single revision pass. Fires when the Reviewer scores the draft unsendable or the
 * deterministic rules failed — the revision rewrites the whole proposal in one call, so a
 * revision costs one Claude call rather than re-running seven.
 */
export function buildRevisionPrompt(
  context: SectionContext,
  sections: WrittenSection[],
  violations: RuleViolation[],
  reviewerNote: string | null
) {
  const notes = [...violations.map((v) => `- ${v.message}`), reviewerNote ? `- Reviewer: ${reviewerNote}` : null]
    .filter(Boolean)
    .join("\n");

  return {
    system: buildWriterSystem(context, PROPOSAL_SECTION_ORDER.map((s) => s.key)),
    prompt: `${buildContextBlock(context)}\n\nCurrent draft:\n${JSON.stringify(sections, null, 2)}\n\nThis draft failed review:\n${notes}\n\nRewrite all seven sections fixing exactly these problems. When cutting for length, cut proof adjectives and pleasantries first — never the mirror opening and never the question.`,
  };
}
