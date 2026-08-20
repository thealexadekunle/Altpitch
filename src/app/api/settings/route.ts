import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await scopedDb(session.user.id).profiles.get(session.user.id);
  return NextResponse.json({ profile, email: session.user.email, id: session.user.id });
}

const WritingStyleSchema = z.object({
  tone: z.enum(["professional", "conversational", "direct", "warm"]),
  formality: z.number(),
  maxProposalWords: z.number(),
  avoidPhrases: z.array(z.string()),
  preferredOpening: z.string(),
  answerLength: z.enum(["concise", "standard"]),
});

const PatchSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  writingStyle: WritingStyleSchema.optional(),
});

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scoped = scopedDb(session.user.id);

  const json = await request.json().catch(() => null);
  const parsedBody = PatchSchema.safeParse(json);
  if (!parsedBody.success) return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });

  const updated = await scoped.profiles.update(session.user.id, parsedBody.data);
  if (!updated) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json({ profile: updated, email: session.user.email });
}
