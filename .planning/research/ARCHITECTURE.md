# Architecture Research

**Domain:** HobbyForge v2.5 Recipes 2.0 / Painting Studio — structured recipe steps, metadata, paint substitutions, session linking
**Researched:** 2026-05-06
**Confidence:** HIGH — based on direct code audit of all existing recipe files, migration SQL, and architecture audit document

---

## Existing Architecture (Baseline)

### Current Recipe Data Model

```
painting_recipes (1 row per recipe)
  id, name, faction_id, unit_id, area
  primer, basecoat, shade, layer, highlight,   <- flat TEXT columns, written as NULL, never read
  glaze_filter, weathering, technical, basing
  notes, tutorial_link
  created_at, updated_at

recipe_paints (1 row per step — the current "step" concept)
  id, recipe_id, paint_id
  step_name     <- "Basecoat", "Shade", etc.
  order_index   <- drag-sort position
  notes         <- per-step notes
  created_at
```

The 9 flat TEXT columns on `painting_recipes` (primer/basecoat/shade/etc.) are **dead weight** — `RecipeFormSheet.tsx` explicitly writes them as `null` on every create and no component ever reads them. They exist only in the migration. This is confirmed by auditing all `SELECT *` usages — the columns are in the struct but never displayed.

### Current Data Flow

```
RecipesPage (state: selectedRecipe, detailOpen, formOpen, deleting)
  |
  +- RecipeTable         <- useRecipes() + useAllStepCounts() + useRecipeSwatchData()
  +- RecipeDetailSheet   <- useRecipePaints(recipe.id) + usePaints() + useFactions() + useUnits()
  +- RecipeFormSheet     <- local [steps: DraftStep[]] + useRecipePaints(recipe.id) for edit seed
  |    +- RecipeStepList (dnd-kit SortableContext over DraftStep[])
  |         +- RecipeStepRow (step_name Input + PaintCombobox per step)
  |              +- [sibling portal] PaintSheet (inline create-new-paint)
  +- RecipeDeleteDialog
```

### Existing Cache Keys

| Key | Owner | Invalidated By |
|-----|-------|---------------|
| `["recipes"]` | useRecipes | create, update, delete recipe |
| `["recipes", id]` | useRecipe(id) | update recipe |
| `["recipe-paints", recipeId]` | useRecipePaints(id) | addRecipePaint, removeRecipePaint |
| `["recipe-swatch-colors"]` | useRecipeSwatchData | addRecipePaint, removeRecipePaint |
| `["recipe-paints", "all-counts", ...]` | useAllStepCounts (inline in RecipesPage) | recipe form submit |
| `["kanban-enrichment"]` | kanban board | create, update recipe |
| `["recipes", "by-unit"]` | by-unit lookup | create, update, delete recipe |
| `["recipe-ids-by-paint", paintId]` | useRecipeIdsByPaint | (read-only nav, not invalidated) |

---

## New Architecture: Recipes 2.0

### Schema Changes (Migration 012)

**New table: recipe_steps** (replaces recipe_paints as the primary step container)

```sql
CREATE TABLE IF NOT EXISTS recipe_steps (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id        INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    title            TEXT    NOT NULL,
    phase            TEXT,                      -- "Basecoat" | "Shade" | "Layer" | "Highlight" | etc.
    paint_id         INTEGER REFERENCES paints(id) ON DELETE SET NULL,
    tool             TEXT,                      -- "Drybrush", "Airbrush", "Layer brush"
    technique        TEXT,                      -- "Thin 1:2 with medium", "Stipple"
    dilution         TEXT,                      -- "1:1 water", "flow improver"
    duration_minutes INTEGER,
    photo_asset_id   INTEGER REFERENCES image_assets(id) ON DELETE SET NULL,
    order_index      INTEGER NOT NULL DEFAULT 0,
    notes            TEXT,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**New table: recipe_paint_substitutions**

```sql
CREATE TABLE IF NOT EXISTS recipe_paint_substitutions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_step_id INTEGER NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
    paint_id       INTEGER NOT NULL REFERENCES paints(id) ON DELETE RESTRICT,
    notes          TEXT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**ALTER TABLE painting_recipes (7 additive columns):**

