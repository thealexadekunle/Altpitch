import { GUIDING_PRINCIPLES } from "@/lib/ai/prompts/principles";
import { ANSWER_LENGTH_RANGE, ANSWER_WORD_CEILING, type WritingStyle } from "@/lib/ai/writing-style";

/** "Tighten" button on a screening answer — real rewrite to a shorter variant, same facts. */
export function buildTightenAnswerPrompt(
  question: string,
  currentAnswer: string,
  answerLength: WritingStyle["answerLength"] = "standard"
) {
  const range = ANSWER_LENGTH_RANGE[answerLength];

  const system = `You shorten one screening question answer. Keep every fact, drop everything else — no storytelling, no restating the question, no filler openers. Direct answer first sentence, one line of proof, stop.

Target ${range.min}–${range.target} words, hard ceiling ${ANSWER_WORD_CEILING}.

${GUIDING_PRINCIPLES}

Output JSON shape:
{ "answer": string }`;

  const prompt = `Question: ${question}\n\nCurrent answer:\n${currentAnswer}`;

  return { system, prompt };
}
