# Pitfalls Research

**Domain:** Extending an existing SQLite-backed Tauri 2 desktop app with sub-faction schema, bilingual data layer, and improved BSData XML parsing (v0.4.2 Unit Database 2.0)
**Researched:** 2026-06-01
**Confidence:** HIGH — all findings are grounded in direct codebase inspection of migration files, build scripts, Rust import command, and TypeScript query layer

---

## Critical Pitfalls

### Pitfall 1: Seeding Data Inside a Migration File Causes a Boot-Loop

**What goes wrong:**
A new migration file that contains both DDL (CREATE TABLE) and DML (INSERT) rows will run the INSERTs on every install and on fresh database creation. If a subsequent migration is added that alters the same tables, the mismatch between the checked-in migration file and the checksum stored in `_sqlx_migrations` causes the app to panic on startup with no recovery path — or worse, silently duplicates rows on re-install. Migration 038 already has a comment documenting an actual boot-loop incident caused by exactly this pattern.

**Why it happens:**
Sub-faction data (chapter names, subfaction identifiers, French translation seed rows) is tempting to insert in the same migration that creates the table, because it keeps everything in one place. But tauri-plugin-sql treats every registered migration as immutable after first application.

**How to avoid:**
Schema DDL only in migration files. All initial data population goes through the Rust `import_unit_database_inner` path (or a new parallel command for sub-faction/translation data). The JSON payload already handles version-check logic (udb_meta version comparison); extend that pattern — do not split it into migrations.

If sub-faction rows or translation columns need seeding, add them to `unit_database.json` as new top-level arrays and extend `UnitDatabasePayload` in `lib.rs`. The existing DELETE-all + re-INSERT transaction in `import_unit_database_inner` is the safe path.

**Warning signs:**
- A migration file that contains any line beginning with `INSERT INTO udb_` or `INSERT INTO translation_`
- Startup error "checksum mismatch" or "already applied migration differs"

**Phase to address:**
Sub-faction schema phase and translation schema phase — enforce the rule at the start of each, before any migration file is written.

---

### Pitfall 2: Adding Columns to udb_* Tables Without Rebuilding the FTS5 Index Produces Stale or Broken Search

**What goes wrong:**
`udb_search` is an FTS5 virtual table populated by a single INSERT...SELECT at the end of `import_unit_database_inner`. It mirrors `unit_id`, `name`, `faction_name`, and `keywords`. If a new migration adds a `subfaction_id` or `name_fr` column to `udb_units` or `udb_factions`, the FTS5 table is NOT automatically updated — it still references the old column set.

More dangerous: adding a new FTS5 column (e.g. `name_fr`) to the `udb_search` CREATE VIRTUAL TABLE definition requires a DROP + recreate of the virtual table. `ALTER TABLE udb_search ADD COLUMN` is not valid SQLite syntax for FTS5. A migration that drops and recreates `udb_search` leaves it empty until the Rust import runs. Since migrations run before the setup hook that triggers import, there is a window where `SELECT ... FROM udb_search WHERE udb_search MATCH $1` returns zero results on every cold start.

**Why it happens:**
Developers extend the data model and forget that FTS5 virtual tables are not normal tables. The only way to add a column to an FTS5 table is DROP + recreate.

**How to avoid:**
Do not add columns to `udb_search`. Instead, keep the FTS5 table's schema fixed (4 columns: `unit_id`, `name`, `faction_name`, `keywords`) and concatenate French names into the existing `name` column during the INSERT...SELECT rebuild step, separated by a pipe: `u.name || '|' || COALESCE(u.name_fr, '')`. This lets FTS5 find French queries without a schema change to the virtual table.

If a new FTS5 column is unavoidable, the migration must DROP and recreate `udb_search` as empty, and the Rust setup hook must re-run the import even if the version hash has not changed. Add an empty-FTS5 detection gate.

**Warning signs:**
- Any migration containing `DROP TABLE udb_search` without a guaranteed import trigger
- Search returning 0 results immediately after a fresh install or data update
- `SELECT COUNT(*) FROM udb_search` less than `SELECT COUNT(*) FROM udb_units`

