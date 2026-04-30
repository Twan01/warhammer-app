# Stack Research

**Domain:** Local-first Windows desktop CRUD app (Tauri + React + SQLite)
**Researched:** 2026-04-30
**Confidence:** HIGH (core framework versions verified via official sources and npm; integration patterns verified via multiple community guides)

---

## Recommended Stack

### Core Technologies

| Technology | Pinned Version | Purpose | Why Recommended |
|------------|---------------|---------|-----------------|
| Tauri | 2.10.3 | Desktop shell / Rust backend | Active development (releases weekly), Tauri 2.x is stable and the standard for new projects; smaller binary than Electron; Rust backend is required for SQLite access in this stack |
| React | 19.x | UI framework | Tauri's create-tauri-app React template ships React 19; all shadcn components updated for React 19 |
| TypeScript | 5.x | Type safety across frontend + schema | Non-negotiable for CRUD app — keeps query types, form types, and DB schema types in sync |
| Vite | 6.x | Build tool (created by create-tauri-app) | Default bundler in Tauri's React template; fastest hot-reload; required by shadcn CLI |
| Tailwind CSS | 4.2.4 | Utility styling | v4 is stable (released Jan 2025, now 4.2.x); shadcn/ui CLI explicitly supports v4 init as of March 2026; no config file, CSS-first setup via `@import "tailwindcss"` |
| shadcn/ui | CLI v4 (component library, no package version) | UI components | CLI v4 (March 2026); components are copied into project so version is pinned at copy time; natively supports Tailwind v4 and React 19; provides Table, Dialog, Drawer, Badge, Progress, Select, Sheet, Kanban card primitives needed for this app |

### SQLite Access — Primary Path: Tauri SQL Plugin + Drizzle Proxy

