export async function register() {
  // Node runtime (API routes, server components) only — not edge. Middleware runs on every
  // request including the public marketing pages, so it's the most latency-sensitive path in
  // the app; the edge Sentry SDK added ~55kB and a cold-start cost there for zero benefit while
  // NEXT_PUBLIC_SENTRY_DSN is unset. Revisit once Sentry is actually wired up and middleware
  // errors are worth that cost.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
}
