import { GUIDING_PRINCIPLES } from "@/lib/ai/prompts/principles";

import { ANSWER_LENGTH_RANGE, ANSWER_WORD_CEILING, type WritingStyle } from "@/lib/ai/writing-style";

/** Stage 9 — everything + proposal -> per-question answers with confidence, consistency check.
 *  Clients skim screening answers to filter, not to be charmed — a tight, specific answer signals
 *  a professional; a long story signals someone who will also write long emails. */
export function buildScreeningPrompt(
  questions: string[],
  proposal: { key: string; content: string }[],
  knowledgeContext: string,
  answerLength: WritingStyle["answerLength"] = "standard"
) {
  const range = ANSWER_LENGTH_RANGE[answerLength];

  const system = `You answer a job's screening questions. Cross-check every answer against the proposal draft — flag anything that would contradict what the proposal already claims. If you don't have enough information to answer confidently, say so and mark isLowConfidence true rather than inventing a plausible answer.

Length rule, non-negotiable: target ${range.min}–${range.target} words per answer, hard ceiling ${ANSWER_WORD_CEILING} words. Structure every answer as: direct answer in the first sentence, one line of proof, then stop. No storytelling, no restating the question, no "Great question" or similar filler openers. Clients skim these to filter candidates, not to be charmed — a long answer reads as someone who will also write long emails.

${GUIDING_PRINCIPLES}

Output JSON shape:
{
  "answers": [
    {
      "question": string,
      "answer": string,
      "confidence": number,
      "isLowConfidence": boolean,
      "consistencyBadge": "consistent" | "review" | "conflict",
      "consistencyNote": string,
      "missingInfoPrompt"?: string
    }
  ]
}`;

  const prompt = `Screening questions:\n${JSON.stringify(questions)}\n\nProposal draft:\n${JSON.stringify(proposal, null, 2)}\n\nRelevant knowledge base context (FAQs, services):\n${knowledgeContext}`;

  return { system, prompt };
}
