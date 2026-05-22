# Phase 99: Architecture Cleanup - Research

**Researched:** 2026-05-22
**Domain:** React component decomposition, TypeScript module boundaries, state management patterns
**Confidence:** HIGH

## Summary

Phase 99 is a pure refactoring phase with four independent workstreams: (1) relocating pure utility functions and types from `src/features/` to `src/lib/` and `src/types/` to eliminate query-layer dependency violations, (2) decomposing PlaybookTab.tsx (1431 lines) into five sub-components, (3) decomposing UnitSheet.tsx (688 lines) into form section components, and (4) replacing 14 individual `useState` calls in ArmyListsPage.tsx with a single `useReducer`.

All four workstreams are code-only refactors with zero user-facing behavior changes. The existing test suite (PlaybookTab.test.tsx with 60+ lines of mocks) provides regression coverage. No new packages are needed -- all patterns use React built-ins (`useReducer`, `useFormContext`) and existing project dependencies.

**Primary recommendation:** Execute the four workstreams in dependency order: ARCH-01 first (file relocations affect imports across the codebase), then ARCH-02/03/04 in parallel since they touch separate files.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Move `computeGoalPeriod` from `src/features/goals/computeGoalPeriod.ts` to `src/lib/computeGoalPeriod.ts`
- **D-02:** Move `computeSectionDiff`, `computeStepDiff`, `buildSectionIdMap` from `src/features/recipes/recipeDiff.ts` to `src/lib/recipeDiff.ts`
- **D-03:** Move `computeOrderIndex` from `src/features/recipes/recipeSteps.ts` to `src/lib/recipeSteps.ts`
- **D-04:** Move `DraftSection` type to `src/types/recipe.ts` (or co-locate in existing `src/types/` recipe types). Similarly move `RecipeFormValues` from `src/features/recipes/recipeSchema.ts` to `src/types/recipe.ts`
- **D-05:** After relocation, update all import paths across the codebase
- **D-06:** Split PlaybookTab.tsx into sub-components: PlaybookStats, PlaybookStrategy, PlaybookDatasheet, PlaybookSyncDetails, PlaybookRules
- **D-07:** Sub-components receive data via props; PlaybookTab keeps React Query hooks and save logic
- **D-08:** Keep existing LoadoutSection, DatasheetPicker, TierManager as-is
- **D-09:** Split UnitSheet.tsx into UnitFormRequired, UnitFormOptional, and slimmed UnitSheet
- **D-10:** Sub-components use `useFormContext` or direct form prop -- prefer `useFormContext`
- **D-11:** `buildDefaultValues` stays in parent UnitSheet file
- **D-12:** Replace 14 `useState` calls with a single `useReducer` in ArmyListsPage
- **D-13:** Actions use discriminated union pattern with grouped resets
- **D-14:** Extract reducer and action types into `armyListsReducer.ts`
- **D-15:** Use plain `useReducer` -- no external state machine library

### Claude's Discretion
- Exact file names for extracted PlaybookTab sub-components
- Whether UnitSheet sub-components use `useFormContext` vs direct form prop
- Whether to extract `handleSave` in PlaybookTab to a custom hook or keep in orchestrator
- Ordering of reducer actions and grouping conventions

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARCH-01 | DB query layer has zero imports from src/features/ -- all shared logic lives in src/lib/ or src/types/ | File relocation plan verified: 2 query files import from features (goals.ts line 3, recipes.ts lines 5-8). 6 functions + 2 types to relocate. All consumer imports mapped. |
| ARCH-02 | PlaybookTab.tsx decomposed into sub-tab components (each under 300 lines) | PlaybookTab is 1431 lines with clear visual section boundaries at Stats (line 620), Sync Details (line 708), Weapons/Abilities/Datasheet (line 934), Rules (line 1028), Strategy Notes (line 1150). Decomposition into 5 sub-components feasible. |
| ARCH-03 | UnitSheet.tsx decomposed into form section components (each under 200 lines) | UnitSheet is 688 lines with two clear sections: required fields (line 177-233) and optional collapsible (line 250+). shadcn Form = FormProvider, so useFormContext works in child components without extra setup. |
| ARCH-04 | ArmyListsPage modal state uses reducer instead of 14+ useState calls | ArmyListsPage has exactly 14 useState calls (lines 42-55) with 18 handler functions (lines 78-107). closeDetail handler already demonstrates the "cascade reset" pattern (resets 9 states at once) that a reducer handles cleanly. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Query-layer isolation (ARCH-01) | Database / Storage | -- | Pure module boundary enforcement; query modules must not depend on feature layer |
| PlaybookTab decomposition (ARCH-02) | Browser / Client | -- | Component-level UI refactor; all logic stays client-side |
| UnitSheet decomposition (ARCH-03) | Browser / Client | -- | Form component refactor within React Hook Form context |
| ArmyListsPage state (ARCH-04) | Browser / Client | -- | Page-level state management refactor using React useReducer |

