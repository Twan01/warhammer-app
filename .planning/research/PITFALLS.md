# Domain Pitfalls: v0.4.7 Wahapedia Pipeline Migration

**Domain:** Dev-side build pipeline migration (BSData+Wahapedia to Wahapedia-only), new entity types (stratagems/enhancements/detachments), auto-download, FK preservation
**Researched:** 2026-06-04
**Based on:** Direct codebase analysis of `scripts/build-unit-db.ts`, `scripts/lib/*.ts`, `src-tauri/src/lib.rs`, `src-tauri/migrations/038-041`, and `scripts/data/` CSV samples

---

## Critical Pitfalls

These mistakes cause silent data loss, FK breakage, or incorrect points for every user.

---

### Pitfall C-1: Legends units silently win the deduplication race

**What goes wrong:** `Datasheets.csv` contains both current-edition units and Legends units with the same name (e.g., "Land Raider Crusader" appears for SM current and SM Legends). The current pipeline builds `unitByNameFaction` as a `Map<name:faction_id, UdbUnitRow>`, so whichever row is parsed last wins. If Legends rows appear after current rows in the CSV (which they sometimes do — they share the same faction_id), Legends points/stats silently replace the current ones.

**Why it happens:** The CSV `legend` column exists (visible in `Datasheets.csv` header: `id|name|faction_id|source_id|legend|...`) but the build pipeline ignores it entirely. It is never read, never filtered.

**Consequences:**
- Wrong points for affected units in army lists
- Stale or removed abilities/keywords showing in PlaybookTab
- Silent — no warning emitted, coverage % unchanged, content hash changes but nobody checks why

**Prevention:** Filter out Legends rows at parse time in `build-unit-db.ts` step 3. The field is named `legend` and is a non-empty string (the legends lore text) for Legends units, versus empty for current units. Add a build-step log: "Filtered N Legends datasheets." Verify the exact sentinel before relying on it — inspect a known Legends unit row to confirm.

**Detection warning signs:** Points for well-known units change between builds even when no GW update happened. Coverage % is stable but army list points diverge from official sources.

**Phase:** Must be addressed in the deduplication phase (before points import phase).

---

### Pitfall C-2: udb_unit_id FKs on collection units become NULL after re-import when Wahapedia reassigns IDs

**What goes wrong:** The `Datasheets.csv` ID field (e.g., `000000882`) is a Wahapedia-internal integer. Wahapedia has historically reassigned these IDs when units are restructured (e.g., a datasheet split into two). If the ID for "Intercessor Squad" changes from `000000100` to `000000250`, the re-import inserts the new row under the new ID, the old row is DELETEd, and `units.udb_unit_id = '000000100'` becomes NULL (ON DELETE SET NULL fires). The user loses their collection-to-datasheet links silently.

**Why it happens:** Migration 039 backfills by name match but subsequent pipeline runs (when the developer runs `build:udb` to update) DELETE and re-INSERT all udb_units. ON DELETE SET NULL fires for any ID that disappears, even if a unit with the same name is re-inserted under a new ID.

**Consequences:**
- Collection units lose their database link — FK-based points resolution stops working
- Ownership/readiness badges disappear from database browser
- No error shown to user; units simply show "no points" and "not linked"

**Prevention:** The Rust import command (`import_unit_database_inner`) should run a re-link pass after DELETE+INSERT: `UPDATE units SET udb_unit_id = (SELECT id FROM udb_units WHERE LOWER(name) = LOWER(units.name) AND ...) WHERE udb_unit_id IS NULL`. This already exists as a one-time backfill in migration 039 — replicate that exact logic in the import transaction, inside the same BEGIN/COMMIT block. The build pipeline should also log units whose Wahapedia ID changed between builds.

**Detection warning signs:** After running `build:udb` with refreshed CSV data, the Data Health page shows increased "unlinked collection units." Running `update-unit-database.ts` diff shows `removedUnits` count that matches `newUnits` count with the same names — that is the signature of ID reassignment.

**Phase:** Must be addressed in the points import phase (same phase that removes BSData dependency), as this is the first time a Wahapedia-only re-import replaces production IDs.

---

### Pitfall C-3: Datasheets_models_cost.csv does not yet exist in scripts/data/ — a truncated or missing download causes silent 0-coverage

