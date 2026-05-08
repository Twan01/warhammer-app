# Phase 50: Section Form UI - Research

**Researched:** 2026-05-08
**Domain:** React form state management + @dnd-kit nested sortable + shadcn/ui Collapsible
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Section card interactions**
- Each section renders as a collapsible card using the existing radix Collapsible component (already used in LoadoutSection, PlaybookTab, BattleLogRow)
- All sections independently collapsible — NOT accordion-style XOR behavior
- Section card header shows: section name (inline editable), step count, surface badge (if set), drag handle (GripVertical icon), collapse chevron, and delete button (Trash2 icon)
- Section delete: immediate for empty sections, confirmation dialog for non-empty sections (cascade deletes all contained steps)
- "Add Section" button placed below the last section card, consistent with "Add step" button placement

**Progressive disclosure**
- Single-section recipes hide all section scaffolding — steps render directly like the current flat form
- "Add Section" button visible even in single-section mode — adding a second section reveals all section headers and makes them editable
- When transitioning from 1 to 2+ sections, the default "Steps" section header becomes visible and editable
- Removing sections back to one auto-hides section scaffolding again

**Section inline editing**
- Section name: inline text input in the header — click to edit, blur to save (no modal)
- Section surface: inline Select dropdown in the header row, reuses RECIPE_SURFACES from recipeSchema.ts
- Section optional flag: checkbox in the header row (0|1 integer SQLite boolean)
- Section notes: not exposed in section header — accessible via expand or deferred to future polish

**Drag-and-drop architecture**
- Two-DndContext approach (locked in research SUMMARY.md):
  - Outer DndContext in RecipeSectionList for section reorder (items = section localIds)
  - Inner DndContext per section card in RecipeStepList for step reorder (items = step localIds)
- Both levels use crypto.randomUUID() localIds — never integer DB IDs (prevents namespace collision)
- Drag handle and collapse trigger are separate interaction zones on the section header
- Cross-section step drag is explicitly out of scope (FLOW-01 deferred to future)

**Draft state management**
- DraftSection interface mirrors DraftStep pattern: localId (UUID), name, surface, optional, notes, plus nested DraftStep[] array
- buildDraftSections(sections, steps) — pure function grouping steps into sections by section_id, tested independently
- Single useEffect guarded on both existingSections.length AND existingSteps.length resolving — never two separate effects
- New recipe initialization: one DraftSection with name "Steps", empty DraftStep[] array

**Save/submit flow**
- Delete-all-and-recreate for both sections and steps (extends existing pattern in RecipeFormSheet)
- Save order: (1) create/update recipe, (2) delete all existing sections (CASCADE handles step cleanup), (3) create sections in order, (4) build Map<localId, newDbId> during section creation, (5) create steps with mapped section_id
- section_id passed to addRecipePaint using the localId-to-dbId map built during section save
- Cache invalidation on save: invalidate RECIPE_SECTIONS_KEY, RECIPE_PAINTS_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, RECIPE_SWATCH_KEY, and recipe-step-counts

### Claude's Discretion
- Exact section card styling (border, background, spacing within the sheet)
- Whether section header uses a compact single-row or a two-row layout
- Animation for collapse/expand transitions
- Whether "Add Section" uses a full-width button or a smaller text-link style
- Exact confirmation dialog wording for non-empty section delete
- Whether to show a visual indicator (badge/count) on collapsed section cards

### Deferred Ideas (OUT OF SCOPE)
- Cross-section step drag-and-drop (FLOW-01) — v0.2.8+ upgrade path, requires collapsing to single DndContext
- "Move to section" button on step rows — simpler alternative to cross-section DnD, add post-validation
- Section notes textarea in an expanded section header — future polish
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FORM-01 | User can edit recipes with collapsible section cards containing step lists | Collapsible component verified; RecipeStepList reusable as-is inside cards |
| FORM-02 | User can add, rename, and delete sections within the recipe form | Inline text input + blur-to-save pattern; confirmation dialog for non-empty delete; createRecipeSection / deleteRecipeSection hooks confirmed |
| FORM-03 | User can reorder sections via drag-and-drop in the form (outer DndContext) | DndContext + SortableContext outer layer; same pattern as existing RecipeStepList; localId uniqueness confirmed |
| FORM-04 | User can reorder steps within a section via drag-and-drop (inner DndContext per section) | RecipeStepList inner DndContext reused unchanged inside RecipeSectionCard |
| FORM-05 | User creating a new recipe gets one auto-created default section (simple recipes stay easy) | buildDraftSections + makeDraftSection() factory; progressive disclosure rule locks it |
| FORM-06 | User editing an existing recipe sees sections loaded with steps grouped correctly | useRecipeSections + useRecipePaints both available; buildDraftSections pure function; single useEffect guard pattern |
</phase_requirements>