## Standard Stack

### Core (already installed -- no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | Component decomposition, useReducer, useFormContext | Already in project [VERIFIED: package.json] |
| React Hook Form | 7.76.0 | Form context sharing via FormProvider/useFormContext | Already in project [VERIFIED: npm view] |
| TypeScript | 5 | Type safety for reducer actions, discriminated unions | Already in project [VERIFIED: package.json] |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn Form component | N/A | Wraps FormProvider -- `useFormContext` works automatically inside `<Form>` | UnitSheet decomposition (ARCH-03) |
| Vitest | 4 | Testing reducer logic in isolation | ARCH-04 reducer unit tests |

**Installation:** None required. All dependencies already present.

## Package Legitimacy Audit

No new packages are installed in this phase. All patterns use React built-ins and existing project dependencies.

## Architecture Patterns

### System Architecture Diagram

```
ARCH-01: Dependency Boundary Fix
================================
BEFORE:
  src/db/queries/goals.ts ----import----> src/features/goals/computeGoalPeriod.ts
  src/db/queries/recipes.ts ---import----> src/features/recipes/recipeDiff.ts
                              ---import----> src/features/recipes/recipeSteps.ts
                              ---import----> src/features/recipes/recipeSchema.ts (type)
                              ---import----> src/features/recipes/recipeSection.ts (type)

AFTER:
  src/db/queries/goals.ts ----import----> src/lib/computeGoalPeriod.ts
  src/db/queries/recipes.ts ---import----> src/lib/recipeDiff.ts
                              ---import----> src/lib/recipeSteps.ts
                              ---import----> src/types/recipe.ts (types)

ARCH-02: PlaybookTab Decomposition
===================================
  PlaybookTab (orchestrator, ~250 lines)
    |-- hooks: useStrategyNote, useDatasheet, useRulesSync, etc.
    |-- save logic: handleSave
    |-- state: all 16+ useState calls
    |
    |-> PlaybookStats (props: stat values + setters, edit mode, override data)
    |-> PlaybookSyncDetails (props: sync meta, errors)
    |-> PlaybookDatasheet (props: datasheet, weapons, abilities)
    |-> PlaybookRules (props: stratagems, detachments, shared abilities, favorites, notes)
    |-> PlaybookStrategy (props: field values + setters, isDirty, onSave)
    |
    |-- [existing] LoadoutSection, DatasheetPicker, TierManager (unchanged)

ARCH-04: ArmyListsPage State Flow
===================================
  ArmyListsPage
    |-- useReducer(armyListsReducer, initialState)
    |-- dispatch({ type: "OPEN_DETAIL", listId: 5 })
    |-- dispatch({ type: "CLOSE_DETAIL" })  // auto-resets sub-sheets
    |
    |-> ArmyListCard (onClick -> dispatch OPEN_DETAIL)
    |-> ArmyListDetailSheet (onClose -> dispatch CLOSE_DETAIL)
    |-> [all sibling portals receive state slices + dispatch-wrapped handlers]
```

### Recommended Project Structure

No new directories. Files are relocated or created within existing structure:

```
src/
  lib/
    computeGoalPeriod.ts     # relocated from features/goals/
    recipeDiff.ts            # relocated from features/recipes/
    recipeSteps.ts           # relocated from features/recipes/ (computeOrderIndex only)
  types/
    recipe.ts                # + DraftSection, RecipeFormValues additions
  features/
    units/
      PlaybookTab.tsx         # slimmed orchestrator (~250 lines)
      PlaybookStats.tsx       # new sub-component
      PlaybookStrategy.tsx    # new sub-component
      PlaybookDatasheet.tsx   # new sub-component
      PlaybookSyncDetails.tsx # new sub-component
      PlaybookRules.tsx       # new sub-component
      UnitSheet.tsx           # slimmed (~200 lines)
      UnitFormRequired.tsx    # new sub-component
      UnitFormOptional.tsx    # new sub-component
    army-lists/
      ArmyListsPage.tsx      # slimmed (uses useReducer)
      armyListsReducer.ts    # new: reducer + action types + initial state
```

