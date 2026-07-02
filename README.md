# Home Dashboard

Personal home/admin dashboard with QoL features.

## Features

- Bookmarks manager
- Notes with tags + pinning
- Task board (kanban)
- Dashboard with stats
- AI chat assistant (asks questions about your own data)
- Subscriptions, budgets, taxes, net worth
- Daily Telegram digest (renewals due, over-budget, overdue tasks)
- Dark/light theme
- Settings with password change

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
# Edit .env: set at least DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
docker compose up -d
```

App: http://localhost:3000
pgAdmin: http://localhost:5050

Default login: `admin@localhost.dev` / `admin123`

## Local Dev (no Docker)

Start PostgreSQL separately, then:

```bash
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

The deploy creates empty tables but **no user**. Create the first admin from your own computer, pointed at the **production** database.

bash / macOS / Linux:

```bash
DATABASE_URL="<your production DATABASE_URL>" pnpm db:seed
```

Windows PowerShell:

```powershell
$env:DATABASE_URL="<your production DATABASE_URL>"; pnpm db:seed
```

This creates the login **`admin@localhost.dev`** / **`admin123`** plus a little sample data. Log in, then change the password in **Settings**.

Want a custom password instead of `admin123`? Seed first (above), then run:

```powershell
$env:DATABASE_URL="<prod url>"; $env:ADMIN_PASSWORD="your-strong-password"; pnpm tsx scripts/reset-admin.mts
```

### Step 8 — Scheduled jobs (cron)

`vercel.json` defines four cron jobs. They run automatically on Vercel **only if** you set `CRON_SECRET` — Vercel attaches it as the `Authorization: Bearer` header when it calls the cron URLs. Without `CRON_SECRET` these endpoints return `503` and nothing runs.

| Schedule (UTC) | Endpoint | What it does |
|---|---|---|
| `0 5 * * *` — daily 05:00 | `/api/cron/capture-rates` | Snapshot the day's exchange rates so historical figures convert at the rate that was true then. |
| `0 6 * * *` — daily 06:00 | `/api/cron/post-renewals` | Auto-post due subscription renewals **and** recurring transactions, then record a daily net-worth snapshot. |
| `0 7 * * *` — daily 07:00 | `/api/cron/notify` | Send the daily Telegram digest (upcoming renewals, budgets near/over cap, overdue tasks). Needs `TELEGRAM_BOT_TOKEN`. |
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
| `CRON_SECRET` | ⚠️ crons | Guards `/api/cron/*`. Vercel Cron sends it as a Bearer token. | All four cron endpoints return `503`; scheduled jobs never run. | Generate one (see command below). |
| `TELEGRAM_BOT_TOKEN` | ⬜ | Sends the daily Telegram digest, the monthly spending insight, and the "Send test" button in Settings. | Those return `503`; rest of app is fine. | Create a bot via [@BotFather](https://t.me/BotFather). Each user links their chat id in Settings → Notifications. |
| `OPENROUTER_API_KEY` | ⬜ | Powers the AI chat assistant and the monthly spending insight's narrative (via OpenRouter). | AI chat errors; the monthly insight falls back to a templated summary; rest of app is fine. | https://openrouter.ai/keys |
| `CHAT_MODEL` | ⬜ | Model id for the AI chat. **Must support tool/function calling.** | Defaults to `deepseek/deepseek-chat`. | Any tool-calling model id from OpenRouter. |
| `REASONING_EFFORT` | ⬜ | Chain-of-thought depth for reasoning models. | Defaults to `minimal`. | One of `xhigh\|high\|medium\|low\|minimal\|none`. |

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
| `pnpm db:seed` | Seed DB (creates `admin@localhost.dev` / `admin123`) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:reset` | Reset DB |
