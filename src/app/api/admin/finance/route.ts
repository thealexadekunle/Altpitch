import { NextResponse } from "next/server";
import { and, desc, eq, gte, isNotNull, or, sql } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { creditLedger, creditPurchases, pipelineRuns, subscriptions, usageCredits, user } from "@/lib/db/schema";
import { PLAN, TOP_UP_PACKS } from "@/lib/billing/plans";
import { TOKEN_RATES_USD_PER_MTOK } from "@/lib/billing/cost";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

/** Token cost in SQL, so per-user aggregates don't require pulling every stage row. */
const RATES = Object.entries(TOKEN_RATES_USD_PER_MTOK);
const DEFAULT_RATE = RATES[0]?.[1] ?? { input: 3, output: 15 };
const costExpr = sql<number>`sum(
  (coalesce(${pipelineRuns.inputTokens}, 0) * ${DEFAULT_RATE.input}
   + coalesce(${pipelineRuns.outputTokens}, 0) * ${DEFAULT_RATE.output}) / 1000000.0
)`;

/**
 * Financial view under the single-plan model (Corrections 03 §6): MRR from active subscriptions,
 * top-up revenue as its own line, and the unit-economics numbers §5 requires before the monthly
 * grant is finalized — average cost per credit consumed and margin per subscriber, plus the list
 * of users whose API spend exceeds what they have paid.
 */
