---
phase: 89-schema-data-layer
verified: 2026-05-20T17:00:00Z
status: passed
score: 20/20 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 89: Schema & Data Layer Verification Report

**Phase Goal:** Deliver all database migrations and query-layer changes for Army Lists 3.0. After this phase, the database and TypeScript data layer fully support: ghost/planned units, warlord designation, enhancement assignment, leader attachment, model count tier selection, and stable unit ordering.
**Verified:** 2026-05-20T17:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Migration 031 creates v3 schema (ghost units, enhancements, warlord, tier) | VERIFIED | `031_army_list_v3.sql` exists, uses rename-create-copy-drop, adds all 4 columns + enhancements table |
| 2 | TypeScript types extended for all v3 features | VERIFIED | `armyList.ts` has unit_id nullable, ghost_unit_name, is_warlord, selected_model_count, leader_attached_to_id, tier_points, ArmyListEnhancement, AddGhostUnitToListInput, AddEnhancementInput |
| 3 | Query functions support 6-level COALESCE, ghost unit joins, new CRUD | VERIFIED | `armyLists.ts` has COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0) in getArmyListWithUnits + getArmyListReadiness, with ghost_unit_name COALESCE join |
| 4 | Mutation hooks wired with correct cache invalidation | VERIFIED | All 10 new Phase 89 hooks present in useArmyLists.ts, all import from armyLists.ts, all invalidate ARMY_LIST_UNITS_KEY + ARMY_LIST_KEY |
| 5 | Tests cover extended resolveUnitPoints and new query functions | VERIFIED | 29 passing tests: 13 in resolveUnitPoints.test.ts (4 Phase 89 tier_points cases), 8 in armyListQueries.test.ts, 8 in armyListEnhancements.test.ts |
| 6 | D-01: army_list_enhancements join table with TEXT-copy columns | VERIFIED | `031_army_list_v3.sql` Step 5 creates table with enhancement_name TEXT NOT NULL, enhancement_points INTEGER NOT NULL DEFAULT 0 |
| 7 | D-03: leader_attached_to_id with ON DELETE SET NULL FK | VERIFIED | Migration line 28: `leader_attached_to_id INTEGER REFERENCES army_list_units(id) ON DELETE SET NULL` |
| 8 | D-04: Ghost units via nullable unit_id + ghost_unit_name CHECK | VERIFIED | Migration has `unit_id INTEGER REFERENCES units(id)` (nullable), `ghost_unit_name TEXT`, `CHECK (unit_id IS NOT NULL OR ghost_unit_name IS NOT NULL)` |
| 9 | D-05: Table recreation via rename-create-copy-drop pattern | VERIFIED | Migration follows: RENAME TO army_list_units_old → CREATE TABLE army_list_units → INSERT...SELECT → DROP TABLE army_list_units_old |
| 10 | D-07: Ghost units excluded from Collection/Dashboard/Kanban | VERIFIED | ghost_unit_name column exists only in armyLists.ts; all other query files (units.ts) query FROM units directly — ghost rows (unit_id=NULL in army_list_units) never surface in non-army-list queries |
| 11 | D-08: selected_model_count + tier.points LEFT JOIN for 6-level COALESCE | VERIFIED | Column present in migration; LEFT JOIN synced_unit_point_tiers on unit_name + model_count + faction_id in both query functions |
| 12 | D-09: COALESCE chain identical across getArmyListWithUnits and getArmyListReadiness | VERIFIED | Both use exactly `COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0)` — character-for-character identical |
| 13 | D-10: is_warlord INTEGER NOT NULL DEFAULT 0 | VERIFIED | Migration line 27: `is_warlord INTEGER NOT NULL DEFAULT 0`; setWarlord uses CASE WHEN id=$1 THEN 1 ELSE 0 END WHERE list_id=$2 |
| 14 | D-11: ORDER BY alu.created_at ASC, alu.id ASC for stable insertion order | VERIFIED | getArmyListWithUnits line 88: `ORDER BY alu.created_at ASC, alu.id ASC` |
| 15 | D-12: Single migration file 031_army_list_v3.sql registered in lib.rs as version 31 | VERIFIED | lib.rs lines 187-191: `version: 31`, `description: "army_list_v3"`, `include_str!("../migrations/031_army_list_v3.sql")` |
| 16 | D-13: Dedicated clear functions for nullable columns | VERIFIED | clearLeaderAttachment and clearSelectedModelCount both issue explicit SET col = NULL (no COALESCE), confirmed by passing tests |
| 17 | setWarlord scopes by list_id (no cross-list mutation) | VERIFIED | `WHERE list_id = $2` present in setWarlord; test "scopes the UPDATE by list_id (Pitfall 4)" passes |
| 18 | ArmyListUnit interface has unit_id as number | null and all new fields | VERIFIED | armyList.ts lines 30-42: unit_id: number \| null, ghost_unit_name, is_warlord, selected_model_count, leader_attached_to_id all present |
| 19 | resolveUnitPoints accepts tier_points at correct priority level | VERIFIED | tier_points is second in if-chain (after points_override, before synced_points) matching SQL COALESCE order; 4 Phase 89 test cases all pass |
| 20 | PointsSource union type includes 'tier' | VERIFIED | `export type PointsSource = "override" \| "tier" \| "synced" \| "user-override" \| "base" \| "unknown"` |

