---
phase: 141-schema-foundation-progress-identity-lock
reviewed: 2026-06-21T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src-tauri/migrations/051_technique_library_foundation.sql
  - src-tauri/src/lib.rs
  - src/lib/effectivePaintId.ts
  - src/types/recipe.ts
  - src/types/recipePaint.ts
  - tests/data-layer/schema-shape.test.ts
  - tests/data-layer/technique-progress-identity.test.ts
  - tests/lib/effectivePaintId.test.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 141: Code Review Report

**Reviewed:** 2026-06-21
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 141 ships a clean data-layer foundation: migration 051 creates six technique tables with a correct CASCADE hierarchy, the `recipe_technique_slot_maps` orphan guard (`UNIQUE(instance_id, slot_id)`), and two nullable ALTER FK columns. The `effectivePaintId()` resolver is correct, pure, and well-tested. The progress-identity invariant test suite is rigorous — the counter-case ("teeth") test is particularly valuable for proving the assertions are non-trivial.

Three issues warrant attention before downstream phases build on this foundation:

1. **`RecipeSection` entity type is stale** — the new `technique_instance_id` column is missing from the interface, so every `SELECT *` on `recipe_sections` silently returns the column but the TypeScript type does not expose it. With strict TS this will surface the moment any consumer tries to read it, but the column is invisible to type checking until then.
2. **`DraftSection` in `recipe.ts` is also missing `technique_instance_id`** — the analogous form-state type for the save flow does not model the new column, so round-tripping a technique-linked section through the save flow will silently drop it.
3. **`recipe_sections` INSERT statements in `recipes.ts` do not include `technique_instance_id`** — the save-graph function's INSERT and UPDATE branches hardcode the column list without the new column. Because the column is nullable and defaults to NULL this does not corrupt data, but it means technique-linked sections written via the recipe save flow will always clear `technique_instance_id` on write, causing a silent data loss for any consumer that sets it separately.

---

## Warnings

### WR-01: `RecipeSection` entity interface is missing `technique_instance_id`

**File:** `src/types/recipeSection.ts:27-42`
**Issue:** Migration 051 adds `technique_instance_id INTEGER REFERENCES recipe_technique_instances(id) ON DELETE SET NULL` to `recipe_sections`. The `RecipeSection` interface — the canonical TypeScript mirror of that table, used in every `SELECT *` query — has no corresponding field. Any code that reads `section.technique_instance_id` will produce `undefined` at runtime and a TS type error at compile time. Because the project has `noUnusedLocals` / `noUnusedParameters` (strict TS) but not `noUncheckedIndexedAccess`, this gap will be silent until a consumer actively tries to use the field.

**Fix:**
```ts
// src/types/recipeSection.ts — add after applies_to:
export interface RecipeSection {
  // ... existing fields ...
  applies_to: string | null;
  // v0.7.0 technique materialisation (Phase 141, migration 051)
  technique_instance_id: number | null;
  created_at: string;
  updated_at: string;
}
```
`CreateRecipeSectionInput` (derived via `Omit`) will automatically include the new field as optional once it is added here.

---

### WR-02: `DraftSection` in `recipe.ts` is missing `technique_instance_id`

**File:** `src/types/recipe.ts:58-73`
**Issue:** `DraftSection` is the form-layer representation of a `recipe_sections` row used throughout the recipe save flow (`buildDraftSections`, `saveRecipeGraph`, `recipeDiff`). It does not include `technique_instance_id`. When `buildDraftSections` maps a DB row to a `DraftSection`, the new column is discarded. Any subsequent save via `saveRecipeGraph` will write `NULL` back into the column (see WR-03), silently destroying a technique link that was set outside the recipe form.

**Fix:**
```ts
// src/types/recipe.ts — add to DraftSection
export interface DraftSection {
  // ... existing fields ...
  // v0.7.0 technique materialisation (Phase 141, migration 051)
  technique_instance_id?: number | null;
  steps: DraftStep[];
}
```
Mark it optional (`?`) so existing callers that construct `DraftSection` objects without it (tests, `makeDraftSection`) continue to compile without changes.

---

### WR-03: `saveRecipeGraph` INSERT/UPDATE branches omit `technique_instance_id` — silent data loss on write

**File:** `src/db/queries/recipes.ts:171` and `src/db/queries/recipes.ts:286` and `src/db/queries/recipes.ts:384` and `src/db/queries/recipes.ts:417`
**Issue:** All INSERT and UPDATE statements against `recipe_sections` in `saveRecipeGraph` hardcode the column list and do not include `technique_instance_id`. Because the column is nullable and has no default, SQLite stores NULL on INSERT and leaves it untouched on UPDATE only if the UPDATE explicitly excludes it. However, the UPDATE branch in `saveRecipeGraph` writes every other column explicitly, so when Phase 144/145 consumers set `technique_instance_id` via a direct SQL UPDATE and then the user saves the recipe form, the next `saveRecipeGraph` call will overwrite the column with NULL — effectively clearing the technique link on every recipe edit.

This is a latent data-integrity bug: it does not corrupt data today (the column is always NULL), but it will silently undo Phase 144's work the first time a user saves a recipe that has a technique instance linked to one of its sections.

**Fix:** Add `technique_instance_id` to the INSERT column list and bind it from `DraftSection.technique_instance_id ?? null`. The UPDATE branch must similarly include the column. The exact fix depends on the current column order in `recipes.ts`; a representative INSERT patch:
```sql
INSERT INTO recipe_sections
  (recipe_id, name, surface, optional, order_index, notes,
   section_type, technique, execution_mode, applies_to, technique_instance_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
```

---

## Info

### IN-01: `schema-shape.test.ts` "expected tables exist" list does not include the six new technique tables

**File:** `tests/data-layer/schema-shape.test.ts:36-55`
**Issue:** The test at line 27 ("expected tables exist after full migration chain") checks a hardcoded `expectedTables` list that predates Phase 141. The six technique tables (`techniques`, `technique_sections`, etc.) are verified in a separate test block added at line 119, but the primary "full migration chain" smoke test does not enumerate them. This means the `D-12` coverage label on that test is understated — a reviewer auditing migration completeness from that test alone would miss the new tables.

**Fix:** Either extend `expectedTables` to include the six technique tables, or add a comment cross-referencing the dedicated Phase 141 block below it so the intent is clear.

---

### IN-02: `effectivePaintId` test suite has no case for `technique_step_id: undefined` (field absent)

**File:** `tests/lib/effectivePaintId.test.ts`
**Issue:** `PaintResolvableStep.technique_step_id` is typed `number | null | undefined` — `undefined` means the field is absent (pre-051 row). The implementation correctly handles this via `!= null` (which covers both `null` and `undefined`). However, the test suite only exercises `null` (line 25) and numeric values; it has no case for `undefined`. If the implementation were accidentally changed to `!== null` (strict equality), the `undefined` path would silently break without a failing test.

**Fix:** Add one test case:
```ts
it("returns the step's own paint_id when technique_step_id is absent (undefined — pre-051 row)", () => {
  const step = { paint_id: 5 }; // technique_step_id field entirely absent
  const slotMap = new Map<number, number | null>();
  expect(effectivePaintId(step, slotMap)).toBe(5);
});
```

---

_Reviewed: 2026-06-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
