---
phase: 118-detachments-import
plan: 01
subsystem: database
tags: [sqlite, migration, typescript, wahapedia, csv-pipeline, unit-database]

requires:
  - phase: 116-pipeline-foundation
    provides: BOM fix and parseWahapediaCsv pattern used for CSV parsing
  - phase: 117-points-coverage
    provides: build-unit-db.ts pipeline structure with cost CSV steps

provides:
  - Migration 042 DDL for udb_detachments and udb_detachment_abilities tables
  - UdbDetachmentRow and UdbDetachmentAbilityRow TypeScript interfaces
  - Extended UnitDatabaseJson interface with detachments and detachment_abilities arrays
  - Rebuilt unit_database.json with 261 detachments and 284 detachment abilities

affects: [119-stratagems-import, 120-detachments-ui, lib.rs Rust importer for Phase 118 plan 02]

tech-stack:
  added: []
  patterns:
    - "Two-entity extraction from single CSV: deduplicate parent (detachment) by ID Set, collect all child rows (abilities)"
    - "DDL-only migration (no INSERTs) per boot-loop prevention precedent from migration 038"
    - "No Legends boolean filter on Detachment_abilities.csv — legend column is lore text, not a flag"

key-files:
  created:
    - src-tauri/migrations/042_udb_detachments.sql
  modified:
    - scripts/lib/types.ts
    - scripts/build-unit-db.ts
    - scripts/update-unit-database.ts
    - src-tauri/data/unit_database.json

key-decisions:
  - "legend column in Detachment_abilities.csv is lore/flavor text, not a boolean filter — no Legends filtering applied"
  - "detachments and detachment_abilities included in SHA-256 hash input so re-imports trigger on detachment data changes"

patterns-established:
  - "Pattern: Two-entity CSV extraction — collect unique parents via Set<string> keyed by parent ID, collect all child rows; first occurrence wins for parent dedup"

requirements-completed: [DET-01, DET-02]

duration: 25min
completed: 2026-06-04
---

# Phase 118 Plan 01: Migration and Build Pipeline for Detachments Summary

**SQLite migration 042 + TypeScript types + dual build-script detachment parsing yielding 261 detachments and 284 abilities in unit_database.json**

## Performance

- **Duration:** 25 min
- **Started:** 2026-06-04T09:30:00Z
- **Completed:** 2026-06-04T09:55:00Z
- **Tasks:** 2
- **Files modified:** 5 (1 created + 4 modified)

## Accomplishments

- Created migration 042 with DDL for udb_detachments (TEXT PK = Wahapedia detachment_id) and udb_detachment_abilities (TEXT PK = ability id, FK ON DELETE CASCADE) plus two FK indexes
- Added UdbDetachmentRow and UdbDetachmentAbilityRow interfaces to scripts/lib/types.ts and extended UnitDatabaseJson with both new arrays
- Extended both build-unit-db.ts (Step 11) and update-unit-database.ts with identical Detachment_abilities.csv parse steps, hash inclusion, and output assembly
- Rebuilt unit_database.json: 261 detachments and 284 detachment abilities from 26 factions, all with id, faction_id, name (detachments) and id, detachment_id, faction_id, name, description (abilities)

## Task Commits

1. **Task 1: Migration and TypeScript types** - `7be3d73` (feat)
2. **Task 2: Extend both build scripts to parse detachments** - `67e6819` (feat)

## Files Created/Modified

- `src-tauri/migrations/042_udb_detachments.sql` - DDL-only migration creating udb_detachments and udb_detachment_abilities with FK indexes
- `scripts/lib/types.ts` - Added UdbDetachmentRow, UdbDetachmentAbilityRow interfaces; extended UnitDatabaseJson
- `scripts/build-unit-db.ts` - Added Detachment_abilities.csv to REQUIRED_CSVs; Step 11 parse logic; hash + output updates
- `scripts/update-unit-database.ts` - Mirrored all build-unit-db.ts detachment changes
- `src-tauri/data/unit_database.json` - Rebuilt artifact; now 7939 KB with detachments and detachment_abilities arrays

## Decisions Made

- No Legends filter applied to Detachment_abilities.csv — the `legend` column contains lore/flavor text strings, not a boolean flag. Confirmed from live CSV inspection: non-Legends rows have non-empty text in the legend column (detachment flavor text). Applying the `=== "1"` filter would have been a no-op but semantically incorrect.
- detachments and detachment_abilities added to the SHA-256 hash input in both scripts to ensure re-imports trigger when detachment data changes (prevents Pitfall 5 from RESEARCH.md).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- scripts/data/ directory is gitignored, so coverage-report.json could not be committed alongside the build scripts. This is expected behavior (data files are developer-local). No impact on plan deliverables.

## Known Stubs

None — this plan is pipeline-only. No UI components created.

## Threat Flags

None — no new network endpoints, auth paths, or user-facing input handling introduced. Developer-supplied CSV consumed at build time only.

## Next Phase Readiness

- Migration 042 schema ready for Rust importer expansion (Phase 118 plan 02)
- unit_database.json artifact contains detachments and detachment_abilities arrays for Rust INSERT blocks
- TypeScript types enforce correct shape through strict mode; UnitDatabaseJson extension will surface any update-script gaps immediately
- Phase 119 (stratagems/enhancements) can use the same two-entity CSV extraction pattern established here

---
*Phase: 118-detachments-import*
*Completed: 2026-06-04*
