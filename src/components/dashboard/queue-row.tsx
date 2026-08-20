import Link from "next/link";
import { HelpCircle, Paperclip } from "lucide-react";
import { ScoreRing } from "@/components/score-ring";
import { VerdictBadge } from "@/components/verdict-badge";
import { formatBudget, nicheLabel } from "@/lib/utils";
import type { JobSummary } from "@/lib/types";

export function QueueRow({ job }: { job: JobSummary }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-4 rounded-lg border border-border bg-card/60 px-4 py-3 transition-colors hover:bg-card"
    >
      <ScoreRing score={job.fitScore} size={44} strokeWidth={4} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{job.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {nicheLabel(job.niche)} · {formatBudget(job.budget)}
          </span>
          {job.questionCount > 0 && (
            <span className="flex shrink-0 items-center gap-0.5" title={`${job.questionCount} client question${job.questionCount === 1 ? "" : "s"}`}>
              <HelpCircle className="h-3 w-3" />
              {job.questionCount}
            </span>
          )}
          {job.hasAttachments && (
            <span className="flex shrink-0 items-center" title="Has attachments">
              <Paperclip className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-xs text-muted-foreground">Win prob.</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">{job.winProbability}%</p>
      </div>
      <VerdictBadge verdict={job.verdict} className="shrink-0" />
    </Link>
  );
}

export function QueueRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card/60 px-4 py-3">
      <div className="h-11 w-11 animate-pulse rounded-full bg-secondary" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
      </div>
      <div className="h-6 w-16 animate-pulse rounded-full bg-secondary" />
    </div>
  );
}
