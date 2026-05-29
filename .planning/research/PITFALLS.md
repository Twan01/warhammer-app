# Domain Pitfalls: Unit Database / Canonical 40k Data Hub

**Domain:** Adding a canonical unit database to an existing Tauri 2 + React 19 + SQLite desktop app (HobbyForge v0.4.0)
**Researched:** 2026-05-29
**Sources:** Codebase archaeology (37 migrations, debug logs, source code), prior incident reports from .planning/debug/

---

## Critical Pitfalls

Mistakes that cause rewrites or major data loss.

---

### Pitfall 1: Migration registration omission silently creates missing tables on fresh installs

**What goes wrong:** A new migration file added to `src-tauri/migrations/` is never registered in `src-tauri/src/lib.rs` `get_migrations()`. The app appears to work on a developer machine (because the table already exists in their local DB), but fresh installs and the data-layer test suite fail with "no such table" errors.

**Why it happens:** Tauri plugin-sql does not auto-discover migration files — every migration must be explicitly listed in the Rust migration array. Because the developer's local DB already has all tables from prior runs, the app never triggers the missing-migration path during development.

**Consequences:** Production build ships with broken schema. Users on fresh installs get cryptic runtime errors. The `unit_database` tables are never created.

**Prevention:**
- Always add migration registrations in `lib.rs` in the same commit as the SQL file.
- The migration parity test in `tests/data-layer/` catches this — run it before every build.
- Set `EXPECTED_SCHEMA_VERSION` in `DbHealthGate.tsx` to match the new highest-numbered migration prefix.
- Real incident: Migration 032 (army_list_snapshots) was missing from lib.rs and caused the army list delete crash (see `.planning/debug/army-list-delete-crash.md`).

**Detection:** Fresh-install test or migration parity test fails with "no such table: unit_database".

**Phase:** Phase 1 (Data Acquisition & Schema) — every new table must pass the parity test before moving to Phase 2.

---

### Pitfall 2: Name-based migration of collection units has a documented ~20% mismatch rate

**What goes wrong:** Migrating existing collection `units.name` values to a FK pointing at `unit_database.id` requires matching the user's free-text name ("Canoptek Spyder") against the canonical database name ("Canoptek Spyders"). The 20% mismatch rate documented in the debug files is a floor — user-entered names include abbreviations, kitbash names, wrong capitalisation, and names not in the database at all.

**Why it happens:** The existing system allowed completely free-text unit names. The `unit_rules_mapping` table and `normalizePointsNames()` function were built because exact matching fails at scale. The same problem resurfaces for the ID migration without any fuzzy-match infrastructure on the hobbyforge side.

**Consequences:** A migration that does `UPDATE units SET unit_database_id = (SELECT id FROM unit_database WHERE name = units.name)` will silently leave ~20% of collection units with `unit_database_id = NULL`. Army list points then fall back to the manual `units.points` column with no indication the FK migration failed.

**Prevention:**
- Never do an automatic hard migration to a NOT NULL FK for `unit_database_id`. Keep the column nullable.
- Run the backfill as a best-effort pass using fuzzy-matching logic mirroring `normalizePointsNames`, not exact string equality.
- After migration, expose an "unlinked units" diagnostic in Data Health showing how many collection units lack a database FK, with a one-click picker to resolve each one.
- Do not remove `units.name`, `units.points`, or the `synced_unit_points` cache until all units are confirmed linked by the user.
- The migration must be additive: add `unit_database_id INTEGER REFERENCES unit_database(id) ON DELETE SET NULL`, populate what can be auto-matched, leave the rest NULL.

**Detection:** Post-migration diagnostic shows X of N units without `unit_database_id`.

**Phase:** Phase 3 (Collection Integration) — the migration backfill must be treated as advisory, not authoritative.

---

### Pitfall 3: Seeding canonical data via the migration system causes an unrecoverable boot loop on any bad row

