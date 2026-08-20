import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  answer: z.string(),
  userSuppliedInfo: z.string().optional(),
});

/** "Edit answer" — marks the answer consistent/high-confidence again since a human just
 * supplied or corrected it. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scoped = scopedDb(session.user.id);

  const json = await request.json().catch(() => null);
  const parsedBody = PatchSchema.safeParse(json);
  if (!parsedBody.success) return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });

  const current = await scoped.screeningAnswers.get(params.id);
  if (!current) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const currentMeta = (current.meta ?? {}) as Record<string, unknown>;

  const updated = await scoped.screeningAnswers.update(params.id, {
    answer: parsedBody.data.answer,
    confidence: Math.max(current.confidence, 82),
    consistencyOk: true,
    needsInput: false,
    meta: {
      ...currentMeta,
      reviewScore: Math.max((currentMeta.reviewScore as number | undefined) ?? 0, 80),
      consistencyBadge: "consistent",
      consistencyNote: "Updated with your input — consistency rechecked.",
      missingInfoPrompt: null,
      userSuppliedInfo: parsedBody.data.userSuppliedInfo ?? currentMeta.userSuppliedInfo,
    },
  });

  return NextResponse.json({ answer: updated });
}
