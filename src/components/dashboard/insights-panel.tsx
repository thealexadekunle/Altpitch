"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lightbulb, X } from "lucide-react";
import { getInsights, dismissInsight, type InsightView } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Learning engine's front end (AUDIT_REPORT.md P1-6) — self-contained, fetches its own data like
 * CreditChip/DunningBanner, so it renders nothing (not even a skeleton) when there's nothing to
 * show, which is the common case until a user has 5+ outcomes logged. */
export function InsightsPanel() {
  const [insights, setInsights] = useState<InsightView[] | null>(null);

  useEffect(() => {
    getInsights()
      .then(setInsights)
      .catch(() => {});
  }, []);

  async function handleDismiss(id: string) {
    setInsights((prev) => prev?.filter((i) => i.id !== id) ?? null);
    try {
      await dismissInsight(id);
    } catch {
      toast.error("Couldn't dismiss — it may reappear on refresh.");
    }
  }

  if (!insights || insights.length === 0) return null;

  return (
    <div className="space-y-2">
      {insights.map((insight) => (
        <Card key={insight.id} className="border-accent/30 bg-accent/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="flex-1 text-sm text-foreground">{insight.message}</p>
            <Button variant="ghost" size="sm" className="h-6 w-6 shrink-0 p-0" onClick={() => handleDismiss(insight.id)}>
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
