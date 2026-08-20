import { NextResponse } from "next/server";
import { gte } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { jobs } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scoped = scopedDb(session.user.id);

  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * DAY_MS);

  const [jobRows, outcomeRows] = await Promise.all([
    scoped.jobs.list({ where: gte(jobs.createdAt, twelveWeeksAgo) }),
    scoped.outcomes.list(), // all-time — deliberately no date filter, unlike the jobs query above
  ]);

  return NextResponse.json({ jobs: jobRows, outcomes: outcomeRows });
}
