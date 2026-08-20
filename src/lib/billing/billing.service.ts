import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subscriptions, webhookEvents } from "@/lib/db/schema";
import { PLAN, DUNNING_GRACE_PERIOD_DAYS, type PlanId, type TopUpPackId } from "@/lib/billing/plans";

/**
 * Generic billing provider interface. `subscriptions.provider` is `"unconfigured"` until a real
 * provider is wired here — checkout/portal/webhook calls throw until then, everything else
 * (reading current plan, gating features) works against the DB regardless of provider.
 *
 * To wire a real provider (bachs.io or otherwise): implement the three functions below against
 * its actual API, keep the signatures, and nothing outside this file changes — that's the whole
 * point of putting it behind a service boundary.
 */
export interface CheckoutSession {
  url: string;
}

/** One subscription and three top-up packs (Corrections 03 §5) — the catalog changed, the
 * provider boundary did not. Webhook flow, dunning and grace behaviour carry over unchanged. */
export interface BillingProvider {
  name: string;
  createSubscriptionCheckout(params: { userId: string; email: string }): Promise<CheckoutSession>;
  createTopUpCheckout(params: { userId: string; email: string; pack: TopUpPackId }): Promise<CheckoutSession>;
  createPortalSession(params: { userId: string; providerCustomerId: string }): Promise<{ url: string }>;
  verifyWebhookSignature(params: { payload: string; signature: string }): boolean;
}

const unconfiguredProvider: BillingProvider = {
  name: "unconfigured",
  async createSubscriptionCheckout() {
    throw new Error(
      "No billing provider is wired yet. Implement BillingProvider against your chosen provider's API in lib/billing/providers/, then swap the export below."
    );
  },
  async createTopUpCheckout() {
    throw new Error("No billing provider is wired yet.");
  },
  async createPortalSession() {
    throw new Error("No billing provider is wired yet.");
  },
  verifyWebhookSignature() {
    return false;
  },
};

/** Swap this export once a real provider is implemented — every caller goes through here. */
export const billingProvider: BillingProvider = unconfiguredProvider;

export type SubscriptionStatusUpdate = "active" | "past_due" | "canceled";

export interface SubscriptionUpsert {
  userId: string;
  status: SubscriptionStatusUpdate;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
}

/** Webhook-driven subscription write. Lives here rather than in the route so the raw Drizzle
 * client stays inside lib/billing/** where the eslint rule allows it.
 *
 * pastDueSince starts the 7-day dunning clock the first time a webhook reports past_due, and is
 * read here (not written) rather than trusted from the caller — a replayed past_due webhook
 * (see the P1-4 idempotency fix) must not reset an already-running grace period back to day zero. */
export async function upsertSubscription(input: SubscriptionUpsert): Promise<void> {
  const existing = await getSubscription(input.userId);

  const pastDueSince =
    input.status === "past_due" ? (existing?.pastDueSince ?? new Date()) : null;

  const values = {
    provider: billingProvider.name,
    providerCustomerId: input.providerCustomerId ?? null,
    providerSubscriptionId: input.providerSubscriptionId ?? null,
    plan: (input.status === "canceled" ? "trial" : PLAN.id) as PlanId,
    status: input.status,
    currentPeriodEnd: input.currentPeriodEnd ?? null,
    pastDueSince,
  };

  await db
    .insert(subscriptions)
    .values({ userId: input.userId, ...values })
    .onConflictDoUpdate({ target: subscriptions.userId, set: { ...values, updatedAt: new Date() } });
}

/** Returns true if this event id hasn't been processed before (and claims it atomically so it
 * won't be again). False means "already applied, do nothing" — see the webhook route's own
 * doc comment for why this has to happen before any credit/subscription effect, not after. */
export async function claimWebhookEvent(eventId: string, eventType: string): Promise<boolean> {
  const inserted = await db
    .insert(webhookEvents)
    .values({ id: eventId, eventType })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  return inserted.length > 0;
}

export async function getSubscription(userId: string) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return row ?? null;
}

/** True for the first DUNNING_GRACE_PERIOD_DAYS after a subscription first went past_due. */
export function isWithinGracePeriod(pastDueSince: Date | null): boolean {
  if (!pastDueSince) return false;
  const graceEndsAt = pastDueSince.getTime() + DUNNING_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() < graceEndsAt;
}

/** Access during dunning: active, or past_due but still inside the grace window. Distinct from
 * `getCurrentPlan`, which is about *plan identity* (what to show as "your plan"), not spending
 * rights — a past_due-in-grace user is still shown as subscribed and can still spend credits. */
export async function hasSpendableSubscriptionAccess(userId: string): Promise<boolean> {
  const sub = await getSubscription(userId);
  if (!sub) return false;
  if (sub.status === "active") return true;
  if (sub.status === "past_due") return isWithinGracePeriod(sub.pastDueSince);
  return false;
}

/** Every user is on "trial" until a subscriptions row says otherwise — there's no separate
 * signup path that grants a paid plan, matching "the app never trusts client-side plan claims." */
export async function getCurrentPlan(userId: string): Promise<PlanId> {
  const sub = await getSubscription(userId);
  if (!sub || sub.status !== "active") return "trial";
  return sub.plan === "trial" ? "trial" : PLAN.id;
}
