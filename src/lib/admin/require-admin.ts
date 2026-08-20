import "server-only";
import { NextResponse } from "next/server";
import { auth, type Session } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { db } from "@/lib/db/client";

export class NotAdminError extends Error {
  constructor(
    public status: 404 | 403,
    public code?: "not_admin" | "2fa_required"
  ) {
    // 404 for "not admin" deliberately doesn't say "Forbidden" — ALTPITCH_ADMIN_BUILD.md §0/DoD:
    // a non-admin hitting any admin route gets a plain 404, never a response that confirms the
    // area exists at all. 2fa_required is the one case that's allowed to say more, because the
    // caller IS a real admin who needs to know to go enroll.
    super(status === 404 ? "Not found" : "2FA required");
  }
}

/** Every admin route and page calls this first. Role lives in `profiles.role`.
 *
 * Better Auth's twoFactor plugin only blocks a *login* without TOTP once an account has 2FA
 * enabled — it does nothing to force enrollment in the first place. An admin/owner account that
 * has never enrolled TOTP gets a normal password-only session, and `session.user.twoFactorEnabled`
 * on it is simply `false`. So this function checks that explicitly, distinct from the role check,
 * and returns a machine-readable code so the client can route to /admin/security to enroll
 * instead of just showing a bare "Forbidden." (Found live during the Corrections 03 audit: a
 * freshly-promoted owner account with no 2FA had full /admin access — see AUDIT_REPORT.md P0-1.) */
export async function requireAdmin(headers: Headers): Promise<{ session: Session; role: "admin" | "owner" }> {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new NotAdminError(404, "not_admin");

  const profile = await scopedDb(session.user.id).profiles.get(session.user.id);

  if (!profile || profile.suspended || (profile.role !== "admin" && profile.role !== "owner")) {
    throw new NotAdminError(404, "not_admin");
  }

  if (!session.user.twoFactorEnabled) {
    throw new NotAdminError(403, "2fa_required");
  }

  return { session, role: profile.role };
}

/** Role + suspended check only, no 2FA — used solely by the /admin page layout so a
 * not-yet-enrolled admin can still navigate to /admin/security to enroll, instead of being
 * bounced in a redirect loop by the same check that blocks them from it. Every actual data
 * route still goes through requireAdmin()/withAdmin() above, which does enforce 2FA — this
 * function grants no data access on its own, only lets the page shell render. */
export async function requireAdminRole(headers: Headers): Promise<{ session: Session; role: "admin" | "owner" }> {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new NotAdminError(404, "not_admin");

  const profile = await scopedDb(session.user.id).profiles.get(session.user.id);
  if (!profile || profile.suspended || (profile.role !== "admin" && profile.role !== "owner")) {
    throw new NotAdminError(404, "not_admin");
  }

  return { session, role: profile.role };
}

export class ForbiddenActionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Self-protection and admin/owner hierarchy (ALTPITCH_ADMIN_BUILD.md §3): no actor acts on their
 * own account through an admin mutation, and an admin (not owner) can't act on an owner or on
 * another admin — only the owner can act on admins. Every single-user and bulk mutation route
 * calls this per target before doing anything; the caller still writes an audit entry for the
 * attempt (the mutation route does that, this just decides allow/deny).
 */
export async function assertCanActOn(actor: { id: string; role: "admin" | "owner" }, targetUserId: string): Promise<void> {
  if (actor.id === targetUserId) {
    throw new ForbiddenActionError("You can't perform this action on your own account.");
  }
  if (actor.role === "admin") {
    const targetProfile = await scopedDb(targetUserId).profiles.get(targetUserId);
    if (targetProfile && (targetProfile.role === "owner" || targetProfile.role === "admin")) {
      throw new ForbiddenActionError("Admins can't act on owner or other admin accounts.");
    }
  }
}

/** Admin routes read/write across all users, which requires the raw Drizzle client — every
 * write in lib/admin/* goes through here (or scopedDb, for the actor's own rows), never a
 * client component. */
export function adminDb() {
  return db;
}

/** Every /api/admin/* route wraps its handler in this — one place enforcing the role check
 * instead of a copy-pasted try/catch at the top of every route file. */
export async function withAdmin<T>(
  request: Request,
  handler: (ctx: { session: Session; role: "admin" | "owner" }) => Promise<T>
): Promise<T | NextResponse> {
  try {
    const ctx = await requireAdmin(request.headers);
    return await handler(ctx);
  } catch (err) {
    if (err instanceof NotAdminError) {
      // The 404 body is deliberately generic — no `code`, nothing that distinguishes "you're not
      // signed in" from "you're signed in but not an admin" from "this route doesn't exist."
      if (err.status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (err instanceof ForbiddenActionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
