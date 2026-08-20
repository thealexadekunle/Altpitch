/**
 * Applied to every response in middleware.
 *
 * Not nonce-based: a first attempt at a strict `script-src 'nonce-...' 'strict-dynamic'` CSP
 * blocked 100% of scripts (verified in a real browser — Next 14.2's App Router doesn't propagate
 * the middleware nonce onto its own bootstrap/hydration `<script>` tags out of the box here, and
 * shipping a CSP that breaks the entire app is worse than one with a wider script-src). This
 * still does real work: no third-party script/frame/connect origins are reachable, which is the
 * actual attack surface for an app with no ad/analytics scripts. Revisit nonce propagation if a
 * later Next.js version documents the missing piece.
 */
export function buildCsp(): string {
  // R2 signed URLs (attachment previews) point at the account's r2.cloudflarestorage.com
  // origin — img-src needs it so <img> tags showing image attachments actually render.
  const r2AccountId = process.env.R2_ACCOUNT_ID ?? "";
  const r2Origin = r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : "";

  // Google OAuth is a full-page redirect (Better Auth's signIn.social), not a fetch/iframe, so
  // it doesn't need a script-src/connect-src entry — the browser's top-level navigation to
  // accounts.google.com isn't subject to CSP fetch directives.
  //
  // Payment-provider domain slot: add your MoR's checkout/widget origin here once wired
  // (billing.service.ts documents where the real provider gets plugged in).
  // Turnstile's origin is allowed unconditionally (script + frame + connect) — the widget slot
  // in signup/login only renders when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, but the CSP itself
  // is static per request, so it's simplest to leave the door open rather than branch on env here.
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${r2Origin}`,
    `font-src 'self' data:`,
    `connect-src 'self' https://api.anthropic.com https://challenges.cloudflare.com`,
    `frame-src https://challenges.cloudflare.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ];
  return directives.join("; ");
}

export function applySecurityHeaders(headers: Headers): void {
  headers.set("Content-Security-Policy", buildCsp());
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

// The authenticated product surface — never worth indexing (private data, no organic search
// value) and would otherwise duplicate-compete with the marketing pages at "/", "/pricing", etc.
const NOINDEX_ROUTES = ["/dashboard", "/analyze", "/knowledge", "/analytics", "/settings", "/jobs", "/api", "/admin"];

export function applyRobotsHeader(headers: Headers, pathname: string): void {
  if (NOINDEX_ROUTES.some((route) => pathname.startsWith(route))) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
}
