import { NextResponse } from "next/server";
import { and, count, desc, eq, gt, gte, isNotNull, sql } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { user, jobs, subscriptions, auditLog, creditPurchases, pipelineRuns } from "@/lib/db/schema";
import { PLAN, DUNNING_GRACE_PERIOD_DAYS } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Overview tiles (ALTPITCH_ADMIN_BUILD.md §2) — the one-glance operational snapshot. Every number
 * here is a raw query against the same tables the Billing/Ops/Users pages read, not a cached or
 * derived metric — spot-checking one against the detail page it summarizes should always match.
 */
export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const db = adminDb();
    const now = Date.now();
    const since7d = new Date(now - 7 * DAY_MS);
    const since30d = new Date(now - 30 * DAY_MS);
    const since24h = new Date(now - DAY_MS);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalJobs,
      [activeSubs],
      [topups7d],
      [topups30d],
      [signups],
      [subscribedCount],
      [analysesToday],
      [errors24h],
      [totalRuns24h],
      [failedPaymentsInGrace],
      [overBudget24h],
      lastCronRun,
      recentAuditLog,
    ] = await Promise.all([
      db.select({ count: count() }).from(user).then((r) => r[0]?.count ?? 0),
      db.select({ count: count() }).from(jobs).then((r) => r[0]?.count ?? 0),
      db.select({ count: sql<number>`count(*)::int` }).from(subscriptions).where(eq(subscriptions.status, "active")),
      db.select({ revenueUsd: sql<number>`coalesce(sum(${creditPurchases.amountCents}), 0) / 100.0` }).from(creditPurchases).where(gte(creditPurchases.createdAt, since7d)),
      db.select({ revenueUsd: sql<number>`coalesce(sum(${creditPurchases.amountCents}), 0) / 100.0` }).from(creditPurchases).where(gte(creditPurchases.createdAt, since30d)),
      db.select({ count: sql<number>`count(*)::int` }).from(user),
      db.select({ count: sql<number>`count(*)::int` }).from(subscriptions).where(eq(subscriptions.status, "active")),
      db
        .select({
          count: sql<number>`count(*)::int`,
          p50: sql<number>`percentile_disc(0.5) within group (order by ${pipelineRuns.latencyMs})::int`,
        })
        .from(pipelineRuns)
        .where(and(eq(pipelineRuns.stage, "parser"), gte(pipelineRuns.createdAt, startOfToday))),
      db.select({ count: sql<number>`count(*)::int` }).from(pipelineRuns).where(and(eq(pipelineRuns.status, "error"), gte(pipelineRuns.createdAt, since24h))),
      db.select({ count: sql<number>`count(*)::int` }).from(pipelineRuns).where(gte(pipelineRuns.createdAt, since24h)),
      db.select({ count: sql<number>`count(*)::int` }).from(subscriptions).where(eq(subscriptions.status, "past_due")),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(pipelineRuns)
        .where(and(isNotNull(pipelineRuns.budgetMs), gt(pipelineRuns.latencyMs, pipelineRuns.budgetMs), gte(pipelineRuns.createdAt, since24h))),
      db.select({ createdAt: auditLog.createdAt }).from(auditLog).where(eq(auditLog.action, "cron.cleanup_rate_limit_hits")).orderBy(desc(auditLog.createdAt)).limit(1),
      db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(20),
    ]);

    const activeSubscribers = activeSubs?.count ?? 0;
    const errorCount24h = errors24h?.count ?? 0;
    const totalCount24h = totalRuns24h?.count ?? 0;
    const cronLastRunAt = lastCronRun[0]?.createdAt ?? null;
    // A cron that hasn't fired in > 25h (a bit past its 24h daily cadence) is unhealthy, not just
    // "hasn't run yet today" — 25h gives one hour of slack for Vercel's cron scheduling jitter.
    const cronHealthy = cronLastRunAt !== null && now - new Date(cronLastRunAt).getTime() < 25 * 60 * 60 * 1000;

    return NextResponse.json({
      totalUsers,
      totalJobs,
      activeSubscribers,
      mrrUsd: activeSubscribers * PLAN.monthlyPrice,
      topUpRevenue7dUsd: Number(topups7d?.revenueUsd ?? 0),
      topUpRevenue30dUsd: Number(topups30d?.revenueUsd ?? 0),
      trialToPaidConversion: (signups?.count ?? 0) > 0 ? (subscribedCount?.count ?? 0) / (signups?.count ?? 1) : 0,
      analysesToday: analysesToday?.count ?? 0,
      analysesTodayP50Ms: analysesToday?.p50 ?? null,
      errorRate24h: totalCount24h > 0 ? errorCount24h / totalCount24h : 0,
      failedPaymentsInGrace: failedPaymentsInGrace?.count ?? 0,
      dunningGraceDays: DUNNING_GRACE_PERIOD_DAYS,
      overBudgetRuns24h: overBudget24h?.count ?? 0,
      cronLastRunAt,
      cronHealthy,
      recentAuditLog,
    });
  });
}
