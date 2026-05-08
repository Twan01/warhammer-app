# Pitfalls Research

**Domain:** HobbyForge v0.2.7 — Adding hierarchical recipe sections to an existing flat-step recipe system (Tauri 2 + React 19 + SQLite + @dnd-kit + React Hook Form without useFieldArray)
**Researched:** 2026-05-08
**Confidence:** HIGH — derived from direct codebase inspection of RecipeStepList.tsx, RecipeFormSheet.tsx, recipeSteps.ts, recipePaints.ts, useRecipePaints.ts, recipes.ts, migration files 001–017, and verified against @dnd-kit GitHub issues and SQLite ALTER TABLE documentation

---

## Critical Pitfalls

### Pitfall 1: Two Nested DndContexts — Cross-Context Drag Events Are Silently Swallowed

**What goes wrong:**
The naïve architecture for "sections reorder + steps reorder within sections" is two levels of DndContext: an outer one for section-level drag, an inner one (inside each RecipeSectionCard) for step-level drag. This does not work. @dnd-kit's event model is non-bubbling by design: drag events are consumed by the innermost DndContext containing an activated sensor. A step drag started inside a section card's DndContext will never reach the outer section DndContext. Dragging a section header will always activate the step-level sensor if any step is in proximity. The two contexts also share the same internal reducer initial state, which causes ID collisions between section IDs and step IDs when they happen to have matching values (integer database IDs 1, 2, 3 overlap across both entity types). The result is unpredictable drag behavior: items snap to wrong positions, drag events target the wrong sortable, and no error is thrown.

**Why it happens:**
The existing RecipeStepList already wraps a DndContext for step reordering. When RecipeSectionCard is introduced, the reflex is to add another DndContext at the section level, wrapping section cards. This seems clean (one context per level) but violates @dnd-kit's fundamental constraint: nested DndContexts are isolated silos, not a hierarchy.

**How to avoid:**
Use a single outer DndContext for the entire recipe form. Inside it, create one SortableContext for the section list and one SortableContext per section for that section's steps. Handle drag logic at the single DndContext level using `onDragEnd` with type discrimination:

```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const isSectionDrag = active.data.current?.type === "section";
  const isStepDrag    = active.data.current?.type === "step";

  if (isSectionDrag) {
    // reorder sections array
  } else if (isStepDrag) {
    const fromSectionId = active.data.current?.sectionLocalId;
    const toSectionId   = over.data.current?.sectionLocalId ?? fromSectionId;
    // reorder steps within fromSectionId
  }
}
```

Critically: remove the DndContext from inside RecipeStepList — it becomes a pure SortableContext only. The existing RecipeStepList exports DndContext today; that DndContext must be lifted up to RecipeSectionList or RecipeFormSheet.

**Warning signs:**
- Any file inside `src/features/recipes/` imports `DndContext` from `@dnd-kit/core` other than the top-level section list component.
- `RecipeSectionCard.tsx` or `RecipeStepList.tsx` renders `<DndContext>`.
- Dragging a section header also moves a step — indicates two contexts competed for the same pointer event.

**Phase to address:**
Phase 3 (Form UI). Must be the architectural decision before any drag code is written. Write a test: drag section A below section B; assert section order updated; drag step inside section A; assert step order updated; assert section order unchanged.

---

### Pitfall 2: ID Namespace Collision Between Sections and Steps in the Single DndContext

**What goes wrong:**
With a single DndContext, all draggable IDs must be globally unique within that context. The existing step localIds are `crypto.randomUUID()` strings — safe. But if section IDs use database integers (1, 2, 3) and step IDs also use database integers, the SortableContext items array contains collisions: section id `2` and step id `2` are the same value from @dnd-kit's perspective. The drag system targets the wrong element. The symptom is non-deterministic: an `arrayMove` reorders the section list when the user intended to reorder a step, or vice versa. This is the exact same class of bug that drove the decision to avoid `useFieldArray` in v2.5 (RHF #10607) — integer ID collisions are the root cause there too.

**Why it happens:**
Developers use database `id` as the sortable identifier because it's convenient and already available on fetched data. The collision only manifests when both sections and steps have overlapping integer IDs, which always happens as data grows.

