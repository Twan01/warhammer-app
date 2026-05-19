---
phase: 80-export-ui-backup-status
plan: "02"
subsystem: backup-ui
tags: [backup, ui, health-dots, export, rust, testing]
dependency_graph:
  requires: [80-01]
  provides: [backup-card-export-ui, dashboard-backup-dot, sts-01, sts-02, sts-03, sts-04]
  affects: [data-health-page, dashboard]
tech_stack:
  added: []
  patterns: [backup-freshness-dot, shared-utility-consumption, health-tier-indicator]
key_files:
  created: []
  modified:
    - src/features/data-health/BackupCard.tsx
    - src/features/dashboard/DataHealthSummaryCard.tsx
    - src-tauri/src/lib.rs
    - tests/data-health/backupCard.test.tsx
    - tests/dashboard/DataHealthSummaryCard.test.tsx
decisions:
  - export_backup replaces backup_database everywhere (UI + tests + Rust handler)
  - ZIP filename uses UTC timestamp YYYY-MM-DD-HHMM via getUTC* methods (deterministic across timezones)
  - Health dot inserted as inline-block h-2 w-2 rounded-full span matching DataHealthSummaryCard sync dot pattern
  - tier label capitalized from raw BackupFreshness type value ("never" -> "Never")
  - Never state renders "Never — No backup yet" (not "Never — No backup") for clarity
metrics:
  duration: "~15 minutes"
  completed: "2026-05-18"
  tasks_completed: 2
  files_modified: 5
---

# Phase 80 Plan 02: Backup UI Migration + Health Dots Summary

**One-liner:** Migrated BackupCard to export_backup with ZIP dialog + health tier dot, added backup freshness dot to DataHealthSummaryCard, removed dead backup_database Rust command.

## What Was Built

### Task 1: Migrate BackupCard + Update DataHealthSummaryCard + Remove Dead Rust Command

**BackupCard.tsx (STS-02, STS-03, D-03, D-04, D-05):**
- Removed local `formatRelativeDate` and `extractFilename` functions
- Added imports for `getBackupFreshness`, `getBackupAgeLabel`, `BACKUP_FRESHNESS_DOT_CLASS` from `@/lib/backupFreshness`
- Updated `handleBackup`: filename now uses UTC timestamp `hobbyforge-backup-YYYY-MM-DD-HHMM.zip` via `getUTC*` methods
- Save dialog: title changed to "Save Backup", filter name to "HobbyForge Backup", extension from `["db"]` to `["zip"]`
- `invoke("backup_database", ...)` replaced with `invoke("export_backup", ...)`
- Health dot computed before return: `tier = getBackupFreshness(backupStatus?.date ?? null)`, tier label capitalized, age label from shared utility
- Subtitle replaced with flex div: colored dot span + text "TierLabel — AgeLabel" (or "Never — No backup yet" for never state)

**DataHealthSummaryCard.tsx (STS-04, D-06, D-07):**
- Removed `HardDrive` from lucide-react import, kept `Database`
- Added imports for `getBackupFreshness`, `getBackupAgeLabel`, `BACKUP_FRESHNESS_DOT_CLASS` from `@/lib/backupFreshness`
- Replaced 7-line backupLabel IIFE with two lines using shared utility functions
- Replaced HardDrive icon with color dot span matching sync dot pattern

**lib.rs (D-08):**
- Deleted entire `backup_database` function (~41 lines including doc comment and `#[tauri::command]` attribute)
- Removed `backup_database` entry from `invoke_handler!` macro

**Verification:** `pnpm build` exits 0 (TypeScript + Vite build clean).

### Task 2: Update BackupCard Tests + Add STS-04 DataHealthSummaryCard Tests

**backupCard.test.tsx:**
- Updated "shows 'No backups yet'" assertion to `/Never.*No backup/i`
- Updated save dialog test: title "Save Backup", extensions `["zip"]`
- Updated invoke test: `export_backup` with `.zip` path (was `backup_database` with `.db`)
- Renamed "does not invoke backup_database" to "does not invoke export_backup if dialog is cancelled"
- Updated success/error toast tests to use `.zip` path in mockSave
- Added STS-02: muted dot presence test (bg-muted-foreground element)
- Added STS-02: tier dot test for recent backup using vi.useFakeTimers

**DataHealthSummaryCard.test.tsx (STS-04 additions to existing file):**
- Added `DataHealthSummaryCard — STS-04 backup dot` describe block
- Test 1: muted dot + "No backup" text when `mockBackup = null`
- Test 2: green dot + "Backed up today" for recent backup with fake timers
- Test 3: HardDrive icon absent (no `[data-lucide='hard-drive']` or aria-label match)

**Verification:** All 199 test files pass (1812 tests, 0 failures).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All data flows wired: BackupCard uses real export_backup invoke, health dots use real getBackupFreshness from backupFreshness.ts utility.

## Threat Flags

None beyond what is documented in the plan's threat register (T-80-02, T-80-03, T-80-SC — all accepted).

## Self-Check

Files exist:
- src/features/data-health/BackupCard.tsx — contains export_backup, BACKUP_FRESHNESS_DOT_CLASS, zip filter
- src/features/dashboard/DataHealthSummaryCard.tsx — contains BACKUP_FRESHNESS_DOT_CLASS, no HardDrive
- src-tauri/src/lib.rs — backup_database function and handler entry removed
- tests/data-health/backupCard.test.tsx — contains export_backup assertions, /Never.*No backup/i
- tests/dashboard/DataHealthSummaryCard.test.tsx — contains STS-04 describe block

Commits:
- 31de828: feat(80-02): migrate BackupCard to export_backup, add health dots, remove dead Rust command
- bdea147: test(80-02): update backup tests for export_backup + zip + add STS-04 dot tests

## Self-Check: PASSED
