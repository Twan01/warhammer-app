---
phase: 02-data-layer-entity-crud
plan: "02"
subsystem: data-layer
tags: [migrations, seed-data, typescript-types, tanstack-query, crud-hooks]
dependency_graph:
  requires: [02-01]
  provides: [factions-crud, units-crud, paints-crud, recipes-crud, recipe-paints-crud, entity-types, seed-data]
  affects: [02-03, 02-04, 05-dashboard]
tech_stack:
  added: []
  patterns: [tanstack-query-v5-mutations, typed-query-modules, insert-or-ignore-idempotency, 0-or-1-boolean-typing]
key_files:
  created:
    - src-tauri/migrations/002_seed_factions.sql
    - src-tauri/migrations/003_seed_data.sql
    - src/types/faction.ts
    - src/types/unit.ts
    - src/types/paint.ts
    - src/types/recipe.ts
    - src/types/recipePaint.ts
    - src/types/index.ts
    - src/db/queries/factions.ts
    - src/db/queries/units.ts
    - src/db/queries/paints.ts
    - src/db/queries/recipes.ts
    - src/db/queries/recipePaints.ts
    - src/hooks/useFactions.ts
    - src/hooks/useUnits.ts
    - src/hooks/usePaints.ts
    - src/hooks/useRecipes.ts
    - src/hooks/useRecipePaints.ts
  modified:
    - src-tauri/src/lib.rs
decisions:
  - "0|1 literal types used for all SQLite boolean columns (status_assembly, status_basing, status_varnished, is_active_project, owned, running_low, wishlist) — not boolean — per Pitfall 1"
  - "useUnits mutations invalidate [\"dashboard-stats\"] key as forward-compatibility prep for Phase 5 dashboard (DATA-09) — no-op until Phase 5 wires the key"
  - "RecipePaint links are immutable — no updateRecipePaint; to change, remove + re-add — keeps the join table simple and avoids partial-update complexity"
  - "RECIPE_PAINTS_KEY is a function (recipeId) => [...] rather than a flat array — per-recipe granular invalidation avoids full cache bust on every recipe-paint mutation"
metrics:
  duration: 4 min
  completed_date: "2026-04-30"
  tasks_completed: 3
  files_created: 18
  files_modified: 1
requirements-completed: [DATA-01, DATA-02, DATA-06, DATA-07, DATA-08, DATA-09, UNIT-06, SEED-01, SEED-02, SEED-03, SEED-04, SEED-05]
---

# Phase 2 Plan 02: Data Layer — Seed Migrations, Entity Types, Query Modules, and Hooks Summary

**One-liner:** Typed CRUD data layer with INSERT OR IGNORE seed migrations (4 factions, 5 units, 6 paints, 3 recipes, 11 recipe-paints) plus TanStack Query hooks for all 5 entities.

## What Was Built

### Task 1: Seed Migrations + lib.rs wiring

Migration versions added:
- **Version 2 (`seed_factions`):** `002_seed_factions.sql` — INSERT OR IGNORE into factions with stable IDs 1-4 (SEED-01)
- **Version 3 (`seed_data`):** `003_seed_data.sql` — INSERT OR IGNORE across 4 tables (SEED-02..04)

Exact seed counts:
- 4 factions: Tau Empire, Ultramarines, Necrons, Tyranids
- 5 units: Tau Fire Warriors, Crisis Battlesuits, Commander in Battlesuit, Necron Warriors, Intercessors
- 6 paints: Abaddon Black, White Scar, Nuln Oil, Leadbelcher, Macragge Blue, Retributor Armour
- 3 recipes: Tau White Armor, Ultramarines Blue Armor, Necron Ancient Metal
- 11 recipe_paints: 3 for Tau White Armor, 4 for Ultramarines Blue Armor, 4 for Necron Ancient Metal

All inserts use `INSERT OR IGNORE` with explicit stable integer IDs — idempotent across DB wipes (SEED-05).

`src-tauri/src/lib.rs` `get_migrations()` updated with versions 2 and 3 after the existing version 1 entry.

### Task 2: Entity Types + Barrel Re-export

Types exported from `src/types/index.ts`:
- `Faction`, `CreateFactionInput`, `UpdateFactionInput`
- `Unit`, `CreateUnitInput`, `UpdateUnitInput`, `PaintingStatus`
- `PAINTING_STATUS_ORDER` (UNIT-06 — 11-step workflow: Not Started → Built → Primed → Basecoated → Shaded → Layered → Highlighted → Details Done → Based → Varnished → Completed)
- `Paint`, `CreatePaintInput`, `UpdatePaintInput`, `PaintType`
- `PAINT_TYPES`
- `PaintingRecipe`, `CreateRecipeInput`, `UpdateRecipeInput`
- `RecipePaint`, `CreateRecipePaintInput`

