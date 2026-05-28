# Phase 102: Smart Context Pre-Filling - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 5 (3 modified, 2 new test files)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/recipes/RecipeFormSheet.tsx` | component | request-response | Self (current file) | exact |
| `src/features/recipes/ApplyRecipeDialog.tsx` | component | request-response | Self (current file) | exact |
| `src/features/units/UnitDetailSheet.tsx` | component | request-response | Self (current file) | exact |
| `tests/recipes/RecipeFormSheetPreFill.test.tsx` | test | request-response | `tests/recipes/RecipeDetailSheetPaint.test.tsx` | exact |
| `tests/recipes/ApplyRecipeDialogGrouping.test.tsx` | test | request-response | `tests/recipes/RecipeDetailSheetPaint.test.tsx` | exact |

## Pattern Assignments

### `src/features/recipes/RecipeFormSheet.tsx` (component, modify)

**Self-analog -- modifications only.** No structural changes to the component. Two changes required:

**Props interface pattern** (lines 64-68) -- add optional props:
```typescript
export interface RecipeFormSheetProps {
  open: boolean;
  recipe: PaintingRecipe | null;
  onClose: () => void;
  defaultFactionId?: number | null;  // NEW
  defaultUnitId?: number | null;     // NEW
}
```

**buildDefaults pattern** (lines 85-101) -- extend to accept and use new params:
```typescript
function buildDefaults(
  recipe: PaintingRecipe | null,
  defaultFactionId?: number | null,
  defaultUnitId?: number | null,
): RecipeFormValues {
  if (!recipe) return {
    ...DEFAULT_VALUES,
    faction_id: defaultFactionId ?? null,
    unit_id: defaultUnitId ?? null,
  };
  return { /* ...existing edit-mode logic unchanged... */ };
}
```

**Component signature pattern** (line 111) -- destructure new props:
```typescript
export function RecipeFormSheet({ open, recipe, onClose, defaultFactionId, defaultUnitId }: RecipeFormSheetProps) {
```

**useForm call** (line 124-127) -- pass new params to buildDefaults:
```typescript
const form = useForm<RecipeFormValues>({
  resolver: zodResolver(recipeSchema),
  defaultValues: buildDefaults(recipe, defaultFactionId, defaultUnitId),
});
```

**useEffect reset** (lines 144-152) -- pass new params to buildDefaults in reset call:
```typescript
useEffect(() => {
  form.reset(buildDefaults(recipe, defaultFactionId, defaultUnitId));
  // ...rest unchanged
}, [recipe?.id, existingSectionsLen, existingStepsLen]);
```

**Key prop on SheetContent** (line 247) -- already forces re-mount for create mode, freezing defaults at open time:
```typescript
key={recipe?.id ?? "new"}
```

---

### `src/features/recipes/ApplyRecipeDialog.tsx` (component, modify)

**Self-analog -- modifications only.**

**Props interface pattern** (lines 30-34) -- add factionId:
```typescript
interface ApplyRecipeDialogProps {
  open: boolean;
  unitId: number;
  factionId?: number | null;  // NEW
  onClose: () => void;
}
```

**Component signature pattern** (line 45-48) -- destructure new prop:
```typescript
export function ApplyRecipeDialog({
  open,
  unitId,
  factionId,
  onClose,
}: ApplyRecipeDialogProps) {
```

**Grouping pattern** -- add useMemo to split recipes (insert after line 68, the factionMap memo):
```typescript
const { suggested, other } = useMemo(() => {
  if (factionId == null) return { suggested: recipes, other: [] };
  const s = recipes.filter(r => r.faction_id === factionId);
  const o = recipes.filter(r => r.faction_id !== factionId);
  return { suggested: s, other: o };
}, [recipes, factionId]);
```

