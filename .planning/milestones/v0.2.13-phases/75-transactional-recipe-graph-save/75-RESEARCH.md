# Phase 75: Transactional Recipe Graph Save - Research

**Researched:** 2026-05-14
**Domain:** SQLite transaction wrapping, React Query invalidation, data-layer refactoring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** A new `saveRecipeGraph()` function in `src/db/queries/recipes.ts` wraps the entire five-phase diff in a single BEGIN/COMMIT block with flat inline SQL. No nested BEGIN calls.
- **D-02:** The function handles both create and edit paths. A `recipeId: number | null` parameter distinguishes create vs edit.
- **D-03:** The function accepts computed diff results (from `recipeDiff.ts`) plus raw form values. Pure diff computation stays in `recipeDiff.ts`.
- **D-04:** On any error, ROLLBACK is called and the error is re-thrown. Component-level try/catch shows a toast and keeps the form open.
- **D-05:** Follow the existing `duplicateRecipe()` pattern — BEGIN, try block, COMMIT at end of try, ROLLBACK in catch.
- **D-06:** `RecipeFormSheet.tsx` `onSubmit` calls `saveRecipeGraph()` directly, replacing the current chain of individual mutation hook calls.
- **D-07:** Individual CRUD hooks remain available for non-form callers (section reorder, drag-drop).
- **D-08:** React Query invalidation happens once after the transaction succeeds.
- **D-09:** Pure diff functions in `recipeDiff.ts` are unchanged.
- **D-10:** Existing section and step IDs are preserved via diff-based approach.

### Claude's Discretion

- Function signature details and parameter naming
- Internal SQL statement ordering within the transaction
- Whether to extract shared SQL building logic between create and edit paths
- React Query invalidation key list

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DI-03 | Recipe metadata, sections, and steps save atomically in a single transaction — partial saves are impossible | `duplicateRecipe()` pattern in `recipes.ts` lines 127–204 establishes exactly this pattern; `saveRecipeGraph()` follows same BEGIN/try/COMMIT/catch/ROLLBACK structure |
| DI-04 | Recipe graph save preserves existing section/step IDs (non-destructive, same as current five-phase diff) | `recipeDiff.ts` already computes `toDelete/toUpdate/toInsert` sets that preserve IDs; `saveRecipeGraph()` executes this diff transactionally without changing the diff logic |
</phase_requirements>

---

## Summary

Phase 75 is a pure data-layer refactor. The existing non-transactional save flow in `RecipeFormSheet.tsx` `onSubmit` (lines 215–400) executes ~10–30 sequential `db.execute` calls with no transaction wrapper. Any failure mid-save leaves orphaned rows. This phase wraps the entire five-phase diff in a single `BEGIN/COMMIT` block inside a new `saveRecipeGraph()` function in `src/db/queries/recipes.ts`.

The transaction pattern is already proven in this codebase: `duplicateRecipe()` uses `BEGIN TRANSACTION` / `try` / `COMMIT` / `catch` / `ROLLBACK` with the `getDb()` singleton. The constraint is firm — tauri-plugin-sql cannot nest transactions, so `saveRecipeGraph()` must inline all SQL rather than calling existing helper functions (`createRecipeSection`, `updateRecipeStep`, etc.) that operate on the same connection.

The component change is a clean replacement: `RecipeFormSheet.tsx` `onSubmit` drops the chain of individual mutation hook calls and replaces them with a single `saveRecipeGraph()` call, followed by a batch React Query invalidation of all affected cache keys.

**Primary recommendation:** Copy the `duplicateRecipe()` transaction skeleton verbatim, inline the SQL from the five CRUD helpers, and wire `onSubmit` to call `saveRecipeGraph()` with the diff result.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Transaction wrapping | DB queries layer (`src/db/queries/`) | — | All DB operations go through the query layer; transaction logic belongs here, not in components |
| Diff computation | Feature module (`src/features/recipes/recipeDiff.ts`) | — | Pure functions with no DB dependency; already extracted, must not change |
| Form submission orchestration | UI component (`RecipeFormSheet.tsx`) | — | Calls `saveRecipeGraph()`, then invalidates React Query cache |
| Cache invalidation | React Query (component-level) | — | After transaction success, `qc.invalidateQueries` per established pattern |

---

## Standard Stack

