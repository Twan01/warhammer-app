# Phase 75: Transactional Recipe Graph Save - Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 2 (1 modified query file, 1 modified component)
**Analogs found:** 2 / 2

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/queries/recipes.ts` (add `saveRecipeGraph`) | query / service | CRUD + batch | `src/db/queries/recipes.ts` — `duplicateRecipe()` lines 117–205 | exact |
| `src/features/recipes/RecipeFormSheet.tsx` (refactor `onSubmit`) | component | request-response | `src/features/recipes/RecipeFormSheet.tsx` — existing `onSubmit` lines 215–415 | exact (self-analog) |
| `tests/painting/saveRecipeGraph.test.ts` (new test file) | test | unit | `tests/painting/duplicateRecipe.test.ts` | exact |

---

## Pattern Assignments

### `src/db/queries/recipes.ts` — add `saveRecipeGraph()`

**Analog:** `src/db/queries/recipes.ts` — `duplicateRecipe()` (lines 117–205)

**Imports pattern** (lines 1–4 — already present, no new imports needed):
```typescript
import { getDb } from "@/db/client";
import type { PaintingRecipe, CreateRecipeInput, UpdateRecipeInput } from "@/types/recipe";
import type { RecipeStep } from "@/types/recipePaint";
import type { RecipeSection } from "@/types/recipeSection";
```
Additional imports `saveRecipeGraph` will need (append to existing imports block):
```typescript
import type { DraftSection } from "@/features/recipes/recipeSection";
import type { RecipeFormValues } from "@/features/recipes/recipeSchema";
import { computeSectionDiff, computeStepDiff, buildSectionIdMap } from "@/features/recipes/recipeDiff";
import { computeOrderIndex } from "@/features/recipes/recipeSteps";
```

**Transaction skeleton pattern** (from `duplicateRecipe`, lines 127–204 — copy verbatim):
```typescript
export async function saveRecipeGraph(
  recipeId: number | null,
  formValues: RecipeFormValues,
  sections: DraftSection[],
  existingSections: RecipeSection[],
  existingSteps: RecipeStep[],
): Promise<number> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    // ... all db.execute calls here (create or edit path) ...
    await db.execute("COMMIT", []);
    return finalRecipeId;
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}
```

**Create path — INSERT recipe row** (inline SQL from `createRecipe`, lines 17–55):
```typescript
// create path: recipeId === null
const result = await db.execute(
  `INSERT INTO painting_recipes (
     name, faction_id, unit_id, area,
     primer, basecoat, shade, layer, highlight, glaze_filter,
     weathering, technical, basing, notes, tutorial_link,
     style, surface, effect, difficulty, estimated_minutes, result_photo_path
   ) VALUES (
     $1, $2, $3, $4,
     $5, $6, $7, $8, $9, $10,
     $11, $12, $13, $14, $15,
     $16, $17, $18, $19, $20, $21
   )`,
  [
    formValues.name, formValues.faction_id, formValues.unit_id, formValues.area,
    null, null, null, null, null, null,  // primer…glaze_filter: fixed-text columns left null
    null, null, null,                    // weathering, technical, basing: null
    formValues.notes, formValues.tutorial_link || null,
    formValues.style, formValues.surface, formValues.effect, formValues.difficulty,
    formValues.estimated_minutes, formValues.result_photo_path,
  ]
);
const finalRecipeId = result.lastInsertId ?? 0;
```

**Edit path — UPDATE recipe row** (inline SQL from `updateRecipe`):
```typescript
// edit path: recipeId !== null
await db.execute(
  `UPDATE painting_recipes
   SET name = $2, faction_id = $3, unit_id = $4, area = $5,
       notes = $6, tutorial_link = $7, style = $8, surface = $9,
       effect = $10, difficulty = $11, estimated_minutes = $12,
       result_photo_path = $13, updated_at = datetime('now')
   WHERE id = $1`,
  [
    recipeId,
    formValues.name, formValues.faction_id, formValues.unit_id, formValues.area,
    formValues.notes, formValues.tutorial_link || null,
    formValues.style, formValues.surface, formValues.effect,
    formValues.difficulty, formValues.estimated_minutes, formValues.result_photo_path,
  ]
);
const finalRecipeId = recipeId;
```

**DELETE removed sections** (inline SQL from `deleteRecipeSection`, `recipeSections.ts` line 86):
```typescript
// Phase 2 — DELETE removed sections (ON DELETE CASCADE removes their steps)
const { toDelete: sectionsToDelete, toUpdate: sectionsToUpdate, toInsert: sectionsToInsert }
  = computeSectionDiff(sections, existingSections);

