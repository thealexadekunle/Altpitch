import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

/**
 * Better Auth's own tables — shape matches what `npx @better-auth/cli generate` would emit for
 * the config in lib/auth/auth.ts (core + emailAndPassword + Google + twoFactor plugin). Written
 * by hand instead of generated because generation needs a live DB connection this repo doesn't
 * have yet; verify with `npx @better-auth/cli generate --dry-run` once DATABASE_URL is real, and
 * diff against this file, keeping whichever is correct.
 *
 * IDs are text (Better Auth's default — nanoid-style), not uuid. Every app table's user-id
 * column (schema/core.ts, schema/billing.ts, schema/admin.ts) is text for the same reason:
 * foreign keys must match the referenced column's type.
 */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // twoFactor plugin field — whether TOTP is enabled. The actual secret lives in twoFactor below.
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per sign-in method — email+password and Google both live here, keyed by providerId. */
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  // better-auth 1.7+ requires this column even when no generic-OIDC provider is configured
  // (only Google + email/password are wired here) — nullable, unused by either.
  issuer: text("issuer"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"), // hashed, email+password provider only
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Email verification + password reset tokens. */
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** twoFactor plugin: TOTP secret + backup codes, one row per user who's enrolled. Field set
 * matches better-auth/dist/plugins/two-factor/schema.mjs exactly — the adapter looks up columns
 * by these names, so it's not a "nice to have the extras," they're required for the plugin's
 * lockout/verification-attempt tracking to work at all. */
export const twoFactor = pgTable("two_factor", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  verified: boolean("verified").notNull().default(true),
  failedVerificationCount: integer("failed_verification_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});
