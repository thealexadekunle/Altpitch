import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";

// Secure by default: everything not listed here requires a session. The marketing site lives at
// "/", "/pricing", "/terms", "/privacy", "/blog" (and blog post pages under it) — the
// authenticated Dashboard is at "/dashboard" instead, so the two don't collide.
const AUTH_ONLY_ROUTES = ["/login", "/signup"];

// These routes render identically regardless of who's asking — no reason to pay a session
// lookup (auth.api.getSession verifies against the DB on a cache miss; cheap on a cache hit via
// Better Auth's 60s cookie cache, but still not free) before serving them. That round-trip was
// the dominant cost on every page load, public or not, before this split existed.
// /api/cron/* checks its own CRON_SECRET bearer token (Vercel's invoker has no user session).
const NO_AUTH_CHECK_ROUTES = [
  "/pricing",
  "/terms",
  "/privacy",
  "/blog",
  "/api/health",
  "/forgot-password",
  "/api/auth",
  "/api/cron",
  "/api/site-status",
  // Metadata route (next/og) — social crawlers fetch this unauthenticated. Without this it
  // 307'd to /login, so no OG preview image would ever actually render anywhere it's shared.
  "/opengraph-image",
];

function skipsAuthCheck(pathname: string): boolean {
  if (pathname === "/") return true;
  return NO_AUTH_CHECK_ROUTES.some((route) => pathname.startsWith(route));
}

/** Session check on every request that needs one (see skipsAuthCheck above). Unauthenticated
 * users get bounced to /login from any protected route; authenticated users get bounced away
 * from /login and /signup to /dashboard. Suspended accounts (profiles.suspended) are signed out
 * and blocked everywhere — "suspend" means block sign-in while preserving data, not delete
 * anything. */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (skipsAuthCheck(pathname)) {
    return NextResponse.next({ request });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const isAuthOnly = AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthOnly) {
    // A suspended user hitting /login directly just sees the login page — the suspended check
    // only matters once they're trying to reach something protected (below).
    if (session) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  // Everything past this point is a protected app route — skipsAuthCheck() and the isAuthOnly
  // branch above have already handled every other case.
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const profile = await scopedDb(session.user.id).profiles.get(session.user.id);
  if (profile?.suspended) {
    await auth.api.signOut({ headers: request.headers }).catch(() => {});
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("suspended", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