for (const id of sectionsToDelete) {
  await db.execute("DELETE FROM recipe_sections WHERE id = $1", [id]);
}
```

**UPDATE existing sections** (inline SQL from `updateRecipeSection`, `recipeSections.ts` lines 52–77):
```typescript
// Phase 3 — UPDATE existing sections (order_index = array position)
for (let i = 0; i < sections.length; i++) {
  const sec = sectionsToUpdate.find((s) => s === sections[i]);
  if (!sec) continue;
  await db.execute(
    `UPDATE recipe_sections
     SET name = COALESCE($2, name),
         surface = $3,
         optional = COALESCE($4, optional),
         order_index = COALESCE($5, order_index),
         notes = $6,
         section_type = $7,
         technique = $8,
         execution_mode = $9,
         applies_to = $10,
         updated_at = datetime('now')
     WHERE id = $1`,
    [
      sec.dbId,
      sec.name ?? null, sec.surface ?? null, sec.optional ?? null,
      i,
      sec.notes ?? null, sec.section_type ?? null, sec.technique ?? null,
      sec.execution_mode ?? null, sec.applies_to ?? null,
    ]
  );
}
```

**INSERT new sections + extend sectionIdMap** (inline SQL from `createRecipeSection`, `recipeSections.ts` lines 24–42; map extension pattern from `duplicateRecipe` lines 161–168):
```typescript
// Phase 4 — seed sectionIdMap from survivors, then INSERT new sections
const sectionIdMap = buildSectionIdMap(sections);
for (let i = 0; i < sections.length; i++) {
  const sec = sections[i];
  if (sec.dbId === null) {
    const sectionResult = await db.execute(
      `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes, section_type, technique, execution_mode, applies_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        finalRecipeId, sec.name, sec.surface ?? null, sec.optional,
        i, sec.notes ?? null,
        sec.section_type ?? null, sec.technique ?? null,
        sec.execution_mode ?? null, sec.applies_to ?? null,
      ]
    );
    sectionIdMap.set(sec.localId, sectionResult.lastInsertId ?? 0);
  }
}
```

**DELETE removed steps** (inline SQL from `removeRecipePaint`, `recipePaints.ts` line 36):
```typescript
// Phase 5 — Step diff and delete
const { toDelete: stepsToDelete, toUpdate: stepsToUpdate, toInsert: stepsToInsert }
  = computeStepDiff(sections, existingSteps);

for (const id of stepsToDelete) {
  await db.execute("DELETE FROM recipe_steps WHERE id = $1", [id]);
}
```

**UPDATE existing steps** (inline SQL from `updateRecipeStep`, `recipePaints.ts` lines 38–63):
```typescript
for (const s of stepsToUpdate) {
  await db.execute(
    `UPDATE recipe_steps
     SET paint_id = $2, step_name = $3, order_index = $4, notes = $5,
         painting_phase = $6, tool = $7, technique = $8, dilution = $9,
         time_estimate_minutes = $10, step_photo_path = $11, alt_paint_id = $12,
         section_id = $13
     WHERE id = $1`,
    [
      s.dbId,
      s.paint_id ?? null, s.step_name, s.order_index,
      s.notes ?? null, s.painting_phase ?? null, s.tool ?? null,
      s.technique ?? null, s.dilution ?? null, s.time_estimate_minutes ?? null,
      s.step_photo_path ?? null, s.alt_paint_id ?? null,
      sectionIdMap.get(s.sectionLocalId) ?? null,
    ]
  );
}
```
Note: `order_index` on each `FlatDraftStep` must be computed before this loop. Use `computeOrderIndex` per section before flattening, or re-index by iterating `sections` in order rather than using the flat `stepsToUpdate` list directly.

**INSERT new steps** (inline SQL from `addRecipePaint`, `recipePaints.ts` lines 15–32):
```typescript
for (const s of stepsToInsert) {
  await db.execute(
    `INSERT INTO recipe_steps
     (recipe_id, paint_id, step_name, order_index, notes,
      painting_phase, tool, technique, dilution, time_estimate_minutes,
      step_photo_path, alt_paint_id, section_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      finalRecipeId, s.paint_id, s.step_name, s.order_index,
      s.notes ?? null, s.painting_phase ?? null, s.tool ?? null,
      s.technique ?? null, s.dilution ?? null, s.time_estimate_minutes ?? null,
      s.step_photo_path ?? null, s.alt_paint_id ?? null,
      sectionIdMap.get(s.sectionLocalId) ?? null,
    ]
  );
}
```

**Error handling pattern** (from `duplicateRecipe` lines 201–204 — copy verbatim):
```typescript
} catch (e) {
  await db.execute("ROLLBACK", []);
  throw e;
}
```

---

### `src/features/recipes/RecipeFormSheet.tsx` — refactor `onSubmit`

**Analog:** `src/features/recipes/RecipeFormSheet.tsx` — existing `onSubmit` lines 215–415 (self-analog: the code being replaced)

**Imports to remove** (these mutation hooks are no longer called in `onSubmit`):
```typescript
// REMOVE if no other usage in the component after refactor:
import { useCreateRecipe, useUpdateRecipe } from "@/hooks/useRecipes";
import { useAddRecipePaint, ... } from "@/hooks/useRecipePaints";
// REMOVE direct CRUD import:
import { createRecipeSection, deleteRecipeSection, updateRecipeSection } from "@/db/queries/recipeSections";
import { updateRecipeStep, removeRecipePaint as removeRecipeStep } from "@/db/queries/recipePaints";
```

**Import to add:**
```typescript
import { saveRecipeGraph } from "@/db/queries/recipes";
```

**Imports to keep** (used by other hooks / non-submit logic):
```typescript
import { RECIPES_KEY, RECIPE_KEY } from "@/hooks/useRecipes";
import {
  RECIPE_PAINTS_KEY,
  STEP_COUNTS_KEY,
  RECIPE_AVAILABILITY_KEY,
  RECIPE_SWATCH_KEY,
} from "@/hooks/useRecipePaints";
import { RECIPE_SECTIONS_KEY, SECTION_COUNTS_KEY } from "@/hooks/useRecipeSections";
```

**Refactored `onSubmit`** (replaces lines 215–415):
```typescript
async function onSubmit(values: RecipeFormValues) {
  try {
    const finalRecipeId = await saveRecipeGraph(
      recipe?.id ?? null,
      values,
      sections,
      existingSections,
      existingSteps,
    );

    // Batch invalidation — once after transaction succeeds (D-08)
    qc.invalidateQueries({ queryKey: RECIPES_KEY });
    qc.invalidateQueries({ queryKey: RECIPE_KEY(finalRecipeId) });
    qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(finalRecipeId) });
    qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(finalRecipeId) });
    qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
    qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
    qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
    qc.invalidateQueries({ queryKey: SECTION_COUNTS_KEY });
    qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });
    qc.invalidateQueries({ queryKey: ["recipes", "by-unit"] });

    toast.success(isEdit ? "Recipe saved." : "Recipe created.");
    onClose();
  } catch {
    toast.error("Failed to save recipe. Changes were not saved.");
    // Form stays open; data intact — user can retry (D-04)
  }
}
```

**`useQueryClient` pattern** (already present at line 120 — no change):
```typescript
const qc = useQueryClient();
```

---

### `tests/painting/saveRecipeGraph.test.ts` (new test file)

**Analog:** `tests/painting/duplicateRecipe.test.ts` (entire file — exact structural match)

**Mock setup pattern** (from `duplicateRecipe.test.ts` lines 6–13 — copy verbatim):
```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import { saveRecipeGraph } from "@/db/queries/recipes";
```

**Fixture pattern** (from `duplicateRecipe.test.ts` lines 20–115):
```typescript
// Reuse RecipeSection and RecipeStep fixture shapes from duplicateRecipe.test.ts
// Add DraftSection fixture with localId, dbId, steps fields
import type { DraftSection } from "@/features/recipes/recipeSection";
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";
import type { RecipeFormValues } from "@/features/recipes/recipeSchema";
```

**`beforeEach` mock sequencing pattern** (from `duplicateRecipe.test.ts` lines 117–133):
```typescript
beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
  // executeMock call order: BEGIN, [recipe INSERT or UPDATE], [section ops], [step ops], COMMIT
  executeMock
    .mockResolvedValueOnce(undefined)             // BEGIN TRANSACTION
    .mockResolvedValueOnce({ lastInsertId: 100 }) // recipe INSERT (create path)
    .mockResolvedValueOnce({ lastInsertId: 200 }) // section INSERT
    .mockResolvedValue({ lastInsertId: 300 });     // remaining step INSERTs + COMMIT
});
```

**ROLLBACK test pattern** (from `duplicateRecipe.test.ts` lines 231–236, adapted):
```typescript
it("calls ROLLBACK when an execute call throws", async () => {
  executeMock
    .mockResolvedValueOnce(undefined)      // BEGIN
    .mockResolvedValueOnce({ lastInsertId: 100 }) // recipe INSERT
    .mockRejectedValueOnce(new Error("FK violation")); // section INSERT fails

  await expect(saveRecipeGraph(null, FORM_VALUES, DRAFT_SECTIONS, [], [])).rejects.toThrow("FK violation");

  const calls = executeMock.mock.calls.map(([sql]) => sql);
  expect(calls).toContain("ROLLBACK");
  expect(calls).not.toContain("COMMIT");
});
```

---

## Shared Patterns

### Transaction wrapper (BEGIN / COMMIT / ROLLBACK)
**Source:** `src/db/queries/recipes.ts` — `duplicateRecipe()` lines 127–204
**Apply to:** `saveRecipeGraph()` in `src/db/queries/recipes.ts`
```typescript
const db = await getDb();
await db.execute("BEGIN TRANSACTION", []);
try {
  // ... all db.execute calls ...
  await db.execute("COMMIT", []);
  return result;
} catch (e) {
  await db.execute("ROLLBACK", []);
  throw e;
}
```

### Reorder transaction (secondary reference)
**Source:** `src/db/queries/recipeSections.ts` — `reorderRecipeSections()` lines 93–110
**Pattern note:** Same BEGIN/try/COMMIT/catch/ROLLBACK shape on a simpler loop body — confirms the pattern is consistent project-wide.

### React Query batch invalidation
**Source:** `src/hooks/useRecipes.ts` lines 37–56 + `src/hooks/useRecipeSections.ts` lines 51–72
**Apply to:** `RecipeFormSheet.tsx` `onSubmit` after `saveRecipeGraph()` resolves
**Complete key list** (derived from both hook files' `onSuccess` blocks):
```typescript
qc.invalidateQueries({ queryKey: RECIPES_KEY });                      // useRecipes.ts:38
qc.invalidateQueries({ queryKey: RECIPE_KEY(finalRecipeId) });        // useRecipes.ts:51
qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(finalRecipeId) }); // useRecipeSections.ts:66
qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(finalRecipeId) }); // useRecipeSections.ts:67
qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });                  // useRecipeSections.ts:68
qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });          // useRecipeSections.ts:69
qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });                // useRecipeSections.ts:70
qc.invalidateQueries({ queryKey: SECTION_COUNTS_KEY });               // useRecipeSections.ts — getSectionCountsByRecipe
qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });            // useRecipes.ts:39
qc.invalidateQueries({ queryKey: ["recipes", "by-unit"] });           // useRecipes.ts:40
```

### DB mock pattern for tests
**Source:** `tests/painting/duplicateRecipe.test.ts` lines 6–13
**Apply to:** `tests/painting/saveRecipeGraph.test.ts`
```typescript
vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));
```

### sectionIdMap extension after INSERT
**Source:** `src/db/queries/recipes.ts` — `duplicateRecipe()` lines 159–168
**Apply to:** `saveRecipeGraph()` INSERT new sections loop
```typescript
// After each section INSERT, extend the map so subsequent step INSERTs resolve correctly:
sectionIdMap.set(sec.localId, sectionResult.lastInsertId ?? 0);
```

---

## No Analog Found

None — all files have close or exact analogs in the codebase.

---

## Critical Anti-Patterns (do not copy)

| Anti-Pattern | Source to Avoid | Why |
|--------------|-----------------|-----|
| Calling `createRecipeSection()` / `updateRecipeStep()` inside `saveRecipeGraph()` | `RecipeFormSheet.tsx` lines 242–331 (current onSubmit) | Each helper calls `getDb()` independently — operations run outside the transaction |
| Calling `addRecipePaint.mutateAsync()` inside `onSubmit` after migration | `RecipeFormSheet.tsx` lines 315–330 | Triggers per-operation cache invalidation; bypasses batched invalidation (D-08) |
| Nested `BEGIN TRANSACTION` | Any path that calls a helper that also issues BEGIN | SQLite returns an error; tauri-plugin-sql cannot use savepoints |

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/features/recipes/`, `src/hooks/`, `tests/painting/`
**Files scanned:** 9
**Pattern extraction date:** 2026-05-14
