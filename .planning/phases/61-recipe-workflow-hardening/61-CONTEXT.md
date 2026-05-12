# Phase 61: Recipe Workflow Hardening - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase hardens the existing recipe workflow foundation before building applied recipes on top of it. Three areas: (1) verify migration integrity so fresh installs and existing DBs both have recipe_sections with all workflow metadata columns, (2) stabilize section-aware log sessions so renaming a section doesn't break session analytics, (3) polish workflow metadata UX so section_type values match the user's mental model and simple recipes stay uncluttered.

This is a stabilization/hardening phase — no new features, no new tables, no new UI surfaces.

</domain>

<decisions>
## Implementation Decisions

### Migration Verification (RH-01)
- **D-01:** Migrations 018 (recipe_sections), 019 (rules_favorites_notes), and 020 (workflow_metadata) were created as .sql files but never registered in `src-tauri/src/lib.rs` `get_migrations()`. This bug has been found and fixed (lib.rs updated to register all three). Phase 61 verifies this fix works on fresh install via dev app startup.
- **D-02:** Verification approach: build check (cargo check + pnpm build) plus manual dev app startup confirming recipe_sections table exists with all 4 workflow metadata columns. No automated migration integration test needed — the Tauri plugin-sql migration runner is the canonical executor.
- **D-03:** If existing DBs already ran partial migrations (e.g., some users have recipe_sections but not workflow_metadata columns), the migration runner handles this automatically — it tracks applied versions and only runs missing ones.

### Section Rename Session Stability (RH-02)
- **D-04:** Keep the denormalized `section_name` TEXT on painting_sessions — no FK, no propagation on rename. This was a deliberate v0.2.9 architectural decision: the DELETE-all + re-INSERT save pattern destroys section IDs, making FK references unstable.
- **D-05:** When a section is renamed, old sessions retain the old section name in their `section_name` field. This is acceptable — session history is a snapshot of what happened at that point in time. No UPDATE propagation needed.
- **D-06:** `computeWorkflowPosition` already handles orphaned/stale section references gracefully via its degradation rules (D-04 through D-19 in the function). No additional degradation logic needed.
- **D-07:** Verify that the cascade selector in LogSessionSheet correctly rebuilds its options when sections are renamed (i.e., after recipe save, the section list reflects new names). This is a UX verification, not a code change.

### Workflow Metadata UX Polish (RH-03)
- **D-08:** Keep current 7 section_type values: `prep`, `basecoat`, `shade`, `layer`, `detail`, `effect`, `finishing`. These map to standard Warhammer miniature painting workflow stages.
- **D-09:** Progressive disclosure threshold stays: show workflow metadata collapsible only when (a) multi-section recipe (sectionsCount > 1) OR (b) metadata already present. Simple single-section recipes show no workflow UI clutter.
- **D-10:** `applies_to` remains freeform text (no enum). Users describe which model parts the section applies to (e.g., "armor panels", "cape and cloth", "base"). Pre-populated suggestions are a nice-to-have but not required for this hardening phase.

### Pre-existing Bug Fixes
- **D-11:** Three bug fixes in uncommitted changes should be committed before Phase 61 planning begins: (1) migration registration in lib.rs, (2) React error #185 infinite loop in RecipeDetailSheet.tsx, (3) faction resolution in datasheets.ts. These are independent fixes, not Phase 61 deliverables.

### Claude's Discretion
- Test approach for verifying RH-01/RH-02/RH-03 (unit tests vs integration tests vs manual verification protocol)
- Whether to add a defensive check in recipe save path for missing recipe_sections table (belt-and-suspenders, or trust migration runner)
- Any minor code cleanup discovered during hardening (e.g., removing dead code, fixing typos) as long as it doesn't expand scope

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Migration Layer
- `src-tauri/migrations/018_recipe_sections.sql` — Creates recipe_sections table, adds section_id FK to recipe_steps, backfills default sections
- `src-tauri/migrations/019_rules_favorites_notes.sql` — Rules favorites/notes tables (not recipe-related but must be registered)
- `src-tauri/migrations/020_workflow_metadata.sql` — Adds section_type, technique, execution_mode, applies_to to recipe_sections; adds section_name to painting_sessions
- `src-tauri/src/lib.rs` — Migration registration in get_migrations() (the bug fix site)

### Recipe Section Data Layer
- `src/types/recipeSection.ts` — RecipeSection interface, SECTION_TYPES/TECHNIQUES/EXECUTION_MODES const arrays
- `src/db/queries/recipeSections.ts` — 6 query functions (CRUD + reorder + step counts)
- `src/hooks/useRecipeSections.ts` — React Query hooks with 5-key cascade invalidation on delete

### Session Integration
- `src/db/queries/paintingSessions.ts` — Session queries with recipe_id, recipe_step_id, section_name fields
- `src/features/recipes/logSessionSchema.ts` — Zod schema with section_name
- `src/lib/computeWorkflowPosition.ts` — Pure function with degradation rules for orphaned sections/steps

### Recipe Form & Display
- `src/features/recipes/RecipeFormSheet.tsx` — Multi-section form with DELETE-all + re-INSERT save
- `src/features/recipes/RecipeDetailSheet.tsx` — Detail view (has React error #185 fix in uncommitted changes)
- `src/features/recipes/RecipeSectionCard.tsx` — Progressive disclosure workflow collapsible
- `src/features/recipes/SectionedTimeline.tsx` — Read-only section display with metadata badges

### Debug Context
- `.planning/debug/recipe-save-fails.md` — Documents the migration registration bug (root cause of RH-01)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeWorkflowPosition` (src/lib/): Pure function with comprehensive degradation rules — already handles orphaned step IDs and stale section names
- `SECTION_TYPES` const array (src/types/recipeSection.ts): Single source of truth for section_type dropdown values
- Progressive disclosure Collapsible in RecipeSectionCard: Existing pattern for hiding workflow metadata on simple recipes
- 14-group test suite (tests/painting/recipeSections.test.ts): Comprehensive coverage of query functions and hook invalidation

### Established Patterns
- DELETE-all + re-INSERT for section saves — no stable section_id FK possible
- Denormalized TEXT fields for cross-boundary references (section_name, detachment_name, weapon_name)
- COALESCE/direct assignment duality for nullable fields
- Cache invalidation symmetry (if create invalidates a key, delete must too)

### Integration Points
- LogSessionSheet cascade selector: recipe → section → step (must reflect section renames after save)
- Kanban/CurrentFocus cards: consume computeWorkflowPosition output for section-aware display
- RecipeFormSheet onSubmit: always calls createRecipeSection() even for minimal recipes — first point of failure when recipe_sections table is missing

</code_context>

<specifics>
## Specific Ideas

No specific requirements — this is a hardening phase focused on verifying existing functionality works correctly. The three requirements (RH-01, RH-02, RH-03) have clear acceptance criteria in ROADMAP.md success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 61-Recipe Workflow Hardening*
*Context gathered: 2026-05-12*
