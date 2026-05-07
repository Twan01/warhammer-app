# Pitfalls Research

**Domain:** HobbyForge v2.5 Recipes 2.0 / Painting Studio — adding structured steps, metadata, paint availability, and gallery/timeline UX to an existing Tauri 2 + React 19 + SQLite app with 16 tables and 778 tests
**Researched:** 2026-05-06
**Confidence:** HIGH — derived from direct codebase inspection of all affected files (recipes queries, hooks, components, migrations, photo storage pattern)

---

## Critical Pitfalls

### Pitfall 1: Migration Orphans — recipe_paints Rows Not Promoted to recipe_steps

**What goes wrong:**
Migration 012 adds the new `recipe_steps` table but existing `recipe_paints` rows are never moved into it. The old `recipe_paints` table is retained for PINV-05 (paint→recipe badge) and `useRecipeSwatchData`, but the RecipeDetailSheet and RecipeFormSheet now read from `recipe_steps` and expect new columns (`phase`, `tool`, `technique`, `duration`, `photo_asset_id`). Any recipe created before migration 012 shows zero structured steps even though it has data in `recipe_paints`.

**Why it happens:**
The architecture audit correctly flags: "Existing recipe_paints rows need batch migration to recipe_steps." Migration writers often add the `CREATE TABLE recipe_steps` statement and stop there. The follow-up `INSERT INTO recipe_steps SELECT ... FROM recipe_paints` is treated as a separate task and gets cut when time is short.

**How to avoid:**
Migration 012 must include both the schema change and the data backfill in a single transaction:
```sql
-- 1. Create recipe_steps
CREATE TABLE IF NOT EXISTS recipe_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  phase TEXT,
  paint_id INTEGER REFERENCES paints(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Backfill from existing recipe_paints
INSERT INTO recipe_steps (recipe_id, order_index, title, paint_id, notes)
SELECT recipe_id, order_index, step_name, paint_id, notes
FROM recipe_paints;
```
Write a test that seeds two `recipe_paints` rows, runs the migration SQL, and asserts both appear in `recipe_steps`.

**Warning signs:**
- RecipeDetailSheet shows "No steps added yet" for recipes that have steps.
- `recipe_paints` COUNT in the DB is non-zero but `recipe_steps` COUNT is zero after migration.
- `useRecipeSteps` (new hook) returns empty arrays while `useRecipePaints` still returns data.

**Phase to address:**
Schema / migration phase — the first phase of v2.5, before any UI work on recipe steps.

---

### Pitfall 2: Cache Invalidation Asymmetry When Adding recipe_steps Mutations

**What goes wrong:**
`useCreateRecipeStep` and `useDeleteRecipeStep` are introduced but only invalidate `["recipe-steps", recipeId]`. They omit `["recipe-swatch-colors"]`, `["recipe-paints", "all-counts"]`, and `["kanban-enrichment"]` — keys that still depend on paint linkage per recipe. The Recipes page shows a stale step-count badge. The swatch strip on recipe cards shows stale or missing colors. The PINV-05 paint filter on the Recipes page stops working for newly structured recipes.

**Why it happens:**
The existing cache map (V3_ARCHITECTURE_AUDIT.md §3) documents dependencies on `recipe_paints` mutations, not `recipe_steps` mutations. When the new hook is written, the developer copies the minimal invalidation they can see and misses the cross-hook dependencies.

**How to avoid:**
Apply the cache invalidation symmetry rule established in this codebase. Any mutation that changes what paints are linked to a recipe must invalidate ALL of:
- `["recipe-steps", recipeId]`
- `["recipe-swatch-colors"]` (RECIPE_SWATCH_KEY — drives swatch strips on cards)
- `["recipe-paints", "all-counts"]` (drives the step-count badge in RecipesPage)
- `["kanban-enrichment"]` (drives the recipe name on Kanban cards)
- `["recipes", "by-unit"]` (drives recipe-unit bidirectional navigation)

