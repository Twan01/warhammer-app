---
phase: 109-sub-faction-filter-ui
verified: 2026-06-01T13:40:00Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification:
  - test: "Browse Space Marines in database browser and verify sub-faction dropdown appears with chapter names (Ultramarines, Dark Angels, etc.); browse Necrons and verify no sub-faction dropdown"
    expected: "Sub-faction dropdown renders for SM, hidden for NEC"
    why_human: "Conditional rendering depends on live DB data and visual layout cannot be verified by grep"
  - test: "Select Ultramarines in database browser sub-faction dropdown and verify only Ultramarines units appear in the list"
    expected: "Unit list narrows to only units with sub_faction = Ultramarines"
    why_human: "End-to-end data flow through SQLite query to rendered list requires running app"
  - test: "Open army list unit picker for a Space Marines list and verify sub-faction dropdown appears and filters collection units"
    expected: "Sub-faction dropdown renders; selecting a chapter narrows the unit list to matching collection units via udb_unit_id Set membership"
    why_human: "Requires live collection data linked to UDB via udb_unit_id FK"
  - test: "In collection browser, select exactly one faction with sub-factions and verify sub-faction dropdown appears; select two factions and verify it disappears"
    expected: "Single-faction selection shows dropdown; multi-faction hides it"
    why_human: "Multi-step user interaction with conditional UI rendering"
  - test: "Type 'Ultramarines' in the FTS5 global search bar and verify matching units are returned"
    expected: "Search returns units that have sub_faction = Ultramarines via the indexed sub-faction field in udb_search"
    why_human: "FTS5 search behavior depends on live indexed data in SQLite"
---

# Phase 109: Sub-faction Filter UI Verification Report