**CommandGroup rendering pattern** (lines 112-128) -- replace single CommandGroup with two:
```typescript
<CommandList>
  <CommandEmpty>No recipes found.</CommandEmpty>
  {suggested.length > 0 && (
    <CommandGroup heading={factionId != null && other.length > 0 ? "Suggested" : undefined}>
      {suggested.map((recipe) => (
        <CommandItem
          key={recipe.id}
          value={recipe.name}
          onSelect={() => setSelectedRecipeId(recipe.id)}
        >
          <span className="flex-1">{recipe.name}</span>
          {recipe.faction_id !== null && factionMap.has(recipe.faction_id) && (
            <Badge variant="secondary" className="ml-auto">
              {factionMap.get(recipe.faction_id)}
            </Badge>
          )}
        </CommandItem>
      ))}
    </CommandGroup>
  )}
  {other.length > 0 && (
    <CommandGroup heading="Other">
      {other.map((recipe) => (
        <CommandItem
          key={recipe.id}
          value={recipe.name}
          onSelect={() => setSelectedRecipeId(recipe.id)}
        >
          <span className="flex-1">{recipe.name}</span>
          {recipe.faction_id !== null && factionMap.has(recipe.faction_id) && (
            <Badge variant="secondary" className="ml-auto">
              {factionMap.get(recipe.faction_id)}
            </Badge>
          )}
        </CommandItem>
      ))}
    </CommandGroup>
  )}
</CommandList>
```

---

### `src/features/units/UnitDetailSheet.tsx` (component, modify)

**Self-analog -- one-line change only.**

**ApplyRecipeDialog call site** (lines 272-278) -- add factionId prop:
```typescript
{unit && (
  <ApplyRecipeDialog
    open={applyDialogOpen}
    unitId={unit.id}
    factionId={unit.faction_id}
    onClose={() => setApplyDialogOpen(false)}
  />
)}
```

---

### `tests/recipes/RecipeFormSheetPreFill.test.tsx` (test, new)

**Analog:** `tests/recipes/RecipeDetailSheetPaint.test.tsx`

**Test file structure pattern** (full file structure):
```typescript
// Line 1-8: JSDoc header with phase/requirement reference
/**
 * Phase 102 SCP-01/SCP-03 -- RecipeFormSheet pre-fill behavior.
 *
 * Verifies:
 * - faction_id and unit_id are pre-populated when defaultFactionId/defaultUnitId props provided
 * - Fields are fully editable after pre-fill
 * - No pre-fill when props are absent (QuickAdd/global context)
 */

// Lines 10-15: Vitest + RTL imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
```

**Mock pattern** (from analog lines 20-92) -- mock all hooks used by RecipeFormSheet:
```typescript
vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [
    { id: 10, name: "Ultramarines" },
    { id: 20, name: "Tau Empire" },
  ] }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnits: () => ({ data: [
    { id: 1, name: "Intercessors", faction_id: 10 },
    { id: 2, name: "Crisis Suits", faction_id: 20 },
  ] }),
}));

vi.mock("@/hooks/usePaints", () => ({
  usePaints: () => ({ data: [] }),
}));

vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: () => ({ data: [] }),
  RECIPE_PAINTS_KEY: vi.fn(),
  STEP_COUNTS_KEY: ["step-counts"],
  RECIPE_AVAILABILITY_KEY: ["recipe-availability"],
  RECIPE_SWATCH_KEY: ["recipe-swatch"],
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: () => ({ data: [] }),
  RECIPE_SECTIONS_KEY: vi.fn(),
  SECTION_COUNTS_KEY: ["section-counts"],
}));

vi.mock("@/hooks/useRecipes", () => ({
  RECIPES_KEY: ["recipes"],
  RECIPE_KEY: vi.fn(),
}));

// Mock Tauri file APIs used by photo upload
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  BaseDirectory: { AppData: 0 },
}));

vi.mock("@/db/queries/recipes", () => ({
  saveRecipeGraph: vi.fn(),
}));
```

**QueryClient wrapper pattern** (from analog lines 99-106):
```typescript
function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
```

