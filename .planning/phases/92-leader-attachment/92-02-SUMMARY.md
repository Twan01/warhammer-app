---
phase: 92-leader-attachment
plan: 02
subsystem: army-lists
tags: [leader-attachment, ui, sheet, visual-grouping]
dependency_graph:
  requires: [92-01]
  provides: [LeaderAttachmentSheet, leader-trigger-button, visual-grouping]
  affects: [ArmyListsPage, ArmyListDetailSheet, ArmyListUnitRow]
tech_stack:
  added: []
  patterns: [sibling-portal-sheet, groupUnitsWithLeaders-useMemo, leader-eligibility-check]
key_files:
  created:
    - src/features/army-lists/LeaderAttachmentSheet.tsx
    - tests/army-lists/LeaderAttachmentSheet.test.tsx
  modified:
    - src/features/army-lists/ArmyListsPage.tsx
    - src/features/army-lists/ArmyListDetailSheet.tsx
    - src/features/army-lists/ArmyListUnitRow.tsx
    - tests/army-lists/ArmyListUnitRow.test.tsx
decisions:
  - LeaderAttachmentSheet follows exact EnhancementPickerSheet sibling portal pattern
  - Leader eligibility uses case-insensitive name match against synced_leader_targets
  - Visual grouping via groupUnitsWithLeaders in useMemo, not server-side
metrics:
  duration: 6m
  completed: 2026-05-21T06:37:38Z
  tasks_completed: 2
  tasks_total: 2
  test_count: 8
  files_changed: 7
---

# Phase 92 Plan 02: Leader Attachment UI & Visual Grouping Summary

LeaderAttachmentSheet with target browsing, attach/detach actions, disabled-state tooltips, and visual grouping via indented leader rows with faction accent border

## What Was Built

### Task 1: LeaderAttachmentSheet Component + Tests
- Created `LeaderAttachmentSheet.tsx` cloning the `EnhancementPickerSheet` pattern
- Props: open, unit, list, units, onClose
- Fetches leader targets via `useLeaderTargets` hook, filters to valid targets by case-insensitive name match
- Current attachment banner with "Detach Leader" destructive button
- Per-target action buttons: "Attach Leader" (outline), "Detach Leader" (destructive), disabled with "Already led by [name]" tooltip
- Empty state showing comma-separated valid target names from synced data
- No-faction guard state
- 8 test cases covering all interaction states (title, targets, disabled tooltip, detach, attach mutate, detach mutate, empty state, no-faction guard)

### Task 2: Wire Visual Grouping + Sibling Portal + Leader Trigger
- **ArmyListsPage.tsx**: Added `leaderUnitId` state, `leaderUnit` derived lookup, `openLeaderAttach`/`closeLeaderAttach` handlers, `LeaderAttachmentSheet` sibling portal, `setLeaderUnitId(null)` in `closeDetail`
- **ArmyListDetailSheet.tsx**: Imported `groupUnitsWithLeaders` and `useLeaderTargets`, added `onAttachLeader` prop, computed `groupedUnits` via `useMemo`, built `leaderNameMap` for target-to-leader-name lookup, replaced `units.map` with `groupedUnits.map` passing `isIndentedLeader`, `onAttachLeader`, `leaderName`, `leaderTargets`
- **ArmyListUnitRow.tsx**: Extended props with `onAttachLeader`, `isIndentedLeader`, `leaderName`, `leaderTargets`. Added leader eligibility check. Added `border-l-2` + faction accent color on indented leader rows, `pl-8` indent on first cell, "Leader: [name]" badge on target rows, and "Attach Leader"/"Attached" trigger button for leader-eligible units

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Radix tooltip duplicate text in test**
- **Found during:** Task 1
- **Issue:** Radix Tooltip renders tooltip text in multiple DOM nodes, causing `findByText` to find multiple matches
- **Fix:** Used `findAllByText` with length assertion instead of `findByText`
- **Files modified:** tests/army-lists/LeaderAttachmentSheet.test.tsx
- **Commit:** e27e934

**2. [Rule 3 - Blocking] Fixed existing test missing new required prop**
- **Found during:** Task 2
- **Issue:** `ArmyListUnitRow.test.tsx` missing `onAttachLeader` prop after interface extension; `LeaderAttachmentSheet.test.tsx` missing `list_type` field in ArmyList factory
- **Fix:** Added `onAttachLeader` to test render helper, added `list_type: null` to list factory
- **Files modified:** tests/army-lists/ArmyListUnitRow.test.tsx, tests/army-lists/LeaderAttachmentSheet.test.tsx
- **Commit:** 3ca60a2

**3. [Rule 3 - Blocking] Removed unused Link2 import from ArmyListDetailSheet**
- **Found during:** Task 2
- **Issue:** Unused import caused TS6133 error (`noUnusedLocals` strict mode)
- **Fix:** Removed the unused import
- **Files modified:** src/features/army-lists/ArmyListDetailSheet.tsx
- **Commit:** 3ca60a2

## Verification

- `pnpm test -- tests/army-lists/LeaderAttachmentSheet.test.tsx -x`: 8/8 passed
- `pnpm test -- tests/army-lists/ -x`: 95/95 passed (9 test files)
- `pnpm build`: passed (TypeScript clean, Vite build successful)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | e27e934 | feat(92-02): create LeaderAttachmentSheet component with 8 tests |
| 2 | 3ca60a2 | feat(92-02): wire leader attachment into army list UI |