**What goes wrong:** If the canonical database is seeded via a large INSERT migration (inserting 2,500+ datasheets and related rows in one SQL file), tauri-plugin-sql will attempt to run the entire migration as one transaction. Any failure — a constraint violation, a NULL in a NOT NULL column, a name encoding issue — rolls back the entire migration. The DB is left at the previous schema version. On re-launch, the migration runs again and fails again indefinitely. The app is unlaunchable.

**Why it happens:** tauri-plugin-sql migrations are one-shot. There is no rollback mechanism beyond restoring from backup. A single bad row in a 2,500-row seed file makes the app permanently broken on fresh install.

**Prevention:**
- Do not seed canonical data through the migration system at all. Use a dedicated Rust command (`load_unit_database`) called once at startup if the `unit_database` table is empty.
- The command reads a bundled JSON/SQLite file from the Tauri resource directory and bulk-inserts with FK checks temporarily disabled, mirroring the existing `bulk_sync_rules` pattern.
- Migrations should contain only schema (CREATE TABLE, ALTER TABLE, CREATE INDEX) — never data.

**Detection:** Fresh install fails at startup with a migration error; app is stuck in a boot loop.

**Phase:** Phase 1 — the data loading strategy must be decided before any schema is finalized.

---

### Pitfall 4: Removing rules.db before all cross-DB query patterns are migrated causes silent NULL cascades

**What goes wrong:** The current architecture has 7+ query sites that read from `rules.db` via `getRulesDb()`: faction pickers, datasheet detail views, stratagem browsers, Game Day mode, detachment pickers, points resolvers, and the sync diff engine. Removing `rules.db` before every one of these is migrated to query `hobbyforge.db` will silently return empty results — not errors — because the queries are guarded by `enabled: !!rulesSynced` or similar conditional hooks.

**Why it happens:** The dual-DB pattern means query failures look exactly like "no data synced yet" — the UI shows empty states rather than error states. There is no compiler error when `getRulesDb()` is removed; only runtime query failures surface the gap.

**Consequences:** Game Day mode shows no stratagems. Detachment picker is empty. Playbook tab shows no datasheet. These are silent failures that look like normal "unsynced" states, making them very hard to detect in testing.

**Prevention:**
- Grep for all `getRulesDb()` call sites before touching rules.db elimination. Currently: `useRulesSync.ts`, `DbHealthGate.tsx`, `datasheets.ts`, `rulesExtended.ts`, and every query function touching `rw_*` tables.
- Create a checklist of every `rw_*` table reference and mark each one migrated before dropping `rules-client.ts`.
- Keep `rules.db` and `getRulesDb()` alive until Phase 5 (Cleanup), even if empty, to avoid breaking import chains.
- Add a test per query function that verifies it returns data from the new `unit_database` path, not the old `rw_*` path.

**Detection:** Integration test that queries each formerly-rules.db-backed hook and asserts non-empty results.

**Phase:** Phase 5 (Cleanup & Data Update Pipeline) — do not attempt rules.db elimination until all consumers are migrated in Phases 2–4.

---

### Pitfall 5: The tauri-plugin-sql connection pool causes stale reads after bulk writes — this is a documented recurring issue in this codebase

**What goes wrong:** After the `bulk_sync_rules` Rust command writes thousands of rows, TypeScript queries via the connection pool read stale data because a different pool connection holds an older WAL snapshot. This is exactly what caused the "synced_unit_points stores BSData names" incident (`.planning/debug/rules-sync-full-loss.md`). The same issue will occur when loading the canonical unit database: a Rust command writes 2,500+ units, and the immediate React Query `onSuccess` invalidation triggers reads before the WAL checkpoint propagates.

**Why it happens:** SQLite WAL mode allows readers to continue from an older snapshot while a writer is active. After the writer commits, pool readers may still hold their snapshot reference until the pool creates a new connection or an explicit checkpoint is issued.

**Consequences:** The unit database browser loads but `SELECT COUNT(*) FROM unit_database` returns 0 or a stale count. Users see an empty faction browser immediately after database load, then correct results on next app launch.

