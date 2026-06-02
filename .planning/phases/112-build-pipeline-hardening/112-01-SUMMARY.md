---
phase: 112-build-pipeline-hardening
plan: 01
subsystem: infra
tags: [typescript, bsdata, unit-database, shared-library, refactor]

# Dependency graph
requires:
  - phase: 107-unit-database-build-scripts
    provides: build-unit-db.ts and update-unit-database.ts scripts that this plan refactors
provides:
  - scripts/lib/bsdata.ts shared library with readCsvFile, readBsdataCatFiles, parseBsdataModelCounts, matchUnit
  - MatchMethod and MatchResult types for per-pass match tracking
  - FactionCoverage extended with matched_exact, matched_normalized, matched_alias, unmatched_names fields
  - Both build scripts use identical 3-pass matching pipeline
affects:
  - 112-02 (BPH-01 coverage enhancement uses MatchResult.method and FactionCoverage new fields)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared build-pipeline library in scripts/lib/bsdata.ts — named exports only, pure functions accepting paths as params"
    - "matchUnit returns MatchResult with method field — no post-hoc match detection"
    - "readBsdataCatFiles/readCsvFile accept directory as parameter — no hardcoded paths in lib"

key-files:
  created:
    - scripts/lib/bsdata.ts
  modified:
    - scripts/lib/types.ts
    - scripts/build-unit-db.ts
    - scripts/update-unit-database.ts

key-decisions:
  - "loadTranslationsFr() stays local in build-unit-db.ts per D-06 — update script doesn't need FR overlay"
  - "matchUnit returns MatchResult (unit + method) so callers don't re-derive which pass matched"
  - "FactionCoverage extended with optional match-method fields (matched_exact, matched_normalized, matched_alias, unmatched_names) for Plan 02 BPH-01 — backward-compat, existing consumers unaffected"
  - "update-unit-database.ts now uses full 3-pass matching + CROSS_FACTION_MAP + SUB_FACTION_MAP, matching build-unit-db.ts pipeline exactly"

patterns-established:
  - "Build lib functions: named exports only, accept paths as params, no filesystem side effects at import time"
  - "DOMParser polyfill: entry-point scripts set globalThis.DOMParser; library functions document the requirement in JSDoc"

requirements-completed: [BPH-03]

# Metrics
duration: 12min
completed: 2026-06-02
---

# Phase 112 Plan 01: Build Pipeline Hardening - Shared Library Extraction Summary

**Extracted 4 shared BSData functions into scripts/lib/bsdata.ts with MatchResult return type, eliminating code duplication between build-unit-db.ts and update-unit-database.ts and aligning both scripts on the same 3-pass matching pipeline**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-02T20:37:00Z
- **Completed:** 2026-06-02T20:49:39Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created `scripts/lib/bsdata.ts` with four exported functions (`readCsvFile`, `readBsdataCatFiles`, `parseBsdataModelCounts`, `matchUnit`) and two exported types (`MatchMethod`, `MatchResult`)
- `matchUnit` now returns `MatchResult { unit, method }` instead of bare `UdbUnitRow` — callers know which pass matched without re-deriving it post-hoc
- `build-unit-db.ts` reduced by ~88 lines; uses `MatchResult.method` directly for match diagnostics
- `update-unit-database.ts` now uses full 3-pass matching + cross-faction fallback + sub-faction population (all previously missing)
- Extended `FactionCoverage` interface with `matched_exact?`, `matched_normalized?`, `matched_alias?`, `unmatched_names?` for Plan 02 BPH-01

## Task Commits

1. **Task 1: Create scripts/lib/bsdata.ts with shared functions and update types** - `84d6e7c` (feat)
2. **Task 2: Rewire build-unit-db.ts to use shared lib** - `2281854` (refactor)
3. **Task 3: Rewire update-unit-database.ts to use shared lib with full matching** - `1667b40` (refactor)

## Files Created/Modified
- `scripts/lib/bsdata.ts` - New shared library with readCsvFile, readBsdataCatFiles, parseBsdataModelCounts, matchUnit, MatchMethod, MatchResult
- `scripts/lib/types.ts` - FactionCoverage extended with match-method tracking fields for Plan 02
- `scripts/build-unit-db.ts` - Removed 4 local function definitions; now imports from shared lib; match method from MatchResult not post-hoc
- `scripts/update-unit-database.ts` - Removed 3 local function definitions; upgraded from single-key lookup to 3-pass matchUnit; added CROSS_FACTION_MAP fallback, SUB_FACTION_MAP sub-faction population, and FR null fields

## Decisions Made
- `loadTranslationsFr()` stays local in build-unit-db.ts per D-06 — the update script performs diff comparison only and has no use for French translations
- `matchUnit` return type changed from `UdbUnitRow | undefined` to `MatchResult | undefined` so the match method is available without re-examining the map
- `FactionCoverage` optional fields are backward-compatible — existing `coverage-report.json` consumers continue to work since the fields are optional

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added name_fr/description_fr/keyword_fr null fields to update-unit-database.ts entity objects**
- **Found during:** Task 3 (update-unit-database.ts rewire)
- **Issue:** The existing weapon, ability, and keyword push calls in update-unit-database.ts were missing the `name_fr`, `description_fr`, and `keyword_fr` fields required by the shared type interfaces (TypeScript strict mode with noUnusedLocals enforces this)
- **Fix:** Added `name_fr: null` to weapons, `name_fr: null` and `description_fr: null` to abilities, `keyword_fr: null` to keywords
- **Files modified:** scripts/update-unit-database.ts
- **Verification:** pnpm build passes with exit code 0
- **Committed in:** 1667b40 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing required fields)
**Impact on plan:** Necessary for TypeScript compliance; no scope creep.

## Issues Encountered
None — all tasks completed as specified.

## Known Stubs
None — no placeholder values or unresolved stubs in the shared library.

## Threat Flags
Not applicable — dev-side build scripts only, no runtime app code changes.

## Next Phase Readiness
- `scripts/lib/bsdata.ts` is ready for Plan 02 (BPH-01 coverage enhancement) which will use `MatchResult.method` and the new `FactionCoverage` fields
- Both entry-point scripts now use identical matching logic — a fix in `matchUnit` in bsdata.ts automatically applies to both
- pnpm build passes; TypeScript compilation clean

---
*Phase: 112-build-pipeline-hardening*
*Completed: 2026-06-02*
