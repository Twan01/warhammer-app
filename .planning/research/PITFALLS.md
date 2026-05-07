# Pitfalls Research

**Domain:** HobbyForge v2.6 Rules Sync 2.0 / Rules Data Hub — adding sync metadata, manual overrides, and version comparison to an existing dual-database Tauri 2 + React 19 + SQLite app with a working delete-all / re-insert sync pipeline
**Researched:** 2026-05-07
**Confidence:** HIGH — derived from direct codebase inspection of `lib.rs`, `useRulesSync.ts`, `rules-client.ts`, `datasheets.ts`, `datasheet.ts`, all rules migrations, and the v2.6 roadmap

---

## Critical Pitfalls

### Pitfall 1: Manual Overrides Silently Destroyed by the Delete-All Re-insert Pattern

**What goes wrong:**
`bulk_sync_rules` opens a transaction, deletes all rows from every `rw_*` table (FK checks disabled), then re-inserts from the CSV payload. Any user-entered manual override stored as a column on an `rw_*` table is destroyed on every sync. After re-sync, override values disappear with no error, no warning, and no recovery path.

**Why it happens:**
The delete-all pattern is correct for read-only imported data. It becomes destructive the moment any user-writable data lives in the same rows. The natural instinct when adding an override is to add a nullable column (e.g., `rw_datasheets.points_override INTEGER`) directly to the imported table, which makes it a victim of the DELETE cascade on the next sync.

**How to avoid:**
Store manual overrides in a separate table in `hobbyforge.db` — never in `rules.db`. The pattern is:

```sql
-- In hobbyforge.db (additive migration 015 or higher)
CREATE TABLE IF NOT EXISTS rules_overrides (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type   TEXT NOT NULL, -- 'datasheet', 'model', 'ability', 'keyword'
  entity_id     TEXT NOT NULL, -- Wahapedia TEXT id (the rw_* primary key)
  field         TEXT NOT NULL, -- 'points', 'M', 'T', 'Sv', etc.
  value         TEXT NOT NULL, -- stored as TEXT; UI casts to correct type
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (entity_type, entity_id, field)
);
```

At display time, merge the override onto the imported row client-side: if `rules_overrides` has an entry for this `(entity_type, entity_id, field)`, show the override value with a visual indicator. The `bulk_sync_rules` transaction never touches `hobbyforge.db`.

**Warning signs:**
- A nullable column appears in a `rules_002_*.sql` or later rules migration.
- Any `UPDATE rw_*` statement appears in the sync path.
- A PR adds `points_override`, `stat_override`, or similar fields to a `rw_*` table.

**Phase to address:**
Phase 46 (Manual Overrides). The schema must be designed before any override UI is built. Write a test: add an override, trigger a sync, assert the override row still exists.

---

### Pitfall 2: Version Comparison Snapshot Has Nothing to Compare Against

**What goes wrong:**
The Phase 46 "version comparison" feature is built but produces no useful output because there is no pre-sync snapshot to diff against. The current `rw_sync_meta` table stores only `last_sync_at` and `wahapedia_version` — it stores no copy of the previous data state. Showing "what changed" requires knowing what the values were before the delete-all replaced them.

**Why it happens:**
The delete-all pattern gives perfect correctness for the current state but destroys all history. Developers assume a version string comparison ("version 2024-03-01 → 2024-04-15, something changed") is enough to power a diff UI, but a version bump tells the user only that something changed — not what changed or whether it affects their units.

**How to avoid:**
Take a targeted snapshot of the rows the user cares about before the DELETE pass. The minimal sufficient approach:

1. Before the transaction's DELETE loop, read the current values of every `rw_datasheets`, `rw_datasheet_models`, and `rw_datasheets_wargear` row that is linked to a user's unit (via `unit_strategy_notes.datasheet_id` in `hobbyforge.db`) and store them in a `rw_sync_changelog` table (or a JSON blob in `rw_sync_meta`).
2. After the re-insert, compare the new values against the snapshot and record the differences.
3. Expose the differences to the UI via a `getRulesSyncChangelog()` query.

