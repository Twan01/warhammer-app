# Phase 142: Technique Authoring & Library Browse — Pattern Map

**Mapped:** 2026-06-21
**Files analyzed:** 23 new/modified files
**Analogs found:** 23 / 23

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `src/features/techniques/techniqueSchema.ts` | config/schema | transform | `src/features/recipes/recipeSchema.ts` | exact |
| `src/features/techniques/techniqueSection.ts` | utility | transform | `src/features/recipes/recipeSection.ts` | exact |
| `src/features/techniques/TechniqueFormSheet.tsx` | component | request-response | `src/features/recipes/RecipeFormSheet.tsx` | exact |
| `src/features/techniques/TechniqueSlotRow.tsx` | component | request-response | `src/features/recipes/RecipeStepRow.tsx` | role-match |
| `src/features/techniques/TechniqueSectionList.tsx` | component | event-driven | `src/features/recipes/RecipeSectionList.tsx` | exact |
| `src/features/techniques/TechniqueSectionCard.tsx` | component | event-driven | `src/features/recipes/RecipeSectionCard.tsx` | exact |
| `src/features/techniques/TechniqueStepRow.tsx` | component | event-driven | `src/features/recipes/RecipeStepRow.tsx` | exact |
| `src/features/techniques/TechniqueStepList.tsx` | component | event-driven | `src/features/recipes/RecipeStepList.tsx` | exact |
| `src/features/techniques/TechniqueCard.tsx` | component | request-response | `src/features/recipes/RecipeCard.tsx` | exact |
| `src/features/techniques/TechniqueCardGrid.tsx` | component | CRUD | `src/features/recipes/RecipeCardGrid.tsx` | exact |
| `src/features/techniques/TechniqueDetailSheet.tsx` | component | request-response | `src/features/recipes/RecipeDetailSheet.tsx` | exact |
| `src/features/techniques/TechniqueDeleteDialog.tsx` | component | request-response | `src/features/recipes/RecipeDeleteDialog.tsx` | exact |
| `src/features/techniques/TechniqueLibraryTab.tsx` | component | CRUD | `src/features/recipes/RecipesPage.tsx` | role-match |
| `src/features/techniques/applyTechniqueFilters.ts` | utility | transform | `src/features/recipes/applyRecipeFilters.ts` | exact |
| `src/features/techniques/techniqueFilters.ts` | store | event-driven | (Zustand pattern from recipes) | role-match |
| `src/db/queries/techniques.ts` | service | CRUD | `src/db/queries/recipes.ts` | exact |
| `src/db/queries/techniqueSections.ts` | service | CRUD | `src/db/queries/recipeSections.ts` | exact |
| `src/db/queries/techniqueColourSlots.ts` | service | CRUD | `src/db/queries/recipeSections.ts` | role-match |
| `src/lib/techniqueDiff.ts` | utility | transform | `src/lib/recipeDiff.ts` | exact |
| `src/hooks/useTechniques.ts` | hook | CRUD | `src/hooks/useRecipes.ts` | exact |
| `src/hooks/useTechniqueSections.ts` | hook | CRUD | `src/hooks/useRecipeSections.ts` | exact |
| `src/hooks/useTechniqueColourSlots.ts` | hook | CRUD | `src/hooks/useRecipeSections.ts` | role-match |
| `src/features/recipes/RecipesPage.tsx` | component (modify) | CRUD | self | n/a |
| `tests/techniques/TechniqueCard.test.tsx` | test | n/a | `tests/painting/recipeDetailSheet.test.ts` | role-match |
| `tests/techniques/TechniqueDetailSheet.test.tsx` | test | n/a | `tests/painting/recipeDetailSheet.test.ts` | exact |
| `tests/techniques/TechniqueDeleteDialog.test.tsx` | test | n/a | `tests/painting/recipeDetailSheet.test.ts` | role-match |
| `tests/techniques/TechniqueLibraryTab.test.tsx` | test | n/a | `tests/painting/recipeDetailSheet.test.ts` | role-match |
| `tests/data-layer/technique-save.test.ts` | test | n/a | `tests/data-layer/recipe-persistence.test.ts` | exact |

---

## Pattern Assignments

---

### `src/features/techniques/techniqueSchema.ts` (config/schema, transform)

**Analog:** `src/features/recipes/recipeSchema.ts`

**Imports pattern** (lines 1–29 of analog):
```typescript
import { z } from "zod";

// Re-use these directly from recipeSchema — do NOT duplicate the arrays
export const RECIPE_EFFECTS = [ ... ] as const;   // already has OSL, NMM, etc.
export const RECIPE_DIFFICULTIES = [ ... ] as const;
export const PAINTING_PHASES = [ ... ] as const;
```

**Core schema pattern** (lines 31–61 of analog):
```typescript
// src/features/recipes/recipeSchema.ts lines 31-61
export const recipeSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  style: z.string().nullable(),
  effect: z.string().nullable(),
  difficulty: z.string().nullable(),
  estimated_minutes: z.number().int().min(1).nullable(),
  result_photo_path: z.string().nullable(),
});
export type RecipeFormValues = z.infer<typeof recipeSchema>;
```

**New file adaptation:** Import `RECIPE_EFFECTS` and `RECIPE_DIFFICULTIES` from `recipeSchema.ts` (re-export them for local convenience). `techniqueSchema` replaces `faction_id`, `unit_id`, `area`, `surface`, `style`, `tutorial_link` with `description` (max 500). Slot validation (name non-empty, max 80) and step validation are done via toast in `saveTechniqueGraph`, not in Zod — consistent with recipe pattern.

