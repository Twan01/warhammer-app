# Phase 63: Applied Recipe UX - Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 8 (4 new components, 2 modified components, 1 new shadcn wrapper, 4 test stubs)
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/features/recipes/ApplyRecipeDialog.tsx` | component (dialog) | request-response | `src/features/army-lists/UnitPickerDialog.tsx` | exact |
| `src/features/recipes/ApplyToUnitsDialog.tsx` | component (dialog) | request-response | `src/features/army-lists/UnitPickerDialog.tsx` | exact |
| `src/features/recipes/AssignmentChecklist.tsx` | component | CRUD + event-driven | `src/features/recipes/SectionedTimeline.tsx` + `src/features/units/PlaybookTab.tsx` | role-match |
| `src/features/units/AppliedRecipesTab.tsx` | component (tab panel) | CRUD | `src/features/units/JournalTab.tsx` | exact |
| `src/features/units/UnitDetailSheet.tsx` | component (modified) | request-response | self | self |
| `src/features/recipes/RecipeDetailSheet.tsx` | component (modified) | request-response | self | self |
| `src/components/ui/accordion.tsx` | ui primitive | — | `src/components/ui/collapsible.tsx` | exact |
| `tests/applied-recipes/*.test.tsx` (4 files) | test | — | `tests/painting/sectionedTimeline.test.tsx` | exact |

---

## Pattern Assignments

### `src/features/recipes/ApplyRecipeDialog.tsx` (dialog, request-response)

**Analog:** `src/features/army-lists/UnitPickerDialog.tsx`

**Imports pattern** (`UnitPickerDialog.tsx` lines 1-19):
```typescript
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
// ApplyRecipeDialog will also need:
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCreateAssignment } from "@/hooks/useRecipeAssignments";
import { useRecipes } from "@/hooks/useRecipes";
import { useRecipeSections } from "@/hooks/useRecipeSections";
import { useRecipePaints } from "@/hooks/useRecipePaints";
import { usePaints } from "@/hooks/usePaints";
import { SectionedTimeline } from "./SectionedTimeline";
import { RecipeStepTimeline } from "./RecipeStepTimeline";
```

**Dialog open/close pattern** (`UnitPickerDialog.tsx` lines 70-71):
```typescript
<Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
  <DialogContent className="p-0 sm:max-w-[480px]">
```

**Props interface pattern** (`UnitPickerDialog.tsx` lines 21-28):
```typescript
interface ApplyRecipeDialogProps {
  open: boolean;
  unitId: number;
  onClose: () => void;
}
```

**Command (searchable picker) core pattern** (`UnitPickerDialog.tsx` lines 81-104):
```typescript
<Command>
  <CommandInput placeholder="Search recipes..." />
  <CommandList>
    <CommandEmpty>No recipes found.</CommandEmpty>
    <CommandGroup>
      {filteredRecipes.map((recipe) => (
        <CommandItem
          key={recipe.id}
          value={recipe.name}
          onSelect={() => setSelectedRecipeId(recipe.id)}
        >
          <span className="flex-1">{recipe.name}</span>
          {recipe.faction && (
            <Badge variant="secondary" className="ml-auto">
              {recipe.faction}
            </Badge>
          )}
        </CommandItem>
      ))}
    </CommandGroup>
  </CommandList>
</Command>
```

**paintMap builder for SectionedTimeline preview** (`RecipeDetailSheet.tsx` lines 75-79):
```typescript
const paintMap = useMemo(() => {
  const m = new Map<number, typeof paints[number]>();
  for (const p of paints) m.set(p.id, p);
  return m;
}, [paints]);
```

**Mutation with toast** (`UnitPickerDialog.tsx` lines 56-66):
```typescript
createAssignment.mutate(
  { unit_id: unitId, recipe_id: selectedRecipeId },
  {
    onSuccess: () => {
      toast.success("Recipe applied.");
      onClose();
    },
    onError: () => toast.error("Failed to apply recipe. Please try again."),
  },
);
```

**Multi-step dialog state** — this dialog has two steps (picker → preview → confirm). Use a local `useState` string for the current step and a `selectedRecipeId: number | null` state:
```typescript
const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
// Sections/steps loaded only when a recipe is selected
const { data: sections = [] } = useRecipeSections(selectedRecipeId ?? undefined);
const { data: steps = [] } = useRecipePaints(selectedRecipeId ?? undefined);
// Preview shows only when selectedRecipeId is set
```

---

### `src/features/recipes/ApplyToUnitsDialog.tsx` (dialog, request-response + bulk)

**Analog:** `src/features/army-lists/UnitPickerDialog.tsx`

**Imports pattern** — same Dialog + Command imports as above, plus:
```typescript
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkCreateAssignments, useAssignmentsByRecipe } from "@/hooks/useRecipeAssignments";
import { useUnits } from "@/hooks/useUnits";
import { useFactions } from "@/hooks/useFactions";
```

**Already-assigned detection pattern** (from `63-RESEARCH.md`):
```typescript
const { data: existingAssignments = [] } = useAssignmentsByRecipe(recipe?.id);
const assignedUnitIds = useMemo(
  () => new Set(existingAssignments.map((a) => a.unit_id)),
  [existingAssignments]
);
// In picker row:
// disabled={assignedUnitIds.has(unit.id)}
// className={assignedUnitIds.has(unit.id) ? "opacity-50" : ""}
```

**Multi-select state** — use `Set<number>` in local state:
```typescript
const [selectedUnitIds, setSelectedUnitIds] = useState<Set<number>>(new Set());
function toggleUnit(id: number) {
  setSelectedUnitIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
}
```

**Bulk mutation with toast** (`useRecipeAssignments.ts` lines 102-115):
```typescript
bulkCreate.mutate(
  { unitIds: Array.from(selectedUnitIds), recipeId: recipe.id },
  {
    onSuccess: () => {
      toast.success(`Recipe applied to ${selectedUnitIds.size} unit(s).`);
      onClose();
    },
    onError: () => toast.error("Failed to apply recipe. Please try again."),
  }
);
```

**Dialog footer confirmation pattern** (`UnitDeleteDialog.tsx` lines 117-122):
```typescript
<DialogFooter className="gap-2 sm:gap-2">
  <Button variant="outline" onClick={onClose}>Cancel</Button>
  <Button
    onClick={handleConfirm}
    disabled={bulkCreate.isPending || selectedUnitIds.size === 0}
  >
    Apply to {selectedUnitIds.size} unit{selectedUnitIds.size !== 1 ? "s" : ""}
  </Button>
</DialogFooter>
```

---

### `src/features/recipes/AssignmentChecklist.tsx` (component, CRUD + event-driven)

**Analog:** `src/features/recipes/SectionedTimeline.tsx` (structure) + `src/features/units/PlaybookTab.tsx` (Collapsible pattern)

**Imports pattern**:
```typescript
import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useStepProgress, useToggleStepProgress } from "@/hooks/useRecipeAssignments";
import { computeAssignmentProgress } from "@/lib/computeAssignmentProgress";
import { useRecipePaints } from "@/hooks/useRecipePaints";
import { useRecipeSections } from "@/hooks/useRecipeSections";
import type { RecipeAssignment } from "@/types/recipeAssignment";
```

**Props interface** — single assignment, gated mount:
```typescript
interface AssignmentChecklistProps {
  assignment: RecipeAssignment;  // never undefined — gated by parent
  recipeId: number;
}
```

**Progress bar pattern** (from `63-RESEARCH.md` code examples):
```typescript
<div className="flex items-center gap-2">
  <Progress value={progress.percentage} className="h-2 flex-1" />
  <span className="text-xs text-muted-foreground tabular-nums">
    {progress.percentage}% complete
  </span>
</div>
```

**Accordion pattern for sectioned recipes** (from `63-RESEARCH.md` Pattern 1):
```typescript
<Accordion type="multiple">
  {sections.map(section => {
    const bucket = progress.bySectionId.get(section.id) ?? { total: 0, completed: 0 };
    return (
      <AccordionItem key={section.id} value={String(section.id)}>
        <AccordionTrigger className="min-h-12">
          <span>{section.name}</span>
          <Badge variant="outline">{bucket.completed}/{bucket.total}</Badge>
        </AccordionTrigger>
        <AccordionContent>
          {sectionSteps.map(step => (
            <div key={step.order_index} className="min-h-12 flex items-center gap-2">
              <Checkbox
                checked={completedSet.has(step.order_index)}
                onCheckedChange={(checked) =>
                  toggleStep.mutate({ assignmentId: assignment.id, orderIndex: step.order_index, completed: !!checked })
                }
              />
              <span className={completedSet.has(step.order_index) ? "line-through text-muted-foreground" : ""}>
                {step.step_name}
              </span>
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  })}
</Accordion>
```

**Derived completedSet (no local state)** — derive from query data, not local state (anti-pattern from `63-RESEARCH.md`):
```typescript
const { data: stepProgressRows = [] } = useStepProgress(assignment.id);
const completedSet = useMemo(
  () => new Set(stepProgressRows.filter(p => p.completed === 1).map(p => p.order_index)),
  [stepProgressRows]
);
```

**Flat recipe fallback** (D-09 — no accordion, just checkbox list):
```typescript
// When sections.length === 0, render flat list:
<ul className="flex flex-col gap-2">
  {steps.map(step => (
    <li key={step.order_index} className="min-h-12 flex items-center gap-2">
      <Checkbox ... />
      <span ...>{step.step_name}</span>
    </li>
  ))}
</ul>
```

**SectionedTimeline groups steps by section_id** — copy this grouping pattern (`SectionedTimeline.tsx` lines 26-35):
```typescript
const stepsBySection = useMemo(() => {
  const map = new Map<number, RecipeStep[]>();
  for (const step of steps) {
    if (step.section_id === null) continue;
    const existing = map.get(step.section_id) ?? [];
    existing.push(step);
    map.set(step.section_id, existing);
  }
  return map;
}, [steps]);
```

**useToggleStepProgress signature** (`useRecipeAssignments.ts` lines 91-99):
```typescript
const toggleStep = useToggleStepProgress();
// mutate({ assignmentId: number, orderIndex: number, completed: boolean })
// onSuccess: invalidates STEP_PROGRESS_KEY(assignmentId)
```

---

### `src/features/units/AppliedRecipesTab.tsx` (tab panel component, CRUD)

**Analog:** `src/features/units/JournalTab.tsx` (tab panel receiving `unitId` prop, owns its own data hooks)

**Props interface pattern** (`JournalTab.tsx` lines 37-40):
```typescript
interface AppliedRecipesTabProps {
  unitId: number;
}
```

**Tab panel root structure** (`JournalTab.tsx` line 58 + `PlaybookTab.tsx` line 613):
```typescript
export function AppliedRecipesTab({ unitId }: AppliedRecipesTabProps) {
  const { data: assignments = [], isLoading } = useAssignmentsByUnit(unitId);
  // ...
  return (
    <div className="flex flex-col gap-4 p-4" aria-busy={isLoading}>
      {/* content */}
    </div>
  );
}
```

**Empty state pattern** — follow existing empty state pattern with CTA (from CONTEXT.md):
```typescript
if (assignments.length === 0 && !isLoading) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <ClipboardList className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">No recipes applied yet.</p>
      <Button size="sm" onClick={onApplyRecipe}>Apply Recipe</Button>
    </div>
  );
}
```

**Assignment card with progress** — shows recipe name + Progress bar + delete icon:
```typescript
{assignments.map(assignment => (
  <div key={assignment.id} className="flex flex-col gap-2 border rounded-md p-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{recipeName}</span>
      <Button variant="ghost" size="icon" onClick={() => handleDelete(assignment)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
    {/* Progress bar */}
    {/* AssignmentChecklist — gated: only mount when assignment.id is defined */}
    {assignment.id !== undefined && (
      <AssignmentChecklist assignment={assignment} recipeId={assignment.recipe_id} />
    )}
  </div>
))}
```

**Delete with toast** pattern (`JournalTab.tsx` — same delete+toast shape, adapted):
```typescript
const deleteAssignment = useDeleteAssignment();
function handleDelete(assignment: RecipeAssignment) {
  deleteAssignment.mutate(
    { id: assignment.id, unitId: assignment.unit_id, recipeId: assignment.recipe_id },
    {
      onSuccess: () => toast.success("Recipe removed."),
      onError: () => toast.error("Failed to remove recipe."),
    }
  );
}
```

**useDeleteAssignment full object requirement** (`useRecipeAssignments.ts` lines 76-88) — MUST pass all three fields:
```typescript
// CORRECT — all 3 fields required for cache invalidation
deleteAssignment.mutate({ id: assignment.id, unitId: assignment.unit_id, recipeId: assignment.recipe_id });
// WRONG — only passing id will skip cache invalidation
deleteAssignment.mutate({ id: assignment.id });
```

---

### `src/features/units/UnitDetailSheet.tsx` (modified — add 4th tab)

**Self-analog** — add to existing Tabs structure (`UnitDetailSheet.tsx` lines 102-107 and 232-244):

**TabsList addition** (after line 107):
```typescript
// Existing:
<TabsTrigger value="details">Details</TabsTrigger>
<TabsTrigger value="playbook">Playbook</TabsTrigger>
<TabsTrigger value="journal">Journal</TabsTrigger>
// Add:
<TabsTrigger value="recipes">Recipes</TabsTrigger>
```

**TabsContent addition** (after line 244):
```typescript
// Existing:
<TabsContent value="journal">
  <JournalTab unitId={unit.id} onPhotoClick={onPhotoClick} />
</TabsContent>
// Add:
<TabsContent value="recipes">
  <AppliedRecipesTab
    unitId={unit.id}
    onApplyRecipe={() => setApplyDialogOpen(true)}
  />
</TabsContent>
```

**Dialog state owned by sheet** (pattern from `PlaybookTab.tsx` lines 411-412, applied at UnitDetailSheet level):
```typescript
const [applyDialogOpen, setApplyDialogOpen] = useState(false);
// ApplyRecipeDialog rendered as SIBLING to SheetContent (NOT nested inside):
<ApplyRecipeDialog
  open={applyDialogOpen}
  unitId={unit.id}
  onClose={() => setApplyDialogOpen(false)}
/>
```

**Imports to add** (`UnitDetailSheet.tsx` existing import block, lines 1-28):
```typescript
import { AppliedRecipesTab } from "./AppliedRecipesTab";
import { ApplyRecipeDialog } from "@/features/recipes/ApplyRecipeDialog";
```

---

### `src/features/recipes/RecipeDetailSheet.tsx` (modified — add footer button)

**Self-analog** — add to existing SheetFooter (`RecipeDetailSheet.tsx` lines 324-343):

**Footer button addition** (before "Edit Recipe" button at line 340):
```typescript
// Existing footer:
<SheetFooter className="mt-6 gap-2 sm:gap-2">
  <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(recipe)}>
    Delete Recipe
  </Button>
  <Button variant="outline" onClick={handleDuplicate} disabled={duplicateRecipe.isPending}>
    <Copy className="mr-2 h-4 w-4" />
    Duplicate
  </Button>
  // ADD before Edit Recipe:
  <Button variant="outline" onClick={() => setApplyToUnitsOpen(true)}>
    Apply to Unit(s)
  </Button>
  <Button onClick={() => onEdit(recipe)}>Edit Recipe</Button>
