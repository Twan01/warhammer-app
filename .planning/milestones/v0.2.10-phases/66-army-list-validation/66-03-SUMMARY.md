---
phase: 66-army-list-validation
plan: 03
subsystem: army-lists
tags: [ui, warnings, tactical-roles, health-panel]
dependency_graph:
  requires: [66-01, 66-02]
  provides: [health-summary-panel, per-unit-warnings, tactical-role-ui]
  affects: [army-list-detail-view]
tech_stack:
  added: []
  patterns: [computeListHealthStats-driven-summary, per-unit-warning-icons, tactical-role-dropdown]
key_files:
  created: []
  modified:
    - src/features/army-lists/ArmyListSummaryBar.tsx
    - src/features/army-lists/ArmyListDetailSheet.tsx
    - src/features/army-lists/ArmyListUnitRow.tsx
    - tests/workshop-play/armyListReadinessPanel.test.tsx
decisions:
  - "Embedded PointsFreshnessBadge inside SummaryBar rather than standalone div in DetailSheet"
  - "Tactical role dropdown uses __none__ sentinel value for clearing (Select cannot have empty string value)"
  - "Warning tooltip shows all warnings (hard + soft) comma-joined for complete context"
metrics:
  duration: "6m 33s"
  completed: 2026-05-13T13:04:54Z
---

# Phase 66 Plan 03: UI Integration (Health Summary + Warnings + Role Dropdown) Summary

Wire warning system and tactical role UI into army list detail view with full health summary panel, per-unit warning icons, and immediate-save tactical role dropdowns.

## Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Extend ArmyListSummaryBar into health summary panel | d8924fe | ArmyListSummaryBar.tsx, ArmyListDetailSheet.tsx |
| 2 | Add warning icons and tactical role dropdown to unit rows | 1491523 | ArmyListUnitRow.tsx, ArmyListDetailSheet.tsx |
| 2-fix | Wrap test renders in TooltipProvider | f46ca89 | armyListReadinessPanel.test.tsx |
| 3 | Visual checkpoint | auto-approved | -- |

## What Was Built

### Task 1: Health Summary Panel (ArmyListSummaryBar)
- Replaced manual totalPoints/paintedPoints with `computeListHealthStats()` from Plan 01
- Points display: "X / Y pts" when limit set, plain "X pts" otherwise; text-destructive when exceeded
- Stats row: Total, Owned (100% per FK constraint), Ready (battle-ready %)
- Freshness + warnings row: embedded PointsFreshnessBadge (left) + warning count with tooltip (right)
- Warning count: hidden when 0, text-destructive for hard warnings, text-amber-500 for soft-only
- Role coverage pills: only rendered when at least one unit has a tactical role (D-11 progressive disclosure)
- Covered roles: bg-secondary rounded-full; gap roles: border-dashed muted-foreground

### Task 2: Warning Icons + Tactical Role Dropdown (ArmyListUnitRow)
- Per-unit warnings computed via `computeUnitWarnings()` with memoized WarningContext
- AlertTriangle (h-3.5 w-3.5 text-destructive) for hard warnings, Info (h-3.5 w-3.5 text-amber-500) for soft
- Warning tooltip shows comma-joined list of all warning messages
- Tactical role Select dropdown (w-28 h-6 text-xs) with 7 roles + "None" clear option
- Role change mutation passes ALL fields (id, list_id, points_override, notes, tactical_role) per Pitfall 2
- Verified: handlePointsBlur and handleNotesSave already include tactical_role (added by Plan 02)
- DetailSheet passes totalPoints, pointsLimit, freshness to each ArmyListUnitRow

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test TooltipProvider wrapper**
- Found during: Task 1 verification (pnpm test)
- Issue: Tests for ArmyListSummaryBar failed because Tooltip requires TooltipProvider ancestor (normally provided by AppLayout in production)
- Fix: Wrapped test renders in TooltipProvider
- Files modified: tests/workshop-play/armyListReadinessPanel.test.tsx
- Commit: f46ca89

**2. [Rule 1 - Bug] Test stat label assertions**
- Found during: Task 1 (pnpm build)
- Issue: Tests asserted old labels "Painted:" and "Battle-ready:" which were renamed to "Owned:" and "Ready:"
- Fix: Updated test assertions to match new labels
- Files modified: tests/workshop-play/armyListReadinessPanel.test.tsx
- Commit: d8924fe (included in Task 1 commit)

## Verification

- pnpm build: PASSED (after both tasks)
- pnpm test: PASSED (all 1519 tests pass, 6 skipped, 12 todo)

## Self-Check: PASSED
- d8924fe: FOUND
- 1491523: FOUND
- f46ca89: FOUND
- src/features/army-lists/ArmyListSummaryBar.tsx: FOUND
- src/features/army-lists/ArmyListDetailSheet.tsx: FOUND
- src/features/army-lists/ArmyListUnitRow.tsx: FOUND
