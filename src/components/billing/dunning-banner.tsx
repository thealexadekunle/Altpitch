"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getBillingStatus } from "@/lib/data/billing.service";

function daysLeft(graceEndsAt: string): number {
  return Math.max(0, Math.ceil((new Date(graceEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

/** Corrections 03 §5 dunning banner — a past_due subscription keeps full access during the
 * 7-day grace period (see lib/billing/credits.ts), but the user needs to know their card is
 * failing before it actually locks. Renders nothing outside that window. */
export function DunningBanner() {
  const [graceEndsAt, setGraceEndsAt] = useState<string | null>(null);

  useEffect(() => {
    getBillingStatus()
      .then((status) => setGraceEndsAt(status.credits.pastDue ? status.credits.graceEndsAt : null))
      .catch(() => {});
  }, []);

  if (!graceEndsAt) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm md:px-8">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Your last payment failed. Update your card within {daysLeft(graceEndsAt)} day{daysLeft(graceEndsAt) === 1 ? "" : "s"} to
          keep your subscription — your data is never deleted, but credits will stop working after that.
        </span>
      </div>
      <Link href="/settings/billing" className="shrink-0 whitespace-nowrap font-medium underline">
        Update payment
      </Link>
    </div>
  );
}
