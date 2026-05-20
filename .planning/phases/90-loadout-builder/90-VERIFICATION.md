---
phase: 90-loadout-builder
verified: 2026-05-20T17:50:00Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification:
  - test: "Open LoadoutBuilderSheet from a unit row and select a tier"
    expected: "Sheet opens from right, tier dropdown works, points update in summary bar after selection"
    why_human: "Requires running app with real SQLite data to verify tier persistence and points recalculation"
  - test: "View wargear options for a unit with BSData sync data"
    expected: "Wargear items grouped by type with Default/Exclusive badges"
    why_human: "Requires BSData sync to have been run; visual layout verification"
  - test: "Close detail sheet and verify loadout sheet also closes"
    expected: "Both sheets close together"
    why_human: "Sibling portal coordination is a runtime behavior"
---

# Phase 90: Loadout Builder Verification Report

**Phase Goal:** Users can configure model count and see wargear options for any unit in their army list, with points auto-resolving from synced tiers
**Verified:** 2026-05-20T17:50:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can open a loadout panel for a unit and select a model count tier; the unit's effective points update immediately in the summary bar | VERIFIED | LoadoutBuilderSheet.tsx lines 122-133: handleTierChange calls setModelCount.mutate/clearModelCount.mutate with correct args. ArmyListUnitRow.tsx line 250-255: Configure button with onConfigure prop. ArmyListsPage.tsx line 71: openLoadout handler wired. Test confirms mutation args (test line 173). |
| 2 | User can view available wargear options for a unit sourced from BSData (display-only, free in 10th ed) | VERIFIED | LoadoutBuilderSheet.tsx lines 222-254: Wargear section groups by group_name, shows Default/Exclusive badges via is_default === 1 / is_exclusive === 1. Query function at bsdataExtended.ts line 191 reads synced_loadout_options. Tests confirm grouping and badges (test lines 200-219). |
| 3 | Selecting a different tier persists on save and is reflected in all points calculations across the list | VERIFIED | handleTierChange calls useSetSelectedModelCount which writes to army_list_units.selected_model_count. Cache invalidation via React Query (useArmyLists hooks invalidate ARMY_LIST_UNITS_KEY). resolveUnitPoints COALESCE chain includes tier_points. |
| 4 | The LoadoutBuilderSheet opens as a sibling portal at page level (no nested Sheet/Dialog issues) | VERIFIED | ArmyListsPage.tsx lines 146-152: LoadoutBuilderSheet rendered at page root level alongside other sibling portals, NOT inside ArmyListDetailSheet. State managed via loadoutUnitId at page level (line 41). |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/army-lists/LoadoutBuilderSheet.tsx` | Loadout config Sheet with tier selector and wargear display | VERIFIED | 261 lines, exports LoadoutBuilderSheet. Tier selector with Select + __default__, wargear grouped by group_name, ghost unit Planned badge, points override warning. |
| `src/features/army-lists/ArmyListUnitRow.tsx` | Configure trigger button replacing inline tier selector | VERIFIED | onConfigure prop in interface (line 41), Settings2 icon button (lines 245-255), tierLabel logic (lines 104-106). No pendingTierId/candidatePoints/useUnitPointTiers remnants. |
| `src/features/army-lists/ArmyListDetailSheet.tsx` | onConfigureUnit callback prop | VERIFIED | Prop in interface (line 54), destructured (line 58), threaded to ArmyListUnitRow (line 242). |
| `src/features/army-lists/ArmyListsPage.tsx` | Sibling portal wiring | VERIFIED | LoadoutBuilderSheet imported (line 14), loadoutUnitId state (line 41), useArmyListWithUnits for unit lookup (line 49), loadoutUnit derived (lines 50-52), rendered as sibling portal (lines 146-152), closeDetail resets loadoutUnitId (line 68). |
| `src/hooks/useLoadoutOptions.ts` | React Query hooks for wargear + tiers | VERIFIED | 51 lines. Exports useLoadoutOptionsForUnit, useTiersByUnitName, LOADOUT_OPTIONS_KEY, SYNCED_TIERS_BY_NAME_KEY. Both hooks have enabled guard (unitName !== undefined), staleTime 5min, factionId typed as string null. |
| `src/db/queries/bsdataExtended.ts` | getLoadoutOptionsForUnit query | VERIFIED | Function at line 191 with parameterized query against synced_loadout_options. |
| `src/db/queries/syncedUnitPoints.ts` | getTiersByUnitName query | VERIFIED | Function at line 94 with parameterized query against synced_unit_point_tiers. |
| `tests/army-lists/LoadoutBuilderSheet.test.tsx` | 9 passing tests | VERIFIED | 9/9 tests pass. Covers tier rendering, tier mutation, Default clear, wargear grouping, Default badge, Exclusive badge, empty state, ghost unit Planned badge, points override warning. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| LoadoutBuilderSheet.tsx | useLoadoutOptions.ts | import useTiersByUnitName, useLoadoutOptionsForUnit | WIRED | Lines 33-35 import both hooks; lines 89-90 call them |
| LoadoutBuilderSheet.tsx | useArmyLists.ts | import useSetSelectedModelCount, useClearSelectedModelCount | WIRED | Lines 29-31 import; lines 91-92 call; lines 124-131 mutate |
| ArmyListsPage.tsx | LoadoutBuilderSheet.tsx | sibling portal render | WIRED | Line 14 import; lines 146-152 render with full props |
| useLoadoutOptions.ts | bsdataExtended.ts | import getLoadoutOptionsForUnit | WIRED | Line 2 import; line 29 call in queryFn |
| useLoadoutOptions.ts | syncedUnitPoints.ts | import getTiersByUnitName | WIRED | Line 3 import; line 44 call in queryFn |
| ArmyListUnitRow.tsx | ArmyListDetailSheet.tsx | onConfigure prop callback | WIRED | DetailSheet line 242 passes onConfigure={() => onConfigureUnit(alu.id)} |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| LoadoutBuilderSheet.tsx | tiers | useTiersByUnitName -> getTiersByUnitName -> SELECT from synced_unit_point_tiers | DB query (parameterized) | FLOWING |
| LoadoutBuilderSheet.tsx | wargearOptions | useLoadoutOptionsForUnit -> getLoadoutOptionsForUnit -> SELECT from synced_loadout_options | DB query (parameterized) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Tests pass | `npx vitest run tests/army-lists/LoadoutBuilderSheet.test.tsx` | 9/9 pass (2.63s) | PASS |
| TypeScript compiles | `npx tsc --noEmit` | Clean (no output) | PASS |

### Probe Execution

Step 7c: SKIPPED (no probe scripts for this phase)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DL-01 | 90-01, 90-02 | Tier selection with points auto-resolve | SATISFIED | Select dropdown in LoadoutBuilderSheet, mutation hooks, Configure trigger in UnitRow |
| DL-02 | 90-01, 90-02 | Wargear display from BSData | SATISFIED | Grouped wargear section with Default/Exclusive badges, getLoadoutOptionsForUnit query |
| DL-10/DL-11 | 90-02 | Ghost unit loadout support | SATISFIED | unit.unit_id === null check shows Planned badge (line 147), queries work via unit_name (name-based lookup works for ghost units) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| LoadoutBuilderSheet.tsx | 151 | `<p>` (SheetDescription) containing `<div>` (PointsSourceChip) -- DOM nesting warning | INFO | HTML spec violation logged in console but no functional impact; cosmetic only |

### Human Verification Required

### 1. Full loadout flow with real data

**Test:** Open an army list with units, click Configure on a unit row, select a tier, verify points update in summary bar
**Expected:** Tier persists, points recalculate, closing/reopening sheet shows saved tier
**Why human:** Requires running app with SQLite databases populated with synced tier data

### 2. Wargear display with BSData sync

**Test:** Open LoadoutBuilderSheet for a unit that has wargear data (after BSData sync)
**Expected:** Wargear items grouped by type with Default/Exclusive badges visible
**Why human:** Requires BSData sync to have been run; visual layout verification

### 3. Sibling portal coordination

**Test:** Open detail sheet, click Configure on a unit, then close the detail sheet
**Expected:** Both the detail sheet and loadout sheet close together
**Why human:** Runtime portal behavior cannot be verified via grep

### Gaps Summary

No gaps found. All 4 ROADMAP success criteria are verified in the codebase. All artifacts exist, are substantive, and are properly wired. All 9 tests pass. TypeScript compiles clean. No debt markers found.

One minor DOM nesting warning (INFO severity) -- SheetDescription renders a `<p>` element but PointsSourceChip renders a `<div>` inside it. This is a cosmetic HTML spec violation with no functional impact.

---

_Verified: 2026-05-20T17:50:00Z_
_Verifier: Claude (gsd-verifier)_
