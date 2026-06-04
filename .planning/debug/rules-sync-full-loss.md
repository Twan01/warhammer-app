---
slug: rules-sync-full-loss
status: resolved
trigger: user-report
created: 2026-05-29
---

# Debug: Rules sync data completely lost after restart + points never show

## Symptoms
- timestamp: 2026-05-29 — ALL rules data (all factions) disappears after closing and reopening the app
- timestamp: 2026-05-29 — Points never show even immediately after sync completes
- timestamp: 2026-05-29 — Sync process appears to find the Canoptek Spyder during sync UI
- timestamp: 2026-05-29 — Previous debug session (rules-sync-not-persisting) found data WAS in rules.db but this may have changed

## Current Focus
- hypothesis: confirmed — synced_unit_points cache stores BSData names instead of Wahapedia names
- next_action: none (fixed)
- reasoning_checkpoint: Data IS in rules.db (verified via better-sqlite3). The issue is the synced_unit_points cache in hobbyforge.db stores BSData names while army list SQL uses Wahapedia names.

## Evidence
- timestamp: 2026-05-29 — rules.db has 26 factions, 1711 datasheets, 811 points (data persists correctly)
- timestamp: 2026-05-29 — rw_datasheet_points has normalized names (e.g. "Canoptek Spyders" plural)
- timestamp: 2026-05-29 — synced_unit_points cache has BSData names (e.g. "Canoptek Spyder" singular)
- timestamp: 2026-05-29 — 91 name mismatches between cache and rules.db (case, plurals, spelling)
- timestamp: 2026-05-29 — Examples: "Abaddon the Despoiler" vs "Abaddon The Despoiler", "Biovore" vs "Biovores", "Armor" vs "Armour"
- timestamp: 2026-05-29 — DbHealthGate cache repair only checked count (811==811), not name correctness
- timestamp: 2026-05-29 — WAL checkpoint not forced after normalizePointsNames, causing stale reads from pool

## Eliminated
- In-memory DB: ruled out — data persists in rules.db file on disk
- DB path mismatch: ruled out — both Rust and TS connect to same %APPDATA%/com.hobbyforge.app/rules.db
- Transaction rollback: ruled out — Rust bulk_sync_rules commits successfully, data verified on disk
- WAL not checkpointed: partially relevant — WAL was 0 bytes (checkpointed), but pool connections could read stale snapshots

## Resolution
- root_cause: synced_unit_points cache populated with BSData names (pre-normalization) instead of Wahapedia names. The normalizePointsNames() correctly updates rw_datasheet_points in rules.db, but the subsequent SELECT from the Tauri plugin-sql connection pool may return stale data from a different pool connection that hasn't seen the WAL writes. DbHealthGate only repaired when count was wrong, not when names mismatched.
- fix: (1) Added WAL checkpoint after normalizePointsNames in useRulesSync.ts. (2) Added stale-name detection + JOIN fallback in useRulesSync.ts cache population. (3) Enhanced DbHealthGate to detect name mismatches by sampling, not just count comparison.
- verification: TypeScript compiles clean. All normalizePointsNames tests pass (16/16). DbHealthGate tests pass (4/4 relevant, 1 pre-existing failure on schema version constant).
- files_changed: src/hooks/useRulesSync.ts, src/components/common/DbHealthGate.tsx
