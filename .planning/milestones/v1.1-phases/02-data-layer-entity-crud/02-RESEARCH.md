# Phase 2: Data Layer + Entity CRUD - Research

**Researched:** 2026-04-30
**Domain:** SQLite schema + migrations (tauri-plugin-sql), TypeScript typed queries, TanStack Query CRUD hooks, React form UI (react-hook-form + zod + shadcn)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Unit form structure**
- Two-step layout: required fields always visible at top, optional fields in a collapsible "More details" section at the bottom — all inside a Sheet
- Required (always shown): name, faction (dropdown), category (combobox with suggestions)
- Optional (collapsible): all status fields (painting_status, painting_percentage, status_assembly, status_basing, status_varnished, is_active_project, priority, target_completion_date), counts (model_count, owned_count), points, purchase_date, purchase_price, storage_location, main_image_path, notes
- `painting_status` displays as a shadcn Select dropdown in PAINTING_STATUS_ORDER order
- Same Sheet component used for both create and edit; `key={unit.id}` prevents stale state on re-open

**Paint management surface**
- Minimal Paints page (accessible from sidebar nav) — not a placeholder, but not the full inventory UI
- List shows: name, brand, paint_type, owned badge — no running-low or wishlist columns in Phase 2
- "Add paint" button opens a Sheet with the full PAINT-01 field set
- Edit and delete from each row
- Full inventory features (filters, running-low view, wishlist) come in Phase 4

**Faction color picker**
- Native `<input type="color">` in the faction form, with a live preview swatch next to it
- Color stored as hex string (e.g., `#4A90D9`)
- Color accent on the faction list: 4px left border strip on each faction card via inline `style={{ borderLeftColor: faction.color_theme }}`
- The accent pattern scoped to Faction page only in Phase 2

**FK error UX**
- FK violations surface as Sonner toasts
- Toast messages: "Cannot delete faction — it still has units assigned." / "Cannot delete paint — it's used in a recipe step."
- Delete confirm dialog closes normally; toast appears immediately after failed mutation
- Consistent with POLISH-03

### Claude's Discretion
- Exact field ordering within the collapsible section of the unit form
- Sheet width (standard shadcn Sheet size)
- Toast duration and variant (error/destructive styling via Sonner)
- Loading skeleton design for lists while data fetches

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope

