# HobbyForge

A Tauri 2 desktop app for managing a Warhammer hobby: miniature collection,
painting projects, paint inventory, army lists, battle logs, spending tracking,
wishlist, goals, and Wahapedia rules sync.

## Stack

- **Desktop shell:** Tauri 2 (Rust backend)
- **Frontend:** React 19 + TypeScript 5 + Vite 6
- **Styling:** TailwindCSS 4 + shadcn/ui (new-york style, zinc base, CSS variables)
- **State:** React Query (server), Zustand (filters), React Context (faction/theme)
- **Router:** TanStack Router
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React
- **Charts:** Recharts
- **Database:** Two SQLite databases via Tauri plugin-sql
  - `hobbyforge.db` — all app data (11 migrations)
  - `rules.db` — Wahapedia game rules synced via CSV import (2 migrations)

---

## Commands

```
pnpm dev             # Vite dev server only (localhost:1420) — no Tauri window
pnpm tauri dev       # Full desktop app: Vite + Rust backend + Tauri window
pnpm build           # TypeScript check + Vite build
pnpm tauri build     # Full production bundle
pnpm test            # Vitest single pass
pnpm test:watch      # Vitest watch mode
pnpm preview         # Preview Vite production build
```

Run a single test file:
```
pnpm test -- tests/collection/SomeFile.test.ts
```

---

## Architecture

Data flows top-to-bottom through four layers:

```
UI components  (src/features/**, src/app/**)
      |
React Query hooks  (src/hooks/use*.ts)
      |
Query modules  (src/db/queries/*.ts)
      |
DB client singleton  (src/db/client.ts | src/db/rules-client.ts)
      |
Tauri plugin-sql -> SQLite
```

The Rust backend (`src-tauri/src/lib.rs`) exposes one Tauri command:
`bulk_sync_rules` — bulk-inserts Wahapedia CSV data into rules.db in a single
transaction with FK checks disabled during the delete pass.

---

## Directory structure

```
src/
  app/              Page-level route components + router.tsx (12 routes)
  features/         Feature modules — one directory per domain (11 total):
                    army-lists, battle-log, dashboard, factions, goals,
                    painting-projects, paints, recipes, spending, units, wishlist
  components/
    ui/             shadcn/ui primitives (badge, button, card, chart, dialog,
                    drawer, form, input, select, sheet, table, tabs, etc.)
    common/         App shell: AppLayout, AppSidebar, QueryProvider, PageHeader
  hooks/            React Query data hooks (20+ files, one per entity)
  db/
    client.ts       hobbyforge.db singleton (PRAGMA foreign_keys = ON)
    rules-client.ts rules.db singleton (WAL mode, 10s busy timeout)
    queries/        One .ts per entity — parameterized CRUD functions
  types/            TypeScript interfaces and const arrays (13 type files)
  context/          React Context providers (ActiveFaction, QuickAdd)
  lib/              Pure utilities (dates, currency, CSV parsing, stripHtml)
  styles/           globals.css (Tailwind + CSS custom properties)

src-tauri/
  src/lib.rs        Rust entry point + bulk_sync_rules command
  migrations/       SQL migration files (13 total)
  tauri.conf.json   App config (id: com.hobbyforge.app, v0.2.6)

tests/              Mirrors src/features/ structure (~128 test files)
  setup.ts          Global Vitest setup (jest-dom, ResizeObserver polyfill)
```

Feature modules follow a consistent layout:
- `entitySchema.ts` — Zod schema + inferred form type
- `EntitySheet.tsx` — create/edit form in a Sheet
- `EntityRow.tsx` / `EntityCard.tsx` — table row or card
- `EntityPage.tsx` — page root with list + toolbar
- `applyEntityFilters.ts` — pure filter function
- `entityFilters.ts` — Zustand filter store

---

## Key files

| File | Purpose |
|---|---|
| `src/main.tsx` | React entry: QueryProvider > QuickAddProvider > RouterProvider |
| `src/app/router.tsx` | TanStack Router route tree (12 routes) |
| `src/db/client.ts` | hobbyforge.db singleton; sets PRAGMA foreign_keys = ON |
| `src/db/rules-client.ts` | rules.db singleton; WAL mode + 10s busy timeout |
| `src/db/queries/*.ts` | CRUD per entity; parameterized with $1, $2 syntax |
| `src/hooks/use*.ts` | React Query hooks; each exports ENTITY_KEY + queries + mutations |
| `src/context/ActiveFactionContext.tsx` | Runtime faction theme (CSS custom property mutation) |
| `src/context/QuickAddContext.tsx` | Quick-add modal state for sidebar actions |
| `src/lib/formatCurrency.ts` | GBP formatting; all prices stored as integer pence |
| `src/lib/utils.ts` | cn() — Tailwind class merge utility (clsx + tailwind-merge) |
| `src-tauri/src/lib.rs` | Rust: plugin init, migrations, bulk_sync_rules command |
| `src-tauri/tauri.conf.json` | Window 1280x800 min 900x600, CSP off, asset protocol enabled |
| `vitest.config.ts` | jsdom environment, verbose reporter, globals enabled |

