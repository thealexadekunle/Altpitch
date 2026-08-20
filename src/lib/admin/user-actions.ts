import "server-only";
import { eq } from "drizzle-orm";
import { adminDb } from "@/lib/admin/require-admin";
import { profiles, session as sessionTable, user } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { adminGrantCredits, InvalidReasonError } from "@/lib/billing/credits";

const SOFT_DELETE_GRACE_DAYS = 7;

/**
 * The single-user mutation logic, factored out so the single-user PATCH route and the bulk
 * operations route (ALTPITCH_ADMIN_BUILD.md §3) call the exact same code — no duplicated suspend/
 * grant/revoke logic to drift out of sync between the two entry points. Each function does one
 * write and returns what happened; the caller (single or bulk) is responsible for the audit entry,
 * since a bulk caller needs a different action name (`admin.bulk_suspend_item` vs
 * `admin.suspend_user`) and a shared bulkId in the metadata.
 */

export async function performSuspend(targetUserId: string, reason: string | null): Promise<void> {
  const db = adminDb();
  await db.update(profiles).set({ suspended: true, suspendedReason: reason }).where(eq(profiles.userId, targetUserId));
  await db.delete(sessionTable).where(eq(sessionTable.userId, targetUserId));
}

export async function performUnsuspend(targetUserId: string): Promise<void> {
  await adminDb().update(profiles).set({ suspended: false, suspendedReason: null }).where(eq(profiles.userId, targetUserId));
}

export async function performGrantCredits(targetUserId: string, amount: number, reason: string, actorId: string): Promise<void> {
  await adminGrantCredits(targetUserId, amount, reason, actorId);
}

export async function performRevokeSessions(targetUserId: string): Promise<void> {
  await adminDb().delete(sessionTable).where(eq(sessionTable.userId, targetUserId));
}

export async function performScheduleDeletion(targetUserId: string): Promise<Date> {
  const db = adminDb();
  const deletionScheduledFor = new Date(Date.now() + SOFT_DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000);
  await db.update(profiles).set({ suspended: true, suspendedReason: "Scheduled for deletion", deletionScheduledFor }).where(eq(profiles.userId, targetUserId));
  await db.delete(sessionTable).where(eq(sessionTable.userId, targetUserId));
  return deletionScheduledFor;
}

export async function performForcePasswordReset(targetUserId: string): Promise<void> {
  const db = adminDb();
  const [targetUser] = await db.select({ email: user.email }).from(user).where(eq(user.id, targetUserId)).limit(1);
  if (!targetUser) return;
  await db.delete(sessionTable).where(eq(sessionTable.userId, targetUserId));
  await auth.api.requestPasswordReset({ body: { email: targetUser.email } });
}

export { InvalidReasonError };