**Decision: Use `@tauri-apps/plugin-sql` (Tauri's official SQL plugin) as the runtime database driver, with Drizzle ORM in sqlite-proxy mode as the query builder and schema manager.**

This is the primary recommended path for Tauri + SQLite in 2025/2026. See the Prisma section for why Prisma is the fallback, not the primary.

| Technology | Pinned Version | Purpose | Why |
|------------|---------------|---------|-----|
| @tauri-apps/plugin-sql | 2.3.2 (npm) | Runtime SQLite access from Tauri WebView | Official Tauri plugin; handles file path resolution to app data dir automatically; no Node.js required; permissions gated in Tauri capabilities JSON |
| tauri-plugin-sql (Rust crate) | 2.2.x (align with npm) | Rust-side SQLite via sqlx | Bundled with plugin-sql; supports SQLite feature flag in Cargo.toml |
| drizzle-orm | 0.45.2 | Schema definition, query builder, type inference | TypeScript-first; sqlite-proxy mode routes all queries through tauri-plugin-sql; schema-as-code gives full type safety on query results; actively maintained |
| drizzle-kit | 0.31.9 (dev) | Migration file generation | Generates SQL migration files from schema; files are bundled at build time via `import.meta.glob` and executed through the custom proxy at startup — works around the missing `fs` module in WebView |

### Supporting Libraries

| Library | Pinned Version | Purpose | When to Use |
|---------|---------------|---------|-------------|
| @tanstack/react-router | 1.168.x | Client-side routing | Use for all navigation (sidebar links, unit detail pages, drawer routing); full TypeScript type safety on route params; replaces React Router for greenfield projects in 2025/2026 |
| @tanstack/react-query | 5.100.x | Async data fetching + cache | All DB queries go through useQuery/useMutation hooks; invalidate on write; gives loading/error states for free; replaces ad-hoc useEffect+useState fetch patterns |
| react-hook-form | 7.73.1 | Form state management | Uncontrolled inputs = no re-render per keystroke; integrates with shadcn form primitives via the `Form` wrapper; use for all CRUD forms (unit, paint, recipe, faction) |
| zod | 4.3.6 | Schema validation | Used as resolver in react-hook-form for runtime validation; also doubles as runtime type guard for DB query results; Zod v4 is stable with a smaller bundle |
| zustand | 5.0.12 | Client-side UI state | Use for ephemeral UI state only: which sidebar tab is active, filter selections not persisted to URL, open/close drawer. NOT for server/DB data — that lives in TanStack Query |
| @tanstack/react-table | 8.21.3 | Headless data tables | Collection page, paint inventory, recipe list; headless so it integrates cleanly with shadcn Table primitives; supports sorting, filtering, pagination out of the box |
| @dnd-kit/core + @dnd-kit/sortable | 6.3.1 | Drag-and-drop for Kanban | Painting Projects Kanban board (move units between status columns); actively maintained; works natively with React 19; direct Tailwind + shadcn integration examples exist |
| tw-animate-css | latest | CSS animations for shadcn | Replaced `tailwindcss-animate` as of March 2025 with Tailwind v4; shadcn upgrade guide explicitly references this change |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package manager | Preferred by Tauri community; create-tauri-app defaults to pnpm; faster installs |
| Rust + cargo | Tauri backend build | Required; minimum Rust 1.77.2 for tauri-plugin-sql |
| Drizzle Studio (drizzle-kit studio) | Visual SQLite browser during dev | Run via `pnpm drizzle-kit studio`; connects to the local SQLite file; useful for seeding and debugging |
| @tauri-apps/cli | Tauri CLI | `pnpm tauri dev` for dev mode, `pnpm tauri build` for Windows installer |
| ESLint + Prettier | Code quality | Standard with Tauri React template |

---

## SQLite Access Decision: Full Rationale

### Why NOT Prisma (Primary) → Fallback Only

Prisma has **structural incompatibility** with Tauri's WebView runtime:

1. **Binary engine**: Prisma requires a query engine binary (a separate process). In a Tauri desktop app, bundling and launching that binary requires careful Tauri sidecar configuration. It works in development but frequently breaks on production builds.
2. **Production freezing**: Documented in the Prisma GitHub discussions (issue #20103) — SQLite operations freeze the app post-build without a workaround involving conditional compilation in Rust's `main.rs`.
3. **Migration CLI**: `prisma migrate` requires Node.js and writes/reads files using `fs`. This does not work inside a WebView. You need a separate Rust migration setup.
4. **Node.js v24 break**: `@prisma/adapter-better-sqlite3` broke on Node.js v24 (MODULE_VERSION mismatch) as of early 2026 — a recurring maintenance risk.
5. **Community sentiment**: Multiple Tauri forum threads (2024-2025) recommend avoiding JS Prisma Client in Tauri and preferring either `prisma-client-rust` (Rust-only) or a lighter TS approach.

**Prisma fallback path (if Drizzle is rejected):** Use `prisma-client-rust` on the Rust side (Tauri commands call Prisma Rust client directly), expose typed Tauri commands to the frontend, and hand-write TypeScript types for the frontend layer. This works but eliminates the type-safe query builder on the TS side.

### Why NOT better-sqlite3

`better-sqlite3` is a Node.js native module. It requires Node.js to be running and uses native bindings compiled for the host. Tauri's WebView runs in a browser-like context — there is no Node.js runtime. `better-sqlite3` cannot be imported or used from the React frontend in a standard Tauri app. It would require a Node.js sidecar process, adding significant complexity with no benefit over the Tauri SQL plugin.

### Why Tauri SQL Plugin + Drizzle Proxy (Primary Path)

The sqlite-proxy pattern is the established community solution for Tauri + TS ORM in 2026:

- Drizzle computes SQL + parameters in the frontend (TypeScript)
- The proxy function calls `@tauri-apps/plugin-sql` to execute the SQL via the Rust backend
- Results are mapped back to Drizzle's expected format
- Migration SQL files are generated by `drizzle-kit` at build time and bundled via `import.meta.glob`
- A custom migration runner (small, ~50 lines) tracks applied migrations in a `__drizzle_migrations` table and runs on app startup before React renders
- Permissions for the SQL plugin must be explicitly granted in `src-tauri/capabilities/default.json`

Multiple production guides exist for this exact pattern (October 2025, February 2026).

---

## Installation

```bash
# Create project
pnpm create tauri-app hobbyforge --template react-ts

# Add Tauri SQL plugin (JS side)
pnpm add @tauri-apps/plugin-sql

# ORM and migrations
pnpm add drizzle-orm
pnpm add -D drizzle-kit

# Routing
pnpm add @tanstack/react-router

# Data fetching
pnpm add @tanstack/react-query @tanstack/react-query-devtools

# Forms and validation
pnpm add react-hook-form zod @hookform/resolvers

# UI state
pnpm add zustand

# Tables
pnpm add @tanstack/react-table

# Drag and drop (Kanban)
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Tailwind v4
pnpm add tailwindcss @tailwindcss/vite

# shadcn/ui (interactive CLI — run after Tailwind is set up)
pnpm dlx shadcn@latest init

# Animation (Tailwind v4 replacement for tailwindcss-animate)
pnpm add tw-animate-css
```

```toml
# src-tauri/Cargo.toml — add to [dependencies]
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| SQLite access | @tauri-apps/plugin-sql + Drizzle proxy | Prisma JS Client | Production build freezing, binary engine incompatibility, Node.js fs requirement in WebView — too fragile |
| SQLite access | @tauri-apps/plugin-sql + Drizzle proxy | better-sqlite3 | Requires Node.js runtime, not available in Tauri WebView without a sidecar |
| ORM | Drizzle ORM (proxy mode) | Kysely (proxy mode) | Both work with the proxy pattern; Drizzle chosen for better schema-as-code DX, migration tooling, and more community guides for Tauri specifically |
| Routing | TanStack Router | React Router v7 | React Router v7's type safety only activates in framework mode (not SPA library mode); TanStack Router provides type-safe params, search params, and route loaders as a SPA library |
| Forms | React Hook Form | TanStack Form | Both work; React Hook Form has more shadcn integration examples and the shadcn `Form` component is built around RHF; TanStack Form is the future direction but docs are thinner |
| State | Zustand | Jotai | Both are minimal; Zustand chosen for wider Tauri community adoption and simpler store patterns for sidebar/filter state |
| DnD | @dnd-kit | @hello-pangea/dnd | hello-pangea/dnd is a fork of archived react-beautiful-dnd; dnd-kit has native React 19 support and the exact Tailwind + shadcn Kanban reference implementation exists |
| DnD | @dnd-kit | pragmatic-drag-and-drop | pragmatic-drag-and-drop (Atlassian) is framework-agnostic with minimal React ergonomics; dnd-kit is more ergonomic for React CRUD apps |
| Tables | @tanstack/react-table | AG Grid Community | AG Grid is overkill for a personal app; TanStack Table is headless and pairs naturally with shadcn Table |
| CSS | Tailwind CSS v4 | Tailwind CSS v3 | v3 is still supported but not recommended for new projects in 2026; shadcn CLI v4 defaults to v4; v4 is CSS-first and requires no config file |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Prisma JS Client as primary | Production builds freeze; binary engine incompatibility with Tauri WebView; `fs` module unavailable for migrations; Node.js v24 breakage risk | @tauri-apps/plugin-sql + Drizzle proxy |
| better-sqlite3 | Requires Node.js runtime — unavailable in Tauri WebView without a sidecar process | @tauri-apps/plugin-sql |
| Redux / Redux Toolkit | Extreme boilerplate for a single-user local app; async data belongs in TanStack Query, not a reducer | TanStack Query + Zustand |
| react-beautiful-dnd / @hello-pangea/dnd | Archived upstream (Atlassian), forked maintenance only; animation-heavy which can feel slow on large boards | @dnd-kit/core + @dnd-kit/sortable |
| tailwindcss-animate | Deprecated as of Tailwind v4 migration (March 2025 shadcn changelog) | tw-animate-css |
| React Router v7 (library mode) | Type safety on params/search requires framework mode (loader functions, server rendering), which does not apply to a Tauri SPA | @tanstack/react-router |
| Electron | 10-20x larger binary, Chromium bundled, no Rust backend; explicitly rejected in ROADMAP.txt | Tauri |
| localStorage or IndexedDB | Ephemeral, no schema, no relations, no migration story | SQLite via tauri-plugin-sql |

---

## Stack Patterns by Condition

**For the Kanban board (Painting Projects page):**
- Use `@dnd-kit/core` + `@dnd-kit/sortable`
- Columns map to painting status enum values (Built, Primed, Basecoated, etc.)
- Each card is a unit; dropping triggers a TanStack Query mutation that updates `status_painting` in SQLite
- Reference implementation exists: `react-dnd-kit-tailwind-shadcn-ui` on GitHub

**For the Collection page (filterable table):**
- Use `@tanstack/react-table` with shadcn `Table` primitives
- Filters (faction, status, category, active project) live in Zustand store
- Table data comes from TanStack Query `useQuery`
- Unit detail opens in a shadcn `Sheet` (drawer) component

**For all CRUD forms (Unit, Paint, Recipe, Faction):**
- `react-hook-form` + `zod` resolver + shadcn `Form`, `FormField`, `FormItem` components
- Submit triggers a TanStack Query `useMutation`
- On success: `queryClient.invalidateQueries` + close dialog/drawer

**If Drizzle proxy pattern proves too complex:**
- Fall back to hand-written SQL queries via `@tauri-apps/plugin-sql` directly (no ORM)
- Keep all SQL in `src/db/queries/*.ts` files as exported async functions
- Use Zod for runtime type-checking query results
- Use `drizzle-kit` only for schema reference, not at runtime

**If Prisma becomes necessary (last resort):**
- Switch to `prisma-client-rust` on the Rust side
- Expose each DB operation as a typed Tauri command (`#[tauri::command]`)
- Hand-write TypeScript types matching Prisma's generated types
- This eliminates the type-safe TS query builder but gives a stable Rust-native ORM

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| tauri 2.10.3 | tauri-plugin-sql 2.x | Match major versions; plugin 2.x requires Tauri 2.x |
| @tauri-apps/plugin-sql 2.3.2 | tauri-plugin-sql crate 2.x | npm and crate versions must stay in sync (both managed by plugins-workspace v2 branch) |
| drizzle-orm 0.45.2 | @tauri-apps/plugin-sql 2.x | Proxy pattern; no direct dependency — compatibility is via the proxy function you write |
| react 19.x | @tanstack/react-router 1.168.x | Verified: TanStack Router supports React 19 |
| react 19.x | @tanstack/react-query 5.100.x | Verified: TanStack Query v5 supports React 19 |
| react 19.x | @dnd-kit/core 6.3.1 | Verified: dnd-kit 6.x supports React 19 |
| react 19.x | react-hook-form 7.73.1 | Verified: RHF v7 supports React 19 |
| tailwindcss 4.2.4 | shadcn/ui CLI v4 | shadcn CLI v4 (March 2026) explicitly targets Tailwind v4; use `pnpm dlx shadcn@latest init` |
| tailwindcss 4.2.4 | tw-animate-css | Direct replacement for tailwindcss-animate; shadcn changelog documents this switch |
| zod 4.3.6 | react-hook-form 7.73.1 | Use `@hookform/resolvers/zod`; verified compatible |
| zod 4.3.6 | @tanstack/react-query 5.100.x | No direct dependency; Zod used in mutation input validation separately |
| drizzle-orm 0.45.2 | drizzle-kit 0.31.9 | Keep in sync; drizzle-kit generates migrations consumed by drizzle-orm |

---

## Critical Integration Gotchas

### Gotcha 1: Tauri SQL Plugin Permissions

SQL plugin permissions must be explicitly declared in `src-tauri/capabilities/default.json`. Without this, all `Database.load()` calls fail silently with "not allowed" errors at runtime. Required capability: `"sql:allow-load"` and `"sql:allow-execute"` and `"sql:allow-select"`.

### Gotcha 2: Drizzle Migration Runner

`drizzle-kit migrate` uses Node's `fs` module and does not work in a WebView. The solution:
1. Generate migration SQL files: `pnpm drizzle-kit generate`
2. Bundle them at build time using `import.meta.glob('../../drizzle/*.sql', { as: 'raw', eager: true })`
3. Write a small startup function that reads the `__drizzle_migrations` table and runs any unapplied migration files via the SQL proxy
4. Call this runner before React renders (e.g., in a TanStack Router root loader)

### Gotcha 3: Drizzle Proxy SELECT vs Execute Routing

The proxy function must distinguish `SELECT` from `INSERT`/`UPDATE`/`DELETE`. SELECT calls use `database.select()` (returns rows); all others use `database.execute()` (returns metadata). The simplest check: `if (sql.trim().toUpperCase().startsWith('SELECT'))`.

### Gotcha 4: Database File Path

The SQLite file must live in Tauri's app data directory. Use `appDataDir()` from `@tauri-apps/api/path` to resolve the path. Do not hardcode absolute paths — they break across machines and Windows usernames.

```typescript
import { appDataDir } from '@tauri-apps/api/path';
import { join } from '@tauri-apps/api/path';

const dir = await appDataDir();
const dbPath = await join(dir, 'hobbyforge.sqlite');
const db = await Database.load(`sqlite:${dbPath}`);
```

### Gotcha 5: Tailwind v4 No Config File

Tailwind v4 has no `tailwind.config.js`. All theme customization happens in CSS via `@theme`. shadcn components use CSS variables, not direct Tailwind tokens, so this does not affect component usage — but custom tokens for faction colors must be added to the `@theme` block in `globals.css`.

---

## Sources

- Tauri releases page (v2.tauri.app/release/) — Tauri 2.10.3 current version [HIGH confidence]
- @tauri-apps/plugin-sql npm (2.3.2) — version verified via npm search result [HIGH confidence]
- drizzle-orm npm (0.45.2 stable, 1.0.0-beta.x beta) — [HIGH confidence]
- drizzle-kit npm (0.31.9) — [HIGH confidence]
- dev.to/meddjelaili — Tauri v2 + Drizzle + SQLite starter template [MEDIUM confidence — community guide, October 2025]
- keypears.com/blog/2025-10-04-drizzle-sqlite-tauri — Migration runner pattern [MEDIUM confidence — community guide]
- dev.to/huakun — Drizzle sqlite-proxy in Tauri [MEDIUM confidence — community guide]
- github.com/prisma/prisma/discussions/20103 — Prisma production build freeze in Tauri [HIGH confidence — primary source issue thread]
- github.com/Brendonovich/prisma-client-rust — Prisma Rust fallback pattern [MEDIUM confidence]
- ui.shadcn.com/docs/tailwind-v4 — shadcn Tailwind v4 support [HIGH confidence — official docs]
- ui.shadcn.com/docs/changelog/2026-03-cli-v4 — shadcn CLI v4 [HIGH confidence — official changelog]
- @tanstack/react-router npm (1.168.x) — version verified [HIGH confidence]
- @tanstack/react-query npm (5.100.x) — version verified [HIGH confidence]
- react-hook-form npm (7.73.1) — version verified [HIGH confidence]
- zod npm (4.3.6) — version verified [HIGH confidence]
- zustand npm (5.0.12) — version verified [HIGH confidence]
- @tanstack/react-table npm (8.21.3) — version verified [HIGH confidence]
- @dnd-kit/core npm (6.3.1) — version verified [HIGH confidence]
- github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui — dnd-kit + shadcn Kanban reference [MEDIUM confidence]
- tailwindcss npm (4.2.4) — version verified [HIGH confidence]

---

*Stack research for: HobbyForge — Tauri + React + SQLite local-first desktop CRUD app*
*Researched: 2026-04-30*
