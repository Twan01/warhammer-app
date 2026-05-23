# Phase 99: Architecture Cleanup - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase eliminates architectural debt: circular dependency between query and feature layers, oversized components that are hard to maintain, and sprawling useState-based state management. No new user-facing features — the app behaves identically but the codebase is cleaner and every file stays under 400 lines.

Requirements: ARCH-01 (query-layer isolation), ARCH-02 (PlaybookTab decomposition), ARCH-03 (UnitSheet decomposition), ARCH-04 (ArmyListsPage state machine).

</domain>

<decisions>
## Implementation Decisions

### Query-Layer Dependency Cleanup (ARCH-01)
- **D-01:** Move `computeGoalPeriod` from `src/features/goals/computeGoalPeriod.ts` to `src/lib/computeGoalPeriod.ts` — it's pure date logic with no feature dependencies, belongs in the utility layer.
- **D-02:** Move `computeSectionDiff`, `computeStepDiff`, `buildSectionIdMap` from `src/features/recipes/recipeDiff.ts` to `src/lib/recipeDiff.ts` — pure diff computation functions, no UI or feature state involved.
- **D-03:** Move `computeOrderIndex` from `src/features/recipes/recipeSteps.ts` to `src/lib/recipeSteps.ts` — pure numeric utility.
- **D-04:** Move the `DraftSection` type from `src/features/recipes/recipeSection.ts` to `src/types/recipe.ts` (or co-locate in existing `src/types/` recipe types). Similarly move `RecipeFormValues` from `src/features/recipes/recipeSchema.ts` to `src/types/recipe.ts` — these are shared data shapes, not feature-specific UI concerns.
- **D-05:** After relocation, update all import paths across the codebase. The feature files that originally defined these can re-export from the new locations for a clean migration (but prefer direct imports in consumers).

### PlaybookTab Decomposition (ARCH-02)
- **D-06:** Split PlaybookTab.tsx (1431 lines) into sub-components by visual section. The main PlaybookTab component becomes an orchestrator that renders child sections:
  - `PlaybookStats.tsx` — stat overrides grid + edit mode toggle (~200 lines)
  - `PlaybookStrategy.tsx` — strategy note fields (battlefield role, strengths, weaknesses, synergies, notes) (~200 lines)
  - `PlaybookDatasheet.tsx` — datasheet link, abilities, wargear display, conflict handling (~300 lines)
  - `PlaybookSyncDetails.tsx` — sync freshness indicator, version info, error history (~150 lines)
  - `PlaybookRules.tsx` — stratagems, detachments, shared abilities with favorites/notes (~250 lines)
- **D-07:** Each sub-component receives its data via props from the parent PlaybookTab, which keeps the React Query hook calls and save logic. Sub-components are pure presentation + local interaction state.
- **D-08:** The `LoadoutSection` and `DatasheetPicker` already exist as extracted components — keep them as-is. The `TierManager` also stays separate.

### UnitSheet Decomposition (ARCH-03)
- **D-09:** Split UnitSheet.tsx (688 lines) into form section components:
  - `UnitFormRequired.tsx` — name, faction, role, base size, points, quantity fields (~150 lines)
  - `UnitFormOptional.tsx` — the collapsible "Optional Details" section with battlefield role, notes, etc. (~150 lines)
  - `UnitSheet.tsx` — Sheet wrapper, form provider, submit logic, useEffect syncs (~200 lines, down from 688)
- **D-10:** Sub-components receive the `form` object (from `useForm`) via props or React Hook Form's `useFormContext`. Prefer `useFormContext` to avoid prop drilling the entire form instance through multiple levels.
- **D-11:** The `buildDefaultValues` helper function stays in the parent UnitSheet file since it's used in the form initialization.

### ArmyListsPage State Machine (ARCH-04)
- **D-12:** Replace the 14 individual `useState` calls with a single `useReducer`. The state shape groups related portal states:
  ```ts
  type ArmyListsState = {
    selectedListId: number | null;
    sheet: { open: boolean; editingList: ArmyList | null };
    deleteDialog: { open: boolean; list: ArmyList | null };
    unitPickerOpen: boolean;
    loadoutUnitId: number | null;
    enhancementUnitId: number | null;
    leaderUnitId: number | null;
    datasheetBrowserOpen: boolean;
    printPreviewOpen: boolean;
    snapshotHistoryOpen: boolean;
    compareSnapshot: { ids: [number, number]; labels: [string, string] } | null;
  };
  ```