**How to avoid:**
Use `localId` (UUID strings) for all draggable IDs, consistently. The existing DraftStep already has `localId: crypto.randomUUID()`. Apply the same pattern to DraftSection:

```typescript
export interface DraftSection {
  localId: string;       // crypto.randomUUID() — DnD identifier, never database id
  db_id:   number | null; // null for new unsaved sections
  name: string;
  surface: string | null;
  optional: 0 | 1;
  steps: DraftStep[];
}
```

Pass `section.localId` to SortableContext items and `useSortable({ id: section.localId })`. Never pass `section.db_id` to any sortable primitive. The type check in `handleDragEnd` uses `active.data.current?.type` not the ID value itself.

**Warning signs:**
- `SortableContext items={sections.map(s => s.id)}` where `id` is the database integer.
- `useSortable({ id: step.id })` where `id` is `number` type.
- Dragging a step of order index 2 moves the second section instead — classic integer namespace collision.

**Phase to address:**
Phase 3 (Form UI). Establish the `localId` convention in `DraftSection` type in `recipeSteps.ts` before writing any drag code. Unit test: create 3 sections each with 3 steps; verify all 12 sortable IDs are unique strings.

---

### Pitfall 3: Migration 018 Uses ON DELETE CASCADE on section_id Without Verifying painting_sessions Referential Behavior

**What goes wrong:**
The proposed migration adds `recipe_steps.section_id INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE`. This means deleting a section cascades to delete all its steps. That is intentional. However, `painting_sessions.recipe_step_id` references `recipe_steps(id)` with `ON DELETE SET NULL` (migration 014). If a user deletes a section — which cascades and deletes the contained steps — SQLite must cascade the FK on `recipe_steps` (delete the step rows) AND simultaneously set `painting_sessions.recipe_step_id = NULL` for any sessions that referenced those steps. SQLite handles this with PRAGMA foreign_keys = ON, but only if the connection has FK enforcement active. The app's `client.ts` runs `PRAGMA foreign_keys = ON` on every new connection — but only on `hobbyforge.db`. If FK enforcement is somehow OFF at the time of the cascade (e.g., in a test environment using a bare SQLite mock), the session rows retain stale `recipe_step_id` values pointing to deleted steps, which silently corrupts session data.

**Why it happens:**
Multi-level cascade chains (section → step → session) are easy to miss because the intermediate table (recipe_steps) appears safe to delete — the cascade appears to only go one level down. The second-order FK on painting_sessions is in a different table that isn't obvious to the developer working on recipe sections.

**How to avoid:**
- Verify `PRAGMA foreign_keys = ON` is active before the section delete in all test paths, not just production.
- Write a test specifically for the cascade chain: create a section with 2 steps, log sessions linked to those steps, delete the section, assert: steps deleted, session `recipe_step_id` IS NULL.
- The migration SQL itself is correct — no change needed. The risk is in testing, not production code (since `client.ts` always enables FKs).

**Warning signs:**
- Test files mock `getDb()` without running `PRAGMA foreign_keys = ON` on the mock connection.
- After deleting a section in a test, `getRecipePaintsByRecipe()` still returns the section's steps.
- Session history in RecipeDetailSheet shows sessions with a step reference that no longer exists.

**Phase to address:**
Phase 1 (Schema + data layer). The FK chain test must be in the migration tests before any UI work builds on top.

---

### Pitfall 4: duplicateRecipe Does Not Copy Sections — Duplicated Recipe Is Structurally Broken

**What goes wrong:**
The current `duplicateRecipe()` in `recipes.ts` copies all 21 recipe fields and all steps. After adding sections, steps have a `section_id` FK. When `duplicateRecipe` runs, it:
1. Creates a new recipe row (new ID).
2. Copies steps from the old recipe — but the copied steps still reference the **original recipe's** section IDs.

The result is a duplicated recipe whose steps reference sections belonging to a different recipe. The steps appear in the detail view grouped under another recipe's sections (if those sections still exist), or appear with a NULL section (if sections are from a recipe the user later deleted). The duplication succeeds with no error, but the structural integrity is silently broken.

