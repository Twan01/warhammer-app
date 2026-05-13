---
phase: 69-paintless-recipe-steps
plan: 01
subsystem: recipes
tags: [schema-migration, null-safety, recipe-steps]
dependency_graph:
  requires: []
  provides: [nullable-paint-id, paintless-step-save]
  affects: [RecipeFormSheet, SectionedTimeline, RecipeStepTimeline, RecipeDetailSheet]
tech_stack:
  added: []
  patterns: [sqlite-table-rebuild]
key_files:
  created:
    - src-tauri/migrations/022_paintless_steps.sql
  modified:
    - src-tauri/src/lib.rs
    - src/types/recipePaint.ts
    - src/features/recipes/RecipeFormSheet.tsx
    - src/features/recipes/SectionedTimeline.tsx
    - src/features/recipes/RecipeStepTimeline.tsx
    - src/features/recipes/RecipeDetailSheet.tsx
decisions:
  - SQLite table-rebuild pattern used for paint_id nullable migration (14-column explicit copy)
  - Null-safety type narrowing via filter type predicate in RecipeDetailSheet
metrics:
  duration: 3m
  completed: 2026-05-13T08:18:00Z
  tasks_completed: 2
  tasks_total: 2
---

# Phase 69 Plan 01: Paintless Recipe Steps Summary

Nullable paint_id via SQLite table-rebuild migration, guard removal for unconditional step saves, and null-safety fixes across 4 recipe components.

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration 022 + type update + lib.rs registration | ab9d0a1 | 022_paintless_steps.sql, lib.rs, recipePaint.ts, RecipeDetailSheet.tsx, RecipeStepTimeline.tsx, SectionedTimeline.tsx |
| 2 | Guard removal | e337fe7 | RecipeFormSheet.tsx |

## What Was Done

1. **Migration 022** - Created `022_paintless_steps.sql` with the SQLite table-rebuild pattern: `PRAGMA foreign_keys = OFF`, CREATE TABLE with 14 columns (paint_id now nullable), INSERT-SELECT with explicit column list, DROP old table, RENAME, `PRAGMA foreign_keys = ON`. Registered as version 22 in `lib.rs`.

2. **Type update** - Changed `RecipeStep.paint_id` from `number` to `number | null` in `src/types/recipePaint.ts`. `CreateRecipeStepInput` inherits this change automatically via `Omit`.

3. **Guard removal** - Removed the `if (s.paint_id !== null)` guard in `RecipeFormSheet.tsx` that prevented paintless steps from being saved. All steps now flow through to `addRecipePaint.mutateAsync` unconditionally.

4. **SectionedTimeline fix** - Added `step.paint_id === null` to the continue condition in the availability computation, preventing paintless steps from being counted as "missing paint" in section badges.

5. **Null-safety fixes** - Fixed TypeScript errors in `RecipeDetailSheet.tsx` (type predicate narrowing on filter), `RecipeStepTimeline.tsx` (conditional paintMap lookup), and `SectionedTimeline.tsx` (null guard before paintMap.get).

## Verification

- `pnpm build` passes with zero TypeScript errors
- Migration SQL has exactly 14 columns in both CREATE TABLE and INSERT-SELECT
- lib.rs registers version 22 after version 21
- RecipeFormSheet save loop has no paint_id guard
- SectionedTimeline availability computation skips null paint_id
- Downstream queries verified unchanged: `getRecipePaintAvailability` has `WHERE rs.paint_id IS NOT NULL`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript errors from nullable paint_id propagation**
- **Found during:** Task 1
- **Issue:** Changing `paint_id` to `number | null` caused TS2345 errors in 3 files where `paintMap.get(step.paint_id)` expected `number`
- **Fix:** Added null guards: type predicate filter in RecipeDetailSheet, conditional lookup in RecipeStepTimeline, null check in SectionedTimeline continue condition (this last one was also the planned Task 2 SectionedTimeline fix)
- **Files modified:** RecipeDetailSheet.tsx, RecipeStepTimeline.tsx, SectionedTimeline.tsx
- **Commit:** ab9d0a1

## Known Stubs

None.
