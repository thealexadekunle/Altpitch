import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema";
import { PLAN, type PlanId, type TopUpPackId } from "@/lib/billing/plans";

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
 * client stays inside lib/billing/** where the eslint rule allows it. */
export async function upsertSubscription(input: SubscriptionUpsert): Promise<void> {
  const values = {
    provider: billingProvider.name,
    providerCustomerId: input.providerCustomerId ?? null,
    providerSubscriptionId: input.providerSubscriptionId ?? null,
    plan: (input.status === "canceled" ? "trial" : PLAN.id) as PlanId,
    status: input.status,
    currentPeriodEnd: input.currentPeriodEnd ?? null,
  };

  await db
    .insert(subscriptions)
    .values({ userId: input.userId, ...values })
    .onConflictDoUpdate({ target: subscriptions.userId, set: { ...values, updatedAt: new Date() } });
}

export async function getSubscription(userId: string) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return row ?? null;
}

/** Every user is on "trial" until a subscriptions row says otherwise — there's no separate
 * signup path that grants a paid plan, matching "the app never trusts client-side plan claims." */
export async function getCurrentPlan(userId: string): Promise<PlanId> {
  const sub = await getSubscription(userId);
  if (!sub || sub.status !== "active") return "trial";
  return sub.plan === "trial" ? "trial" : PLAN.id;
}