Alternatively, store a JSON snapshot of the pre-sync state in a `rw_sync_meta.previous_snapshot TEXT` column. Either approach requires the snapshot to be taken inside the same Rust command before the DELETE.

**Warning signs:**
- The changelog or comparison UI is built in TypeScript/React before the Rust snapshot logic exists.
- `rw_sync_meta` has no column other than `last_sync_at` and `wahapedia_version`.
- Phase 46 starts before Phase 45 (sync metadata) is complete.

**Phase to address:**
Phase 45 (Sync Metadata) must define the snapshot/changelog schema. Phase 46 (Version Comparison) reads from it. Never build the UI before the data structure exists.

---

### Pitfall 3: tauri-plugin-sql Cannot ATTACH Rules.db to the Main DB Connection

**What goes wrong:**
The developer wants to write a single query joining `hobbyforge.db` and `rules.db` (e.g., to show override values next to imported stats in one result set). They attempt `ATTACH DATABASE '...' AS rules` via `tauri-plugin-sql`. The plugin manages a connection pool per registered database URL; `ATTACH` modifies a specific connection, not the pool. The plugin may silently refuse the ATTACH, route subsequent queries to a different pooled connection that has no ATTACH, or fail with an undocumented error.

**Why it happens:**
SQLite supports `ATTACH DATABASE` natively and it works in direct `sqlx` usage. The plugin's connection pool breaks the assumption that a specific connection is used for every query. The alternative plugin `silvermine/tauri-plugin-sqlite` explicitly advertises ATTACH support, implying the official plugin does not.

**How to avoid:**
Never rely on `ATTACH` via `tauri-plugin-sql`. Apply one of two proven patterns this codebase already uses:

1. **Dual query + client-side merge (current pattern):** Query `rules.db` for imported data, query `hobbyforge.db` for overrides, merge client-side in the hook. This is how `getFullDatasheet` + `getDatasheetIdForUnit` work across two databases now.

2. **Rust command for heavy cross-DB joins:** If a join is too expensive to do client-side (e.g., showing all user units with their corresponding imported stats and overrides in one list), implement it as a Tauri command in `lib.rs` that opens both databases with `sqlx`, performs the join in Rust, and returns the merged result as a serialized payload. This is the `bulk_sync_rules` pattern.

Never attempt a new ATTACH-based query pattern without first verifying it works in tauri-plugin-sql under the pool architecture.

**Warning signs:**
- An `ATTACH DATABASE` or `sqlite_master` ATTACH statement appears in any TypeScript query file.
- A query in `datasheets.ts` or a new `overrides.ts` references a table from the other database without a Rust command wrapper.

**Phase to address:**
Phase 46 (Manual Overrides) when override+import merged views are first needed. Establish the dual-query merge pattern before any UI work.

---

### Pitfall 4: Sync Metadata Row Counts Are Not Invalidated After Sync

**What goes wrong:**
Phase 45 adds per-table row counts to `rw_sync_meta` (e.g., `datasheets_count INTEGER`, `stratagems_count INTEGER`). The sync UI shows these counts. After a re-sync, the React Query cache for `RULES_SYNC_META_KEY` is stale because `useRulesSync.onSuccess` only invalidates `RULES_SYNC_META_KEY`, `["datasheets-by-faction"]`, and `["datasheet"]`. New keys added in Phase 45 (e.g., `["rules-sync-changelog"]`, `["rules-overrides"]`) are not invalidated. The freshness indicators on the UI show pre-sync values until the user manually refreshes.

**Why it happens:**
`useRulesSync.onSuccess` has a hardcoded list of three invalidation keys. Every new query key added in Phase 45 must be explicitly added to this list, but the connection is non-obvious — a developer adding `useRulesSyncChangelog()` may not look at `useRulesSync.ts` to add the invalidation.

