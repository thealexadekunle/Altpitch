import type { Metadata } from "next";
import Link from "next/link";
import { Zap } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { PLAN, TOP_UP_PACKS, TOP_UP_PACK_ORDER, TRIAL_CREDITS } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Pricing — Altpitch",
  description: `One plan at $${PLAN.monthlyPrice}/month with ${PLAN.monthlyCredits} credits. Start with ${TRIAL_CREDITS} free runs, no card required.`,
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">One plan. Credits you actually keep.</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            One credit runs the whole pipeline: analysis, proposal, and screening answers. Every account starts with{" "}
            {TRIAL_CREDITS} free runs, no card required.
          </p>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
          <Card className="border-accent">
            <CardHeader>
              <CardTitle className="text-base">{PLAN.name}</CardTitle>
              <div className="mt-2">
                <span className="text-4xl font-semibold tabular-nums tracking-tight">${PLAN.monthlyPrice}</span>
                <span className="text-sm text-muted-foreground"> / month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {PLAN.monthlyCredits} credits every month. Regenerating a proposal on an analysis you already ran is
                free.
              </p>
            </CardHeader>
            <CardContent>
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
              <Button asChild className="w-full">
                <Link href="/signup">Start with {TRIAL_CREDITS} free runs</Link>
              </Button>
            </CardFooter>
          </Card>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
          <h2 className="mb-3 text-sm font-medium">Need more in a busy month?</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TOP_UP_PACK_ORDER.map((packId) => {
              const pack = TOP_UP_PACKS[packId];
              return (
                <Card key={packId}>
                  <CardHeader>
                    <CardTitle className="font-mono text-2xl tabular-nums">{pack.credits}</CardTitle>
                    <p className="text-xs text-muted-foreground">credits</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm tabular-nums">${pack.price}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Plain words, no fine print — the lapse rule is the one thing people get burned by. */}
          <div className="mt-6 space-y-2 rounded-lg border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground">Top-up credits never expire.</span> They roll over month after month.
              Only the monthly grant resets at renewal, and monthly credits are always spent first so your top-ups stay
              untouched until you need them.
            </p>
            <p>
              If your subscription lapses, your top-up credits stay in your account — you keep what you paid for. You
              need an active subscription to spend them: the ${PLAN.monthlyPrice} is the platform fee, credits are the
              fuel.
            </p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
