import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte, ilike, sql } from "drizzle-orm";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { auditLog, user } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/**
 * Audit log viewer (ALTPITCH_ADMIN_BUILD.md §8) — filter by actor/target/action/date. actorEmail
 * resolves via a left join since actor_id can be null (system actions, or an actor whose account
 * was later deleted — see the audit_log immutability trigger's FK-cascade carve-out).
 */
export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const db = adminDb();
    const params = new URL(request.url).searchParams;

    const actorEmail = params.get("actor")?.trim();
    const target = params.get("target")?.trim();
    const action = params.get("action")?.trim();
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
    const csv = params.get("csv") === "true";

    const conditions = [];
    if (actorEmail) conditions.push(ilike(user.email, `%${actorEmail}%`));
    if (target) conditions.push(ilike(auditLog.target, `%${target}%`));
    if (action) conditions.push(ilike(auditLog.action, `%${action}%`));
    if (dateFrom) conditions.push(gte(auditLog.createdAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(auditLog.createdAt, new Date(dateTo)));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = db
      .select({
        id: auditLog.id,
        actorId: auditLog.actorId,
        actorEmail: user.email,
        action: auditLog.action,
        target: auditLog.target,
        metadata: auditLog.metadata,
        ip: auditLog.ip,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorId));

    const limit = csv ? 5000 : PAGE_SIZE;
    const [rows, [{ count: total }]] = await Promise.all([
      (whereClause ? baseQuery.where(whereClause) : baseQuery)
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
        .offset(csv ? 0 : (page - 1) * PAGE_SIZE),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLog)
        .leftJoin(user, eq(user.id, auditLog.actorId))
        .where(whereClause ?? sql`true`),
    ]);

    if (csv) {
      const header = "id,actor_email,action,target,ip,created_at,metadata";
      const lines = rows.map((r) =>
        [r.id, r.actorEmail ?? "", r.action, r.target ?? "", r.ip ?? "", r.createdAt.toISOString(), JSON.stringify(r.metadata).replace(/"/g, '""')]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
      return new NextResponse([header, ...lines].join("\n"), {
        headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=audit-log.csv" },
      });
    }

    return NextResponse.json({ entries: rows, page, pageSize: PAGE_SIZE, total });
  });
}