**Draft types to add** (mirrors `src/types/recipe.ts` lines 41–73):
```typescript
// Add to techniqueSchema.ts (or src/types/technique.ts)
export interface DraftTechniqueSlot {
  localId: string;       // UUID — React key + DnD id + slotIdMap key
  dbId: number | null;   // null until persisted
  name: string;
  role_hint: string | null;
  order_index: number;   // derived from array index at save time
}

export interface DraftTechniqueStep {
  localId: string;
  dbId: number | null;
  step_name: string;
  colour_slot_id: string | null;  // references DraftTechniqueSlot.localId in form state
  notes: string | null;
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
  // NO step_photo_path — not in migration 051
  // NO alt_paint_id — not in migration 051
}

export interface DraftTechniqueSection {
  localId: string;
  dbId: number | null;
  name: string;
  surface: string | null;
  optional: number;   // 0 = required, 1 = skippable
  notes: string | null;
  // NO section_type / technique / execution_mode / applies_to — not on technique_sections
  steps: DraftTechniqueStep[];
}
```

---

### `src/features/techniques/techniqueSection.ts` (utility, transform)

**Analog:** `src/features/recipes/recipeSection.ts`

**Core pattern** (lines 1–90 of analog):
```typescript
// src/features/recipes/recipeSection.ts lines 21-90
export function makeDraftSection(name = "Steps"): DraftSection {
  return {
    localId: crypto.randomUUID(),
    dbId: null,
    name,
    surface: null,
    optional: 0,
    notes: null,
    // ...recipe-specific fields
    steps: [],
  };
}

export function buildDraftSections(
  sections: RecipeSection[],
  steps: RecipeStep[],
): DraftSection[] {
  return sections.map((s) => {
    const sectionSteps = steps
      .filter((st) => st.section_id === s.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((st): DraftStep => ({
        localId: crypto.randomUUID(),
        dbId: st.id,
        step_name: st.step_name,
        // ...
      }));
    return { localId: crypto.randomUUID(), dbId: s.id, ...s, steps: sectionSteps };
  });
}
```

**New file adaptation:** `makeDraftTechniqueSection` omits `section_type / technique / execution_mode / applies_to`; `buildDraftTechniqueSections` maps `colour_slot_id` from the DB integer to a form-state `localId` via a `slotDbIdToLocalId` map (built from the loaded `DraftTechniqueSlot[]` list before calling this function).

---

### `src/features/techniques/TechniqueFormSheet.tsx` (component, request-response)

**Analog:** `src/features/recipes/RecipeFormSheet.tsx`

**Imports pattern** (lines 1–63 of analog):
```typescript
// src/features/recipes/RecipeFormSheet.tsx lines 1-63
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

**Form init pattern** (lines 122–165 of analog):
```typescript
// src/features/recipes/RecipeFormSheet.tsx lines 122-165
export function RecipeFormSheet({ open, recipe, onClose }: RecipeFormSheetProps) {
  const isEdit = recipe !== null;
  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: buildDefaults(recipe),
  });
  const [sections, setSections] = useState<DraftSection[]>([makeDraftSection("Steps")]);

  const totalMinutes = useMemo(
    () => sections.flatMap((s) => s.steps).reduce((acc, s) => acc + (s.time_estimate_minutes ?? 0), 0),
    [sections],
  );

  // Re-initialize when recipe prop changes
  useEffect(() => {
    form.reset(buildDefaults(recipe));
    if (recipe && existingSectionsLen > 0) {
      setSections(buildDraftSections(existingSections, existingSteps));
    } else if (!recipe) {
      setSections([makeDraftSection("Steps")]);
    }
  }, [recipe?.id, existingSectionsLen, existingStepsLen]);
```

**Sheet JSX pattern** (analog: `sm:max-w-xl` for form Sheet):
```typescript
// src/features/recipes/RecipeFormSheet.tsx (SheetContent pattern)
<SheetContent className="overflow-y-auto sm:max-w-xl">
  <SheetHeader>
    <SheetTitle>{isEdit ? "Edit Recipe" : "New Recipe"}</SheetTitle>
    <SheetDescription>...</SheetDescription>
  </SheetHeader>
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
      {/* FormField blocks */}
      <SheetFooter className="mt-6 gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {isEdit ? "Save Technique" : "Add Technique"}
        </Button>
      </SheetFooter>
    </form>
  </Form>
</SheetContent>
```

**New file additions vs recipe analog:**
- Add `const [slots, setSlots] = useState<DraftTechniqueSlot[]>([])` alongside `sections`.
- Load `existingSlots` from `useTechniqueColourSlots(technique?.id)` — same `enabled` pattern as `useRecipeSections`.
- Add Colour Slots section in the form JSX (between metadata fields and section list): `DndContext` + `SortableContext` over `TechniqueSlotRow[]` + "Add Slot" button.
- `onSlotRemove` handler: iterate all sections → steps and null out `colour_slot_id` for any step referencing the removed slot's `localId`.
- Pass `slots` down to `TechniqueSectionList` → `TechniqueSectionCard` → `TechniqueStepList` → `TechniqueStepRow`.
- Remove recipe-specific concerns: `faction_id`, `unit_id`, `area`, `tutorial_link`, `surface`, `style` fields; remove `PaintSheet` integration.
- `key={technique?.id ?? "new"}` on the `SheetContent` (forces re-mount — same pattern).

---

### `src/features/techniques/TechniqueSlotRow.tsx` (component, event-driven)

**Analog:** `src/features/recipes/RecipeStepRow.tsx` (structure pattern), adapted as a slot editor

**dnd-kit sortable pattern** (lines 33–40 of analog):
```typescript
// src/features/recipes/RecipeStepRow.tsx lines 33-40
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
  id: step.localId,
});
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.4 : 1,
};
```

**Row JSX pattern** (lines 64–183 of analog, simplified for slot):
```typescript
// src/features/recipes/RecipeStepRow.tsx lines 64-68 (row container)
<div ref={setNodeRef} style={style} className="flex gap-2 rounded-md border p-2">
  <button type="button" {...attributes} {...listeners}
    className="mt-1 cursor-grab self-start text-muted-foreground" aria-label="Drag to reorder slot">
    <GripVertical className="h-4 w-4" />
  </button>
  {/* Slot fields: two Inputs (name + role_hint) in a flex row */}
  <div className="flex flex-1 flex-col gap-1.5">
    <div className="flex items-center gap-2">
      <Input className="flex-1" placeholder="Slot name, e.g. Base Coat" ... />
      <Input className="flex-1 text-xs" placeholder="Role hint, e.g. brightest core" ... />
    </div>
  </div>
  {/* Remove button */}
  <Button type="button" variant="ghost" size="icon" className="self-start" aria-label="Remove slot">
    <Trash2 className="h-4 w-4 text-destructive" />
  </Button>
