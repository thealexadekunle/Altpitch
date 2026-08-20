import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { jobs } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit-log";
import { getRequestIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

/** Read-only impersonation: admins can see what a user sees, never act as them. No session
 * switch happens — this just fetches their rows through the raw Drizzle client and renders
 * them in a clearly-labeled admin view. Every view is itself audited, since "an admin looked at
 * my job posts" is exactly the kind of access a user would want visible in their own audit trail. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  return withAdmin(request, async ({ session }) => {
    const db = adminDb();
    const jobRows = await db
      .select({ id: jobs.id, status: jobs.status, createdAt: jobs.createdAt, parsed: jobs.parsed })
      .from(jobs)
      .where(eq(jobs.userId, params.id))
      .orderBy(desc(jobs.createdAt))
      .limit(50);

    await logAudit({ actorId: session.user.id, action: "admin.view_user_jobs", target: params.id, ip: getRequestIp(request) });

    return NextResponse.json({ jobs: jobRows });
  });
}
