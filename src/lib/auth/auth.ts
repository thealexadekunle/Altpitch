import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { sendEmail } from "@/lib/email.service";
import { TRIAL_CREDITS } from "@/lib/billing/plans";

/**
 * Auth config — env vars GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET for the Google provider. TOTP
 * 2FA is available to every account via the twoFactor plugin; lib/admin/require-admin.ts
 * enforces it specifically for admin/owner roles.
 *
 * transaction: false on the adapter — the neon-http driver (see lib/db/client.ts) has no
 * session state across requests, so it can't run multi-statement transactions. Better Auth
 * falls back to sequential operations, which is fine for auth writes (low contention, not the
 * credit-decrement hot path that needs the pooled driver instead).
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema, transaction: false }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_SITE_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    // Without this, Better Auth generates a reset token with no way to deliver it — the forgot
    // password page would silently do nothing. Routes through email.service.ts (Resend, inert
    // until RESEND_API_KEY is set — see that file's own doc comment); logs to the server
    // console in the meantime so the flow is at least debuggable pre-launch.
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Altpitch password",
        html: `<p>Click below to reset your password. This link expires in 1 hour.</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  // nextCookies must be last — it's what actually writes Set-Cookie headers from route handlers
  // and server actions in the App Router; every plugin before it just prepares the response.
  plugins: [twoFactor(), nextCookies()],
  // Better Auth's user table has no built-in row-seeding hook, so the app does it here — every
  // account, including Google sign-ups, goes through user.create, so this is the one place both
  // seeds (profile, trial credits) are guaranteed to run.
  databaseHooks: {
    user: {
      create: {
        // Refuses signup for any domain in blocked_email_domains (managed via /admin/abuse).
        before: async (user) => {
          const domain = user.email.split("@")[1]?.toLowerCase();
          if (domain) {
            const [blocked] = await db.select().from(schema.blockedEmailDomains).where(eq(schema.blockedEmailDomains.domain, domain)).limit(1);
            if (blocked) return false;
          }
        },
        after: async (user) => {
          await db.insert(schema.profiles).values({ id: user.id, userId: user.id, name: user.name ?? "" });
          await db.insert(schema.usageCredits).values({ userId: user.id, period: "lifetime", granted: TRIAL_CREDITS, used: 0 });
        },
      },
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 60 }, // 60s in-memory cache, avoids a DB hit on every request
  },
  advanced: {
    // httpOnly + secure + sameSite=lax session cookie in production.
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});

export type Session = typeof auth.$Infer.Session;
