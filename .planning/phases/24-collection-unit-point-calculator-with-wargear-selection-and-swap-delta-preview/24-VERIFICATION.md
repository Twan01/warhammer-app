---
phase: 24-collection-unit-point-calculator-with-wargear-selection-and-swap-delta-preview
verified: 2026-05-05T18:46:03Z
status: human_needed
score: 4/4 must-haves verified
re_verification: false
human_verification:
  - test: "Open any unit detail sheet, go to PlaybookTab, scroll to Point Tiers section. Add two tiers (e.g. 5 models / 80pts and 10 models / 160pts). Click Set Active on the 5-model tier."
    expected: "Both tiers appear sorted by model count ASC. The active tier shows a green check icon. A toast confirms 'Points updated to 80 pts'. Closing and reopening the unit sheet shows the points field disabled with helper text 'Managed by point tiers (2 tiers defined)'."
    why_human: "Database write + cache invalidation + reactive UI state cannot be verified in jsdom."
  - test: "In LoadoutSection (PlaybookTab), create a loadout named 'Anti-tank'. Expand it. If the unit has a linked datasheet, verify weapon checkboxes appear grouped by weapon line. Toggle one checkbox on then off."
    expected: "Loadout appears. Wargear checkboxes render grouped by option group number. Toggling on adds the weapon to 'Selected wargear'. Toggling off removes it. No page reload needed."
    why_human: "Cross-DB client-side merge (rules.db wargear + hobbyforge.db loadout state) requires live Tauri bridge."
  - test: "Create a second loadout, then click the Star icon to activate it."
    expected: "The first loadout loses the green 'Active' badge. The second gains it. The army list unit row updates to show the newly active loadout name below the unit name."
    why_human: "useActivateLoadout must invalidate ['army-lists'] cache; requires live React Query state across components."
  - test: "Go to an Army List containing a unit that has point tiers. Locate the tier selector dropdown in that unit's row. Select a different tier from the dropdown."
    expected: "A colored delta badge appears: '+N' in red if the candidate costs more, '-N' in green if it saves points. The Confirm button appears. Clicking Confirm writes the new points to units.points, the badge disappears, and the army list total updates."
    why_human: "Real-time delta preview state + useUpdateUnit write + army list total recalculation requires live Tauri."
  - test: "Edit the notes field on any army list unit row (with or without tiers). Blur/save the field."
    expected: "Notes save correctly. The points_override value for that row is unchanged (Pitfall 2 regression check)."
    why_human: "Full-replacement mutation contract (both fields must be passed) requires DB write verification."
---

# Phase 24: Unit Point Calculator Verification Report

**Phase Goal:** Create a point calculator that lets users manage model-count point tiers, track wargear loadout selections per unit, and preview the points delta when swapping between configurations in the army list builder.
**Verified:** 2026-05-05T18:46:03Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Success Criteria from ROADMAP.md

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | User can define multiple point tiers per unit with auto-matching to model count | VERIFIED | `TierManager.tsx` renders tier table; `upsertUnitPointTier` uses `INSERT OR REPLACE`; `ORDER BY model_count ASC`; Set Active writes to `units.points` |
| 2 | User can create named wargear loadouts with datasheet-sourced or manual wargear options | VERIFIED | `LoadoutSection.tsx` implements Collapsible loadout cards; datasheet wargear grouped by `line` field via `useMemo`; manual input fallback when no datasheet linked |
| 3 | User can mark one loadout active per unit; army list builder uses it for display | VERIFIED | `activateLoadout` two-step UPDATE (deactivate-all then activate-one); `useActivateLoadout` invalidates `["army-lists"]`; `ArmyListUnitRow.tsx` renders `activeLoadout.name` |
| 4 | Colored delta badge (+N green / -N red) previews points difference before committing swap | VERIFIED | `ArmyListUnitRow.tsx` imports `computeDelta`; `delta !== 0` renders `Badge` with `text-destructive` or `text-green-600`; `setPendingTierId(null)` clears badge on confirm (Pitfall 5) |

**Score:** 4/4 truths verified

---

## Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `src-tauri/migrations/011_point_tiers_loadouts.sql` | VERIFIED | 3 tables: `unit_point_tiers`, `unit_loadouts`, `unit_loadout_wargear`; `UNIQUE (unit_id, model_count)`; FK cascades |
| `src-tauri/src/lib.rs` | VERIFIED | `version: 11`, `description: "point_tiers_loadouts"` present |
| `src/types/unitPointTier.ts` | VERIFIED | `UnitPointTier`, `CreateUnitPointTierInput` exported |
| `src/types/unitLoadout.ts` | VERIFIED | `UnitLoadout`, `LoadoutWargear`, `CreateLoadoutInput`, `AddWargearToLoadoutInput` exported |
| `src/lib/computeDelta.ts` | VERIFIED | `computeDelta(candidatePoints, effectivePoints)` handles positive, negative, zero, null |
| `src/db/queries/unitPointTiers.ts` | VERIFIED | `getUnitPointTiers`, `upsertUnitPointTier`, `deleteUnitPointTier` with `$1/$2` syntax |
| `src/db/queries/unitLoadouts.ts` | VERIFIED | All 6 CRUD functions; two-step `activateLoadout`; wargear nested via single IN() query |
| `src/hooks/useUnitPointTiers.ts` | VERIFIED | `UNIT_POINT_TIERS_KEY`, `useUnitPointTiers`, `useUpsertUnitPointTier`, `useDeleteUnitPointTier` |
| `src/hooks/useUnitLoadouts.ts` | VERIFIED | `UNIT_LOADOUTS_KEY`, all 6 hooks; `useActivateLoadout` invalidates `["army-lists"]` |
| `src/features/units/TierManager.tsx` | VERIFIED | `export function TierManager`; imports `useUnitPointTiers`, `useUpsertUnitPointTier`, `useDeleteUnitPointTier`, `useUnit`, `useUpdateUnit` |
| `src/features/units/LoadoutSection.tsx` | VERIFIED | `export function LoadoutSection`; imports all loadout hooks + `useDatasheet`; `wargearByLine` grouping; stale wargear detection via `is_manual` |
| `src/features/units/PlaybookTab.tsx` | VERIFIED | `import { TierManager }` and `import { LoadoutSection }` present; both rendered with `unitId={unitId}` |
| `src/features/army-lists/ArmyListUnitRow.tsx` | VERIFIED | Imports `computeDelta`, `useUnitPointTiers`, `useUnitLoadouts`, `useUpdateUnit`; delta badge with `text-destructive`/`text-green-600`; Pitfall 2 preserved (`notes: unit.notes`) |
| `src/features/units/UnitSheet.tsx` | VERIFIED | Imports `useUnitPointTiers`; `hasTiers` guard; `disabled={hasTiers}`; helper text "Managed by point tiers" |
| `tests/collection/unitPointTierQueries.test.ts` | VERIFIED | 5 active tests (no `describe.skip`/`it.skip`); mocks `@/db/client`; asserts SQL patterns |
| `tests/collection/unitLoadoutQueries.test.ts` | VERIFIED | 7 active tests; asserts two-step `activateLoadout`, wargear nesting, all CRUD |
| `tests/army-list/deltaPreview.test.ts` | VERIFIED | 4 active tests; imports `computeDelta` directly; all DELTA-01 cases covered |

---

## Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `useUnitPointTiers.ts` | `unitPointTiers.ts` | `import getUnitPointTiers, upsertUnitPointTier, deleteUnitPointTier` | WIRED |
| `useUnitLoadouts.ts` | `unitLoadouts.ts` | `import` all 6 CRUD functions | WIRED |
| `useUnitLoadouts.ts` | `useArmyLists.ts` (cache) | `invalidateQueries({ queryKey: ["army-lists"] })` in `useActivateLoadout` | WIRED |
| `TierManager.tsx` | `useUnitPointTiers.ts` | `import.*from.*@/hooks/useUnitPointTiers` | WIRED |
| `LoadoutSection.tsx` | `useUnitLoadouts.ts` | `import.*from.*@/hooks/useUnitLoadouts` | WIRED |
| `LoadoutSection.tsx` | `useDatasheet.ts` | `import { useDatasheet } from "@/hooks/useDatasheet"` | WIRED |
| `PlaybookTab.tsx` | `TierManager.tsx` | `import { TierManager } from "@/features/units/TierManager"` | WIRED |
| `PlaybookTab.tsx` | `LoadoutSection.tsx` | `import { LoadoutSection } from "@/features/units/LoadoutSection"` | WIRED |
| `ArmyListUnitRow.tsx` | `computeDelta.ts` | `import { computeDelta } from "@/lib/computeDelta"` | WIRED |
| `ArmyListUnitRow.tsx` | `useUnitPointTiers.ts` | `import { useUnitPointTiers } from "@/hooks/useUnitPointTiers"` | WIRED |
| `ArmyListUnitRow.tsx` | `useUnitLoadouts.ts` | `import { useUnitLoadouts } from "@/hooks/useUnitLoadouts"` | WIRED |
| `UnitSheet.tsx` | `useUnitPointTiers.ts` | `import { useUnitPointTiers } from "@/hooks/useUnitPointTiers"` | WIRED |

---

## Requirements Coverage

The 8 requirement IDs listed in the phase plans are defined in `ROADMAP.md` Phase 24 entry — they are not in `REQUIREMENTS.md` (which covers v0.2.4 requirements separately). All 8 are phase-internal derived requirements.

