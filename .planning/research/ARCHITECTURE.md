# Architecture Research

**Domain:** Local-first Tauri + React + SQLite desktop application
**Researched:** 2026-04-30
**Confidence:** HIGH (core data flow verified against official Tauri v2 docs and multiple working implementations)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Frontend (WebView)                    │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  Page /  │  │  Feature │  │ shadcn/  │  │  react-hook- │    │
│  │  Route   │  │ Component│  │ ui Forms │  │  form + zod  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │
│       │             │             │                │            │
│  ┌────▼─────────────▼─────────────▼────────────────▼───────┐    │
│  │               TanStack Query (useQuery / useMutation)    │    │
│  └────────────────────────────┬────────────────────────────┘    │
│                               │                                  │
│  ┌────────────────────────────▼────────────────────────────┐    │
│  │          src/db/queries/*.ts  (Query Functions)          │    │
│  │  factions.ts │ units.ts │ paints.ts │ recipes.ts │ ...  │    │
│  └────────────────────────────┬────────────────────────────┘    │
└───────────────────────────────┼─────────────────────────────────┘
                                │ @tauri-apps/plugin-sql
                                │ Database.load() / db.select() / db.execute()
┌───────────────────────────────▼─────────────────────────────────┐
│                      Tauri IPC Bridge                            │
├─────────────────────────────────────────────────────────────────┤
│                    Rust (src-tauri/src/lib.rs)                   │
│                                                                  │
│  tauri-plugin-sql (sqlx under the hood)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Migration runner (versioned, transactional, on startup) │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                SQLite file on disk                               │
│        %APPDATA%/HobbyForge/hobbyforge.db                       │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Talks To |
|-----------|----------------|----------|
| Page/Route | Compose feature sections, handle URL params | Feature components |
| Feature component | Feature-specific UI, local display state | TanStack Query hooks |
| TanStack Query hook | Cache management, loading/error states, invalidation | Query functions in src/db/queries/ |
| Query functions (src/db/queries/*.ts) | Typed SQL — the ONLY layer that calls the plugin-sql API | @tauri-apps/plugin-sql |
| @tauri-apps/plugin-sql | IPC bridge — translates TypeScript calls to Rust sqlx | Tauri IPC |
| tauri-plugin-sql (Rust) | Executes SQL via sqlx, runs migrations on startup | SQLite file |
| SQLite file | Persistent local storage | — |

---

## Data Flow: Frontend to SQLite

### The Recommended Approach: plugin-sql Directly from TypeScript

Use `@tauri-apps/plugin-sql` called from TypeScript query functions. Do NOT write custom Rust command handlers for CRUD operations. This is the pattern confirmed by the official Tauri v2 SQL plugin docs and multiple real implementations.

**Why not custom Rust commands?** Custom Tauri `#[tauri::command]` handlers for database work add a Rust layer that provides no benefit over the plugin-sql bridge for standard CRUD. You'd be writing the same SQL twice (once in TS, once in Rust). Reserve custom Rust commands for operations that genuinely need native OS access (file system paths, system tray, etc.).

**Why not Prisma?** prisma-client-rust was archived March 2025 and is unmaintained. Standard Prisma (Node.js) cannot run inside Tauri's sandboxed WebView. Drizzle with sqlite-proxy is a viable ORM path, but for a personal tool with a stable schema, raw typed query functions are simpler and have zero abstraction overhead. Recommend raw plugin-sql calls for v1; migrate to Drizzle if the schema grows complex.

### Full Request Cycle (Read)

```
User lands on Collection page
  ↓
CollectionPage.tsx renders
  ↓
useUnits({ faction, status }) — custom hook wrapping useQuery
  ↓
queryKey: ['units', { faction, status }]
queryFn: () => queries.units.getAll({ faction, status })
  ↓
src/db/queries/units.ts → getAll()
  const db = await Database.load('sqlite:hobbyforge.db')
  return db.select<Unit[]>('SELECT * FROM units WHERE ...', [faction, status])
  ↓
@tauri-apps/plugin-sql IPC bridge
  ↓
Rust sqlx executes SELECT against hobbyforge.db
  ↓
Row data returns up the chain
  ↓
TanStack Query caches result under ['units', { faction, status }]
  ↓
CollectionPage renders UnitTable with cached data
```

### Full Request Cycle (Write / Mutation)

```
User submits UnitForm
  ↓
react-hook-form calls handleSubmit(onSubmit)
  ↓
Zod schema validates — parse() throws on invalid data
  ↓
onSubmit() calls mutate(formData) from useMutation hook
  ↓
mutationFn: (data) => queries.units.create(data)
  ↓
src/db/queries/units.ts → create()
  const db = await Database.load('sqlite:hobbyforge.db')
  const result = await db.execute(
    'INSERT INTO units (...) VALUES ($1, $2, ...)',
    [data.name, data.faction_id, ...]
  )
  return result.lastInsertId
  ↓
onSuccess: queryClient.invalidateQueries({ queryKey: ['units'] })
  ↓
TanStack Query refetches → UI updates automatically
```

---

## Data Flow Decision: Where Does State Live?

**Decision: TanStack Query as the single source of truth for all database-backed data. No Zustand, no Redux for DB data.**

For a single-user local desktop app with SQLite as the backing store:

- TanStack Query's cache IS the application state for DB data
- No derived state needs to be synchronized between a global store and a query cache
- `staleTime: 5 minutes`, `gcTime: 10 minutes`, `refetchOnWindowFocus: false` (desktop defaults)

**What uses useState:**
- Form field state (managed by react-hook-form internally)
- UI-only state: drawer open/closed, active tab, selected filter values before submit
- Kanban drag state (local to the Kanban component)

**Nothing uses a global store (Zustand, Redux, Context for data).** The app is single-user, single-window, local-only. Global stores add synchronization complexity for zero benefit.

---

## Migration Story

### Where Migrations Live

Migrations are defined in Rust in `src-tauri/src/lib.rs` using the `Migration` struct from `tauri-plugin-sql`. They are NOT SQL files on disk — they are Rust string literals compiled into the binary.

```rust
// src-tauri/src/lib.rs
use tauri_plugin_sql::{Migration, MigrationKind};

fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_core_schema",
            sql: include_str!("../migrations/001_core_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_initial_factions",
            sql: include_str!("../migrations/002_seed_factions.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
```

Use `include_str!()` to load SQL from `src-tauri/migrations/*.sql` files at compile time. This keeps SQL readable in separate files without requiring runtime file I/O.

### When Migrations Run

Migrations run automatically when `Database.load('sqlite:hobbyforge.db')` is called — which happens on the first query. They also run if `plugins.sql.preload` is set in `tauri.conf.json`. Either approach works; preload is cleaner because it runs migrations before the UI renders.

Recommend: add `"sqlite:hobbyforge.db"` to `plugins.sql.preload` in `tauri.conf.json` so migrations complete during app startup, not lazily on first query.

### Migration Versioning Rules

- Each migration gets a unique integer version number
- Migrations run in version order
- Already-applied migrations are tracked internally by tauri-plugin-sql (via a `_sqlx_migrations` table it creates)
- Never modify an applied migration — add a new one
- All migrations run in a transaction; if one fails, the whole batch rolls back

### Folder Structure for Migrations

```
src-tauri/
├── migrations/
│   ├── 001_core_schema.sql       # CREATE TABLE statements for all entities
│   ├── 002_seed_factions.sql     # INSERT OR IGNORE for 4 seed factions
│   └── 003_seed_units_paints.sql # INSERT OR IGNORE for sample units/paints/recipes
└── src/
    └── lib.rs                    # registers migrations with tauri-plugin-sql
```

---

## Seed Data Story

### How Seeds Run

Seed data lives in a dedicated migration (version 2+). Use `INSERT OR IGNORE` with explicit IDs to make seeds idempotent — they can run multiple times without creating duplicates.

```sql
-- 002_seed_factions.sql
INSERT OR IGNORE INTO factions (id, name, game_system, color_theme) VALUES
  (1, 'Tau Empire', '40k', '#00ADEF'),
  (2, 'Ultramarines', '40k', '#0033AA'),
  (3, 'Necrons', '40k', '#33AA44'),
  (4, 'Tyranids', '40k', '#7B2D8B');
```

Seeds fire on first launch (when `_sqlx_migrations` has no record of that version). They never re-fire on subsequent launches. This is the only seeding mechanism needed — no separate `seed.ts` script or runtime check.

The `src/db/seed.ts` file referenced in ROADMAP.txt section 9.2 should be a TypeScript module that re-exports the migration SQL strings for documentation purposes only, or it can be removed in favor of the Rust migration approach described above.

---

## Form Wiring: react-hook-form + Zod + Mutation

The pattern for every Create/Edit form in the app:

```typescript
// src/features/factions/FactionForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { factionQueries } from '@/db/queries/factions'

// 1. Zod schema — single source of type truth
const factionSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  game_system: z.string().default('40k'),
  color_theme: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  description: z.string().optional(),
})
type FactionFormData = z.infer<typeof factionSchema>

// 2. Component receives optional defaultValues for edit mode
export function FactionForm({ faction, onSuccess }: Props) {
  const queryClient = useQueryClient()

  const form = useForm<FactionFormData>({
    resolver: zodResolver(factionSchema),
    defaultValues: faction ?? { game_system: '40k' },
  })

  // 3. Mutation wired to query function
  const mutation = useMutation({
    mutationFn: (data: FactionFormData) =>
      faction
        ? factionQueries.update(faction.id, data)
        : factionQueries.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factions'] })
      onSuccess?.()
    },
  })

  // 4. handleSubmit validates → passes to mutation
  return (
    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
      {/* shadcn/ui Form components here */}
    </form>
  )
}
```

This pattern is identical for every CRUD form. The only things that change are the Zod schema, the query functions called in `mutationFn`, and the `queryKey` to invalidate.

---

## Recommended Project Structure

```
src/
├── app/
│   ├── App.tsx                     # QueryClientProvider wraps everything here
│   ├── routes.tsx                  # React Router route definitions
│   └── layout/
│       ├── AppLayout.tsx           # Sidebar + main content shell
│       └── Sidebar.tsx             # Nav links
│
├── components/
│   ├── ui/                         # shadcn/ui generated components (DO NOT EDIT)
│   ├── common/                     # Shared: StatusBadge, ProgressBar, EmptyState, ConfirmDialog
│   └── forms/                      # Shared form primitives: FormField wrappers
│
├── features/
│   ├── dashboard/
│   │   └── DashboardPage.tsx       # Phase 0: placeholder; Phase 3: real stats
│   ├── factions/
│   │   ├── FactionPage.tsx         # List + management
│   │   ├── FactionForm.tsx         # Create/edit drawer
│   │   ├── FactionCard.tsx         # Display card
│   │   └── factions.types.ts       # Local types (extends from src/types/)
│   ├── collection/
│   │   ├── CollectionPage.tsx
│   │   ├── UnitTable.tsx
│   │   ├── UnitFilters.tsx
│   │   ├── UnitDetail.tsx          # Drawer or full page
│   │   ├── UnitForm.tsx
│   │   └── collection.types.ts
│   ├── painting/
│   │   ├── PaintingPage.tsx        # Kanban board
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanCard.tsx
│   │   └── painting.types.ts
│   ├── paints/
│   │   ├── PaintsPage.tsx          # Table view (Phase 1 CRUD only)
│   │   ├── PaintForm.tsx
│   │   └── paints.types.ts
│   └── recipes/
│       ├── RecipesPage.tsx
│       ├── RecipeDetail.tsx
│       ├── RecipeForm.tsx
│       ├── RecipePaintLinker.tsx   # UI for linking paints to steps
│       └── recipes.types.ts
│
├── db/
│   ├── client.ts                   # Database.load() singleton helper
│   ├── schema.ts                   # TypeScript interfaces mirroring DB columns
│   ├── migrations/                 # (TS re-exports or docs only — real migrations in src-tauri/migrations/)
│   ├── queries/
│   │   ├── factions.ts             # getAll, getById, create, update, delete
│   │   ├── units.ts
│   │   ├── paints.ts
│   │   ├── recipes.ts
│   │   └── recipePaints.ts        # Join table queries
│   └── seed.ts                    # Documents seed migration content (optional)
│
├── hooks/
│   ├── useFactions.ts             # useQuery wrappers per entity
│   ├── useUnits.ts
│   ├── usePaints.ts
│   └── useRecipes.ts
│
├── types/
│   └── index.ts                   # Shared TypeScript types exported app-wide
│
├── utils/
│   └── index.ts                   # Pure helpers: formatDate, statusLabel, etc.
│
└── styles/
    └── globals.css                # Tailwind base + custom CSS vars