---

## Summary

Phase 50 rewrites RecipeFormSheet from a flat DraftStep[] model to a DraftSection[] model, where each DraftSection carries a nested DraftStep[] array. The architectural foundation is already in place: the data layer (Phase 48) provides section CRUD hooks and query functions, the DnD architecture decision (two independent DndContexts with UUID localIds) is locked, and all UI primitives (Collapsible, RecipeStepList, RecipeStepRow) are already installed and working. No new dependencies are needed.

The two hardest implementation concerns are (1) the dual-query initialization guard — a single useEffect that waits for both useRecipeSections and useRecipePaints to resolve before calling buildDraftSections — and (2) the submit flow, which must build a Map<localId, newDbId> as sections are created so that addRecipePaint calls receive correct integer section_id values. Both patterns are well-defined and directly extend the existing codebase conventions.

Progressive disclosure is the UX contract: when sections.length === 1, section scaffolding is invisible and the form looks exactly like the pre-v0.2.7 experience. The transition to multi-section mode happens automatically when the user clicks "Add Section" a second time.

**Primary recommendation:** Build in wave order: (1) DraftSection type + buildDraftSections pure function + tests, (2) RecipeSectionList + RecipeSectionCard + RecipeSectionForm UI components, (3) RecipeFormSheet rewrite wiring draft state + submit flow, (4) progressive disclosure toggle + edge case hardening.

---

## Standard Stack

### Core (all already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | DragEndEvent, DndContext, sensors | Already drives RecipeStepList and KanbanBoard |
| @dnd-kit/sortable | 10.0.0 | SortableContext, useSortable, arrayMove | Already drives RecipeStepRow; nested SortableContext is a documented supported pattern |
| radix-ui (Collapsible) | 1.4.3 | CollapsibleRoot, CollapsibleTrigger, CollapsibleContent | Already installed; used in LoadoutSection, PlaybookTab, BattleLogRow |
| React useState | 19.2.5 | DraftSection[] + DraftStep[] state arrays | Project standard for DnD-managed draft arrays (STATE.md decision: no useFieldArray) |
| React Hook Form + Zod | existing | Recipe-level fields only — name, faction, area, etc. | Boundary unchanged; sections/steps bypass RHF |
| crypto.randomUUID() | built-in | localId generation for DraftSection and DraftStep | Guarantees UUID namespace — prevents collision between outer and inner DndContexts |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui collapsible.tsx | installed | Collapsible wrapper for section cards | Each RecipeSectionCard wraps its content |
| shadcn/ui Button | installed | "Add Section" button, delete button | Standard pattern throughout forms |
| shadcn/ui Select | installed | Section surface inline selector | Matches existing Select usage in RecipeFormSheet |
| Lucide GripVertical | installed | Section drag handle | Already used in RecipeStepRow — direct reuse |
| Lucide Trash2 | installed | Section delete button | Already used in RecipeStepRow — direct reuse |
| Lucide ChevronDown/Up | installed | Collapse toggle chevron | Already used in Collapsible trigger patterns |
| sonner toast | installed | Save success / error feedback | Already used in RecipeFormSheet.onSubmit |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui Collapsible | shadcn/ui Accordion | Accordion enforces XOR-open (only one item open at a time) — wrong for independent section collapse |
| manual useState arrays | useFieldArray (RHF) | RHF #10607: useFieldArray generates numeric IDs that collide with useSortable's id prop — documented project decision in STATE.md |
| two-DndContext approach | single DndContext | Single context required only when cross-container drag is needed; two contexts is simpler and correct for isolated section+step sorting |

**Installation:** No new packages. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure

New files for this phase:

```
src/features/recipes/
  recipeSection.ts          # DraftSection interface, makeDraftSection(), buildDraftSections()
  RecipeSectionList.tsx     # Outer DndContext for section reorder
  RecipeSectionCard.tsx     # Collapsible card: header + RecipeStepList
  RecipeSectionForm.tsx     # Inline name/surface/optional editor (pure controlled, no RHF)
  RecipeFormSheet.tsx       # Major rewrite — DraftSection[] replaces flat DraftStep[]
```