**Prevention:**
- After any Rust command that bulk-writes to hobbyforge.db, emit `PRAGMA wal_checkpoint(TRUNCATE)` via a follow-up TypeScript query before invalidating React Query caches.
- This is already implemented in `useRulesSync.ts` for `rules.db` — apply the same pattern to the new `load_unit_database` Rust command.
- Add a startup-time checkpoint in `DbHealthGate` for hobbyforge.db (mirroring the existing rules.db checkpoint logic) to recover from any missed checkpoints.

**Detection:** Unit browser shows 0 factions immediately after first database load, then works after restart.

**Phase:** Phase 1 — the data loading Rust command must include a checkpoint call. `DbHealthGate` must check `unit_database` row count on startup.

---

## Moderate Pitfalls

---

### Pitfall 6: Army list snapshots reference units by collection ID — backfill migration must not change existing unit IDs

**What goes wrong:** `army_list_snapshots` stores a JSON blob of army list state keyed by `unit_id` (the collection's integer PK). After Phase 3 adds `unit_database_id` to collection units, old snapshot blobs still contain the original integer `unit_id` references. These remain valid as long as collection unit IDs are unchanged.

**Prevention:**
- The migration must add `unit_database_id` as a new column — it must never change or remove the `unit_id` column.
- Document explicitly that snapshots are keyed by collection unit ID, not database unit ID. Do not add a `unit_database_id` key to snapshot blobs.

**Phase:** Phase 3 — verify snapshot restore works before and after migration.

---

### Pitfall 7: `army_list_units.unit_id ON DELETE RESTRICT` blocks collection unit deletion even when the user wants to replace with a database-linked unit

**What goes wrong:** The current schema has `army_list_units.unit_id REFERENCES units(id) ON DELETE RESTRICT`. When a user tries to delete a collection unit that is in an army list, the delete fails. After Phase 3, users will want to "replace" a manually-entered collection unit with its database-linked equivalent. The RESTRICT constraint will block simple deletion.

**Prevention:**
- Do not relax the RESTRICT constraint — it prevents accidental data loss and is intentional.
- Build a "replace unit" flow: creates a new collection unit linked to the database, migrates army list membership from old to new unit in a transaction, then deletes the old unit.
- The transaction must clear `leader_attached_to_id` self-references before the cascade fires — this pattern is already implemented in `deleteArmyList` (see `.planning/debug/army-list-delete-crash.md`).

**Phase:** Phase 3 (Collection Integration).

---

### Pitfall 8: BSData XML .cat file format is not stable — parse it offline, never at runtime

**What goes wrong:** BSData uses a complex nested XML schema (`gameSystemRef`, `selectionEntries`, `selectionEntryGroups`, `constraints`, `profiles`) that is frequently reorganised. The existing `parseBsdataExtended.ts` and `fetchBsdataPoints.ts` parse a specific version of this format. Any BSData schema change makes the parser silently produce empty results (0 enhancements, 0 leader targets) with no error.

**Prevention:**
- For the canonical database build, parse BSData XML exactly once offline during the dev-side data acquisition script. Commit the parsed output to source control.
- Do not include BSData XML parsing in the app binary.
- The dev-side update script should validate parsed row counts against known minimums (e.g., "Space Marines must have at least 80 datasheets") and fail loudly if counts are suspiciously low.

**Phase:** Phase 1 (Data Acquisition) — the data pipeline is offline; the app itself never touches XML.

---

### Pitfall 9: 40k.app scraping is legally and technically fragile — use it as UX reference only

**What goes wrong:** 40k.app may have rate limiting, Cloudflare protection, or terms of service prohibiting scraping. Even if it works initially, the site can change its HTML structure at any time, breaking the scraper silently.

**Prevention:**
- The dev-side data acquisition script is the only thing that talks to external sites — the app is fully offline.
- Treat 40k.app as a UX reference, not a primary data source. Wahapedia CSVs are more stable (pipe-delimited, versioned) and already have working parsers in the codebase.
- BSData XML is the authoritative source for points tiers and composition rules.
- For the initial build: Wahapedia CSVs for stats/abilities/keywords + BSData XML for points/composition. This mirrors the existing sync pipeline but produces a one-time offline artifact.
- Add a `--dry-run` mode to the data acquisition script that reports row counts per faction without writing to DB.

**Phase:** Phase 1 — the acquisition strategy must be validated before committing to a data source.

---

### Pitfall 10: DELETE-all + re-INSERT for data updates destroys FKs from collection and army list tables

**What goes wrong:** The existing `replaceSyncedEnhancements`, `replaceSyncedLoadoutOptions`, etc. use DELETE-all + re-INSERT. This is acceptable for cache tables that have no user-authored children. But once collection units or army lists reference `unit_database` by FK, any DELETE-all re-INSERT of `unit_database` would set all `unit_database_id` FKs to NULL (via ON DELETE SET NULL) or fail (via ON DELETE RESTRICT), destroying the linking work of Phase 3.

**Prevention:**
- The canonical `unit_database` table must never be DELETE-all + re-INSERTed once collection units or army lists reference it by FK.
- Dev-side updates must use UPSERT (`INSERT OR REPLACE`) keyed on a stable canonical ID (the Wahapedia `id` field, a 9-digit zero-padded string already used as the PK in `rw_datasheets`).

**Phase:** Phase 5 (Data Update Pipeline) — the update strategy must be UPSERT-safe before any FKs point into `unit_database`.

---

### Pitfall 11: Loading 2,500+ datasheets eagerly blocks the faction browser UI

**What goes wrong:** Loading all datasheets with all related tables (stats, weapons, abilities, keywords) eagerly on the faction browser page will cause a visible stall (300–800ms). The initial load and any post-update invalidation will block the UI thread.

**Prevention:**
- Load only the faction list on the faction picker page (a cheap `SELECT DISTINCT faction_id, faction_name FROM unit_database` — ~30 rows).
- Load unit list (names + roles only, no stats/weapons) only when a faction is selected.
- Load full datasheet data only when a specific unit is selected.
- Use `staleTime: Infinity` for all `unit_database` queries — this data only changes on app updates, not at runtime.
- The global search query must be debounced (300ms) and search against a pre-built search index (unit name + keywords denormalized into a single searchable TEXT column) rather than full-table LIKE queries across joined tables.

**Phase:** Phase 2 (Database Browser UI) — lazy loading is an architectural requirement, not an optimization.

---

### Pitfall 12: Pre-v0.4.0 backups cannot be restored on a v0.4.0 app — update version mismatch warnings

**What goes wrong:** After absorbing rules.db content into hobbyforge.db, the canonical unit database is not regenerable from a sync — it is the source of truth. A backup predating v0.4.0 migration will be missing the `unit_database` tables entirely. The restore preview/validation flow already checks schema compatibility, but the minimum compatible version needs updating.

**Prevention:**
- The backup mechanism itself (VACUUM INTO via Rust) is unchanged and correct.
- Update the schema compatibility check in the restore flow to warn if the backup's schema version predates the first `unit_database` migration.
- Test the version mismatch warning with the new minimum version before shipping.

**Phase:** Phase 1 (Schema) — determine the new minimum backup schema version and document it.

---

### Pitfall 13: `cmdk` CommandItem value collision on duplicate unit names in the database picker

**What goes wrong:** The existing `UnitPickerDialog` had a bug where `value={unit.name}` caused duplicate-named units (multiple "Intercessors" from different factions) to collide in cmdk's internal state, preventing `onSelect` from firing correctly (see `.planning/debug/army-list-detachment-units.md`). The new "add from database" picker will have the same pattern — Space Marine and Death Guard units sharing names.

**Prevention:**
- Always use `value={String(unit.id)}` or `value={\`${unit.faction_id}-${unit.id}\`}` as the cmdk `CommandItem` value, never the unit name.
- This fix is already applied to the collection unit picker — copy the same pattern to any new database pickers.

**Phase:** Phases 2–3 (Browser UI and Collection Integration).

---

### Pitfall 14: `NULL` `unit_database_id` must propagate correctly through the points COALESCE chain

**What goes wrong:** After Phase 3, the points resolution COALESCE chain must handle `unit_database_id = NULL` for unlinked units. If the JOIN to `unit_database` is written as INNER JOIN (not LEFT JOIN), unlinked units are excluded from army list total calculations silently.

**Prevention:**
- Use `LEFT JOIN unit_database ud ON ud.id = u.unit_database_id` — never INNER JOIN.
- Test the COALESCE chain with four cases: (a) database link + no override, (b) database link + override, (c) no database link + manual points, (d) no database link + no points.
- Update `resolveUnitPoints()` in `src/lib/` — it is the single source of truth for points computation.

**Phase:** Phase 4 (Army List Integration).

---

## Minor Pitfalls

---

### Pitfall 15: `catch` blocks without `console.error` make production debugging impossible — a recurring pattern in this codebase

**What goes wrong:** Three separate debug incidents (faction-creation-fails.md, collection-datasheet-link.md, army-list-detachment-units.md) were caused or prolonged by catch blocks that showed a generic toast without logging the actual error. The unit database introduces new mutation paths (load_unit_database, backfill collection links) that will fail in unanticipated ways.

**Prevention:**
- Every catch block in mutation handlers must include `console.error("[ComponentName]", err)` before the toast.
- Pattern: `catch (err) { console.error("[useLoadUnitDatabase]", err); toast.error(\`Failed: \${err instanceof Error ? err.message : String(err)}\`); }`.
- This is a code review gate — no new mutation handler ships without error logging.

**Phase:** All phases — apply to every new handler as it is written.

---

### Pitfall 16: Self-referencing FK deletion order on `army_list_units.leader_attached_to_id` — already caused one production crash

**What goes wrong:** This has burned the project once already (`.planning/debug/army-list-delete-crash.md`). When deleting army list units during a "replace with database unit" flow, the self-referencing FK (`leader_attached_to_id REFERENCES army_list_units(id) ON DELETE SET NULL`) requires that leader attachment references be cleared before the referenced rows are deleted. SQLite does not guarantee deletion order within a CASCADE.

**Prevention:**
- Any mutation that deletes `army_list_units` rows must first `UPDATE army_list_units SET leader_attached_to_id = NULL WHERE leader_attached_to_id IN (...)` before the DELETE.
- This pattern is already implemented in `deleteArmyList` — copy it exactly for any new unit deletion path.

**Phase:** Phase 3 (Collection Integration) — any flow that deletes or replaces collection units must follow this pattern.

---

## Integration Pitfalls Specific to This Codebase

### The dual-DB client singleton problem during single-DB migration

During the transition period (Phases 1–4), both `getRulesDb()` and `getDb()` are active. Any new query code written in Phase 2 or 3 that accidentally imports `getRulesDb()` instead of `getDb()` for a `unit_database` query will appear to work in development (both singletons are healthy) but will fail for users who have never synced (rules.db is empty). The singleton pattern in both `client.ts` and `rules-client.ts` has no type-level distinction — a wrong import is a silent runtime failure.

**Prevention:** Add a lint comment to `rules-client.ts` explicitly marking it as deprecated after Phase 1. Grep for new `getRulesDb()` imports in code review as a mandatory step.

### The "no nested transactions" constraint applies to all new bulk operations

`tauri-plugin-sql` cannot nest transactions (documented in PROJECT.md Key Decisions). The unit database load command, any backfill migration code, and any "replace unit" flow must follow the flat inline transaction pattern established in `saveRecipeGraph` and `deleteArmyList` — not call helper functions that internally issue `BEGIN`. Wrapping a helper that calls `BEGIN` inside another `BEGIN` crashes the plugin.

### React Query `staleTime: Infinity` requires explicit invalidation on database updates

All `unit_database` queries should use `staleTime: Infinity` because the data never changes at runtime. But this means that after a dev-side data update (the Phase 5 update pipeline), React Query will serve the old cached data until the app is restarted or queries are explicitly invalidated. The dev-side update must invalidate all `unit_database`-related keys, or the user must restart the app. This is acceptable behaviour for a desktop app — document it explicitly.

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Data Acquisition & Schema | Data seed via migration causes boot loop on bad row | Use Rust startup command, not migration, for data population |
| Phase 1: Data Acquisition & Schema | Migration not registered in lib.rs | Run migration parity test before every build |
| Phase 1: Data Acquisition & Schema | WAL stale reads after bulk write | Add explicit WAL checkpoint in Rust command after load |
| Phase 1: Data Acquisition & Schema | Pre-v0.4.0 backups incompatible after schema change | Update restore version mismatch warning with new minimum version |
| Phase 2: Database Browser UI | Eager load of 2,500+ datasheets blocks UI | Faction → unit list → unit detail lazy load; staleTime: Infinity |
| Phase 2: Database Browser UI | cmdk value collision on duplicate unit names | value={String(unit.id)}, never value={unit.name} |
| Phase 3: Collection Integration | 20% name mismatch in backfill migration | Nullable FK, fuzzy match, Data Health diagnostic for unlinked units |
| Phase 3: Collection Integration | RESTRICT FK blocks unit replacement | Build explicit "replace unit" transaction flow |
| Phase 3: Collection Integration | Self-referencing leader FK deletion order | Clear leader_attached_to_id before DELETE (copy deleteArmyList pattern) |
| Phase 3: Collection Integration | Army list snapshots break if collection unit IDs change | Never change collection unit_id; only add unit_database_id |
| Phase 4: Army List Integration | NULL unit_database_id excluded by INNER JOIN | LEFT JOIN only; test all four null/non-null combinations |
| Phase 5: Cleanup & Data Update Pipeline | DELETE-all re-INSERT destroys FKs from collection/army lists | UPSERT pattern using stable Wahapedia ID as PK |
| Phase 5: Cleanup & Data Update Pipeline | rules.db consumers not fully migrated before drop | Grep all getRulesDb() call sites; checklist per rw_* table |
| All phases | Catch blocks without error logging | console.error required in every mutation catch block |

---

## Sources

- `src-tauri/migrations/` — 37 migration files; schema evolution history and FK patterns
- `src/hooks/useRulesSync.ts` — existing sync pipeline with WAL checkpoint workarounds (Pitfall 5 precedent)
- `src/components/common/DbHealthGate.tsx` — startup repair logic for stale points cache
- `.planning/debug/rules-sync-full-loss.md` — WAL stale read incident 2026-05-29 (Pitfall 5 real evidence)
- `.planning/debug/rules-sync-not-persisting.md` — 20% name mismatch documentation (Pitfall 2 real evidence)
- `.planning/debug/army-list-delete-crash.md` — migration registration omission + self-FK deletion order (Pitfalls 1 and 16)
- `.planning/debug/army-list-detachment-units.md` — cmdk value collision + silent error swallowing (Pitfalls 13 and 15)
- `.planning/debug/faction-creation-fails.md` — catch block anti-pattern (Pitfall 15)
- `.planning/debug/collection-datasheet-link.md` — cross-DB query failure invisibility (Pitfall 15)
- `src-tauri/migrations/030_bsdata_extended.sql` — DELETE-all + re-INSERT pattern for synced tables (Pitfall 10)
- `src-tauri/migrations/031_army_list_v3.sql` — self-referencing FK on army_list_units (Pitfall 16)
- `src/db/rules-client.ts` — dual-DB singleton pattern
- `.planning/milestone-unit-database.md` — milestone brief with stated risks and mitigations

---
*Pitfalls research for: v0.4.0 Unit Database — Canonical 40k Data Hub*
*Researched: 2026-05-29*
