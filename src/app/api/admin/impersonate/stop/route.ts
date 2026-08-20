import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { stopImpersonation } from "@/lib/admin/impersonation";
import { logAudit } from "@/lib/audit-log";
import { getRequestIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  stopImpersonation();
  await logAudit({ actorId: session.user.id, action: "admin.stop_impersonation", ip: getRequestIp(request) });

  return NextResponse.json({ ok: true });
}
