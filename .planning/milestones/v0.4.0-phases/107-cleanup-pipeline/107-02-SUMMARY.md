---
phase: 107-cleanup-pipeline
plan: 02
subsystem: tooling
tags: [dev-scripts, data-pipeline, version-display, diff-reporting]
dependency_graph:
  requires:
    - phase: 107-01
      provides: single-database architecture, useUdbMeta hook, dead code removal
    - phase: 103-udb-schema
      provides: build-unit-db.ts pipeline, unit_database.json format
  provides:
    - dev-side update script with diff reporting
    - data version display in VersionInfoCard
  affects: [data-health, developer-workflow]
tech_stack:
  added: []
  patterns: [dev-side-diff-reporting, content-hash-versioning]
key_files:
  created:
    - scripts/update-unit-database.ts
  modified:
    - src/features/data-health/VersionInfoCard.tsx
    - tests/data-health/versionInfoCard.test.tsx
key_decisions:
  - "Update script reuses build-unit-db.ts logic inline (copy) rather than importing, since both are Node.js-only dev scripts"
  - "unit_database.json lives at src-tauri/data/ (not src-tauri/resources/ as plan suggested) -- matched actual project layout"
  - "VersionInfoCard shows game system as human-readable label via lookup table"
patterns-established:
  - "Dev-side data update workflow: run update script, review diff, pass --write to commit changes"
requirements-completed: [CLN-01, CLN-04]
duration: 15min
completed: 2026-05-31
---

# Phase 107 Plan 02: Dev Pipeline & Version Display Summary

**Dev-side update script with diff reporting for GW balance patches, plus VersionInfoCard showing unit count, faction count, build date, and game system from udb_meta**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-31T11:54:45Z
- **Completed:** 2026-05-31T12:10:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `scripts/update-unit-database.ts` that re-runs the full Wahapedia CSV + BSData XML pipeline, compares against existing unit_database.json, and prints a Markdown diff report with new/removed units, points changes, ability changes, and keyword changes
- Updated VersionInfoCard to display full data version info: card title with version, build date subtitle, unit/faction counts, and game system label
- Updated tests to match the new VersionInfoCard structure

## Task Commits

Each task was committed atomically:

1. **Task 1: Create dev-side update script with diff reporting** - `822bc7c` (feat)
2. **Task 2: Wire data version display into VersionInfoCard** - `f691452` (feat)

## Files Created/Modified
- `scripts/update-unit-database.ts` - Dev-only Node.js script that re-runs data pipeline and reports diffs; supports --write flag
- `src/features/data-health/VersionInfoCard.tsx` - Now shows Unit Database version in card title, build date, unit/faction counts, game system
- `tests/data-health/versionInfoCard.test.tsx` - Updated assertions for new card structure and data fields

## Decisions Made
- Used inline copy of parsing logic from build-unit-db.ts rather than shared imports, since both scripts run in plain Node.js context without Vite
- Mapped `src-tauri/data/` as the actual output path (plan referenced `src-tauri/resources/` but that path does not exist)
- Added GAME_SYSTEM_LABELS lookup to display "Warhammer 40,000 10th Edition" instead of raw "40k-10th" code

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all data sources are wired.

## Next Phase Readiness
- Phase 107 cleanup pipeline is complete
- Dev workflow established: run `node --experimental-strip-types scripts/update-unit-database.ts` to check for data changes after updating Wahapedia CSVs or BSData files
- VersionInfoCard displays all canonical data version info from udb_meta

---
*Phase: 107-cleanup-pipeline*
*Completed: 2026-05-31*
