---
phase: 119-stratagems-enhancements-import
plan: "02"
subsystem: data-pipeline
tags: [stratagems, enhancements, rust, migration, import, unit-database]
dependency_graph:
  requires: [119-01]
  provides: [120-01]
  affects: [src-tauri/src/lib.rs]
tech_stack:
  added: []
  patterns: [rust-insert-block, nullable-fk-binding, migration-registration, sqlx-parameterized]
key_files:
  created: []
  modified:
    - src-tauri/src/lib.rs
decisions:
  - Migration 042 (udb_detachments) registered alongside 043 — was missing from get_migrations(), required as FK prerequisite
  - Stratagems faction_id/detachment_id bound via str_val() (no unwrap) — Option<String> maps to SQL NULL for universal stratagems
  - Enhancements faction_id bound via str_val().unwrap_or_default() — NOT NULL column requires string value
  - DELETE order: udb_stratagems and udb_enhancements added before udb_detachment_abilities (FK child before parent convention)
metrics:
  duration: "15 min"
  completed: "2026-06-04"
  tasks_completed: 2
  files_modified: 1
---

# Phase 119 Plan 02: Rust Importer Extension for Stratagems & Enhancements Summary

Rust importer extended with migrations 042+043 registered, structs extended for stratagems and enhancements, DELETE list updated, and INSERT blocks added with correct nullable/non-nullable FK binding patterns. cargo check and pnpm build both pass.

## What Was Built

**Task 1 — Migrations, structs, DELETE list, and INSERT blocks**
- Registered migration 042 (`udb_detachments`) in `get_migrations()` — was missing, required as FK prerequisite for migration 043
- Registered migration 043 (`udb_stratagems_enhancements`) after 042
- Added `#[serde(default)] stratagems: Vec<JsRow>` and `#[serde(default)] enhancements: Vec<JsRow>` to `UnitDatabasePayload`
- Added `pub stratagems: u64` and `pub enhancements: u64` to `UdbImportResult`
- Updated both `UdbImportResult { ... }` literal initializations (version-match early-return path and normal import path) with `stratagems: 0, enhancements: 0`
- Added `"udb_stratagems"` and `"udb_enhancements"` to DELETE table list before `"udb_detachment_abilities"`
- Added INSERT block for `udb_stratagems` (9 columns): id, faction_id (nullable via `str_val`), detachment_id (nullable via `str_val`), name, type, cp_cost, turn, phase, description
- Added INSERT block for `udb_enhancements` (6 columns): id, faction_id (NOT NULL via `unwrap_or_default`), detachment_id (nullable via `str_val`), name, cost, description

**Task 2 — Pipeline verification**
- pnpm build completes without TypeScript errors
- unit_database.json verified: 1482 stratagems, 927 enhancements, 28 universal (null faction_id), 0 bad enhancements
- All acceptance criteria met

## Verification Results

```
Stratagems: 1482  Enhancements: 927  Universal: 28  BadEnh: 0
Pipeline OK
cargo check: Finished dev profile [unoptimized + debuginfo] — no errors
pnpm build: built in 15.82s — no TypeScript errors
```

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 4dfe345 | feat(119-02): register migrations 042+043, extend structs and INSERT blocks for stratagems/enhancements |
| Task 2 | (no new commit — JSON already committed in 119-01, verified in place) | Pipeline OK |

## Known Stubs

None — Rust importer fully wired. Data flows from unit_database.json through serde deserialization into udb_stratagems and udb_enhancements tables at app startup.

## Threat Flags

No new security-relevant surface introduced beyond what was scoped in the plan threat model. All SQL uses sqlx parameterized `?` placeholders — no string interpolation. str_val/i64_val helpers ensure type safety.

## Self-Check: PASSED

- src-tauri/src/lib.rs: contains version 42 and 43 migration registrations — FOUND
- src-tauri/src/lib.rs: UnitDatabasePayload has stratagems and enhancements Vec<JsRow> fields — FOUND
- src-tauri/src/lib.rs: UdbImportResult has pub stratagems: u64 and pub enhancements: u64 — FOUND
- src-tauri/src/lib.rs: both UdbImportResult initializations have stratagems: 0, enhancements: 0 — FOUND
- src-tauri/src/lib.rs: DELETE list contains udb_stratagems and udb_enhancements before udb_detachment_abilities — FOUND
- src-tauri/src/lib.rs: INSERT block for udb_stratagems with nullable faction_id — FOUND
- src-tauri/src/lib.rs: INSERT block for udb_enhancements with unwrap_or_default faction_id — FOUND
- Commit 4dfe345 — FOUND
- cargo check passes — VERIFIED
- pnpm build passes — VERIFIED
