# Phase 107: Cleanup & Pipeline - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase eliminates the `rules.db` second database entirely, removes all dead sync infrastructure (CSV fetch pipeline, `getRulesDb()` client, `bulk_sync_rules` Rust command, `rw_*` table queries from `datasheets.ts` and `rulesExtended.ts`), redirects any surviving features to the canonical `udb_*` tables in `hobbyforge.db`, and establishes single-database architecture. A dev-side Node.js update script is added for future GW data changes (CLN-01), and a simplified "check for data updates" trigger replaces the full sync pipeline (CLN-04). No new features, no schema changes to `udb_*` tables, no UI layout redesigns.

</domain>

<decisions>
## Implementation Decisions

### rules.db Elimination
- **D-01:** The `src/db/rules-client.ts` module is deleted entirely. All `getRulesDb()` call sites (10 source files) must be redirected or removed.
- **D-02:** The Rust `bulk_sync_rules` command in `src-tauri/src/lib.rs` is removed, along with the `rules.db` file creation, `.add_migrations("sqlite:rules.db", get_rules_migrations())`, and the `get_rules_migrations()` function.
- **D-03:** The 4 rules.db migration files (`rules_001_schema.sql` through `rules_004_datasheet_points.sql`) are deleted — they defined `rw_*` tables that no longer exist.
- **D-04:** The `tauri.conf.json` reference to `rules.db` (if any) is removed.

### Dead Sync Code Removal
- **D-05:** `src/hooks/useRulesSync.ts` is deleted — this is the CSV fetch + bulk insert pipeline. All components importing it lose access to sync functionality.
- **D-06:** Sync utility libraries are deleted: `src/lib/parseWahapediaCsv.ts`, `src/lib/validateCsvHeaders.ts`, `src/lib/computeSyncDiff.ts`, `src/lib/syncFreshness.ts`, `src/lib/normalizePointsNames.ts`.
- **D-07:** `src/db/queries/syncErrors.ts` is deleted — sync error tracking is no longer needed.
- **D-08:** `src/db/queries/rulesSnapshot.ts` is deleted — rules snapshots were a sync-era feature.
- **D-09:** `src/db/queries/pointsImportHistory.ts` is deleted — points import history tracked CSV-based sync events.
- **D-10:** Sync-related type files are cleaned up: `src/types/datasheet.ts`, `src/types/pointsDelta.ts`, `src/types/unitOverride.ts` — remove sync-specific types while preserving any types still used by udb_* features.

### Datasheet Query Transition
- **D-11:** `src/db/queries/datasheets.ts` is deleted or gutted. Functions like `getDatasheetsByFaction()`, `getFullDatasheet()`, `getRulesSyncMeta()` queried `rw_*` tables in rules.db — they are fully superseded by `src/db/queries/unitDatabase.ts` which queries `udb_*` tables in hobbyforge.db.
- **D-12:** `src/db/queries/rulesExtended.ts` is deleted — detachment rules and stratagems queried from rules.db. These features (stratagems, detachment rules text) are EXT-03 deferred scope and not in the canonical udb_* schema. Any UI referencing them gets a graceful fallback or removal.
- **D-13:** `src/hooks/useDatasheet.ts` is redirected to use `unitDatabase.ts` queries instead of `datasheets.ts`. The hook's public API stays the same where possible to minimize component churn.
- **D-14:** `src/hooks/useRulesExtended.ts` is removed along with its query module.
- **D-15:** `src/db/queries/unitRulesMapping.ts` is deleted — the bridge between collection units and rules.db datasheets is no longer needed; `udb_unit_id` FK is the canonical link.

### Component Cleanup
- **D-16:** `src/features/rules-hub/RulesHubPage.tsx` is simplified — remove sync controls (SyncStatusCard, PointsDeltaSection) and CSV sync triggers. Keep the page as a wrapper around the database browser or redirect to `DatabaseBrowserPage.tsx`. The Rules Hub becomes a lightweight entry point to the unit database.
- **D-17:** `src/features/rules-hub/SyncStatusCard.tsx` and `src/features/rules-hub/PointsDeltaSection.tsx` are deleted.
- **D-18:** `src/features/units/PlaybookTab.tsx`, `PlaybookStats.tsx`, `PlaybookSyncDetails.tsx` — redirect datasheet queries from rules.db to udb_* equivalents. Playbook features showing unit stats/abilities should pull from `udb_units`, `udb_weapons`, `udb_abilities`.
- **D-19:** `src/features/units/DatasheetPicker.tsx` — redirect from `datasheets.ts` to `unitDatabase.ts` queries.
- **D-20:** `src/features/army-lists/DatasheetBrowserDialog.tsx` and `DetachmentPicker.tsx` — redirect or simplify. DetachmentPicker may need a stub since detachment data isn't in udb_* yet (EXT-03).

