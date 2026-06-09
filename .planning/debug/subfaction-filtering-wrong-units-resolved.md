# Debug: Sub-faction filtering shows wrong units + missing points

**Status:** RESOLVED
**Date:** 2026-06-09

## Symptoms
1. Selecting Space Marines > Ultramarines shows Deathwing units (Dark Angels)
2. Some units appear without points

## Root Cause
**Race condition between async UDB import and UI rendering.**

The UDB import runs asynchronously on app startup (`tauri::async_runtime::spawn`).
The UI loads immediately with stale/cached data. All UDB React Query hooks use
`staleTime: Infinity`, so even after the import completes the UI never re-fetches.

If the database had old data (e.g., `sub_faction = NULL` for all units from a
pre-sub-faction import), the filter at `applyUdbFilters.ts:33` would let all units
through (NULL sub_faction passes the filter as "generic parent faction unit").

## Secondary: "Missing points" is not a bug
362 units show `base_points: null` in the JSON but these are multi-tier units.
Their points are stored in `udb_unit_points` and resolved by the SQL query's
`COALESCE((SELECT MIN(p.points) FROM udb_unit_points p WHERE p.unit_id = u.id), u.base_points)`.
Only 4 test/placeholder entries truly lack any points data.

## Fix Applied
1. **Tauri event on import completion** (`src-tauri/src/lib.rs`): After the async
   import inserts new data, emits `udb-import-complete` event to the frontend.
2. **Frontend cache invalidation** (`src/components/common/QueryProvider.tsx`):
   Listens for `udb-import-complete` and invalidates all `udb-*` query keys,
   forcing React Query to re-fetch fresh data from the database.
3. **DbHealthGate schema version** updated from 41 to 43 to match actual migration count.

## Files Changed
- `src-tauri/src/lib.rs` — Added `use tauri::Emitter`, emit event after import
- `src/components/common/QueryProvider.tsx` — Added Tauri event listener for cache invalidation
- `src/components/common/DbHealthGate.tsx` — Updated EXPECTED_SCHEMA_VERSION to 43