**How to avoid:**
Apply the cache invalidation symmetry rule already established in this codebase. When Phase 45 adds `useRulesSyncChangelog`, `useRulesSyncRowCounts`, or similar hooks, add their query keys to `useRulesSync.onSuccess` in the same commit. Document this requirement as a comment block at the top of `useRulesSync.ts`:

```typescript
// ── Sync invalidation contract ────────────────────────────────────────
// Every hook that reads from rules.db state that changes after a sync
// MUST have its queryKey listed here. Adding a new rw_* hook without
// updating this list is a cache asymmetry bug.
// Keys: RULES_SYNC_META_KEY, ["datasheets-by-faction"], ["datasheet"],
//       ["rules-sync-changelog"], ["rules-overrides"] (add as needed)
```

**Warning signs:**
- `useRulesSync.onSuccess` has fewer invalidation calls than there are hooks reading from `rules.db`.
- A freshness indicator or row count does not update immediately after a sync without a page refresh.
- A new `use*` hook for rules data is merged without a corresponding `invalidateQueries` line in `useRulesSync.ts`.

**Phase to address:**
Phase 45 (Sync Metadata). Enforce via a lint-style comment contract in `useRulesSync.ts`.

---

### Pitfall 5: Wahapedia CSV Column Format Changes Break Silent Parse

**What goes wrong:**
Wahapedia CSVs use `|` as the column delimiter (not `,`). The `parseWahapediaCsv` utility parses them correctly today. If Wahapedia adds a new column, removes a column, renames a column, or changes the delimiter, `parseWahapediaCsv` continues to succeed — it returns row objects with different keys than expected. The `bulk_sync_rules` Rust command receives `HashMap<String, serde_json::Value>` rows and uses `str_val(row, "column_name")` which returns `None` (silently mapped to empty string) for any missing key. The sync completes with zero errors but inserts empty values for the changed columns. The user sees blank stats or missing abilities and has no indication that the import silently failed.

**Why it happens:**
The `str_val` / `i64_val` helpers are designed to be tolerant of missing keys (they return `Option`, and the callers fall back to empty string or 0). This is correct for optional fields but silently hides structural changes to required fields.

**How to avoid:**

1. After each CSV fetch, log the actual column names to the sync metadata (`rw_sync_meta.column_signature TEXT`) so structural changes are detectable.
2. Add a TypeScript-side header validation step in `useRulesSync.ts` before calling `invoke("bulk_sync_rules", ...)`. For each critical CSV, assert that the expected column names are present in the parsed header row. If a required column is missing, throw with a message like `"Datasheets.csv: expected column 'faction_id' not found — Wahapedia format may have changed"`.
3. Expose the validation error in the sync UI as a named error, not a generic "sync failed" message.

The validation does not need to be exhaustive. Check only the columns that map to `NOT NULL` columns in `rw_*` tables (e.g., `id`, `name`, `datasheet_id`).

**Warning signs:**
- Sync completes with status "success" but the PlaybookTab shows empty stats or abilities for a datasheet that previously had data.
- `rw_datasheets.faction_id` has a high NULL count after sync.
- Row counts in `rw_sync_meta` are non-zero but PlaybookTab content is empty.

**Phase to address:**
Phase 44 (Sync Pipeline Extension) when new CSV types are added. Add validation for all 12 CSV files before extending to new ones. Verification: test with a CSV that has a renamed column; assert sync throws a named error.

---

### Pitfall 6: Sync Failure Corrupts rules.db When Transaction Is Not Atomic

**What goes wrong:**
The current `bulk_sync_rules` command is atomic: it opens a transaction, deletes all rows, inserts all rows, commits. If any step fails, the rollback leaves `rules.db` intact with the previous data. If Phase 44 extends the command by adding new CSV data types outside the transaction (e.g., as a separate TypeScript-side insert loop after `invoke` returns), a partial failure leaves `rules.db` in an inconsistent state: some tables contain new data, others contain the pre-sync data. The PlaybookTab may show abilities for a datasheet that no longer exists, or show datasheets with no associated models.

