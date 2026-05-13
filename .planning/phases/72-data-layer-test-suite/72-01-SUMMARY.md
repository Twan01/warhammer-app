---
phase: 72-data-layer-test-suite
plan: 01
subsystem: testing
tags: [better-sqlite3, vitest, sqlite, migration, schema-validation]

requires:
  - phase: 71-stable-session-section-fk
    provides: "Migration 023 adding recipe_section_id FK to painting_sessions"
provides:
  - "better-sqlite3 devDependency for in-memory SQLite testing"
  - "Shared db-helpers.ts with createHobbyforgeDb/createRulesDb and factory helpers"
  - "Migration parity tests (D-04, D-05, D-06, FK pragma)"
  - "Schema shape tests (D-12, D-13, D-14)"
affects: [72-02-PLAN]

tech-stack:
  added: [better-sqlite3@12.10.0, "@types/better-sqlite3@7.6.13"]
  patterns: ["// @vitest-environment node per-file override", "In-memory SQLite via better-sqlite3 :memory:", "PRAGMA table_info() for schema introspection"]

key-files:
  created:
    - tests/data-layer/db-helpers.ts
    - tests/data-layer/migration-parity.test.ts
    - tests/data-layer/schema-shape.test.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - tests/setup.ts

key-decisions:
  - "Updated migration counts to 24 hobbyforge + 4 rules (plan said 23+3 but lib.rs has 024 and rules_004)"
  - "Corrected recipe_step_paints to recipe_steps in schema test (plan had wrong table name)"
  - "Corrected datasheets to rw_datasheets for rules DB table check (rw_ prefix)"
  - "Removed recipe_paints from expected tables (renamed to recipe_steps in migration 012)"
  - "Guarded Element references in setup.ts with typeof check for node environment compatibility"

patterns-established:
  - "Pattern: data-layer tests use // @vitest-environment node to avoid jsdom overhead"
  - "Pattern: createHobbyforgeDb() runs full migration chain and verifies FK pragma"
  - "Pattern: Factory helpers (createTestFaction/Unit/Recipe/Section) for test data setup"

requirements-completed: [TST-01]

duration: 13min
completed: 2026-05-13
---

# Phase 72 Plan 01: Test Infrastructure & Migration Validation Summary

**better-sqlite3 test infrastructure with 9 passing data-layer tests covering migration chain execution, lib.rs parity, and schema shape validation**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-13T10:44:10Z
- **Completed:** 2026-05-13T10:57:17Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Installed better-sqlite3 as devDependency with native build approved via pnpm onlyBuiltDependencies
- Created shared db-helpers.ts with in-memory DB creation, full migration chain execution, FK pragma enforcement, and factory helpers
- 4 migration-parity tests verify all 24 hobbyforge + 4 rules migrations run cleanly and match lib.rs registration count
- 5 schema-shape tests verify table existence, workflow metadata columns, paint_id nullability, recipe_section_id FK, and rules tables

## Task Commits

Each task was committed atomically:

1. **Task 1: Install better-sqlite3 and create db-helpers.ts** - `c80877a` (chore)
2. **Task 2: Write migration-parity and schema-shape tests** - `34d04e8` (test)

## Files Created/Modified
- `tests/data-layer/db-helpers.ts` - Shared test DB creation helper with factory functions
- `tests/data-layer/migration-parity.test.ts` - Migration chain execution + lib.rs parity tests
- `tests/data-layer/schema-shape.test.ts` - Schema introspection tests via PRAGMA table_info
- `package.json` - Added better-sqlite3 + @types/better-sqlite3 devDeps, pnpm onlyBuiltDependencies
- `pnpm-lock.yaml` - Lock file updated for new dependencies
- `tests/setup.ts` - Guarded Element references for node environment compatibility

## Decisions Made
- Updated migration counts to 24 hobbyforge + 4 rules (lib.rs has migration 024_points_import_history and rules_004_datasheet_points added since plan was written)
- Corrected table names in schema tests: recipe_steps (not recipe_step_paints), rw_datasheets (not datasheets), removed recipe_paints (renamed in migration 012)
- Added typeof Element guards to setup.ts so data-layer tests with node environment don't crash on DOM polyfills

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected migration counts from 23+3 to 24+4**
- **Found during:** Task 1 (reading lib.rs)
- **Issue:** Plan specified 23 hobbyforge + 3 rules migrations, but lib.rs registers 24 + 4 (024_points_import_history.sql and rules_004_datasheet_points.sql were added since planning)
- **Fix:** Updated HOBBYFORGE_MIGRATIONS array to include 024, RULES_MIGRATIONS to include rules_004, counts to 24 and 4
- **Files modified:** tests/data-layer/db-helpers.ts
- **Committed in:** c80877a

**2. [Rule 1 - Bug] Corrected table names in schema-shape tests**
- **Found during:** Task 2 (test failures)
- **Issue:** Plan referenced recipe_step_paints (doesn't exist), datasheets (correct name is rw_datasheets), and recipe_paints (renamed to recipe_steps in migration 012)
- **Fix:** Used correct table names in assertions
- **Files modified:** tests/data-layer/schema-shape.test.ts
- **Committed in:** 34d04e8

**3. [Rule 3 - Blocking] Fixed setup.ts Element reference crash in node environment**
- **Found during:** Task 2 (tests failing to load)
- **Issue:** setup.ts directly accesses Element.prototype which is undefined in node environment; data-layer tests use // @vitest-environment node but setupFiles still runs
- **Fix:** Added typeof Element !== "undefined" guards around all Element.prototype polyfills
- **Files modified:** tests/setup.ts
- **Committed in:** 34d04e8

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- pnpm approve-builds interactive prompt doesn't work in non-interactive shell; resolved by adding onlyBuiltDependencies to package.json pnpm config

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- db-helpers.ts ready for Plan 02 (recipe-persistence and session-section-fk tests)
- Factory helpers (createTestFaction, createTestUnit, createTestRecipe, createTestSection) available for FK-dependent test data
- All 9 tests green; foundation established for remaining data-layer tests

---
*Phase: 72-data-layer-test-suite*
*Completed: 2026-05-13*
