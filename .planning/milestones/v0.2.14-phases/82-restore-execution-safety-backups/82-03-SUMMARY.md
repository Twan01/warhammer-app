---
phase: 82-restore-execution-safety-backups
plan: 03
subsystem: data-health
tags: [safety-backup, rules-sync, data-health, SAF-02, SAF-04]
dependency_graph:
  requires: [82-01]
  provides: [pre-sync-safety-backup, safety-backups-list-ui]
  affects: [useRulesSync, DataHealthPage]
tech_stack:
  added: []
  patterns: [invoke-before-mutation, inline-useQuery-component]
key_files:
  created:
    - src/features/data-health/SafetyBackupsList.tsx
    - tests/data-health/SafetyBackupsList.test.tsx
    - tests/rules-sync/useRulesSync.test.ts
  modified:
    - src/hooks/useRulesSync.ts
    - src/features/data-health/DataHealthPage.tsx
    - tests/datasheet/useRulesSync.test.ts
decisions:
  - "Inline useQuery in SafetyBackupsList (read-only, single consumer)"
  - "Fixed pre-existing META-06 test to distinguish invoke commands by name after safety backup invoke was added"
metrics:
  duration: "8 min"
  completed: "2026-05-19"
  tasks_completed: 4
  tasks_total: 4
  files_created: 3
  files_modified: 3
---

# Phase 82 Plan 03: Pre-Sync Safety Backup + SafetyBackupsList Summary

useRulesSync calls create_safety_backup before CSV fetch; SafetyBackupsList renders backup entries in Data Health with loading, empty, populated, and error states.

## What Was Done

### Task 1: Pre-sync safety backup in useRulesSync
Added `await invoke("create_safety_backup")` as the first statement in `mutationFn`, before the `Promise.all` CSV fetch. Not wrapped in try/catch so errors abort the sync via the existing `onError` handler. SAF-02 comment added.

### Task 2: SafetyBackupsList component + DataHealthPage integration
Created `SafetyBackupsList.tsx` with inline `useQuery` calling `invoke("list_safety_backups")`. Renders inside a Card with four states: loading (3 Skeletons), empty ("No safety backups yet"), error ("Could not load safety backups"), and populated (Shield icon + timestamp + formatted size). Integrated into DataHealthPage below BackupCard with "Safety Backups" section heading.

### Task 3: SafetyBackupsList tests
Created 3 tests: populated state (verifies timestamp via toLocaleString and size via formatBytes), empty state ("No safety backups yet"), and error state ("Could not load safety backups"). All pass.

### Task 4: useRulesSync safety backup tests
Created 2 tests: (1) verifies create_safety_backup is invoked before any fetch calls, (2) verifies sync aborts when create_safety_backup fails and bulk_sync_rules is never called. Both pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing META-06 test broken by safety backup invoke**
- **Found during:** Task 1
- **Issue:** The existing test in `tests/datasheet/useRulesSync.test.ts` tracked generic "invoke" calls. After adding `invoke("create_safety_backup")` as the first invoke, the test's `callOrder.indexOf("invoke")` found the safety backup call instead of `bulk_sync_rules`, causing the assertion `snapshotIdx < invokeIdx` to fail.
- **Fix:** Changed the mock to track `invoke:${commandName}` and updated the assertion to look for `invoke:bulk_sync_rules` specifically.
- **Files modified:** tests/datasheet/useRulesSync.test.ts
- **Commit:** d80f9f8

## Verification

- `pnpm build` passes (0 TypeScript errors)
- `pnpm test` full suite: 201 files passed, 1819 tests passed, 0 failures
- `tests/data-health/SafetyBackupsList.test.tsx`: 3/3 pass
- `tests/rules-sync/useRulesSync.test.ts`: 2/2 pass
- `tests/datasheet/useRulesSync.test.ts`: all tests pass (including fixed META-06)

## Commits

| Hash | Message |
|------|---------|
| d80f9f8 | feat(82-03): add pre-sync safety backup and SafetyBackupsList |

## Self-Check: PASSED

All created files exist, commit verified in git log.
