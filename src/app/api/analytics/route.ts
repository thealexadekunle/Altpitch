import { NextResponse } from "next/server";
import { gte } from "drizzle-orm";
import { scopedDb } from "@/lib/db/scoped";
import { jobs } from "@/lib/db/schema";
import { getImpersonatedOrOwnUserId } from "@/lib/admin/impersonation";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const effective = await getImpersonatedOrOwnUserId(request);
  if (!effective) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scoped = scopedDb(effective.userId);

  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * DAY_MS);

  const [jobRows, outcomeRows] = await Promise.all([
    scoped.jobs.list({ where: gte(jobs.createdAt, twelveWeeksAgo) }),
    scoped.outcomes.list(), // all-time — deliberately no date filter, unlike the jobs query above
  ]);

  return NextResponse.json({ jobs: jobRows, outcomes: outcomeRows });
}
