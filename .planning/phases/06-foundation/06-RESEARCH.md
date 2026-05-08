# Phase 6: Foundation - Research

**Researched:** 2026-05-01
**Domain:** Back-end plumbing for v0.1.1 — migration, TypeScript types, query functions, TanStack Query hooks
**Confidence:** HIGH — based on direct codebase audit of all relevant source files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Migration 002: `save` column type is `INTEGER` (not TEXT as shown in ARCHITECTURE.md draft) — stores raw number (e.g. `3` for 3+ save); UI appends "+" at display time
- No `UNIQUE` constraint on `(list_id, unit_id)` in `army_list_units` — the same unit may appear multiple times in one army list (multi-squad model); Phase 6 must NOT add such a constraint
- Migration 002 must use `ALTER TABLE ... ADD COLUMN` only — no DROP, no CREATE TABLE, no edits to `001_core_schema.sql`
- New files per the CONTEXT.md scope: `002_unit_playbook_stats.sql`, `src/types/armyList.ts`, `src/types/strategyNote.ts`, `src/db/queries/armyLists.ts`, `src/db/queries/strategyNotes.ts`, `src/hooks/useArmyLists.ts`, `src/hooks/useStrategyNote.ts`
- `getPaintsWithRecipeCount()` goes into `src/db/queries/paints.ts` (not a new file)
- `PaintWithRecipeCount` goes into `src/types/paint.ts` (not a new file)
- `PAINTS_WITH_RECIPES_KEY` exported from `src/hooks/usePaints.ts` alongside existing `PAINTS_KEY`

### Claude's Discretion

- Types file layout: whether to merge into `src/types/index.ts` or keep separate files per type — **follow existing per-type file pattern in `src/types/`**
- Hook export naming: `useCreateArmyList` vs `useArmyListCreate` — **follow existing `useCreatePaint` / `useDeletePaint` naming in `usePaints.ts`**
- Whether to add a `UNIQUE INDEX` on `unit_strategy_notes.unit_id` in migration 002 — select-then-insert/update works without it and is safer for an existing schema; this is a judgment call for the planner

### Deferred Ideas (OUT OF SCOPE)

- Army suggestion engine (SUGG-01..03) — deferred to v1.2
- `/paint-inventory` route, sidebar nav entries — Phase 7
- Army list UI components — Phase 8
- `UnitDetailSheet` Tabs wrapper and `PlaybookTab` — Phase 9
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STRAT-06 | Schema migration `002_unit_playbook_stats.sql` adds 8 nullable columns to `unit_strategy_notes` via `ALTER TABLE ... ADD COLUMN` only (never edits `001_core_schema.sql`) | Migration registration pattern verified in `lib.rs`; column list confirmed against existing schema; `save` type confirmed as INTEGER per user decision |
</phase_requirements>

---

## Summary

Phase 6 is a pure back-end phase with no UI deliverables. It has five discrete outputs: (1) migration 002 that adds 8 nullable columns to `unit_strategy_notes`, (2) TypeScript types for all three v0.1.1 features, (3) query modules `armyLists.ts` and `strategyNotes.ts` plus a new function in `paints.ts`, (4) hooks `useArmyLists.ts` and `useStrategyNote.ts` plus a patch to `usePaints.ts`, and (5) the PAINTS_WITH_RECIPES_KEY cross-invalidation fix. Every pattern needed is already demonstrated in the codebase — this phase extends existing conventions rather than introducing new ones.

The most critical discovery: the migration version numbering is DIFFERENT from what the docs suggest. Migrations 001, 002, and 003 are ALREADY TAKEN by `001_core_schema.sql`, `002_seed_factions.sql`, and `003_seed_data.sql`. The Unit Playbook stats migration must be registered as **version 4** in `lib.rs` and the SQL file named **`004_unit_playbook_stats.sql`**. Using version 4 is mandatory — versions 1-3 are already applied in `_sqlx_migrations` and cannot be reused.

The strategy note upsert lacks a UNIQUE constraint on `unit_id`, requiring a select-then-insert/update pattern. The `points_override` column on `army_list_units` must use full-replacement UPDATE (not COALESCE) so it can be cleared back to NULL. All boolean columns stay as `0 | 1` literal types in TypeScript.