**What goes wrong:** The milestone relies on `Datasheets_models_cost.csv` for points. This file does not currently exist in `scripts/data/`. If the auto-download is partial (network interrupted, file truncated), the build script will either fail loudly (good) or parse a partial file and emit 0 points for many units. The `parseWahapediaCsv` function returns `[]` for any file with fewer than 2 lines — no error thrown.

**Why it happens:** Auto-download scripts typically do not validate file integrity. A 0-byte or header-only CSV parses as 0 data rows with no exception.

**Consequences:**
- Coverage drops toward 0% if the cost CSV is malformed
- The MIN_COVERAGE_PCT gate (currently 58%) would catch a total failure — but a partial file that parses 200 rows instead of 2000 rows would not trigger the gate

**Prevention:**
1. After downloading each CSV, validate row count >= expected minimum (e.g., Datasheets_models_cost.csv should have >= 500 rows for 40k 10th edition).
2. Make the download script atomic: download to a `.tmp` file, validate row count, then rename to final path. Never write a partial file to the canonical location.
3. Do not lower the MIN_COVERAGE_PCT threshold during the migration — raise it. Wahapedia points should push coverage to 95%+.

**Detection warning signs:** Coverage drops sharply between builds. Build output shows "0 points tier entries" for the new cost CSV source.

**Phase:** Auto-download phase. Validation must be in place before the points import phase.

---

### Pitfall C-4: The FTS5 index udb_search is not updated when new entity tables are added

**What goes wrong:** The Rust import command (`import_unit_database_inner`) currently rebuilds `udb_search` by joining `udb_units`, `udb_factions`, and `udb_unit_keywords`. When new tables (stratagems, enhancements, detachments) are added, their text content is NOT included in the FTS5 index unless the rebuild query is explicitly updated. Searches for stratagem names or enhancement names in the Rules Hub will return no results.

**Why it happens:** The FTS5 rebuild query is hardcoded in `lib.rs` and only covers unit-side tables. The struct `UnitDatabasePayload` uses `#[serde(default)]` so unknown JSON fields are silently ignored — new entity arrays in the JSON won't cause a parse error, they will simply be no-ops if the INSERT loops are not added.

**Consequences:**
- New entity types are imported but not searchable
- Rules Hub search returns incomplete results
- No error — silent omission

**Prevention:** When adding new entity types to the JSON and Rust structs, update the FTS5 rebuild query in the same PR. Consider a separate `udb_rules_search` FTS5 virtual table for stratagems/enhancements to avoid mixing unit and rule search results and to allow independent filtering.

**Phase:** Schema expansion phase (when new tables are added). The FTS rebuild is in the same `lib.rs` file as the import command.

---

### Pitfall C-5: rules_favorites_notes annotations use entity IDs — new entity IDs must match what existing annotations stored

**What goes wrong:** Migration 019 creates `rules_favorites_notes(entity_id TEXT, entity_type TEXT)` where `entity_id` reuses Wahapedia string IDs. If stratagems/enhancements in the new canonical DB use different IDs from what the old rules.db sync pipeline stored in hobbyforge.db, existing user annotations (favorites, notes, Game Day reminders) are orphaned.

**Why it happens:** The old rules.db stratagems had their own ID scheme from the CSV sync. The new canonical DB stratagems will use Wahapedia CSV IDs. If those IDs differ from what was previously stored in `rules_favorites_notes`, existing annotations will not join correctly.

**Consequences:**
- User loses all stratagem favorites and Game Day reminders accumulated before v0.4.7
- No error — IDs simply do not match, JOIN returns NULL

**Prevention:** Before locking the new entity IDs, query `rules_favorites_notes` for `entity_type IN ('stratagem', 'enhancement', 'detachment_ability')` and document what ID format those rows use. Then either use the same IDs, or write a one-time migration that maps old IDs to new ones. The Wahapedia CSV `id` field for Stratagems.csv should be inspected against any stored values before finalizing the schema.

**Phase:** Schema expansion phase, before any UI wiring. Audit existing `rules_favorites_notes` data first.

---

## Moderate Pitfalls

---

### Pitfall M-1: Auto-download embedded in the build command makes builds non-reproducible

**What goes wrong:** If auto-download runs inside `pnpm build:udb`, two developers building from the same commit on different days will produce different `unit_database.json` because Wahapedia updates CSVs when GW releases FAQs or balance dataslates. The content hash in `udb_meta.version` will differ, causing the Rust import to re-import every app launch for one developer while the other stays on old data.

