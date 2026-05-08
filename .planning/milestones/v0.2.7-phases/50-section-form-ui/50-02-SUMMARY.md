---
phase: 50-section-form-ui
plan: "02"
subsystem: ui
tags: [react, dnd-kit, radix-ui, shadcn, collapsible, sortable, recipes, sections]

# Dependency graph
requires:
  - phase: 50-01
    provides: DraftSection type, makeDraftSection factory, recipeSection.ts
  - phase: 50-section-form-ui (plan 01)
    provides: RecipeStepList component, DraftStep type, RECIPE_SURFACES const

provides:
  - RecipeSectionCard: collapsible sortable card with drag handle, inline editing, step list, delete confirm
  - RecipeSectionList: outer DndContext wrapping SortableContext of section cards for drag reorder
  - alert-dialog.tsx: shadcn AlertDialog primitive built from radix-ui AlertDialog

affects:
  - 50-03 (RecipeFormSheet composes RecipeSectionList)
  - 51 (duplication plan — RecipeSectionList used in form)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-DndContext nesting: outer DndContext in RecipeSectionList for section reorder; inner DndContext inside RecipeStepList (already existed) for step reorder
    - useSortable on localId (UUID) — same pattern as RecipeStepRow but at section level
    - GripVertical drag handle on isolated button (not on header div) — matches existing RecipeStepRow pattern
    - Conditional AlertDialog for non-empty section delete — guard on section.steps.length === 0

key-files:
  created:
    - src/components/ui/alert-dialog.tsx
    - src/features/recipes/RecipeSectionCard.tsx
    - src/features/recipes/RecipeSectionList.tsx
  modified: []

key-decisions:
  - "alert-dialog.tsx created as Rule 3 auto-fix (blocking dependency) — radix-ui AlertDialog primitive was available but the shadcn wrapper did not exist"
  - "RecipeSectionCard renders CollapsibleContent with a padding wrapper div (px-3 pb-3) around RecipeStepList for visual separation"
  - "Step count badge shown only when collapsed AND steps.length > 0 — reduces header clutter when steps are visible"

patterns-established:
  - "Outer DndContext (sections) wraps inner DndContext per section (steps) — two-DndContext nesting is the v0.2.7 standard"
  - "AlertDialog confirm on non-empty delete — empty sections removed immediately, non-empty require confirmation"

requirements-completed:
  - FORM-01
  - FORM-02
  - FORM-03
  - FORM-04

# Metrics
duration: 18min
completed: 2026-05-08
---

# Phase 50 Plan 02: Section Form UI — RecipeSectionCard + RecipeSectionList Summary

**Collapsible sortable section cards with drag handle, inline name/surface/optional editing, nested step list, and outer DndContext for section drag reorder**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-05-08T18:10:00Z
- **Completed:** 2026-05-08T18:28:00Z
- **Tasks:** 2
- **Files modified:** 3 created (+ 1 deviation fix)

## Accomplishments

- RecipeSectionCard renders a collapsible card: drag handle (GripVertical button), name Input, surface Select, optional checkbox, step count badge when collapsed, CollapsibleTrigger, delete button
- RecipeSectionCard delete flow: empty sections removed immediately; non-empty sections show AlertDialog with step count in description
- RecipeSectionList wraps all cards in outer DndContext + SortableContext; handleDragEnd uses arrayMove; updateSection and removeSection helpers propagate changes via onChange

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RecipeSectionCard — collapsible sortable section card** - `57e7ae2` (feat)
2. **Task 2: Create RecipeSectionList — outer DndContext for section reorder** - `22f7b50` (feat)

## Files Created/Modified

- `src/components/ui/alert-dialog.tsx` - Shadcn AlertDialog primitive (Rule 3 auto-fix; radix-ui AlertDialog was available but wrapper was missing)
- `src/features/recipes/RecipeSectionCard.tsx` - Collapsible sortable card with drag handle, inline editing, RecipeStepList, and conditional delete confirm
- `src/features/recipes/RecipeSectionList.tsx` - Outer DndContext + SortableContext rendering RecipeSectionCard per section; arrayMove on drag end

## Decisions Made

- `alert-dialog.tsx` created as a Rule 3 deviation fix — the radix-ui `AlertDialog` primitive was available in the existing `radix-ui` package but the shadcn wrapper component was absent from `src/components/ui/`
- `CollapsibleContent` wraps RecipeStepList in a `px-3 pb-3` div for visual padding separation from the header row
- Step count badge (e.g. "3 steps") is only displayed when the card is collapsed and has steps — avoids redundancy when steps are already visible

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing alert-dialog.tsx shadcn component**
- **Found during:** Task 1 (RecipeSectionCard)
- **Issue:** `src/components/ui/alert-dialog.tsx` did not exist; RecipeSectionCard's delete confirmation dialog required it
- **Fix:** Created full shadcn-style `alert-dialog.tsx` wrapping `radix-ui` `AlertDialog` primitive with AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel. Used `buttonVariants` from existing `button.tsx` for correct styling.
- **Files modified:** `src/components/ui/alert-dialog.tsx` (created)
- **Verification:** `pnpm build` exits 0
- **Committed in:** `57e7ae2` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for correct operation. No scope creep — alert-dialog is a standard shadcn primitive the project needed.

## Issues Encountered

None — plan executed smoothly after the missing alert-dialog component was created.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- RecipeSectionList and RecipeSectionCard are ready to be composed into RecipeFormSheet (plan 50-03)
- RecipeSectionList props: `sections: DraftSection[]`, `onChange: (next) => void`, `onCreateNewPaint: (stepLocalId) => void`
- Both components compile clean; all 1086 tests pass (0 regressions)

---
*Phase: 50-section-form-ui*
*Completed: 2026-05-08*