**Primary recommendation:** Build in dependency order — migration first, then types, then query functions, then hooks. Each layer depends on the one below. Do not start hook code before the query layer compiles.

---

## Standard Stack

### Core (No new installs — all already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/plugin-sql` | 2.4.0 | SQLite IPC bridge — `db.select<T[]>()`, `db.execute()` | Already installed; the only SQL path allowed |
| `@tanstack/react-query` | ^5.100.6 | Query/mutation/invalidation layer | Already installed; all hooks follow this pattern |
| TypeScript | 5.9.3 | Type system | Already installed |

No new packages are needed for Phase 6. All infrastructure is already in place.

### Supporting Patterns Already in Codebase

| Pattern | Location | Use in Phase 6 |
|---------|----------|----------------|
| `getDb()` singleton | `src/db/client.ts` | All new query functions call this first |
| `db.select<T[]>(sql, params)` | `src/db/queries/units.ts` | `getArmyLists()`, `getArmyListWithUnits()`, `getStrategyNote()` |
| `db.execute(sql, params)` | `src/db/queries/paints.ts` | `createArmyList()`, `upsertStrategyNote()`, mutations |
| Exported query key constants | `src/hooks/useUnits.ts` | `ARMY_LISTS_KEY`, `STRATEGY_NOTE_KEY(unitId)`, `PAINTS_WITH_RECIPES_KEY` |
| `useMutation` with `onSuccess` invalidation | `src/hooks/usePaints.ts` | All new mutation hooks |
| `0 \| 1` literal type for booleans | `src/types/unit.ts`, `src/types/paint.ts` | Any boolean columns in new type interfaces |

---

## Architecture Patterns

### CRITICAL: Migration Version Numbers

The existing `lib.rs` `get_migrations()` vec already has:
- version 1 → `001_core_schema.sql`
- version 2 → `002_seed_factions.sql`
- version 3 → `003_seed_data.sql`

**The Unit Playbook stats migration MUST be version 4, not version 2.**

```rust
// src-tauri/src/lib.rs — ADD this entry to get_migrations() vec
Migration {
    version: 4,
    description: "unit_playbook_stats",
    sql: include_str!("../migrations/004_unit_playbook_stats.sql"),
    kind: MigrationKind::Up,
},
```

And the SQL file is `src-tauri/migrations/004_unit_playbook_stats.sql`.

### Pattern 1: Migration File — Additive Only

**What:** 8 `ALTER TABLE ... ADD COLUMN` statements on `unit_strategy_notes`. All columns nullable (no DEFAULT other than NULL). `save` column is `INTEGER` (stores raw digit like `3`, not `"3+"`).

```sql
-- 004_unit_playbook_stats.sql
-- Adds stats block + abilities/keywords to unit_strategy_notes for v0.1.1 Unit Playbook
-- STRAT-06: ALTER TABLE only — never DROP, never CREATE TABLE, never edit 001_core_schema.sql
-- All new columns are nullable; existing rows remain intact with NULL values
ALTER TABLE unit_strategy_notes ADD COLUMN move INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN toughness INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN save INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN wounds INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN leadership INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN objective_control INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN keywords TEXT;
ALTER TABLE unit_strategy_notes ADD COLUMN abilities TEXT;
```

Note: `move`, `toughness`, `save`, `wounds`, `leadership`, `objective_control` are all `INTEGER`. `keywords` and `abilities` are `TEXT`. The ARCHITECTURE.md draft showed `move TEXT` and `leadership TEXT` — those are overridden by the CONTEXT.md decision to store all stats as integers.

### Pattern 2: TypeScript Interface — StrategyNote

**Source:** Direct audit of `001_core_schema.sql` lines 127-140 for existing columns, plus migration 004 for new columns. Follow `src/types/paint.ts` interface shape.

