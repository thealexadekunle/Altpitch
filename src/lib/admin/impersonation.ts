import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth/auth";

/**
 * Read-only admin impersonation (AUDIT_REPORT.md P1-8). Deliberately NOT a real session swap —
 * a signed, short-lived token naming {adminId, targetUserId}, checked only by the specific GET
 * routes that power the "browse as them" experience (dashboard, jobs, knowledge, analytics — see
 * getImpersonatedOrOwnUserId's call sites). Every write-capable route keeps calling
 * auth.api.getSession() directly and never looks at this token, so "write actions impossible
 * while impersonating" holds structurally: an impersonating admin's write, if attempted, lands
 * on the admin's own account, never the target's.
 */
const COOKIE_NAME = "altpitch_impersonation";
const MARKER_COOKIE_NAME = "altpitch_impersonating"; // non-httpOnly, banner reads this — carries no data
const TTL_MS = 30 * 60 * 1000;

function sign(payload: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function startImpersonation(adminId: string, targetUserId: string, targetEmail: string): Promise<void> {
  const expiresAt = Date.now() + TTL_MS;
  const payload = `${adminId}:${targetUserId}:${expiresAt}`;
  const token = `${payload}:${sign(payload)}`;
  const store = cookies();
  store.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: TTL_MS / 1000, path: "/" });
  store.set(MARKER_COOKIE_NAME, targetEmail, { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: TTL_MS / 1000, path: "/" });
}

export function stopImpersonation(): void {
  const store = cookies();
  store.delete(COOKIE_NAME);
  store.delete(MARKER_COOKIE_NAME);
}

interface ImpersonationClaim {
  adminId: string;
  targetUserId: string;
}

function verifyToken(token: string): ImpersonationClaim | null {
  const parts = token.split(":");
  if (parts.length !== 4) return null;
  const [adminId, targetUserId, expiresAtStr, providedSig] = parts;
  const payload = `${adminId}:${targetUserId}:${expiresAtStr}`;
  const expectedSig = sign(payload);
  if (providedSig.length !== expectedSig.length || !timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig))) return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  return { adminId, targetUserId };
}

/** For the specific GET routes that power "browse as them." Returns the target user's id if a
 * valid, unexpired impersonation token exists AND belongs to the currently-signed-in admin
 * (prevents a stale/copied token being replayed by a different session); otherwise the caller's
 * own id. Never call this from a write-capable route. */
export async function getImpersonatedOrOwnUserId(request: Request): Promise<{ userId: string; impersonating: boolean } | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return { userId: session.user.id, impersonating: false };

  const claim = verifyToken(decodeURIComponent(match[1]));
  if (!claim || claim.adminId !== session.user.id) return { userId: session.user.id, impersonating: false };

  return { userId: claim.targetUserId, impersonating: true };
}
