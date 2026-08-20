"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardList, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { getJob, getScreeningQuestions, updateScreeningAnswer, tightenAnswer } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { QuestionCard } from "@/components/screening/question-card";
import type { ScreeningQuestion } from "@/lib/types";

export default function ScreeningPage({ params }: { params: { id: string } }) {
  const jobId = params.id;
  const [title, setTitle] = useState<string>("");
  const [questions, setQuestions] = useState<ScreeningQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getJob(jobId), getScreeningQuestions(jobId)])
      .then(([job, qs]) => {
        if (cancelled) return;
        if (!job) {
          setError("Job not found.");
          return;
        }
        setTitle(job.title);
        setQuestions(qs);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load."));
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function handleSubmitInfo(questionId: string, info: string) {
    try {
      const question = questions?.find((q) => q.id === questionId);
      const updated = await updateScreeningAnswer(jobId, questionId, question?.answer ?? "", info);
      setQuestions(updated);
      toast.success("Answer updated with your input.");
    } catch {
      toast.error("Couldn't update answer.");
    }
  }

  async function handleTighten(questionId: string) {
    try {
      const updated = await tightenAnswer(questionId, jobId);
      setQuestions(updated);
      toast.success("Answer tightened.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't tighten answer.");
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href={`/jobs/${jobId}`} className="hover:text-foreground">{title || "Job"}</Link>
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Screening answers</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/jobs/${jobId}/proposal`}>
            <FileEdit /> Back to proposal
          </Link>
        </Button>
      </div>

      {!questions && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      )}

      {questions && questions.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No screening questions"
          description="This job post didn't include screening questions, or none were detected during parsing."
        />
      )}

      {questions && questions.length > 0 && (
        <div className="space-y-4">
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} onSubmitInfo={handleSubmitInfo} onTighten={handleTighten} />
          ))}
        </div>
      )}
    </div>
  );
}
