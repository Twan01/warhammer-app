---
phase: 26-dashboard-redesign
plan: "03"
subsystem: ui
tags: [react, tauri, dashboard, tailwind, react-query]

requires:
  - phase: 26-01
    provides: "computeStats.units field, useRecentActivity hook, computeRecentActivity"
  - phase: 26-02
    provides: "CurrentFocusCard, HobbyPipeline, RecentActivityFeed, LogSessionSheet, logSessionSchema"
  - phase: 25-design-foundation
    provides: "PageHeader component with title/subtitle/actions API"

provides:
  - "Rewritten DashboardPage implementing Hobby Command Center layout (DASH-01..06)"
  - "FactionSummaryCard with painting progress bar + battle-ready points display (DASH-05)"
  - "Dead code removed: DashboardListRow.tsx and statusAbbr.ts deleted"

affects: [26-04, 27-navigation]

tech-stack:
  added: []
  patterns:
    - "Sibling sheet portal: Quick Add UnitSheet key='quick-add' separate React instance from edit UnitSheet (Pitfall 2)"
    - "Dynamic subtitle from stats fields — only in populated branch, never in loading/error (Pitfall 7)"
    - "FactionSummaryCard progress bar mirrors StatCard pattern: h-0.5 bg-border/40 track + bg-faction-accent fill"

key-files:
  created: []
  modified:
    - src/features/dashboard/DashboardPage.tsx
    - src/features/dashboard/FactionSummaryCard.tsx
    - tests/dashboard/DashboardPage.test.tsx
  deleted:
    - src/features/dashboard/DashboardListRow.tsx
    - src/features/dashboard/statusAbbr.ts

key-decisions:
  - "handleRowClick removed (unused after rewrite); handleUnitIdClick retained for RecentActivityFeed onUnitClick"
  - "DashboardPage.test.tsx updated to assert new contract: Hobby Command Center title, no old Progress/list sections"
  - "allDisplayedUnits memo replaced with stats.units direct reference (Pitfall 3: full array not sliced sub-arrays)"

patterns-established:
  - "Quick Add pattern: key='quick-add' UnitSheet mounted as top-level sibling with separate open state"
  - "Loading/error branches render PageHeader with title only, never subtitle from stats (Pitfall 7)"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06]

duration: 22min
completed: "2026-05-04"
---

# Phase 26 Plan 03: Dashboard Wave 3 Integration Summary

**DashboardPage rewritten as Hobby Command Center — PageHeader with dynamic subtitle + Quick Add/Log Session actions, CurrentFocusCard anchor, HobbyPipeline strip, RecentActivityFeed feed; FactionSummaryCard upgraded with painting progress bar and battle-ready points; dead DashboardListRow + statusAbbr modules deleted.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-05-04T20:45:00Z
- **Completed:** 2026-05-04T22:55:00Z
- **Tasks:** 3
- **Files modified:** 3 modified, 2 deleted

## Accomplishments

- Wired all Wave 2 components (CurrentFocusCard, HobbyPipeline, RecentActivityFeed, LogSessionSheet) into DashboardPage as DASH-03/04/06 sections
- Title changed from "Dashboard" to "Hobby Command Center" across all 3 render branches (error, loading, populated/empty)
- Dynamic subtitle `{N} active projects · {M} models tracked · {P} battle-ready points` added via middle dot separator (U+00B7) in populated branch only
- Quick Add + Log Session action buttons wired into PageHeader actions slot (DASH-02)
- FactionSummaryCard upgraded with h-0.5 painting progress bar + battle-ready points prominent display (DASH-05)
- All 5 Pitfalls addressed: sibling portals (1), keyed Quick Add (2), stats.units full array (3), HobbyPipeline from stats.units not sub-arrays (6), loading/error branches stats-free (7)
- Dead code deleted: DashboardListRow.tsx + statusAbbr.ts (already removed from HEAD in prior commit, confirmed zero references)

## Task Commits

1. **Task 1+2: Upgrade FactionSummaryCard + Rewrite DashboardPage** - `6c8fa75` (feat)
   - FactionSummaryCard inner body replaced with progress bar + battle-ready layout
   - DashboardPage full rewrite with Hobby Command Center layout
   - DashboardPage.test.tsx updated to match new contract