```typescript
// src/types/strategyNote.ts
export interface StrategyNote {
  id: number;
  unit_id: number;
  // Existing columns from 001_core_schema.sql
  battlefield_role: string | null;
  strengths: string | null;
  weaknesses: string | null;
  best_targets: string | null;
  synergies: string | null;
  mistakes_to_avoid: string | null;
  rules_references: string | null;
  notes: string | null;
  // New columns from 004_unit_playbook_stats.sql (all nullable)
  move: number | null;
  toughness: number | null;
  save: number | null;          // Stores raw integer (e.g. 3 for "3+"); UI appends "+"
  wounds: number | null;
  leadership: number | null;
  objective_control: number | null;
  keywords: string | null;
  abilities: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertStrategyNoteInput {
  unit_id: number;
  move: number | null;
  toughness: number | null;
  save: number | null;
  wounds: number | null;
  leadership: number | null;
  objective_control: number | null;
  keywords: string | null;
  abilities: string | null;
  battlefield_role: string | null;
  strengths: string | null;
  weaknesses: string | null;
  best_targets: string | null;
  synergies: string | null;
  mistakes_to_avoid: string | null;
  rules_references: string | null;
  notes: string | null;
}
```

### Pattern 3: TypeScript Interface — ArmyList

**Source:** Direct audit of `001_core_schema.sql` lines 100-123 for exact column names and types.

```typescript
// src/types/armyList.ts
export interface ArmyList {
  id: number;
  name: string;
  faction_id: number | null;    // SET NULL on faction delete
  points_limit: number | null;
  list_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArmyListUnit {
  id: number;
  list_id: number;
  unit_id: number;
  points_override: number | null;  // NULL = inherit from unit.points
  notes: string | null;
  created_at: string;
  // No updated_at — army_list_units table has no updated_at column
}

// Joined result from getArmyListWithUnits()
export interface ArmyListUnitRow extends ArmyListUnit {
  unit_name: string;
  unit_points: number | null;       // live from units table JOIN
  effective_points: number;         // COALESCE(points_override, unit_points, 0) from SQL
  faction_id: number;
  status_painting: string;
  painting_percentage: number;
}

export interface ArmyListWithUnits {
  list: ArmyList;
  units: ArmyListUnitRow[];
}

export type CreateArmyListInput = Omit<ArmyList, 'id' | 'created_at' | 'updated_at'>;
export type UpdateArmyListInput = Partial<CreateArmyListInput> & { id: number };

export interface AddUnitToListInput {
  list_id: number;
  unit_id: number;
  points_override?: number | null;
  notes?: string | null;
}

export interface UpdateArmyListUnitInput {
  id: number;
  points_override: number | null;  // Full-replacement — NOT COALESCE (must be clearable to NULL)
  notes: string | null;
}
```

### Pattern 4: PaintWithRecipeCount — Extends Paint

**Source:** Direct audit of `src/types/paint.ts`.

```typescript
// src/types/paint.ts — ADD at bottom, after existing Paint interface
export interface PaintWithRecipeCount extends Paint {
  recipe_count: number;  // COUNT(rp.id) from LEFT JOIN recipe_paints
}
```

### Pattern 5: Query Function Signatures — paints.ts

**Source:** Direct audit of `src/db/queries/paints.ts`. Add `getPaintsWithRecipeCount` at the bottom of the existing file.

```typescript
// src/db/queries/paints.ts — ADD this function (do not modify getPaints)
export async function getPaintsWithRecipeCount(): Promise<PaintWithRecipeCount[]> {
  const db = await getDb();
  return db.select<PaintWithRecipeCount[]>(`
    SELECT p.*, COUNT(rp.id) AS recipe_count
    FROM paints p
    LEFT JOIN recipe_paints rp ON rp.paint_id = p.id
    GROUP BY p.id
    ORDER BY p.brand ASC, p.name ASC
  `);
}
```

### Pattern 6: Query Function Signatures — strategyNotes.ts

**Source:** ARCHITECTURE.md Pattern 4. Key mechanic: select-then-insert/update because no UNIQUE index exists on `unit_id`.