Document this dependency list as a comment block in `useRecipeSteps.ts` at the top of the mutations section.

**Warning signs:**
- Recipe card swatch strip goes blank after adding a step via the new mutations.
- Step-count badge shows a stale number after save.
- Paint filter on the Recipes page no longer narrows results correctly after adding a step.
- `useDeleteRecipeStep` does not invalidate `["kanban-enrichment"]`.

**Phase to address:**
The phase that introduces `useRecipeSteps` mutations. Verify with cache invalidation assertions (pure tests that check the returned mutation options include all required keys).

---

### Pitfall 3: Pre-Existing Cache Gap — useDeleteRecipe Missing kanban-enrichment Invalidation

**What goes wrong:**
`useDeleteRecipe` in `useRecipes.ts` (lines 52–59) currently invalidates `["recipes"]` and `["recipes", "by-unit"]` but does NOT invalidate `["kanban-enrichment"]`. `useCreateRecipe` correctly invalidates `["kanban-enrichment"]` (line 33). After deleting a recipe linked to a unit, the Kanban card still shows the deleted recipe name until the page is refreshed.

This bug already exists before v2.5 starts. It will become user-visible as Recipes 2.0 surfaces recipe data more prominently.

**Why it happens:**
Violation of the cache invalidation symmetry rule: `useCreateRecipe` invalidates `["kanban-enrichment"]` but `useDeleteRecipe` does not. The asymmetry was not caught in prior phases because recipe deletion is less common than creation.

**How to avoid:**
Add `qc.invalidateQueries({ queryKey: ["kanban-enrichment"] })` to `useDeleteRecipe.onSuccess` before any v2.5 work begins. This is a one-line fix. Also add it to `useDeleteRecipeStep` and `useUpdateRecipeStep` for completeness.

**Warning signs:**
- Delete a recipe linked to a unit. Open the Kanban. The card still shows the recipe name without a page refresh.
- `useDeleteRecipe.onSuccess` contains fewer invalidation calls than `useCreateRecipe.onSuccess`.

**Phase to address:**
Pre-flight bug fix in Phase 1 of v2.5 before any new feature work.

---

### Pitfall 4: Flat → Structured Form Explosion Inside a Single Sheet

**What goes wrong:**
The RecipeFormSheet currently manages 5 recipe metadata fields plus a `DraftStep[]` array. For Recipes 2.0 it must also manage 7 new metadata fields (style, surface, effect, difficulty, estimated_minutes, result_photo, tutorial_link — some already exist) plus richer per-step fields (phase, tool, technique, duration, photo per step) plus paint substitutions per step. Putting everything in one Sheet creates a form that exceeds the Sheet's scrollable viewport, triggers React Hook Form `watch` re-renders on every keystroke across all fields, and presents an overwhelming UX.

**Why it happens:**
The existing RecipeFormSheet pattern handles a small flat form well. The natural instinct is to keep adding fields to it because the pattern is "working." The form only breaks when someone counts 25+ fields and realises the Sheet scrolls three full viewport heights.

**How to avoid:**
Split the form across two concerns at the component boundary:
1. **Recipe metadata form** — stays in RecipeFormSheet: name, faction, unit, area, style, surface, effect, difficulty, estimated_minutes, result_photo, tutorial_link.
2. **Step editor** — becomes a separate child area (not a nested Sheet) that edits each step in isolation. Keep the `DraftStep[]` local state pattern: steps are drafted in React state and persisted atomically on form submit.

Do NOT create a nested Sheet for step editing. This violates the sibling portal contract (established in KEY DECISIONS: "Sibling Sheet/Dialog portal pattern — Nested Radix portals cause z-index and context issues"). Use a Popover or inline accordion for per-step expansion.

**Warning signs:**
- RecipeFormSheet scrolls more than two viewport heights.
- Any React profiler trace shows more than 3 re-renders per keystroke on a step field.
- A nested `<Sheet>` is rendered inside the existing Sheet's `<SheetContent>`.

