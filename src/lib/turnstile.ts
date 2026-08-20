import "server-only";

/**
 * Scaffolded, not enforced yet — signup/login render the widget when a site key is configured
 * (see TurnstileWidget), but no route currently rejects a request over a missing/failed token.
 * Wiring it in is one call to this function inside the signup handler, once TURNSTILE_SECRET_KEY
 * is set. Until then it fails open (returns success) so removing the env var never locks anyone
 * out of an environment that was never configured for it in the first place.
 */
export async function verifyTurnstileToken(token: string, remoteIp?: string | null): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true;

  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) return false;
  const result = (await res.json()) as { success: boolean };
  return result.success;
}