**Test case pattern** (from analog lines 139-227):
```typescript
describe("SCP-01/SCP-03: RecipeFormSheet pre-fill", () => {
  it("pre-fills faction_id when defaultFactionId is provided", () => {
    render(
      <RecipeFormSheet
        open={true}
        recipe={null}
        onClose={vi.fn()}
        defaultFactionId={10}
      />,
      { wrapper: createWrapper() },
    );
    // Assert faction select shows "Ultramarines"
  });

  it("does not pre-fill when defaultFactionId is absent", () => {
    render(
      <RecipeFormSheet
        open={true}
        recipe={null}
        onClose={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );
    // Assert faction select shows "No faction" / placeholder
  });
});
```

---

### `tests/recipes/ApplyRecipeDialogGrouping.test.tsx` (test, new)

**Analog:** `tests/recipes/RecipeDetailSheetPaint.test.tsx`

**Same test structure as above.** Key differences in mocks:

**Mock pattern for ApplyRecipeDialog** -- mock useRecipes to return recipes with varying faction_ids:
```typescript
vi.mock("@/hooks/useRecipes", () => ({
  useRecipes: () => ({ data: [
    { id: 1, name: "Blue Armor", faction_id: 10 },
    { id: 2, name: "White Panels", faction_id: 10 },
    { id: 3, name: "Red Skin", faction_id: 20 },
    { id: 4, name: "Generic Base", faction_id: null },
  ] }),
}));

vi.mock("@/hooks/useRecipeAssignments", () => ({
  useCreateAssignment: () => ({ mutate: vi.fn(), isPending: false }),
}));
```

**Test case pattern for grouping:**
```typescript
describe("SCP-02: ApplyRecipeDialog faction grouping", () => {
  it("shows 'Suggested' and 'Other' groups when factionId is provided", () => {
    render(
      <ApplyRecipeDialog
        open={true}
        unitId={1}
        factionId={10}
        onClose={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );
    // Assert "Suggested" heading exists
    // Assert "Other" heading exists
    // Assert matching recipes in suggested, others in other
  });

  it("shows flat list when factionId is null", () => {
    render(
      <ApplyRecipeDialog
        open={true}
        unitId={1}
        factionId={null}
        onClose={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );
    // Assert no "Suggested" or "Other" headings
    // Assert all recipes visible
  });
});
```

---

## Shared Patterns

### Sheet/Dialog Props Convention
**Source:** `src/features/recipes/RecipeFormSheet.tsx` lines 64-68, `src/features/recipes/ApplyRecipeDialog.tsx` lines 30-34
**Apply to:** All modified components

All Sheet/Dialog components follow `{ open, onClose, ...contextProps }` pattern. Optional context props use `propName?: Type | null` with undefined meaning "not provided" (context-free entry point).

```typescript
// Optional context props are typed as `Type | null` with `?` modifier
defaultFactionId?: number | null;
```

### React Hook Form defaultValues
**Source:** `src/features/recipes/RecipeFormSheet.tsx` lines 70-101, 124-127
**Apply to:** RecipeFormSheet

Default values merge pattern: spread `DEFAULT_VALUES` and override with prop values using nullish coalescing.

```typescript
const form = useForm<RecipeFormValues>({
  resolver: zodResolver(recipeSchema),
  defaultValues: buildDefaults(recipe, defaultFactionId, defaultUnitId),
});
```

### CommandGroup with heading
**Source:** `src/features/recipes/ApplyRecipeDialog.tsx` lines 108-129
**Apply to:** ApplyRecipeDialog

The existing `CommandGroup` (from shadcn/ui command.tsx) accepts a `heading` prop for group labels. Pass `undefined` to suppress the heading for single-group mode.

### Test Mock Pattern
**Source:** `tests/recipes/RecipeDetailSheetPaint.test.tsx` lines 20-92
**Apply to:** Both new test files

All hooks used by the component under test must be mocked via `vi.mock()` with static return data. Tauri plugin APIs must also be mocked. Wrap renders in `QueryClientProvider` with `retry: false`.

## No Analog Found

No files without analogs -- all changes are to existing files or follow established test patterns.

## Metadata

**Analog search scope:** `src/features/recipes/`, `src/features/units/`, `tests/recipes/`
**Files scanned:** 6 source files, 1 test analog
**Pattern extraction date:** 2026-05-28