</div>
```

Note: `gap-1.5` is a declared spacing exception (matches `RecipeStepRow` exactly per UI-SPEC).

---

### `src/features/techniques/TechniqueSectionList.tsx` (component, event-driven)

**Analog:** `src/features/recipes/RecipeSectionList.tsx`

**Full file pattern** (lines 1–66 of analog — exact copy with type substitution):
```typescript
// src/features/recipes/RecipeSectionList.tsx lines 1-66
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates,
  verticalListSortingStrategy } from "@dnd-kit/sortable";

export function RecipeSectionList({ sections, onChange, onCreateNewPaint }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.localId === active.id);
    const newIndex = sections.findIndex((s) => s.localId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(sections, oldIndex, newIndex));
  }
  // updateSection, removeSection helpers identical
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.localId)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {sections.map((section) => (
            <RecipeSectionCard key={section.localId} section={section} ... />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

**Adaptation:** Replace `DraftSection[]` with `DraftTechniqueSection[]`; replace `RecipeSectionCard` with `TechniqueSectionCard`; add `slots: DraftTechniqueSlot[]` prop and pass it down. Remove `onCreateNewPaint` prop (no paint creation in technique form).

---

### `src/features/techniques/TechniqueSectionCard.tsx` (component, event-driven)

**Analog:** `src/features/recipes/RecipeSectionCard.tsx`

**dnd-kit sortable + Collapsible pattern** (lines 52–80 of analog):
```typescript
// src/features/recipes/RecipeSectionCard.tsx lines 52-80
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
  id: section.localId,
});
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
};

return (
  <div ref={setNodeRef} style={style} className="rounded-lg border bg-card">
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2 p-3">
        {/* GripVertical drag handle, collapse chevron, name Input, delete Button */}
      </div>
      <CollapsibleContent>
        {/* surface Select + optional checkbox + notes Input + RecipeStepList */}
      </CollapsibleContent>
    </Collapsible>
  </div>
);
```

**Adaptation:** Remove `section_type`, `technique`, `execution_mode`, `applies_to` fields (not on `technique_sections`). Remove the `showWorkflowCollapsible` / `workflowOpen` state and workflow metadata block. Pass `slots: DraftTechniqueSlot[]` down to `TechniqueStepList`. Keep `surface`, `optional`, `notes` fields.

---

### `src/features/techniques/TechniqueStepRow.tsx` (component, event-driven)

**Analog:** `src/features/recipes/RecipeStepRow.tsx`

**Full dnd-kit + step row pattern** (lines 1–185 of analog):

Imports to copy verbatim (lines 1–18 of analog):
```typescript
// src/features/recipes/RecipeStepRow.tsx lines 1-18
import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Remove: ImageIcon, openDialog, readFile, writeFile, BaseDirectory, PaintCombobox
```

Line 1 layout adaptation (replace `PaintCombobox` w-40 + photo button):
```typescript
// src/features/recipes/RecipeStepRow.tsx lines 80-119 — REPLACE paint section with:
<div className="w-40">
  <Select
    value={step.colour_slot_id ?? "__none__"}
    onValueChange={(v) => onChange({ ...step, colour_slot_id: v === "__none__" ? null : v })}
  >
    <SelectTrigger className="w-40">
      <SelectValue placeholder="Colour slot" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="__none__">-- no slot --</SelectItem>
      {slots.map((s) => (
        <SelectItem key={s.localId} value={s.localId}>
          {s.name || <span className="text-muted-foreground italic">Unnamed slot</span>}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
// OMIT the photo Button entirely
```

Line 2 grid (lines 121–163 of analog): copy `grid-cols-5 gap-1.5` with tool / technique / dilution / time. Replace the 5th cell (alt paint combobox) with an empty `<div />` or omit entirely (per UI-SPEC: "alt removed, replaced with empty cell or omitted").

Line 3 notes Input (lines 165–172 of analog): copy verbatim.

---

### `src/features/techniques/TechniqueCard.tsx` (component, request-response)

**Analog:** `src/features/recipes/RecipeCard.tsx`

**difficultyColors map** (lines 10–15 of analog):
```typescript
// src/features/recipes/RecipeCard.tsx lines 10-15 — copy verbatim
const difficultyColors: Record<string, string> = {
  Beginner: "text-green-500",
  Intermediate: "text-yellow-500",
  Advanced: "text-orange-500",
  Expert: "text-red-500",
};
```

**Card container + header** (lines 104–123 of analog):
```typescript
// src/features/recipes/RecipeCard.tsx lines 104-123
<Card
  className="cursor-pointer hover:shadow-md transition-shadow gap-3"
  onClick={() => onClick(technique)}
  aria-label={`View ${technique.name}`}
>
  <CardHeader className="pb-0">
    <span className="text-sm font-semibold leading-tight">{technique.name}</span>
  </CardHeader>
  <CardContent className="flex flex-col gap-2 pt-0">
    ...
  </CardContent>
</Card>
```

**Stats row pattern** (lines 168–185 of analog):
```typescript
// src/features/recipes/RecipeCard.tsx lines 168-185
<div className="flex items-center gap-3 text-xs text-muted-foreground">
  <span className="flex items-center gap-1">
    <Layers className="h-3 w-3" />
    {slotCount} {slotCount === 1 ? "slot" : "slots"}
  </span>
  <span className="flex items-center gap-1">
    <Layers className="h-3 w-3" />
    {stepCount} {stepCount === 1 ? "step" : "steps"}
  </span>
</div>
```

**Action row pattern** (lines 191–213 of analog):
```typescript
// src/features/recipes/RecipeCard.tsx lines 191-213
<div
  className="flex items-center gap-1 pt-1 border-t border-border/50"
  onClick={(e) => e.stopPropagation()}
>
  <Button variant="ghost" size="icon" className="h-7 w-7"
    onClick={() => onEdit(technique)} aria-label="Edit technique">
    <Pencil className="h-3.5 w-3.5" />
  </Button>
  <Button variant="ghost" size="icon" className="h-7 w-7"
    onClick={() => onDuplicate(technique)} aria-label="Duplicate technique">
    <Copy className="h-3.5 w-3.5" />
  </Button>
  <Button variant="ghost" size="icon" className="h-7 w-7"
    onClick={() => onDelete(technique)} aria-label="Delete technique">
    <Trash2 className="h-3.5 w-3.5 text-destructive" />
  </Button>
</div>
```

**Omit vs recipe analog:** No swatch strip; no `AvailabilityBadge`; no faction badge. Add usage count line: `{usageCount === 0 ? "Not used yet" : \`Used by ${usageCount} recipe${usageCount === 1 ? '' : 's'}\`}` (text-xs text-muted-foreground).

---

### `src/features/techniques/TechniqueCardGrid.tsx` (component, CRUD)

**Analog:** `src/features/recipes/RecipeCardGrid.tsx`

**Skeleton loading pattern** (lines 47–67 of analog):
```typescript
// src/features/recipes/RecipeCardGrid.tsx lines 47-67
if (isLoading) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={`skeleton-card-${i}`} className="rounded-xl border bg-card p-6 flex flex-col gap-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
```

**Grid pattern** (lines 73–94 of analog):
```typescript
// src/features/recipes/RecipeCardGrid.tsx lines 73-94
<div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
  {data.map((technique) => (
    <TechniqueCard
      key={technique.id}
      technique={technique}
      onClick={onCardClick}
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    />
  ))}
</div>
```

**Adaptation:** Props are simpler — no `factions`, `stepCountByRecipe`, `sectionCountByRecipe`, `swatchColorsByRecipe`, `availabilityByRecipe` since `getTechniquesWithCounts()` returns all counts inline. Empty state: `TechniqueEmptyState` (when no filter active) or inline `<p className="text-sm text-muted-foreground col-span-full">No techniques match your filters.</p>` (when filter active).

---

### `src/features/techniques/TechniqueDetailSheet.tsx` (component, request-response)

**Analog:** `src/features/recipes/RecipeDetailSheet.tsx`

**Sheet + header pattern** (lines 188–236 of analog):
```typescript
// src/features/recipes/RecipeDetailSheet.tsx lines 188-236
<Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
  <SheetContent side="right" key={recipe?.id ?? "none"} className="overflow-y-auto sm:max-w-md">
    {recipe && (
      <>
        <SheetHeader>
          <SheetTitle>{recipe.name}</SheetTitle>
          <SheetDescription>...</SheetDescription>
          <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2">
            {recipe.effect && <Badge variant="outline" className="text-xs">{recipe.effect}</Badge>}
            {recipe.difficulty && (
              <Badge variant="secondary" className={`text-xs ${difficultyColors[recipe.difficulty] ?? ""}`}>
                {recipe.difficulty}
              </Badge>
            )}
          </div>
        </SheetHeader>
        <div className="flex flex-col gap-4 p-4">
          <Field label="...">...</Field>
          <Separator />
        </div>
      </>
    )}
  </SheetContent>
</Sheet>
```

**Field helper** (lines 387–396 of analog — copy verbatim):
```typescript
// src/features/recipes/RecipeDetailSheet.tsx lines 387-396
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}
```

**Footer pattern** (lines 351–371 of analog):
```typescript
// src/features/recipes/RecipeDetailSheet.tsx lines 351-371
<SheetFooter className="mt-6 gap-2 sm:gap-2">
  <Button variant="ghost" className="text-destructive hover:text-destructive"
    onClick={() => onDelete(technique)}>
    Delete Technique
  </Button>
  <Button variant="outline" onClick={handleDuplicate} disabled={duplicateTechnique.isPending}>
    <Copy className="mr-2 h-4 w-4" />
    Duplicate Technique
  </Button>
  <Button onClick={() => onEdit(technique)}>Edit Technique</Button>
</SheetFooter>
```

**New sections to add (not in recipe analog):**
- `<Field label="Colour Slots">` — slot list with placeholder swatch circle + name + role_hint italic.
- `<Field label="Used by">` — `useTechniqueUsedByRecipes(technique?.id)` results; when 0: `<p className="text-sm text-muted-foreground">Not used by any recipes yet.</p>`.
- Step tree: use `SectionedTimeline` / flat timeline same logic as RecipeDetailSheet lines 280–290.

**Omit vs recipe analog:** No faction badge, no unit link, no sessions, no assignments, no wishlist, no `ApplyToUnitsDialog`, no "Apply to Unit(s)" button, no "Start Painting" navigation.

---

### `src/features/techniques/TechniqueDeleteDialog.tsx` (component, request-response)

**Analog:** `src/features/recipes/RecipeDeleteDialog.tsx`

**Full pattern** (lines 1–61 of analog — almost verbatim):
```typescript
// src/features/recipes/RecipeDeleteDialog.tsx lines 1-61
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function TechniqueDeleteDialog({ open, technique, usageCount, onClose }) {
  const deleteTechnique = useDeleteTechnique();

  async function handleConfirm() {
    if (!technique) return;
    try {
      await deleteTechnique.mutateAsync(technique.id);
      toast.success("Technique deleted.");
      onClose();
    } catch {
      toast.error("Failed to delete technique. Please try again.");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete technique?</DialogTitle>
          <DialogDescription>
            {technique && usageCount > 0
              ? `"${technique.name}" is used by ${usageCount} recipe${usageCount === 1 ? '' : 's'}. Deleting it will remove all applied instances. This cannot be undone.`
              : technique
              ? `This will permanently remove "${technique.name}" and all its steps. This cannot be undone.`
              : "This will permanently remove the selected technique."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Keep Technique</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleteTechnique.isPending}>
            {deleteTechnique.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Adaptation vs analog:** Add `usageCount: number` prop (pre-fetched with card data from `getTechniquesWithCounts`); use it in `DialogDescription`; change cancel button copy from "Cancel" to "Keep Technique".

---

### `src/features/techniques/TechniqueLibraryTab.tsx` (component, CRUD)

**Analog:** `src/features/recipes/RecipesPage.tsx` (the filter bar + grid portion)

**Filter state pattern** (lines 44–76 of analog):
```typescript
// src/features/recipes/RecipesPage.tsx lines 44-76
const [areaFilter, setAreaFilter] = useState("");
const [surfaceFilter, setSurfaceFilter] = useState<string | null>(null);

// Sheet/dialog state
const [selectedRecipe, setSelectedRecipe] = useState<PaintingRecipe | null>(null);
const [detailOpen, setDetailOpen] = useState(false);
const [deleting, setDeleting] = useState<PaintingRecipe | null>(null);
const [deleteOpen, setDeleteOpen] = useState(false);
const [formOpen, setFormOpen] = useState(false);
const [editing, setEditing] = useState<PaintingRecipe | null>(null);

const filtered = useMemo(() => applyRecipeFilters(recipes, { ... }), [recipes, filters]);
```

**Toolbar pattern** (analog RecipesPage filter bar):
```typescript
// Mirror the toolbar pattern (Input + effect Select + "Add Technique" Button + "Clear" Button)
<div className="flex flex-wrap items-center gap-2">
  <Input
    placeholder="Search techniques…"
    className="w-48"
    value={nameFilter}
    onChange={(e) => setNameFilter(e.target.value)}
  />
  <Select value={effectFilter ?? "__all__"} onValueChange={...}>
    <SelectTrigger className="w-40">
      <SelectValue placeholder="Effect" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="__all__">All effects</SelectItem>
      {RECIPE_EFFECTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
    </SelectContent>
  </Select>
  <Button onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Technique</Button>
  {(nameFilter || effectFilter) && (
    <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
  )}
</div>
```

**Adaptation:** This is a self-contained tab component (not a page). It receives no props — all state is local. It renders `TechniqueCardGrid`, `TechniqueDetailSheet`, `TechniqueFormSheet`, `TechniqueDeleteDialog`.

---

### `src/features/techniques/applyTechniqueFilters.ts` (utility, transform)

**Analog:** `src/features/recipes/applyRecipeFilters.ts`

**Full pattern** (lines 1–52 of analog):
```typescript
// src/features/recipes/applyRecipeFilters.ts lines 17-52
export function applyRecipeFilters(recipes, filters): PaintingRecipe[] {
  return recipes.filter((r) => {
    const area = filters.areaFilter.trim().toLowerCase();
    if (area.length > 0) {
      if (!r.area || !r.area.toLowerCase().includes(area)) return false;
    }
    if (filters.surfaceFilter !== null) {
      if (r.surface !== filters.surfaceFilter) return false;
    }
    return true;
  });
}
```

**Adaptation:** Replace `RecipeFilterState` with `TechniqueFilterState { nameFilter: string; effectFilter: string | null }`. Filter on `technique.name` (case-insensitive contains) and `technique.effect` (exact match). Omit faction/unit/paint/availability filters.

---

### `src/lib/techniqueDiff.ts` (utility, transform)

**Analog:** `src/lib/recipeDiff.ts`

**`computeSectionDiff` pattern** (lines 35–58 of analog — import directly, do not re-implement):
```typescript
// src/lib/recipeDiff.ts lines 35-58
export function computeSectionDiff(draftSections, existingSections): SectionDiff {
  const survivingDbIds = new Set(
    draftSections.map((s) => s.dbId).filter((id): id is number => id !== null),
  );
  const toDelete = existingSections.filter((s) => !survivingDbIds.has(s.id)).map((s) => s.id);
  const toUpdate = draftSections.filter((s) => s.dbId !== null);
  const toInsert = draftSections.filter((s) => s.dbId === null);
  return { toDelete, toUpdate, toInsert };
}
```

**`buildSectionIdMap` pattern** (lines 72–80 of analog — import directly):
```typescript
// src/lib/recipeDiff.ts lines 72-80
export function buildSectionIdMap(sections: DraftSection[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const sec of sections) {
    if (sec.dbId !== null) map.set(sec.localId, sec.dbId);
  }
  return map;
}
```

**`computeStepDiff` pattern** (lines 122–162 of analog — import directly):

The step diff shape is compatible with `DraftTechniqueSection[]` via structural typing: the fields `localId`, `dbId`, `steps[].localId`, `steps[].dbId` are present on both `DraftSection` and `DraftTechniqueSection`. Import these three functions directly from `recipeDiff.ts`.

**New function to add — `computeSlotDiff`** (new, no analog):
```typescript
// src/lib/techniqueDiff.ts — NEW function
export interface SlotDiff {
  toDelete: number[];
  toUpdate: DraftTechniqueSlot[];
  toInsert: DraftTechniqueSlot[];
}

export function computeSlotDiff(
  draftSlots: DraftTechniqueSlot[],
  existingSlots: TechniqueColourSlot[],
): SlotDiff {
  const survivingDbIds = new Set(
    draftSlots.map(s => s.dbId).filter((id): id is number => id !== null)
  );
  return {
    toDelete: existingSlots.filter(s => !survivingDbIds.has(s.id)).map(s => s.id),
    toUpdate: draftSlots.filter(s => s.dbId !== null),
    toInsert: draftSlots.filter(s => s.dbId === null),
  };
}

// Also export buildSlotIdMap (parallel to buildSectionIdMap):
export function buildSlotIdMap(slots: DraftTechniqueSlot[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const slot of slots) {
    if (slot.dbId !== null) map.set(slot.localId, slot.dbId);
  }
  return map;
}
```

---

### `src/db/queries/techniques.ts` (service, CRUD)

**Analog:** `src/db/queries/recipes.ts`

**DB import pattern** (line 1 of analog):
```typescript
// src/db/queries/recipes.ts line 1
import { getDb } from "@/db/client";
```

**Diff import pattern** (lines 6–7 of analog):
```typescript
// src/db/queries/recipes.ts lines 6-7
import { computeSectionDiff, computeStepDiff, buildSectionIdMap } from "@/lib/recipeDiff";
// Technique version adds:
import { computeSlotDiff, buildSlotIdMap } from "@/lib/techniqueDiff";
```

**WAL auto-commit docblock** (lines 111–128 of analog — copy verbatim, adapt entity names):
```typescript
// src/db/queries/recipes.ts lines 111-128
/**
 * NOTE: tauri-plugin-sql uses sqlx::Pool<Sqlite> (connection pool). Each
 * db.execute() may run on a DIFFERENT connection, so explicit BEGIN/COMMIT
 * is broken — the transaction boundary is not shared across calls. We use
 * auto-commit mode instead: in WAL mode each committed write is immediately
 * visible to all connections, so FK constraints on subsequent operations
 * see newly inserted rows.
 */
```

**`duplicateRecipe` pattern** (lines 129–208 of analog):
```typescript
// src/db/queries/recipes.ts lines 129-208
// duplicateTechnique mirrors this exactly, adding a slot copy pass (step 2b):
// 1. Read + INSERT technique (metadata copy with "Copy of {name}")
// 2a. Read + INSERT colour slots → build Map<oldSlotId, newSlotId>
// 2b. (new step vs recipe) — slot copy pass
// 3. Read + INSERT sections → build Map<oldSectionId, newSectionId>
// 4. Read + INSERT steps → remap colour_slot_id via slotIdMap, section_id via sectionIdMap
```

**`saveRecipeGraph` CREATE PATH** (lines 246–331 of analog):
```typescript
// src/db/queries/recipes.ts lines 246-331 — saveTechniqueGraph CREATE PATH
// INSERT techniques row (name, effect, difficulty, notes) →
// INSERT slots: build slotIdMap (localId → dbId) →
// INSERT sections: build sectionIdMap (localId → dbId) →
// INSERT steps: resolve colour_slot_id via slotIdMap.get(step.colour_slot_id) ?? null
//                resolve section_id via sectionIdMap.get(sec.localId) ?? null
```

**`saveRecipeGraph` EDIT PATH** (lines 332–end of analog):
```typescript
// src/db/queries/recipes.ts lines 332-450 — saveTechniqueGraph EDIT PATH
// UPDATE techniques row (name, effect, difficulty, notes, updated_at = datetime('now')) →
// SLOT PHASE (new): computeSlotDiff → DELETE removed slots → UPDATE existing slots →
//   INSERT new slots extending slotIdMap →
// Phase 1: computeSectionDiff →
// Phase 2: DELETE removed sections (CASCADE removes their steps) →
// Phase 3: UPDATE existing sections (updated_at = datetime('now') on technique_sections only) →
// Phase 4: buildSectionIdMap; INSERT new sections extending sectionIdMap →
// Phase 5: computeStepDiff →
//   DELETE removed steps →
//   UPDATE/INSERT remaining steps (no updated_at on technique_steps — pitfall 3)
```

**CRITICAL column exclusions** (from migration 051 verified):
- `technique_steps` has NO `updated_at` — do NOT include in UPDATE SQL.
- `technique_colour_slots` has NO `updated_at` — do NOT include in UPDATE SQL.
- `technique_steps` has NO `step_photo_path`, NO `alt_paint_id`.
- `colour_slot_id` in UPDATE/INSERT steps must be resolved through `slotIdMap.get(step.colour_slot_id) ?? null`.

**`deleteRecipe` pattern** (lines 87–91 of analog):
```typescript
// src/db/queries/recipes.ts lines 87-91
export async function deleteRecipe(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM painting_recipes WHERE id = $1", [id]);
}
// technique_sections + technique_steps + technique_colour_slots cascade automatically
```

**Usage count queries** (no analog — new):
```typescript
export async function getTechniqueUsageCounts(): Promise<{ technique_id: number; usage_count: number }[]> {
  const db = await getDb();
  return db.select(
    "SELECT technique_id, COUNT(*) AS usage_count FROM recipe_technique_instances GROUP BY technique_id", []
  );
}

export async function getTechniqueUsageCount(id: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    "SELECT COUNT(*) AS n FROM recipe_technique_instances WHERE technique_id = $1", [id]
  );
  return rows[0]?.n ?? 0;
}

export async function getTechniqueUsedByRecipes(id: number): Promise<{ recipe_id: number; name: string }[]> {
  const db = await getDb();
  return db.select(
    `SELECT rti.recipe_id, pr.name FROM recipe_technique_instances rti
     JOIN painting_recipes pr ON pr.id = rti.recipe_id
     WHERE rti.technique_id = $1 ORDER BY pr.name ASC`, [id]
  );
}
```

---

### `src/db/queries/techniqueSections.ts` (service, CRUD)

**Analog:** `src/db/queries/recipeSections.ts`

Pattern: simple `getDb()` + `db.select()` returning sections ordered by `order_index`. The detail Sheet and form both query sections by `technique_id`.

---

### `src/db/queries/techniqueColourSlots.ts` (service, CRUD)

**Analog:** `src/db/queries/recipeSections.ts` (same select-by-parent-id pattern)

```typescript
// Pattern: same as recipeSections.ts getRecipeSections
export async function getTechniqueColourSlots(techniqueId: number): Promise<TechniqueColourSlot[]> {
  const db = await getDb();
  return db.select<TechniqueColourSlot[]>(
    "SELECT * FROM technique_colour_slots WHERE technique_id = $1 ORDER BY order_index ASC",
    [techniqueId]
  );
}
```

---

### `src/hooks/useTechniques.ts` (hook, CRUD)

**Analog:** `src/hooks/useRecipes.ts`

**Key factory pattern** (lines 19–21 of analog):
```typescript
// src/hooks/useRecipes.ts lines 19-21
export const RECIPES_KEY = ["recipes"] as const;
export const RECIPE_KEY = (id: number) => ["recipes", id] as const;
// Technique version:
export const TECHNIQUES_KEY = ["techniques"] as const;
export const TECHNIQUE_KEY = (id: number) => ["techniques", id] as const;
export const TECHNIQUE_USAGE_COUNTS_KEY = ["technique-usage-counts"] as const;
```

**`useDuplicateRecipe` pattern** (lines 92–108 of analog):
```typescript
// src/hooks/useRecipes.ts lines 92-108
export function useDuplicateRecipe() {
  const qc = useQueryClient();
  return useMutation<number, Error, { originalId: number; newName: string }>({
    mutationFn: ({ originalId, newName }) => duplicateRecipe(originalId, newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
      qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
      qc.invalidateQueries({ queryKey: ["recipe-sections"] });
    },
  });
}
```

**Adaptation:** Invalidation symmetry on delete and duplicate must include:
- `TECHNIQUES_KEY`
- `TECHNIQUE_USAGE_COUNTS_KEY`
- `["technique-sections"]` prefix (all per-technique section queries)
- `["technique-colour-slots"]` prefix (all per-technique slot queries)

---

### `src/hooks/useTechniqueSections.ts` (hook, CRUD)

**Analog:** `src/hooks/useRecipeSections.ts`

**Key + query pattern** (lines 19–29 of analog):
```typescript
// src/hooks/useRecipeSections.ts lines 19-29
export const RECIPE_SECTIONS_KEY = (recipeId: number) => ["recipe-sections", recipeId] as const;

export function useRecipeSections(recipeId: number | undefined) {
  return useQuery({
    queryKey: recipeId !== undefined ? RECIPE_SECTIONS_KEY(recipeId) : ["recipe-sections"],
    queryFn: () => (recipeId !== undefined ? getRecipeSections(recipeId) : Promise.resolve([])),
    enabled: recipeId !== undefined,
  });
}
```

---

### `src/hooks/useTechniqueColourSlots.ts` (hook, CRUD)

**Analog:** `src/hooks/useRecipeSections.ts` (same select-by-parent-id enabled pattern)

Same `useQuery` with `enabled: techniqueId !== undefined`, `queryKey: ["technique-colour-slots", techniqueId]`.

---

### `src/features/recipes/RecipesPage.tsx` (modify existing)

**Modification target:** Add `Tabs` control below `PageHeader`.

**Tab integration pattern** (from RESEARCH.md Pattern 6):
```typescript
// ADD imports:
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TechniqueLibraryTab } from "@/features/techniques/TechniqueLibraryTab";

// ADD state:
const [activeTab, setActiveTab] = useState<"recipes" | "techniques">("recipes");

// WRAP existing body in TabsContent:
<PageHeader title="Recipes" subtitle="Documented paint schemes for your models" />
<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "recipes" | "techniques")}>
  <TabsList>
    <TabsTrigger value="recipes">Recipes</TabsTrigger>
    <TabsTrigger value="techniques">Techniques</TabsTrigger>
  </TabsList>
  <TabsContent value="recipes">
    {/* existing filter bar + RecipeCardGrid + sheets */}
  </TabsContent>
  <TabsContent value="techniques">
    <TechniqueLibraryTab />
  </TabsContent>
