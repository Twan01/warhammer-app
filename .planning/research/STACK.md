# Technology Stack — v0.3.7 Smart Automation

**Project:** HobbyForge v0.3.7
**Researched:** 2026-05-28
**Confidence:** HIGH

---

## Verdict: Zero New Dependencies

All four automation features can be implemented with the current stack. The required
capabilities already exist: derive logic, hooks, context, and UI components are present
and need extension, not replacement.

---

## Context

This is a SUBSEQUENT milestone. The existing stack (Tauri 2 + React 19 + TypeScript 5 +
Vite 6 + TailwindCSS 4 + shadcn/ui + SQLite + React Query + Zustand + RHF + Zod +
@dnd-kit + react-hotkeys-hook) covers everything. This document covers ONLY the net-new
implementation strategy for the four automation features.

---

## Feature Analysis — What Already Exists

### Feature 1: Auto-derive assembly/basing/varnish from recipe section completion

**Existing mechanism (verified: `src/db/queries/recipeAssignments.ts` lines 211–272):**

`syncDerivedStatuses()` already auto-derives `status_basing` and `status_varnished` via
LIKE name matching (`%basing%`, `%varnish%`) on `recipe_sections.name`. It is called
on every step toggle, assignment create, and assignment delete. `status_painting` is
derived from `painting_percentage`.

**What is missing:**

- `status_assembly` is not derived. The `section_type` column (already on `recipe_sections`
  from v0.2.9 Phase 57) is unused by the derive logic — matching is purely by section
  `name`. Assembly sections would be detected via `section_type = 'prep'`.
- The derive runs 5 separate SELECT queries per unit. This can be consolidated.

**Extension approach:** Extend `syncDerivedStatuses()` to also query for sections with
`section_type = 'prep'` (using the existing column, not brittle name-matching), write
`status_assembly = 1 | 0`. Optionally consolidate the 5-query fan-out into a single CTE,
following the `getKanbanProgressByUnitIds` batch CTE pattern.

**Stack addition needed:** None.

---

### Feature 2: Auto-manage is_active_project from recipe assignment lifecycle

**Existing mechanism (verified: `src/db/queries/recipeAssignments.ts` lines 96–119,
`src/hooks/useRecipeAssignments.ts` lines 77–108):**

`is_active_project` is a `0 | 1` column on `units`. Set only manually via form or
`updateUnit()`. `createAssignment()` and `deleteAssignment()` already call
`syncPaintingPercentageByUnitId()` — they hold a `db` handle and know the `unit_id`.
Cache invalidation on `UNITS_KEY` already happens in both mutation hooks.

**Extension approach:**

- In `createAssignment()`: after the INSERT and painting percentage sync, add
  `db.execute("UPDATE units SET is_active_project = 1 WHERE id = $1 AND painting_percentage < 100", [unitId])`.
- In `deleteAssignment()` and when `syncDerivedStatuses` detects 100% completion:
  add `db.execute("UPDATE units SET is_active_project = 0 WHERE id = $1", [unitId])`.

No new query file, no new hook, no new cache key. `UNITS_KEY` invalidation already covers it.

**Stack addition needed:** None.

---

### Feature 3: Smart context pre-filling (faction in recipe forms, recipe picker filtering by unit context)

**Existing mechanism (verified: `src/context/ActiveFactionContext.tsx`,
`src/features/recipes/RecipeFormSheet.tsx` lines 1–60,
`src/features/army-lists/UnitPickerDialog.tsx` lines 42–54):**

`ActiveFactionContext` exposes `activeFactionId` globally via `useActiveFaction()`.
`RecipeFormSheet` already imports `useFactions()` and `useUnits()` but does not call
`useActiveFaction()` to pre-seed `faction_id`. React Hook Form's `defaultValues` already
supports this — it is the correct pre-fill mechanism.

For recipe picker filtering: `PaintingRecipe` already has `faction_id` and `unit_id`
columns. Filtering by context is a pure JS `.filter()` over the existing query result.
The exact pattern is already used in `UnitPickerDialog` where `factionId` is received
as a prop and `filteredUnits` is derived via `.filter((u) => u.faction_id === factionId)`.

**Extension approach:**

- In `RecipeFormSheet`: call `useActiveFaction()`, pass `activeFactionId` as `defaultValues.faction_id`.
- In `ApplyRecipeDialog` / `ApplyToUnitsDialog`: receive `factionId` prop from the
  calling component, add a `useMemo` filter on `recipes` — identical to `UnitPickerDialog`.

**Stack addition needed:** None.

---

### Feature 4: Battle-readiness in army list unit picker, batch operations, points-remaining filtering

**Existing mechanism (verified: `src/features/army-lists/UnitPickerDialog.tsx`,
`src/hooks/useUnits.ts`, `src/types/unit.ts`, `src/db/queries/armyLists.ts` lines 60–94,
`src/hooks/useRecipeAssignments.ts` lines 124–140):**

`UnitPickerDialog` calls `useUnits()` which returns the raw `Unit` interface. `Unit`
already includes `status_painting`, `painting_percentage`, `status_assembly`,
`status_basing`, `status_varnished` — all columns needed to compute and display readiness.
`useUnitsEnriched()` already exists and adds `effective_points` via the COALESCE chain.

Points-remaining computation: `getArmyListWithUnits()` already returns `effective_points`
per unit row in the list (6-level COALESCE in SQL). The picker just needs to receive the
current list's used-points total as a prop and filter or badge units accordingly.

Batch apply: `useBulkCreateAssignments()` already exists at `useRecipeAssignments.ts`
lines 124–140 with correct `INSERT OR IGNORE` semantics and cache invalidation.