```

```
src-tauri/
├── migrations/
│   ├── 001_core_schema.sql
│   ├── 002_seed_factions.sql
│   └── 003_seed_sample_data.sql
└── src/
    ├── lib.rs                     # Plugin registration + migration list
    └── main.rs
```

---

## Architectural Patterns

### Pattern 1: Database Client Singleton

**What:** A single `Database.load()` call is memoized so every query function gets the same connection instance rather than reopening the connection on each call.

**When to use:** Always. The plugin supports connection pooling internally, but calling `load()` repeatedly is wasteful.

**Example:**
```typescript
// src/db/client.ts
import Database from '@tauri-apps/plugin-sql'

let _db: Database | null = null

export async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load('sqlite:hobbyforge.db')
  }
  return _db
}
```

All query functions call `getDb()` instead of `Database.load()` directly.

### Pattern 2: Typed Query Functions (not repositories, not classes)

**What:** Each entity gets a plain TypeScript module in `src/db/queries/` that exports named async functions. No classes, no dependency injection. Functions are the unit of composition.

**When to use:** Always for this project. Classes/repository pattern adds ceremony without benefit for a single-developer tool with a stable schema.

**Example:**
```typescript
// src/db/queries/factions.ts
import { getDb } from '../client'
import type { Faction, CreateFactionInput } from '@/types'

