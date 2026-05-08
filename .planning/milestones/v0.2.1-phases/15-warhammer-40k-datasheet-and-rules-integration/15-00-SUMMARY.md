---
phase: 15-warhammer-40k-datasheet-and-rules-integration
plan: "00"
subsystem: testing

tags: [vitest, tdd, wave-0, stubs, datasheet, wahapedia]

# Dependency graph
requires: []
provides:
  - 19 Wave 0 it.skip stub test targets under tests/datasheet/ for plans 15-01 through 15-04
  - tests/datasheet/csvParse.test.ts — 3 stubs for parseWahapediaCsv pure function
  - tests/datasheet/stripHtml.test.ts — 3 stubs for stripHtml pure function
  - tests/datasheet/migration.test.ts — 3 stubs for rules_001_schema.sql + 007_datasheet_link.sql + lib.rs
  - tests/datasheet/datasheetQueries.test.ts — 4 stubs for getDatasheetsByFaction, getFullDatasheet, getRulesSyncMeta, upsertDatasheetLink
  - tests/datasheet/useDatasheet.test.tsx — 2 stubs for useDatasheet hook
  - tests/datasheet/DatasheetPicker.test.tsx — 2 stubs for DatasheetPicker component render + search
  - tests/datasheet/DatasheetImportDialog.test.tsx — 2 stubs for DatasheetImportDialog conflict render
affects:
  - 15-01-warhammer-40k-datasheet-and-rules-integration
  - 15-02-warhammer-40k-datasheet-and-rules-integration
  - 15-03-warhammer-40k-datasheet-and-rules-integration
  - 15-04-warhammer-40k-datasheet-and-rules-integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 stub pattern: it.skip() with TODO markers naming the later plan that implements each test body"
    - "Explicit `import { describe, it } from 'vitest'` in all stub files for tsc strict-mode compatibility"
    - ".tsx extension for hook/component tests, .ts for pure-function and content-shape tests"
    - "No SUT imports in Wave 0 — source files don't exist yet (plans 15-01..04 create them)"

key-files:
  created:
    - tests/datasheet/csvParse.test.ts
    - tests/datasheet/stripHtml.test.ts
    - tests/datasheet/migration.test.ts
    - tests/datasheet/datasheetQueries.test.ts
    - tests/datasheet/useDatasheet.test.tsx
    - tests/datasheet/DatasheetPicker.test.tsx
    - tests/datasheet/DatasheetImportDialog.test.tsx
  modified: []

key-decisions:
  - "Wave 0 stubs use it.skip() so the test suite exits 0 (skipped tests count as passing in vitest) while providing concrete named targets for downstream plans"
  - "No SUT imports in Wave 0 stubs — importing non-existent source files would cause compile errors and break the suite"

patterns-established:
  - "Wave 0 stub pattern: create it.skip() blocks before source files exist, using TODO comments naming the plan that fills them in"

requirements-completed:
  - DS-01
  - DS-04
  - DS-07
  - DS-08
  - DS-09

# Metrics
duration: 5min
completed: 2026-05-04
---

# Phase 15 Plan 00: Wave 0 Test Stubs Summary

**19 Wave 0 it.skip stub test targets created under tests/datasheet/ covering all 7 test files for plans 15-01 through 15-04, closing the Nyquist gap so every downstream task has a concrete failing-or-skipped vitest target**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-04T08:27:01Z
- **Completed:** 2026-05-04T08:31:29Z
- **Tasks:** 3
- **Files created:** 7

## Accomplishments

- Created tests/datasheet/ directory with 7 new stub test files covering all Wave 0 requirements from 15-VALIDATION.md
- All 19 it.skip stubs named exactly per the 15-VALIDATION.md Per-Task Verification Map, giving plans 15-01..04 concrete test targets to flip green
- Full suite passed with 279 existing tests passing + 19 new stubs skipped (0 failed) — baseline preserved

## Task Commits

Each task was committed atomically:

1. **Task 1: csvParse + stripHtml pure-function stubs** - `0fd3f8e` (test)
2. **Task 2: migration + datasheetQueries schema/query stubs** - `98b4c57` (test)
3. **Task 3: useDatasheet hook + DatasheetPicker + DatasheetImportDialog component stubs** - `d9f960f` (test)

**Plan metadata:** (docs commit follows)

## Files Created

- `tests/datasheet/csvParse.test.ts` — 3 it.skip stubs: DS-01 simple CSV parse, trailing pipe, empty body
- `tests/datasheet/stripHtml.test.ts` — 3 it.skip stubs: DS-09 tag strip, named entity decode, numeric entity decode
- `tests/datasheet/migration.test.ts` — 3 it.skip stubs: DS-01 rules schema tables, DS-06 007_datasheet_link.sql, DS-01+DS-06 lib.rs registration
- `tests/datasheet/datasheetQueries.test.ts` — 4 it.skip stubs: DS-04 getDatasheetsByFaction, DS-07 getFullDatasheet, DS-02+DS-03 getRulesSyncMeta, DS-06 upsertDatasheetLink
- `tests/datasheet/useDatasheet.test.tsx` — 2 it.skip stubs: DS-04+DS-06 no unitId, DS-07 full payload
- `tests/datasheet/DatasheetPicker.test.tsx` — 2 it.skip stubs: DS-04 faction-filtered render, DS-04 search filter
- `tests/datasheet/DatasheetImportDialog.test.tsx` — 2 it.skip stubs: DS-08 per-field row layout, DS-08 default use choice

## Decisions Made

- Wave 0 stubs intentionally have no SUT imports — importing non-existent source files would cause compile errors and break the suite
- All stubs use `import { describe, it } from "vitest"` explicitly for tsc strict-mode compatibility (mirrors tests/hobby-journal/* and tests/spending/* pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 7 Wave 0 stub files exist — plans 15-01 through 15-04 each have concrete it.skip targets to flip green
- Plan 15-01 (DB schema + migration): flip migration.test.ts stubs green while creating rules_001_schema.sql + 007_datasheet_link.sql + lib.rs registration
- Plan 15-02 (pure functions): flip csvParse.test.ts + stripHtml.test.ts stubs green
- Plan 15-03 (query layer + hook): flip datasheetQueries.test.ts + useDatasheet.test.tsx stubs green
- Plan 15-04 (UI components): flip DatasheetPicker.test.tsx + DatasheetImportDialog.test.tsx stubs green

---
*Phase: 15-warhammer-40k-datasheet-and-rules-integration*
*Completed: 2026-05-04*

## Self-Check: PASSED

- FOUND: tests/datasheet/csvParse.test.ts
- FOUND: tests/datasheet/stripHtml.test.ts
- FOUND: tests/datasheet/migration.test.ts
- FOUND: tests/datasheet/datasheetQueries.test.ts
- FOUND: tests/datasheet/useDatasheet.test.tsx
- FOUND: tests/datasheet/DatasheetPicker.test.tsx
- FOUND: tests/datasheet/DatasheetImportDialog.test.tsx
- FOUND commit: 0fd3f8e (Task 1)
- FOUND commit: 98b4c57 (Task 2)
- FOUND commit: d9f960f (Task 3)