**Why it happens:**
Extending the sync by adding a second TypeScript-side mutation after the Rust command is the path of least resistance for developers who do not want to modify the Rust code. The atomic contract of `bulk_sync_rules` is not obvious from the TypeScript call site.

**How to avoid:**
All rules.db writes during a sync must happen inside the single `bulk_sync_rules` transaction. If new CSV data types (Phase 44) require new tables, extend the `BulkSyncPayload` struct in Rust and add the new table's insert loop to the existing transaction. Never write to `rules.db` from TypeScript after the Rust command returns. Document this constraint with a comment above the `bulk_sync_rules` invocation in `useRulesSync.ts`.

**Warning signs:**
- A new `db.execute(...)` call on `rules.db` appears in `useRulesSync.ts` after the `invoke("bulk_sync_rules", ...)` call.
- A Phase 44 implementation adds a TypeScript-side insert loop for stratagems or detachments "for now" with a plan to move to Rust "later."
- `rw_sync_meta.last_sync_at` is updated before all tables are populated.

**Phase to address:**
Phase 44 (Sync Pipeline Extension). Any new table must be added to the Rust transaction, not a separate TypeScript call. Verify with a test: simulate a failure mid-insert; assert all tables revert to their pre-sync state.

---

### Pitfall 7: Sync Metadata Migration Added to rules.db Without Updating the Override Table Migration Ordering

**What goes wrong:**
Phase 45 adds new columns to `rw_sync_meta` (e.g., row counts, error log, column signature). These require a `rules_003_*` migration. Phase 46 adds `rules_overrides` to `hobbyforge.db`. The developer writes the `rules_003` migration but registers it in `get_rules_migrations()` in `lib.rs` without incrementing the version correctly. Or the developer creates the hobbyforge.db migration as version 15 but the codebase already has an unshipped migration at that number in the unstaged files. Migration version collisions cause `tauri-plugin-sql` to apply the wrong SQL silently (if the version already ran) or skip the new migration entirely.

**Why it happens:**
Two separate migration sequences (hobbyforge.db at version 14, rules.db at version 2) are maintained in `lib.rs`. The Glob output shows `rules_002_wargear_abilities.sql` in the same flat `migrations/` directory as `014_session_recipe_link.sql`. A developer who doesn't look at both sequences can assign a version number that conflicts with the wrong sequence. Also, the `git status` shows `rules_002_wargear_abilities.sql` as an untracked file — confirming this migration exists on disk but may not be registered, which is a pre-existing ambiguity.

**How to avoid:**
- Hobbyforge.db: next available is migration **015**.
- Rules.db: next available is **rules_003**.
- Use the filename prefix convention strictly: `015_*.sql` for hobbyforge.db, `rules_003_*.sql` for rules.db. Never mix the namespaces.
- After adding any migration, run the app from a clean state (delete the `.db` files from `%APPDATA%/com.hobbyforge.app/`) and verify the app starts with no migration errors.
- Add a comment at the top of `lib.rs` tracking the highest migration number for each DB: `// hobbyforge.db: up to 014 | rules.db: up to 002`.

**Warning signs:**
- The `rules_002_wargear_abilities.sql` file appears as untracked in `git status` (confirmed in current repo state) — verify it is registered in `get_rules_migrations()` before assuming it ran.
- Any `.sql` file added to the `migrations/` directory that is not registered in `lib.rs`.
- A new migration file has a version number lower than or equal to an existing file's version in the same sequence.

**Phase to address:**
Phase 42 (Architecture Audit) must confirm `rules_002_wargear_abilities.sql` is registered and has run. Phase 45 must register `rules_003` before writing any code that depends on the new columns.

---

### Pitfall 8: Override + Import Merge Produces Stale Display After Override Edit

