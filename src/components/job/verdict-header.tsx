import Link from "next/link";
import { FileEdit } from "lucide-react";
import { ScoreRing } from "@/components/score-ring";
import { VerdictBadge } from "@/components/verdict-badge";
import { Rationale } from "@/components/rationale";
import { Button } from "@/components/ui/button";
import { formatBudget, nicheLabel } from "@/lib/utils";
import type { JobAnalysis } from "@/lib/types";

export function VerdictHeader({ job }: { job: JobAnalysis }) {
  return (
    <div className="animate-settle-in rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs text-muted-foreground">
            {nicheLabel(job.niche)} · {formatBudget(job.budget)}
            {job.clientCountry ? ` · ${job.clientCountry}` : ""}
          </p>
          <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight">
            {job.title}
          </h1>
          <VerdictBadge verdict={job.verdict} className="text-sm" />
          <Rationale text={job.verdictRationale} />
        </div>

        <div className="flex shrink-0 flex-wrap gap-6 lg:gap-8">
          <ScoreRing score={job.winProbability} size={72} label="Win probability" />
          <ScoreRing score={job.fitScore} size={72} label="Fit score" />
          <ScoreRing score={job.roiScore} size={72} label="ROI score" />
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full border-4 border-secondary text-center">
              <span className="text-sm font-semibold capitalize leading-none">{job.competitionEstimate}</span>
            </div>
            <span className="text-xs text-muted-foreground">Competition</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Confidence <span className="font-medium text-foreground">{job.confidence}%</span>
        </p>
        <Button asChild className="ml-auto">
          <Link href={`/jobs/${job.id}/proposal`}>
            <FileEdit />
            Draft proposal
          </Link>
        </Button>
      </div>
    </div>
  );
}
