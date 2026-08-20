import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { creditPurchases, pipelineRuns, subscriptions, usageCredits, user } from "@/lib/db/schema";
import { PLAN, TOP_UP_PACKS } from "@/lib/billing/plans";
import { TOKEN_RATES_USD_PER_MTOK } from "@/lib/billing/cost";

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

    const [[subs], [topups], [spend], [creditsUsed], perUser] = await Promise.all([
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

    return NextResponse.json({
      plan: { price: PLAN.monthlyPrice, monthlyCredits: PLAN.monthlyCredits },
      packs: TOP_UP_PACKS,
      mrrUsd,
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
    });
  });
}
