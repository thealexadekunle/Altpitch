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

// Append-only is enforced at the database level, not just by app convention: BEFORE UPDATE and
// BEFORE DELETE triggers (reject_audit_log_mutation()) raise on any DELETE and on any UPDATE
// except one specific shape — actor_id going non-null to null with every other column unchanged,
// which is the FK's own ON DELETE SET NULL cascade firing when an actor's user row is deleted.
// Without that carve-out, deleting any admin/owner account who ever performed a logged action
// would itself throw (the cascade UPDATE getting rejected same as a real tamper attempt) —
// caught live while verifying user cleanup, not a hypothetical. Added out-of-band via a one-off
// script the same way pgvector was enabled — Drizzle's schema DSL has no first-class trigger
// primitive in this version, so `drizzle-kit push` neither manages nor drops it. Verified live: a
// real content-changing UPDATE and a real DELETE both still raise; the cascade-shaped UPDATE
// succeeds. See ALTPITCH_ADMIN_BUILD.md §8/DoD.
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
  link: text("link"),
  dismissible: boolean("dismissible").notNull().default(true),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blockedEmailDomains = pgTable("blocked_email_domains", {
  domain: text("domain").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
