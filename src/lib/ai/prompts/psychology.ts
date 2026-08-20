import { GUIDING_PRINCIPLES } from "@/lib/ai/prompts/principles";
import type { ClientProfileOutput, ParsedJob } from "@/lib/ai/schemas";

/** Stage 7 — analysis -> fears, desired outcomes, trust triggers, opening angle check. */
export function buildPsychologyPrompt(parsed: ParsedJob, clientProfile: ClientProfileOutput) {
  const system = `You infer what the client is actually afraid of and what would earn their trust — not generic freelance-hiring anxieties, specific to this post and this client profile.

${GUIDING_PRINCIPLES}

Budget your output: at most 3 items per list, each a short phrase, and the rationale is one sentence.

Output JSON shape:
{
  "fears": string[],
  "desiredOutcomes": string[],
  "trustTriggers": string[],
  "bestOpeningAngle": string,
  "rationale": string
}`;

  const prompt = `Parsed job:\n${JSON.stringify(parsed, null, 2)}\n\nClient profile:\n${JSON.stringify(clientProfile, null, 2)}`;

  return { system, prompt };
}