**Phase to address:**
Data quality / build script phase — define the FTS5 extension strategy before writing any migration that touches `udb_units` or `udb_factions` schema.

---

### Pitfall 3: BSData Name-Matching is Non-Deterministic Across Machines and Silently Drops Units

**What goes wrong:**
The current match key is `unit.name.toLowerCase() + ":" + unit.faction_id`. This fails silently for:
- Apostrophe differences between Wahapedia and BSData (smart quotes vs ASCII)
- Units in multiple sub-faction `.cat` files all mapped to the same `faction_id` — e.g. all 12 Space Marine chapter `.cat` files map to `"SM"`, so the `seenPoints` set uses `name:SM` as the deduplication key, and the first matching `.cat` file wins

The root problem: `readdirSync` has no guaranteed ordering on Windows NTFS. The first-wins deduplication means the build is not reproducible between machines — running on a different machine or after adding a new `.cat` file can produce a different content hash and thus trigger a full re-import in users' apps.

Additionally, both `build-unit-db.ts` and `update-unit-database.ts` contain full duplicated copies of the BSData parsing logic. Any fix to name matching must be applied to both files or they will diverge.

**Why it happens:**
`readdirSync` ordering is implementation-defined. No `files.sort()` call exists in either script. The duplication of the build pipeline means fixes are frequently applied to one script and forgotten in the other.

**How to avoid:**
Add `files.sort()` immediately after `readdirSync` in both build scripts. This makes the first-wins deduplication deterministic. Add a normalization step for unit names before matching: strip smart quotes, normalize apostrophes to ASCII, trim whitespace. Log unmatched BSData units as a coverage report — currently these are silently skipped.

Extract the shared parsing logic into a `scripts/lib/bsdataParsing.ts` module imported by both scripts. This is the only safe way to ensure both scripts stay in sync.

**Warning signs:**
- Running the build on two different machines produces different `version` hashes for the same source CSV and `.cat` files
- The build log shows the same unit name appearing from multiple `.cat` files

**Phase to address:**
Data quality / build script phase — sort files and add a coverage report before attempting sub-faction work. Sub-faction matching adds another layer of ambiguity if the name-match problem is not solved first.

---

### Pitfall 4: Implementing Sub-factions as New udb_factions Rows Breaks FK Backfill, Army List Joins, and FTS5 in a Chain

**What goes wrong:**
Adding a `subfaction_id` as a new top-level faction (e.g. a row `{id: "BA", name: "Blood Angels"}` in `udb_factions`) triggers a chain of downstream impacts:

1. **Collection FK backfill**: Migration 039 backfills `units.udb_unit_id` via `WHERE uu.faction_id = f.wahapedia_faction_id`. If Blood Angels units now live under faction `"BA"` instead of `"SM"`, the existing collection units with `wahapedia_faction_id = "SM"` will fail to match. Their `udb_unit_id` is cleared on next re-import.

2. **Army list points JOIN**: `army_list_units` resolves points via `JOIN udb_unit_points ON udb_unit_points.unit_id = alu.udb_unit_id`. If some SM units now have different IDs due to sub-faction splitting, existing army list units referencing the old ID get NULL points silently.

3. **FTS5 faction_name**: `udb_search` is populated with `f.name` from `udb_factions`. If Blood Angels becomes a separate faction, searching "Space Marines" will no longer surface Blood Angels units. The faction picker on the database browser also breaks — "Space Marines" no longer shows chapter-specific units.

4. **getUdbOwnershipByFaction**: `WHERE uu.faction_id = $1` — calling with `"SM"` will miss Blood Angels units if they moved to `"BA"`.

**Why it happens:**
Sub-faction is conceptually a filter on top of a faction, not a new faction. Implementing it as a new top-level faction ID creates an apparent clean separation but breaks every query that uses `faction_id` as the primary grouping key. The Wahapedia canonical IDs (SM, NEC, etc.) are the stable anchors for the entire system.

