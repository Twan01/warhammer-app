# Phase 107: Cleanup & Pipeline - Research

**Researched:** 2026-05-30
**Domain:** Dead code removal, database consolidation, dev-side tooling
**Confidence:** HIGH

## Summary

Phase 107 is a surgical cleanup phase: eliminate the second SQLite database (`rules.db`), remove all dead sync infrastructure (~30 files), redirect surviving features to the canonical `udb_*` tables in `hobbyforge.db`, and create a dev-side update script for future data changes. No new UI features, no schema changes.

The codebase audit confirms 10 source files import `getRulesDb()` directly, 6 sync utility libraries exist in `src/lib/`, 4 Rust migration files for rules.db, and ~24 test files under `tests/datasheet/` (plus 1 in `tests/rules-sync/`). The `unitDatabase.ts` query layer and `useUnitDatabase.ts` hooks already provide complete replacements for the `datasheets.ts` data -- the redirect targets are battle-tested from Phases 103-106.

The main complexity is not the deletion itself but the number of components that consume `useRulesSyncMeta()` (11 call sites across dashboard, data-health, army-lists, game-day, rules-hub, and units features) and `useRulesExtended` hooks (stratagems/detachments with no udb_* equivalent -- these must degrade gracefully since EXT-03 is deferred).

**Primary recommendation:** Execute in two waves -- (1) delete all dead code and redirect surviving hooks, (2) add the dev-side update script and simplified update check.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: `src/db/rules-client.ts` deleted entirely. All `getRulesDb()` call sites (10 source files) redirected or removed.
- D-02: Rust `bulk_sync_rules` command removed, along with rules.db init, `.add_migrations("sqlite:rules.db", ...)`, and `get_rules_migrations()`.
- D-03: 4 rules.db migration files deleted.
- D-04: `tauri.conf.json` reference to `rules.db` removed.
- D-05: `src/hooks/useRulesSync.ts` deleted.
- D-06: Sync utility libraries deleted: `parseWahapediaCsv.ts`, `validateCsvHeaders.ts`, `computeSyncDiff.ts`, `syncFreshness.ts`, `normalizePointsNames.ts`.
- D-07: `src/db/queries/syncErrors.ts` deleted.
- D-08: `src/db/queries/rulesSnapshot.ts` deleted.
- D-09: `src/db/queries/pointsImportHistory.ts` deleted.
- D-10: Sync-related type files cleaned up.
- D-11: `src/db/queries/datasheets.ts` deleted or gutted (superseded by `unitDatabase.ts`).
- D-12: `src/db/queries/rulesExtended.ts` deleted. Stratagems/detachment rules features lose data source (EXT-03 deferred).
- D-13: `src/hooks/useDatasheet.ts` redirected to `unitDatabase.ts` queries.
- D-14: `src/hooks/useRulesExtended.ts` removed.
- D-15: `src/db/queries/unitRulesMapping.ts` deleted.
- D-16: `RulesHubPage.tsx` simplified -- sync controls removed.
- D-17: `SyncStatusCard.tsx` and `PointsDeltaSection.tsx` deleted.
- D-18: Playbook components redirected from rules.db to udb_* equivalents.
- D-19: `DatasheetPicker.tsx` redirected to `unitDatabase.ts`.
- D-20: `DatasheetBrowserDialog.tsx` and `DetachmentPicker.tsx` redirected/simplified.
- D-21: `rules_favorites` and `rules_notes` tables/queries/hooks preserved (already on hobbyforge.db).
- D-22: `unit_overrides` table and query module preserved (already uses `getDb()`).
- D-23: `unit_strategy_notes.datasheet_id` verified for udb_unit_id compatibility.
- D-24: Dev-side Node.js update script re-runs data acquisition pipeline.
- D-25: Script produces human-readable diff report.
- D-26: Update script is dev-only, reuses `build-unit-db.ts` logic.
- D-27: Lightweight in-app "check for updates" trigger replaces full sync.
- D-28: Update availability shows notification only; actual update via app release.
- D-29: `udb_meta` table stores current data version and build timestamp.