### Additional Locked Decisions (from REQUIREMENTS.md + STATE.md)
- Seed data uses REAL GW faction names: Tau Empire, Ultramarines, Necrons, Tyranids — with README disclaimer (SEED-06)
- `model_instances` table is NOT created (DATA-04)
- Prisma and Drizzle at runtime are EXCLUDED — tauri-plugin-sql directly is the path
- No ORM; raw typed query functions are the correct approach for v1
- DATA-01 and DATA-02 (getDb() singleton + FK pragma) are ALREADY IMPLEMENTED in `src/db/client.ts` — do not re-implement

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | `getDb()` singleton calling `Database.load('sqlite:hobbyforge.db')` once | ALREADY DONE — `src/db/client.ts` verified |
| DATA-02 | `getDb()` runs `PRAGMA foreign_keys = ON` immediately after first load | ALREADY DONE — verified in `src/db/client.ts` line 28 |
| DATA-03 | All 10 tables in single first migration `001_core_schema.sql` | Migration via tauri-plugin-sql `Migration` struct + `include_str!()` pattern |
| DATA-04 | `model_instances` table NOT created | Enforced by schema authorship; verified via `sqlite_master` query |
| DATA-05 | Migrations append-only, numbered, managed by tauri-plugin-sql's built-in runner; SQL files under `src-tauri/migrations/` loaded via `include_str!()` | `lib.rs` `get_migrations()` already wired; needs SQL files and `include_str!()` calls |
| DATA-06 | TypeScript types for every entity in `src/types/` in sync with SQL schema | Hand-authored TS interfaces matching column names exactly; no codegen needed |
| DATA-07 | Each entity has query module under `src/db/queries/<entity>.ts` | `src/db/queries/` directory exists (`.gitkeep` only); pattern: import `getDb()`, export typed async functions |
| DATA-08 | Each entity has TanStack Query hooks module under `src/hooks/use<Entity>.ts` | TanStack Query 5.100.6 installed; `useQuery` + `useMutation` + `useQueryClient` pattern |
| DATA-09 | Mutations invalidate correct query keys | `queryClient.invalidateQueries({ queryKey: [...] })` in `onSuccess` of `useMutation` |
| FACT-01 | Create faction: name, game_system, description, color_theme, icon_path | SQL INSERT + react-hook-form + zod schema |
| FACT-02 | Edit any faction field | SQL UPDATE + same form sheet |
| FACT-03 | Delete faction; FK blocks if units exist | SQLite FK enforcement already active; catch error pattern for FK violations |
| FACT-04 | List all factions | SQL SELECT + useQuery |
| FACT-05 | color_theme visible accent (sidebar badge, card border) | `style={{ borderLeftColor: faction.color_theme }}` with `border-l-[4px]` on list rows |
| UNIT-01 | Create unit with faction, name, category (combobox), unit_type, model_count, owned_count, points | Command + Popover combobox from installed shadcn components |
| UNIT-02 | Unit status fields: status_assembly, status_painting (enum), painting_percentage, status_basing, status_varnished, is_active_project, priority, target_completion_date | Stored as INTEGER (booleans) and TEXT (enum) in SQLite |
| UNIT-03 | Unit stores: purchase_date, purchase_price, storage_location, main_image_path, notes | All VARCHAR/TEXT columns |
| UNIT-04 | Edit any unit field | Reuse same Sheet form, seeded with existing values |
| UNIT-05 | Delete unit with confirmation modal | Dialog component + delete mutation |
| UNIT-06 | `PAINTING_STATUS_ORDER` constant in `src/types/` | Exported const array defining status workflow order |
| PAINT-01 | Create paint with all fields: brand, name, paint_type, color_family, hex_color, owned, quantity, running_low, wishlist, notes | Full field set in Sheet form |
| PAINT-02 | Edit and delete paints; FK from recipe_paints blocks delete | Same FK error catch pattern as factions |
| SEED-01 | Seed factions: Tau Empire, Ultramarines, Necrons, Tyranids | `002_seed_factions.sql` with `INSERT OR IGNORE` |
| SEED-02 | Seed units: Tau Fire Warriors, Crisis Battlesuits, Commander in Battlesuit, Necron Warriors, Ultramarines Intercessors | `003_seed_data.sql` units section |
| SEED-03 | Seed paints: Citadel Abaddon Black, White Scar, Nuln Oil, Leadbelcher, Macragge Blue, Retributor Armour | `003_seed_data.sql` paints section |
| SEED-04 | Seed recipes: Tau White Armor, Ultramarines Blue Armor, Necron Ancient Metal — with paint linkages | `003_seed_data.sql` recipes + recipe_paints |
| SEED-05 | Seed uses `INSERT OR IGNORE` with stable IDs for idempotency | SQL pattern: `INSERT OR IGNORE INTO ... VALUES (1, ...)` |
| SEED-06 | README documents personal-use, no-redistribution disclaimer | Plain text addition to README.md |

</phase_requirements>

---

## Summary

Phase 2 builds everything below the UI in one coherent stack: SQLite schema + Rust migration wiring, TypeScript types, typed query functions, TanStack Query hooks, and three entity CRUD surfaces (Factions complete, Units form, Paints minimal). The heavy lifting is already scaffolded — `getDb()` singleton with FK pragma is done, the migration system is wired in `lib.rs` with an empty `get_migrations()` function waiting to be populated, and all shadcn UI components are installed. Phase 2 work is additive: fill in SQL files, fill in the TS type/query/hook layers, and build three feature pages.

The critical architectural insight is that tauri-plugin-sql uses a `Migration` struct in Rust (not file-system scanning) — SQL content is embedded via `include_str!()` macro at compile time. This means SQL files live in `src-tauri/migrations/` and are referenced from `lib.rs`. There is no runtime file loading. Every SQL change requires a Rust recompile.

FK errors from SQLite surface as opaque string errors in the JS layer (the error message contains the SQLite constraint violation text). The catch pattern must inspect `error.toString()` or `(error as Error).message` for "FOREIGN KEY constraint failed" to distinguish FK errors from other DB errors.

**Primary recommendation:** Follow the 4-plan breakdown exactly: (1) SQL schema + Rust wiring, (2) seed migrations + TS types + query/hook layers, (3) Faction CRUD UI, (4) Unit form + Paint CRUD UI. This ordering ensures each plan is independently verifiable and no plan depends on work from a later plan.

---

## Standard Stack

