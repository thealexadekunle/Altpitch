"use client";

import Link from "next/link";
import { ScanSearch, Inbox } from "lucide-react";
import { getDashboard } from "@/lib/data";
import { useAsync } from "@/lib/hooks/use-async";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PipelineCards, PipelineCardsSkeleton } from "@/components/dashboard/pipeline-cards";
import { QueueRow, QueueRowSkeleton } from "@/components/dashboard/queue-row";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export default function DashboardPage() {
  const { data, loading, error, reload } = useAsync(() => getDashboard(), []);

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your daily command center.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/analyze">
            <ScanSearch />
            Analyze a job
          </Link>
        </Button>
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}

      {!error && (loading || !data) && <PipelineCardsSkeleton />}
      {!error && data && <PipelineCards pipeline={data.pipeline} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!error && (loading || !data) &&
              Array.from({ length: 4 }).map((_, i) => <QueueRowSkeleton key={i} />)}

            {!error && data && data.todaysQueue.length === 0 && (
              <EmptyState
                icon={Inbox}
                title="No jobs in queue yet"
                description="Paste your first Upwork job post to get a fit score, win probability, and verdict."
                action={
                  <Button asChild size="sm">
                    <Link href="/analyze">Analyze a job</Link>
                  </Button>
                }
              />
            )}

            {!error &&
              data &&
              data.todaysQueue.map((job) => <QueueRow key={job.id} job={job} />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!error && (loading || !data) && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-secondary/60" />
                ))}
              </div>
            )}
            {!error && data && data.recentActivity.length === 0 && (
              <EmptyState
                icon={Inbox}
                title="No activity yet"
                description="Activity from analyzed jobs and sent proposals shows up here."
              />
            )}
            {!error && data && <ActivityFeed items={data.recentActivity} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
