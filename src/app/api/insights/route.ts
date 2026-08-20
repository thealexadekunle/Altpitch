import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getActiveInsights } from "@/lib/insights/generate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await getActiveInsights(session.user.id);
  return NextResponse.json({ insights: items });
}