```sql
ALTER TABLE painting_recipes ADD COLUMN style TEXT;
ALTER TABLE painting_recipes ADD COLUMN surface TEXT;
ALTER TABLE painting_recipes ADD COLUMN effect TEXT;
ALTER TABLE painting_recipes ADD COLUMN difficulty TEXT;           -- "Beginner" | "Intermediate" | "Advanced"
ALTER TABLE painting_recipes ADD COLUMN estimated_minutes INTEGER;
ALTER TABLE painting_recipes ADD COLUMN result_photo_id INTEGER REFERENCES image_assets(id) ON DELETE SET NULL;
ALTER TABLE painting_recipes ADD COLUMN source_recipe_id INTEGER REFERENCES painting_recipes(id) ON DELETE SET NULL;
```

**ALTER TABLE painting_sessions (2 additive columns for recipe-session linking):**

```sql
ALTER TABLE painting_sessions ADD COLUMN recipe_id      INTEGER REFERENCES painting_recipes(id) ON DELETE SET NULL;
ALTER TABLE painting_sessions ADD COLUMN recipe_step_id INTEGER REFERENCES recipe_steps(id)     ON DELETE SET NULL;
```

### FK Semantics Summary

| Relationship | On Delete |
|---|---|
| recipe_steps.recipe_id → painting_recipes | CASCADE (steps die with recipe) |
| recipe_steps.paint_id → paints | SET NULL (step becomes paint-less, not deleted) |
| recipe_steps.photo_asset_id → image_assets | SET NULL |
| recipe_paint_substitutions.recipe_step_id → recipe_steps | CASCADE (substitutions die with step) |
| recipe_paint_substitutions.paint_id → paints | RESTRICT (cannot delete a paint used as substitution) |
| painting_recipes.result_photo_id → image_assets | SET NULL |
| painting_recipes.source_recipe_id → painting_recipes | SET NULL (delete original, copy survives) |
| painting_sessions.recipe_id → painting_recipes | SET NULL (history preserved even if recipe deleted) |
| painting_sessions.recipe_step_id → recipe_steps | SET NULL (history preserved even if step deleted) |

---

## Data Migration: recipe_paints to recipe_steps

### Why Application-Layer, Not SQL Migration

The migration 012 SQL only adds new tables and columns. The actual data copy from `recipe_paints` → `recipe_steps` must happen in TypeScript, not inside the migration file. Reasons:

1. Migration SQL runs before the app UI starts — no progress feedback, no error toasts
2. The migration runner is silent on partial failures
3. `tauri-plugin-sql` migration files run exactly once and cannot be retried selectively

### Migration Strategy

```
App startup sequence:
1. plugin-sql runs migration 012 (schema changes only)
2. migrateRecipePaintsToSteps() called from src/main.tsx (or a startup hook)
3. Guard: if (await countRecipeSteps()) > 0 AND (await countRecipePaints()) > 0 → already migrated, skip
4. INSERT INTO recipe_steps SELECT ... FROM recipe_paints (column mapping below)
5. recipe_paints table stays intact as backup for the migration window
```

**Column mapping:**

```
recipe_paints.recipe_id   → recipe_steps.recipe_id
recipe_paints.step_name   → recipe_steps.title
recipe_paints.paint_id    → recipe_steps.paint_id
recipe_paints.order_index → recipe_steps.order_index
recipe_paints.notes       → recipe_steps.notes
(all new fields: phase, tool, technique, dilution, duration_minutes, photo_asset_id → NULL)
```

**Implementation location:** `src/db/queries/recipeSteps.ts` — exported as `migrateRecipePaintsToSteps()`.

