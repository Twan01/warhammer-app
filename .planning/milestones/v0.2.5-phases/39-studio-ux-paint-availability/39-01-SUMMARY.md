---
phase: 39-studio-ux-paint-availability
plan: 01
subsystem: database
tags: [react-query, sqlite, typescript, hooks, paint-availability, tdd]

# Dependency graph
requires:
  - phase: 38-structured-step-input
    provides: recipe_steps table with paint_id, owned/running_low columns in paints
  - phase: 37-recipe-schema-batch-query
    provides: getStepCountsByRecipe batch pattern, useAllStepCounts hook pattern
provides:
  - getRecipePaintAvailability() batch SQL query — per-recipe owned/missing/running_low counts in one JOIN GROUP BY
  - useRecipePaintAvailability() React Query hook — Map<recipe_id, AvailabilityStats> with camelCase keys
  - RECIPE_AVAILABILITY_KEY constant for cache invalidation
  - AvailabilityStats interface exported from useRecipePaints.ts
  - Cache invalidation wiring: useUpdatePaint and useDeletePaint now bust recipe availability cache
affects:
  - 39-02 (card grid — consumes useRecipePaintAvailability for badge display)
  - 39-03 (detail timeline — consumes availability stats per recipe)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Batch GROUP BY JOIN query returning per-entity aggregated counts in one SQL round-trip"
    - "TDD with split mock strategy: vi.mock db/client for query tests, vi.mock query module for hook tests"
    - "mockImplementation restore pattern for testing real function body through module-level mock"

key-files:
  created:
    - tests/painting/recipePaintAvailability.test.ts
  modified:
    - src/db/queries/recipePaints.ts
    - src/hooks/useRecipePaints.ts
    - src/hooks/usePaints.ts

key-decisions:
  - "Split TDD mock strategy: vi.mock('@/db/client') captures SQL for query tests; vi.mock('@/db/queries/recipePaints', importOriginal) wraps the module for hook tests — prevents conflicts between the two approaches"
  - "mockImplementation restores real function body in query tests, routing calls through the db/client mock to capture the actual SQL strings"
  - "RECIPE_AVAILABILITY_KEY excluded from useCreatePaint — creating a new paint cannot affect existing step links, so availability data remains valid (cache symmetry rule applied precisely)"

patterns-established:
  - "Split-mock TDD: use two separate vi.mock strategies in the same file — db/client for unit testing query SQL, query module for testing hook mapping logic"

requirements-completed: [PAINT-01]

# Metrics
duration: 9min
completed: 2026-05-07
---

# Phase 39 Plan 01: Studio UX — Paint Availability Data Layer Summary

**Batch SQL query + React Query hook delivering per-recipe owned/missing/running_low paint counts via single GROUP BY JOIN, with immediate cache invalidation on paint ownership changes**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-07T09:19:32Z
- **Completed:** 2026-05-07T09:28:58Z
- **Tasks:** 2
- **Files modified:** 4 (3 source + 1 test created)

## Accomplishments
- `getRecipePaintAvailability()` — single SQL query JOINing recipe_steps + paints, returning `{recipe_id, owned, missing, running_low}` per recipe via CASE WHEN aggregation; excludes steps with `paint_id IS NULL OR paint_id = 0`
- `useRecipePaintAvailability()` hook — returns `Map<number, AvailabilityStats>` with camelCase keys (`runningLow` not `running_low`), matching the existing `useAllStepCounts` pattern
- Cache invalidation symmetry restored: `useUpdatePaint` and `useDeletePaint` now bust `RECIPE_AVAILABILITY_KEY` so recipe card badges refresh immediately when paint ownership changes on the Paints page
- 9 new TDD tests covering SQL contract (WHERE clause, GROUP BY, CASE WHEN patterns), RECIPE_AVAILABILITY_KEY value, and hook Map mapping — all passing, zero regressions in full suite (851 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add batch paint availability query and hook** - `c18452b` (feat)
2. **Task 2: Wire cache invalidation in usePaints mutation hooks** - `68fdf76` (feat)

**Plan metadata:** (committed with docs commit below)

_Note: Task 1 used TDD — tests written first (RED), implementation added (GREEN), all passing_

## Files Created/Modified
- `src/db/queries/recipePaints.ts` — added `RecipePaintAvailability` interface and `getRecipePaintAvailability()` function at end of file
- `src/hooks/useRecipePaints.ts` — added `RECIPE_AVAILABILITY_KEY`, `AvailabilityStats` interface, `useRecipePaintAvailability()` hook; updated import to include `getRecipePaintAvailability`
- `src/hooks/usePaints.ts` — imported `RECIPE_AVAILABILITY_KEY`; added invalidation call to `useUpdatePaint.onSuccess` and `useDeletePaint.onSuccess`
- `tests/painting/recipePaintAvailability.test.ts` — 9 tests across 3 suites (query contract, key constant, hook mapping)

## Decisions Made
- **Split-mock TDD strategy:** Using `vi.mock("@/db/client")` to capture SQL strings for query tests and `vi.mock("@/db/queries/recipePaints", async importOriginal)` for hook tests. These two mocks conflict if a single strategy is used — splitting them with `mockImplementation` to restore the real function body for query tests allows both approaches to coexist cleanly in one test file.
- **RECIPE_AVAILABILITY_KEY excluded from useCreatePaint:** A new paint has no recipe_step links yet, so availability counts cannot be affected. Only update (ownership change) and delete (paint removed) require invalidation. This follows the cache symmetry rule precisely rather than over-invalidating.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test file restructured — split-mock strategy to avoid conflict**
- **Found during:** Task 1 (TDD RED/GREEN cycle)
- **Issue:** Initial test file used `vi.mock("@/db/client")` to capture `selectMock` for query tests AND `vi.mock("@/db/queries/recipePaints")` for hook tests. The module-level mock replaced `getRecipePaintAvailability` before it could call `selectMock`, causing 6 of 9 tests to fail even after GREEN implementation.
- **Fix:** Added `vi.mocked(getRecipePaintAvailability).mockImplementation(...)` in query test `beforeEach` to restore the real function body, routing the actual SQL through `selectMock`. Hook tests use the module-level mock normally.
- **Files modified:** `tests/painting/recipePaintAvailability.test.ts`
- **Verification:** All 9 tests pass after restructure
- **Committed in:** `c18452b` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — test conflict resolution)
**Impact on plan:** Purely test infrastructure. Production code matches plan exactly. No scope creep.

## Issues Encountered
- **Pre-existing build errors in `tests/painting/formatMinutes.test.tsx`** (TS2556, TS2322 — spread argument and RecipeStep[] type errors): These existed before Phase 39 and were introduced in Phase 38 plan 01 (commit `715f129`). They are out-of-scope per the scope boundary rule. Logged to deferred-items for future resolution. My changes introduce zero new TypeScript errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `useRecipePaintAvailability()` is ready for consumption by Plan 02 (recipe card grid with paint availability badges)
- `AvailabilityStats` and `RECIPE_AVAILABILITY_KEY` are exported and ready to import
- Cache invalidation is wired — Plan 02 and 03 get live updates automatically when paint ownership changes
- Blocker: pre-existing TS errors in formatMinutes.test.tsx should be resolved before `pnpm build` is used as a gate for future plans

---
*Phase: 39-studio-ux-paint-availability*
*Completed: 2026-05-07*
