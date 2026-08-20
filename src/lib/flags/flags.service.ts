import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { featureFlags } from "@/lib/db/schema";

/**
 * The one place the app checks a feature flag (ALTPITCH_ADMIN_BUILD.md §6) — /admin/flags writes
 * rows here, this reads them. A flag is on for a given caller if it's globally enabled, or the
 * caller's plan is in enabledPlans, or the caller's user id is in enabledUserIds — first match
 * wins, so a global flip always overrides a narrower allowlist.
 */
export async function isFlagEnabled(key: string, ctx?: { userId?: string; plan?: string | null }): Promise<boolean> {
  const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).limit(1);
  if (!flag) return false;
  if (flag.enabledGlobally) return true;
  if (ctx?.plan && flag.enabledPlans.includes(ctx.plan)) return true;
  if (ctx?.userId && flag.enabledUserIds.includes(ctx.userId)) return true;
  return false;
}
