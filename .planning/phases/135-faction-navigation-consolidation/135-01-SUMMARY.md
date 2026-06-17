---
phase: 135-faction-navigation-consolidation
plan: "01"
subsystem: database
tags: [sqlite, migration, data-integrity, faction, fk-safety, better-sqlite3]

requires:
  - phase: 130-migration-parity-release-gate
    provides: parity gate mechanics (check-version.mjs, lib.rs Migration count, LF endings)
  - phase: 134-no-dead-ends
    provides: app_settings key/value table (migration 044)
  - phase: 120-wahapedia-pipeline
    provides: udb_factions table + wahapedia_faction_id FK linkage pattern (migrations 039, 046)

provides:
  - "migration 048: map-not-delete faction consolidation (re-point 4 FK surfaces + default_faction_id, delete orphaned duplicates, backfill NULLs)"
  - "zero-data-loss proof via better-sqlite3 data-layer test (migration048.test.ts)"
  - "Phase-130 parity gate satisfied at 48 migrations"

affects:
  - 135-02 (faction CRUD rehoming to Settings depends on consolidated factions table)
  - 135-03 (sidebar/route cleanup assumes migration 048 is in place)

tech-stack:
  added: []
  patterns:
    - "map-not-delete FK consolidation: re-point all dependents before DELETE using correlated subqueries"
    - "CAST(id AS TEXT) for INTEGER<->TEXT comparisons in app_settings key/value store"
    - "inline createDbUpToMigration(N) helper for testing data-transforming migrations in isolation"

key-files:
  created:
    - src-tauri/migrations/048_consolidate_factions.sql
    - tests/data-layer/migration048.test.ts
  modified:
    - src-tauri/src/lib.rs

key-decisions:
  - "D-03 map-not-delete: re-point all 4 FK surfaces (units RESTRICT, painting_recipes SET NULL, army_lists SET NULL, wishlist_items CASCADE) plus app_settings default_faction_id before any DELETE"
  - "D-10 parity gate: lib.rs Migration{} count bumped 47->48; LF line endings enforced; node scripts/check-version.mjs passes"
  - "Correlated subquery shape (no BEGIN/COMMIT, no PRAGMA toggle) chosen per migration 033 notes on plugin-sql transaction wrapping"
  - "Survivor-selection rule: lowest id among rows sharing the same non-NULL wahapedia_faction_id wins"
  - "Test assertion scoped to seeded-name lookups (not all-rows check) to avoid collisions with migration 002 seed data"

patterns-established:
  - "Pattern: data-transforming migration tests use inline createDbUpToMigration(N) helper, NOT createHobbyforgeDb(), so pre-migration state can be seeded"
  - "Pattern: app_settings TEXT value comparisons always use CAST(integer_id AS TEXT)"

requirements-completed: [HON-05]

duration: 10min
completed: 2026-06-17
---

# Phase 135 Plan 01: Migration 048 Faction Consolidation Summary

**Map-not-delete faction deduplication: correlated-subquery migration re-pointing units (RESTRICT), painting_recipes (SET NULL), army_lists (SET NULL), wishlist_items (CASCADE), and app_settings default_faction_id before deleting orphaned duplicates — zero data loss proven by better-sqlite3 data-layer test**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-17T10:10:56Z
- **Completed:** 2026-06-17T10:20:52Z
- **Tasks:** 3 (TDD: RED + GREEN + parity gate)
- **Files modified:** 3

## Accomplishments

- Migration 048 written with correct map-not-delete ordering across all 4 FK surfaces plus the TEXT app_settings value; LF line endings confirmed; no BEGIN/COMMIT/PRAGMA in executable SQL
- Zero-data-loss proof: migration048.test.ts seeds the duplicate scenario across all surfaces, records pre-migration counts, applies migration, asserts row-count invariants, FK re-point to survivor, no NULL introduced, cold-boot default_faction_id resolution, no duplicates remain
- Phase-130 parity gate confirmed green at 48: `node scripts/check-version.mjs` reports `OK: 48 .sql files === 48 Migration{} entries`; `migration-parity.test.ts` passes

## Task Commits

1. **Task 1: Write the failing zero-data-loss test (RED)** — `5c954dd7` (test)
2. **Task 2: Write migration 048 + register in lib.rs (GREEN)** — `f993e945` (feat)
3. **Task 3: Parity / version gates pass at 48** — verified (no new files; gates confirmed)

## Files Created/Modified

- `src-tauri/migrations/048_consolidate_factions.sql` — 7-step map-not-delete SQL migration; correlated subqueries; LF endings; no explicit transaction control
- `tests/data-layer/migration048.test.ts` — 2 test cases: zero-data-loss proof + unmapped faction preservation
- `src-tauri/src/lib.rs` — Migration{} entry added (version: 48, count 47→48)

## Decisions Made

- Used correlated-subquery approach (no temp table, no BEGIN/COMMIT) because migration 033 documents that PRAGMA foreign_keys and explicit transactions inside Tauri plugin-sql migrations are unreliable/silently ignored
- Test assertion scoped by seeded row name (not `units.every(...)`) because migration 002 seeds 5 existing units that would break an all-rows assertion
- Survivor = lowest id (simplest, deterministic, consistent with intent)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion scoped to seeded row by name instead of all-rows**
- **Found during:** Task 2 (GREEN verification)
- **Issue:** The initial assertion `units.every(u => u.faction_id === survivorId)` failed because migration 002 seeds 5 units with faction_ids 1-4 which are unrelated to the duplicate scenario. The all-rows check was not scoped correctly.
- **Fix:** Changed unit name to unique value `'Test Intercessors Duplicate'` and split assertion into: (a) named-unit lookup asserting `faction_id === survivorId`, (b) `COUNT(*) WHERE faction_id = duplicateId` asserting 0.
- **Files modified:** tests/data-layer/migration048.test.ts
- **Verification:** Both test cases pass GREEN
- **Committed in:** `f993e945` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test assertion scope)
**Impact on plan:** Purely a test correctness fix. Migration SQL was correct on first write; the deviation was in the test's assertion logic, not the migration behavior.

## Issues Encountered

None beyond the test assertion fix documented above.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at external trust boundaries introduced. Migration 048 operates entirely on the internal SQLite database. The app_settings UPDATE is scoped to `key = 'default_faction_id'` only (T-135-01 mitigated).

## Known Stubs

None. This plan is data-only (migration + test). No UI rendering stubs introduced.

## Next Phase Readiness

- Migration 048 is in master; the consolidated `factions` table is ready for the Settings rehoming in Plan 02
- All 305 tests pass; parity gate green at 48; safe to proceed with HON-06/HON-07 in Plans 02 and 03

---
*Phase: 135-faction-navigation-consolidation*
*Completed: 2026-06-17*
