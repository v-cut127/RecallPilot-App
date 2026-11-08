# RecallPilot App

Private product repository for RecallPilot — an AI recall and revenue-recovery product for dental practices in Europe.

This repository implements **R0 (bootstrap)** and **R1 (free audit + CSV import)** from the product plan. R1 stops at the audit: there is no outreach, inbox, booking, billing, WhatsApp, voice or PMS integration in this release.

The marketing landing page remains in the separate `RecallPilot` repository and was not modified. The full plan is copied to [`docs/RecallPilot-Product-Plan.html`](docs/RecallPilot-Product-Plan.html) and [`docs/RecallPilot-Product-Plan.pdf`](docs/RecallPilot-Product-Plan.pdf).

---

## What ships in R1

- Public `/audit`: email-gated CSV upload, progress state, tokenized report.
- Public `/audit/[token]`: shareable report with PDF download, assumptions, sample messages, expiry and revocation checks.
- Authenticated `/onboarding`, `/app/import`, `/app/dashboard`.
- CSV detection: UTF-8 (BOM), Windows-1252, comma/semicolon/tab/pipe, ISO and European dates, quoted fields and formula-injection-safe error exports.
- Automatic mapping with manual override, saved mapping profiles, visible validation errors and downloadable error CSV.
- Worker pipeline: parse -> map -> validate -> normalize -> audit -> report -> purge raw upload.
- Audit calculations: overdue by treatment type, lapsed 12–24 months, due next 30 days, estimated production at risk, with explicit assumptions.
- Share links: 256-bit tokens, 30-day default expiry, revocable from the dashboard.
- Synthetic seed: 3 locations, 2,500 patients, messy rows, two CSV variants (comma/ISO and semicolon/DD.MM.YYYY).
- English-first UI/report; locale and template structures are ready for German and Dutch.

Out of scope for R1: outreach, inbox, booking, billing, WhatsApp, voice, PMS write-back, insurance checks and clinical advice.

## Stack

- Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui
- Supabase (EU Central target): Postgres, Auth, Storage, RLS
- Drizzle ORM, pg-boss worker, Resend behind an email adapter
- Vitest unit/database tests, Playwright end-to-end tests
- npm workspaces, Node 22, npm 11

## Repository layout

```
RecallPilot-App/
├─ apps/
│  ├─ web/                 # Next.js app, public audit, auth, import wizard, APIs
│  └─ worker/              # pg-boss worker and import pipeline
├─ packages/
│  ├─ db/                  # Drizzle schema, migrations, seeds, RLS tests
│  ├─ core/                # CSV, mapping, validation, audit, plans, PDF, i18n-ready types
│  ├─ integrations/        # email, storage and job-queue adapters
│  └─ ui/                  # shadcn/ui components and brand tokens
├─ supabase/               # local config and SQL migrations (single migration set)
├─ docs/                   # product plan
├─ e2e/                    # Playwright flows
├─ scripts/                # local DB, Supabase provisioning, benchmark
└─ .github/workflows/ci.yml
```

## Quick start (local, no Docker)

This machine already has PostgreSQL 18 binaries, so the repository can run a portable local cluster on port `55432`.

```powershell
cd C:\Users\Viola\Desktop\Projects\RecallPilot-App
Copy-Item .env.example .env.local
npm install
npm run db:local:start
npm run db:seed
npm run dev:all
```

Open http://localhost:3000.

Demo account created by `db:seed`:

```
demo@recallpilot.test
DemoPass123!
```

`db:seed` also writes:

- `seed/bright-dental-comma-iso.csv`
- `seed/bright-dental-semicolon-ddmmyyyy.csv`

Those files are generated and gitignored. `npm run seed:data` regenerates them without touching the database.

If PostgreSQL binaries are not available, set `DATABASE_URL` to any Postgres instance (for example a Supabase EU project) and run `npm run db:bootstrap` instead of `db:local:start`.

### Useful commands

```powershell
npm run dev:all              # web + worker
npm run test:unit            # CSV, normalization, audit, PDF and security tests
npm run test:db              # cross-org RLS + retention tests
npm run test:e2e             # Playwright: signup -> import -> audit -> share
npm run benchmark:import     # 5,000-row import acceptance benchmark
npm run db:local:status
npm run db:local:stop
```

## Authentication

The production path is Supabase Auth (password and magic link). The SSR clients and callback route are implemented.

Because this workspace has no Docker and the Supabase organization is at its active free-project limit, local development and E2E use `AUTH_PROVIDER=local`: a development-only adapter that stores scrypt password hashes in the local `auth.users` table and signs an HttpOnly session cookie. It exists so the complete signup -> import -> audit -> share flow can be exercised without external services. Deployed environments must use `AUTH_PROVIDER=supabase`. If a production process has neither `AUTH_PROVIDER` nor Supabase keys, auth fails closed.

## Supabase EU Central

The target is EU Central (Frankfurt). Local config is in [`supabase/config.toml`](supabase/config.toml), and the migrations are in [`supabase/migrations`](supabase/migrations).

The hosted project was **not created** in this workspace because the free organization already has two active free projects. The user chose local-first execution. To provision when capacity is available:

