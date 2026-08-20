"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SubscriberRow {
  userId: string;
  email: string;
  status: string;
  creditsUsed: number;
  paidUsd: number;
  costUsd: number;
  marginUsd: number;
}

interface AdjustmentRow {
  id: string;
  userId: string;
  bucket: string;
  delta: number;
  reason: string;
  actorId: string | null;
  createdAt: string;
}

interface Finance {
  plan: { price: number; monthlyCredits: number };
  mrrUsd: number;
  arpuUsd: number;
  activeSubscribers: number;
  topUpRevenueUsd: number;
  topUpPurchases: number;
  topUpCreditsSold: number;
  totalCostUsd: number;
  totalCreditsUsed: number;
  costPerCreditUsd: number;
  fullMonthCostUsd: number;
  marginPerSubscriberUsd: number;
  subscribers: SubscriberRow[];
  underwater: SubscriberRow[];
  churnRateMonthly: number;
  churnedLast30d: number;
  trialFunnel: {
    signups: number;
    usedFirstCredit: number;
    usedSecondCredit: number;
    usedThirdCredit: number;
    subscribed: number;
  };
  adjustmentLog: AdjustmentRow[];
}

const usd = (n: number) => `$${n.toFixed(2)}`;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminFinancePage() {
  const [data, setData] = useState<Finance | null>(null);

  useEffect(() => {
    fetch("/api/admin/finance")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // The §5 guardrail: a fully-consumed month must cost no more than ~50% of the subscription.
  const guardrailCeiling = data.plan.price * 0.5;
  const guardrailOk = data.fullMonthCostUsd <= guardrailCeiling;

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Single plan at {usd(data.plan.price)}/month, {data.plan.monthlyCredits} credits.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="MRR" value={usd(data.mrrUsd)} hint={`${data.activeSubscribers} active subscribers · ARPU ${usd(data.arpuUsd)}`} />
        <Stat
          label="Top-up revenue"
          value={usd(data.topUpRevenueUsd)}
          hint={`${data.topUpPurchases} purchases · ${data.topUpCreditsSold} credits`}
        />
        <Stat label="Margin per subscriber" value={usd(data.marginPerSubscriberUsd)} hint="MRR less all API spend" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat label="Monthly churn" value={`${(data.churnRateMonthly * 100).toFixed(1)}%`} hint={`${data.churnedLast30d} canceled in last 30d`} />
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 text-xs text-muted-foreground">Trial funnel</p>
            <div className="flex items-center gap-1 text-xs">
              {[
                { label: "Signups", value: data.trialFunnel.signups },
                { label: "1st credit", value: data.trialFunnel.usedFirstCredit },
                { label: "2nd credit", value: data.trialFunnel.usedSecondCredit },
                { label: "3rd credit", value: data.trialFunnel.usedThirdCredit },
                { label: "Subscribed", value: data.trialFunnel.subscribed },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground">→</span>}
                  <div className="text-center">
                    <p className="font-mono font-semibold tabular-nums">{step.value}</p>
                    <p className="text-muted-foreground">{step.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={guardrailOk ? undefined : "border-destructive/50"}>
        <CardHeader>
          <CardTitle className="text-base">Unit economics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Cost per credit</dt>
              <dd className="font-mono tabular-nums">{usd(data.costPerCreditUsd)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Credits consumed</dt>
              <dd className="font-mono tabular-nums">{data.totalCreditsUsed}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total API spend</dt>
              <dd className="font-mono tabular-nums">{usd(data.totalCostUsd)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Full month at grant</dt>
              <dd className={cn("font-mono tabular-nums", guardrailOk ? "text-accent" : "text-destructive")}>
                {usd(data.fullMonthCostUsd)}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            {guardrailOk
              ? `Within the guardrail: a fully-consumed month costs at most ${usd(guardrailCeiling)} (50% of the subscription).`
              : `Over the guardrail of ${usd(guardrailCeiling)} — lower the monthly grant in lib/billing/plans.ts.`}
          </p>
        </CardContent>
      </Card>

      {data.underwater.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">Consumption exceeds payments</CardTitle>
            <p className="text-xs text-muted-foreground">{data.underwater.length} users cost more than they have paid.</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {data.underwater.map((u) => (
                <li key={u.userId} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/admin/users/${u.userId}`} className="truncate hover:text-accent">
                    {u.email}
                  </Link>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-destructive">
                    {usd(u.marginUsd)} · {u.creditsUsed} credits
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Margin by user</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Credits</th>
                <th className="pb-2 text-right font-medium">Paid</th>
                <th className="pb-2 text-right font-medium">Cost</th>
                <th className="pb-2 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {data.subscribers.slice(0, 50).map((u) => (
                <tr key={u.userId} className="border-b border-border/50 last:border-0">
                  <td className="max-w-[16rem] truncate py-2">
                    <Link href={`/admin/users/${u.userId}`} className="hover:text-accent">
                      {u.email}
                    </Link>
                  </td>
                  <td className="py-2 text-muted-foreground">{u.status}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{u.creditsUsed}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{usd(u.paidUsd)}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{usd(u.costUsd)}</td>
                  <td
                    className={cn(
                      "py-2 text-right font-mono tabular-nums",
                      u.marginUsd < 0 ? "text-destructive" : "text-accent"
                    )}
                  >
                    {usd(u.marginUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Refund / adjustment log</CardTitle>
          <p className="text-xs text-muted-foreground">Ledger entries an admin made by hand — refunds or manual balance corrections.</p>
        </CardHeader>
        <CardContent>
          {data.adjustmentLog.length === 0 && <p className="text-sm text-muted-foreground">No manual adjustments logged.</p>}
          {data.adjustmentLog.length > 0 && (
            <div className="divide-y divide-border">
              {data.adjustmentLog.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/admin/users/${entry.userId}`} className="min-w-0 truncate hover:text-accent">
                    {entry.reason}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn("font-mono text-xs tabular-nums", entry.delta >= 0 ? "text-accent" : "text-destructive")}>
                      {entry.delta >= 0 ? "+" : ""}
                      {entry.delta}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
