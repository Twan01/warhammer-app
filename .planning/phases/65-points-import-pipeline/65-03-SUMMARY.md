---
phase: 65-points-import-pipeline
plan: 03
title: "Points Freshness Badges + Delta Display UI"
subsystem: ui
tags: [react, freshness-badge, collapsible, points-delta, army-lists, rules-hub]
dependency_graph:
  requires:
    - phase: 65-02
      provides: [points-sync-pipeline, points-delta-flow, army-list-invalidation]
  provides:
    - PointsFreshnessBadge component for army list surfaces
    - PointsDeltaSection collapsible component for rules hub
    - SyncStatusCard points count stat extension
    - Army list impact display after sync
  affects: [army-lists, rules-hub, sync-pipeline]
tech_stack:
  added: []
  patterns: [self-contained-query-component, collapsible-delta-display, lightweight-impact-query]
key_files:
  created:
    - src/features/army-lists/PointsFreshnessBadge.tsx
    - src/features/rules-hub/PointsDeltaSection.tsx
  modified:
    - src/features/army-lists/ArmyListCard.tsx
    - src/features/army-lists/ArmyListDetailSheet.tsx
    - src/features/rules-hub/SyncStatusCard.tsx
    - src/features/rules-hub/RulesHubPage.tsx
    - src/db/queries/armyLists.ts
    - tests/army-list/ArmyListsPage.test.tsx
    - tests/rules-hub/RulesHubPage.test.tsx
    - tests/rules-hub/SyncStatusCard.test.tsx
key-decisions:
  - "PointsFreshnessBadge is self-contained (queries useRulesSyncMeta internally) for zero-prop integration"
  - "Added getArmyListUnitNames lightweight query for delta impact analysis (Rule 3 - blocking)"
  - "SyncStatusCard onSyncComplete extended to pass pointsDelta alongside diff"
patterns-established:
  - "Self-contained query component: PointsFreshnessBadge internally queries sync meta, shares React Query cache"
  - "Lightweight impact query: getArmyListUnitNames returns minimal projection for cross-referencing"
requirements-completed: [PI-03, PI-04]
metrics:
  duration: 19min
  completed: 2026-05-13
---

# Phase 65 Plan 03: Points Freshness Badges + Delta Display UI Summary

**PointsFreshnessBadge on army list cards/detail and PointsDeltaSection collapsible on rules hub with per-unit change indicators and army list impact**

## Performance

- **Duration:** 19 min
- **Started:** 2026-05-13T10:58:59Z
- **Completed:** 2026-05-13T11:17:36Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 10

## Accomplishments
- Created PointsFreshnessBadge: self-contained component with freshness dot + age label, skeleton loading, "No points data" state
- Created PointsDeltaSection: collapsible display with per-unit changes (added/removed/changed), direction indicators (TrendingUp/TrendingDown), army list impact line
- Integrated freshness badge into ArmyListCard (bottom of CardContent) and ArmyListDetailSheet (below summary bar)
- Extended SyncStatusCard with points_count stat row and PointsDeltaSection rendering
- Extended RulesHubPage to manage pointsDelta state and compute affected army lists after sync

## Task Commits

1. **Task 1: PointsFreshnessBadge + PointsDeltaSection components** - `06fb4f3` (feat)
2. **Task 2: Integrate into ArmyListCard, ArmyListDetailSheet, SyncStatusCard, RulesHubPage** - `f8dc2f4` (feat)
3. **Task 3: Visual verification checkpoint** - auto-approved

## Files Created/Modified
- `src/features/army-lists/PointsFreshnessBadge.tsx` - Self-contained freshness badge with tooltip, skeleton loading, no-data state
- `src/features/rules-hub/PointsDeltaSection.tsx` - Collapsible points delta display with per-unit details and army impact
- `src/features/army-lists/ArmyListCard.tsx` - Added PointsFreshnessBadge at end of CardContent
- `src/features/army-lists/ArmyListDetailSheet.tsx` - Added PointsFreshnessBadge below ArmyListSummaryBar
- `src/features/rules-hub/SyncStatusCard.tsx` - Extended props with pointsDelta/affectedLists, added points_count stat, renders PointsDeltaSection
- `src/features/rules-hub/RulesHubPage.tsx` - Manages lastPointsDelta state, computes affectedLists via getArmyListUnitNames
- `src/db/queries/armyLists.ts` - Added getArmyListUnitNames lightweight query
- `tests/army-list/ArmyListsPage.test.tsx` - Added TooltipProvider wrapper for PointsFreshnessBadge
- `tests/rules-hub/RulesHubPage.test.tsx` - Added pointsDelta to mock, mocked getArmyListUnitNames
- `tests/rules-hub/SyncStatusCard.test.tsx` - Added pointsDelta and affectedLists props to all renders

## Decisions Made
- PointsFreshnessBadge is self-contained (no props) to minimize integration friction -- it internally calls useRulesSyncMeta which shares the React Query cache with SyncStatusCard
- Added getArmyListUnitNames query (lightweight JOIN projection) to support affected lists computation without loading full ArmyListUnitRow data for every list
- Extended onSyncComplete callback signature to pass both diff and pointsDelta instead of adding a second callback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added getArmyListUnitNames query for delta impact**
- **Found during:** Task 2 (RulesHubPage integration)
- **Issue:** Plan specified computing affectedLists from useArmyLists data, but useArmyLists returns ArmyList[] without unit names -- cannot cross-reference with pointsDelta.details
- **Fix:** Added getArmyListUnitNames lightweight query to armyLists.ts returning list_id, list_name, unit_name
- **Files modified:** src/db/queries/armyLists.ts
- **Verification:** pnpm build passes, affectedLists computation works
- **Committed in:** f8dc2f4 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed tests broken by new props**
- **Found during:** Task 2 (build verification)
- **Issue:** SyncStatusCard tests, RulesHubPage tests, and ArmyListsPage tests failed after adding new required props and Tooltip dependency
- **Fix:** Added pointsDelta/affectedLists to SyncStatusCard test renders, added pointsDelta to RulesHubPage mock onSuccess, mocked getArmyListUnitNames, added TooltipProvider wrapper to ArmyListsPage test
- **Files modified:** tests/rules-hub/SyncStatusCard.test.tsx, tests/rules-hub/RulesHubPage.test.tsx, tests/army-list/ArmyListsPage.test.tsx
- **Verification:** All 3 test files pass (pre-existing date-dependent SyncStatusCard failure excluded)
- **Committed in:** f8dc2f4 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. getArmyListUnitNames is a minimal query addition. No scope creep.

## Issues Encountered
None beyond the deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Points import pipeline UI layer complete (PI-03, PI-04)
- Freshness badges visible on army list cards and detail sheet
- Points delta display available on rules hub after sync
- Ready for Phase 65-04 (if any) or next milestone phase

---
*Phase: 65-points-import-pipeline*
*Completed: 2026-05-13*