**What goes wrong:**
The override display works correctly after a sync (merged client-side in the hook). The user edits an override value in the UI. The `useCreateRulesOverride` mutation runs, inserts into `rules_overrides` in `hobbyforge.db`, and invalidates `["rules-overrides"]`. But the PlaybookTab still shows the old (pre-override) value because `useDatasheet` has `staleTime: Infinity` and is not invalidated. The override is in the DB but the cached `FullDatasheet` still shows the imported value.

**Why it happens:**
`staleTime: Infinity` is correct for imported data (it only changes on sync). But the hook is used to derive the merged display that includes overrides. When the override table changes, the derived display must also update. The invalidation of `["rules-overrides"]` alone is insufficient because `useDatasheet` caches the pre-merge result.

**How to avoid:**
When an override mutation runs, also invalidate the datasheet key for the affected unit:
```typescript
qc.invalidateQueries({ queryKey: ["datasheet", unitId] });
qc.invalidateQueries({ queryKey: ["rules-overrides", entityType, entityId] });
```
Or: restructure the PlaybookTab to keep the import data and override data in separate query results and merge them in the component — the import cache stays infinite, the override cache invalidates normally. This is more composable and avoids cache coupling.

The second approach (separate queries, merge in component) is preferred because it keeps `staleTime: Infinity` on the immutable imported data and normal stale behavior on the mutable override data.

**Warning signs:**
- Editing an override value does not update the PlaybookTab without a page navigation.
- `useDatasheet.staleTime` is changed to a short value to work around the stale display — this causes unnecessary re-syncs to rules.db.
- `useCreateRulesOverride.onSuccess` does not invalidate any datasheet key.

**Phase to address:**
Phase 46 (Manual Overrides). Design the query split before building the override edit UI.

---

### Pitfall 9: Faction Name Mismatch Between HobbyForge and Wahapedia Breaks DatasheetPicker After Schema Extension

**What goes wrong:**
`resolveWahapediaFactionIdByName` uses fuzzy LIKE matching between the user's HobbyForge faction name and `rw_factions.name` values. This is fragile when extended rules tables are added. New tables (`rw_stratagems`, `rw_detachments`, `rw_detachment_abilities`) use `faction_id` (TEXT, the Wahapedia faction code like "SM", "TAU") not the full name. If the DatasheetPicker or a new StratagemsTab tries to filter stratagems by faction using the HobbyForge faction name, it must go through the same name→code resolution. If the fuzzy match fails (e.g., user has faction named "Tau Empire" but Wahapedia uses "T'au Empire"), the filter silently returns zero results.

**Why it happens:**
The name resolution pattern works well for the base DatasheetPicker but was not designed to be used across all extended rules tables. Each new table-filtered component independently tries to resolve the faction name, duplicating the fragile logic and multiplying the failure surface.

**How to avoid:**
Establish `useWahapediaFactionId` as the single source of truth for faction resolution. Any new hook or component that filters extended rules tables by faction must call `useWahapediaFactionId(localFactionName)` first and handle the null return gracefully (show "all factions" view or a "faction not found" callout). Do not inline the name-resolution SQL in any new query file.

Consider adding a user-visible faction mapping UI in Phase 42 or 43: if the automatic resolution fails, let the user explicitly link their HobbyForge faction to a Wahapedia faction code. Store this mapping in `hobbyforge.db` and use it preferentially over the fuzzy match.

**Warning signs:**
- A new `getStratagemsByFaction(factionName: string)` query file contains a LIKE clause matching against `rw_factions.name` — duplicating the resolution pattern.
- A stratagems panel shows zero results for a user whose faction name has a punctuation difference from Wahapedia's naming.
- `resolveWahapediaFactionIdByName` is called from more than one query module.

