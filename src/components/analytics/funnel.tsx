import type { FunnelStage } from "@/lib/types";

/** Ordinal single-hue ramp — blue steps 700→500. All five clear 4.5:1 against white bar text. */
const STEPS = ["#0d366b", "#104281", "#184f95", "#1c5cab", "#256abf"];

export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const max = stages[0]?.count || 1;
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = Math.max(8, Math.round((s.count / max) * 100));
        return (
          <div key={s.stage} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-muted-foreground">{s.stage}</span>
            <div className="h-6 flex-1 rounded-md bg-secondary/60">
              <div
                className="flex h-full items-center rounded-md px-2 text-xs font-medium text-white tabular-nums"
                style={{ width: `${pct}%`, backgroundColor: STEPS[i % STEPS.length] }}
              >
                {s.count}
              </div>
            </div>
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {s.conversionFromPrevious != null ? `${s.conversionFromPrevious}%` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