**How to avoid:**
Model sub-factions as an additive column on `udb_units` (`subfaction TEXT`), not as a new `udb_factions` row. The faction picker stays faction-based; sub-faction becomes a secondary filter within the faction view. This preserves all existing FK joins, the FTS5 rebuild query, and the `getUdbOwnershipByFaction` aggregation. Keep `udb_factions` rows identical to the current set — never add new rows for chapters.

**Warning signs:**
- A new row in `udb_factions` whose `id` is not a canonical Wahapedia faction ID
- `getUdbOwnershipByFaction("SM")` returning a different count after the sub-faction migration than before

**Phase to address:**
Sub-faction schema and build script phase — validate the additive-column approach before writing the migration. Verify that `getUdbOwnershipByFaction` and the army list points JOIN return identical results with a data-layer test before and after the migration.

---

### Pitfall 5: The Rust Import Deletes and Re-inserts All udb_* Rows — French Translation Data Must Be in the JSON Payload, Not Applied Separately

**What goes wrong:**
`import_unit_database_inner` runs `DELETE FROM udb_units` (and all other udb_* tables) inside a transaction on every version change. Any French translation data stored directly in the database as a post-import fixup step (e.g. a separate UPDATE or a second migration) will be wiped on the next `pnpm build:udb` + redeploy cycle.

The pattern that fails: a migration adds `name_fr TEXT` columns to `udb_units`, then a separate Tauri command or startup script applies French translations via UPDATE. The next app update with a new `unit_database.json` triggers a full re-import, which DELETEs all rows and re-INSERTs without the French data.

**Why it happens:**
The DELETE-all + re-INSERT pattern is correct for canonical read-only data. Translation data has a more complex lifecycle — it comes from Wahapedia FR, may need manual corrections, and must survive re-imports. The import command has no "preserve this column" semantics.

**How to avoid:**
Include `name_fr`, `description_fr`, etc. as columns in `unit_database.json` arrays and bind them in the Rust INSERT statements. Translation data is baked into the JSON at `pnpm build:udb` time. Manual corrections are applied in the build script (a correction CSV or JSON overlay), not in the live database.

This requires extending `UnitDatabasePayload` in `lib.rs` with new optional fields (use `#[serde(default)]` so old JSON without the field parses cleanly) and adding `str_val(row, "name_fr")` bindings to each INSERT statement. Both build scripts and the Rust command must be updated in the same commit.

**Warning signs:**
- A migration that adds `name_fr TEXT` to `udb_units` without a corresponding change to `import_unit_database_inner`'s INSERT statement
- French data visible after first import but gone after a data update (install new app version)

**Phase to address:**
Translation schema phase — establish the JSON payload extension + Rust INSERT binding pattern before any UI work touches French columns.

---

### Pitfall 6: PlaybookRules Currently Returns null — Reviving It Requires Understanding What Data Was Lost When rules.db Was Eliminated

**What goes wrong:**
`PlaybookRules` (`src/features/units/PlaybookRules.tsx`) explicitly returns `null` with a comment that says stratagems, detachments, and shared abilities lost their data source when `rules.db` was eliminated (Phase 107). Reviving PlaybookTab content without checking what those old queries returned will produce either empty state or runtime errors.

The risk: `udb_unit_abilities` exists and has ability data, but it does not contain stratagems. Stratagems are detachment-specific rules that were in `rules_stratagems` (the old rules.db table). Attempting to display stratagems from `udb_unit_abilities` will return nothing — the `ability_type` values in Wahapedia CSV data do not include stratagem data. The EXT-01..03 deferral in `PROJECT.md` explicitly says "stratagems/detachments in canonical DB — deferred to v2."

**Why it happens:**
The PlaybookTab revival requirement in this milestone likely means using `udb_unit_abilities` for the datasheet abilities section — not restoring the full old PlaybookRules behavior. If the requirement is not explicit about scope, developers may attempt to restore the stratagem view, discover the data does not exist, and either stub it out again or introduce dead code paths.

