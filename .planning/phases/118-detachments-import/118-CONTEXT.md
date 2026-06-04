# Phase 118: Detachments Import - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Import Wahapedia detachments and their abilities into the canonical database (hobbyforge.db). The CSV (`Detachment_abilities.csv`) contains ~284 rows across ~260 unique detachments for all factions. This phase adds two new tables (`udb_detachments`, `udb_detachment_abilities`), extends the TypeScript build script to parse the CSV and emit JSON, and extends the Rust importer to INSERT the new data. No UI work — that's Phase 120.

</domain>

<decisions>
## Implementation Decisions

### Schema Design (DET-01, DET-02)
- **D-01:** Two-table design: `udb_detachments` (faction, name) and `udb_detachment_abilities` (detachment FK, name, description). Detachments are a first-class entity because Phase 119 stratagems and enhancements also FK to a detachment.
- **D-02:** `udb_detachments` PK uses Wahapedia's `detachment_id` as TEXT — consistent with `udb_units` and `udb_factions` using Wahapedia string IDs. This satisfies the success criterion "no AUTOINCREMENT drift for downstream FK use."
- **D-03:** `udb_detachment_abilities` PK uses Wahapedia's `id` column (the ability row ID) as TEXT — same pattern as other udb tables. FK to `udb_detachments(id)` with ON DELETE CASCADE.
- **D-04:** Both tables include `faction_id TEXT NOT NULL REFERENCES udb_factions(id)` for direct faction querying without joins. Detachment abilities inherit their faction from the CSV `faction_id` column.
- **D-05:** Add FK indexes on both tables (`idx_udb_detachments_faction_id`, `idx_udb_detachment_abilities_detachment_id`).

### Legends Handling
- **D-06:** Filter out rows where `legend` column is truthy — consistent with Phase 116 D-05 Legends filtering across all data types. The CSV has a `legend` column per row.

### Build Script Integration
- **D-07:** Extend `build-unit-db.ts` (and `update-unit-database.ts`) to parse `Detachment_abilities.csv`. Add a new numbered step after the existing unit steps. Extract unique detachments from the `detachment`/`detachment_id` columns, then collect abilities per detachment.
- **D-08:** Add `detachments` and `detachment_abilities` arrays to the `UnitDatabaseJson` interface and the JSON output file. Follow the same flat-array pattern as units/models/weapons/abilities.
- **D-09:** Add corresponding TypeScript row types (`UdbDetachmentRow`, `UdbDetachmentAbilityRow`) in `scripts/lib/types.ts`.

### Rust Importer Extension
- **D-10:** Add `detachments` and `detachment_abilities` fields (`Vec<JsRow>`, `#[serde(default)]`) to `UnitDatabasePayload` struct.
- **D-11:** Add DELETE + INSERT blocks for `udb_detachments` and `udb_detachment_abilities` in `import_unit_database_inner()`. Delete order: abilities before detachments (FK dependency). Insert order: detachments before abilities.
- **D-12:** Add `detachments: u64` and `detachment_abilities: u64` counters to `UdbImportResult` struct.

### Migration
- **D-13:** New migration file `042_udb_detachments.sql` creates both tables and their indexes in a single migration. Follows the DDL-only pattern from migration 038.

### Claude's Discretion
- Description HTML sanitization approach (strip or keep Wahapedia HTML tags in ability descriptions)
- Console log format for detachment import stats
- Whether to validate faction_id references during build (warning vs error)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build Pipeline
- `scripts/build-unit-db.ts` — Main build script; add detachment parsing step
- `scripts/update-unit-database.ts` — Parallel build script; must also get detachment parsing
- `scripts/lib/parseCsv.ts` — CSV parser (BOM fix already in place from Phase 116)
- `scripts/lib/types.ts` — TypeScript interfaces; add detachment row types here
- `scripts/lib/bsdata.ts` — `readCsvFile()` wrapper used for all CSV reads

### Data Files
- `scripts/data/Detachment_abilities.csv` — Source CSV (pipe-delimited, 7 columns: id|faction_id|name|legend|description|detachment|detachment_id)
- `src-tauri/data/unit_database.json` — Output JSON; add detachments + detachment_abilities arrays

### Rust Importer
- `src-tauri/src/lib.rs` — `UnitDatabasePayload` struct (line ~477), `import_unit_database_inner` fn (line ~515), `UdbImportResult` struct (line ~502)

### Schema
- `src-tauri/migrations/038_udb_schema.sql` — Existing udb schema pattern to follow
- `src-tauri/migrations/` — New migration 042 goes here

### Requirements
- `.planning/REQUIREMENTS.md` — DET-01, DET-02 requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `readCsvFile()` in `scripts/lib/bsdata.ts`: Standard CSV file reader — use for Detachment_abilities.csv
- `parseWahapediaCsv()` in `scripts/lib/parseCsv.ts`: Pipe-delimited parser with BOM strip — already handles this CSV format
- `str_val()` / `int_val()` helpers in `lib.rs`: Used by all Rust INSERT blocks to extract JSON values

### Established Patterns
- JSON payload uses flat arrays (`factions[]`, `units[]`, `models[]`, etc.) — detachments follow the same shape
- Rust import: FK OFF → DELETE all → INSERT all → FK ON → rebuild FTS5. Detachments slot into this sequence
- Migration files are DDL-only (no INSERTs) per the boot-loop incident documented in migration 038
- All udb_* tables use TEXT PKs from Wahapedia IDs
- `#[serde(default)]` on Vec fields means old JSON files without detachments won't break the Rust importer

### Integration Points
- `UnitDatabasePayload` struct needs 2 new `Vec<JsRow>` fields
- `UdbImportResult` struct needs 2 new `u64` counters
- DELETE list in `import_unit_database_inner` needs 2 new table names
- `UnitDatabaseJson` TypeScript interface needs 2 new arrays
- `build-unit-db.ts` needs new step parsing Detachment_abilities.csv
- `REQUIRED_CSVs` array needs `Detachment_abilities.csv` added

</code_context>

<specifics>
## Specific Ideas

- Detachment_abilities.csv has ~284 rows across ~260 unique detachments for 25+ factions
- Each row has: `id|faction_id|name|legend|description|detachment|detachment_id`
- The `detachment` column is the human-readable name, `detachment_id` is the stable ID
- Description contains HTML (spans, ul/li, br tags) — keep as-is for UI rendering in Phase 120
- CSV has BOM on first header (already handled by Phase 116 BOM fix)
- One ability per row; most detachments have exactly 1 ability, some have multiple

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 118-Detachments Import*
*Context gathered: 2026-06-04*
