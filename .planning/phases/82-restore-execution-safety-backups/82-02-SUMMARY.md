---
phase: 82-restore-execution-safety-backups
plan: "02"
subsystem: data-health
tags: [restore, relaunch, backup, UI]
dependency_graph:
  requires: [82-01]
  provides: [restore-execution-flow, isRestoring-spinner]
  affects: [BackupCard, RestorePreviewDialog]
tech_stack:
  added: []
  patterns: [invoke-then-relaunch, isRestoring-guard]
key_files:
  created: []
  modified:
    - src/features/data-health/BackupCard.tsx
    - src/features/data-health/RestorePreviewDialog.tsx
    - tests/data-health/RestorePreviewDialog.test.tsx
    - tests/data-health/backupCard.test.tsx
decisions:
  - "No finally block on success path -- relaunch() kills the process before finally runs"
  - "Error catch resets all state (isRestoring, previewOpen, manifest, selectedPath) for clean retry"
metrics:
  duration: "11 minutes"
  completed: "2026-05-19"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 82 Plan 02: Wire Restore Execution Flow Summary

Real restore execution via invoke("restore_from_backup") + relaunch(), replacing placeholder toast with working flow and isRestoring spinner state.

## What Was Done

### Task 1: Wire restore execution in BackupCard + RestorePreviewDialog

**BackupCard.tsx:**
- Added `relaunch` import from `@tauri-apps/plugin-process`
- Added `selectedPath` (string | null) and `isRestoring` (boolean) state variables
- `handleRestore` now calls `setSelectedPath(result)` after setting manifest, bridging the local variable gap
- Replaced placeholder `handleConfirmRestore` with async version: guard on selectedPath, invoke restore_from_backup, then relaunch
- Error catch resets all state and shows "Restore failed:" error toast
- Restore button disabled when `isValidating || isRestoring`
- Passes `isRestoring` prop to RestorePreviewDialog

**RestorePreviewDialog.tsx:**
- Added optional `isRestoring` prop (defaults to false)
- Added `Loader2` import from lucide-react
- AlertDialogAction shows "Restoring..." with spinner when isRestoring, disabled when isRestoring
- AlertDialogCancel disabled when isRestoring
- Dialog dismissal suppressed when isRestoring via onOpenChange guard

**Commit:** b09688f

### Task 2: Update tests -- replace placeholder with real behavior

**RestorePreviewDialog.test.tsx:**
- Added mock for `@tauri-apps/plugin-process` (relaunch)
- Replaced placeholder toast test with 3 new tests:
  1. Calls restore_from_backup with selected path when user confirms
  2. Calls relaunch after successful restore
  3. Shows error toast and does not relaunch when restore fails

**backupCard.test.tsx:**
- Added `@tauri-apps/plugin-process` mock (required since BackupCard now imports relaunch)

**Commit:** af05c91

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `pnpm build` -- passed (exit 0)
- `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx tests/data-health/backupCard.test.tsx` -- all 23 tests passed
- `pnpm test` full suite -- passed (exit 0)
- Placeholder toast text no longer appears in any source or test file

## Known Stubs

None.

## Self-Check: PASSED
