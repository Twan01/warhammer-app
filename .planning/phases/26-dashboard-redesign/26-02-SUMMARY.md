---
phase: 26-dashboard-redesign
plan: "02"
subsystem: ui
tags: [react, tailwind, shadcn, zod, react-hook-form, dashboard]

# Dependency graph
requires:
  - phase: 26-01
    provides: computeRecentActivity, getNextActionHint, relativeTime, useRecentActivity — Wave 1 data layer outputs consumed by these components
  - phase: 25-design-foundation
    provides: StatusBadge, PAINTING_STATUS_TIER, StatCard, PageHeader — Phase 25 UI primitives used by HobbyPipeline and CurrentFocusCard

provides:
  - CurrentFocusCard — full-width card showing most recently active project with faction left-border, StatusBadge, painting %, and next-action hint
  - HobbyPipeline — horizontal 11-stage painting funnel with PAINTING_STATUS_TIER color bubbles
  - RecentActivityFeed — compact activity list with icon, label, relative time; unit rows are clickable
  - LogSessionSheet — RHF + Zod sheet for logging painting sessions; active-projects-first unit picker
  - logSessionSchema — Zod schema for LogSessionSheet with no .default() (Pitfall 8)

affects: [26-03, 26-04, 26-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - buildDefaultValues pattern for RHF + Zod (no .default()) carried from UnitSheet into LogSessionSheet
    - sortUnitsForPicker: active-first (updated_at DESC) then inactive alphabetically
    - TIER_BUBBLE_CLASS in HobbyPipeline mirrors TIER_DOT_CLASS in status-badge.tsx for visual consistency
    - EVENT_ICON: Record<ActivityEventType, IconComponent> typed map pattern for icon dispatch

key-files:
  created:
    - src/features/dashboard/CurrentFocusCard.tsx
    - src/features/dashboard/HobbyPipeline.tsx
    - src/features/dashboard/RecentActivityFeed.tsx
    - src/features/dashboard/LogSessionSheet.tsx
    - src/features/dashboard/logSessionSchema.ts
  modified: []

key-decisions:
  - "LogSessionSheet uses buildDefaultValues() not zod .default() — same Pitfall 8 pattern as battleLogSchema/armyListSchema (react-hook-form zodResolver type inference breaks with zod v4 .default())"
  - "HobbyPipeline derives counts from full units[] prop — never from sliced activeProjects/recentlyUpdated (Pitfall 6: those cap at 5)"
  - "RecentActivityFeed onUnitClick wiring limited to unit_added/unit_updated — session_logged and battle_logged are non-interactive in Phase 26 (per 26-RESEARCH.md Pitfall 3 recommendation)"
  - "TIER_BUBBLE_CLASS 'done' tier uses bg-battle-gold/30 (matching CSS custom property from Phase 25 design system)"

patterns-established:
  - "Wave 2 components are pure presentational — they accept typed props and do not call hooks internally (except LogSessionSheet which owns its form + mutation)"
  - "All four components use named exports only, no default exports"

requirements-completed: [DASH-02, DASH-03, DASH-04, DASH-06]

# Metrics
duration: 5min
completed: 2026-05-04
---

# Phase 26 Plan 02: Dashboard Wave 2 UI Components Summary

**Four new dashboard components — CurrentFocusCard, HobbyPipeline, RecentActivityFeed, LogSessionSheet — built with typed props, PAINTING_STATUS_TIER bubble colors, and Pitfall 8-safe Zod schema; Wave 3 DashboardPage rework is now fully unblocked**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-04T20:38:33Z
- **Completed:** 2026-05-04T20:43:21Z
- **Tasks:** 3
- **Files modified:** 5 created, 0 modified

## Accomplishments

- CurrentFocusCard: faction left-border accent, StatusBadge, painting % progress bar, getNextActionHint text, empty state when no active project
- HobbyPipeline: all 11 PAINTING_STATUS_ORDER stages with count bubbles colored by PAINTING_STATUS_TIER (not-started/prep/painting/done)
- RecentActivityFeed: icon-labeled activity rows with relative timestamps; unit_added/unit_updated rows trigger onUnitClick callback
- LogSessionSheet + logSessionSchema: RHF + Zod sheet with active-projects-first unit picker, buildDefaultValues pattern (no .default()), mutateAsync via useCreatePaintingSession

## Task Commits

Each task was committed atomically:

1. **Task 1: CurrentFocusCard + HobbyPipeline** - `7746701` (feat)
2. **Task 2: RecentActivityFeed** - `ef9b183` (feat)
3. **Task 3: LogSessionSheet + logSessionSchema** - `edf76a0` (feat)

## Files Created/Modified

- `src/features/dashboard/CurrentFocusCard.tsx` - Full-width project focus card with faction accent border, StatusBadge, progress bar, next-action hint, and empty state
- `src/features/dashboard/HobbyPipeline.tsx` - Horizontal 11-stage painting funnel with PAINTING_STATUS_TIER color bubbles; counts from full units array
- `src/features/dashboard/RecentActivityFeed.tsx` - Activity feed with Plus/PenLine/Paintbrush/Sword icons; unit rows clickable via onUnitClick
- `src/features/dashboard/logSessionSchema.ts` - Zod schema for log session form; no .default() per Pitfall 8
- `src/features/dashboard/LogSessionSheet.tsx` - Sheet form with unit picker (active-first sort), date, duration, notes; submits via useCreatePaintingSession.mutateAsync

## Decisions Made

- `logSessionSchema` uses no `.default()` — consistent with `battleLogSchema` and `armyListSchema`; defaultValues supplied via `buildDefaultValues()` in the sheet
- HobbyPipeline stage counts use the `units` prop directly — avoids Pitfall 6 (sliced arrays capped at 5)
- `onUnitClick` on RecentActivityFeed is limited to `unit_added`/`unit_updated` types in Phase 26; `session_logged`/`battle_logged` are non-interactive (per 26-RESEARCH.md)
- `bg-battle-gold/30` used for "done" tier bubble in HobbyPipeline — aligns with Phase 25 CSS custom property

## Deviations from Plan

None — plan executed exactly as written. All 5 files created per spec with exact content; `pnpm build` exits 0; all 415 tests pass.

## Wave 3 Readiness Checklist

All sibling components are ready to mount in DashboardPage (Wave 3):

- [x] `CurrentFocusCard` — accepts `{ unit: Unit | null; faction: Faction | undefined }`
- [x] `HobbyPipeline` — accepts `{ units: Unit[] }`
- [x] `RecentActivityFeed` — accepts `{ events: ActivityEvent[]; onUnitClick?: (unitId: number) => void }`
- [x] `LogSessionSheet` — accepts `{ open: boolean; onClose: () => void }`
- [x] `logSessionSchema` + `LogSessionFormValues` — exported from logSessionSchema.ts

## Issues Encountered

None.

## Next Phase Readiness

Wave 3 (26-03 DashboardPage rework) has all dependencies available:
- Wave 1 data layer hooks (useDashboardStats, useRecentActivity) complete from 26-01
- Wave 2 presentational components (this plan) complete
- DashboardPage can wire all four components in a single integration step

---
*Phase: 26-dashboard-redesign*
*Completed: 2026-05-04*