export const factionQueries = {
  async getAll(): Promise<Faction[]> {
    const db = await getDb()
    return db.select<Faction[]>('SELECT * FROM factions ORDER BY name')
  },

  async getById(id: number): Promise<Faction | null> {
    const db = await getDb()
    const rows = await db.select<Faction[]>(
      'SELECT * FROM factions WHERE id = $1', [id]
    )
    return rows[0] ?? null
  },

  async create(input: CreateFactionInput): Promise<number> {
    const db = await getDb()
    const result = await db.execute(
      'INSERT INTO factions (name, game_system, color_theme, description) VALUES ($1, $2, $3, $4)',
      [input.name, input.game_system, input.color_theme, input.description]
    )
    return result.lastInsertId!
  },

  async update(id: number, input: Partial<CreateFactionInput>): Promise<void> {
    const db = await getDb()
    await db.execute(
      'UPDATE factions SET name = $1, color_theme = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [input.name, input.color_theme, id]
    )
  },

  async delete(id: number): Promise<void> {
    const db = await getDb()
    await db.execute('DELETE FROM factions WHERE id = $1', [id])
  },
}
```

### Pattern 3: TanStack Query Hooks Per Entity

**What:** Thin custom hooks that wrap `useQuery` and `useMutation` with the right query keys and invalidation logic. Feature components import these hooks, never the query functions directly.

**When to use:** Every data-fetching component. This is the boundary between UI and data.

**Example:**
```typescript
// src/hooks/useFactions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { factionQueries } from '@/db/queries/factions'