**Why it happens:**
The copy loop in `duplicateRecipe` only needs to add one column (`section_id`) to each copied step row, but section_id values are not portable — they reference source-recipe-specific section rows. This is easy to overlook when extending the copy loop to include the new column.

**How to avoid:**
Extend `duplicateRecipe` to follow the three-step sequence: copy recipe → copy sections (with new `recipe_id`, record old-id → new-id mapping) → copy steps (with new `recipe_id` and remapped `section_id`):

```typescript
// pseudocode
const sectionIdMap = new Map<number, number>(); // old section id → new section id
for (const section of originalSections) {
  const newSectionId = await createRecipeSection({ ...section, recipe_id: newRecipeId });
  sectionIdMap.set(section.id, newSectionId);
}
for (const step of originalSteps) {
  await addRecipePaint({
    ...step,
    recipe_id: newRecipeId,
    section_id: step.section_id !== null ? (sectionIdMap.get(step.section_id) ?? null) : null,
  });
}
```

**Warning signs:**
- `duplicateRecipe` copies steps in a loop that includes a `section_id` column but does not build a section mapping first.
- After duplicating, opening the new recipe's detail shows steps grouped under the original recipe's sections (check: detail sheet shows section names from a recipe with a different ID).
- Deleting the original recipe after duplication removes the duplicated recipe's step groupings.

**Phase to address:**
Phase 4 (Polish + regression). The duplication fix must be the first item of Phase 4. Add an acceptance test: duplicate a 2-section recipe, delete the original, verify the copy still renders sections correctly.

---

### Pitfall 5: Batch SQL Helpers Silently Return Incorrect Counts for Sectioned Recipes

**What goes wrong:**
`getStepCountsByRecipe()` (GROUP BY recipe_id) and `getRecipePaintAvailability()` (GROUP BY recipe_id) are unaffected by the section schema change at the SQL level — they still return correct per-recipe totals. However, if a new `getStepCountsBySection()` helper is introduced for section-level counts in RecipeSectionCard, and a step is saved without a section_id (section_id IS NULL — allowed by the nullable FK), that step is excluded from `getStepCountsBySection()` but included in `getStepCountsByRecipe()`. The section card shows "0 steps" while the recipe card shows "4 steps." Users see inconsistent counts with no explanation. This is not a bug in the existing helpers — it is a silent data inconsistency.

