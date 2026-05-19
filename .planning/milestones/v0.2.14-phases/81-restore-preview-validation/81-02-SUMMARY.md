---
phase: 81-restore-preview-validation
plan: 02
subsystem: backup
tags: [restore-preview, alert-dialog, schema-compatibility, file-picker]
dependency_graph:
  requires: [get_schema_version, BackupManifest, formatBytes]
  provides: [RestorePreviewDialog, restore-button-in-BackupCard]
  affects: [data-health-page]
tech_stack:
  added: []
  patterns: [alert-dialog-controlled, file-picker-invoke, schema-comparison]
key_files:
  created:
    - src/features/data-health/RestorePreviewDialog.tsx
    - tests/data-health/RestorePreviewDialog.test.tsx
  modified:
    - src/features/data-health/BackupCard.tsx
decisions:
  - "Duplicated formatRelativeDate helper in RestorePreviewDialog (6 lines) rather than extracting from BackupCard to avoid cross-component coupling"
  - "Schema state computed as simple enum: match/older/newer with integer comparison"
  - "RestorePreviewDialog uses controlled AlertDialog (open/onOpenChange props) matching RecipeSectionCard pattern"
metrics:
  duration: 850s
  completed: "2026-05-18T19:33:52Z"
  tasks: 2
  files: 3
---

# Phase 81 Plan 02: Restore Preview Dialog Summary

AlertDialog-based restore preview with schema compatibility banners, destructive confirmation gate, and 12 unit tests

## What Was Done

### Task 1: Create RestorePreviewDialog component
- Created `src/features/data-health/RestorePreviewDialog.tsx` as named function export
- Props: manifest (BackupManifest), currentSchemaVersion (number), open (boolean), onOpenChange, onConfirm
- 5-row manifest detail grid: Created, App Version, Schema Version, Platform, Database Size
- Schema state logic with three states:
  - **match**: green Badge "Matches current", no banner, action button enabled
  - **older**: amber Badge "Older version", amber warning banner with AlertTriangle icon, action button enabled
  - **newer**: destructive Badge "Newer than app", red error banner with ShieldAlert icon, action button disabled
- Destructive confirmation gate: AlertDialogAction with `buttonVariants({ variant: "destructive" })`, text "Replace current database"
- Build passes cleanly

### Task 2: Wire restore button into BackupCard and add tests
- BackupCard.tsx already contained restore logic from Phase 80 integration -- verified all required elements present
- Added "Restore from Backup" button (variant="outline") with Upload icon
- File picker filtered to .zip via `open` from `@tauri-apps/plugin-dialog`
- `validate_backup` + `get_schema_version` invoke chain with error handling
- RestorePreviewDialog rendered conditionally when manifest is non-null
- Placeholder toast on confirm: "Restore execution coming in a future update"
- Created `tests/data-health/RestorePreviewDialog.test.tsx` with 12 test cases:
  1. Renders Restore from Backup button
  2. Opens file picker filtered to .zip
  3. Does nothing when picker cancelled
  4. Calls validate_backup with selected path
  5. Shows error toast when validation fails
  6. Shows preview dialog after successful validation
  7. Displays all manifest fields in preview
  8. Disables action button when schema is newer
  9. Shows error banner when schema is newer
  10. Shows warning banner when schema is older
  11. Shows no banner when schema matches
  12. Shows placeholder toast on confirm click

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.mock hoisting error for toast mock**
- **Found during:** Task 2
- **Issue:** Using `const mockToast = { ... }` as top-level variable inside `vi.mock` factory caused "Cannot access before initialization" error due to hoisting
- **Fix:** Used inline mock object in `vi.mock` factory and imported `toast` after mock declaration, matching the existing `backupCard.test.tsx` pattern
- **Files modified:** tests/data-health/RestorePreviewDialog.test.tsx
- **Commit:** 4504ef3

**2. [Rule 3 - Blocking] BackupCard.tsx already modified by Phase 80**
- **Found during:** Task 2
- **Issue:** Phase 80 (commit 31de828) had already integrated the restore button, file picker, and RestorePreviewDialog into BackupCard.tsx alongside its own export_backup migration
- **Fix:** Verified all required elements were present in the existing file; no additional modifications needed. Commit only includes the new test file.
- **Files modified:** None (already correct)
- **Commit:** 4504ef3

## Verification Results

- `pnpm build`: PASSED (TypeScript compilation clean)
- `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx`: 12/12 PASSED
- `pnpm test` (full suite): 199 files passed, 1812 tests passed, 0 failed

## Known Stubs

**1. Restore execution placeholder (intentional)**
- **File:** src/features/data-health/BackupCard.tsx, line 108-111
- **Stub:** `toast.info("Restore execution coming in a future update")` on confirm
- **Reason:** Per D-13, actual restore execution is Phase 82's deliverable. This is the documented placeholder.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 1837753 | feat(81-02): create RestorePreviewDialog with schema compatibility banners |
| 2 | 4504ef3 | feat(81-02): wire restore button into BackupCard with file picker and validation |

## Self-Check: PASSED

All 2 created files exist. Both commit hashes verified in git log. BackupCard.tsx contains all required restore elements (verified in current state).
