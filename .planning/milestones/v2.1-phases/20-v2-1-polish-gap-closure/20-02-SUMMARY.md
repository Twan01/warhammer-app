---
phase: 20-v2-1-polish-gap-closure
plan: "02"
subsystem: ui
tags: [react, state-management, painting-projects, controlled-props, tech-debt]

requires:
  - phase: 20-v2-1-polish-gap-closure
    provides: "Phase context and tech-debt item PaintingProjectsPage-DOM-query"

provides:
  - "AddProjectPicker controlled-props interface with internal-state fallback"
  - "PaintingProjectsPage owns pickerOpen state — no DOM queries"
  - "KanbanEmptyState CTA reads 'Add Project'"

affects: [painting-projects, painting-module]

tech-stack:
  added: []
  patterns:
    - "Controlled-props with internal fallback: open?: boolean + onOpenChange?: fn — destructure rename avoids shadowing; ?? operator selects controlled vs internal"

key-files:
  created: []
  modified:
    - src/features/painting-projects/AddProjectPicker.tsx
    - src/features/painting-projects/PaintingProjectsPage.tsx
    - src/features/painting-projects/KanbanEmptyState.tsx

key-decisions:
  - "Destructure rename (open: controlledOpen, onOpenChange: controlledOnOpenChange) mandatory to avoid TypeScript shadowing Pitfall"
  - "Default parameter = {} makes AddProjectPicker safe as uncontrolled call site (no props required)"
  - "KanbanEmptyState button text 'Add Project' matches the action (picker opens) not 'Go to Collection' (page never navigates)"
  - "tech-debt:PaintingProjectsPage-DOM-query resolved — querySelector replaced by React state lift"

patterns-established:
  - "Controlled-props with internal fallback: expose open?/onOpenChange? on any Radix-backed component; use ?? to choose between controlled and internal value"

requirements-completed:
  - "tech-debt:PaintingProjectsPage-DOM-query"

duration: 10min
completed: 2026-05-04
---

# Phase 20 Plan 02: Remove DOM Query from PaintingProjectsPage Summary

**AddProjectPicker gains controlled-props interface (open/onOpenChange with internal fallback), PaintingProjectsPage lifts pickerOpen state replacing the fragile document.querySelector workaround, and KanbanEmptyState CTA text updated to 'Add Project'**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-04T18:48:00Z
- **Completed:** 2026-05-04T18:58:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Removed fragile `document.querySelector('button[type="button"][aria-haspopup="dialog"]')` DOM hack from PaintingProjectsPage
- AddProjectPicker now accepts optional `open?: boolean` and `onOpenChange?: (open: boolean) => void` props with internal `useState` fallback for uncontrolled usage
- KanbanEmptyState button text changed from "Go to Collection" to "Add Project" — matches the action that fires (picker opens, not navigation)

## Task Commits

1. **Task 1: Add controlled-props with internal fallback to AddProjectPicker** - `03b68e7` (feat)
2. **Task 2: Lift pickerOpen state to PaintingProjectsPage + update KanbanEmptyState CTA** - `9d56e01` (feat)

## Files Created/Modified

- `src/features/painting-projects/AddProjectPicker.tsx` - Added optional controlled-props signature with destructure rename; internal useState as fallback via ?? operator
- `src/features/painting-projects/PaintingProjectsPage.tsx` - Added pickerOpen state; wired to AddProjectPicker (controlled) and KanbanBoard.onAddProject; removed querySelector
- `src/features/painting-projects/KanbanEmptyState.tsx` - Button text "Go to Collection" → "Add Project"

## Decisions Made

- Destructure rename (`open: controlledOpen`, `onOpenChange: controlledOnOpenChange`) is mandatory — naming the prop `open` and also having an internal state called `open` would cause a shadowing collision in TypeScript strict mode.
- Default parameter `= {}` makes the function safe to call with no props — preserves backward-compatible uncontrolled behavior for any future call sites.
- "Add Project" matches the actual UX (popover opens) vs "Go to Collection" which was misleading (no navigation happened).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All acceptance criteria passed on first attempt. Build exits 0 (pre-existing chunk size warning unrelated to this plan). Full test suite: 388 passed, 2 skipped (wave-0 stubs), 0 failed.

## Verification Results

```
grep -rn "document.querySelector" src/features/painting-projects/  → (none found)
grep -F '<AddProjectPicker open={pickerOpen} onOpenChange={setPickerOpen} />' src/features/painting-projects/PaintingProjectsPage.tsx  → 1 match
grep -F '>Add Project<' src/features/painting-projects/KanbanEmptyState.tsx  → 1 match
pnpm test  → 388 passed, 2 skipped, 0 failed
pnpm build  → ✓ built in 11.99s (exit 0)
```

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 20 has 2 plans; 20-01 and 20-02 are both complete — phase is done
- Tech-debt item `PaintingProjectsPage-DOM-query` resolved
- AddProjectPicker controlled-props interface available for future test automation if needed

---
*Phase: 20-v2-1-polish-gap-closure*
*Completed: 2026-05-04*