</Tabs>
```

**Pre-condition check:** Verify `src/components/ui/tabs.tsx` exists before implementing (RESEARCH.md Open Question 1). If absent, add with `npx shadcn@latest add tabs` or copy from Settings page usage.

---

### `tests/data-layer/technique-save.test.ts` (test, data-layer)

**Analog:** `tests/data-layer/recipe-persistence.test.ts`

**Test harness pattern** (lines 1–48 of analog):
```typescript
// tests/data-layer/recipe-persistence.test.ts lines 1-11
// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createHobbyforgeDb, createTestRecipe, createTestSection } from "./db-helpers";

describe("recipe persistence", () => {
  let db: Database.Database;
  beforeEach(() => { db = createHobbyforgeDb(); });
  afterEach(() => { db.close(); });
  it("...", () => { /* better-sqlite3 direct SQL */ });
});
```

**FND-03 technique test pattern** (from `tests/data-layer/technique-progress-identity.test.ts` lines 1–80):
```typescript
// @vitest-environment node
// Uses createHobbyforgeDb() + direct better-sqlite3 .prepare().run()
// No tauri mocks needed — pure SQLite test environment
db.prepare("INSERT INTO techniques (name) VALUES (?)").run("OSL Glow");
db.prepare("INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)").run(...);
db.prepare("INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)").run(...);
```

**Three mandatory test cases** (from RESEARCH.md Validation):
1. Non-destructive save: create S1/S2/S3, record PKs, remove S1 + reorder, assert S2.id unchanged.
2. Duplicate: assert all `technique_colour_slots.id`, `technique_steps.id`, `technique_sections.id` differ between original and copy.
3. Usage count: insert 2 `recipe_technique_instances`, assert count = 2; delete one, assert count = 1.

---

### `tests/techniques/TechniqueCard.test.tsx` (test, unit/RTL)

**Analog:** `tests/painting/recipeDetailSheet.test.ts`

Pattern: `// @vitest-environment jsdom` (implicit), mock `useQuery` hook with `vi.mock`, render `TechniqueCard` with a stub technique object, assert text content (name, usage count, slot count, step count, difficulty badge).

