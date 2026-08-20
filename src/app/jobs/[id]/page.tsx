"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { getJob } from "@/lib/data";
import { VerdictHeader } from "@/components/job/verdict-header";
import { BreakdownTabs } from "@/components/job/breakdown-tabs";
import { AttachmentsCard } from "@/components/job/attachments-card";
import { AnalysisSkeleton } from "@/components/job/analysis-skeleton";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import type { AnalysisStage, JobAnalysis } from "@/lib/types";

export default function JobAnalysisPage({ params }: { params: { id: string } }) {
  const [stage, setStage] = useState<AnalysisStage>("parsing");
  const [job, setJob] = useState<JobAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStage("parsing");
    setJob(null);
    setError(null);

    const t1 = setTimeout(() => !cancelled && setStage("scoring"), 300);
    const t2 = setTimeout(() => !cancelled && setStage("breakdown"), 600);

    getJob(params.id)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setError("not-found");
          return;
        }
        setJob(result);
        setStage("complete");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load analysis.");
      });

    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [params.id]);

  if (error === "not-found") {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={FileQuestion}
          title="Job not found"
          description="This job may have been removed, or the link is out of date."
          action={
            <Button asChild size="sm">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState message={error} />
      </div>
    );
  }

  if (stage !== "complete" || !job) {
    return (
      <div className="mx-auto max-w-5xl">
        <AnalysisSkeleton stage={stage} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <VerdictHeader job={job} />
      <BreakdownTabs job={job} />
      <AttachmentsCard attachments={job.attachments} />
    </div>
  );
}
