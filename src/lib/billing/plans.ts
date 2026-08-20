/**
 * Corrections 03 §5 — one subscription with usage credits, replacing the three-tier catalog.
 * 1 credit = 1 full pipeline run (analysis + proposal + screening answers). Regenerating a
 * proposal on an existing analysis costs 0 unless the job post changed (the content-hash cache
 * in /api/analyze).
 *
 * UNIT ECONOMICS — placeholders until measured. Required before the grant size is final:
 * compute real cost per pipeline run from `pipeline_runs` token logs across 20 live runs
 * (admin financial view reports average cost per credit consumed), then set MONTHLY_CREDITS so a
 * fully-consumed month costs at most ~50% of the $4.99 subscription in API spend, and price the
 * packs at >= 3x their token cost.
 *
 * The math to fill in once measured:
 *   costPerRun          = (avg input tokens x input rate + avg output tokens x output rate)
 *   MONTHLY_CREDITS_max = (4.99 x 0.50) / costPerRun          -> ceiling on the grant
 *   packPrice_min       = packCredits x costPerRun x 3        -> floor on each pack price
 *
 * Current placeholders assume ~$0.12/run, which implies a 20-credit grant costs $2.40 of the
 * $4.99 (48%) at full consumption, and pack prices at roughly 3.3x token cost. Measured numbers
 * replace this comment; do not ship the grant size without them.
 */
export const PLAN = {
  id: "altpitch",
  name: "Altpitch",
  monthlyPrice: 4.99,
  monthlyCredits: 20,
  features: [
    "Full pipeline: analysis, proposal, screening answers",
    "Knowledge base and proof retrieval",
    "Exports and attachment offers",
  ],
} as const;

export const TOP_UP_PACKS = {
  small: { id: "small", credits: 10, price: 3.99 },
  medium: { id: "medium", credits: 30, price: 9.99 },
  large: { id: "large", credits: 75, price: 19.99 },
} as const;

export type TopUpPackId = keyof typeof TOP_UP_PACKS;
export const TOP_UP_PACK_ORDER: TopUpPackId[] = ["small", "medium", "large"];

/** Trial credits are lifetime, not monthly — a recurring free tier invites throwaway accounts. */
export const TRIAL_CREDITS = 3;

/** Dunning: a failed payment sets subscription status to past_due, not canceled — access
 * continues for this many days while the provider retries the charge, then locks. */
export const DUNNING_GRACE_PERIOD_DAYS = 7;

export type PlanId = "trial" | typeof PLAN.id;

/**
 * Credit buckets, in burn order. Subscription credits are spent first precisely because they are
 * the ones that expire: a user who bought a top-up and watched it vanish at renewal cancels.
 */
export const BURN_ORDER = ["lifetime", "subscription", "topup"] as const;
export type CreditBucket = (typeof BURN_ORDER)[number];

export function pricePerCredit(packId: TopUpPackId): number {
  const pack = TOP_UP_PACKS[packId];
  return pack.price / pack.credits;
}