Tests (new):
```
tests/painting/
  recipeSection.test.ts     # buildDraftSections, makeDraftSection, computeSectionOrder pure functions
  RecipeSectionCard.test.tsx # Collapse/expand, header fields rendered
  RecipeFormSheet.section.test.tsx # Progressive disclosure, initialization, submit flow
```

### Pattern 1: DraftSection Interface (mirrors DraftStep)

**What:** A plain object managed in useState[], with a UUID localId (never a DB id) as the DnD identifier and a nested DraftStep[] array.
**When to use:** Always — this is the draft state model for RecipeFormSheet.

```typescript
// recipeSection.ts
export interface DraftSection {
  localId: string;            // crypto.randomUUID() — DnD id, never DB id
  name: string;
  surface: string | null;
  optional: number;           // 0 | 1 SQLite boolean
  notes: string | null;
  steps: DraftStep[];         // nested draft steps for this section
}

export function makeDraftSection(name = "Steps"): DraftSection {
  return {
    localId: crypto.randomUUID(),
    name,
    surface: null,
    optional: 0,
    notes: null,
    steps: [],
  };
}
```

### Pattern 2: buildDraftSections (pure function, tested independently)

**What:** Groups RecipeSection[] and RecipeStep[] into DraftSection[] (with nested steps).
**When to use:** Called once in the useEffect initialization guard.

```typescript
// recipeSection.ts
export function buildDraftSections(
  sections: RecipeSection[],
  steps: RecipeStep[],
): DraftSection[] {
  return sections.map((s) => ({
    localId: crypto.randomUUID(),
    name: s.name,
    surface: s.surface,
    optional: s.optional,
    notes: s.notes,
    steps: steps
      .filter((st) => st.section_id === s.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((st) => ({
        localId: crypto.randomUUID(),
        step_name: st.step_name,
        paint_id: st.paint_id,
        notes: st.notes,
        painting_phase: st.painting_phase ?? null,
        tool: st.tool ?? null,
        technique: st.technique ?? null,
        dilution: st.dilution ?? null,
        time_estimate_minutes: st.time_estimate_minutes ?? null,
        step_photo_path: st.step_photo_path ?? null,
        alt_paint_id: st.alt_paint_id ?? null,
      })),
  }));
}
```

### Pattern 3: Single useEffect initialization guard

**What:** One useEffect depending on recipe?.id, existingSections.length, and existingSteps.length. Calls buildDraftSections only when both queries have resolved.
**When to use:** This is the ONLY way draft state is initialized — no second useEffect for sections or steps separately.

```typescript
// In RecipeFormSheet
useEffect(() => {
  form.reset(buildDefaults(recipe));
  if (recipe && existingSections.length > 0 && existingSteps.length >= 0) {
    setSections(buildDraftSections(existingSections, existingSteps));
  } else if (recipe && existingSections.length > 0) {
    // recipe with sections but zero steps is valid
    setSections(buildDraftSections(existingSections, []));
  } else if (!recipe) {
    setSections([makeDraftSection("Steps")]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [recipe?.id, existingSections.length, existingSteps.length]);
```

### Pattern 4: Outer DndContext (RecipeSectionList)

**What:** Wraps all RecipeSectionCard instances in a DndContext + SortableContext. onDragEnd calls arrayMove on the sections array.
**When to use:** RecipeSectionList — the container rendered inside RecipeFormSheet.

```typescript
// RecipeSectionList.tsx
export function RecipeSectionList({ sections, onChange, ... }) {
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={sections.map((s) => s.localId)}
        strategy={verticalListSortingStrategy}
      >
        {sections.map((section) => (
          <RecipeSectionCard
            key={section.localId}
            section={section}
            // ... props
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

### Pattern 5: RecipeSectionCard (Collapsible + useSortable)

**What:** A sortable card (outer drag handle) that wraps a Collapsible (independent collapse). Drag handle and collapse trigger are separate DOM elements — no event conflict.
**When to use:** One per DraftSection inside RecipeSectionList.

```typescript
// RecipeSectionCard.tsx — structural sketch
export function RecipeSectionCard({ section, onChange, onRemove, ... }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.localId,
  });
  const [open, setOpen] = useState(true);

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2">
          {/* Section drag handle — separate from collapse trigger */}
          <button type="button" {...attributes} {...listeners} aria-label="Drag section">
            <GripVertical className="h-4 w-4" />
          </button>
          {/* Inline name editor */}
          <Input value={section.name} onChange={...} onBlur={...} />
          {/* Collapse trigger */}
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="icon">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          {/* Delete button */}
          <Button type="button" variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <CollapsibleContent>
          {/* Inner DndContext lives inside RecipeStepList — unchanged */}
          <RecipeStepList steps={section.steps} onChange={updateSteps} onCreateNewPaint={...} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
