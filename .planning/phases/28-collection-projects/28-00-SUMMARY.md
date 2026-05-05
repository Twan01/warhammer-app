---
phase: 28-collection-projects
plan: "00"
subsystem: testing
tags: [vitest, tdd, wave-0, nyquist, unit-photos, kanban, log-session]

requires:
  - phase: 27-navigation-quick-add
    provides: QuickAddContext + AppSidebar DropdownMenu — foundation for dashboard quick actions

provides:
  - 26 it.skip test stubs covering COLL-01, PROJ-01, PROJ-03 testable behaviors
  - Nyquist validation contract for Wave 1 and Wave 2 production code
  - TODO Wave 1 import comments with exact module paths for stub activation

affects:
  - 28-01 (Wave 1 — activates these stubs when writing production code)
  - 28-02 (Wave 2 — activates logSessionSheet stubs after PROJ-03 implementation)

tech-stack:
  added: []
  patterns:
    - "Wave 0 stubs omit top-level imports of not-yet-existing modules; TODO Wave 1 comment blocks carry exact import paths"
    - "it.skip used (not xit/xtest) — Wave 1 greps it.skip to find activation candidates"

key-files:
  created:
    - tests/collection/unitPhotoLatest.test.ts
    - tests/collection/useLatestUnitPhotos.test.ts
    - tests/painting/kanbanEnrichment.test.ts
    - tests/painting/useKanbanEnrichment.test.ts
    - tests/painting/logSessionSheet.test.ts
  modified: []

key-decisions:
  - "Wave 0 stubs omit top-level imports of not-yet-existing modules — mirrors Phase 18/19/26/27 pattern; TODO Wave 1 comment blocks carry exact import paths"
  - "it.skip used (not xit/xtest) — consistent with Phase 26 Wave 0 decision"
  - "getPhotoCountsByUnitIds stubs appear in both collection (COLL-01) and painting (PROJ-01) test files — same function serves both gallery thumbnails and kanban enrichment"

patterns-established:
  - "Wave 0 stubs: all it.skip, no active imports, TODO Wave 1 comment with exact paths"

requirements-completed:
  - COLL-01
  - PROJ-01
  - PROJ-03

duration: 3min
completed: "2026-05-05"
---

# Phase 28 Plan 00: Wave 0 Test Stubs Summary

**26 it.skip stubs across 5 files establishing the Nyquist validation contract for COLL-01 photo batch queries, PROJ-01 kanban enrichment hooks, and PROJ-03 LogSessionSheet defaultUnitId prop**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-05T13:57:08Z
- **Completed:** 2026-05-05T14:00:36Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created 5 test stub files with 26 it.skip stubs covering COLL-01, PROJ-01, and PROJ-03 testable behaviors
- All stubs compile and skip cleanly — pnpm test exits 0 with 502 passing, 28 skipped (26 new + 2 pre-existing)
- TODO Wave 1 import comments in every file carry exact module paths for activation without ambiguity

## Task Commits

1. **Task 1: Collection query + hook test stubs (COLL-01)** — `bb98bcb` (test)
2. **Task 2: Kanban enrichment + LogSessionSheet test stubs (PROJ-01, PROJ-03)** — `ecfae21` (test)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `tests/collection/unitPhotoLatest.test.ts` — 8 it.skip stubs: getLatestPhotoByUnit (4) + getPhotoCountsByUnitIds (4)
- `tests/collection/useLatestUnitPhotos.test.ts` — 4 it.skip stubs: useLatestUnitPhotos hook Map return shape, query key, staleTime
- `tests/painting/kanbanEnrichment.test.ts` — 6 it.skip stubs: getRecipeNamesByUnitIds (4) + getPhotoCountsByUnitIds kanban (2)
- `tests/painting/useKanbanEnrichment.test.ts` — 4 it.skip stubs: useKanbanEnrichment hook Map returns, sorted key, enabled guard
- `tests/painting/logSessionSheet.test.ts` — 4 it.skip stubs: LogSessionSheet defaultUnitId pre-select, reset on reopen, editability, undefined fallback

## Decisions Made

- Wave 0 stubs omit top-level imports of not-yet-existing modules — mirrors Phase 18/19/26/27 pattern; TODO Wave 1 comment blocks carry exact import paths so Wave 1 knows exactly what to uncomment
- `it.skip` used (not `xit`/`xtest`) — consistent with Phase 26 Wave 0 decision; Wave 1 greps `it.skip` to find activation candidates
- `getPhotoCountsByUnitIds` stubs appear in both collection (COLL-01) and painting (PROJ-01) test files — the same function will serve both gallery thumbnails and kanban card enrichment

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 26 Wave 0 stubs in place; Wave 1 plan (28-01) can activate stubs as it implements `getLatestPhotoByUnit`, `getPhotoCountsByUnitIds`, `useLatestUnitPhotos`, `getRecipeNamesByUnitIds`, `useKanbanEnrichment`
- Wave 2 plan (28-02) activates logSessionSheet stubs after PROJ-03 defaultUnitId prop implementation
- No blockers.

---
*Phase: 28-collection-projects*
*Completed: 2026-05-05*
