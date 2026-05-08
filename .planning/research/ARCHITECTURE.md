# Architecture Research

**Domain:** HobbyForge v0.2.7 — Recipe Sections integration with existing recipe architecture
**Researched:** 2026-05-08
**Confidence:** HIGH (based on full codebase reads of all affected source files)

---

## Existing Architecture Summary

The recipe subsystem follows the four-layer pattern established project-wide:

```
UI (RecipeFormSheet, RecipeDetailSheet, RecipeSectionList...)
      |
React Query hooks (useRecipes.ts, useRecipePaints.ts, useRecipeSections.ts [NEW])
      |
Query modules (recipes.ts, recipePaints.ts, recipeSections.ts [NEW])
      |
getDb() -> SQLite (hobbyforge.db)
```

Key structural facts that shape the integration:

- `DraftStep[]` in `RecipeFormSheet` is managed as a plain React `useState` array, NOT `useFieldArray`. This is a documented decision: `useFieldArray` injects its own `id` field that collides with `@dnd-kit/useSortable`'s `id` prop (RHF issue #10607). This constraint propagates: `DraftSection[]` containing `DraftStep[]` must follow the same manual-array pattern.
- Cache invalidation follows the **symmetry rule**: every key invalidated by `useCreate*` must also be invalidated by `useDelete*`.
- Batch queries (step counts, swatch colors, availability) use a single GROUP BY SQL query across all recipes. Sections must not break these.
- `recipePaints.ts` and `useRecipePaints.ts` retain their legacy names despite operating on `recipe_steps`. The naming stays.
- Steps with `paint_id = null` are already valid (unlinked steps exist). Steps with `section_id = null` after migration are equally valid — the nullable FK is the backward-compat mechanism.

---

## Component Boundaries

### Existing Components: What Changes

| Component | Location | Change Required | Nature |
|-----------|----------|----------------|--------|
| `RecipeFormSheet.tsx` | `src/features/recipes/` | Replace flat `DraftStep[]` state with `DraftSection[]` each containing `DraftStep[]`; update submit to write sections then steps | Significant rewrite of draft state + submit logic |
| `RecipeDetailSheet.tsx` | `src/features/recipes/` | Add `useRecipeSections(recipe?.id)` call; conditionally render `RecipeSectionedTimeline` vs existing fallback | Moderate: new hook + conditional render |
| `RecipeStepTimeline.tsx` | `src/features/recipes/` | No change — retained as fallback for recipes with no sections | None |
| `recipeSteps.ts` | `src/features/recipes/` | Add `DraftSection` interface, `makeDraftSection()`, `computeSectionOrderIndexes()` alongside existing exports | Small additive only |
| `src/types/recipePaint.ts` | `src/types/` | Add `section_id: number \| null` to `RecipeStep` interface | One-line addition |
| `src/db/queries/recipePaints.ts` | `src/db/queries/` | Add `section_id` parameter to `addRecipePaint` insert; add `getRecipeStepsBySection()`; add `moveStepToSection()` | Additive only |
| `src/db/queries/recipes.ts` | `src/db/queries/` | Extend `duplicateRecipe()` to copy sections first, build old-to-new section ID map, remap `section_id` on each copied step | Moderate: section copy loop + ID remap |
| `useRecipes.ts` | `src/hooks/` | `useDuplicateRecipe` must invalidate `["recipe-sections"]` prefix key | One-line addition |

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `src/types/recipeSection.ts` | `src/types/` | `RecipeSection`, `CreateRecipeSectionInput`, `UpdateRecipeSectionInput` |
| `src/db/queries/recipeSections.ts` | `src/db/queries/` | `getRecipeSections`, `createRecipeSection`, `updateRecipeSection`, `deleteRecipeSection`, `reorderRecipeSections`, `getStepCountsBySection` |
| `src/hooks/useRecipeSections.ts` | `src/hooks/` | `useRecipeSections`, `useCreateRecipeSection`, `useUpdateRecipeSection`, `useDeleteRecipeSection`, `useReorderRecipeSections` + cache keys |
| `src/features/recipes/RecipeSectionList.tsx` | `src/features/recipes/` | Outer DnD container for section-level reorder; renders `RecipeSectionCard` list |
| `src/features/recipes/RecipeSectionCard.tsx` | `src/features/recipes/` | Collapsible card: section name, surface badge, step count, optional badge; contains `RecipeStepList` |
| `src/features/recipes/RecipeSectionForm.tsx` | `src/features/recipes/` | Inline name + surface editor used inside card header in form mode |
| `src/features/recipes/RecipeSectionedTimeline.tsx` | `src/features/recipes/` | Read-only timeline with section headers; used in `RecipeDetailSheet` when sections exist |

