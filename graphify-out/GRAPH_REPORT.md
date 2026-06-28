# Graph Report - .  (2026-06-28)

## Corpus Check
- Corpus is ~8,674 words - fits in a single context window. You may not need a graph.

## Summary
- 296 nodes · 423 edges · 18 communities (12 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Task Feature UI|Task Feature UI]]
- [[_COMMUNITY_API Routes|API Routes]]
- [[_COMMUNITY_Auth & Bookmark Clients|Auth & Bookmark Clients]]
- [[_COMMUNITY_Dependencies|Dependencies]]
- [[_COMMUNITY_Docker Setup|Docker Setup]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Package Config|Package Config]]
- [[_COMMUNITY_shadcn Components|shadcn Components]]
- [[_COMMUNITY_DB Scripts|DB Scripts]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Dashboard Layout|Dashboard Layout]]
- [[_COMMUNITY_Seed Script|Seed Script]]
- [[_COMMUNITY_Middleware|Middleware]]
- [[_COMMUNITY_NextAuth Types|NextAuth Types]]
- [[_COMMUNITY_Vercel Config|Vercel Config]]
- [[_COMMUNITY_Next Config|Next Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 18 edges
2. `Home Dashboard` - 17 edges
3. `compilerOptions` - 16 edges
4. `authOptions` - 12 edges
5. `scripts` - 12 edges
6. `Button` - 8 edges
7. `tailwind` - 6 edges
8. `aliases` - 6 edges
9. `Card` - 6 edges
10. `CardHeader` - 6 edges

## Surprising Connections (you probably didn't know these)
- `File icon SVG (16x16 document icon)` --conceptually_related_to--> `Home Dashboard`  [INFERRED]
  public/file.svg → README.md
- `Globe icon SVG (16x16 world/globe icon)` --conceptually_related_to--> `Home Dashboard`  [INFERRED]
  public/globe.svg → README.md
- `Window icon SVG (16x16 app window icon with dots)` --conceptually_related_to--> `Home Dashboard`  [INFERRED]
  public/window.svg → README.md
- `Next.js logo SVG (wordmark 'Next.js')` --conceptually_related_to--> `Next.js 16 (App Router, TypeScript)`  [INFERRED]
  public/next.svg → README.md
- `Vercel logo SVG (triangle mark)` --conceptually_related_to--> `Vercel-ready deployment`  [INFERRED]
  public/vercel.svg → README.md

## Import Cycles
- 1-file cycle: `components/ui/sonner.tsx -> components/ui/sonner.tsx`

## Communities (18 total, 6 thin omitted)

### Community 0 - "Task Feature UI"
Cohesion: 0.06
Nodes (38): Priority, priorityColors, Status, statusConfig, Task, TaskClient(), Avatar, AvatarFallback (+30 more)

### Community 1 - "API Routes"
Cohesion: 0.07
Nodes (12): handler, settingsSchema, LoginForm(), StatCard(), authOptions, globalForPrisma, BookmarkInput, bookmarkSchema (+4 more)

### Community 2 - "Auth & Bookmark Clients"
Cohesion: 0.12
Nodes (18): Bookmark, BookmarkClient(), Note, NoteClient(), SettingsClient(), StatCardProps, Button, ButtonProps (+10 more)

### Community 3 - "Dependencies"
Cohesion: 0.06
Nodes (32): dependencies, @auth/prisma-adapter, bcryptjs, class-variance-authority, clsx, date-fns, dotenv, @hookform/resolvers (+24 more)

### Community 4 - "Docker Setup"
Cohesion: 0.10
Nodes (27): app command: prisma generate + migrate deploy + seed + next dev, app service (home_dashboard_app, Dockerfile.dev), pgAdmin service (home_dashboard_pgadmin), postgres_data volume, postgres:16-alpine service (home_dashboard_db), Bookmarks Manager, Dark/Light Theme, Dashboard with stats (+19 more)

### Community 5 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 6 - "Package Config"
Cohesion: 0.11
Nodes (18): devDependencies, @biomejs/biome, prisma, tailwindcss, tailwindcss-animate, @tailwindcss/postcss, tsx, @types/bcryptjs (+10 more)

### Community 7 - "shadcn Components"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 8 - "DB Scripts"
Cohesion: 0.17
Nodes (12): scripts, build, db:generate, db:migrate:deploy, db:migrate:dev, db:migrate:status, db:push, db:reset (+4 more)

### Community 9 - "Root Layout"
Cohesion: 0.24
Nodes (7): geistMono, geistSans, metadata, Providers(), Toaster(), ToasterProps, sonner

### Community 10 - "Dashboard Layout"
Cohesion: 0.32
Nodes (4): navItems, Sidebar(), ThemeToggle(), UserMenu()

## Knowledge Gaps
- **150 isolated node(s):** `Bookmark`, `Note`, `Task`, `statusConfig`, `priorityColors` (+145 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Dependencies` to `Root Layout`, `Package Config`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Why does `sonner` connect `Root Layout` to `Dependencies`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **Why does `cn()` connect `Task Feature UI` to `Dashboard Layout`, `Auth & Bookmark Clients`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Home Dashboard` (e.g. with `onlyBuiltDependencies: [sharp]` and `File icon SVG (16x16 document icon)`) actually correct?**
  _`Home Dashboard` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Bookmark`, `Note`, `Task` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Task Feature UI` be split into smaller, more focused modules?**
  _Cohesion score 0.058069381598793365 - nodes in this community are weakly interconnected._
- **Should `API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.07399577167019028 - nodes in this community are weakly interconnected._