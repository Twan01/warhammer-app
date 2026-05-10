---
gsd_state_version: 1.0
milestone: v0.2.8
milestone_name: Rules Data Hub / Army Lists 2.0 / Game Day
status: defining_requirements
stopped_at: Milestone v0.2.8 started — defining requirements
last_updated: "2026-05-10T12:00:00.000Z"
last_activity: 2026-05-10 — Milestone v0.2.8 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-10 after v0.2.8 milestone started)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** Defining requirements for v0.2.8

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-10 — Milestone v0.2.8 started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- v0.2.7: 8 plans across 4 phases (single day)
- v0.2.6: 11 plans across 6 phases (single day)
- v0.2.5: 12 plans across 5 phases (single day)

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
- Two-DndContext approach for nested DnD — outer for section reorder, inner per section for step reorder
- DELETE-all + re-INSERT for section saves — CASCADE removes steps atomically
- Progressive disclosure: sections.length <= 1 shows flat step list, 2+ shows section cards
- ON DELETE CASCADE on recipe_steps.section_id — never delete steps manually before deleting a section

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-10T12:00:00.000Z
Stopped at: Milestone v0.2.8 started — defining requirements
Resume: Continue with requirements definition
