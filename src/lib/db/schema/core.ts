import { pgTable, pgEnum, uuid, text, integer, jsonb, boolean, timestamp, vector, index } from "drizzle-orm/pg-core";
import { user } from "@/lib/db/schema/auth";

/** Core app schema. userId everywhere is text, matching Better Auth's user.id (see
 * schema/auth.ts) — every user-owned table references it. */

export const jobStatusEnum = pgEnum("job_status", [
  "analyzed",
  "applied",
  "replied",
  "interviewed",
  "hired",
  "rejected",
  "skipped",
]);
export const verdictEnum = pgEnum("verdict", ["apply", "skip", "borderline"]);
export const proposalStatusEnum = pgEnum("proposal_status", ["draft", "humanized", "final", "sent"]);
export const knowledgeKindEnum = pgEnum("knowledge_kind", ["portfolio", "case_study", "testimonial", "service", "style", "faq"]);
export const outcomeEventEnum = pgEnum("outcome_event", ["sent", "reply", "interview", "hire", "rejection"]);

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(), // same value as userId — kept as a separate column to match the original 1:1 shape
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  title: text("title").notNull().default(""),
  timezone: text("timezone").notNull().default("UTC"),
  currency: text("currency").notNull().default("USD"),
  writingStyle: jsonb("writing_style")
    .notNull()
    .default({ tone: "professional", formality: 60, maxProposalWords: 250, avoidPhrases: [], preferredOpening: "", answerLength: "standard" }),
  role: text("role", { enum: ["user", "admin", "owner"] }).notNull().default("user"),
  suspended: boolean("suspended").notNull().default(false),
  suspendedReason: text("suspended_reason"),
  // Soft-delete: set by an admin, swept by the cron in api/cron/cleanup once past due. Null means
  // not scheduled. The account stays fully suspended (blocked sign-in, data intact) the whole
  // window, so canceling before the date is a full, clean undo. See AUDIT_REPORT.md P1-9.
  deletionScheduledFor: timestamp("deletion_scheduled_for", { withTimezone: true }),
  // Cost-abuse kill switch (ALTPITCH_ADMIN_BUILD.md §3) — blocks new analyses for this user
  // specifically, without the full account lockout suspend does. Sign-in, browsing existing
  // data, and everything else stays intact; only /api/analyze checks this.
  pipelineKillSwitch: boolean("pipeline_kill_switch").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rawPost: text("raw_post").notNull(),
    parsed: jsonb("parsed").notNull().default({}),
    status: jobStatusEnum("status").notNull().default("analyzed"),
    contentHash: text("content_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jobs_user_id_idx").on(t.userId), index("jobs_user_content_hash_idx").on(t.userId, t.contentHash)]
);

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    verdict: verdictEnum("verdict").notNull(),
    fitScore: integer("fit_score").notNull(),
    winProbability: integer("win_probability").notNull(),
    roiScore: integer("roi_score").notNull(),
    competition: integer("competition").notNull(),
    confidence: integer("confidence").notNull(),
    breakdown: jsonb("breakdown").notNull().default({}),
    psychology: jsonb("psychology").notNull().default({}),
    rationale: jsonb("rationale").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("analyses_job_id_idx").on(t.jobId), index("analyses_user_id_idx").on(t.userId)]
);

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    sections: jsonb("sections").notNull().default({}),
    reviewScores: jsonb("review_scores").notNull().default({}),
    status: proposalStatusEnum("status").notNull().default("draft"),
    variantOf: uuid("variant_of"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("proposals_job_id_idx").on(t.jobId), index("proposals_user_id_idx").on(t.userId)]
);

export const screeningAnswers = pgTable(
  "screening_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull().default(""),
    confidence: integer("confidence").notNull().default(0),
    consistencyOk: boolean("consistency_ok").notNull().default(true),
    needsInput: boolean("needs_input").notNull().default(false),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("screening_answers_job_id_idx").on(t.jobId), index("screening_answers_user_id_idx").on(t.userId)]
);

export const knowledgeItems = pgTable(
  "knowledge_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: knowledgeKindEnum("kind").notNull(),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    nicheTags: text("niche_tags").array().notNull().default([]),
    outcomeMetric: text("outcome_metric"),
    url: text("url"),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("knowledge_items_user_id_idx").on(t.userId), index("knowledge_items_kind_idx").on(t.kind)]
);

export const outcomes = pgTable(
  "outcomes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    event: outcomeEventEnum("event").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("outcomes_job_id_idx").on(t.jobId), index("outcomes_user_id_idx").on(t.userId)]
);

export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    model: text("model").notNull(),
    inputHash: text("input_hash").notNull(),
    output: jsonb("output"),
    latencyMs: integer("latency_ms"),
    // The timeout this stage ran under — an over-budget run is latencyMs > budgetMs, queryable
    // without hardcoding the budget table into the admin operations view.
    budgetMs: integer("budget_ms"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    status: text("status").notNull().default("ok"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pipeline_runs_user_id_idx").on(t.userId), index("pipeline_runs_job_id_idx").on(t.jobId)]
);

/** Learning engine (AUDIT_REPORT.md P1-6 — Phase 3 was never built; this is a real, intentionally
 * scoped MVP, not the full spec). Generated daily by the cron in api/cron/cleanup once a user has
 * >= 5 outcomes, one row per distinct pattern kind. `dismissedAt` set means "never show again" —
 * the generator checks dismissedKind history before creating a new row of the same kind, so a
 * dismissal is permanent, not just a hide-for-now. `expiresAt` lets a stale pattern age out even
 * if never dismissed. */
export const insightKindEnum = pgEnum("insight_kind", ["niche_performance_gap"]);

export const insights = pgTable(
  "insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: insightKindEnum("kind").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  },
  (t) => [index("insights_user_id_idx").on(t.userId), index("insights_user_kind_idx").on(t.userId, t.kind)]
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    // R2 object key, "${userId}/..." prefix convention (see lib/r2.ts).
    storagePath: text("storage_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attachments_job_id_idx").on(t.jobId), index("attachments_user_id_idx").on(t.userId)]
);
