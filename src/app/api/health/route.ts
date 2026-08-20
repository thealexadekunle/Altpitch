import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { checkR2Reachable } from "@/lib/r2";
import { billingProvider } from "@/lib/billing/billing.service";

export const dynamic = "force-dynamic";

/** Unauthenticated by design (see NO_AUTH_CHECK_ROUTES in lib/auth/session-middleware.ts) — a
 * monitoring tool needs to reach this without a session. Anthropic has no free reachability
 * check (every real call costs tokens, and this endpoint may get polled every 30-60s), so that
 * check only confirms the key is present and shaped right, not that the API is actually up.
 *
 * `database.latencyMs` also doubles as the scale-to-zero cold-start signal the migration doc
 * asks for — Neon's compute suspends after idle, so a slow first hit here is real, not a bug;
 * if p95 exceeds 2s in practice, enable Neon's min-idle compute setting (see README). */
export async function GET() {
  const startedAt = Date.now();

  let database: { ok: boolean; latencyMs?: number; error?: string };
  try {
    const dbStart = Date.now();
    await db.execute(sql`select 1`);
    database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (err) {
    database = { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }

  const r2 = { ok: await checkR2Reachable() };

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const anthropic = { ok: Boolean(anthropicKey && anthropicKey.startsWith("sk-ant-")), configured: Boolean(anthropicKey) };

  const billing = { provider: billingProvider.name, configured: billingProvider.name !== "unconfigured" };

  const ok = database.ok && r2.ok && anthropic.ok;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      checks: { database, r2, anthropic, billing },
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