**How to avoid:**
Define the exact scope of PlaybookTab revival: it means surfacing `udb_unit_abilities` grouped by `ability_type` more prominently. The existing `PlaybookDatasheet` component already renders these. PlaybookRules (stratagems, detachments) remains `return null` unless EXT-01..03 is explicitly in scope.

Audit actual `ability_type` values in the bundled data before writing any UI. Check what `ability_type` strings appear in `udb_unit_abilities` before assuming any specific grouping will have data.

**Warning signs:**
- Any new import of `getRulesDb`, `rules_stratagems`, or `rulesExtended.ts` — those are gone
- A component that queries `udb_unit_abilities WHERE ability_type = 'Stratagem'` expecting results

**Phase to address:**
PlaybookTab revival phase — audit actual `ability_type` values in the bundled data before writing a single line of UI. Document the scope explicitly as "canonical abilities only, no stratagems."

---

### Pitfall 7: Game Day Zustand State Becomes Stale When udb_unit_abilities Rows Are Reassigned New IDs on Re-import

**What goes wrong:**
`GameDayPage` uses Zustand with localStorage persistence for CP tracker, checklist state, and OPG (once-per-game) ability toggles. If Game Day enrichment extends to use `udb_unit_abilities` for ability cards, those cards may be keyed by `ability.id` (the SQLite AUTOINCREMENT column).

After a re-import (`import_unit_database_inner` runs DELETE-all + re-INSERT), all `udb_unit_abilities.id` values are reassigned because AUTOINCREMENT only guarantees monotonically increasing values, not value stability across delete-insert cycles. Previously-checked OPG abilities are now referenced by stale IDs that point to different abilities or nothing.

**Why it happens:**
AUTOINCREMENT in SQLite does not preserve IDs across DELETE + INSERT cycles. The row with ability text "Oath of Moment" may have had `id = 142` before re-import and `id = 219` after. Zustand with localStorage persistence has no awareness of this.

**How to avoid:**
Never key persistent Game Day state by `udb_unit_abilities.id`. Use a stable composite key: `unit_id + ":" + ability_name`. Both `udb_units.id` (Wahapedia string IDs) and ability names are stable across re-imports unless GW renames them. If an ability is renamed, the old key becomes dangling and defaults to "unused" — which is safe (user just re-toggles it).

Establish this key scheme before the Game Day enrichment phase adds any new Zustand persistence keys.

**Warning signs:**
- Any new Zustand key that stores an integer referencing a `udb_unit_abilities.id`
- A Game Day test with a hardcoded ability `id` integer