No new libraries required. This phase uses the existing stack exclusively.

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | (bundled) | `db.execute("BEGIN TRANSACTION", [])` / `COMMIT` / `ROLLBACK` | Only SQL bridge available in Tauri 2 |
| @tanstack/react-query | (existing) | Cache invalidation after transaction | Established project standard |

### Installation
No new packages required.

---

## Architecture Patterns

### System Architecture Diagram

```
RecipeFormSheet.tsx onSubmit
       │
       │ calls saveRecipeGraph(recipeId, formValues, sectionDiff, stepDiff, sectionIdMap)
       ▼
src/db/queries/recipes.ts :: saveRecipeGraph()
       │
       ├── db.execute("BEGIN TRANSACTION", [])
       │
       ├── [create path: recipeId === null]
       │     ├── INSERT INTO painting_recipes          → newRecipeId
       │     ├── INSERT recipe_sections (loop)         → build sectionIdMap
       │     └── INSERT recipe_steps (nested loop)
       │
       ├── [edit path: recipeId !== null]
       │     ├── UPDATE painting_recipes
       │     ├── DELETE FROM recipe_sections WHERE id IN toDelete  (CASCADE → steps)
       │     ├── UPDATE recipe_sections (loop: toUpdate)
       │     ├── INSERT recipe_sections (loop: toInsert) → extend sectionIdMap
       │     ├── DELETE FROM recipe_steps WHERE id IN toDelete
       │     ├── UPDATE recipe_steps (loop: toUpdate)
       │     └── INSERT recipe_steps (loop: toInsert)
       │
       ├── db.execute("COMMIT", [])
       │
       └── [on error]
             db.execute("ROLLBACK", [])
             throw e

       │
       ▼ (back in RecipeFormSheet.tsx on success)
qc.invalidateQueries × 8 keys
toast.success → onClose()
```

### Recommended Project Structure
No structural changes. `saveRecipeGraph()` is added to the existing `src/db/queries/recipes.ts` file.

### Pattern 1: BEGIN/COMMIT/ROLLBACK (from `duplicateRecipe`)
**What:** Wrap all DB operations in a single flat transaction using the singleton connection.
**When to use:** Any multi-row write that must be atomic.
**Example (from existing codebase — `src/db/queries/recipes.ts` lines 127–204):**
```typescript
// Source: src/db/queries/recipes.ts — duplicateRecipe()
const db = await getDb();
await db.execute("BEGIN TRANSACTION", []);
try {
  // ... all db.execute calls here ...
  await db.execute("COMMIT", []);
  return result;
} catch (e) {
  await db.execute("ROLLBACK", []);
  throw e;
}
```
[VERIFIED: src/db/queries/recipes.ts lines 127–204]

### Pattern 2: Flat inline SQL (no helper delegation)
**What:** Copy SQL statements from CRUD helpers directly into the transaction body. Do NOT call `createRecipeSection()`, `updateRecipeStep()`, etc. inside the transaction.
**When to use:** Required when helpers call `getDb()` themselves and could open a second connection or issue a nested BEGIN.
[VERIFIED: src-tauri/migrations pattern + `reorderRecipeSections` in recipeSections.ts — same self-contained pattern]

### Pattern 3: React Query batch invalidation
**What:** After `saveRecipeGraph()` resolves, invalidate all affected keys in one synchronous batch.
**When to use:** Replaces the per-mutation `onSuccess` callbacks that were firing per-operation.
**Required keys to invalidate (derived from current onSubmit lines 403–408 + hook analysis):**
```typescript
// Source: RecipeFormSheet.tsx lines 403–408 + useRecipes.ts + useRecipeSections.ts
qc.invalidateQueries({ queryKey: RECIPES_KEY });                    // recipe list
qc.invalidateQueries({ queryKey: RECIPE_KEY(recipeId) });           // single recipe
qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(recipeId) });  // per-recipe sections
qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(recipeId) });    // per-recipe steps
qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });                // batch step counts
qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });        // paint availability
qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });              // swatch colors
qc.invalidateQueries({ queryKey: SECTION_COUNTS_KEY });             // batch section counts
// kanban-enrichment + recipes/by-unit (from useCreateRecipe/useUpdateRecipe)
qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });
qc.invalidateQueries({ queryKey: ["recipes", "by-unit"] });
```
[VERIFIED: useRecipes.ts, useRecipeSections.ts, useRecipePaints.ts — all existing invalidation contracts]

