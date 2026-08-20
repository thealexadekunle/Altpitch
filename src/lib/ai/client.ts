import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import type { z } from "zod";
import type { PipelineStage } from "@/lib/ai/models";
import { STAGE_MODEL } from "@/lib/ai/models";
import { STAGE_MAX_TOKENS, STAGE_TIMEOUT_MS, StageTimeoutError } from "@/lib/ai/budget";
import { scopedDb } from "@/lib/db/scoped";

/** Constructed on first use, not at module load: the SDK resolves its credentials in the
 * constructor, so an eager client captures whatever the environment looked like at import time —
 * which is before dotenv runs in the test suite, and before env is populated at build time. */
let client: Anthropic | null = null;
function anthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      // The SDK retries twice by default. Those retries are invisible to this file, share the
      // stage's abort deadline, and are exactly the kind of hidden multiplier Corrections 03 §2
      // bans — an overloaded API turned into three serial calls inside one 20s budget. Retry
      // policy lives here instead: exactly one, and only for a validation failure.
      maxRetries: 0,
    });
  }
  return client;
}

type MessageContent = Anthropic.Messages.MessageParam["content"];

interface RunStageArgs<T> {
  stage: PipelineStage;
  system: string;
  prompt: string | MessageContent;
  schema: z.ZodType<T>;
  userId: string;
  jobId?: string;
  proposalId?: string;
  maxTokens?: number;
  /** Defaults to the stage's budget; the orchestrator passes whatever is left of the run. */
  timeoutMs?: number;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate.trim());
}

/**
 * Runs one pipeline stage: calls Claude under a hard timeout, validates the response against
 * `schema`, retries EXACTLY once with the validation error appended, then throws so the
 * orchestrator can render a partial result.
 *
 * Every stage writes a `pipeline_runs` row on entry (status "running") and updates it on exit —
 * ok, validation_failed, timeout, or error. Before this, a stage that threw left no trace at all,
 * which is why a run could die between the verdict and the proposal with nothing to point at.
 * A timeout is a stage failure, never a hang: the abort propagates to the HTTP request.
 */
export async function runStage<T>({
  stage,
  system,
  prompt,
  schema,
  userId,
  jobId,
  proposalId,
  maxTokens = STAGE_MAX_TOKENS[stage],
  timeoutMs = STAGE_TIMEOUT_MS[stage],
}: RunStageArgs<T>): Promise<T> {
  const model = STAGE_MODEL[stage];
  const inputHash = createHash("sha256")
    .update(system + (typeof prompt === "string" ? prompt : JSON.stringify(prompt)))
    .digest("hex")
    .slice(0, 16);
  const start = Date.now();
  const scoped = scopedDb(userId);

  const runRow = await scoped.pipelineRuns.insert({
    jobId: jobId ?? null,
    proposalId: proposalId ?? null,
    stage,
    model,
    inputHash,
    status: "running",
  });

  const finish = (values: Record<string, unknown>) =>
    scoped.pipelineRuns.update(runRow.id, {
      latencyMs: Date.now() - start,
      budgetMs: timeoutMs,
      ...values,
    });

  async function call(signal: AbortSignal, extraContext?: string) {
    const content: MessageContent =
      typeof prompt === "string"
        ? extraContext
          ? `${prompt}\n\n${extraContext}`
          : prompt
        : extraContext
          ? [...prompt, { type: "text", text: extraContext }]
          : prompt;

    const message = await anthropicClient().messages.create(
      { model, max_tokens: maxTokens, system, messages: [{ role: "user", content }] },
      { signal }
    );
    const text = message.content.find((b) => b.type === "text")?.text ?? "";
    return { text, usage: message.usage };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let attempt = await call(controller.signal);
    let parsed = schema.safeParse(safeExtractJson(attempt.text));

    if (!parsed.success) {
      const errorContext = `Your previous response failed validation with this error:\n${parsed.error.message}\n\nRespond again with ONLY valid JSON matching the required shape.`;
      attempt = await call(controller.signal, errorContext);
      parsed = schema.safeParse(safeExtractJson(attempt.text));
    }

    await finish({
      output: parsed.success ? parsed.data : null,
      inputTokens: attempt.usage?.input_tokens ?? null,
      outputTokens: attempt.usage?.output_tokens ?? null,
      status: parsed.success ? "ok" : "validation_failed",
      error: parsed.success ? null : parsed.error.message,
    });

    if (!parsed.success) throw new StageValidationError(stage, parsed.error.message);
    return parsed.data;
  } catch (err) {
    if (err instanceof StageValidationError) throw err;
    const timedOut = controller.signal.aborted;
    await finish({
      status: timedOut ? "timeout" : "error",
      error: err instanceof Error ? err.message : String(err),
    });
    throw timedOut ? new StageTimeoutError(stage, timeoutMs) : err;
  } finally {
    clearTimeout(timer);
  }
}

function safeExtractJson(text: string): unknown {
  try {
    return extractJson(text);
  } catch {
    return null;
  }
}

export class StageValidationError extends Error {
  constructor(
    public stage: PipelineStage,
    public zodError: string
  ) {
    super(`Stage "${stage}" failed validation after retry: ${zodError}`);
    this.name = "StageValidationError";
  }
}