**Why it happens:**
The migration sets existing steps to a default section, so the inconsistency cannot happen for migrated data. It can happen in new code paths: if `addRecipePaint` is called without a `section_id` (e.g., from LogSessionSheet or a future API that doesn't set section context), the step is sectionless. Because `section_id` is nullable (backward compat requirement), the column accepts NULL silently.

**How to avoid:**
- In `addRecipePaint`, assert `section_id` is always provided when creating steps in a sectioned recipe context. The default section is guaranteed to exist after migration 018 — always pass its id.
- `getStepCountsBySection()` should use a `WHERE section_id IS NOT NULL` guard and log a warning if `getStepCountsByRecipe()` total exceeds the sum of section step counts for any recipe (indicates orphaned steps).
- In RecipeFormSheet's submit path: before inserting steps, verify `section_id != null` for all steps in the sectioned form. If null, assign to the default section.

**Warning signs:**
- Recipe card shows "7 steps" but section cards within the recipe detail total 6 — one step has `section_id IS NULL`.
- A step appears in the recipe timeline but not in any section group.
- `getStepCountsBySection()` sum < `getStepCountsByRecipe()` count for the same recipe_id.

**Phase to address:**
Phase 1 (Schema + data layer) for the helper design. Phase 3 (Form UI) for the submit path assertion. Add a query-level test: insert a step with section_id NULL, call both helpers, assert and document the discrepancy.

---

### Pitfall 6: DraftSection State in RecipeFormSheet Desynchronizes With existingSteps on Edit Re-open

**What goes wrong:**
The existing `RecipeFormSheet` initializes `DraftStep[]` from `existingSteps` in a `useEffect` keyed on `[recipe?.id, existingSteps.length]`. After adding sections, the form must initialize `DraftSection[]` (each with its own `DraftStep[]`). If the initialization logic is not atomic — i.e., sections and their steps are loaded in separate effects or separate queries — the form can briefly show sections with empty step arrays (steps not yet loaded), and any user action during that window (typing a section name, adding a step) commits against an incomplete draft state. When the second effect fires and repopulates steps, it overwrites the user's changes.

**Why it happens:**
Sections and steps require two queries (`useRecipeSections(recipe?.id)` and `useRecipePaints(recipe?.id)`). Both are async. React renders between them. The initialization effect fires when `existingSteps.length` changes, but if sections have already been used to initialize DraftSection state, the second effect replaces those DraftSections wholesale.

**How to avoid:**
Initialize draft sections and steps in a single `useEffect` that depends on both data sources being ready:

```typescript
useEffect(() => {
  if (!recipe) { setDraftSections([]); return; }
  // Wait for BOTH to resolve before initializing
  if (existingSections.length === 0 && existingSteps.length === 0) return;
  setDraftSections(buildDraftSections(existingSections, existingSteps));
}, [recipe?.id, existingSections.length, existingSteps.length]);
```

`buildDraftSections` is a pure function that takes both arrays and produces the nested draft structure — test it independently. Never have two separate effects that each call `setDraftSections`.

**Warning signs:**
- Opening a recipe for edit briefly shows sections with "0 steps" before steps appear.
- Rapidly opening and closing the form for the same recipe causes inconsistent step counts.
- `setDraftSections` is called in more than one `useEffect` in `RecipeFormSheet`.

**Phase to address:**
Phase 3 (Form UI). Write the `buildDraftSections` pure function with tests before wiring it into the component.

---

### Pitfall 7: Cache Invalidation Asymmetry — Section Mutations Miss Step Count and Availability Keys

**What goes wrong:**
The codebase enforces the cache invalidation symmetry rule: "if useCreate invalidates a key, useDelete must too." Adding `useRecipeSections` introduces a new mutation surface. When a section is deleted (which cascades to delete its steps), the following keys become stale:
- `["recipe-sections", recipeId]` — obvious, developers will invalidate this
- `["recipe-paints", recipeId]` — steps were deleted, must refetch
- `["recipe-step-counts"]` — step counts changed
- `["recipe-paint-availability"]` — availability ratios changed
- `["recipe-swatch-colors"]` — swatch strip colors changed

Developers writing `useDeleteRecipeSection` will think to invalidate sections. They will likely miss the 4 step-derived keys because those keys live in `useRecipePaints.ts`, not in `useRecipeSections.ts`. The sections hook and the paints hook are in different files. The RecipesPage swatch strips and step count badges go stale after a section delete with no visual feedback.

**Why it happens:**
The step-derived cache keys (`STEP_COUNTS_KEY`, `RECIPE_AVAILABILITY_KEY`, `RECIPE_SWATCH_KEY`, `RECIPE_PAINTS_KEY(recipeId)`) were designed around direct step mutations. A section mutation that causes step deletion is an indirect mutation — the connection to step caches is non-obvious from the sections hook's perspective.

**How to avoid:**
Export the step-derived keys from `useRecipePaints.ts` (they already are: `STEP_COUNTS_KEY`, `RECIPE_AVAILABILITY_KEY`, `RECIPE_SWATCH_KEY`, `RECIPE_PAINTS_KEY`) and import them in `useRecipeSections.ts`. The `useDeleteRecipeSection` mutation's `onSuccess` must invalidate all five keys:

```typescript
// In useRecipeSections.ts — useDeleteRecipeSection onSuccess
qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(variables.recipeId) });
qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(variables.recipeId) });
qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
```

Add a comment block at the top of `useRecipeSections.ts` mirroring the contract pattern from `useRulesSync.ts`:
```typescript
// ── Section mutation invalidation contract ────────────────────────────────
// Section deletes cascade to step deletes. Any hook reading step-derived
// data MUST be invalidated by useDeleteRecipeSection.
// Keys: RECIPE_SECTIONS_KEY, RECIPE_PAINTS_KEY, STEP_COUNTS_KEY,
//       RECIPE_AVAILABILITY_KEY, RECIPE_SWATCH_KEY
```

**Warning signs:**
- After deleting a section, the recipe card on RecipesPage still shows the old step count.
- The availability badge (owned/missing) on a recipe card does not update after a section delete.
- `useDeleteRecipeSection.onSuccess` has fewer `invalidateQueries` calls than `useRemoveRecipePaint.onSuccess`.

**Phase to address:**
Phase 1 (Schema + data layer). Define the `useRecipeSections` hook with all 5 invalidations before any UI consumes it. Verify with a test: delete a section, assert step counts query returns updated value without page refresh.

---

### Pitfall 8: Collapsible Sections Make Simple Recipe Forms Feel Like Overhead

**What goes wrong:**
If the section concept is always visible — every new recipe immediately shows a "Section 1" card header, collapse toggle, section name field, and surface dropdown — users creating simple one-surface recipes feel they are wrestling with unnecessary structure. The form becomes 20% taller and more cognitive load than the v2.5 form. The product principle "creating a simple one-section recipe must be just as easy as today" is violated. Users with existing simple recipes (all steps in one area) open the edit form and see their steps now wrapped in a labeled section card with a new name field they never asked for.

**Why it happens:**
The section layer is genuinely useful for complex recipes but adds no value for a recipe with one surface and 4 steps. The default section migration automatically groups all existing steps into one section — correct for data integrity but potentially confusing in the UI.

**How to avoid:**
- Auto-collapse the section header UI for recipes with exactly one section. Show steps directly without a visible section card wrapper. The section still exists in the data model; the UI just doesn't emphasize it.
- Only show the section name field and surface selector when the recipe has more than one section, or when the user explicitly clicks "Add Section."
- The "Add Section" button is the gateway to the multi-section workflow. A recipe starts with an implicit section — only adding a second section reveals the section-level UI.
- Section name and surface fields on the single default section should be optional and collapsed by default.

**Warning signs:**
- Every new recipe immediately renders a visible "Section 1" card with a text field asking for a section name.
- The form height for a simple 3-step recipe is noticeably taller after the v0.2.7 migration than before.
- User needs to interact with a section UI element before adding the first step.

**Phase to address:**
Phase 3 (Form UI). Establish the progressive disclosure rule before building RecipeSectionCard: "section scaffolding is hidden when recipe has exactly one section." Phase 2's read-only detail view should also apply this — single-section recipes look identical to v2.5's detail view.

---

### Pitfall 9: Section Order Index Drift After Insert/Delete Operations

**What goes wrong:**
`order_index` values for sections become non-contiguous after inserts and deletes. If sections start as [0, 1, 2] and the middle section is deleted, the remaining sections are [0, 2]. Adding a new section with `order_index = sections.length` produces [0, 2, 2] — a duplicate order value. The reorder query sorts by `order_index ASC`, so two sections with `order_index = 2` have non-deterministic display order. The drag-reorder `reorderRecipeSections` batch UPDATE normalizes order_index from 0 to N-1 — but only when the user actually drags. A user who never drags sections (just adds and deletes) accumulates order_index drift permanently.

This is the same pattern that caused problems in the existing step ordering before `computeOrderIndex()` was introduced in v2.5.

**Why it happens:**
Integer position columns naturally drift when items are inserted or deleted without renumbering. The section table will be managed with explicit INSERT/DELETE operations (not array replacement like draft steps), so there is no automatic normalization step on every save.

**How to avoid:**
Apply `computeOrderIndex` to sections at the point of persistence, mirroring the step pattern:
- On save (RecipeFormSheet submit), normalize all section `order_index` values to their array position before writing to DB — same as `computeOrderIndex(steps)` today.
- On add-section: append with `order_index = sections.length` (current array length after insertion) — always contiguous if array is the source of truth.
- On delete-section: remove from draft array and renumber on next save — never DELETE + UPDATE order_index separately in two queries.

Alternatively, manage sections as a `DraftSection[]` array (same as DraftStep[] today) and write all sections in a delete-all + re-insert pattern on form save, which guarantees correct order_index on every save.

**Warning signs:**
- `SELECT * FROM recipe_sections WHERE recipe_id = $1 ORDER BY order_index ASC` returns sections in wrong visual order after an insert without a drag operation.
- Two sections have the same `order_index` value for the same recipe.
- A freshly added section appears between existing sections instead of at the bottom.

**Phase to address:**
Phase 1 (Schema + data layer) for `reorderRecipeSections` design. Phase 3 (Form UI) for section state management. Test: add section, delete section, add section again; assert `order_index` values are [0, 1], not [0, 2] or [0, 0].

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Inner DndContext per section card for step reorder | Keeps RecipeStepList unchanged | Section drag events never reach outer context; cross-section step moves impossible | Never — must use single DndContext |
| Use database `id` as useSortable identifier for sections | No localId plumbing needed | Integer namespace collision with step IDs in single DndContext | Never — use localId (UUID) consistently |
| duplicateRecipe copies steps with original section_id | Simpler loop, one fewer query | Copied recipe's steps reference source recipe's sections; structural corruption on source delete | Never |
| Skip initializing DraftSection from existingSteps atomically | Simpler code, one effect per query | Two-phase initialization causes stale draft state on rapid re-open | Never |
| Only invalidate `RECIPE_SECTIONS_KEY` in useDeleteRecipeSection | Less code to write | Step count, availability, swatch caches go stale after section delete | Never — all 5 keys required |
| Always show section card UI regardless of section count | No conditional render logic needed | Simple recipes feel heavier; violates product principle | Only acceptable as temporary spike/prototype — never ship |
| INSERT new section with `order_index = MAX(order_index) + 1` | Contiguous if no deletes | Gaps accumulate after deletes; two sections get same order_index | Never — use array position as source of truth |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| @dnd-kit nested DndContext | Two DndContexts (section + step level) | Single DndContext at RecipeSectionList level; multiple SortableContexts inside |
| @dnd-kit useSortable ids with sections + steps | Pass `section.db_id` or `step.id` (integers) | Pass `section.localId` and `step.localId` (UUID strings) — always unique across entity types |
| RecipeStepList currently owns DndContext | Reuse RecipeStepList unchanged when adding sections | Strip DndContext out of RecipeStepList; it becomes SortableContext only; DndContext moves up one level |
| duplicateRecipe adding section_id to step copy loop | Copy section_id as-is from original step | Build old-id → new-id map for sections first, remap step.section_id during copy |
| LogSessionSheet step selector after sections | Step selector queries all steps for a recipe — still works via `getRecipePaintsByRecipe` | No change needed in Phase 1–4; the step list is flat in LogSessionSheet which is correct |
| migration 018 CASCADE chain | Write section delete test without FK enforcement | Always run `PRAGMA foreign_keys = ON` in test setup; verify sessions.recipe_step_id → NULL after cascaded step delete |
| `getStepCountsBySection()` new helper | Returns 0 for steps where section_id IS NULL | Warn/assert in submit path that all steps have section_id; document the discrepancy |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 section queries in RecipeDetailSheet | Detail sheet slow to open for recipes with many sections | Add `getSectionCountsByRecipe()` GROUP BY helper (same pattern as step counts) if RecipesPage needs per-recipe section counts | Noticeable at 20+ recipes in RecipesPage |
| Batch step helpers broken by section filter | Adding `WHERE section_id IS NOT NULL` to `getStepCountsByRecipe` changes semantics for existing callers | Do not modify `getStepCountsByRecipe` — add a separate `getStepCountsBySection` helper instead | Immediately if existing callers break |
| DraftSection array with deeply nested DraftStep arrays causes full re-render on any step change | Any keystroke in any step rerenders all section cards | Use `useCallback` for per-section `onChange` handlers; `React.memo` on RecipeStepRow | Noticeable at 4+ sections with 8+ steps each |
| Two async queries (sections + steps) for RecipeFormSheet edit mode cause flash of empty state | Edit form opens showing empty sections while steps load | Show loading state until both queries resolve; initialize draft only when both ready | On every edit form open |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Section UI always visible even for one-section recipes | Simple recipes feel harder to create and edit | Collapse section scaffolding for single-section recipes; only show when user adds a second section |
| Collapsing a section while editing loses unsaved changes inside it | User collapses accidentally, steps "disappear", panic | Collapsed sections still exist in draft state; collapse is cosmetic only, never destroys draft data |
| Section names required as non-empty before save | User must name every section to save, even the default one | Default section name ("General" or derived from recipe.area) applied automatically; section name field is optional |
| Move step between sections via drag (cross-section drag) built in v1 | Complex implementation; easy to introduce bugs with single DndContext | Explicitly out of scope for v0.2.7 per milestone doc; if cross-section drag is needed later, add it as a dedicated phase |
| Section reorder drag handles too close to step drag handles | User triggers wrong drag tier accidentally | Section drag handle is on the section card header; step drag handle is on the step row left edge; give each tier a visually distinct drag affordance and sufficient hit area |
| "Delete section" also deletes steps without warning | User accidentally loses 6 steps | Show confirmation: "Delete section and its N steps?" with step count from `getStepCountsBySection` |

---

## "Looks Done But Isn't" Checklist

- [ ] **Migration cascade test:** Create section with 2 steps + sessions linked to those steps; delete section; assert steps gone AND session.recipe_step_id IS NULL (not just section gone)
- [ ] **Duplicate recipe sections:** Duplicate a 2-section recipe; delete the original; open the copy; assert section names and step groupings are intact (not referencing deleted sections)
- [ ] **Single DndContext coverage:** Drag section A below section B; assert section order correct. Then drag step 1 within section B to position 3; assert step order correct, section order unchanged
- [ ] **ID namespace safety:** Log all useSortable IDs during a drag session; assert no integer value appears as both a section ID and a step ID in the same DndContext
- [ ] **Cache symmetry after section delete:** Delete a section; assert recipe-step-counts, recipe-paint-availability, and recipe-swatch-colors all update without page navigation
- [ ] **Simple recipe regression:** Create a new 3-step recipe; assert it feels as fast as in v2.5 (no mandatory section naming before first step can be added)
- [ ] **Order index after insert+delete:** Add 3 sections; delete the middle one; add a new one; assert order_index values are [0, 1, 2] not [0, 2, 2]
- [ ] **Batch helpers unmodified:** `getStepCountsByRecipe()` and `getRecipePaintAvailability()` return identical results to pre-v0.2.7 for recipes with all steps assigned to a section
- [ ] **LogSessionSheet regression:** Open LogSessionSheet; select a recipe; assert step dropdown still lists steps in the correct order; no section data or IDs leaking into step selector

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Two nested DndContexts shipped (Pitfall 1) | HIGH — requires architectural refactor | Audit all recipe feature files for DndContext imports; lift to single DndContext; remove inner ones; retest all drag scenarios |
| Integer ID collision in sortable (Pitfall 2) | MEDIUM | Add localId to DraftSection, update all SortableContext items arrays and useSortable calls; no DB change needed |
| duplicateRecipe copies wrong section_ids (Pitfall 4) | MEDIUM — data corruption in existing duplicates | Write a migration that deletes duplicate recipe steps pointing to other recipe's sections and re-assigns them to the duplicate's default section; add section copy logic to duplicateRecipe |
| Stale step count badges after section delete (Pitfall 7) | LOW | Add 4 missing invalidateQueries calls to useDeleteRecipeSection.onSuccess; takes effect immediately |
| Order_index drift causing wrong section order (Pitfall 9) | LOW | Run a one-time SQL to normalize: `UPDATE recipe_sections SET order_index = (SELECT COUNT(*) FROM recipe_sections rs2 WHERE rs2.recipe_id = recipe_sections.recipe_id AND rs2.id < recipe_sections.id)` |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Two nested DndContexts (Pitfall 1) | Phase 3 — single DndContext architectural decision before any drag code | Test: section drag + step drag both work in same form instance |
| Integer ID namespace collision (Pitfall 2) | Phase 3 — localId convention on DraftSection before SortableContext wiring | Test: 3 sections × 3 steps — 12 unique UUID string IDs in DndContext |
| Cascade chain missing sessions (Pitfall 3) | Phase 1 — cascade FK test in migration tests | Test: section delete cascades to sessions.recipe_step_id = NULL |
| duplicateRecipe ignoring sections (Pitfall 4) | Phase 4 — first item in Phase 4 checklist | Test: duplicate → delete original → open copy → sections intact |
| Batch helpers silently excluding sectionless steps (Pitfall 5) | Phase 1 — getStepCountsBySection design + submit path assertion in Phase 3 | Test: query both helpers for same recipe; totals match |
| Two-phase draft initialization race (Pitfall 6) | Phase 3 — buildDraftSections pure function tested before component wiring | Test: open edit form; assert sections+steps populated atomically on first render |
| Cache asymmetry on section delete (Pitfall 7) | Phase 1 — all 5 keys in useDeleteRecipeSection before any UI | Test: delete section → step count badge updates without navigation |
| Section UI overwhelming simple recipes (Pitfall 8) | Phase 3 — progressive disclosure rule coded before RecipeSectionCard renders | Test: new recipe has no visible section card until "Add Section" is clicked |
| Order index drift (Pitfall 9) | Phase 1 — reorderRecipeSections design; Phase 3 — draft array as source of truth | Test: add+delete+add sections; assert contiguous order_index values |

---

## Sources

- Direct inspection: `src/features/recipes/RecipeStepList.tsx` — confirmed DndContext + SortableContext + closestCenter; this DndContext must be lifted when adding section-level sort
- Direct inspection: `src/features/recipes/recipeSteps.ts` — confirmed `localId: crypto.randomUUID()` pattern for DraftStep; must mirror for DraftSection
- Direct inspection: `src/features/recipes/RecipeFormSheet.tsx` — confirmed single useEffect keyed on `[recipe?.id, existingSteps.length]`; two-query initialization adds race condition
- Direct inspection: `src/db/queries/recipes.ts` — confirmed `duplicateRecipe` copies steps with `section_id` absent from INSERT (column doesn't exist yet but must be added correctly)
- Direct inspection: `src/db/queries/recipePaints.ts` — confirmed `getStepCountsByRecipe` and `getRecipePaintAvailability` both use `GROUP BY recipe_id`; no section_id consideration
- Direct inspection: `src/hooks/useRecipePaints.ts` — confirmed 5 exported cache keys that section delete mutations must also invalidate
- Direct inspection: `src-tauri/migrations/014_session_recipe_link.sql` — confirmed `painting_sessions.recipe_step_id REFERENCES recipe_steps(id) ON DELETE SET NULL`; cascade chain risk confirmed
- Direct inspection: `src-tauri/migrations/` — confirmed next hobbyforge.db migration is **018** (017 is latest: `017_unit_overrides.sql`)
- Codebase pattern: `PROJECT.md` Key Decisions — "useFieldArray NOT used for step forms — Documented ID collision with @dnd-kit useSortable (RHF #10607)"
- Codebase pattern: `PROJECT.md` Key Decisions — "Cache invalidation symmetry rule — If useCreate invalidates a key, useDelete must too"
- Codebase pattern: `PROJECT.md` Key Decisions — "Sibling Sheet/Dialog portal pattern — Nested Radix portals cause z-index and context issues"
- Research: @dnd-kit GitHub Discussion #766 — confirmed events are consumed by innermost DndContext, do not bubble to parent
- Research: @dnd-kit GitHub Discussion #280 — "DndContext catches a drop event and doesn't pass it on" — architectural constraint confirmed
- Research: @dnd-kit GitHub Issue #46 — "DndContext reducers all point to the same initial state variable, causing ID collisions across nested and sibling providers"
- Research: @dnd-kit docs (docs.dndkit.com/presets/sortable/sortable-context) — confirmed multiple SortableContexts within single DndContext is the correct multi-container pattern
- Research: RHF Discussion #10607 (github.com/orgs/react-hook-form/discussions/10607) — confirmed ID collision between useFieldArray numeric ids and @dnd-kit useSortable; this codebase already avoids useFieldArray for this reason
- Research: SQLite ALTER TABLE docs (sqlite.org/lang_altertable.html) — `ADD COLUMN` with nullable FK is safe; no table rebuild required for nullable FK addition
- Research: TanStack Query docs — invalidateQueries with exact:false covers hierarchical key trees; cross-file key imports required for cross-entity invalidation

---
*Pitfalls research for: HobbyForge v0.2.7 — Hierarchical recipe sections added to flat-step recipe system*
*Researched: 2026-05-08*