**Phase to address:**
Game Day enrichment phase — define the stable key scheme in the Zustand store shape before writing any new persistence keys.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `update-unit-database.ts` as a full copy of `build-unit-db.ts` logic | No shared module boundary, runs standalone | Every BSData parsing fix must be applied twice; the two scripts will diverge | Acceptable until a fix is applied to one and forgotten in the other — extract a shared module at that point |
| Hard-coded `FACTION_MAP` in both build scripts | Simple, readable | Adding a new GW faction requires editing both scripts and both maps | Acceptable while faction count is stable at 25 |
| `getSyncFreshness` stub always returning `'fresh'` | 12 consumers preserved for backward compat | Any new consumer that tries to use freshness semantics will be misled | Never acceptable for new consumers — document as "always returns 'fresh'" and do not add new callers |
| FTS5 with only 4 columns, no `name_fr` | No migration required | French queries miss French-only unit names unless `name_fr` is concatenated into existing columns | Acceptable if names are concatenated with pipe separator; not acceptable if French data is omitted from FTS5 entirely |
| Manual correction overlay for BSData mismatches | Low complexity | Corrections accumulate over GW updates and become maintenance debt | Acceptable for initial coverage improvement; must be reviewed on each GW data update |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| BSData XML + Wahapedia CSV matching | Using raw `name` strings from both sources without normalization | Normalize apostrophes (smart → ASCII), strip trailing whitespace, then lowercase before building the match key |
| Wahapedia FR as a translation source | Assuming FR CSV column names match EN CSV exactly | FR CSV headers may differ; validate headers against EN headers before use and log mismatches |
| Rust `UnitDatabasePayload` extension | Adding new fields to the JSON without `#[serde(default)]` on the Rust struct field | New fields without defaults will cause parse errors on users with a mismatched app + JSON version — always `#[serde(default)]` on new optional fields |
| FTS5 search with French accented characters | Assuming default tokenizer handles all French characters | SQLite FTS5 `unicode61` tokenizer handles basic accented characters; test `é`, `è`, `ç`, `à` explicitly before shipping |
| tauri-plugin-sql with new nullable columns | Running `ALTER TABLE udb_units ADD COLUMN name_fr TEXT` and querying it in TypeScript | The SQL works; but TypeScript query types must be updated or strict mode will flag missing properties |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| FTS5 rebuild with long ability text in two languages | Import takes noticeably longer at startup on first launch or version change | Keep FTS5 columns minimal; concatenate `name_fr` into `name` rather than adding a new column | At 3,000+ units with full ability text in two languages |
| Loading all `udb_unit_abilities` for all army list units in Game Day | GameDayPage stalls during initial render | Batch fetch by unit IDs: `WHERE unit_id IN (...)` or a JOIN on the army list unit IDs | At 30+ units in a game list |
| `getUdbUnitDetail` making 6 parallel SELECT queries per unit | Fine for single unit view; breaks in multi-unit contexts | Never call `getUdbUnitDetail` in a loop; use a batched join query for multi-unit contexts | At 10+ units queried simultaneously |
| React Query cache miss on sub-faction filter change | Every filter toggle triggers a DB round-trip | If `subfaction` is added to the query key, implement client-side filtering on the faction-level cache instead | Immediately on first filter toggle if not designed for client-side filtering |

---

## "Looks Done But Isn't" Checklist

