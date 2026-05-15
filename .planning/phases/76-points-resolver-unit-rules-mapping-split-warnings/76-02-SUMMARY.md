---
phase: 76-points-resolver-unit-rules-mapping-split-warnings
plan: 02
subsystem: army-lists-ui
tags: [ui-integration, source-chip, match-indicator, warning-split, sheet]
dependency_graph:
  requires: [76-01]
  provides: [PointsSourceChip, MatchStatusIndicator, RulesMappingSheet]
  affects: [ArmyListUnitRow, ArmyListSummaryBar]
tech_stack:
  added: []
  patterns: [inline-icon-button, source-dot-chip, list-warning-badges]
key_files:
  created:
    - src/features/army-lists/PointsSourceChip.tsx
    - src/features/army-lists/MatchStatusIndicator.tsx
    - src/features/army-lists/RulesMappingSheet.tsx
  modified:
    - src/features/army-lists/ArmyListUnitRow.tsx
    - src/features/army-lists/ArmyListSummaryBar.tsx
    - tests/dashboard/armyReadinessQuery.test.ts
decisions:
  - "PointsSourceChip uses h-1.5 w-1.5 dot (not h-2 w-2 like PointsFreshnessBadge) per UI-SPEC"
  - "MatchStatusIndicator uses h-6 w-6 ghost button for compact inline display"
  - "RulesMappingSheet search debounces at 300ms with min 2 char threshold"
  - "Ambiguity detection uses React Query with 5min staleTime (T-76-05 mitigation)"
metrics:
  duration: "7m"
  completed: "2026-05-15"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 3
---

# Phase 76 Plan 02: UI Integration - PointsSourceChip, MatchStatusIndicator, RulesMappingSheet Summary

Three new UI components (PointsSourceChip, MatchStatusIndicator, RulesMappingSheet) integrated into ArmyListUnitRow and ArmyListSummaryBar with list-level warning badges and updated tooltip text.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 72e74aa | feat | Create PointsSourceChip, MatchStatusIndicator, and RulesMappingSheet components |
| dd05c80 | feat | Integrate components into ArmyListUnitRow and ArmyListSummaryBar |

## Task Results

### Task 1: PointsSourceChip, MatchStatusIndicator, and RulesMappingSheet components
- Created PointsSourceChip with 5-source dot color map (synced/emerald, override/violet, user-override/amber, base/blue, unknown/muted), Tooltip, aria-label
- Created MatchStatusIndicator with 5 states (confirmed/Check/emerald, auto/Link/muted, manual/Pencil/blue, null/AlertTriangle/amber, ambiguous/AlertTriangle/destructive)
- Created RulesMappingSheet with current match section, confirm/remove actions, debounced search (300ms), scrollable results list, toast notifications

### Task 2: Integrate into ArmyListUnitRow and ArmyListSummaryBar
- ArmyListUnitRow: calls resolveUnitPoints with all 4 source columns, renders PointsSourceChip below points Input
- ArmyListUnitRow: renders MatchStatusIndicator between warning icon and unit name, opens RulesMappingSheet on click
- ArmyListUnitRow: ambiguity detection via useQuery on findMatchingDatasheets with React Query caching
- ArmyListSummaryBar: renders list-level warnings from computeListWarnings as Badge components (destructive for hard, outline for soft)
- ArmyListSummaryBar: tooltip updated from "N critical, M informational" to "N list warnings, M unit warnings"
- Fixed armyReadinessQuery test that expected old 2-level COALESCE pattern (Rule 3)

### Task 3: Checkpoint (auto-approved)
- Auto-approved in --auto mode

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed armyReadinessQuery test for 4-level COALESCE**
- **Found during:** Task 2 test run
- **Issue:** Test expected old `COALESCE(u.points, 0)` pattern, but Plan 01 upgraded dashboard.ts to 4-level `COALESCE(sup.points, uo.points, u.points, 0)`
- **Fix:** Updated test assertion to match the 4-level COALESCE
- **Files modified:** tests/dashboard/armyReadinessQuery.test.ts
- **Commit:** dd05c80

## Verification

- `pnpm build` -- success, no TypeScript errors
- `pnpm test` -- 1604 passed, 6 skipped, 12 todo (all green)

## Self-Check: PASSED
