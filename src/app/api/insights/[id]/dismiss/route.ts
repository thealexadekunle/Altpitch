import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { dismissInsight } from "@/lib/insights/generate";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await dismissInsight(session.user.id, params.id);
  if (!ok) return NextResponse.json({ error: "Insight not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
