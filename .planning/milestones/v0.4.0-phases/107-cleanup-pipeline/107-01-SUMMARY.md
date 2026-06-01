---
phase: 107-cleanup-pipeline
plan: 01
subsystem: data-layer
tags: [cleanup, architecture, migration, single-database]
dependency_graph:
  requires: [103-udb-schema, 104-database-browser-ui, 105-collection-fk]
  provides: [single-database-architecture, dead-code-removal]
  affects: [rules-hub, game-day, army-lists, collection, dashboard, data-health]
tech_stack:
  added: []
  patterns: [inline-stub-for-deferred-features, udb-meta-hook]
key_files:
  created:
    - src/hooks/useUdbMeta.ts
  modified:
    - src/hooks/useDatasheet.ts
    - src/hooks/useUnitKeywords.ts
    - src/db/queries/diagnostics.ts
    - src-tauri/src/lib.rs
    - src-tauri/tauri.conf.json
    - src/lib/syncFreshness.ts
    - src/lib/computeUnitWarnings.ts
  deleted:
    - src/db/rules-client.ts
    - src/db/queries/datasheets.ts
    - src/db/queries/rulesExtended.ts
    - src/db/queries/syncErrors.ts
    - src/db/queries/rulesSnapshot.ts
    - src/db/queries/pointsImportHistory.ts
    - src/db/queries/unitRulesMapping.ts
    - src/hooks/useRulesSync.ts
    - src/hooks/useRulesExtended.ts
    - src/hooks/useSyncErrors.ts
    - src/hooks/useUnitRulesMapping.ts
    - src/lib/parseWahapediaCsv.ts
    - src/lib/validateCsvHeaders.ts
    - src/lib/computeSyncDiff.ts
    - src/lib/normalizePointsNames.ts
    - src/lib/computePointsDelta.ts
    - src/features/rules-hub/SyncStatusCard.tsx
    - src/features/rules-hub/PointsDeltaSection.tsx
    - src/features/units/PlaybookSyncDetails.tsx
    - src/features/army-lists/MatchStatusIndicator.tsx
    - src/features/army-lists/RulesMappingSheet.tsx
    - src/types/pointsDelta.ts
    - src/types/unitRulesMapping.ts
    - src-tauri/migrations/rules_001_schema.sql
    - src-tauri/migrations/rules_002_wargear_abilities.sql
    - src-tauri/migrations/rules_003_sync_meta_counts.sql
    - src-tauri/migrations/rules_004_datasheet_points.sql
decisions:
  - "Inline stub pattern for deferred features (stratagems, detachments, shared abilities) rather than keeping empty hook files"
  - "getSyncFreshness/getSyncAgeLabel simplified to always return 'fresh'/'Data bundled with app' since data is now bundled"
  - "PlaybookRules component returns null until EXT-03 adds stratagem/detachment data to canonical DB"
  - "BackupManifest rules_schema_version set to 0 with serde(default) for backward compat"
metrics:
  duration: "~3 hours across 2 executor sessions"
  completed: "2026-05-31"
  files_deleted: 50
  files_modified: 46
  lines_removed: 9321
  lines_added: 565
---

# Phase 107 Plan 01: rules.db Elimination Summary

Single-database architecture achieved by deleting 50 files (~9300 lines) of dead sync infrastructure and redirecting all consumers to udb_* tables in hobbyforge.db.

## One-liner

Eliminated rules.db entirely: deleted CSV sync pipeline, rules-client singleton, 20+ dead hooks/queries/components, 4 Rust migrations, and redirected 20+ consumer components to canonical udb_* tables via useUdbMeta hook and inline stubs.

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| e273e53 | feat | Task 1: Create useUdbMeta, redirect useDatasheet/useUnitKeywords, modify diagnostics |
| 97e9c45 | feat | Task 2: Delete dead files, redirect consumers, clean Rust backend |
| a93e2ce | test | Fix 10 test files broken by rules.db elimination |

## Tasks Completed

### Task 1: Hook redirection (e273e53)
- Created `src/hooks/useUdbMeta.ts` as canonical replacement for `useRulesSyncMeta`
- Rewrote `src/hooks/useDatasheet.ts` to read from `udb_*` tables via `getDb()`
- Rewrote `src/hooks/useUnitKeywords.ts` to query `udb_unit_keywords` table
- Modified `src/db/queries/diagnostics.ts` to remove `getRulesDb` dependency

