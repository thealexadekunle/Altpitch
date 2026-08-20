import { NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { attachments } from "@/lib/db/schema";
import { toAttachmentMeta } from "@/lib/r2";

export const dynamic = "force-dynamic";

/** ?jobId=X for a job's attachments, or ?ids=a,b,c for pending (pre-analysis) attachments by id
 * — matches the two read patterns lib/data/attachments.service.ts needs. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scoped = scopedDb(session.user.id);

  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  const idsParam = url.searchParams.get("ids");

  let rows;
  if (jobId) {
    rows = await scoped.attachments.list({ where: eq(attachments.jobId, jobId), orderBy: asc(attachments.createdAt) });
  } else if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    rows = ids.length ? await scoped.attachments.list({ where: inArray(attachments.id, ids) }) : [];
  } else {
    return NextResponse.json({ error: "jobId or ids query param required" }, { status: 400 });
  }

  const shaped = await Promise.all(rows.map(toAttachmentMeta));

  return NextResponse.json({ attachments: shaped });
}
