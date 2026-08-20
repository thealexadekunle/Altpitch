import { NextResponse } from "next/server";
import { lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rateLimitHits } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

/**
 * Replaces pg_cron (see ALTPITCH_MIGRATION_NEON.md) — Vercel Cron hits this on a schedule
 * (vercel.json) instead of Postgres running a scheduled job itself. Protected by CRON_SECRET,
 * checked as a bearer token the same way Vercel's own cron invoker sends it.
 *
 * There's no learning-engine daily job or insight-expiry task to port here — Phase 3 (the
 * learning engine) was never built, so porting its cron job would mean inventing one. What's
 * real and worth doing now that cron infra exists: rate_limit_hits rows outside their window are
 * pure dead weight (the limiter never reads them again), so this sweeps anything more than a day
 * past its window rather than letting that table grow forever.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const deleted = await db.delete(rateLimitHits).where(lt(rateLimitHits.windowStart, cutoff)).returning({ id: rateLimitHits.id });

  await logAudit({ actorId: null, action: "cron.cleanup_rate_limit_hits", metadata: { deletedCount: deleted.length } });

  return NextResponse.json({ ok: true, deletedCount: deleted.length });
}
