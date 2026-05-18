---
phase: 80-export-ui-backup-status
plan: "01"
subsystem: lib
tags: [utility, backup, freshness, tdd]
dependency_graph:
  requires: []
  provides: [BackupFreshness, getBackupFreshness, getBackupAgeLabel, BACKUP_FRESHNESS_DOT_CLASS]
  affects: [src/features/data-health/BackupCard.tsx, src/features/dashboard/DataHealthSummaryCard.tsx]
tech_stack:
  added: []
  patterns: [pure-function utility, fake-timers TDD, syncFreshness structural mirror]
key_files:
  created:
    - src/lib/backupFreshness.ts
    - tests/data-health/backupFreshness.test.ts
  modified: []
decisions:
  - "Use inclusive <= thresholds (not <) per D-01: ageDays <= 7 healthy, ageDays <= 30 recommended"
  - "overdue maps to bg-orange-500 (not bg-red-500 used by sync stale tier)"
  - "Structural mirror of syncFreshness.ts with adapted tier names and thresholds"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-18"
  tasks_completed: 1
  tasks_total: 1
  files_created: 2
  files_modified: 0
---

# Phase 80 Plan 01: Backup Freshness Utility Summary

**One-liner:** Backup health tier utility (healthy/recommended/overdue/never) with inclusive thresholds and Tailwind dot classes, mirroring syncFreshness.ts structure exactly.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | Add failing backupFreshness tests | 1c678e5 | tests/data-health/backupFreshness.test.ts |
| GREEN | Implement backupFreshness utility | 7ecea05 | src/lib/backupFreshness.ts |

## What Was Built

`src/lib/backupFreshness.ts` — pure utility exporting:
- `BackupFreshness` type: `"healthy" | "recommended" | "overdue" | "never"`
- `getBackupFreshness(date: string | null): BackupFreshness` — tier computation with inclusive thresholds (<=7 healthy, <=30 recommended, >30 overdue, null = never)
- `getBackupAgeLabel(date: string | null): string` — human-readable label ("No backup" / "Backed up today" / "Backed up yesterday" / "Backed up N days ago")
- `BACKUP_FRESHNESS_DOT_CLASS: Record<BackupFreshness, string>` — Tailwind dot color map (green-500 / amber-500 / orange-500 / muted-foreground)

`tests/data-health/backupFreshness.test.ts` — 15 unit tests covering:
- Tier boundaries: null, 0, 7 (inclusive healthy), 8 (recommended), 30 (inclusive recommended), 31 (overdue), 60 days
- Age labels: null, today, yesterday, 5 days ago
- Dot class map values for all 4 tiers

## TDD Gate Compliance

- RED commit: `1c678e5` — test(80-01): add failing tests
- GREEN commit: `7ecea05` — feat(80-01): implement backupFreshness utility
- All 15 tests passed after implementation

## Verification

```
pnpm test -- tests/data-health/backupFreshness.test.ts
# Test Files  198 passed | 6 skipped (204)
# Tests  1795 passed | 6 skipped | 12 todo (1813)
# Exit code: 0
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. Input is parsed from localStorage date string; malformed date produces NaN which falls through to "overdue" (safe degradation per T-80-01 accepted disposition).

## Self-Check: PASSED

- [x] src/lib/backupFreshness.ts exists with all 4 exports
- [x] tests/data-health/backupFreshness.test.ts exists with 15 tests
- [x] RED commit 1c678e5 exists
- [x] GREEN commit 7ecea05 exists
- [x] All tests green (exit 0)
- [x] getBackupFreshness uses <= 7 and <= 30 (inclusive)
- [x] BACKUP_FRESHNESS_DOT_CLASS["overdue"] is "bg-orange-500"