export const FACTION_KEYS = {
  all: ['factions'] as const,
  detail: (id: number) => ['factions', id] as const,
}

export function useFactions() {
  return useQuery({
    queryKey: FACTION_KEYS.all,
    queryFn: factionQueries.getAll,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateFaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: factionQueries.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FACTION_KEYS.all })
    },
  })
}
```

---

## Component Boundaries: What Talks to What

### Allowed Dependencies

```
Page component
  → Feature components (same feature folder)
  → Custom hooks (src/hooks/)
  → Common components (src/components/common/)

Feature component
  → Custom hooks (src/hooks/) — ONLY way to access data
  → shadcn/ui components (src/components/ui/)
  → Common components (src/components/common/)

Custom hooks (src/hooks/)
  → Query functions (src/db/queries/) — ONLY caller of query layer

Query functions (src/db/queries/)
  → Database client (src/db/client.ts) — ONLY caller of plugin-sql
```

### NEVER Allowed

| From | To | Why |
|------|----|-----|
| Feature component | src/db/queries/* | Bypasses cache layer; causes stale UI |
| Feature component | @tauri-apps/plugin-sql | Direct DB in UI — the anti-pattern ROADMAP.txt explicitly forbids |
| Feature A components | Feature B components | Cross-feature coupling — share via hooks/types only |
| Query functions | React hooks | Circular dependency |
| UI components | Rust commands (invoke) | For DB work — use plugin-sql through query layer instead |

---

## Suggested Build Order: Phase 0 → Phase 3

### Phase 0: App Shell (Foundation)

Build these in order; nothing else can start without them:

1. Tauri + React + TypeScript project scaffold
2. Tailwind + shadcn/ui installation and theme tokens (dark slate, CSS vars)
3. `AppLayout.tsx` + `Sidebar.tsx` — persistent shell, all nav links wired
4. React Router setup — one route per page, all render placeholder `<div>`
5. `src/db/client.ts` — Database singleton
6. Rust migration scaffolding in `lib.rs` — empty `get_migrations()` for now
7. `tauri.conf.json` preload entry — confirms DB file is created on launch
8. `QueryClientProvider` wrapping `App.tsx`
9. Verify: app launches, sidebar navigates, SQLite file appears in AppData

**Phase 0 delivers:** Desktop shell. No data, no forms. Just confirmed plumbing.

### Phase 1: Database + Core CRUD (Data Layer First)

Build in order — schema must precede queries, queries must precede hooks, hooks must precede UI:

1. `src-tauri/migrations/001_core_schema.sql` — all CREATE TABLE statements (all entities including deferred ones like army_lists — schema is cheap, deferring tables causes migrations later)
2. `src-tauri/migrations/002_seed_factions.sql` — INSERT OR IGNORE for 4 factions
3. `src-tauri/migrations/003_seed_sample_data.sql` — sample units, paints, recipes
4. Register all 3 migrations in `lib.rs`
5. `src/types/index.ts` — TypeScript interfaces for all entities
6. `src/db/queries/factions.ts` — getAll, getById, create, update, delete
7. `src/hooks/useFactions.ts` — useQuery + useMutation wrappers
8. `src/features/factions/FactionPage.tsx` — list + inline create form
9. `src/features/factions/FactionForm.tsx` — react-hook-form + zod
10. Repeat steps 6-9 for units, paints, recipes
11. `src/db/queries/recipePaints.ts` — join table queries
12. Verify: all CRUD works, data survives restart, seed data appears on first launch

**Phase 1 delivers:** All data entities CRUD-able. Full data layer in place. UI is functional but not polished.

### Phase 2: Collection Module (First Real Feature)

Depends on: Phase 1 complete (factions + units data layer exists)

1. `UnitTable.tsx` — shadcn/ui Table, columns: name, faction, category, status, points
2. `UnitFilters.tsx` — faction select, status select, search input (controlled, useState)
3. Wire filters: `useUnits({ faction, status, search })` hook with query params
4. `UnitDetail.tsx` — drawer (shadcn/ui Sheet) showing all unit fields
5. `UnitForm.tsx` — full create/edit form (all Unit fields, react-hook-form + zod)
6. Quick status update — inline select or button group in UnitDetail, single `useMutation`
7. Progress bar component — reusable, goes in `src/components/common/`
8. `CollectionPage.tsx` — composes all of the above

**Phase 2 delivers:** Collection page is genuinely usable. The core user journey (add unit → view collection → filter → update status) is complete.

### Phase 3: Painting Module (Active Projects + Recipes)

Depends on: Phase 2 (units exist, status field established)

1. `KanbanBoard.tsx` — columns from painting status enum, drag is optional (sortable via priority initially)
2. `KanbanCard.tsx` — unit card with faction color, percentage, target date
3. Filter: only `is_active_project = true` — one query param change from Phase 2's useUnits
4. Status update from Kanban — same `useMutation` pattern as Phase 2 quick update
5. `RecipesPage.tsx` — list of recipes with faction/unit filter
6. `RecipeDetail.tsx` — all recipe fields, linked paints list
7. `RecipeForm.tsx` — recipe create/edit with step fields
8. `RecipePaintLinker.tsx` — UI to add/remove paints from recipe steps (insert/delete on recipe_paints join table)
9. Link recipes to units — add recipe_id reference to unit detail drawer

**Phase 3 delivers:** Complete v1 MVP. Painting projects tracked, recipes documented, paints linked.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Plugin-SQL Calls in Components

**What people do:** `import Database from '@tauri-apps/plugin-sql'` inside a React component, then call `db.select()` in a `useEffect`.

**Why it's wrong:** No caching (every render triggers a DB round trip), no loading/error state management, impossible to test, data goes stale, violates the ROADMAP.txt rule explicitly.

**Do this instead:** Query function in `src/db/queries/`, wrapped in a TanStack Query `useQuery` hook, called from the component.

### Anti-Pattern 2: One Giant Migration

**What people do:** Put all CREATE TABLE statements AND all seed data in migration version 1.

**Why it's wrong:** Cannot re-seed without rolling back schema. Cannot add seed data later. Seeds that fail block schema creation.

**Do this instead:** Separate migrations: version 1 = schema only, version 2+ = seed data. Seeds use `INSERT OR IGNORE` with stable IDs.

### Anti-Pattern 3: Shared Query Client Config Omits Desktop Defaults

**What people do:** Use TanStack Query defaults (staleTime: 0, refetchOnWindowFocus: true) copied from web tutorials.

**Why it's wrong:** In a desktop app, refetching on window focus hits the local SQLite unnecessarily. staleTime: 0 means every navigation triggers a DB read.

**Do this instead:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes
      gcTime: 10 * 60 * 1000,          // 10 minutes
      refetchOnWindowFocus: false,      // desktop: no server to sync with
      retry: 1,
    },
  },
})
```

