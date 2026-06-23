---
phase: 143-apply-flow-slot-fill-system
reviewed: 2026-06-22T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - src/db/queries/recipeTechniqueInstances.ts
  - src/db/queries/recipeTechniqueSlotMaps.ts
  - src/db/queries/recipes.ts
  - src/features/recipes/EditColoursDialog.tsx
  - src/features/recipes/PaintCombobox.tsx
  - src/features/recipes/RecipeDetailSheet.tsx
  - src/features/recipes/RecipeSectionCard.tsx
  - src/features/recipes/RecipeSectionList.tsx
  - src/features/recipes/RecipeStepList.tsx
  - src/features/recipes/RecipeStepTimeline.tsx
  - src/features/recipes/RecipesPage.tsx
  - src/features/recipes/SectionedTimeline.tsx
  - src/features/recipes/SlotFillDialog.tsx
  - src/features/recipes/SlotFillRow.tsx
  - src/features/recipes/TechniquePickerCard.tsx
  - src/features/recipes/TechniquePickerDialog.tsx
  - src/features/recipes/TechniqueSectionBadge.tsx
  - src/features/recipes/recipeSection.ts
  - src/hooks/useSlotResolutionMap.ts
  - src/hooks/useTechniqueInstances.ts
findings:
  critical: 3
  warning: 3
  info: 3
  total: 9
status: issues_found
---

# Phase 143: Code Review Report

**Reviewed:** 2026-06-22
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

This phase ships the apply-flow and slot-fill system for the Technique Library (v0.7.0). The SQL JOIN in `getSlotResolutionMap` is correctly keyed on `technique_step_id` against the instance's slot map, and the SC#5 guards in `saveRecipeGraph` correctly protect technique-owned steps from both DELETE and UPDATE. The `effectivePaintId` spine is clean and well-tested. However, three blockers were found: (1) a Map key collision in `getSlotResolutionMap` that silently corrupts paint resolution when the same technique is applied twice; (2) `duplicateRecipe` silently drops all technique materialisation data (instances, slot maps, and `technique_step_id` linkage) making duplicated recipes appear broken; (3) the missing-paints wishlist in `RecipeDetailSheet` bypasses `effectivePaintId` and always ignores technique-owned steps.

---

## Critical Issues

### CR-01: `getSlotResolutionMap` Map key collision corrupts paint resolution under SLOT-04

**File:** `src/db/queries/recipeTechniqueSlotMaps.ts:59-63`

**Issue:** When the same technique is applied twice to a recipe (SLOT-04), each application materialises its own `recipe_steps` rows, but both sets of rows carry identical `technique_step_id` values (they both point to the same source `technique_steps` rows). The SQL JOIN is correct — it routes each step through its own instance's slot map via `sm.instance_id = rti.id` — so each returned row has the correct per-instance `paint_id`. However, the JS loop then calls `map.set(row.technique_step_id, row.paint_id)` for every row. When two rows share the same `technique_step_id` (from two different applications of the same technique), the second write silently overwrites the first. The resulting Map contains only one paint for that `technique_step_id`, and whichever instance is iterated last "wins." Steps from the first application then resolve to the wrong paint.

