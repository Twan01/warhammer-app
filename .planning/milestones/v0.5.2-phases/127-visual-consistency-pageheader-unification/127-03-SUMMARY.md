---
phase: 127-visual-consistency-pageheader-unification
plan: "03"
subsystem: ui
tags: [visual-consistency, tailwind, icons, status-dots]
dependency_graph:
  requires: []
  provides: [theme-token-status-dots, standard-icon-sizing]
  affects: [RecipeCard, SectionedTimeline, DashboardPage]
tech_stack:
  added: []
  patterns: [tailwind-bg-utilities-for-status-colors, h4-w4-mr2-icon-standard]
key_files:
  created: []
  modified:
    - src/features/recipes/RecipeCard.tsx
    - src/features/recipes/SectionedTimeline.tsx
    - src/features/dashboard/DashboardPage.tsx
    - tests/painting-mode/PaintingModeNotFound.test.tsx
decisions:
  - Kept dynamic backgroundColor for swatch dots and faction badges (these use runtime values, not hardcoded hex)
metrics:
  completed: 2026-06-11
  tasks_completed: 2
  tasks_total: 2
---

# Phase 127 Plan 03: Hardcoded Hex & Icon Sizing Fixes Summary

Replace hardcoded hex status dot colors with Tailwind utility classes and standardize Dashboard button icon sizing to h-4 w-4 mr-2.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Replace hardcoded hex status dots | 30e63207 | RecipeCard.tsx, SectionedTimeline.tsx |
| 2 | Dashboard button icon sizing standardization | 67fe0512 | DashboardPage.tsx |

## Changes Made

### Task 1: Status Dot Hex-to-Tailwind Migration
- **RecipeCard.tsx**: Replaced 6 inline `style={{ backgroundColor: "#..." }}` on status dots with Tailwind classes (`bg-green-500`, `bg-amber-500`, `bg-red-500`). Two remaining `backgroundColor` usages are dynamic (faction theme color and paint swatch hex) -- correctly left as-is.
- **SectionedTimeline.tsx**: Replaced 2 inline `backgroundColor` styles with `bg-green-500` and `bg-red-500`. Zero `backgroundColor` remaining.

### Task 2: Dashboard Icon Sizing
- **DashboardPage.tsx**: Replaced 3 Lucide icon instances using `size={14} className="mr-1.5"` with `className="h-4 w-4 mr-2"` (Plus x2, Paintbrush x1). Zero `size={14}` remaining.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unused _makeStep helper from PaintingModeNotFound test**
- **Found during:** Task 1 (build verification)
- **Issue:** Pre-existing TS6133 error (`_makeStep` declared but never read) blocked `pnpm build`
- **Fix:** Removed the unused `_makeStep` function and its `RecipeStep` type import
- **Files modified:** tests/painting-mode/PaintingModeNotFound.test.tsx
- **Commit:** 30e63207

## Verification

- `pnpm build` succeeds with zero TypeScript errors
- Zero `backgroundColor` with hardcoded hex in RecipeCard status dots and SectionedTimeline
- Zero `size={14}` in DashboardPage
- `bg-green-500`, `bg-amber-500`, `bg-red-500` present in RecipeCard
- `bg-green-500`, `bg-red-500` present in SectionedTimeline
- 3 occurrences of `h-4 w-4 mr-2` in DashboardPage

## Self-Check: PASSED
