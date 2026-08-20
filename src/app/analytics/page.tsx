"use client";

import { BarChart3 } from "lucide-react";
import { getAnalytics } from "@/lib/data";
import { useAsync } from "@/lib/hooks/use-async";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { RatesChart } from "@/components/analytics/rates-chart";
import { NicheChart } from "@/components/analytics/niche-chart";
import { HookChart } from "@/components/analytics/hook-chart";
import { Funnel } from "@/components/analytics/funnel";

export default function AnalyticsPage() {
  const { data, loading, error, reload } = useAsync(() => getAnalytics(), []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">How your pipeline is converting, over time and by strategy.</p>
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}

      {!error && (loading || !data) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!error && data && data.series.every((w) => w.analyzed === 0) && (
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          description="Analyze and send a few proposals to start seeing conversion trends here."
        />
      )}

      {!error && data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Overall reply rate</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-accent">{data.summary.overallReplyRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Overall interview rate</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-accent">{data.summary.overallInterviewRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Overall hire rate</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-accent">{data.summary.overallHireRate}%</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reply, interview, and hire rate — 12 weeks</CardTitle>
            </CardHeader>
            <CardContent>
              <RatesChart series={data.series} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance by niche</CardTitle>
              </CardHeader>
              <CardContent>
                <NicheChart data={data.byNiche} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Performance by hook type</CardTitle>
              </CardHeader>
              <CardContent>
                <HookChart data={data.byHookType} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <Funnel stages={data.funnel} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