---

## Data Flow: Nested Draft State

### The Core Constraint

`RecipeFormSheet` currently manages a flat `DraftStep[]` via `useState`. Sections require a `DraftSection[]` where each section owns a `DraftStep[]`. The `useFieldArray` collision constraint applies to both levels: section IDs and step IDs must both come from `crypto.randomUUID()` stored as `localId`, not RHF field indices.

### Recommended Draft Types (additions to `recipeSteps.ts`)

```typescript
export interface DraftSection {
  localId: string;       // crypto.randomUUID() — @dnd-kit sortable ID for sections
  name: string;
  surface: string | null;
  optional: 0 | 1;
  notes: string | null;
  steps: DraftStep[];    // steps are owned by their section
}

export function makeDraftSection(name = "General"): DraftSection {
  return {
    localId: crypto.randomUUID(),
    name,
    surface: null,
    optional: 0,
    notes: null,
    steps: [],
  };
}

export function computeSectionOrderIndexes(
  sections: DraftSection[],
): Array<DraftSection & { order_index: number }> {
  return sections.map((sec, i) => ({ ...sec, order_index: i }));
}
```

### State in `RecipeFormSheet`

Replace:
```typescript
const [steps, setSteps] = useState<DraftStep[]>([]);
```
With:
```typescript
const [sections, setSections] = useState<DraftSection[]>([]);
```

All step mutations are scoped by `sectionLocalId`. The pattern is identical to existing step mutation functions, one level deeper:

```typescript
function addStepToSection(sectionLocalId: string) {
  setSections(prev =>
    prev.map(sec =>
      sec.localId === sectionLocalId
        ? { ...sec, steps: [...sec.steps, makeDraftStep()] }
        : sec
    )
  );
}

function updateStepInSection(sectionLocalId: string, stepLocalId: string, next: DraftStep) {
  setSections(prev =>
    prev.map(sec =>
      sec.localId === sectionLocalId
        ? { ...sec, steps: sec.steps.map(s => s.localId === stepLocalId ? next : s) }
        : sec
    )
  );
}

function removeStepFromSection(sectionLocalId: string, stepLocalId: string) {
  setSections(prev =>
    prev.map(sec =>
      sec.localId === sectionLocalId
        ? { ...sec, steps: sec.steps.filter(s => s.localId !== stepLocalId) }
        : sec
    )
  );
}
```

Section-level mutations are simpler (no nesting):

```typescript
function updateSection(sectionLocalId: string, patch: Partial<DraftSection>) {
  setSections(prev =>
    prev.map(sec => sec.localId === sectionLocalId ? { ...sec, ...patch } : sec)
  );
}

function removeSection(sectionLocalId: string) {
  setSections(prev => prev.filter(sec => sec.localId !== sectionLocalId));
}
```

### Form Initialization (edit mode)

The existing `useEffect` that seeds `steps` from `existingSteps` must be replaced. In edit mode, both `useRecipeSections(recipe?.id)` and `useRecipePaints(recipe?.id)` are needed. Build `DraftSection[]` by grouping steps under their section:

