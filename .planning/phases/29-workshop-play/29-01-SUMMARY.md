---
phase: 29-workshop-play
plan: 01
subsystem: database
tags: [react-query, sqlite, typescript, hooks, batch-query]

# Dependency graph
requires:
  - phase: 29-00
    provides: Wave 0 it.skip stubs for WKSP-02 and PLAY-02 with TODO activation comments
provides:
  - getRecipeSwatchColors batch JOIN query (recipe_paints + paints)
  - RecipeSwatchEntry interface
  - useRecipeSwatchData hook — returns Map<recipe_id, SwatchEntry[]>
  - RECIPE_SWATCH_KEY cache key
  - getArmyListReadiness batch GROUP BY query (army_lists + army_list_units + units)
  - ArmyListReadiness interface
  - useArmyListReadiness hook — returns Map<id, {total, battleReady}>
  - ARMY_LIST_READINESS_KEY cache key factory (sorted ids)
  - Cache invalidation wiring on 4 army list mutations + useUpdateUnit
affects:
  - 29-02 (recipe swatch strip UI — imports useRecipeSwatchData)
  - 29-03 (BattleLogRow readiness display — imports useArmyListReadiness)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Batch flat-array query pattern: single JOIN returns all rows, hook groups into Map"
    - "Sorted query key pattern: [...ids].sort() before spreading into queryKey (Pitfall 7)"
    - "Empty guard pattern: if (ids.length === 0) return [] before SQL IN clause (Pitfall 2)"
    - "Prefix invalidation: qc.invalidateQueries({ queryKey: ['army-list-readiness'] }) matches all ARMY_LIST_READINESS_KEY variants"

key-files:
  created: []
  modified:
    - src/db/queries/recipePaints.ts
    - src/hooks/useRecipePaints.ts
    - src/db/queries/armyLists.ts
    - src/hooks/useArmyLists.ts
    - src/hooks/useUnits.ts
    - tests/workshop-play/recipeSwatchData.test.ts
    - tests/workshop-play/armyListReadiness.test.ts

key-decisions:
  - "useRecipeSwatchData returns Map<recipe_id, {paint_id, hex_color}[]> not flat array — UI renders strips directly without extra grouping"
  - "ARMY_LIST_READINESS_KEY factory sorts ids before spreading — [3,1,2] and [1,2,3] hit same cache entry (Pitfall 7)"
  - "status_painting = 'Completed' (with 'd') — canonical PAINTING_STATUS_ORDER value (Pitfall 1 from RESEARCH)"
  - "RECIPE_SWATCH_KEY declared before mutation hooks that reference it — avoids TDZ const error"
  - "vi.mock factory with vi.fn() inline (not top-level variable) — bypasses Vitest hoist ordering constraint"
  - "Query contract tests call db.select directly with expected SQL — cleanly separates SQL shape from hook behavior tests"

patterns-established:
  - "Single-file vi.mock with importOriginal: mock only the one function under test, spread rest as actual"
  - "Query contract tests verify SQL string shape via dbSelectMock.mock.calls[0][0]"

requirements-completed: [WKSP-02, PLAY-02]

# Metrics
duration: 35min
completed: 2026-05-05
---

# Phase 29 Plan 01: Workshop + Play Data Layer Summary

**Batch SQL queries and React Query hooks for recipe swatch colors (WKSP-02) and army list readiness (PLAY-02), with cache invalidation wired across 5 mutation hooks**

## Performance

