---
phase: 06-foundation
plan: 01
subsystem: database
tags: [sqlite, migration, alter-table, tauri, rust]

# Dependency graph
requires:
  - phase: 06-00
    provides: Wave-0 skip-stub test file at tests/foundation/migration004.test.ts

provides:
  - "004_unit_playbook_stats.sql: 8 nullable ALTER TABLE ADD COLUMN statements on unit_strategy_notes"
  - "lib.rs version 4 migration registration referencing the new SQL file"
  - "Real file-content assertions in migration004.test.ts (no more it.skip)"

affects:
  - "06-02 through 06-05: all queries/hooks that reference the new playbook stat columns"
  - "09 (Unit Playbook UI): PlaybookTab reads move/toughness/save/wounds/leadership/objective_control/keywords/abilities"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive migration pattern: ALTER TABLE ADD COLUMN only — no DROP, no CREATE TABLE, no edits to 001_core_schema.sql"
    - "File-content test pattern: fs.readFileSync in jsdom tests to assert SQL structure without running real DB"
    - "save stored as INTEGER; UI appends '+' suffix at display time"

key-files:
  created:
    - "src-tauri/migrations/004_unit_playbook_stats.sql"
    - ".planning/phases/06-foundation/06-01-SUMMARY.md"
  modified:
    - "src-tauri/src/lib.rs"
    - "tests/foundation/migration004.test.ts"

key-decisions:
  - "save column is INTEGER (not TEXT) — CONTEXT.md overrides ARCHITECTURE.md draft; UI appends '+' at display time"
  - "Migration file comment uses 'No destructive statements' instead of 'No DROP' to avoid regex false-positive in test"
  - "No UNIQUE INDEX on unit_strategy_notes.unit_id — select-then-upsert pattern used instead"

patterns-established:
  - "Pattern: File-content assertions via readFileSync — use for SQL migrations and Rust source that cannot be imported in jsdom"
  - "Pattern: Additive migration numbering — 004 follows 001/002/003; never reuse versions already in _sqlx_migrations"

requirements-completed:
  - STRAT-06

# Metrics
duration: 3min
completed: 2026-05-01
---

# Phase 6 Plan 01: Migration 004 — Unit Playbook Stats Summary

**SQLite migration 004 adds 8 nullable columns (M/T/Sv/W/Ld/OC as INTEGER, keywords/abilities as TEXT) to unit_strategy_notes via ALTER TABLE ADD COLUMN, registered as version 4 in lib.rs, with 6 green file-content assertions replacing Wave-0 stubs**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-01T20:54:51Z
- **Completed:** 2026-05-01T20:57:36Z
- **Tasks:** 3
- **Files modified:** 3 (created 1 new SQL, edited 1 Rust, replaced 1 TypeScript test)

## Accomplishments

- Created `src-tauri/migrations/004_unit_playbook_stats.sql` with exactly 8 `ALTER TABLE unit_strategy_notes ADD COLUMN` statements
- Appended Migration version 4 entry to `get_migrations()` in `src-tauri/src/lib.rs` with `include_str!()` reference
- Replaced all 6 `it.skip` stubs in `tests/foundation/migration004.test.ts` with real `readFileSync` assertions; all pass green

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 004_unit_playbook_stats.sql** - `5ebf4b6` (feat)
2. **Task 2: Register migration version 4 in lib.rs** - `4ca0451` (feat)
3. **Task 3: Replace it.skip stubs with real assertions** - `d011efa` (feat)

## Files Created/Modified

- `src-tauri/migrations/004_unit_playbook_stats.sql` - 8 ALTER TABLE ADD COLUMN statements; additive-only migration for STRAT-06
- `src-tauri/src/lib.rs` - Added Migration { version: 4, description: "unit_playbook_stats" } to get_migrations() vec
- `tests/foundation/migration004.test.ts` - 6 real assertions reading SQL and lib.rs via fs.readFileSync; zero skipped tests

## Decisions Made

- **save = INTEGER**: CONTEXT.md decision overrides ARCHITECTURE.md draft which showed save TEXT. The '+' suffix is display-time only (Phase 9 PlaybookTab).
- **Comment wording**: Changed "No DROP, no CREATE TABLE" in SQL comment to "No destructive statements" to avoid `/DROP\b/i` regex match on comment text. The SQL data itself never contained DROP — only the comment did.
- **No UNIQUE INDEX**: Open Question 2 in RESEARCH.md resolved: select-then-upsert without a unique constraint on unit_id (consistent with CONTEXT.md recommendation).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration SQL comment contained the word "DROP" causing test failure**
- **Found during:** Task 3 verification (`pnpm test -- --run tests/foundation/migration004.test.ts`)
- **Issue:** The plan's specified SQL comment read "Additive migration only: ALTER TABLE ... ADD COLUMN. No DROP, no CREATE TABLE" — the word "DROP" in the comment caused the test assertion `expect(sql).not.toMatch(/DROP\b/i)` to fail even though no actual DROP SQL statement existed
- **Fix:** Changed comment phrase from "No DROP, no CREATE TABLE" to "No destructive statements" in the SQL file header
- **Files modified:** `src-tauri/migrations/004_unit_playbook_stats.sql`
- **Verification:** All 6 tests pass green after fix; SQL data still contains zero DROP statements
- **Committed in:** `5ebf4b6` (Task 1 commit — fix applied before staging)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in plan's specified SQL comment wording)
**Impact on plan:** Minimal — single word change in a SQL comment. All acceptance criteria still satisfied. No scope creep.

## Issues Encountered

- `cargo check` was not run (per plan note: MSVC Build Tools may be absent; the Rust edit is verified structurally by the test assertions over lib.rs content). No compilation error is expected as only a `vec!` entry was appended.

## User Setup Required

None — no external service configuration required. The migration will apply automatically the next time the Tauri app launches (tauri-plugin-sql runs migrations on startup).

## Next Phase Readiness

- Migration 004 is in place; unit_strategy_notes now has all 8 playbook stat columns
- 06-02 can proceed to implement `getStrategyNote()` and `upsertStrategyNote()` query functions against the updated schema
- 06-03 through 06-05 (army list queries, usePaints invalidation, type definitions) are unblocked
- Phase 9 (Unit Playbook UI) can reference move/toughness/save/wounds/leadership/objective_control/keywords/abilities columns

---
*Phase: 06-foundation*
*Completed: 2026-05-01*
