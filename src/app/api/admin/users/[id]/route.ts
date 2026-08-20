import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, count } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { user, profiles, usageCredits, subscriptions, jobs } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit-log";
import { grantTopUpCredits } from "@/lib/billing/credits";
import { getRequestIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return withAdmin(request, async () => {
    const db = adminDb();

    const [[authUser], [profile], [credits], [subscription], [{ count: jobCount }]] = await Promise.all([
      db.select().from(user).where(eq(user.id, params.id)).limit(1),
      db.select().from(profiles).where(eq(profiles.userId, params.id)).limit(1),
      db.select().from(usageCredits).where(and(eq(usageCredits.userId, params.id), eq(usageCredits.period, "lifetime"))).limit(1),
      db.select().from(subscriptions).where(eq(subscriptions.userId, params.id)).limit(1),
      db.select({ count: count() }).from(jobs).where(eq(jobs.userId, params.id)),
    ]);

    if (!authUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: authUser.id,
      email: authUser.email,
      createdAt: authUser.createdAt,
      profile: profile ?? null,
      credits: credits ?? null,
      subscription: subscription ?? null,
      jobCount: jobCount ?? 0,
    });
  });
}

const PatchSchema = z.object({
  suspended: z.boolean().optional(),
  suspendedReason: z.string().max(500).nullable().optional(),
  grantCredits: z.number().int().min(1).max(1000).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return withAdmin(request, async ({ session }) => {
    const actorId = session.user.id;
    if (actorId === params.id) {
      return NextResponse.json({ error: "Can't modify your own admin account through this endpoint." }, { status: 400 });
    }

    const json = await request.json().catch(() => null);
    const parsedBody = PatchSchema.safeParse(json);
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });
    }

    const db = adminDb();
    const ip = getRequestIp(request);
    const { suspended, suspendedReason, grantCredits } = parsedBody.data;

    if (suspended !== undefined) {
      await db
        .update(profiles)
        .set({ suspended, suspendedReason: suspended ? (suspendedReason ?? null) : null })
        .where(eq(profiles.userId, params.id));
      await logAudit({
        actorId,
        action: suspended ? "admin.suspend_user" : "admin.unsuspend_user",
        target: params.id,
        metadata: suspendedReason ? { reason: suspendedReason } : undefined,
        ip,
      });
    }

    if (grantCredits !== undefined) {
      // Comp mechanism (Corrections 03 §6), replacing "change plan" under the single-plan model.
      // Granted into the non-expiring top-up bucket so a comped credit doesn't vanish at renewal.
      await grantTopUpCredits(params.id, grantCredits);
      await logAudit({ actorId, action: "admin.grant_credits", target: params.id, metadata: { amount: grantCredits }, ip });
    }

    return NextResponse.json({ ok: true });
  });
}
