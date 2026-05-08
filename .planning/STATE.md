---
gsd_state_version: 1.0
milestone: v0.2.7
milestone_name: Recipes 3.0 / Hierarchical Painting Workflows
status: ready-to-plan
stopped_at: null
last_updated: "2026-05-08"
last_activity: 2026-05-08 — Roadmap created for v0.2.7 (4 phases, 19 requirements mapped)
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08 after v0.2.7 milestone started)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** Phase 48 — Section Data Layer

## Current Position

Phase: 48 of 51 (Section Data Layer)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-05-08 — Roadmap written, 19/19 requirements mapped across 4 phases

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Prior milestone (v0.2.6): 11 plans across 6 phases
- Prior milestone (v0.2.5): 12 plans across 5 phases

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
- **v0.2.7 migration number**: 016 (next after 015_sync_errors in hobbyforge.db)
- **v0.2.7 form init**: single useEffect guarded on both existingSections.length and existingSteps.length resolving — never two separate effects; buildDraftSections is a pure tested function

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-08
Stopped at: Roadmap written — ready to plan Phase 48
Resume file: None