```typescript
// src/db/queries/strategyNotes.ts
import { getDb } from "@/db/client";
import type { StrategyNote, UpsertStrategyNoteInput } from "@/types/strategyNote";

export async function getStrategyNote(unitId: number): Promise<StrategyNote | null> {
  const db = await getDb();
  const rows = await db.select<StrategyNote[]>(
    "SELECT * FROM unit_strategy_notes WHERE unit_id = $1 LIMIT 1",
    [unitId]
  );
  return rows[0] ?? null;
}

export async function upsertStrategyNote(input: UpsertStrategyNoteInput): Promise<void> {
  const db = await getDb();
  const existing = await db.select<{ id: number }[]>(
    "SELECT id FROM unit_strategy_notes WHERE unit_id = $1",
    [input.unit_id]
  );
  if (existing.length > 0) {
    await db.execute(
      `UPDATE unit_strategy_notes SET
         move=$2, toughness=$3, save=$4, wounds=$5, leadership=$6,
         objective_control=$7, keywords=$8, abilities=$9,
         battlefield_role=$10, strengths=$11, weaknesses=$12,
         best_targets=$13, synergies=$14, mistakes_to_avoid=$15,
         rules_references=$16, notes=$17, updated_at=datetime('now')
       WHERE unit_id=$1`,
      [
        input.unit_id,
        input.move, input.toughness, input.save, input.wounds, input.leadership,
        input.objective_control, input.keywords, input.abilities,
        input.battlefield_role, input.strengths, input.weaknesses,
        input.best_targets, input.synergies, input.mistakes_to_avoid,
        input.rules_references, input.notes,
      ]
    );
  } else {
    await db.execute(
      `INSERT INTO unit_strategy_notes (
         unit_id, move, toughness, save, wounds, leadership,
         objective_control, keywords, abilities,
         battlefield_role, strengths, weaknesses,
         best_targets, synergies, mistakes_to_avoid,
         rules_references, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        input.unit_id,
        input.move, input.toughness, input.save, input.wounds, input.leadership,
        input.objective_control, input.keywords, input.abilities,
        input.battlefield_role, input.strengths, input.weaknesses,
        input.best_targets, input.synergies, input.mistakes_to_avoid,
        input.rules_references, input.notes,
      ]
    );
  }
}
```

### Pattern 7: Query Function Signatures — armyLists.ts

**Source:** ARCHITECTURE.md Pattern 6 + direct audit of `001_core_schema.sql` for exact column names. Critical: `getArmyListWithUnits` must JOIN units to get live points; never store `unit.points` redundantly.

```typescript
// src/db/queries/armyLists.ts — key functions
export async function getArmyLists(): Promise<ArmyList[]> {
  const db = await getDb();
  return db.select<ArmyList[]>(
    "SELECT * FROM army_lists ORDER BY name ASC"
  );
}

export async function getArmyListWithUnits(listId: number): Promise<ArmyListUnitRow[]> {
  const db = await getDb();
  return db.select<ArmyListUnitRow[]>(
    `SELECT
       alu.id, alu.list_id, alu.unit_id, alu.points_override, alu.notes, alu.created_at,
       u.name AS unit_name,
       u.points AS unit_points,
       u.faction_id,
       u.status_painting,
       u.painting_percentage,
       COALESCE(alu.points_override, u.points, 0) AS effective_points
     FROM army_list_units alu
     JOIN units u ON u.id = alu.unit_id
     WHERE alu.list_id = $1
     ORDER BY alu.created_at ASC`,
    [listId]
  );
}

// updateArmyListUnit: FULL REPLACEMENT, not COALESCE — points_override must be clearable to NULL
export async function updateArmyListUnit(input: UpdateArmyListUnitInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET points_override=$2, notes=$3 WHERE id=$1",
    [input.id, input.points_override, input.notes]
  );
}
```

### Pattern 8: Hook Signatures — usePaints.ts Patch

**Source:** Direct audit of `src/hooks/usePaints.ts`. Three mutations need the new key added to their `onSuccess`.

```typescript
// src/hooks/usePaints.ts — ADD these exports alongside existing PAINTS_KEY
export const PAINTS_WITH_RECIPES_KEY = ["paints-with-recipes"] as const;

export function usePaintsWithRecipeCount() {
  return useQuery({
    queryKey: PAINTS_WITH_RECIPES_KEY,
    queryFn: getPaintsWithRecipeCount,
  });
}

