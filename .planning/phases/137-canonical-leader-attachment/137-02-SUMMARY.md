---
phase: 137-canonical-leader-attachment
plan: "02"
subsystem: pipeline/data
tags: [wahapedia, csv, build-pipeline, rust-importer, unit-database, leader-targets]
dependency_graph:
  requires: [137-01 — udb_leader_targets DDL migration]
  provides: [populated-leader-targets-json, extended-rust-importer, csv-download-registration]
  affects: [src-tauri/data/unit_database.json, Rust import pipeline, TypeScript build types]
tech_stack:
  added: []
  patterns: [csv-parse-step, content-hash-inclusion, rust-insert-loop, two-validUnitIds-guards, seenPairs-dedup]
key_files:
  created: []
  modified:
    - scripts/download-wahapedia.ts
    - scripts/lib/types.ts
    - scripts/build-unit-db.ts
    - src-tauri/src/lib.rs
    - src-tauri/data/unit_database.json
decisions:
  - "A1 CONFIRMED: Datasheets_leader.csv header is leader_id|attached_id (validated against live CSV)"
  - "D-06: leaderTargets added to content-hash input — version changed from 1.0.0+b1b21694 to 1.0.0+2f4d062a"
  - "D-05: three coordinated edits landed in Tasks 1+2; JSON rebuild in Task 3"
  - "Pitfall 4 avoided: BOTH UdbImportResult initializers (version-skip + counts) carry leader_targets: 0"
metrics:
  duration: "12 minutes"
  completed: "2026-06-17T22:00:00Z"
  tasks: 3
  files: 5
---

# Phase 137 Plan 02: Pipeline Wiring + Rust Importer + JSON Rebuild — Summary

**One-liner:** Datasheets_leader.csv wired through the full canonical pipeline — parse step emits 1901 sorted/deduped pairs into content hash and JSON bundle; Rust importer extended with serde field, DELETE entry, INSERT loop, and both result initializers; bundled JSON version updated to 2f4d062a.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add CSV, JSON type, and build parse step (with content-hash inclusion) | ac7f8c1b | scripts/download-wahapedia.ts, scripts/lib/types.ts, scripts/build-unit-db.ts |
| 2 | Extend Rust importer (serde field, DELETE, INSERT loop, both result initializers) | 53773350 | src-tauri/src/lib.rs |
| 3 | Download CSV + rebuild bundled JSON; confirm populated leader_targets + changed version | d281e2c2 | src-tauri/data/unit_database.json |

## What Was Built

**`scripts/download-wahapedia.ts`:** Added `"Datasheets_leader.csv"` as the 11th entry in `CSV_FILES`. Downloaded 41.2 KB on first run.

**`scripts/lib/types.ts`:** Added `export interface UdbLeaderTargetRow { leader_unit_id: string; target_unit_id: string; }` and extended `UnitDatabaseJson` with `leader_targets: UdbLeaderTargetRow[]` after `enhancements`.

**`scripts/build-unit-db.ts` — Step 7b (leader parse):**
- Reads `Datasheets_leader.csv` via `readCsvFile`
- TWO `validUnitIds` guards: both `leader_id` and `attached_id` must be known unit IDs (drops Legends/unknown)
- Deduplication via `seenPairs` Set keyed `leaderId|attachedId`
- `console.warn` emitted if zero pairs produced from non-empty raw data (column-presence guard per A1)
- Deterministic sort by `(leader_unit_id, target_unit_id)` via `localeCompare`
- `console.warn` on orphan-skipped count
- `leaderTargets` added to `createHash("sha256").update(JSON.stringify({...}))` input — CRITICAL D-06
- `leader_targets: leaderTargets` added to assembled `output` object

**`src-tauri/src/lib.rs`:**
- `UnitDatabasePayload`: `#[serde(default)] leader_targets: Vec<JsRow>` added after `enhancements`
- `UdbImportResult`: `pub leader_targets: u64` added after `enhancements`
- Version-skip early-return initializer (~line 740): `leader_targets: 0` added (Pitfall 4)
- `counts` initializer (~line 757): `leader_targets: 0` added (Pitfall 4)
- DELETE list: `"udb_leader_targets"` inserted before `"udb_units"` (FK-order convention)
- INSERT loop: `INSERT OR IGNORE INTO udb_leader_targets (leader_unit_id, target_unit_id) VALUES (?, ?)` with positional binds and `counts.leader_targets += res.rows_affected()`

**`src-tauri/data/unit_database.json`:**
- 1901 leader attachment pairs in `leader_targets` array (sorted, deduped; 1 orphan-skipped)
- Version: `1.0.0+b1b21694` → `1.0.0+2f4d062a` (content hash changed — D-06 satisfied)
- File size grew from ~7.5 MB to include 7608 new JSON lines

## Verification Results

- `npx tsc --noEmit`: clean (Task 1)
- `cargo check`: `Finished dev profile` (Task 2)
- Live CSV header confirmed: `leader_id|attached_id` (A1 assumption validated in Task 3)
- Build log: `Parsed 1901 leader attachment pairs` (1 orphan-skipped with unknown unit ID)
- Node verify: `leader_targets pairs: 1901 version: 1.0.0+2f4d062a` (Task 3 acceptance criterion met)
- Version string differs from previous committed value (`b1b21694` → `2f4d062a`) — D-06 proof

## Deviations from Plan

None — plan executed exactly as written. Column name assumption A1 (`leader_id`/`attached_id`) was confirmed at build time as specified. The missing-column warn path was not triggered (columns matched).

## Known Stubs

None. The `leader_targets` array in the JSON is fully populated with real canonical data. The Rust importer is wired. The table will be populated on next app launch (version mismatch triggers re-import). Plan 03 wires the UI/hook layer onto this data.

## Threat Flags

None. All SQL uses positional `?` binds (T-137-03 mitigated). The `validUnitIds` guard bounds the array to known units (T-137-04 mitigated). The zero-pair `console.warn` addresses T-137-05. No new network endpoints or auth paths introduced.

## Self-Check: PASSED

- `scripts/download-wahapedia.ts` contains `"Datasheets_leader.csv"` — confirmed
- `scripts/lib/types.ts` exports `UdbLeaderTargetRow` and `UnitDatabaseJson.leader_targets` — confirmed
- `scripts/build-unit-db.ts` contains `leaderTargets` in both hash input and output assembly — confirmed
- `src-tauri/src/lib.rs` contains `INSERT OR IGNORE INTO udb_leader_targets` — confirmed
- `src-tauri/data/unit_database.json` has `leader_targets` array with 1901 entries — confirmed
- Commit ac7f8c1b exists in git log
- Commit 53773350 exists in git log
- Commit d281e2c2 exists in git log
