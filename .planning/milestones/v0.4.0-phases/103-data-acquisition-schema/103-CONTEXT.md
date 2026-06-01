# Phase 103: Data Acquisition & Schema - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the canonical unit database schema (`udb_*` tables) in hobbyforge.db, a dev-side Node.js build script that parses Wahapedia CSV + BSData XML into a versioned `unit_database.json` artifact, a Rust `import_unit_database` Tauri command that bulk-loads the JSON into the schema within a single WAL-checkpointed transaction, and a bundled pre-built dataset that auto-loads on first app launch. FTS5 full-text search is created and populated. No UI changes in this phase.

</domain>

<decisions>
## Implementation Decisions

### Data Source Strategy
- **D-01:** Wahapedia CSV is the primary data source for factions, datasheets, models, abilities, keywords, and wargear. BSData XML supplements with points tiers (model-count brackets) and composition data (min/max models). The build script merges both sources by matching on datasheet name/faction.
- **D-02:** The build script runs dev-side only (`scripts/build-unit-db.ts`) — never at runtime. Output is `src-tauri/data/unit_database.json`, checked into git, versioned with semver in a top-level `version` field.

### Unit ID Scheme
- **D-03:** Reuse Wahapedia string IDs verbatim as `udb_units.id` (e.g., `"000000123"`). This preserves compatibility with existing `rules_favorites_notes` entity_id values so user annotations survive the pivot from `rw_*` to `udb_*` tables without migration.
- **D-04:** Faction IDs also reuse Wahapedia text IDs (e.g., `"SM"`, `"NEC"`). Same rationale — annotation continuity.

### JSON Artifact Format
- **D-05:** Single nested JSON file (`unit_database.json`) containing a `version` string, `built_at` timestamp, and arrays keyed by table name: `factions`, `units`, `models`, `weapons`, `abilities`, `keywords`, `points`, `composition`. The Rust command iterates each array for bulk INSERT.

### First-Launch Import Trigger
- **D-06:** The Rust `import_unit_database` command is called from the Tauri `.setup()` hook on first launch (when `udb_meta` has no rows). On subsequent launches, it checks the `udb_meta.version` against the bundled JSON version and re-imports only if the bundled version is newer.
- **D-07:** The JSON file ships as a Tauri resource via `tauri.conf.json` `resources` field, read at runtime by the Rust command.

### FTS5 Full-Text Search
- **D-08:** Migration 038 creates the FTS5 virtual table (`udb_search`) with columns for unit name, faction name, and keywords. The import command populates it after inserting all `udb_*` rows — the FTS5 table is rebuilt from scratch on every import (DELETE + INSERT from source tables).

### Schema Design
- **D-09:** All 15 `udb_*` tables use the schema defined in `.planning/research/ARCHITECTURE.md` § "Schema Design: Canonical Unit Database Tables". No deviations from that design.
- **D-10:** Schema goes in a single migration file `038_udb_schema.sql`. No data in the migration — only CREATE TABLE and CREATE VIRTUAL TABLE statements.

### Import Transaction Pattern
- **D-11:** The Rust import command follows the same pattern as `bulk_sync_rules`: direct sqlx connection (not the plugin pool), FK checks OFF during delete pass, single transaction wrapping all DELETEs then all INSERTs, FK checks re-enabled after commit.
- **D-12:** WAL checkpoint (`PRAGMA wal_checkpoint(TRUNCATE)`) runs after the transaction commits but before returning to the frontend, ensuring the data is durable and visible to subsequent queries.

### Claude's Discretion
- Build script implementation details (parser structure, error handling, intermediate data model) — whatever produces a clean, complete `unit_database.json` is fine
- Exact Rust error handling patterns in the import command — follow existing `bulk_sync_rules` conventions
- Whether to use `include_bytes!` or runtime file read for the bundled JSON — developer's choice based on binary size tradeoff

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Schema
- `.planning/research/ARCHITECTURE.md` — Complete target schema (15 udb_* tables), migration strategy, component boundaries, data flow changes, anti-patterns to avoid
- `.planning/research/FEATURES.md` — Feature landscape, table stakes, differentiators, anti-features
- `.planning/research/PITFALLS.md` — FTS5 setup requirements, data acquisition risks, migration safety

### Existing Patterns
- `src-tauri/src/lib.rs` — `bulk_sync_rules` Rust command (lines 483–792): established pattern for bulk data import with transaction, FK disable, sync meta write. `import_unit_database` MUST follow this pattern.
- `src-tauri/migrations/rules_001_schema.sql` — Existing `rw_*` schema (reference for what the new `udb_*` schema replaces)
- `src-tauri/migrations/033_database_hardening.sql` — Pattern for indexes and CHECK constraints (apply to udb_* tables)

### Requirements
- `.planning/REQUIREMENTS.md` — DAS-01 through DAS-08 (all 8 requirements map to this phase)
- `.planning/ROADMAP.md` § "Phase 103" — Success criteria (5 items)

### Project Context
- `.planning/PROJECT.md` § "Key Decisions" — ORM decision (no ORM, raw SQL), cross-DB limitation context, migration immutability rule
- `.planning/STATE.md` § "Key Decisions (v0.4.0)" — Phase ordering locked, FK nullable decision, entity ID reuse decision

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bulk_sync_rules` in `lib.rs`: Direct template for `import_unit_database` — same sqlx direct connection, same FK-off delete-all + FK-on insert-all pattern, same sync meta tracking
- `BulkSyncPayload` struct pattern: Shows how to deserialize a large JS→Rust payload; the new command will use a similar struct for the JSON file
- `preflight_migration_repair()`: Must be updated to handle the new migration 038 checksum; no structural change needed
- Existing Wahapedia CSV parsers (`src/lib/parseWahapediaCsv.ts`, `src/lib/fetchBsdataPoints.ts`, `src/lib/parseBsdataExtended.ts`): Reference for field names and data shape — the build script can reuse parsing logic but runs in Node.js, not the browser

### Established Patterns
- Migration files are additive-only and immutable once deployed
- `PRAGMA foreign_keys = ON` set by `client.ts` on every connection — udb_* FK constraints are automatically enforced
- `$1, $2` positional parameter syntax for all queries
- Booleans as `0 | 1` integers
- `ON DELETE CASCADE` for child tables, `ON DELETE SET NULL` for optional links
- `include_str!` for migration SQL files in lib.rs

### Integration Points
- `get_migrations()` in lib.rs: Must add migration 038 entry
- `tauri::generate_handler![]`: Must add `import_unit_database` command
- `tauri.conf.json` `resources` field: Must include `data/unit_database.json`
- `.setup()` closure in `run()`: Must call import on first launch / version mismatch
- Backup manifest `schema_version`: Will increment to 38 after migration

</code_context>

<specifics>
## Specific Ideas

- The build script should validate completeness: every faction must have at least 1 unit, every unit must have at least 1 model profile, every unit with points tiers must have at least 1 tier row
- The JSON artifact should include a `unit_count` and `faction_count` in its metadata for quick verification
- Import command should return row counts per table (same pattern as `SyncResult` struct) for diagnostic display

</specifics>

<deferred>
## Deferred Ideas

- UI for triggering manual re-import (Phase 104+ concern)
- Collection FK link (`units.udb_unit_id` column) — Phase 105
- Army list COALESCE chain simplification — Phase 106
- rules.db removal and dead code cleanup — Phase 107
- Stratagems, detachments, and enhancements in canonical DB — noted as v2 requirements (EXT-01/02/03)

None — discussion stayed within phase scope

</deferred>

---

*Phase: 103-Data Acquisition & Schema*
*Context gathered: 2026-05-29*
