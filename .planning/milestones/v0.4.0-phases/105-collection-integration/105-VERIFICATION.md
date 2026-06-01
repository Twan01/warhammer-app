---
phase: 105-collection-integration
verified: 2026-05-30T15:15:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the database browser, select a faction, and verify 'Owned xN' badges appear on rows for units you own"
    expected: "Badge with variant='outline' showing 'Owned xN' appears between the role badge and the points value"
    why_human: "Requires live DB with collection units linked via udb_unit_id — cannot verify badge rendering in jsdom"
  - test: "Verify the readiness dot color reflects the worst painting status across all owned copies of a unit"
    expected: "Green dot (bg-emerald-400) when all copies are Varnished/Completed/Display Ready/Battle Ready; amber (bg-amber-500) when mixed; gray (bg-muted-foreground/50) when all Not Started"
    why_human: "Color mapping requires running app with real data flowing through GROUP_CONCAT query result"
  - test: "Open a unit datasheet from the database browser and click 'Add to Collection'"
    expected: "UnitSheet opens in create mode with name, faction, category, points, and model_count pre-filled from the database entry; all fields are editable before saving"
    why_human: "Requires real UDB data, faction wahapedia_faction_id match, and sheet interaction — cannot test in jsdom"
  - test: "After adding a unit via 'Add to Collection', close the UnitSheet and verify the ownership badge updates on the database browser row without page refresh"
    expected: "Badge count increments immediately because useCreateUnit invalidates ['udb-ownership'] and useUdbOwnership has staleTime:0"
    why_human: "Requires React Query cache invalidation behavior with a live Tauri/SQLite backend"
  - test: "Create a unit manually (not via Add from Database) and verify it saves without a database link"
    expected: "'Custom unit (no database link)' label shows in UnitSheet; unit saves successfully with udb_unit_id=null"
    why_human: "COL-07 preservation requires end-to-end form submission with live DB"
  - test: "Open Data Health page and verify 'unlinked_units' diagnostic appears if any collection units lack a udb_unit_id"
    expected: "DiagnosticsCard shows warning-severity flag 'X collection units are not linked to the canonical unit database'"
    why_human: "Requires real migration 039 having run, collection units in DB, and DiagnosticsCard rendering"
---

# Phase 105: Collection Integration Verification Report

