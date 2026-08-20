import type { ProposalSectionKey } from "@/lib/types";

/**
 * Corrections 03 §3 — the proposal rules that are cheap to check exactly, so they are checked in
 * code rather than argued with a model. The Reviewer still sees every violation and still gets
 * the one revision pass, but "does this open with 'I am excited'" is a regex question, not a
 * judgment call.
 */
export const PROPOSAL_MIN_CHARS = 1000;
export const PROPOSAL_MAX_CHARS = 2000;
export const PROPOSAL_TARGET_CHARS = 1500;

/** Per-section character targets summing to PROPOSAL_TARGET_CHARS — given to the Writer. */
export const SECTION_CHAR_TARGET: Record<ProposalSectionKey, number> = {
  hook: 220,
  businessProblem: 220,
  solution: 350,
  proof: 250,
  portfolio: 200,
  question: 130,
  cta: 130,
};

/** Openers that make a proposal indistinguishable from the other 29 in the stack. */
const BANNED_OPENER_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /^\s*(hi|hello|hey|dear|greetings)\b[^.?!]{0,30}[,.!]?\s*i(?:'m| am)\b/i, label: "greeting followed by self-introduction" },
  { pattern: /^\s*i(?:'m| am)\s+(?:very\s+|really\s+|super\s+)?(?:excited|thrilled|interested|passionate|happy|glad)\b/i, label: '"I am excited/interested"' },
  { pattern: /^\s*i\s+(?:came across|saw|read|noticed|found|just read)\b/i, label: '"I came across your job post"' },
  { pattern: /^\s*(?:with|having)\s+(?:over\s+)?\d+\+?\s+years?\b/i, label: '"With X years of experience"' },
  { pattern: /^\s*(?:as\s+an?\s+[a-z\s]{3,30}\s+with|i\s+have\s+(?:over\s+)?\d+)/i, label: "credential-first opening" },
  { pattern: /^\s*(?:thank you|thanks)\s+for\s+(?:posting|sharing|the opportunity)/i, label: "thank-you preamble" },
  { pattern: /^\s*i\s+(?:can|will|would love to|would like to)\b/i, label: "first-person offer as the opening clause" },
];

export interface ProposalSectionLike {
  key: ProposalSectionKey;
  content: string;
}

export function proposalPlainText(sections: ProposalSectionLike[]): string {
  return sections
    .map((s) => s.content.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function proposalCharCount(sections: ProposalSectionLike[]): number {
  return proposalPlainText(sections).length;
}

export interface RuleViolation {
  rule: "length_over" | "length_under" | "banned_opener";
  message: string;
}

/**
 * The Writer's output is a draft until this passes. Length is checked on the assembled proposal,
 * banned openers only on the hook — a later section may legitimately say "I can start Monday".
 */
export function checkProposalRules(sections: ProposalSectionLike[]): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const chars = proposalCharCount(sections);

  if (chars > PROPOSAL_MAX_CHARS) {
    violations.push({
      rule: "length_over",
      message: `Proposal is ${chars} characters, over the ${PROPOSAL_MAX_CHARS} ceiling. Cut proof adjectives and pleasantries first. Never cut the mirror opening or the question.`,
    });
  }
  if (chars < PROPOSAL_MIN_CHARS) {
    violations.push({
      rule: "length_under",
      message: `Proposal is ${chars} characters, under the ${PROPOSAL_MIN_CHARS} floor. Add specificity to the solution and proof sections, not padding.`,
    });
  }

  const hook = sections.find((s) => s.key === "hook")?.content ?? "";
  for (const { pattern, label } of BANNED_OPENER_PATTERNS) {
    if (pattern.test(hook)) {
      violations.push({
        rule: "banned_opener",
        message: `Opening uses a banned pattern (${label}). The first two sentences must name the client's situation in language adapted from their post, before any mention of the freelancer.`,
      });
      break;
    }
  }

  return violations;
}