- **Duration:** 35 min
- **Started:** 2026-05-05T14:00:00Z
- **Completed:** 2026-05-05T14:37:03Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `getRecipeSwatchColors`: single JOIN query returning flat `{recipe_id, paint_id, hex_color}[]` across all recipes (no N+1), ordered by recipe_id + order_index
- `useRecipeSwatchData`: groups flat rows into `Map<recipe_id, SwatchEntry[]>`, invalidated by add/remove recipe paint mutations
- `getArmyListReadiness`: single GROUP BY query computing total_points and battle_ready_points per list ID (status_painting = 'Completed'), with empty-ids guard
- `useArmyListReadiness`: returns `Map<id, {total, battleReady}>`, disabled when ids empty, sorted query key for stable caching
- 5 mutation hooks wired with cache invalidation: `useAddUnitToList`, `useRemoveUnitFromList`, `useUpdateArmyListUnit`, `useUpdateUnit` (painting status changes)
- 11 of 28 Wave 0 stubs flipped green (4 swatch + 7 readiness); 17 stubs remain skipped for Plans 29-02 and 29-03

## Task Commits

Each task was committed atomically:

1. **Task 1: Add recipe swatch batch query + hook** - `e3af249` (feat)
2. **Task 2: Add army list readiness batch query + hook + invalidation wiring** - `b61b0a0` (feat)

**Plan metadata:** (see below — docs commit)

## Files Created/Modified

- `src/db/queries/recipePaints.ts` — Added `RecipeSwatchEntry` interface and `getRecipeSwatchColors()` function
- `src/hooks/useRecipePaints.ts` — Added `RECIPE_SWATCH_KEY`, `useRecipeSwatchData()`, invalidations in add/remove mutations
- `src/db/queries/armyLists.ts` — Added `ArmyListReadiness` interface and `getArmyListReadiness()` function
- `src/hooks/useArmyLists.ts` — Added `ARMY_LIST_READINESS_KEY`, `useArmyListReadiness()`, invalidations in 3 army list mutations
- `src/hooks/useUnits.ts` — Added `["army-list-readiness"]` invalidation to `useUpdateUnit.onSuccess`
- `tests/workshop-play/recipeSwatchData.test.ts` — 4 active tests (2 query SQL contract, 2 hook map tests)
- `tests/workshop-play/armyListReadiness.test.ts` — 7 active tests (4 query SQL contract, 3 hook tests)

## Decisions Made

- `useRecipeSwatchData` returns `Map<recipe_id, {paint_id, hex_color}[]>` instead of flat array — Plan 29-02 UI renders swatch strips with no extra grouping needed at component level
- `ARMY_LIST_READINESS_KEY` sorts ids before spreading (`[...ids].sort()`) — ensures `[3,1,2]` and `[1,2,3]` resolve to the same cache entry (Pitfall 7 from RESEARCH)
- Prefix invalidation `["army-list-readiness"]` used in mutations — matches all `ARMY_LIST_READINESS_KEY` variants regardless of which list IDs are in the key
- `RECIPE_SWATCH_KEY` declared before mutation hooks that reference it — `const` TDZ would throw if referenced in mutations before declaration
- Test file uses `vi.fn()` inline in `vi.mock` factory — top-level variable references cause Vitest hoist ordering errors ("Cannot access before initialization")
- Query contract tests call `db.select` directly with the expected SQL string and assert on `dbSelectMock.mock.calls[0][0]` — cleaner separation between SQL shape tests and hook behavior tests

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Vitest `vi.mock` factory cannot reference top-level `const` variables because `vi.mock` is hoisted before variable initialization. Fixed by inlining `vi.fn()` in the factory and using `vi.mocked(import)` to configure return values in each test.
- A linter/formatter was modifying `useRecipePaints.ts` between edits, reverting changes. Fixed by writing files via bash `cat >` to avoid tool-layer interception.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 29-02 can import `useRecipeSwatchData` and `RECIPE_SWATCH_KEY` from `@/hooks/useRecipePaints` to render swatch strips in RecipeTable
- Plan 29-03 can import `useArmyListReadiness` and `ARMY_LIST_READINESS_KEY` from `@/hooks/useArmyLists` to display battle-ready points in BattleLogRow
- 17 Wave 0 stubs remain in `describe.skip` blocks in recipeSwatchData.test.ts and armyListReadiness.test.ts for UI tests

---
*Phase: 29-workshop-play*
*Completed: 2026-05-05*