### Claude's Discretion
- Whether to merge Rules Hub page into Database Browser or keep as a thin redirect
- Exact approach for DetachmentPicker when detachment data is not in udb_* (stub, hide, or simplified dropdown)
- Whether PlaybookSyncDetails is deleted entirely or repurposed
- Migration number for cleanup DROP migrations (sync_errors, rules_snapshot, points_import_history tables)
- Whether to consolidate build + update scripts or keep separate
- Test file cleanup strategy -- which test files to delete vs. redirect

### Deferred Ideas (OUT OF SCOPE)
- EXT-03: Stratagems and detachment rules in canonical DB
- Bulk re-link wizard for collection units
- Runtime data sync from CDN
- Migration to DROP hobbyforge.db sync-only tables (can be deferred)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLN-01 | Dev-side update script for re-scraping and producing data diffs | Existing `scripts/build-unit-db.ts` provides the base pipeline. Extend with diff logic comparing old vs. new JSON. |
| CLN-02 | Eliminate rules.db -- all data in single hobbyforge.db | 10 `getRulesDb()` call sites mapped. Rust backend has `get_rules_migrations()` + `bulk_sync_rules` + `.add_migrations("sqlite:rules.db", ...)`. `tauri.conf.json` line 52 has `"sqlite:rules.db"`. |
| CLN-03 | Remove dead sync code (rules-client.ts, rw_* query modules, CSV fetch pipeline) | Full file inventory compiled: 6 lib files, 5 query modules, 2 hooks, 6 UI components to delete, 4 Rust migrations. |
| CLN-04 | Keep optional "check for points updates" as simplified sync feature | `udb_meta` table already has `version` and `built_at` columns. Simple version comparison against bundled data version. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| rules.db elimination | Backend (Rust) | Frontend (TS) | Rust owns DB init, migrations, commands; frontend owns query clients |
| Dead sync code removal | Frontend (TS) | Backend (Rust) | ~30 TS files vs. 1 Rust file + 4 migration files |
| Hook redirection | Frontend (TS) | -- | React Query hooks + query modules only |
| Dev-side update script | Dev tooling (Node.js) | -- | Runs outside app runtime entirely |
| Check for updates trigger | Frontend (TS) | -- | Reads udb_meta version, renders notification |

## Standard Stack

No new libraries needed. This phase only deletes code and reuses existing infrastructure.

### Core (already in project)
| Library | Purpose | Relevance to Phase |
|---------|---------|-------------------|
| `@tauri-apps/plugin-sql` | SQLite access | Remove `rules.db` connection registration |
| `@tanstack/react-query` | Data hooks | Redirect hooks from rules.db to udb_* queries |
| `@xmldom/xmldom` | XML parsing in Node.js | Already used by `build-unit-db.ts`; reused by update script |

## Architecture Patterns

### System Architecture Diagram

```
BEFORE (Phase 106):
  Components -> useDatasheet/useRulesExtended -> datasheets.ts/rulesExtended.ts -> getRulesDb() -> rules.db
  Components -> useUnitDatabase              -> unitDatabase.ts                 -> getDb()      -> hobbyforge.db

AFTER (Phase 107):
  Components -> useDatasheet (redirected)    -> unitDatabase.ts -> getDb() -> hobbyforge.db
  Components -> useUnitDatabase              -> unitDatabase.ts -> getDb() -> hobbyforge.db
  [rules.db, getRulesDb(), bulk_sync_rules, CSV pipeline: DELETED]
```

### Deletion Dependency Order

Files must be deleted bottom-up (leaf-first) to avoid TypeScript compilation errors during development:

