import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, count } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { user, profiles, usageCredits, subscriptions, jobs, session as sessionTable } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { logAudit } from "@/lib/audit-log";
import { grantTopUpCredits } from "@/lib/billing/credits";
import { getRequestIp } from "@/lib/request-ip";

const SOFT_DELETE_GRACE_DAYS = 7;

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
  scheduleDeletion: z.enum(["schedule", "cancel"]).optional(),
  forcePasswordReset: z.boolean().optional(),
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
    const { suspended, suspendedReason, grantCredits, scheduleDeletion, forcePasswordReset } = parsedBody.data;

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

    if (scheduleDeletion === "schedule") {
      const deletionScheduledFor = new Date(Date.now() + SOFT_DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000);
      // Soft-delete: suspend (blocks sign-in immediately) and stamp the date the cron sweep in
      // api/cron/cleanup will hard-delete on. Nothing is removed here — see AUDIT_REPORT.md P1-9.
      await db.update(profiles).set({ suspended: true, suspendedReason: "Scheduled for deletion", deletionScheduledFor }).where(eq(profiles.userId, params.id));
      await db.delete(sessionTable).where(eq(sessionTable.userId, params.id));
      await logAudit({ actorId, action: "admin.schedule_deletion", target: params.id, metadata: { deletionScheduledFor: deletionScheduledFor.toISOString() }, ip });
    } else if (scheduleDeletion === "cancel") {
      await db.update(profiles).set({ suspended: false, suspendedReason: null, deletionScheduledFor: null }).where(eq(profiles.userId, params.id));
      await logAudit({ actorId, action: "admin.cancel_deletion", target: params.id, ip });
    }

    if (forcePasswordReset) {
      const [targetUser] = await db.select({ email: user.email }).from(user).where(eq(user.id, params.id)).limit(1);
      if (targetUser) {
        await db.delete(sessionTable).where(eq(sessionTable.userId, params.id)); // kicked out immediately
        await auth.api.requestPasswordReset({ body: { email: targetUser.email } });
      }
      await logAudit({ actorId, action: "admin.force_password_reset", target: params.id, ip });
    }

    return NextResponse.json({ ok: true });
  });
}
