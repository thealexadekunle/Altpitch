import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { lt, isNotNull, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rateLimitHits, profiles, user, outcomes } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit-log";
import { generateInsightsForUser } from "@/lib/insights/generate";

export const dynamic = "force-dynamic";

/**
 * Replaces pg_cron (see ALTPITCH_MIGRATION_NEON.md) — Vercel Cron hits this on a schedule
 * (vercel.json) instead of Postgres running a scheduled job itself. Protected by CRON_SECRET,
 * checked as a bearer token the same way Vercel's own cron invoker sends it.
 *
 * rate_limit_hits rows outside their window are pure dead weight (the limiter never reads them
 * again), so this sweeps anything more than a day past its window rather than letting that table
 * grow forever. Also the daily driver for the soft-delete sweep and the learning-engine insight
 * generator (AUDIT_REPORT.md P1-6/P1-9) — same schedule, no reason for three separate cron jobs.
 */
export async function GET(request: Request) {
  // `dynamic = "force-dynamic"` opts the route's own response out of caching, but doesn't
  // reliably reach fetch() calls made deep inside a library (Neon's HTTP driver uses fetch()
  // internally) — Next's patched global fetch can still apply its own Data Cache to those.
  // noStore() is the documented escape hatch for exactly this. Confirmed necessary here: without
  // it, the zero-parameter `selectDistinct` below intermittently returned a stale result set
  // baked in at an earlier point in the process's life instead of the current table contents.
  noStore();

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const deleted = await db.delete(rateLimitHits).where(lt(rateLimitHits.windowStart, cutoff)).returning({ id: rateLimitHits.id });

  // Soft-delete sweep (AUDIT_REPORT.md P1-9): a profile past its deletionScheduledFor gets its
  // auth.user row hard-deleted — every owned table cascades off that FK (see schema/*.ts's
  // onDelete: "cascade"), so this one delete is the whole account, not a manual per-table walk.
  const overdue = await db
    .select({ userId: profiles.userId, deletionScheduledFor: profiles.deletionScheduledFor })
    .from(profiles)
    .where(isNotNull(profiles.deletionScheduledFor));
  const now = Date.now();
  const toDelete = overdue.filter((row) => row.deletionScheduledFor && row.deletionScheduledFor.getTime() <= now);
  for (const row of toDelete) {
    await db.delete(user).where(eq(user.id, row.userId));
  }

  // Learning engine (P1-6): one pattern (niche response-rate gap), gated at n >= 5 outcomes —
  // see lib/insights/generate.ts for the full gate (min sample per niche, gap threshold,
  // permanent-dismissal check). Cheap to run for every user with any outcomes; the function
  // itself no-ops instantly for anyone under the threshold or already covered.
  const usersWithOutcomes = await db.selectDistinct({ userId: outcomes.userId }).from(outcomes);
  let insightsGenerated = 0;
  let insightErrors = 0;
  for (const row of usersWithOutcomes) {
    try {
      const result = await generateInsightsForUser(row.userId);
      if (result.generated) insightsGenerated += 1;
    } catch (err) {
      // One user's bad data (an orphaned row, a malformed jobs.parsed blob) must never take down
      // insight generation for every other user in the same cron run.
      insightErrors += 1;
      console.error(`[cron] insight generation failed for user ${row.userId}:`, err);
    }
  }

  await logAudit({
    actorId: null,
    action: "cron.cleanup_rate_limit_hits",
    metadata: { deletedCount: deleted.length, accountsHardDeleted: toDelete.length, insightsGenerated, insightErrors },
  });

  return NextResponse.json({ ok: true, deletedCount: deleted.length, accountsHardDeleted: toDelete.length, insightsGenerated, insightErrors });
}
