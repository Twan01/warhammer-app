---
gsd_state_version: 1.0
milestone: v0.1
milestone_name: milestone
status: executing
stopped_at: Phase 50 context gathered
last_updated: "2026-05-08T15:30:21.662Z"
last_activity: 2026-05-08 — Completed 48-02 (recipeSections query module + hooks + tests)
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 3
  completed_plans: 2
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08 after v0.2.7 milestone started)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** Phase 49 — Section Read UI (next phase)

## Current Position

Phase: 48 of 51 (Section Data Layer) — COMPLETE
Plan: 02 of 02 — complete
Status: In progress
Last activity: 2026-05-08 — Completed 48-02 (recipeSections query module + hooks + tests)

Progress: [██░░░░░░░░] 25%

## Performance Metrics

**Velocity:**
- Prior milestone (v0.2.6): 11 plans across 6 phases
- Prior milestone (v0.2.5): 12 plans across 5 phases

**48-01:** 2 tasks, 8 files, 185s
**48-02:** 3 tasks, 4 files, 324s

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

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-08T15:30:21.658Z
Stopped at: Phase 50 context gathered
Resume file: .planning/phases/50-section-form-ui/50-CONTEXT.md