**Phase to address:**
RecipeFormSheet redesign phase. Establish the component split before writing per-step fields.

---

### Pitfall 5: Optimistic Step Reorder Conflicting With Save-on-Submit Pattern

**What goes wrong:**
The existing `RecipeStepList` stores step order in local React state (`DraftStep[]`) and writes to the DB only on form submit. If the new Studio view adds "persist step order immediately on drag end" (optimistic), the two update paths collide: a drag updates the DB directly, but the form still holds the pre-drag order in its `steps` state. On save, the form's order overwrites the drag-persisted order, reverting the reorder.

**Why it happens:**
Two dnd-kit patterns coexist in this codebase: the Kanban (DB-write on drag end) and RecipeStepList (local state only, write on submit). Both are valid. If someone imports the Kanban mental model into a recipe form context, they implement drag-to-persist while the form still uses draft state, causing silent order reversion.

**How to avoid:**
Pick one model and document it explicitly. The recommended model for RecipeFormSheet step reordering is **local draft state only**: drag reorders `DraftStep[]` in React state; the DB write happens atomically on form submit. This avoids partial-save problems.

If the Studio view (outside the form) needs instant-persist reordering, implement it as a completely separate interaction path: a standalone `reorderRecipeSteps` mutation that calls a batch `UPDATE recipe_steps SET order_index = $2 WHERE id = $1` for each step, invalidates `["recipe-steps", recipeId]`, and never touches form state. Keep the two paths strictly separate with a comment explaining why.

**Warning signs:**
- Step order reverts to pre-drag order after saving the form.
- `recipe_steps` rows accumulate duplicates on repeated saves.
- The same step ID appears twice in the DB for a single recipe.

**Phase to address:**
Drag-and-drop step reorder phase. Validate with a test: drag step 1 to position 3, save, reopen the form, assert order matches the dragged state.

---

### Pitfall 6: Photo Storage for Recipe Steps Using Absolute Paths

**What goes wrong:**
The Tauri file dialog returns an absolute filesystem path (e.g. `C:\Users\antoi\Pictures\photo.jpg`). The developer stores this in `image_assets.file_path` or a `recipe_steps.photo_asset_id` text column. The photo renders correctly on the machine where it was added, but the stored path is not portable — it breaks if the app data directory moves, if HobbyForge is reinstalled, or if the database is copied to another machine.

**Why it happens:**
The existing `unitPhotos.ts` module solves this correctly (stores only the UUID filename relative to `appDataDir()`, derives the full path at render via `join(appDataDir(), file_path)`). This pattern lives in `src/types/unitPhoto.ts` and `src/hooks/useUnitPhotos.ts` — files that recipe feature developers may not read when building a new photo upload flow.

**How to avoid:**
Reuse the exact pattern from `createUnitPhoto`:
1. Use `tauri-plugin-dialog` to open a file picker restricted to image types.
2. Copy the selected file to `appDataDir()/recipe-step-photos/<uuid>.<ext>` using `tauri-plugin-fs copyFile`.
3. Call `mkdir(dir, { recursive: true })` before `copyFile` — the subdirectory may not exist.
4. Store ONLY the UUID filename in `image_assets.file_path`.
5. At render time: `convertFileSrc(await join(await appDataDir(), file_path))`.

Create a shared utility `src/lib/photoUpload.ts` that encodes this sequence once and is imported by both unit and recipe step photo uploads. Never duplicate the Tauri API call sequence.

