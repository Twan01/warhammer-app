# Phase 75: Transactional Recipe Graph Save - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase wraps the recipe save flow (recipe metadata + sections + steps) in a single SQLite transaction so that a failure mid-save rolls back all changes. The existing five-phase diff logic (delete removed → update existing → insert new) is preserved — the change is structural (transaction wrapper), not behavioral. Both the create and edit paths become atomic.

No new schema. No new UI. Pure data-layer refactor.

</domain>

<decisions>
## Implementation Decisions

### Transaction Boundary
- **D-01:** A new `saveRecipeGraph()` function in `src/db/queries/recipes.ts` wraps the entire five-phase diff in a single BEGIN/COMMIT block with flat inline SQL. No nested BEGIN calls — tauri-plugin-sql cannot nest transactions.
- **D-02:** The function handles both create (new recipe + sections + steps) and edit (diff-based delete/update/insert) paths in one entry point. A `recipeId: number | null` parameter distinguishes create vs edit.
- **D-03:** The function accepts the computed diff results (from `recipeDiff.ts`) plus the raw form values, not raw draft state. The pure diff computation stays in `recipeDiff.ts`; the transactional persistence lives in `saveRecipeGraph()`.

### Error Handling & Rollback
- **D-04:** On any error inside the transaction, ROLLBACK is called and the error is re-thrown. The component-level try/catch in `RecipeFormSheet.tsx` shows a toast error and keeps the form open with data intact so the user can retry.
- **D-05:** Follow the existing try/catch pattern from `duplicateRecipe()` in `recipes.ts` — BEGIN, try block with all operations, COMMIT at end of try, ROLLBACK in catch.

### Mutation Hook Architecture
- **D-06:** `RecipeFormSheet.tsx` `onSubmit` calls `saveRecipeGraph()` directly (imported from queries), replacing the current chain of individual mutation hook calls for the save flow.
- **D-07:** Individual CRUD hooks (`useCreateRecipeSection`, `useUpdateRecipeStep`, etc.) remain available for non-form callers (section reorder, drag-drop operations, etc.).
- **D-08:** React Query invalidation happens once after the transaction succeeds, not per-operation. Invalidate recipe, sections, and steps query keys together.

### Five-Phase Diff Preservation
- **D-09:** The pure diff functions in `recipeDiff.ts` (`computeSectionDiff`, `computeStepDiff`, `buildSectionIdMap`) are unchanged. They compute what to do; `saveRecipeGraph()` executes it transactionally.
- **D-10:** Existing section and step IDs are preserved — the diff-based approach ensures only changed/new/removed rows are touched.

### Claude's Discretion
- Function signature details and parameter naming
- Internal SQL statement ordering within the transaction
- Whether to extract shared SQL building logic between create and edit paths
- React Query invalidation key list

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current save flow (the code being refactored)
- `src/features/recipes/RecipeFormSheet.tsx` lines 215-395 — Current `onSubmit` handler with non-transactional save
- `src/features/recipes/recipeDiff.ts` — Pure diff utilities (computeSectionDiff, computeStepDiff, buildSectionIdMap)

### Transaction patterns (established in codebase)
- `src/db/queries/recipes.ts` lines 117-205 — `duplicateRecipe()` uses BEGIN/COMMIT/ROLLBACK pattern
- `src/db/queries/recipeSections.ts` lines 93-110 — `reorderRecipeSections()` uses same transaction pattern
- `src/db/queries/recipeAssignments.ts` — Another transaction example
- `src/db/queries/syncedUnitPoints.ts` — Bulk sync with transaction

### CRUD functions (called inside the transaction)
- `src/db/queries/recipeSections.ts` — createRecipeSection, updateRecipeSection, deleteRecipeSection
- `src/db/queries/recipes.ts` — createRecipe, updateRecipe

### Types
- `src/types/recipe.ts` — PaintingRecipe, CreateRecipeInput, UpdateRecipeInput
- `src/types/recipeSection.ts` — RecipeSection, CreateRecipeSectionInput, UpdateRecipeSectionInput
- `src/types/recipePaint.ts` — RecipeStep type
- `src/features/recipes/recipeSection.ts` — DraftSection, DraftStep types

### Requirements
- `.planning/REQUIREMENTS.md` — DI-03 (atomic transaction), DI-04 (preserve existing IDs)

### Accumulated decisions
- `.planning/STATE.md` §Accumulated Context — "Transactions: flat inline SQL only"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `recipeDiff.ts` — Pure diff functions already compute exactly what needs to be deleted/updated/inserted. No changes needed.
- `duplicateRecipe()` — Proven BEGIN/try/COMMIT/catch/ROLLBACK pattern to follow.
- Existing CRUD functions (createRecipeSection, updateRecipeSection, etc.) contain the SQL statements but wrap individual db.execute calls. The transaction function will inline the same SQL rather than calling these helpers (to avoid nested transaction risk).

### Established Patterns
- All transactions in the codebase use `db.execute("BEGIN TRANSACTION", [])` / `db.execute("COMMIT", [])` / `db.execute("ROLLBACK", [])` with try/catch
- `getDb()` returns a singleton connection — all operations in a transaction share the same connection automatically
- Step operations use React Query mutation hooks (`addRecipePaint`, `updateRecipeStep`, `removeRecipeStep`) — the form save will bypass these and call `db.execute` directly inside the transaction

### Integration Points
- `RecipeFormSheet.tsx` `onSubmit` — refactor to call `saveRecipeGraph()` instead of individual CRUD calls
- React Query invalidation — must be done after transaction succeeds (recipe keys, section keys, step keys)
- `useRecipeSteps` / `useRecipeSections` hooks — query keys to invalidate after save

</code_context>

<specifics>
## Specific Ideas

- The transaction function should use inline SQL (not delegate to existing CRUD functions) to guarantee no helper opens its own transaction. This is explicitly required by success criteria #4.
- The create path currently works fine without transactions for small recipes, but a recipe with 5+ sections and 20+ steps has enough operations that a mid-save failure is a real risk.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 75-Transactional Recipe Graph Save*
*Context gathered: 2026-05-14*