| Requirement | Declared In | Description | Status |
|-------------|-------------|-------------|--------|
| TIER-01 | 24-01, 24-02, 24-03, 24-04 PLAN | Upsert tier with unit_id/model_count/points; handles UNIQUE constraint | SATISFIED — `upsertUnitPointTier` uses `INSERT OR REPLACE`; test in `unitPointTierQueries.test.ts` passes |
| TIER-02 | 24-01, 24-02, 24-03, 24-04 PLAN | Get tiers sorted by model_count ASC | SATISFIED — `ORDER BY model_count ASC` in query; test asserts sort order |
| TIER-03 | 24-01, 24-02, 24-03 PLAN | Delete tier by id | SATISFIED — `deleteUnitPointTier` with `DELETE FROM unit_point_tiers WHERE id = $1`; test passes |
| LOAD-01 | 24-01..03 PLAN | Get loadouts with nested wargear arrays | SATISFIED — single IN() query; wargear grouped by `Map` in `getUnitLoadouts`; test verifies nested wargear |
| LOAD-02 | 24-01..03 PLAN | Activate loadout: deactivate-all then activate-one | SATISFIED — two-step UPDATE; test verifies both calls in order |
| LOAD-03 | 24-01..03 PLAN | Create/delete loadout and add/remove wargear | SATISFIED — all 4 operations implemented; 4 tests verify SQL patterns |
| DELTA-01 | 24-01..04 PLAN | `computeDelta(candidatePoints, effectivePoints)` returns signed delta | SATISFIED — pure function; 4 tests pass (positive, negative, zero, null) |
| COALESCE-01 | 24-02, 24-04 PLAN | COALESCE chain in `getArmyListWithUnits` unchanged | SATISFIED — `COALESCE(alu.points_override, u.points, 0) AS effective_points` verified present; tier values flow via `units.points` write at application layer |

**All 8 requirements satisfied.** No orphaned requirements detected.

---

## Anti-Patterns Found

No anti-patterns detected. Specifically:
- No `describe.skip` or `it.skip` in any of the 3 test files (all activated)
- No placeholder return values in components (all render real UI)
- No empty handlers (all mutations call real query functions)
- One `return null` in `ArmyListUnitRow.tsx` is inside a `useMemo` returning `candidatePoints: null` — correct domain value, not a stub

---

## Human Verification Required

### 1. Point Tier CRUD and Activation

**Test:** Open a unit detail sheet, go to Playbook tab. Add two tiers (5 models / 80pts, then 10 models / 160pts). Click Set Active on the 5-model tier.
**Expected:** Both rows appear sorted ascending (5, then 10). Active tier shows green check icon. Toast confirms "Points updated to 80 pts". Closing and reopening the unit sheet shows the points field disabled ("Managed by point tiers (2 tiers defined)").
**Why human:** Database write to `units.points`, cache invalidation, and disabled Input rendering require live Tauri bridge; cannot simulate in jsdom.

### 2. Loadout Wargear Picker (Datasheet-linked Unit)

**Test:** On a unit with a linked datasheet, expand a loadout in LoadoutSection. Verify weapon checkboxes appear grouped by option group number. Toggle one checkbox on, then off.
**Expected:** Weapons render in labeled groups (e.g. "Option group 1", "Option group 2"). Checking a weapon adds it to "Selected wargear" below. Unchecking removes it. No stale badge shown for freshly synced weapons.
**Why human:** Client-side merge of rules.db and hobbyforge.db requires live Tauri SQL bridge.

### 3. Loadout Activation and Army List Propagation

**Test:** Create two loadouts for a unit. Activate the first (Star icon). Then activate the second.
**Expected:** First loadout badge switches from "Active" (green) to inactive. Second gains "Active" badge. In the army list builder, the unit row updates to show the newly active loadout name as muted text below the unit name.
**Why human:** Cross-component cache invalidation (`["army-lists"]`) requires live React Query state.

### 4. Delta Badge Preview and Confirm Flow

**Test:** Go to an Army List containing a tiered unit. Open the tier selector dropdown in the unit row. Select a tier with different points than the current effective points.
**Expected:** Delta badge appears — "+N" in red (destructive) if the tier costs more, "-N" in green if it saves points. Clicking Confirm writes new points via `units.points`, badge disappears, army list total recalculates.
**Why human:** Local state (`pendingTierId`) + DB write + query invalidation chain requires live Tauri.

### 5. Pitfall 2 Regression — Full-Replacement Contract

**Test:** On a unit row that has notes, blur the notes textarea without changing the points field. Then blur the points override field without changing the notes.
**Expected:** Each save preserves both fields — notes are never wiped when saving points, and points_override is not cleared when saving notes.
**Why human:** Requires DB inspection to confirm both fields round-trip correctly; cannot verify from UI alone.

---

## Summary

All automated checks pass with high confidence:
- 17 artifact files exist and are substantive (none are stubs or placeholders)
- All 12 key links are wired (imports present and used)
- All 8 requirement IDs are covered by implementation evidence
- 16 Phase 24 tests pass (644 total, 0 failures) — `pnpm test` exit 0
- COALESCE chain in `armyLists.ts` is intact
- No anti-patterns found in modified files

5 items require human verification in a live Tauri session (`pnpm tauri dev`) because they depend on real SQLite writes, cross-component cache propagation, and live React Query state.

---

_Verified: 2026-05-05T18:46:03Z_
_Verifier: Claude (gsd-verifier)_
