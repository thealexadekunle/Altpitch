import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { jobs } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scoped = scopedDb(session.user.id);

  const [jobRows, analysisRows, attachmentRows] = await Promise.all([
    scoped.jobs.list({ orderBy: desc(jobs.createdAt) }),
    scoped.analyses.list(),
    scoped.attachments.list(),
  ]);

  return NextResponse.json({ jobs: jobRows, analyses: analysisRows, attachments: attachmentRows });
}