// Patch useCreatePaint onSuccess — ADD the second invalidation:
onSuccess: () => {
  qc.invalidateQueries({ queryKey: PAINTS_KEY });
  qc.invalidateQueries({ queryKey: PAINTS_WITH_RECIPES_KEY }); // ADD
},

// Patch useUpdatePaint onSuccess — ADD the third invalidation:
onSuccess: (_, variables) => {
  qc.invalidateQueries({ queryKey: PAINTS_KEY });
  qc.invalidateQueries({ queryKey: PAINT_KEY(variables.id) });
  qc.invalidateQueries({ queryKey: PAINTS_WITH_RECIPES_KEY }); // ADD
},

// Patch useDeletePaint onSuccess — ADD the second invalidation:
onSuccess: () => {
  qc.invalidateQueries({ queryKey: PAINTS_KEY });
  qc.invalidateQueries({ queryKey: PAINTS_WITH_RECIPES_KEY }); // ADD
},
```

### Pattern 9: Hook Key Conventions — New Hooks

Following the `export const UNITS_KEY = ['units'] as const` pattern from `src/hooks/useUnits.ts`:

```typescript
// src/hooks/useArmyLists.ts
export const ARMY_LISTS_KEY = ["army-lists"] as const;
export const ARMY_LIST_KEY = (id: number) => ["army-lists", id] as const;

// src/hooks/useStrategyNote.ts
export const STRATEGY_NOTE_KEY = (unitId: number) => ["strategy-note", unitId] as const;
```

### Pattern 10: Army List Mutation Invalidation

```typescript
// useCreateArmyList onSuccess — invalidate index AND dashboard for DATA-09 compat
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
  qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); // DATA-09 pattern
},

// useAddUnitToList onSuccess — invalidate list detail AND index
onSuccess: (_, variables) => {
  qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
  qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
  qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); // DATA-09 pattern
},

// useStrategyNote onSuccess — only invalidate the note; no unit/dashboard invalidation
onSuccess: (_, variables) => {
  qc.invalidateQueries({ queryKey: STRATEGY_NOTE_KEY(variables.unit_id) });
  // Do NOT invalidate ['units'] or ['dashboard-stats']
},
```

### Recommended Build Order (Dependency Chain)

```
Wave 1: Migration
  → src-tauri/migrations/004_unit_playbook_stats.sql
  → src-tauri/src/lib.rs (register version 4)

Wave 2: TypeScript Types (no runtime deps)
  → src/types/strategyNote.ts
  → src/types/armyList.ts
  → src/types/paint.ts (add PaintWithRecipeCount)

Wave 3: Query Functions (depends on types)
  → src/db/queries/paints.ts (add getPaintsWithRecipeCount)
  → src/db/queries/strategyNotes.ts (new file)
  → src/db/queries/armyLists.ts (new file)

Wave 4: Hooks (depends on query functions)
  → src/hooks/usePaints.ts (add PAINTS_WITH_RECIPES_KEY, usePaintsWithRecipeCount, patch 3 mutations)
  → src/hooks/useStrategyNote.ts (new file)
  → src/hooks/useArmyLists.ts (new file)