```powershell
npm run supabase:provision
```

The script creates `RecallPilot App` in `eu-central-1`, links it, pushes migrations, and writes hosted settings to `.secrets/supabase.env` (gitignored). Merge those values into `.env.local`, set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY`, then restart. In the hosted project, set Auth Site URL to the deployed app URL and add `/auth/callback` to the allowed redirect URLs. Use the Supabase pooler connection string for Vercel.

For a hosted database, use `supabase db push`; for the portable local Postgres, use `npm run db:migrate`. Both track migrations separately, so do not mix them on the same database.

## Import pipeline

1. **Ingest** — authenticated or public upload, 20 MB limit, stored through the storage adapter.
2. **Parse** — BOM/encoding detection, delimiter detection, quoted fields, CRLF/embedded newlines.
3. **Map** — English/German/Dutch aliases, manual override, saved mapping profiles.
4. **Validate** — duplicates in file and against the org, missing names/dates, invalid email/phone/date/number, unknown locations/providers, missing consent. Errors are downloadable; no silent loss.
5. **Normalize** — ISO dates, E.164-like phones, treatment groups, consent flags, locale, deterministic patient key.
6. **Commit** — idempotent patient upsert, consents, appointments, and auto-created locations/providers for first imports.
7. **Audit** — cohorts and estimated production with explicit assumptions.
8. **Report** — tokenized report, PDF in storage, email through the adapter.
9. **Purge** — raw upload deleted immediately after processing; scheduled sweeper handles failures/expiry. Lead validation rows are purged after 24 hours.

### Audit assumptions (always labelled)

- Overdue = next recall date before the audit date.
- Default intervals: hygiene 6 months, check-up 12, treatment 12, other 12.
- Lapsed = last completed visit 12–24 months ago; included in overdue, never added twice.
- Due next 30 days = due date from the audit date through +30 days.
- Average production: hygiene €120, check-up €90, treatment €450, other €150.
- No response, booking or show-up rate is modelled. Production is an estimate, not guaranteed revenue.

These values live in `packages/core/src/types.ts` and are included in every report and PDF.

## Retention and share links

- Share tokens: 32 random bytes, base64url, stored with a prefix. Default TTL 30 days (`AUDIT_LINK_TTL_DAYS`).
- Revocation: `audits.revoked_at`; checked on report, PDF and error downloads.
- Raw lead uploads: 24 hours (`LEAD_RAW_RETENTION_HOURS`) and immediate purge after processing.
- Raw org uploads: 7 days (`ORG_RAW_RETENTION_HOURS`) and immediate purge after commit.
- Lead import rows: 24 hours (`LEAD_ROW_RETENTION_HOURS`).
- Worker schedule: `PURGE_CRON` (default every 15 minutes).

## Tests and acceptance evidence

Executed in this workspace:

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm run test:unit` | 50 unit tests pass (44 core + 6 web) |
| `npm run test:db` | 8 database tests pass (7 cross-org RLS + 1 retention/purge) |
| `npm run build` | pass |
| `npm run test:e2e` | 3 Playwright flows pass (signup -> import -> audit -> share/revoke; public comma/ISO audit + emailed report; public semicolon/DD.MM.YYYY Windows-1252 audit) |
| `npm run benchmark:import` | 5,000 rows: validation 0.70 s, commit + audit + PDF 2.69 s, total **3.39 s** (limit 60 s) |

The E2E suite verifies visible and downloadable validation errors, PDF download, a shared report opened in a fresh browser context, revocation, the public lead flow with the email written by the console adapter, and the European semicolon/DD.MM.YYYY export.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests and build; a Postgres service runs the RLS tests; a second Postgres service runs Playwright.

## Security notes

- RLS is enabled on every tenant table, with `is_org_member` / `is_org_admin` security-definer helpers and cross-tenant tests.
- Public report access is server-side only, by unguessable token; anon has no table grants.
- Service-role keys stay on the server/worker and are never exposed to the browser.
- Error CSV exports protect against spreadsheet formula injection.
- PII is not logged by the pipeline; errors are truncated and never include full rows in logs.
- `.env.local`, `.secrets/`, uploads, storage and generated CSVs are gitignored.

## Locale readiness

The UI and report are English in R1. The data model stores `locale` on organizations and patients, and the import mapping understands German and Dutch column names, dates and number formats. Report templates keep all copy in one place so German/Dutch translations can be added before local-language outreach ships.

## Deployment notes

- **Web**: Vercel. Set `NEXT_PUBLIC_APP_URL`, `AUTH_PROVIDER=supabase`, Supabase URL/keys, `DATABASE_URL` (pooled), `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `STORAGE_DRIVER=supabase`.
- **Worker**: Railway. Same database, Supabase service key, storage and email settings. Health check: `GET /health` on `WORKER_HEALTH_PORT`/`PORT`.
- Apply migrations with `supabase db push` before deploying.
- The email adapter is swappable (`console` locally, Resend hosted) and the storage adapter is swappable (`local`, Supabase Storage).
- Billing, plan enforcement, outreach and PMS integrations remain deferred to R2+.