**Score:** 20/20 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/migrations/031_army_list_v3.sql` | Schema migration | VERIFIED | 63 lines, complete rename-create-copy-drop + enhancements table |
| `src-tauri/src/lib.rs` | Migration version 31 registered | VERIFIED | Lines 187-191 confirmed |
| `src/types/armyList.ts` | Extended interfaces with ghost_unit_name | VERIFIED | All 5 new types present: ArmyListEnhancement, AddGhostUnitToListInput, AddEnhancementInput, plus extended ArmyListUnit and ArmyListUnitRow |
| `src/lib/resolveUnitPoints.ts` | tier_points support | VERIFIED | 5-parameter function, tier second in if-chain, PointsSource includes 'tier' |
| `src/db/queries/armyLists.ts` | Extended queries + setWarlord | VERIFIED | 394 lines; addGhostUnitToList, setWarlord, clearWarlord, setLeaderAttachment, clearLeaderAttachment, setSelectedModelCount, clearSelectedModelCount, addEnhancement, removeEnhancement, getEnhancementsByList all present |
| `src/hooks/useArmyLists.ts` | New mutation hooks including useSetWarlord | VERIFIED | 435 lines; all 10 new Phase 89 hooks exported |
| `tests/lib/resolveUnitPoints.test.ts` | Updated tests with tier_points cases | VERIFIED | 4 Phase 89 test cases (lines 119-161), all passing |
| `tests/army-list/armyListQueries.test.ts` | New query tests | VERIFIED | 8 Phase 89 tests for setWarlord (2), addGhostUnitToList (2), clearLeaderAttachment (2), clearSelectedModelCount (1) — all passing |
| `tests/army-list/armyListEnhancements.test.ts` | Enhancement CRUD tests | VERIFIED | 8 tests covering addEnhancement (3), removeEnhancement (2), getEnhancementsByList (3) — all passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src-tauri/src/lib.rs` | `031_army_list_v3.sql` | `include_str!` version 31 | WIRED | Confirmed at lines 187-191 |
| `src/hooks/useArmyLists.ts` | `src/db/queries/armyLists.ts` | import of setWarlord, addGhostUnitToList | WIRED | Lines 16-26 import all 10 new Phase 89 functions |
| `src/db/queries/armyLists.ts` | `src/types/armyList.ts` | type imports AddGhostUnitToListInput, ArmyListEnhancement | WIRED | Lines 1-12 import all required types including AddGhostUnitToListInput, AddEnhancementInput, ArmyListEnhancement |
| `src/lib/resolveUnitPoints.ts` | `src/types/armyList.ts` | tier_points field alignment | WIRED | resolveUnitPoints.ts accepts tier_points matching ArmyListUnitRow.tier_points field |

### Behavioral Spot-Checks

| Behavior | Result | Status |
|----------|--------|--------|
| resolveUnitPoints 4 tier_points test cases | 4/4 pass | PASS |
| setWarlord CASE WHEN scoped by list_id | 2/2 tests pass | PASS |
| addGhostUnitToList with NULL unit_id | 2/2 tests pass | PASS |
| clearLeaderAttachment explicit NULL passthrough | 2/2 tests pass | PASS |
| addEnhancement/removeEnhancement/getEnhancementsByList | 8/8 tests pass | PASS |
| Full test suite (Phase 89 files) | 29/29 pass; 5 pre-existing failures in unrelated files | PASS |

### Anti-Patterns Found

None. All 6 modified files checked for TBD/FIXME/XXX/PLACEHOLDER — zero matches. No stub returns, no empty implementations.

### Human Verification Required

None. All success criteria are verifiable in the data layer without running the UI.

---

## Gaps Summary

No gaps. All 20 must-have truths verified with direct codebase evidence.

The 5 test failures in the full suite (`useRulesSync.test.ts` — 3 failures, `recipeAssignments.test.ts` — 2 failures) are pre-existing and documented as unrelated to Phase 89 per the phase submission. They concern query key invalidation counts in the rules sync hook and recipe assignments hook, which are not modified in this phase.

---

_Verified: 2026-05-20T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
