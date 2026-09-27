# Home Dashboard

Personal home/admin dashboard with QoL features.

## Features

- Bookmarks manager
- Notes with tags + pinning
- Task board (kanban)
- Dashboard with stats
- AI chat assistant (asks questions about your own data)
- Subscriptions, limits, taxes, accounting (accounts, net worth, and savings goals)
- Daily Telegram digest (renewals due, limits exceeded, overdue tasks)
- Dark theme
- Settings with password change

## JSON export/import is partial (version 1)

**Do not treat Settings → Export partial JSON or `GET /api/export` as a complete backup.** The JSON file includes only bookmarks, notes, tasks, subscriptions, tax configurations, tax records, income and expenses. It omits limits/budgets, financial accounts, savings goals, recurring transactions, calendar events (including series overrides), user settings, the tag catalog and net-worth snapshots. It also does not include account credentials/sessions or global exchange-rate snapshots. The JSON bundle and successful import response expose this scope in `scope` metadata; older version-1 files without that metadata remain importable.

`Import (merge)` adds valid rows to the covered datasets; invalid rows are skipped. `Import (replace covered data)` **deletes only the eight covered datasets**, then imports them; omitted datasets are left untouched, not restored from the file. For safety, replace refuses a file missing any covered dataset array or containing invalid rows (before deleting anything). Imports recreate IDs and created/updated timestamps; subscription `lastPostedAt` is not restored, so auto-posting may repeat, and tax record dates are normalized to the first of the month. Merge reuses same-named tax configs rather than overwriting them. Keep a separate database backup for a full-fidelity restore.

## Tech

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4 + shadcn/ui
- Prisma 7 + PostgreSQL (driver adapter `@prisma/adapter-pg`)
- NextAuth (credentials)
- Docker + docker-compose
- Vercel-ready

## Local Dev (Docker)

```bash
cp .env.example .env
# Edit .env: set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL,
# ADMIN_PASSWORD (at least 12 characters) and a separate PGADMIN_PASSWORD.
# ADMIN_EMAIL is optional and defaults to admin@localhost.dev.
docker compose up -d
```

App: http://localhost:3000
pgAdmin: http://localhost:5050
These development ports listen only on localhost.

Login: the `ADMIN_EMAIL` from `.env` (default `admin@localhost.dev`) and the **password you set in `ADMIN_PASSWORD`**. Seeding again does not reset a changed password. If an older deployment was seeded with the former built-in password, rotate it immediately in **Settings** or with `scripts/reset-admin.mts`.

## Local Dev (no Docker)

Start PostgreSQL separately, then:

```bash
cp .env.example .env
# Set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL and ADMIN_PASSWORD in .env.
# ADMIN_EMAIL is optional; PGADMIN_PASSWORD is only needed by Docker Compose.
pnpm install
pnpm db:migrate:dev
pnpm db:seed
pnpm dev
```

## Deploy to Vercel (step by step)

A complete, copy-paste guide. Follow it top to bottom — no prior Vercel knowledge needed.

### What you need first

- A **GitHub** account with this project pushed to a repository.
- A **Vercel** account — sign up at https://vercel.com with your GitHub. The free *Hobby* plan is enough.
- A **PostgreSQL database** reachable from the internet (created in Step 1).

### Step 1 — Create a PostgreSQL database

The app stores everything in Postgres and connects with the `pg` driver, so you need a **normal Postgres connection string** that starts with `postgresql://` — **not** a pooled `prisma://` URL.

Easiest path (inside Vercel):

1. Vercel dashboard → **Storage** → **Create Database** → choose **Postgres** (Neon or Prisma Postgres).
2. Follow the prompts. When it's done, open the database and find the **Connect** / **`.env.local`** tab.
3. Copy the **direct** connection string. It looks like:

   ```
   postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
   ```

   You will paste this as `DATABASE_URL` in Step 3. Keep it private.

Any other provider works too (Neon, Supabase, Railway, or your own server) — just grab its `postgresql://...` connection string. Cloud databases usually require `?sslmode=require` at the end.

### Step 2 — Import the project into Vercel

