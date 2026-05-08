---
phase: 10-theming-foundation
plan: "00"
subsystem: testing
tags: [vitest, describe.skip, wave-0, tdd, theming, faction-accent]

# Dependency graph
requires: []
provides:
  - "tests/theming/useActiveFaction.test.ts — Wave 0 stub (THEME-01 + THEME-02, 2 describe.skip, 6 it.skip)"
  - "tests/theming/FactionSummaryCard.test.tsx — Wave 0 stub (THEME-03, 1 describe.skip, 5 it.skip)"
  - "tests/theming/AppSidebar.test.tsx — Wave 0 stub (UI-01 + UI-02, 1 describe.skip, 3 it.skip)"
  - "tests/theming/NavItem.test.tsx — Wave 0 stub (UI-03 + THEME-01 nav, 2 describe.skip, 4 it.skip)"
affects:
  - "10-01 (replaces useActiveFaction stubs with real assertions)"
  - "10-02 (replaces FactionSummaryCard + NavItem active-class stubs)"
  - "10-03 (replaces AppSidebar + NavItem tooltip stubs)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 describe.skip stub pattern: no SUT imports, it.skip with TODO markers naming the plan that fills each body"
    - "Explicit `import { describe, it } from 'vitest'` in every stub for tsc strict-mode compatibility"

key-files:
  created:
    - tests/theming/useActiveFaction.test.ts
    - tests/theming/FactionSummaryCard.test.tsx
    - tests/theming/AppSidebar.test.tsx
    - tests/theming/NavItem.test.tsx
  modified: []

key-decisions:
  - "Wave 0 stubs contain no SUT imports — source-under-test files don't exist yet; imports land in plans 10-01/02/03 alongside replacing .skip bodies"
  - "Explicit vitest named imports used (import { describe, it } from 'vitest') to satisfy tsc strict even though globals:true makes them global at runtime"
  - "tests/theming/ directory created as new subdirectory; vitest resolves path automatically from include glob tests/**/*.test.ts(x)"

patterns-established:
  - "Wave 0 stub pattern: create describe.skip blocks with it.skip stubs and TODO markers naming the plan that fills each body; no production code touches"
  - "Each stub file documents the exact assertions the fill-in plan will write — serves as a specification contract"

requirements-completed:
  - THEME-01
  - THEME-02
  - THEME-03
  - UI-01
  - UI-02
  - UI-03

# Metrics
duration: 4min
completed: 2026-05-03
---

# Phase 10 Plan 00: Theming Foundation Wave 0 Stubs Summary

**Four describe.skip stub files under tests/theming/ closing the Nyquist gap for plans 10-01..03: 18 total it.skip stubs across useActiveFaction (6), FactionSummaryCard (5), AppSidebar (3), NavItem (4), with no SUT imports and full suite still green at 178 passed.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-03T08:33:29Z
- **Completed:** 2026-05-03T08:37:19Z
- **Tasks:** 3
- **Files modified:** 4 (all created)

## Accomplishments
- Created `tests/theming/` directory with 4 Wave 0 stub test files
- 18 it.skip stubs documenting exact assertions plans 10-01, 10-02, and 10-03 must implement
- Full test suite remains green: 178 passed, 18 skipped (was 178 passed, 0 skipped), 0 failed
- TypeScript type-check (`pnpm tsc --noEmit`) exits 0 — all vitest imports resolve correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: useActiveFaction.test.ts (THEME-01 + THEME-02 stub)** - `518f51c` (test)
2. **Task 2: FactionSummaryCard.test.tsx (THEME-03 stub)** - `2f4c42f` (test)
3. **Task 3: AppSidebar.test.tsx + NavItem.test.tsx (UI-01..03 stubs)** - `501c531` (test)

**Plan metadata:** (docs commit follows this summary)

## Files Created/Modified
- `tests/theming/useActiveFaction.test.ts` — 2 describe.skip blocks, 6 it.skip stubs for THEME-01 (DOM setProperty) and THEME-02 (localStorage persistence)
- `tests/theming/FactionSummaryCard.test.tsx` — 1 describe.skip block, 5 it.skip stubs for THEME-03 (isActive ring/badge, click, Enter, Space)
- `tests/theming/AppSidebar.test.tsx` — 1 describe.skip block, 3 it.skip stubs for UI-01 + UI-02 (default collapsed=false, toggle, localStorage write)
- `tests/theming/NavItem.test.tsx` — 2 describe.skip blocks, 4 it.skip stubs for UI-03 (collapsed tooltip) and THEME-01 (active bg-faction-accent class)

## Decisions Made
- No SUT imports in any stub — source-under-test components and hooks don't exist yet; imports land in plans 10-01/02/03 alongside replacing `.skip` with real test bodies
- Explicit `import { describe, it } from "vitest"` used in every stub file for tsc strict-mode compatibility (mirrors `tests/army-list/UnitDeleteDialog.test.tsx` pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 4 Wave 0 stub files exist; plans 10-01, 10-02, 10-03 each have concrete `<automated>` verify targets to flip from `.skip` to real assertions
- Plan 10-01 can now begin: create `src/context/ActiveFactionContext.tsx`, replace useActiveFaction stubs with real test bodies
- No blockers

---
*Phase: 10-theming-foundation*
*Completed: 2026-05-03*

## Self-Check: PASSED

- FOUND: tests/theming/useActiveFaction.test.ts
- FOUND: tests/theming/FactionSummaryCard.test.tsx
- FOUND: tests/theming/AppSidebar.test.tsx
- FOUND: tests/theming/NavItem.test.tsx
- FOUND: .planning/phases/10-theming-foundation/10-00-SUMMARY.md
- FOUND commit: 518f51c (useActiveFaction stub)
- FOUND commit: 2f4c42f (FactionSummaryCard stub)
- FOUND commit: 501c531 (AppSidebar + NavItem stubs)
