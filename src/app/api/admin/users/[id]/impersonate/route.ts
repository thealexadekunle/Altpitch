import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { user } from "@/lib/db/schema";
import { startImpersonation } from "@/lib/admin/impersonation";
import { logAudit } from "@/lib/audit-log";
import { getRequestIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

/** Starts a 30-minute read-only impersonation (see lib/admin/impersonation.ts for exactly what
 * "read-only" means structurally, not just by convention). */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withAdmin(request, async ({ session }) => {
    if (session.user.id === params.id) {
      return NextResponse.json({ error: "Can't impersonate your own account." }, { status: 400 });
    }
    const [target] = await adminDb().select({ email: user.email }).from(user).where(eq(user.id, params.id)).limit(1);
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await startImpersonation(session.user.id, params.id, target.email);
    await logAudit({ actorId: session.user.id, action: "admin.start_impersonation", target: params.id, ip: getRequestIp(request) });

    return NextResponse.json({ ok: true });
  });
}
