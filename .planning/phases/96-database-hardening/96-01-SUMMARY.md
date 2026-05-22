---
phase: 96-database-hardening
plan: 01
subsystem: database
tags: [sqlite, wal, indexes, check-constraints, migration]

# Dependency graph
requires: []
provides:
  - WAL journal mode and busy_timeout on main hobbyforge.db connection
  - 31 FK indexes across 18 tables for JOIN/WHERE acceleration
  - 2 temporal DESC indexes for session_date and battle_date sorting
  - CHECK constraints on units (5 columns) and paints (2 columns) preventing invalid data
affects: [97-query-optimization, 98-error-handling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WAL + busy_timeout PRAGMAs on both DB singletons (client.ts + rules-client.ts)"
    - "Data cleanup pass before CHECK constraint table recreation"
    - "Rename-create-copy-drop pattern for adding CHECK constraints to SQLite tables"

key-files:
  created:
    - src-tauri/migrations/033_database_hardening.sql
  modified:
    - src/db/client.ts
    - src-tauri/src/lib.rs

key-decisions:
  - "Single migration file (033) for all indexes + CHECK constraints per D-08"
  - "Only units and paints tables recreated for CHECK constraints (minimum scope covering all 3 required constraints)"
  - "Data cleanup UPDATEs clamp invalid values before table recreation to prevent constraint violations"

patterns-established:
  - "idx_{table}_{column} naming convention for all FK indexes"
  - "Data cleanup before CHECK constraint addition via table recreation"

requirements-completed: [ERR-05, DBH-01, DBH-02, DBH-03]

# Metrics
duration: 5min
completed: 2026-05-22
---

# Phase 96 Plan 01: Database Hardening Summary

**WAL journal mode, 31 FK indexes, 2 temporal DESC indexes, and CHECK constraints on units/paints via migration 033**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-22T10:00:00Z
- **Completed:** 2026-05-22T10:05:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Main DB client now uses WAL journal mode and 10s busy_timeout matching rules-client.ts (ERR-05)
- All 30 FK columns across 18 tables have explicit indexes for JOIN/WHERE acceleration (DBH-01)
- painting_sessions.session_date and battle_logs.battle_date have DESC indexes (DBH-02)
- Units table has 5 CHECK constraints (points, painting_percentage, model_count, owned_count, purchase_price_pence) and paints table has 2 CHECK constraints (quantity, purchase_price_pence) preventing invalid data at the schema level (DBH-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: WAL mode PRAGMAs + FK and temporal indexes** - `69063bf` (feat)
2. **Task 2: CHECK constraints via table recreation for units and paints** - `52bf426` (feat)

## Files Created/Modified
- `src/db/client.ts` - Added PRAGMA journal_mode = WAL and busy_timeout = 10000
- `src-tauri/migrations/033_database_hardening.sql` - 178-line migration with 32 indexes + 2 table recreations with CHECK constraints
- `src-tauri/src/lib.rs` - Registered migration version 33

## Decisions Made
- Followed plan exactly: single migration file per D-08, minimum table recreation scope (units + paints only)
- Used explicit `IS NULL OR` pattern for nullable CHECK constraints for clarity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Database is hardened with WAL mode, comprehensive FK indexes, and data integrity constraints
- Ready for Phase 97 (query optimization) which can leverage the new indexes
- App must be launched with `pnpm tauri dev` to run migration 033 and verify no errors

---
*Phase: 96-database-hardening*
*Completed: 2026-05-22*