**Why it happens:** External HTTP sources are not version-pinned. Build reproducibility (BPH-02) depends on committed CSVs in `scripts/data/`.

**Consequences:**
- "Deterministic builds" invariant (BPH-02) is broken
- Two developers see different coverage percentages for the same git SHA
- CI may pass while local has stale data or vice versa

**Prevention:** Auto-download must be a separate, explicitly-invoked script (`pnpm download:wahapedia`) that writes files to `scripts/data/` on demand. The build pipeline (`pnpm build:udb`) reads from committed CSV files and does not trigger a download. Developers run the download step deliberately when they want to refresh data. This preserves BPH-02 exactly as designed.

**Phase:** Auto-download phase. Design the download as an opt-in separate command from the start.

---

### Pitfall M-2: BSData alias table becomes invalid noise when BSData is removed

**What goes wrong:** `aliases.json` maps BSData unit names to Wahapedia names (44 entries). When BSData is removed, `allBsdataNames` is empty and all 44 aliases report as "unused" every build. If the validation step ever has a hard-fail mode for unused aliases, it blocks the build.

**Why it happens:** The alias system was designed as a BSData-to-Wahapedia bridge. With Wahapedia-only points, there is no other source to bridge from.

**Consequences:**
- Noisy build output (44 "unused" aliases)
- `aliases.json` remains as dead code confusing future developers

**Prevention:** When removing BSData from the pipeline, also remove the alias system from `build-unit-db.ts` in the same PR. Archive `aliases.json` as a historical reference or delete it. The `validateAliases` function and `allBsdataNames` accumulator should be removed. The coverage gate (MIN_COVERAGE_PCT) becomes the sole regression detector.

**Phase:** BSData removal phase. Remove alias infrastructure in the same commit that removes BSData `.cat` parsing.

---

### Pitfall M-3: New Wahapedia CSV files have a UTF-8 BOM that the current parser does not strip

**What goes wrong:** Wahapedia CSVs are UTF-8 with BOM (`\xEF\xBB\xBF`). The current `parseCsv.ts` reads with `readFileSync(filepath, "utf-8")` and calls `.trim()` on headers, but `.trim()` does not strip the BOM. The very first header reads as `﻿id` instead of `id`.

**Why it happens:** Node.js `fs.readFileSync` with `'utf-8'` preserves the BOM. JavaScript's `.trim()` strips ASCII whitespace but not the Unicode BOM character.

**Consequences:**
- For any new CSV where the first column is `id` (Stratagems.csv, Enhancements.csv, Datasheets_models_cost.csv), the ID field returns `undefined` for every row
- All rows are silently skipped (the pipeline checks `if (!id) continue`)
- Parses as 0 data rows with no error thrown

**Prevention:** Add BOM stripping to `parseWahapediaCsv` at the top: `const cleaned = rawContent.replace(/^﻿/, "")`. This is a one-line fix. Add a unit test for a BOM-prefixed CSV string before adding any new CSV file types. The existing CSVs may have worked because the first column (`id`) is checked with `row["id"]?.trim()` and the BOM may be partially absorbed — but do not rely on this.

**Detection warning signs:** New CSV parses to 0 rows. First header name starts with a non-printable character when logged.

**Phase:** Must be fixed in `parseCsv.ts` before adding any new CSV file types. This is the first fix in the pipeline phase.

---

### Pitfall M-4: Expanding UnitDatabasePayload in Rust requires changes in four places — missing any one is a silent no-op

**What goes wrong:** `UdbImportResult` lists exactly the entity types currently imported: `factions, units, models, weapons, abilities, keywords, points, composition`. When `stratagems`, `enhancements`, and `detachments` are added, the Rust code must be expanded in four places: (1) `UnitDatabasePayload` deserialization struct, (2) `UdbImportResult` count reporting struct, (3) the DELETE list array in `import_unit_database_inner`, (4) the INSERT loop body. Missing any one silently no-ops that entity type.

**Why it happens:** The Rust code is verbose by design. `#[serde(default)]` on `UnitDatabasePayload` means unknown fields are silently ignored — no compile error if the JSON has the array but Rust does not have the loop.

**Consequences:**
- Entity type silently imported as 0 rows
- The count in `UdbImportResult` reports 0, which may be misread as "empty source data" rather than "bug"

