---
phase: 24-collection-unit-point-calculator-with-wargear-selection-and-swap-delta-preview
plan: 02
subsystem: database
tags: [sqlite, react-query, typescript, migrations, tauri]

# Dependency graph
requires:
  - phase: 24-collection-unit-point-calculator-with-wargear-selection-and-swap-delta-preview
    provides: Phase 24 research and 24-01 PlaybookTab foundation

provides:
  - Migration 011 with unit_point_tiers, unit_loadouts, unit_loadout_wargear tables
  - UnitPointTier and UnitLoadout TypeScript interfaces
  - Full CRUD query modules for both tiers and loadouts
  - React Query hooks following per-unit useStrategyNote pattern
  - computeDelta pure utility for point delta preview

affects:
  - 24-03-PlaybookTab UI (consumes hooks directly)
  - 24-04-army-list-delta-preview (consumes computeDelta + useUnitLoadouts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "INSERT OR REPLACE for UNIQUE-constrained upsert (unit_point_tiers)"
    - "Two-step deactivate-all + activate-one without explicit transaction (activateLoadout)"
    - "Nested wargear fetched in one IN() query and grouped in-memory"
    - "Per-unit React Query key factory: (unitId) => [key-name, unitId] as const"

key-files:
  created:
    - src-tauri/migrations/011_point_tiers_loadouts.sql
    - src/types/unitPointTier.ts
    - src/types/unitLoadout.ts
    - src/lib/computeDelta.ts
    - src/db/queries/unitPointTiers.ts
    - src/db/queries/unitLoadouts.ts
    - src/hooks/useUnitPointTiers.ts
    - src/hooks/useUnitLoadouts.ts
  modified:
    - src-tauri/src/lib.rs (added version 11 migration entry)
    - tests/army-list/deltaPreview.test.ts (implemented from stubs)
    - tests/collection/unitPointTierQueries.test.ts (implemented from stubs)
    - tests/collection/unitLoadoutQueries.test.ts (implemented from stubs)

key-decisions:
  - "weapon_name stored as TEXT copy in unit_loadout_wargear — no cross-DB FK to rules.db rw_datasheets_wargear"
  - "activateLoadout uses two-step UPDATE without transaction — safe for local single-user SQLite"
  - "COALESCE chain in armyLists.ts left untouched — tier points flow via units.points update at application layer"
  - "useActivateLoadout invalidates army-lists cache so ArmyListUnitRow picks up active loadout name"

patterns-established:
  - "Pattern 1: Per-unit hook key factory — (unitId: number) => [cache-key, unitId] as const"
  - "Pattern 2: Wargear nesting — fetch all loadouts then all wargear in one IN() query, group in Map"
  - "Pattern 3: INSERT OR REPLACE for UNIQUE(unit_id, model_count) upsert"

requirements-completed: [TIER-01, TIER-02, TIER-03, LOAD-01, LOAD-02, LOAD-03, DELTA-01, COALESCE-01]

# Metrics
duration: 22min
completed: 2026-05-05
---

# Phase 24 Plan 02: Data Foundation Summary

**Three-table SQLite schema (point tiers, loadouts, wargear), full CRUD query modules, React Query hooks, and computeDelta utility powering Plans 03 and 04**

## Performance

- **Duration:** 22 min
- **Started:** 2026-05-05T20:19:53Z
- **Completed:** 2026-05-05T20:41:00Z
- **Tasks:** 2
- **Files modified:** 12 (8 created, 4 modified)

## Accomplishments

- Migration 011 creates unit_point_tiers (with UNIQUE(unit_id, model_count)), unit_loadouts, and unit_loadout_wargear tables, registered as version 11 in lib.rs
- Two CRUD query modules (unitPointTiers.ts, unitLoadouts.ts) with parameterized $1/$2 syntax, INSERT OR REPLACE upsert, and two-step activateLoadout
- Two React Query hook files following the canonical useStrategyNote per-unit pattern; useActivateLoadout invalidates ["army-lists"] for downstream ArmyListUnitRow
- computeDelta pure function handles positive, negative, zero, and null candidatePoints cases
- COALESCE chain in armyLists.ts confirmed untouched (COALESCE-01)
- All 644 tests pass; pnpm build exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration, types, and Rust registration** - `44cf742` (feat)
2. **Task 2: Create query modules and React Query hooks** - `6c170a9` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src-tauri/migrations/011_point_tiers_loadouts.sql` - Three new tables with FK cascades and UNIQUE constraint
- `src-tauri/src/lib.rs` - Version 11 migration entry added to get_migrations()
- `src/types/unitPointTier.ts` - UnitPointTier and CreateUnitPointTierInput interfaces
- `src/types/unitLoadout.ts` - UnitLoadout, LoadoutWargear, CreateLoadoutInput, AddWargearToLoadoutInput interfaces
- `src/lib/computeDelta.ts` - computeDelta(candidatePoints, effectivePoints) pure function
- `src/db/queries/unitPointTiers.ts` - getUnitPointTiers, upsertUnitPointTier, deleteUnitPointTier
- `src/db/queries/unitLoadouts.ts` - getUnitLoadouts, createLoadout, deleteLoadout, activateLoadout, addWargearToLoadout, removeWargearFromLoadout
- `src/hooks/useUnitPointTiers.ts` - UNIT_POINT_TIERS_KEY, useUnitPointTiers, useUpsertUnitPointTier, useDeleteUnitPointTier
- `src/hooks/useUnitLoadouts.ts` - UNIT_LOADOUTS_KEY, useUnitLoadouts, useCreateLoadout, useDeleteLoadout, useActivateLoadout, useAddWargearToLoadout, useRemoveWargearFromLoadout
- `tests/army-list/deltaPreview.test.ts` - Implemented computeDelta tests (from stubs)
- `tests/collection/unitPointTierQueries.test.ts` - Implemented tier query tests (from stubs)
- `tests/collection/unitLoadoutQueries.test.ts` - Implemented loadout query tests (from stubs)

## Decisions Made

- weapon_name stored as TEXT copy in unit_loadout_wargear (not FK to rules.db) — cross-database foreign keys not supported in SQLite
- activateLoadout uses two-step UPDATE without explicit transaction — safe for local single-user SQLite desktop app
- COALESCE chain in armyLists.ts left untouched — tier-derived values flow through units.points at the application layer, not SQL

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Implemented test stubs to fix TypeScript strict-mode build failures**
- **Found during:** Task 1 (first build attempt)
- **Issue:** Three test stub files (deltaPreview.test.ts, unitPointTierQueries.test.ts, unitLoadoutQueries.test.ts) had `import { expect, vi, beforeEach }` declarations that were unused because all logic was in TODO comments. TypeScript strict mode (noUnusedLocals) rejected these as errors, blocking `pnpm build`.
- **Fix:** Replaced describe.skip stubs with real implementations — mocking @/db/client and asserting exact SQL patterns. Added computeDelta import in deltaPreview.test.ts.
- **Files modified:** tests/army-list/deltaPreview.test.ts, tests/collection/unitPointTierQueries.test.ts, tests/collection/unitLoadoutQueries.test.ts
- **Verification:** 644 tests pass; pnpm build exits 0
- **Committed in:** 44cf742 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix required to unblock build. Converted TODO stubs into real passing tests — net positive for coverage.

## Issues Encountered

None beyond the stub test auto-fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All data layer artifacts ready: migration, types, query modules, hooks, computeDelta
- Plan 03 (PlaybookTab UI) can directly import useUnitPointTiers and useUnitLoadouts
- Plan 04 (army list delta preview) can directly import computeDelta and useUnitLoadouts
- No blockers

---
*Phase: 24-collection-unit-point-calculator-with-wargear-selection-and-swap-delta-preview*
*Completed: 2026-05-05*
