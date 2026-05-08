---
gsd_state_version: 1.0
milestone: v0.2.7
milestone_name: Recipes 3.0 / Hierarchical Workflows
status: in-progress
stopped_at: Completed 48-01-PLAN.md
last_updated: "2026-05-08T14:54:03.260Z"
last_activity: 2026-05-08 — Completed 48-01 (migration 018 + RecipeSection types)
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 8
  completed_plans: 1
  percent: 12
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08 after v0.2.7 milestone started)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** Phase 48 — Section Data Layer (Plan 02 next)

## Current Position

Phase: 48 of 51 (Section Data Layer)
Plan: 02 of 02 (next)
Status: In progress
Last activity: 2026-05-08 — Completed 48-01 (migration 018 + RecipeSection types)

Progress: [█░░░░░░░░░] 12%

## Performance Metrics

**Velocity:**
- Prior milestone (v0.2.6): 11 plans across 6 phases
- Prior milestone (v0.2.5): 12 plans across 5 phases

**48-01:** 2 tasks, 8 files, 185s

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

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-08T14:54:03.257Z
Stopped at: Completed 48-01-PLAN.md
Resume file: .planning/phases/48-section-data-layer/48-02-PLAN.md