### Anti-Pattern 4: Cross-Feature Imports Between Feature Folders

**What people do:** `import { UnitCard } from '../collection/UnitCard'` inside the `painting/` feature folder.

**Why it's wrong:** Creates hidden coupling. Refactoring collection breaks painting. Features cannot be independently built or removed.

**Do this instead:** Move shared components to `src/components/common/`. Share data via query hooks, not component imports.

### Anti-Pattern 5: Forgetting Permissions in Tauri Capabilities

**What people do:** Install the plugin, write the TypeScript, get a silent failure at runtime.

**Why it's wrong:** Tauri 2.0's capability system blocks SQL write operations by default. `sql:allow-select` is in the default set but `sql:allow-execute` is not.

**Do this instead:** Add to `src-tauri/capabilities/default.json` immediately in Phase 0:
```json
"sql:allow-load",
"sql:allow-select",
"sql:allow-execute",
"sql:allow-close"
```

---

## Integration Points

### Internal Boundaries

| Boundary | Communication Pattern | Notes |
|---------|-----------------------|-------|
| Feature ↔ Data | Custom hooks (useQuery/useMutation) | Only crossing point for data |
| Feature ↔ Feature | Shared types only (src/types/) | Never import components cross-feature |
| Recipe ↔ Paints | recipePaints query functions | Join table managed in its own query module |
| Recipe ↔ Units | Optional FK (unit_id nullable on recipe) | Loaded as part of recipe detail query |
| Painting ↔ Collection | Shared unit data via useUnits hook | Painting page is a filtered view of units |
| Dashboard ↔ All | Aggregation queries in dashboard-specific hooks | Reads-only, never mutates |

