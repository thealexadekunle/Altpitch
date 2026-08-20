import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { blockedEmailDomains } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit-log";
import { getRequestIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const domains = await adminDb().select().from(blockedEmailDomains).orderBy(desc(blockedEmailDomains.createdAt));
    return NextResponse.json({ domains });
  });
}

const BodySchema = z.object({ domain: z.string().min(3).max(255).toLowerCase() });

export async function POST(request: Request) {
  return withAdmin(request, async ({ session }) => {
    const json = await request.json().catch(() => null);
    const parsedBody = BodySchema.safeParse(json);
    if (!parsedBody.success) return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });

    await adminDb().insert(blockedEmailDomains).values({ domain: parsedBody.data.domain });

    await logAudit({ actorId: session.user.id, action: "admin.block_domain", target: parsedBody.data.domain, ip: getRequestIp(request) });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(request: Request) {
  return withAdmin(request, async ({ session }) => {
    const domain = new URL(request.url).searchParams.get("domain");
    if (!domain) return NextResponse.json({ error: "domain query param required" }, { status: 400 });

    await adminDb().delete(blockedEmailDomains).where(eq(blockedEmailDomains.domain, domain));

    await logAudit({ actorId: session.user.id, action: "admin.unblock_domain", target: domain, ip: getRequestIp(request) });
    return NextResponse.json({ ok: true });
  });
}