```
Wave 1: Delete leaf files (no dependents)
  1. Sync utilities: parseWahapediaCsv, validateCsvHeaders, computeSyncDiff, syncFreshness, normalizePointsNames
  2. Query modules: syncErrors, rulesSnapshot, pointsImportHistory, unitRulesMapping
  3. UI components: SyncStatusCard, PointsDeltaSection, PlaybookSyncDetails
  4. Test files: all tests/datasheet/ sync-related, tests/rules-sync/

Wave 2: Redirect then delete intermediate files
  1. Redirect useDatasheet.ts hooks -> unitDatabase.ts queries
  2. Redirect useUnitKeywords.ts -> udb_unit_keywords query
  3. Delete datasheets.ts, rulesExtended.ts
  4. Delete useRulesSync.ts, useRulesExtended.ts, useSyncErrors.ts
  5. Delete rules-client.ts

Wave 3: Clean up consumers
  1. Remove sync UI from RulesHubPage, PlaybookTab
  2. Simplify DetachmentPicker (stub/hide), DatasheetBrowserDialog
  3. Remove useRulesSyncMeta from 11 consumer components
  4. Clean diagnostics.ts (remove getRulesDb calls)

Wave 4: Rust backend cleanup
  1. Remove get_rules_migrations(), bulk_sync_rules command
  2. Remove .add_migrations("sqlite:rules.db", ...) from plugin-sql builder
  3. Remove rules.db preflight repair call
  4. Remove BulkSyncPayload, SyncResult structs
  5. Clean BackupManifest (rules_schema_version field -- keep for backward compat)
  6. Delete rules_001..004 migration SQL files

Wave 5: Dev-side tooling
  1. Create update script extending build-unit-db.ts with diff reporting
  2. Add simplified "check for updates" UI component
```

### Component Responsibilities

| Component | Current State | Action | Target |
|-----------|--------------|--------|--------|
| `rules-client.ts` | rules.db singleton | DELETE | -- |
| `datasheets.ts` | 8 functions querying rw_* tables | DELETE | `unitDatabase.ts` |
| `rulesExtended.ts` | 6 functions (stratagems, detachments) | DELETE | graceful degradation |
| `useDatasheet.ts` | 6 exports wrapping datasheets.ts | REDIRECT | wrap unitDatabase.ts |
| `useRulesExtended.ts` | 6 hooks for stratagems/detachments | DELETE | -- |
| `useRulesSync.ts` | CSV sync pipeline | DELETE | -- |
| `useSyncErrors.ts` | Sync error display | DELETE | -- |
| `useUnitKeywords.ts` | `getUnitKeywords()` from rw_* | REDIRECT | udb_unit_keywords query |
| `diagnostics.ts` | Dual-DB diagnostic queries | MODIFY | Remove getRulesDb calls |
| `RulesHubPage.tsx` | Sync controls + browser | SIMPLIFY | Redirect to DatabaseBrowserPage |
| `PlaybookTab.tsx` | Uses useDatasheet + useRulesExtended | REDIRECT | Use udb_* equivalents |
| `DetachmentPicker.tsx` | Uses useDetachmentsByFaction | STUB | Hide or show placeholder |

### Anti-Patterns to Avoid
- **Incremental deletion with broken imports:** Delete files in dependency order (leaf-first). Never delete a query module while its hook still imports it.
- **Leaving dead exports:** After redirecting useDatasheet, verify no component still imports deleted functions like `getFullDatasheet`.
- **Forgetting Rust cleanup:** The `bulk_sync_rules` command is registered in `invoke_handler` -- removing the function without removing the registration causes a compile error.
- **Breaking BackupManifest backward compatibility:** The `rules_schema_version` and `includes_rules_db` fields in `BackupManifest` use `#[serde(default)]` -- they can stay for backward-compatible deserialization of old backups.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unit keyword lookup (Character/Epic Hero) | Custom rw_* query | `udb_unit_keywords` table query via `getDb()` | Data already exists in udb_* tables |
| Datasheet detail view | Recreate datasheets.ts | `getUdbUnitDetail()` from unitDatabase.ts | Complete replacement already built |
| Data version tracking | Custom version table | `udb_meta.version` field | Already in schema from Phase 103 |

