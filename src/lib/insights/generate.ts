import "server-only";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { outcomes, jobs, insights } from "@/lib/db/schema";

const MIN_OUTCOMES = 5;
const MIN_PER_NICHE = 2;
const MIN_GAP_POINTS = 20; // percentage points — below this the difference is noise, not a pattern
const EXPIRY_DAYS = 14;

const POSITIVE_EVENTS = new Set(["reply", "interview", "hire"]);

/**
 * Corrections 03 §7 / AUDIT_REPORT.md P1-6, scoped MVP: one real pattern (niche response-rate
 * gap), not the full learning engine. Runs per-user from the daily cron (api/cron/cleanup).
 *
 * Gate: n >= 5 total outcomes (the audit's literal requirement), plus >= 2 niches with >= 2
 * outcomes each — a gap between one 5-job niche and one 1-job niche isn't a pattern, it's noise.
 * A dismissed kind is checked before generating, not after — this is what makes "dismissed never
 * re-inject" true rather than "dismissed until tomorrow's cron run recreates it."
 */
export async function generateInsightsForUser(userId: string): Promise<{ generated: boolean; reason: string }> {
  const alreadyDismissed = await db
    .select({ id: insights.id })
    .from(insights)
    .where(and(eq(insights.userId, userId), eq(insights.kind, "niche_performance_gap"), sql`${insights.dismissedAt} is not null`))
    .limit(1);
  if (alreadyDismissed.length > 0) return { generated: false, reason: "dismissed_permanently" };

  const activeExisting = await db
    .select({ id: insights.id })
    .from(insights)
    .where(and(eq(insights.userId, userId), eq(insights.kind, "niche_performance_gap"), isNull(insights.dismissedAt), sql`${insights.expiresAt} > now()`))
    .limit(1);
  if (activeExisting.length > 0) return { generated: false, reason: "already_active" };

  const rows = await db
    .select({ event: outcomes.event, parsed: jobs.parsed })
    .from(outcomes)
    .innerJoin(jobs, eq(outcomes.jobId, jobs.id))
    .where(eq(outcomes.userId, userId));

  if (rows.length < MIN_OUTCOMES) return { generated: false, reason: "insufficient_data" };

  const byNiche = new Map<string, { total: number; positive: number }>();
  for (const row of rows) {
    const niche = (row.parsed as { niche?: string } | null)?.niche;
    if (!niche) continue;
    const bucket = byNiche.get(niche) ?? { total: 0, positive: 0 };
    bucket.total += 1;
    if (POSITIVE_EVENTS.has(row.event)) bucket.positive += 1;
    byNiche.set(niche, bucket);
  }

  const eligible = Array.from(byNiche.entries())
    .filter(([, b]) => b.total >= MIN_PER_NICHE)
    .map(([niche, b]) => ({ niche, rate: b.positive / b.total, total: b.total }));

  if (eligible.length < 2) return { generated: false, reason: "insufficient_niche_spread" };

  eligible.sort((a, b) => b.rate - a.rate);
  const best = eligible[0];
  const worst = eligible[eligible.length - 1];
  const gapPoints = Math.round((best.rate - worst.rate) * 100);

  if (gapPoints < MIN_GAP_POINTS) return { generated: false, reason: "gap_below_threshold" };

  const message = `Your ${best.niche} jobs get a positive response (reply, interview, or hire) ${Math.round(best.rate * 100)}% of the time, versus ${Math.round(worst.rate * 100)}% for ${worst.niche} — worth leaning into ${best.niche} when you're choosing what to bid on.`;

  await db.insert(insights).values({
    userId,
    kind: "niche_performance_gap",
    message,
    metadata: { bestNiche: best.niche, bestRate: best.rate, worstNiche: worst.niche, worstRate: worst.rate, gapPoints },
    expiresAt: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });

  return { generated: true, reason: "ok" };
}

/** Ownership-checked — a user can only dismiss their own insight, never guess another user's id.
 * Once dismissed, generateInsightsForUser's dismissed-kind check means this exact kind never
 * regenerates for this user again ("dismissed never re-inject" — see AUDIT_REPORT.md P1-6). */
export async function dismissInsight(userId: string, insightId: string): Promise<boolean> {
  const result = await db
    .update(insights)
    .set({ dismissedAt: new Date() })
    .where(and(eq(insights.id, insightId), eq(insights.userId, userId)))
    .returning({ id: insights.id });
  return result.length > 0;
}

export async function getActiveInsights(userId: string) {
  return db
    .select()
    .from(insights)
    .where(and(eq(insights.userId, userId), isNull(insights.dismissedAt), sql`${insights.expiresAt} > now()`))
    .orderBy(insights.createdAt);
}
