---
phase: 114-pipeline-fixes-database-rebuild
plan: 02
subsystem: build-pipeline
tags: [aliases, database-rebuild, coverage, weapon-data, data-quality]
dependency_graph:
  requires:
    - phase: 114-01
      provides: [correct-weapon-range, correct-weapon-keywords, correct-weapon-grouping]
  provides:
    - rebuilt-unit-database-with-pipeline-fixes
    - updated-coverage-report
    - validated-alias-set
    - raised-coverage-threshold
  affects: [unit_database.json, coverage-report.json]
tech_stack:
  added: []
  patterns: [apostrophe-aware-alias-keys, wahapedia-only-unit-classification]
key_files:
  created: []
  modified:
    - scripts/data/aliases.json
    - src-tauri/data/unit_database.json
    - scripts/data/coverage-report.json
    - scripts/build-unit-db.ts
key_decisions:
  - "No new aliases needed: all 94 missing_alias units (79 SM, 6 NEC, 9 DG) are Wahapedia-only or Legends-only in BSData"
  - "Fixed stale Emperor's Champion alias: curly apostrophe in key didn't match BSData straight apostrophe from XML entity encoding"
  - "MIN_COVERAGE_PCT raised from 55% to 58% (conservative ratchet below 60.1% floor per D-13)"
patterns-established:
  - "Alias keys must use straight apostrophe (U+0027) to match BSData XML entity encoding (&apos;)"
  - "Alias values must use curly apostrophe (U+2019) to match Wahapedia CSV data"
requirements-completed: [PFX-03, PFX-04]
metrics:
  duration: 16m33s
  completed: 2026-06-03
  tasks_completed: 2
  tasks_total: 2
  test_count: 2442
---

# Phase 114 Plan 02: Alias Investigation, Database Rebuild & Coverage Verification Summary

**Fixed stale alias apostrophe mismatch, confirmed zero new aliases needed (all unmatched units are Wahapedia-only), rebuilt database with weapon data populated (99.5% range, 70.3% keywords), raised MIN_COVERAGE_PCT to 58%**

## Performance

- **Duration:** 16m33s
- **Started:** 2026-06-03T07:46:37Z
- **Completed:** 2026-06-03T08:03:10Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Investigated all 94 missing_alias units across SM/NEC/DG -- confirmed all are Wahapedia-only (no non-Legends BSData equivalent exists)
- Fixed stale Emperor's Champion (Anointed) alias: apostrophe character mismatch between BSData XML encoding and JSON file (alias validation now 44 used, 0 unused, 0 unknown)
- Rebuilt unit_database.json with all Plan 01 fixes: 99.5% weapons have range, 70.3% have keywords (was 0% for both before fixes)
- Verified weapon_group values are correct (Imotekh: groups 1,2,3 sequential, not all 1)
- Raised MIN_COVERAGE_PCT from 55% to 58% (conservative ratchet below 60.1% overall coverage floor)
- Full test suite green: 2442 passed

## Task Commits

1. **Task 1: Investigate unmatched units and add targeted aliases** - `6680590` (fix)
2. **Task 2: Rebuild database and verify improvements** - `f9107c7` (feat)

## Files Created/Modified

- `scripts/data/aliases.json` - Fixed Emperor's Champion apostrophe mismatch in alias key
- `src-tauri/data/unit_database.json` - Rebuilt with weapon range, keywords, and correct weapon_group values
- `scripts/data/coverage-report.json` - Updated coverage data: SM 58.1%, NEC 79.7%, DG 50.7%, overall 60.1%
- `scripts/build-unit-db.ts` - MIN_COVERAGE_PCT raised from 55 to 58

## Decisions Made

- **No new aliases needed:** Thorough investigation of all 94 missing_alias units confirmed they are Category A (Wahapedia-only). BSData either has no entry or only [Legends]-tagged entries for these units. Adding aliases would be invalid (no BSData source to match against).
- **Apostrophe encoding rule:** BSData XML uses `&apos;` which parses to straight apostrophe (U+0027). Wahapedia CSV uses curly apostrophe (U+2019). Alias keys must use straight to match BSData; values must use curly to match Wahapedia.
- **Conservative threshold raise:** MIN_COVERAGE_PCT raised from 55% to 58% (not 65%) because overall coverage remained at 60.1% -- the CSV parsing fixes improved weapon data quality but not unit matching coverage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Emperor's Champion alias apostrophe mismatch**
- **Found during:** Task 1 (alias investigation)
- **Issue:** Alias key used curly apostrophe (U+2019) but BSData XML entity `&apos;` parses to straight apostrophe (U+0027), so alias was flagged as "unused" despite both key and value being present in their respective sources
- **Fix:** Changed alias key apostrophe from curly to straight; kept value as curly (matches Wahapedia)
- **Files modified:** scripts/data/aliases.json
- **Verification:** Build now shows 44 used, 0 unused, 0 unknown (was 43 used, 1 unused)
- **Committed in:** 6680590

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Alias fix was a genuine pre-existing bug discovered during investigation. No scope creep.

## Issues Encountered

None -- investigation was thorough but straightforward. The key finding is that the "missing_alias" classification from the Phase 113 audit was misleading: these units are not name mismatches but rather Wahapedia-only entries with no BSData data source.

## Coverage Delta

| Faction | Before (Plan 01) | After (Plan 02) | Delta |
|---------|------------------|------------------|-------|
| SM | 58.1% (182/298) | 58.1% (183/298) | +1 unit (alias fix) |
| NEC | 79.7% (53/64) | 79.7% (53/64) | No change |
| DG | 50.7% (36/71) | 50.7% (36/71) | No change |
| Overall | 60.1% (1028/1711) | 60.1% (1029/1711) | +1 unit |

## Weapon Data Quality (New)

| Metric | Before Plan 01 | After Rebuild |
|--------|---------------|---------------|
| Weapons with range | 0/9209 (0%) | 9161/9209 (99.5%) |
| Weapons with keywords | 0/9209 (0%) | 6473/9209 (70.3%) |
| Correct weapon_group | No (all group=1) | Yes (sequential per unit) |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 114 complete: all pipeline bugs fixed, database rebuilt, coverage verified
- Remaining coverage gap (60.1% vs theoretical max) is due to Wahapedia-only units with no BSData equivalent -- not fixable via aliases or parser improvements
- Extended faction audits (EFA-01..03) deferred to future milestone

---
*Phase: 114-pipeline-fixes-database-rebuild*
*Completed: 2026-06-03*