---

## System Overview (Target Architecture)

```
RecipesPage (state: selectedRecipe, detailOpen, formOpen, studioView, deleting)
  |
  +- [table view] RecipeTable
  |    <- useRecipes() + useRecipeStepCounts() + useRecipeSwatchData()
  |
  +- [studio view] RecipeStudioCard per recipe
  |    <- useRecipes() + useRecipeStepCounts() + useRecipeSwatchData()
  |    <- computeAvailability(steps, paintMap) -- pure function
  |
  +- RecipeDetailSheet (or RecipeTimelineView inside it)
  |    <- useRecipeSteps(recipe.id)
  |    <- usePaints() + useFactions() + useUnits()
  |    <- [lazy on step expand] useRecipeSubstitutions(stepId)
  |
  +- RecipeFormSheet (create / edit)
  |    <- local [steps: DraftStep[]] seeded from useRecipeSteps(recipe.id) in edit mode
  |    +- RecipeStepList (dnd-kit SortableContext)
  |         +- RecipeStepRow (title, phase, tool, technique, dilution, PaintCombobox)
  |              +- [sibling portal] PaintSheet (inline create-new-paint)
  |
  +- RecipeDuplicateDialog
  +- RecipeDeleteDialog
```

---

## Component Inventory: New vs Modified

### New Files

| File | Type | Purpose |
|------|------|---------|
| `src/types/recipeStep.ts` | Type | `RecipeStep`, `CreateRecipeStepInput`, `UpdateRecipeStepInput` |
| `src/types/recipeSubstitution.ts` | Type | `RecipeSubstitution`, `CreateRecipeSubstitutionInput` |
| `src/db/queries/recipeSteps.ts` | Query | Full CRUD for `recipe_steps` + migration helper + batch count query |
| `src/db/queries/recipeSubstitutions.ts` | Query | CRUD for `recipe_paint_substitutions` |
| `src/hooks/useRecipeSteps.ts` | Hook | `useRecipeSteps(recipeId)`, `useCreateRecipeStep()`, `useDeleteAllRecipeSteps()`, `useRecipeStepCounts()` |
| `src/hooks/useRecipeSubstitutions.ts` | Hook | `useRecipeSubstitutions(stepId)`, `useAddSubstitution()`, `useRemoveSubstitution()` |
| `src/features/recipes/RecipeStudioCard.tsx` | UI | Card-format recipe display for Studio view |
| `src/features/recipes/RecipeTimelineView.tsx` | UI | Vertical timeline of steps with phase grouping |
| `src/features/recipes/RecipeStepDetail.tsx` | UI | Single expanded step showing all fields + substitutions |
| `src/features/recipes/RecipeDuplicateDialog.tsx` | UI | Confirm + rename before deep-copy of recipe + steps |
| `src/features/recipes/recipeMetadataSchema.ts` | Schema | Zod for new metadata fields (style, surface, effect, difficulty, estimated_minutes) |
| `src/features/recipes/RecipeAvailabilityBadge.tsx` | UI | Owned / running-low / missing count badge |

### Modified Files

