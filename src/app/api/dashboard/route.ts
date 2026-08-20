import { NextResponse } from "next/server";
import { gte, desc } from "drizzle-orm";
import { scopedDb } from "@/lib/db/scoped";
import { jobs, outcomes, proposals, knowledgeItems } from "@/lib/db/schema";
import { getImpersonatedOrOwnUserId } from "@/lib/admin/impersonation";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Raw rows only — the aggregation/shaping logic (deltas, activity feed merge) lives in
 * lib/data/analytics.service.ts; this route just fetches the period's worth of
 * jobs/outcomes/proposals/knowledge for that function to work with. */
export async function GET(request: Request) {
  const effective = await getImpersonatedOrOwnUserId(request);
  if (!effective) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scoped = scopedDb(effective.userId);

  const priorStart = new Date(Date.now() - 14 * DAY_MS);

  const [jobRows, outcomeRows, proposalRows, knowledgeRows] = await Promise.all([
    scoped.jobs.list({ where: gte(jobs.createdAt, priorStart) }),
    scoped.outcomes.list({ where: gte(outcomes.occurredAt, priorStart) }),
    scoped.proposals.list({ orderBy: desc(proposals.createdAt), limit: 5 }),
    scoped.knowledgeItems.list({ orderBy: desc(knowledgeItems.createdAt), limit: 3 }),
  ]);

  return NextResponse.json({ jobs: jobRows, outcomes: outcomeRows, proposals: proposalRows, knowledge: knowledgeRows });
}