### Preserving User Data
- **D-21:** `rules_favorites` and `rules_notes` tables are already in hobbyforge.db (migration 019) and use `getDb()` — they are NOT affected. Their query modules (`rulesFavorites.ts`, `rulesNotes.ts`) and hooks stay intact.
- **D-22:** `unit_overrides` table and its query module (`unitOverrides.ts`) remain — they serve user manual overrides, not sync cache. However, any references to `getRulesDb()` in `unitOverrides.ts` must be verified and redirected to `getDb()` if needed.
- **D-23:** The `unit_strategy_notes.datasheet_id` column references old rw_datasheets IDs. Since entity IDs were reused (Phase 103 decision), these should already point to valid udb_unit IDs — verify and migrate if needed.

### Dev-Side Update Script (CLN-01)
- **D-24:** A Node.js script (e.g., `scripts/update-unit-database.mjs`) re-runs the Phase 103 data acquisition pipeline (Wahapedia CSV + BSData XML → `unit_database.json`).
- **D-25:** The script produces a human-readable diff report identifying: new units, removed units, changed points, changed abilities, changed keywords. Developer reviews the diff before committing updated JSON.
- **D-26:** The update script is dev-only (not shipped in the app bundle). It reuses the existing build script logic from Phase 103 (`scripts/build-unit-database.mjs` or similar).

### Simplified "Check for Updates" (CLN-04)
- **D-27:** A lightweight in-app trigger replaces the full sync pipeline. It checks a `udb_meta` version field against a known latest version (bundled or fetched from a version manifest).
- **D-28:** If an update is available, the app shows a notification — actual data update happens via app release (offline-first philosophy), not runtime re-sync. No CSV fetching at runtime.
- **D-29:** The existing `udb_meta` table (from Phase 103 schema) stores the current data version and build timestamp.

### Claude's Discretion
- Whether to merge Rules Hub page into Database Browser or keep as a thin redirect
- Exact approach for DetachmentPicker when detachment data isn't in udb_* yet (stub, hide, or simplified dropdown)
- Whether PlaybookSyncDetails component is deleted entirely or repurposed for udb_* data
- Migration number for any cleanup migrations needed (DROP of hobbyforge.db tables like sync_errors, rules_snapshot, points_import_history if they exist there)
- Whether to consolidate the build + update scripts or keep them separate
- Test file cleanup strategy — which test files under `tests/datasheet/` and `tests/rules-sync/` to delete vs. redirect

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### rules.db Infrastructure (DELETE targets)
- `src/db/rules-client.ts` — rules.db connection singleton; entire file deleted
- `src/db/queries/datasheets.ts` — rw_* table queries; superseded by unitDatabase.ts
- `src/db/queries/rulesExtended.ts` — detachment/stratagem queries from rules.db
- `src/db/queries/syncErrors.ts` — sync error tracking
- `src/db/queries/rulesSnapshot.ts` — rules snapshot queries
- `src/db/queries/pointsImportHistory.ts` — points import history
- `src/db/queries/unitRulesMapping.ts` — bridge table no longer needed
- `src/hooks/useRulesSync.ts` — CSV sync pipeline hook
- `src/hooks/useDatasheet.ts` — currently reads from rules.db, must redirect
- `src/hooks/useRulesExtended.ts` — rules.db extended queries hook

### Sync Utilities (DELETE targets)
- `src/lib/parseWahapediaCsv.ts` — CSV parser for Wahapedia data
- `src/lib/validateCsvHeaders.ts` — CSV header validation
- `src/lib/computeSyncDiff.ts` — sync diff computation
- `src/lib/syncFreshness.ts` — sync freshness checks
- `src/lib/normalizePointsNames.ts` — points name normalization

### Rust Backend
- `src-tauri/src/lib.rs` — `bulk_sync_rules` command + rules.db init + rules migrations registration
- `src-tauri/migrations/rules_001_schema.sql` through `rules_004_datasheet_points.sql` — rules.db migrations to delete

