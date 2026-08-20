import "server-only";
import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import * as schema from "@/lib/db/schema";

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  return url;
}

/** HTTP one-shot driver — every ordinary query goes through this, lowest latency, no connection
 * to hold open. Cannot do real multi-statement transactions (no session state over HTTP).
 *
 * Lazily constructed behind a Proxy: reading DATABASE_URL at module load broke Next's build-time
 * page-data collection for any route importing this file when the env var isn't set yet (the
 * whole point of failing fast is undermined if it fails at *build* time, not request time).
 * Every real caller only touches `db` inside a request handler, so deferring construction to
 * first property access costs nothing at runtime and just means the build never needs a real
 * DATABASE_URL, only the deployed/running app does. */
let httpDb: NeonHttpDatabase<typeof schema> | null = null;
function getHttpDb(): NeonHttpDatabase<typeof schema> {
  if (!httpDb) httpDb = drizzleHttp(neon(requireDatabaseUrl()), { schema });
  return httpDb;
}
export const db: NeonHttpDatabase<typeof schema> = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getHttpDb(), prop, receiver);
  },
});

/** WebSocket pooled driver — only for code that needs `db.transaction(...)` (currently just the
 * billing credit decrement in lib/billing/credits.ts). Holds a real connection, so it's slower
 * to spin up than the HTTP client; don't reach for this by default. Already lazy by construction
 * (a function, not a module-level value), so no build-time env var read either. */
let pool: Pool | null = null;
export function dbTx() {
  if (!pool) pool = new Pool({ connectionString: requireDatabaseUrl() });
  return drizzlePool(pool, { schema });
}
