import * as Sentry from "@sentry/nextjs";

// Scaffolded, not wired — inert until NEXT_PUBLIC_SENTRY_DSN is set (see .env.local). No DSN
// means no network calls at all here, not a silent no-op that still phones home.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // Session replay is expensive per-event; keep off until there's a reason to pay for it.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
