"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisStage } from "@/lib/types";

const RAIL_STEPS: { key: AnalysisStage; label: string }[] = [
  { key: "parsing", label: "Parsing job post" },
  { key: "scoring", label: "Reading requirements and client signals" },
  { key: "breakdown", label: "Scoring fit and reading psychology" },
];

const STEP_ORDER: AnalysisStage[] = ["parsing", "scoring", "breakdown", "complete"];

/** Users forgive latency they can see moving — a real per-stage rail with elapsed time,
 * replacing generic skeleton blocks. Budget: p50 <=25s, p95 <=60s full pipeline. */
export function AnalysisSkeleton({ stage }: { stage: AnalysisStage }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => setElapsedMs(Date.now() - start), 200);
    return () => clearInterval(interval);
  }, []);

  const currentIndex = STEP_ORDER.indexOf(stage);
  const elapsedSeconds = (elapsedMs / 1000).toFixed(1);
  const overBudget = elapsedMs > 60_000;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-5 flex items-baseline justify-between">
          <p className="text-sm font-medium text-foreground">Analyzing your job post</p>
          <span className={cn("text-xs tabular-nums", overBudget ? "text-warning" : "text-muted-foreground")}>
            {elapsedSeconds}s{overBudget ? " — taking longer than usual" : ""}
          </span>
        </div>
        <ol className="space-y-3">
          {RAIL_STEPS.map((step, i) => {
            const stepIndex = STEP_ORDER.indexOf(step.key);
            const done = currentIndex > stepIndex;
            const active = currentIndex === stepIndex;
            return (
              <li key={step.key} className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                    done
                      ? "border-accent/40 bg-accent/15 text-accent"
                      : active
                        ? "border-border bg-secondary text-foreground"
                        : "border-border text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : i + 1}
                </div>
                <span className={cn("text-sm", done || active ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
