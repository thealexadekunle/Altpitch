import { cn, nicheLabel } from "@/lib/utils";
import type { Niche } from "@/lib/types";

const ALL_NICHES: Niche[] = ["web-design", "seo", "branding", "e-commerce", "copywriting", "other"];

export function NichePicker({
  value,
  onChange,
  multi = true,
}: {
  value: Niche[];
  onChange: (next: Niche[]) => void;
  multi?: boolean;
}) {
  function toggle(n: Niche) {
    if (!multi) {
      onChange([n]);
      return;
    }
    onChange(value.includes(n) ? value.filter((v) => v !== n) : [...value, n]);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_NICHES.map((n) => {
        const active = value.includes(n);
        return (
          <button
            type="button"
            key={n}
            onClick={() => toggle(n)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {nicheLabel(n)}
          </button>
        );
      })}
    </div>
  );
}
