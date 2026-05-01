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
  - Phase 4 human-verify sign-off: all 6 ROADMAP success criteria approved
affects: [Phase 5 dashboard]

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
    - .planning/phases/04-painting-module/04-VERIFICATION.md
  modified:
    - src/features/recipes/RecipesPage.tsx
    - src/features/units/UnitDetailSheet.tsx
    - src/features/units/UnitTableColumns.tsx
    - src/features/units/UnitTable.tsx
    - src/features/units/CollectionPage.tsx
    - tests/collection/UnitTable.test.tsx
    - tests/painting/KanbanBoard.test.tsx

key-decisions:
  - "RecipeStepList onCreateNewPaint signature is (stepLocalId: string) — not () => void — so parent can identify which step row triggered paint creation"
  - "UnitTableColumns buildColumns now 4-arg: factionMap, onDelete, onEdit, onToggleActive — breaking change requiring UnitTable and CollectionPage update"
  - "Linked Recipes section navigates to /recipes only (no deep-link in this milestone per PLAN truths)"
  - "KanbanBoard always shows all 11 columns (fix 82dbc6f): PROJ-02 test updated to assert 11 headers and verify card placement rather than column hiding"

requirements-completed:
  - RECIPE-01
  - RECIPE-02
  - RECIPE-03
  - RECIPE-04
  - RECIPE-05
  - PAINT-03
  - PAINT-04
  - PROJ-06

duration: ~90min (including human-verify checkpoint and orchestrator fix commit 82dbc6f)
completed: 2026-05-01
---

# Phase 4 Plan 03: Recipe Form Sheet + Active Project Toggle + Linked Recipes Summary

**RecipeFormSheet with sortable DraftStep list and inline PaintSheet stacking; UnitDetailSheet active-project toggle + Linked Recipes section; Collection table Active column interactive; all 6 Phase 4 ROADMAP success criteria human-verified and approved**

## Performance

- **Duration:** ~90 min (includes human-verify checkpoint pause and orchestrator fix commit)
- **Started:** 2026-05-01T08:33:51Z
- **Completed:** 2026-05-01
- **Tasks:** 4 (3 auto + 1 human-verify — approved)
- **Files modified:** 11

## Accomplishments

- RecipeFormSheet: react-hook-form + zodResolver(recipeSchema) + local DraftStep state; create mode calls createRecipe then inserts steps; edit mode updates recipe then remove-all + re-add steps with computeOrderIndex order_index assignment (RECIPE-05)
- Inline paint create (PAINT-03): paintsBeforeCreate snapshot taken before PaintSheet opens; useEffect detects new paint.id when PaintSheet closes and auto-selects it into the pending step row
- UnitDetailSheet: interactive Active Project toggle replaces static read-only field (PROJ-06 second entry point); Linked Recipes section lists recipes filtered by unit.id with navigation to /recipes
- Collection table Active column: replaced static Flame icon with clickable Button that calls handleToggleActive with optimistic cache update + rollback on error (PROJ-06 third entry point)
- Human-verify checkpoint: user approved all 6 Phase 4 ROADMAP success criteria; Phase 4 complete

## Task Commits

1. **Task 1: RecipeStepRow + RecipeStepList** - `fa314d2` (feat)
2. **Task 2: RecipeFormSheet + RecipesPage wiring** - `85200c7` (feat)
3. **Task 3: UnitDetailSheet + UnitTableColumns + UnitTable + CollectionPage** - `076dd69` (feat)
4. **Orchestrator fix: kanban card layout, DnD usability, all columns visible, recipe step notes** - `82dbc6f` (fix — committed by orchestrator between checkpoint and continuation)
5. **Task 4: Human-verify — approved by user** (no code commit; stale test fix included in metadata commit)

**Plan metadata:** (this SUMMARY + STATE.md update)

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
- `tests/painting/KanbanBoard.test.tsx` - Updated PROJ-02 test to assert 11 columns always shown (after fix 82dbc6f changed KanbanBoard to show all columns)
- `.planning/phases/04-painting-module/04-VERIFICATION.md` - Phase 4 human-verify record (result: pass)

## Decisions Made

- onCreateNewPaint prop in RecipeStepList changed to `(stepLocalId: string) => void` from the plan's initial `() => void` stub — required to correctly thread which step row triggered inline paint creation (per plan Task 2 correction block)
- buildColumns 4th arg pattern: all callers must now pass onToggleActive; test baseProps updated accordingly
- KanbanBoard always shows all 11 columns (fix 82dbc6f): PROJ-02 test updated to assert 11 headers and verify card content rather than column count=2; intentional UX change for easier DnD drop targets

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated stale KanbanBoard PROJ-02 test after fix 82dbc6f changed column visibility behavior**
- **Found during:** Post-checkpoint verification (pnpm test -- --run)
- **Issue:** tests/painting/KanbanBoard.test.tsx PROJ-02 expected 2 column h2 headers but KanbanBoard now iterates PAINTING_STATUS_ORDER unconditionally (all 11 columns always rendered); test was stale relative to the orchestrator's intentional fix
- **Fix:** Updated test description and assertions to match always-show-all-columns behavior; verified the 3 unit cards (Alpha, Beta, Gamma) appear in rendered output
- **Files modified:** tests/painting/KanbanBoard.test.tsx
- **Verification:** pnpm test -- --run — 108 passed, 2 skipped (Wave-0 stubs), 0 failed
- **Committed in:** metadata commit

---

**Total deviations:** 1 auto-fixed (Rule 1 — stale test after intentional behavior change in orchestrator fix commit)
**Impact on plan:** Necessary correctness fix to maintain green test suite. No scope creep.

## Human-Verify Outcome

See `.planning/phases/04-painting-module/04-VERIFICATION.md` for the full record.

**Result: pass** — User typed "approved" after reviewing all 6 Phase 4 ROADMAP success criteria.

## Issues Encountered

The orchestrator committed fix `82dbc6f` between the checkpoint and this continuation agent's start. That commit changed KanbanBoard to always render all 11 columns (previously empty columns were hidden). The PROJ-02 test expected the old hiding behavior — updated accordingly as a Rule 1 auto-fix.

## Next Phase Readiness

- Phase 4 (Painting Module) is complete and human-verified. All 6 ROADMAP success criteria passed.
- All requirement IDs verified: PROJ-01..08, RECIPE-01..08, PAINT-03, PAINT-04.
- Phase 5 (Dashboard) Wave-0 pure modules already complete (computeStats, relativeTime, statusAbbr). DashboardPage component implementation is next.
- No blockers.

---
*Phase: 04-painting-module*
*Completed: 2026-05-01*
