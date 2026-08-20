import "server-only";
import { NextResponse } from "next/server";
import { auth, type Session } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { db } from "@/lib/db/client";

export class NotAdminError extends Error {
  constructor(
    public status: 401 | 403,
    public code?: "not_admin" | "2fa_required"
  ) {
    super(status === 401 ? "Unauthorized" : code === "2fa_required" ? "2FA required" : "Forbidden");
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
  if (!session) throw new NotAdminError(401);

  const profile = await scopedDb(session.user.id).profiles.get(session.user.id);

  if (!profile || profile.suspended || (profile.role !== "admin" && profile.role !== "owner")) {
    throw new NotAdminError(403, "not_admin");
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
  if (!session) throw new NotAdminError(401);

  const profile = await scopedDb(session.user.id).profiles.get(session.user.id);
  if (!profile || profile.suspended || (profile.role !== "admin" && profile.role !== "owner")) {
    throw new NotAdminError(403, "not_admin");
  }

  return { session, role: profile.role };
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
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }
}
