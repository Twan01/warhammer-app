---
phase: 28-collection-projects
plan: "01"
subsystem: database
tags: [react-query, sqlite, typescript, vitest, hooks, batch-queries]

requires:
  - phase: 28-00
    provides: Wave 0 test stubs (it.skip) with TODO Wave 1 comments carrying exact import paths

provides:
  - getLatestPhotoByUnit batch query (MAX(id) subquery, returns UnitPhoto[])
  - getPhotoCountsByUnitIds batch query (grouped counts with positional params + guard)
  - getRecipeNamesByUnitIds batch query (unit-linked recipes only, guard + positional params)
  - useLatestUnitPhotos hook (Map<entity_id, UnitPhotoWithUrl>, staleTime Infinity)
  - LATEST_UNIT_PHOTOS_KEY constant (invalidated by create + delete photo mutations)
  - useKanbanEnrichment hook (parallel recipe names + photo counts, sorted key for dnd stability)
  - KANBAN_ENRICHMENT_KEY factory (sorted unitIds spread)
  - KanbanEnrichment interface { recipeNames: Map<number,string>, photoCounts: Map<number,number> }
  - useCreateRecipe + useUpdateRecipe now invalidate ["kanban-enrichment"]
  - LogSessionSheet defaultUnitId? prop (pre-populates unit picker, in useEffect deps)

affects:
  - 28-02 onwards (kanban UI and gallery UI consume these hooks)
  - Any future mutation that creates/deletes photos (must invalidate LATEST_UNIT_PHOTOS_KEY)
  - Any future mutation that creates/updates recipes (already wired via useRecipes)

tech-stack:
  added: []
  patterns:
    - "Batch query with MAX(id) subquery instead of MAX(taken_at) for nullable-date correctness (Pitfall 1)"
    - "Dynamic positional params for IN clause: unitIds.map((_,i)=>`$${i+1}`).join(', ') (Pitfall 3)"
    - "Guard clause: if (unitIds.length === 0) return [] — prevents empty IN clause"
    - "Sorted query key: [...unitIds].sort() prevents re-fetch on dnd-kit card reorder (Pitfall 2)"
    - "Wave 0 .ts stubs renamed to .tsx when activated tests require JSX renderHook wrappers"
    - "useEffect deps include defaultUnitId so form resets correctly on re-open for different unit (Pitfall 4)"

key-files:
  created:
    - src/hooks/useKanbanEnrichment.ts
    - tests/collection/useLatestUnitPhotos.test.tsx
    - tests/painting/useKanbanEnrichment.test.tsx
    - tests/painting/logSessionSheet.test.tsx
  modified:
    - src/db/queries/unitPhotos.ts
    - src/db/queries/recipes.ts
    - src/hooks/useUnitPhotos.ts
    - src/hooks/useRecipes.ts
    - src/features/dashboard/LogSessionSheet.tsx
    - tests/collection/unitPhotoLatest.test.ts
    - tests/painting/kanbanEnrichment.test.ts

key-decisions:
  - "Wave 0 .ts stubs renamed to .tsx for JSX renderHook wrappers — .ts extension causes esbuild parse error on JSX syntax"
  - "getAllByText used in LogSessionSheet tests instead of getByText — shadcn Select renders both a visible span and a hidden native option with identical text content"
  - "beforeEach mockReset required in useKanbanEnrichment tests — shared module-level mock fns accumulate calls across tests without it"
  - "LATEST_UNIT_PHOTOS_KEY invalidated by both useCreateUnitPhoto.onSuccess and useDeleteUnitPhoto.onSettled — onSettled ensures invalidation even on error path"
  - "kanban-enrichment invalidation uses literal array ['kanban-enrichment'] in useRecipes — matches project pattern for cross-module invalidation (no import of KANBAN_ENRICHMENT_KEY needed)"

requirements-completed: [COLL-01, PROJ-01, PROJ-03]

duration: 10min
completed: "2026-05-05"
---

# Phase 28 Plan 01: Data Layer Summary

