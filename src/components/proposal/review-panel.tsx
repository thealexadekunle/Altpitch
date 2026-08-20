import { ScoreBar } from "@/components/score-bar";
import { Rationale } from "@/components/rationale";
import type { ProposalReviewScores } from "@/lib/types";

export function ReviewPanel({ review }: { review: ProposalReviewScores }) {
  const entries = Object.values(review);
  return (
    <div className="space-y-4">
      {entries.map((s) => (
        <div key={s.label} className="space-y-1">
          <ScoreBar score={s.score} label={s.label} />
          <Rationale text={s.rationale} />
        </div>
      ))}
    </div>
  );
}
