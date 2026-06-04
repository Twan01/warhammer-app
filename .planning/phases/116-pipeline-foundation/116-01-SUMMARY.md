---
phase: 116-pipeline-foundation
plan: 01
subsystem: testing
tags: [csv, parsing, bom, utf8, wahapedia, download, pipeline]

# Dependency graph
requires: []
provides:
  - BOM-safe parseWahapediaCsv with explicit replace(/^﻿/, "") strip
  - scripts/download-wahapedia.ts auto-download command for 10 Wahapedia CSVs
  - pnpm download:wahapedia CLI command registered in package.json
affects: [117-schema-migration, 118-rust-import, 119-ui-wiring, 120-e2e-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Node built-in fetch with User-Agent header for dev-side HTTP downloads"
    - "Explicit BOM strip before trim() in CSV parser for forward-compatibility clarity"

key-files:
  created:
    - scripts/download-wahapedia.ts
  modified:
    - scripts/lib/parseCsv.ts
    - tests/build-pipeline/parseCsv.test.ts
    - package.json

key-decisions:
  - "BOM already stripped by JS trim() but explicit replace(/^\\uFEFF/, '') added for D-01 compliance and reader clarity"
  - "download:wahapedia is separate from build:udb to keep builds deterministic (CSVs pre-fetched)"
  - "Script uses Buffer.from(res.arrayBuffer()) not res.text() to preserve binary encoding of CSV files"

patterns-established:
  - "Download script pattern: skip-if-exists + --force + res.ok guard + User-Agent header"

requirements-completed: [PF-01, PF-02]

# Metrics
duration: 15min
completed: 2026-06-04
---

# Phase 116 Plan 01: Pipeline Foundation Summary

**Explicit UTF-8 BOM strip in parseWahapediaCsv and pnpm download:wahapedia command fetching all 10 Wahapedia CSVs with skip-existing and --force flag support**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-04T08:20:00Z
- **Completed:** 2026-06-04T08:35:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added explicit `raw.replace(/^﻿/, "")` BOM strip in parseWahapediaCsv (D-01) with 3 test cases covering BOM input, non-BOM regression, and BOM-only edge case
- Created scripts/download-wahapedia.ts with 10-file CSV_FILES array, res.ok guard, User-Agent header, --force flag, and per-file status logging (D-02, D-03, D-04)
- Registered `pnpm download:wahapedia` in package.json adjacent to build:udb; script ran successfully and downloaded 4 new CSVs on first run

## Task Commits

Each task was committed atomically:

1. **Task 1: BOM fix in parseWahapediaCsv with test-first approach** - `e69b060` (feat)
2. **Task 2: Create download-wahapedia script and package.json command** - `66af1cf` (feat)

## Files Created/Modified
- `scripts/lib/parseCsv.ts` - Added explicit BOM strip before trim/split
- `tests/build-pipeline/parseCsv.test.ts` - Added "BOM handling (PF-01)" describe block with 3 tests
- `scripts/download-wahapedia.ts` - New auto-download script for 10 Wahapedia CSVs
- `package.json` - Added download:wahapedia script entry

## Decisions Made
- JavaScript `String.prototype.trim()` already strips U+FEFF (BOM is treated as whitespace in JS). The explicit `replace(/^﻿/, "")` was still added per D-01 for documentation intent and forward-compatibility if the trim behavior ever changes.
- Used `Buffer.from(await res.arrayBuffer())` instead of `res.text()` to preserve binary CSV encoding faithfully, avoiding any text encoding transformation.
- Script exits with code 1 if any downloads fail, making CI-unfriendly failures visible.

## Deviations from Plan

None - plan executed exactly as written. The TDD RED phase observation (tests already passed before explicit fix) was noted and resolved by proceeding to GREEN immediately since JavaScript's `trim()` already handles BOM, making the behavior correct. The explicit replace was still added per D-01.

## Issues Encountered
- TDD RED phase: BOM tests passed unexpectedly before code change. Investigation revealed `String.prototype.trim()` in JavaScript strips U+FEFF (BOM is in the Unicode "whitespace" category). Plan's fail-fast rule investigated and resolved: behavior was correct, explicit replace added for D-01 compliance and documentation clarity.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- BOM-safe parser ready for all new CSV files (Stratagems, Enhancements, Detachment_abilities)
- All 10 CSVs now available in scripts/data/ (4 new files downloaded on first run)
- Phase 117 schema migration can proceed immediately
- No blockers

---
*Phase: 116-pipeline-foundation*
*Completed: 2026-06-04*