**Prevention:** Use a 4-point checklist when adding each entity type: (1) add field to `UnitDatabasePayload`, (2) add field to `UdbImportResult`, (3) add table to DELETE list, (4) add INSERT loop. Add a post-import assertion that counts are non-zero. All four changes must be in the same commit.

**Phase:** Rust import expansion phase.

---

### Pitfall M-5: New entity tables not added to the DELETE list cause duplicate rows on every re-import

**What goes wrong:** The Rust import runs `DELETE FROM <table>` for each udb_* table with FK checks OFF. If a new table (e.g., `udb_stratagems`) is created in the migration but not added to the DELETE list, old rows from the previous import survive alongside the new rows. Since each import does DELETE-all + INSERT-all, omitting the DELETE step means rows accumulate.

**Why it happens:** The DELETE list is a hardcoded array in `lib.rs`. It is not derived from the schema. New tables must be manually added.

**Consequences:**
- Duplicate stratagems/enhancements in the database after each re-import
- PlaybookTab and Game Day show duplicates
- Only detectable by checking row counts against expected CSV row counts

**Prevention:** Add new entity tables to the DELETE list immediately when creating their schema migration. The DELETE list in `import_unit_database_inner` must be updated in the same PR as the new SQL migration. Consider adding a post-import row count assertion.

**Phase:** Schema migration phase. The DELETE list update is in `lib.rs`, not in the migration file.

---

### Pitfall M-6: Datasheets_models_cost.csv may store single-model units as model_count=1 rows, conflicting with the base_points column convention

**What goes wrong:** The existing pipeline stores single-cost units as `base_points` on the `udb_units` row, and multi-tier units as rows in `udb_unit_points`. Wahapedia's cost CSV may store all units uniformly as `(datasheet_id, model_count, points)` — including single-model units with `model_count=1`. If both `base_points` and a `model_count=1` tier row exist, `resolveUnitPoints()` and the army list SQL COALESCE chain must be audited for which takes priority.

**Why it happens:** BSData distinguished single-tier and multi-tier units structurally. The Wahapedia cost CSV likely does not make this distinction.

**Consequences:**
- If `base_points` takes priority and is stale from a previous BSData build, army lists show old points even after migration
- If the cost CSV sets `model_count=1` but the code looks at `base_points` first, newly imported Wahapedia points are silently ignored

**Prevention:** When switching to Wahapedia points, explicitly null out `base_points` for all units in the import transaction and rely exclusively on `udb_unit_points` rows. Audit the cost CSV column names before writing the parser — confirm the exact column name for datasheet_id and verify it matches the `id` field from `Datasheets.csv`.

**Phase:** Points import phase. Audit the CSV structure first; then write the parser.

---

### Pitfall M-7: army_lists.detachment_name denormalized copy survives — new canonical detachment IDs must be wired without breaking existing display

**What goes wrong:** Migration 031 stores `detachment_name TEXT` as a denormalized copy on `army_lists` (because rules.db was wiped on sync). Now that detachments will be in the canonical DB, if a new `udb_detachment_id` FK is added to `army_lists`, it must use stable IDs. ID reassignment (same as C-2) would break the FK link, leaving the name display correct but the abilities JOIN empty.

**Prevention:** Treat `udb_detachment_id` on `army_lists` the same as `udb_unit_id` on `units`: nullable FK with ON DELETE SET NULL + re-link pass in the import transaction, matching on `detachment_name = udb_detachments.name AND faction_id`. Do not remove the TEXT copy — it remains the display fallback.

**Phase:** Schema expansion phase (when `udb_detachments` table is added).

---

## Minor Pitfalls

---

### Pitfall S-1: HTTP auto-download on Windows — use Node.js built-in fetch, not a package

**What goes wrong:** If the download script uses a third-party HTTP library that bundles its own TLS certificate store, Windows certificate validation may behave differently from Linux CI. This is more complex to debug than a standard Node.js fetch call.

**Prevention:** Use Node.js built-in `fetch` (available in Node 22 which `node --experimental-strip-types` requires). Validate response status code and `Content-Type` before writing to disk.

**Phase:** Auto-download phase.

---

### Pitfall S-2: MIN_COVERAGE_PCT must only move up during this migration, never down

**What goes wrong:** The temptation during migration is to lower the threshold temporarily to accommodate the transition period. If it is lowered to e.g. 30% "temporarily," future regressions go undetected and the threshold is never raised.