```

### Pattern 6: Submit flow with localId-to-dbId mapping

**What:** After creating each section, capture the returned DB id and build a Map<localId, dbId>. Use this map when calling addRecipePaint so each step gets the correct integer section_id.
**When to use:** onSubmit in RecipeFormSheet — the only place sections are persisted.

```typescript
// onSubmit — section save sequence
// Step 1: upsert recipe row (unchanged)
// Step 2: delete all existing sections — CASCADE handles step cleanup
for (const existing of existingSections) {
  await deleteSection({ id: existing.id, recipeId: recipeId });
}
// Step 3: create sections in array order, build localId → dbId map
const sectionIdMap = new Map<string, number>();
for (let i = 0; i < sections.length; i++) {
  const sec = sections[i];
  const newId = await createSection({
    recipe_id: recipeId,
    name: sec.name,
    surface: sec.surface,
    optional: sec.optional,
    order_index: i,
    notes: sec.notes,
  });
  sectionIdMap.set(sec.localId, newId);
}
// Step 4: create steps with mapped section_id
for (const sec of sections) {
  const dbSectionId = sectionIdMap.get(sec.localId) ?? null;
  const indexedSteps = computeOrderIndex(sec.steps);
  for (const s of indexedSteps) {
    if (s.paint_id !== null) {
      await addRecipePaint({ ..., section_id: dbSectionId });
    }
  }
}
// Step 5: invalidate all 6 keys
qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(recipeId) });
qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(recipeId) });
qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
qc.invalidateQueries({ queryKey: ["recipe-step-counts"] });
```

### Pattern 7: Progressive disclosure toggle

**What:** When sections.length === 1, render steps from sections[0].steps directly via RecipeStepList without any section card wrapper or header. When sections.length >= 2, render RecipeSectionList with full section scaffolding.
**When to use:** Inside the RecipeFormSheet JSX, gated on sections.length.

```typescript
// JSX inside RecipeFormSheet form
{sections.length <= 1 ? (
  // Single-section mode: flat appearance — section scaffolding hidden
  <RecipeStepList
    steps={sections[0]?.steps ?? []}
    onChange={(next) => setSections([{ ...sections[0], steps: next }])}
    onCreateNewPaint={openInlinePaintCreate}
  />
) : (
  // Multi-section mode: full section cards with DnD
  <RecipeSectionList
    sections={sections}
    onChange={setSections}
    onCreateNewPaint={openInlinePaintCreate}
  />
)}
<Button type="button" variant="outline" size="sm" onClick={addSection}>
  <Plus className="mr-2 h-4 w-4" /> Add Section
