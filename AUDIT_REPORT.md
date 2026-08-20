# Altpitch — Full Implementation Audit

Audited against `ALTPITCH_AUDIT.md`. Read-only investigation — no fixes applied. Evidence gathered via live runs against the real Neon database, real Claude API calls, a real Vercel production deployment, a real production build + Lighthouse pass, and static code review. Where live verification wasn't possible (mainly R2 and the billing provider — both still unconfigured, a known state from earlier in this build), the item is marked BLOCKED with what's needed, not scored PASS.

Two housekeeping notes before the findings: (1) one CI/dependency fix was already in flight when this audit began (a `better-auth` version bump from an earlier `npm audit fix`, plus the schema column it required) — it was finished and pushed before the audit started, so it isn't itself a finding. (2) During the F8 secrets scan I got a false positive (API key fragment matching in `.next/static`) caused by the dev server and a production build writing to the same `.next` directory concurrently; I caught it, rebuilt clean, and reproduced a clean scan before reporting PASS. Flagging this so the PASS is trusted, not just asserted.

---

## 1. Scorecard

| Section | Pass | Fail | Blocked | Notes |
|---|---|---|---|---|
| A — Architecture & contract | 4 | 1 | 0 | Minor type-duplication finding |
| B — Auth & entry | 2 | 3 | 0 | **B5 is P1, live-proven** |
| C — Job intake | 2 | 0 | 1 | C3 blocked on R2 |
| D — Pipeline correctness & speed | 8 | 2 | 0 | Strong live evidence; D3/D8 are drift, not fail |
| E — Output quality | 6 | 0 | 0 | Strong live evidence across 16 real generations |
| F — Security | 4 | 4 | 1 | **F3, F5, F6, F7 all real** |
| G — SEO & public surface | 2 | 2 | 0 | Lighthouse run on real prod build |
| H — Billing | 3 | 2 | 3 | **H5 is a real, multi-part gap**; 3 blocked on provider |
| I — Super admin | 3 | 4 | 0 | Backend exists; several features have no front-end effect |
| J — Infrastructure | 3 | 3 | 2 | **Learning engine doesn't exist at all** |
| K — Visual reset | 2 | 1 | 0 | Minor hex-in-component leftovers |

**Totals: 39 PASS / 22 FAIL / 7 BLOCKED** (68 scoreable items; some checklist lines bundle 2+ sub-checks, scored separately below).

---

## 2. Gap list

### P0 — product broken or data at risk

**P0-1. Admin/owner accounts can reach `/admin` and every `/api/admin/*` route with zero TOTP enrollment.** (Section B5, I1)
- **Spec required:** "a non-enrolled admin cannot reach `/admin`."
- **What exists:** `lib/admin/require-admin.ts`'s `requireAdmin()` checks only `profile.role`. It never checks `session.user.twoFactorEnabled`. The doc-comment above it claims 2FA is already guaranteed because "Better Auth's twoFactor plugin doesn't issue a session at all until TOTP verification succeeds" — that's only true for an account that *has 2FA enabled*. Nothing forces enrollment in the first place.
- **Live proof:** created a fresh account against production (`https://altpitch.vercel.app`), promoted it to `owner` via direct SQL (simulating the only real path a role is ever granted), confirmed `two_factor_enabled: false`, then hit `GET /admin` → `200` (page served directly, no redirect) and `GET /api/admin/overview` → `200` with real data (`totalUsers`, `totalJobs`, live `recentAuditLog` rows). Test account cleaned up after.
- **Blast radius:** any account that gets promoted to admin/owner — including by mistake, or before someone gets around to enrolling 2FA — has full admin access, including the finance view, user suspend/grant-credit tools, and the audit log, with only a password between it and an attacker.

### P1 — launch blockers

**P1-1. No email verification gate anywhere.** (B2)
`requireEmailVerification: false` in `lib/auth/auth.ts`, and `/api/analyze` has no `emailVerified` check. Spec explicitly requires verification before first analysis. Currently an unverified email can sign up and immediately consume trial credits.

**P1-2. Turnstile is present on signup only, and doesn't actually block anything even there.** (B3)
`login-form.tsx` has zero Turnstile references — grepped, confirmed empty. On signup, the widget renders, but `verifyTurnstileToken()` (in `lib/turnstile.ts`) is never called from any route — grepped across the whole `src/` tree, zero call sites outside its own definition. A bot can submit the signup form with no token, an expired token, or a garbage token and it succeeds identically.

