---
phase: 04-painting-module
plan: "03"
subsystem: ui
tags: [react, dnd-kit, react-hook-form, zod, tanstack-query, recipes, painting]

requires:
  - phase: 04-painting-module plan 00
    provides: DraftStep/makeDraftStep/computeOrderIndex + PaintCombobox + @dnd-kit install
  - phase: 04-painting-module plan 01
    provides: KanbanBoard + KanbanCard + PROJ-06 first entry point (card menu Remove from board)
  - phase: 04-painting-module plan 02
    provides: recipeSchema + RecipesPage + RecipeTable + RecipeDetailSheet + RecipeDeleteDialog
provides:
  - RecipeStepRow: sortable step row with grip handle, step name datalist, PaintCombobox, remove button
  - RecipeStepList: DndContext + SortableContext shell; exposes onCreateNewPaint(stepLocalId)
  - RecipeFormSheet: create/edit recipe form Sheet with react-hook-form + zod + sortable step list + inline PaintSheet stacking
  - RecipesPage: wired to real form Sheet (replaced console.warn no-ops)
  - UnitDetailSheet: interactive Active Project toggle (PROJ-06 second entry point) + Linked Recipes section
  - UnitTableColumns/UnitTable/CollectionPage: Active column button toggles is_active_project optimistically (PROJ-06 third entry point)
affects: [04-painting-module checkpoint, Phase 5 dashboard]

tech-stack:
  added: []
  patterns:
    - "Inline PaintSheet stacking: snapshot paintsBeforeCreate ids before open; useEffect detects new paint on close and auto-selects into pending step row (PAINT-03)"
    - "onCreateNewPaint(stepLocalId) threading: RecipeStepList binds step.localId into closure passed to each RecipeStepRow; parent knows exactly which step to update"
    - "Edit-mode step sync: remove-all + re-add pattern (STATE.md RecipePaint immutability decision); computeOrderIndex assigns order_index by array position at submit time"
    - "Active project optimistic toggle: snapshot getQueryData → setQueryData → mutate → rollback on error; used in both UnitDetailSheet and CollectionPage"

key-files:
  created:
    - src/features/recipes/RecipeStepRow.tsx
    - src/features/recipes/RecipeStepList.tsx
    - src/features/recipes/RecipeFormSheet.tsx
  modified:
    - src/features/recipes/RecipesPage.tsx
    - src/features/units/UnitDetailSheet.tsx
    - src/features/units/UnitTableColumns.tsx
    - src/features/units/UnitTable.tsx
    - src/features/units/CollectionPage.tsx
    - tests/collection/UnitTable.test.tsx

key-decisions:
  - "RecipeStepList onCreateNewPaint signature is (stepLocalId: string) — not () => void — so parent can identify which step row triggered paint creation"
  - "UnitTableColumns buildColumns now 4-arg: factionMap, onDelete, onEdit, onToggleActive — breaking change requiring UnitTable and CollectionPage update"
  - "Linked Recipes section navigates to /recipes only (no deep-link in this milestone per PLAN truths)"

requirements-completed:
  - RECIPE-01
  - RECIPE-02
  - RECIPE-03
  - RECIPE-04
  - RECIPE-05
  - PAINT-03
  - PAINT-04
  - PROJ-06

duration: 5min
completed: 2026-05-01
---

# Phase 4 Plan 03: Recipe Form Sheet + Active Project Toggle + Linked Recipes Summary

**RecipeFormSheet with sortable DraftStep list and inline PaintSheet stacking; UnitDetailSheet active-project toggle + Linked Recipes section; Collection table Active column made interactive — closing Phase 4 integration loop**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-01T08:33:51Z
- **Completed:** 2026-05-01T08:38:57Z
- **Tasks:** 3 auto tasks complete; Task 4 (human-verify checkpoint) pending user sign-off
- **Files modified:** 9

## Accomplishments