**Phase to address:**
Phase 43 (Extended Rules Schema). Assess faction resolution coverage before wiring any new table to the UI.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store override as a column on `rw_*` table | No new table needed | Destroyed on every sync — unrecoverable | Never |
| Add a TypeScript-side insert loop after `invoke("bulk_sync_rules")` | Avoids Rust changes | Breaks atomicity guarantee; partial failure corrupts rules.db | Never |
| Keep `rw_sync_meta` with only `last_sync_at` and `wahapedia_version` | No migration needed | Phase 46 version comparison has nothing to diff against | Acceptable until Phase 45 — must be extended then |
| Fuzzy faction name match in each new rules query module | Quick to implement | Silently returns zero results for non-matching faction names; maintenance burden multiplies | Never — centralize in `useWahapediaFactionId` |
| Skip snapshot before DELETE in Rust command | Simpler Rust code | Version comparison feature is impossible without pre-sync state | Not acceptable if Phase 46 is in scope |
| Use client-side ATTACH DATABASE via tauri-plugin-sql | Eliminates dual-query pattern | Breaks under pool routing; silently queries the wrong connection | Never — use dual-query or Rust command |
| `staleTime: Infinity` on a hook that returns merged override+import data | No unnecessary re-fetches | Override edits are not reflected until page navigation | Never — separate the imported and user-mutable data into distinct hooks |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Wahapedia CSV pipe-delimited format | Assume format is stable; parse without header validation | Validate expected column names are present before invoking Rust sync; emit named errors on structural change |
| `bulk_sync_rules` Rust transaction | Add TypeScript-side rules.db writes after `invoke()` returns | All rules.db writes belong inside the single Rust transaction; extend `BulkSyncPayload` struct instead |
| `rules.db` migration versioning | Assign version numbers without checking both DB sequences | Maintain `// hobbyforge.db: up to N | rules.db: up to M` comment in `lib.rs`; always use `rules_00N_` prefix |
| `rules_002_wargear_abilities.sql` (currently untracked) | Assume it ran because the file exists | Verify registration in `get_rules_migrations()` in Phase 42 audit before any Phase 43 work |
| `rw_sync_meta.id = 1` singleton row | Add per-table sync metadata as additional rows with different IDs | Keep the singleton pattern; add columns to the singleton row for each new metadata field |
| Cross-DB query (hobbyforge.db + rules.db) | Use ATTACH DATABASE via tauri-plugin-sql | Query each DB independently, merge in hook/component, or use a Rust command for heavy joins |
| `useDatasheet` staleTime: Infinity | Re-use the same hook for merged override+import display | Keep `useDatasheet` for pure import data; add a separate `useRulesOverridesForUnit` hook for override data |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Snapshot of all 10k+ rules rows before each sync | Sync takes 10+ seconds; UI freezes | Snapshot only rows linked to user's units (inner join with `unit_strategy_notes.datasheet_id`) | At first sync if snapshot is unbounded |
| N+1 override lookups in PlaybookTab (one query per field) | PlaybookTab renders slowly with many override indicators | Batch `SELECT * FROM rules_overrides WHERE entity_id = $1` once per datasheet, index on `(entity_type, entity_id)` | Noticeable at 5+ overrides per datasheet |
| Changelog diff computed in TypeScript over all rw_* tables | Version comparison UI loads slowly | Compute diff in Rust during sync; store results in `rw_sync_changelog`; UI only reads pre-computed diff | With 2500+ datasheets, client-side diff is 50k+ row comparisons |
| `useRulesSyncMeta` staleTime: Infinity with new row-count columns | Freshness indicators never update after sync | Add `RULES_SYNC_META_KEY` to `useRulesSync.onSuccess` invalidation (already present) and ensure all new metadata keys are also listed | Immediately if new query keys are not invalidated |
| Sync logs accumulate unbounded rows in `rw_sync_error_log` | DB size grows; log query gets slow | Store only the last 10 sync attempts; DELETE old rows inside the sync transaction before inserting new ones | At ~100 syncs (minor concern for a personal app) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Override indicator looks the same as imported data | User cannot tell which values they entered vs. what was imported | Show a distinct visual badge ("Override" or pencil icon) next to any value sourced from `rules_overrides` |
| Version comparison shows all 2500 datasheet changes | User is overwhelmed; important unit changes are buried | Filter comparison to only show changes affecting units in the user's collection (inner join with `units.datasheet_id`) |
| Sync failure shows generic "Error" with no actionable detail | User does not know if Wahapedia is down, format changed, or they have no internet | Show named error categories: "Network error", "Format changed — column X missing", "Partial insert — rules.db rolled back" |
| "Last synced: 3 days ago" freshness indicator with no refresh button | User has no path to update stale data | Put a refresh action directly on the freshness indicator; do not require navigation to a settings page |
| Override edit UI is a raw text input for stat values | User enters "3+" where the field expects an integer; import shows "3+" but override shows error | Show the field's current imported value as placeholder; validate against the expected data type for each field |
| Sync progress has no visual feedback for 12 CSV downloads | User thinks the app is frozen during the 5–30 second sync | Show per-file progress ("Fetching Stratagems.csv 7/12…") in the sync modal; the `Promise.all` in `useRulesSync` already knows which file is being fetched |