---

### `tests/techniques/TechniqueDetailSheet.test.tsx` (test, unit/RTL)

**Analog:** `tests/painting/recipeDetailSheet.test.ts`

Pattern: mock `useTechniqueColourSlots`, `useTechniqueSections`, `getTechniqueUsedByRecipes`; render `TechniqueDetailSheet`; assert "Not used by any recipes yet." when usage count = 0 (LIB-04). Assert section/step tree renders (TECH-05).

---

### `tests/techniques/TechniqueDeleteDialog.test.tsx` + `tests/techniques/TechniqueLibraryTab.test.tsx` (tests, unit/RTL)

**Analog:** `tests/painting/recipeDetailSheet.test.ts`

Same vi.mock + RTL render pattern. TechniqueDeleteDialog: assert usage count appears in description. TechniqueLibraryTab: assert both tabs render, name filter narrows results, effect filter narrows results (LIB-01, LIB-03).

---

## Shared Patterns

### DB client import
**Source:** `src/db/client.ts`
**Apply to:** All files under `src/db/queries/techniques*.ts`
```typescript
import { getDb } from "@/db/client";
// getDb() returns the hobbyforge.db connection with PRAGMA foreign_keys = ON
// Always use positional $1, $2 syntax — never string interpolation
```

### WAL auto-commit constraint
**Source:** `src/db/queries/recipes.ts` lines 219–235 (docblock)
**Apply to:** `src/db/queries/techniques.ts` (saveTechniqueGraph, duplicateTechnique)
- No `BEGIN TRANSACTION / COMMIT` across multiple `db.execute()` calls — tauri-plugin-sql connection pool breaks cross-call transactions.
- Use WAL auto-commit mode: each `db.execute()` is immediately visible to subsequent FK-checking INSERTs.

