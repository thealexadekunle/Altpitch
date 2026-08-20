import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { featureFlags, siteAnnouncements } from "@/lib/db/schema";
import { MAINTENANCE_FLAG_KEY } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Unauthenticated by design (see NO_AUTH_CHECK_ROUTES in lib/auth/session-middleware.ts) — the
 * maintenance gate and announcement banner both need this before we know who, if anyone, is
 * logged in. This is the consumer half of admin/flags and admin/announcements: those routes let
 * an admin create/toggle rows, this route is what makes toggling one actually do anything to the
 * app (AUDIT_REPORT.md P1-7 — the admin CRUD existed but nothing ever read it). */
export async function GET() {
  const [flagRow, announcementRows] = await Promise.all([
    db.select({ enabledGlobally: featureFlags.enabledGlobally }).from(featureFlags).where(eq(featureFlags.key, MAINTENANCE_FLAG_KEY)).limit(1),
    db
      .select({ id: siteAnnouncements.id, message: siteAnnouncements.message, level: siteAnnouncements.level })
      .from(siteAnnouncements)
      .where(eq(siteAnnouncements.active, true)),
  ]);

  return NextResponse.json({
    maintenanceMode: flagRow[0]?.enabledGlobally ?? false,
    announcements: announcementRows,
  });
}