**3 batch SQL query functions + useLatestUnitPhotos + useKanbanEnrichment hooks + LogSessionSheet defaultUnitId prop, converting 26 Wave 0 stubs to 26 passing tests**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-05T14:03:59Z
- **Completed:** 2026-05-05T14:13:39Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Added `getLatestPhotoByUnit` (MAX(id) batch subquery), `getPhotoCountsByUnitIds` (grouped counts), `getRecipeNamesByUnitIds` (unit-only recipe names) — all with guard clauses and positional params
- Created `useLatestUnitPhotos` returning `Map<number, UnitPhotoWithUrl>` with staleTime:Infinity and invalidation wired to photo mutations; created `useKanbanEnrichment` with sorted query key and parallel Promise.all fetch
- Extended `LogSessionSheet` with `defaultUnitId?: number` prop and fixed useEffect deps (Pitfall 4)
- Flipped all 26 Wave 0 `it.skip` stubs to active passing tests across 5 test files

## Task Commits

1. **Task 1: Add batch query functions + flip query test stubs** - `84f9ce9` (feat)
2. **Task 2: Create hooks + extend LogSessionSheet + flip hook test stubs** - `f097240` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/db/queries/unitPhotos.ts` — added `getLatestPhotoByUnit` + `getPhotoCountsByUnitIds`
- `src/db/queries/recipes.ts` — added `getRecipeNamesByUnitIds`
- `src/hooks/useUnitPhotos.ts` — added `LATEST_UNIT_PHOTOS_KEY`, `useLatestUnitPhotos`, wired invalidation
- `src/hooks/useKanbanEnrichment.ts` — new file: `useKanbanEnrichment`, `KANBAN_ENRICHMENT_KEY`, `KanbanEnrichment`
- `src/hooks/useRecipes.ts` — added kanban-enrichment invalidation to create + update mutations
- `src/features/dashboard/LogSessionSheet.tsx` — `defaultUnitId?: number` prop + buildDefaultValues param + useEffect dep
- `tests/collection/unitPhotoLatest.test.ts` — 8 stubs flipped (getLatestPhotoByUnit + getPhotoCountsByUnitIds)
- `tests/painting/kanbanEnrichment.test.ts` — 6 stubs flipped (getRecipeNamesByUnitIds + getPhotoCountsByUnitIds)
- `tests/collection/useLatestUnitPhotos.test.tsx` — 4 stubs flipped (hook Map return + key + staleTime)
- `tests/painting/useKanbanEnrichment.test.tsx` — 4 stubs flipped (Maps + sorted key + enabled:false)
- `tests/painting/logSessionSheet.test.tsx` — 4 stubs flipped (defaultUnitId pre-select + reset + editable + undefined)

## Decisions Made

- Wave 0 `.test.ts` stubs renamed to `.test.tsx` when activated tests require JSX — esbuild errors on JSX in `.ts` files
- `getAllByText` in LogSessionSheet tests — shadcn Select renders the selected value in both a visible `<span data-slot="select-value">` and a hidden native `<option>`, causing `getByText` to throw "Found multiple elements"
- `beforeEach mockReset` added to useKanbanEnrichment tests — module-level mocks accumulate calls across tests without explicit reset
- `LATEST_UNIT_PHOTOS_KEY` invalidated in `onSettled` of `useDeleteUnitPhoto` (not just `onSuccess`) so the batch query refreshes even when optimistic delete rolls back

## Deviations from Plan

None — plan executed exactly as written. The only deviations were minor test assertion corrections (getAllByText, beforeEach reset) discovered during test runs.

## Issues Encountered

- Wave 0 test stubs used `.test.ts` extension but activated tests needed JSX syntax for `renderHook` wrappers — renamed to `.test.tsx` at activation (Rule 3 auto-fix, no architectural change)
- `getByText` in LogSessionSheet tests failed with "Found multiple elements" because shadcn Select renders duplicate text — fixed with `getAllByText` (Rule 1 auto-fix)
- `useKanbanEnrichment` "enabled is false" test failed due to mock call count accumulated from prior tests — added `beforeEach(() => mock.mockReset())` (Rule 1 auto-fix)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 3 batch query functions ready for consumption by Wave 2 UI plans
- `useLatestUnitPhotos` ready for gallery thumbnail rendering (COLL-01)
- `useKanbanEnrichment` ready for kanban card enrichment (PROJ-01)
- `LogSessionSheet` ready for contextual "Log Session" buttons from unit cards (PROJ-03)
- Wave 0 stubs all green — full test suite at 528 passing

---
*Phase: 28-collection-projects*
*Completed: 2026-05-05*
