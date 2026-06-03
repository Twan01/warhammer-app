---
phase: 115-sub-faction-filter-fix
verified: 2026-06-03T10:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Select a sub-faction (e.g. Ultramarines) in the database browser and confirm generic Space Marines units (Captain, Repulsor) appear alongside Ultramarines-exclusive units"
    expected: "Both sub-faction-specific units and null-sub_faction units are listed; no visual distinction between them"
    why_human: "Requires a running Tauri app with real unit data in the database to verify the rendered list"
  - test: "Select a sub-faction in the army list unit picker and confirm generic parent faction units appear"
    expected: "Unit picker shows sub-faction-specific units PLUS generic (null sub_faction) units from the same parent faction"
    why_human: "Requires running app and a real army list with a faction that has sub-factions in the DB"
  - test: "Select a sub-faction in the collection browser and confirm generic units appear"
    expected: "Collection browser shows combined sub-faction + generic units"
    why_human: "Requires running app and collection entries mapped to a faction with sub-factions"
---

# Phase 115: Sub-faction Filter Fix Verification Report

**Phase Goal:** Selecting a sub-faction anywhere in the app shows both sub-faction-specific units and the parent faction's generic units, so a player filtering to "Ultramarines" sees Space Marines generic units alongside Ultramarines-specific ones
**Verified:** 2026-06-03T10:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| D-01 | Fix at both SQL and client-side filter level — dual-site fix for all three surfaces | VERIFIED | `applyUdbFilters.ts` condition expanded (line 30-34); `unitDatabase.ts` SQL updated (line 384) |
| D-02 | `getUdbUnitIdsBySubFaction` SQL includes `OR sub_faction IS NULL` | VERIFIED | Line 384 of `unitDatabase.ts`: `SELECT id FROM udb_units WHERE faction_id = $1 AND (sub_faction = $2 OR sub_faction IS NULL)` |
| D-03 | `applyUdbFilters` sub-faction check adds `&& unit.sub_faction !== null` | VERIFIED | Lines 30-34 of `applyUdbFilters.ts`: three-part guard — `subFactionFilter !== null && unit.sub_faction !== filters.subFactionFilter && unit.sub_faction !== null` |
| D-04 | No visual distinction between generic and sub-faction-specific units | VERIFIED | No rendering changes made; existing unit display components unchanged per diff |
| D-05 | No changes to sub-faction dropdown counts or badges | VERIFIED | Hook layer, filter stores, and consumer components not modified; only query and filter logic changed |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/queries/unitDatabase.ts` | SQL query fix for `getUdbUnitIdsBySubFaction` | VERIFIED | Contains `sub_faction = $2 OR sub_faction IS NULL` at line 384 |
| `src/features/unit-database/applyUdbFilters.ts` | Client-side filter fix for null sub_faction pass-through | VERIFIED | Contains `unit.sub_faction !== null` condition at lines 30-34 |
| `tests/unit-database/applyUdbFilters.test.ts` | Updated tests reflecting correct sub-faction filter semantics | VERIFIED | Contains "includes generic" in test name; all 14 tests pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useUnitDatabase.ts` | `src/db/queries/unitDatabase.ts` | `useUdbSubFactionUnitIds` calls `getUdbUnitIdsBySubFaction` | WIRED | Import at line 23, call at line 192 of hook file |
| `src/features/army-lists/UnitPickerDialog.tsx` | `src/hooks/useUnitDatabase.ts` | `useUdbSubFactionUnitIds` hook | WIRED | Import at line 42, used at line 75 |
| `src/features/units/CollectionPage.tsx` | `src/hooks/useUnitDatabase.ts` | `useUdbSubFactionUnitIds` hook | WIRED | Import at line 8, used at line 58 |
| `src/features/unit-database/DatabaseBrowserPage.tsx` | `src/features/unit-database/applyUdbFilters.ts` | `applyUdbFilters` call | WIRED | Import at line 15, called at line 65 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `applyUdbFilters.ts` | `units` input array | Caller passes `UdbUnitSummary[]` from React Query hooks over SQLite | Yes — pure filter function; data comes from upstream DB queries | FLOWING |
| `getUdbUnitIdsBySubFaction` | returned `string[]` of unit IDs | `db.select(...)` against `udb_units` SQLite table | Yes — DB query with real WHERE clause | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 14 applyUdbFilters tests pass | `pnpm test -- tests/unit-database/applyUdbFilters.test.ts` | 14/14 pass, exit 0 | PASS |
| `filters by subFactionFilter` expects 4 results including generic units | Test assertion in file | `toHaveLength(4)` — Intercessors, Captain, Eradicators, Repulsor | PASS |
| `subFactionFilter includes generic (null sub_faction) units` expects 3 results | Test assertion in file | `toHaveLength(3)` — Captain, Repulsor, Mystery Unit | PASS |
| New regression test excludes other sub-factions | Test assertion in file | `not.toContain("Mystery Unit")` for Ultramarines filter | PASS |

### Probe Execution

No phase-declared probes. Skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SUB-01 | 115-01-PLAN.md | Sub-faction in database browser shows sub-faction + generic units | SATISFIED | `applyUdbFilters.ts` three-part guard; test "filters by subFactionFilter" asserts 4 results |
| SUB-02 | 115-01-PLAN.md | Sub-faction in army list unit picker shows sub-faction + generic units | SATISFIED | `getUdbUnitIdsBySubFaction` SQL `OR sub_faction IS NULL`; key link to `UnitPickerDialog.tsx` confirmed wired |
| SUB-03 | 115-01-PLAN.md | Sub-faction in collection browser shows sub-faction + generic units | SATISFIED | Same SQL fix as SUB-02; key link to `CollectionPage.tsx` confirmed wired |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No `TBD`, `FIXME`, `XXX`, `TODO`, or `HACK` markers in modified files.

### Human Verification Required

#### 1. Database Browser Sub-faction Filter (SUB-01)

**Test:** Open the app, navigate to the unit database browser, select a faction with sub-factions (e.g. Space Marines), then select a sub-faction (e.g. Ultramarines). Observe the unit list.
**Expected:** The unit list shows both Ultramarines-specific units AND generic Space Marines units (those with no sub-faction assignment). No visual distinction between the two groups.
**Why human:** Requires a running Tauri app with `udb_units` data populated. Cannot verify rendered list output via grep.

#### 2. Army List Unit Picker Sub-faction Filter (SUB-02)

**Test:** Open the app, open an army list for a faction that has sub-factions, open the unit picker dialog, set a sub-faction filter. Observe available units.
**Expected:** The unit picker shows both sub-faction-specific units AND generic parent faction units. Selecting the sub-faction does not hide the generic units.
**Why human:** Requires running app, an existing army list, and faction data with sub-faction assignments in the live database.

#### 3. Collection Browser Sub-faction Filter (SUB-03)

**Test:** Open the app, navigate to the collection page, apply a sub-faction filter. Observe the collection list.
**Expected:** Collection browser shows both sub-faction-tagged and generic (null sub_faction) units when a sub-faction filter is active.
**Why human:** Requires running app with collection entries in a faction that has sub-factions in the unit database.

### Gaps Summary

No gaps found. All five must-have truths are verified, all three artifacts exist with substantive implementations, all four key links are wired, and all 14 tests pass. Three human verification items are required to confirm the end-to-end runtime behavior on all three surfaces (database browser, army list picker, collection browser) since these cannot be confirmed without a running Tauri app.

---

_Verified: 2026-06-03T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
