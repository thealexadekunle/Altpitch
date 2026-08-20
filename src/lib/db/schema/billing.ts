import { pgTable, pgEnum, uuid, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { user } from "@/lib/db/schema/auth";

export const subscriptionStatusEnum = pgEnum("subscription_status", ["trialing", "active", "past_due", "canceled", "paused"]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("unconfigured"),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    // Single plan (Corrections 03 §5) — tiers are gone; usage is metered in credits instead.
    plan: text("plan", { enum: ["trial", "altpitch"] }).notNull().default("trial"),
    status: subscriptionStatusEnum("status").notNull().default("trialing"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscriptions_user_id_idx").on(t.userId)]
);

export const usageCredits = pgTable(
  "usage_credits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // "lifetime" (3 trial credits), "subscription" (monthly grant, resets at renewal),
    // "topup" (purchased packs, never expire). See lib/billing/credits.ts for burn order.
    period: text("period", { enum: ["lifetime", "subscription", "topup"] }).notNull().default("lifetime"),
    granted: integer("granted").notNull().default(3),
    used: integer("used").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("usage_credits_user_period_idx").on(t.userId, t.period)]
);

/** Top-up purchases, recorded from the provider webhook. Kept separate from `usage_credits` so
 * the admin financial view can report top-up revenue as its own line (Corrections 03 §6) —
 * a credit balance says nothing about what was paid for it or when. */
export const creditPurchases = pgTable(
  "credit_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    pack: text("pack", { enum: ["small", "medium", "large"] }).notNull(),
    credits: integer("credits").notNull(),
    amountCents: integer("amount_cents").notNull(),
    provider: text("provider").notNull().default("unconfigured"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("credit_purchases_user_id_idx").on(t.userId), index("credit_purchases_created_at_idx").on(t.createdAt)]
);
