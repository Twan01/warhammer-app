---
phase: 77-data-health-page-backup-export
verified: 2026-05-15T12:10:00Z
status: human_needed
score: 6/6
overrides_applied: 0
human_verification:
  - test: "Navigate to /data-health via sidebar and verify all 5 sections render with real data"
    expected: "Version info card shows app version (v0.2.13), DB schema version, rules schema version, last sync with freshness dot, sync error count badge. Table counts grid shows 5 metric cards with actual numbers. Diagnostics section shows flags or green dot. Backup section shows 'No backups yet' or last backup info."
    why_human: "Visual rendering, skeleton loading transitions, and real data display cannot be verified programmatically"
  - test: "Click Create Backup, pick a file location, and verify backup completes"
    expected: "Save dialog opens with default filename hobbyforge-backup-YYYY-MM-DD.db, backup creates a valid .db file, toast shows success, last backup status updates on card"
    why_human: "Native save dialog and Rust VACUUM INTO invocation require runtime desktop app verification"
---

# Phase 77: Data Health Page + Backup/Export Verification Report

**Phase Goal:** The user can inspect the health of their data at a glance and create a safe backup of hobbyforge.db from the UI
**Verified:** 2026-05-15T12:10:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Data Health page shows app version, schema migration versions for both databases, last sync date, and sync error count | VERIFIED | VersionInfoCard.tsx renders 5 key-value pairs: App Version (getVersion()), DB Schema (useSchemaVersions().hobbyforge), Rules Schema (useSchemaVersions().rules), Last Sync (getSyncAgeLabel with freshness dot), Sync Errors (Badge with count from useRulesSyncErrors) |
| 2 | Page shows row counts for key tables: units, recipes, unit_recipe_assignments, unit_recipe_step_progress, synced_unit_points | VERIFIED | TableCountsGrid.tsx uses useTableCounts() hook; diagnostics.ts getTableCounts() queries all 5 tables via Promise.all with SELECT COUNT(*); StatCard renders each count |
| 3 | Page flags orphaned progress rows, ambiguous point matches, and stale sync data with actionable descriptions | VERIFIED | diagnostics.ts getOrphanedProgressRows() uses LEFT JOIN recipe_steps WHERE rs.id IS NULL; getAmbiguousPointMatches() cross-DB queries hobbyforge.db + rules.db and compares in JS; DiagnosticsCard.tsx computes stale sync client-side via getSyncFreshness() |
| 4 | Diagnostics load lazily -- page is immediately interactive while counts and flags populate asynchronously | VERIFIED | Three independent useQuery hooks (TABLE_COUNTS_KEY, DIAGNOSTIC_FLAGS_KEY, SCHEMA_VERSIONS_KEY) with separate query keys; each section shows Skeleton components while loading; VersionInfoCard has per-field independent loading |
| 5 | Create Backup button opens a file picker and writes a safe copy of hobbyforge.db using VACUUM INTO | VERIFIED | BackupCard.tsx calls save() from @tauri-apps/plugin-dialog, then invoke("backup_database", { destination }); lib.rs backup_database uses VACUUM INTO with single-quote escaping; std::fs::remove_file handles overwrite; dialog:allow-save in capabilities/default.json |
| 6 | Page shows last backup date and success status after backup completes | VERIFIED | BackupCard.tsx writes {date, path, success} to localStorage under BACKUP_STORAGE_KEY after successful backup; useState triggers re-render; displays relative date + filename or "No backups yet" |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/src/lib.rs` | backup_database Tauri command using VACUUM INTO | VERIFIED | Lines 578-616: async fn backup_database with SqliteConnectOptions, remove_file, VACUUM INTO format string; registered in invoke_handler at line 642 |
| `src-tauri/capabilities/default.json` | dialog:allow-save permission | VERIFIED | Line 21: "dialog:allow-save" in permissions array |
| `src/db/queries/diagnostics.ts` | getTableCounts, getOrphanedProgressRows, getAmbiguousPointMatches, getSchemaVersions, getDiagnosticFlags | VERIFIED | 178 lines; all 5 functions exported with proper types; cross-DB queries use getDb()+getRulesDb() |
| `src/hooks/useDiagnostics.ts` | useTableCounts, useDiagnosticFlags, useSchemaVersions, useBackupStatus | VERIFIED | 73 lines; 3 useQuery hooks with separate keys; useBackupStatus reads localStorage; BACKUP_STORAGE_KEY exported |
| `src/features/data-health/DataHealthPage.tsx` | Page root assembling all sections | VERIFIED | 35 lines; imports and renders VersionInfoCard, TableCountsGrid, DiagnosticsCard, BackupCard in order with space-y-6 |
| `src/features/data-health/VersionInfoCard.tsx` | Version and schema info card | VERIFIED | 108 lines; 5 key-value pairs with independent Skeleton loading per data source |
| `src/features/data-health/TableCountsGrid.tsx` | 5 metric cards for table row counts | VERIFIED | 57 lines; responsive grid with StatCard; proper loading skeleton |
| `src/features/data-health/DiagnosticsCard.tsx` | Diagnostic flags list | VERIFIED | 93 lines; merges DB flags with client-side stale sync; green dot when all pass; severity badges |
| `src/features/data-health/BackupCard.tsx` | Backup action and status card | VERIFIED | 99 lines; save dialog, invoke, localStorage write, toast, loading spinner, relative date display |
| `src/app/data-health/page.tsx` | Re-export to DataHealthPage | VERIFIED | 1 line: re-exports DataHealthPage from features module |
| `src/app/router.tsx` | /data-health route | VERIFIED | dataHealthRoute created with path "/data-health", component DataHealthPage; added to routeTree children |
| `src/components/common/AppSidebar.tsx` | Data Health sidebar link | VERIFIED | MANAGEMENT_NAV includes { to: "/data-health", label: "Data Health", icon: HeartPulse } |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useDiagnostics.ts` | `src/db/queries/diagnostics.ts` | queryFn imports | WIRED | Lines 14-18: imports getDiagnosticFlags, getSchemaVersions, getTableCounts |
| `src/app/router.tsx` | `src/app/data-health/page.tsx` | route component import | WIRED | Line 25: imports DataHealthPage; line 125-129: creates route |
| `src/app/data-health/page.tsx` | `src/features/data-health/DataHealthPage.tsx` | re-export | WIRED | Line 1: export { DataHealthPage } from "@/features/data-health/DataHealthPage" |
| `src/features/data-health/VersionInfoCard.tsx` | `src/hooks/useDiagnostics.ts` | useSchemaVersions | WIRED | Line 14: imports useSchemaVersions; line 42-43: destructures data |
| `src/features/data-health/TableCountsGrid.tsx` | `src/hooks/useDiagnostics.ts` | useTableCounts | WIRED | Line 11: imports useTableCounts; line 34: calls hook |
| `src/features/data-health/DiagnosticsCard.tsx` | `src/hooks/useDiagnostics.ts` | useDiagnosticFlags | WIRED | Line 11: imports useDiagnosticFlags; line 20: calls hook |
| `src/features/data-health/BackupCard.tsx` | `src-tauri/src/lib.rs` | invoke("backup_database") | WIRED | Line 54: await invoke("backup_database", { destination }); lib.rs line 642: registered in generate_handler |
| `src/features/data-health/BackupCard.tsx` | `@tauri-apps/plugin-dialog` | save() dialog | WIRED | Line 9: import { save }; line 44: await save({ title, defaultPath, filters }) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| VersionInfoCard.tsx | schemaVersions | useSchemaVersions -> getSchemaVersions -> PRAGMA user_version | DB pragma query | FLOWING |
| VersionInfoCard.tsx | syncMeta | useRulesSyncMeta -> existing rules sync hook | DB query on rw_sync_meta | FLOWING |
| VersionInfoCard.tsx | syncErrors | useRulesSyncErrors -> existing sync errors hook | DB query on sync_errors | FLOWING |
| VersionInfoCard.tsx | appVersion | getVersion() from @tauri-apps/api/app | Tauri runtime API | FLOWING |
| TableCountsGrid.tsx | counts | useTableCounts -> getTableCounts -> SELECT COUNT(*) x5 | 5 parallel DB queries | FLOWING |
| DiagnosticsCard.tsx | dbFlags | useDiagnosticFlags -> getDiagnosticFlags -> orphaned+ambiguous checks | DB queries with cross-DB compare | FLOWING |
| BackupCard.tsx | backupStatus | useBackupStatus -> localStorage.getItem | localStorage (written after backup) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles | `npx tsc --noEmit` | Exit 0, no errors | PASS |
| Test suite | `npx vitest run` | 1770 passed, 1 failed (pre-existing ArmyListSummaryBar test unrelated to phase 77), 6 skipped | PASS |
| DataHealthPage exports | grep for export | DataHealthPage exported from both feature and route modules | PASS |
| backup_database registered | grep invoke_handler | generate_handler![bulk_sync_rules, backup_database] at line 642 | PASS |