- [ ] **Build script coverage report:** The script prints `points.length` but does not print how many Wahapedia units had no BSData match. "Extracted 1,200 points tier entries" looks complete even if 600 units have zero points. Add an explicit "X of N units have no points data" warning before declaring the data quality improvement done.
- [ ] **French columns in Rust INSERT:** Adding `name_fr` to the migration and to TypeScript types but forgetting to add `str_val(row, "name_fr")` to the Rust INSERT in `import_unit_database_inner` will silently write NULL to every row. The TypeScript type will claim the column exists; queries will return NULL for all French names with no error.
- [ ] **Migration registered in lib.rs:** Every new `.sql` file in `src-tauri/migrations/` must have a corresponding `Migration { version: N, ... }` entry in `get_migrations()`. The Rust build compiles without it; the migration simply never runs. The app appears to work but the new columns do not exist.
- [ ] **FTS5 content after import:** After extending the FTS5 rebuild query to concatenate French names, verify `SELECT COUNT(*) FROM udb_search` equals `SELECT COUNT(*) FROM udb_units`. A JOIN error in the INSERT...SELECT silently inserts zero rows without failing the transaction.
- [ ] **Sub-faction filter with no results:** A sub-faction filter UI returning 0 results looks identical to a broken filter. Add an explicit "No units for this sub-faction" empty state rather than showing the default "no faction selected" empty state.
- [ ] **PlaybookRules revival scope:** If `PlaybookRules` is changed from `return null` to render something, confirm the data source. The old implementation used `getRulesDb()` hooks that no longer exist. Any import of `useStratagems`, `useDetachmentAbilities`, or `getRulesDb` is a runtime error in the current architecture.
- [ ] **Zustand persist key versioning for Game Day:** If any existing Zustand store key changes shape (e.g. ability cards now use `unit_id:ability_name` instead of an integer index), add a Zustand `version` and `migrate` function. Without it, stale localStorage values cause hydration mismatches on first launch after update.
- [ ] **BSData sort determinism verified:** After adding `files.sort()`, run the build script twice from a clean state and confirm the output `version` hash is identical on both runs.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Boot-loop from seeded migration | HIGH | Requires manual database reset via restore-from-backup, or deleting `_sqlx_migrations` row directly. The migration repair system in `lib.rs` handles checksum mismatches but not semantic conflicts from re-applied DML. |
| French columns missing from Rust INSERT | LOW | Add the binding, bump the `unit_database.json` version hash (change any count by 1 in the build), re-build app. Version mismatch triggers a full re-import. No migration needed. |
| Sub-faction as new udb_factions rows breaks FK backfill | HIGH | Requires a new migration to re-backfill `units.udb_unit_id` for affected units and update `wahapedia_faction_id` on the `factions` table. High risk of silently unlinking collection units. Prevent by design — do not add new faction rows. |
| FTS5 empty after failed rebuild | MEDIUM | Trigger a manual re-import via the existing `import_unit_database` Tauri command. The version check bypasses re-import unless the JSON version is bumped — bump it by changing any count. |
| OPG state keyed by stale ability IDs | LOW | Old stale keys in localStorage are ignored (Zustand uses default "unused" state for unknown keys). User loses in-session OPG tracking, which resets per game anyway. No data loss. |
| BSData non-deterministic ordering | LOW | Add `files.sort()` to both build scripts — a one-line fix each. Re-build produces a new hash; re-import runs automatically on next user launch. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Boot-loop from seeded migration | Sub-faction schema phase + Translation schema phase | Confirm migration files contain only DDL; data is in JSON payload |
| FTS5 schema change requires DROP + recreate | Data quality / build script phase | Confirm `udb_search` column list unchanged after all schema migrations; `name_fr` concatenated into existing `name` column |
| BSData name-match non-determinism | Data quality / build script phase | `files.sort()` added to both scripts; build produces identical hash on two separate runs |
| Sub-faction as new udb_factions rows | Sub-faction schema phase | `udb_factions` row count unchanged after migration; `getUdbOwnershipByFaction("SM")` count unchanged |
| French columns wiped on re-import | Translation schema phase | `import_unit_database_inner` binds `name_fr`; re-import shows non-null French names for tested units |
| PlaybookRules scope confusion | PlaybookTab revival phase | No imports of `getRulesDb` or `rules_stratagems`; only `udb_unit_abilities` used; no stratagem data expected |
| Game Day OPG state keyed by mutable AUTOINCREMENT ID | Game Day enrichment phase | Zustand keys use `unit_id:ability_name` composite strings, not integer IDs |
| Migration not registered in lib.rs | Every new migration phase | `get_migrations().len()` matches migration file count; data-layer test passes on fresh install |

---

## Sources

- Direct inspection: `src-tauri/migrations/038_udb_schema.sql` — boot-loop incident note in migration DDL comment
- Direct inspection: `src-tauri/migrations/039_collection_udb_link.sql` — backfill approach and FK structure
- Direct inspection: `src-tauri/src/lib.rs` — `import_unit_database_inner` DELETE-all + re-INSERT transaction, FTS5 rebuild query, version check logic, `UnitDatabasePayload` struct
- Direct inspection: `scripts/build-unit-db.ts` — BSData name matching, deduplication, `readdirSync` without sort
- Direct inspection: `scripts/update-unit-database.ts` — full code duplication of build pipeline confirmed
- Direct inspection: `src/features/units/PlaybookRules.tsx` — explicit `return null` with EXT-03 deferral comment
- Direct inspection: `src/features/game-day/GameDayPage.tsx` — Zustand usage pattern
- Direct inspection: `src/db/queries/unitDatabase.ts` — FTS5 query pattern, FK join structure, `getUdbOwnershipByFaction`
- Codebase decision log in `PROJECT.md` — "Inline stub pattern for deferred features", "getSyncFreshness always returns 'fresh'", "Pre-built canonical unit database", "Reuse Wahapedia string IDs for udb_units"

---
*Pitfalls research for: HobbyForge v0.4.2 Unit Database 2.0 — sub-factions, French translation, BSData quality improvements*
*Researched: 2026-06-01*