### Toast notifications
**Source:** `src/features/recipes/RecipeDeleteDialog.tsx` lines 26–32
**Apply to:** All technique mutation handlers
```typescript
import { toast } from "sonner";
// Success: toast.success("Technique created.");
// Error:   toast.error("Failed to save technique. Changes were not saved.");
```

### React Query invalidation symmetry
**Source:** `src/hooks/useRecipes.ts` lines 73–108
**Apply to:** `src/hooks/useTechniques.ts`
- Delete and duplicate must invalidate: `TECHNIQUES_KEY`, `TECHNIQUE_USAGE_COUNTS_KEY`, `["technique-sections"]` prefix, `["technique-colour-slots"]` prefix.
- Use prefix invalidation: `qc.invalidateQueries({ queryKey: ["technique-sections"] })` clears all per-technique section caches.

### `$1/$2` positional parameter syntax
**Source:** `src/db/queries/recipes.ts` (all queries)
**Apply to:** All technique query files
```typescript
// Correct:
db.select("SELECT * FROM techniques WHERE id = $1", [id])
// Wrong: template literals or ? placeholders
```

### dnd-kit sortable row
**Source:** `src/features/recipes/RecipeStepRow.tsx` lines 33–40
**Apply to:** `TechniqueSlotRow`, `TechniqueStepRow` (via `TechniqueSectionCard`), `TechniqueSectionList`
```typescript
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.localId });
const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
// Key: always use localId (UUID) as the dnd id — never array index
```