### Probe Execution

No probes declared or discovered for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DX-01 | 77-01, 77-02 | Data Health page shows app version, schema versions, last sync date, and sync error count | SATISFIED | VersionInfoCard renders all 5 data points with independent loading |
| DX-02 | 77-01, 77-02 | Data Health page shows row counts for key tables | SATISFIED | TableCountsGrid renders 5 StatCards from getTableCounts() |
| DX-03 | 77-01, 77-02 | Data Health page flags orphaned progress rows, ambiguous point matches, and stale sync data | SATISFIED | diagnostics.ts + DiagnosticsCard implement all 3 diagnostic types |
| DX-04 | 77-02 | Data Health page runs diagnostics without blocking UI (async/lazy) | SATISFIED | Independent useQuery hooks with separate keys + Skeleton loading states |
| BK-01 | 77-01, 77-02 | User can create a backup of hobbyforge.db from the UI via file picker | SATISFIED | BackupCard integrates save dialog + invoke("backup_database") |
| BK-02 | 77-01 | Backup uses VACUUM INTO for safe SQLite copy | SATISFIED | lib.rs backup_database uses VACUUM INTO with single-quote escaping |
| BK-03 | 77-02 | Backup status and last backup date are displayed on Data Health page | SATISFIED | BackupCard reads/writes localStorage, displays relative date + filename |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | No anti-patterns detected | - | - |