```typescript
const { data: existingSections = [] } = useRecipeSections(recipe?.id);
const { data: existingSteps = [] } = useRecipePaints(recipe?.id);

useEffect(() => {
  form.reset(buildDefaults(recipe));
  if (recipe && existingSections.length > 0) {
    const stepsBySection = new Map<number, RecipeStep[]>();
    for (const step of existingSteps) {
      const key = step.section_id ?? -1;
      stepsBySection.set(key, [...(stepsBySection.get(key) ?? []), step]);
    }
    setSections(
      existingSections.map(sec => ({
        localId: crypto.randomUUID(),
        name: sec.name,
        surface: sec.surface,
        optional: sec.optional,
        notes: sec.notes,
        steps: (stepsBySection.get(sec.id) ?? []).map(s => ({
          localId: crypto.randomUUID(),
          step_name: s.step_name,
          paint_id: s.paint_id,
          notes: s.notes,
          painting_phase: s.painting_phase ?? null,
          tool: s.tool ?? null,
          technique: s.technique ?? null,
          dilution: s.dilution ?? null,
          time_estimate_minutes: s.time_estimate_minutes ?? null,
          step_photo_path: s.step_photo_path ?? null,
          alt_paint_id: s.alt_paint_id ?? null,
        })),
      }))
    );
  } else if (!recipe) {
    setSections([makeDraftSection("General")]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [recipe?.id, existingSections.length, existingSteps.length]);
```

The dependency array uses `.length` sentinels on both — matching the established pattern from the existing `existingSteps.length` sentinel in the current `RecipeFormSheet` (line 163).

### Submit Logic

The existing submit removes all steps and re-adds them (immutable-link pattern). With sections, extend this with section delete-and-recreate:

```
1. Update recipe row (unchanged)
2. Delete all existing sections for this recipe
   ON DELETE CASCADE on recipe_steps.section_id removes steps automatically
3. For each DraftSection (array order = order_index):
   a. createRecipeSection -> get new section_id
   b. For each DraftStep in section with paint_id != null:
      addRecipePaint with section_id = new section_id
4. Invalidate caches (see below)
```

This keeps the "remove all + re-add" pattern consistent with the existing step immutability decision. No surgical section update needed. The cascade from step 2 handles step deletion — do not manually call `removeRecipePaint` per step before deleting sections.

**Critical:** `section_id: number | null` must be added to `CreateRecipeStepInput` in `recipePaint.ts`. The `addRecipePaint` insert in `recipePaints.ts` must include it as nullable positional parameter `$13`.

---

## Cache Invalidation Strategy

### New Cache Key

```typescript
// In useRecipeSections.ts
export const RECIPE_SECTIONS_KEY = (recipeId: number) =>
  ["recipe-sections", recipeId] as const;
```

This is a per-recipe key, matching the `RECIPE_PAINTS_KEY(recipeId)` pattern. Sections are always fetched for a specific recipe, not globally, so a single top-level key is not appropriate here.

### Symmetry Rule: Full Invalidation Map

| Mutation | Keys to Invalidate |
|----------|-------------------|
| `useCreateRecipeSection` | `RECIPE_SECTIONS_KEY(recipeId)`, `STEP_COUNTS_KEY` |
| `useUpdateRecipeSection` | `RECIPE_SECTIONS_KEY(recipeId)` |
| `useDeleteRecipeSection` | `RECIPE_SECTIONS_KEY(recipeId)`, `RECIPE_PAINTS_KEY(recipeId)`, `STEP_COUNTS_KEY`, `RECIPE_SWATCH_KEY`, `RECIPE_AVAILABILITY_KEY` |
| `useReorderRecipeSections` | `RECIPE_SECTIONS_KEY(recipeId)` |
| `useDuplicateRecipe` (updated) | existing keys + `["recipe-sections"]` prefix |

**Note on delete:** When `deleteRecipeSection` removes a section, the `ON DELETE CASCADE` on `recipe_steps.section_id` removes all steps in that section. This means `RECIPE_PAINTS_KEY`, `RECIPE_SWATCH_KEY`, `STEP_COUNTS_KEY`, and `RECIPE_AVAILABILITY_KEY` all become stale. Delete invalidates more keys than create — this asymmetry is correct, not a violation of the symmetry rule.

### Form Submit Invalidation

