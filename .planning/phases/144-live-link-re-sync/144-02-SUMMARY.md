---
phase: 144-live-link-re-sync
plan: "02"
subsystem: lib-hooks-data
tags: [pure-diff, resync, invalidation, link-01, link-03, fnd-03]
dependency_graph:
  requires: [144-01]
  provides: [LINK-03-preview-diff, LINK-01-propagation, recipe-cache-invalidation]
  affects: [technique_steps, recipe_sections, recipe_steps, unit_recipe_step_progress]
tech_stack:
  added: []
  patterns: [pure-transform-no-db, single-db-handle-no-begin, react-query-prefix-invalidation, tdd-red-green]
key_files:
  created:
    - src/lib/techniquePreviewDiff.ts
    - tests/lib/techniquePreviewDiff.test.ts
  modified:
    - src/db/queries/techniques.ts
    - src/hooks/useTechniques.ts
decisions:
  - "Prefix invalidation via literal string arrays [\"recipe-sections\"], [\"recipe-paints\"], [\"slot-resolution-map\"] — avoids calling typed key factories with undefined, and React Query prefix matching clears all per-recipe entries without knowing individual recipe IDs"
  - "computeStepDiff reuse via `as never` cast — DraftTechniqueSection is structurally compatible (techniqueDiff.ts re-export comment); avoids duplicating the step-diff logic"
  - "Reorder counting uses global flat position (sequential pos across all sections) vs existing order_index — consistent with how saveTechniqueGraph assigns order_index per section counter"
metrics:
  duration_minutes: 18
  completed_date: "2026-06-22T18:00:00Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 144 Plan 02: Preview Diff, Resync Wiring & Invalidation Summary

**One-liner:** Pure `previewTechniqueResyncDiff` function (LINK-03 counts + isStructural flag), resync call wired into `saveTechniqueGraph` edit path on the shared db handle, and `useUpdateTechnique.onSuccess` prefix-broadcasting 6 recipe-scoped cache keys.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 RED | Failing test for previewTechniqueResyncDiff (LINK-03) | 14ffa1c2 | tests/lib/techniquePreviewDiff.test.ts |
| 1 GREEN | previewTechniqueResyncDiff pure function | 240ac98c | src/lib/techniquePreviewDiff.ts |
| 2 | Wire resync into saveTechniqueGraph + extend invalidation | d0b30986 | src/db/queries/techniques.ts, src/hooks/useTechniques.ts |

## Verification

- `pnpm test -- tests/lib/techniquePreviewDiff.test.ts`: 9/9 GREEN (all cases including metadata-rename isStructural===false)
- `pnpm test -- tests/data-layer/technique-resync.test.ts`: 7/7 GREEN (resync engine non-regression)
- `pnpm test` full suite: 335 test files pass, 6 skipped (pre-existing), 0 failures
- `pnpm build`: TypeScript check + Vite build clean (no error lines)

## Key Design Decisions

### Prefix invalidation via literal arrays

`useUpdateTechnique.onSuccess` uses `["recipe-sections"]`, `["recipe-paints"]`, `["slot-resolution-map"]` literal arrays rather than calling the typed key factories (`RECIPE_SECTIONS_KEY(recipeId)`) with a fake argument. React Query prefix matching correctly clears all cache entries whose key starts with those arrays — covering every recipe simultaneously without knowing individual recipe IDs.

### computeStepDiff reuse in previewTechniqueResyncDiff

`computeStepDiff` from `recipeDiff.ts` is structurally compatible with `DraftTechniqueSection[]` (confirmed by `techniqueDiff.ts` line 13 re-export comment). The `as never` cast mirrors the pattern already used in `techniqueDiff.ts`. This avoids duplicating the step-diff algorithm.

### Reorder counting strategy

A surviving step is counted as a reorder when its global flat position in the draft (sequential index across all sections in order) differs from its existing `order_index`. This is consistent with how `saveTechniqueGraph` assigns `order_index` using per-section counters — because the per-section counter resets at each section, the flat position equals `order_index` for same-section steps.

### resync call placement in edit path

`await resyncTechniqueInstances(db, finalId)` is placed immediately after the final step INSERT loop and before `return finalId`, inside the `else` (edit) branch only. The `db` handle is the one acquired at the top of `saveTechniqueGraph` — no second `getDb()` call, no `BEGIN` (SC#4).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all exports are fully implemented and tested.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes. Changes are confined to:
- Pure transform function (no side effects)
- Addition of one `await` call to an existing edit path
- Addition of cache invalidation calls to an existing `onSuccess` handler

## Self-Check: PASSED

- `src/lib/techniquePreviewDiff.ts` — FOUND
- `tests/lib/techniquePreviewDiff.test.ts` — FOUND
- Commit 14ffa1c2 (RED test) — FOUND
- Commit 240ac98c (GREEN implementation) — FOUND
- Commit d0b30986 (resync wiring + invalidation) — FOUND
- `src/db/queries/techniques.ts` contains `await resyncTechniqueInstances(db, finalId)` — VERIFIED
- `src/hooks/useTechniques.ts` contains `["recipe-sections"]`, `["recipe-paints"]`, `["slot-resolution-map"]` — VERIFIED
