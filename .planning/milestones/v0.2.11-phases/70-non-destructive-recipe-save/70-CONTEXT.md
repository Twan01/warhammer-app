# Phase 70: Non-Destructive Recipe Save - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase replaces the current DELETE-all + re-INSERT recipe save pattern with a non-destructive three-way diff. On edit, the form must preserve existing section and step database IDs: only genuinely changed fields are updated in place, only user-removed sections/steps are deleted, and only newly added items are inserted. The `duplicateRecipe` function is unaffected (it creates fresh IDs by design).

</domain>

<decisions>
## Implementation Decisions

### DB ID Tracking in Form State
- **D-01:** Add `dbId: number | null` field to both `DraftStep` (in `recipeSteps.ts`) and `DraftSection` (in `recipeSection.ts`). `null` means the item is new (not yet in DB); a number means it maps to an existing DB row.
- **D-02:** `buildDraftSections` (in `recipeSection.ts` line 67) must populate `dbId` from the DB row's `id` field when converting DB rows to draft state. Currently it assigns only `localId` (a fresh UUID) and discards the DB ID — this is the root cause of the DELETE-all pattern.
- **D-03:** `makeDraftStep()` and `makeDraftSection()` set `dbId: null` for newly created items.

### Diff Algorithm (Save Flow)
- **D-04:** The save flow in `RecipeFormSheet.tsx` `onSubmit` replaces the current DELETE-all loop (lines 233-240) with a set-difference approach:
  - **Sections with `dbId` still present in draft** → UPDATE (if any field changed) + update `order_index`
  - **DB section IDs NOT present in any draft section's `dbId`** → DELETE (CASCADE handles child steps)
  - **Sections with `dbId: null`** → INSERT (new section)
- **D-05:** Same diff logic applies to steps within each section:
  - **Steps with `dbId` present in draft** → UPDATE changed fields + update `order_index`
  - **DB step IDs NOT in any draft step's `dbId`** → DELETE
  - **Steps with `dbId: null`** → INSERT
- **D-06:** The diff compares draft state against the `existingSections` and `existingSteps` arrays that are already fetched in `RecipeFormSheet.tsx` (via `useRecipeSections` and `useRecipePaints` hooks). No additional DB fetch is needed.

### Update Queries (New Functions)
- **D-07:** Add `updateRecipeStep` function to `recipePaints.ts`. Currently the file explicitly states "No updateRecipePaint — links are immutable; to change, remove + re-add." (line 38). Phase 70 replaces this with a proper UPDATE query covering all 13 mutable step columns.
- **D-08:** The existing `updateRecipeSection` in `recipeSections.ts` already supports partial updates. However, the save flow should pass ALL fields (not rely on COALESCE null-preservation) to ensure the DB matches the form state exactly.
- **D-09:** Full-row update for any changed item — no field-level diffing. The rows are small (13 columns for steps, 10 for sections), and detecting which specific fields changed adds complexity without meaningful performance benefit.

### Order Index Handling
- **D-10:** Always write `order_index` for ALL surviving sections and steps, even if the item itself didn't change. Users may reorder without editing content, and order_index is the only field that changes in that case. The existing `reorderRecipeSections` function demonstrates this pattern.
- **D-11:** Section order is determined by array position in `sections[]`. Step order is determined by array position within `section.steps[]`. Both use 0-based indexing via `computeOrderIndex`.

### Section-to-Step Relationship During Save
- **D-12:** For existing steps moving to a different section (drag-and-drop between sections), the step's `section_id` FK must be updated to point to the target section's DB ID. The draft step's `dbId` identifies the row; the target section's `dbId` (or newly inserted ID) provides the FK value.
- **D-13:** The save flow must process sections BEFORE steps so that newly inserted sections have DB IDs available for step FK assignment. Order: (1) delete removed sections, (2) update existing sections, (3) insert new sections, (4) build final sectionIdMap, (5) process steps with correct section_id values.

### Atomicity & Error Handling
- **D-14:** No explicit transaction wrapper — Tauri plugin-sql does not expose `BEGIN`/`COMMIT` for the JS bridge. Individual operations can fail independently, matching the existing save pattern. The catch block shows a toast ("Failed to save recipe").
- **D-15:** If a partial failure occurs (e.g., an UPDATE succeeds but a subsequent INSERT fails), the DB will be in a partially-updated state. This is acceptable — the user can retry, and the non-destructive approach means existing IDs are preserved even on retry.