- RecipeFormSheet: react-hook-form + zodResolver(recipeSchema) + local DraftStep state; create mode calls createRecipe then inserts steps; edit mode updates recipe then remove-all + re-add steps with computeOrderIndex order_index assignment (RECIPE-05)
- Inline paint create (PAINT-03): paintsBeforeCreate snapshot taken before PaintSheet opens; useEffect detects new paint.id when PaintSheet closes and auto-selects it into the pending step row
- UnitDetailSheet: interactive Active Project toggle replaces static read-only field (PROJ-06 second entry point); Linked Recipes section lists recipes filtered by unit.id with navigation to /recipes
- Collection table Active column: replaced static Flame icon with clickable Button that calls handleToggleActive with optimistic cache update + rollback on error (PROJ-06 third entry point)

## Task Commits

1. **Task 1: RecipeStepRow + RecipeStepList** - `fa314d2` (feat)
2. **Task 2: RecipeFormSheet + RecipesPage wiring** - `85200c7` (feat)
3. **Task 3: UnitDetailSheet + UnitTableColumns + UnitTable + CollectionPage** - `076dd69` (feat)

**Plan metadata:** (added after human-verify checkpoint)

## Files Created/Modified

- `src/features/recipes/RecipeStepRow.tsx` - Single sortable step row: grip handle + step name Input (datalist suggestions) + PaintCombobox + remove button
- `src/features/recipes/RecipeStepList.tsx` - DndContext + SortableContext; onCreateNewPaint(stepLocalId) threads paint creation identity to parent
- `src/features/recipes/RecipeFormSheet.tsx` - Create/edit Sheet with react-hook-form + zod + RecipeStepList + stacked PaintSheet
- `src/features/recipes/RecipesPage.tsx` - console.warn no-ops replaced with real formOpen/editing state + RecipeFormSheet render
- `src/features/units/UnitDetailSheet.tsx` - Added useNavigate + useRecipes + useUpdateUnit; Active Project field now interactive; Linked Recipes section added
- `src/features/units/UnitTableColumns.tsx` - buildColumns now 4-arg with onToggleActive; Active column cell is clickable Button with cn-based Flame color
- `src/features/units/UnitTable.tsx` - Added onToggleActive prop + forwarded to buildColumns
- `src/features/units/CollectionPage.tsx` - Added handleToggleActive with optimistic cache update; passed to UnitTable
- `tests/collection/UnitTable.test.tsx` - Added onToggleActive: vi.fn() to baseProps

## Decisions Made

- onCreateNewPaint prop in RecipeStepList changed to `(stepLocalId: string) => void` from the plan's initial `() => void` stub — required to correctly thread which step row triggered inline paint creation (per plan Task 2 correction block)
- buildColumns 4th arg pattern: all three callers (UnitTable, future consumers) must now pass onToggleActive; test baseProps updated accordingly

## Deviations from Plan

None — plan executed exactly as written, including the planned correction in Task 2 that updated RecipeStepList's onCreateNewPaint signature to accept stepLocalId.

## Human-Verify Checkpoint Status

Task 4 is a `checkpoint:human-verify` covering all 6 Phase 4 ROADMAP success criteria. The three auto-tasks are committed and TypeScript-clean. The app is ready for `pnpm tauri dev` verification.

Awaiting user to:
1. Run `pnpm tauri dev`
2. Walk through all 6 ROADMAP criteria per the checkpoint verification steps
3. Type "approved" or provide gap notes

## Issues Encountered

None — all TypeScript errors resolved at zero iterations; all 70 tests passed on first run after each task.

## Next Phase Readiness

- All Phase 4 implementation tasks are complete pending human-verify sign-off
- Phase 5 (Dashboard) can begin after checkpoint approval
- PROJ-06 is satisfied across all three entry points: Kanban card menu (04-01), UnitDetailSheet, Collection table (04-03)

---
*Phase: 04-painting-module*
*Completed: 2026-05-01*