## Common Pitfalls

### Pitfall 1: useRulesSyncMeta() consumers
**What goes wrong:** 11 components import `useRulesSyncMeta` from `useDatasheet.ts`. Deleting without replacement breaks the build.
**Why it happens:** `syncMeta` was used to show "last synced" timestamps, determine data freshness, gate features.
**How to avoid:** Replace with a `useUdbMeta()` hook that reads `udb_meta` table (version, built_at). Components that show "last synced" should show "data version" instead.
**Warning signs:** TypeScript errors referencing `useRulesSyncMeta` or `RULES_SYNC_META_KEY`.

### Pitfall 2: useWahapediaFactionId cross-DB lookup
**What goes wrong:** `useWahapediaFactionId` resolves HobbyForge faction names to Wahapedia faction IDs via rules.db. After deletion, this breaks army list features.
**Why it happens:** Army lists need faction IDs to filter units.
**How to avoid:** Replace with udb_factions lookup. The `udb_factions` table already has the same faction IDs (Phase 103 reused Wahapedia IDs).
**Warning signs:** Components like `ArmyListDetailPage.tsx` and `ArmyListDetailSheet.tsx` calling `useWahapediaFactionId`.

### Pitfall 3: getUnitKeywords uses rules.db
**What goes wrong:** `useUnitKeywords` hook (used by `ArmyListUnitRow` and `EnhancementPickerSheet`) calls `getUnitKeywords()` in `datasheets.ts` which queries `rw_datasheet_keywords` in rules.db.
**Why it happens:** Army list validation for enhancements needs Character/Epic Hero keyword checks.
**How to avoid:** Redirect to query `udb_unit_keywords` table instead. Same data, different table name.
**Warning signs:** Enhancement eligibility breaks silently (returns false for all units).

### Pitfall 4: Detachment/Stratagem features lose data source
**What goes wrong:** `DetachmentPicker.tsx`, `StrategemsTab.tsx`, `DetachmentCard.tsx`, `PlaybookRules.tsx` all consume data from `rulesExtended.ts` which queries rules.db tables not present in udb_*.
**Why it happens:** EXT-03 (stratagems/detachments in canonical DB) is deferred.
**How to avoid:** Components must degrade gracefully -- hide sections, show "coming in future update" text, or return empty arrays from stub hooks.
**Warning signs:** Runtime errors from undefined hook return values or empty data rendering.

### Pitfall 5: diagnostics.ts dual-DB queries
**What goes wrong:** `getSchemaVersions()` queries both `getDb()` and `getRulesDb()`. `getUnmatchedPointsCount()` queries rules.db exclusively.
**Why it happens:** Diagnostics was built for dual-DB architecture.
**How to avoid:** Remove the `rules` property from `SchemaVersions`, remove `getUnmatchedPointsCount()`, keep `getSchemaVersions()` for hobbyforge.db only.
**Warning signs:** Data Health page crashes on load.

### Pitfall 6: Rust compile errors from partial cleanup
**What goes wrong:** Removing `bulk_sync_rules` function but leaving it in `generate_handler![]` causes Rust compilation failure.
**Why it happens:** Rust macro expansion requires all referenced functions to exist.
**How to avoid:** Remove the function AND its handler registration AND its types (BulkSyncPayload, SyncResult) in the same commit.
**Warning signs:** `cargo build` fails with "cannot find function" or "cannot find type".