| File | Change Summary |
|------|---------------|
| `src/types/recipe.ts` | Add 7 new columns to `PaintingRecipe` interface |
| `src/features/recipes/recipeSteps.ts` | Extend `DraftStep` with `phase`, `tool`, `technique`, `dilution`, `duration_minutes`, `photo_asset_id` |
| `src/features/recipes/RecipeStepRow.tsx` | Add phase selector, tool/technique/dilution inputs; more rows per step |
| `src/features/recipes/RecipeStepList.tsx` | Same dnd-kit structure; save target changes to `recipe_steps` |
| `src/features/recipes/RecipeFormSheet.tsx` | Add metadata fields; wire save to `useCreateRecipeStep` not `useAddRecipePaint` |
| `src/features/recipes/recipeSchema.ts` | Extend with metadata fields or compose with `recipeMetadataSchema.ts` |
| `src/features/recipes/RecipeDetailSheet.tsx` | Replace `useRecipePaints(id)` with `useRecipeSteps(id)`; phase grouping; availability badge |
| `src/features/recipes/RecipeTableColumns.tsx` | Add difficulty badge, estimated_minutes; swatch still via `useRecipeSwatchData()` |
| `src/features/recipes/RecipesPage.tsx` | Add style/surface/difficulty/missing-paints filters; view toggle; duplicate action |
| `src/db/queries/recipes.ts` | Add 7 new columns to INSERT/UPDATE; add `duplicateRecipe()` |
| `src/db/queries/recipePaints.ts` | `getRecipeSwatchColors()` JOIN target: `recipe_paints` → `recipe_steps` |
| `src/hooks/useRecipePaints.ts` | Update `useRecipeSwatchData()` query fn; existing RECIPE_SWATCH_KEY unchanged |

---

## Data Flows

### Write Flow: Create / Edit Recipe with Steps

```
RecipeFormSheet.onSubmit()
  |
  +- 1. createRecipe / updateRecipe
  |       -> painting_recipes row with 7 new metadata columns
  |       -> invalidates: ["recipes"], ["recipes", id], ["kanban-enrichment"], ["recipes","by-unit"]
  |
  +- 2. [edit only] deleteAllRecipeSteps(recipe.id)
  |       -> single DELETE WHERE recipe_id = ?
  |       -> full replacement (same pattern as current recipe_paints remove-all)
  |
  +- 3. for each DraftStep with title: createRecipeStep({ recipe_id, ...step })
  |
  +- 4. Invalidate:
           ["recipe-steps", recipeId]
           ["recipe-swatch-colors"]
           ["recipe-steps", "all-counts"]
```

### Read Flow: RecipeDetailSheet / Timeline

```
RecipeDetailSheet opens (recipe: PaintingRecipe)
  |
  +- useRecipeSteps(recipe.id)
  |    queryKey: ["recipe-steps", recipe.id]
  |    queryFn:  SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY order_index ASC
  |
  +- usePaints()  <- paint map for owned/missing lookup, already in cache
  |
  +- computeAvailability(steps, paintMap) <- pure function, no DB
  |    -> RecipeAvailabilityBadge
  |
  +- [on step expand] useRecipeSubstitutions(stepId)
       queryKey: ["recipe-substitutions", stepId]
       queryFn:  SELECT * FROM recipe_paint_substitutions WHERE recipe_step_id = ?
```

### Read Flow: Swatch Strip (Adapter Pattern)

The swatch strip on RecipeTable rows and RecipeStudioCards continues to use `useRecipeSwatchData()` with the unchanged `RECIPE_SWATCH_KEY`. Only `getRecipeSwatchColors()` changes its JOIN target:

```sql
-- OLD (recipe_paints):
SELECT rp.recipe_id, rp.paint_id, p.hex_color
FROM recipe_paints rp JOIN paints p ON p.id = rp.paint_id
ORDER BY rp.recipe_id ASC, rp.order_index ASC

-- NEW (recipe_steps):
SELECT rs.recipe_id, rs.paint_id, p.hex_color
FROM recipe_steps rs
JOIN paints p ON p.id = rs.paint_id
WHERE rs.paint_id IS NOT NULL
ORDER BY rs.recipe_id ASC, rs.order_index ASC
```

Zero consumer changes — same hook, same key, same return shape.

### Paint Availability Computation (Pure Function)

```typescript
// src/features/recipes/computeRecipeAvailability.ts
export interface RecipeAvailability {
  owned: number;
  runningLow: number;
  missing: number;
}

export function computeRecipeAvailability(
  steps: RecipeStep[],
  paintMap: Map<number, Paint>
): RecipeAvailability {
  let owned = 0, runningLow = 0, missing = 0;
  for (const s of steps) {
    if (!s.paint_id) continue;
    const p = paintMap.get(s.paint_id);
    if (!p || p.owned !== 1) missing++;
    else if (p.running_low === 1) runningLow++;
    else owned++;
  }
  return { owned, runningLow, missing };
}
```

