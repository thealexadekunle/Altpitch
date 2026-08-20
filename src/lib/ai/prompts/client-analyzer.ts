import { GUIDING_PRINCIPLES } from "@/lib/ai/prompts/principles";
import { wrapUntrustedData } from "@/lib/ai/prompts/untrusted-data";
import type { ParsedJob } from "@/lib/ai/schemas";

/** Stage 3 — wording + history -> decision style, values, objections. */
export function buildClientAnalyzerPrompt(rawText: string, parsed: ParsedJob) {
  const system = `You read a client's wording and any visible hiring signals (payment verification, spend, ratings, job count) to infer how they make decisions and what they value. You are profiling the client, not the job.

${GUIDING_PRINCIPLES}

Output JSON shape:
{
  "decisionStyle": string,
  "inferredValues": string[],
  "hiringHistory"?: string,
  "paymentVerified": boolean,
  "spendTier"?: string,
  "rating"?: number,
  "jobsPosted"?: number,
  "hireRate"?: number,
  "rationale": string
}

Only set numeric/history fields if the post actually shows them — omit rather than guess.`;

  const prompt = `Raw post:\n\n${wrapUntrustedData("job_post", rawText)}\n\nParsed summary:\n${JSON.stringify(parsed, null, 2)}`;

  return { system, prompt };
}
