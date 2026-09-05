# Which Pet Shines?

> **Your pet. Their pet. You decide.**

A weekly social pet photo knockout tournament. Anyone can enter a pet, the
site randomly seeds a bracket, the internet votes pair by pair every 24
hours, a weekly champion is crowned every Saturday, and the pet with the
highest total votes across the whole month becomes that month's **Pet of
the Month** — permanently recorded in the **Hall of Fame**.

This README covers how the app works, how to run it locally, how to test
it, how to deploy it, and exactly which parts are production-real vs. which
are deliberately-simple stand-ins you'll want to upgrade before a real
public launch.

## Contents

- [How the tournament works](#how-the-tournament-works)
- [Architecture](#architecture)
- [Why Drizzle instead of Prisma](#why-drizzle-instead-of-prisma)
- [Why system fonts instead of Google Fonts](#why-system-fonts-instead-of-google-fonts)
- [Running locally](#running-locally)
- [Testing](#testing)
- [Environment variables](#environment-variables)
- [The scheduler / cron](#the-scheduler--cron)
- [Deployment](#deployment)
- [Admin dashboard](#admin-dashboard)
- [What's stubbed vs. production-real](#whats-stubbed-vs-production-real)
- [Legal pages — please read](#legal-pages--please-read)

## How the tournament works

Every week runs on a fixed cycle, anchored to the Round-of-64 Sunday:

| Day | Phase |
|---|---|
| Mon–Sat | Submissions open for **next** week's tournament |
| Sun | Round of 64 |
| Mon | Round of 32 |
| Tue | Round of 16 |
| Wed | Quarter-finals |
| Thu | Semi-finals |
| Fri | Final |
| Sat | Weekly champion announced; next week's submissions continue |

Each round lasts 24 hours. Submissions for next week's tournament run
concurrently with the current week's Sun–Fri rounds — there's always one
tournament collecting entries and one (a week ahead of it) playing rounds.

**Bracket size** is the largest power of two that fits the number of
*approved* entries when submissions close (64 / 32 / 16 / 8 / 4 / 2 — fewer
than 2 approved entries cancels the tournament for that week). If more pets
entered than the bracket allows, the required number are chosen at random.
Matchups within each round are randomly paired.

**Voting**: one vote per matchup per voter (tracked by an anonymous cookie
— see [What's stubbed](#whats-stubbed-vs-production-real)), can vote for
your own pet, results shown immediately as live percentages + counts.
Emoji reactions (❤️ 🥰 😂 😍 🔥) are separate from voting and never affect
the outcome.

**Ties**: a matchup that's still tied when its window ends gets a one-hour
sudden-death re-vote. Still tied after that → a recorded random tie-break.

**Pet of the Month** is *not* the weekly champion — it's whichever pet
accumulated the highest total votes across all its matchups in a calendar
month, win or lose. Calculated on the 1st of the following month and filed
permanently into the Hall of Fame.

All of this logic — bracket sizing, pairing, scheduling, tie detection,
sudden death, Pet-of-the-Month tallying — is pure and unit-tested; the
orchestration that reads/writes the database is integration-tested against
real Postgres. See [Testing](#testing).

## Architecture

- **Next.js 16** (App Router, TypeScript, Turbopack) + **Tailwind CSS v4**
- **PostgreSQL** via **Drizzle ORM** (`drizzle-orm` + `pg`) — schema in
  `src/db/schema.ts`, migrations in `/drizzle`, generated with `drizzle-kit`
- Pure business logic lives in `src/lib/*` (`bracket.ts`, `scoring.ts`,
  `schedule.ts`, `petOfMonth.ts`) with zero DB dependency, so it's cheap to
  unit test exhaustively
- The stateful orchestration (`src/lib/engine.ts`) reads/writes the DB and
  is what a scheduled job calls once per tick — every step is idempotent,
  so calling it too often, or twice at once, is harmless
- **Email** and **photo storage** are both behind small provider
  interfaces (`src/lib/email`, `src/lib/storage`) with a `console`/`local`
  dev implementation and a `resend`/`vercel-blob` production implementation,
  chosen via env vars — swap providers without touching call sites
- Admin auth is a hand-rolled HMAC-signed session cookie (bcrypt password
  hash, `src/lib/auth`) — no external auth vendor needed for a single admin
  user; the `/admin/*` routes get a coarse redirect-if-no-cookie check in
  `src/proxy.ts` (Next's routing layer) and a real signature+expiry check
  in every admin page/route itself (defense in depth)

## Why Drizzle instead of Prisma

The spec suggested PostgreSQL with no ORM mandate. Prisma was tried first,
but its `generate` step needs to download a native query-engine binary from
`binaries.prisma.sh`, and that host wasn't reachable in the sandbox this was
built in. Rather than get stuck on a network workaround, this project uses
**Drizzle ORM**, which is pure TypeScript/JS with no native binaries to
fetch — a clean, modern, fully-Postgres-native alternative that fit the
brief ("choose a sensible modern option... don't get stuck debating
alternatives"). It has no bearing on hosting choice: any Postgres provider
(Neon, Supabase, Railway, RDS, etc.) works identically.

## Why system fonts instead of Google Fonts

Same root cause: `fonts.googleapis.com`/`fonts.gstatic.com` weren't
reachable in the build sandbox. Rather than ship a build that silently
degrades without network access, the design uses system font stacks
(`ui-rounded` for display/headings, the standard `-apple-system` stack for
body text — see `globals.css`) which render crisply on every platform with
zero external requests. If you'd like a specific brand typeface later,
swapping in `next/font/google` (or a self-hosted font file) is a small,
isolated change in `src/app/layout.tsx` and `globals.css`.

## Running locally

Prerequisites: Node 22+, a local PostgreSQL 16+ instance.

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Create two databases (dev + test)
createdb which_pet_shines
createdb which_pet_shines_test

# 3. Copy the env template and fill in DATABASE_URL / secrets
cp .env.example .env
# generate real secrets:
openssl rand -hex 32   # → SESSION_SECRET
openssl rand -hex 32   # → CRON_SECRET

# 4. Apply the schema
npm run db:migrate

# 5. (optional but recommended) seed realistic demo data — a completed
#    "last week" tournament with a champion, a live "this week" tournament
#    at whatever round the real calendar says right now, a Pet of the Month,
#    and a few pending/rejected submissions for the admin dashboard
npm run db:seed

# 6. Run it
npm run dev
```

Open http://localhost:3000. Admin dashboard is at `/admin` (credentials
from `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env`, seeded by step 5).

`npm run db:studio` opens Drizzle Studio if you want to browse the data
directly.

## Testing

```bash
npm test                 # unit tests (vitest, jsdom) — bracket sizing,
                          # random bracket generation, scoring/percentages,
                          # tie detection, schedule math, Pet-of-the-Month
                          # selection, slug generation, session tokens

npm run test:integration  # integration tests against a REAL Postgres
                          # (uses .env.test / which_pet_shines_test) —
                          # full tournament progression through sudden
                          # death and a crowned champion, one-entry-per-
                          # person-per-week enforcement, Pet-of-the-Month
                          # computation and idempotency

npm run test:e2e          # Playwright end-to-end journeys: homepage,
                          # navigation, enter-a-pet (+ duplicate rejection),
                          # bracket/hall-of-fame/pet-of-month pages, voting,
                          # admin-route security
```

`.env.test` should point `DATABASE_URL` at `which_pet_shines_test` — never
run integration tests against your dev or production database.

CI (`.github/workflows/ci.yml`) runs all of the above (lint, typecheck,
unit, integration against a real `postgres:16` service container, and a
production build) on every push/PR to `main`.

## Environment variables

See `.env.example` for the full list with inline comments. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `SESSION_SECRET` | yes | Signs the admin session cookie |
| `CRON_SECRET` | yes | Bearer token required by `/api/cron/*` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | yes (for seeding) | Seeded admin login |
| `NEXT_PUBLIC_SITE_URL` | yes | Used for absolute URLs (OG tags, emails, share links) |
| `EMAIL_PROVIDER` | no (default `console`) | `console` or `resend` |
| `RESEND_API_KEY` / `EMAIL_FROM` | if using `resend` | Real verification emails |
| `STORAGE_PROVIDER` | no (default `local`) | `local` or `vercel-blob` |
| `BLOB_READ_WRITE_TOKEN` | if using `vercel-blob` | Real durable photo storage |

## The scheduler / cron

The whole weekly lifecycle — opening next week's submissions, closing them
and generating the bracket, activating and resolving matchups (including
sudden death), advancing rounds, crowning the champion — happens inside
`runSchedulerTick()` (`src/lib/engine.ts`), which needs to run **every few
minutes**. `computeAndApplyPetOfMonth()` needs to run **once a month**.
Both are idempotent — running them extra times, or two overlapping runs, is
harmless.

Three ready-made ways to drive it, pick whichever fits your host:

1. **Vercel Cron** (`vercel.json`) — simplest if you deploy to Vercel.
   ⚠️ Vercel's Hobby plan only allows daily-frequency cron jobs; the
   every-10-minutes schedule in `vercel.json` needs a Pro plan (or higher).
   On Hobby, either upgrade or use option 2 below instead.
2. **GitHub Actions** (`.github/workflows/cron.yml`) — works with any host,
   calls `/api/cron/tick` and `/api/cron/pet-of-month` over HTTPS. Needs two
   repo secrets: `SITE_URL` (your deployed URL) and `CRON_SECRET` (matching
   the deployment's env var).
3. **Self-hosted** (`npm run cron:tick`, `src/scripts/cronTick.ts`) — if
   you're running on a VPS with your own OS-level scheduler (cron/systemd
   timer), this calls the engine directly against the database with no HTTP
   hop needed.

Don't run more than one of these against the same deployment — harmless,
but redundant.

## Deployment

Recommended: **Vercel** (first-class Next.js support) + a hosted Postgres
(**Neon**, **Supabase**, or **Railway** all work fine — Drizzle only needs a
standard connection string) + **Vercel Blob** for photo storage + **Resend**
for verification emails + one of the three cron options above.

1. Push this repo to GitHub and import it into Vercel.
2. Provision a Postgres database and set `DATABASE_URL`.
3. Run `npm run db:migrate` against that database (locally, pointed at the
   production `DATABASE_URL`, or via a one-off CI step).
4. Set `SESSION_SECRET` / `CRON_SECRET` (fresh `openssl rand -hex 32`
   values, not the dev ones), `ADMIN_EMAIL`/`ADMIN_PASSWORD`, and
   `NEXT_PUBLIC_SITE_URL` (your real domain).
5. Set `STORAGE_PROVIDER=vercel-blob` and `BLOB_READ_WRITE_TOKEN` (create a
   Blob store in the Vercel dashboard).
6. Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM` (a
   verified sending domain in Resend).
7. Run `npm run db:seed` once against production if you want starter demo
   data, or skip it and let real submissions populate the first
   tournament — either is fine, it's idempotent-safe either way.
8. Wire up cron (pick one of the three options above).

None of steps 2, 5, 6, or a custom domain purchase can be done on your
behalf here — they need your own accounts/payment. Everything else in the
codebase is ready to go once those are in place.

## Admin dashboard

`/admin` — review pending submissions (approve/reject), see tournament
status, bracket, matchups, vote totals, and Hall of Fame entries. Protected
by a signed session cookie (bcrypt-hashed password, HMAC-signed token with
expiry, verified server-side on every request) — there is no public write
access to any admin action. Change `ADMIN_PASSWORD` immediately after first
login in any real deployment; this MVP supports a single admin account
(multi-admin / roles would be a follow-up).

## What's stubbed vs. production-real

Real and production-appropriate as shipped:

- Tournament engine, bracket generation, voting, ties/sudden-death, Pet of
  the Month, Hall of Fame, permanent pet pages, sharing, SEO metadata — all
  backed by real Postgres, fully tested (unit + integration + e2e)
- Admin auth (bcrypt + signed sessions) and route protection
- Duplicate-vote prevention (anonymous voter cookie) and one-entry-per-
  person-per-week enforcement (DB unique constraint)

Deliberately simple for the MVP, called out explicitly per the brief:

- **Voter identity** is a browser cookie, not an account — good enough to
  stop casual duplicate votes, not resistant to someone clearing cookies or
  using another browser. The spec explicitly asked for "basic duplicate
  vote prevention only," so this is intentional; full accounts are a
  natural v2.
- **Email verification instead of full accounts** for pet submissions, per
  spec — anyone with access to an inbox can submit; there's no password or
  login for entrants in this MVP.
- **Local disk storage** (`STORAGE_PROVIDER=local`) is the default and is
  fine for local dev, but is **not durable** on most serverless hosts
  (files vanish on redeploy) and doesn't work across multiple server
  instances — switch to `vercel-blob` (or adapt `src/lib/storage` for S3/R2)
  before a real public launch.
- **Console email** (`EMAIL_PROVIDER=console`) just logs the verification
  link to the server console — fine for local dev, switch to `resend`
  before real users need to receive real emails.
- **Single admin account**, no roles/permissions beyond "logged in or not."
- Submission moderation is manual (an admin approves/rejects each entry)
  with no automated content-safety scanning — appropriate for a launch at
  modest scale, worth revisiting if volume grows.
- **Comments/chat were explicitly deferred** (per spec) pending a
  moderation system — not present at all in this MVP.

## Legal pages — please read

`/rules`, `/terms`, `/privacy`, and `/cookies` are written with sensible,
conventional structure for a UGC photo-voting site (ownership/license
grants, moderation rights, cookie usage, etc.), but **they are not legal
advice and have not been reviewed by a lawyer.** Per the original brief,
no legal claims were invented — the structure is standard and the language
is deliberately plain, but you should have real counsel review all four
pages (especially the photo-ownership/license terms and any
region-specific privacy obligations — GDPR/CCPA/COPPA-adjacent concerns
depending on where you launch) before relying on them in production.