</SheetFooter>
```

**Dialog state + sibling render** (same `PlaybookTab` pattern):
```typescript
const [applyToUnitsOpen, setApplyToUnitsOpen] = useState(false);
// Outside SheetContent, as sibling (see Pitfall 6 in RESEARCH.md):
<ApplyToUnitsDialog
  open={applyToUnitsOpen}
  recipe={recipe}
  onClose={() => setApplyToUnitsOpen(false)}
/>
```

**Imports to add** (`RecipeDetailSheet.tsx`):
```typescript
import { ApplyToUnitsDialog } from "./ApplyToUnitsDialog";
```

---

### `src/components/ui/accordion.tsx` (new shadcn wrapper)

**Analog:** `src/components/ui/collapsible.tsx` — same shadcn wrapper pattern (Radix primitive re-export with `data-slot`)

**Collapsible wrapper pattern** (`collapsible.tsx` lines 1-31):
```typescript
import { Collapsible as CollapsiblePrimitive } from "radix-ui"

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}
// etc.
```

**Installation command** — do NOT hand-write; install via the project's shadcn CLI:
```bash
npx shadcn add accordion
```
This scaffolds `src/components/ui/accordion.tsx` following the same `data-slot` pattern and project component.json config. The underlying `@radix-ui/react-accordion` is already in node_modules via `radix-ui@1.4.3`.

**Expected exports after install:**
```typescript
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
```

---

### `tests/applied-recipes/*.test.tsx` (4 test stubs)

**Analog:** `tests/painting/sectionedTimeline.test.tsx` + `tests/painting/recipeDetailSheet.test.tsx`

**File-level structure** (`sectionedTimeline.test.tsx` lines 1-30):
```typescript
/**
 * AR-XX — ComponentName tests.
 * Covers: [requirement IDs and behavior]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComponentName } from "@/features/.../ComponentName";
```

**Hook mocking pattern** (`recipeDetailSheet.test.tsx` lines 22-67):
```typescript
// All Tauri-dependent hooks MUST be mocked
vi.mock("@/hooks/useRecipeAssignments", () => ({
  useAssignmentsByUnit: () => ({ data: mockAssignments, isLoading: false }),
  useCreateAssignment: () => ({ mutate: mockCreateMutate, isPending: false }),
  useDeleteAssignment: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useStepProgress: () => ({ data: mockProgress }),
  useToggleStepProgress: () => ({ mutate: mockToggleMutate, isPending: false }),
  useBulkCreateAssignments: () => ({ mutate: mockBulkMutate, isPending: false }),
  useAssignmentsByRecipe: () => ({ data: mockRecipeAssignments }),
}));

vi.mock("@/hooks/useRecipes", () => ({
  useRecipes: () => ({ data: mockRecipes }),
}));

vi.mock("@/lib/computeAssignmentProgress", () => ({
  computeAssignmentProgress: vi.fn().mockReturnValue({
    total: 3, completed: 1, percentage: 33,
    bySectionId: new Map(),
  }),
}));
```

**Fixture factory pattern** (`sectionedTimeline.test.tsx` lines 39-57):
```typescript
function makeAssignment(over: Partial<RecipeAssignment> = {}): RecipeAssignment {
  return {
    id: 1,
    unit_id: 1,
    recipe_id: 1,
    created_at: "2026-01-01",
    ...over,
  };
}

function makeStepProgress(over: Partial<StepProgress> = {}): StepProgress {
  return {
    id: 1,
    assignment_id: 1,
    order_index: 0,
    completed: 0,
    completed_at: null,
    ...over,
  };
}
```

**Tauri mock block** (`recipeDetailSheet.test.tsx` lines 68-74, required for all component tests):
```typescript
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/mock/app/data"),
  join: vi.fn().mockImplementation((...parts: string[]) => parts.join("/")),
}));
vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn().mockImplementation((path: string) => `asset://${path}`),
}));
```

---

## Shared Patterns

### Toast Notifications
**Source:** all component files via `import { toast } from "sonner"`
**Apply to:** `ApplyRecipeDialog`, `ApplyToUnitsDialog`, `AppliedRecipesTab`
```typescript
toast.success("Recipe applied.");
toast.error("Failed to apply recipe. Please try again.");
```

### Dialog Open/Close
**Source:** `src/features/army-lists/UnitPickerDialog.tsx` line 70, `src/features/units/UnitDeleteDialog.tsx` line 109
**Apply to:** `ApplyRecipeDialog`, `ApplyToUnitsDialog`
```typescript
<Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
```

### Dialog-in-Sheet State Ownership
**Source:** `src/features/units/PlaybookTab.tsx` lines 411-412 (DatasheetPicker pattern)
**Apply to:** `UnitDetailSheet` (owns `applyDialogOpen`), `RecipeDetailSheet` (owns `applyToUnitsOpen`)
```typescript
// State owned by Sheet, not by the Dialog itself
const [pickerOpen, setPickerOpen] = useState(false);
// Dialog rendered OUTSIDE SheetContent as a sibling portal — not nested inside
```
**Critical:** The Dialog must be rendered as a sibling to `<Sheet>`, NOT inside `<SheetContent>`. Radix portals handle z-index independently, but nesting creates focus restoration issues on Dialog close.

### Section Label Class
**Source:** `src/features/units/PlaybookTab.tsx` line 88, `src/features/units/JournalTab.tsx` line 42
**Apply to:** `AppliedRecipesTab`, `AssignmentChecklist`
```typescript
const SECTION_LABEL_CLASS =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";
```

### Derived Map Pattern (useMemo)
**Source:** `src/features/recipes/RecipeDetailSheet.tsx` lines 75-79
**Apply to:** `ApplyRecipeDialog` (paintMap), `ApplyToUnitsDialog` (assignedUnitIds Set)
```typescript
const paintMap = useMemo(() => {
  const m = new Map<number, typeof paints[number]>();
  for (const p of paints) m.set(p.id, p);
  return m;
}, [paints]);
```

### Section Steps Grouping
**Source:** `src/features/recipes/SectionedTimeline.tsx` lines 26-35
**Apply to:** `AssignmentChecklist`
```typescript
const stepsBySection = useMemo(() => {
  const map = new Map<number, RecipeStep[]>();
  for (const step of steps) {
    if (step.section_id === null) continue;
    const existing = map.get(step.section_id) ?? [];
    existing.push(step);
    map.set(step.section_id, existing);
  }
  return map;
}, [steps]);
```

### SheetFooter Button Layout
**Source:** `src/features/recipes/RecipeDetailSheet.tsx` lines 324-343, `src/features/units/UnitDetailSheet.tsx` lines 247-258
**Apply to:** `RecipeDetailSheet` (modified)
```typescript
<SheetFooter className="mt-6 gap-2 sm:gap-2">
  <Button variant="ghost" className="text-destructive hover:text-destructive" ...>
  <Button variant="outline" ...>
  <Button ...>  {/* primary action last */}
