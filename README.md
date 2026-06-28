# Home Dashboard

Personal home/admin dashboard with QoL features.

## Features

- Bookmarks manager
- Notes with tags + pinning
- Task board (kanban)
- Dashboard with stats
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
# Edit .env: set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
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

## Deploy to Vercel

1. Push repo to GitHub
2. Import at vercel.com
3. Add env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
4. Deploy

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
| `pnpm db:seed` | Seed DB |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:reset` | Reset DB |