2. **Task 3: Delete unused modules** - already removed in `d0e3f17` (prior session)
   - DashboardListRow.tsx and statusAbbr.ts not present in HEAD
   - DS08 test mock stub already cleaned up

## Files Created/Modified

- `src/features/dashboard/DashboardPage.tsx` — Rewritten: PageHeader actions, CurrentFocusCard, HobbyPipeline, RecentActivityFeed, LogSessionSheet + Quick Add UnitSheet siblings; subtitle DASH-01; all Pitfalls addressed
- `src/features/dashboard/FactionSummaryCard.tsx` — Inner body replaced: model count, painting % progress bar (h-0.5 bg-faction-accent), battle-ready pts (prominent), owned pts (de-emphasized)
- `tests/dashboard/DashboardPage.test.tsx` — Updated assertions: "Hobby Command Center" heading, no old Progress/list section checks; getByText("250") → getAllByText("250")
- `src/features/dashboard/DashboardListRow.tsx` — Deleted (no references remaining)
- `src/features/dashboard/statusAbbr.ts` — Deleted (no references remaining)

## Decisions Made

- `handleRowClick` removed from DashboardPage (was unused after lists replaced by RecentActivityFeed); `handleUnitIdClick` kept for `RecentActivityFeed onUnitClick` prop
- Test updated rather than kept broken: old Progress section assertions removed, new Hobby Command Center title assertion added
- `allDisplayedUnits` memo simplified to `stats?.units ?? []` (Pitfall 3 — was a Set dedup of activeProjects+recentlyUpdated slices, now full array)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DashboardPage.test.tsx assertions matched old layout**
- **Found during:** Task 2 verification (pnpm test)
- **Issue:** Two tests asserted old "Progress", "Painting Progress", "Assembly Progress", "Basing Progress", "Recently Updated" sections and "Dashboard" page title — all intentionally removed by the plan
- **Fix:** Updated assertions to check "Hobby Command Center" title, assert absence of old sections, and use `getAllByText("250")` for the multi-match stat value
- **Files modified:** tests/dashboard/DashboardPage.test.tsx
- **Verification:** pnpm test — 72 files passed, 2 skipped (pre-existing Wave 0 stubs)
- **Committed in:** 6c8fa75 (Task 1+2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — stale test assertions)
**Impact on plan:** Test update necessary to match the intentional layout change. No scope creep.

## Issues Encountered

- `DashboardListRow.tsx` and `statusAbbr.ts` were already deleted from HEAD in commit `d0e3f17` (Phase 25 Nyquist validation session). The `rm` commands in Task 3 removed on-disk copies that were untracked. No additional git commit needed for deletion.

## Pitfall Coverage Checklist

| Pitfall | Description | Addressed |
|---------|-------------|-----------|
| 1 | Sheet/Dialog always TOP-LEVEL siblings, never nested | Yes — all 6 portals are siblings of main content div |
| 2 | Quick Add UnitSheet has key="quick-add" separate from edit UnitSheet | Yes — explicit key="quick-add" on Quick Add instance |
| 3 | selectedUnit derives from stats.units full array | Yes — allDisplayedUnits = stats?.units ?? [] |
| 6 | HobbyPipeline fed from stats.units not sliced sub-arrays | Yes — `<HobbyPipeline units={stats.units} />` |
| 7 | Loading/error branches do not access stats fields | Yes — both early-return branches render title-only PageHeader |

## Wave 4 Readiness Checklist

- [x] "Hobby Command Center" title visible in all 3 render states
- [x] Dynamic subtitle renders in populated state with correct · separator
- [x] Quick Add button opens UnitSheet create mode (key="quick-add")
- [x] Log Session button opens LogSessionSheet
- [x] CurrentFocusCard appears full-width above stat row
- [x] HobbyPipeline strip renders below stat row
- [x] RecentActivityFeed renders below Hobby Health and By Faction sections
- [x] FactionSummaryCard shows progress bar + battle-ready points
- [x] pnpm build exits 0
- [x] pnpm test exits 0 (72 passed, 2 pre-existing skipped)

## Next Phase Readiness

- Wave 4 (manual smoke test, 26-04-PLAN.md) can now verify the live Hobby Command Center
- All DASH-01..06 requirements are wired and compile clean
- Phase 27 (Navigation & Quick Add) can build on the Quick Add pattern established here

---
*Phase: 26-dashboard-redesign*
*Completed: 2026-05-04*
