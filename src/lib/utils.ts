import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Score, Verdict } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Score color semantics: red <40, neutral 40–69, accent 70+ */
export function scoreTone(score: Score): "low" | "mid" | "high" {
  if (score < 40) return "low";
  if (score < 70) return "mid";
  return "high";
}

export function scoreColorClass(score: Score): string {
  const tone = scoreTone(score);
  if (tone === "low") return "text-red-400";
  if (tone === "mid") return "text-zinc-300";
  return "text-accent";
}

export function scoreStrokeClass(score: Score): string {
  const tone = scoreTone(score);
  if (tone === "low") return "stroke-red-400";
  if (tone === "mid") return "stroke-zinc-400";
  return "stroke-accent";
}

export function scoreBarClass(score: Score): string {
  const tone = scoreTone(score);
  if (tone === "low") return "bg-red-400";
  if (tone === "mid") return "bg-zinc-400";
  return "bg-accent";
}

export function verdictLabel(verdict: Verdict): string {
  if (verdict === "apply") return "Apply";
  if (verdict === "skip") return "Skip";
  return "Borderline";
}

export function verdictClass(verdict: Verdict): string {
  if (verdict === "apply") return "bg-accent/15 text-accent border-accent/40";
  if (verdict === "skip") return "bg-red-500/15 text-red-400 border-red-500/40";
  return "bg-amber-500/15 text-amber-400 border-amber-500/40";
}

export function nicheLabel(niche: string): string {
  const map: Record<string, string> = {
    "web-design": "Web Design",
    seo: "SEO",
    branding: "Branding",
    "e-commerce": "E-commerce",
    copywriting: "Copywriting",
    other: "Other",
  };
  return map[niche] ?? niche;
}

export function formatBudget(budget: {
  type: "fixed" | "hourly";
  min?: number;
  max?: number;
  amount?: number;
  currency: string;
}): string {
  const sym = budget.currency === "USD" ? "$" : budget.currency + " ";
  if (budget.type === "hourly") {
    if (budget.min != null && budget.max != null) {
      return `${sym}${budget.min}–${budget.max}/hr`;
    }
    return `${sym}${budget.amount ?? budget.min ?? "—"}/hr`;
  }
  if (budget.amount != null) return `${sym}${budget.amount.toLocaleString()}`;
  if (budget.min != null && budget.max != null) {
    return `${sym}${budget.min.toLocaleString()}–${budget.max.toLocaleString()}`;
  }
  return "Budget TBD";
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Simulated network latency for mock services */
export async function mockLatency(min = 300, max = 800): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await delay(ms);
}
