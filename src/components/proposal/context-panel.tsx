import { Paperclip } from "lucide-react";
import { VerdictBadge } from "@/components/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { formatBudget, nicheLabel } from "@/lib/utils";
import type { JobAnalysis, PortfolioItem } from "@/lib/types";

export function ContextPanel({
  job,
  strategyAngle,
  portfolioItems,
}: {
  job: JobAnalysis;
  strategyAngle: string;
  portfolioItems: PortfolioItem[];
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job summary</p>
        <p className="text-sm font-medium text-foreground">{job.title}</p>
        <p className="text-xs text-muted-foreground">
          {nicheLabel(job.niche)} · {formatBudget(job.budget)}
        </p>
        <VerdictBadge verdict={job.verdict} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strategy angle</p>
        <p className="text-sm text-foreground">{strategyAngle}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected proof</p>
        {portfolioItems.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No portfolio items selected yet — add matching work in Knowledge Base.
          </p>
        )}
        <div className="space-y-2">
          {portfolioItems.map((item) => (
            <div key={item.id} className="rounded-md border border-border p-2.5">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.outcomeMetric}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {item.nicheTags.map((t) => (
                  <Badge key={t} variant="muted">{nicheLabel(t)}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {job.attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attachments</p>
          <div className="space-y-1.5">
            {job.attachments.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-border p-2 text-xs text-foreground hover:bg-secondary/50"
              >
                <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{a.filename}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
