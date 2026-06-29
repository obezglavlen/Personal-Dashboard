# Graph Report - .  (2026-06-30)

## Corpus Check
- 107 files · ~33,011 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 627 nodes · 1175 edges · 40 communities (28 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Dashboard Widgets & Client UI|Dashboard Widgets & Client UI]]
- [[_COMMUNITY_App Shell & API Core|App Shell & API Core]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Package Scripts & Dev Deps|Package Scripts & Dev Deps]]
- [[_COMMUNITY_Data ExportImport & Validation|Data Export/Import & Validation]]
- [[_COMMUNITY_Docs, Docker & Assets|Docs, Docker & Assets]]
- [[_COMMUNITY_Resource API Routes|Resource API Routes]]
- [[_COMMUNITY_Taxes & Hasher UI|Taxes & Hasher UI]]
- [[_COMMUNITY_Serializers & Money Validation|Serializers & Money Validation]]
- [[_COMMUNITY_BookmarksNotes & Dialog|Bookmarks/Notes & Dialog]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Settings & API Client|Settings & API Client]]
- [[_COMMUNITY_shadcn Config|shadcn Config]]
- [[_COMMUNITY_Subscription Renewals & Cron|Subscription Renewals & Cron]]
- [[_COMMUNITY_Tasks Kanban|Tasks Kanban]]
- [[_COMMUNITY_Dashboard Grid & Widget Registry|Dashboard Grid & Widget Registry]]
- [[_COMMUNITY_Net Worth & Currencies|Net Worth & Currencies]]
- [[_COMMUNITY_Taxes Layout & Select|Taxes Layout & Select]]
- [[_COMMUNITY_Dev Tools Hub|Dev Tools Hub]]
- [[_COMMUNITY_Accounts API|Accounts API]]
- [[_COMMUNITY_Bookmarks API|Bookmarks API]]
- [[_COMMUNITY_Budgets API|Budgets API]]
- [[_COMMUNITY_Goals API|Goals API]]
- [[_COMMUNITY_Tasks API|Tasks API]]
- [[_COMMUNITY_Tax Configs API|Tax Configs API]]
- [[_COMMUNITY_Tax Records API|Tax Records API]]
- [[_COMMUNITY_Providers & Toaster|Providers & Toaster]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Prisma Seed|Prisma Seed]]
- [[_COMMUNITY_Vercel Config|Vercel Config]]
- [[_COMMUNITY_Prisma Client|Prisma Client]]
- [[_COMMUNITY_Bookmark Schema|Bookmark Schema]]
- [[_COMMUNITY_Note Schema|Note Schema]]
- [[_COMMUNITY_Task Schema|Task Schema]]
- [[_COMMUNITY_Proxy Config|Proxy Config]]
- [[_COMMUNITY_NextAuth Types|NextAuth Types]]
- [[_COMMUNITY_Next Config|Next Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]

## God Nodes (most connected - your core abstractions)
1. `useResource()` - 32 edges
2. `route()` - 25 edges
3. `useCurrency()` - 25 edges
4. `useRates()` - 19 edges
5. `Home Dashboard` - 17 edges
6. `formatMoney()` - 17 edges
7. `compilerOptions` - 16 edges
8. `Input` - 16 edges
9. `scripts` - 12 edges
10. `convertToBase()` - 11 edges

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

## Communities (40 total, 12 thin omitted)

### Community 0 - "Dashboard Widgets & Client UI"
Cohesion: 0.05
Nodes (55): BudgetWidget(), BudgetClient(), Mode, Budget, CreateBudgetDialog(), DueTasksWidget(), Task, CreateExpenseDialog() (+47 more)

### Community 1 - "App Shell & API Core"
Cohesion: 0.06
Nodes (25): handler, RateRow, settingsSchema, AppShell(), AppShellProps, Bookmark, CommandPalette(), Expense (+17 more)

### Community 2 - "UI Primitives"
Cohesion: 0.06
Nodes (29): Avatar, AvatarFallback, AvatarImage, Button, ButtonProps, buttonVariants, Card, CardContent (+21 more)

### Community 3 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (40): dependencies, @auth/prisma-adapter, bcryptjs, class-variance-authority, clsx, date-fns, @dnd-kit/core, @dnd-kit/sortable (+32 more)

### Community 4 - "Package Scripts & Dev Deps"
Cohesion: 0.06
Nodes (30): devDependencies, @biomejs/biome, prisma, tailwindcss, tailwindcss-animate, @tailwindcss/postcss, tsx, @types/bcryptjs (+22 more)

### Community 5 - "Data Export/Import & Validation"
Cohesion: 0.10
Nodes (18): collect(), GET, handler(), handler(), Json, POST, Tx, requireUserId() (+10 more)

### Community 6 - "Docs, Docker & Assets"
Cohesion: 0.10
Nodes (27): app command: prisma generate + migrate deploy + seed + next dev, app service (home_dashboard_app, Dockerfile.dev), pgAdmin service (home_dashboard_pgadmin), postgres_data volume, postgres:16-alpine service (home_dashboard_db), Bookmarks Manager, Dark/Light Theme, Dashboard with stats (+19 more)

### Community 7 - "Resource API Routes"
Cohesion: 0.11
Nodes (18): DELETE, PATCH, GET, POST, DELETE, PUT, GET, POST (+10 more)

### Community 8 - "Taxes & Hasher UI"
Cohesion: 0.13
Nodes (12): HashClient(), Config, CreateTaxRecordDialog(), Mode, RecordType, TaxRecord, Mode, PAGE_SIZES (+4 more)

### Community 9 - "Serializers & Money Validation"
Cohesion: 0.16
Nodes (19): iso(), num(), numOrNull(), Row, serializeAccount(), serializeBudget(), serializeExpense(), serializeGoal() (+11 more)

### Community 10 - "Bookmarks/Notes & Dialog"
Cohesion: 0.19
Nodes (12): Bookmark, BookmarkClient(), Mode, Mode, Note, NoteClient(), DialogContent, DialogDescription (+4 more)

### Community 11 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 12 - "Settings & API Client"
Cohesion: 0.21
Nodes (11): SettingsClient(), SettingsData, ApiClientError, apiDelete(), apiGet(), apiPatch(), apiPost(), apiPut() (+3 more)

### Community 13 - "shadcn Config"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 14 - "Subscription Renewals & Cron"
Cohesion: 0.21
Nodes (13): GET, handler(), POST, postDueRenewals(), addMonthsUTC(), daysUntil(), nextRenewal(), Period (+5 more)

### Community 15 - "Tasks Kanban"
Cohesion: 0.13
Nodes (9): COLUMNS, EMPTY_FORM, Priority, priorityColors, Status, statusConfig, Task, TaskClient() (+1 more)

### Community 16 - "Dashboard Grid & Widget Registry"
Cohesion: 0.18
Nodes (10): DashboardGrid(), DashboardGridProps, TITLES, DashboardPage(), DashboardLayout, DEFAULT_ORDER, resolveLayout(), WIDGET_IDS (+2 more)

### Community 17 - "Net Worth & Currencies"
Cohesion: 0.23
Nodes (8): Account, Goal, UserMenu(), CURRENCIES, CurrencyCode, currencyLabel(), currencySymbol(), SYMBOLS

### Community 18 - "Taxes Layout & Select"
Cohesion: 0.21
Nodes (9): TaxConfig, TaxSidebar(), SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator (+1 more)

### Community 20 - "Accounts API"
Cohesion: 0.29
Nodes (5): DELETE, PATCH, GET, POST, accountHandlers

### Community 21 - "Bookmarks API"
Cohesion: 0.29
Nodes (5): DELETE, PUT, GET, POST, bookmarkHandlers

### Community 22 - "Budgets API"
Cohesion: 0.29
Nodes (5): DELETE, PATCH, GET, POST, budgetHandlers

### Community 23 - "Goals API"
Cohesion: 0.29
Nodes (5): DELETE, PATCH, GET, POST, goalHandlers

### Community 24 - "Tasks API"
Cohesion: 0.29
Nodes (5): DELETE, PATCH, GET, POST, taskHandlers

### Community 25 - "Tax Configs API"
Cohesion: 0.29
Nodes (5): DELETE, PATCH, GET, POST, taxConfigHandlers

### Community 26 - "Tax Records API"
Cohesion: 0.29
Nodes (5): DELETE, PATCH, GET, POST, taxRecordHandlers

### Community 30 - "Vercel Config"
Cohesion: 0.50
Nodes (3): buildCommand, crons, installCommand

## Knowledge Gaps
- **284 isolated node(s):** `handler`, `$schema`, `style`, `rsc`, `tsx` (+279 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `Package Scripts & Dev Deps`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Why does `sonner` connect `Runtime Dependencies` to `Providers & Toaster`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Why does `Input` connect `Taxes & Hasher UI` to `Dashboard Widgets & Client UI`, `UI Primitives`, `Bookmarks/Notes & Dialog`, `Settings & API Client`, `Tasks Kanban`, `Net Worth & Currencies`, `Taxes Layout & Select`, `Dev Tools Hub`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **What connects `handler`, `$schema`, `style` to the rest of the system?**
  _285 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard Widgets & Client UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05274725274725275 - nodes in this community are weakly interconnected._
- **Should `App Shell & API Core` be split into smaller, more focused modules?**
  _Cohesion score 0.06161616161616162 - nodes in this community are weakly interconnected._
- **Should `UI Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.0627177700348432 - nodes in this community are weakly interconnected._