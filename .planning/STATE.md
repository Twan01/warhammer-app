---
gsd_state_version: 1.0
milestone: v2.5
milestone_name: Recipes 2.0 / Painting Studio
status: Defining requirements
stopped_at: Milestone v2.5 started
last_updated: "2026-05-06"
last_activity: 2026-05-06 — Milestone v2.5 started, defining requirements
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-06 after v2.5 milestone started)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.5 Recipes 2.0 / Painting Studio — defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-06 — Milestone v2.5 started

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
- todayISO() from @/lib/dates is the single source of truth for date defaults (local timezone, not UTC)
- weapon_name stored as TEXT copy in unit_loadout_wargear — cross-database FK to rules.db not supported in SQLite
- COALESCE chain in armyLists.ts — tier points flow via units.points update, army lists pick up automatically
- UnitThumbnail shared component (Swords icon + faction-color fallback) for all photo thumbnails
- Recipe by-unit cache invalidation uses prefix match — `["recipes", "by-unit"]` invalidates all unit-specific keys
- Radix Select sentinel value `__none__` for "no selection" — Radix forbids empty string in SelectItem

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-06
Stopped at: Milestone v2.5 started — defining requirements
Resume: Continue requirement definition for Recipes 2.0
