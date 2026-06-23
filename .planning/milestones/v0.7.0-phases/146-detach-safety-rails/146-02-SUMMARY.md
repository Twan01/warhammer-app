---
phase: 146-detach-safety-rails
plan: "02"
subsystem: ui-layer
tags: [detach, technique-library, safe-01, safe-02, safe-03, unlink, alert-dialog]
dependency_graph:
  requires: [recipeTechniqueDetach, detachTechniqueInstance, TechniqueSectionBadge]
  provides: [useDetachTechniqueInstance, DetachConfirmDialog, UnlinkAffordance]
  affects: [RecipeSectionCard, RecipeSectionList, recipe_technique_instances, recipe_sections, recipe_steps]
tech_stack:
  added: []
  patterns: [mutation-free card, callback-prop detach, AlertDialog confirmation, 9-key cache invalidation]
key_files:
  created:
    - src/hooks/useTechniqueDetach.ts
    - src/features/recipes/DetachConfirmDialog.tsx
  modified:
    - src/features/recipes/RecipeSectionCard.tsx
    - src/features/recipes/RecipeSectionList.tsx
decisions:
  - "DetachHandler interface defined in RecipeSectionList to type the detach mutation reference passed from TechniqueNameResolver to renderCards without leaking React Query types into the outer shell"
  - "TechniqueNameResolver children signature extended to (nameMap, detach) — avoids a third sub-component and keeps the hook boundary in the existing resolver"
  - "onDetach callback is undefined for non-technique sections and when recipeId is absent — the Unlink button never appears on plain sections or read-only hosts (SectionedTimeline unchanged)"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_created: 2
---

# Phase 146 Plan 02: Detach UI Layer Summary

Editor-only Unlink affordance: ghost icon button adjacent to the "From {technique}" badge in RecipeSectionCard opens a locked-copy AlertDialog; confirming runs the detach mutation (bakes colours, clears FK links, deletes instance) with full 9-key cache invalidation and success/error toasts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useDetachTechniqueInstance hook + DetachConfirmDialog | 00b6ba35 | src/hooks/useTechniqueDetach.ts, src/features/recipes/DetachConfirmDialog.tsx |
| 2 | Wire Unlink affordance into RecipeSectionCard + RecipeSectionList | f11b0238 | src/features/recipes/RecipeSectionCard.tsx, src/features/recipes/RecipeSectionList.tsx |

## Verification Results

- `pnpm test` full suite: 3067 passed, 6 skipped, 38 todo — no regressions
- `pnpm build`: TypeScript clean, Vite build clean

### Acceptance Criteria Checks

**Task 1:**
- `useDetachTechniqueInstance` exports confirmed; `invalidateAfterDetach` invalidates 9 keys (7 per-recipe + TECHNIQUES_WITH_COUNTS_KEY + TECHNIQUE_USAGE_COUNTS_KEY)
- `mutationFn` calls `getDb()` then `detachTechniqueInstance(db, instanceId)` — recipeId not passed to data layer
- `DetachConfirmDialog` renders title "Detach technique?", locked warning + reassurance copy, "Keep link" cancel, destructive confirm with isPending loading label

**Task 2:**
- `RecipeSectionCard` renders Unlink button only when `isTechniqueOwned && techniqueName && onDetach` are all truthy; button carries `aria-label="Detach technique from this section"`
- Card holds NO React Query / mutation hook — mutation-free card preserved
- `RecipeSectionList` passes `onDetach` only for technique-owned sections with non-null `technique_instance_id` and defined `recipeId`
- `SectionedTimeline.tsx`: grep confirms no `DetachConfirmDialog`, `onDetach`, or `useDetachTechniqueInstance` (editor-only)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes. Threat mitigations applied as designed:
- T-146-05 (accidental detach): AlertDialog with explicit "Detach" confirm + "Keep link" cancel gates the action
- T-146-06 (stale cache): 9-key invalidation on success clears all affected query keys

## Self-Check: PASSED

- `src/hooks/useTechniqueDetach.ts` exists: FOUND
- `src/features/recipes/DetachConfirmDialog.tsx` exists: FOUND
- `src/features/recipes/RecipeSectionCard.tsx` modified: FOUND
- `src/features/recipes/RecipeSectionList.tsx` modified: FOUND
- Commit 00b6ba35 (Task 1): FOUND
- Commit f11b0238 (Task 2): FOUND
