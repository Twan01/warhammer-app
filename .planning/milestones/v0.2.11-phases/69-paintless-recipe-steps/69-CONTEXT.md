# Phase 69: Paintless Recipe Steps - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase enables recipe steps to exist without a paint selection. Three changes: (1) a schema migration making `paint_id` nullable on the `recipe_steps` table, (2) removal of the guard in `RecipeFormSheet.tsx` that skips saving paintless steps, and (3) ensuring all availability/ownership calculations exclude paintless steps from both numerator and denominator while total step counts include them.

</domain>

<decisions>
## Implementation Decisions

### Schema Migration (paint_id nullable)
- **D-01:** The `recipe_steps.paint_id` column is currently `INTEGER NOT NULL REFERENCES paints(id) ON DELETE RESTRICT` (defined in `001_core_schema.sql` line 93, table was renamed from `recipe_paints` in migration 012). SQLite does not support `ALTER COLUMN` to change nullability. A table-rebuild migration is required: CREATE new table with nullable `paint_id`, INSERT-SELECT from old table, DROP old table, ALTER TABLE RENAME new to `recipe_steps`, recreate indexes.
- **D-02:** The FK constraint changes from `NOT NULL REFERENCES paints(id) ON DELETE RESTRICT` to `REFERENCES paints(id) ON DELETE RESTRICT`. When `paint_id` is NULL, the FK constraint does not apply (SQLite FK semantics: NULL FKs are not checked). This is the correct behavior — paintless steps have no paint to restrict.
- **D-03:** The rebuild migration must preserve all columns added by migrations 012, 013, 014, and 018 (`painting_phase`, `tool`, `technique`, `dilution`, `time_estimate_minutes`, `step_photo_path`, `alt_paint_id`, `section_id`). The FK from `painting_sessions.recipe_step_id` referencing `recipe_steps(id)` must also be preserved — use a temporary disable of FK checks during the rebuild.
- **D-04:** Migration number: use the next available number after the latest registered migration. Researcher should check `lib.rs` to determine the current count.

### Guard Removal & Save Path
- **D-05:** Remove the `if (s.paint_id !== null)` guard at `RecipeFormSheet.tsx` line 292. After removal, all steps (with or without paint) are saved via `addRecipePaint.mutateAsync`. The `addRecipePaint` query in `recipePaints.ts` already binds `input.paint_id` as `$2` — once the schema allows null, null will flow through.
- **D-06:** The `CreateRecipeStepInput` type (derived from `RecipeStep` in `types/recipePaint.ts`) must update `paint_id` from `number` to `number | null` to match the nullable schema. The `DraftStep` type in `recipeSteps.ts` already has `paint_id: number | null` — no change needed there.

### Availability & Count Logic
- **D-07:** Paint availability query (`getRecipePaintAvailability` in `recipePaints.ts` line 128) already has `WHERE rs.paint_id IS NOT NULL AND rs.paint_id != 0`. No change needed — paintless steps are already excluded from availability calculations by this existing filter.
- **D-08:** The swatch color query (`getRecipeSwatchColors` in `recipePaints.ts`) joins on `paints` via `paint_id`, which naturally excludes null paint_id rows. No change needed.
- **D-09:** Total step count query (`getStepCountsByRecipe` in `recipePaints.ts` line 97) counts ALL steps via `COUNT(*)`. This should remain unchanged — paintless steps are real recipe steps and should be counted in the total. Step count reflects recipe complexity; availability reflects paint readiness.
- **D-10:** The `RecipeDetailSheet.tsx` line 95 filter `.filter((s) => s.paint_id != null && s.paint_id !== 0)` is used for `missingPaints` calculation — correctly excludes paintless steps. No change needed.

