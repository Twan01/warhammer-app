---
slug: subfaction-filtering-wrong-units
status: root_cause_found
trigger: user_report
created: 2026-06-09
---

# Debug: Sub-faction filtering shows wrong units

## Symptoms
1. User selects Space Marines -> Ultramarines sub-faction but sees Dark Angels units (e.g., Deathwing)
2. Some units previously showed null points (already fixed in v0.4.9 commit 4768838)

## Evidence

### Data quality: CORRECT
- JSON `unit_database.json` has correct sub_faction assignments
- Deathwing units have `sub_faction: "Dark Angels"` (not null)
- Ultramarines units have `sub_faction: "Ultramarines"` 
- 158 generic SM units have `sub_faction: null` (correct, shared across chapters)
- Only 4/1701 units globally lack points data (edge cases: Example Wargear, fortress walls)

### Filter logic: CORRECT
- `applyUdbFilters.ts` lines 30-36: correctly excludes units with non-matching sub_faction
- `getUdbUnitIdsBySubFaction()`: correctly returns units matching sub-faction OR null (generic)
- `UnitPickerDialog` and `CollectionPage` both use correct Set-based filtering

### Root cause: RACE CONDITION in async UDB import
- `lib.rs` line 1324: `tauri::async_runtime::spawn(async move { import_unit_database_inner(...) })`
- Import runs ASYNCHRONOUSLY after setup, meaning UI can load before import completes
- React Query hooks use `staleTime: Infinity` for UDB data
- If UI loads first, stale/old data is cached and never refreshed until app restart
- With old DB data where sub_faction is NULL for all units, the filter passes everything through

### Secondary issue: EXPECTED_SCHEMA_VERSION outdated
- `DbHealthGate.tsx` line 10: `EXPECTED_SCHEMA_VERSION = 41`
- Actual migration count: 43 (042_udb_detachments + 043_udb_stratagems_enhancements)
- Not the root cause but should be updated

## Current Focus

- **hypothesis**: Async import race condition causes UI to display stale UDB data on first launch after version upgrade
- **next_action**: Fix by either (a) making import synchronous before UI renders, or (b) invalidating React Query cache after import completes

## Resolution

- **root_cause**: The UDB import (`import_unit_database_inner`) runs asynchronously via `tauri::async_runtime::spawn` in the setup hook. On version upgrades, the UI can load and cache old data (with NULL sub_faction values) before the import finishes. Since UDB queries use `staleTime: Infinity`, the stale data persists until the next restart.
- **fix**: Pending - options: (1) make import synchronous/blocking in setup, (2) emit a Tauri event on import completion that triggers React Query invalidation, (3) add a loading gate that waits for UDB import
- **specialist_hint**: typescript
