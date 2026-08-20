import { cn, verdictClass, verdictLabel } from "@/lib/utils";
import type { Verdict } from "@/lib/types";

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wide",
        verdictClass(verdict),
        className
      )}
    >
      {verdictLabel(verdict)}
    </span>
  );
}
