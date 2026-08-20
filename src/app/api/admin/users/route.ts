import { NextResponse } from "next/server";
import { and, eq, gte, lte, ilike, or, sql, desc, asc, isNotNull } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { user, profiles, subscriptions } from "@/lib/db/schema";
import { TOKEN_RATES_USD_PER_MTOK } from "@/lib/billing/cost";

export const dynamic = "force-dynamic";

const RATES = Object.entries(TOKEN_RATES_USD_PER_MTOK);
const DEFAULT_RATE = RATES[0]?.[1] ?? { input: 3, output: 15 };

const PAGE_SIZE = 50;

/**
 * Users table (ALTPITCH_ADMIN_BUILD.md §3) — search by email/name/id, filters (status,
 * subscription, signup range, credit balance range, over-cost), server-side sort + pagination.
 * One query, not N+1: aggregates (credits, cost, lifetime analyses) are correlated subqueries
 * rather than a join-then-group-in-JS, since the table is meant to scale past a trivial user count.
 */
export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const db = adminDb();
    const params = new URL(request.url).searchParams;

    const q = params.get("q")?.trim() ?? "";
    const status = params.get("status"); // active | suspended | soft_deleted | grace
    const subscriptionState = params.get("subscription"); // trialing | subscribed | lapsed
    const signupFrom = params.get("signupFrom");
    const signupTo = params.get("signupTo");
    const creditMin = params.get("creditMin");
    const creditMax = params.get("creditMax");
    const overCostOnly = params.get("overCost") === "true";
    const sortBy = params.get("sortBy") ?? "signupDate";
    const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

    const creditsUsedExpr = sql<number>`coalesce((select sum(uc.used) from usage_credits uc where uc.user_id = ${user.id}), 0)::int`;
    const creditsGrantedExpr = sql<number>`coalesce((select sum(uc.granted) from usage_credits uc where uc.user_id = ${user.id}), 0)::int`;
    const creditsRemainingExpr = sql<number>`(${creditsGrantedExpr} - ${creditsUsedExpr})`;
    const lifetimeAnalysesExpr = sql<number>`coalesce((select count(*) from pipeline_runs pr where pr.user_id = ${user.id} and pr.stage = 'parser'), 0)::int`;
    const costUsdExpr = sql<number>`coalesce((
      select sum((coalesce(pr.input_tokens, 0) * ${DEFAULT_RATE.input} + coalesce(pr.output_tokens, 0) * ${DEFAULT_RATE.output}) / 1000000.0)
      from pipeline_runs pr where pr.user_id = ${user.id}
    ), 0)`;
    const paidUsdExpr = sql<number>`coalesce((select sum(cp.amount_cents) from credit_purchases cp where cp.user_id = ${user.id}), 0) / 100.0`;

    const conditions = [];
    if (q) {
      conditions.push(or(ilike(user.email, `%${q}%`), ilike(profiles.name, `%${q}%`), eq(user.id, q)));
    }
    if (status === "suspended") conditions.push(and(eq(profiles.suspended, true), sql`${profiles.deletionScheduledFor} is null`));
    if (status === "soft_deleted") conditions.push(isNotNull(profiles.deletionScheduledFor));
    if (status === "active") conditions.push(and(eq(profiles.suspended, false)));
    if (status === "grace") conditions.push(eq(subscriptions.status, "past_due"));
    if (subscriptionState === "trialing") conditions.push(sql`${subscriptions.status} is null or ${subscriptions.status} = 'trialing'`);
    if (subscriptionState === "subscribed") conditions.push(eq(subscriptions.status, "active"));
    if (subscriptionState === "lapsed") conditions.push(eq(subscriptions.status, "canceled"));
    if (signupFrom) conditions.push(gte(user.createdAt, new Date(signupFrom)));
    if (signupTo) conditions.push(lte(user.createdAt, new Date(signupTo)));
    if (creditMin) conditions.push(gte(creditsRemainingExpr, Number(creditMin)));
    if (creditMax) conditions.push(lte(creditsRemainingExpr, Number(creditMax)));
    if (overCostOnly) conditions.push(sql`${costUsdExpr} > ${paidUsdExpr}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn = {
      signupDate: user.createdAt,
      email: user.email,
      creditsRemaining: creditsRemainingExpr,
      lifetimeAnalyses: lifetimeAnalysesExpr,
      costUsd: costUsdExpr,
    }[sortBy] ?? user.createdAt;
    const orderFn = sortDir === "asc" ? asc : desc;

    const baseQuery = db
      .select({
        id: user.id,
        email: user.email,
        name: profiles.name,
        role: profiles.role,
        suspended: profiles.suspended,
        suspendedReason: profiles.suspendedReason,
        deletionScheduledFor: profiles.deletionScheduledFor,
        pipelineKillSwitch: profiles.pipelineKillSwitch,
        createdAt: user.createdAt,
        subscriptionStatus: subscriptions.status,
        creditsUsed: creditsUsedExpr,
        creditsGranted: creditsGrantedExpr,
        creditsRemaining: creditsRemainingExpr,
        lifetimeAnalyses: lifetimeAnalysesExpr,
        costUsd: costUsdExpr,
        paidUsd: paidUsdExpr,
      })
      .from(user)
      .leftJoin(profiles, eq(profiles.userId, user.id))
      .leftJoin(subscriptions, eq(subscriptions.userId, user.id));

    const [rows, [{ count: total }]] = await Promise.all([
      (whereClause ? baseQuery.where(whereClause) : baseQuery)
        .orderBy(orderFn(sortColumn))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(user)
        .leftJoin(profiles, eq(profiles.userId, user.id))
        .leftJoin(subscriptions, eq(subscriptions.userId, user.id))
        .where(whereClause ?? sql`true`),
    ]);

    return NextResponse.json({ users: rows, page, pageSize: PAGE_SIZE, total });
  });
}