**Prevention:** Keep MIN_COVERAGE_PCT at 58% while BSData is still present. After Wahapedia points are wired and coverage reaches 90%+, raise the threshold to 85% or 90%, then remove BSData. Never lower the threshold. Wahapedia provides points for all non-Legends current units — 95%+ coverage is achievable and should be the target.

**Phase:** Points import phase.

---

### Pitfall S-3: update-unit-database.ts duplicates pipeline logic and will silently miss new entity types

**What goes wrong:** `update-unit-database.ts` contains its own copy of the full parsing pipeline inside `buildUnitDatabase()`. When new CSVs (stratagems, enhancements, detachments) are added to `build-unit-db.ts`, they must also be added to `update-unit-database.ts` — otherwise the diff script produces a "clean" diff even when new entities were added or changed.

**Prevention:** Extract the shared pipeline into `scripts/lib/pipeline.ts` so both scripts call the same function. This refactor should happen before adding new entity types, not after. The `DiffReport` type must also be extended to cover new entity types.

**Phase:** The first phase that adds a new CSV type to the pipeline. Refactor before adding new entity types.

---

### Pitfall S-4: FTS5 schema for new entity search requires a design decision upfront

**What goes wrong:** The current `udb_search` is an external-content FTS5 table covering units. If stratagems need to be searchable, the options are: (a) extend `udb_search` with new columns (breaks existing queries that assume the current column layout), or (b) create a separate `udb_rules_search` FTS5 table. Making the wrong choice requires a schema migration to undo.

**Prevention:** Create a separate `udb_rules_search` FTS5 table for stratagems/enhancements/detachments. Keep unit and rule search indices separate to allow independent filtering in the UI and to avoid breaking existing `udb_search` consumers. Design this table in the schema expansion phase migration, not as an afterthought.

**Phase:** Schema expansion phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Auto-download CSVs | M-1 (non-reproducible builds), M-3 (BOM stripping), S-1 (TLS/fetch) | Separate download command; validate row counts; fix BOM in parseCsv.ts first |
| Legends deduplication | C-1 (Legends win race) | Filter `legend != ""` at build step 3; log filtered count |
| Points from Datasheets_models_cost.csv | C-3 (malformed file), M-6 (tier vs base_points mapping) | Validate row count post-download; audit CSV columns before coding |
| Schema expansion (stratagems/enhancements/detachments) | C-4 (FTS5 not updated), C-5 (annotation ID mismatch), M-5 (DELETE list missing), S-4 (FTS5 design) | 4-point checklist per entity type; audit rules_favorites_notes IDs first |
| BSData removal | M-2 (stale aliases), S-2 (threshold must rise) | Remove alias system in same PR; raise MIN_COVERAGE_PCT |
| Rust import expansion | M-4 (struct expansion checklist), M-7 (detachment denormalization) | 4-point checklist; add re-link pass for detachment FKs |
| FK preservation (udb_unit_id) | C-2 (ID reassignment causes NULL FKs) | Add re-link pass after DELETE+INSERT in import transaction |
| update-unit-database.ts | S-3 (duplicated pipeline logic) | Refactor to shared `scripts/lib/pipeline.ts` before adding new CSV types |
| Coverage gate | S-2 (threshold direction) | Only raise, never lower MIN_COVERAGE_PCT during migration |

---

## Sources

- Direct analysis of `scripts/build-unit-db.ts` (build steps 1-10, BSData matching, coverage gate logic)
- `scripts/lib/parseCsv.ts` (BOM behavior: no stripping present, confirmed by code inspection)
- `scripts/lib/bsdata.ts` (`matchUnit` 3-pass logic, alias system, FACTION_MAP)
- `src-tauri/src/lib.rs` (`import_unit_database_inner`: DELETE list, INSERT loops, FTS5 rebuild, FK OFF pattern)
- `src-tauri/migrations/038_udb_schema.sql` (table definitions, FK structure, FTS5 virtual table)
- `src-tauri/migrations/039_collection_udb_link.sql` (ON DELETE SET NULL, re-link backfill pattern)
- `scripts/data/Datasheets.csv` line 1 header inspection: `legend` column confirmed present
- `.planning/PROJECT.md` Key Decisions table (ID reuse D-02/D-03/D-04, ON DELETE SET NULL pattern, denormalized TEXT copies pattern, BPH-02 deterministic builds)