---

## Code conventions

### TypeScript types (`src/types/*.ts`)

```ts
// Entity / CreateInput / UpdateInput pattern
export interface Paint { id: number; name: string; created_at: string; }
export type CreatePaintInput = Omit<Paint, "id" | "created_at" | "updated_at">;
export type UpdatePaintInput = Partial<CreatePaintInput> & { id: number };

// Union types from const arrays
export const PAINT_TYPES = ["Base", "Layer", "Contrast", "Shade"] as const;
export type PaintType = typeof PAINT_TYPES[number];
```

### Zod schemas (`src/features/FEATURE/entitySchema.ts`)

```ts
export const paintSchema = z.object({ name: z.string().min(1).max(80), ... });
export type PaintFormValues = z.infer<typeof paintSchema>;
```

Do NOT use `.default()` in Zod schemas — it breaks react-hook-form Resolver type
inference. Handle defaults in form defaultValues instead.

### React Query hooks (`src/hooks/use*.ts`)

```ts
export const PAINTS_KEY = ["paints"] as const;
export const PAINT_KEY = (id: number) => ["paints", id] as const;

export function usePaints() {
  return useQuery({ queryKey: PAINTS_KEY, queryFn: getPaints });
}

export function useCreatePaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPaint,
    onSuccess: () => qc.invalidateQueries({ queryKey: PAINTS_KEY }),
  });
}
```

React Query defaults (set in QueryProvider): staleTime 5min, gcTime 10min,
refetchOnWindowFocus false, retry 1.

### Components

Named function exports with inline prop types:
```ts
export function PaintRow({ paint, onEdit }: { paint: Paint; onEdit: () => void }) {}
```

### Path alias

`@/` resolves to `src/` (tsconfig + vite.config.ts).

### No ESLint or Prettier

Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`) enforces quality.

---

## Database patterns

- Parameterized queries use `$1, $2` positional syntax (Tauri plugin-sql requirement)
- FK enforcement is OFF by default in SQLite; `client.ts` runs `PRAGMA foreign_keys = ON`
  after every new connection
- Booleans stored as `0 | 1` integers — cast on read, pass `? 1 : 0` on write
- Migrations run automatically at app start in filename order; never edit existing files
- Dynamic IN clauses: build placeholder string `$1, $2, ...` from array length
- COALESCE for partial updates; direct assignment for clearable nullable fields
- SQL JOINs with computed columns to avoid N+1 queries
- `rules.db` uses WAL mode + `busy_timeout 10000` for write-heavy sync operations

---

## State management

| Layer | Tool | What it holds |
|---|---|---|
| Server/DB state | React Query | All SQLite-backed data |
| Filter/UI state | Zustand | Search text, dropdowns, toggles (ephemeral, cleared on unmount) |
| Global app state | React Context | Active faction ID + accent color, quick-add modal |
| Lightweight persistence | localStorage | Sidebar collapsed, view mode, active faction |

---

## Testing

- **Framework:** Vitest 4 + React Testing Library 16 (jsdom environment)
- **Location:** `tests/` mirroring `src/features/` structure (~128 test files)
- **Setup:** `tests/setup.ts` — jest-dom matchers, ResizeObserver + scrollIntoView polyfills
- **Tauri APIs must be mocked** in tests (no native bridge in jsdom)
- **Pattern:** Mock React Query hooks with `vi.mock`; test components in isolation
- **Config:** `vitest.config.ts` — globals enabled, verbose reporter

---

## Styling

- TailwindCSS 4 with `@theme inline` for utility generation
- HSL-based CSS custom properties for color tokens (light/dark mode via `.dark` class)
- Runtime-mutable `--faction-accent` CSS variable for per-faction theming
- Font: Geist Variable (via @fontsource-variable/geist)
- shadcn/ui components in `src/components/ui/` (new-york style, zinc base color)
- Class merging via `cn()` utility (clsx + tailwind-merge)