**Phase Goal:** Link collection units to canonical unit database via FK, add "Add from Database" flow, surface ownership/readiness badges on database browser, add Data Health diagnostic for unlinked units
**Verified:** 2026-05-30T15:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | units table has a nullable udb_unit_id column referencing udb_units(id) with ON DELETE SET NULL | VERIFIED | `039_collection_udb_link.sql` line 25: `ALTER TABLE units ADD COLUMN udb_unit_id TEXT REFERENCES udb_units(id) ON DELETE SET NULL` |
| 2 | factions table has a wahapedia_faction_id column backfilled by name match against udb_factions | VERIFIED | `039_collection_udb_link.sql` lines 12–22: ALTER TABLE + UPDATE with LOWER(uf.name)=LOWER(factions.name) match |
| 3 | Existing collection units are backfilled with udb_unit_id by case-insensitive name + faction match | VERIFIED | `039_collection_udb_link.sql` lines 27–40: UPDATE with LOWER() case-insensitive match and faction scope via wahapedia_faction_id subquery |
| 4 | Ownership count per udb_unit_id can be queried per faction in a single aggregated SELECT | VERIFIED | `src/db/queries/unitDatabase.ts` lines 234–249: `getUdbOwnershipByFaction` with JOIN + GROUP BY + GROUP_CONCAT |
| 5 | Creating or deleting a unit invalidates the udb-ownership React Query cache | VERIFIED | `src/hooks/useUnits.ts` lines 48, 73, 93: all three mutations call `qc.invalidateQueries({ queryKey: ["udb-ownership"] })` with comment "Phase 105 COL-04" |
| 6 | Unlinked units diagnostic returns a warning-severity flag when units have NULL udb_unit_id | VERIFIED | `src/db/queries/diagnostics.ts` lines 198–212: `getUnlinkedUnitsCount` returns warning-severity DiagnosticFlag; integrated into getDiagnosticFlags() Promise.all at line 224 |
| 7 | Database browser rows show 'Owned xN' badge and readiness dot for owned units | VERIFIED | `src/features/unit-database/UdbUnitRow.tsx` lines 95–105: Badge and span render when `isOwned`; `resolveReadinessDotClass` and `resolveWorstStatus` exported and tested |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/migrations/039_collection_udb_link.sql` | ALTER TABLE DDL for units.udb_unit_id FK, factions.wahapedia_faction_id, backfill, index | VERIFIED | 5 steps present; PRAGMA user_version = 39; FK clause, both backfills, index |
| `src/types/unit.ts` | udb_unit_id: string \| null on Unit interface | VERIFIED | Line 54: `udb_unit_id: string \| null` between status_varnished_override and created_at |
| `src/types/faction.ts` | wahapedia_faction_id: string \| null on Faction interface | VERIFIED | Line 14: `wahapedia_faction_id: string \| null` |
| `src/db/queries/unitDatabase.ts` | getUdbOwnershipByFaction aggregated query; UdbOwnershipEntry | VERIFIED | Lines 117–121 (interface), lines 234–249 (function). Uses GROUP_CONCAT not MIN |
| `src/db/queries/diagnostics.ts` | getUnlinkedUnitsCount diagnostic query | VERIFIED | Lines 198–212; integrated into getDiagnosticFlags Promise.all |
| `src/hooks/useUnitDatabase.ts` | useUdbOwnership hook with staleTime: 0; UDB_OWNERSHIP_KEY | VERIFIED | Lines 91–114: staleTime: 0 explicitly set; disabled pattern matches useUdbUnits |
| `src/features/unit-database/UdbUnitRow.tsx` | Ownership badge and readiness dot; resolveWorstStatus/resolveReadinessDotClass exported | VERIFIED | Both pure functions exported; DONE_STATUSES includes all 4 statuses per D-11; badge + dot render when isOwned |
| `src/features/unit-database/UdbUnitList.tsx` | ownershipMap prop threading to each row | VERIFIED | Line 11: ownershipMap prop; line 98: `ownershipData={ownershipMap?.get(item.unit.id) ?? null}` |
| `src/features/unit-database/UdbDatasheetSheet.tsx` | Add to Collection button with onAddToCollection callback | VERIFIED | Lines 29–30: onAddToCollection and ownershipData props; lines 99–113: button with label toggle |
| `src/features/unit-database/DatabaseBrowserPage.tsx` | Orchestration of ownership data, UnitSheet state, add-to-collection flow | VERIFIED | useUdbOwnership called line 41; ownershipMap built via useMemo lines 69–78; handleAddToCollection function lines 89–120; UnitSheet rendered lines 191–198 |
| `src/features/units/UnitSheet.tsx` | prefill prop support and Database Link display field | VERIFIED | Lines 28–29: prefill/prefillUdbUnitId props; lines 90–94: prefill spread in buildDefaultValues; line 204: database link status paragraph; lines 157–159: udb_unit_id in both create/edit payloads |
| `tests/collection/udbCollectionLink.test.ts` | Tests for ownership query, type extensions, readiness resolution | VERIFIED | 17 tests; all pass (confirmed via vitest run) |
| `tests/data-health/unlinkedUnitsDiagnostic.test.ts` | Tests for unlinked units diagnostic query | VERIFIED | 4 tests; all pass (confirmed via vitest run) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useUnits.ts` | udb-ownership React Query cache | `invalidateQueries({ queryKey: ["udb-ownership"] })` in onSuccess | WIRED | All three mutations (useCreateUnit L48, useUpdateUnit L73, useDeleteUnit L93) invalidate ["udb-ownership"] |
| `src/db/queries/unitDatabase.ts` | units + udb_units tables | JOIN on udb_unit_id | WIRED | SQL at line 239: `JOIN udb_units uu ON uu.id = u.udb_unit_id` |
| `src/db/queries/diagnostics.ts` | getDiagnosticFlags aggregator | Promise.all inclusion | WIRED | Line 224: `getUnlinkedUnitsCount()` in Promise.all array |
| `DatabaseBrowserPage.tsx` | useUdbOwnership hook | hook call with selectedFactionId | WIRED | Line 41: `const { data: ownershipEntries = [] } = useUdbOwnership(selectedFactionId)` |
| `DatabaseBrowserPage.tsx` | UdbUnitList | ownershipMap prop | WIRED | Line 167: `ownershipMap={ownershipMap}` |
| `UdbDatasheetSheet.tsx` | DatabaseBrowserPage.tsx | onAddToCollection callback | WIRED | Line 185: `onAddToCollection={handleAddToCollection}` |
| `DatabaseBrowserPage.tsx` | UnitSheet | prefill + prefillUdbUnitId props | WIRED | Lines 194–195: `prefill={unitSheetPrefill ?? undefined}` and `prefillUdbUnitId={unitSheetUdbId}` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `UdbUnitRow.tsx` | `ownershipData` prop | `getUdbOwnershipByFaction` via `useUdbOwnership` | Yes — SQL SELECT with JOIN against live DB | FLOWING |
| `DatabaseBrowserPage.tsx` | `ownershipEntries` → `ownershipMap` | `useUdbOwnership(selectedFactionId)` → `getUdbOwnershipByFaction` | Yes — GROUP_CONCAT aggregation from units table | FLOWING |
| `UnitSheet.tsx` | `prefill` (create mode) | `handleAddToCollection` builds from `UdbUnitDetail` | Yes — from real DB-backed `useUdbUnitDetail` query | FLOWING |
| `diagnostics.ts` getDiagnosticFlags | unlinked_units flag | `getUnlinkedUnitsCount` → COUNT(*) FROM units WHERE udb_unit_id IS NULL | Yes — live DB count | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| getUdbOwnershipByFaction returns grouped data | vitest run udbCollectionLink.test.ts | 3/3 pass | PASS |
| getUnlinkedUnitsCount returns warning flag | vitest run unlinkedUnitsDiagnostic.test.ts | 4/4 pass | PASS |
| resolveWorstStatus returns lowest-index status | vitest run udbCollectionLink.test.ts | 3/3 pass | PASS |
| resolveReadinessDotClass returns correct color class | vitest run udbCollectionLink.test.ts | 6/6 pass | PASS |
| TypeScript build — no type errors | npx tsc --noEmit | exit 0, no output | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|----------|
| COL-01 | 105-02 | "Add from Database" flow — browse/search → pick unit → add with fields pre-filled | SATISFIED | `UdbDatasheetSheet` onAddToCollection button; `DatabaseBrowserPage` handleAddToCollection; `UnitSheet` prefill |
| COL-02 | 105-01 | FK link from collection units.udb_unit_id to udb_units.id (nullable, ON DELETE SET NULL) | SATISFIED | Migration 039 Step 3; Unit type extended; createUnit/updateUnit accept udb_unit_id |
| COL-03 | 105-01 | Migration backfills existing collection units to database FK by name matching (best-effort) | SATISFIED | Migration 039 Step 4: case-insensitive UPDATE with faction scope |
| COL-04 | 105-01, 105-02 | Ownership badges on database browser rows | SATISFIED | UdbUnitRow "Owned xN" Badge; cache invalidation in all 3 unit mutations |
| COL-05 | 105-01, 105-02 | Readiness badges on database browser rows (painting status) | SATISFIED | UdbUnitRow readiness dot; resolveReadinessDotClass with DONE_STATUSES per D-11 |
| COL-06 | 105-01 | Data Health diagnostic surfaces unlinked collection units | SATISFIED | getUnlinkedUnitsCount integrated into getDiagnosticFlags; warning severity |
| COL-07 | 105-02 | Custom/kitbash units can still be added manually without database link | SATISFIED | UnitSheet works without prefill/prefillUdbUnitId; udb_unit_id defaults to null |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | All implementations use real queries; no TODO/FIXME/TBD/PLACEHOLDER markers found in phase-modified files |

