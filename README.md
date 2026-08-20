# Altpitch

AI proposal operating system for Upwork freelancers: analyze a job, get a verdict, draft a proposal, answer screening questions, manage a knowledge base, read pipeline analytics. Phase 1 (frontend), Phase 2 (backend, auth, AI pipeline), Corrections 01 (password auth, client questions, attachments), and Corrections 02 (speed, security, SEO, billing scaffold, admin dashboard, supporting infra) are all built. Phase 3 (learning engine) is not.

Backend runs on Neon (serverless Postgres) + Drizzle ORM + Better Auth + Cloudflare R2; see "Architecture" below.

## Run

```bash
npm install
cp .env.local.example .env.local   # fill in the values below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated visits to the app land on `/login`; `/`, `/pricing`, `/terms`, `/privacy`, `/blog` are public marketing pages.

```bash
npm run build       # production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run test:live    # vitest — hits real Neon + Claude, no mocks (see tests/)
npm run db:generate  # drizzle-kit generate — writes SQL migration files from src/lib/db/schema
npm run db:push      # drizzle-kit push — apply schema directly (dev convenience)
npm run db:studio    # drizzle-kit studio — browse the DB
```

## Backend setup (required — the app has no offline/mock mode)

1. **Neon project** — [neon.tech](https://neon.tech) → New Project. Copy the pooled connection string.
2. **Cloudflare R2** — dash.cloudflare.com → R2 → create a bucket, then an API token (account ID, access key ID, secret access key).
3. **Google OAuth client** (optional — email + password works without it) — Google Cloud Console → Credentials → OAuth client ID → Web application → authorized redirect URI `<your-origin>/api/auth/callback/google`.
4. **Generate `BETTER_AUTH_SECRET`**: `openssl rand -base64 32`.
5. **Run the schema**: `npm run db:push` against `DATABASE_URL` (or `npm run db:generate` then apply the SQL under `drizzle/` however you manage migrations in production).
6. **Fill `.env.local`**:

```
DATABASE_URL=                  # Neon pooled connection string
BETTER_AUTH_SECRET=            # openssl rand -base64 32
NEXT_PUBLIC_SITE_URL=          # http://localhost:3000 in dev
GOOGLE_CLIENT_ID=              # optional — Google sign-in
GOOGLE_CLIENT_SECRET=
R2_ACCOUNT_ID=                 # Cloudflare dashboard, right sidebar
R2_ACCESS_KEY_ID=              # R2 API token
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
ANTHROPIC_API_KEY=             # console.anthropic.com > API Keys
CRON_SECRET=                   # openssl rand -hex 32 — protects /api/cron/*
```

Optional (scaffolded, inert until set — see each file's own doc comment): `NEXT_PUBLIC_SENTRY_DSN`, `RESEND_API_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`.

Once the required values are set: sign up at `/signup` (email + password, or Google) or sign in at `/login`. First login seeds a `profiles` row + 3 trial credits (via a Better Auth `databaseHooks.user.create` hook — see `lib/auth/auth.ts`) and routes to `/knowledge` (empty state = onboarding).

## Architecture

All data access goes through `src/lib/data/` — a single service layer with one function per operation, each `async` and typed against `src/lib/types/index.ts`. Components never call the database or Anthropic directly; they call `lib/data/*.service.ts`, which fetches from this app's own API routes.

Authorization has no Postgres RLS layer — Neon has no automatic per-row policy engine, so this is done in the application instead: **`lib/db/scoped.ts`** exports `scopedDb(userId)`, returning owner-scoped CRUD helpers (`.list()`, `.get()`, `.insert()`, `.update()`, `.remove()`) for every user-owned table — every read filters on `userId`, every insert stamps it, every write is scoped to rows the caller actually owns. The raw Drizzle client (`lib/db/client.ts`) is import-restricted via an eslint rule (`.eslintrc.json`) to `lib/data/**`, `lib/admin/**`, `lib/billing/**`, and a short list of infra files — nothing else can bypass the scoped layer by accident. `tests/isolation.test.ts` is the suite proving it holds: two real accounts, every owner-scoped table, cross-user reads/writes must fail.

```
src/
  app/
    api/analyze/            SSE route — stages 1–4 + 7 (parser, job/client analyzer, scorer, psychology)
    api/draft-proposal/     stages 5, 6, 8, 9, 10 (retriever, strategist, writer, screening, reviewer)
    api/rewrite-section/    single-section Writer call, used by Proposal Studio's "Rewrite section"
    api/tighten-answer/     single-answer rewrite, used by Screening's "Tighten" button
    api/upload-attachment/  server-side upload: magic-byte sniffing, EXIF strip, R2 put
    api/jobs/ api/dashboard/ api/analytics/ api/proposals/ api/screening-answers/
    api/knowledge/ api/settings/ api/attachments/   plain CRUD routes the service layer fetches from
    api/auth/[...all]/      Better Auth's own catch-all handler (sign-in, sign-up, OAuth, 2FA, sessions)
    api/admin/               admin-only routes — see "Admin" below
    api/billing/              trial-credit status + checkout-session stub
    api/health/               unauthenticated — Neon + R2 + Anthropic-key + billing-provider checks
    api/cron/cleanup/         Vercel Cron target, CRON_SECRET-protected — sweeps stale rate_limit_hits rows
    login/, signup/, forgot-password/, reset-password/   email+password auth, stark one-card design
    admin/                    super admin dashboard (see below)
    (7 product pages, unchanged from Phase 1)
  components/
    ui/                     shadcn-style primitives
    auth/                   shared AuthShell + the four auth forms + Turnstile widget slot
    admin/                  admin dashboard shell
    dashboard/ job/ proposal/ screening/ knowledge/ analytics/ analyze/   page-specific components
  lib/
    data/                   service layer — fetches this app's own API routes, never the DB directly
    db/
      schema/                Drizzle schema — auth.ts (Better Auth tables), core.ts, billing.ts, admin.ts
      client.ts               db (neon-http) + dbTx() (pooled WebSocket, for real transactions)
      scoped.ts                scopedDb(userId) — the authorization layer, see above
    auth/
      auth.ts                 Better Auth server config: email+password, Google, TOTP 2FA, databaseHooks
      client.ts                Better Auth React client (authClient)
      session-middleware.ts    route protection, both directions (see "Auth" below)
    admin/require-admin.ts    role check + admin-only Drizzle access, wraps every /api/admin/* route
    billing/                  credits.ts (transactional decrement), billing.service.ts (provider interface), plans.ts
    r2.ts                     upload/download/delete/presign against Cloudflare R2
    ai/
      client.ts               runStage() — calls Claude, validates with Zod, retries once, logs to pipeline_runs
      models.ts                model IDs per stage — never inline a model string elsewhere (claude-sonnet-4-6)
      schemas.ts                one Zod schema per pipeline stage output
      pipeline.ts               orchestrates the 10 stages across the two API routes
      prompts/                   one file per stage, versioned template functions
      retriever.ts               Stage 5 — niche-tag fallback until embeddings are wired (see below)
      attachment-extract.ts      turns attachments into Claude content blocks (pdf-parse, mammoth, or base64 image, via R2)
    store/                   Zustand — current job, paste draft, humanize toggle
    hooks/use-async.ts       shared loading/error/data fetch pattern
```

### Auth

Email + password is primary (`/login`, `/signup`), Google OAuth is the alternate on both, TOTP 2FA is available to any account via Better Auth's `twoFactor` plugin (admin accounts get a dedicated enrollment page at `/admin/security`; `lib/admin/require-admin.ts` relies on the fact that Better Auth doesn't issue a session at all until 2FA is verified, so no separate assurance-level check is needed). `/forgot-password` → `/reset-password` is a token-based loop (`requestPasswordReset` emails a link via `lib/email.service.ts` → `resetPassword({token})`).

`lib/auth/session-middleware.ts` guards both directions: no session on a protected route → bounce to `/login`; a session on `/login` or `/signup` → bounce to `/dashboard`; a suspended account (`profiles.suspended`) gets signed out and redirected with a flag. Public marketing routes and a few infra routes (`/api/health`, `/api/auth`, `/api/cron`) skip the session lookup entirely — it's a real network/DB round-trip, and paying it on every public page load was a measured performance regression during the build. Auth pages render without the app shell (`components/app-shell.tsx` returns bare `children` for `/login`, `/signup`, `/forgot-password`, `/reset-password`) — stark, one card, no nav chrome, per the design direction.

### Admin

`/admin` (role `admin` or `owner` in `profiles.role`) — users list/detail with suspend + credit grants + read-only impersonation (view a user's jobs, never write, every view audited), abuse controls (blocked email domains, enforced at signup via a `databaseHooks.user.create.before` check), site announcements, feature flags, an operations overview, and the TOTP enrollment page. Every admin API route is wrapped in `withAdmin()` (`lib/admin/require-admin.ts`), which checks role and returns 401/403 before any handler code runs.

### Client questions and attachments

`/analyze` captures manual screening questions (dynamic add/remove, capped at 10) and file attachments (PDF/DOCX/PNG/JPG/TXT, max 5 files, 10MB each) before the job exists. Attachments upload through `/api/upload-attachment` (real magic-byte sniffing against the file's actual bytes, EXIF stripped from images by re-encoding) to R2 under `${userId}/pending/...`; `/api/analyze` links them to the real job row once it's created. The Parser stage (`lib/ai/attachment-extract.ts`) reads them directly — PDF and DOCX are text-extracted (`pdf-parse`, `mammoth`), images go to Claude as vision content blocks, plain text is read as-is. Auto-detected questions from the post text merge with manual ones (deduped, case/punctuation-insensitive) into `jobs.parsed.clientQuestions`, shown on the job page tagged "You added" vs "Auto-detected."

### Screening answer length

Every screening answer targets 40–70 words (concise) or 70–100 (standard, the default) per the user's Settings preference, hard-ceilinged at 120 — enforced in the prompt *and* as a Zod refinement on `ScreeningOutputSchema`, so an over-length answer fails validation and triggers the existing retry-once mechanism automatically. "Tighten" (`/api/tighten-answer`) does a real one-answer rewrite on demand.

### Billing

One plan, credit-metered (Corrections 03 §5). $4.99/month grants 20 credits; 1 credit = 1 full pipeline run (analysis + proposal + screening answers). Regenerating on an existing analysis costs 0 — the content-hash cache in `/api/analyze` short-circuits a repaste.

Credits live in three buckets in `usage_credits`, keyed by `period` (`lib/billing/credits.ts`):

| Bucket | Source | Resets |
| --- | --- | --- |
| `lifetime` | 3 trial credits, seeded on signup | never |
| `subscription` | the monthly grant | at renewal |
| `topup` | purchased packs (10/30/75) | never — rolls over |

Burn order is trial, then subscription, then top-ups: the expiring bucket is spent first so a user who paid extra never watches it vanish. On lapse, top-up credits are retained but unspendable until a subscription is active again — the $4.99 is the platform fee, credits are the fuel; `/pricing` states this in plain words. A credit is spent when `/api/analyze` starts and refunded **into the same bucket** if the analysis fails.

Grants happen only in `/api/billing/webhook` (signature verified first). `lib/billing/billing.service.ts`'s `billingProvider` is still an `unconfiguredProvider` that throws instructively — implement `BillingProvider` against a real provider and swap the export to go live.

Unit economics: `lib/billing/cost.ts` prices `pipeline_runs` token logs, and `/admin/finance` reports measured cost per credit, margin per subscriber, top-up revenue as its own line, and a flag list of users whose consumption exceeds their payments. **The 20-credit grant and pack prices in `lib/billing/plans.ts` are placeholders** until measured across 20 live runs — the required math is in that file's header comment.

## Known gaps — read before assuming something is broken

- **Embeddings aren't wired.** `knowledge_items.embedding` exists in the schema (pgvector, via Drizzle's native `vector()` column type) but nothing populates it — Anthropic has no embeddings endpoint. `lib/ai/retriever.ts` falls back to a niche-tag match instead of cosine similarity, documented inline with the real query to swap in once you pick a provider (Voyage AI is the documented pairing for Claude) and set `VOYAGE_API_KEY`.
- **Humanize pass isn't implemented.** The Phase 1 UI has a humanize diff toggle; neither the Phase 2 spec's 10 pipeline stages nor Corrections 01/02 define a Humanizer, so `Proposal.humanizedDiff` is currently always empty. Add an 11th stage if the product needs it.
- **`byHookType` analytics is empty.** Hook style per proposal isn't tracked anywhere in this schema (that's `proposal_outcomes_flat`, a Phase 3 table). `byNiche` is real since niche lives on every job.
- **Generic `knowledge_items` table.** One table (`title`, `body`, `nicheTags`, `outcomeMetric`, `url`) backs six different UI shapes (portfolio, case study, testimonial, service, style, FAQ) per the Phase 2 spec's schema. Type-specific fields (a case study's challenge/approach/result, a testimonial's rating) are packed as JSON into `body` — see the `rowTo*` / `upsert*` pairs in `knowledge.service.ts`.
- **`proposals.meta` and `screening_answers.meta`** are additive JSONB columns not in the original Phase 2 spec text, carrying UI fields (strategy angle, selected portfolio IDs, consistency badges) that don't map to the spec's core columns.
- **`postedAt` on a job equals `analyzedAt`.** The Parser doesn't extract an original posting date from the raw text — both are set to the row's `createdAt`. Acceptable simplification; revisit if the UI ever needs to distinguish them.
- **Neon cold starts.** Scale-to-zero means the first request after idle pays a compute-resume cost — `/api/health`'s `database.latencyMs` is the measured signal for this; if p95 first-request latency exceeds 2s in practice, enable Neon's min-idle compute setting (cost trade-off, not a bug).

## Not built (deliberately — later phases)

Real payment processing (billing is scaffolded, provider-agnostic, unconfigured — see "Billing" above), Upwork scraping, browser extension, follow-up generator, pricing assistant, the learning engine (insights, calibration, `proposal_outcomes_flat`). `outcomes` recording works today so Phase 3 has data on day one — nothing learns from it yet. Neon branching-per-preview-deploy (documented in the migration plan) isn't wired into CI.

## Design system notes

- `ScoreRing` / `ScoreBar` (`src/components/`) are the only score visualizations — reuse them rather than inventing another pattern. Color semantics are fixed in `lib/utils.ts` (`scoreTone`): red &lt;40, neutral 40–69, accent 70+.
- The accent color (cobalt) is reserved for verdicts, scores, and primary CTAs only. Two shades, both AA on the deep-slate base: `accent` (`#3B82F6`) for text/marks, `accent-strong` (`#2563EB`) for filled CTAs under white type. Copper/amber was considered as a differentiation play and declined in favour of the cool professional direction — don't relitigate it by accident.
- All color lives in `src/app/globals.css` as CSS variables, surfaced as Tailwind tokens. No hex values in components, and no raw palette classes (`red-400`, `amber-500`) either — use `danger` / `warning` / `success`.
- Typeface is Space Grotesk (`next/font/google`, 400/500/600/700) for all UI chrome, scores and headings, loaded as `--font-space-grotesk`; tabular numerals are on globally. Long-form reading surfaces (the proposal editor) use the `.prose-reading` utility, which switches to Inter at 15px.
- Every data view follows loading → error → empty → content; see `lib/hooks/use-async.ts` and `components/error-state.tsx` / `components/empty-state.tsx`.
- Chart colors (`components/analytics/chart-theme.ts`) are a separate, CVD-safe palette from the product accent — don't substitute the brand accent into charts with 2+ series.

## Neon configuration audit

Required before any of the above ships, so infra problems aren't misdiagnosed as app bugs (an hour-long pipeline can also be a database misconfiguration). Check and date each line.

| # | Item | Checked |
| --- | --- | --- |
| 1 | `DATABASE_URL` is the **pooled** Neon string in all route handlers; credit decrement/refund uses the session/WebSocket driver (`dbTx`); no direct-connection string anywhere in serverless code | |
| 2 | Schema on main matches the schema files exactly (`npm run db:push` applied; this repo has no migration history — it pushes) | |
| 3 | `pgvector` extension created; `knowledge_items.embedding` dimension matches the embedding model | |
| 4 | Similarity index exists (HNSW or IVFFlat) and `EXPLAIN` confirms it is used; retrieval under 200ms | |
| 5 | Triggers present and firing (`proposal_outcomes_flat` populates on outcome insert — tested, not assumed) | |
| 6 | `scopedDb` lint rule active in CI; cross-user isolation suite green on every table, including `credit_purchases` | |
| 7 | Better Auth tables migrated; Google OAuth callback URLs correct for prod **and** preview domains; admin TOTP enrollment verified | |
| 8 | Vercel Cron jobs registered; `CRON_SECRET` set in all environments; last-run timestamps visible in `/admin/operations` | |
| 9 | Preview deploys confirmed on Neon branches (write in preview, verify absent in prod); PITR restore rehearsed | |
| 10 | Cold starts measured — if p95 first-query latency exceeds 2s, set compute min-idle and record the monthly cost here | |
| 11 | R2 bucket CORS and CSP domains correct; presigned URL TTL <= 10 minutes; upload magic-byte validation passing | |
| 12 | Grep gate clean: no `SUPABASE_*` references outside migration history | |

Two schema changes from Corrections 03 need a push before deploy: `pipeline_runs.budget_ms` (over-budget detection) and the `credit_purchases` table (top-up revenue reporting).