export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const db = adminDb();

    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

    const [[subs], [topups], [spend], [creditsUsed], perUser, [churned], [signups], [funnel1], [funnel2], [funnel3], adjustmentLog] = await Promise.all([
      db
        .select({ active: sql<number>`count(*)::int` })
        .from(subscriptions)
        .where(eq(subscriptions.status, "active")),

      db
        .select({
          purchases: sql<number>`count(*)::int`,
          revenueUsd: sql<number>`coalesce(sum(${creditPurchases.amountCents}), 0) / 100.0`,
          credits: sql<number>`coalesce(sum(${creditPurchases.credits}), 0)::int`,
        })
        .from(creditPurchases),

      db.select({ costUsd: costExpr }).from(pipelineRuns),

      db.select({ used: sql<number>`coalesce(sum(${usageCredits.used}), 0)::int` }).from(usageCredits),

      // Per-subscriber margin: what they have paid (subscription months to date + top-ups)
      // against what their runs actually cost in tokens.
      db
        .select({
          userId: user.id,
          email: user.email,
          status: subscriptions.status,
          creditsUsed: sql<number>`coalesce((select sum(uc.used) from usage_credits uc where uc.user_id = ${user.id}), 0)::int`,
          topUpPaidUsd: sql<number>`coalesce((select sum(cp.amount_cents) from credit_purchases cp where cp.user_id = ${user.id}), 0) / 100.0`,
          subscriptionMonths: sql<number>`greatest(
            0,
            case when ${subscriptions.status} = 'active'
              then ceil(extract(epoch from (now() - ${subscriptions.createdAt})) / 2592000.0)
              else 0 end
          )::int`,
          costUsd: sql<number>`coalesce((
            select sum((coalesce(pr.input_tokens, 0) * ${DEFAULT_RATE.input} + coalesce(pr.output_tokens, 0) * ${DEFAULT_RATE.output}) / 1000000.0)
            from pipeline_runs pr where pr.user_id = ${user.id}
          ), 0)`,
        })
        .from(user)
        .leftJoin(subscriptions, eq(subscriptions.userId, user.id))
        .limit(500),

      // Churn: subscriptions that lapsed to canceled in the last 30 days, against the population
      // that could have churned (currently active + those that just did).
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptions)
        .where(and(eq(subscriptions.status, "canceled"), gte(subscriptions.updatedAt, thirtyDaysAgo))),

      // Trial funnel: signups -> 1st/2nd/3rd credit used -> subscribed. usage_credits.used counts
      // consumption across all buckets for a user's lifetime-period row (created at signup).
      db.select({ count: sql<number>`count(*)::int` }).from(user),
      db
        .select({ count: sql<number>`count(distinct ${usageCredits.userId})::int` })
        .from(usageCredits)
        .where(and(eq(usageCredits.period, "lifetime"), sql`${usageCredits.used} >= 1`)),
      db
        .select({ count: sql<number>`count(distinct ${usageCredits.userId})::int` })
        .from(usageCredits)
        .where(and(eq(usageCredits.period, "lifetime"), sql`${usageCredits.used} >= 2`)),
      db
        .select({ count: sql<number>`count(distinct ${usageCredits.userId})::int` })
        .from(usageCredits)
        .where(and(eq(usageCredits.period, "lifetime"), sql`${usageCredits.used} >= 3`)),

      // Refund/adjustment log: ledger entries an admin made by hand (actorId set) rather than the
      // system (pipeline consumption, monthly renewal, webhook-driven top-up).
      db
        .select({ id: creditLedger.id, userId: creditLedger.userId, bucket: creditLedger.bucket, delta: creditLedger.delta, reason: creditLedger.reason, actorId: creditLedger.actorId, createdAt: creditLedger.createdAt })
        .from(creditLedger)
        .where(and(isNotNull(creditLedger.actorId), or(sql`${creditLedger.reason} ilike '%refund%'`, sql`${creditLedger.reason} ilike 'admin_adjustment%'`)))
        .orderBy(desc(creditLedger.createdAt))
        .limit(100),
    ]);

    const activeSubscribers = subs?.active ?? 0;
    const mrrUsd = activeSubscribers * PLAN.monthlyPrice;
    const totalCostUsd = Number(spend?.costUsd ?? 0);
    const totalCreditsUsed = creditsUsed?.used ?? 0;
    const costPerCreditUsd = totalCreditsUsed > 0 ? totalCostUsd / totalCreditsUsed : 0;

    const subscribers = perUser.map((u) => {
      const paidUsd = u.subscriptionMonths * PLAN.monthlyPrice + Number(u.topUpPaidUsd);
      const costUsd = Number(u.costUsd);
      return {
        userId: u.userId,
        email: u.email,
        status: u.status ?? "trial",
        creditsUsed: u.creditsUsed,
        paidUsd,
        costUsd,
        marginUsd: paidUsd - costUsd,
      };
    });

    const churnedCount = churned?.count ?? 0;
    const churnRate = activeSubscribers + churnedCount > 0 ? churnedCount / (activeSubscribers + churnedCount) : 0;

    return NextResponse.json({
      plan: { price: PLAN.monthlyPrice, monthlyCredits: PLAN.monthlyCredits },
      packs: TOP_UP_PACKS,
      mrrUsd,
      arpuUsd: activeSubscribers > 0 ? mrrUsd / activeSubscribers : 0,
      activeSubscribers,
      topUpRevenueUsd: Number(topups?.revenueUsd ?? 0),
      topUpPurchases: topups?.purchases ?? 0,
      topUpCreditsSold: topups?.credits ?? 0,
      totalCostUsd,
      totalCreditsUsed,
      costPerCreditUsd,
      /** The §5 guardrail, computed live: a fully-consumed month must stay under ~50% of $4.99. */
      fullMonthCostUsd: costPerCreditUsd * PLAN.monthlyCredits,
      marginPerSubscriberUsd: activeSubscribers > 0 ? (mrrUsd - totalCostUsd) / activeSubscribers : 0,
      subscribers: subscribers.sort((a, b) => a.marginUsd - b.marginUsd),
      underwater: subscribers.filter((s) => s.costUsd > s.paidUsd),
      churnRateMonthly: churnRate,
      churnedLast30d: churnedCount,
      trialFunnel: {
        signups: signups?.count ?? 0,
        usedFirstCredit: funnel1?.count ?? 0,
        usedSecondCredit: funnel2?.count ?? 0,
        usedThirdCredit: funnel3?.count ?? 0,
        subscribed: activeSubscribers,
      },
      adjustmentLog,
    });
  });
}
