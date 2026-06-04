---
phase: 118-detachments-import
plan: 02
subsystem: database
tags: [rust, sqlite, tauri, unit-database, detachments, wahapedia]

requires:
  - phase: 118-detachments-import/118-01
    provides: Migration 042 DDL, unit_database.json rebuilt with detachments and detachment_abilities arrays

provides:
  - Extended UnitDatabasePayload Rust struct with detachments and detachment_abilities Vec<JsRow> fields
  - Extended UdbImportResult Rust struct with detachments and detachment_abilities u64 count fields
  - Rust INSERT blocks for udb_detachments and udb_detachment_abilities in import_unit_database_inner
  - Correct DELETE order: udb_detachment_abilities before udb_detachments before udb_factions (child before parent)
  - Committed rebuilt unit_database.json (261 detachments, 284 abilities) alongside Rust changes

affects: [119-stratagems-import, 120-detachments-ui]

tech-stack:
  added: []
  patterns:
    - "Rust serde default Vec fields: #[serde(default)] on all Vec<JsRow> payload fields ensures backward-compatible JSON deserialization"
    - "Child-before-parent DELETE order maintained even though FK checks are OFF during import (defensive correctness)"
    - "TEXT PK INSERT pattern: str_val(row, 'id').unwrap_or_default() + if id.is_empty() { continue } guard"

key-files:
  created: []
  modified:
    - src-tauri/src/lib.rs
    - src-tauri/data/unit_database.json

key-decisions:
  - "description field bound as str_val(row, 'description') without unwrap_or_default — nullable TEXT in schema matches Option<String> binding behavior"
  - "DELETE list places udb_detachment_abilities before udb_detachments for defensive correctness even though FK checks are disabled during the import transaction"

patterns-established:
  - "Pattern: Rust importer extension checklist — 4 touch points per new entity: (1) UnitDatabasePayload field with #[serde(default)], (2) UdbImportResult count field, (3) both UdbImportResult literals updated, (4) DELETE list + INSERT block added"

requirements-completed: [DET-01, DET-02]

duration: 15min
completed: 2026-06-04
---

# Phase 118 Plan 02: Rust Importer Extension for Detachments Summary

**Rust importer extended with UnitDatabasePayload/UdbImportResult fields, correct FK-order DELETE list, and parameterized INSERT blocks for udb_detachments (3-column) and udb_detachment_abilities (5-column)**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-04T07:25:00Z
- **Completed:** 2026-06-04T07:38:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 Rust + 1 JSON artifact)

## Accomplishments

- Extended `UnitDatabasePayload` with `#[serde(default)]` `detachments` and `detachment_abilities` Vec<JsRow> fields ensuring old JSON without these keys still deserializes correctly
- Extended `UdbImportResult` with `detachments: u64` and `detachment_abilities: u64`; both UdbImportResult literal constructions updated (early-return path + counts initializer)
- Added `udb_detachment_abilities` and `udb_detachments` to DELETE list in correct child-before-parent order before `udb_factions`
- Added parameterized INSERT blocks: detachments (id, faction_id, name) and detachment_abilities (id, detachment_id, faction_id, name, description) following the TEXT PK pattern from existing factions block
- Committed rebuilt unit_database.json (261 detachments, 284 abilities) as part of Task 2
- Both `cargo check` and `pnpm build` pass cleanly

## Task Commits

1. **Task 1: Extend Rust structs and DELETE list** - `32f4bad` (feat)
2. **Task 2: Add Rust INSERT blocks and commit rebuilt JSON** - `eb8598a` (feat)

## Files Created/Modified

- `src-tauri/src/lib.rs` - UnitDatabasePayload extended with 2 serde-default Vec fields; UdbImportResult extended with 2 u64 fields; both result literals updated; DELETE list updated; 2 new INSERT blocks added after composition INSERT, before udb_meta INSERT
- `src-tauri/data/unit_database.json` - Rebuilt artifact from Plan 01 (261 detachments, 284 detachment abilities); committed alongside Rust changes

## Decisions Made

- `description` bound via `str_val(row, "description")` (returns `Option<String>`) rather than `unwrap_or_default()` — the schema defines `description TEXT` (nullable), and the factions INSERT block uses the same nullable binding pattern for optional columns
- DELETE list defensively orders udb_detachment_abilities before udb_detachments even though FK checks are disabled during import — maintains correctness invariant for any future re-enable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- First `pnpm build` run returned TS errors referencing removed files (`scripts/lib/normalize.ts`, `@xmldom/xmldom`) — these are pre-existing failures introduced in Phase 117 when BSData was removed but test files were not cleaned up. On re-run, `pnpm build` succeeded cleanly (the first invocation may have had a stale tsc cache from a prior partial run). No action taken — pre-existing issue outside plan scope.

## Known Stubs

None — this plan is Rust importer only. No UI components created.

## Threat Flags

None — all SQL uses parameterized ? placeholders via sqlx; no string interpolation in queries. JSON is a build artifact, not user input.

## Next Phase Readiness

- Rust importer now handles the full detachment pipeline: CSV → JSON → SQLite (migration 042 + importer)
- Phase 119 (stratagems/enhancements import) can follow the same 4-point Rust importer extension pattern
- Phase 120 (detachments UI) can query udb_detachments and udb_detachment_abilities directly via TypeScript query layer

---
*Phase: 118-detachments-import*
*Completed: 2026-06-04*