All boolean-storing columns typed as `0 | 1` (not `boolean`) per SQLite INTEGER storage (Pitfall 1).

### Task 3: Query Modules + TanStack Query Hooks

**Query functions per entity (all import `getDb()`, none import `@tauri-apps/plugin-sql` directly):**
- `factions.ts`: `getFactions`, `getFactionById`, `createFaction`, `updateFaction`, `deleteFaction`
- `units.ts`: `getUnits`, `getUnitById`, `createUnit`, `updateUnit`, `deleteUnit`
- `paints.ts`: `getPaints`, `getPaintById`, `createPaint`, `updatePaint`, `deletePaint`
- `recipes.ts`: `getRecipes`, `getRecipeById`, `createRecipe`, `updateRecipe`, `deleteRecipe`
- `recipePaints.ts`: `getRecipePaintsByRecipe`, `addRecipePaint`, `removeRecipePaint`

**Hooks + query keys per entity:**

| Hook file | Exported key constant | Hooks exported |
|---|---|---|
| `useFactions.ts` | `FACTIONS_KEY = ["factions"]` | `useFactions`, `useFaction`, `useCreateFaction`, `useUpdateFaction`, `useDeleteFaction` |
| `useUnits.ts` | `UNITS_KEY = ["units"]` | `useUnits`, `useUnit`, `useCreateUnit`, `useUpdateUnit`, `useDeleteUnit` |
| `usePaints.ts` | `PAINTS_KEY = ["paints"]` | `usePaints`, `usePaint`, `useCreatePaint`, `useUpdatePaint`, `useDeletePaint` |
| `useRecipes.ts` | `RECIPES_KEY = ["recipes"]` | `useRecipes`, `useRecipe`, `useCreateRecipe`, `useUpdateRecipe`, `useDeleteRecipe` |
| `useRecipePaints.ts` | `RECIPE_PAINTS_KEY = (recipeId) => ["recipe-paints", recipeId]` | `useRecipePaints`, `useAddRecipePaint`, `useRemoveRecipePaint` |

**DATA-09 forward compatibility:** All three unit mutations (create, update, delete) invalidate `["dashboard-stats"]` in addition to `["units"]`. This is a no-op until Phase 5 wires the dashboard-stats query — by design.

## Decisions Made

1. **0|1 literal types for booleans** — SQLite returns INTEGER 0/1 for boolean columns; using TypeScript `boolean` would compile but silently mismatch at runtime. `0 | 1` prevents misuse in components.

2. **useUnits invalidates dashboard-stats (DATA-09)** — Forward-compatibility: Phase 5 will add a `["dashboard-stats"]` query for the dashboard. Wiring the invalidation now ensures unit CRUD changes immediately reflect on the dashboard without modifying hooks later.

3. **No updateRecipePaint** — RecipePaint join rows are immutable by design. Callers remove then re-add to change step assignments. Keeps the join table simple.

4. **Per-recipe RECIPE_PAINTS_KEY** — Granular invalidation: only the specific recipe's paint list is invalidated on mutations, not all recipe-paint data.

5. **DATA-01 and DATA-02 verified pre-existing** — `getDb()` singleton in `src/db/client.ts` implemented in Phase 1 plan 01-02; this plan confirms it remains unchanged. All query modules import from it correctly.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified:
- `src-tauri/migrations/002_seed_factions.sql`: FOUND
- `src-tauri/migrations/003_seed_data.sql`: FOUND
- `src/types/faction.ts`: FOUND
- `src/types/unit.ts`: FOUND
- `src/types/paint.ts`: FOUND
- `src/types/recipe.ts`: FOUND
- `src/types/recipePaint.ts`: FOUND
- `src/types/index.ts`: FOUND
- `src/db/queries/factions.ts`: FOUND
- `src/db/queries/units.ts`: FOUND
- `src/db/queries/paints.ts`: FOUND
- `src/db/queries/recipes.ts`: FOUND
- `src/db/queries/recipePaints.ts`: FOUND
- `src/hooks/useFactions.ts`: FOUND
- `src/hooks/useUnits.ts`: FOUND
- `src/hooks/usePaints.ts`: FOUND
- `src/hooks/useRecipes.ts`: FOUND
- `src/hooks/useRecipePaints.ts`: FOUND

Commits verified:
- `949bf82`: feat(02-02): add seed migrations 002+003 and wire into lib.rs — FOUND
- `96c8ad1`: feat(02-02): author entity types and barrel re-export — FOUND
- `fb67693`: feat(02-02): author query modules and TanStack Query hooks — FOUND

TypeScript: `pnpm exec tsc --noEmit` exits 0 — CONFIRMED
