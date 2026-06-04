---
slug: rules-sync-not-persisting
status: resolved
trigger: user-report
created: 2026-05-28
resolved: 2026-05-28
---

# Debug: Rules sync not persisting + no points for Canoptek Spyder

## Symptoms
- timestamp: 2026-05-28 — Points not being imported/stored for Canoptek Spyder unit
- timestamp: 2026-05-28 — Rules data (datasheets, points) not persisting across app restarts

## Evidence
- timestamp: 2026-05-28 — rules.db exists at %APPDATA%/com.hobbyforge.app/rules.db with 4.28 MB, integrity_check OK
- timestamp: 2026-05-28 — 1711 datasheets, 811 points entries, sync_meta present (last sync 2026-05-28T06:37:40.227Z)
- timestamp: 2026-05-28 — Wahapedia datasheet name: "Canoptek Spyders" (plural), BSData points name: "Canoptek Spyder" (singular)
- timestamp: 2026-05-28 — 161 of 811 BSData point entries (20%) have no exact name match in rw_datasheets
- timestamp: 2026-05-28 — Mismatch types: singular/plural, case differences (The/the), variant suffixes, Crucible entries
- timestamp: 2026-05-28 — WAL file was 4.29 MB but data was properly committed; checkpoint(TRUNCATE) reduced WAL to 0 bytes

## Hypotheses
- H1 (CONFIRMED): BSData and Wahapedia use different naming conventions; exact-match JOIN fails for ~20% of units
- H2 (REJECTED): rules.db data not persisting — data IS persisting correctly, WAL working as designed
- H3 (REJECTED): in-memory DB or unstable path — path is stable at %APPDATA%/com.hobbyforge.app/rules.db

## Resolution
- root_cause: BSData uses different unit names than Wahapedia (e.g. "Canoptek Spyder" vs "Canoptek Spyders"). The LEFT JOIN in getDatasheetsByFactionWithPoints and the synced_unit_points cache both use exact name matching, causing 161/811 (20%) of points to show as null. "Data not persisting" was a misperception — the data is stored correctly but points were invisible due to the name mismatch.
- fix: Added post-sync name normalization (normalizePointsNames) that matches unmatched BSData point names to Wahapedia datasheet names using fuzzy matching (case-insensitive, singular/plural, apostrophe variants, prefix matching). Runs both during sync and on app startup via DbHealthGate.
