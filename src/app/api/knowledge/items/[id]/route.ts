import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  kind: z.enum(["portfolio", "case_study", "testimonial", "service", "style", "faq"]).optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  nicheTags: z.array(z.string()).optional(),
  outcomeMetric: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsedBody = PatchSchema.safeParse(json);
  if (!parsedBody.success) return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });

  const item = await scopedDb(session.user.id).knowledgeItems.update(params.id, parsedBody.data);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  return NextResponse.json({ item });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await scopedDb(session.user.id).knowledgeItems.remove(params.id);
  return NextResponse.json({ ok: true });
}
