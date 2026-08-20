/**
 * One place for model IDs — never inline a model string in a prompt file or route handler.
 * Verified live against this account before wiring in (curl test, 2026-08-06): both IDs respond.
 */
export const MODELS = {
  reasoning: "claude-sonnet-4-6", // Stages 4, 6, 8, 10: judgment and writing
  // Stages 1, 5, 9 are extraction and formatting, not judgment. Haiku does them at a fraction of
  // the latency, which is what makes the Corrections 03 §2 per-stage budgets reachable — on
  // Sonnet these stages alone regularly blew past 20s.
  mechanical: "claude-haiku-4-5-20251001",
} as const;

export const STAGE_MODEL = {
  parser: MODELS.mechanical,
  jobAnalyzer: MODELS.mechanical,
  clientAnalyzer: MODELS.mechanical,
  scorer: MODELS.reasoning,
  strategist: MODELS.reasoning,
  psychology: MODELS.reasoning,
  writer: MODELS.reasoning,
  screening: MODELS.mechanical,
  reviewer: MODELS.reasoning,
  rewriteSection: MODELS.reasoning,
  tightenAnswer: MODELS.mechanical,
} as const;

export type PipelineStage = keyof typeof STAGE_MODEL;