### UI Display of Paintless Steps
- **D-11:** `RecipeStepTimeline.tsx` renders each step with paint info (swatch, name). For paintless steps, it should gracefully handle a null paint lookup — show the step name, phase, technique, etc. but no paint swatch or paint name. The `paintMap.get(step.paint_id)` call will return undefined for null paint_id, which the existing `isPaintMissing` function already handles (returns true for null/undefined paint).
- **D-12:** The `RecipeStepRow.tsx` form component already works with null `paint_id` via the `PaintCombobox` — the combobox shows "Search paints..." placeholder when value is null. No form changes needed beyond the guard removal.

### Claude's Discretion
- Whether to add a "No paint" visual indicator (e.g., a subtle dash or icon) on paintless steps in the timeline, or just omit the paint swatch area
- Exact FK pragma handling during the table-rebuild migration (PRAGMA foreign_keys = OFF at start, ON at end)
- Whether to add an index on the rebuilt table matching any existing indexes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Migration
- `src-tauri/migrations/001_core_schema.sql` lines 90-98 — Original `recipe_paints` table definition with `paint_id INTEGER NOT NULL`
- `src-tauri/migrations/012_recipe_steps.sql` — Rename to `recipe_steps` + structured step columns
- `src-tauri/migrations/013_step_photos_alt_paint.sql` — `step_photo_path` and `alt_paint_id` columns
- `src-tauri/migrations/014_session_recipe_link.sql` — `painting_sessions.recipe_step_id` FK
- `src-tauri/migrations/018_recipe_sections.sql` — `section_id` FK column
- `src-tauri/src/lib.rs` — Migration registration (get_migrations function)

### Guard Removal Target
- `src/features/recipes/RecipeFormSheet.tsx` line 292 — `if (s.paint_id !== null)` guard to remove

### Type Definitions
- `src/types/recipePaint.ts` — `RecipeStep` interface (`paint_id: number` → `number | null`)
- `src/features/recipes/recipeSteps.ts` — `DraftStep` interface (already `paint_id: number | null`)

### Availability Queries (already correct, verify only)
- `src/db/queries/recipePaints.ts` line 128 — `getRecipePaintAvailability` with null-exclusion WHERE clause
- `src/db/queries/recipePaints.ts` line 97 — `getStepCountsByRecipe` (should remain COUNT(*) of all steps)
- `src/hooks/useRecipePaints.ts` line 162 — Comment documenting null/0 exclusion

### UI Components (verify graceful null handling)
- `src/features/recipes/RecipeStepTimeline.tsx` — Step rendering with paint lookup
- `src/features/recipes/RecipeDetailSheet.tsx` line 93 — missingPaints filter (already excludes null)

### Requirements
- `.planning/REQUIREMENTS.md` — REC-01 definition

### Prior Context
- `.planning/phases/68-infrastructure-quick-wins/68-CONTEXT.md` — Phase 68 decisions (prerequisite phase)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DraftStep` type already has `paint_id: number | null` — form layer is already null-aware
- `PaintCombobox` handles null value (shows placeholder) — no form UI changes needed
- `isPaintMissing` function returns true for null/undefined paint — graceful degradation exists
- Availability query already has `WHERE rs.paint_id IS NOT NULL AND rs.paint_id != 0` — no query changes for availability

### Established Patterns
- Table-rebuild migrations: not yet used in this codebase, but standard SQLite pattern. Must wrap in `PRAGMA foreign_keys = OFF` / `ON` pair
- Migration registration: one `Migration { version, description, sql, kind }` struct per file in `lib.rs`
- SQL parameter binding: `$1, $2` positional syntax (Tauri plugin-sql)

### Integration Points
- Guard removal in `RecipeFormSheet.tsx` is the only code change that enables saving paintless steps
- Type change in `RecipeStep` interface may require updates to any code that assumes `paint_id` is always a valid number (grep for `step.paint_id` usages beyond the already-null-safe ones)
- `RecipeStepTimeline.tsx` renders paint info — needs to handle null paint gracefully

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the roadmap success criteria. The codebase is already largely null-safe for paint_id in the form layer (DraftStep) and availability queries. The main work is the schema migration and removing the save guard.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 69-Paintless Recipe Steps*
*Context gathered: 2026-05-13*