### Pattern 1: useFormContext for Form Sub-Components

**What:** React Hook Form's `useFormContext<T>()` retrieves the form instance from the nearest `<FormProvider>` (which shadcn's `<Form>` already is).

**When to use:** When decomposing a form into sub-components that need access to `control`, `register`, `formState`, etc.

**Example:**
```typescript
// UnitFormRequired.tsx
import { useFormContext } from "react-hook-form";
import type { UnitFormValues } from "./unitSchema";

export function UnitFormRequired() {
  const { control } = useFormContext<UnitFormValues>();

  return (
    <>
      <FormField
        name="name"
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Tau Fire Warriors" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* ... more required fields */}
    </>
  );
}
```

**Why useFormContext over prop drilling:** The project's shadcn `<Form>` component is already `FormProvider` (verified in `src/components/ui/form.tsx` line 19: `const Form = FormProvider`). The `useFormField` hook already calls `useFormContext()` internally. Sub-components rendered inside `<Form {...form}>` automatically have access. No extra wiring needed. [VERIFIED: src/components/ui/form.tsx]

### Pattern 2: useReducer with Discriminated Union Actions

**What:** Replace N individual `useState` calls with a single `useReducer` where the action type is a discriminated union.

**When to use:** When multiple state variables are interdependent and handlers need to reset groups of state together (e.g., closing the detail sheet resets 9 sub-states).

**Example:**
```typescript
// armyListsReducer.ts
import type { ArmyList } from "@/types/armyList";

export type ArmyListsState = {
  selectedListId: number | null;
  sheetOpen: boolean;
  editingList: ArmyList | null;
  deleteDialogOpen: boolean;
  deletingList: ArmyList | null;
  unitPickerOpen: boolean;
  loadoutUnitId: number | null;
  enhancementUnitId: number | null;
  leaderUnitId: number | null;
  datasheetBrowserOpen: boolean;
  printPreviewOpen: boolean;
  snapshotHistoryOpen: boolean;
  compareSnapshotIds: [number, number] | null;
  compareSnapshotLabels: [string, string] | null;
};

export const initialArmyListsState: ArmyListsState = {
  selectedListId: null,
  sheetOpen: false,
  editingList: null,
  deleteDialogOpen: false,
  deletingList: null,
  unitPickerOpen: false,
  loadoutUnitId: null,
  enhancementUnitId: null,
  leaderUnitId: null,
  datasheetBrowserOpen: false,
  printPreviewOpen: false,
  snapshotHistoryOpen: false,
  compareSnapshotIds: null,
  compareSnapshotLabels: null,
};

export type ArmyListsAction =
  | { type: "OPEN_CREATE" }
  | { type: "OPEN_EDIT"; list: ArmyList }
  | { type: "CLOSE_SHEET" }
  | { type: "OPEN_DELETE"; list: ArmyList }
  | { type: "CLOSE_DELETE" }
  | { type: "OPEN_DETAIL"; listId: number }
  | { type: "CLOSE_DETAIL" }
  | { type: "OPEN_UNIT_PICKER" }
  | { type: "CLOSE_UNIT_PICKER" }
  | { type: "OPEN_LOADOUT"; unitId: number }
  | { type: "CLOSE_LOADOUT" }
  | { type: "OPEN_ENHANCEMENT"; unitId: number }
  | { type: "CLOSE_ENHANCEMENT" }
  | { type: "OPEN_LEADER_ATTACH"; unitId: number }
  | { type: "CLOSE_LEADER_ATTACH" }
  | { type: "OPEN_DATASHEET_BROWSER" }
  | { type: "CLOSE_DATASHEET_BROWSER" }
  | { type: "OPEN_PRINT_PREVIEW" }
  | { type: "CLOSE_PRINT_PREVIEW" }
  | { type: "OPEN_SNAPSHOT_HISTORY" }
  | { type: "CLOSE_SNAPSHOT_HISTORY" }
  | { type: "OPEN_SNAPSHOT_COMPARE"; ids: [number, number]; labels: [string, string] }
  | { type: "CLOSE_SNAPSHOT_COMPARE" };

export function armyListsReducer(
  state: ArmyListsState,
  action: ArmyListsAction,
): ArmyListsState {
  switch (action.type) {
    case "CLOSE_DETAIL":
      // Cascade reset: closing detail resets all sub-sheets
      return {
        ...state,
        selectedListId: null,
        unitPickerOpen: false,
        loadoutUnitId: null,
        enhancementUnitId: null,
        leaderUnitId: null,
        datasheetBrowserOpen: false,
        printPreviewOpen: false,
        snapshotHistoryOpen: false,
        compareSnapshotIds: null,
        compareSnapshotLabels: null,
      };
    case "CLOSE_DELETE": {
      // If deleting the selected list, also clear selection
      const wasDeleting = state.deletingList;
      return {
        ...state,
        deleteDialogOpen: false,
        deletingList: null,
        selectedListId:
          wasDeleting && state.selectedListId === wasDeleting.id
            ? null
            : state.selectedListId,
      };
    }
    // ... other cases follow the same pattern
    default:
      return state;
  }
}
```

