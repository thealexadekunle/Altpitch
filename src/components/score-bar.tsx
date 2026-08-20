import { cn, scoreBarClass, scoreColorClass } from "@/lib/utils";
import type { Score } from "@/lib/types";

interface ScoreBarProps {
  score: Score;
  label: string;
  className?: string;
}

/** Horizontal variant of the score visual language, for lists of scored items. */
export function ScoreBar({ score, label, className }: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-semibold tabular-nums", scoreColorClass(clamped))}>{clamped}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", scoreBarClass(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