No TBD, FIXME, XXX, TODO, HACK, PLACEHOLDER, or stub patterns found in any phase 77 files.

### Human Verification Required

### 1. Data Health page visual rendering

**Test:** Run `pnpm tauri dev`, click "Data Health" in the sidebar Management group. Verify HeartPulse icon. Check all 5 sections render: version info with real values, table counts with numbers, diagnostics with flags or green dot, backup status.
**Expected:** Each section loads independently with skeleton placeholders that resolve. Version info shows v0.2.13, schema versions, last sync with colored dot, sync error badge. Table counts show actual row numbers in StatCards.
**Why human:** Visual rendering, skeleton transitions, and real data verification require runtime desktop app.

### 2. Backup flow end-to-end

**Test:** Click "Create Backup" button, pick a location in the save dialog. Verify toast notification and status update.
**Expected:** Save dialog opens with default filename `hobbyforge-backup-YYYY-MM-DD.db`. After save, toast shows "Backup created successfully". Card updates to show "Last backup: today -- hobbyforge-backup-YYYY-MM-DD.db". The .db file at the chosen location is a valid SQLite database.
**Why human:** Native save dialog and Rust VACUUM INTO command require the full Tauri desktop runtime.

### Gaps Summary

No gaps found. All 6 roadmap success criteria are verified in the codebase. All 7 requirements (DX-01 through DX-04, BK-01 through BK-03) are satisfied. All artifacts exist, are substantive (not stubs), and are fully wired. TypeScript compiles clean. Test suite passes (1 pre-existing unrelated failure).

Two items require human verification: visual rendering of the Data Health page and the end-to-end backup flow, both of which require the Tauri desktop runtime.

---

_Verified: 2026-05-15T12:10:00Z_
_Verifier: Claude (gsd-verifier)_
