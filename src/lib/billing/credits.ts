import "server-only";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db, dbTx } from "@/lib/db/client";
import { usageCredits, subscriptions, creditPurchases } from "@/lib/db/schema";
import { BURN_ORDER, PLAN, TRIAL_CREDITS, TOP_UP_PACKS, type CreditBucket, type TopUpPackId } from "@/lib/billing/plans";

export interface BucketBalance {
  granted: number;
  used: number;
  remaining: number;
}

export interface CreditBalance {
  lifetime: BucketBalance;
  subscription: BucketBalance;
  topup: BucketBalance;
  /** What the user can actually spend right now — top-ups are excluded without a subscription. */
  spendable: number;
  hasActiveSubscription: boolean;
}

export interface CreditCheckResult {
  allowed: boolean;
  bucket: CreditBucket | null;
  balance: CreditBalance;
}

const EMPTY: BucketBalance = { granted: 0, used: 0, remaining: 0 };

/**
 * Corrections 03 §5. Three buckets, one table, distinguished by `period`:
 *
 *   lifetime     — 3 trial credits, granted once, never reset
 *   subscription — the monthly grant; `used` resets to 0 at renewal
 *   topup        — purchased packs; never expire, roll over, survive renewal
 *
 * Burn order is subscription first, then top-ups, because the subscription grant is the bucket
 * that expires. On lapse, top-ups are retained but unspendable: the $4.99 is the platform fee and
 * credits are fuel. Trial credits stay spendable without a subscription — that is the trial.
 *
 * consumeCredit/refundCredit use the pooled WebSocket driver (dbTx) inside a real transaction
 * with a row lock: the neon-http one-shot driver holds no session state across statements, and
 * this is the one place where a lost update (two concurrent analyze calls both reading used=0)
 * actually matters.
 */
export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  const [rows, [sub]] = await Promise.all([
    db
      .select({ period: usageCredits.period, granted: usageCredits.granted, used: usageCredits.used })
      .from(usageCredits)
      .where(and(eq(usageCredits.userId, userId), inArray(usageCredits.period, [...BURN_ORDER]))),
    db.select({ status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1),
  ]);

  const bucket = (name: CreditBucket): BucketBalance => {
    const row = rows.find((r) => r.period === name);
    if (!row) return name === "lifetime" ? { granted: TRIAL_CREDITS, used: 0, remaining: TRIAL_CREDITS } : EMPTY;
    return { granted: row.granted, used: row.used, remaining: Math.max(row.granted - row.used, 0) };
  };

  const lifetime = bucket("lifetime");
  const subscription = bucket("subscription");
  const topup = bucket("topup");
  const hasActiveSubscription = sub?.status === "active";

  return {
    lifetime,
    subscription,
    topup,
    spendable: lifetime.remaining + (hasActiveSubscription ? subscription.remaining + topup.remaining : 0),
    hasActiveSubscription,
  };
}

function nextBucket(balance: CreditBalance): CreditBucket | null {
  if (balance.lifetime.remaining > 0) return "lifetime";
  if (!balance.hasActiveSubscription) return null;
  if (balance.subscription.remaining > 0) return "subscription";
  if (balance.topup.remaining > 0) return "topup";
  return null;
}

export async function checkCredit(userId: string): Promise<CreditCheckResult> {
  const balance = await getCreditBalance(userId);
  const bucket = nextBucket(balance);
  return { allowed: bucket !== null, bucket, balance };
}

/** Spends one credit and returns the bucket it came from, so a refund lands back in the same one. */
export async function consumeCredit(userId: string): Promise<CreditBucket | null> {
  return dbTx().transaction(async (tx) => {
    const rows = await tx
      .select({ id: usageCredits.id, period: usageCredits.period, granted: usageCredits.granted, used: usageCredits.used })
      .from(usageCredits)
      .where(and(eq(usageCredits.userId, userId), inArray(usageCredits.period, [...BURN_ORDER])))
      .for("update");

    const [sub] = await tx
      .select({ status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    const active = sub?.status === "active";

    for (const period of BURN_ORDER) {
      if (period !== "lifetime" && !active) continue;
      const row = rows.find((r) => r.period === period);

      if (!row) {
        // First spend before the signup-credits seed trigger's row exists (or in an environment
        // without it) — create it already at 1 used rather than 0-then-increment.
        if (period !== "lifetime") continue;
        await tx.insert(usageCredits).values({ userId, period: "lifetime", granted: TRIAL_CREDITS, used: 1 });
        return "lifetime";
      }

      if (row.used < row.granted) {
        await tx.update(usageCredits).set({ used: sql`${usageCredits.used} + 1` }).where(eq(usageCredits.id, row.id));
        return period;
      }
    }

    return null;
  });
}

export async function refundCredit(userId: string, bucket: CreditBucket): Promise<void> {
  await dbTx().transaction(async (tx) => {
    await tx
      .update(usageCredits)
      .set({ used: sql`GREATEST(${usageCredits.used} - 1, 0)` })
      .where(and(eq(usageCredits.userId, userId), eq(usageCredits.period, bucket)));
  });
}

/** Renewal: the monthly grant resets. Top-ups are untouched — that is the whole retention point. */
export async function resetMonthlyGrant(userId: string, credits: number = PLAN.monthlyCredits): Promise<void> {
  await db
    .insert(usageCredits)
    .values({ userId, period: "subscription", granted: credits, used: 0 })
    .onConflictDoUpdate({
      target: [usageCredits.userId, usageCredits.period],
      set: { granted: credits, used: 0, updatedAt: new Date() },
    });
}

/** Top-up purchase, and the owner "grant credits" comp tool. Adds to the non-expiring bucket. */
export async function grantTopUpCredits(userId: string, credits: number): Promise<void> {
  await db
    .insert(usageCredits)
    .values({ userId, period: "topup", granted: credits, used: 0 })
    .onConflictDoUpdate({
      target: [usageCredits.userId, usageCredits.period],
      set: { granted: sql`${usageCredits.granted} + ${credits}`, updatedAt: new Date() },
    });
}

/** A paid pack: credits plus the revenue record the financial view reports on. */
export async function grantTopUpPack(userId: string, packId: TopUpPackId, provider = "unconfigured"): Promise<void> {
  const pack = TOP_UP_PACKS[packId];
  await grantTopUpCredits(userId, pack.credits);
  await db.insert(creditPurchases).values({
    userId,
    pack: packId,
    credits: pack.credits,
    amountCents: Math.round(pack.price * 100),
    provider,
  });
}