### Pitfall 7: BackupManifest backward compatibility
**What goes wrong:** Removing `rules_schema_version` or `includes_rules_db` fields from BackupManifest breaks deserialization of old backups.
**Why it happens:** Existing backup .zip files contain metadata.json with these fields.
**How to avoid:** Keep the fields with `#[serde(default)]` for deserialization. Set `rules_schema_version: 0` and `includes_rules_db: false` in new backups. Remove from UI display.
**Warning signs:** `validate_backup` command fails on older backup files.

### Pitfall 8: tauri.conf.json and plugin-sql builder
**What goes wrong:** Removing `.add_migrations("sqlite:rules.db", ...)` from Rust but leaving plugin-sql config in `tauri.conf.json` (or vice versa) causes startup errors.
**Why it happens:** plugin-sql uses both Rust builder config and tauri.conf.json.
**How to avoid:** Remove both: the `"sqlite:rules.db"` entry in tauri.conf.json (line 52) AND the `.add_migrations(...)` call in lib.rs.

## Code Examples

### Redirecting useUnitKeywords to udb_* tables
```typescript
// BEFORE (datasheets.ts -- queries rules.db):
const db = await getRulesDb();
const rows = await db.select<{ keyword: string }[]>(
  `SELECT k.keyword FROM rw_datasheets d
   JOIN rw_datasheet_keywords k ON k.datasheet_id = d.id
   WHERE LOWER(d.name) = LOWER($1)
     AND LOWER(k.keyword) IN ('character', 'epic hero')`,
  [unitName],
);

// AFTER (unitDatabase.ts or new function -- queries hobbyforge.db):
const db = await getDb();
const rows = await db.select<{ keyword: string }[]>(
  `SELECT k.keyword FROM udb_units u
   JOIN udb_unit_keywords k ON k.unit_id = u.id
   WHERE LOWER(u.name) = LOWER($1)
     AND LOWER(k.keyword) IN ('character', 'epic hero')`,
  [unitName],
);
```

### Replacing useRulesSyncMeta with useUdbMeta
```typescript
// New hook to replace useRulesSyncMeta
export const UDB_META_KEY = ["udb-meta"] as const;

export function useUdbMeta() {
  return useQuery({
    queryKey: UDB_META_KEY,
    queryFn: async () => {
      const db = await getDb();
      const rows = await db.select<UdbMeta[]>(
        "SELECT version, built_at, game_system, unit_count, faction_count FROM udb_meta WHERE id = 1",
      );
      return rows[0] ?? null;
    },
    staleTime: Infinity,
  });
}
```

### Rust cleanup pattern (lib.rs)
```rust
// REMOVE from plugin builder:
// .add_migrations("sqlite:rules.db", get_rules_migrations())

// REMOVE from invoke_handler:
// bulk_sync_rules,

// REMOVE entire functions/structs:
// fn get_rules_migrations() -> Vec<Migration> { ... }
// struct BulkSyncPayload { ... }
// struct SyncResult { ... }
// async fn bulk_sync_rules(...) -> Result<SyncResult, String> { ... }

// REMOVE from preflight_migration_repair():
// let rules_db = app_data_dir.join("rules.db");
// let rules_migrations = get_rules_migrations();
// repair_migration_checksums(&rules_db, &rules_migrations)
```