`RecipeFormSheet.onSubmit` currently has an explicit `qc.invalidateQueries({ queryKey: ["recipe-step-counts"] })` call after the mutation sequence (line 301 in current file). This belt-and-suspenders call must be extended to also cover `RECIPE_SECTIONS_KEY(recipeId)` and `RECIPE_AVAILABILITY_KEY`.

### `useDuplicateRecipe` Update

Use React Query prefix match for sections — the same pattern already used for `["recipes", "by-unit"]`:

```typescript
qc.invalidateQueries({ queryKey: ["recipe-sections"] }); // prefix match, invalidates all
```

---

## `duplicateRecipe` Update

Current `duplicateRecipe` in `recipes.ts`:
1. Reads original recipe
2. Inserts copy
3. Reads original steps
4. Copies each step with `newRecipeId`

With sections it becomes:
1. Reads original recipe
2. Inserts copy -> `newRecipeId`
3. Reads original sections via `getRecipeSections(originalId)` (or raw SELECT)
4. For each section: insert with `newRecipeId` -> `newSectionId`; build map `oldSectionId -> newSectionId`
5. Reads original steps
6. For each step: insert with `newRecipeId` and `section_id = sectionIdMap.get(step.section_id ?? -1) ?? null`

The ID remap (steps 4-6) is the only non-trivial addition. Without it, copied steps would reference old section IDs belonging to the source recipe, creating orphaned FK references or wrong section groupings.

---

## DnD Architecture: Two Independent Contexts

Section-level DnD wraps step-level DnD. Both use `@dnd-kit`. The key constraint: **do not nest DndContext inside DndContext**. This is the known @dnd-kit anti-pattern where drag events bubble to both contexts.

Correct structure:
- `RecipeSectionList` owns one outer `DndContext` for section reordering (`items = section localIds`)
- `RecipeStepList` owns one inner `DndContext` per section for step reordering (`items = step localIds`)
- Each `DndContext` has its own `useSensors()` instance
- The existing `RecipeStepList` component is reused unchanged inside `RecipeSectionCard` — it already handles its own `DndContext`

`RecipeSectionList` renders:
```
<DndContext sensors={...} onDragEnd={handleSectionDragEnd}>
  <SortableContext items={sections.map(s => s.localId)} strategy={verticalListSortingStrategy}>
    {sections.map(sec => (
      <RecipeSectionCard
        key={sec.localId}
        section={sec}
        onStepChange={(steps) => updateSection(sec.localId, { steps })}
        onSectionChange={(patch) => updateSection(sec.localId, patch)}
        onRemove={() => removeSection(sec.localId)}
        onCreateNewPaint={openInlinePaintCreate}
      />
    ))}
  </SortableContext>
</DndContext>
```

`RecipeSectionCard` renders `RecipeStepList` with `steps={section.steps}` and `onChange={...}` — passing the section's step array and a handler that calls `updateSection(sec.localId, { steps: nextSteps })` on the parent. `RecipeStepList` is entirely unchanged.

---

## `RecipeDetailSheet` and Timeline Update

`RecipeDetailSheet` currently:
- Calls `useRecipePaints(recipe?.id)` to get steps
- Passes steps to `RecipeStepTimeline`

Updated behavior:
- Also calls `useRecipeSections(recipe?.id)`
- If `sections.length > 0`: render new `RecipeSectionedTimeline` component
- If `sections.length === 0`: render existing `RecipeStepTimeline` as fallback (backward compat for edge cases where migration produced no sections)

`RecipeSectionedTimeline` props:
```typescript
interface RecipeSectionedTimelineProps {
  sections: RecipeSection[];
  steps: RecipeStep[];        // all steps for the recipe; component groups by section_id
  paintMap: Map<number, Paint>;
  stepPhotoUrls?: Map<number, string>;
}
```

The component groups `steps` by `section_id` internally (a `Map<number, RecipeStep[]>` built with `useMemo`). This avoids requiring the parent to do the grouping and keeps `RecipeDetailSheet` simple.