This directly breaks the SLOT-03 / SLOT-04 invariants (that each instance's slot map is independent) at the UI paint-resolution layer, even though the DB data is stored correctly.

**Root cause:** The Map is keyed on `technique_step_id` alone, but `technique_step_id` is only unique per-technique, not per-recipe-application. The correct key must incorporate the instance identity.

**Fix:** Key the map on `recipe_steps.id` (the materialised step's own PK, which is unique per application), and change `effectivePaintId` to accept a `Map<number, number|null>` keyed on `recipe_step_id` instead of `technique_step_id`. Alternatively, key the resolution map on `(instance_id, technique_step_id)` and have `effectivePaintId` also receive the step's `section_id` so the instance can be resolved. The cleanest change is:

```sql
-- Change the SELECT to return recipe_steps.id as the key:
SELECT rs.id AS recipe_step_id, sm.paint_id
FROM recipe_steps rs
JOIN recipe_sections rsec ON rsec.id = rs.section_id
JOIN recipe_technique_instances rti ON rti.id = rsec.technique_instance_id
JOIN technique_steps ts ON ts.id = rs.technique_step_id
LEFT JOIN recipe_technique_slot_maps sm
  ON sm.instance_id = rti.id AND sm.slot_id = ts.colour_slot_id
WHERE rs.recipe_id = $1 AND rs.technique_step_id IS NOT NULL
```

```ts
// getSlotResolutionMap returns Map<recipe_step_id, paint_id|null>
// effectivePaintId signature changes to accept recipe_step.id as lookup key
// All consumers (RecipeStepTimeline, SectionedTimeline) pass step.id instead of technique_step_id
```

Note: this is a cross-cutting change that also touches `effectivePaintId`, its type exports, and all callers. The `effectivePaintId.test.ts` tests will need updating to use `recipe_step_id` as the map key.

---

### CR-02: `duplicateRecipe` silently drops all technique materialisation data

**File:** `src/db/queries/recipes.ts:188-205`

**Issue:** When duplicating a recipe that has applied techniques, `duplicateRecipe` copies `recipe_sections` rows but does NOT copy `technique_instance_id` (the column is absent from the INSERT at line 171). It also copies `recipe_steps` rows but does NOT copy `technique_step_id` (absent from the INSERT at line 192). No `recipe_technique_instances` rows are created for the duplicate, and no `recipe_technique_slot_maps` rows are copied.

The result is that the duplicated recipe appears to have all the right sections and step names, but:
- All sections lose their `technique_instance_id`, so technique locking and badges vanish.
- All materialised steps lose their `technique_step_id`, so `effectivePaintId` falls through to `step.paint_id`, which is `null` — every technique step displays as "(no paint linked)".
- The slot fills are not copied, so even if the user re-applies the technique, they must refill all slots.

This is silent data loss triggered by a routine user action (duplicate a recipe).

**Fix:** `duplicateRecipe` must also:
1. Copy `recipe_technique_instances` rows (one per original instance), recording the old→new instance ID mapping.
2. Copy `recipe_technique_slot_maps` rows, remapping `instance_id` to the new IDs.
3. Include `technique_instance_id` in the section INSERT (remapped via instance ID map).
4. Include `technique_step_id` in the step INSERT (no remapping needed — it references the same source `technique_steps` rows).

```ts
// After copying sections into sectionIdMap, also copy instances:
const instanceIdMap = new Map<number, number>(); // old -> new
const origInstances = await db.select<RecipeTechniqueInstance[]>(
  "SELECT * FROM recipe_technique_instances WHERE recipe_id = $1",
  [originalId]
);
for (const inst of origInstances) {
  const r = await db.execute(
    "INSERT INTO recipe_technique_instances (recipe_id, technique_id) VALUES ($1, $2)",
    [newRecipeId, inst.technique_id]
  );
  instanceIdMap.set(inst.id, r.lastInsertId ?? 0);
}
// Copy slot maps...
// Include technique_instance_id in section INSERT (using instanceIdMap)
// Include technique_step_id in step INSERT
```

---

### CR-03: `missingPaints` in `RecipeDetailSheet` reads `step.paint_id` directly, bypassing `effectivePaintId`

**File:** `src/features/recipes/RecipeDetailSheet.tsx:147-151`

**Issue:** The `missingPaints` memo reads `step.paint_id` directly to identify paints that need to be added to the wishlist:

```ts
const missingPaints = useMemo(() => {
  return steps
    .filter((s): s is typeof s & { paint_id: number } => s.paint_id != null && s.paint_id !== 0)
    .map((s) => paintMap.get(s.paint_id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined && isPaintMissing(p));
}, [steps, paintMap]);
```

For technique-owned steps, `paint_id` is always `null` (enforced by `applyTechnique`). The filter `s.paint_id != null` therefore always excludes every technique-owned step. If a technique's slot is filled with a paint the user does not own, that paint is silently excluded from the missing-paint wishlist calculation. The `slotMap` is already loaded in the component but is never used here.

**Fix:** Use `effectivePaintId` to resolve each step's effective paint before the filter:

```ts
import { effectivePaintId } from "@/lib/effectivePaintId";

const missingPaints = useMemo(() => {
  const resolvedMap = slotMap ?? new Map();
  return steps
    .map((s) => {
      const resolvedId = effectivePaintId(s, resolvedMap);
      return resolvedId != null && resolvedId !== 0 ? paintMap.get(resolvedId) : undefined;
    })
    .filter((p): p is NonNullable<typeof p> => p !== undefined && isPaintMissing(p));
}, [steps, paintMap, slotMap]);
```

Note: this finding's severity depends on CR-01 — if CR-01 is fixed and the map key changes to `recipe_step_id`, `effectivePaintId`'s signature will change and this fix must align with that new signature.

---

## Warnings

### WR-01: `useUpdateSlotMap` does not invalidate `SLOT_MAP_BY_INSTANCE_KEY`

**File:** `src/hooks/useTechniqueInstances.ts:114-124`

**Issue:** After `useUpdateSlotMap` completes, it invalidates `SLOT_RESOLUTION_MAP_KEY`, `RECIPE_PAINTS_KEY`, `RECIPE_SWATCH_KEY`, and `RECIPE_AVAILABILITY_KEY`, but does NOT invalidate `SLOT_MAP_BY_INSTANCE_KEY(variables.instanceId)`.

`useSlotMapByInstance` is the query that pre-populates the `EditColoursDialog` form. If the user edits colours, saves, then immediately re-opens the dialog for the same instance in the same session, the prefill will show the stale (pre-save) slot fills until the query's `staleTime` (5 min) expires. The user will see their new fills reverting to old values visually, even though the DB is correct.

**Fix:**

```ts
// In useUpdateSlotMap onSuccess:
import { SLOT_MAP_BY_INSTANCE_KEY } from "@/hooks/useSlotResolutionMap";

onSuccess: (_, variables) => {
  qc.invalidateQueries({ queryKey: SLOT_RESOLUTION_MAP_KEY(variables.recipeId) });
  qc.invalidateQueries({ queryKey: SLOT_MAP_BY_INSTANCE_KEY(variables.instanceId) }); // ADD
  qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(variables.recipeId) });
  qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
},
```

---

### WR-02: `applyTechnique` uses `lastInsertId ?? 0` — silent zero-ID on unexpected driver behaviour

**File:** `src/db/queries/recipeTechniqueInstances.ts:65`

**Issue:** `const instanceId = instanceResult.lastInsertId ?? 0;` — if `lastInsertId` is `undefined` or `null` (which the tauri-plugin-sql types permit), `instanceId` becomes `0`. All subsequent INSERTs that reference `instanceId` as a FK (`recipe_sections.technique_instance_id`, `recipe_technique_slot_maps.instance_id`) will then attempt to reference row `0`, which does not exist, causing FK constraint failures. These failures will bubble up as a thrown error from `db.execute()`, but the root cause (zero ID) will not be obvious from the error message.

The same pattern (`?? 0`) appears at lines 92 and 159 for section and new-recipe IDs. The section fallback is similarly dangerous because a zero section ID would cause recipe steps to be inserted with a nonexistent `section_id`.

**Fix:** Throw explicitly on a missing ID instead of falling back to `0`:

```ts
const instanceId = instanceResult.lastInsertId;
if (!instanceId) throw new Error("applyTechnique: INSERT recipe_technique_instances did not return lastInsertId");
```

Apply the same pattern to the section INSERT result at line 92.

---

### WR-03: `getSlotResolutionMap` JOIN excludes steps in technique sections that lack a `colour_slot_id`

**File:** `src/db/queries/recipeTechniqueSlotMaps.ts:48-56`

**Issue:** The JOIN chain includes `JOIN technique_steps ts ON ts.id = rs.technique_step_id`. This is an INNER JOIN, not a LEFT JOIN. A `technique_steps` row where `colour_slot_id IS NULL` (i.e., the step has no colour slot — it uses a fixed paint or no paint) will still match this JOIN and appear in the result set. However, the subsequent `LEFT JOIN recipe_technique_slot_maps sm ON sm.slot_id = ts.colour_slot_id` will join on `NULL = NULL`, which in SQL evaluates to UNKNOWN (not TRUE), so the LEFT JOIN always returns `sm.paint_id = NULL` for slotless steps.

This is not a crash but it means technique-owned steps with `colour_slot_id IS NULL` are included in the resolution map keyed to their `technique_step_id` with a `null` paint, which is then stored in the map. `effectivePaintId` will return `null` for these steps (correct behaviour), but the map is larger than necessary and — under the current CR-01 bug where `technique_step_id` is the key — these null entries can mask legitimate fills from a second application of the same technique.

After CR-01 is fixed (using `recipe_step_id` as the map key), this is no longer a correctness issue, but the JOIN should still be reviewed for clarity:

```sql
-- Consider adding a filter or comment to clarify slot-less steps are intentionally included:
WHERE rs.recipe_id = $1
  AND rs.technique_step_id IS NOT NULL
  -- (ts.colour_slot_id IS NULL means no slot; sm.paint_id will be NULL via LEFT JOIN)
```

---

## Info

### IN-01: `_instanceTechniqueNameMap` prop in `TechniqueControls` is declared but never read

**File:** `src/features/recipes/RecipeSectionList.tsx:46,62`

**Issue:** `TechniqueControls` accepts `instanceTechniqueNameMap: Map<number, string>` in its props interface, and the parent passes a value, but the parameter is prefixed `_instanceTechniqueNameMap` inside the component body and the value is never used. The prop serves no purpose.

**Fix:** Remove the prop from `TechniqueControlsProps` and from the call site, or use it if it was intended for future functionality.

---

### IN-02: `_sections` and `_readOnly` are destructured but unused

**Files:**
- `src/features/recipes/RecipeSectionList.tsx:111` — `_sections` in `TechniqueNameResolver`
- `src/features/recipes/RecipeStepTimeline.tsx:25` — `_readOnly` in `RecipeStepTimeline`

**Issue:** Both parameters are received and immediately prefixed with `_` to silence TypeScript's `noUnusedLocals` check, but neither is ever read. With strict TS on, these are only tolerated because of the underscore prefix convention.

**Fix:** For `_sections` in `TechniqueNameResolver`, the prop was likely included for future dependency tracking but serves no purpose now — remove it. For `_readOnly` in `RecipeStepTimeline`, the `readOnly` prop is documented in the JSDoc as affecting rendering, but the component never uses the value; if the feature is intended, implement it; if not, remove the prop.

---

### IN-03: `duplicateRecipe` section INSERT omits `technique_instance_id` silently (pre-existing gap exposed by Phase 143)

**File:** `src/db/queries/recipes.ts:171-176`

**Issue:** The section INSERT in `duplicateRecipe` lists ten columns but omits `technique_instance_id` (the column added in migration 051). This was a pre-existing gap that became a data-loss bug in Phase 143 (covered as CR-02 above), but is separately noted here because the omission of `technique_step_id` from the step INSERT at line 192 is in the same category. Both INSERT statements need a column audit whenever a new migration adds nullable columns to `recipe_sections` or `recipe_steps`.

**Fix:** Add a code comment at both INSERT sites flagging them as requiring a column audit after each schema migration:

```ts
// AUDIT: When migration adds columns to recipe_sections, add them here too.
// Currently omitted: technique_instance_id (added in 051, handled in CR-02 fix)
```

---

_Reviewed: 2026-06-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