**Warning signs:**
- `file_path` values in `image_assets` contain `\` or `/` path separators.
- Photos display in dev but not after reinstall or when copied to a different drive.
- Photo thumbnail shows a broken image after the app data directory is moved.

**Phase to address:**
Per-step photo upload phase. Add a TypeScript assertion that `file_path` must not contain path separators. Verify with a post-upload DB inspection.

---

### Pitfall 7: N+1 Queries When Computing Paint Availability Per Recipe

**What goes wrong:**
Paint availability computation ("does the user own all paints needed by recipe X?") is implemented by calling `getRecipeStepsByRecipe(recipeId)` for each recipe in a loop, then checking each paint's `owned` flag — O(recipes × steps) SQLite round-trips. At 20 recipes with 8 steps each that is 160+ queries. The Recipes page freezes noticeably on load.

The N+1 pattern already exists in `useAllStepCounts` in RecipesPage (calls `getRecipePaintsByRecipe(r.id)` in a for loop over all recipes). Paint availability is the same trap, made worse by the join.

**How to avoid:**
Use the single-query batch pattern established by `getRecipeSwatchColors()`:
```sql
SELECT rs.recipe_id, rs.paint_id, p.owned, p.running_low
FROM recipe_steps rs
LEFT JOIN paints p ON p.id = rs.paint_id
ORDER BY rs.recipe_id ASC, rs.order_index ASC
```
Return a flat array. Group by `recipe_id` in the hook. Expose as `Map<recipeId, PaintAvailability[]>`. Never loop over recipes and fire individual queries.

While addressing this, also fix the existing `useAllStepCounts` N+1 in RecipesPage by replacing the per-recipe loop with a single `SELECT recipe_id, COUNT(*) FROM recipe_steps GROUP BY recipe_id` query.

**Warning signs:**
- Recipes page load time increases linearly with recipe count.
- A profiler trace shows repeated `SELECT ... FROM recipe_steps WHERE recipe_id = $1` with different IDs.
- `useAllPaintAvailability` is undefined for multiple render cycles while the loop runs.

**Phase to address:**
Paint availability computation phase. Require the single-query approach before any UI is wired. Fix the `useAllStepCounts` N+1 in the same phase.

---

### Pitfall 8: Recipe Duplication Orphans Substitutions

**What goes wrong:**
Recipe duplication copies the `painting_recipes` row and all `recipe_steps` rows, but does not copy `recipe_paint_substitutions`. Or, if substitutions are copied, they still reference the old `recipe_steps.id` values — which differ on the new recipe. The duplicated recipe shows zero substitutions even though the original had several.

**Why it happens:**
Duplication is naturally implemented as two INSERT loops: copy recipe, copy steps, done. The substitution table is either not considered, or the developer forgets that substitution rows carry a `step_id` FK that must be remapped to the new step IDs.

**How to avoid:**
Implement duplication atomically and in the correct order in a single transaction:
1. `INSERT INTO painting_recipes ... RETURNING id` → `newRecipeId`
2. For each step: `INSERT INTO recipe_steps ... RETURNING id` → capture `oldStepId → newStepId` mapping
3. For each substitution of the original recipe: `INSERT INTO recipe_paint_substitutions` using the mapping to translate `step_id` to the new step IDs

Write this as `duplicateRecipe(id: number): Promise<number>` in `src/db/queries/recipes.ts`. Test with a recipe that has 2 steps and 3 substitutions; assert the duplicate has exactly 2 steps and 3 substitutions pointing to the new step IDs, with `PRAGMA foreign_key_check` returning zero violations.

**Warning signs:**
- Duplicated recipe shows a different step count than the original.
- `recipe_paint_substitutions` rows accumulate with `step_id` values pointing to non-existent steps.
- The substitution panel shows empty on a duplicated recipe.

**Phase to address:**
Recipe duplication phase. Must not be implemented until the substitution schema (`recipe_paint_substitutions`) exists.

---

### Pitfall 9: DraftStep localId vs. Persisted Step id Used as dnd-kit Sortable id

**What goes wrong:**
The current `RecipeStepList` uses `step.localId` (a `crypto.randomUUID()`) as the dnd-kit sortable `id`. When the new Studio view needs to operate on persisted steps (not draft state), the developer switches to `step.id` (the DB integer) as the sortable `id`. If both approaches coexist in the same component — or if `step.id.toString()` and `step.localId` are both passed to different `SortableContext` instances — the `findIndex` lookup in `handleDragEnd` returns `-1` and dragging silently produces no reorder.

**Why it happens:**
Draft state (form flow) and persisted state (Studio flow) have different identity fields. Both are valid in isolation. They break when mixed in one component without explicit documentation of which id type is in use.

**How to avoid:**
Create two distinct components: `RecipeStepList` (existing, uses `DraftStep[]` with `localId`) and `StudioStepList` (new, uses `RecipeStep[]` with `step.id.toString()`). Add a JSDoc comment above each listing which id field is used as the sortable id. Never import one into the other's context.

**Warning signs:**
- Drag reorder appears to execute but the step stays in its original position.
- `handleDragEnd` logging shows `oldIndex: -1` or `newIndex: -1`.
- Steps re-sort themselves back to original order on the next render.

**Phase to address:**
Studio UX phase when a non-form step editor is introduced.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep the existing `useAllStepCounts` N+1 loop in RecipesPage | No refactor needed | O(N) queries, freezes at 20+ recipes | Never — fix in schema phase |
| Store paint availability as client-side filter only (no DB query) | Simpler initial implementation | Stale "missing" indicator if `paints.owned` changes during session | Acceptable for MVP Studio; revisit if staleness becomes noticeable |
| Keep `recipe_paints` as the authoritative paint-linkage table after adding `recipe_steps` | No migration risk | Two sources of truth for "what paints are in this recipe" — diverge as steps are edited | Not acceptable beyond the migration phase — pick one table |
| Skip per-step photos in the first Studio phase | Faster to ship card/timeline view | Adding photos later requires migrating `image_assets` entity_type handling | Acceptable if the roadmap has an explicit "Step Photos" phase |
| Inline the paint availability computation in RecipesPage | Avoids a new hook file | Untestable in isolation; duplicated if another page needs the same logic | Never — extract to a pure function first (TDD Wave 0 pattern) |
| `useAllStepCounts` queryKey includes joined recipe IDs as a string | Unique key per recipe list snapshot | Key changes on every recipe add/delete, busting all step-count caches | Acceptable as a stopgap; replace with stable `["recipe-steps", "all-counts"]` key |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `tauri-plugin-dialog` (file picker) | Store the raw absolute path from `selected` as the DB value | Copy file to `appDataDir()/recipe-step-photos/` via `tauri-plugin-fs`, store only UUID filename |
| `tauri-plugin-fs copyFile` | Call `copyFile(src, dest)` without ensuring destination dir exists | Call `await mkdir(dir, { recursive: true })` before `copyFile` |
| `convertFileSrc` | Call it with a relative path — returns an invalid `asset://` URL | Always `join(await appDataDir(), relativeFilename)` first, then `convertFileSrc(absolutePath)` |
| `dnd-kit` inside Sheet | `DndContext` wrapping the Sheet content; scroll events interfere with drag threshold | Keep `activationConstraint: { distance: 5 }` on PointerSensor — already set in RecipeStepList |
| React Hook Form + step array | Switching to `useFieldArray` for the steps array | Keep the manual `DraftStep[]` state pattern — `useFieldArray` re-indexes on removal, causing unnecessary re-renders |
| `painting_sessions.recipe_id` FK | Adding the column without a default and then inserting sessions without it | Always add nullable FK columns with no DEFAULT; existing NULL rows mean "no recipe linked" — valid |
| `image_assets` entity_type for recipe steps | Inventing a new `entity_type` value per feature ad-hoc | Establish `"recipe-step"` as the canonical `entity_type` value in a comment in `src/types/` before any insert |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 step count queries (RecipesPage `useAllStepCounts`) | Page freezes 0.5–2s on load with 20+ recipes | Single `SELECT recipe_id, COUNT(*) FROM recipe_steps GROUP BY recipe_id` | Already noticeable at 10+ recipes |
| N+1 paint availability queries per recipe | Recipes page load degrades linearly | Batch LEFT JOIN query grouping by recipe_id | Noticeable at 5+ recipes with 6+ steps |
| Multiple `appDataDir()` calls per photo row at render time | Photo gallery load slow; Tauri IPC roundtrips per row | Call `appDataDir()` once per hook invocation, pass result to row mapping (`useUnitPhotos` pattern) | Noticeable at 10+ step photos visible simultaneously |
| Timeline view renders all sessions without a limit | Scrolling through a long paint history lags | Limit to last 20 sessions; add "load more" only if requested | Above ~50 timeline entries |
| `useRecipeSwatchData` returns a large Map when recipes are split into many small steps | Swatch strips compute more joins than before | The batch query already uses ORDER BY for grouping — no additional fix needed | Scales well; not a concern unless 1000+ recipe_steps rows |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Recipe duplication leaves user at the recipe list with no selection | User does not know which recipe is the new copy | After duplication, open the new recipe's DetailSheet immediately |
| Paint availability shows "missing" for a paint that is running low but still owned | User thinks they need to buy a paint they already own | A running-low paint (owned=1, running_low=1) is still owned — show a distinct "running low" warning badge, not "missing" |
| Studio step editor opens a nested Sheet to edit a step | Violates sibling portal contract; z-index and context failures | Use Popover or inline accordion for per-step expansion — never a nested Sheet |
| "Result photo" field in recipe metadata accepts any file type | User selects a PDF; app silently fails | Set dialog filter: `{ name: "Images", extensions: ["jpg","jpeg","png","webp"] }` |
| Timeline view mixes recipe-linked sessions with unlinked sessions indistinguishably | User cannot tell which sessions used a recipe | Show a recipe name badge on sessions where `recipe_id IS NOT NULL` |
| Empty Studio grid card when recipe has no result photo | Grid feels incomplete and inconsistent | Use a consistent painted-palette SVG fallback with the faction accent color, matching the UnitThumbnail fallback pattern |