`RecipeStepTimeline` is unchanged. It continues to be the fallback and may also be reused inside `RecipeSectionedTimeline` for each section's step list if desired.

---

## Suggested Build Order

### Phase 1 — Data Layer (foundation, no UI)

1. Migration 016: `recipe_sections` table + `ALTER TABLE recipe_steps ADD COLUMN section_id INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE`
2. Data migration SQL in same file: one default section per existing recipe (using `COALESCE(NULLIF(area, ''), 'General')`), backfill `section_id` on existing steps
3. `src/types/recipeSection.ts` — new types file
4. Add `section_id: number | null` to `RecipeStep` in `src/types/recipePaint.ts`
5. Add `section_id` to `addRecipePaint` insert + update `CreateRecipeStepInput` in `recipePaints.ts`
6. `src/db/queries/recipeSections.ts` — all 6 query functions
7. `src/hooks/useRecipeSections.ts` — all hooks + cache keys
8. Tests: migration data integrity, CRUD operations, `getStepCountsBySection` batch helper, verify existing `getStepCountsByRecipe` and `getRecipePaintAvailability` still work unchanged

**Rationale:** Data layer first lets Phase 2 read sections without touching the complex form. Migration mistakes are caught before any UI investment.

### Phase 2 — Read-Only UI

1. New `RecipeSectionedTimeline` component
2. Update `RecipeDetailSheet` to call `useRecipeSections(recipe?.id)` and conditionally render `RecipeSectionedTimeline` vs `RecipeStepTimeline`
3. Tests: detail sheet renders section headers and steps grouped correctly; falls back to flat timeline when no sections

**Rationale:** Read-only first is safer. No form submission path, no risk of data corruption during development. Validates query layer works before touching the complex form state.

### Phase 3 — Form UI

1. Add `DraftSection`, `makeDraftSection()`, `computeSectionOrderIndexes()` to `recipeSteps.ts`
2. `RecipeSectionForm.tsx` — inline name/surface editor (simple controlled inputs, no RHF)
3. `RecipeSectionCard.tsx` — collapsible card using `RecipeStepList` internally
4. `RecipeSectionList.tsx` — outer DnD for section reorder
5. Rewrite `RecipeFormSheet`: replace `DraftStep[]` state with `DraftSection[]`, update `useEffect` initialization, update `onSubmit` to delete-and-recreate sections
6. Auto-create one default "General" section for new recipes
7. Tests: add section, add step inside section, reorder sections, reorder steps within section, simple one-section recipe create round-trip, edit round-trip preserves sections and steps

**Rationale:** `RecipeStepRow` and `RecipeStepList` are unchanged — they slot directly into `RecipeSectionCard` without modification. The form rewrite is isolated to `RecipeFormSheet` + new section components.

### Phase 4 — Duplication + Regression

1. Update `duplicateRecipe` in `recipes.ts` with section copy + section ID remap for steps
2. Update `useDuplicateRecipe` to invalidate `["recipe-sections"]` prefix
3. Verify `getStepCountsByRecipe` still works (no change needed)
4. Verify `getRecipePaintAvailability` still works (no change needed)
5. Verify `getRecipeSwatchColors` still works (no change needed)
6. Verify `LogSessionSheet` step selector works (reads `useRecipePaints` — steps still have `recipe_id`, selector unaffected)
7. Full regression pass
8. Tests: duplicate copies sections + steps with correct `section_id` remapping; no orphaned section references

---

## Anti-Patterns to Avoid

### Nested DndContext

**What people do:** Wrap `RecipeSectionList`'s `DndContext` around `RecipeStepList`'s `DndContext`
**Why it breaks:** @dnd-kit `DndContext` is not designed for nesting — drag events bubble to both contexts causing incorrect collision detection and reordering bugs
**Do this instead:** Two independent `DndContext` instances; step list `DndContext` lives entirely inside `RecipeSectionCard` as an independent context unrelated to the section-level one

### useFieldArray for DraftSection

