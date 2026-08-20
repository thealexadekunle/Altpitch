import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { featureFlags } from "@/lib/db/schema";
import { MAINTENANCE_FLAG_KEY } from "@/lib/site";
import { logAudit } from "@/lib/audit-log";
import { getRequestIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const [flag] = await adminDb().select({ enabledGlobally: featureFlags.enabledGlobally }).from(featureFlags).where(eq(featureFlags.key, MAINTENANCE_FLAG_KEY)).limit(1);
    return NextResponse.json({ enabled: flag?.enabledGlobally ?? false });
  });
}

// Maintenance mode is high-blast-radius (locks every non-admin out of the whole app), so — like a
// destructive bulk action — flipping it requires the admin to type a literal confirmation phrase,
// checked server-side, not just a UI courtesy the client could skip. Admins keep access regardless
// of this flag (see MaintenanceGate in app-shell.tsx), so this can't lock the operator out.
const BodySchema = z.object({
  enabled: z.boolean(),
  confirm: z.literal("MAINTENANCE"),
});

export async function PATCH(request: Request) {
  return withAdmin(request, async ({ session }) => {
    const json = await request.json().catch(() => null);
    const parsedBody = BodySchema.safeParse(json);
    if (!parsedBody.success) return NextResponse.json({ error: "Type MAINTENANCE to confirm." }, { status: 400 });

    await adminDb()
      .insert(featureFlags)
      .values({ key: MAINTENANCE_FLAG_KEY, description: "Full-page maintenance notice for non-admins.", enabledGlobally: parsedBody.data.enabled })
      .onConflictDoUpdate({ target: featureFlags.key, set: { enabledGlobally: parsedBody.data.enabled } });

    await logAudit({
      actorId: session.user.id,
      action: parsedBody.data.enabled ? "admin.enable_maintenance_mode" : "admin.disable_maintenance_mode",
      ip: getRequestIp(request),
    });
    return NextResponse.json({ ok: true });
  });
}
