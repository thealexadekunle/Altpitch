import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { siteAnnouncements } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit-log";
import { getRequestIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const announcements = await adminDb().select().from(siteAnnouncements).orderBy(desc(siteAnnouncements.createdAt));
    return NextResponse.json({ announcements });
  });
}

const BodySchema = z.object({
  message: z.string().min(1).max(500),
  level: z.enum(["info", "warning", "critical"]),
});

export async function POST(request: Request) {
  return withAdmin(request, async ({ session }) => {
    const json = await request.json().catch(() => null);
    const parsedBody = BodySchema.safeParse(json);
    if (!parsedBody.success) return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });

    const [created] = await adminDb()
      .insert(siteAnnouncements)
      .values({ message: parsedBody.data.message, level: parsedBody.data.level, createdBy: session.user.id })
      .returning({ id: siteAnnouncements.id });

    await logAudit({ actorId: session.user.id, action: "admin.create_announcement", target: created.id, ip: getRequestIp(request) });
    return NextResponse.json({ ok: true });
  });
}

const PatchSchema = z.object({ id: z.string().uuid(), active: z.boolean() });

export async function PATCH(request: Request) {
  return withAdmin(request, async ({ session }) => {
    const json = await request.json().catch(() => null);
    const parsedBody = PatchSchema.safeParse(json);
    if (!parsedBody.success) return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });

    await adminDb().update(siteAnnouncements).set({ active: parsedBody.data.active }).where(eq(siteAnnouncements.id, parsedBody.data.id));

    await logAudit({
      actorId: session.user.id,
      action: parsedBody.data.active ? "admin.activate_announcement" : "admin.deactivate_announcement",
      target: parsedBody.data.id,
      ip: getRequestIp(request),
    });
    return NextResponse.json({ ok: true });
  });
}