- **D-13:** Actions use a discriminated union pattern (`type: "OPEN_SHEET" | "CLOSE_SHEET" | "OPEN_DELETE" | ...`). Each action can reset related state (e.g., closing the detail sheet also closes unit picker, loadout, enhancement, and leader sub-sheets).
- **D-14:** Extract the reducer and action types into a separate file `armyListsReducer.ts` in `src/features/army-lists/`. This makes the state transitions unit-testable without rendering the page.
- **D-15:** Use plain `useReducer` — no external state machine library (XState, etc.). The page state is a flat set of open/close toggles with simple transitions, not a complex state graph.

### Claude's Discretion
- Exact file names for extracted PlaybookTab sub-components (the suggested names above are guidelines)
- Whether UnitSheet sub-components use `useFormContext` vs direct form prop — researcher should check which pattern is simpler given React Hook Form 7's API
- Whether to extract the `handleSave` function in PlaybookTab to a custom hook or keep it in the orchestrator
- Ordering of reducer actions and whether to group related actions (e.g., `OPEN_SHEET` / `CLOSE_SHEET` as a pair)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — ARCH-01 through ARCH-04 requirement definitions
- `.planning/ROADMAP.md` §Phase 99 — Success criteria (4 items)

### Query-Layer Targets (ARCH-01)
- `src/db/queries/goals.ts:3` — imports `computeGoalPeriod` from `@/features/goals/`
- `src/db/queries/recipes.ts:5-8` — imports `DraftSection`, `RecipeFormValues`, `computeSectionDiff`, `computeStepDiff`, `buildSectionIdMap`, `computeOrderIndex` from `@/features/recipes/`
- `src/features/goals/computeGoalPeriod.ts` — pure function to relocate
- `src/features/recipes/recipeDiff.ts` — pure diff functions to relocate
- `src/features/recipes/recipeSteps.ts` — `computeOrderIndex` to relocate
- `src/features/recipes/recipeSchema.ts` — `RecipeFormValues` type to relocate
- `src/features/recipes/recipeSection.ts` — `DraftSection` type to relocate

### PlaybookTab Decomposition (ARCH-02)
- `src/features/units/PlaybookTab.tsx` — 1431 lines, main decomposition target
- `src/features/units/LoadoutSection.tsx` — already extracted (keep as-is)
- `src/features/units/DatasheetPicker.tsx` — already extracted (keep as-is)
- `src/features/units/TierManager.tsx` — already extracted (keep as-is)

### UnitSheet Decomposition (ARCH-03)
- `src/features/units/UnitSheet.tsx` — 688 lines, form decomposition target

### ArmyListsPage State (ARCH-04)
- `src/features/army-lists/ArmyListsPage.tsx` — 268 lines, 14 useState calls (lines 42-55)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useReducer` — standard React hook, no library needed
- `useFormContext` — React Hook Form API for sharing form state without prop drilling
- Existing component extraction pattern — `LoadoutSection`, `DatasheetPicker`, `TierManager` show the established pattern for extracting PlaybookTab sub-components

### Established Patterns
- Feature module layout: `entitySchema.ts`, `EntitySheet.tsx`, `EntityRow.tsx`, etc.
- Type definitions in `src/types/` — one file per entity (e.g., `recipe.ts`, `armyList.ts`)
- Pure utility functions in `src/lib/` — date helpers, currency formatting, CSV parsing
- Portal state pattern in page components — ArmyListsPage and CollectionPage both use sibling portal architecture with page-level state

### Integration Points
- All imports referencing relocated files must be updated (grep for old import paths)
- PlaybookTab sub-components slot into the existing tab structure in CollectionPage
- UnitSheet sub-components must work with the existing `useForm<UnitFormValues>` instance
- ArmyListsPage reducer must produce the same handler signatures that child components (ArmyListCard, ArmyListDetailSheet, etc.) currently consume via props

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard React decomposition patterns applied to the existing codebase. The primary wins are: (1) query-layer independence enabling future query testing without feature imports, (2) each file under 300-400 lines for easier navigation and review, (3) centralized and testable page state logic.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 99-Architecture Cleanup*
*Context gathered: 2026-05-22*
