---
phase: 129-navigation-cross-links-technical-cleanup
plan: "02"
subsystem: navigation
tags: [cross-links, navigation, ux, collection, battle-log, rules-hub, unit-database]
dependency_graph:
  requires: []
  provides: [cross-page-navigation-links]
  affects: [UnitDetailSheet, BattleLogRow, RulesHubPage, DatabaseBrowserPage]
tech_stack:
  added: []
  patterns: [TanStack Router Link, useNavigate, asChild ghost button]
key_files:
  created: []
  modified:
    - src/features/units/UnitDetailSheet.tsx
    - src/features/battle-log/BattleLogRow.tsx
    - src/features/rules-hub/RulesHubPage.tsx
    - src/features/unit-database/DatabaseBrowserPage.tsx
decisions:
  - Pages use inline h1 headings rather than PageHeader with actions prop, so cross-link buttons were placed in a flex row alongside the h1
metrics:
  duration: "~8 minutes"
  completed: "2026-06-11T14:22:56Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 129 Plan 02: Cross-Page Navigation Links Summary

Cross-link navigation added: UnitDetailSheet links to Unit Database datasheet, BattleLogRow army list name links to army list detail, and Rules Hub / Unit Database have bidirectional header buttons.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add View Datasheet link to UnitDetailSheet and army list link to BattleLogRow | 478d6e8c | UnitDetailSheet.tsx, BattleLogRow.tsx |
| 2 | Add bidirectional cross-links between Rules Hub and Unit Database PageHeaders | 1c2d0854 | RulesHubPage.tsx, DatabaseBrowserPage.tsx |

## What Was Built

**Task 1 — UnitDetailSheet + BattleLogRow:**
- `UnitDetailSheet.tsx`: Added a "View Datasheet" ghost Button in the SheetHeader, conditional on `unit.udb_unit_id` being truthy. Uses `BookMarked` icon. On click: calls `onClose()` then navigates to `/unit-database`.
- `BattleLogRow.tsx`: Army list name is now wrapped in a TanStack Router `<Link to="/army-lists/$listId">` when `armyListName` is truthy. Has `onClick stopPropagation` to prevent the Collapsible row toggle from firing. When list is deleted, shows unchanged italic text.

**Task 2 — Rules Hub / Unit Database bidirectional links:**
- `RulesHubPage.tsx`: Added "Browse Units" ghost button with `ArrowRight` icon in a flex row alongside the page h1, linking to `/unit-database`.
- `DatabaseBrowserPage.tsx`: Added "View Rules" ghost button with `ArrowRight` icon in a flex row alongside the page h1, linking to `/rules-hub`.

## Deviations from Plan

### Auto-fixed Issues

None.

### Structural Adjustment

**[Rule 2 - Missing context] Pages use inline h1 not PageHeader with actions prop**
- **Found during:** Task 2
- **Issue:** Plan specified adding buttons to PageHeader `actions` prop, but both RulesHubPage and DatabaseBrowserPage use inline `<h1>` headings directly, not the PageHeader component.
- **Fix:** Wrapped the `<h1>` in a flex row `<div className="flex items-center justify-between">` and placed the cross-link button on the right side — visually equivalent to an `actions` slot.
- **Files modified:** RulesHubPage.tsx, DatabaseBrowserPage.tsx
- **Commit:** 1c2d0854

## Known Stubs

None.

## Threat Flags

None — all links are hardcoded internal routes with no user-supplied data.

## Self-Check: PASSED

- src/features/units/UnitDetailSheet.tsx: FOUND
- src/features/battle-log/BattleLogRow.tsx: FOUND
- src/features/rules-hub/RulesHubPage.tsx: FOUND
- src/features/unit-database/DatabaseBrowserPage.tsx: FOUND
- Commit 478d6e8c: FOUND
- Commit 1c2d0854: FOUND
- TypeScript + Vite build: PASSED (verified via worktree tsc --noEmit + vite build)
