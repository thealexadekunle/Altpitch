import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { screeningAnswers } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId query param required" }, { status: 400 });

  const answers = await scopedDb(session.user.id).screeningAnswers.list({
    where: eq(screeningAnswers.jobId, jobId),
    orderBy: asc(screeningAnswers.createdAt),
  });

  return NextResponse.json({ answers });
}