---

## "Looks Done But Isn't" Checklist

- [ ] **rules_002 registration confirmed:** Verify `rules_002_wargear_abilities.sql` is in `get_rules_migrations()` and has actually run (query `SELECT name FROM sqlite_master WHERE type='table'` in rules.db; `rw_stratagems` must exist)
- [ ] **Override survives sync:** Add a manual override, trigger a full sync, assert the override row still exists in `rules_overrides` and is displayed in PlaybookTab
- [ ] **Sync atomicity on failure:** Simulate a mid-sync failure (e.g., truncated stratagems payload); assert all rw_* tables contain the pre-failure data, not partial new data
- [ ] **Cache invalidation after sync:** After re-sync, all freshness indicators, row counts, and changelog views update without a page navigation
- [ ] **Cache invalidation after override edit:** Edit an override value; assert PlaybookTab shows the new override immediately without navigation
- [ ] **Faction resolution for extended tables:** Open StratagemsTab (Phase 43+) for a faction; assert stratagems are shown (not an empty list caused by name mismatch)
- [ ] **Version comparison is scoped:** Version comparison shows only changes affecting units in the user's collection, not all 2500 datasheets
- [ ] **Wahapedia column validation:** Simulate a CSV with a renamed required column; assert sync fails with a named error, not silently succeeds with empty fields
- [ ] **Migration version correctness:** `rules_003_*.sql` (Phase 45) registers as version 3 in `get_rules_migrations()`; no collision with hobbyforge.db sequence

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Overrides stored in rw_* table (destroyed by sync) | HIGH | Cannot recover deleted data. Write a new hobbyforge.db migration adding `rules_overrides` table; display a one-time notice that overrides must be re-entered; never add columns to rw_* tables again |
| Sync failure partially populated rules.db | MEDIUM | The Rust transaction rollback should prevent this; if it occurs, the user can re-sync (bulk_sync_rules is idempotent once running correctly); investigate whether a TypeScript-side write bypassed the transaction |
| Changelog has nothing to compare against (no pre-sync snapshot) | MEDIUM | Add pre-sync snapshot logic to `bulk_sync_rules`; run one sync to establish the baseline; the first comparison will show "no prior data" rather than a diff |
| rules_002 migration not registered (untracked file) | LOW | Add it to `get_rules_migrations()` in `lib.rs` as version 2 (it uses `CREATE TABLE IF NOT EXISTS` so re-running is safe); rebuild; tables will be created if missing |
| Faction name mismatch showing zero stratagems | LOW | Add `useWahapediaFactionId` fallback that returns `null` and shows "faction not mapped" callout with a manual mapping action; no data loss |
| Stale PlaybookTab after override edit | LOW | Add missing `invalidateQueries(["datasheet", unitId])` to override mutation `onSuccess`; takes effect on next mutation |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Overrides destroyed by sync (Pitfall 1) | Phase 46 — schema design before any override UI | Test: add override, sync, assert override row persists |
| No snapshot for version comparison (Pitfall 2) | Phase 45 — define snapshot schema before Phase 46 | Test: sync twice; assert changelog contains field-level diffs for changed values |
| ATTACH DATABASE via tauri-plugin-sql (Pitfall 3) | Phase 46 — establish dual-query pattern at start of override feature | Code review: no ATTACH statement in any TypeScript file |
| New query keys not invalidated after sync (Pitfall 4) | Phase 45 — add comment contract to useRulesSync.ts | Test: sync; assert all rules-reading hooks return fresh data without navigation |
| CSV format change silent failure (Pitfall 5) | Phase 44 — add header validation before all 12 CSV files | Test: mutate a CSV header; assert sync throws named error |
| Sync atomicity broken by TypeScript writes (Pitfall 6) | Phase 44 — code review policy: no db.execute on rules.db in useRulesSync | Test: simulate mid-insert failure; assert pre-sync data is intact |
| Migration version collision (Pitfall 7) | Phase 42 audit — confirm rules_002 is registered; Phase 45 uses rules_003 | Startup with clean DB files: no migration errors in console |
| Stale display after override edit (Pitfall 8) | Phase 46 — separate import and override query hooks | Test: edit override; assert PlaybookTab updates without navigation |
| Faction name mismatch on extended tables (Pitfall 9) | Phase 43 — use useWahapediaFactionId in all faction-filtered views | Test: filter stratagems by faction with a non-exact name match; assert non-empty result or "faction not mapped" UI |

