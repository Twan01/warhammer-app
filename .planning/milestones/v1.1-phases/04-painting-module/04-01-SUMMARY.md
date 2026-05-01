---
phase: 04-painting-module
plan: 01
subsystem: ui
tags: [react, dnd-kit, kanban, drag-drop, optimistic-updates, tanstack-query]

requires:
  - phase: 04-00
    provides: "@dnd-kit packages installed, kanbanUtils.ts (applyActiveFilter, groupByStatus, sortKanbanCards, getVisibleColumns), test stubs for KanbanCard and KanbanBoard"

provides:
  - "KanbanBoard: DndContext root with PointerSensor(distance:5)+KeyboardSensor, drag-end optimistic status_painting mutation with rollback, DragOverlay, skeleton loading state"
  - "KanbanColumn: SortableContext + useDroppable per column with isOver accent highlight"
  - "KanbanCard: useSortable drag handle, faction badge with color_theme, progress bar, priority flag, overdue target date (text-destructive)"
  - "KanbanCardActions: Popover+Command menu with Remove from board + Edit unit"
  - "KanbanEmptyState: Kanban icon + No active projects heading + Add project CTA"
  - "AddProjectPicker: Popover+Command over inactive units, optimistic is_active_project=1 mutation"
  - "PaintingProjectsPage: page container with header, KanbanBoard, UnitSheet for edit"
  - "/painting-projects route wired to PaintingProjectsPage (PlaceholderPage removed)"

affects: [04-02, 04-03]

tech-stack:
  added: []
  patterns:
    - "Optimistic setQueryData + mutate + onError rollback pattern (same as StatusPopover)"
    - "Popover+Command for contextual menus (no shadcn DropdownMenu in repo)"
    - "DndContext with activationConstraint distance:5 to prevent accidental drags"
    - "Drag-end resolves target status from column-{status} or unit-{id} over.id prefix"

key-files:
  created:
    - src/features/painting-projects/KanbanCard.tsx
    - src/features/painting-projects/KanbanCardActions.tsx
    - src/features/painting-projects/KanbanColumn.tsx
    - src/features/painting-projects/KanbanEmptyState.tsx
    - src/features/painting-projects/KanbanBoard.tsx
    - src/features/painting-projects/AddProjectPicker.tsx
    - src/features/painting-projects/PaintingProjectsPage.tsx
  modified:
    - src/app/painting-projects/page.tsx
    - tests/painting/KanbanCard.test.tsx
    - tests/painting/KanbanBoard.test.tsx

key-decisions:
  - "KanbanCardActions uses Popover+Command (not shadcn DropdownMenu) — consistent with StatusPopover.tsx pattern already in repo"
  - "DragOverlay renders KanbanCard with no-op handlers to show ghost during drag"
  - "PaintingProjectsPage empty-state CTA attempts querySelector for AddProjectPicker button — programmatic click pattern"
  - "src/app/painting-projects/page.tsx becomes a thin re-export — router keeps same import path"

patterns-established:
  - "KanbanBoard → KanbanColumn → KanbanCard → KanbanCardActions component tree"
  - "Column drop id = column-{PaintingStatus}, card drop id = unit-{id}"
  - "factionMap (Map<id, Faction>) built in KanbanBoard and passed down to avoid per-card faction lookup cost"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, PROJ-07, PROJ-08]

duration: 15min
completed: 2026-05-01
---

# Phase 4 Plan 01: Painting Projects Kanban Board Summary

**Full Kanban board surface using @dnd-kit — drag-and-drop status updates with optimistic rollback, faction-colored cards, AddProjectPicker, and empty state, replacing the Phase 1 PlaceholderPage**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-01T08:16:25Z
- **Completed:** 2026-05-01T08:32:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Full Kanban board component tree: KanbanBoard → KanbanColumn → KanbanCard → KanbanCardActions
- @dnd-kit drag-end handler resolves drop target from `column-{status}` or `unit-{id}` prefix, applies optimistic setQueryData with toast.error rollback
- AddProjectPicker: Popover+Command over inactive units (is_active_project===0) with optimistic activate mutation
- PROJ-03 card content: unit name, faction badge (inline color_theme style), painting progress bar, priority flag icon, target date with text-destructive overdue styling
- Both KanbanCard.test.tsx and KanbanBoard.test.tsx fully active (0 it.skip); PROJ-01, PROJ-02, PROJ-03, PROJ-08 covered

## Task Commits

1. **Task 1: KanbanCard, KanbanCardActions, KanbanColumn, KanbanEmptyState + KanbanCard tests** - `43e36f7` (feat)
2. **Task 2: KanbanBoard, AddProjectPicker, PaintingProjectsPage + route wire + KanbanBoard tests** - `48d7791` (feat)

## Files Created/Modified

- `src/features/painting-projects/KanbanCard.tsx` — useSortable card with drag handle, faction badge, progress, meta row
- `src/features/painting-projects/KanbanCardActions.tsx` — Popover+Command menu: Remove from board, Edit unit
- `src/features/painting-projects/KanbanColumn.tsx` — useDroppable + SortableContext column container
- `src/features/painting-projects/KanbanEmptyState.tsx` — Empty state with Kanban icon and Add project CTA
- `src/features/painting-projects/KanbanBoard.tsx` — DndContext root, drag-end optimistic handler, skeleton loading
- `src/features/painting-projects/AddProjectPicker.tsx` — Popover+Command picker over inactive units
- `src/features/painting-projects/PaintingProjectsPage.tsx` — Page layout with header, board, UnitSheet
- `src/app/painting-projects/page.tsx` — Replaced PlaceholderPage with re-export of PaintingProjectsPage
- `tests/painting/KanbanCard.test.tsx` — 3 PROJ-03 tests active (DndContext+SortableContext wrapper)
- `tests/painting/KanbanBoard.test.tsx` — 3 tests active (PROJ-01, PROJ-02, PROJ-08)

## Decisions Made

- KanbanCardActions uses Popover+Command (no shadcn DropdownMenu installed in repo) — consistent with StatusPopover.tsx
- DragOverlay renders KanbanCard clone with no-op callbacks to show ghost card during active drag
- Column drop target detection: `over.id` prefix `column-{status}` for column drops, `unit-{id}` for card-on-card drops
- `factionMap` (Map<number, Faction>) built once in KanbanBoard via useMemo and passed down — avoids per-card array lookup

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- /painting-projects route is live with KanbanBoard — ready for plan 04-02 (recipe/steps surface)
- Drag-drop manual UAT deferred to plan 04-03 human-verify checkpoint as specified in plan

---
*Phase: 04-painting-module*
*Completed: 2026-05-01*