### Human Verification Required

1. **Ownership Badge Visual Rendering**

   **Test:** Open the database browser, select a faction that has collection units with udb_unit_id set, and inspect the unit rows.
   **Expected:** Each owned unit shows an outline Badge "Owned xN" between the role badge and points value; unowned units show neither badge nor dot.
   **Why human:** Requires a running app with real data after migration 039 has run and backfilled udb_unit_id values.

2. **Readiness Dot Color Accuracy**

   **Test:** With owned units at various painting stages (e.g., one unit with "Completed" status, one with "Built|Primed" mix), verify the dot colors.
   **Expected:** All-done copies = green (bg-emerald-400); mixed = amber (bg-amber-500); all Not Started = gray (bg-muted-foreground/50).
   **Why human:** Color class rendering from live GROUP_CONCAT data cannot be verified in jsdom.

3. **Add to Collection Flow — End-to-End**

   **Test:** In the database browser, select a unit, open its datasheet, click "Add to Collection". Verify the UnitSheet opens with fields pre-filled.
   **Expected:** Name, faction, category, points (lowest tier), and model_count (min_models) are pre-filled; all fields are editable; "Linked to unit database" label appears.
   **Why human:** Requires faction wahapedia_faction_id match (migration 039 Step 2 must have run) and live sheet interaction.

4. **Ownership Badge Updates Without Refresh**

   **Test:** After saving a unit via "Add to Collection", close the UnitSheet and observe the database browser row.
   **Expected:** The "Owned xN" badge appears or increments immediately on the row — no page refresh needed.
   **Why human:** Requires React Query staleTime:0 + invalidation cascade working in a live Tauri app.

5. **Manual Unit Creation Preserves COL-07**

   **Test:** Create a unit using the normal collection page (not via "Add from Database"). Verify it saves and the "Custom unit (no database link)" label shows.
   **Expected:** Unit created with udb_unit_id=null; no errors; form works as before Phase 105.
   **Why human:** Requires live form submission and verification that the no-COALESCE SQL receives null safely.

6. **Data Health Unlinked Units Diagnostic**

   **Test:** Open the Data Health page after migration 039 runs. If any units were not matched in the backfill, verify the diagnostic appears.
   **Expected:** Warning-severity flag "X collection units are not linked to the canonical unit database" shown in DiagnosticsCard.
   **Why human:** Requires the real migration to have run and the diagnostic page to render the flag.

### Gaps Summary

No gaps found. All 7 observable truths are verified with substantive, wired, and data-flowing implementations. All 7 requirement IDs (COL-01 through COL-07) are covered. The TypeScript build passes with no errors and all 17 phase-specific tests pass.

Human verification is required for 6 items covering visual rendering, the end-to-end "Add to Collection" flow, cache invalidation behavior, and the Data Health diagnostic — all of which require a live Tauri/SQLite runtime that cannot be exercised in the jsdom test environment.

---

_Verified: 2026-05-30T15:15:00Z_
_Verifier: Claude (gsd-verifier)_
