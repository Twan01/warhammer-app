## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Workflow

Follow GSD methodology. Start every session with /gsd:progress to get context on
the current phase and roadmap before doing any work.

---

## Project overview

**HobbyForge** — a Tauri 2 desktop app for managing a Warhammer hobby: miniature
collection, painting projects, paint inventory, army lists, battle logs, and spending.

- Stack: Tauri 2 + React 19 + TypeScript 5 + Vite 6 + TailwindCSS 4 + SQLite
- UI library: shadcn/ui (new-york style, zinc base color, CSS variables)
- State: React Query (server), Zustand (filters), React Context (faction/theme)
- Router: TanStack Router (`src/app/router.tsx`)
- Forms: React Hook Form + Zod
- Icons: Lucide React
- Two SQLite databases loaded at startup:
  - `hobbyforge.db` — all app data
  - `rules.db` — Wahapedia game rules (synced via CSV import)

---

## Commands

```
pnpm dev             # Vite dev server only (localhost:1420) — no Tauri window
pnpm tauri dev       # Full desktop app: Vite + Rust backend + Tauri window
pnpm build           # TypeScript check + Vite build (runs before tauri build)
pnpm tauri build     # Full production bundle
pnpm test            # Vitest run mode (single pass)
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
      ↓
React Query hooks  (src/hooks/use*.ts)
      ↓
Query modules  (src/db/queries/*.ts)
      ↓
DB client singleton  (src/db/client.ts)
      ↓
Tauri plugin-sql → SQLite (hobbyforge.db)
```

The rules database follows the same pattern via `src/db/rules-client.ts`.

The Rust backend (`src-tauri/src/lib.rs`) exposes one Tauri command:
`bulk_sync_rules` — bulk-inserts Wahapedia CSV data into rules.db in a single
transaction with FK checks disabled during the delete pass.

---

## Directory structure

```
src/
  app/              Page-level route components + router.tsx
  features/         Feature modules (one dir per domain)
  components/
    ui/             shadcn/ui primitives
    common/         App shell: AppLayout, AppSidebar, QueryProvider
  hooks/            React Query data hooks
  db/
    client.ts       Main DB singleton
    rules-client.ts Rules DB connection
    queries/        One .ts per entity (CRUD functions)
  types/            Shared TypeScript interfaces and const arrays
  context/          React Context providers (faction, theme)
  lib/              Pure utility functions (dates, currency, CSV parsing)
  styles/           globals.css (Tailwind + CSS custom properties)

src-tauri/
  src/lib.rs        Rust entry point + Tauri commands
  migrations/       SQL migration files (8 × hobbyforge.db, 2 × rules.db)
  tauri.conf.json   App config (id: com.hobbyforge.app, v0.2.6)

tests/              Mirrors src/ feature structure
  setup.ts          Global Vitest setup (jest-dom, polyfills)
```

Feature modules under `src/features/` follow a consistent layout:
- `entitySchema.ts` — Zod schema + inferred form type
- `EntitySheet.tsx` — create/edit form in a Sheet
- `EntityRow.tsx` / `EntityCard.tsx` — table row or card
- `EntityPage.tsx` / `Page.tsx` — page root with list + toolbar
- `applyEntityFilters.ts` — pure filter function
- `entityFilters.ts` — Zustand filter store (where needed)

---

## State management

| Layer | Tool | What it holds |
|---|---|---|
| Server/DB state | React Query | All SQLite-backed data |
| Filter/UI state | Zustand | Search text, dropdowns, toggles |
| Global app state | React Context | Active faction ID + accent color |
| Lightweight persistence | localStorage | Sidebar collapsed, view mode |

React Query defaults (set in `QueryProvider`):
- `staleTime`: 5 minutes
- `gcTime`: 10 minutes
- `refetchOnWindowFocus`: false
- `retry`: 1

---

## Key files

| File | Purpose |
|---|---|
| `src/db/client.ts` | SQLite singleton; sets `PRAGMA foreign_keys = ON` on every connection |
| `src/db/rules-client.ts` | rules.db connection (WAL mode, 10s busy timeout) |
| `src/db/queries/*.ts` | CRUD per entity; parameterized with `$1, $2` syntax |
| `src/hooks/use*.ts` | React Query hooks; each exports ENTITY_KEY + useEntity + mutations |
| `src/app/router.tsx` | TanStack Router route tree |
| `src/main.tsx` | React app entry point |
| `src-tauri/src/lib.rs` | Rust backend: Tauri plugins init + `bulk_sync_rules` command |
| `src-tauri/migrations/` | Auto-run SQL migrations (Tauri plugin-sql handles ordering) |
| `src-tauri/tauri.conf.json` | App identity, window size (1280×800 min 900×600), CSP off |

---

## Code conventions

**TypeScript types**
```ts
// Entity / CreateInput / UpdateInput pattern
export interface Faction { id: number; name: string; created_at: string; }
export type CreateFactionInput = Omit<Faction, "id" | "created_at" | "updated_at">;
export type UpdateFactionInput = Partial<CreateFactionInput> & { id: number };

// Const arrays for union types
export const PAINTING_STATUS_ORDER = ["Not Started", "Built", "Primed"] as const;
export type PaintingStatus = typeof PAINTING_STATUS_ORDER[number];
```

**Zod schemas** live in `src/features/FEATURE/entitySchema.ts`:
```ts
export const unitSchema = z.object({ name: z.string().min(1).max(120), ... });
export type UnitFormValues = z.infer<typeof unitSchema>;
```

**React Query hooks** — one hook file per entity:
```ts
export const FACTIONS_KEY = ["factions"] as const;
export const FACTION_KEY = (id: number) => ["factions", id] as const;
export function useFactions() { return useQuery({ queryKey: FACTIONS_KEY, queryFn: getFactions }); }
export function useCreateFaction() { /* useMutation + invalidate FACTIONS_KEY */ }
```

**Components** — named function exports, prop types inline:
```ts
export function FactionRow({ faction, onEdit }: { faction: Faction; onEdit: () => void }) { ... }
```

**Path alias**: `@/` resolves to `src/` (tsconfig + vite.config.ts).

**No ESLint or Prettier** — strict TypeScript (`noUnusedLocals`, `noUnusedParameters`)
enforces quality. Do not add a linter/formatter without discussing first.

---

## Database patterns

- Parameterized queries use `$1, $2` positional syntax (Tauri plugin-sql requirement)
- FK enforcement is OFF by default in SQLite; `client.ts` runs `PRAGMA foreign_keys = ON` immediately after every new connection
- Booleans are stored as `0 | 1` integers — cast on read, pass `? ? 1 : 0` on write
- Migrations run automatically at app start in filename order; never edit existing migration files
- FK violations throw and are caught at the component level with a toast notification
- `rules.db` is write-heavy during sync; WAL mode + `busy_timeout 10000` prevents lock contention

---

## Testing

- Framework: Vitest 4 + React Testing Library 16 (jsdom environment)
- Test location: `tests/` mirroring `src/features/` structure
- Global setup: `tests/setup.ts` registers jest-dom matchers and polyfills ResizeObserver + scrollIntoView
- Tauri APIs must be mocked in tests (no native bridge in jsdom)
- Prefer testing components in isolation; mock React Query hooks with `vi.mock`
