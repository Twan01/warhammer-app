---
phase: 112-build-pipeline-hardening
plan: 02
subsystem: infra
tags: [typescript, bsdata, unit-database, coverage, determinism, alias-validation]

# Dependency graph
requires:
  - phase: 112-01
    provides: MatchResult.method, FactionCoverage extended fields, allBsdataNames Set prep
provides:
  - Enhanced coverage table with Matched/Exact/Norm/Alias columns per faction (BPH-01)
  - Unmatched unit names printed per faction after table (BPH-01, D-02)
  - Deterministic output sorting of all 8 arrays before hash (BPH-02, D-03)
  - Alias validation with used/unused/unknown-target summary (BPH-04)
  - MIN_COVERAGE_PCT = 55 threshold with process.exit(1) on regression (BPH-05)
affects:
  - scripts/data/coverage-report.json (updated schema with match method fields)
  - src-tauri/data/unit_database.json (now deterministically sorted)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-faction match method tracking: factionMatchStats Map<string, {exact, normalized, alias}> initialized before BSData loop"
    - "allBsdataNames Set populated for ALL BSData units before match (alias validation requires it)"
    - "Deterministic sort: 8 arrays sorted before createHash — hash is then stable across runs"
    - "validateAliases: local function returns {used, unused[], unknownTargets[]} — warns but never fails build"
    - "MIN_COVERAGE_PCT constant with explanatory JSDoc near top of file for easy adjustment"

key-files:
  created: []
  modified:
    - scripts/build-unit-db.ts

key-decisions:
  - "allBsdataNames collects names from ALL BSData units (not just matched) per Pitfall 4 in RESEARCH.md — alias unused detection requires knowing every name that appeared"
  - "Unknown target aliases warn but do not fail (D-07) — current state: 1 unknown target ('Emperor's Champion (Anointed)' -> 'Emperor's Champion')"
  - "MIN_COVERAGE_PCT set to 55 (safely below current 60.1%) per RESEARCH.md Pitfall 5 — raise to 90 after Phase 113/114 audits"
  - "Coverage threshold check uses overall percentage (D-10), not per-faction, to avoid false positives on small factions"
  - "Sorts happen BEFORE hash computation (BPH-02 Pitfall 1) so the content hash is reproducible"
  - "coverage-report.json is gitignored (scripts/data/ excluded) — schema change is in types.ts and the write call only"

requirements-completed: [BPH-01, BPH-02, BPH-04, BPH-05]

# Metrics
duration: 20min
completed: 2026-06-02
---

# Phase 112 Plan 02: Build Pipeline Hardening - Coverage Reporting & Validation Summary

**Added four production-grade pipeline features: per-faction match method table (BPH-01), deterministic output sorting (BPH-02), alias validation (BPH-04), and coverage regression threshold (BPH-05) — all in scripts/build-unit-db.ts with zero new dependencies**

## Performance

- **Duration:** 20 min
- **Started:** 2026-06-02T21:00:00Z
- **Completed:** 2026-06-02T21:20:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Replaced coverage table columns (was: Faction/Units/Points/Coverage) with enhanced columns: Faction/Units/Matched/Exact/Norm/Alias/Coverage
- Added `factionMatchStats` Map initialized per faction before the BSData loop; incremented per `MatchResult.method` after each successful match
- Populated `FactionCoverage.matched_exact`, `matched_normalized`, `matched_alias`, `unmatched_names` from stats and per-faction unmatched unit lists
- After the summary table, prints each faction's unmatched unit names with `    - ` prefix (D-02 requirement for Phase 113 auditor visibility)
- Added `allBsdataNames` Set collecting every BSData `datasheet_name` (matched or not) — required for accurate alias unused detection
- Added `validateAliases()` local function checking each alias key against `allBsdataNames` and each alias value against `unitByNameFaction`
- Alias validation result: 43 used, 0 unused, 1 unknown target (`"Emperor's Champion (Anointed)" -> "Emperor's Champion"`) — warned, build continues
- Sorted all 8 output arrays (factions, units, models, weapons, abilities, keywords, points, composition) before `createHash` call
- Verified D-03: two consecutive runs produce identical content hash `1.0.0+b39ab772`
- Added `MIN_COVERAGE_PCT = 55` constant with JSDoc explaining it should be raised to 90 after Phase 113/114 audits; `process.exit(1)` if overall coverage < threshold
- Current coverage 60.1% > 55% floor — build passes; regression protection active

## Task Commits

1. **Task 1: BPH-01 enhanced coverage table + BPH-02 deterministic sorting** - `d480509` (feat)
2. **Task 2: BPH-04 alias validation + BPH-05 coverage failure threshold** - `505a959` (feat)

## Files Created/Modified

- `scripts/build-unit-db.ts` - All four BPH features added; factionMatchStats map, allBsdataNames Set, validateAliases function, MIN_COVERAGE_PCT constant, deterministic sorts, threshold check

## Decisions Made

- `allBsdataNames` collects from ALL BSData units before match filtering — alias unused detection requires knowing every name that appeared in any .cat file
- Unknown target alias (`Emperor's Champion (Anointed)`) warns but does not fail; likely a BSData variant name for a unit not in current Wahapedia export
- `MIN_COVERAGE_PCT = 55` safely below current 60.1% per RESEARCH.md Pitfall 5 recommendation; developer raises this after audit work improves coverage
- Coverage threshold is overall (all-faction combined) not per-faction — prevents false failures on small factions with legitimately sparse BSData support

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all tasks completed as specified.

## Known Stubs

None — no placeholder values or unresolved stubs.

## Threat Flags

Not applicable — dev-side build scripts only, no runtime app code changes.

## Next Phase Readiness

- `pnpm build:udb` now prints actionable per-faction coverage breakdown for Phase 113 auditor
- Alias validation identifies the 1 stale entry (`Emperor's Champion (Anointed)`) for Phase 113 cleanup
- Deterministic output means Phase 113 can diff builds to verify changes are minimal
- MIN_COVERAGE_PCT threshold should be raised (e.g., to 65+) after Space Marines audit in Phase 113

## Self-Check

- [x] `scripts/build-unit-db.ts` exists and modified
- [x] Commits `d480509` and `505a959` exist in git log
- [x] `pnpm build:udb` exits 0 with "Build complete!"
- [x] Coverage table shows Exact/Norm/Alias columns
- [x] Alias validation summary line printed
- [x] Two consecutive builds: identical hash `1.0.0+b39ab772` (D-03 verified)
- [x] MIN_COVERAGE_PCT = 55 in build-unit-db.ts

## Self-Check: PASSED