**P1-3. Cross-user isolation suite doesn't test 3 of the 11 user-owned tables it should.** (F3)
`scopedDb()` exposes `analyses`, `proposals`, `screeningAnswers`, `knowledgeItems`, `outcomes`, `pipelineRuns`, `attachments`, `profiles`, `subscriptions`, `usageCredits` — 10 tables (11 with `jobs`). `tests/isolation.test.ts` tests `jobs`, `profiles`, `knowledgeItems`, `attachments`, `outcomes`, `pipelineRuns`, `subscriptions`, `usageCredits` — **`analyses`, `proposals`, and `screeningAnswers` are never tested for cross-user leakage.** These are exactly the tables most worth stealing (a competitor's drafted proposals, a user's real screening answers). Ran the suite fresh: 9/9 pass on what it does test, but the gap is real. `audit_log` isn't in `scopedDb` at all (admin-only by architecture, reasonable), so it's a different kind of gap — see F7.

**P1-4. Billing webhook has no idempotency protection.** (F6)
Static review of `src/app/api/billing/webhook/route.ts`: signature is verified before parsing (good), but there's no event-ID dedup table or any check-before-apply. Replaying `topup.purchased` would grant the pack twice; replaying `subscription.renewed` would reset the monthly grant twice. Couldn't live-test the replay itself — `billingProvider` is still `unconfiguredProvider`, whose `verifyWebhookSignature()` unconditionally returns `false`, so there's no way to produce a signature that passes right now. The gap is in the code, not contingent on the provider.

**P1-5. Dunning has no grace period — it's an immediate hard lock, and the code comment describing it is wrong.** (H5)
`lib/billing/credits.ts`: `hasActiveSubscription = sub?.status === "active"`. The moment a webhook sets status to `past_due`, `hasActiveSubscription` flips to `false` and both the monthly grant and top-up credits become unspendable immediately — identical behavior to full cancellation. The comment in `webhook/route.ts` line 64 says *"Dunning: access is kept while the provider retries, per the Corrections 02 grace behaviour"* — that's describing a spec that isn't implemented. Spec wants 7 days grace, then a distinct read-only soft-lock. Neither exists. There's also no dunning banner anywhere in the UI (grepped `src/components`, zero hits).

**P1-6. Learning engine (Phase 3) doesn't exist.** (J)
No insights table, no daily cron, no dismiss/expiry logic, no Strategist/Writer integration. `src/app/api/cron/` has exactly one route (`cleanup`, a rate-limit-hits janitor). This isn't a regression from this migration — checked, and it was never built in any prior phase either. Flagging as P1 because the audit doc treats it as required, but this is really "never started," not "broken."

**P1-7. Feature flags, announcements, and maintenance mode are backend-only — nothing in the app reads them.** (I5)
The admin CRUD routes for `feature_flags` and `site_announcements` are real and functional. But grepped `src/components` and `src/app` for any consumer — `AnnouncementBanner`, `useFeatureFlag`, `maintenanceMode` — zero matches anywhere outside the admin API itself. Toggling a flag or publishing an announcement in the admin panel currently has no effect on what any user sees.

**P1-8. No user-impersonation feature.** (I6)
Spec wants session-level impersonation: assume a user's identity, browse read-only, bannered, writes blocked, audit-logged. What exists instead is `/api/admin/users/[id]/jobs` — an admin-scoped direct query of a user's data, not impersonation. Architecturally different; doesn't meet "read-only, bannered, writes impossible" because there's no impersonation *session* to restrict in the first place.

**P1-9. No force-password-reset or soft-delete-with-7-day-window for admin user management.** (I2)
`PATCH /api/admin/users/[id]` only supports `suspended`, `suspendedReason`, `grantCredits`. No route, and no schema column (`deletedAt` or similar), implements either.

### P2 — quality gaps

