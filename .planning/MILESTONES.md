# Milestones

## v1.1 HobbyForge MVP (Shipped: 2026-05-01)

**Phases completed:** 5 phases (1–5), 20 plans
**Timeline:** 2026-04-30 → 2026-05-01 (2 days)
**Stats:** 189 files changed, ~40,700 lines added, ~9,400 TypeScript LOC

**Key accomplishments:**
- Tauri 2 + React 19 + TypeScript desktop app: dark-mode sidebar, SQLite plumbing, TanStack Router/Query, all shadcn components batch-installed
- Full 10-table SQLite schema with FK enforcement, seed data (4 factions, 5 units, 6 paints, 3 recipes), and complete CRUD for factions/units/paints via typed query → hook → UI stack
- Collection page: TanStack Table, Zustand filter store (search/faction/status/category/active), optimistic status updates with rollback, 28 passing unit tests
- Painting Projects Kanban: @dnd-kit drag-and-drop with optimistic mutations + rollback, recipe builder with sortable step list and inline paint creation
- Live-computed Dashboard: 7 stat cards, faction summary cards with click-through filter, active projects + recently updated lists, 113 passing tests total

**Archived:**
- Roadmap: `.planning/milestones/v1.1-ROADMAP.md`
- Requirements: `.planning/milestones/v1.1-REQUIREMENTS.md`
- Audit: `.planning/milestones/v1.1-MILESTONE-AUDIT.md`

**Tech debt carried forward:**
- PROJ-02: REQUIREMENTS.md text still said "empty columns hidden" — KanbanBoard ships all 11 columns always (user-approved UX improvement). Update when planning next milestone.
- PaintingProjectsPage empty-state CTA uses fragile DOM query; replace with `useState` pattern.

---

## v2.0 Utility Layer (Shipped: 2026-05-03)

**Phases completed:** 4 phases (6–9), 20 plans
**Timeline:** 2026-05-01 → 2026-05-03 (3 days)
**Stats:** 74 automated tests, ~14,000+ TypeScript LOC

**Key accomplishments:**
- Phase 6 back-end foundation: migration 004 (8 ALTER TABLE ADD COLUMN on `unit_strategy_notes`), TypeScript types for all three v2.0 features, query modules (`armyLists.ts`, `strategyNotes.ts`), hook modules with DATA-09 forward-compat invalidation, 38 automated tests
- Phase 7 Paint Inventory: PaintsPage at `/paints` with brand/type/color-family multi-select filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge with navigation to `/recipes?paintId=X`, inline owned toggle with optimistic update
- Phase 8 Army List Builder: ArmyListsPage, CRUD sheets, UnitPickerDialog (multi-add, stays open), ArmyListDetailSheet with pinned summary bar (COALESCE effective_points in SQL), per-unit notes, UnitDeleteDialog army-list membership pre-check, sibling portal architecture confirmed
- Phase 9 Unit Playbook: PlaybookTab inside shadcn Tabs with 6-field stats block (M/T/Sv/W/Ld/OC, suffix display, pencil edit mode), abilities/keywords, 8 strategy note fields in fixed order, dirty-state Save with toasts, SQLite persistence round-tripped in live app

**Archived:**
- Roadmap: `.planning/milestones/v2.0-ROADMAP.md`
- Requirements: `.planning/milestones/v2.0-REQUIREMENTS.md`
- Audit: `.planning/milestones/v2.0-MILESTONE-AUDIT.md`

**Tech debt carried forward:**
- PINV-01 requirement text says `/paint-inventory` but implementation uses `/paints` (CONTEXT.md decision not reflected in requirements doc)
- STRAT-06 requirement text references wrong migration filename (002 vs 004)
- PaintingProjectsPage empty-state CTA uses fragile DOM query (carried from v1.1)

---

