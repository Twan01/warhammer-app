---
phase: 14-spending-tracker
plan: "00"
subsystem: testing
tags: [vitest, wave-0, tdd, spending-tracker, zod, sqlite]

# Dependency graph
requires:
  - phase: 11-dashboard-command-center
    provides: Wave 0 stub pattern (describe.skip + explicit vitest imports for tsc strict-mode)
  - phase: 12-collection-gallery-view
    provides: .tsx-first stub convention (avoids .ts→.tsx rename)
provides:
  - Wave 0 stub test files for all 5 SPEND requirements (SPEND-01..05)
  - tests/spending/formatCurrency.test.ts — SPEND-05 utility stub
  - tests/spending/computeSpendingStats.test.ts — SPEND-04 pure aggregation stub
  - tests/spending/migration005.test.ts — SPEND-05 migration content stub (2 describe.skip blocks)
  - tests/spending/useSpendingStats.test.ts — SPEND-03/04 cache-key contract stub
  - tests/spending/SpendingPage.test.tsx — SPEND-03/04 page-level component stub
  - tests/spending/unitSchema.test.ts — SPEND-01 unit schema stub
  - tests/spending/paintSchema.test.ts — SPEND-02 paint schema stub
affects: [14-01, 14-02, 14-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Wave 0 stub pattern: describe.skip + it.skip with inline TODO comments naming the later plan that fills each body
    - Explicit import { describe, it } from "vitest" for tsc strict-mode compatibility
    - .tsx extension up-front for page-level tests to avoid .ts→.tsx rename (established in Phase 12)
    - No SUT imports in stub files — source-under-test doesn't exist until Plans 14-01/02/03

key-files:
  created:
    - tests/spending/formatCurrency.test.ts
    - tests/spending/computeSpendingStats.test.ts
    - tests/spending/migration005.test.ts
    - tests/spending/useSpendingStats.test.ts
    - tests/spending/SpendingPage.test.tsx
    - tests/spending/unitSchema.test.ts
    - tests/spending/paintSchema.test.ts
  modified: []

key-decisions:
  - "Phase 14 stores all spend values as integer pence in SQLite — display formatting in UI layer only"
  - "Wave 0 stubs use .tsx for SpendingPage (JSX in future render calls) and .ts for all others"
  - "32 total it.skip placeholders across 7 files — Plans 14-01/02/03 flip each to real bodies in-place"

patterns-established:
  - "Wave 0 stub pattern: describe.skip blocks named per VALIDATION.md test-name strings, no SUT imports"

requirements-completed: [SPEND-01, SPEND-02, SPEND-03, SPEND-04, SPEND-05]

# Metrics
duration: 10min
completed: 2026-05-04
---

# Phase 14 Plan 00: Spending Tracker Wave 0 Stubs Summary

**Seven describe.skip stub files under tests/spending/ establishing 32 vitest targets (4+6+5+2+5+5+5) for Plans 14-01/02/03 to flip green alongside their source implementations**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-04T06:47:25Z
- **Completed:** 2026-05-04T06:57:46Z
- **Tasks:** 7
- **Files modified:** 7 created

## Accomplishments

- Created `tests/spending/` directory with all 7 Wave 0 stub files required by 14-VALIDATION.md
- All 32 it.skip placeholders are properly skipped (not failed) — pnpm test exits 0 on spending suite
- TypeScript strict-mode passes (explicit `import { describe, it } from "vitest"` in every file)
- Closed all Wave 0 Nyquist gaps: Plans 14-01/02/03 each have concrete vitest targets to flip green

## Task Commits

Each task was committed atomically:

1. **Task 1: formatCurrency.test.ts (SPEND-05 utility)** - `e5abb9c` (test)
2. **Task 2: computeSpendingStats.test.ts (SPEND-04 aggregation)** - `f5681de` (test)
3. **Task 3: migration005.test.ts (SPEND-05 migration content)** - `0a63dbb` (test)
4. **Task 4: useSpendingStats.test.ts (SPENDING_STATS_KEY contract)** - `3b1f107` (test)
5. **Task 5: SpendingPage.test.tsx (SPEND-03/04 page component)** - `18bc9ec` (test)
6. **Task 6: unitSchema.test.ts (SPEND-01 unit schema)** - `a152d22` (test)
7. **Task 7: paintSchema.test.ts (SPEND-02 paint schema)** - `9cbcca5` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `tests/spending/formatCurrency.test.ts` — SPEND-05 stub: 1 describe.skip, 4 it.skip (null, zero, positive pence, locale override)
- `tests/spending/computeSpendingStats.test.ts` — SPEND-04 stub: 1 describe.skip, 6 it.skip (empty factions, total sum, null pence, grouping, orphans, paints pass-through)
- `tests/spending/migration005.test.ts` — SPEND-05 stub: 2 describe.skip, 5 it.skip (4 file-content + 1 lib.rs registration)
- `tests/spending/useSpendingStats.test.ts` — SPEND-03/04 stub: 1 describe.skip, 2 it.skip (key literal, tuple shape)
- `tests/spending/SpendingPage.test.tsx` — SPEND-03/04 stub: 1 describe.skip, 5 it.skip (loading, error, hero total, faction rows, Paints row)
- `tests/spending/unitSchema.test.ts` — SPEND-01 stub: 1 describe.skip, 5 it.skip (valid, null, negative, decimal, legacy field removal)
- `tests/spending/paintSchema.test.ts` — SPEND-02 stub: 1 describe.skip, 5 it.skip (valid, null, omitted, negative, decimal)

## Decisions Made

- Wave 0 stubs use .tsx for SpendingPage (real bodies need JSX in render calls) and .ts for all others — avoids the .ts→.tsx rename that Phase 10 had to perform in Plan 10-01
- 32 total it.skip placeholders split across 7 files; each it.skip has inline TODO comments naming the later plan (14-01, 14-02, or 14-03) that fills each body
- JournalTab.test.tsx pre-existing failure noted during Task 5 verification — it is a Phase 13 stub awaiting Plan 13-03 implementation and is out of scope for this plan

## Deviations from Plan

None — plan executed exactly as written. All 7 stub files created verbatim per plan-specified content.

## Issues Encountered

During Task 5 verification, the pre-existing `tests/hobby-journal/JournalTab.test.tsx` failure was observed (import "@/features/units/JournalTab" unresolved — Phase 13 stub awaiting Plan 13-03). This is a known pre-existing issue outside the scope of Plan 14-00. The SpendingPage.test.tsx itself ran cleanly (5 skipped, 0 failed).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 7 Wave 0 stub files are in place — Plans 14-01, 14-02, and 14-03 each have concrete vitest targets
- Plan 14-01 targets: formatCurrency.test.ts (4 stubs) + migration005.test.ts (5 stubs) — create formatCurrency.ts utility + 005_spend_pence.sql migration
- Plan 14-02 targets: unitSchema.test.ts (5 stubs) + paintSchema.test.ts (5 stubs) — modify unitSchema + paintSchema + update UI forms
- Plan 14-03 targets: computeSpendingStats.test.ts (6 stubs) + useSpendingStats.test.ts (2 stubs) + SpendingPage.test.tsx (5 stubs) — build SpendingPage + hook + pure aggregation function
- Note: JournalTab.test.tsx failure (Phase 13 Plan 13-03 pending) should be resolved before Phase 14 wave tests run in CI

---
*Phase: 14-spending-tracker*
*Completed: 2026-05-04*
