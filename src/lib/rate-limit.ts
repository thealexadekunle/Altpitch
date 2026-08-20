import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rateLimitHits } from "@/lib/db/schema";

interface RateLimitConfig {
  route: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/** Fixed-window counter backed by `rate_limit_hits` — a single atomic upsert-increment via
 * Postgres `ON CONFLICT ... DO UPDATE`, so two concurrent requests can't both slip under the
 * limit. Fails open — if the limiter itself errors, real users aren't blocked by an infra
 * hiccup. */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const windowMs = config.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const resetAt = new Date(windowStart.getTime() + windowMs);

  try {
    const [row] = await db
      .insert(rateLimitHits)
      .values({ key, route: config.route, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [rateLimitHits.key, rateLimitHits.route, rateLimitHits.windowStart],
        set: { count: sql`${rateLimitHits.count} + 1` },
      })
      .returning({ count: rateLimitHits.count });

    const count = row?.count ?? 0;
    return { allowed: count <= config.limit, remaining: Math.max(0, config.limit - count), resetAt };
  } catch {
    return { allowed: true, remaining: config.limit, resetAt };
  }
}

/** `/api/analyze` is the expensive route (a full Claude pipeline run) — capped tighter than
 * everything else. Auth (`/login`, `/signup`) calls Better Auth directly from the browser, not
 * through our routes, so it isn't covered by this limiter; revisit if abuse shows up there
 * specifically. */
export const RATE_LIMITS = {
  analyze: { route: "analyze", limit: 10, windowSeconds: 3600 },
  default: { route: "default", limit: 60, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitConfig>;

export function rateLimitResponse(result: RateLimitResult) {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: "Too many requests. Try again shortly.", retryAfterSeconds }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}
