import { pgTable, uuid, text, integer, boolean, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { user } from "@/lib/db/schema/auth";

export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(), // `user:<id>` or `ip:<address>`
    route: text("route").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("rate_limit_hits_key_route_window_idx").on(t.key, t.route, t.windowStart), index("rate_limit_hits_window_idx").on(t.windowStart)]
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    target: text("target"),
    metadata: jsonb("metadata").notNull().default({}),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_actor_id_idx").on(t.actorId), index("audit_log_action_idx").on(t.action), index("audit_log_created_at_idx").on(t.createdAt)]
);

export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  description: text("description").notNull().default(""),
  enabledGlobally: boolean("enabled_globally").notNull().default(false),
  enabledPlans: text("enabled_plans").array().notNull().default([]),
  enabledUserIds: text("enabled_user_ids").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const siteAnnouncements = pgTable("site_announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  message: text("message").notNull(),
  level: text("level", { enum: ["info", "warning", "critical"] }).notNull().default("info"),
  active: boolean("active").notNull().default(true),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blockedEmailDomains = pgTable("blocked_email_domains", {
  domain: text("domain").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
