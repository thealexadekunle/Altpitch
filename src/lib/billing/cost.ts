import { MODELS } from "@/lib/ai/models";

/**
 * API spend per pipeline run, derived from the token counts already logged to `pipeline_runs`.
 * This is what turns the Corrections 03 §5 unit-economics guardrail from a plan into a number:
 * the admin financial view reports measured cost per credit, and the grant size in plans.ts is
 * set from it.
 *
 * Rates are USD per million tokens. Update them here — nowhere else reads a price.
 */
export const TOKEN_RATES_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
};

/** A model that ran before its rate was added still costs something — Sonnet rates are the
 * conservative stand-in, and the model ids in use live in lib/ai/models.ts. */
const FALLBACK_RATE = TOKEN_RATES_USD_PER_MTOK[MODELS.reasoning] ?? { input: 3, output: 15 };

export function stageCostUsd(model: string, inputTokens: number | null, outputTokens: number | null): number {
  const rate = TOKEN_RATES_USD_PER_MTOK[model] ?? FALLBACK_RATE;
  return ((inputTokens ?? 0) * rate.input + (outputTokens ?? 0) * rate.output) / 1_000_000;
}

/** Every stage of one run summed — one credit's worth of API spend. */
export function runCostUsd(stages: { model: string; inputTokens: number | null; outputTokens: number | null }[]): number {
  return stages.reduce((total, s) => total + stageCostUsd(s.model, s.inputTokens, s.outputTokens), 0);
}