```

### Anti-Patterns to Avoid

- **Using COALESCE in `updateArmyListUnit`:** The existing `updateUnit` and `updatePaint` use COALESCE for partial updates. Do NOT copy this for `army_list_units`. `points_override` must be settable back to NULL. Use full-replacement: `SET points_override=$2, notes=$3`.
- **Modifying `getPaints()` return type:** Keep `getPaints()` returning `Paint[]`. Add a separate `getPaintsWithRecipeCount()` function.
- **Naming the migration `002_unit_playbook_stats.sql`:** Versions 2 and 3 are already taken. The migration must be version 4 (file: `004_unit_playbook_stats.sql`).
- **Forgetting the PAINTS_WITH_RECIPES_KEY cross-invalidation:** All three paint mutations (`useCreatePaint`, `useUpdatePaint`, `useDeletePaint`) need the second invalidation added. Missing even one causes stale data on the Paint Inventory page.
- **Storing `save` as TEXT:** The CONTEXT.md decision overrides ARCHITECTURE.md: `save` is `INTEGER` in the migration and `number | null` in TypeScript.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite connection management | Custom singleton logic | `getDb()` from `src/db/client.ts` | Already handles one-time init + PRAGMA foreign_keys |
| Parameterized SQL | String interpolation | `db.select('... WHERE id = $1', [id])` | Prevents injection; tauri-plugin-sql uses positional params ($1, $2...) |
| Cache invalidation | Manual state updates | `qc.invalidateQueries({ queryKey: KEY })` | TanStack Query refetches automatically; setQueryData for optimistic only |
| Upsert logic | ON CONFLICT clause | Select-then-insert/update pattern | No UNIQUE index on `unit_strategy_notes.unit_id`; ON CONFLICT requires it |

---

## Common Pitfalls

### Pitfall 1: Migration Version Collision (HIGH RISK)

**What goes wrong:** Writing a migration as version 2 or naming the file `002_unit_playbook_stats.sql`. Versions 1, 2, 3 are already registered. `tauri-plugin-sql` skips already-applied versions — the new migration silently never runs.

**How to avoid:** File must be `004_unit_playbook_stats.sql`. Registration in `lib.rs` must be `version: 4`.

**Warning signs:** App starts without error but `unit_strategy_notes` still has only 10 columns.

### Pitfall 2: COALESCE Blocks NULL-Clearing on points_override

**What goes wrong:** Copying the existing COALESCE partial-update pattern to `army_list_units` makes it impossible to clear `points_override` back to NULL (meaning "inherit from unit.points").

**How to avoid:** `updateArmyListUnit` must use explicit `SET points_override=$2` with a nullable parameter, never `COALESCE($2, points_override)`.

### Pitfall 3: save Column Type Mismatch

**What goes wrong:** Following the ARCHITECTURE.md draft that showed `save TEXT`. The CONTEXT.md decision locks `save` as `INTEGER`. If the migration uses `TEXT`, the TypeScript type of `save: string | null` would be correct for TEXT but the value `"3"` can't be compared numerically. When Phase 9 adds validation (e.g., `.min(2).max(6)`), the type mismatch causes a runtime error.

**How to avoid:** Migration uses `ADD COLUMN save INTEGER`. TypeScript type is `save: number | null`.

### Pitfall 4: Missing PAINTS_WITH_RECIPES_KEY on One Mutation

**What goes wrong:** Adding the invalidation to `useCreatePaint` and `useUpdatePaint` but missing `useDeletePaint` (or vice versa). The paint inventory appears to work until a user deletes a paint — the recipe count on the inventory page doesn't update.

**How to avoid:** Patch all three mutations together as one change. Review all three `onSuccess` handlers in `usePaints.ts` before committing.

### Pitfall 5: army_list_units Has No updated_at Column

**What goes wrong:** Including `updated_at` in the `ArmyListUnit` TypeScript interface because other tables have it. `army_list_units` in `001_core_schema.sql` has only `id, list_id, unit_id, points_override, notes, created_at` — no `updated_at`.

**How to avoid:** The `ArmyListUnit` interface must not include `updated_at`. Verify against the schema before writing the type.

### Pitfall 6: Stale Army List Points When unit.points Changes

**What goes wrong:** Caching `unit.points` at the time of `addUnitToList`. If the unit's points are later edited in the Collection page, the army list shows the old value.

**How to avoid:** `getArmyListWithUnits` must JOIN `units` on every fetch and compute `effective_points` in SQL using `COALESCE(alu.points_override, u.points, 0)`. The React component sums `row.effective_points`, never reimplements the COALESCE.

---

## Code Examples

### Migration Registration in lib.rs

```rust
// src-tauri/src/lib.rs — full get_migrations() after Phase 6
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
        Migration {
            version: 4,
            description: "unit_playbook_stats",
            sql: include_str!("../migrations/004_unit_playbook_stats.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
```

### Full useArmyLists.ts Hook Structure

```typescript
// src/hooks/useArmyLists.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getArmyLists, getArmyListWithUnits,
  createArmyList, updateArmyList, deleteArmyList,
  addUnitToList, removeUnitFromList, updateArmyListUnit,
} from "@/db/queries/armyLists";
import type { CreateArmyListInput, UpdateArmyListInput, AddUnitToListInput, UpdateArmyListUnitInput } from "@/types/armyList";

export const ARMY_LISTS_KEY = ["army-lists"] as const;
export const ARMY_LIST_KEY = (id: number) => ["army-lists", id] as const;

export function useArmyLists() {
  return useQuery({ queryKey: ARMY_LISTS_KEY, queryFn: getArmyLists });
}

export function useArmyListDetail(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? ARMY_LIST_KEY(id) : ARMY_LISTS_KEY,
    queryFn: () => id !== undefined ? getArmyListWithUnits(id) : Promise.resolve([]),
    enabled: id !== undefined,
  });
}