Both `useRecipeSteps(id)` and `usePaints()` are already in cache when RecipeDetailSheet opens — zero additional DB round-trips.

### Recipe Duplication Flow

```
RecipeDuplicateDialog confirms with new name
  |
  +- duplicateRecipe(sourceId, newName)
       1. INSERT INTO painting_recipes (all columns except id/created_at/updated_at)
            source_recipe_id = sourceId
       2. INSERT INTO recipe_steps ... SELECT from recipe_steps WHERE recipe_id = sourceId
            (all step fields, new recipe_id, no IDs)
       3. Return new recipe ID
  |
  +- Invalidate: ["recipes"], ["recipe-steps", newId], ["recipe-swatch-colors"]
```

Note: substitutions are NOT duplicated (they are step-specific adjustments, not part of the core recipe knowledge). The duplicated steps start substitution-free.

### Session Linking Flow

```
LogSessionSheet (existing — add recipe/step pickers)
  |
  +- [NEW] recipe_id selector (optional) -> FK to painting_recipes
  +- [NEW] recipe_step_id selector (filtered by selected recipe) -> FK to recipe_steps
  |
  +- createSession.mutateAsync({ unit_id, session_date, duration_minutes, notes, recipe_id, recipe_step_id })
  |
  +- Invalidate (existing):
       ["hobby-analytics"], ["recent-activity"], ["goal-progress"], ["dashboard-stats"]
     Invalidate (NEW — for "used in N sessions" on recipe detail):
       ["sessions-by-recipe", recipe_id]   (if that query is added)
```

---

## Cache Invalidation Strategy

### New Cache Keys

| Key | Shape | Invalidated By |
|-----|-------|---------------|
| `["recipe-steps", recipeId]` | per-recipe | recipe form save (create/update), deleteAllRecipeSteps, deleteRecipe |
| `["recipe-steps", "all-counts"]` | single batch | recipe form save |
| `["recipe-substitutions", stepId]` | per-step | addSubstitution, removeSubstitution |
| `["sessions-by-recipe", recipeId]` | per-recipe (optional) | createSession with recipe_id |

### Symmetry Rules

Following the established cache invalidation symmetry rule — every key invalidated by create must also be invalidated by delete:

| Mutation | Keys to Invalidate |
|----------|-------------------|
| `useCreateRecipeStep` | `["recipe-steps", recipeId]`, `["recipe-swatch-colors"]`, `["recipe-steps", "all-counts"]` |
| `useDeleteAllRecipeSteps` | `["recipe-steps", recipeId]`, `["recipe-swatch-colors"]`, `["recipe-steps", "all-counts"]` |
| `useAddSubstitution` | `["recipe-substitutions", stepId]` |
| `useRemoveSubstitution` | `["recipe-substitutions", stepId]` |
| `useDeleteRecipe` (existing) | add `["recipe-steps", recipeId]` to existing invalidations |
| `useUpdateRecipe` (existing) | add `["recipe-steps", recipeId]` to existing invalidations |

### Legacy Key Handling

`RECIPE_PAINTS_KEY` and `RECIPE_SWATCH_KEY` in `useRecipePaints.ts` remain unchanged.

`["recipe-paints", "all-counts", ...]` should be renamed to `["recipe-steps", "all-counts"]` for clarity. The inline `useAllStepCounts()` in `RecipesPage.tsx` is also replaced with a proper exported hook that uses the batch COUNT query.

---

## Architectural Patterns

### Pattern 1: Full Replacement for Step Persistence

**What:** On recipe save (edit mode), DELETE all existing `recipe_steps` WHERE recipe_id = ?, then INSERT all current draft steps.

