import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { logAudit } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// Client components can't import lib/audit-log.ts directly (it's server-only, service-role).
// This route is the one path client-side auth forms use to record an event — actor_id is read
// from the request's own session cookie, never trusted from the request body.
const ACTIONS = ["auth.login", "auth.signup", "auth.password_reset_requested", "auth.logout"] as const;
const BodySchema = z.object({ action: z.enum(ACTIONS), email: z.string().email().optional() });

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const rateLimit = await checkRateLimit(`ip:${ip ?? "unknown"}`, RATE_LIMITS.default);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const json = await request.json().catch(() => null);
  const parsedBody = BodySchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: request.headers });

  // Password-reset requests fire before any session exists — actor_id is null, email goes in
  // metadata instead, same as the "if this account exists" non-enumerating response upstream.
  await logAudit({
    actorId: session?.user.id ?? null,
    action: parsedBody.data.action,
    metadata: parsedBody.data.email ? { email: parsedBody.data.email } : undefined,
    ip,
  });

  return NextResponse.json({ ok: true });
}
