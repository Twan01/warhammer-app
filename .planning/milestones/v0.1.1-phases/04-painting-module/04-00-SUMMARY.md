---
phase: 04-painting-module
plan: "00"
subsystem: testing
tags: [dnd-kit, kanban, react, vitest, testing-library, paint-combobox, pure-functions]

requires:
  - phase: 03-collection-module
    provides: Wave-0 stub pattern (it.skip), ResizeObserver/scrollIntoView polyfills in tests/setup.ts, CategoryCombobox Popover+Command pattern

provides:
  - "@dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @dnd-kit/utilities@3.2.2 installed (pinned)"
  - "src/features/painting-projects/kanbanUtils.ts — applyActiveFilter, groupByStatus, sortKanbanCards, getVisibleColumns (PROJ-01/02/07)"
  - "src/features/recipes/recipeSteps.ts — DraftStep type, makeDraftStep, computeOrderIndex, isPaintMissing (RECIPE-05/06)"
  - "src/features/recipes/PaintCombobox.tsx — Popover+Command paint picker with brand+name search and owned/missing dot indicator (PAINT-04)"
  - "tests/painting/kanbanUtils.test.ts — 11 passing unit tests (PROJ-01/02/07)"
  - "tests/painting/recipeSteps.test.ts — 8 passing unit tests (RECIPE-05/06)"
  - "tests/painting/PaintCombobox.test.tsx — 10 passing component tests (PAINT-04, PAINT-03, RECIPE-06)"
  - "tests/painting/KanbanCard.test.tsx — it.skip stubs (PROJ-03, filled by plan 04-01)"
  - "tests/painting/KanbanBoard.test.tsx — it.skip stubs (PROJ-08/PROJ-02, filled by plan 04-01)"
  - "tests/painting/RecipeTable.test.tsx — it.skip stubs (RECIPE-08/RECIPE-07, filled by plan 04-02)"

affects:
  - 04-01-painting-projects (KanbanCard, KanbanBoard — consumes kanbanUtils and fills stubs)
  - 04-02-recipes (RecipeTable, RecipeFormSheet — consumes recipeSteps, PaintCombobox, fills stubs)
  - 04-03-recipe-step-linker (consumes PaintCombobox, recipeSteps, kanbanUtils)

tech-stack:
  added:
    - "@dnd-kit/core@6.3.1"
    - "@dnd-kit/sortable@10.0.0"
    - "@dnd-kit/utilities@3.2.2"
  patterns:
    - "Wave-0 stub pattern extended to painting module — it.skip() with requirement-id literal strings; plans 01/02 fill bodies in-place"
    - "PaintCombobox: Popover+Command with shouldFilter on brand+name lowercase concatenation; document.querySelector for portal-rendered dot indicators in tests"

key-files:
  created:
    - src/features/painting-projects/kanbanUtils.ts
    - src/features/recipes/recipeSteps.ts
    - src/features/recipes/PaintCombobox.tsx
    - tests/painting/kanbanUtils.test.ts
    - tests/painting/recipeSteps.test.ts
    - tests/painting/PaintCombobox.test.tsx
    - tests/painting/KanbanCard.test.tsx
    - tests/painting/KanbanBoard.test.tsx
    - tests/painting/RecipeTable.test.tsx
  modified:
    - package.json (added @dnd-kit triple)
    - pnpm-lock.yaml

key-decisions:
  - "@dnd-kit versions pinned at core@6.3.1, sortable@10.0.0, utilities@3.2.2 — sortable@10.x requires core@6.x; loose ranges risk runtime incompatibility (Pitfall 2)"
  - "PaintCombobox dot indicator tests use document.querySelector not container.querySelector — Popover renders in a portal outside the component container"
  - "PaintCombobox CommandItem value uses lowercase concat brand+name so shouldFilter matches case-insensitively without manual filter logic"

patterns-established:
  - "PaintCombobox: document.querySelector for portal-rendered elements in test assertions (not container.querySelector)"
  - "shouldFilter on lowercase brand+name concatenation for paint search — matches PAINT-04 contract"

requirements-completed:
  - PROJ-01
  - PROJ-02
  - PROJ-07
  - PROJ-03
  - PROJ-08
  - RECIPE-05
  - RECIPE-06
  - RECIPE-08
  - PAINT-04

duration: 12min
completed: 2026-05-01
---

# Phase 4 Plan 00: Painting Module Wave-0 Foundation Summary

