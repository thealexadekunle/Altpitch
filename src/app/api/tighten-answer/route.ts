import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { runStage } from "@/lib/ai/client";
import { TightenAnswerSchema } from "@/lib/ai/schemas";
import { buildTightenAnswerPrompt } from "@/lib/ai/prompts/tighten-answer";
import type { WritingStyle } from "@/lib/ai/writing-style";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ questionId: z.string().uuid() });

/** "Tighten" — real Writer-tier rewrite of one screening answer to a shorter variant. */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scoped = scopedDb(session.user.id);

  const rateLimit = await checkRateLimit(`user:${session.user.id}`, RATE_LIMITS.default);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const json = await request.json().catch(() => null);
  const parsedBody = BodySchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });
  }

  const [question, profile] = await Promise.all([
    scoped.screeningAnswers.get(parsedBody.data.questionId),
    scoped.profiles.get(session.user.id),
  ]);

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const answerLength = ((profile?.writingStyle as Partial<WritingStyle> | null)?.answerLength ?? "standard") as WritingStyle["answerLength"];
  const { system, prompt } = buildTightenAnswerPrompt(question.question, question.answer, answerLength);

  try {
    const result = await runStage({
      stage: "tightenAnswer",
      system,
      prompt,
      schema: TightenAnswerSchema,
      userId: session.user.id,
      jobId: question.jobId,
    });

    const currentMeta = (question.meta ?? {}) as Record<string, unknown>;
    const updated = await scoped.screeningAnswers.update(question.id, {
      answer: result.answer,
      meta: { ...currentMeta, tightened: true },
    });
    if (!updated) throw new Error("Failed to persist tightened answer");

    return NextResponse.json({ answer: result.answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tighten failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
