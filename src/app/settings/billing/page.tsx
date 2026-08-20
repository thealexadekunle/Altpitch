"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Zap } from "lucide-react";
import {
  getBillingStatus,
  startSubscriptionCheckout,
  startTopUpCheckout,
  type BillingStatus,
} from "@/lib/data/billing.service";
import { PLAN, TOP_UP_PACKS, TOP_UP_PACK_ORDER, TRIAL_CREDITS, type TopUpPackId } from "@/lib/billing/plans";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingSettingsPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState<"subscription" | TopUpPackId | null>(null);

  useEffect(() => {
    getBillingStatus()
      .then(setStatus)
      .catch(() => toast.error("Couldn't load billing status."));
  }, []);

  async function run(kind: "subscription" | TopUpPackId) {
    setLoading(kind);
    try {
      const { url } = kind === "subscription" ? await startSubscriptionCheckout() : await startTopUpCheckout(kind);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start checkout.");
    } finally {
      setLoading(null);
    }
  }

  const credits = status?.credits;
  const subscribed = credits?.hasActiveSubscription ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <Link href="/settings" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          Back to settings
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">One credit runs a full pipeline: analysis, proposal, screening answers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Credits</CardTitle>
        </CardHeader>
        <CardContent>
          {!credits ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-4xl font-semibold tabular-nums text-accent">{credits.spendable}</span>
                <span className="text-sm text-muted-foreground">available now</span>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Trial</dt>
                  <dd className="font-mono tabular-nums">{credits.lifetime.remaining}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Monthly grant</dt>
                  <dd className="font-mono tabular-nums">
                    {credits.subscription.remaining}
                    <span className="text-muted-foreground"> / {credits.subscription.granted}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Top-ups</dt>
                  <dd className="font-mono tabular-nums">{credits.topup.remaining}</dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                Monthly credits are spent first and reset at renewal. Top-up credits never expire and roll over — but
                spending them needs an active subscription, since the ${PLAN.monthlyPrice} is the platform fee and
                credits are the fuel.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={subscribed ? "border-accent" : undefined}>
        <CardHeader>
          <CardTitle className="text-base">{PLAN.name}</CardTitle>
          <div>
            <span className="text-2xl font-semibold tabular-nums tracking-tight">${PLAN.monthlyPrice}</span>
            <span className="text-xs text-muted-foreground">/mo</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-foreground">{PLAN.monthlyCredits} credits per month</p>
          <ul className="space-y-1.5">
            {PLAN.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button className="w-full" disabled={subscribed || loading !== null} onClick={() => run("subscription")}>
            {loading === "subscription" ? <Loader2 className="animate-spin" /> : null}
            {subscribed ? "Subscribed" : "Subscribe"}
          </Button>
        </CardFooter>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium">Top-up packs</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TOP_UP_PACK_ORDER.map((packId) => {
            const pack = TOP_UP_PACKS[packId];
            return (
              <Card key={packId}>
                <CardHeader>
                  <CardTitle className="font-mono text-2xl tabular-nums">{pack.credits}</CardTitle>
                  <p className="text-xs text-muted-foreground">credits — never expire</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm tabular-nums">${pack.price}</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" disabled={loading !== null} onClick={() => run(packId)}>
                    {loading === packId ? <Loader2 className="animate-spin" /> : null} Buy
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          New accounts get {TRIAL_CREDITS} free runs before a subscription is required.
        </p>
      </div>
    </div>
  );
}
