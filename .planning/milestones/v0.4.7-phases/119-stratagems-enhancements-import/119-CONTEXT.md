# Phase 119: Stratagems & Enhancements Import - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Import Wahapedia stratagems and enhancements into the canonical database (hobbyforge.db). Stratagems.csv contains ~1482 rows with faction-specific and universal/core stratagems. Enhancements.csv contains ~927 rows of detachment-specific enhancements. This phase adds two new tables (`udb_stratagems`, `udb_enhancements`), extends the TypeScript build script to parse both CSVs and emit JSON, and extends the Rust importer to INSERT the new data. No UI work — that's Phase 120.

</domain>

<decisions>
## Implementation Decisions

### Schema Design — Stratagems (STR-01, STR-02)
- **D-01:** New table `udb_stratagems` with columns: `id TEXT PRIMARY KEY` (Wahapedia's row ID), `faction_id TEXT REFERENCES udb_factions(id)` (NULLABLE — universal stratagems have no faction), `detachment_id TEXT REFERENCES udb_detachments(id)` (NULLABLE — universal stratagems have no detachment), `name TEXT NOT NULL`, `type TEXT` (e.g. "Battle Tactic Stratagem", "Epic Deed Stratagem"), `cp_cost INTEGER NOT NULL`, `turn TEXT` (e.g. "Your turn", "Either player's turn"), `phase TEXT` (e.g. "Shooting phase", "Any phase"), `description TEXT NOT NULL`.
- **D-02:** Nullable FKs for `faction_id` and `detachment_id` — universal/core stratagems (Boarding Actions, standard Command Re-roll etc.) have empty values in the CSV. These must be imported as NULL, not skipped. This satisfies STR-02.
- **D-03:** Add index `idx_udb_stratagems_faction_id` on `faction_id` and `idx_udb_stratagems_detachment_id` on `detachment_id` for Phase 120 UI queries.
- **D-04:** FK constraints use `ON DELETE SET NULL` (not CASCADE) — if a faction or detachment is re-imported, stratagems survive with NULL FK rather than being deleted.

### Schema Design — Enhancements (ENH-01)
- **D-05:** New table `udb_enhancements` with columns: `id TEXT PRIMARY KEY` (Wahapedia's row ID), `faction_id TEXT NOT NULL REFERENCES udb_factions(id)`, `detachment_id TEXT REFERENCES udb_detachments(id)` (NULLABLE — in case any enhancement lacks a detachment), `name TEXT NOT NULL`, `cost INTEGER NOT NULL`, `description TEXT NOT NULL`.
- **D-06:** `faction_id` is NOT NULL for enhancements — unlike stratagems, every enhancement in the CSV has a faction. `detachment_id` is nullable as a safety measure.
- **D-07:** Add indexes `idx_udb_enhancements_faction_id` and `idx_udb_enhancements_detachment_id`.
- **D-08:** FK constraints use `ON DELETE SET NULL` for `detachment_id`, `ON DELETE CASCADE` for `faction_id` — enhancements without a faction are meaningless.

### Legends Handling
- **D-09:** Filter out rows where `legend` column is truthy — consistent with Phase 116 D-05 and Phase 118 D-06 Legends filtering across all data types.

### Build Script Integration
- **D-10:** Add `"Stratagems.csv"` and `"Enhancements.csv"` to `REQUIRED_CSVs` array in `build-unit-db.ts`.
- **D-11:** Add two new build steps after the detachment step (Step 11): Step 12 parses Stratagems.csv, Step 13 parses Enhancements.csv. Each extracts rows, filters legends, maps to typed objects.
- **D-12:** Add `stratagems` and `enhancements` arrays to the `UnitDatabaseJson` interface and JSON output file. Follow the same flat-array pattern as detachments.
- **D-13:** Add TypeScript row types (`UdbStratagemRow`, `UdbEnhancementRow`) in `scripts/lib/types.ts`.
- **D-14:** Also update `update-unit-database.ts` with the same parsing steps (parallel build script).

### Rust Importer Extension
- **D-15:** Add `stratagems` and `enhancements` fields (`Vec<JsRow>`, `#[serde(default)]`) to `UnitDatabasePayload` struct.
- **D-16:** Add DELETE + INSERT blocks for `udb_stratagems` and `udb_enhancements` in `import_unit_database_inner()`. Delete both before detachments (FK dependency: stratagems/enhancements FK to detachments). Insert after detachments.
- **D-17:** Add `stratagems: u64` and `enhancements: u64` counters to `UdbImportResult` struct.

### Migration
- **D-18:** New migration file `043_udb_stratagems_enhancements.sql` creates both tables and their indexes in a single migration. Follows the DDL-only pattern from migrations 038 and 042.

### Claude's Discretion
- HTML sanitization approach for stratagem/enhancement descriptions (recommend: keep as-is, consistent with Phase 118 D-06 for detachment abilities)
- Console log format for stratagem/enhancement import stats
- Whether to validate FK references during build (warning vs error)
- Handling of `cp_cost` parsing for stratagems (some may be 0 for certain types)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build Pipeline
- `scripts/build-unit-db.ts` — Main build script; add stratagem + enhancement parsing steps after Step 11 (detachments)
- `scripts/update-unit-database.ts` — Parallel build script; must also get stratagem + enhancement parsing
- `scripts/lib/parseCsv.ts` — CSV parser (BOM fix already in place from Phase 116)
- `scripts/lib/types.ts` — TypeScript interfaces; add stratagem + enhancement row types here
- `scripts/lib/bsdata.ts` — `readCsvFile()` wrapper used for all CSV reads

### Data Files
- `scripts/data/Stratagems.csv` — Source CSV (pipe-delimited, 11 columns: faction_id|name|id|type|cp_cost|legend|turn|phase|detachment|detachment_id|description)
- `scripts/data/Enhancements.csv` — Source CSV (pipe-delimited, 8 columns: faction_id|id|name|cost|detachment|detachment_id|legend|description)
- `src-tauri/data/unit_database.json` — Output JSON; add stratagems + enhancements arrays

### Rust Importer
- `src-tauri/src/lib.rs` — `UnitDatabasePayload` struct, `import_unit_database_inner` fn, `UdbImportResult` struct

### Schema
- `src-tauri/migrations/042_udb_detachments.sql` — Phase 118 schema pattern to follow
- `src-tauri/migrations/038_udb_schema.sql` — Original udb schema pattern
- `src-tauri/migrations/` — New migration 043 goes here

### Prior Phase Context
- `.planning/phases/118-detachments-import/118-CONTEXT.md` — Phase 118 decisions (same 4-point checklist pattern)

### Requirements
- `.planning/REQUIREMENTS.md` — STR-01, STR-02, ENH-01 requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `readCsvFile()` in `scripts/lib/bsdata.ts`: Standard CSV file reader — use for both new CSVs
- `parseWahapediaCsv()` in `scripts/lib/parseCsv.ts`: Pipe-delimited parser with BOM strip
- `str_val()` / `int_val()` helpers in `lib.rs`: Used by all Rust INSERT blocks
- Phase 118 detachment parsing code in `build-unit-db.ts` (Step 11): Direct pattern to replicate

### Established Patterns
- JSON payload uses flat arrays (`factions[]`, `units[]`, `detachments[]`, etc.) — stratagems/enhancements follow the same shape
- Rust import: FK OFF → DELETE all → INSERT all → FK ON → rebuild FTS5. New tables slot into this sequence
- Migration files are DDL-only (no INSERTs) per the boot-loop incident
- All udb_* tables use TEXT PKs from Wahapedia IDs
- `#[serde(default)]` on Vec fields means old JSON files without stratagems/enhancements won't break the Rust importer
- Legends filtering: check `legend` column truthiness, skip row if truthy

### Integration Points
- `UnitDatabasePayload` struct needs 2 new `Vec<JsRow>` fields
- `UdbImportResult` struct needs 2 new `u64` counters
- DELETE list in `import_unit_database_inner` needs 2 new table names (before detachments due to FK)
- INSERT section needs 2 new blocks (after detachments due to FK)
- `UnitDatabaseJson` TypeScript interface needs 2 new arrays
- `REQUIRED_CSVs` array needs `Stratagems.csv` and `Enhancements.csv` added
- `build-unit-db.ts` needs 2 new parsing steps (Steps 12 and 13)

</code_context>

<specifics>
## Specific Ideas

- Stratagems.csv has ~1482 rows. First few rows are universal (empty faction_id, empty detachment_id) — Boarding Actions stratagems
- Enhancements.csv has ~927 rows. All rows have faction_id populated; all have detachment_id populated
- Stratagem `type` column contains the stratagem category (e.g. "Battle Tactic Stratagem", "Epic Deed Stratagem", "Strategic Ploy Stratagem") — useful for Phase 120 grouping
- Stratagem `phase` column is the battle phase (e.g. "Shooting phase", "Command phase", "Any phase") — used for Game Day grouping in Phase 120
- Stratagem `turn` column indicates whose turn (e.g. "Your turn", "Either player's turn")
- Enhancement `cost` column is the points cost (integer, some are 0 for certain free enhancements)
- Description fields contain HTML (spans with kwb class, br tags, b tags for WHEN/TARGET/EFFECT) — keep as-is for UI rendering in Phase 120
- CSV has BOM on first header (already handled by Phase 116 BOM fix)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 119-Stratagems & Enhancements Import*
*Context gathered: 2026-06-04*
