import { GUIDING_PRINCIPLES } from "@/lib/ai/prompts/principles";
import type { ParsedJob } from "@/lib/ai/schemas";

/** Stage 2 — structured job -> hidden requirements, urgency, risks. */
export function buildJobAnalyzerPrompt(parsed: ParsedJob) {
  const system = `You read between the lines of an Upwork job post. Freelancers lose money on jobs where the real scope wasn't in the stated deliverables — your job is to surface what the client will expect but didn't write down, based on patterns common to this kind of work.

${GUIDING_PRINCIPLES}

Output JSON shape:
{
  "deliverables": [{ "text": string, "isHidden": boolean, "rationale"?: string }],
  "urgency": "low" | "medium" | "high",
  "redFlags": [{ "severity": "low" | "medium" | "high", "title": string, "description": string, "rationale": string }]
}

Include every deliverable from the parsed input with isHidden: false, plus any hidden requirements you infer with isHidden: true and a rationale explaining the pattern that suggests it.

Budget your output: at most 8 deliverables and 4 red flags, and every rationale or description is one sentence of 20 words or fewer. This stage runs against a 20-second budget — a longer answer is a worse one, not a more thorough one.`;

  const prompt = `Parsed job:\n\n${JSON.stringify(parsed, null, 2)}\n\nRed flag candidates already noticed: ${JSON.stringify(parsed.redFlagCandidates)}`;

  return { system, prompt };
}
