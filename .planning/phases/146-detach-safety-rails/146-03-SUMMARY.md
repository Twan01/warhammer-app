---
phase: 146-detach-safety-rails
plan: "03"
subsystem: hooks-and-ui
tags: [safe-03, delete-dialog, auto-detach, invalidation, tdd]
dependency_graph:
  requires: [recipeTechniqueDetach, detachAllAndDeleteTechnique, getNonDetachedInstanceCount]
  provides: [useDeleteTechnique-rewired, TechniqueDeleteDialog-two-case, TechniqueLibraryTab-live-count]
  affects: [useTechniques, TechniqueDeleteDialog, TechniqueLibraryTab, recipe-surfaces]
tech_stack:
  added: []
  patterns: [prefix-invalidation, live-query-over-stale-prop, two-case-dialog-copy]
key_files:
  created: []
  modified:
    - src/hooks/useTechniques.ts
    - src/features/techniques/TechniqueDeleteDialog.tsx
    - src/features/techniques/TechniqueLibraryTab.tsx
    - tests/techniques/TechniqueDeleteDialog.test.tsx
decisions:
  - "Removed orphaned deleteTechnique import from useTechniques.ts after mutationFn replacement (noUnusedLocals)"
  - "Placed nonDetachedCountQuery after state declarations to avoid hoisting reference to deleting before useState"
  - "liveInstanceCount prop rename at one call site (TechniqueLibraryTab) — safe, no other callers"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_created: 0
---

# Phase 146 Plan 03: Lossless Delete (SAFE-03) Summary

`useDeleteTechnique` rewired to `detachAllAndDeleteTechnique` — live recipe instances are auto-detached (slot-resolved colours baked into plain steps) before the technique is removed. `TechniqueDeleteDialog` extended with two-case copy: case A (no live instances) keeps existing permanent-remove text + "Delete"; case B surfaces the live count and labels the confirm button "Detach N recipe(s) & delete". Count sourced from a live `getNonDetachedInstanceCount` query in `TechniqueLibraryTab` — not the stale `usage_count`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rewire useDeleteTechnique to auto-detach + extend invalidation | 7efdb5c7 | src/hooks/useTechniques.ts |
| 2 | Two-case delete dialog + live count query + updated tests | 440f6337 | src/features/techniques/TechniqueDeleteDialog.tsx, src/features/techniques/TechniqueLibraryTab.tsx, tests/techniques/TechniqueDeleteDialog.test.tsx |

## Verification Results

- `pnpm test -- tests/techniques/TechniqueDeleteDialog.test.tsx`: 8/8 GREEN
- `pnpm build` after Task 1: TypeScript clean, Vite clean
- `pnpm build` after Task 2: TypeScript clean, Vite clean

### Acceptance Criteria Checks

- `useDeleteTechnique.mutationFn` is `detachAllAndDeleteTechnique` — confirmed by grep
- `deleteTechnique` import removed (no remaining reference in useTechniques.ts)
- `onSuccess` includes all eight prefix invalidations: recipe-sections, recipe-steps, recipe-paints, slot-resolution-map, technique-instances, STEP_COUNTS_KEY, RECIPE_SWATCH_KEY, RECIPE_AVAILABILITY_KEY
- `TechniqueDeleteDialog` prop is `liveInstanceCount` — no remaining `usageCount` reference
- Case B (count > 0) renders locked "live-linked / bake the current colours / No recipe content will be lost" copy
- Case B confirm button: "Detach N recipe(s) & delete" (pluralised); loading "Detaching & deleting…"
- Case A (count 0) renders existing "permanently remove" copy and "Delete" label
- `TechniqueLibraryTab` feeds `liveInstanceCount` from live `getNonDetachedInstanceCount` query

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved nonDetachedCountQuery below state declarations**
- **Found during:** Task 2 — writing the `useQuery` call in TechniqueLibraryTab
- **Issue:** Initial placement of the query was above the `useState` declarations for `deleting`, causing a lexical reference to `deleting` before it was declared (TypeScript would error on `deleting?.id` and `deleting!.id`)
- **Fix:** Moved the `nonDetachedCountQuery` block to immediately after all `useState` declarations
- **Files modified:** `src/features/techniques/TechniqueLibraryTab.tsx`
- **Commit:** 440f6337

## Known Stubs

None. Dialog copy is fully wired from a live query; no placeholder values.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced.

| Mitigation | File | Status |
|------------|------|--------|
| T-146-08: silent recipe-content loss | src/hooks/useTechniques.ts | MITIGATED — mutationFn replaced with detachAllAndDeleteTechnique |
| T-146-09: misleading consequence copy | src/features/techniques/TechniqueDeleteDialog.tsx | MITIGATED — two-case copy with consequence-labelled button |
| T-146-10: stale count prop | src/features/techniques/TechniqueLibraryTab.tsx | MITIGATED — live getNonDetachedInstanceCount query |

## Self-Check: PASSED

- `src/hooks/useTechniques.ts` contains `detachAllAndDeleteTechnique`: FOUND (grep: mutationFn: detachAllAndDeleteTechnique)
- `src/features/techniques/TechniqueDeleteDialog.tsx` contains `liveInstanceCount`: FOUND
- `src/features/techniques/TechniqueLibraryTab.tsx` contains `getNonDetachedInstanceCount`: FOUND
- `tests/techniques/TechniqueDeleteDialog.test.tsx` contains `liveInstanceCount`: FOUND
- Commit 7efdb5c7 (Task 1): FOUND
- Commit 440f6337 (Task 2): FOUND
