import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  kind: z.enum(["portfolio", "case_study", "testimonial", "service", "style", "faq"]),
  title: z.string().default(""),
  body: z.string().default(""),
  nicheTags: z.array(z.string()).default([]),
  outcomeMetric: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

/** Generic insert for all six knowledge-base "kinds" — the row-shape mapping (portfolio item vs
 * case study vs...) happens in lib/data/knowledge.service.ts before this is called; this route
 * just persists whatever row shape it's given. */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsedBody = BodySchema.safeParse(json);
  if (!parsedBody.success) return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });

  const item = await scopedDb(session.user.id).knowledgeItems.insert(parsedBody.data);
  return NextResponse.json({ item });
}
