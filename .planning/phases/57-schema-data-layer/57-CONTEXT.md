# Phase 57: Schema & Data Layer - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Add workflow metadata columns to recipe sections and a denormalized section association to painting sessions. Pure data layer: migration, TypeScript types, const arrays, and query updates. No UI changes.

</domain>

<decisions>
## Implementation Decisions

### Const Array Values
- **D-01:** `SECTION_TYPES` = `["prep", "basecoat", "shade", "layer", "detail", "effect", "finishing"] as const` — from WF-01
- **D-02:** `TECHNIQUES` = `["brush", "sponge", "drybrush", "airbrush", "oil-enamel", "pigment", "decal", "mixed", "other"] as const` — from WF-02
- **D-03:** `EXECUTION_MODES` = `["sequential", "batch", "parallel"] as const` — from WF-03
- **D-04:** Const arrays live in `src/types/recipeSection.ts` alongside the RecipeSection interface (co-located single source of truth, matching `PAINTING_STATUS_ORDER` in `src/types/unit.ts`)

### Column Types & Defaults
- **D-05:** All four new section columns (`section_type`, `technique`, `execution_mode`, `applies_to`) are `TEXT DEFAULT NULL` — nullable, additive per WF-05
- **D-06:** `section_name TEXT DEFAULT NULL` on `painting_sessions` — denormalized text, matches `detachment_name`/`weapon_name` pattern from v0.2.8
- **D-07:** Migration file is `020_workflow_metadata.sql`

### DraftSection Extension
- **D-08:** `DraftSection` gets four new nullable fields with explicit `null` defaults in `makeDraftSection()`
- **D-09:** `buildDraftSections()` maps all four fields from DB RecipeSection rows — prevents silent NULL erasure on save
- **D-10:** Save path (DELETE-all + re-INSERT) includes all four fields in INSERT statements

### Query Updates
- **D-11:** `createRecipeSection` — add 4 new fields to INSERT
- **D-12:** `updateRecipeSection` — add 4 new fields with COALESCE pattern
- **D-13:** `createSession` — add `section_name` to INSERT
- **D-14:** Read queries (`getRecipeSections`, `getSessionsByUnit`, etc.) use `SELECT *` — no changes needed

### Claude's Discretion
- Migration column ordering within the ALTER TABLE statements
- Whether to use a single ALTER TABLE with multiple ADD COLUMN or separate statements (SQLite requires separate ADD COLUMN per statement)
- Exact naming of exported type aliases (`SectionType`, `Technique`, `ExecutionMode`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — WF-01 through WF-05 define the five workflow metadata requirements for this phase

### Existing Data Layer
- `src/types/recipeSection.ts` — Current RecipeSection interface to extend (8 fields → 12)
- `src/types/paintingSession.ts` — Current PaintingSession interface to extend (8 fields → 9)
- `src/features/recipes/recipeSection.ts` — DraftSection type + `makeDraftSection()` + `buildDraftSections()` — must extend atomically
- `src/db/queries/recipeSections.ts` — Section CRUD queries (createRecipeSection, updateRecipeSection)
- `src/db/queries/paintingSessions.ts` — Session CRUD queries (createSession)
- `src-tauri/migrations/018_recipe_sections.sql` — Prior recipe sections migration (reference for column patterns)
- `src-tauri/migrations/014_session_recipe_link.sql` — Prior session column additions (reference for ALTER TABLE pattern)

### Const Array Patterns
- `src/types/unit.ts` lines 8-22 — `PAINTING_STATUS_ORDER` as const pattern (follow this)
- `src/features/recipes/recipeSchema.ts` lines 3-28 — `RECIPE_STYLES` as const pattern (follow this)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PAINTING_STATUS_ORDER` / `RECIPE_STYLES` const array pattern — reuse for SECTION_TYPES, TECHNIQUES, EXECUTION_MODES
- `makeDraftSection()` factory — extend with new field defaults
- `buildDraftSections()` mapper — extend with new field mapping

### Established Patterns
- SQLite `ALTER TABLE ... ADD COLUMN` must be one column per statement (SQLite limitation)
- `TEXT DEFAULT NULL` for optional text columns throughout all migrations
- COALESCE update pattern in `updateRecipeSection` for partial updates
- `SELECT *` in read queries means new columns flow automatically
- Positional `$1, $2` parameter syntax (Tauri plugin-sql requirement)
- `0 | 1` integer booleans — but these new fields are all TEXT, not boolean

### Integration Points
- `RecipeFormSheet.tsx` DELETE-all + re-INSERT must pass new fields through (D-10)
- `LogSessionSheet.tsx` will consume `section_name` in Phase 59 — this phase only adds the column and query support
- Downstream Phase 58 depends on const arrays and types from this phase for form dropdowns

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following established codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 57-Schema & Data Layer*
*Context gathered: 2026-05-12*
