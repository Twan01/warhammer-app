---
phase: 108-build-script-hardening-schema-foundation
plan: 03
subsystem: schema-rust-import-data-health
tags: [migration, sub-faction, french-locale, rust-import, coverage-ui]
dependency_graph:
  requires: [multi-pass-matching, sub-faction-data, coverage-report, fr-null-placeholders]
  provides: [udb-sub-faction-column, udb-fr-columns, rust-fr-import, fts5-sub-faction, points-coverage-ui]
  affects: [hobbyforge.db, import_unit_database, DataHealthPage]
tech_stack:
  added: []
  patterns: [alter-table-migration, str_val-serde-default, computed-coverage-query]
key_files:
  created:
    - src-tauri/migrations/041_udb_sub_faction_fr.sql
    - src/features/data-health/PointsCoverageCard.tsx
  modified:
    - src-tauri/src/lib.rs
    - src/components/common/DbHealthGate.tsx
    - src/db/queries/diagnostics.ts
    - src/hooks/useDiagnostics.ts
    - src/features/data-health/DataHealthPage.tsx
decisions:
  - "FTS5 rebuild includes sub_faction via COALESCE concatenation in keywords column"
  - "Coverage badges use computed SQL query (not coverage-report.json) for live accuracy"
  - "Overall coverage uses integer rounding for display simplicity"
metrics:
  duration: "4 minutes"
  completed: "2026-06-01T10:11:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 5
  lines_added: 169
  lines_removed: 8
---

# Phase 108 Plan 03: Migration 041, Rust Import Extension & Points Coverage UI Summary

Migration 041 adds sub_faction and 6 _fr locale columns across 5 udb_* tables; Rust import extended with str_val binds for all new fields (missing keys bind NULL); PointsCoverageCard shows per-faction coverage with green/amber/red badges on the Data Health page.

## Task Completion

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create migration 041 and extend Rust import | cdbd2c2 | src-tauri/migrations/041_udb_sub_faction_fr.sql, src-tauri/src/lib.rs, src/components/common/DbHealthGate.tsx |
| 2 | Add PointsCoverageCard to Data Health page | 86e4da0 | src/features/data-health/PointsCoverageCard.tsx, src/db/queries/diagnostics.ts, src/hooks/useDiagnostics.ts |

## What Was Built

### Migration 041 (SF-01, FR-01)
- 7 ALTER TABLE statements adding sub_faction to udb_units and _fr columns across factions, units, abilities, weapons, keywords
- Does NOT touch udb_search FTS5 virtual table (cannot ALTER)
- EXPECTED_SCHEMA_VERSION bumped from 40 to 41

### Rust Import Extension (FR-06)
- udb_factions INSERT: 3 -> 4 columns (added name_fr)
- udb_units INSERT: 7 -> 9 columns (added sub_faction, name_fr)
- udb_unit_weapons INSERT: 12 -> 13 columns (added name_fr)
- udb_unit_abilities INSERT: 5 -> 7 columns (added name_fr, description_fr)
- udb_unit_keywords INSERT: 3 -> 4 columns (added keyword_fr)
- All new binds use str_val() which returns None for missing JSON keys, binding as NULL

### FTS5 Sub-faction Search
- Rebuild query now includes COALESCE(u.sub_faction || ' ', '') in the keywords column
- Phase 109 search will find units by sub-faction name (e.g., "Ultramarines")

### Points Coverage UI (DQ-06)
- FactionCoverage interface + getPointsCoverage SQL query joining udb_factions, udb_units, udb_unit_points
- usePointsCoverage React Query hook with POINTS_COVERAGE_KEY
- PointsCoverageCard component with:
  - Overall coverage summary line (X% with Y/Z units)
  - Per-faction grid with color-coded badges: green (85%+), amber (50-84%), red (<50%)
  - Loading skeletons and empty state handling
- Inserted on DataHealthPage between DiagnosticsCard and BackupCard

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- pnpm build succeeds (TypeScript + Vite compilation)
- Migration 041 has 7 ALTER TABLE statements, no FTS5 references
- Rust import binds sub_faction and all _fr fields via str_val
- FTS5 rebuild includes sub_faction in keywords column
- PointsCoverageCard renders on DataHealthPage with correct badge thresholds
- EXPECTED_SCHEMA_VERSION = 41 in DbHealthGate.tsx

## Self-Check: PASSED