### Task 2: Bulk deletion and consumer cleanup (97e9c45 + a93e2ce)
- Deleted 25+ source files (hooks, queries, components, utilities, types)
- Deleted 20+ test files for deleted modules
- Deleted 4 Rust migration files (rules_001 through rules_004)
- Redirected 20+ consumer components from rules.db imports to udb_* equivalents
- Cleaned Rust backend: removed bulk_sync_rules, get_rules_migrations, BulkSyncPayload/SyncResult
- Removed "sqlite:rules.db" from tauri.conf.json preload
- Fixed 10 test files with updated mocks, assertions, and data shapes
- Converted 29 tests to `it.todo()` for features that lost their data source (deferred to EXT-03)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed mojibake em-dash encoding in PlaybookTab tests**
- **Found during:** Task 2 test fixes
- **Issue:** Em-dash characters (U+2014) in test file got double-encoded to mojibake bytes
- **Fix:** Replaced mojibake bytes with double-hyphens to match updated component rendering
- **Files modified:** tests/collection/PlaybookTab.test.tsx

**2. [Rule 2 - Missing] Added Tauri API mock for DataHealthSummaryCard tests**
- **Found during:** Task 2 test fixes
- **Issue:** Component now imports `getVersion` from `@tauri-apps/api/app` which needs mocking in jsdom
- **Fix:** Added `vi.mock("@tauri-apps/api/app")` to the test file
- **Files modified:** tests/dashboard/DataHealthSummaryCard.test.tsx

**3. [Rule 2 - Missing] Updated sync label assertions across dashboard tests**
- **Found during:** Task 2 test fixes
- **Issue:** `getSyncAgeLabel` now returns "Data bundled with app" (was "Never synced"/"Synced today")
- **Fix:** Updated test assertions to match new constant label
- **Files modified:** tests/dashboard/DataHealthSummaryCard.test.tsx, tests/dashboard/ReadyToPlayCard.test.tsx

## Verification

- `pnpm build` passes with zero TypeScript errors
- `pnpm test` shows 231 passed, 6 skipped, 41 todo, 10 failed (all 10 pre-existing)
- `grep -r "getRulesDb" src/` returns only documentation comments
- `grep -r "rules-client" src/` returns empty
- `grep -r "bulk_sync_rules" src-tauri/` returns empty
- `grep "sqlite:rules.db" src-tauri/tauri.conf.json` returns empty
- All 4 rules migration files deleted from src-tauri/migrations/
- `src/db/rules-client.ts` does not exist

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| src/features/game-day/StrategemsTab.tsx | useStratagemsByDetachment returns [] | Data source removed; EXT-03 will add stratagems to canonical DB |
| src/features/rules-hub/RulesHubPage.tsx | useStratagemsByFaction/useDetachmentsByFaction/useSharedAbilitiesByFaction return [] | Same as above |
| src/features/units/PlaybookRules.tsx | Returns null | Same as above |
| src/features/army-lists/DetachmentPicker.tsx | useDetachmentsByFaction returns [] | Same as above |
| src/features/army-lists/DetachmentRulesSection.tsx | useDetachmentAbilitiesByDetachment returns [] | Same as above |
| src/features/rules-hub/DetachmentCard.tsx | Inline stub returns empty abilities | Same as above |
| src/lib/syncFreshness.ts | getSyncFreshness always returns "fresh" | Data now bundled in app; sync concept removed |

These stubs are intentional and documented. EXT-03 (deferred) will resolve them by adding stratagem/detachment/shared ability data to the canonical udb_* tables.

## Pre-existing Test Failures (10 files, not caused by Phase 107)

These test files fail due to issues predating Phase 107 changes:
- tests/army-lists/ArmyListSummaryBar.test.tsx (2 failures)
- tests/army-lists/LeaderAttachmentSheet.test.tsx (1 failure)
- tests/hobby-journal/useJournalSessions.test.tsx (1 failure)
- tests/painting/recipeStepRow.test.tsx (2 failures)
- tests/painting/sectionedTimeline.test.tsx (1 failure)
- tests/painting-mode/completeStepWithSession.test.ts (1 failure)
- tests/painting-mode/StepFocalView.test.tsx (1 failure)
- tests/spending/SpendingPage.test.tsx (6 failures)
- tests/wishlist/WishlistPage.test.tsx (2 failures)
- tests/workshop-play/armyListReadinessPanel.test.tsx (1 failure)

## Self-Check: PASSED

- All 3 commits verified in git log (e273e53, 97e9c45, a93e2ce)
- SUMMARY.md exists at expected path
- Key created file src/hooks/useUdbMeta.ts exists
