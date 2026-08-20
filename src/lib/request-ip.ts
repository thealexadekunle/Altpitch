/** Vercel sets x-forwarded-for on every request; falls back to x-real-ip. Never trust this for
 * anything security-critical beyond rate-limit keying and audit logging. */
export function getRequestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}
