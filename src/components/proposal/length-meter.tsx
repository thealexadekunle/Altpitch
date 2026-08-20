"use client";

import { PROPOSAL_MAX_CHARS, PROPOSAL_MIN_CHARS, PROPOSAL_TARGET_CHARS } from "@/lib/ai/proposal-rules";
import { cn } from "@/lib/utils";

/** Corrections 03 §3 — the band is a hard requirement, so the user sees where they sit in it
 * while editing, not after an export gets rejected. Scale runs to 1.25x the ceiling so an
 * over-length draft still renders inside the track. */
const SCALE_MAX = PROPOSAL_MAX_CHARS * 1.25;

export function ProposalLengthMeter({ chars }: { chars: number }) {
  const inBand = chars >= PROPOSAL_MIN_CHARS && chars <= PROPOSAL_MAX_CHARS;
  const pct = (n: number) => `${Math.min((n / SCALE_MAX) * 100, 100)}%`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">Length</span>
        <span className={cn("font-mono text-xs tabular-nums", inBand ? "text-accent" : "text-destructive")}>
          {chars.toLocaleString()} / {PROPOSAL_MIN_CHARS.toLocaleString()}–{PROPOSAL_MAX_CHARS.toLocaleString()}
        </span>
      </div>

      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="absolute inset-y-0 bg-accent/20"
          style={{ left: pct(PROPOSAL_MIN_CHARS), width: `calc(${pct(PROPOSAL_MAX_CHARS)} - ${pct(PROPOSAL_MIN_CHARS)})` }}
        />
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", inBand ? "bg-accent" : "bg-destructive")}
          style={{ width: pct(chars) }}
        />
        <div className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: pct(PROPOSAL_TARGET_CHARS) }} />
      </div>

      {!inBand && (
        <p className="text-xs text-muted-foreground">
          {chars > PROPOSAL_MAX_CHARS
            ? "Over the ceiling — cut proof adjectives and pleasantries first, never the opening or the question."
            : "Under the floor — add specificity to the solution and proof, not padding."}
        </p>
      )}
    </div>
  );
}