</Button>
```

### Pattern 8: Confirmation dialog for non-empty section delete

**What:** Check if the section being deleted has any steps. If empty, delete immediately. If non-empty, show an AlertDialog asking the user to confirm — matching the existing RecipeDeleteDialog pattern.
**When to use:** Delete button click handler in RecipeSectionCard.

```typescript
function handleDelete() {
  if (section.steps.length === 0) {
    onRemove();
  } else {
    setConfirmOpen(true);
  }
}
```

### Anti-Patterns to Avoid

- **Two separate useEffects for sections and steps:** Causes a race where one resolves before the other, producing a partial draft. Always guard a single useEffect on both lengths.
- **Using integer DB ids as DnD sortable ids:** DraftSection.localId MUST be a UUID. Using `section.id` (integer) risks collision with step ids in nested contexts and is forbidden by the project architecture decision.
- **useFieldArray for sections or steps:** RHF #10607 — numeric ids collide with useSortable. Manual useState is the project standard, documented in STATE.md.
- **Manually deleting steps before deleting a section:** The ON DELETE CASCADE on recipe_steps.section_id handles step cleanup. Deleting steps first is redundant and risks partial failures if the loop is interrupted.
- **Shadcn/ui Accordion instead of Collapsible:** Accordion enforces only one open panel at a time (XOR). Sections must be independently collapsible — use Collapsible.
- **Calling deleteSection in the submit flow:** The submit strategy is delete-all-existing-sections then recreate. But because deleteSection invokes useDeleteRecipeSection (a mutation hook), it must be called as a direct query function or the hook's mutateAsync — not by calling deleteRecipeSection from the query module directly in the submit handler while simultaneously managing hook state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible section cards | Custom toggle state + CSS show/hide | `Collapsible` from `@/components/ui/collapsible.tsx` | ARIA keyboard navigation, focus management provided by Radix |
| Step reorder within a section | Custom mouse event tracking | `RecipeStepList` (unchanged) + inner DndContext | Already battle-tested; RecipeStepList is designed to be slotted inside section cards |
| Section array reorder | Array splice/splice logic | `arrayMove` from @dnd-kit/sortable | Handles edge cases, is idiomatic to the DnD library |
| Section draft grouping | Ad-hoc filter/reduce in the component | `buildDraftSections()` pure function | Testable in isolation before wiring to components |
| UUID generation | Math.random() or counter | `crypto.randomUUID()` | Project standard; guarantees namespace isolation across section and step localIds |
| Confirmation dialog | Custom modal | AlertDialog from shadcn/ui | Consistent with existing delete confirmation patterns |

---

## Common Pitfalls

### Pitfall 1: Two-phase draft initialization race
**What goes wrong:** Two async queries (useRecipeSections, useRecipePaints) each trigger a separate useEffect. The first to resolve calls buildDraftSections with an empty partner array, producing incomplete draft state. Then the second useEffect runs and partially overwrites.
**Why it happens:** Developers instinctively mirror the existing single-query pattern (one useEffect per fetch).
**How to avoid:** A single useEffect depending on `[recipe?.id, existingSections.length, existingSteps.length]`. buildDraftSections accepts empty steps arrays — it is safe to call when sections have resolved but steps are an empty array (recipe with zero steps is valid).
**Warning signs:** RecipeSectionCard shows correct sections but all steps are empty on first open.

### Pitfall 2: Missing localId-to-dbId map on submit
**What goes wrong:** Steps are saved with `section_id: null` (the Phase 48 default) because the developer forgets to build the Map<localId, dbId> during section creation.
**Why it happens:** The section creation returns a new DB id, but the DraftSection only has a localId — there is no implicit link.
**How to avoid:** Build the Map immediately after each `await createSection()` call in the submit loop. Map must be scoped to the submit function.
**Warning signs:** All steps save correctly but section_id column remains null; read view shows flat timeline even though sections were saved.

### Pitfall 3: Incorrect drag handle + collapse trigger interaction
**What goes wrong:** Attaching `...listeners` to the entire section card header row means clicking the collapse chevron or the name input triggers a drag. The section becomes impossible to edit without accidentally reordering.
**Why it happens:** The RecipeStepRow pattern puts listeners on a dedicated button — but the section card has a richer header with multiple interactive elements.
**How to avoid:** Attach `...attributes` and `...listeners` only to the GripVertical button element, not to the header div. Verify with manual testing that clicking the name input, chevron, and delete button does not initiate a drag.
**Warning signs:** Clicking the section name input causes the card to snap back to its original position.

### Pitfall 4: Progressive disclosure transition bug
**What goes wrong:** When the user adds a second section (triggering the switch from flat mode to multi-section mode), the steps that were in the single flat RecipeStepList are lost because the state transition didn't preserve them into the new sections[0].steps slot.
**Why it happens:** The "Add Section" handler creates a new DraftSection but doesn't correctly splice the existing single-section steps into the sections array.
**How to avoid:** The addSection handler must: `setSections([{ ...sections[0], steps: sections[0]?.steps ?? [] }, makeDraftSection()])`. The first element preserves all existing steps.
**Warning signs:** After clicking "Add Section", the first section card is empty even though steps were present.

### Pitfall 5: Non-empty section delete without cascade invalidation
**What goes wrong:** When a user confirms deletion of a non-empty section, the UI removes the section card but cache keys for step counts, paint availability, and swatch colors become stale. The recipe card still shows the old step count or paint badges.
**Why it happens:** Developer only invalidates RECIPE_SECTIONS_KEY after delete.
**How to avoid:** Use useDeleteRecipeSection (Phase 48 hook) which already has the 5-key cascade invalidation contract baked in. Never roll a direct deleteRecipeSection query call in the submit flow.
**Warning signs:** Recipe card shows incorrect step count after deleting a section with steps.

### Pitfall 6: key={recipe?.id ?? "new"} on SheetContent — already present
**What goes wrong:** If the key is removed during refactoring, switching between recipes leaves stale draft state (sections from recipe A visible when editing recipe B).
**Why it happens:** Easy to remove during a large component rewrite.
**How to avoid:** The `key={recipe?.id ?? "new"}` on `<SheetContent>` must be preserved in the rewritten RecipeFormSheet. It forces a full re-mount (and thus a fresh useEffect run) whenever the recipe changes.
**Warning signs:** Opening recipe B after recipe A shows recipe A's sections until you scroll or interact.

---

## Code Examples

### buildDraftSections — test-ready pure function

```typescript
// src/features/recipes/recipeSection.ts
export function buildDraftSections(
  sections: RecipeSection[],
  steps: RecipeStep[],
): DraftSection[] {
  return sections.map((s) => ({
    localId: crypto.randomUUID(),
    name: s.name,
    surface: s.surface,
    optional: s.optional,
    notes: s.notes,
    steps: steps
      .filter((st) => st.section_id === s.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((st) => ({
        localId: crypto.randomUUID(),
        step_name: st.step_name,
        paint_id: st.paint_id,
        notes: st.notes,
        painting_phase: st.painting_phase ?? null,
        tool: st.tool ?? null,
        technique: st.technique ?? null,
        dilution: st.dilution ?? null,
        time_estimate_minutes: st.time_estimate_minutes ?? null,
        step_photo_path: st.step_photo_path ?? null,
        alt_paint_id: st.alt_paint_id ?? null,
      })),
  }));
}
```

### Existing RecipeStepList — used unchanged inside section cards

The existing `src/features/recipes/RecipeStepList.tsx` takes `(steps, onChange, onCreateNewPaint)` and owns its own inner DndContext. It does not need modification — it is designed to be composed inside a parent container.

### Collapsible usage (from src/components/ui/collapsible.tsx)

```typescript
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

// Components export:
// <Collapsible open={bool} onOpenChange={fn}>
//   <CollapsibleTrigger>...</CollapsibleTrigger>
//   <CollapsibleContent>...</CollapsibleContent>
// </Collapsible>
```

### Cache keys available for submit invalidation

```typescript
// From useRecipeSections.ts
RECIPE_SECTIONS_KEY(recipeId)  // ["recipe-sections", recipeId]

// From useRecipePaints.ts
RECIPE_PAINTS_KEY(recipeId)    // per-recipe step list
STEP_COUNTS_KEY                // batch step counts
RECIPE_AVAILABILITY_KEY        // paint availability badge
RECIPE_SWATCH_KEY              // swatch color strip

// Inline in RecipeFormSheet (unchanged)
qc.invalidateQueries({ queryKey: ["recipe-step-counts"] })
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Flat `DraftStep[]` in RecipeFormSheet | `DraftSection[]` where each section carries `DraftStep[]` | Sections group steps; submit loop has two levels |
| `section_id: null` hardcoded in addRecipePaint | `section_id: dbSectionId` from localId→dbId Map | Steps are correctly associated with sections in DB |
| Single useEffect on `[recipe?.id, existingSteps.length]` | Single useEffect on `[recipe?.id, existingSections.length, existingSteps.length]` | Both queries must resolve before draft is initialized |
| No section scaffolding in form | Progressive disclosure: hidden at 1 section, visible at 2+ | Backward UX compat — simple recipes stay simple |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test -- tests/painting/recipeSection.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FORM-01 | Section cards render with collapsible step list | unit (component) | `pnpm test -- tests/painting/RecipeSectionCard.test.tsx` | Wave 0 |
| FORM-02 | Add/rename/delete sections in form | unit (component) | `pnpm test -- tests/painting/RecipeSectionCard.test.tsx` | Wave 0 |
| FORM-03 | Section drag reorder — outer DndContext | unit (pure fn) | `pnpm test -- tests/painting/recipeSection.test.ts` | Wave 0 |
| FORM-04 | Step drag reorder within section — inner DndContext | unit (pure fn) | Covered by existing `tests/painting/recipeSteps.test.ts` | ✅ |
| FORM-05 | New recipe gets one default section | unit (pure fn) | `pnpm test -- tests/painting/recipeSection.test.ts` | Wave 0 |
| FORM-06 | Edit: sections load with grouped steps | unit (pure fn) | `pnpm test -- tests/painting/recipeSection.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/painting/recipeSection.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/painting/recipeSection.test.ts` — covers FORM-03, FORM-05, FORM-06: `buildDraftSections`, `makeDraftSection`, `computeSectionOrder` pure functions
- [ ] `tests/painting/RecipeSectionCard.test.tsx` — covers FORM-01, FORM-02: collapse/expand behavior, header fields, delete confirmation guard

*(Existing `tests/painting/recipeSteps.test.ts` covers step-level pure functions — no Wave 0 gap for FORM-04)*

---

## Open Questions

1. **useRecipeSections guard when both lengths are 0 for a new recipe**
   - What we know: New recipe has no DB sections yet; existingSections.length === 0 and existingSteps.length === 0
   - What's unclear: The initialization guard `existingSections.length > 0 && existingSteps.length >= 0` would skip initialization for a new recipe
   - Recommendation: Check `recipe === null` as the branch condition for new recipe initialization (one default section), not the query result lengths. The guard `existingSections.length > 0` applies only to edit mode.

2. **RecipeStepList onCreateNewPaint forwarding through sections**
   - What we know: openInlinePaintCreate takes a stepLocalId and tracks which step triggered paint creation
   - What's unclear: With steps now nested inside sections, the stepLocalId must be locatable across all sections to auto-select after PaintSheet closes
   - Recommendation: The PAINT-03 detect-new-paint useEffect searches `sections.flatMap(s => s.steps)` instead of the old flat `steps` array.

---

## Sources

### Primary (HIGH confidence)

- `src/features/recipes/RecipeFormSheet.tsx` — full file read; draft state pattern, submit strategy, useEffect sentinel, key re-mount pattern
- `src/features/recipes/RecipeStepList.tsx` — full file read; inner DndContext pattern, sensors, handleDragEnd, arrayMove usage
- `src/features/recipes/recipeSteps.ts` — full file read; DraftStep interface, makeDraftStep, computeOrderIndex
- `src/features/recipes/RecipeStepRow.tsx` — partial read (80 lines); useSortable, separate drag handle button with ...listeners
- `src/features/recipes/recipeSchema.ts` — full file read; RECIPE_SURFACES, PAINTING_PHASES, RecipeFormValues
- `src/hooks/useRecipeSections.ts` — full file read; RECIPE_SECTIONS_KEY, all 5 mutations, 5-key invalidation contract
- `src/db/queries/recipeSections.ts` — full file read; all 6 query functions, parameter patterns
- `src/types/recipeSection.ts` — full file read; RecipeSection, CreateRecipeSectionInput, UpdateRecipeSectionInput
- `src/components/ui/collapsible.tsx` — full file read; Collapsible, CollapsibleTrigger, CollapsibleContent exports
- `tests/painting/recipeSteps.test.ts` — full file read; test pattern for pure function coverage
- `tests/painting/recipeSections.test.ts` — full file read; hook invalidation test pattern with makeWrapper/spy
- `tests/painting/sectionedTimeline.test.tsx` — full file read; fixture factory patterns for test files
- `.planning/phases/50-section-form-ui/50-CONTEXT.md` — all locked decisions
- `.planning/research/SUMMARY.md` — DndContext conflict resolution, architecture approach
- `.planning/STATE.md` — accumulated architecture decisions (useFieldArray ban, localId convention, cascade contract)
- `vitest.config.ts` — framework config, quick run commands

### Secondary (MEDIUM confidence)

- `.planning/phases/48-section-data-layer/48-CONTEXT.md` — cascade contract, default naming, cache invalidation contract
- `.planning/phases/49-section-read-ui/49-CONTEXT.md` — section header layout patterns, visual grouping decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified as installed via direct file reads; DnD nesting pattern verified in SUMMARY.md against official @dnd-kit docs
- Architecture: HIGH — all patterns derived from direct codebase reads of RecipeFormSheet, RecipeStepList, RecipeStepRow; zero training-data assumptions
- Pitfalls: HIGH — derived from SUMMARY.md (GitHub issues #46, #766, #280, RHF #10607) plus direct inspection of existing useEffect guard patterns

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (stable library stack; no fast-moving dependencies)
