# Domain Pitfalls

**Domain:** Adding workflow metadata to existing recipe sections, section-aware session logging, and surfacing recipe workflow context in Kanban/Dashboard
**Researched:** 2026-05-11
**Confidence:** HIGH (all findings derived from direct codebase inspection of existing save patterns, cascade rules, cache invalidation contracts, and component data flow)

---

## Critical Pitfalls

### Pitfall 1: DELETE-all + re-INSERT Destroys New section_id FKs on painting_sessions

**What goes wrong:** The existing RecipeFormSheet save pattern (lines 233-240) deletes ALL recipe_sections on edit, which cascades to recipe_steps via ON DELETE CASCADE. Migration 014 set `ON DELETE SET NULL` on `painting_sessions.recipe_step_id`, so every session's step link is NULLed on each recipe save. If a new `section_id` FK is added to `painting_sessions` referencing `recipe_sections(id)`, the same cascade NULLs it too -- every time the user edits and saves a recipe, all session-section links are permanently destroyed.

**Why it happens:** The DELETE-all + re-INSERT pattern was safe when sessions only linked to `recipe_id` (preserved across saves) and `recipe_step_id` (treated as ephemeral enrichment). Adding `section_id` to sessions elevates sections from "structural scaffolding destroyed on save" to "referenced data that should persist," but the save pattern treats them as disposable.

**Consequences:** Users log sessions against sections, edit the recipe, and all section links vanish silently. The "section-aware session history" feature becomes unreliable after the first recipe edit. No error is thrown -- SET NULL is silent.

**Prevention:**
- **Recommended:** Store section context on painting_sessions as a denormalized TEXT column (`section_name`) instead of a FK. Survives DELETE-all + re-INSERT because it carries no FK reference. Consistent with the `detachment_name` pattern on `army_lists` and `weapon_name` on `unit_loadout_wargear` (both documented in PROJECT.md Key Decisions).
- **Alternative:** Add `section_id` FK with `ON DELETE SET NULL` and accept that recipe edits clear section links. Document this as expected behavior and make section_id a "best effort" enrichment, not a hard dependency for any UI display.
- **High-risk alternative:** Refactor save to use UPDATE for existing sections + INSERT for new + DELETE for removed. This is the most correct but highest-complexity change and conflicts with the established project decision to use DELETE-all + re-INSERT for simplicity.

**Detection:** After editing a recipe, check painting_sessions rows -- if section_id/section_name is NULL for sessions that previously had values, this pitfall is active.

**Phase to address:** Schema migration phase (first phase). The column type decision (FK vs denormalized text) must be locked before any UI code references it.

---

### Pitfall 2: Cascading Selector State Desync in LogSessionSheet

**What goes wrong:** Adding a section selector between recipe and step creates a 3-level cascade: recipe -> section -> step. The existing code (LogSessionSheet lines 133-135) clears step when recipe changes via a single useEffect. If the section selector is added but the reset chain is incomplete, selecting Recipe A -> Section X -> Step 3, then changing to Recipe B leaves `section_id` pointing at Section X (which belongs to Recipe A) -- a cross-recipe reference that is structurally invalid but NOT caught by any FK constraint.

**Why it happens:** Each `useEffect` reset watches one field. With 3 levels, two useEffects are needed: recipe change clears section AND step; section change clears step. Missing either leaves stale state. React's batched state updates can also cause a render where section is stale but recipe is new, producing a frame where the section dropdown shows options for the wrong recipe.

**Consequences:** Submitting with a stale section_id writes a reference pointing at a section belonging to a different recipe. No FK violation occurs (painting_sessions.section_id references recipe_sections.id globally, not scoped by recipe). The session appears under the wrong recipe's section in any section-grouped view.

**Prevention:**
- Watch `recipe_id` changes: clear BOTH `section_id` and `recipe_step_id` in a single useEffect (extend the existing one on line 133).
- Watch `section_id` changes: clear `recipe_step_id` in a second useEffect.
- Filter steps by `section_id` (not just `recipe_id`) in the step selector's data source. Steps already carry `section_id` on the DB row -- use it.
- Add a submit-time guard: if `section_id` is set, verify the selected section belongs to the selected recipe by checking against loaded section data.

**Detection:** Log a session with all 3 fields set, then verify the session's `section_id` belongs to the session's `recipe_id` via a diagnostic query.