**Why:** Steps are always edited as a complete ordered list. Tracking individual step IDs in local draft state to enable partial updates adds complexity with no UX benefit. The full-replacement pattern is already proven with `recipe_paints`.

**Trade-offs:** Slightly more DB writes on edit. Negligible at personal-tool scale (<200 recipes). Guarantees order_index stays clean.

```typescript
// RecipeFormSheet.onSubmit() — edit path
await deleteAllRecipeSteps(recipe.id);       // single DELETE WHERE recipe_id = ?
for (const s of computeOrderIndex(steps)) {
  if (s.title.trim()) {
    await createRecipeStep({ recipe_id: recipe.id, ...s });
  }
}
```

### Pattern 2: Adapter Pattern for Swatch Source Migration

**What:** `getRecipeSwatchColors()` changes its JOIN target from `recipe_paints` to `recipe_steps`. The hook key `["recipe-swatch-colors"]` and the `useRecipeSwatchData()` return type are identical. Zero consumer changes.

**Why:** Decouples the data source migration from the UI migration. The swatch strip keeps working before, during, and after the step data migration.

### Pattern 3: Lazy Substitution Queries

**What:** `useRecipeSubstitutions(stepId)` is called only for the actively expanded step in `RecipeStepDetail`, not preloaded for all steps.

**Why:** N+1 is a concern when loading in a loop. A single expanded step is one query on user demand. Substitutions are rare metadata — pre-fetching all is wasteful.

### Pattern 4: Availability as Pure Function

**What:** Paint availability counts (owned/runningLow/missing) are computed client-side over the already-cached `useRecipeSteps(id)` + `usePaints()` data.

**Why:** Both data sources are in React Query cache when RecipeDetailSheet opens. A pure function is testable, has zero latency, and requires no DB round-trip.

### Pattern 5: Substitutions Edited in Detail Sheet Only (Not in Form)

**What:** Substitutions are managed in `RecipeDetailSheet` / `RecipeStepDetail` after a step has been saved and has a real `id`. The `RecipeFormSheet` does not manage substitutions.

**Why:** Substitutions require a real `recipe_step_id` FK. Managing them in ephemeral draft state before the step has an `id` requires a two-pass save (save steps, get IDs, then save substitutions) which adds complexity and error-recovery burden.

---

## Anti-Patterns

### Anti-Pattern 1: N+1 Step Count Query (Known Technical Debt)

**What people do:** The current `useAllStepCounts()` in `RecipesPage.tsx` loops through all recipes and calls `getRecipePaintsByRecipe(r.id)` per recipe.

**Why it's wrong:** After migration to `recipe_steps`, the same pattern queries N times. Noticeable on the Recipes page with 50+ recipes.

**Do this instead:** Replace with a single batch COUNT query:

```sql
SELECT recipe_id, COUNT(*) as count FROM recipe_steps GROUP BY recipe_id
```

Return `Map<number, number>` in one round-trip. Implement in `getRecipeStepCounts()` in `recipeSteps.ts`.

### Anti-Pattern 2: Nested Sheets for Step Photo Upload

**What people do:** Open a photo-upload dialog from inside `RecipeStepRow` inside `RecipeFormSheet`.

**Why it's wrong:** Radix portals nested inside feature components cause z-index and React context issues. Documented pitfall in CLAUDE.md — sibling portal pattern is mandatory.

**Do this instead:** Render the photo dialog as a sibling of `RecipeFormSheet` in `RecipesPage`, using the same `pendingStepLocalId` pattern already used for inline paint create.

### Anti-Pattern 3: Substitutions in DraftStep Local State

**What people do:** Track substitutions in the `DraftStep[]` local state array inside `RecipeFormSheet`.

**Why it's wrong:** Two-pass save required — save steps first to get IDs, then save substitutions. Creates complex rollback/error handling if the second pass fails.

**Do this instead:** Substitutions are edited only in `RecipeDetailSheet` / `RecipeStepDetail` after a step has been saved and has a real ID.

