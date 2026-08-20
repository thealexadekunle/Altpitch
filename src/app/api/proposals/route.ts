import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { proposals } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** ?jobId=X — "does a proposal already exist for this job" check, used before falling back to
 * /api/draft-proposal to run the actual pipeline. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId query param required" }, { status: 400 });

  const scoped = scopedDb(session.user.id);
  const [proposal] = await scoped.proposals.list({ where: eq(proposals.jobId, jobId), orderBy: desc(proposals.createdAt), limit: 1 });

  return NextResponse.json({ proposal: proposal ?? null });
}