**Phase to address:** LogSessionSheet enhancement phase. Must be implemented atomically with the section selector -- never ship the selector without the full reset chain.

---

### Pitfall 3: New Workflow Metadata Columns Lost During DELETE-all + re-INSERT Round-Trip

**What goes wrong:** The new columns (`section_type`, `technique`, `execution_mode`, `applies_to`) are added to `recipe_sections` via ALTER TABLE with nullable defaults. The DELETE-all + re-INSERT save pattern in RecipeFormSheet deletes all sections and re-creates them. If the `DraftSection` type and `buildDraftSections` function are not updated to carry the new fields through the draft round-trip, the re-INSERT writes NULLs for all new columns -- silently erasing metadata the user previously set.

**Why it happens:** `DraftSection` (recipeSection.ts lines 18-27) is a manually maintained type separate from `RecipeSection`. Adding columns to the DB schema + `RecipeSection` type is necessary but not sufficient -- `DraftSection` must also be extended, `buildDraftSections` must copy the new fields from `RecipeSection` into `DraftSection`, `createRecipeSection` INSERT SQL must include the new columns, and `makeDraftSection` must set null defaults.

**Consequences:** User sets `section_type = "Basecoat"`, saves, re-opens the form, saves again without touching the section -> `section_type` is now NULL. Data loss on every recipe edit. No error, no warning.

**Prevention:**
- Extend `DraftSection` interface with ALL new metadata fields.
- Extend `buildDraftSections` to copy new fields from `RecipeSection` rows into `DraftSection`.
- Extend `createRecipeSection` INSERT SQL and parameter array to include new columns.
- Extend `makeDraftSection` factory to initialize new fields as `null`.
- Add a code comment on `DraftSection`: "Keep in sync with RecipeSection -- every DB column that should survive save must round-trip through this type."
- Implementation test: set metadata, save, reopen, save unchanged, reopen -- metadata must persist.

**Detection:** Set metadata on a section, save recipe, reopen, save again without changes, reopen -- if metadata is gone, this pitfall is active.

**Phase to address:** Schema migration phase AND form UI phase. The `DraftSection` type MUST be extended in the same phase as the migration, not deferred to the form UI phase.

---

## Moderate Pitfalls

### Pitfall 4: Progressive Disclosure Threshold Collision with New Metadata

**What goes wrong:** The existing progressive disclosure rule (RecipeFormSheet line 654) shows flat step list when `sections.length <= 1`, section cards when 2+. New workflow metadata (section_type, technique, etc.) only appears in section card UI. A single-section recipe with workflow metadata set via the SectionedTimeline display never shows it in the form -- the form renders `RecipeStepList` (flat mode), which has no section metadata UI. On save, the DELETE-all + re-INSERT writes the single section back without preserving metadata the form never displayed.

**Why it happens:** The threshold was designed when sections only carried name/surface/optional. With workflow metadata, even a single section can have semantically important data that needs to be visible and editable in the form.

**Prevention:**
- Adjust the threshold: show section card UI whenever ANY section has non-null workflow metadata, regardless of count. Something like: `sections.length > 1 || sections.some(s => s.section_type || s.technique || s.execution_mode || s.applies_to)`.
- Alternative: add a minimal metadata strip to `RecipeStepList` (flat mode) that displays and allows editing metadata for the implicit single section.
- The first option is simpler and follows the existing pattern -- the threshold just becomes smarter.

**Phase to address:** Form UI phase. Must be decided during UI design, not discovered during testing.

---

### Pitfall 5: Competing Hint Sources -- Status-Based vs Section-Aware

**What goes wrong:** The existing `getNextActionHint` (getNextActionHint.ts) maps `PaintingStatus` to a static string like "Apply shade." Adding section-aware guidance ("Next: Shade the armour panels") creates two competing hint sources. If both are displayed simultaneously, the UI is noisy and contradictory. If section-aware replaces status-based, recipes without sections lose their hint entirely.

**Why it happens:** The static hint is a pure synchronous function of status. Section-aware hints require recipe + section + step data (async, nullable, dependent on batch queries). Mixing sync and async hint sources in the same card position creates conditional rendering complexity and potential flicker during data loading.

