---
phase: 28-collection-projects
plan: "03"
subsystem: painting-projects
tags: [kanban, enrichment, log-session, ui-enrichment, proj-01, proj-02, proj-03]
dependency_graph:
  requires:
    - 28-01  # useKanbanEnrichment hook + getNextActionHint + relativeTime + LogSessionSheet
  provides:
    - enriched-kanban-cards
    - log-session-shortcut-from-board
  affects:
    - src/features/painting-projects/KanbanCard.tsx
    - src/features/painting-projects/KanbanColumn.tsx
    - src/features/painting-projects/KanbanBoard.tsx
    - src/features/painting-projects/PaintingProjectsPage.tsx
tech_stack:
  added: []
  patterns:
    - stopPropagation on Log Session button to prevent dnd-kit drag activation
    - useMemo(activeUnitIds) computed before useKanbanEnrichment call for stable keys
    - enrichment? optional prop on KanbanColumn — renders during initial load before hook resolves
    - LogSessionSheet mounted as sibling portal (not nested inside KanbanCard/Board)
key_files:
  created: []
  modified:
    - src/features/painting-projects/KanbanCard.tsx
    - src/features/painting-projects/KanbanColumn.tsx
    - src/features/painting-projects/KanbanBoard.tsx
    - src/features/painting-projects/PaintingProjectsPage.tsx
    - tests/painting/KanbanCard.test.tsx
    - tests/painting/KanbanBoard.test.tsx
decisions:
  - stopPropagation pattern on Log Session Paintbrush button mirrors KanbanCardActions PopoverTrigger pattern — prevents dnd-kit drag from activating on button click
  - activeUnitIds memoized before useKanbanEnrichment call — avoids hook receiving a new array reference on every render
  - enrichment passed as optional (enrichment?) — kanban renders correctly before hook resolves; no skeleton gating needed
metrics:
  duration: "~12 minutes"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 6
  completed_date: "2026-05-05"
---

# Phase 28 Plan 03: Kanban Card Enrichment Summary

Enriched kanban cards with relative last-updated time, linked recipe name, photo count (Camera icon), next-action status hints, and a Log Session Paintbrush button wired through PaintingProjectsPage > KanbanBoard > KanbanColumn > KanbanCard with LogSessionSheet mounted as a sibling portal.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Enrich KanbanCard with metadata row, next-action hint, Log Session button | b4a4ae4 | KanbanCard.tsx, KanbanCard.test.tsx |
| 2 | Thread props through KanbanColumn + KanbanBoard + PaintingProjectsPage | ac7b394 | KanbanColumn.tsx, KanbanBoard.tsx, PaintingProjectsPage.tsx, KanbanBoard.test.tsx |

## What Was Built

**KanbanCard enrichment (PROJ-01, PROJ-02, PROJ-03):**
- Added `Camera` and `Paintbrush` to lucide imports alongside existing `GripVertical`, `Flag`, `Calendar`
- Imported `formatRelativeTime` from `@/features/dashboard/relativeTime` and `getNextActionHint` from `@/features/dashboard/getNextActionHint`
- Extended `KanbanCardProps` with `onLogSession: (unitId: number) => void`, `recipeName?: string`, `photoCount?: number`
- Added Paintbrush button in the top row between unit name and `KanbanCardActions`, using `e.stopPropagation()` before `onLogSession(unit.id)` to prevent dnd-kit drag activation
- Added metadata row (`mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5`) showing: relative updated_at time, recipe name (truncated to 20 chars), photo count with Camera icon
- Added next-action hint paragraph (italic, muted-foreground/70) hidden when `status_painting === "Completed"`

**Prop chain threading (PROJ-01, PROJ-02, PROJ-03):**
- `KanbanColumn`: added `import type { KanbanEnrichment }`, extended props with `onLogSession` and `enrichment?`, threads both to `KanbanCard` render
- `KanbanBoard`: added `import { useKanbanEnrichment }`, added `onLogSession` to `KanbanBoardProps`, computed `activeUnitIds` memo, called `useKanbanEnrichment(activeUnitIds)`, passes `onLogSession` and `enrichment` to `KanbanColumn`, passes `onLogSession={() => {}}` no-op to DragOverlay `KanbanCard`
- `PaintingProjectsPage`: added `logSessionUnitId` state, passes `onLogSession` to `KanbanBoard`, mounts `LogSessionSheet` as sibling portal with `defaultUnitId={logSessionUnitId ?? undefined}`

## Verification

- `pnpm test -- tests/painting/KanbanCard.test.tsx`: all 3 tests pass
- `pnpm test -- tests/painting/`: all painting tests pass
- `pnpm build`: 0 TypeScript errors, 2752 modules transformed cleanly
- `pnpm test` (full suite): 539 passed, 19 skipped (pre-existing Wave 0 stubs), 0 failures

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/features/painting-projects/KanbanCard.tsx` — contains `import { formatRelativeTime }`, `import { getNextActionHint }`, `Camera, Paintbrush`, `onLogSession`, `recipeName?`, `photoCount?`, `e.stopPropagation()`, `aria-label={\`Log session for ${unit.name}\`}`, `mt-1.5 flex flex-wrap`, `status_painting !== "Completed"` guard
- `src/features/painting-projects/KanbanColumn.tsx` — contains `onLogSession: (unitId: number) => void`, `enrichment?: KanbanEnrichment`, threads both to KanbanCard
- `src/features/painting-projects/KanbanBoard.tsx` — contains `import { useKanbanEnrichment }`, `onLogSession` in props, `useKanbanEnrichment(activeUnitIds)`, passes `onLogSession={() => {}}` to DragOverlay
- `src/features/painting-projects/PaintingProjectsPage.tsx` — contains `import { LogSessionSheet }`, `useState<number | null>(null)`, `<LogSessionSheet` with `defaultUnitId`
- Commits b4a4ae4 and ac7b394 verified in git log
