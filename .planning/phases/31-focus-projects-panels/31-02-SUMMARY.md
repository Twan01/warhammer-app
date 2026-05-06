---
phase: 31-focus-projects-panels
plan: "02"
subsystem: ui
tags: [react, tailwind, dashboard, photos, thumbnails, sqlite-datetime]

# Dependency graph
requires:
  - phase: 31-01
    provides: UnitThumbnail component and DashboardPage photo wiring (useLatestUnitPhotos, logDefaultUnitId state)
provides:
  - ActiveProjectsPanel component (compact project rows with UnitThumbnail sm, progress, relative date, Open/Log actions)
  - relativeDate utility in src/lib/dates.ts (SQLite datetime string to human-readable relative string)
  - DashboardPage right column updated: ActiveProjectsPanel above RecentActivityFeed
  - Loading skeletons updated for new Active Projects section and taller CurrentFocusCard
affects: [31-03, 33-data-intelligence, 34-visual-depth]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prop-drilling latestPhotos map to child panels (no hook duplication)"
    - "SQLite datetime .replace(' ', 'T') before new Date() parsing"
    - "Parent-owned callbacks (onOpen/onLog) for Sheet/Dialog actions — no nested portals"

key-files:
  created:
    - src/features/dashboard/ActiveProjectsPanel.tsx
  modified:
    - src/lib/dates.ts
    - src/features/dashboard/DashboardPage.tsx

key-decisions:
  - "relativeDate uses .replace(' ', 'T') to convert SQLite space-separator format before parsing — matches Pitfall 4 from 31-RESEARCH.md"
  - "ActiveProjectsPanel receives latestPhotos as prop, not calling useLatestUnitPhotos internally — hook called once in DashboardPage (Pitfall 2)"
  - "No Sheet/Dialog inside ActiveProjectsPanel — onOpen/onLog callbacks owned by DashboardPage (sibling portal contract, Pitfall 1)"
  - "Right column loading skeleton extended with Active Projects section (3 x h-14 rows) to prevent layout shift on load"
  - "CurrentFocusCard skeleton updated from h-28 to h-32 for taller photo layout introduced in Plan 01"

patterns-established:
  - "Panel pattern: receive data + callbacks as props, render compact rows, empty state with icon + guidance text"
  - "relativeDate: today / yesterday / Xd ago / Xmo ago — covers hobby update cadence"

requirements-completed: [PANEL-03, PHOTO-01]

# Metrics
duration: 7min
completed: 2026-05-06
---

# Phase 31 Plan 02: Active Projects Panel Summary

**ActiveProjectsPanel with UnitThumbnail sm rows, relativeDate utility for SQLite datetimes, and bento grid right-column wiring completing PANEL-03 and PHOTO-01**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-06T08:23:04Z
- **Completed:** 2026-05-06T08:29:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `ActiveProjectsPanel` rendering up to 5 active projects as compact 44px-thumbnail rows with name, painting percentage, relative last-updated date, and Open/Log ghost buttons
- Added `relativeDate()` to `src/lib/dates.ts` handling SQLite's non-ISO space-separator datetime format safely
- Wired `ActiveProjectsPanel` into DashboardPage right column above `RecentActivityFeed`, propagating existing `latestPhotos`, `stats.activeProjects`, `stats.factions`, and Log/Open callbacks without any new hook calls
- Updated loading skeleton right column to show Active Projects section header + 3 x h-14 row stubs, and bumped CurrentFocusCard skeleton from h-28 to h-32

## Task Commits

Each task was committed atomically:

1. **Task 1: Add relativeDate utility and create ActiveProjectsPanel component** - `fd431bb` (feat)
2. **Task 2: Wire ActiveProjectsPanel into DashboardPage and update skeletons** - `1a4d490` (feat)

**Plan metadata:** _(committed with final docs commit)_

## Files Created/Modified
- `src/lib/dates.ts` - Added `relativeDate()` export; handles SQLite "YYYY-MM-DD HH:MM:SS" format via space→T replacement
- `src/features/dashboard/ActiveProjectsPanel.tsx` - New component: compact project rows, UnitThumbnail sm, empty state, prop-only data contract
- `src/features/dashboard/DashboardPage.tsx` - Imported and rendered ActiveProjectsPanel in populated and loading states; skeleton updated

## Decisions Made
- `relativeDate` replaces the space character with "T" before `new Date()` parsing — the simplest safe fix for SQLite's non-ISO format (Pitfall 4)
- `latestPhotos` prop-drilled from DashboardPage to avoid calling `useLatestUnitPhotos` a second time inside the panel (Pitfall 2)
- `onOpen` / `onLog` callbacks passed to panel rather than mounting Sheets inside it — sibling portal contract maintained (Pitfall 1)
- Right column loading skeleton extended in-place (no layout shift) to match the new populated structure

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PANEL-03 and PHOTO-01 (Phase 31 scope) both complete
- Phase 31 is fully delivered: UnitThumbnail (Plan 01) + CurrentFocusCard v2 (Plan 01) + ActiveProjectsPanel (Plan 02)
- Phase 33 (Data Intelligence) can now proceed — CurrentFocusCard photo wiring that DATA-06 depends on is in place
- No blockers

---
*Phase: 31-focus-projects-panels*
*Completed: 2026-05-06*