### Components to Modify/Delete
- `src/features/rules-hub/RulesHubPage.tsx` — sync controls removal
- `src/features/rules-hub/SyncStatusCard.tsx` — DELETE
- `src/features/rules-hub/PointsDeltaSection.tsx` — DELETE
- `src/features/units/PlaybookTab.tsx` — redirect to udb_* queries
- `src/features/units/PlaybookStats.tsx` — redirect to udb_* queries
- `src/features/units/PlaybookSyncDetails.tsx` — DELETE or redirect
- `src/features/units/DatasheetPicker.tsx` — redirect to unitDatabase.ts
- `src/features/army-lists/DatasheetBrowserDialog.tsx` — redirect
- `src/features/army-lists/DetachmentPicker.tsx` — simplify (no detachment data in udb_*)

### Canonical Data Layer (KEEP / redirect targets)
- `src/db/queries/unitDatabase.ts` — canonical udb_* queries, the replacement for datasheets.ts
- `src/hooks/useUnitDatabase.ts` — canonical unit database hooks
- `src/db/client.ts` — single DB connection (hobbyforge.db)
- `src-tauri/migrations/038_udb_schema.sql` — canonical udb_* schema

### Preserved User Data
- `src/db/queries/rulesFavorites.ts` — already on hobbyforge.db, KEEP
- `src/db/queries/rulesNotes.ts` — already on hobbyforge.db, KEEP
- `src/db/queries/unitOverrides.ts` — user overrides, KEEP

### Tests (cleanup)
- `tests/datasheet/` — most test files reference rules.db queries; DELETE or redirect
- `tests/rules-sync/` — sync pipeline tests; DELETE

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` § "Cleanup & Pipeline" — CLN-01 through CLN-04
- `.planning/ROADMAP.md` § "Phase 107" — Success criteria (4 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/queries/unitDatabase.ts`: Complete query layer for udb_* tables — already provides faction lists, unit details, weapon/ability lookups, FTS search. This is the canonical replacement for `datasheets.ts`.
- `src/hooks/useUnitDatabase.ts`: React Query hooks with proper cache keys for all udb_* queries.
- `scripts/build-unit-database.mjs` (Phase 103): The build pipeline that parses Wahapedia CSV + BSData XML. The update script (CLN-01) extends this.

### Established Patterns
- `getDb()` singleton for all hobbyforge.db queries — the single connection pattern is already established
- `$1, $2` positional params for all SQL
- React Query invalidation patterns established across all existing hooks
- Feature module deletion pattern: remove query → remove hook → remove component → remove types → remove tests

### Integration Points
- `src/app/router.tsx` — Rules Hub route may need updating if page is merged/redirected
- `src/components/common/AppSidebar.tsx` — Sidebar navigation item for Rules Hub
- `src/features/data-health/` — Diagnostic queries in `diagnostics.ts` reference both `getDb()` and `getRulesDb()` — the rules.db queries must be removed or redirected
- `src/features/army-lists/ArmyListDetailPage.tsx` and `ArmyListDetailSheet.tsx` — may reference sync-era components
- `src-tauri/tauri.conf.json` — plugin-sql database configuration

### Blast Radius
- **10 source files** import `getRulesDb` directly
- **34 files** reference Wahapedia/CSV/sync concepts
- **4 Rust migrations** for rules.db
- **~8 test files** under `tests/datasheet/` and `tests/rules-sync/`
- **6 utility libs** in `src/lib/` for sync operations

</code_context>

<specifics>
## Specific Ideas

- The transition should be invisible to users — everything that worked via rules.db queries now works via udb_* queries. The user sees the same data, same Playbook features, same Rules Hub browsing.
- Detachment rules and stratagems (from `rulesExtended.ts`) are NOT in the canonical udb_* schema — these features lose their data source. The UI should degrade gracefully (hide sections, show "coming soon", or remove entirely). This is acceptable since EXT-03 tracks adding this data to the canonical DB.
- The dev-side update script is intentionally separate from the app — offline-first philosophy means data updates ship with app releases, not runtime syncs.
- `diagnostics.ts` currently queries both databases — the rules.db diagnostic counts need to be either removed or redirected to udb_* table counts.

</specifics>

<deferred>
## Deferred Ideas

- EXT-03: Stratagems and detachment rules in canonical DB — currently only in rules.db, lost during this transition
- Bulk re-link wizard for collection units with broken datasheet_id references — future Data Health enhancement
- Runtime data sync from a CDN/update server — contradicts offline-first philosophy, not planned
- Migration to drop hobbyforge.db tables that were sync-only (sync_errors, rules_snapshot, points_import_history) — can be done in this phase or deferred

None beyond existing v2 deferred items — discussion stayed within phase scope

</deferred>

---

*Phase: 107-Cleanup & Pipeline*
*Context gathered: 2026-05-30*
