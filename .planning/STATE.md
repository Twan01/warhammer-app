---
gsd_state_version: 1.0
milestone: v0.1
milestone_name: milestone
status: completed
stopped_at: Phase 51 plans verified
last_updated: "2026-05-08T18:23:57.688Z"
last_activity: 2026-05-08 — Completed 50-03 (RecipeFormSheet section-aware rewrite)
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 8
  completed_plans: 6
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08 after v0.2.7 milestone started)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** Phase 50 — Section Form UI

## Current Position

Phase: 50 of 51 (Section Form UI) — Complete
Plan: 03 of 03 — complete
Status: Phase complete
Last activity: 2026-05-08 — Completed 50-03 (RecipeFormSheet section-aware rewrite)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Prior milestone (v0.2.6): 11 plans across 6 phases
- Prior milestone (v0.2.5): 12 plans across 5 phases

**48-01:** 2 tasks, 8 files, 185s
**48-02:** 3 tasks, 4 files, 324s
**49-01:** 2 tasks, 4 files, 493s
**50-01:** 2 tasks, 2 files, ~480s
**50-03:** 1 task, 2 files, ~20 min

## Accumulated Context

### Decisions Carried Forward

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- Migrations are append-only and immutable — new columns always via ALTER TABLE in a new numbered file
- pnpm is the package manager — npm fails with workspace: protocol errors
- Tailwind v4 CSS-first theming — @theme inline {} block, no tailwind.config.js
- Cache invalidation symmetry: if useCreate invalidates a key, useDelete must too
- todayISO() from @/lib/dates is the single source of truth for date defaults
- useFieldArray NOT used for step/section forms — documented RHF #10607 ID collision with useSortable; manual useState + crypto.randomUUID() is the project standard
- **v0.2.7 architecture locked**: Two-DndContext approach for nested DnD — outer DndContext for section reorder, one inner DndContext per section for step reorder; UUID localIds on both DraftSection and DraftStep prevent namespace collisions
- **v0.2.7 key risk**: duplicateRecipe must build Map<oldSectionId, newSectionId> during section copy and remap each step's section_id — omitting this causes structural corruption (Phase 51, first item)
- **v0.2.7 cascade contract**: ON DELETE CASCADE on recipe_steps.section_id — never delete steps manually before deleting a section; the cascade handles it
- **v0.2.7 invalidation contract**: useDeleteRecipeSection.onSuccess must invalidate all 5 keys: RECIPE_SECTIONS_KEY, RECIPE_PAINTS_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, RECIPE_SWATCH_KEY
- **v0.2.7 migration number corrected**: migration 018 (016 and 017 already existed — 016_rules_snapshot.sql, 017_unit_overrides.sql)
- **v0.2.7 form init**: single useEffect guarded on both existingSections.length and existingSteps.length resolving — never two separate effects; buildDraftSections is a pure tested function
- **48-01 decision**: section_id: null passed at all existing addRecipePaint call sites — Phase 50 form will supply real section_id values
- **48-02 decision**: updateRecipeSection uses COALESCE for name/optional/order_index but direct assign for surface/notes — null is a valid clear-value for the latter two fields
- **48-02 decision**: useUpdateRecipeSection mutation input type carries recipe_id for cache invalidation without passing it to the DB update path (UpdateRecipeSectionInput & { recipe_id: number })
- **49-01 decision**: SectionedTimeline returns null for empty sections array — zero render cost for recipes without sections
- **49-01 decision**: RecipeDetailSheet uses sections.length > 0 && !sectionsLoading conditional — VIEW-04 flat fallback preserved for unsectioned recipes
- **50-01 decision**: DraftSection mirrors DraftStep UUID localId pattern — crypto.randomUUID() assigned at draft creation, never persisted to DB
- **50-01 decision**: buildDraftSections null-coalesces all optional RecipeStep fields with `?? null` — handles rows that predate v0.2.7 columns safely
- **50-02 decision**: alert-dialog.tsx created as blocking dependency fix — radix-ui AlertDialog primitive available in radix-ui package but shadcn wrapper was absent; follows same wrapping pattern as dialog.tsx
- **50-02 decision**: RecipeSectionCard CollapsibleContent wraps RecipeStepList in px-3 pb-3 div for visual padding separation from header
- **50-02 decision**: Step count badge in section header only when collapsed AND steps.length > 0 — avoids redundancy when steps are visible
- **50-03 decision**: DELETE-all existing sections on edit then re-INSERT preserves clean section ordering without a diff algorithm — CASCADE removes their steps atomically
- **50-03 decision**: Progressive disclosure threshold: sections.length <= 1 renders flat RecipeStepList, sections.length >= 2 renders RecipeSectionList with section cards
- **50-03 decision**: formatMinutes.test.tsx updated to mock useRecipeSections and export RECIPE_PAINTS_KEY/STEP_COUNTS_KEY/RECIPE_AVAILABILITY_KEY/RECIPE_SWATCH_KEY constants — required after RecipeFormSheet gained these imports

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-08T18:23:57.684Z
Stopped at: Phase 51 plans verified
Resume file: .planning/phases/51-duplication-integration-polish/51-01-PLAN.md
