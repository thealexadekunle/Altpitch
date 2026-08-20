import { NextResponse } from "next/server";
import { and, desc, gt, isNotNull, sql } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { pipelineRuns } from "@/lib/db/schema";
import { PIPELINE_CEILING_MS, PIPELINE_P50_TARGET_MS } from "@/lib/ai/budget";

export const dynamic = "force-dynamic";

/**
 * Operations view — Corrections 03 §2 requires every over-budget run to be visible here.
 * A stage is over budget when its measured latency exceeded the timeout it ran under, both of
 * which the stage itself recorded (see lib/ai/client.ts).
 */
export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const db = adminDb();

    const [stageStats, overBudget, failures, runDurations] = await Promise.all([
      db
        .select({
          stage: pipelineRuns.stage,
          runs: sql<number>`count(*)::int`,
          p50: sql<number>`percentile_disc(0.5) within group (order by ${pipelineRuns.latencyMs})::int`,
          p95: sql<number>`percentile_disc(0.95) within group (order by ${pipelineRuns.latencyMs})::int`,
        })
        .from(pipelineRuns)
        .where(isNotNull(pipelineRuns.latencyMs))
        .groupBy(pipelineRuns.stage),

      db
        .select({
          id: pipelineRuns.id,
          userId: pipelineRuns.userId,
          jobId: pipelineRuns.jobId,
          stage: pipelineRuns.stage,
          latencyMs: pipelineRuns.latencyMs,
          budgetMs: pipelineRuns.budgetMs,
          status: pipelineRuns.status,
          createdAt: pipelineRuns.createdAt,
        })
        .from(pipelineRuns)
        .where(and(isNotNull(pipelineRuns.budgetMs), gt(pipelineRuns.latencyMs, pipelineRuns.budgetMs)))
        .orderBy(desc(pipelineRuns.createdAt))
        .limit(50),

      db
        .select({ status: pipelineRuns.status, count: sql<number>`count(*)::int` })
        .from(pipelineRuns)
        .groupBy(pipelineRuns.status),

      // Wall time per job, from the first stage entry to the last stage exit. Compared against
      // the summed stage time it also proves the parallelization actually shipped.
      db
        .select({
          jobId: pipelineRuns.jobId,
          wallMs: sql<number>`(extract(epoch from (max(${pipelineRuns.updatedAt}) - min(${pipelineRuns.createdAt}))) * 1000)::int`,
          summedStageMs: sql<number>`coalesce(sum(${pipelineRuns.latencyMs}), 0)::int`,
          stages: sql<number>`count(*)::int`,
        })
        .from(pipelineRuns)
        .where(isNotNull(pipelineRuns.jobId))
        .groupBy(pipelineRuns.jobId)
        .orderBy(desc(sql`max(${pipelineRuns.updatedAt})`))
        .limit(20),
    ]);

    return NextResponse.json({
      budget: { p50TargetMs: PIPELINE_P50_TARGET_MS, ceilingMs: PIPELINE_CEILING_MS },
      stageStats,
      overBudget,
      failures,
      runDurations,
    });
  });
}