[VERIFIED: Existing ArmyListsPage.tsx lines 42-55 and 78-107 confirm the 14 useState calls and cascade reset patterns]

### Pattern 3: File Relocation with Re-Export Bridge

**What:** When moving a function/type to a new location, optionally add a re-export from the old location to avoid breaking imports in one atomic step.

**When to use:** Only as a transitional step -- prefer updating all imports directly since this is a small codebase.

**Decision:** Direct import updates preferred per D-05. The import consumers are:

For `computeGoalPeriod`:
- `src/db/queries/goals.ts` (the violation to fix)
- `src/features/goals/GoalCard.tsx` (also exports `deriveGoalStatus`)
- `src/features/goals/GoalSheet.tsx` (imports `currentPeriod`)
- `src/features/goals/GoalsPage.tsx` (also exports `deriveGoalStatus`)

For `recipeDiff` functions: Only `src/db/queries/recipes.ts` (single consumer)
For `computeOrderIndex`: `src/db/queries/recipes.ts` + `src/features/painting-mode/PaintingModeView.tsx` (imports `isPaintMissing`)
For `DraftSection` type: Only `src/db/queries/recipes.ts`
For `RecipeFormValues` type: Only `src/db/queries/recipes.ts`

### Anti-Patterns to Avoid
- **Prop drilling the full form object:** Pass `form` as a prop to sub-components. Use `useFormContext` instead -- the shadcn `<Form>` component already wraps `FormProvider`.
- **Moving too much into sub-components:** The orchestrator (PlaybookTab) should keep all React Query hooks and save logic. Sub-components are presentation + local interaction only.
- **Breaking re-exports prematurely:** When relocating `computeGoalPeriod.ts`, note that `GoalCard.tsx` and `GoalsPage.tsx` also import `deriveGoalStatus` from the same file. Move the entire file or ensure all exports are accessible from the new location.
- **Reducer state shape divergence:** The reducer state must produce the exact same handler signatures that child components currently consume. Do not change the API surface.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form context sharing | Custom context provider | `useFormContext` from react-hook-form | Already integrated via shadcn Form = FormProvider |
| Complex state with cascading resets | Custom state machine library | `useReducer` | 14 boolean/nullable toggles with simple transitions -- useReducer is sufficient |
| Import path updates | Manual find-and-replace | TypeScript compiler errors | After relocation, `tsc` will flag every broken import -- follow the errors |

## Common Pitfalls

### Pitfall 1: computeGoalPeriod.ts Exports More Than One Function
**What goes wrong:** Moving only `computeGoalPeriod` to `src/lib/` but leaving `deriveGoalStatus` and `currentPeriod` behind breaks the feature-layer consumers.
**Why it happens:** The discuss phase decision (D-01) says "move computeGoalPeriod" but the file exports 3 functions: `computeGoalPeriod`, `deriveGoalStatus`, `currentPeriod`. [VERIFIED: grep shows GoalCard.tsx imports deriveGoalStatus, GoalSheet.tsx imports currentPeriod]
**How to avoid:** Move the entire file contents to `src/lib/computeGoalPeriod.ts`. All three functions are pure date logic with no feature dependencies.
**Warning signs:** TypeScript errors in GoalCard.tsx or GoalSheet.tsx after relocation.

