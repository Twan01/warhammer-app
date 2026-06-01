---
phase: 106-army-list-simplification
verified: 2026-05-30T17:00:00Z
status: passed
score: 7/7
overrides_applied: 0
---

# Phase 106: Army List Simplification Verification Report

**Phase Goal:** Army list points are resolved directly from the canonical database via FK join, eliminating the synced_unit_points cache and the complex COALESCE chain
**Verified:** 2026-05-30T17:00:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Army list unit rows resolve effective_points via FK join through u.udb_unit_id to udb_unit_points, not through synced_unit_points name-based lookup | VERIFIED | armyLists.ts lines 89-99: LEFT JOIN udb_unit_points on u.udb_unit_id with tier and base subqueries. Same pattern in getArmyListReadiness (lines 435-443). No synced_unit_points reference in any JOIN. |
| 2 | 5-level COALESCE chain matches D-01: COALESCE(alu.points_override, udb_tier.points, udb_base.points, uo.points, u.points, 0) | VERIFIED | armyLists.ts line 85 and line 426 both use exact 5-level chain. resolveUnitPoints.ts if-chain (lines 39-44) matches same order with correct source labels. |
| 3 | synced_unit_points module is fully deleted and no TypeScript code imports it | VERIFIED | src/db/queries/syncedUnitPoints.ts does not exist. grep across src/ found zero imports. Only remaining references are a removal comment in useRulesSync.ts line 313 and a stale comment in useArmyLists.ts line 356. |
| 4 | BATTLELINE count validation with parameterized thresholds (3 at 2000pt, 2 at 1000pt, 1 below) | VERIFIED | computeUnitWarnings.ts lines 99-113: computeListWarnings implements exact threshold logic. Tests verify all thresholds (lines 269-329). |
| 5 | Ghost/unlinked units (unit_id IS NULL) skip role validation | VERIFIED | computeUnitWarnings.ts line 102-103: filter requires u.unit_id !== null. Tests confirm ghost units excluded (lines 320-329). |
| 6 | Migration 040 drops both synced cache tables | VERIFIED | 040_drop_synced_points.sql contains DROP TABLE IF EXISTS for both synced_unit_points and synced_unit_point_tiers, plus PRAGMA user_version = 40. |
| 7 | Points source labeling shows 'database' for units resolved via udb_unit_points | VERIFIED | resolveUnitPoints.ts line 42: udb_base_points returns source "database". Tier match returns "tier" (line 40). |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/queries/armyLists.ts` | FK-based points resolution via udb_unit_points | VERIFIED | Contains LEFT JOIN udb_units + udb_unit_points for tier and base points. 464 lines, substantive. |
| `src/lib/resolveUnitPoints.ts` | 5-level COALESCE chain with 'database' source | VERIFIED | 46 lines, exports resolveUnitPoints and PointsSource. If-chain matches SQL COALESCE order. |
| `src/types/armyList.ts` | ArmyListUnitRow with udb_base_points, udb_role, udb_keywords | VERIFIED | Lines 58-71: udb_unit_id, tier_points, udb_base_points, udb_role, udb_keywords all present with correct types. |
| `src/lib/computeUnitWarnings.ts` | Role-based unit warnings and BATTLELINE count list warning | VERIFIED | 173 lines, exports computeUnitWarnings, computeListWarnings, computeListHealthStats. BATTLELINE validation implemented. |
| `tests/lib/computeUnitWarnings.test.ts` | Test coverage for role/keyword validation | VERIFIED | 432 lines, 45 tests all passing. Covers BATTLELINE thresholds, ghost unit exclusion, case insensitivity. |
| `src-tauri/migrations/040_drop_synced_points.sql` | DROP TABLE for synced cache tables | VERIFIED | 6 lines, drops both tables with IF EXISTS. |
| `src/db/queries/syncedUnitPoints.ts` | DELETED (must not exist) | VERIFIED | File does not exist on disk. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/db/queries/armyLists.ts` | `udb_unit_points` | LEFT JOIN on u.udb_unit_id | WIRED | Lines 90-99: two LEFT JOINs (tier match on selected_model_count, base on MIN(model_count)) |
| `src/lib/resolveUnitPoints.ts` | `src/types/armyList.ts` | udb_base_points field | WIRED | resolveUnitPoints accepts udb_base_points in row parameter, ArmyListUnitRow defines it |
| `src/lib/computeUnitWarnings.ts` | `src/types/armyList.ts` | Pick of ArmyListUnitRow including udb_role | WIRED | computeListWarnings takes Array<Pick<ArmyListUnitRow, "udb_role" | "unit_id">> |
| `computeListHealthStats` | `computeListWarnings` | passes units for BATTLELINE count | WIRED | Line 152: computeListWarnings(context, units) passes units array |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `armyLists.ts` | effective_points, udb_role, udb_keywords | SQL JOIN to udb_unit_points + udb_units + udb_unit_keywords | Real DB queries with FK joins | FLOWING |
| `resolveUnitPoints.ts` | row fields | Called with ArmyListUnitRow from SQL query | Passes through real DB values | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compilation | `npx tsc --noEmit` | No errors | PASS |
| Unit tests (45 tests) | `npx vitest run tests/lib/computeUnitWarnings.test.ts` | 45 passed (0 failed) | PASS |
| syncedUnitPoints module deleted | `test -f src/db/queries/syncedUnitPoints.ts` | File not found | PASS |

### Probe Execution

Step 7c: SKIPPED (no probe scripts declared for this phase)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| ALI-01 | 106-01 | Army list points resolved from database FK join | SATISFIED | armyLists.ts uses LEFT JOIN udb_unit_points on u.udb_unit_id; COALESCE chain resolves via FK, not name match |
| ALI-02 | 106-02 | Army list validation uses database keywords and roles | SATISFIED | computeListWarnings uses udb_role for BATTLELINE count validation with parameterized thresholds |
| ALI-03 | 106-01, 106-02 | Remove dependency on synced_unit_points cache | SATISFIED | Module deleted, migration 040 drops tables, no imports remain in src/ |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/hooks/useArmyLists.ts` | 356 | Stale comment references "synced_unit_point_tiers JOIN" instead of "udb_unit_points JOIN" | INFO | Comment-only; no functional impact. The actual code uses correct FK-based join. |

### Human Verification Required

No human verification items identified. All truths are verifiable programmatically.

### Gaps Summary

No gaps found. All 7 observable truths verified, all artifacts substantive and wired, all 3 requirements satisfied. The phase goal of replacing name-based synced_unit_points cache with FK-based joins is fully achieved.

---

_Verified: 2026-05-30T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
