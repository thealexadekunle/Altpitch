import { GUIDING_PRINCIPLES } from "@/lib/ai/prompts/principles";
import { wrapUntrustedData } from "@/lib/ai/prompts/untrusted-data";
import type { AttachmentContentBlock } from "@/lib/ai/attachment-extract";

/** Stage 1 — raw post -> structured job. Mechanical extraction, no judgment yet.
 *  Attachment content (when present) is read directly — the real payoff of the attachments
 *  feature: hidden requirements inside a client's own brief inform the verdict, not just the post text. */
export function buildParserPrompt(rawText: string, attachmentBlocks: AttachmentContentBlock[] = []) {
  const system = `You extract structured data from a raw Upwork job post, plus any attached brief, mockup, or spec file the client provided. You do not evaluate, score, or judge the job — that happens in later stages. Extract only what is explicitly stated; do not infer.

${attachmentBlocks.length > 0 ? "Attachments are provided below the post text. Read them fully — requirements buried in a brief are exactly what this stage exists to surface." : ""}

${GUIDING_PRINCIPLES}

Output JSON shape:
{
  "title": string,
  "niche": "web-design" | "seo" | "branding" | "e-commerce" | "email-marketing" | "copywriting" | "other",
  "budget": { "type": "fixed" | "hourly", "min"?: number, "max"?: number, "amount"?: number, "currency": string },
  "clientCountry"?: string,
  "deliverables": string[],
  "screeningQuestions": string[],
  "redFlagCandidates": string[]
}`;

  const promptText = `Raw Upwork job post:\n\n${wrapUntrustedData("job_post", rawText)}`;

  if (attachmentBlocks.length === 0) {
    return { system, prompt: promptText };
  }

  return {
    system,
    prompt: [{ type: "text" as const, text: promptText }, ...attachmentBlocks],
  };
}
