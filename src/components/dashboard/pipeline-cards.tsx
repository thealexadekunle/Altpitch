import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PipelineSummary } from "@/lib/types";

export function PipelineCards({ pipeline }: { pipeline: PipelineSummary }) {
  const items = [pipeline.jobsAnalyzed, pipeline.proposalsSent, pipeline.replies, pipeline.interviews];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((m) => {
        const up = m.delta >= 0;
        return (
          <Card key={m.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">{m.value}</span>
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium tabular-nums",
                    up ? "text-accent" : "text-danger"
                  )}
                >
                  {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(m.delta)}%
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function PipelineCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-2 p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-secondary" />
            <div className="h-7 w-14 animate-pulse rounded bg-secondary" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
