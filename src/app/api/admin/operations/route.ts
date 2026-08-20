import { NextResponse } from "next/server";
import { and, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { pipelineRuns, auditLog } from "@/lib/db/schema";
import { PIPELINE_CEILING_MS, PIPELINE_P50_TARGET_MS } from "@/lib/ai/budget";

export const dynamic = "force-dynamic";

/** Which Neon endpoint this deploy is actually talking to — the host only, never credentials.
 * There's no official Neon-Vercel branch integration wired up (this project's DATABASE_URL was
 * set by hand), so this is the honest version of "am I on prod": the real connection target,
 * not a branch name Neon's API would have to be called to confirm. */
function databaseTarget(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname || "unknown";
  } catch {
    return "unknown";
  }
}

/** vercel.json's cron schedule, hand-parsed rather than pulling in a cron-parser dependency for
 * one fixed daily expression. If the schedule in vercel.json ever changes, this constant needs to
 * change with it — there's no way to read vercel.json from a running serverless function. */
const CRON_SCHEDULE_UTC_HOUR = 4;
function nextCronRunAt(): Date {
  const next = new Date();
  next.setUTCHours(CRON_SCHEDULE_UTC_HOUR, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

/** Sentry and Neon's own APIs need auth tokens this deploy doesn't have configured — rather than
 * fake a feed, report honestly that they're unconfigured (same pattern as /api/health's r2/billing
 * checks) so the UI can say so instead of showing fabricated data. */
function sentryConfigured(): boolean {
  return Boolean(process.env.SENTRY_AUTH_TOKEN);
}
function neonApiConfigured(): boolean {
  return Boolean(process.env.NEON_API_KEY);
}

/**
 * Operations view — Corrections 03 §2 requires every over-budget run to be visible here.
 * A stage is over budget when its measured latency exceeded the timeout it ran under, both of
 * which the stage itself recorded (see lib/ai/client.ts).
 */
export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const db = adminDb();

    const [stageStats, overBudget, failures, runDurations, lastCronRun, adversarialFailures] = await Promise.all([
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

      // Cron writes this action on every run (see api/cron/cleanup/route.ts) — reusing it as the
      // last-run signal instead of a second table just for a timestamp.
      db
        .select({ createdAt: auditLog.createdAt })
        .from(auditLog)
        .where(eq(auditLog.action, "cron.cleanup_rate_limit_hits"))
        .orderBy(desc(auditLog.createdAt))
        .limit(1),

      // A "schema failure" or "adversarial" run is one Zod rejected or a stage flagged, both of
      // which leave their signature in the error text — there's no separate status enum value for
      // it (status stays "error"; error carries the reason).
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(pipelineRuns)
        .where(
          and(
            eq(pipelineRuns.status, "error"),
            gt(pipelineRuns.createdAt, sql`now() - interval '24 hours'`),
            sql`(${pipelineRuns.error} ilike '%schema%' or ${pipelineRuns.error} ilike '%zod%' or ${pipelineRuns.error} ilike '%adversarial%')`
          )
        ),
    ]);

    return NextResponse.json({
      budget: { p50TargetMs: PIPELINE_P50_TARGET_MS, ceilingMs: PIPELINE_CEILING_MS },
      stageStats,
      overBudget,
      failures,
      runDurations,
      cronLastRunAt: lastCronRun[0]?.createdAt ?? null,
      cronNextRunAt: nextCronRunAt().toISOString(),
      adversarialOrSchemaFailures24h: adversarialFailures[0]?.count ?? 0,
      databaseTarget: databaseTarget(),
      sentry: { configured: sentryConfigured(), issues: [] as never[] },
      neon: { configured: neonApiConfigured(), branch: null as string | null, computeStatus: null as string | null },
    });
  });
}
