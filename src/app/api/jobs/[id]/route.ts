import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { scopedDb } from "@/lib/db/scoped";
import { analyses, proposals, attachments } from "@/lib/db/schema";
import { toAttachmentMeta } from "@/lib/r2";
import { getImpersonatedOrOwnUserId } from "@/lib/admin/impersonation";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const effective = await getImpersonatedOrOwnUserId(request);
  if (!effective) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scoped = scopedDb(effective.userId);

  const [job, analysisRows, proposalRows, attachmentRows] = await Promise.all([
    scoped.jobs.get(params.id),
    scoped.analyses.list({ where: eq(analyses.jobId, params.id), orderBy: desc(analyses.createdAt), limit: 1 }),
    scoped.proposals.list({ where: eq(proposals.jobId, params.id), limit: 1 }),
    scoped.attachments.list({ where: eq(attachments.jobId, params.id) }),
  ]);

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const shapedAttachments = await Promise.all(attachmentRows.map(toAttachmentMeta));

  return NextResponse.json({
    job,
    analysis: analysisRows[0] ?? null,
    proposal: proposalRows[0] ?? null,
    attachments: shapedAttachments,
  });
}
