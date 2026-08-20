"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StageStat {
  stage: string;
  runs: number;
  p50: number | null;
  p95: number | null;
}

interface OverBudgetRow {
  id: string;
  userId: string;
  jobId: string | null;
  stage: string;
  latencyMs: number | null;
  budgetMs: number | null;
  status: string;
  createdAt: string;
}

interface RunDuration {
  jobId: string | null;
  wallMs: number;
  summedStageMs: number;
  stages: number;
}

interface Operations {
  budget: { p50TargetMs: number; ceilingMs: number };
  stageStats: StageStat[];
  overBudget: OverBudgetRow[];
  failures: { status: string; count: number }[];
  runDurations: RunDuration[];
  cronLastRunAt: string | null;
  databaseTarget: string;
}

const seconds = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1)}s`);

export default function AdminOperationsPage() {
  const [data, setData] = useState<Operations | null>(null);

  useEffect(() => {
    fetch("/api/admin/operations")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Operations</h1>
        <p className="text-sm text-muted-foreground">
          Pipeline latency against budget. Target p50 {seconds(data?.budget.p50TargetMs ?? 60000)}, hard ceiling{" "}
          {seconds(data?.budget.ceilingMs ?? 120000)}.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Database: <span className="font-mono text-foreground">{data?.databaseTarget ?? "…"}</span>
          {" · "}
          Cron last ran:{" "}
          <span className="text-foreground">
            {data?.cronLastRunAt ? new Date(data.cronLastRunAt).toLocaleString() : "never"}
          </span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-stage latency</CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Stage</th>
                    <th className="pb-2 text-right font-medium">Runs</th>
                    <th className="pb-2 text-right font-medium">p50</th>
                    <th className="pb-2 text-right font-medium">p95</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stageStats.map((s) => (
                    <tr key={s.stage} className="border-b border-border/50 last:border-0">
                      <td className="py-2">{s.stage}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{s.runs}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{seconds(s.p50)}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{seconds(s.p95)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Over-budget runs</CardTitle>
          <p className="text-xs text-muted-foreground">Stages that exceeded the timeout they ran under.</p>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-24 w-full" />
          ) : data.overBudget.length === 0 ? (
            <p className="text-sm text-muted-foreground">No over-budget runs recorded.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.overBudget.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">
                    <span className="font-medium">{row.stage}</span>
                    <span className="text-muted-foreground"> · {row.jobId?.slice(0, 8) ?? "no job"}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-warning">
                    {seconds(row.latencyMs)} / {seconds(row.budgetMs)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent runs</CardTitle>
          <p className="text-xs text-muted-foreground">
            Wall time below summed stage time is the parallelization working; equal values mean stages ran serially.
          </p>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ul className="space-y-1.5">
              {data.runDurations.map((run) => (
                <li key={run.jobId ?? Math.random()} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-muted-foreground">{run.jobId?.slice(0, 8) ?? "—"}</span>
                  <span className="flex shrink-0 items-center gap-3 font-mono text-xs tabular-nums">
                    <span className={cn(run.wallMs > (data.budget.ceilingMs ?? 0) ? "text-destructive" : "text-accent")}>
                      {seconds(run.wallMs)} wall
                    </span>
                    <span className="text-muted-foreground">{seconds(run.summedStageMs)} summed</span>
                    <span className="text-muted-foreground">{run.stages} stages</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stage outcomes</CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="flex flex-wrap gap-4">
              {data.failures.map((f) => (
                <div key={f.status}>
                  <p className="font-mono text-lg tabular-nums">{f.count}</p>
                  <p className="text-xs text-muted-foreground">{f.status}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
