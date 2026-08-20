import { GUIDING_PRINCIPLES } from "@/lib/ai/prompts/principles";
import { getNichePack } from "@/lib/ai/niches";
import type { ParsedJob, ScorerOutput } from "@/lib/ai/schemas";

interface RetrievedItem {
  id: string;
  title: string;
  body: string;
  outcomeMetric?: string | null;
}

/** Stage 6 — analysis + retrieved proof -> angle, proof selection. Only sees what Retriever
 * returned, and loads the same niche pack the Writer will (Corrections 03 §3b) so the angle it
 * picks is one this niche's clients actually respond to. */
export function buildStrategistPrompt(analysis: ScorerOutput, retrieved: RetrievedItem[], parsed: ParsedJob, activeInsights: string[] = []) {
  const pack = getNichePack(parsed.niche);
  const insightsBlock =
    activeInsights.length > 0
      ? `\n\nThis user's own historical pattern (learning engine, informational only — never invent a claim on the strength of this alone, and never mention it to the client): ${activeInsights.join(" ")}`
      : "";
  const system = `You choose the angle a proposal will open with and which proof items to use. You may only select from the knowledge base items provided below by their exact "id" value — if nothing retrieved is relevant, return an empty array rather than inventing an id or reaching for something unlisted.

Niche: ${pack.label}. What convinces a client here: ${pack.proof} The angle must be one this kind of client responds to.${insightsBlock}

The angle names the CLIENT's situation, never the freelancer's credentials — the proposal's first two sentences will be built from it.

The user has already decided to draft this proposal — that decision is made, not yours to revisit. Always produce a genuine, specific opening angle grounded in the score breakdown and competition notes below, even when the overall verdict was borderline or skip. Never output "skip", "pass", or any verdict-like word as the angle itself — that is a category error, not a valid answer.

${GUIDING_PRINCIPLES}

Output JSON shape:
{
  "strategyAngle": string,
  "selectedPortfolioIds": string[]
}`;

  const prompt = `Job:\n${JSON.stringify({ title: parsed.title, niche: parsed.niche, deliverables: parsed.deliverables, budget: parsed.budget }, null, 2)}\n\nScore breakdown and competition notes (verdict already decided — use this only to inform the angle, not to restate it):\n${JSON.stringify(
    { scoreBreakdown: analysis.scoreBreakdown, competitionRationale: analysis.competitionRationale },
    null,
    2
  )}\n\nRetrieved knowledge base items (only source of proof allowed):\n${JSON.stringify(retrieved, null, 2)}`;

  return { system, prompt };
}
