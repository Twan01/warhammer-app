# Phase 99: Architecture Cleanup - Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 16 (new/modified/relocated)
**Analogs found:** 14 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/computeGoalPeriod.ts` | utility | transform | `src/lib/computeSyncDiff.ts` | exact |
| `src/lib/recipeDiff.ts` | utility | transform | `src/lib/computeSyncDiff.ts` | exact |
| `src/lib/recipeSteps.ts` | utility | transform | `src/lib/computeSyncDiff.ts` | exact |
| `src/types/recipe.ts` (additions) | model | N/A | `src/types/recipeSection.ts` | exact |
| `src/db/queries/goals.ts` (import fix) | query | CRUD | self (lines 1-3) | exact |
| `src/db/queries/recipes.ts` (import fix) | query | CRUD | self (lines 1-8) | exact |
| `src/features/units/PlaybookTab.tsx` (slim) | component | request-response | `src/features/units/LoadoutSection.tsx` | role-match |
| `src/features/units/PlaybookStats.tsx` | component | presentation | `src/features/units/LoadoutSection.tsx` | role-match |
| `src/features/units/PlaybookStrategy.tsx` | component | presentation | `src/features/units/LoadoutSection.tsx` | role-match |
| `src/features/units/PlaybookDatasheet.tsx` | component | presentation | `src/features/units/LoadoutSection.tsx` | role-match |
| `src/features/units/PlaybookSyncDetails.tsx` | component | presentation | `src/features/units/LoadoutSection.tsx` | role-match |
| `src/features/units/PlaybookRules.tsx` | component | presentation | `src/features/units/LoadoutSection.tsx` | role-match |
| `src/features/units/UnitSheet.tsx` (slim) | component | request-response | self (current structure) | exact |
| `src/features/units/UnitFormRequired.tsx` | component | presentation | `src/features/units/UnitSheet.tsx` lines 177-233 | exact |
| `src/features/units/UnitFormOptional.tsx` | component | presentation | `src/features/units/UnitSheet.tsx` lines 250-672 | exact |
| `src/features/army-lists/armyListsReducer.ts` | store | event-driven | `src/features/army-lists/ArmyListsPage.tsx` lines 42-107 | exact |
| `src/features/army-lists/ArmyListsPage.tsx` (slim) | component | request-response | self (current structure) | exact |

## Pattern Assignments

### `src/lib/computeGoalPeriod.ts` (utility, transform)

**Analog:** `src/lib/computeSyncDiff.ts` (pure function in lib with JSDoc, type-only imports)

**File header pattern** (computeSyncDiff.ts lines 1-16):
```typescript
/**
 * Phase 46/47 -- Post-sync diff computation (OVRD-06, OVRD-07).
 *
 * Pure function -- no database access, no side effects. Input comes from:
 * [describe inputs]
 */
```

**Import pattern for lib files:**
```typescript
// Only import from @/lib/ and @/types/ -- NEVER from @/features/ or @/hooks/
import { todayISO } from "@/lib/dates";
import type { GoalTimeframe } from "@/types/goal";
```

**Content:** Move entire file contents (3 exports: `computeGoalPeriod`, `currentPeriod`, `deriveGoalStatus` plus types `GoalStatus`, `GoalPeriod`). All are pure date logic with only `@/lib/dates` and `@/types/goal` imports -- no feature dependencies.

---

### `src/lib/recipeDiff.ts` (utility, transform)

**Analog:** `src/lib/computeSyncDiff.ts`

**Import pattern after relocation:**
```typescript
import type { DraftSection } from "@/types/recipe";        // was @/features/recipes/recipeSection
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";
```

**Content:** Move all 3 exports (`computeSectionDiff`, `computeStepDiff`, `buildSectionIdMap`) plus interfaces (`SectionDiff`, `StepDiff`, `FlatDraftStep`). Single consumer: `src/db/queries/recipes.ts`.

---

### `src/lib/recipeSteps.ts` (utility, transform)

**Analog:** `src/lib/computeSyncDiff.ts`

**Import pattern after relocation:**
```typescript
import type { DraftStep } from "@/types/recipe";  // was local ./recipeSteps import
import type { Paint } from "@/types/paint";
```

**Content:** Move all 3 functions (`computeOrderIndex`, `makeDraftStep`, `isPaintMissing`). The `DraftStep` interface moves to `src/types/recipe.ts` instead (it is a data shape, not a function). Consumers: `src/db/queries/recipes.ts` and `src/features/painting-mode/PaintingModeView.tsx`.

---

### `src/types/recipe.ts` (model, additions)

**Analog:** `src/types/recipeSection.ts` (existing type file with interface + derived types)

**Existing content** (lines 1-36):
```typescript
export interface PaintingRecipe {
  id: number;
  name: string;
  // ... 20 fields
}
export type CreateRecipeInput = Omit<PaintingRecipe, "id" | "created_at" | "updated_at">;
export type UpdateRecipeInput = Partial<CreateRecipeInput> & { id: number };
```

**Additions to append:**
```typescript
// --- Draft types (relocated from features/recipes/) ---

