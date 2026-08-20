import { NextResponse } from "next/server";
import { gte, sql, desc } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { rateLimitHits, user } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 7;

/** Rate-limit violators, last 7d, per route (ALTPITCH_ADMIN_BUILD.md §3 abuse controls) — the
 * one-click-suspend shortcut only makes sense for `user:<id>`-keyed rows, so this resolves those
 * back to an email/userId the page can act on; `ip:<addr>`-keyed rows are informational only. */
export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const db = adminDb();
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({ key: rateLimitHits.key, route: rateLimitHits.route, totalHits: sql<number>`sum(${rateLimitHits.count})::int` })
      .from(rateLimitHits)
      .where(gte(rateLimitHits.windowStart, since))
      .groupBy(rateLimitHits.key, rateLimitHits.route)
      .orderBy(desc(sql`sum(${rateLimitHits.count})`))
      .limit(100);

    const userIds = rows.filter((r) => r.key.startsWith("user:")).map((r) => r.key.slice("user:".length));
    const users = userIds.length > 0 ? await db.select({ id: user.id, email: user.email }).from(user) : [];
    const emailById = new Map(users.map((u) => [u.id, u.email]));

    const shaped = rows.map((r) => {
      const isUser = r.key.startsWith("user:");
      const userId = isUser ? r.key.slice("user:".length) : null;
      return {
        key: r.key,
        route: r.route,
        totalHits: r.totalHits,
        userId,
        email: userId ? (emailById.get(userId) ?? null) : null,
      };
    });

    return NextResponse.json({ violators: shaped, windowDays: WINDOW_DAYS });
  });
}