### Anti-Patterns to Avoid
- **Delegating to CRUD helpers inside the transaction:** `createRecipeSection()` calls `getDb()` and executes independently. Calling it inside `saveRecipeGraph()`'s `try` block does not bring it inside the transaction. The tauri-plugin-sql JS bridge does not support savepoints.
- **Calling `mutateAsync` inside `onSubmit` after migration:** The new `onSubmit` must NOT call `addRecipePaint.mutateAsync()` or `updateRecipe.mutateAsync()` for the transactional path — these trigger per-operation cache invalidations and defeat the batched-invalidation design (D-08).
- **Nested BEGIN:** SQLite returns an error if `BEGIN` is issued while a transaction is already open. The codebase documents this in `STATE.md`: "Transactions: flat inline SQL only — tauri-plugin-sql cannot nest BEGIN/COMMIT".

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transaction rollback semantics | Custom savepoint logic | Plain `BEGIN`/`COMMIT`/`ROLLBACK` | SQLite supports this natively; no extra complexity needed |
| Diff computation | Rewrite diff logic inside `saveRecipeGraph()` | Existing `computeSectionDiff`, `computeStepDiff`, `buildSectionIdMap` from `recipeDiff.ts` | Already unit-tested; D-09 locks these as unchanged |
| Cache invalidation scheduling | `setTimeout` or manual refetch | `qc.invalidateQueries` | React Query handles stale marking and background refetch |

---

## Common Pitfalls

### Pitfall 1: Calling CRUD helpers inside the transaction
**What goes wrong:** The developer wraps the body of `onSubmit` in a BEGIN/COMMIT and considers it done. But `createRecipeSection()` acquires the singleton connection and runs its own `db.execute` — it does not participate in the outer `BEGIN`.
**Why it happens:** The `getDb()` singleton returns the same connection object, but tauri-plugin-sql's JavaScript wrapper does not propagate transaction state across call boundaries.
**How to avoid:** Inline the SQL from each CRUD helper verbatim inside `saveRecipeGraph()`. Success criterion #4 explicitly requires "flat inline SQL with no nested BEGIN calls".
**Warning signs:** Any call to a function from `recipeSections.ts` or `recipePaints.ts` inside the `try` block.

### Pitfall 2: Wrong order of delete/update/insert for sections
**What goes wrong:** If new sections are inserted before deleted sections are removed, there is no conflict risk (no UNIQUE constraint on `order_index`). However, deleting sections AFTER updating existing ones is also safe. The critical ordering concern is: sections must be inserted BEFORE their steps are inserted (FK: `recipe_steps.section_id → recipe_sections.id`).
**Why it happens:** The five-phase naming (Phase 1–5) from `RecipeFormSheet.tsx` reflects the correct dependency order; deviating from it breaks FK resolution.
**How to avoid:** Follow this ordering within the transaction: (1) upsert recipe row, (2) DELETE removed sections (CASCADE removes their steps), (3) UPDATE existing sections, (4) INSERT new sections + build sectionIdMap, (5) DELETE removed steps, (6) UPDATE existing steps, (7) INSERT new steps.

### Pitfall 3: sectionIdMap not extended after INSERT
**What goes wrong:** `buildSectionIdMap` seeds the map with surviving sections. New sections (toInsert) have no dbId yet — they need their `lastInsertId` added to the map before step insertion begins.
**Why it happens:** The current `onSubmit` already does this correctly (lines 266–282). When inlining, the developer may forget to update the map inside the INSERT section loop.
**How to avoid:** After each section INSERT, call `sectionIdMap.set(sec.localId, sectionResult.lastInsertId)`. This is already the pattern in the current `onSubmit`.
**Warning signs:** Steps fail FK constraint with `section_id` null when the section was just inserted.

### Pitfall 4: Stale React Query cache after mutation hook removal
**What goes wrong:** The current `onSubmit` uses `addRecipePaint.mutateAsync()` and `updateRecipe.mutateAsync()` which fire their own `onSuccess` invalidations. Removing those mutations and calling `saveRecipeGraph()` directly means invalidations that used to happen automatically now need to be done explicitly in `onSubmit`.
**Why it happens:** Moving from mutation hooks to a direct query function removes the automatic `onSuccess` wiring.
**How to avoid:** After `saveRecipeGraph()` resolves, explicitly invalidate all 10 query keys listed in Pattern 3. Reference both the current `onSubmit` invalidation block (lines 403–408) and the hook-level invalidations in `useRecipes.ts` and `useRecipeSections.ts` to build the complete list.

