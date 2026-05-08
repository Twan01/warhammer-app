---
phase: 16-design-overhaul
plan: "04"
subsystem: ui
tags: [react, tailwind, typography, page-headers, tabular-nums]

# Dependency graph
requires:
  - phase: 16-01
    provides: Geist Variable font + Phase 16 typography contract (text-3xl font-semibold tracking-tight)
provides:
  - Painting Projects page header upgraded to Phase 16 visual contract
  - Paints page header upgraded to Phase 16 visual contract
  - Recipes page header upgraded to Phase 16 visual contract
  - PlaybookTab stat block values (M/T/Sv/W/Ld/OC) rendered with tabular-nums
affects: [16-08, visual-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Page header contract: flex items-center justify-between pb-6 border-b border-border/40 + text-3xl font-semibold tracking-tight h1 + text-sm text-muted-foreground subtitle"
    - "Stat value tabular-nums: Pattern B single-edit on the shared .map() span covers all six stat cells"

key-files:
  created: []
  modified:
    - src/features/painting-projects/PaintingProjectsPage.tsx
    - src/features/paints/PaintsPage.tsx
    - src/features/recipes/RecipesPage.tsx
    - src/features/units/PlaybookTab.tsx

key-decisions:
  - "PlaybookTab tabular-nums applied via Pattern B (single span inside STAT_KEYS.map) — one edit covers all six stat values"

patterns-established:
  - "Pattern B tabular-nums: add to the shared span/div inside a .map() rather than six individual edits when stats are rendered via a shared sub-expression"

requirements-completed: [PAGE-HEADER-PAINTING, PAGE-HEADER-PAINTS, PAGE-HEADER-RECIPES, TABULAR-NUMS-PLAYBOOK]

# Metrics
duration: 2min
completed: "2026-05-04"
---

# Phase 16 Plan 04: Painting Workflow Page Headers + PlaybookTab Tabular-Nums Summary

**Three painting workflow pages upgraded to text-3xl Phase 16 header contract; PlaybookTab stat row gets tabular-nums for column-aligned digit rendering**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-04T08:49:27Z
- **Completed:** 2026-05-04T08:51:08Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- PaintingProjectsPage: h1 upgraded from text-xl to text-3xl tracking-tight + subtitle "Active units being worked on right now" + hairline border; KanbanBoard/drag-drop untouched
- PaintsPage: h1 upgraded + subtitle "Your paint collection, linked to recipes" + hairline border; PaintInventoryFilters, PaintRow, PaintSheet all unchanged
- RecipesPage: h1 upgraded + subtitle "Documented paint schemes for your models" + hairline border; RecipeTable, RecipeDetailSheet, filter bar all unchanged
- PlaybookTab: tabular-nums added to the shared value span inside STAT_KEYS.map() (Pattern B) — covers M/T/Sv/W/Ld/OC in one edit; formatStatValue, labels, abilities, keywords, Phase 9 save wiring untouched

## Task Commits

1. **Task 1: Upgrade Painting Projects page header** - `139d1a8` (feat)
2. **Task 2: Upgrade Paints and Recipes page headers** - `bf3ba23` (feat)
3. **Task 3: Add tabular-nums to PlaybookTab stat block values** - `6cb147e` (feat)

## Files Created/Modified
- `src/features/painting-projects/PaintingProjectsPage.tsx` - Page header upgraded to text-3xl + subtitle + hairline border
- `src/features/paints/PaintsPage.tsx` - Page header upgraded to text-3xl + subtitle + hairline border
- `src/features/recipes/RecipesPage.tsx` - Page header upgraded to text-3xl + subtitle + hairline border
- `src/features/units/PlaybookTab.tsx` - Stat value span receives tabular-nums class (Pattern B single-edit)

## Decisions Made
- PlaybookTab stat block uses Pattern B (single span in .map loop) — no need for six separate edits. The shared `<span className="text-base font-semibold text-foreground tabular-nums">` inside `STAT_KEYS.map()` covers all six stat values with one edit.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Painting Projects, Paints, Recipes, and PlaybookTab all carry the Phase 16 visual contract
- Plan 16-05 (Hobby Journal / Spending Tracker pages) can proceed immediately
- Plan 16-08 visual audit can verify these four files as part of the full design review

---
*Phase: 16-design-overhaul*
*Completed: 2026-05-04*
