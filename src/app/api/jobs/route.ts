import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { scopedDb } from "@/lib/db/scoped";
import { jobs } from "@/lib/db/schema";
import { getImpersonatedOrOwnUserId } from "@/lib/admin/impersonation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const effective = await getImpersonatedOrOwnUserId(request);
  if (!effective) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scoped = scopedDb(effective.userId);

  const [jobRows, analysisRows, attachmentRows] = await Promise.all([
    scoped.jobs.list({ orderBy: desc(jobs.createdAt) }),
    scoped.analyses.list(),
    scoped.attachments.list(),
  ]);

  return NextResponse.json({ jobs: jobRows, analyses: analysisRows, attachments: attachmentRows });
}