---

## "Looks Done But Isn't" Checklist

- [ ] **Migration 012 backfill:** `SELECT COUNT(*) FROM recipe_steps` equals the pre-migration `SELECT COUNT(*) FROM recipe_paints`
- [ ] **Pre-existing cache gap fixed:** Delete a recipe linked to a unit; verify Kanban card no longer shows recipe name without page refresh
- [ ] **Cache symmetry for recipe_steps mutations:** Create a step, delete a step — verify swatch strip, step-count badge, and paint filter all update without manual refresh
- [ ] **Paint availability running-low vs. missing:** A paint with `owned=1` and `running_low=1` shows "running low" not "missing" in the recipe availability panel
- [ ] **Recipe duplication includes substitutions:** Duplicate a recipe with substitutions; verify the new recipe has matching step and substitution counts, and `PRAGMA foreign_key_check` returns zero violations
- [ ] **Step photo uses relative path:** Inspect `image_assets.file_path` after a recipe step photo upload — must contain only a UUID filename with no path separators
- [ ] **DnD step reorder persists on save:** Drag step 1 to position 3, save the recipe, close and reopen — step order matches the dragged state
- [ ] **Session-to-recipe linking:** Log a painting session linked to a recipe; verify `painting_sessions.recipe_id` is set and the session appears in the recipe timeline view
- [ ] **Substitution FK integrity after duplication:** `PRAGMA foreign_key_check` after recipe duplication returns zero violations

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Migration orphans (recipe_paints not backfilled) | HIGH | Write a new repair migration (next number, never edit existing) that runs `INSERT INTO recipe_steps SELECT ... FROM recipe_paints WHERE id NOT IN (SELECT ... FROM recipe_steps)` |
| Absolute paths stored in file_path | HIGH | Write a one-time Rust command that copies each file to appDataDir, renames it to a UUID, and updates the DB row; add a migration that calls this command at startup |
| Cache asymmetry causing stale UI | LOW | Add missing `invalidateQueries` calls to the affected mutation `onSuccess` handlers; non-destructive, takes effect on next mutation |
| N+1 query performance | MEDIUM | Replace per-recipe loop with a batch query in the query module; hook interface stays the same; no UI changes needed |
| Nested Sheet portal conflict | MEDIUM | Replace nested Sheet with Popover or inline accordion; component API changes but data model is unaffected |
| DnD id collision (localId vs. id) | LOW | Rename the id prop in the Studio component; purely a component-local fix, no data model impact |
| Duplication orphaned substitutions | MEDIUM | Write a repair query that matches original recipe's substitutions by step order_index and inserts them against the new step IDs |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Migration orphans (Pitfall 1) | Schema / migration phase | `SELECT COUNT(*) FROM recipe_steps` equals pre-migration `recipe_paints` COUNT |
| Cache invalidation asymmetry (Pitfall 2) | Hook / query layer phase | Test: create and delete a step; assert all 5 cache keys invalidated |
| Pre-existing delete cache gap (Pitfall 3) | Pre-flight bug fix, Phase 1 | Delete linked recipe; verify Kanban card updates without page refresh |
| Form complexity explosion (Pitfall 4) | RecipeFormSheet redesign phase | RecipeFormSheet renders in under 200ms; no nested Sheet in component tree |
| DnD vs submit order collision (Pitfall 5) | Drag-and-drop phase | Test: drag step, save, reopen — order is preserved |
| Absolute photo paths (Pitfall 6) | Per-step photo upload phase | DB assertion: no `file_path` value contains a path separator |
| N+1 paint availability (Pitfall 7) | Paint availability computation phase | Query count assertion: exactly 1 SQLite query for any number of recipes |
| Duplication orphans substitutions (Pitfall 8) | Recipe duplication phase | Test: duplicate recipe with 2 steps and 3 subs; assert new recipe has 2 steps and 3 subs |
| DnD id collision (Pitfall 9) | Studio UX phase | Drag in Studio; assert `handleDragEnd` never receives `oldIndex: -1` |

