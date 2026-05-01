---
phase: 07-paint-inventory
plan: "02"
subsystem: paint-inventory
tags: [query, hook, tanstack-query, sqlite, tdd]
dependency_graph:
  requires: [06-04]
  provides: [getRecipeIdsByPaintId, useRecipeIdsByPaint, RECIPE_IDS_BY_PAINT_KEY]
  affects: [07-03]
tech_stack:
  added: []
  patterns: [SELECT DISTINCT join-table query, per-entity TanStack Query key factory, disabled-on-null hook pattern]
key_files:
  created:
    - tests/paint-inventory/recipePaintQuery.test.ts
  modified:
    - src/db/queries/recipePaints.ts
    - src/hooks/useRecipePaints.ts
decisions:
  - "useRecipePaints.ts already existed with 3 exports (useRecipePaints, useAddRecipePaint, useRemoveRecipePaint) — appended RECIPE_IDS_BY_PAINT_KEY and useRecipeIdsByPaint additively rather than creating a second file"
  - "Hook uses disabled fallback queryKey ['recipe-ids-by-paint', 'disabled'] when paintId is null/undefined to satisfy TanStack Query's requirement for a defined queryKey even when enabled: false"
metrics:
  duration: "4 minutes"
  completed_date: "2026-05-01"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 7 Plan 02: Recipe-Paint Query + Hook Summary

**One-liner:** SELECT DISTINCT recipe_id query + disabled-on-null TanStack Query hook for PINV-05 recipe filter back-end.

## What Was Built

### 1 new query function added (additive)

`getRecipeIdsByPaintId(paintId: number): Promise<number[]>` appended to `src/db/queries/recipePaints.ts`.

- Executes exactly: `SELECT DISTINCT recipe_id FROM recipe_paints WHERE paint_id = $1`
- Returns a plain `number[]` by mapping `rows.map((r) => r.recipe_id)`
- DISTINCT prevents duplicate recipe IDs when a paint appears on multiple steps of the same recipe
- The three pre-existing exports (`getRecipePaintsByRecipe`, `addRecipePaint`, `removeRecipePaint`) are preserved unchanged

### 2 new hook exports added (additive)

Appended to `src/hooks/useRecipePaints.ts` (file already existed):

- `RECIPE_IDS_BY_PAINT_KEY(paintId)` — per-paint cache key factory returning `["recipe-ids-by-paint", paintId] as const`
- `useRecipeIdsByPaint(paintId: number | null | undefined)` — TanStack Query wrapper; disabled when `paintId` is null or undefined so Plan 03's `RecipesPage.tsx` can call it unconditionally

### 3 tests (all passing)

`tests/paint-inventory/recipePaintQuery.test.ts` — mocked `getDb` assertions:

1. Asserts exact SQL literal `SELECT DISTINCT recipe_id FROM recipe_paints WHERE paint_id = $1` and params `[5]`
2. Asserts row-to-number mapping: `[{recipe_id:1},{recipe_id:2},{recipe_id:3}]` → `[1, 2, 3]`
3. Asserts empty-array return when no rows

Test suite: 157 tests passing (up from 154).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] useRecipePaints.ts already existed**

- **Found during:** Task 2
- **Issue:** The plan described `src/hooks/useRecipePaints.ts` as a "new file" but it already existed with `useRecipePaints`, `useAddRecipePaint`, and `useRemoveRecipePaint` exports (written in Phase 4)
- **Fix:** Appended `RECIPE_IDS_BY_PAINT_KEY` and `useRecipeIdsByPaint` additively to the existing file, mirroring the same additive approach used in Task 1 for `recipePaints.ts`. All existing exports preserved.
- **Files modified:** `src/hooks/useRecipePaints.ts`
- **Commit:** dda6f85

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/db/queries/recipePaints.ts | FOUND |
| src/hooks/useRecipePaints.ts | FOUND |
| tests/paint-inventory/recipePaintQuery.test.ts | FOUND |
| .planning/phases/07-paint-inventory/07-02-SUMMARY.md | FOUND |
| Commit 2563f93 (Task 1) | FOUND |
| Commit dda6f85 (Task 2) | FOUND |
| 157 tests passing | CONFIRMED |