export interface DraftStep {
  localId: string;
  dbId: number | null;
  step_name: string;
  paint_id: number | null;
  notes: string | null;
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
  step_photo_path: string | null;
  alt_paint_id: number | null;
}

export interface DraftSection {
  localId: string;
  dbId: number | null;
  name: string;
  surface: string | null;
  optional: number;
  notes: string | null;
  section_type: string | null;
  technique: string | null;
  execution_mode: string | null;
  applies_to: string | null;
  steps: DraftStep[];
}
```

**RecipeFormValues:** Also add `RecipeFormValues` type. Since it is `z.infer<typeof recipeSchema>` and the schema stays in the feature file, the cleanest approach is to re-export the type from `src/types/recipe.ts`:
```typescript
export type { RecipeFormValues } from "@/features/recipes/recipeSchema";
```
Or move the type alias directly if the query layer should have zero transitive feature imports.

---

### `src/db/queries/goals.ts` (query, CRUD -- import fix only)

**Current violation** (line 3):
```typescript
import { computeGoalPeriod } from "@/features/goals/computeGoalPeriod";
```

**Fixed import:**
```typescript
import { computeGoalPeriod } from "@/lib/computeGoalPeriod";
```

---

### `src/db/queries/recipes.ts` (query, CRUD -- import fix only)

**Current violations** (lines 5-8):
```typescript
import type { DraftSection } from "@/features/recipes/recipeSection";
import type { RecipeFormValues } from "@/features/recipes/recipeSchema";
import { computeSectionDiff, computeStepDiff, buildSectionIdMap } from "@/features/recipes/recipeDiff";
import { computeOrderIndex } from "@/features/recipes/recipeSteps";
```

**Fixed imports:**
```typescript
import type { DraftSection } from "@/types/recipe";
import type { RecipeFormValues } from "@/types/recipe";
import { computeSectionDiff, computeStepDiff, buildSectionIdMap } from "@/lib/recipeDiff";
import { computeOrderIndex } from "@/lib/recipeSteps";
```

---

### `src/features/units/PlaybookStats.tsx` (component, presentation)

**Analog:** `src/features/units/LoadoutSection.tsx` (already-extracted PlaybookTab sub-component)

**Component signature pattern** (LoadoutSection.tsx lines 24-28):
```typescript
interface LoadoutSectionProps {
  unitId: number;
}

