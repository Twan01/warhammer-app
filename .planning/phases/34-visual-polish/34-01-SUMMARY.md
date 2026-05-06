---
phase: 34-visual-polish
plan: 01
subsystem: ui
tags: [react, tailwindcss, dashboard, visual-polish, shadcn]

# Dependency graph
requires:
  - phase: 34-00
    provides: VIS-01/VIS-02 test stubs that define acceptance criteria for this plan
provides:
  - VIS-01: FactionSummaryCard v2 with top accent band, enlarged dimensions, Circle icon, full-card active glow
  - VIS-02: Dashboard hero radial gradient background tied to active faction color
  - VIS-03: Hover shadow transitions on all 6 dashboard card types
affects: [34-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Top accent band via absolute inner div (avoids border-radius clipping on rounded-xl)
    - Radial gradient hero via inline style with activeFactionHex + hex opacity suffix
    - Hover shadow hierarchy: shadow-sm base → hover:shadow-md with transition-shadow duration-150

key-files:
  created: []
  modified:
    - src/features/dashboard/FactionSummaryCard.tsx
    - src/features/dashboard/DashboardPage.tsx
    - src/features/dashboard/StatCard.tsx
    - src/features/dashboard/CurrentFocusCard.tsx
    - src/features/dashboard/HobbyPipeline.tsx
    - src/features/dashboard/RecentActivityFeed.tsx
    - src/features/dashboard/ArmyReadinessCard.tsx

key-decisions:
  - "Top accent band uses absolute inner div not border — prevents border-radius clipping and allows overflow-hidden on the Card"
  - "Active FactionSummaryCard uses full-card glow (bg-faction-accent/10 + ring-2 + shadow-md) replacing the old ring-only treatment"
  - "Star icon replaced with Circle (size 8) — subtler glow dot pattern for the activate toggle"
  - "Hero gradient appends 12 as hex opacity (7.06%) to activeFactionHex — keeps the gradient extremely subtle so it does not obscure text"
  - "StatCard removes hover:bg-muted/50 in favour of hover:shadow-md — shadow hierarchy is consistent with all other card types"
  - "Loading skeleton FactionCard updated from h-28 w-[180px] to h-32 w-[220px] to match enlarged card"

patterns-established:
  - "VIS-pattern: transition-shadow duration-150 hover:shadow-md on all dashboard card surfaces for tactile depth"
  - "VIS-pattern: faction color radial gradient at hero area (col-span-full wrapper, inline style, 70% transparent fade)"

requirements-completed: [VIS-01, VIS-02, VIS-03]

# Metrics
duration: 11min
completed: 2026-05-06
---

# Phase 34 Plan 01: Visual Polish — FactionSummaryCard v2 + Hero Gradient + Hover Shadows Summary

**CSS-only dashboard visual upgrade: 8px top accent band on faction cards, radial gradient hero area, and uniform shadow hover transitions across all 6 card types**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-06T09:05:33Z
- **Completed:** 2026-05-06T09:17:06Z
- **Tasks:** 3 (2 auto + 1 auto-approved checkpoint)
- **Files modified:** 7

## Accomplishments
- FactionSummaryCard v2: enlarged cards (220px min-width), 8px top color band, Circle glow dot, full-card active glow treatment
- Dashboard hero area wrapped in subtle radial gradient using activeFactionHex at ~7% opacity
- All 6 dashboard card types now have smooth shadow hover transitions (shadow-sm → hover:shadow-md, 150ms)
- Loading skeleton updated to match new FactionCard dimensions (h-32 w-[220px])

## Task Commits

Each task was committed atomically:

1. **Task 1: FactionSummaryCard v2 — top band, active glow, Circle icon (VIS-01)** - `677476e` (feat)
2. **Task 2: Hero radial gradient + skeleton update + hover shadows on all dashboard cards (VIS-02/03)** - `1f6cc49` (feat)
3. **Task 3: Visual verification checkpoint** - auto-approved (⚡ AUTO_CHAIN active)

## Files Created/Modified
- `src/features/dashboard/FactionSummaryCard.tsx` - VIS-01: top band div, min-w-[220px], Circle icon, glow treatment
- `src/features/dashboard/DashboardPage.tsx` - VIS-02: hero gradient wrapper, activeFactionHex, skeleton update
- `src/features/dashboard/StatCard.tsx` - VIS-03: hover shadow transition, removed hover:bg-muted/50
- `src/features/dashboard/CurrentFocusCard.tsx` - VIS-03: hover shadow on both empty/active branches
- `src/features/dashboard/HobbyPipeline.tsx` - VIS-03: hover shadow on card
- `src/features/dashboard/RecentActivityFeed.tsx` - VIS-03: hover shadow on both empty/populated branches
- `src/features/dashboard/ArmyReadinessCard.tsx` - VIS-03: hover shadow on all 3 branches (loading/empty/populated)

## Decisions Made
- Top accent band uses absolute inner div not border — prevents border-radius clipping and allows overflow-hidden on the Card
- Active FactionSummaryCard uses full-card glow (bg-faction-accent/10 + ring-2 + shadow-md) replacing the old ring-only treatment
- Star icon replaced with Circle (size 8) — subtler glow dot pattern for the activate toggle
- Hero gradient appends `12` as hex opacity suffix to activeFactionHex (~7% opacity) — keeps gradient extremely subtle
- StatCard removes `hover:bg-muted/50` in favour of hover shadow — unified shadow hierarchy across all card types
- Loading skeleton FactionCard updated from h-28 w-[180px] to h-32 w-[220px] to match enlarged card

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failures in `tests/spending/computeSpendingStats.test.ts` (8 tests for DATA-03/04 cost-per-model split) were present before this plan and are unrelated to dashboard visual changes. Logged to deferred items per deviation scope boundary rule.

## Next Phase Readiness
- VIS-01, VIS-02, VIS-03 requirements complete
- Dashboard is visually polished and ready for Phase 34 Plan 02 (final validation)
- No blockers

---
*Phase: 34-visual-polish*
*Completed: 2026-05-06*