### Pitfall 2: recipeSteps.ts Has Mixed Concerns
**What goes wrong:** Moving the entire `recipeSteps.ts` to `src/lib/` when only `computeOrderIndex` needs to move. The file also exports `DraftStep` interface, `makeDraftStep()`, and `isPaintMissing()`.
**Why it happens:** D-03 says "move computeOrderIndex" but the file has 4 exports.
**How to avoid:** Move only `computeOrderIndex` to `src/lib/recipeSteps.ts`. Keep `DraftStep`, `makeDraftStep`, and `isPaintMissing` in the feature file. Or move all of them since they are all pure -- but `DraftStep` type is used by `DraftSection` type (which is moving to `src/types/`), creating a circular dependency if `DraftStep` stays in features. Best approach: move `DraftStep` to `src/types/recipe.ts` alongside `DraftSection`, and move `computeOrderIndex` + `makeDraftStep` + `isPaintMissing` to `src/lib/recipeSteps.ts` since all are pure functions.
**Warning signs:** Import cycles after partial relocation.

### Pitfall 3: PlaybookTab Sub-Component Props Become Unwieldy
**What goes wrong:** The orchestrator needs to pass 20+ props to PlaybookStats (6 stat values, 6 setters, edit mode, override data, sync meta, etc.).
**Why it happens:** PlaybookTab has ~16 useState calls that feed into the visual sections.
**How to avoid:** Group related props into objects: `statValues: Record<StatKey, number | null>`, `statSetters: Record<StatKey, (v: number | null) => void>`. Or pass a single `statsState` object and let the sub-component destructure.
**Warning signs:** Sub-component prop interfaces exceeding 15 members.

### Pitfall 4: Reducer Action Handlers Don't Match Existing Child Component APIs
**What goes wrong:** The reducer-based dispatch creates different handler signatures than what child components expect (e.g., `ArmyListDetailSheet.onClose` expects `() => void` but dispatch produces `(action: Action) => void`).
**Why it happens:** Child components take callbacks like `onClose: () => void` and `onEdit: (list: ArmyList) => void`. The reducer's dispatch has a different shape.
**How to avoid:** Create wrapper handlers in ArmyListsPage that call dispatch: `const closeDetail = () => dispatch({ type: "CLOSE_DETAIL" })`. These are the same one-liners that exist today but backed by dispatch instead of multiple setState calls.
**Warning signs:** Type errors in portal JSX after switching to useReducer.

### Pitfall 5: DraftSection Type Depends on DraftStep Type
**What goes wrong:** Moving `DraftSection` to `src/types/recipe.ts` breaks because it references `DraftStep` which is still in `src/features/recipes/recipeSteps.ts`.
**Why it happens:** `recipeSection.ts` line 10: `import type { DraftStep } from "./recipeSteps"`.
**How to avoid:** Move `DraftStep` to `src/types/recipe.ts` at the same time as `DraftSection`. Both are pure data shapes with no feature dependencies.
**Warning signs:** TypeScript "cannot find module" errors after moving DraftSection alone.

## Code Examples

### useFormContext in UnitSheet Sub-Components

```typescript
// UnitFormRequired.tsx
// Source: verified against src/components/ui/form.tsx (Form = FormProvider)
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { UnitFormValues } from "./unitSchema";

export function UnitFormRequired() {
  const { control } = useFormContext<UnitFormValues>();

  return (
    <>
      <FormField
        name="name"
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Tau Fire Warriors" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* faction_id select, category combobox */}
    </>
  );
}
```

### Reducer Wrapper Handlers in ArmyListsPage

