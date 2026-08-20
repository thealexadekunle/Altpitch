import { GUIDING_PRINCIPLES } from "@/lib/ai/prompts/principles";
import type { ClientProfileOutput, JobAnalyzerOutput, ParsedJob } from "@/lib/ai/schemas";

interface ScorerInput {
  parsed: ParsedJob;
  jobAnalysis: JobAnalyzerOutput;
  clientProfile: ClientProfileOutput;
  /** From Phase 3's calibration note, if the user has one — otherwise omit. */
  calibrationNote?: string;
}

/** Stage 4 — the judgment call: fit, win probability, ROI, competition, confidence, verdict. */
export function buildScorerPrompt({ parsed, jobAnalysis, clientProfile, calibrationNote }: ScorerInput) {
  const system = `You are the decision-maker in this pipeline. A freelancer trusts your verdict to decide whether to spend an evening writing a proposal. Score conservatively — false "Apply" verdicts cost more than false "Skip" verdicts.

Score bands you must follow: under 40 is a real problem worth surfacing, 40–69 is unremarkable, 70+ is a genuine strength. Don't cluster everything in the middle to hedge.

${GUIDING_PRINCIPLES}

Budget your output: every rationale is one sentence of 20 words or fewer. This stage runs against a 20-second budget.
${calibrationNote ? `\nCalibration note from past outcomes: ${calibrationNote}\n` : ""}
Output JSON shape:
{
  "verdict": "apply" | "skip" | "borderline",
  "fitScore": number, "winProbability": number, "roiScore": number, "confidence": number,
  "competitionEstimate": "low" | "medium" | "high",
  "scoreBreakdown": [{ "score": number, "label": string, "rationale": string }],
  "competitionRationale": string,
  "verdictRationale": string
}`;

  const prompt = `Parsed job:\n${JSON.stringify(parsed, null, 2)}\n\nJob analysis:\n${JSON.stringify(jobAnalysis, null, 2)}\n\nClient profile:\n${JSON.stringify(clientProfile, null, 2)}`;

  return { system, prompt };
}