export function useCreateArmyList() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateArmyListInput>({
    mutationFn: createArmyList,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); // DATA-09 pattern
    },
  });
}
// ... similarly for useUpdateArmyList, useDeleteArmyList, useAddUnitToList,
// useRemoveUnitFromList, useUpdateArmyListUnit
```

### Full useStrategyNote.ts Hook Structure

```typescript
// src/hooks/useStrategyNote.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStrategyNote, upsertStrategyNote } from "@/db/queries/strategyNotes";
import type { UpsertStrategyNoteInput } from "@/types/strategyNote";

export const STRATEGY_NOTE_KEY = (unitId: number) => ["strategy-note", unitId] as const;

export function useStrategyNote(unitId: number | undefined) {
  return useQuery({
    queryKey: unitId !== undefined ? STRATEGY_NOTE_KEY(unitId) : (["strategy-note"] as const),
    queryFn: () => unitId !== undefined ? getStrategyNote(unitId) : Promise.resolve(null),
    enabled: unitId !== undefined,
    staleTime: Infinity, // Only refetch after save — sub-5ms IPC on local SQLite
  });
}

export function useUpsertStrategyNote() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpsertStrategyNoteInput>({
    mutationFn: upsertStrategyNote,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: STRATEGY_NOTE_KEY(variables.unit_id) });
      // NO invalidation of ['units'] or ['dashboard-stats'] — strategy notes
      // are not surfaced in the collection table or dashboard
    },
  });
}
```

---

## Validation Architecture

nyquist_validation is enabled (`.planning/config.json` → `workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (via `vitest.config.ts`) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

Phase 6 is back-end only (migration + types + query functions + hooks). The testable behaviors are:

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRAT-06 | Migration 004 SQL contains only ALTER TABLE ADD COLUMN — no DROP, no CREATE TABLE | Unit (file content grep) | `pnpm test -- -t "migration"` | Wave 0 |
| STRAT-06 | `save` column in migration is INTEGER not TEXT | Unit (file content assertion) | `pnpm test -- -t "migration"` | Wave 0 |
| Success 3 | TypeScript types compile without errors | Compile check | `pnpm build` (tsc step) | N/A — handled by tsc |
| Success 4 | Query functions exist and return typed results | Unit (mock db.select/execute) | `pnpm test -- -t "armyLists\|strategyNotes\|paints"` | Wave 0 |
| Success 5 | `useCreatePaint/useUpdatePaint/useDeletePaint` invalidate both `['paints']` and `['paints-with-recipes']` | Unit (usePaints hook) | `pnpm test -- -t "usePaints"` | Wave 0 |

Note: `tauri-plugin-sql` uses IPC — `db.select` and `db.execute` cannot call a real SQLite file in the Vitest jsdom environment. Tests for query functions must mock `getDb()` and assert correct SQL strings and parameter arrays are passed. The success criterion "returns typed results against the live database" is validated by manual smoke test on app launch, not automated test.

### Sampling Rate

- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green + app launches without error (manual smoke) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/foundation/migration004.test.ts` — reads `src-tauri/migrations/004_unit_playbook_stats.sql` as a string, asserts no DROP/CREATE TABLE, asserts all 8 column names present, asserts `save` is `INTEGER`
- [ ] `tests/foundation/armyListQueries.test.ts` — mocks `getDb()`, tests `getArmyLists()`, `getArmyListWithUnits()`, `createArmyList()`, `deleteArmyList()`, `addUnitToList()`, `removeUnitFromList()`, `updateArmyListUnit()` — verifies null-passthrough on `points_override` (not COALESCE)
- [ ] `tests/foundation/strategyNoteQueries.test.ts` — mocks `getDb()`, tests `getStrategyNote()` (returns null when none), `upsertStrategyNote()` select-then-insert path, `upsertStrategyNote()` select-then-update path
- [ ] `tests/foundation/usePaints.test.ts` — verifies `useCreatePaint/useUpdatePaint/useDeletePaint` each invalidate both `PAINTS_KEY` and `PAINTS_WITH_RECIPES_KEY` on success

---

## Open Questions

1. **`move` and `leadership` data type: INTEGER vs TEXT**
   - What we know: CONTEXT.md says "all 8 columns should match stats block", STRAT-02 says "all integer fields (min 0)". ARCHITECTURE.md showed `move TEXT` (e.g., `"6"` for 6") and `leadership TEXT` (e.g., `"6+"`), but PITFALLS.md (Pitfall 2) explicitly says "all Unit Playbook stat fields (M, T, Sv, W, Ld, OC) must use `z.number().int().min(0)`".
   - What's unclear: Movement in 40K is typically an integer (e.g., "6" means 6 inches) with no symbol — storing as INTEGER is unambiguous. Leadership similarly is a plain number in 10th edition (e.g., "6" not "6+").
   - Recommendation: Use `INTEGER` for `move` and `leadership` — matches PITFALLS.md and STRAT-02 "all integer fields". The ARCHITECTURE.md TEXT type was the draft; CONTEXT.md's overriding principle (store integer, UI appends suffix) applies consistently. This research uses `INTEGER` for all 6 stat columns.

2. **`UNIQUE INDEX` on `unit_strategy_notes.unit_id` in migration 004**
   - What we know: CONTEXT.md explicitly leaves this as "Claude's Discretion" for the planner. The select-then-insert/update pattern works without it.
   - Recommendation: Do NOT add the UNIQUE INDEX in Phase 6. Rationale: any uniqueness violation would cause a hard error rather than a graceful upsert; the select-then-upsert is safer for a production schema; Phase 9 can add it if needed.

---

## Sources

### Primary (HIGH confidence)

- `src-tauri/src/lib.rs` — migration version numbering, exact `Migration` struct shape (direct audit)
- `src-tauri/migrations/001_core_schema.sql` — `unit_strategy_notes` existing 10 columns, `army_lists` and `army_list_units` exact schema (direct audit)
- `src/db/queries/paints.ts` — `getPaints()` signature, COALESCE update pattern, `db.select<T[]>()` usage (direct audit)
- `src/db/queries/units.ts` — COALESCE partial update pattern (direct audit)
- `src/hooks/usePaints.ts` — `PAINTS_KEY` export pattern, all three mutation `onSuccess` signatures (direct audit)
- `src/hooks/useUnits.ts` — `UNITS_KEY` constant pattern, DATA-09 `["dashboard-stats"]` invalidation pattern (direct audit)
- `src/types/paint.ts` — `Paint` interface shape for `PaintWithRecipeCount` extension pattern (direct audit)
- `src/types/unit.ts` — `0 | 1` boolean literal convention, `Unit` interface shape (direct audit)
- `.planning/research/ARCHITECTURE.md` — Pattern 3 (join query), Pattern 4 (upsert), Pattern 6 (points calc), Query Key Conventions, Build Order (HIGH — based on codebase audit)
- `.planning/research/PITFALLS.md` — all 15 pitfalls, sources cited in that document (HIGH — based on codebase audit)

### Secondary (MEDIUM confidence)

- `.planning/phases/06-foundation/06-CONTEXT.md` — locked decisions on `save` INTEGER type, no UNIQUE constraint on army_list_units (MEDIUM — user decision, not source-verifiable)

---

## Metadata

**Confidence breakdown:**
- Migration version number (4, not 2): HIGH — verified directly in `lib.rs`
- Standard stack: HIGH — verified in codebase
- Architecture: HIGH — all patterns derived from direct source file audit
- Type interfaces: HIGH — columns verified against `001_core_schema.sql` directly
- Pitfalls: HIGH — all derived from direct codebase audit in `PITFALLS.md`

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (stable codebase; only risk is schema changes in other phases)