**Extension approach:**

- Switch `UnitPickerDialog` from `useUnits()` to `useUnitsEnriched()` (adds `effective_points`,
  no query performance change — same SQL with one extra JOIN already in production).
- Accept `usedPoints` and `pointsLimit` as props (both are already available at the
  `ArmyListDetailPage` level from `getArmyListWithUnits` aggregation).
- Add readiness badges to `CommandItem` using `StatusBadge` (already used on
  `CollectionPage` and `GameDayPage`).
- Batch-apply recipe UI: a multi-select checkbox list + single "Apply Recipe" button
  wired to `useBulkCreateAssignments()`. This is a new UI component only.

**Stack addition needed:** None.

---

## Summary: No New Libraries

| Feature | New library? | Existing mechanism |
|---------|-------------|--------------------|
| Auto-derive assembly | No | Extend `syncDerivedStatuses()` + `section_type` column |
| is_active_project lifecycle | No | Extend `createAssignment` / `deleteAssignment` + direct UPDATE |
| Faction pre-fill in recipe form | No | `useActiveFaction()` + RHF `defaultValues` |
| Recipe picker filtering by unit | No | Prop-based `.filter()` — mirrors `UnitPickerDialog` |
| Readiness badges in unit picker | No | `useUnitsEnriched()` + existing `StatusBadge` |
| Batch recipe apply UI | No | `useBulkCreateAssignments()` already exists, wire UI |
| Points-remaining filter/display | No | Pure JS sum over `effective_points` from existing query |

---

## Confirmed Existing Stack (Unchanged)

| Technology | Role in this milestone |
|------------|------------------------|
| tauri-plugin-sql (Tauri 2 bundled) | All DB writes via `$N` parameterized syntax |
| React Query `@tanstack/react-query` | Cache invalidation after auto-derive writes; `UNITS_KEY` covers derived columns |
| React Hook Form | `defaultValues` pre-filling for faction context; no new form libraries |
| Zustand | No new stores needed |
| SQLite (hobbyforge.db) | `recipe_sections.section_type`, `units.status_assembly` already present |
| `ActiveFactionContext` | Global faction pre-fill source; already a stable context |
| `useUnitsEnriched()` | Provides `effective_points` + all status columns for picker enrichment |
| `StatusBadge` | Readiness display in unit picker; already used on multiple pages |
| `useBulkCreateAssignments()` | Batch recipe assignment; already production-proven |

---

## Architecture: Where Each Change Lives

```
src/db/queries/recipeAssignments.ts       (query layer — no file additions)
  syncDerivedStatuses()                    extend: derive status_assembly via section_type
  createAssignment()                       extend: auto-set is_active_project = 1
  deleteAssignment()                       extend: auto-clear is_active_project = 0

src/features/recipes/RecipeFormSheet.tsx  (UI — no new component)
  + useActiveFaction()                     add: seed faction_id defaultValue

src/features/recipes/ApplyRecipeDialog.tsx (UI — extend existing)
  + factionId prop + useMemo filter        add: context-aware recipe filtering

src/features/army-lists/UnitPickerDialog.tsx (UI — extend existing)
  useUnits() → useUnitsEnriched()          switch: adds effective_points + status
  + usedPoints / pointsLimit props         add: points-remaining display
  CommandItem                              add: readiness badge per unit

NEW: src/features/army-lists/BatchApplyRecipeSheet.tsx (new UI component only)
  useBulkCreateAssignments()               wire: existing mutation hook
  unit multi-select checkboxes             new: selection UI
```

No new migration. No new query file. No new hook file. No new context.

---

## What NOT to Add

| Avoid | Why |
|-------|-----|
| SQLite triggers for auto-derive | tauri-plugin-sql has no trigger event channel to React; derive stays in TS query layer where it is testable |
| Background worker / job queue | Single-user desktop, WAL mode; synchronous derive in query layer is sufficient |
| Any new ORM | Prisma dead-end, Drizzle deferred — documented in PROJECT.md Key Decisions |
| New Zustand store for automation state | No persistent state to manage; all derives write to DB synchronously |
| `useFieldArray` for batch-apply selection | Known RHF/dnd-kit ID collision (CONTEXT.md documented decision) — use `useState` for selected unit IDs |
| Any new shadcn/ui component | Existing `Command`, `Badge`, `Checkbox`, `Sheet`, `CommandItem` cover all new UI |

---

## Confidence

| Area | Confidence | Basis |
|------|------------|-------|
| No new library needed | HIGH | Read all four relevant source files directly |
| `syncDerivedStatuses()` extension point | HIGH | Lines 211–272 of `recipeAssignments.ts` read; `section_type` column confirmed on `recipe_sections` |
| is_active_project write point | HIGH | `createAssignment` + `deleteAssignment` both have `db` handle + `unit_id` |
| Faction pre-fill via RHF defaultValues | HIGH | `RecipeFormSheet` confirmed uses `useForm`; `useActiveFaction()` is globally available |
| `UnitPickerDialog` enrichment swap | HIGH | `useUnitsEnriched()` confirmed in `useUnits.ts`; `EnrichedUnit` has all needed columns |
| Batch apply hook exists | HIGH | `useBulkCreateAssignments` at `useRecipeAssignments.ts` lines 124–139, production-proven |
| `section_type` column presence | HIGH | `RecipeSection` type in `src/types/recipeSection.ts` confirms column; added v0.2.9 Phase 57 |

---

*Stack research for: HobbyForge v0.3.7 Smart Automation*
*Researched: 2026-05-28*