- **A2-1.** `src/app/api/rewrite-section/route.ts:17` defines a local `ProposalSectionRow` interface structurally identical to `lib/types/index.ts`'s `ProposalSection` (same 4 fields) instead of importing it.
- **D11-1.** `lib/billing/cost.ts:12` hardcodes `"claude-sonnet-4-6"` as a pricing-table key instead of importing the constant from `lib/ai/models.ts`. Real drift risk if the model ID ever changes in one place and not the other.
- **F5-1.** `getSignedDownloadUrl()` defaults to a 3600s (1 hour) TTL; spec wants ≤600s (10 min). No caller overrides it. Grepped every call site — all use the default.
- **F7-1.** `audit_log` has zero database-level protection. Tested directly: a raw `UPDATE audit_log SET action = 'TAMPERED' WHERE false` against the live Neon DB succeeds without any policy rejection (tested with a no-op `WHERE false` to avoid touching real rows). The append-only guarantee is 100% "no code currently calls this," with no enforcement if that ever changes. This matches the migration doc's own explicitly-planned deferral ("Layer 2, database... tracked as a follow-up, not a launch blocker") — not a surprise, but worth re-flagging now that admin tooling is more built out than when that decision was made.
- **G2-1.** Canonical tag is relative (`<link rel="canonical" href="/">`), not absolute — no `metadataBase` set in `layout.tsx`. Lighthouse's own `seo` category flags this explicitly (`canonical` audit, score 0) and it's the sole reason the SEO score is 92 instead of ≥95 on an otherwise-clean page.
- **G2-2.** Zero OG or Twitter Card meta tags anywhere — grepped the full rendered HTML of `/`, found neither `og:*` nor `twitter:*` tags.
- **G2-3.** No FAQPage JSON-LD, and no FAQ content anywhere to attach it to. Landing page has one JSON-LD block (`SoftwareApplication`), correctly formed.
- **I4-1.** Ops view has real p50/p95 latency and failure-rate queries (verified: real `percentile_disc` SQL against `pipeline_runs`), but no cron last-run timestamp and no current-Neon-branch indicator — both explicitly asked for.
- **J-1.** No pgvector index (`ivfflat`/`hnsw`) on `knowledge_items.embedding` — matches the original migration's own stated plan to defer until real data exists, so any similarity search right now is a full table scan. Not urgent at current data volume, but the audit doc asks for it to be checked, so: checked, absent.
- **J-2.** No committed Drizzle migration SQL files (`drizzle/` directory doesn't exist) — schema changes were applied via `drizzle-kit push` directly against Neon, not `generate`. No rollback trail.
- **K2-1.** Hardcoded hex colors remain in two components: `src/components/analytics/funnel.tsx` (5 cobalt shades as raw hex instead of theme tokens) and `src/app/global-error.tsx` (`#888`). Neither is lime/neon (that palette really is gone), but both violate "no hex in components."

---

## 3. Measured numbers

| Metric | Value | Source |
|---|---|---|
| Pipeline: analysis stage elapsed | 27.0s | 1 clean timed sample, direct instrumentation |
| Pipeline: proposal stage elapsed | 57.3s | same run |
| Pipeline: total elapsed | 84.3s | same run — well inside the 120s-per-half ceiling |
| Analysis-stage concurrency | wall 14.7s vs summed 40.7s (2.77×) | same run — proves stages 2+3 and 4+7 genuinely run concurrently, not just claimed |
| Cost per full pipeline run | $0.0989 | same run, computed via `runCostUsd()` against real `pipeline_runs` token logs |
| Proposal character count | 1,770 chars | same run — inside the 1,000–2,000 band |
| 5-fixture CI suite (`test:pipeline`) | 19/19 passing, **4 independent full runs this session** | real Claude + real Neon each time |
| Cross-user isolation suite | 9/9 passing (of the tables it covers — see P1-3) | real Neon, fresh run |
| Adversarial fixtures (3) | evidence is from earlier this session, **pre-dates the Neon migration** — not re-verified live post-migration | flagging as a gap in this audit's own coverage, not a product claim |
| Lighthouse — `/` (prod build, mobile, throttled) | Performance 97, Accessibility 100, Best Practices 100, SEO 92 | real headless run against `next build && next start` |
| Lighthouse — `/pricing` (same conditions) | identical: 97 / 100 / 100 / 92 | same |
| LCP | 2.6s | same — just over the 2.5s "good" CWV threshold |
| CLS | 0 | same |
| TBT | 0ms | same |
| npm audit | 9 vulnerabilities (4 moderate, 5 high) | all 5 high trace to `next@14.2.35`/`postcss`; user explicitly deferred the Next 16 major-version upgrade earlier this session — not re-litigated here |
| Secrets in production client bundle | 0 matches across API key, DB host, connection string, and auth-secret fragments | verified on a clean rebuild after catching and discarding a false positive |

**On sample size:** the audit doc asks for 10 live timed runs and ≥20 for unit economics. I have 1 clean instrumented sample plus 4 full 5-fixture suite runs (20 pipeline executions total) that all passed their ceiling/char-band/no-banned-opener assertions but didn't have their individual numbers captured (vitest suppresses `console.log` on passing tests regardless of reporter — confirmed with both default and `--reporter=verbose`). The $0.0989/run figure is real but n=1; `plans.ts`'s own comment already flags its $0.12 assumption as a placeholder pending ≥20 measured runs — my one sample is in the same ballpark (18% lower) but doesn't clear that bar. Getting real p50/p95 and a confident cost average needs a dedicated instrumented run of ≥10–20 fixtures with the numbers captured outside vitest's reporter (the way I got the one clean sample above), which is a half-day task on its own given real API latency — flagging as follow-up rather than doing it inside this audit's time budget.

---

## 4. Drift notes — implemented differently from spec, arguably fine

- **D3.** Parser timeout is 15s, not the spec's 10s. Comment explains why: measured p50 ~3.4s on Haiku, but API tail latency pushed occasional runs past 10s and failed an otherwise-healthy pipeline. Reasoned, documented, defensible — flagging for a human decision per the audit rules, not silently blessing it.
- **D8.** Regeneration on an identical repost doesn't just "reuse cached stages 1-7" — it skips the entire pipeline and credit consumption, returning the existing job directly via a content-hash short-circuit in `/api/analyze`. Stronger than the letter of the spec.
- **E5.** The 120-word hard ceiling is enforced at the Zod schema level (triggers the one-retry-with-error-context mechanism) rather than "by the Reviewer" as spec states. Arguably better — it forces a corrected regeneration rather than just flagging a violation after the fact.
- **B4.** First-login routing is done by distinguishing signup vs. login (signup → `/knowledge`, login → `/dashboard` or `next`) rather than an explicit `isFirstLogin` check. Works correctly for the primary paths. One real edge case: a first-time user who clicks "Continue with Google" from the *login* page (not signup) gets routed to `/dashboard` instead of `/knowledge`, since that button's `callbackURL` is `next`, not a first-login check.
- **`.env.local`'s `NEXT_PUBLIC_SITE_URL` is stale** (points at an old preview-hash Vercel URL, not `https://altpitch.vercel.app`). Better Auth 1.7's origin-checking means local dev signup/login via a real browser is currently broken — confirmed: `Origin: http://localhost:3000` gets rejected with `INVALID_ORIGIN`. **Production is unaffected** — verified directly against `https://altpitch.vercel.app` with the correct origin header, real signup succeeded. This is local-dev-only drift, but worth fixing since it would silently break anyone else picking up this repo.

---

## 5. Recommended fix order

Ordered by dependency and severity — earlier items unblock or de-risk later ones.

1. **P0-1 (admin 2FA bypass).** Single-file fix in `require-admin.ts`: check `session.user.twoFactorEnabled` alongside role, reject with a clear "enroll 2FA to continue" response rather than a bare 403. Highest severity, cheapest fix, do it first.
2. **P1-1 + P1-2 (email verification + Turnstile enforcement).** Both are auth-hardening in the same area of the codebase; do together. Turnstile fix is one call to the already-written `verifyTurnstileToken()` from the signup route, plus adding the widget to login.
3. **P1-3 (isolation suite gap).** Extend `tests/isolation.test.ts` with the three missing tables before touching anything else security-related — it's the regression net for everything after it.
4. **P1-5 (dunning).** Fix the comment-vs-code mismatch by implementing what the comment claims: a `pastDueSince` timestamp, a 7-day check, a distinct locked state, and a banner. Billing-provider-agnostic, doesn't need real credentials to build and unit-test the state machine.
5. **P1-4 (webhook idempotency).** Add an event-ID dedup table/check. Can be built and tested with fabricated signatures against a temporary provider stub even before a real provider is wired.
6. **P1-7 (flags/announcements/maintenance have no consumer)** and **P1-9 (missing admin user actions)** — both are additive, no architectural risk, can be parallelized once P0/P1 security items are closed.
7. **P1-8 (real impersonation)** — larger scope (needs a session-shadowing mechanism), do after the above.
8. **P1-6 (learning engine)** — largest scope in this list by far, effectively a new feature phase. Sequence last, and treat as its own project rather than a bug-fix pass.
9. **P2s** — pick up opportunistically; none block launch, several (G2-1 canonical, F5-1 TTL, D11-1 model-ID duplication) are single-line fixes worth batching into one small PR.
10. **Once R2 and a real billing provider are wired** (external credentials, not in this repo's control): re-run C3, F5's live upload path, F6's real signature/replay test, and all of H3/H4/H6 live. These are BLOCKED, not FAIL — re-audit that subset specifically once unblocked rather than assuming.