---

## Sources

- Direct inspection: `src-tauri/src/lib.rs` — confirmed delete-all / re-insert transaction pattern; `BulkSyncPayload` struct; `rw_sync_meta` singleton write inside transaction
- Direct inspection: `src/hooks/useRulesSync.ts` — confirmed 12 CSV files fetched, `invoke("bulk_sync_rules")` called once, 3 invalidation keys in `onSuccess`
- Direct inspection: `src-tauri/migrations/rules_001_schema.sql` — `rw_sync_meta` has only `last_sync_at` and `wahapedia_version`
- Direct inspection: `src-tauri/migrations/rules_002_wargear_abilities.sql` — all extended tables exist in SQL; git status shows this file is currently untracked
- Direct inspection: `src/db/queries/datasheets.ts` — dual-query pattern (separate getRulesDb / getDb calls, merged client-side); `resolveWahapediaFactionIdByName` fuzzy match pattern
- Direct inspection: `src/hooks/useDatasheet.ts` — `staleTime: Infinity` on all rules hooks; `RULES_SYNC_META_KEY` used for meta invalidation
- Direct inspection: `src/types/datasheet.ts` — `FullDatasheet` interface has no override fields; `RulesSyncMeta` has no row count fields
- Codebase pattern: `src/db/client.ts` + `src/db/rules-client.ts` — two separate singleton connections; no ATTACH
- Codebase pattern: `.planning/PROJECT.md` Key Decisions — "weapon_name as TEXT copy in unit_loadout_wargear — Cross-database FK to rules.db not supported in SQLite"
- Research: SQLite ATTACH DATABASE documentation (sqlite.org/lang_attach.html) — ATTACH works per-connection, not per-pool
- Research: silvermine/tauri-plugin-sqlite GitHub — explicitly advertises ATTACH support as a differentiator from the official plugin, implying official plugin does not support it cleanly
- Research: Wahapedia data export page (wahapedia.ru/wh40k10ed/the-rules/data-export/) — format is CSV with pipe delimiter; spec is in an external Excel file, format can change without notice
- Research: SQLite `sqldiff.exe` documentation — pre-sync snapshot is necessary for meaningful diff output; delete-all destroys comparison baseline

---
*Pitfalls research for: HobbyForge v2.6 Rules Sync 2.0 / Rules Data Hub*
*Researched: 2026-05-07*