1. You already forked project to your github, so connect your github to Vercel
2. Vercel dashboard → **Add New… → Project**.
3. Select your GitHub repo → **Import Git Repository**.
3. The Framework Preset is auto-detected as **Next.js** — leave it.
4. **Do not change** the Build or Install commands. They are already defined in `vercel.json`: install with `pnpm install`, then the build runs `prisma generate` → `prisma migrate deploy` → `next build`.
5. **Don't click Deploy yet** — add the environment variables first (Step 3).

### Step 3 — Set environment variables

On the import screen (or later under **Project → Settings → Environment Variables**), add the variables from the [Environment Variables](#environment-variables) table below. At minimum set the three **Required** ones. Apply them to the **Production** environment (also add **Preview** if you want preview deployments to work).

> For `NEXTAUTH_URL` you don't know the final URL yet. Put a placeholder such as `https://example.vercel.app` for now and fix it in Step 5.

### Step 4 — Deploy

Click **Deploy**. The build runs database migrations automatically (`prisma migrate deploy`), so all tables are created on the first deploy. Wait until it turns green.

> If the build fails on the migrate step, your `DATABASE_URL` is wrong or the database isn't reachable. Fix the value and redeploy.

### Step 5 — Point `NEXTAUTH_URL` at the real domain

1. After the first deploy, Vercel shows your URL, e.g. `https://home-dashboard-xyz.vercel.app`.
2. **Settings → Environment Variables** → edit **`NEXTAUTH_URL`** → set it to that exact URL (no trailing slash).
3. **Redeploy** (Deployments → ⋯ → **Redeploy**) so the new value takes effect.

Login will not work correctly until `NEXTAUTH_URL` matches your real domain.

### Step 6 — Create your login (seed the database)

The deploy creates empty tables but **no user**. Create the first admin from your own computer, pointed at the **production** database. Put a unique `ADMIN_EMAIL` and a long, random `ADMIN_PASSWORD` (at least 12 characters) in your local, Git-ignored `.env` file first; do not put the password in a shell command or commit it. The password is never printed and re-running the seed does not reset it.

bash / macOS / Linux:

```bash
DATABASE_URL="<your production DATABASE_URL>" pnpm db:seed
```

Windows PowerShell:

```powershell
$env:DATABASE_URL="<your production DATABASE_URL>"; pnpm db:seed
```

This creates the selected admin login plus sample data. For an existing account, change the password in **Settings**, or explicitly reset it using `ADMIN_EMAIL` and `ADMIN_PASSWORD` with `pnpm tsx scripts/reset-admin.mts` (also requires `DATABASE_URL`).

### Step 7 — Scheduled jobs (cron)

`vercel.json` defines four cron jobs. They run automatically on Vercel **only if** you set `CRON_SECRET` — Vercel attaches it as the `Authorization: Bearer` header when it calls the cron URLs. Without `CRON_SECRET` these endpoints return `503` and nothing runs.

| Schedule (UTC) | Endpoint | What it does |
|---|---|---|
| `0 5 * * *` — daily 05:00 | `/api/cron/capture-rates` | Snapshot the day's exchange rates so historical figures convert at the rate that was true then. |
| `0 6 * * *` — daily 06:00 | `/api/cron/post-renewals` | Auto-post due subscription renewals **and** recurring transactions, then record a daily net-worth snapshot. |
| `0 7 * * *` — daily 07:00 | `/api/cron/notify` | Send the daily Telegram digest (upcoming renewals, limits near/over cap, overdue tasks). Needs `TELEGRAM_BOT_TOKEN`. |
| `0 9 1 * *` — monthly, 1st 09:00 | `/api/cron/monthly-insight` | Send a monthly spending insight over Telegram — an AI narrative when `OPENROUTER_API_KEY` is set, otherwise a templated summary. |

> **Vercel Hobby limits how many cron jobs a project can run.** If a deploy is rejected for too many crons, either upgrade the plan or fold `capture-rates` into `post-renewals` (both run daily) to reduce the count.

Done. Open your Vercel URL and log in.

## Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables**. For local dev they live in `.env` (copy from `.env.example`).

Legend: ✅ Required · ⚠️ Required for that feature only · ⬜ Optional

| Variable | Required? | What it does | If missing | How to get it / value |
|---|---|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection. Used by build-time migrations **and** at runtime via the `pg` adapter. | Build fails at `prisma migrate deploy`; app can't start. | Direct Postgres URL `postgresql://user:pass@host:5432/db?sslmode=require`. From Vercel Storage / Neon / Supabase (Step 1). |
| `DATABASE_POOL_MAX` | ⬜ | Max connections in the `pg` pool. The small default suits Prisma Postgres's low direct-connection limit and keeps a query burst (e.g. the dashboard) from exhausting the upstream. | Defaults to `3`. | Integer. Raise on a bigger DB — e.g. `10` to match `pg`'s old default, or higher (bounded by your DB's own connection limit). No true "unlimited". |
| `NEXTAUTH_SECRET` | ✅ | Signs the NextAuth session (JWT) cookies. | NextAuth refuses to run in production; login is broken. | Generate one (see command below). |
| `NEXTAUTH_URL` | ✅ | Canonical site URL for auth callbacks/redirects. | Login redirects break. | Your deployment URL, e.g. `https://your-app.vercel.app` (no trailing slash). |
| `ADMIN_EMAIL` | ⚠️ seeding | Email for the admin created by `pnpm db:seed` (or targeted by the reset script). | Defaults to `admin@localhost.dev`; set your own for production. | Your private admin email; supply alongside `ADMIN_PASSWORD` when seeding. |
| `ADMIN_PASSWORD` | ⚠️ seeding / Docker Compose | Password for a *new* seed admin, at least 12 characters; reseeding does not reset existing accounts. | Seed and the local Docker stack refuse to start. | Generate a long random password and keep it private. |
| `PGADMIN_PASSWORD` | ⚠️ local Docker Compose | Local pgAdmin login password (separate from the dashboard admin password). | Docker Compose refuses to start. | Generate another long random password. |
| `CRON_SECRET` | ⚠️ crons | Guards `/api/cron/*`. Vercel Cron sends it as a Bearer token. | All four cron endpoints return `503`; scheduled jobs never run. | Generate one (see command below). |
| `TELEGRAM_BOT_TOKEN` | ⬜ | Sends the daily Telegram digest, the monthly spending insight, and the "Send test" button in Settings. | Those return `503`; rest of app is fine. | Create a bot via [@BotFather](https://t.me/BotFather). Each user links their chat id in Settings → Notifications. |
| `OPENROUTER_API_KEY` | ⬜ | Powers the AI chat assistant and the monthly spending insight's narrative (via OpenRouter). | AI chat errors; the monthly insight falls back to a templated summary; rest of app is fine. | https://openrouter.ai/keys |
| `CHAT_MODEL` | ⬜ | Model id for the AI chat. **Must support tool/function calling.** | Defaults to `deepseek/deepseek-chat`. | Any tool-calling model id from OpenRouter. |
| `REASONING_EFFORT` | ⬜ | Chain-of-thought depth for reasoning models. | Defaults to `minimal`. | One of `xhigh\|high\|medium\|low\|minimal\|none`. |

**Rate limiting:** the proxy uses in-memory counters per app instance; they reset on restart and do not coordinate across replicas. Vercel uses its platform client-IP header. Self-hosted installs without an explicitly trusted proxy use a shared bucket per limit tier and ignore client-supplied forwarding headers. Set `RATE_LIMIT_TRUSTED_PROXY=1` **only** when your own reverse proxy overwrites `X-Dashboard-Client-IP` with a validated client IP and direct access to the app port is blocked; otherwise callers can bypass the per-IP limit by changing that header. The local Compose stack does not enable this opt-in.


Generate the secrets (works on any OS that has Node):

```bash
# NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Add New Feature

1. Add model to `prisma/schema.prisma` -> `pnpm db:migrate:dev --name <feature>`
2. Create `lib/validations/<feature>.ts` (zod schema)
3. Create `app/api/<feature>/route.ts` (GET, POST)
4. Create `app/api/<feature>/[id]/route.ts` (PUT/PATCH, DELETE)
5. Create `app/(dashboard)/<feature>/page.tsx` + client component
6. Add nav item in `components/shared/sidebar.tsx`
7. Add stat card in `app/(dashboard)/page.tsx`

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate:dev` | Create migration |
| `pnpm db:migrate:deploy` | Apply migrations |
| `pnpm db:seed` | Seed DB (requires `ADMIN_PASSWORD`; existing admin passwords are not reset) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:reset` | Reset DB |