**What people do:** Use RHF `useFieldArray` to get free add/remove/reorder for the sections array
**Why it breaks:** RHF injects its own `id` field onto each item; `@dnd-kit/useSortable` also needs an `id` prop from the same object — they collide (documented as RHF issue #10607). This is the same reason the existing step form uses manual `useState` instead of `useFieldArray`.
**Do this instead:** `useState<DraftSection[]>` with manual `addSection`, `removeSection`, `updateSection` handlers — exactly mirroring how steps are currently managed in `RecipeFormSheet`

### Manually Deleting Steps Before Deleting a Section

**What people do:** On section delete, call `removeRecipePaint` for each step in the section, then `deleteRecipeSection`
**Why it's wrong:** `ON DELETE CASCADE` on `recipe_steps.section_id` handles step deletion automatically. Manually deleting steps first creates N+1 mutations and leaves the cache partially stale if any individual mutation fails.
**Do this instead:** Delete the section; trust the cascade; invalidate `RECIPE_PAINTS_KEY(recipeId)` in `useDeleteRecipeSection` so the step cache refreshes cleanly

### Adding Section Joins to Batch Queries

**What people do:** Add a JOIN to `recipe_sections` inside `getStepCountsByRecipe`, `getRecipeSwatchColors`, or `getRecipePaintAvailability` to "support" sections
**Why it's wrong:** All three batch queries operate at the recipe level (`GROUP BY recipe_id`). Adding section joins increases complexity, risks introducing bugs, and serves no use case — the recipe card UI still wants recipe-level totals.
**Do this instead:** Keep existing batch queries unchanged. Add a separate `getStepCountsBySection()` only for the section card header "N steps" label.

### Forgetting the section_id Remap in duplicateRecipe

**What people do:** Copy sections to the new recipe, then copy steps with `section_id = originalStep.section_id`
**Why it breaks:** `originalStep.section_id` references a section belonging to the source recipe. The new recipe's sections have different IDs. Steps end up pointing at sections that belong to a different recipe — or, after the source recipe is deleted, orphaned FKs.
**Do this instead:** Build a `Map<oldSectionId, newSectionId>` during the section copy loop. Use `sectionIdMap.get(step.section_id ?? -1) ?? null` when inserting each copied step.

---

## Integration Boundaries: Unchanged Consumers

These components read recipe data but require no changes for sections:

| Component | Why Unchanged |
|-----------|---------------|
| `RecipeCard.tsx` / `RecipeCardGrid.tsx` | Reads recipe-level metadata and batch availability — both unchanged |
| `RecipesPage.tsx` | 8-dimension filter operates on `PaintingRecipe[]` — no section data involved |
| `LogSessionSheet` | Selects `recipe_id` + `recipe_step_id` — steps still exist and still have `recipe_id` |
| `KanbanCard` enrichment | Shows recipe name only |
| `CurrentFocusCard` | Shows recipe name only |
| `usePaints.ts` mutations | Invalidate `RECIPE_AVAILABILITY_KEY` — no section awareness needed |

---

## Sources

- `src/features/recipes/RecipeFormSheet.tsx` (read 2026-05-08)
- `src/features/recipes/recipeSteps.ts` (read 2026-05-08)
- `src/features/recipes/RecipeStepList.tsx` (read 2026-05-08)
- `src/features/recipes/RecipeDetailSheet.tsx` (read 2026-05-08)
- `src/features/recipes/RecipeStepTimeline.tsx` (read 2026-05-08)
- `src/db/queries/recipePaints.ts` (read 2026-05-08)
- `src/db/queries/recipes.ts` (read 2026-05-08)
- `src/hooks/useRecipePaints.ts` (read 2026-05-08)
- `src/hooks/useRecipes.ts` (read 2026-05-08)
- `src/types/recipePaint.ts` (read 2026-05-08)
- `.planning/milestones/v0.2.7-hierarchical-workflows-context.md` (read 2026-05-08)

---

*Architecture research for: HobbyForge v0.2.7 Hierarchical Recipe Sections*
*Researched: 2026-05-08*
*Confidence: HIGH — all findings based on direct codebase reads, zero training-data assumptions*