### Core (all already installed — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/plugin-sql` | 2.4.0 | SQLite access from JS via Tauri IPC | Only supported path — Prisma/Drizzle excluded by project decision |
| `@tanstack/react-query` | 5.100.6 | Server-state caching, query invalidation | Already installed + configured in QueryProvider |
| `react-hook-form` | 7.74.0 | Form state management | Already installed; shadcn Form components wrap it |
| `zod` | 4.4.1 | Schema validation + TypeScript inference | Already installed; `@hookform/resolvers/zod` bridges it to RHF |
| `@hookform/resolvers` | 5.2.2 | Bridge zod → react-hook-form | Already installed |
| `sonner` | 2.0.7 | Toast notifications | Already installed + wired in AppLayout |

### Supporting (shadcn UI components — all installed Phase 1)

| Component | File | Used For |
|-----------|------|---------|
| `Sheet` | `components/ui/sheet.tsx` | All add/edit forms |
| `Dialog` | `components/ui/dialog.tsx` | Delete confirm modals |
| `Form` + `Input` | `components/ui/form.tsx`, `input.tsx` | Form fields with validation |
| `Select` | `components/ui/select.tsx` | Faction dropdown, painting_status, paint_type |
| `Command` + `Popover` | `components/ui/command.tsx`, `popover.tsx` | Category combobox (free-text + suggestions) |
| `Table` | `components/ui/table.tsx` | Faction list, Paints list |
| `Badge` | `components/ui/badge.tsx` | Owned/not-owned on paints list |
| `Skeleton` | `components/ui/skeleton.tsx` | Loading states (3 rows while `isLoading`) |
| `Separator` | `components/ui/separator.tsx` | Unit form "More details" collapsible divider |

**No new npm installs needed for Phase 2.**

---

## Architecture Patterns

### Recommended Project Structure for Phase 2

```
src-tauri/
├── migrations/
│   ├── 001_core_schema.sql   # All 10 tables, FK constraints
│   ├── 002_seed_factions.sql  # Tau Empire, Ultramarines, Necrons, Tyranids
│   └── 003_seed_data.sql      # Sample units, paints, recipes, recipe_paints
├── src/
│   └── lib.rs                 # get_migrations() populated with Migration structs

src/
├── types/
│   ├── faction.ts             # Faction interface + insert type
│   ├── unit.ts                # Unit interface + PAINTING_STATUS_ORDER constant
│   ├── paint.ts               # Paint interface + PAINT_TYPE values
│   ├── recipe.ts              # PaintingRecipe interface
│   └── recipePaint.ts         # RecipePaint interface
├── db/
│   └── queries/
│       ├── factions.ts        # getFactions, createFaction, updateFaction, deleteFaction
│       ├── units.ts           # getUnits, createUnit, updateUnit, deleteUnit
│       ├── paints.ts          # getPaints, createPaint, updatePaint, deletePaint
│       ├── recipes.ts         # getRecipes, createRecipe, updateRecipe, deleteRecipe
│       └── recipePaints.ts    # getRecipePaints, addRecipePaint, removeRecipePaint
├── hooks/
│   ├── useFactions.ts         # useFactions, useCreateFaction, useUpdateFaction, useDeleteFaction
│   ├── useUnits.ts            # useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit
│   ├── usePaints.ts           # usePaints, useCreatePaint, useUpdatePaint, useDeletePaint
│   ├── useRecipes.ts          # useRecipes, useCreateRecipe, ...
│   └── useRecipePaints.ts     # useRecipePaints, useAddRecipePaint, ...
└── features/
    ├── factions/
    │   ├── FactionsPage.tsx       # List + header + empty state
    │   ├── FactionSheet.tsx       # Add/edit form in Sheet
    │   ├── FactionDeleteDialog.tsx # Delete confirm modal
    │   └── FactionRow.tsx          # Single row with color accent
    ├── units/                      # Unit form used inside Factions page Phase 2
    │   └── UnitSheet.tsx           # Full two-step form
    └── paints/
        ├── PaintsPage.tsx
        ├── PaintSheet.tsx
        └── PaintDeleteDialog.tsx
```

### Pattern 1: Migration Registration (Rust)

**What:** SQL migrations are embedded at compile time via `include_str!()` and registered as `Migration` structs in `get_migrations()`. The plugin runner tracks applied migrations in `_sqlx_migrations` table.

**When to use:** Every new SQL migration file.

```rust
// src-tauri/src/lib.rs
use tauri_plugin_sql::{Migration, MigrationKind};

fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "core_schema",
            sql: include_str!("../migrations/001_core_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_factions",
            sql: include_str!("../migrations/002_seed_factions.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "seed_data",
            sql: include_str!("../migrations/003_seed_data.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
```