```typescript
// ArmyListsPage.tsx -- handler wrappers maintain existing API
const [state, dispatch] = useReducer(armyListsReducer, initialArmyListsState);

const openCreate = () => dispatch({ type: "OPEN_CREATE" });
const openEdit = (list: ArmyList) => dispatch({ type: "OPEN_EDIT", list });
const closeSheet = () => dispatch({ type: "CLOSE_SHEET" });
const closeDetail = () => dispatch({ type: "CLOSE_DETAIL" });
// ... child components receive these same-signature callbacks unchanged
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple useState for portal state | useReducer with discriminated unions | React 16.8+ (hooks) | Centralized state transitions, cascade resets in one place |
| Prop drilling form instances | useFormContext via FormProvider | React Hook Form 7.0+ | Clean form decomposition without prop threading |
| Mixed-concern module files | Layered architecture (lib/types/features) | Ongoing convention | Testable query layer, clear dependency direction |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 (jsdom) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/collection/PlaybookTab.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | Zero imports from features/ in queries/ | static analysis | `grep -r "from.*@/features/" src/db/queries/ --include="*.ts"` (expect 0 results) | N/A (grep check) |
| ARCH-02 | PlaybookTab renders identically after decomposition | regression | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | Yes |
| ARCH-03 | UnitSheet create/edit workflow unchanged | manual | Manual test (no existing UnitSheet test) | No |
| ARCH-04 | Reducer produces correct state transitions | unit | `pnpm test -- tests/army-lists/armyListsReducer.test.ts` | No -- Wave 0 |

### Wave 0 Gaps
- [ ] `tests/army-lists/armyListsReducer.test.ts` -- unit tests for ARCH-04 reducer logic (cascade resets, action/state pairs)
- [ ] ARCH-01 validation is a static grep check, not a test file -- can be added as a CI lint rule or a test assertion

## Security Domain

This phase has no security implications. It is a pure internal refactoring of component structure and module boundaries. No new inputs, endpoints, data flows, or authentication changes.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A |
| V5 Input Validation | No | N/A (existing validation unchanged) |
| V6 Cryptography | No | N/A |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `computeGoalPeriod.ts` exports exactly 3 functions (computeGoalPeriod, deriveGoalStatus, currentPeriod) and all are pure | Pitfall 1 | Need to verify the full export list before moving; may need to split |
| A2 | PlaybookTab sub-component line counts (200-300 each) will stay under 300 after extraction | Architecture Patterns | Might need further splitting if sections are larger than estimated |

All other claims in this research were verified by direct code inspection.

## Open Questions

1. **handleSave extraction in PlaybookTab**
   - What we know: handleSave is a large function that orchestrates the upsert mutation with dirty detection across 16+ fields
   - What's unclear: Whether extracting it to a custom hook (e.g., `usePlaybookSave`) reduces PlaybookTab further or just moves complexity sideways
   - Recommendation: Keep in orchestrator initially. Extract only if PlaybookTab exceeds 300 lines after sub-component extraction.

2. **DraftStep + isPaintMissing relocation scope**
   - What we know: D-03 says "move computeOrderIndex" but DraftStep and DraftSection have a type dependency chain
   - What's unclear: Whether the user intended only computeOrderIndex to move, or the full file
   - Recommendation: Move DraftStep to src/types/recipe.ts (alongside DraftSection) and all pure functions to src/lib/recipeSteps.ts. This avoids partial relocation pitfalls.

## Sources

### Primary (HIGH confidence)
- `src/features/units/PlaybookTab.tsx` -- 1431 lines, direct inspection of section boundaries and state
- `src/features/units/UnitSheet.tsx` -- 688 lines, direct inspection of form structure
- `src/features/army-lists/ArmyListsPage.tsx` -- 268 lines, 14 useState calls verified
- `src/components/ui/form.tsx` -- confirmed Form = FormProvider (line 19)
- `src/db/queries/goals.ts` and `src/db/queries/recipes.ts` -- verified feature-layer imports
- `src/features/recipes/recipeSteps.ts` -- verified exports: DraftStep, makeDraftStep, computeOrderIndex, isPaintMissing
- `src/features/recipes/recipeDiff.ts` -- verified exports: computeSectionDiff, computeStepDiff, buildSectionIdMap
- `src/features/recipes/recipeSection.ts` -- verified DraftSection type with DraftStep dependency
- `npm view react-hook-form version` -- 7.76.0 confirmed
- grep scan of all import consumers for relocated files

### Secondary (MEDIUM confidence)
- React useReducer pattern -- standard React documentation pattern [ASSUMED from training data but well-established]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new packages, all existing dependencies verified
- Architecture: HIGH -- all four workstreams mapped to specific files with line numbers
- Pitfalls: HIGH -- verified by direct code inspection of import chains and type dependencies

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (stable -- pure refactoring, no external dependency drift)
