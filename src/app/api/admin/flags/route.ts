import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { featureFlags } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit-log";
import { getRequestIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const flags = await adminDb().select().from(featureFlags).orderBy(asc(featureFlags.key));
    return NextResponse.json({ flags });
  });
}

const CreateSchema = z.object({ key: z.string().min(1).max(100), description: z.string().max(500).default("") });

export async function POST(request: Request) {
  return withAdmin(request, async ({ session }) => {
    const json = await request.json().catch(() => null);
    const parsedBody = CreateSchema.safeParse(json);
    if (!parsedBody.success) return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });

    await adminDb().insert(featureFlags).values(parsedBody.data);

    await logAudit({ actorId: session.user.id, action: "admin.create_flag", target: parsedBody.data.key, ip: getRequestIp(request) });
    return NextResponse.json({ ok: true });
  });
}

const PatchSchema = z.object({ id: z.string().uuid(), enabledGlobally: z.boolean() });

export async function PATCH(request: Request) {
  return withAdmin(request, async ({ session }) => {
    const json = await request.json().catch(() => null);
    const parsedBody = PatchSchema.safeParse(json);
    if (!parsedBody.success) return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });

    await adminDb().update(featureFlags).set({ enabledGlobally: parsedBody.data.enabledGlobally }).where(eq(featureFlags.id, parsedBody.data.id));

    await logAudit({
      actorId: session.user.id,
      action: parsedBody.data.enabledGlobally ? "admin.enable_flag" : "admin.disable_flag",
      target: parsedBody.data.id,
      ip: getRequestIp(request),
    });
    return NextResponse.json({ ok: true });
  });
}
