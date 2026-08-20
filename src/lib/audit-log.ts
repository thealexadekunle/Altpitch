import "server-only";
import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

interface AuditLogEntry {
  actorId: string | null;
  action: string;
  target?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

/** Append-only — no update/delete path exists anywhere in the app, by design. Written on auth
 * events, plan changes, admin actions, and deletions. */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  await db.insert(auditLog).values({
    actorId: entry.actorId,
    action: entry.action,
    target: entry.target ?? null,
    metadata: entry.metadata ?? {},
    ip: entry.ip ?? null,
  });
}
