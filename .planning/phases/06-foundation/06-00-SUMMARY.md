---
phase: 06-foundation
plan: "00"
subsystem: testing
tags: [vitest, unit-tests, stubs, wave-0, tdd-scaffold]

# Dependency graph
requires: []
provides:
  - tests/foundation/migration004.test.ts — 6 it.skip stubs for STRAT-06 migration content
  - tests/foundation/armyListQueries.test.ts — 9 it.skip stubs for army list query functions
  - tests/foundation/strategyNoteQueries.test.ts — 5 it.skip stubs for strategy note upsert
  - tests/foundation/usePaints.test.ts — 9 it.skip stubs for PAINTS_WITH_RECIPES_KEY invalidations
affects:
  - 06-01 (migration test — fills migration004.test.ts)
  - 06-02 (types — compile check, no test file dependency)
  - 06-03 (queries — fills armyListQueries.test.ts + strategyNoteQueries.test.ts)
  - 06-04 (hooks — fills usePaints.test.ts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave-0 stub pattern: describe blocks named per VALIDATION.md -t filter strings, it.skip() bodies empty, no imports (vitest globals:true)"

key-files:
  created:
    - tests/foundation/migration004.test.ts
    - tests/foundation/armyListQueries.test.ts
    - tests/foundation/strategyNoteQueries.test.ts
    - tests/foundation/usePaints.test.ts
  modified: []

key-decisions:
  - "No imports in stub files — vitest globals:true means describe/it/expect are available globally"
  - "Describe block names match VALIDATION.md -t filter strings exactly so later plans can run pnpm test -- -t 'migration' etc."
  - "No production code touched in Wave-0 — only test scaffold"

patterns-established:
  - "Wave-0 stub pattern: skip-stub test files with describe blocks named per -t filter strings, filled in-place by Wave-1/2 plans"

requirements-completed:
  - STRAT-06

# Metrics
duration: 2min
completed: 2026-05-01
---

# Phase 6 Plan 00: Wave-0 Test Scaffolds Summary

**Four it.skip stub files under tests/foundation/ establish the Wave-0 test contract for STRAT-06 migration, army list queries, strategy note upsert, and usePaints double-invalidation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-01T20:49:22Z
- **Completed:** 2026-05-01T20:51:36Z
- **Tasks:** 1
- **Files modified:** 4 (created)

## Accomplishments
- Created tests/foundation/ directory with 4 Wave-0 stub files (29 it.skip entries total)
- All describe blocks named exactly per VALIDATION.md -t filter strings for precise pnpm test -- -t "migration" targeting
- pnpm test exits 0: 113 passing, 29 skipped — no regressions, vitest discovers all 4 new files
- No production code touched; pure test contract establishment

## Task Commits

Each task was committed atomically:

1. **Task 1: Create four Wave-0 test stub files under tests/foundation/** - `5aa237a` (feat)

**Plan metadata:** (committed with SUMMARY.md below)

## Files Created/Modified
- `tests/foundation/migration004.test.ts` — 6 it.skip stubs: ALTER TABLE content verification + lib.rs registration (for 06-01)
- `tests/foundation/armyListQueries.test.ts` — 9 it.skip stubs: getArmyLists, createArmyList, deleteArmyList, addUnitToList, removeUnitFromList, updateArmyListUnit NULL-passthrough (for 06-03)
- `tests/foundation/strategyNoteQueries.test.ts` — 5 it.skip stubs: getStrategyNote null case, upsertStrategyNote INSERT/UPDATE paths, INTEGER save column (for 06-03)
- `tests/foundation/usePaints.test.ts` — 9 it.skip stubs: PAINTS_WITH_RECIPES_KEY constant + useCreatePaint/useUpdatePaint/useDeletePaint invalidations + usePaintsWithRecipeCount (for 06-04)

## Decisions Made
- No imports added to stub files — vitest globals:true makes describe/it/expect available without imports, keeping stubs minimal
- Describe block names match VALIDATION.md -t filter strings verbatim so pnpm test -- -t "migration" / "armyLists" / "strategyNotes" / "usePaints" each target exactly the right file
- Wave-0 pattern mirrors 03-00 decision recorded in STATE.md: stubs are filled in-place by later plans, never restructured

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wave-0 scaffold complete: 06-01 can fill migration004.test.ts, 06-03 can fill armyListQueries.test.ts + strategyNoteQueries.test.ts, 06-04 can fill usePaints.test.ts
- All describe blocks are in place; Wave-1/2 plans replace it.skip with real assertions in-place
- No blockers for next plan execution

---
*Phase: 06-foundation*
*Completed: 2026-05-01*
