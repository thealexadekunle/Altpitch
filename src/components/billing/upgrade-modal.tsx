"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Zap } from "lucide-react";
import { startSubscriptionCheckout, startTopUpCheckout, type BillingStatus } from "@/lib/data";
import { PLAN, TOP_UP_PACKS, TOP_UP_PACK_ORDER, type TopUpPackId } from "@/lib/billing/plans";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  status?: BillingStatus | null;
}

/** Corrections 03 §5 — credits remaining first, then the single plan, then packs. */
export function UpgradeModal({ open, onOpenChange, title, description, status }: UpgradeModalProps) {
  const [loading, setLoading] = useState<"subscription" | TopUpPackId | null>(null);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title ?? "Out of credits"}</DialogTitle>
          <DialogDescription>
            {description ?? "One credit runs a full pipeline: analysis, proposal, and screening answers."}
          </DialogDescription>
        </DialogHeader>

        {status && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-3">
            <span className="text-sm text-muted-foreground">Credits remaining</span>
            <span className="font-mono text-2xl font-semibold tabular-nums text-accent">{status.credits.spendable}</span>
          </div>
        )}

        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{PLAN.name}</p>
              <p className="text-xs text-muted-foreground">
                {PLAN.monthlyCredits} credits every month. Unused monthly credits reset at renewal.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xl font-semibold tabular-nums tracking-tight">${PLAN.monthlyPrice}</span>
                <span className="text-xs text-muted-foreground">/mo</span>
              </div>
              <Button size="sm" onClick={() => run("subscription")} disabled={loading !== null}>
                {loading === "subscription" ? <Loader2 className="animate-spin" /> : <Zap />} Subscribe
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Top-up packs — never expire, roll over
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TOP_UP_PACK_ORDER.map((packId) => {
              const pack = TOP_UP_PACKS[packId];
              return (
                <Card key={packId}>
                  <CardContent className="space-y-2 p-3">
                    <p className="font-mono text-lg font-semibold tabular-nums">{pack.credits}</p>
                    <p className="text-xs text-muted-foreground">credits for ${pack.price}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => run(packId)}
                      disabled={loading !== null}
                    >
                      {loading === packId ? <Loader2 className="animate-spin" /> : null} Buy
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
          Top-up credits stay yours, but need an active subscription to spend — the ${PLAN.monthlyPrice} is the
          platform fee, credits are the fuel.
        </p>
      </DialogContent>
    </Dialog>
  );
}