### Anti-Pattern 4: Data Migration in SQL Migration File

**What people do:** Write `INSERT INTO recipe_steps SELECT ... FROM recipe_paints` inside migration 012.

**Why it's wrong:** Migration files run before app startup. No user feedback, no error toasts, no rollback. The migration runner is silent on failures.

**Do this instead:** `migrateRecipePaintsToSteps()` is an application-layer TypeScript function called at startup with a guard (check `recipe_steps` COUNT before running). Shows progress in UI if needed.

### Anti-Pattern 5: COALESCE-based UPDATE for recipe_steps

**What people do:** Mirror the `updateRecipe` COALESCE pattern for step updates.

**Why it's wrong:** Steps are always fully replaced (Pattern 1). There is no partial UPDATE use case. Individual step edits happen only in `RecipeDetailSheet`, where the full step object is available.

**Do this instead:** `updateRecipeStep()` takes the complete `RecipeStep` and sets all columns explicitly. No COALESCE needed.

---

## Build Order

### Foundation (required before any feature work)

**Step 1: Schema + Types**
1. Write migration 012 SQL (new tables + ALTER statements)
2. New type files: `src/types/recipeStep.ts`, `src/types/recipeSubstitution.ts`
3. Extend `PaintingRecipe` interface with 7 new columns in `src/types/recipe.ts`
4. Extend `DraftStep` in `recipeSteps.ts` with new fields
5. Verify migration runs cleanly — check existing recipes survive, steps table is empty

**Step 2: Query Layer**
1. Write `src/db/queries/recipeSteps.ts` — full CRUD + `migrateRecipePaintsToSteps()` + `getRecipeStepCounts()`
2. Write `src/db/queries/recipeSubstitutions.ts`
3. Update `getRecipeSwatchColors()` in `recipePaints.ts` to JOIN `recipe_steps`
4. Update `recipes.ts` INSERT/UPDATE for 7 new metadata columns; add `duplicateRecipe()`

**Step 3: Hook Layer**
1. Write `src/hooks/useRecipeSteps.ts` — all hooks with correct cache keys and invalidation symmetry
2. Write `src/hooks/useRecipeSubstitutions.ts`
3. Update `useRecipePaints.ts` — only the `useRecipeSwatchData` query fn changes; key stays

**Step 4: Data Migration Execution**
1. Wire `migrateRecipePaintsToSteps()` call into app startup
2. Test: existing recipe_paints rows appear as recipe_steps after startup
3. Test: swatch strips still render correctly (getRecipeSwatchColors now reads recipe_steps)

### Feature Layer (builds on foundation)

**Step 5: Form Upgrades** (depends on Steps 1-4)
- Extend `RecipeStepRow` with new fields (phase selector, tool, technique, dilution inputs)
- Extend `RecipeFormSheet` with metadata fields (style, surface, effect, difficulty, estimated_minutes)
- Change save path: `useCreateRecipeStep` instead of `useAddRecipePaint`
- Update `recipeSchema.ts` with new fields

**Step 6: Display Upgrades** (depends on Steps 1-4)
- Update `RecipeDetailSheet` — `useRecipeSteps(id)` replaces `useRecipePaints(id)`
- Add `RecipeAvailabilityBadge` with `computeRecipeAvailability()` pure function + tests
- Update `RecipeTableColumns` — difficulty badge, estimated_minutes, step count from batch query

**Step 7: Studio UX** (depends on Steps 5-6)
- `RecipeStudioCard` — card layout for studio view
- `RecipeTimelineView` — vertical timeline with phase-grouped steps
- `RecipesPage` — view toggle (table / studio), new filter bar (style, surface, difficulty, missing-paints)
- `RecipeDuplicateDialog` + `duplicateRecipe()` query wired up