### non-destructive step save (FND-03 lock)
**Source:** `src/db/queries/recipes.ts` lines 332–450 (EDIT PATH)
**Apply to:** `saveTechniqueGraph` EDIT PATH in `src/db/queries/techniques.ts`
- UPDATE surviving steps by their DB PK; INSERT new steps; DELETE removed steps.
- NEVER DELETE+INSERT a step that existed before the save.
- The `computeStepDiff` from `recipeDiff.ts` identifies the three sets correctly via global scan across all sections.

### slotIdMap resolution pattern
**Source:** `src/db/queries/recipes.ts` lines 282–300 (sectionIdMap pattern)
**Apply to:** `saveTechniqueGraph` in `src/db/queries/techniques.ts`
```typescript
// After INSERT/seed, resolve slot FK at step save time:
const resolvedSlotId = slotIdMap.get(step.colour_slot_id ?? "") ?? null;
// Store null if step.colour_slot_id is null or "__none__"
```

### better-sqlite3 test harness
**Source:** `tests/data-layer/technique-progress-identity.test.ts` lines 1–27
**Apply to:** `tests/data-layer/technique-save.test.ts`
```typescript
// @vitest-environment node
import { createHobbyforgeDb } from "./db-helpers";
// Direct .prepare().run() SQL — no Tauri mocks needed
```

