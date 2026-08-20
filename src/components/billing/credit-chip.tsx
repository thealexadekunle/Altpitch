"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { getBillingStatus, type BillingStatus } from "@/lib/data/billing.service";

export function CreditChip() {
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    getBillingStatus()
      .then(setStatus)
      .catch(() => {}); // billing status is a nice-to-have chip, not worth a toast on failure
  }, []);

  if (!status) return null;

  const { spendable, allowed, hasActiveSubscription } = status.credits;

  return (
    <Link
      href="/settings/billing"
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
        allowed
          ? "border-border text-muted-foreground hover:text-foreground"
          : "border-destructive/40 text-destructive hover:bg-destructive/10"
      }`}
    >
      <Zap className="h-3 w-3" />
      {allowed ? (
        <>
          <span className="font-mono tabular-nums">{spendable}</span>
          {hasActiveSubscription ? " credits" : " free runs left"}
        </>
      ) : hasActiveSubscription ? (
        "Out of credits — top up"
      ) : (
        "Trial used up — subscribe"
      )}
    </Link>
  );
}