**Step 8: Session Linking** (depends on Step 1, independent of Steps 5-7)
- Extend `LogSessionSheet` with optional recipe picker and step picker
- Update `createSession` mutation to accept and write `recipe_id` + `recipe_step_id`
- Add "used in N sessions" count to `RecipeDetailSheet`

**Step 9: Substitutions** (depends on Steps 1-4, 6)
- `RecipeStepDetail` expanded view with substitution list
- `useRecipeSubstitutions(stepId)` wired into detail sheet

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `recipe_steps` ↔ `paints` | FK `paint_id` SET NULL on delete | Step survives paint deletion (becomes paint-less) |
| `recipe_steps` ↔ `image_assets` | FK `photo_asset_id` SET NULL on delete | Step photo optional; step survives photo deletion |
| `recipe_paint_substitutions` ↔ `recipe_steps` | FK CASCADE on step delete | Substitutions die with their step |
| `recipe_paint_substitutions` ↔ `paints` | FK RESTRICT on paint delete | Cannot delete paint used as substitution |
| `painting_sessions` ↔ `painting_recipes` | FK SET NULL on delete | Session history preserved after recipe deletion |
| `painting_sessions` ↔ `recipe_steps` | FK SET NULL on delete | Session history preserved after step deletion |
| `RecipeFormSheet` ↔ `PaintSheet` | Sibling portal via parent state | Existing pattern — do not nest |
| `RecipeFormSheet` ↔ `RecipeStepRow` | Props + `DraftStep[]` lifted state | No React Query inside step rows |

### Downstream Consumers Affected

| Consumer | Required Change |
|----------|----------------|
| `RecipeDetailSheet` | `useRecipePaints(id)` → `useRecipeSteps(id)` |
| `RecipesPage.useAllStepCounts` | Replace N+1 loop with `useRecipeStepCounts()` batch hook |
| `useRecipePaints.useRecipeSwatchData` | Update query fn; key unchanged |
| `useDeleteRecipe` | Add `["recipe-steps", recipeId]` to invalidations |
| `useUpdateRecipe` | Add `["recipe-steps", recipeId]` to invalidations |
| `LogSessionSheet` | Add recipe + step pickers; new FK columns written on save |
| `kanban-enrichment` query | No change (reads only `painting_recipes.name`) |
| Paint delete guard | `recipe_paint_substitutions.paint_id` RESTRICT means existing paint delete guard at component level must account for substitution FK errors |

---

## Scaling Considerations

Single-user local desktop app. The only relevant scale question is query efficiency as recipe count grows.

| Recipe Count | Notes |
|---|---|
| 1-50 (current baseline) | All patterns fine. N+1 step count is imperceptible. |
| 50-200 (realistic ceiling for a personal tool) | N+1 step count query starts to lag on RecipesPage load. Batch COUNT query (Anti-Pattern 1 fix) is the only mitigation needed. |
| 200+ (unexpected but possible) | Consider virtualizing the recipe list. Current TanStack Table renders all rows eagerly. |

---

## Sources

- Direct code audit: `src/features/recipes/*.tsx` — all 12 recipe feature files
- Direct code audit: `src/hooks/useRecipes.ts`, `src/hooks/useRecipePaints.ts`
- Direct code audit: `src/db/queries/recipes.ts`, `src/db/queries/recipePaints.ts`
- Direct code audit: `src/types/recipe.ts`, `src/types/recipePaint.ts`
- Schema audit: `src-tauri/migrations/001_core_schema.sql`, `005_hobby_journal.sql`
- Architecture audit: `.planning/V3_ARCHITECTURE_AUDIT.md` (section 3.1 Recipes 2.0, section 5 Migration Plan)
- Project context: `.planning/PROJECT.md`
- Established patterns: `CLAUDE.md` (sibling portal pattern, cache invalidation symmetry rule, integer boolean discipline, no ORM)

---
*Architecture research for: HobbyForge v2.5 Recipes 2.0 / Painting Studio*
*Researched: 2026-05-06*
