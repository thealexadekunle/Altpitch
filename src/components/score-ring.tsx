import { cn, scoreStrokeClass, scoreColorClass } from "@/lib/utils";
import type { Score } from "@/lib/types";

interface ScoreRingProps {
  score: Score;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

/** Consistent 0–100 score visualization. Red <40, neutral 40–69, accent 70+. */
export function ScoreRing({ score, size = 56, strokeWidth = 5, label, className }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className="stroke-secondary fill-none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("fill-none transition-[stroke-dashoffset] duration-700 ease-out", scoreStrokeClass(clamped))}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-semibold tabular-nums", scoreColorClass(clamped))} style={{ fontSize: size * 0.32 }}>
            {clamped}
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
