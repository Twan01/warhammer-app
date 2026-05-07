---
gsd_state_version: 1.0
milestone: none
milestone_name: none
status: between_milestones
stopped_at: v2.5 milestone archived
last_updated: "2026-05-07T16:00:00.000Z"
last_activity: 2026-05-07 — v2.5 Recipes 2.0 / Painting Studio shipped and archived
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-07 after v2.5 milestone)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** Planning next milestone

## Current Position

Milestone: v2.5 shipped and archived (2026-05-07)
Status: Between milestones — 41 phases across 7 milestones (v1.1 → v2.5) complete
Next: /gsd:new-milestone to start next milestone cycle

## Accumulated Context

### Decisions Carried Forward

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- selectedUnitId pattern for any page that opens a detail Sheet
- Migrations are append-only and immutable — new columns always via ALTER TABLE in a new numbered file
- Integer pence discipline (formatCurrency is the only /100 site)
- pnpm is the package manager — npm fails with workspace: protocol errors
- Tailwind v4 CSS-first theming — @theme inline {} block, no tailwind.config.js
- Design tokens: Forge Black, Gunmetal, Panel Elevated, Battle Gold defined in globals.css
- PageHeader shared component on all 9 pages
- StatusBadge 4-tier color system for 11 painting statuses
- Quick Add via QuickAddContext provider with 8-action dropdown
- Cache invalidation symmetry: if useCreate invalidates a key, useDelete must too
- todayISO() from @/lib/dates is the single source of truth for date defaults
- UnitThumbnail shared component (Swords icon + faction-color fallback)
- Recipe by-unit cache invalidation uses prefix match
- Radix Select sentinel value `__none__` for "no selection" — Radix forbids empty string in SelectItem
- recipe_steps table (renamed from recipe_paints in v2.5 migration 012)
- @dnd-kit wired for both Kanban and step reordering
- Photo upload pattern: openDialog → readFile → writeFile(UUID, AppData) → store filename in DB
- useFieldArray NOT used for step forms — documented ID collision with @dnd-kit useSortable (RHF #10607)
- Raw assignment (not COALESCE) for nullable metadata UPDATE — allows clearing to NULL
- Batch GROUP BY queries for aggregates (step counts, paint availability)
- RecipeStepTimeline is a pure presentational component — no internal data fetching
- ON DELETE SET NULL for session-recipe FKs — sessions survive recipe deletion
- Conditional cache invalidation — only invalidate RECIPE_SESSIONS_KEY when recipe_id is present

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-07T16:00:00.000Z
Stopped at: v2.5 milestone archived
Resume: Between milestones. Run /gsd:new-milestone to start next cycle.
