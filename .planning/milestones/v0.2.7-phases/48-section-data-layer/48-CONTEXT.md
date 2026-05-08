# Phase 48: Section Data Layer - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can persist and retrieve recipe sections with full CRUD, ordering, and section-aware step counts through a typed query/hook layer — all backed by a zero-data-loss migration. No UI work in this phase — data layer only.

</domain>

<decisions>
## Implementation Decisions

### Migration strategy
- Migration **018** (not 016 as STATE.md says — 016_rules_snapshot.sql and 017_unit_overrides.sql already exist)
- CREATE TABLE recipe_sections (id, recipe_id FK, name, surface, optional, order_index, notes, created_at, updated_at)
- ALTER TABLE recipe_steps ADD COLUMN section_id (nullable FK to recipe_sections with ON DELETE CASCADE)
- Data migration: for each existing recipe, INSERT one default section named "Steps", then UPDATE all recipe_steps for that recipe to point at it
- Zero data loss — every existing step gets a section_id after migration

### Default section naming
- Auto-created default sections named "Steps" (neutral, describes content)
- Applies to both migration (existing recipes) and new recipe creation (FORM-05 in Phase 50)

### Section surface values
- Reuse existing surface values from recipe metadata (same domain vocabulary)
- Surface column is TEXT (nullable), not an enum — consistent with painting_recipes.surface
- Values like "Armour", "Cloth", "Skin", "Weapons", "Base" etc. are convention, not enforced

### Optional flag semantics
- `optional` is a 0|1 integer (SQLite boolean discipline)
- Means "this section can be skipped in the painting workflow" (e.g., weathering, edge highlighting)
- Default: 0 (not optional) — most sections are required
- Phase 49 will display an "Optional" badge on section headers

### Cascade and FK behavior
- recipe_sections.recipe_id: FK to painting_recipes(id) with ON DELETE CASCADE (section dies with recipe)
- recipe_steps.section_id: nullable FK to recipe_sections(id) with ON DELETE CASCADE (steps die with section)
- Never delete steps manually before deleting a section — cascade handles it

### Cache invalidation contract
- useDeleteRecipeSection.onSuccess must invalidate all 5 keys:
  1. RECIPE_SECTIONS_KEY (sections list)
  2. RECIPE_PAINTS_KEY (steps per recipe)
  3. STEP_COUNTS_KEY (batch step counts)
  4. RECIPE_AVAILABILITY_KEY (paint availability)
  5. RECIPE_SWATCH_KEY (swatch colors)
- useCreateRecipeSection and useUpdateRecipeSection invalidate RECIPE_SECTIONS_KEY only
- useReorderRecipeSections invalidates RECIPE_SECTIONS_KEY only

### Batch query scope
- New: getStepCountsBySection() — per-section step counts via GROUP BY section_id (SECT-06)
- Existing: getStepCountsByRecipe() — preserved unchanged (Phase 49+ consumers need it)
- Existing batch helpers (availability, swatch) — zero changes in this phase

### Query module structure
- New file: src/db/queries/recipeSections.ts — 6 functions: get, create, update, delete, reorder, getStepCountsBySection
- New file: src/hooks/useRecipeSections.ts — query + 4 mutations with invalidation contract
- New file: src/types/recipeSection.ts — RecipeSection, CreateRecipeSectionInput, UpdateRecipeSectionInput

### Claude's Discretion
- Exact reorder implementation (sequential UPDATE vs. delete-and-recreate)
- Whether to add section_id to addRecipePaint INSERT in this phase or defer to Phase 50
- Test file structure and assertion granularity
- ORDER BY strategy for sections query (order_index ASC, then id ASC as tiebreaker)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema and migration patterns
- `src-tauri/migrations/012_recipe_steps.sql` — Prior recipe schema migration (RENAME + ALTER pattern)
- `src-tauri/migrations/017_unit_overrides.sql` — Latest hobbyforge.db migration (confirms 018 is next)

### Existing recipe data layer
- `src/db/queries/recipePaints.ts` — Step queries, batch helpers (getStepCountsByRecipe, getRecipePaintAvailability, getRecipeSwatchColors)
- `src/db/queries/recipes.ts` — Recipe CRUD + duplicateRecipe (will need section-aware update in Phase 51)
- `src/hooks/useRecipePaints.ts` — 5 exported cache keys, invalidation patterns, Map-based query transforms
- `src/hooks/useRecipes.ts` — Recipe hooks with cross-key invalidation
- `src/types/recipePaint.ts` — RecipeStep interface (section_id will be added)
- `src/types/recipe.ts` — PaintingRecipe interface (unchanged)

### Architecture decisions
- `.planning/research/SUMMARY.md` — v0.2.7 research with DndContext resolution, architecture approach, critical pitfalls
- `.planning/REQUIREMENTS.md` — SECT-01 through SECT-06 acceptance criteria

### Session-recipe FK chain
- `src-tauri/migrations/014_session_recipe_link.sql` — ON DELETE SET NULL on painting_sessions.recipe_step_id (cascade chain — section delete cascades to step delete, which SET NULLs session link)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/queries/recipePaints.ts`: Batch GROUP BY pattern (getStepCountsByRecipe) — exact template for getStepCountsBySection
- `src/hooks/useRecipePaints.ts`: 5 exported cache keys — section mutations must reference these for invalidation symmetry
- `src/types/recipePaint.ts`: RecipeStep interface — add nullable section_id field
- `src/db/client.ts`: getDb() singleton with PRAGMA foreign_keys = ON

### Established Patterns
- Query module: one file per entity in src/db/queries/, parameterized with $1/$2 syntax
- Hook module: one file per entity in src/hooks/, exports ENTITY_KEY constants + useQuery + useMutation
- Type module: Entity/CreateInput/UpdateInput triple in src/types/
- 0|1 integer for SQLite booleans (optional field)
- Cache invalidation symmetry: create/delete must invalidate the same downstream keys
- todayISO() from @/lib/dates for timestamp defaults

### Integration Points
- recipe_steps table gains section_id FK column
- RecipeStep type gains section_id field
- Existing batch helpers (step counts, availability, swatch) remain unchanged
- duplicateRecipe in recipes.ts will need section copy in Phase 51 (not this phase)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard data layer patterns apply. The research summary provides comprehensive architecture guidance.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 48-section-data-layer*
*Context gathered: 2026-05-08*
