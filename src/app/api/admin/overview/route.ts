import { NextResponse } from "next/server";
import { count, eq, desc } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { user, jobs, subscriptions, auditLog } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const db = adminDb();

    const [totalUsers, totalJobs, activeSubscriptions, recentAuditLog] = await Promise.all([
      db.select({ count: count() }).from(user).then((r) => r[0]?.count ?? 0),
      db.select({ count: count() }).from(jobs).then((r) => r[0]?.count ?? 0),
      db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active")).then((r) => r[0]?.count ?? 0),
      db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(20),
    ]);

    return NextResponse.json({ totalUsers, totalJobs, activeSubscriptions, recentAuditLog });
  });
}