**Phase Goal:** Users can filter the database browser, army list unit picker, and collection browser by sub-faction (SM chapter, CSM warband, Aeldari sub-faction, etc.)
**Verified:** 2026-06-01T13:40:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Database browser shows sub-faction dropdown when browsing a faction with sub-factions; factions without sub-factions show no extra control | VERIFIED | `UdbFilterBar.tsx:43` conditionally renders Select when `subFactions.length > 0`; `DatabaseBrowserPage.tsx:47` calls `useUdbSubFactions(selectedFactionId)` and passes result to filter bar at line 177 |
| 2 | Army list unit picker shows sub-faction filter for applicable factions, narrowing the unit list correctly | VERIFIED | `UnitPickerDialog.tsx:74` calls `useUdbSubFactions(udbFactionId)` with numeric-to-UDB ID resolution at line 70-72; dropdown rendered conditionally at line 129; filtering via Set membership at lines 93-94 |
| 3 | Collection browser shows sub-faction filter for applicable factions | VERIFIED | `CollectionPage.tsx:52-58` resolves single faction ID, calls `useUdbSubFactions(udbFactionId)` only when exactly 1 faction selected; `UnitFilters.tsx:98` renders dropdown conditionally; two-step filtering at `CollectionPage.tsx:82-88` |
| 4 | FTS5 search returns matching units via indexed sub-faction field | VERIFIED | `lib.rs:733` includes `COALESCE(u.sub_faction || ' ', '')` in FTS5 keywords column during index rebuild; implemented in Phase 108, confirmed present |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/queries/unitDatabase.ts` | getDistinctSubFactions, getUdbUnitIdsBySubFaction, sub_faction on UdbUnitSummary | VERIFIED | Functions at lines 326-353; sub_faction field at line 24; SQL includes u.sub_faction at line 157 |
| `src/hooks/useUnitDatabase.ts` | useUdbSubFactions, useUdbSubFactionUnitIds hooks | VERIFIED | Hooks at lines 158-191; disabled pattern, staleTime: Infinity, correct query keys |
| `src/features/unit-database/databaseBrowserFilters.ts` | subFactionFilter with setter and auto-reset | VERIFIED | Field at line 6; setSelectedFactionId resets subFactionFilter at line 30; clearFilters resets at line 38 |
| `src/features/unit-database/applyUdbFilters.ts` | subFactionFilter in UdbFiltersInput, filter logic | VERIFIED | Interface at line 4; filter check first at line 28 before roleFilter |
| `src/features/unit-database/UdbFilterBar.tsx` | Sub-faction Select dropdown before Role | VERIFIED | Conditional rendering at line 43; positioned before Role Select at line 64 |
| `src/features/unit-database/DatabaseBrowserPage.tsx` | useUdbSubFactions wired, subFactionFilter in applyUdbFilters | VERIFIED | Hook at line 47; subFactionFilter in useMemo at lines 63-71 |
| `src/features/army-lists/UnitPickerDialog.tsx` | Sub-faction dropdown with faction ID resolution | VERIFIED | useFactions + wahapedia_faction_id resolution at lines 69-72; dropdown at lines 129-150; Set filtering at lines 93-94; reset on open/faction change at lines 83-85 |
| `src/features/units/collectionFilters.ts` | subFactionFilter with toggleFaction reset | VERIFIED | Field at line 11; toggleFaction resets at line 36; clearAll resets at line 54 |
| `src/features/units/UnitFilters.tsx` | Sub-faction Select in collection filter bar | VERIFIED | Conditional rendering at line 98; uses __clear__ sentinel pattern |
| `src/features/units/CollectionPage.tsx` | Two-step filtering, single-faction-only logic | VERIFIED | singleFactionId at line 52; udbFactionId resolution at lines 53-55; preFilteredUnits then filteredUnits at lines 74-88 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| DatabaseBrowserPage.tsx | useUnitDatabase.ts | useUdbSubFactions | WIRED | Import at line 12; call at line 47 |
| UnitPickerDialog.tsx | useUnitDatabase.ts | useUdbSubFactions + useUdbSubFactionUnitIds | WIRED | Import at lines 41-43; calls at lines 74-75 |
| CollectionPage.tsx | useUnitDatabase.ts | useUdbSubFactions + useUdbSubFactionUnitIds | WIRED | Import at line 8; calls at lines 57-58 |
| useUnitDatabase.ts | unitDatabase.ts | getDistinctSubFactions + getUdbUnitIdsBySubFaction | WIRED | Import at lines 22-23; used in hooks at lines 165, 186 |
| applyUdbFilters.ts | unitDatabase.ts | UdbUnitSummary type | WIRED | Import at line 1; sub_faction used at line 28 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| UdbFilterBar.tsx | subFactions prop | useUdbSubFactions -> getDistinctSubFactions SQL | Yes - SELECT DISTINCT sub_faction from udb_units | FLOWING |
| UnitPickerDialog.tsx | subFactionUnitIds | useUdbSubFactionUnitIds -> getUdbUnitIdsBySubFaction SQL | Yes - SELECT id FROM udb_units WHERE sub_faction = $2 | FLOWING |
| CollectionPage.tsx | subFactionUnitIds | useUdbSubFactionUnitIds -> getUdbUnitIdsBySubFaction SQL | Yes - same query | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Sub-faction filter tests pass | `npx vitest run tests/unit-database/applyUdbFilters.test.ts` | 13/13 pass (4 new sub-faction tests) | PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | Zero errors | PASS |

### Probe Execution

No probes declared for this phase. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SF-03 | 109-01, 109-02 | Database browser shows sub-faction filter dropdown | SATISFIED | UdbFilterBar.tsx conditional Select + DatabaseBrowserPage wiring |
| SF-04 | 109-02 | Army list unit picker shows sub-faction filter | SATISFIED | UnitPickerDialog.tsx sub-faction Select + Set-based filtering |
| SF-05 | 109-02 | Collection browser shows sub-faction filter | SATISFIED | CollectionPage.tsx single-faction logic + UnitFilters.tsx dropdown |
| SF-06 | 109-01 | FTS5 search index includes sub-faction names | SATISFIED | lib.rs:733 COALESCE(u.sub_faction) in FTS5 rebuild (Phase 108 work, verified present) |

No orphaned requirements found -- REQUIREMENTS.md maps SF-03, SF-04, SF-05 to Phase 109 and SF-06 to Phase 108. All accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns found in any modified file |

No TBD, FIXME, XXX, TODO, HACK, or PLACEHOLDER markers found in any phase-modified file. No stub patterns (return null, empty handlers, static returns) detected.

### Human Verification Required

### 1. Database Browser Sub-faction Dropdown Visibility

**Test:** Browse Space Marines in database browser and verify sub-faction dropdown appears with chapter names (Ultramarines, Dark Angels, etc.); browse Necrons and verify no sub-faction dropdown
**Expected:** Sub-faction dropdown renders for SM with chapter options, hidden for NEC
**Why human:** Conditional rendering depends on live DB data and visual layout cannot be verified by grep

### 2. Database Browser Sub-faction Filtering

**Test:** Select Ultramarines in database browser sub-faction dropdown and verify only Ultramarines units appear in the list
**Expected:** Unit list narrows to only units with sub_faction = Ultramarines
**Why human:** End-to-end data flow through SQLite query to rendered list requires running app

### 3. Army List Unit Picker Sub-faction Filter

**Test:** Open army list unit picker for a Space Marines list and verify sub-faction dropdown appears and filters collection units
**Expected:** Sub-faction dropdown renders; selecting a chapter narrows the unit list to matching collection units via udb_unit_id Set membership
**Why human:** Requires live collection data linked to UDB via udb_unit_id FK

### 4. Collection Browser Single-faction Sub-faction Filter

**Test:** In collection browser, select exactly one faction with sub-factions and verify sub-faction dropdown appears; select two factions and verify it disappears
**Expected:** Single-faction selection shows dropdown; multi-faction hides it
**Why human:** Multi-step user interaction with conditional UI rendering

### 5. FTS5 Sub-faction Search

**Test:** Type "Ultramarines" in the FTS5 global search bar and verify matching units are returned
**Expected:** Search returns units that have sub_faction = Ultramarines via the indexed sub-faction field
**Why human:** FTS5 search behavior depends on live indexed data in SQLite

### Gaps Summary

No gaps found. All 4 roadmap success criteria are fully implemented with substantive, wired code across all three UI surfaces. The query layer, hooks, stores, filter functions, and UI components form a complete data pipeline from SQLite to rendered dropdowns. Five human verification items remain for end-to-end visual/behavioral confirmation.

---

_Verified: 2026-06-01T13:40:00Z_
_Verifier: Claude (gsd-verifier)_
