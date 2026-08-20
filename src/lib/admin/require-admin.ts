import "server-only";
import { NextResponse } from "next/server";
import { auth, type Session } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { db } from "@/lib/db/client";

export class NotAdminError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? "Unauthorized" : "Forbidden");
  }
}

/** Every admin route and page calls this first. Role lives in `profiles.role`.
 *
 * No separate 2FA/assurance-level check is needed here: Better Auth's twoFactor plugin doesn't
 * issue a session at all until TOTP verification succeeds — signIn.email returns
 * `{twoFactorRedirect: true}` instead of a session when 2FA is pending (see login-form.tsx). A
 * truthy session from auth.api.getSession() already means 2FA was completed, if the account has
 * it enabled. */
export async function requireAdmin(headers: Headers): Promise<{ session: Session; role: "admin" | "owner" }> {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new NotAdminError(401);

  const profile = await scopedDb(session.user.id).profiles.get(session.user.id);

  if (!profile || profile.suspended || (profile.role !== "admin" && profile.role !== "owner")) {
    throw new NotAdminError(403);
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
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