</SheetFooter>
```

---

## No Analog Found

All files have close analogs in the codebase. The accordion wrapper has no direct analog but is installed via `npx shadcn add accordion` — pattern follows `collapsible.tsx`.

---

## Critical Pitfalls (from RESEARCH.md — apply during planning)

| Pitfall | Rule | Anti-pattern to avoid |
|---|---|---|
| P1 | Gate `AssignmentChecklist` behind `assignment.id !== undefined` | Mounting with undefined assignmentId causes perpetual loading |
| P2 | Always pass `{ id, unitId, recipeId }` to `useDeleteAssignment` | Passing only `{ id }` silently skips cache invalidation |
| P3 | Cross-reference `useAssignmentsByRecipe` Set to dim/disable already-assigned units | Missing dim causes confusing success toast when DB silently ignores duplicates |
| P4 | Call `usePaints()` in `ApplyRecipeDialog` to build paintMap | Empty map = missing availability badges in SectionedTimeline preview |
| P5 | Install `accordion.tsx` (Wave 0) before any other task | Build fails on `AccordionTrigger` import otherwise |
| P6 | Dialog state owned by Sheet; Dialog NOT nested inside SheetContent | Focus escapes on Dialog close if Dialog owns its own open/close that also closes Sheet |

---

## Metadata

**Analog search scope:** `src/features/`, `src/hooks/`, `src/lib/`, `src/types/`, `src/components/ui/`, `tests/`
**Files scanned:** 12 source files read directly
**Pattern extraction date:** 2026-05-13