### Dev-side update script diff output
```typescript
// Extend build-unit-db.ts with diff comparison
interface DiffReport {
  newUnits: string[];
  removedUnits: string[];
  pointsChanges: Array<{ unit: string; old: number; new: number }>;
  abilityChanges: Array<{ unit: string; ability: string; change: "added" | "removed" | "modified" }>;
  keywordChanges: Array<{ unit: string; keyword: string; change: "added" | "removed" }>;
}

// Compare old JSON (read from existing file) vs new JSON (freshly built)
function computeDiff(oldData: UnitDatabase, newData: UnitDatabase): DiffReport { ... }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dual-DB (hobbyforge.db + rules.db) | Single DB (hobbyforge.db with udb_* tables) | Phase 103 (v0.4.0) | Simplifies architecture, removes runtime sync |
| Runtime CSV sync from Wahapedia | Bundled pre-built data via JSON import | Phase 103 (v0.4.0) | Offline-first, deterministic |
| `getRulesDb()` for rules data | `getDb()` + udb_* tables | Phase 103-106 | Single connection, simpler queries |

## Assumptions Log

All claims in this research were verified by direct codebase inspection -- no external lookups needed for this cleanup phase. No assumed claims.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| -- | (none) | -- | -- |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLN-02 | No imports of getRulesDb anywhere in src/ | grep audit | `grep -r "getRulesDb" src/ (expect 0 results)` | N/A (script check) |
| CLN-02 | TypeScript compiles with no errors after cleanup | build | `pnpm build` | N/A (build check) |
| CLN-03 | All dead sync files removed | filesystem | Verify absence of deleted files | N/A (file check) |
| CLN-03 | Existing tests pass after cleanup | unit | `pnpm test` | Existing tests minus deleted ones |
| CLN-01 | Update script produces diff report | manual | `node --experimental-strip-types scripts/update-unit-database.ts --diff` | Wave 0 |
| CLN-04 | udb_meta version check works | unit | `pnpm test -- tests/unit-database/udbMeta.test.ts` | Wave 0 |

### Wave 0 Gaps
- [ ] `tests/unit-database/udbMeta.test.ts` -- covers CLN-04 (useUdbMeta hook)
- [ ] Delete ~15 test files under `tests/datasheet/` that test deleted modules
- [ ] Delete `tests/rules-sync/useRulesSync.test.ts`

### Sampling Rate
- **Per task commit:** `pnpm build && pnpm test`
- **Per wave merge:** `pnpm build && pnpm test`
- **Phase gate:** Full suite green + `grep -r "getRulesDb" src/` returns 0 results

## Detailed File Inventory

### Files to DELETE (confirmed exist via codebase inspection)

**Query modules (5):**
- `src/db/queries/datasheets.ts` -- 8+ functions querying rw_* tables [VERIFIED: codebase]
- `src/db/queries/rulesExtended.ts` -- 6 functions for stratagems/detachments [VERIFIED: codebase]
- `src/db/queries/syncErrors.ts` -- sync error tracking (uses getDb, but module is dead) [VERIFIED: codebase]
- `src/db/queries/rulesSnapshot.ts` -- rules snapshots [VERIFIED: codebase]
- `src/db/queries/pointsImportHistory.ts` -- points import history (uses getDb, but module is dead) [VERIFIED: codebase]
- `src/db/queries/unitRulesMapping.ts` -- bridge table queries [VERIFIED: codebase]

**DB client (1):**
- `src/db/rules-client.ts` -- rules.db singleton [VERIFIED: codebase]

**Hooks (4):**
- `src/hooks/useRulesSync.ts` -- CSV sync pipeline [VERIFIED: codebase]
- `src/hooks/useRulesExtended.ts` -- stratagems/detachments hooks [VERIFIED: codebase]
- `src/hooks/useSyncErrors.ts` -- sync error display hook [VERIFIED: codebase]
- `src/hooks/useUnitRulesMapping.ts` -- unit rules mapping hook [VERIFIED: codebase]

**Sync utilities (5):**
- `src/lib/parseWahapediaCsv.ts` [VERIFIED: codebase]
- `src/lib/validateCsvHeaders.ts` [VERIFIED: codebase]
- `src/lib/computeSyncDiff.ts` [VERIFIED: codebase]
- `src/lib/syncFreshness.ts` [VERIFIED: codebase]
- `src/lib/normalizePointsNames.ts` [VERIFIED: codebase]

**UI components (3):**
- `src/features/rules-hub/SyncStatusCard.tsx` [VERIFIED: codebase]
- `src/features/rules-hub/PointsDeltaSection.tsx` [VERIFIED: codebase]
- `src/features/units/PlaybookSyncDetails.tsx` [VERIFIED: codebase]

**Rust migration files (4):**
- `src-tauri/migrations/rules_001_schema.sql` [VERIFIED: codebase]
- `src-tauri/migrations/rules_002_wargear_abilities.sql` [VERIFIED: codebase]
- `src-tauri/migrations/rules_003_sync_meta_counts.sql` [VERIFIED: codebase]
- `src-tauri/migrations/rules_004_datasheet_points.sql` [VERIFIED: codebase]

**Test files to DELETE (~16):**
- `tests/datasheet/computePointsDelta.test.ts`
- `tests/datasheet/DatasheetImportDialog.test.tsx`
- `tests/datasheet/datasheetQueries.test.ts`
- `tests/datasheet/fetchBsdataPoints.test.ts`
- `tests/datasheet/migration.test.ts`
- `tests/datasheet/rulesExtendedDetachment.test.ts`
- `tests/datasheet/rulesExtendedQueries.test.ts`
- `tests/datasheet/syncErrorQueries.test.ts`
- `tests/datasheet/syncFreshness.test.ts`
- `tests/datasheet/syncMetaQueries.test.ts`
- `tests/datasheet/useRulesExtended.test.tsx`
- `tests/datasheet/validateCsvHeaders.test.ts`
- `tests/datasheet/pointsSchema.test.ts`
- `tests/datasheet/computeSyncDiff.test.ts`
- `tests/datasheet/csvParse.test.ts`
- `tests/datasheet/useRulesSync.test.ts`
- `tests/datasheet/DatasheetPicker.test.tsx`
- `tests/datasheet/useDatasheet.test.tsx` (redirect or delete)
- `tests/rules-sync/useRulesSync.test.ts`

**Test files to KEEP:**
- `tests/datasheet/rulesFavorites.test.ts` -- tests getDb() queries, not rules.db
- `tests/datasheet/rulesNotes.test.ts` -- tests getDb() queries, not rules.db
- `tests/datasheet/useRulesFavorites.test.tsx` -- tests hooks for preserved features
- `tests/datasheet/useRulesNotes.test.tsx` -- tests hooks for preserved features
- `tests/datasheet/stripHtml.test.ts` -- pure utility, may still be used
- `tests/datasheet/rulesSnapshot.test.ts` -- DELETE (tests rules.db snapshot)

### Files to MODIFY (confirmed exist)

**Hooks (2):**
- `src/hooks/useDatasheet.ts` -- redirect all functions to unitDatabase.ts queries
- `src/hooks/useUnitKeywords.ts` -- redirect to udb_unit_keywords query

**Query modules (1):**
- `src/db/queries/diagnostics.ts` -- remove getRulesDb import and dual-DB queries

**UI components (8+):**
- `src/features/rules-hub/RulesHubPage.tsx` -- remove sync controls
- `src/features/units/PlaybookTab.tsx` -- redirect datasheet/rulesExtended refs
- `src/features/units/PlaybookStats.tsx` -- redirect queries
- `src/features/units/DatasheetPicker.tsx` -- redirect to unitDatabase.ts
- `src/features/units/LoadoutSection.tsx` -- redirect useDatasheet
- `src/features/units/PlaybookRules.tsx` -- remove rulesExtended usage
- `src/features/army-lists/DatasheetBrowserDialog.tsx` -- redirect
- `src/features/army-lists/DetachmentPicker.tsx` -- stub/simplify
- `src/features/army-lists/ArmyListDetailPage.tsx` -- remove useRulesSyncMeta/useWahapediaFactionId
- `src/features/army-lists/ArmyListDetailSheet.tsx` -- remove useRulesSyncMeta/useWahapediaFactionId
- `src/features/army-lists/PointsFreshnessBadge.tsx` -- redirect to udb_meta
- `src/features/army-lists/MatchStatusIndicator.tsx` -- clean unitRulesMapping type import
- `src/features/army-lists/RulesMappingSheet.tsx` -- remove unitRulesMapping query
- `src/features/data-health/VersionInfoCard.tsx` -- replace useRulesSyncMeta with useUdbMeta
- `src/features/data-health/DiagnosticsCard.tsx` -- replace useRulesSyncMeta
- `src/features/data-health/RestorePreviewDialog.tsx` -- clean rules_schema_version display
- `src/features/dashboard/DataHealthSummaryCard.tsx` -- replace useRulesSyncMeta
- `src/features/dashboard/ReadyToPlayCard.tsx` -- replace useRulesSyncMeta
- `src/features/game-day/GameDayPage.tsx` -- replace useRulesSyncMeta
- `src/features/game-day/UnitAbilityCard.tsx` -- redirect useDatasheet
- `src/features/game-day/StrategemsTab.tsx` -- remove useStratagemsByDetachment (stub)
- `src/features/rules-hub/DatasheetPointsTab.tsx` -- redirect to unitDatabase.ts
- `src/features/rules-hub/DetachmentCard.tsx` -- stub/remove (no detachment data)
- `src/features/rules-hub/StratagemCard.tsx` -- stub/remove (no stratagem data)

**Rust backend (1):**
- `src-tauri/src/lib.rs` -- remove bulk_sync_rules, get_rules_migrations, rules.db init

**Config (1):**
- `src-tauri/tauri.conf.json` -- remove `"sqlite:rules.db"` (line 52)

**Types (2-3):**
- `src/types/backup.ts` -- keep rules_schema_version for backward compat
- `src/types/datasheet.ts` -- clean sync-specific types
- `src/types/pointsDelta.ts` -- likely DELETE entirely
- `src/types/unitOverride.ts` -- KEEP (user overrides, not sync)
- `src/types/unitRulesMapping.ts` -- DELETE

## Open Questions

1. **Should syncErrors/pointsImportHistory tables be DROPped via migration?**
   - What we know: These tables exist in hobbyforge.db (migrations 015, 024). Their query modules are deleted but tables remain.
   - What's unclear: Whether to add a migration 040 to DROP these tables or leave them as harmless empty tables.
   - Recommendation: Defer the DROP migration. Empty tables have zero runtime cost and the migration adds risk. This is listed as a deferred item in CONTEXT.md.

2. **stripHtml.ts utility -- is it still used outside sync code?**
   - What we know: `tests/datasheet/stripHtml.test.ts` exists for this utility.
   - What's unclear: Whether any non-sync component still calls stripHtml.
   - Recommendation: Grep for usage before deciding to delete.

3. **RulesHubPage -- merge into DatabaseBrowserPage or keep as redirect?**
   - What we know: Rules Hub sidebar link exists. DatabaseBrowserPage was built in Phase 104.
   - Recommendation: Keep RulesHubPage as a thin wrapper that renders DatabaseBrowserPage content, preserving the route and sidebar entry. This avoids URL breakage.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all files referenced in CONTEXT.md canonical_refs
- `src-tauri/src/lib.rs` -- full Rust backend source (1737 lines)
- `src/db/rules-client.ts` -- rules.db singleton (39 lines)
- `src/hooks/useDatasheet.ts` -- datasheet hooks (127 lines)
- `src/hooks/useRulesExtended.ts` -- extended rules hooks (108 lines)
- `src/db/queries/unitDatabase.ts` -- canonical udb_* query layer
- `src/db/queries/diagnostics.ts` -- dual-DB diagnostic queries
- `scripts/build-unit-db.ts` -- existing build pipeline

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, pure deletion/redirection
- Architecture: HIGH -- all deletion targets verified via codebase grep
- Pitfalls: HIGH -- all consumer components identified via import analysis

**Research date:** 2026-05-30
**Valid until:** 2026-07-30 (stable -- internal cleanup, no external dependencies)
