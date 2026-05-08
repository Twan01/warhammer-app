# HobbyForge — Agent Reference

HobbyForge is a Tauri v2 desktop app for Warhammer 40K hobbyists. It tracks unit
collections, paint inventories, painting recipes, army lists, battle logs, and hobby
spending. Rules data (datasheets, wargear, abilities) syncs from Wahapedia via CSV
download. All data is stored locally in two SQLite databases — no cloud required.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Rust | stable (via rustup) |
| Node.js | 20+ |
| pnpm | 9+ |
| Tauri CLI | v2 (installed via pnpm) |

Install JS dependencies:
```
pnpm install
```

---

## Commands

### Development

```bash
# Frontend only (Vite dev server on http://localhost:1420)
pnpm dev

# Full Tauri app (spawns Vite + native window)
pnpm tauri dev
```

### Build

```bash
# Compile TypeScript + bundle frontend
pnpm build

# Build distributable Tauri app (installer/executable)
pnpm tauri build
```

### Tests

```bash
# Run all tests once
pnpm test

# Watch mode
pnpm test:watch

# Browser UI for tests
pnpm vitest --ui
```

Tests live in `tests/` and use **Vitest 4 + React Testing Library + jsdom**.
Setup file: `tests/setup.ts` (jest-dom matchers + ResizeObserver polyfill).

---

## Architecture

```
React 19 (TypeScript)  ←→  Tauri v2 runtime  ←→  Rust backend
       │                         │                      │
  TanStack Router           plugin-sql              SQLite (x2)
  TanStack Query            plugin-http             sqlx migrations
  Zustand (light)           plugin-fs / dialog
  Tailwind v4 + shadcn/ui
```

### Two databases

| Database | File | Purpose |
|----------|------|---------|
| `hobbyforge.db` | app data | factions, units, paints, recipes, army lists, battle logs |
| `rules.db` | rules data | Wahapedia datasheets, wargear, abilities, keywords |

Migrations run on startup via `tauri-plugin-sql` Migration structs in
`src-tauri/src/lib.rs`. SQL files are in `src-tauri/migrations/`.

---

## Key File Locations

```
src/
  main.tsx                      React entry point
  app/
    router.tsx                  TanStack Router — all 10 routes defined here
  db/
    client.ts                   hobbyforge.db singleton (getDb())
    rules-client.ts             rules.db singleton (getRulesDb())
    queries/
      units.ts                  Unit CRUD queries
      factions.ts               Faction CRUD queries
      paints.ts                 Paint inventory queries
      recipes.ts                Recipe management queries
      datasheets.ts             Wahapedia rules lookup queries
      army-lists.ts             Army list building queries
      battle-logs.ts            Battle record queries
  features/
    units/                      Collection page, PlaybookTab, JournalTab, DatasheetImportDialog
    painting-projects/          Kanban board (dnd-kit drag-and-drop)
    recipes/                    Paint recipe CRUD
    paints/                     Paint inventory
    factions/                   Faction management
    army-lists/                 Army list builder
    battle-log/                 Battle history
    dashboard/                  Stats overview
    spending/                   Hobby spending analytics
  hooks/
    useRulesSync.ts             Downloads + syncs Wahapedia CSVs via Tauri invoke
    use*.ts                     React Query hooks for each entity (18 total)
  types/
    datasheet.ts                Wahapedia rules types (RwDatasheet, RwDatasheetWargear, etc.)
    *.ts                        Domain types: Unit, Faction, Paint, PaintingRecipe, etc.
  components/
    ui/                         shadcn/ui primitives (21 components)
    common/
      AppLayout.tsx             Root layout (sidebar + main + ToastProvider)
      AppSidebar.tsx            Navigation sidebar with faction selector
      QueryProvider.tsx         TanStack Query client configuration
  context/
    ActiveFactionContext.tsx    Selected faction — persists to localStorage + CSS var
  lib/
    utils.ts                    cn() helper (clsx + tailwind-merge)

src-tauri/
  src/
    lib.rs                      Tauri setup — plugin registration, SQL migrations, commands
    main.rs                     Binary entry point
  migrations/
    001_core_schema.sql         10 core tables (factions, units, paints, ...)
    002_seed_factions.sql       Seed data
    rules_001_rules_schema.sql  rules.db schema
    rules_002_wargear_abilities.sql  Wargear/abilities table
  tauri.conf.json               App config (name, window size, plugin preloads)
  Cargo.toml                    Rust dependencies

tests/                          Vitest test suites (mirroring src/features/ structure)
vitest.config.ts                Test configuration
vite.config.ts                  Vite bundler config
components.json                 shadcn/ui CLI config
```

---

## Coding Conventions

### TypeScript
- Strict mode (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- Path alias: `@/` maps to `src/` — always use this, never relative `../../`
- No ESLint or Prettier config — rely on TypeScript strict + code review

### React & State
- **React Query** is the primary data layer — all DB access goes through custom hooks
  in `src/hooks/`. Never call `getDb()` directly from a component.
- Query keys are constants defined at the top of each hook file (e.g., `UNITS_KEY`).
- Mutations call `queryClient.invalidateQueries()` for all related keys after success.
- React Context only for global UI state (active faction). Prefer React Query for data.
- Local component state (`useState`) for UI-only state (open/close dialogs, form input).

### Database
- All queries are in `src/db/queries/` — one file per entity.
- Use parameterized queries (`?` placeholders) — never string-interpolate user input.
- `hobbyforge.db`: enable FK constraints (`PRAGMA foreign_keys = ON` in client.ts).
- `rules.db`: WAL mode enabled for concurrent read/write during sync.
- New schema changes require a new numbered migration file in `src-tauri/migrations/`
  and a corresponding `Migration` entry in `lib.rs`.

### UI Components
- Use shadcn/ui components from `src/components/ui/` — do not add raw Radix primitives directly in features.
- Styling via **Tailwind CSS v4** utility classes. Use `cn()` from `src/lib/utils.ts` for conditional classes.
- Icons from **Lucide React** only.
- Toast notifications via `sonner` — import `toast` from `sonner`.
- Forms use **react-hook-form** + **zod** schemas for validation.

### Tauri
- Frontend-to-backend calls use `invoke(commandName, payload)` from `@tauri-apps/api/core`.
- HTTP requests (e.g., Wahapedia sync) go through `@tauri-apps/plugin-http`, not browser `fetch`, to bypass CORS.
- New Tauri commands must be registered in `lib.rs` under `.invoke_handler()`.

### File Naming
- React components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Query files: `camelCase.ts`
- Types: `camelCase.ts` (no `I` prefix on interfaces)

### Tests
- Test files live in `tests/` mirroring feature structure (e.g., `tests/collection/` for `features/units/`).
- Mock the Tauri SQL plugin — do not hit real SQLite in unit tests.
- Use `@testing-library/user-event` for interaction tests, not `fireEvent`.