### Pitfall 5: Removing mutation hooks still used by other callers
**What goes wrong:** `useCreateRecipe`, `useUpdateRecipe`, `useAddRecipePaint`, etc. may still be called by other components (e.g. quick-add flows, duplication). Removing these hooks or changing their signatures to support the transactional path would break those callers.
**Why it happens:** D-07 locks individual CRUD hooks as preserved. The refactor is only in `RecipeFormSheet.tsx`'s `onSubmit`.
**How to avoid:** Only remove the calls to these hooks inside `onSubmit`. The hook imports at the top of `RecipeFormSheet.tsx` (`useCreateRecipe`, `useUpdateRecipe`, `useAddRecipePaint`) can be removed if they are no longer referenced anywhere else in the component.

---

## Code Examples

### Inline SQL: INSERT recipe_section (from createRecipeSection)
```typescript
// Source: src/db/queries/recipeSections.ts — createRecipeSection()
const sectionResult = await db.execute(
  `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes, section_type, technique, execution_mode, applies_to)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
  [
    recipeId,
    sec.name,
    sec.surface ?? null,
    sec.optional,
    i, // order_index = loop index
    sec.notes ?? null,
    sec.section_type ?? null,
    sec.technique ?? null,
    sec.execution_mode ?? null,
    sec.applies_to ?? null,
  ]
);
sectionIdMap.set(sec.localId, sectionResult.lastInsertId ?? 0);
```
[VERIFIED: src/db/queries/recipeSections.ts lines 24–42]

### Inline SQL: UPDATE recipe_section (from updateRecipeSection)
```typescript
// Source: src/db/queries/recipeSections.ts — updateRecipeSection()
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
  [sec.dbId, sec.name ?? null, sec.surface ?? null, sec.optional ?? null,
   i, sec.notes ?? null, sec.section_type ?? null, sec.technique ?? null,
   sec.execution_mode ?? null, sec.applies_to ?? null]
);
```
[VERIFIED: src/db/queries/recipeSections.ts lines 52–77]

### Inline SQL: INSERT recipe_step (from addRecipePaint)
```typescript
// Source: src/db/queries/recipePaints.ts — addRecipePaint()
const stepResult = await db.execute(
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
```
[VERIFIED: src/db/queries/recipePaints.ts lines 15–32]

### Inline SQL: UPDATE recipe_step (from updateRecipeStep)
```typescript
// Source: src/db/queries/recipePaints.ts — updateRecipeStep()
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
```
[VERIFIED: src/db/queries/recipePaints.ts lines 38–63]

### Proposed saveRecipeGraph signature
```typescript
// Claude's discretion — function signature
export async function saveRecipeGraph(
  recipeId: number | null,
  formValues: RecipeFormValues,         // from RecipeFormSheet form.getValues()
  sections: DraftSection[],             // current draft sections (ordered)
  existingSections: RecipeSection[],    // from DB (empty for create)
  existingSteps: RecipeStep[],          // from DB (empty for create)
): Promise<number>                      // returns recipe id (new or existing)
```

### RecipeFormValues type reference
```typescript
// Source: src/features/recipes/recipeSchema.ts (inferred from existing imports)
// Fields: name, faction_id, unit_id, area, notes, tutorial_link,
//         style, surface, effect, difficulty, estimated_minutes, result_photo_path
```
[VERIFIED: src/features/recipes/RecipeFormSheet.tsx lines 77–108 — buildDefaults function]

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Per-operation mutation hook calls in `onSubmit` | Single `saveRecipeGraph()` transactional call | Atomic save; no partial state |
| Per-mutation `onSuccess` cache invalidation | Batch invalidation after transaction | Consistent cache state; no mid-save flicker |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `computeOrderIndex` from `recipeSteps.ts` is called inside `saveRecipeGraph()` or by the caller before passing steps — the function assigns `order_index` from array position | Code Examples | Steps saved with wrong order_index; visual ordering breaks |

**Notes on A1:** The current `onSubmit` calls `computeOrderIndex(sec.steps)` per section before UPDATE/INSERT. The planner must decide whether `saveRecipeGraph()` calls this internally or whether the caller pre-computes it. Both work; it affects the function signature. [ASSUMED — design choice for Claude's Discretion]

---

## Open Questions

1. **Does `saveRecipeGraph()` call `computeOrderIndex` internally or does the caller pass pre-indexed steps?**
   - What we know: `computeOrderIndex` is a pure function from `recipeSteps.ts`; it maps array position to `order_index`
   - What's unclear: Which side of the boundary it belongs on
   - Recommendation: Call it inside `saveRecipeGraph()` — the function already controls the loop over `sections`, so indexing there is natural and removes caller burden

2. **Should `saveRecipeGraph()` accept the diff result objects or raw draft + existing arrays?**
   - What we know: D-03 says "accepts the computed diff results plus the raw form values"
   - What's unclear: Whether "computed diff results" means pre-calling `computeSectionDiff`/`computeStepDiff` in the component and passing `SectionDiff` + `StepDiff` structs, or whether `saveRecipeGraph()` calls the diff functions itself
   - Recommendation: Accept raw `DraftSection[]` + `RecipeSection[]` + `RecipeStep[]` and call the diff functions inside `saveRecipeGraph()`. This keeps the call site in `onSubmit` simple and matches D-03 intent ("the pure diff computation stays in `recipeDiff.ts`; the transactional persistence lives in `saveRecipeGraph()`").

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config-only with no new external dependencies.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DI-03 | Atomic save: all-or-nothing on error | unit | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` | ❌ Wave 0 |
| DI-03 | ROLLBACK leaves recipe in previous state | unit | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` | ❌ Wave 0 |
| DI-04 | Existing section/step IDs preserved (toUpdate path) | unit | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` | ❌ Wave 0 |
| DI-04 | New section/step IDs assigned (toInsert path) | unit | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/saveRecipeGraph.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/painting/saveRecipeGraph.test.ts` — covers DI-03 + DI-04; requires mocking `@/db/client` to intercept `db.execute` calls

**Test strategy note:** `saveRecipeGraph()` calls `db.execute` on the Tauri SQL bridge — no real SQLite in jsdom. Tests must mock `getDb()` to return a mock db object tracking calls. The existing test suite uses `vi.mock("@/db/client")` pattern for similar data-layer tests (see `tests/army-list/armyListQueries.test.ts` for reference mocking style).

---

## Security Domain

This phase modifies no authentication, session, input validation, or cryptographic surfaces. The only security consideration is SQL injection: all SQL uses `$1, $2` positional parameters (existing project standard). No new user-controlled string is interpolated directly into SQL.
[VERIFIED: All SQL in this phase uses parameterized positional syntax — same as `duplicateRecipe()` and all existing CRUD functions]

---

## Sources

### Primary (HIGH confidence)
- `src/db/queries/recipes.ts` lines 117–205 — `duplicateRecipe()` — canonical transaction pattern to replicate
- `src/db/queries/recipeSections.ts` — SQL for all section CRUD operations to inline
- `src/db/queries/recipePaints.ts` — SQL for all step CRUD operations to inline
- `src/features/recipes/recipeDiff.ts` — diff function signatures and return types (unchanged)
- `src/features/recipes/RecipeFormSheet.tsx` lines 215–414 — current non-transactional save + invalidation block
- `src/hooks/useRecipes.ts`, `useRecipeSections.ts`, `useRecipePaints.ts` — complete invalidation key inventory

### Secondary (MEDIUM confidence)
- `tests/painting/recipeDiff.test.ts` — confirms diff function contracts and fixture shapes for test authoring
- `.planning/STATE.md` Accumulated Context — "Transactions: flat inline SQL only" decision

### Tertiary (LOW confidence)
None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all patterns verified in codebase
- Architecture: HIGH — transaction pattern is exact replica of existing `duplicateRecipe()`; SQL is inlined from existing verified CRUD functions
- Pitfalls: HIGH — derived from code reading + documented STATE.md constraint
- Test strategy: MEDIUM — mocking approach inferred from codebase patterns; specific mock API not verified against a real existing example in the recipes domain

**Research date:** 2026-05-14
**Valid until:** Stable — no external dependencies; only changes if the recipes schema or tauri-plugin-sql API changes
