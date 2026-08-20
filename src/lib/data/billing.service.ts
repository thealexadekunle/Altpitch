import { throwForFailedResponse } from "@/lib/data/api-error";
import type { PlanId, TopUpPackId } from "@/lib/billing/plans";

export interface CreditBucketView {
  granted: number;
  used: number;
  remaining: number;
}

export interface BillingStatus {
  plan: PlanId;
  credits: {
    lifetime: CreditBucketView;
    subscription: CreditBucketView;
    topup: CreditBucketView;
    spendable: number;
    hasActiveSubscription: boolean;
    allowed: boolean;
  };
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const res = await fetch("/api/billing/status");
  if (!res.ok) await throwForFailedResponse(res, "Couldn't load billing status.");
  return res.json();
}

export async function startSubscriptionCheckout(): Promise<{ url: string }> {
  return postCheckout({ kind: "subscription" });
}

export async function startTopUpCheckout(pack: TopUpPackId): Promise<{ url: string }> {
  return postCheckout({ kind: "topup", pack });
}

async function postCheckout(body: Record<string, unknown>): Promise<{ url: string }> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwForFailedResponse(res, "Couldn't start checkout.");
  return res.json();
}