### duplicateRecipe Isolation
- **D-16:** `duplicateRecipe` in `recipes.ts` is unaffected by this phase. It creates entirely new rows with fresh IDs for the copy — it never updates existing rows. No changes needed.

### Claude's Discretion
- Whether to extract the diff logic into a pure utility function (e.g., `diffSections`, `diffSteps`) or keep it inline in `onSubmit`
- Whether to add `updateRecipeStep` to `recipePaints.ts` alongside existing functions or create a separate file
- Whether to batch the delete/update/insert operations or execute them sequentially in loops (current pattern is sequential loops)
- How to handle the edge case of a step that existed in section A, was dragged to section B in the form, and section A was then deleted — the step should survive because it's in section B now

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current Save Flow (DELETE-all pattern to replace)
- `src/features/recipes/RecipeFormSheet.tsx` lines 213-323 — `onSubmit` function with DELETE-all loop at lines 233-240
- `src/features/recipes/RecipeFormSheet.tsx` lines 137-157 — Section state initialization and `buildDraftSections` call

### Draft State Types (must add dbId)
- `src/features/recipes/recipeSteps.ts` — `DraftStep` interface (add `dbId: number | null`)
- `src/features/recipes/recipeSection.ts` — `DraftSection` interface + `buildDraftSections` + `makeDraftSection` (add `dbId`, populate from DB row ID)

### Query Layer (existing + new updateRecipeStep)
- `src/db/queries/recipePaints.ts` — `addRecipePaint` (INSERT), `removeRecipePaint` (DELETE), line 38 comment about immutability (to be replaced)
- `src/db/queries/recipeSections.ts` — `createRecipeSection`, `updateRecipeSection`, `deleteRecipeSection`, `reorderRecipeSections`
- `src/db/queries/recipes.ts` — `updateRecipe`, `duplicateRecipe` (verify unaffected)

### Types
- `src/types/recipePaint.ts` — `RecipeStep` interface (has `id: number` from DB)
- `src/types/recipeSection.ts` — `RecipeSection` interface (has `id: number` from DB)

### Requirements
- `.planning/REQUIREMENTS.md` — REC-02 definition

### Prior Context
- `.planning/phases/69-paintless-recipe-steps/69-CONTEXT.md` — Phase 69 decisions (prerequisite: paint_id nullable)
- `.planning/phases/68-infrastructure-quick-wins/68-CONTEXT.md` — Phase 68 decisions (COALESCE fix, section-aware ordering)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `updateRecipeSection` in `recipeSections.ts` — existing UPDATE pattern for sections, can serve as template for `updateRecipeStep`
- `reorderRecipeSections` in `recipeSections.ts` — demonstrates sequential order_index updates
- `computeOrderIndex` in `recipeSteps.ts` — converts array position to `order_index` field
- `buildDraftSections` in `recipeSection.ts` — the conversion function that must be extended to carry `dbId`

### Established Patterns
- SQL parameter binding uses `$1, $2` positional syntax (Tauri plugin-sql)
- Sequential `for...of` loops for multi-row operations (no batch API)
- `lastInsertId` from `db.execute()` result for newly inserted row IDs
- `existingSections` and `existingSteps` are already available in `RecipeFormSheet` from React Query hooks — no additional fetch needed for diff

### Integration Points
- `RecipeFormSheet.tsx` `onSubmit` is the ONLY save entry point for recipe editing — all changes are isolated to this flow
- React Query cache invalidation (6 keys) at lines 311-316 remains unchanged
- `duplicateRecipe` has its own independent save flow in `recipes.ts` — not affected
- `RecipeSectionCard`, `RecipeStepRow`, `RecipeStepList`, `RecipeSectionList` all use `localId` for React keys and DnD — `dbId` is invisible to these components

</code_context>

<specifics>
## Specific Ideas

STATE.md documents this phase as HIGH risk due to the three-way diff requirement and dbId tracking. The core complexity is in the save flow refactor — the form UI components need no changes beyond accepting the new `dbId` field passively.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 70-Non-Destructive Recipe Save*
*Context gathered: 2026-05-13*
