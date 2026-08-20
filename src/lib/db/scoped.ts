import "server-only";
import { eq, and, type SQL, type InferSelectModel } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

/** Drizzle's InferInsertModel doesn't survive re-exposure through another generic function's
 * return type cleanly (ownedTable -> scopedDb -> call site loses the concrete column shape and
 * excess-property-checks the object literal against an under-resolved type). Insert/update
 * payloads are loosely typed here as a result — runtime behavior is unaffected (Drizzle still
 * builds the real query against the real columns; Postgres still enforces the schema) and reads
 * (Row, the far more common thing callers need autocomplete on) stay fully typed below. */
type LooseValues = Record<string, unknown>;

/**
 * Layer 1 of the RLS replacement (see ALTPITCH_MIGRATION_NEON.md, "Authorization: replacing RLS
 * properly"). Every owner-scoped table gets a handle here; every read filters on userId, every
 * insert stamps it, every update/delete is scoped to rows the caller actually owns. There is no
 * method on the returned object that skips the filter — that's the structural guarantee, not a
 * convention someone has to remember in a code review.
 *
 * The raw `db` export from lib/db/client.ts is intentionally NOT re-exported here. Anything
 * needing a genuine cross-user query (admin routes, aggregate counts) imports `db` directly —
 * and the eslint rule in .eslintrc restricts that import to lib/data/**, lib/admin/**, and
 * lib/billing/** so it can't leak into a route handler or component by accident.
 */

type TableWithUserId = PgTable & { userId: { name: string } };

function ownedTable<T extends TableWithUserId>(table: T, userId: string) {
  type Row = InferSelectModel<T>;

  const ownerFilter = eq(table.userId as never, userId);

  return {
    async list(options?: { where?: SQL; orderBy?: SQL | SQL[]; limit?: number }): Promise<Row[]> {
      const where = options?.where ? and(ownerFilter, options.where) : ownerFilter;
      let query = db.select().from(table as PgTable).where(where).$dynamic();
      if (options?.orderBy) query = query.orderBy(...(Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy]));
      if (options?.limit) query = query.limit(options.limit);
      const rows = await query;
      return rows as unknown as Row[];
    },
    async get(id: string, idColumn: keyof Row & string = "id"): Promise<Row | undefined> {
      const col = (table as unknown as Record<string, SQL>)[idColumn];
      const rows = (await db
        .select()
        .from(table as PgTable)
        .where(and(ownerFilter, eq(col as never, id)))
        .limit(1)) as unknown as Row[];
      return rows[0];
    },
    async insert(values: LooseValues): Promise<Row> {
      const rows = (await db
        .insert(table as PgTable)
        .values({ ...values, userId } as never)
        .returning()) as unknown as Row[];
      return rows[0];
    },
    async insertMany(values: LooseValues[]): Promise<Row[]> {
      if (values.length === 0) return [];
      const rows = (await db
        .insert(table as PgTable)
        .values(values.map((v) => ({ ...v, userId })) as never)
        .returning()) as unknown as Row[];
      return rows;
    },
    async update(id: string, values: LooseValues, idColumn: keyof Row & string = "id"): Promise<Row | undefined> {
      const col = (table as unknown as Record<string, SQL>)[idColumn];
      const rows = (await db
        .update(table as PgTable)
        .set(values as never)
        .where(and(ownerFilter, eq(col as never, id)))
        .returning()) as unknown as Row[];
      return rows[0];
    },
    async remove(id: string, idColumn: keyof Row & string = "id"): Promise<void> {
      const col = (table as unknown as Record<string, SQL>)[idColumn];
      await db
        .delete(table as PgTable)
        .where(and(ownerFilter, eq(col as never, id)));
    },
  };
}

export function scopedDb(userId: string) {
  return {
    userId,
    jobs: ownedTable(schema.jobs, userId),
    analyses: ownedTable(schema.analyses, userId),
    proposals: ownedTable(schema.proposals, userId),
    screeningAnswers: ownedTable(schema.screeningAnswers, userId),
    knowledgeItems: ownedTable(schema.knowledgeItems, userId),
    outcomes: ownedTable(schema.outcomes, userId),
    pipelineRuns: ownedTable(schema.pipelineRuns, userId),
    attachments: ownedTable(schema.attachments, userId),
    profiles: ownedTable(schema.profiles, userId),
    subscriptions: ownedTable(schema.subscriptions, userId),
    usageCredits: ownedTable(schema.usageCredits, userId),
  };
}

export type ScopedDb = ReturnType<typeof scopedDb>;
