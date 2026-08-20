import { z } from "zod";
import { randomUUID } from "crypto";
import { withAdmin, assertCanActOn, ForbiddenActionError } from "@/lib/admin/require-admin";
import { logAudit } from "@/lib/audit-log";
import { getRequestIp } from "@/lib/request-ip";
import {
  performSuspend,
  performUnsuspend,
  performGrantCredits,
  performRevokeSessions,
  performScheduleDeletion,
  InvalidReasonError,
} from "@/lib/admin/user-actions";

export const dynamic = "force-dynamic";

const MAX_TARGETS = 200;
const DESTRUCTIVE_ACTIONS = new Set(["suspend", "soft_delete"]);

const BodySchema = z
  .object({
    action: z.enum(["suspend", "unsuspend", "grant_credits", "revoke_sessions", "soft_delete"]),
    targetUserIds: z.array(z.string().min(1)).min(1).max(MAX_TARGETS),
    reason: z.string().max(500).optional(),
    amount: z.number().int().min(1).max(1000).optional(),
    /** Destructive actions require the client to have the admin type the exact target count —
     * re-sent here and re-checked server-side so a UI bug can't skip the confirmation. */
    confirmCount: z.number().int().optional(),
  })
  .refine((b) => b.action !== "grant_credits" || (b.amount && b.reason && b.reason.trim().length >= 10), {
    message: "grant_credits requires amount and a reason of at least 10 characters.",
  })
  .refine((b) => !DESTRUCTIVE_ACTIONS.has(b.action) || b.confirmCount === b.targetUserIds.length, {
    message: "confirmCount must match the exact number of targets for a destructive action.",
  });

/**
 * Bulk operations engine (ALTPITCH_ADMIN_BUILD.md §3/§9 step 4). Streamed as SSE (the pattern
 * already proven by /api/analyze) instead of a queue+worker system this stack doesn't have —
 * the connection stays open for the whole run, so "progress" is real, not best-effort, and
 * there's no separate job-status table to keep in sync. A 200-target cap keeps a single run
 * comfortably inside any reasonable request timeout; each target is a handful of small writes.
 *
 * Audit threading: one parent entry (action `admin.bulk_{action}`, target null, metadata.bulkId)
 * plus one child entry per target (`admin.bulk_{action}_item`, target=userId, same bulkId) — "what
 * happened at 3pm" and "what happened to this user" both resolve from audit_log alone.
 */
export async function POST(request: Request) {
  return withAdmin(request, async ({ session, role }) => {
    const json = await request.json().catch(() => null);
    const parsedBody = BodySchema.safeParse(json);
    if (!parsedBody.success) {
      return new Response(JSON.stringify({ error: parsedBody.error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { action, targetUserIds, reason, amount } = parsedBody.data;
    const actorId = session.user.id;
    const ip = getRequestIp(request);
    const bulkId = randomUUID();

    await logAudit({
      actorId,
      action: `admin.bulk_${action}`,
      metadata: { bulkId, targetCount: targetUserIds.length, reason, amount },
      ip,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        const results: { userId: string; success: boolean; error?: string }[] = [];

        for (let i = 0; i < targetUserIds.length; i++) {
          const targetId = targetUserIds[i];
          let success = true;
          let error: string | undefined;

          try {
            await assertCanActOn({ id: actorId, role }, targetId);

            switch (action) {
              case "suspend":
                await performSuspend(targetId, reason ?? "Bulk suspension");
                break;
              case "unsuspend":
                await performUnsuspend(targetId);
                break;
              case "grant_credits":
                await performGrantCredits(targetId, amount!, reason!, actorId);
                break;
              case "revoke_sessions":
                await performRevokeSessions(targetId);
                break;
              case "soft_delete":
                await performScheduleDeletion(targetId);
                break;
            }
          } catch (err) {
            success = false;
            error = err instanceof ForbiddenActionError || err instanceof InvalidReasonError ? err.message : "Action failed";
          }

          results.push({ userId: targetId, success, error });
          await logAudit({
            actorId,
            action: `admin.bulk_${action}_item`,
            target: targetId,
            metadata: { bulkId, success, error },
            ip,
          });

          send({ stage: "progress", processed: i + 1, total: targetUserIds.length, lastResult: results[results.length - 1] });
        }

        send({ stage: "complete", bulkId, results });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  });
}
