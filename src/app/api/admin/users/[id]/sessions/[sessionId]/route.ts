import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { withAdmin, adminDb, assertCanActOn, ForbiddenActionError } from "@/lib/admin/require-admin";
import { session as sessionTable } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit-log";
import { getRequestIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

/** One active session, revoked individually — the standalone "revoke" button per row in the
 * user-detail sessions list (ALTPITCH_ADMIN_BUILD.md §3), distinct from revokeAllSessions. */
export async function DELETE(request: Request, { params }: { params: { id: string; sessionId: string } }) {
  return withAdmin(request, async ({ session, role }) => {
    try {
      await assertCanActOn({ id: session.user.id, role }, params.id);
    } catch (err) {
      if (err instanceof ForbiddenActionError) return NextResponse.json({ error: err.message }, { status: 403 });
      throw err;
    }

    const db = adminDb();
    const deleted = await db
      .delete(sessionTable)
      .where(and(eq(sessionTable.id, params.sessionId), eq(sessionTable.userId, params.id)))
      .returning({ id: sessionTable.id });

    if (deleted.length === 0) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    await logAudit({ actorId: session.user.id, action: "admin.revoke_session", target: params.id, metadata: { sessionId: params.sessionId }, ip: getRequestIp(request) });
    return NextResponse.json({ ok: true });
  });
}