**Prevention:**
- Layer hints with clear priority: section-aware hint takes precedence when available (recipe linked, sections loaded, next step identifiable). Fall back to status-based hint when no recipe/section data exists.
- Single render slot: one line of hint text, never two competing lines. Implement via a `getEnrichedHint(status, sectionContext?)` wrapper function.
- Handle loading state: while section data loads, show the status-based hint immediately. Never show "Loading..." in a Kanban card hint -- it flickers on every drag operation because DnD triggers re-renders.

**Phase to address:** Kanban/Current Focus integration phase.

---

### Pitfall 6: N+1 Query Explosion for Kanban Workflow Display

**What goes wrong:** KanbanCard currently receives `recipeName` as a prop from the parent (via a batch query computed at page level). Adding "current section" or "next step" per card tempts a per-card hook pattern: `useRecipeSections(unit.recipeId)` inside KanbanCard. With 20 active projects, this fires 20 section queries on every Kanban render AND on every drag-and-drop operation.

**Why it happens:** KanbanCard is a leaf component rendered inside a DnD context. Every drag event re-renders all visible cards. Hooks inside cards re-fire on each re-render. The existing pattern deliberately avoids this by computing data at page level and prop-drilling -- but the pattern is not enforced by any lint rule.

**Consequences:** Drag-and-drop becomes sluggish. Each drag event re-renders all cards, each card refetches sections. React Query deduplication helps for cache hits but does not prevent 20 parallel SELECT round-trips on first mount.

**Prevention:**
- Batch query at page level: single SQL query joining `recipe_sections` + `recipe_steps` for all active-project recipe IDs. Build a `Map<recipeId, { sectionName: string; nextStep: string }>` via `useMemo`.
- Prop-drill the map into KanbanCard, identical to how `recipeName` and `photoCount` are passed today.
- Hard rule: never put `useRecipeSections`, `useRecipePaints`, or any per-recipe hook inside KanbanCard.

**Phase to address:** Kanban integration phase. Design the batch query before touching KanbanCard.

---

### Pitfall 7: Existing painting_sessions Rows Have NULL section_id -- Join/Filter Hazards

**What goes wrong:** Adding `section_id` to `painting_sessions` via ALTER TABLE creates a nullable column. All existing sessions (potentially hundreds) have `section_id = NULL`. Any query that JOINs or filters on `section_id` with an INNER JOIN causes all historical sessions to vanish from results. A GROUP BY `section_id` without a NULL bucket silently drops unlinked sessions from counts.

**Why it happens:** This is the exact same pattern as migration 014 (adding `recipe_id`/`recipe_step_id` to sessions), but developers writing new queries may forget the "90% of rows are NULL" reality because only new sessions will have section data.

**Prevention:**
- Always use LEFT JOIN when including section data in session queries.
- Any GROUP BY `section_id` must include a NULL bucket labeled "General" or "Unlinked" for sessions without a section reference.
- Never use `WHERE section_id IS NOT NULL` as a default filter -- it silently drops all pre-feature sessions.
- `section_id` in LogSessionSheet must default to null (not required), consistent with `recipe_id` and `recipe_step_id` being optional.

**Phase to address:** Schema migration phase. Document the NULL-handling contract in the migration file comments, same as the comment pattern in migration 018.

---

### Pitfall 8: Cross-Feature Import Creates Tight Coupling Between recipes/ and dashboard/

**What goes wrong:** CurrentFocusCard and KanbanCard need to display section/workflow data. Importing recipe types, section types, or recipe display-formatting helpers directly from `src/features/recipes/` into `src/features/dashboard/` or `src/features/painting-projects/` creates coupling between feature modules that the architecture intentionally keeps independent.

