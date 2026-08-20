import type { PipelineStage } from "@/lib/ai/models";

/**
 * Corrections 03 §2. An hour-long run is a broken product, not a slow one: the premise is
 * applying before the crowd. Every stage is capped, and the orchestrator stops handing out
 * new stages once the whole run passes PIPELINE_CEILING_MS.
 */
export const STAGE_TIMEOUT_MS: Record<PipelineStage, number> = {
  // Corrections 03 §2 specifies 10s. Measured p50 is ~3.4s on Haiku, but the API's own tail
  // latency put occasional runs just past 10s, failing an otherwise healthy pipeline. 15s keeps
  // the analysis half well inside the 60s p50 target while surviving that tail.
  parser: 15_000,
  jobAnalyzer: 20_000,
  clientAnalyzer: 20_000,
  scorer: 20_000,
  strategist: 20_000,
  psychology: 20_000,
  writer: 45_000,
  screening: 25_000,
  reviewer: 20_000,
  rewriteSection: 20_000,
  tightenAnswer: 10_000,
};

/**
 * Output tokens are the dominant term in stage latency, so each stage gets only as much room as
 * its schema actually needs. Uncapped 4096-token budgets were the difference between a stage
 * landing in 8s and blowing through its timeout.
 */
export const STAGE_MAX_TOKENS: Record<PipelineStage, number> = {
  parser: 1200,
  jobAnalyzer: 1100,
  clientAnalyzer: 800,
  scorer: 1000,
  strategist: 400,
  psychology: 600,
  writer: 1600,
  screening: 1000,
  reviewer: 700,
  rewriteSection: 700,
  tightenAnswer: 400,
};

export const PIPELINE_CEILING_MS = 120_000;
/** Below this, a stage cannot finish anything useful — skip it and return the partial instead of
 * spending a call that is guaranteed to abort mid-flight. */
export const MIN_STAGE_MS = 5_000;
export const PIPELINE_P50_TARGET_MS = 60_000;

export class StageTimeoutError extends Error {
  constructor(
    public stage: PipelineStage,
    public timeoutMs: number
  ) {
    super(`Stage "${stage}" exceeded its ${timeoutMs}ms budget`);
    this.name = "StageTimeoutError";
  }
}

/** Tracks the wall clock for one pipeline run so stages can be skipped once the ceiling hits. */
export class RunBudget {
  readonly startedAt = Date.now();

  constructor(private readonly ceilingMs: number = PIPELINE_CEILING_MS) {}

  get elapsedMs(): number {
    return Date.now() - this.startedAt;
  }

  get remainingMs(): number {
    return Math.max(this.ceilingMs - this.elapsedMs, 0);
  }

  get exhausted(): boolean {
    return this.remainingMs <= MIN_STAGE_MS;
  }

  /** A stage never gets longer than what's left of the whole run. */
  allowanceFor(stage: PipelineStage): number {
    return Math.min(STAGE_TIMEOUT_MS[stage], this.remainingMs);
  }
}