**Critical detail:** Version numbers are integers. The plugin uses them to determine what has already run. Once a migration is applied to a DB file, it cannot be re-run — only new higher-version migrations are applied. This is why migrations must be append-only.

### Pattern 2: Typed Query Module

**What:** Each entity query module imports `getDb()`, executes SQL via `.select<T[]>()` or `.execute()`, and returns typed results. No raw queries outside `src/db/queries/`.

```typescript
// src/db/queries/factions.ts
import { getDb } from "@/db/client";
import type { Faction, CreateFactionInput } from "@/types/faction";

export async function getFactions(): Promise<Faction[]> {
  const db = await getDb();
  return db.select<Faction[]>("SELECT * FROM factions ORDER BY name ASC");
}

export async function createFaction(input: CreateFactionInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO factions (name, game_system, description, color_theme, icon_path)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.name, input.game_system, input.description, input.color_theme, input.icon_path]
  );
}

export async function deleteFaction(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM factions WHERE id = $1", [id]);
  // FK error throws — caller (hook) must catch and inspect message
}
```

**API note:** `db.select<T>()` returns `T` directly (no `.rows` property). `db.execute()` returns `QueryResult` with `rowsAffected` and `lastInsertId`. Parameters use `$1`, `$2`, ... positional syntax (not `:name` syntax).

### Pattern 3: TanStack Query Hook

**What:** Each hook module wraps query functions with `useQuery`/`useMutation` and handles cache invalidation.

```typescript
// src/hooks/useFactions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFactions, createFaction, updateFaction, deleteFaction } from "@/db/queries/factions";
import type { CreateFactionInput, UpdateFactionInput } from "@/types/faction";

const FACTIONS_KEY = ["factions"] as const;

export function useFactions() {
  return useQuery({
    queryKey: FACTIONS_KEY,
    queryFn: getFactions,
  });
}

export function useCreateFaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: FACTIONS_KEY }),
  });
}

export function useDeleteFaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: FACTIONS_KEY }),
    // Note: onSuccess only fires on non-error; FK errors reject the promise
  });
}
```

### Pattern 4: FK Error Detection in Mutation

**What:** SQLite FK violations throw an error whose message contains "FOREIGN KEY constraint failed". Components must catch this and route to a Sonner toast, not a generic error display.

```typescript
// In component calling delete mutation
const deleteMutation = useDeleteFaction();

async function handleDeleteConfirm() {
  try {
    await deleteMutation.mutateAsync(faction.id);
    // success: dialog already closed, optionally show success toast
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    if (message.includes("FOREIGN KEY constraint failed")) {
      toast.error("Cannot delete faction — it still has units assigned.");
    } else {
      toast.error("Something went wrong. Please try again.");
    }
  }
}
```

**Alternative approach:** Let `useMutation`'s `onError` callback handle it, reading `error.message`. Both are valid; the try/catch in the component handler is more predictable for controlled dialog close.

### Pattern 5: Combobox (Free-text + Suggestions)

**What:** The unit category field allows free-text input AND shows predefined suggestions. Built with shadcn `Command` + `Popover`.

```typescript
// Core pattern: controlled open state, input as the "search", free-text allowed
const CATEGORY_SUGGESTIONS = [
  "HQ/Leader", "Battleline", "Infantry", "Elite",
  "Vehicle", "Monster", "Transport", "Character",
  "Dedicated Transport", "Other"
];

// User can type anything; suggestions filter as they type.
// On selection OR on blur with typed value, setValue("category", inputValue)
```

### Pattern 6: react-hook-form + zod + shadcn Form

**What:** Standard pattern for all Phase 2 forms. Zod schema defines validation, `useForm` manages state, `FormField`/`FormItem`/`FormControl` handle wiring.

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const factionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  game_system: z.string().default("Warhammer 40K"),
  description: z.string().optional(),
  color_theme: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#4A90D9"),
  icon_path: z.string().optional(),
});

type FactionFormValues = z.infer<typeof factionSchema>;

// In component:
const form = useForm<FactionFormValues>({
  resolver: zodResolver(factionSchema),
  defaultValues: faction ?? { game_system: "Warhammer 40K", color_theme: "#4A90D9" },
});
```

**Critical:** `key={faction?.id ?? "new"}` on the form root (or Sheet containing the form) to reset all fields when switching between create and edit modes.

### Pattern 7: Route Addition for Factions Page

**What:** `/factions` route does not yet exist in `router.tsx`. It must be added as a `createRoute` entry. The sidebar already links to `/collection` (units) and `/paints` — but Factions page needs its own route.

```typescript
// src/app/router.tsx — add:
import { FactionsPage } from "@/features/factions/FactionsPage";

const factionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/factions",
  component: FactionsPage,
});

// Add to routeTree.addChildren([..., factionsRoute, ...])
```

**Note:** Sidebar has no Factions nav entry currently. The planner must decide: add a Factions sidebar entry, or access Factions from within another page. Given FACT-04 (list factions) is a required feature, a dedicated route + sidebar entry is the natural approach.

### Anti-Patterns to Avoid

- **Calling `getDb()` outside `src/db/queries/`:** Only query modules may touch the DB client. Components and hooks call query functions, never `getDb()` directly.
- **Re-implementing `Database.load()` anywhere:** `getDb()` singleton in `client.ts` is the only allowed caller.
- **Using `:name` parameter syntax in SQL:** tauri-plugin-sql uses `$1`, `$2`, ... positional parameters only.
- **Assuming boolean columns are JS booleans:** SQLite stores booleans as 0/1 INTEGER. TypeScript types should use `boolean` but queries return numbers — coerce explicitly: `!!row.status_assembly`.
- **Using `db.select()` for INSERT/UPDATE/DELETE:** Use `db.execute()` for mutations, `db.select<T[]>()` for queries.
- **Re-running existing migrations:** Once `_sqlx_migrations` records a version, it never re-runs. Bug fixes to schema require a new migration version, not editing existing SQL files.
- **Including `model_instances` in the schema:** Explicitly forbidden by DATA-04. The table must not appear anywhere in the SQL files.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | `zod` + `@hookform/resolvers` | Edge cases (coercion, async validation, per-field error messages) are pre-solved |
| Form state management | `useState` per field | `react-hook-form` | Dirty state, touched tracking, submit handling all free |
| Server state caching | `useState` + manual fetch | TanStack Query `useQuery` | Stale detection, background refresh, deduplication |
| Cache invalidation | `useState` reload triggers | `queryClient.invalidateQueries()` | Precise key-scoped invalidation, avoids over-fetching |
| Toast notifications | Custom toast component | `sonner` via installed Toaster | Already wired in AppLayout; just call `toast.error()` / `toast.success()` |
| Delete confirm modal | Custom confirm component | shadcn `Dialog` | Already installed; consistent keyboard/focus behavior |
| Combobox | Custom dropdown+input | shadcn `Command` + `Popover` | ARIA compliance, keyboard nav, already installed |

**Key insight:** All UI primitives and form infrastructure are already installed from Phase 1. Phase 2 is exclusively about wiring data — not installing or building new UI infrastructure.

---

## Common Pitfalls

### Pitfall 1: SQLite Boolean Coercion
**What goes wrong:** `status_assembly` and other boolean columns come back from `db.select()` as `0` or `1` (INTEGER), not `true`/`false`. TypeScript type says `boolean` but runtime value is a number — conditional `if (unit.status_assembly)` works (truthy/falsy) but strict equality `=== true` fails.
**Why it happens:** SQLite has no native boolean type; tauri-plugin-sql doesn't coerce INTEGER → boolean.
**How to avoid:** In TypeScript types, type boolean columns as `0 | 1` OR coerce explicitly when reading: `const isAssembled = !!unit.status_assembly`. For form defaults, use `!!` coercion. For SQL INSERTs, pass `input.status_assembly ? 1 : 0`.
**Warning signs:** Unit form checkboxes show wrong checked state on edit.

### Pitfall 2: Migration Version Collision
**What goes wrong:** Two migrations with the same `version` integer — plugin panics or silently skips one.
**Why it happens:** Copy-paste error when adding migration 3 after migration 2.
**How to avoid:** Version numbers are 1, 2, 3 — strictly sequential, no gaps, no duplicates. Verify in `lib.rs` before compiling.
**Warning signs:** App panics on launch with a migration error; check `version` fields in `get_migrations()`.

### Pitfall 3: Stale Form State on Sheet Re-open
**What goes wrong:** Opening the edit sheet for faction A, closing without saving, then opening for faction B — the form still shows faction A's data.
**Why it happens:** React component is reused; `useForm` defaults are only applied on first render.
**How to avoid:** `key={faction.id}` on the Sheet (or the form root inside it) forces a fresh component mount. This is a CONTEXT.md locked decision — enforce it on ALL entity sheets.
**Warning signs:** Edit form shows previous entity's data after switching entities.

### Pitfall 4: FK Error Message Variation
**What goes wrong:** The FK error toast never triggers because the error message text doesn't match the detection string.
**Why it happens:** tauri-plugin-sql wraps the SQLite error; the exact message format may vary between versions. Assuming `"FOREIGN KEY constraint failed"` exact match may miss edge cases.
**How to avoid:** Use `.toLowerCase().includes("foreign key")` for the detection check — case-insensitive, partial match is more resilient.
**Warning signs:** Deleting a faction with units succeeds silently (FK not enforced) OR throws generic error instead of specific toast.

### Pitfall 5: Seed Data Idempotency Failure
**What goes wrong:** Re-launching the app after seed migration has already run causes duplicate rows or errors.
**Why it happens:** Plain `INSERT` fails on the second run because the `_sqlx_migrations` table prevents re-running — but if the DB file is wiped and recreated, seed runs again. Without `INSERT OR IGNORE`, PK conflicts fail.
**How to avoid:** All seed SQL uses `INSERT OR IGNORE INTO ... VALUES (1, ...)` with explicit stable integer IDs (1, 2, 3, 4 for factions; 1-5 for units; etc.).
**Warning signs:** App launch fails with "UNIQUE constraint failed" on seed migration.

### Pitfall 6: Missing `/factions` Route + Sidebar Entry
**What goes wrong:** FactionsPage is built but unreachable — no route defined and no sidebar nav entry.
**Why it happens:** The existing router.tsx has Collection (/collection) and Paints (/paints) but no /factions route. The sidebar has no Factions entry.
**How to avoid:** Phase 2 plan must explicitly add `/factions` route to `router.tsx` AND add a Factions nav entry to `AppSidebar.tsx`.
**Warning signs:** Navigating to `/factions` shows a 404/not-found state.

### Pitfall 7: Query Key Invalidation Mismatch
**What goes wrong:** Creating a faction doesn't update the factions list — the list shows stale data until page reload.
**Why it happens:** The `queryKey` used in `invalidateQueries` doesn't match the `queryKey` used in `useQuery`. Even a minor difference (array vs string, different order) causes a cache miss.
**How to avoid:** Export query key constants from the hook file and import them everywhere: `export const FACTIONS_KEY = ["factions"] as const`. Never hardcode the key string in two places.
**Warning signs:** List doesn't update after mutation; React Query DevTools shows the old cached data still fresh.

### Pitfall 8: Zod v4 API Differences
**What goes wrong:** Code copied from older zod examples fails (e.g., `z.string().nonempty()`, import from "zod/v4").
**Why it happens:** Project uses zod 4.4.1. Zod v4 removed some v3 methods and changed some API signatures. The package.json shows `"zod": "^4.4.1"`.
**How to avoid:** Use `z.string().min(1, "Required")` not `.nonempty()`. For optional fields: `z.string().optional()` or `z.string().nullish()`. Do not use `z.object().passthrough()` style.
**Warning signs:** TypeScript errors on zod schema methods; runtime validation behaving unexpectedly.

---

## Code Examples

### SQL Schema Pattern (SQLite with FK constraints)

```sql
-- 001_core_schema.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS factions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    game_system TEXT    NOT NULL DEFAULT 'Warhammer 40K',
    description TEXT,
    color_theme TEXT    NOT NULL DEFAULT '#4A90D9',
    icon_path   TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS units (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    faction_id            INTEGER NOT NULL REFERENCES factions(id) ON DELETE RESTRICT,
    name                  TEXT    NOT NULL,
    category              TEXT,
    unit_type             TEXT,
    model_count           INTEGER,
    owned_count           INTEGER,
    points                INTEGER,
    -- Status fields
    status_assembly       INTEGER NOT NULL DEFAULT 0,  -- boolean: 0/1
    status_painting       TEXT    NOT NULL DEFAULT 'Not Started',
    painting_percentage   INTEGER NOT NULL DEFAULT 0,
    status_basing         INTEGER NOT NULL DEFAULT 0,
    status_varnished      INTEGER NOT NULL DEFAULT 0,
    is_active_project     INTEGER NOT NULL DEFAULT 0,
    priority              INTEGER,
    target_completion_date TEXT,
    -- Purchase metadata
    purchase_date         TEXT,
    purchase_price        REAL,
    storage_location      TEXT,
    main_image_path       TEXT,
    notes                 TEXT,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Additional tables: paints, painting_recipes, recipe_paints,
-- army_lists, army_list_units, unit_strategy_notes, battle_logs, image_assets
-- All use REFERENCES with ON DELETE RESTRICT for FK enforcement
```

### Seed SQL Pattern

```sql
-- 002_seed_factions.sql
INSERT OR IGNORE INTO factions (id, name, game_system, color_theme) VALUES
(1, 'Tau Empire',    'Warhammer 40K', '#4A9CD4'),
(2, 'Ultramarines',  'Warhammer 40K', '#1B4FA8'),
(3, 'Necrons',       'Warhammer 40K', '#3DAA5C'),
(4, 'Tyranids',      'Warhammer 40K', '#8B2FC9');
```

### TypeScript Type Pattern

```typescript
// src/types/faction.ts
export interface Faction {
  id: number;
  name: string;
  game_system: string;
  description: string | null;
  color_theme: string;
  icon_path: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateFactionInput = Omit<Faction, "id" | "created_at" | "updated_at">;
export type UpdateFactionInput = Partial<CreateFactionInput> & { id: number };
```

```typescript
// src/types/unit.ts
export const PAINTING_STATUS_ORDER = [
  "Not Started",
  "Built",
  "Primed",
  "Basecoated",
  "Shaded",
  "Layered",
  "Highlighted",
  "Details Done",
  "Based",
  "Varnished",
  "Completed",
] as const;

export type PaintingStatus = typeof PAINTING_STATUS_ORDER[number];

export interface Unit {
  id: number;
  faction_id: number;
  name: string;
  category: string | null;
  unit_type: string | null;
  model_count: number | null;
  owned_count: number | null;
  points: number | null;
  status_assembly: 0 | 1;        // SQLite INTEGER boolean
  status_painting: PaintingStatus;
  painting_percentage: number;
  status_basing: 0 | 1;
  status_varnished: 0 | 1;
  is_active_project: 0 | 1;
  priority: number | null;
  target_completion_date: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  storage_location: string | null;
  main_image_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

### Faction List Row with Color Accent

```tsx
// 4px left border strip using faction.color_theme (CONTEXT.md locked decision)
<TableRow
  key={faction.id}
  style={{ borderLeft: `4px solid ${faction.color_theme}` }}
  className="border-l-[4px]"
>
  <TableCell>{faction.name}</TableCell>
  <TableCell>{faction.game_system}</TableCell>
  <TableCell>
    {/* Edit + Delete action buttons */}
  </TableCell>
</TableRow>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `z.string().nonempty()` | `z.string().min(1, "msg")` | Zod v4 | `.nonempty()` removed in v4; use `.min(1)` |
| `@hookform/resolvers` v3 API | v5.2.2 API | Breaking update | Same usage; `zodResolver(schema)` unchanged |
| TanStack Query `onSuccess` in `useQuery` | Removed in v5 | TQ v5 | `onSuccess` callback no longer valid in `useQuery` options; use in `useMutation` only or side-effect via `useEffect` |
| Zod `import { z } from "zod"` | Same | — | No change; standard import still valid in v4 |

**Deprecated/outdated:**
- `useQuery({ onSuccess })` callback: Removed in TanStack Query v5. Use `useMutation({ onSuccess })` for mutations (correct), or `useEffect` watching `data` for query side effects.
- `z.string().nonempty()`: Removed in Zod v4. Replaced by `.min(1)`.
- Named SQL parameters (`:name`): tauri-plugin-sql uses `$1`, `$2` positional parameters only.

---

## Open Questions

1. **Factions sidebar nav entry**
   - What we know: AppSidebar.tsx has no Factions entry; `/factions` route doesn't exist
   - What's unclear: Should Factions be a top-level nav entry, or accessed from a different flow? The ROADMAP and REQUIREMENTS don't specify sidebar position for Factions
   - Recommendation: Add "Factions" as a top-level sidebar entry between Dashboard and Collection; it's a first-class entity. Planner should make this explicit in 02-03 plan.

2. **Unit form in Phase 2 — which page does it live on?**
   - What we know: CONTEXT.md says "Unit CRUD UI (form)" is Phase 2; ROADMAP plan 02-04 covers "Unit CRUD UI"; UI-SPEC says unit Sheet is "used from Factions page in Phase 2"
   - What's unclear: Is there a Collection page with unit list in Phase 2, or just the add/edit Sheet accessible from the Factions page?
   - Recommendation: Phase 2 collection page remains a placeholder (Phase 3 work per ROADMAP); the unit Sheet is accessible from the Factions page detail view or a dedicated "Units" list page. Planner should clarify the entry point for the unit Sheet.

3. **`updated_at` trigger vs application-level update**
   - What we know: SQLite doesn't have `ON UPDATE` triggers by default; the schema must either use a trigger or the application must set `updated_at = datetime('now')` on every UPDATE
   - What's unclear: Which approach is expected?
   - Recommendation: Use application-level `updated_at` in UPDATE SQL for simplicity: `UPDATE units SET ..., updated_at = datetime('now') WHERE id = $N`. No trigger needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test config files or test directories found |
| Config file | None — Wave 0 gap |
| Quick run command | TBD (no framework) |
| Full suite command | TBD (no framework) |

**Note:** No test infrastructure exists in the project. Given this is a Tauri desktop app with SQLite queries running in the Tauri WebView context, standard unit testing of DB query functions is not straightforward — `getDb()` requires the Tauri runtime. Integration testing requires the running app. The most practical "test" for this phase is the manual human-verify checkpoint against the 5 success criteria.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | `getDb()` singleton returns same instance | manual-only | N/A — requires Tauri runtime | ❌ |
| DATA-02 | FK pragma active — delete faction with units throws error | manual-only | N/A — requires running app | ❌ |
| DATA-03 | All 10 tables exist in schema | manual-only | Query `sqlite_master` in app | ❌ |
| DATA-04 | `model_instances` table absent | manual-only | Query `sqlite_master` | ❌ |
| DATA-05 | Migrations applied once, idempotent | manual-only | Restart app, verify no error | ❌ |
| FACT-03 | FK blocks faction delete when units exist | manual-only | Create faction + unit → delete faction → observe toast | ❌ |
| SEED-05 | INSERT OR IGNORE idempotency | manual-only | Wipe DB, restart twice, verify no error | ❌ |

**Justification for manual-only:** All DB behavior requires the Tauri IPC bridge which only exists in the running app. There is no way to unit-test `db.execute()` calls in a Node.js/Vitest environment without mocking the entire Tauri plugin. The human-verify checkpoint is the correct quality gate for this phase.

### Sampling Rate
- **Per task commit:** Manual smoke test — launch app, verify affected feature works
- **Per wave merge:** Full success criteria checklist from ROADMAP Phase 2
- **Phase gate:** All 5 success criteria TRUE before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] No test framework installed — manual verification is the documented approach for this phase
- [ ] No `src-tauri/migrations/` directory — must be created in Plan 02-01

*(Manual-only justification: Tauri IPC bridge prevents unit testing of DB queries outside the running app context)*

---

## Sources

### Primary (HIGH confidence)
- `src/db/client.ts` — confirms DATA-01/02 already implemented; getDb() singleton + FK pragma pattern
- `src-tauri/src/lib.rs` — confirms `get_migrations()` wired with empty vec; Migration struct import present
- `src-tauri/Cargo.lock` — confirms tauri-plugin-sql 2.4.0 installed
- `package.json` — confirms all JS dependencies installed: TanStack Query 5.100.6, react-hook-form 7.74.0, zod 4.4.1, @hookform/resolvers 5.2.2, sonner 2.0.7
- `.planning/phases/02-data-layer-entity-crud/02-CONTEXT.md` — locked decisions
- `.planning/phases/02-data-layer-entity-crud/02-UI-SPEC.md` — approved UI contract
- `.planning/REQUIREMENTS.md` — full requirement definitions
- `.planning/ROADMAP.md` — 4-plan breakdown for Phase 2

### Secondary (MEDIUM confidence)
- tauri-plugin-sql `Migration` struct pattern: verified from `lib.rs` import of `MigrationKind` and `Migration` — the `include_str!()` embedding pattern is standard Rust/Tauri practice
- Zod v4 API changes: verified from package.json version 4.4.1; `.nonempty()` removal and `.min(1)` replacement documented in zod v4 migration guide

### Tertiary (LOW confidence — flag for validation)
- SQLite FK error message text "FOREIGN KEY constraint failed": assumed from SQLite documentation conventions; exact string from tauri-plugin-sql error wrapping not independently verified in this project's Rust version — use case-insensitive partial match to be safe

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json and Cargo.lock
- Architecture patterns: HIGH — verified against existing `lib.rs`, `client.ts`, component files
- Pitfalls: HIGH (boolean coercion, migration versioning, key reset) / MEDIUM (FK error message format)
- SQL schema: HIGH — standard SQLite patterns; 10-table list from DATA-03 is authoritative
- Seed data content: HIGH — SEED-01 through SEED-06 are fully specified in REQUIREMENTS.md

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (stable stack; no fast-moving dependencies)