export function LoadoutSection({ unitId }: LoadoutSectionProps) {
```

**Import pattern for sub-components:**
```typescript
import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { UpsertUnitOverrideInput } from "@/types/unitOverride";
```

**Section label pattern** (LoadoutSection.tsx line 21):
```typescript
const SECTION_LABEL_CLASS =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";
```

**Props approach:** Each sub-component receives typed props from PlaybookTab orchestrator. Group related props into objects to avoid 20+ individual props:
```typescript
interface PlaybookStatsProps {
  unitId: number;
  datasheet: FullDatasheet | null | undefined;
  overrides: Record<string, number | null>;
  onOverrideChange: (key: string, value: number | null) => void;
  editMode: boolean;
  onToggleEditMode: () => void;
  syncMeta: { last_sync_at: string } | undefined;
}
```

---

### `src/features/units/PlaybookStrategy.tsx` (component, presentation)

**Analog:** Same as PlaybookStats -- `LoadoutSection.tsx` pattern

**Props pattern -- strategy fields from PlaybookTab** (parent passes field values + setters):
```typescript
interface PlaybookStrategyProps {
  note: StrategyNote | null | undefined;
  draftFields: {
    battlefield_role: string;
    strengths: string;
    weaknesses: string;
    synergies: string;
    notes: string;
  };
  onFieldChange: (field: string, value: string) => void;
  isDirty: boolean;
  onSave: () => void;
  isSaving: boolean;
}
```

---

### `src/features/units/PlaybookDatasheet.tsx` (component, presentation)

**Analog:** `LoadoutSection.tsx` + PlaybookTab lines 934+ (datasheet/weapons/abilities rendering)

**Props pattern:**
```typescript
interface PlaybookDatasheetProps {
  unitId: number;
  datasheet: FullDatasheet | null | undefined;
  onDatasheetConflict?: (payload: DatasheetImportPayload) => void;
  // weapons, abilities passed as data props
}
```

---

### `src/features/units/PlaybookSyncDetails.tsx` (component, presentation)

**Analog:** `LoadoutSection.tsx` pattern

**Key imports for sync display:**
```typescript
import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";
import { relativeDate } from "@/lib/dates";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
```

---

### `src/features/units/PlaybookRules.tsx` (component, presentation)

**Analog:** `LoadoutSection.tsx` + PlaybookTab lines 1028+ (stratagems/detachments/shared abilities)

**Key imports for rules display:**
```typescript
import type { RwDetachment, RwStratagem, RwDetachmentAbility } from "@/types/datasheet";
import type { RulesFavorite } from "@/types/rulesFavorite";
import type { RulesNote } from "@/types/rulesNote";
import { RuleAnnotationControls } from "@/features/rules-hub/RuleAnnotationControls";
import { RuleNoteEditor } from "@/features/rules-hub/RuleNoteEditor";
```

---

### `src/features/units/UnitFormRequired.tsx` (component, presentation)

**Analog:** `src/features/units/UnitSheet.tsx` lines 177-233 (the required fields section)

**useFormContext pattern** (verified: `src/components/ui/form.tsx` line 19 confirms `Form = FormProvider`):
```typescript
import { useFormContext } from "react-hook-form";
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { UnitFormValues } from "./unitSchema";
import { CategoryCombobox } from "./CategoryCombobox";

export function UnitFormRequired({ factions, factionsLoading }: UnitFormRequiredProps) {
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
      {/* faction_id, category fields */}
    </>
  );
}
```

**Note:** The `factions` data and `factionsLoading` flag must be passed as props since the sub-component should not own React Query hooks (orchestrator pattern from D-07).

---

### `src/features/units/UnitFormOptional.tsx` (component, presentation)

**Analog:** `src/features/units/UnitSheet.tsx` lines 250-672 (the collapsible optional section)

**Same useFormContext pattern as UnitFormRequired.** Contains the collapsible toggle, checkbox fields, number inputs, date inputs, and textarea fields.

**Checkbox field pattern** (UnitSheet.tsx lines 300-320):
```typescript
<FormField
  name="status_assembly"
  control={control}
  render={({ field }) => (
    <FormItem>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="status_assembly"
          className="accent-primary h-4 w-4 rounded border-border"
          checked={!!field.value}
          onChange={(e) => field.onChange(e.target.checked)}
        />
        <FormLabel htmlFor="status_assembly" className="cursor-pointer">
          Assembly complete
        </FormLabel>
      </div>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Nullable number input pattern** (UnitSheet.tsx lines 388-410):
```typescript
<FormField
  name="priority"
  control={control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Priority</FormLabel>
      <FormControl>
        <Input
          type="number"
          placeholder="Optional"
          {...field}
          value={field.value ?? ""}
          onChange={(e) =>
            field.onChange(e.target.value === "" ? null : e.target.valueAsNumber)
          }
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Props:** `expanded` state and `setExpanded` toggle stay in UnitFormOptional (local interaction state per D-07). The `hasTiers` / `tiers` data for the points field comes via props.

---

### `src/features/units/UnitSheet.tsx` (component, slim orchestrator)

**Analog:** Self -- current file slimmed from 688 to ~200 lines

**Orchestrator pattern after decomposition:**
```typescript
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { unitSchema, type UnitFormValues } from "./unitSchema";
import { UnitFormRequired } from "./UnitFormRequired";
import { UnitFormOptional } from "./UnitFormOptional";
// hooks + types...

export function UnitSheet({ open, unit, defaultFactionId, onClose }: UnitSheetProps) {
  // form setup, hooks, onSubmit stay here
  // buildDefaultValues stays here (D-11)

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>...</SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
            <UnitFormRequired factions={factions} factionsLoading={factionsLoading} />
            <Separator />
            <UnitFormOptional hasTiers={hasTiers} tiers={tiers} />
            <SheetFooter>...</SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
```

---

### `src/features/army-lists/armyListsReducer.ts` (store, event-driven)

**Analog:** `src/features/army-lists/ArmyListsPage.tsx` lines 42-107 (the 14 useState calls + handlers being replaced)

**State shape** (derived from ArmyListsPage.tsx lines 42-55):
```typescript
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
```

**Cascade reset pattern** (ArmyListsPage.tsx line 91 -- closeDetail resets 9 states):
```typescript
// BEFORE (14 individual setState calls):
const closeDetail = () => {
  setSelectedListId(null); setUnitPickerOpen(false); setLoadoutUnitId(null);
  setEnhancementUnitId(null); setLeaderUnitId(null); setDatasheetBrowserOpen(false);
  setPrintPreviewOpen(false); setSnapshotHistoryOpen(false);
  setCompareSnapshotIds(null); setCompareSnapshotLabels(null);
};

// AFTER (single reducer case):
case "CLOSE_DETAIL":
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
```

**Discriminated union action pattern:**
```typescript
export type ArmyListsAction =
  | { type: "OPEN_CREATE" }
  | { type: "OPEN_EDIT"; list: ArmyList }
  | { type: "CLOSE_SHEET" }
  | { type: "OPEN_DELETE"; list: ArmyList }
  | { type: "CLOSE_DELETE" }
  | { type: "OPEN_DETAIL"; listId: number }
  | { type: "CLOSE_DETAIL" }
  // ... etc
```

**Wrapper handler pattern in ArmyListsPage** (preserves existing child component API):
```typescript
const [state, dispatch] = useReducer(armyListsReducer, initialArmyListsState);

const openCreate = () => dispatch({ type: "OPEN_CREATE" });
const openEdit = (list: ArmyList) => dispatch({ type: "OPEN_EDIT", list });
const closeSheet = () => dispatch({ type: "CLOSE_SHEET" });
const closeDetail = () => dispatch({ type: "CLOSE_DETAIL" });
// Child components receive these same () => void / (list) => void callbacks unchanged
```

---

### `tests/army-lists/armyListsReducer.test.ts` (test, unit)

**Analog:** No existing reducer test files in the codebase.

**Test framework pattern** (from `tests/setup.ts` and existing test files):
```typescript
import { describe, it, expect } from "vitest";
import { armyListsReducer, initialArmyListsState, type ArmyListsAction } from "@/features/army-lists/armyListsReducer";

describe("armyListsReducer", () => {
  it("CLOSE_DETAIL resets all sub-sheet state", () => {
    const dirty = {
      ...initialArmyListsState,
      selectedListId: 5,
      unitPickerOpen: true,
      loadoutUnitId: 3,
    };
    const result = armyListsReducer(dirty, { type: "CLOSE_DETAIL" });
    expect(result.selectedListId).toBeNull();
    expect(result.unitPickerOpen).toBe(false);
    expect(result.loadoutUnitId).toBeNull();
  });
});
```

---

## Shared Patterns

### Named Function Exports (all components)
**Source:** Project convention from CLAUDE.md
**Apply to:** All new component files
```typescript
// Named function exports, prop types inline or interface above:
export function PlaybookStats({ unitId, datasheet }: PlaybookStatsProps) { ... }
```

### Form Field Pattern (UnitFormRequired, UnitFormOptional)
**Source:** `src/features/units/UnitSheet.tsx` lines 179-191
**Apply to:** All form sub-components
```typescript
<FormField
  name="name"
  control={control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Name</FormLabel>
      <FormControl>
        <Input placeholder="..." {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### useFormContext Access (form sub-components)
**Source:** `src/components/ui/form.tsx` line 19 (`const Form = FormProvider`)
**Apply to:** `UnitFormRequired.tsx`, `UnitFormOptional.tsx`
```typescript
import { useFormContext } from "react-hook-form";
import type { UnitFormValues } from "./unitSchema";

export function UnitFormRequired() {
  const { control } = useFormContext<UnitFormValues>();
  // FormField components work identically -- control is the same object
}
```

### Path Alias Convention
**Source:** `tsconfig.json` + `vite.config.ts`
**Apply to:** All new files
```typescript
// Always use @/ alias for src/ imports
import { something } from "@/lib/something";
import type { SomeType } from "@/types/something";
// Relative imports only within the same feature directory
import { SiblingComponent } from "./SiblingComponent";
```

### Lib File Convention (pure utilities)
**Source:** `src/lib/computeSyncDiff.ts`, `src/lib/dates.ts`
**Apply to:** `computeGoalPeriod.ts`, `recipeDiff.ts`, `recipeSteps.ts`
- JSDoc header describing purpose and purity
- Only imports from `@/lib/` and `@/types/` -- never from `@/features/`, `@/hooks/`, or `@/db/`
- All functions are pure (no side effects, no async, no React)
- Named exports only

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/army-lists/armyListsReducer.test.ts` | test | unit | No existing reducer test files in codebase; use standard Vitest `describe/it/expect` pattern from other test files |

## Metadata

**Analog search scope:** `src/features/`, `src/lib/`, `src/types/`, `src/db/queries/`, `src/components/ui/`, `tests/`
**Files scanned:** 45+
**Pattern extraction date:** 2026-05-22
