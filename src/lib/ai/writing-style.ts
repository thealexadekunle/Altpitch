/** Shared shape for the Writer and Screening stages — the user's writing preferences, resolved
 * from `profiles.writing_style` with defaults applied. Not an LLM output, so it lives outside schemas.ts. */
export interface WritingStyle {
  tone: "professional" | "conversational" | "direct" | "warm";
  formality: number;
  maxProposalWords: number;
  avoidPhrases: string[];
  preferredOpening: string;
  answerLength: "concise" | "standard";
}

export const ANSWER_LENGTH_RANGE: Record<WritingStyle["answerLength"], { min: number; target: number }> = {
  concise: { min: 40, target: 70 },
  standard: { min: 70, target: 100 },
};

export const ANSWER_WORD_CEILING = 120;