**@dnd-kit triple installed (core/sortable/utilities), kanbanUtils and recipeSteps pure-function modules fully tested, PaintCombobox Popover+Command component built with brand+name search and owned/missing dot indicators, six Wave-0 test files established**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-01T10:08:12Z
- **Completed:** 2026-05-01T10:12:30Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- @dnd-kit/core@6.3.1 + @dnd-kit/sortable@10.0.0 + @dnd-kit/utilities@3.2.2 installed at exact pinned versions (Pitfall 2 guard: sortable@10.x requires core@6.x)
- Two pure-function modules (kanbanUtils, recipeSteps) with 19 passing unit tests covering all PROJ-01/02/07 and RECIPE-05/06 contracts
- PaintCombobox component with Popover+Command shouldFilter on brand+name concatenation, green/red owned dot indicator, and optional onCreateNew handler — tested with 10 passing tests (PAINT-04, PAINT-03, RECIPE-06)
- Three Wave-0 stub test files (KanbanCard, KanbanBoard, RecipeTable) ready for plans 04-01 and 04-02 to fill in-place

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @dnd-kit + scaffold pure-function modules + Wave-0 test stubs** - `f812abe` (feat)
2. **Task 2: Write kanbanUtils + recipeSteps unit tests (TDD GREEN)** - `b7d2393` (test)
3. **Task 3: Build PaintCombobox component + PAINT-04 search test** - `c6eb3c4` (feat)

## Files Created/Modified

- `src/features/painting-projects/kanbanUtils.ts` — applyActiveFilter, groupByStatus, sortKanbanCards, getVisibleColumns
- `src/features/recipes/recipeSteps.ts` — DraftStep type, makeDraftStep, computeOrderIndex, isPaintMissing
- `src/features/recipes/PaintCombobox.tsx` — Popover+Command paint picker, shouldFilter on brand+name, owned/missing dot, onCreateNew option
- `tests/painting/kanbanUtils.test.ts` — 11 tests: PROJ-01 (applyActiveFilter), PROJ-02 (groupByStatus), PROJ-07 (sortKanbanCards), getVisibleColumns
- `tests/painting/recipeSteps.test.ts` — 8 tests: RECIPE-05 (computeOrderIndex), RECIPE-06 (isPaintMissing), makeDraftStep
- `tests/painting/PaintCombobox.test.tsx` — 10 tests: PAINT-04 (filter by brand/name, placeholder, list, empty), RECIPE-06 (dots), PAINT-03 (add-new option)
- `tests/painting/KanbanCard.test.tsx` — it.skip stubs for PROJ-03 (body added by plan 04-01)
- `tests/painting/KanbanBoard.test.tsx` — it.skip stubs for PROJ-08/PROJ-02 (body added by plan 04-01)
- `tests/painting/RecipeTable.test.tsx` — it.skip stubs for RECIPE-08/RECIPE-07 (body added by plan 04-02)
- `package.json` — added @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @dnd-kit/utilities@3.2.2
- `pnpm-lock.yaml` — updated lockfile

## Decisions Made

- @dnd-kit versions pinned exactly (not caret) to guard against sortable/core peer version mismatch at install time
- PaintCombobox CommandItem `value` uses lowercase brand+name concatenation so `shouldFilter` handles case-insensitive matching natively — no manual filter needed
- Wave-0 stub pattern (it.skip with requirement-id strings) carried forward from Phase 3 decision, consistent with established convention

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed dot indicator tests to use document.querySelector instead of container.querySelector**
- **Found during:** Task 3 (Build PaintCombobox component + PAINT-04 search test)
- **Issue:** Tests for green/red owned dot were failing because Popover renders in a Radix portal outside the React component container — `container.querySelector(".text-green-500")` returns null
- **Fix:** Changed both dot tests to `document.querySelector(...)` which searches the full document including portals
- **Files modified:** tests/painting/PaintCombobox.test.tsx
- **Verification:** Both RECIPE-06 dot tests pass; full suite green (60 passed, 6 skipped)
- **Committed in:** c6eb3c4 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in test assertion)
**Impact on plan:** Fix required for test correctness. No scope creep. Aligns with existing Phase 3 Pitfall 7 note about portal behavior.

## Issues Encountered

None — plan executed cleanly with the single auto-fix for portal test assertion.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plans 04-01 (KanbanBoard + KanbanCard) and 04-02 (RecipeTable + RecipeFormSheet) can now run in parallel without dependency conflicts:
- @dnd-kit installed for both Kanban drag-and-drop and recipe step reordering
- kanbanUtils.ts provides the column grouping/sorting logic KanbanBoard needs
- recipeSteps.ts provides DraftStep type and order_index logic RecipeFormSheet needs
- PaintCombobox.tsx is ready for RecipeStepRow to import
- Wave-0 stub test files in tests/painting/ are ready for in-place completion

---
*Phase: 04-painting-module*
*Completed: 2026-05-01*
