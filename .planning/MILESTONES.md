# Milestones

## v2.1 Visual Command (Shipped: 2026-05-04)

**Phases completed:** 8 phases (10–16 + 20), 41 plans
**Timeline:** 2026-05-03 → 2026-05-04 (2 days)
**Stats:** 395 automated tests passing post-Phase 20

**Key accomplishments:**
- CSS `@theme` faction-accent system (`ActiveFactionContext`, `--faction-accent`) — every accent shifts per selected faction with localStorage persistence; collapsible sidebar with `useSidebarCollapsed` icon-only mode and Radix Tooltip labels
- Animated stat counters (`useCountUp` rAF cubic ease-out, 600ms, prefers-reduced-motion gate) on Dashboard hero; faction-accented `FactionSummaryCard` with `ring-faction-accent` ring on active faction
- Card gallery view (`UnitGallery` + `PaintingRing` SVG, 96px) with `useCollectionViewMode` localStorage toggle — Zustand filters preserved on view switch
- Per-unit Hobby Journal: `painting_sessions` table (migration 005), `tauri-plugin-fs/dialog`, session log (newest-first) + 3-col photo timeline with stage labels, lightbox sibling Dialog in CollectionPage + DashboardPage, JOUR-06 disk cleanup on unit delete
- Spending Tracker: integer-pence discipline, `formatCurrency` as sole /100 site, `SpendingPage` with per-faction breakdown, 6 mutations invalidate `["spending-stats"]`
- Dual-DB Wahapedia integration: `bulk_sync_rules` Rust command, `useRulesSync` 7-CSV parallel fetch + transactional insert, `DatasheetPicker`, `DatasheetImportDialog`, full PlaybookTab (stats/abilities/keywords/sources/lore notes) — DS-01..12 all satisfied
- Geist Variable font via @fontsource-variable, text-3xl page headers + border-b hairline, icon-pill empty states across all 7 pages, tabular-nums everywhere, card elevation system (shadow-sm + hover:shadow-md)
- v2.1 gap closure (Phase 20): DS-08 secondary path (DashboardPage conflict dialog), FactionsEmptyState Shield icon-pill, PaintingProjectsPage controlled-props CTA lift, upsertSyncMeta dead export removed

**Archived:**
- Roadmap: `.planning/milestones/v2.1-ROADMAP.md`
- Requirements: `.planning/milestones/v2.1-REQUIREMENTS.md`
- Audit: `.planning/milestones/v2.1-MILESTONE-AUDIT.md`

---

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