---

## No Analog Found

All files in this phase have close analogs. No files require new design patterns from scratch.

The one **net-new function** — `computeSlotDiff` / `buildSlotIdMap` in `src/lib/techniqueDiff.ts` — follows the exact same structure as `computeStepDiff` / `buildSectionIdMap` in `recipeDiff.ts`. It is structurally novel (no existing slot list diff exists) but the pattern is directly derivable from the existing step diff.

---

## Critical Pitfall Reminders (from RESEARCH.md)

| Pitfall | Files Affected | Guard |
|---------|---------------|-------|
| `updated_at` absent on `technique_steps` and `technique_colour_slots` | `techniques.ts` (UPDATE SQL) | Only `techniques` and `technique_sections` have `updated_at` |
| `step_photo_path` and `alt_paint_id` absent on `technique_steps` | `TechniqueStepRow.tsx`, `techniques.ts` | Omit photo button and alt-paint combobox entirely |
| `colour_slot_id` stores `localId` string in draft, must be resolved to DB integer at save time | `techniques.ts` saveTechniqueGraph | Always use `slotIdMap.get(step.colour_slot_id) ?? null` |
| Slot removal must clear step slot references in form state | `TechniqueFormSheet.tsx` | `onSlotRemove` handler iterates all sections → steps |
| React key collision on slot list | `TechniqueSlotRow.tsx` | Always key on `slot.localId`, never on array index |
| `tabs.tsx` may not exist in `src/components/ui/` | `RecipesPage.tsx` | Verify or add before importing |

---

## Metadata

**Analog search scope:** `src/features/recipes/`, `src/db/queries/`, `src/hooks/`, `src/lib/`, `tests/data-layer/`, `tests/painting/`
**Files scanned:** 18 source files read in full
**Pattern extraction date:** 2026-06-21