### Tauri Platform Integration

| Need | Approach |
|------|----------|
| DB file path | tauri-plugin-sql resolves `sqlite:hobbyforge.db` to AppData automatically |
| File system (future images) | `@tauri-apps/plugin-fs` — separate from DB layer |
| App data directory | `app_data_dir()` via `@tauri-apps/api/path` for displaying path in settings |

---

## Scaling Considerations

This is a personal single-user desktop app. Scaling to users is not a concern. The relevant scale axis is data volume:

| Scale | Architecture |
|-------|--------------|
| < 500 units | Current approach is fine — no indexes needed beyond PK |
| 500-2000 units | Add compound indexes on (faction_id, status_painting) in migration |
| > 2000 units | Paginate collection query; add LIMIT/OFFSET to useUnits hook |

The SQLite file will stay under 10MB for a single hobbyist's lifetime of data. Performance is not a concern at any realistic data size.

---

## Sources

- [Tauri SQL Plugin — Official Docs v2](https://v2.tauri.app/plugin/sql/)
- [Tauri SQL Plugin — JavaScript API Reference](https://v2.tauri.app/reference/javascript/sql/)
- [Tauri 2.0 + SQLite + React — DEV Community walkthrough](https://dev.to/focuscookie/tauri-20-sqlite-db-react-2aem)
- [Drizzle SQLite Migrations in Tauri 2.0](https://keypears.com/blog/2025-10-04-drizzle-sqlite-tauri)
- [TanStack Query Integration in Tauri Template](https://deepwiki.com/dannysmith/tauri-template/5.4-tanstack-query-integration)
- [react-hook-form + zod + shadcn/ui pattern](https://shadcnstudio.com/blog/react-hook-form-zod-shadcn-ui)
- [prisma-client-rust archived March 2025](https://github.com/Brendonovich/prisma-client-rust/discussions/274)
- [tauri-plugin-sql migrations issue thread](https://github.com/tauri-apps/tauri-plugin-sql/issues/127)

---
*Architecture research for: Tauri + React + SQLite local-first desktop (HobbyForge)*
*Researched: 2026-04-30*
