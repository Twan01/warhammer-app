---
phase: 87-session-integration-entry-points
plan: "02"
subsystem: entry-points
tags: [navigation, painting-mode, kanban, dashboard, recipe, unit-detail]
dependency_graph:
  requires: [87-01]
  provides: [EP-01, EP-02, EP-03, EP-04, EP-05, EP-06]
  affects: [dashboard, kanban, recipe-detail-sheet, applied-recipes-tab]
tech_stack:
  added: []
  patterns: [TanStack Router useNavigate, TanStack Router Link with params, callback prop threading]
key_files:
  created: []
  modified:
    - src/features/dashboard/NextPaintingActionCard.tsx
    - src/features/dashboard/CurrentFocusCard.tsx
    - src/features/dashboard/DashboardPage.tsx
    - src/features/units/AppliedRecipesTab.tsx
    - src/hooks/useKanbanEnrichment.ts
    - src/features/painting-projects/KanbanCard.tsx
    - src/features/painting-projects/KanbanColumn.tsx
    - src/features/painting-projects/KanbanBoard.tsx
    - src/features/recipes/RecipeDetailSheet.tsx
    - tests/dashboard/NextPaintingActionCard.test.tsx
decisions:
  - "Used /painting-mode/$assignmentId route (not /bare-layout/painting-mode/$assignmentId) — the bare-layout id is an internal TanStack Router layout identifier, not a URL path segment"
  - "KanbanCard does not use useNavigate directly — callback pattern (onPaint) threads navigation from KanbanBoard to avoid DnD context anti-pattern"
  - "AppliedRecipesTab uses static 'Paint' label (not 'Start Painting'/'Continue') — step progress data not available in this component without extra queries; acceptable per plan discretion note"
metrics:
  duration: "~30 minutes"
  completed: "2026-05-19"
  tasks_completed: 2
  files_modified: 10
---

# Phase 87 Plan 02: Wire Entry Points to Painting Mode Summary

All five entry point surfaces now navigate to `/painting-mode/$assignmentId`, each guarded so the CTA is hidden when no applied recipe assignment exists.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Dashboard + Unit Detail entry points | 2937bdc | NextPaintingActionCard, CurrentFocusCard, DashboardPage, AppliedRecipesTab |
| 2 | Kanban + RecipeDetailSheet entry points | da04673 | useKanbanEnrichment, KanbanCard, KanbanColumn, KanbanBoard, RecipeDetailSheet |
| Fix | Update test for new route/copy | b153050 | tests/dashboard/NextPaintingActionCard.test.tsx |

## What Was Built

Five entry points wired to Painting Mode (`/painting-mode/$assignmentId`):

1. **NextPaintingActionCard** (EP-01/D-08): "Start Painting" Link replacing the old "Go to recipe" `/painting-projects` link. Uses `params={{ assignmentId: String(data.assignment_id) }}`.

2. **CurrentFocusCard** (EP-02/D-09): Optional `onPaint?: () => void` prop added. Renders a ghost "Paint" button with `Palette` icon (size=14) only when prop is defined (D-14 guard). `DashboardPage` wires `onPaint` via `useNavigate` only when `primaryAssignment !== undefined`.

3. **AppliedRecipesTab** (EP-03/D-10): "Paint" outline button per assignment row with `data-testid="paint-btn-{id}"` navigates to painting mode. Row header flex container updated to `justify-between gap-2` with `flex-1 min-w-0 truncate` on the recipe name span.

4. **KanbanCard/Column/Board** (EP-04/D-11): `useKanbanEnrichment` extended with `assignmentIds: Map<number, number>` at zero extra query cost (primary assignment already in scope). `KanbanCard` receives `assignmentId?: number` + `onPaint?: (assignmentId: number) => void` callback — uses `e.stopPropagation()` to prevent DnD interference. Navigation handled at `KanbanBoard` level via `useNavigate` + `handlePaint` to avoid DnD sortable context anti-pattern.

5. **RecipeDetailSheet** (EP-05/D-12): `useAssignmentsByRecipe(recipe?.id)` query added. "Applied to Units" `Field` section rendered above "Sessions" when `assignments.length > 0`. Per-unit outline "Paint" button with `data-testid="paint-unit-btn-{id}"`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Route path correction: /bare-layout/painting-mode/$assignmentId → /painting-mode/$assignmentId**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** The plan specified `/bare-layout/painting-mode/$assignmentId` as the navigation target. In TanStack Router, `bare-layout` is the internal route `id` of a layout route, not a URL path segment. The actual registered route path is `/painting-mode/$assignmentId` (child of the bareLayoutRoute). TypeScript error TS2820 flagged this with "Did you mean '/painting-mode/$assignmentId'?"
- **Fix:** All five entry points use `/painting-mode/$assignmentId`
- **Files modified:** NextPaintingActionCard.tsx, CurrentFocusCard.tsx (via DashboardPage.tsx), AppliedRecipesTab.tsx, KanbanBoard.tsx, RecipeDetailSheet.tsx
- **Commit:** 2937bdc, da04673

**2. [Rule 1 - Bug] Test update for changed copy and route**
- **Found during:** Post-task test run
- **Issue:** `tests/dashboard/NextPaintingActionCard.test.tsx` asserted "Go to recipe" text and `/painting-projects` href — both changed by this plan
- **Fix:** Updated test description, text assertion ("Start Painting"), href assertion ("/painting-mode/1"), and improved Link mock to resolve params into the final href
- **Files modified:** tests/dashboard/NextPaintingActionCard.test.tsx
- **Commit:** b153050

## Known Stubs

None — all entry points navigate to real assignment IDs from live query data.

## Threat Flags

None — no new network endpoints or auth paths introduced. Assignment IDs are low-sensitivity internal identifiers (T-87-04: accepted).

## Verification

- TypeScript: `npx tsc --noEmit` passes with no errors
- Tests: 211 test files passed, 1901 tests passed, 6 skipped, 12 todo — no regressions

## Self-Check: PASSED

All modified files exist. All task commits verified: 2937bdc, da04673, b153050.
