import { GUIDING_PRINCIPLES } from "@/lib/ai/prompts/principles";
import type { ProposalSectionKeySchema } from "@/lib/ai/schemas";
import type { z } from "zod";

/** "Rewrite section" — a genuinely different angle for one section, not the whole proposal. */
export function buildRewriteSectionPrompt(
  sectionKey: z.infer<typeof ProposalSectionKeySchema>,
  currentContent: string,
  fullProposalContext: string
) {
  const system = `You rewrite one section of an Upwork proposal with a genuinely different angle from the current version — not a synonym swap. Keep it consistent with the rest of the proposal, which is provided for context only; do not rewrite any other section.

${GUIDING_PRINCIPLES}

Output JSON shape:
{ "content": string }`;

  const prompt = `Section to rewrite: "${sectionKey}"\n\nCurrent content:\n${currentContent}\n\nFull proposal for context:\n${fullProposalContext}`;

  return { system, prompt };
}
