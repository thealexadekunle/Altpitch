import type { HumanizeDiff } from "@/lib/types";

export function HumanizeDiffView({ diff }: { diff: HumanizeDiff[] }) {
  if (diff.length === 0) {
    return <p className="text-sm text-muted-foreground">No humanize changes recorded for this draft.</p>;
  }
  return (
    <div className="space-y-4">
      {diff.map((d, i) => (
        <div key={i} className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d.sectionKey}</p>
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-danger line-through decoration-danger/60">
            {d.before}
          </p>
          <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
            {d.after}
          </p>
          <p className="text-xs text-muted-foreground">{d.changeNote}</p>
        </div>
      ))}
    </div>
  );
}