---

## Sources

- Direct inspection: `src/db/queries/recipes.ts`, `src/db/queries/recipePaints.ts`, `src/db/queries/unitPhotos.ts`
- Direct inspection: `src/hooks/useRecipes.ts` — confirmed missing `["kanban-enrichment"]` invalidation in `useDeleteRecipe`
- Direct inspection: `src/hooks/useRecipePaints.ts`, `src/hooks/useUnitPhotos.ts`, `src/hooks/useJournalSessions.ts`
- Direct inspection: `src/features/recipes/RecipeFormSheet.tsx`, `RecipeDetailSheet.tsx`, `RecipeStepList.tsx`, `RecipeStepRow.tsx`, `recipeSteps.ts`
- Direct inspection: `src/features/recipes/RecipesPage.tsx` — identified existing N+1 in `useAllStepCounts` (for loop over `getRecipePaintsByRecipe`)
- Direct inspection: `src-tauri/migrations/001_core_schema.sql` (recipe_paints schema), `005_hobby_journal.sql` (painting_sessions, image_assets.stage_label)
- Direct inspection: `src/types/unitPhoto.ts` — established photo storage pattern (UUID relative path, never absolute)
- Direct inspection: `.planning/V3_ARCHITECTURE_AUDIT.md` §4 (gap analysis), §7 (risk assessment: "Recipe data migration (3.1): critical"), §8 (architecture strengths: sibling portal contract, cache invalidation symmetry)
- Direct inspection: `.planning/PROJECT.md` — Key Decisions table (sibling portal pattern, cache invalidation symmetry rule, additive migration pattern)
- Pattern source: `getRecipeSwatchColors()` in `recipePaints.ts` — batch query pattern preventing N+1

---
*Pitfalls research for: HobbyForge v2.5 Recipes 2.0 / Painting Studio*
*Researched: 2026-05-06*
