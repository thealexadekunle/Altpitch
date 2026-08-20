import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, count, desc } from "drizzle-orm";
import { withAdmin, adminDb, assertCanActOn, ForbiddenActionError } from "@/lib/admin/require-admin";
import { user, profiles, usageCredits, subscriptions, jobs, session as sessionTable, creditLedger, pipelineRuns, auditLog } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit-log";
import { adminDeductCredits, InvalidReasonError } from "@/lib/billing/credits";
import { performSuspend, performUnsuspend, performGrantCredits, performScheduleDeletion, performForcePasswordReset, performRevokeSessions } from "@/lib/admin/user-actions";
import { getRequestIp } from "@/lib/request-ip";

const HISTORY_LIMIT = 50;

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return withAdmin(request, async () => {
    const db = adminDb();

    const [
      [authUser],
      [profile],
      [credits],
      [subscription],
      [{ count: jobCount }],
      ledger,
      pipelineHistory,
      auditTrail,
      sessions,
    ] = await Promise.all([
      db.select().from(user).where(eq(user.id, params.id)).limit(1),
      db.select().from(profiles).where(eq(profiles.userId, params.id)).limit(1),
      db.select().from(usageCredits).where(and(eq(usageCredits.userId, params.id), eq(usageCredits.period, "lifetime"))).limit(1),
      db.select().from(subscriptions).where(eq(subscriptions.userId, params.id)).limit(1),
      db.select({ count: count() }).from(jobs).where(eq(jobs.userId, params.id)),
      db.select().from(creditLedger).where(eq(creditLedger.userId, params.id)).orderBy(desc(creditLedger.createdAt)).limit(HISTORY_LIMIT),
      db.select().from(pipelineRuns).where(eq(pipelineRuns.userId, params.id)).orderBy(desc(pipelineRuns.createdAt)).limit(HISTORY_LIMIT),
      db.select().from(auditLog).where(eq(auditLog.target, params.id)).orderBy(desc(auditLog.createdAt)).limit(HISTORY_LIMIT),
      db
        .select({ id: sessionTable.id, createdAt: sessionTable.createdAt, expiresAt: sessionTable.expiresAt, ipAddress: sessionTable.ipAddress, userAgent: sessionTable.userAgent })
        .from(sessionTable)
        .where(eq(sessionTable.userId, params.id))
        .orderBy(desc(sessionTable.createdAt)),
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
      creditLedger: ledger,
      pipelineHistory,
      auditTrail,
      sessions,
    });
  });
}

const PatchSchema = z.object({
  suspended: z.boolean().optional(),
  suspendedReason: z.string().max(500).nullable().optional(),
  grantCredits: z.number().int().min(1).max(1000).optional(),
  grantReason: z.string().max(500).optional(),
  deductCredits: z.number().int().min(1).max(1000).optional(),
  deductReason: z.string().max(500).optional(),
  scheduleDeletion: z.enum(["schedule", "cancel"]).optional(),
  forcePasswordReset: z.boolean().optional(),
  killSwitch: z.boolean().optional(),
  revokeAllSessions: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return withAdmin(request, async ({ session, role }) => {
    const actorId = session.user.id;

    try {
      await assertCanActOn({ id: actorId, role }, params.id);
    } catch (err) {
      if (err instanceof ForbiddenActionError) {
        await logAudit({ actorId, action: "admin.forbidden_action_attempt", target: params.id, metadata: { reason: err.message }, ip: getRequestIp(request) });
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    const json = await request.json().catch(() => null);
    const parsedBody = PatchSchema.safeParse(json);
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });
    }

    const db = adminDb();
    const ip = getRequestIp(request);
    const { suspended, suspendedReason, grantCredits, grantReason, deductCredits, deductReason, scheduleDeletion, forcePasswordReset, killSwitch, revokeAllSessions } =
      parsedBody.data;

    if (suspended !== undefined) {
      if (suspended) await performSuspend(params.id, suspendedReason ?? null);
      else await performUnsuspend(params.id);
      await logAudit({
        actorId,
        action: suspended ? "admin.suspend_user" : "admin.unsuspend_user",
        target: params.id,
        metadata: suspendedReason ? { reason: suspendedReason } : undefined,
        ip,
      });
    }

    if (grantCredits !== undefined) {
      try {
        // Comp mechanism (§3), replacing "change plan" under the single-plan model. Granted into
        // the non-expiring top-up bucket so a comped credit doesn't vanish at renewal.
        await performGrantCredits(params.id, grantCredits, grantReason ?? "", actorId);
      } catch (err) {
        if (err instanceof InvalidReasonError) return NextResponse.json({ error: err.message }, { status: 400 });
        throw err;
      }
      await logAudit({ actorId, action: "admin.grant_credits", target: params.id, metadata: { amount: grantCredits, reason: grantReason }, ip });
    }

    if (deductCredits !== undefined) {
      try {
        const result = await adminDeductCredits(params.id, deductCredits, deductReason ?? "", actorId);
        await logAudit({ actorId, action: "admin.deduct_credits", target: params.id, metadata: { requested: deductCredits, deducted: result.deducted, reason: deductReason }, ip });
      } catch (err) {
        if (err instanceof InvalidReasonError) return NextResponse.json({ error: err.message }, { status: 400 });
        throw err;
      }
    }

    if (scheduleDeletion === "schedule") {
      // Soft-delete: suspend (blocks sign-in immediately) and stamp the date the cron sweep in
      // api/cron/cleanup will hard-delete on. Nothing is removed here — see AUDIT_REPORT.md P1-9.
      const deletionScheduledFor = await performScheduleDeletion(params.id);
      await logAudit({ actorId, action: "admin.schedule_deletion", target: params.id, metadata: { deletionScheduledFor: deletionScheduledFor.toISOString() }, ip });
    } else if (scheduleDeletion === "cancel") {
      await db.update(profiles).set({ suspended: false, suspendedReason: null, deletionScheduledFor: null }).where(eq(profiles.userId, params.id));
      await logAudit({ actorId, action: "admin.cancel_deletion", target: params.id, ip });
    }

    if (forcePasswordReset) {
      await performForcePasswordReset(params.id);
      await logAudit({ actorId, action: "admin.force_password_reset", target: params.id, ip });
    }

    if (killSwitch !== undefined) {
      await db.update(profiles).set({ pipelineKillSwitch: killSwitch }).where(eq(profiles.userId, params.id));
      await logAudit({ actorId, action: killSwitch ? "admin.enable_kill_switch" : "admin.disable_kill_switch", target: params.id, ip });
    }

    if (revokeAllSessions) {
      await performRevokeSessions(params.id);
      await logAudit({ actorId, action: "admin.revoke_all_sessions", target: params.id, ip });
    }

    return NextResponse.json({ ok: true });
  });
}
