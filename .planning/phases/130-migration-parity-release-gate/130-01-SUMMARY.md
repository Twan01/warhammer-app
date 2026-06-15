---
phase: 130-migration-parity-release-gate
plan: 01
subsystem: testing
tags: [vitest, better-sqlite3, sqlite, migrations, data-layer, schema-parity]

# Dependency graph
requires:
  - phase: 129-ux-polish-consistency
    provides: stable codebase baseline before release gating
provides:
  - Disk-derived HOBBYFORGE_MIGRATIONS list in db-helpers.ts (47 files, never drifts)
  - HOBBYFORGE_MIGRATION_COUNT === 47 (was 46 — RED parity test now GREEN)
  - army_list_unit_wargear (047) schema-shape assertion in schema-shape.test.ts
affects: [130-02, 131-ci-release-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "readdirSync + numeric-prefix sort for self-maintaining migration lists"
    - "ColumnInfo PRAGMA table_info assertion loop for schema-shape coverage"

key-files:
  created: []
  modified:
    - tests/data-layer/db-helpers.ts
    - tests/data-layer/schema-shape.test.ts

key-decisions:
  - "D-01: HOBBYFORGE_MIGRATIONS derived from disk via readdirSync + numeric-prefix sort — never hand-maintained"
  - "D-02: FK-ON guard preserved verbatim; createHobbyforgeDb() body untouched"
  - "D-03: army_list_unit_wargear (047) asserted in schema-shape.test.ts using shared beforeEach db and ColumnInfo"

patterns-established:
  - "Migration list derivation: readdirSync(migrationsDir).filter(.sql).sort(numeric prefix) as readonly string[]"
  - "Schema assertion: db.pragma('table_info(table)') as ColumnInfo[], loop + find + labeled expect"

requirements-completed: [REL-03]

# Metrics
duration: 15min
completed: 2026-06-15
---

# Phase 130 Plan 01: Migration Parity Release Gate Summary

**Disk-derived HOBBYFORGE_MIGRATIONS (readdirSync + numeric sort) turns the RED D-06 parity test GREEN at 47===47, and a new schema-shape assertion genuinely covers migration 047 (army_list_unit_wargear)**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-15T14:35:00Z
- **Completed:** 2026-06-15T14:50:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced 46-element hardcoded `HOBBYFORGE_MIGRATIONS` tuple with `readdirSync(migrationsDir)` filtered to `.sql` and sorted by 3-digit numeric prefix, making HOBBYFORGE_MIGRATION_COUNT auto-become 47
- Fixed the RED migration-parity D-06 test (`lib.rs Migration{} count 47 === HOBBYFORGE_MIGRATION_COUNT 47`) — was previously failing at 47 vs 46
- Added `army_list_unit_wargear` (047) column-shape assertion to `schema-shape.test.ts` covering all 5 columns: id, army_list_unit_id, weapon_name, quantity, created_at
- All 89 data-layer tests pass; FK-ON guard preserved verbatim (D-02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Derive HOBBYFORGE_MIGRATIONS from disk in db-helpers.ts** - `1c0cd23d` (feat)
2. **Task 2: Assert army_list_unit_wargear (047) column shape in schema-shape.test.ts** - `1723a6ec` (feat)

**Plan metadata:** (docs commit — see state update)

## Files Created/Modified

- `tests/data-layer/db-helpers.ts` - Replaced hardcoded 46-element migration array with disk-derived readdirSync list; added readdirSync to node:fs import; type changed from const tuple to readonly string[]; HOBBYFORGE_MIGRATION_COUNT now auto-derives as 47
- `tests/data-layer/schema-shape.test.ts` - Added it() test asserting all 5 columns of army_list_unit_wargear via PRAGMA table_info, reusing shared beforeEach db and ColumnInfo interface

## Decisions Made

- D-01: Migration list is disk-derived via readdirSync, sorted by numeric prefix per plan spec. The `migrationsDir` const was already present at line 9 — reused it directly.
- D-02: `createHobbyforgeDb()` and the FK-ON guard block (lines 81-85) left completely untouched — no edits needed, D-02 satisfied structurally.
- D-03: Wargear assertion placed in `schema-shape.test.ts` (the semantic home with shared db lifecycle and ColumnInfo interface), not `migration-parity.test.ts` — avoids per-test createHobbyforgeDb()/close() boilerplate.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The `pnpm test -- tests/data-layer/migration-parity.test.ts` command runs the full suite (Vitest does not filter by positional arg). Pre-existing failures in `tests/applied-recipes/assignmentChecklist.test.tsx` (React QueryClient not set up in those tests) caused exit 1 for the full run. Resolution: ran `pnpm vitest run tests/data-layer/migration-parity.test.ts` directly to confirm the target tests are green. All 89 data-layer tests pass cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01 deliverable complete: disk-derived migration list and 047 schema assertion
- Plan 02 can now rely on HOBBYFORGE_MIGRATION_COUNT === 47 and the parity test being green
- Phase 131 CI gate can invoke `pnpm check:version` and `pnpm test` on clean checkout

---

## Self-Check

Files exist:
- `tests/data-layer/db-helpers.ts` - FOUND (contains readdirSync(, Number.parseInt(, no 046_ array literal)
- `tests/data-layer/schema-shape.test.ts` - FOUND (contains army_list_unit_wargear, all 5 columns asserted)

Commits exist:
- 1c0cd23d - FOUND (feat(130-01): derive HOBBYFORGE_MIGRATIONS from disk)
- 1723a6ec - FOUND (feat(130-01): assert army_list_unit_wargear column shape)

Test results:
- migration-parity.test.ts D-06: GREEN (47 === 47)
- schema-shape.test.ts: 5 passed including army_list_unit_wargear assertion
- All 89 data-layer tests: passed

## Self-Check: PASSED

---
*Phase: 130-migration-parity-release-gate*
*Completed: 2026-06-15*