**Why it happens:** The feature-folder convention keeps domain logic self-contained. Types in `src/types/recipeSection.ts` are shared and importable anywhere. But any display logic (e.g., formatting section_type as a badge label, determining "next step" from a section's steps) that lives in `src/features/recipes/` cannot be cleanly imported by dashboard components without violating the module boundary.

**Prevention:**
- Types in `src/types/` are fine to import from anywhere -- they are already shared by design.
- Display helpers needed by multiple features go in `src/lib/` (pure functions) or `src/components/common/`.
- Batch query hooks for cross-feature data (e.g., "workflow summary for active projects") belong in `src/hooks/`, not inside a feature folder.
- Hard rule: never import from `src/features/recipes/*.tsx` in dashboard or painting-projects components. Import from `src/types/`, `src/hooks/`, or `src/lib/` only.

**Phase to address:** Kanban/Current Focus integration phase. Establish the data flow architecture before building any UI.

---

### Pitfall 9: Cache Invalidation Gap for New Workflow Summary Queries

**What goes wrong:** Updating section metadata (section_type, technique, etc.) via the form triggers a save that invalidates `RECIPE_SECTIONS_KEY`. But if Kanban or Dashboard components cache workflow summaries under a different query key (e.g., `["workflow-summary"]` or `["active-project-workflow"]`), those caches become stale. The user edits a section's technique in the recipe form, switches to Dashboard, and sees the old technique.

**Why it happens:** The existing invalidation contract in `useDeleteRecipeSection` (useRecipeSections.ts lines 57-72) lists exactly 5 cache keys with a documented "CASCADE INVALIDATION CONTRACT" comment. Adding new query consumers that derive from section data adds new keys to invalidate. Missing one breaks UI consistency silently.

**Prevention:**
- Document ALL cache keys that derive from `recipe_sections` data in a central comment.
- When adding a new batch query for workflow summaries, add its key to the invalidation list in RecipeFormSheet's `onSubmit` (currently lines 309-315) AND in `useDeleteRecipeSection`.
- Consider a broader prefix-based invalidation if multiple workflow-related keys exist: `qc.invalidateQueries({ queryKey: ["workflow"] })`.
- Follow the existing "cascade invalidation contract" comment pattern -- add a comment block explaining why each key is invalidated.
- Run the cache symmetry check: if key X is invalidated in create/update, it must also be invalidated in delete.

**Phase to address:** Every phase that adds a new query consuming section data. Mandatory invalidation audit at each phase boundary.

---

## Minor Pitfalls

### Pitfall 10: LogSessionSheet Form Bloat with 4 Cascading Selectors

**What goes wrong:** Adding `section_id` to `LogSessionFormValues` and the Zod schema introduces a fourth nullable selector (unit -> recipe -> section -> step). Each nullable field needs `z.number().nullable()` plus the `__none__` sentinel pattern. The form JSX grows significantly with 4 cascading selectors occupying the top half of the sheet, pushing Date and Duration fields below the fold.

**Prevention:** Extract a reusable `NullableSelectField` component that handles the `__none__` sentinel, the `Controller` wrapper, and the `FormField` boilerplate. The identical pattern is repeated 3 times in the current LogSessionSheet (lines 188-348) and would be 4 with `section_id`. Also consider collapsing recipe/section/step under progressive disclosure -- show section/step selectors only when a recipe is selected (extending the existing pattern on line 306).

**Phase to address:** LogSessionSheet enhancement phase.

---

### Pitfall 11: SectionedTimeline Header Visual Overflow with Metadata Badges

**What goes wrong:** Adding compact metadata badges (section_type, technique, execution_mode, applies_to) to each section header in SectionedTimeline creates visual clutter. The header already renders: name, surface badge, optional badge, step count, time estimate, and paint availability indicators. Adding 4 more badges forces the header to wrap to multiple lines in the narrow RecipeDetailSheet (`sm:max-w-xl` = 576px minus padding).

**Prevention:**
- Progressive disclosure in display: show `section_type` as the primary metadata badge; surface other metadata behind a hover tooltip or expandable row.
- Use icon-only badges with tooltips for secondary metadata (technique, execution_mode).
- Test at the narrowest Sheet width to verify the header does not wrap. The current header (SectionedTimeline.tsx lines 70-119) already uses `ml-auto` for right-aligned metadata -- additional badges must fit within that space.

**Phase to address:** SectionedTimeline metadata display phase.

---

### Pitfall 12: applies_to Field Semantic Ambiguity

**What goes wrong:** The `applies_to` field (e.g., "all panels", "recessed areas", "raised edges") is free-text with no standard vocabulary. Different recipes use different terms for the same concept ("panels" vs "flat areas" vs "armour plates"). This makes filtering or grouping by `applies_to` unreliable, and the field degenerates into a second "notes" column with no structured utility.

**Prevention:**
- Define `applies_to` as a const array (like `PAINTING_STATUS_ORDER` or `RECIPE_SURFACES`) with a fixed vocabulary: "All surfaces", "Panels", "Recesses", "Edges", "Details", "Base trim", "Other".
- Allow free-text notes via the existing section `notes` column -- do not create a second free-text field.
- If free-text is preferred for flexibility, do NOT build any filtering or grouping features on `applies_to` -- treat it as display-only annotation.

**Phase to address:** Schema design phase. Must decide enum vs free-text before writing the migration.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Schema migration (add columns to recipe_sections) | Pitfall 3: DraftSection not extended, metadata lost on save | Extend DraftSection + buildDraftSections + createRecipeSection INSERT atomically with the migration |
| Schema migration (add section_id to painting_sessions) | Pitfall 1: DELETE-all + re-INSERT clears session FKs | Use denormalized TEXT column (section_name) instead of FK, or accept SET NULL on recipe edit |
| Schema migration (add section_id to painting_sessions) | Pitfall 7: existing sessions have NULL section_id | LEFT JOIN everywhere; NULL bucket in GROUP BY |
| Schema design for applies_to | Pitfall 12: semantic ambiguity | Decide enum vs free-text before writing migration |
| LogSessionSheet section selector | Pitfall 2: cascading selector 3-level desync | Two useEffects: recipe clears section+step; section clears step |
| LogSessionSheet section selector | Pitfall 10: form bloat with 4 selectors | Extract NullableSelectField component; progressive disclosure |
| SectionedTimeline metadata display | Pitfall 11: badge overflow at 576px | Icon badges + tooltips; test at narrowest sheet width |
| Form UI (workflow metadata editing) | Pitfall 4: single-section recipes hide metadata | Adjust threshold to check for non-null metadata, not just section count |
| Kanban workflow display | Pitfall 6: N+1 queries in KanbanCard | Batch query at page level; prop-drill Map |
| Kanban / Current Focus hints | Pitfall 5: competing sync vs async hint sources | Layered hint with section-aware priority; status-based fallback |
| Current Focus / Dashboard integration | Pitfall 8: cross-feature module coupling | Types from src/types/; hooks from src/hooks/; never import from src/features/recipes/ |
| Any phase adding section-derived queries | Pitfall 9: cache invalidation gap | Add new key to invalidation contract in RecipeFormSheet and useDeleteRecipeSection |

---

## Sources

- Direct codebase analysis of existing patterns:
  - `src/features/recipes/RecipeFormSheet.tsx` -- DELETE-all + re-INSERT pattern (lines 233-306), cache invalidation (lines 309-315), progressive disclosure threshold (line 654)
  - `src/features/recipes/recipeSection.ts` -- DraftSection type (lines 18-27), buildDraftSections (lines 58-91), makeDraftSection factory (lines 33-42)
  - `src/features/dashboard/LogSessionSheet.tsx` -- cascading selector pattern (lines 127-348), recipe_step_id clear on recipe change (lines 133-135)
  - `src/features/dashboard/getNextActionHint.ts` -- static PaintingStatus-to-string mapping
  - `src/features/dashboard/CurrentFocusCard.tsx` -- recipeName prop-drilling, no recipe hooks
  - `src/features/painting-projects/KanbanCard.tsx` -- prop-drilled recipeName/photoCount, no per-card hooks
  - `src/hooks/useRecipeSections.ts` -- CASCADE INVALIDATION CONTRACT comment (lines 57-72), 5 invalidated keys
  - `src/hooks/useJournalSessions.ts` -- conditional recipe-session invalidation (line 64)
  - `src/db/queries/recipeSections.ts` -- createRecipeSection INSERT columns (line 26), updateRecipeSection COALESCE vs direct assignment pattern
  - `src/db/queries/paintingSessions.ts` -- createSession INSERT with recipe_id/recipe_step_id (line 22)
  - `src-tauri/migrations/018_recipe_sections.sql` -- ON DELETE CASCADE chain, section_id nullable on recipe_steps
  - `src-tauri/migrations/014_session_recipe_link.sql` -- ON DELETE SET NULL for session recipe/step FKs
  - `src/types/recipeSection.ts` -- RecipeSection interface (9 columns)
  - `src/types/paintingSession.ts` -- PaintingSession interface, CreateSessionInput
  - `.planning/PROJECT.md` -- Key Decisions table (DELETE-all + re-INSERT, denormalized TEXT patterns, COALESCE, cache invalidation symmetry)
