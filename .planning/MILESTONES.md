# Milestones

## v2.4 Premium Dashboard UX & Visual Polish (Shipped: 2026-05-06)

**Phases completed:** 6 phases (30–34, 36), 13 plans
**Timeline:** 2026-05-05 → 2026-05-06 (2 days)
**Stats:** 80 commits, 224 TypeScript source files, 778 automated tests passing

**Key accomplishments:**
- Dashboard CSS grid bento layout: asymmetric 2-column responsive grid, StatCards navigate to relevant pages, 11-stage pipeline compressed to 5 readable buckets (Not Started / Assembly / Painting / Finishing / Done)
- Photo-rich panels: UnitThumbnail shared component, CurrentFocusCard v2 (photo thumbnail + metadata + action buttons), ActiveProjectsPanel (top 5 active projects with photos, progress, quick actions)
- ArmyReadinessCard: per-faction battle-ready points with target point selector (500/1000/1500/2000 pts), progress bars with owned-vs-ready breakdown, dedicated query hook
- Data intelligence: LogSession painting status updates with 3-cache invalidation, spending metrics (cost per completed model, painted vs unpainted value split), bidirectional recipe-unit navigation, CurrentFocusCard recipe name display
- Visual polish: FactionSummaryCard v2 (dominant accent band + active glow ring), hero radial gradient, hover shadow hierarchy on all dashboard card surfaces
- Gap closure: recipe cache invalidation fix (DATA-06 by-unit prefix match), stale verification/summary doc cleanup

**Archived:**
- Roadmap: `.planning/milestones/v2.4-ROADMAP.md`
- Requirements: `.planning/milestones/v2.4-REQUIREMENTS.md`
- Audit: `.planning/milestones/v2.4-MILESTONE-AUDIT.md`

---

## v2.2 Full Circle (Shipped: 2026-05-05)

**Phases completed:** 8 phases (17–19, 21–24, 35), 23 plans
**Timeline:** 2026-05-04 → 2026-05-05 (2 days)
**Stats:** 87 commits, ~220 TypeScript source files, ~21,752 LOC, 644 automated tests

**Key accomplishments:**
- Schema enrichment (lore_notes, undercoat, purchase_date) + Battle Log CRUD (opponent faction, mission, result, army list linkage) + Analytics Core (hobby velocity, painting streak, spend trend chart)
- Hobby Goals: create goals with target dates, track progress via painting sessions, dashboard goal card with progress ring, completion celebrations, streak integration
- Display Features: Battle Ready collection filter preset, unit showcase mode with photo display
- Unit Point Calculator: per-model-count point tiers (unit_point_tiers table), wargear loadout selection with checkbox toggles (unit_loadout_wargear table), delta preview badge (+N green / -N red) in army list builder, COALESCE chain integration for effective_points
- Gap closure: timezone-safe todayISO() import, cache invalidation symmetry (delete→goal-progress, update→army-lists), purchase_date form field fully wired through Zod to mutation

**Archived:**
- Roadmap: `.planning/milestones/v2.2-ROADMAP.md`
- Requirements: `.planning/milestones/v2.2-REQUIREMENTS.md`
- Audit: `.planning/milestones/v2.2-MILESTONE-AUDIT.md`

---

## v2.3 Hobby Command Center (Shipped: 2026-05-05)

**Phases completed:** 5 phases (25-29), 21 plans
**Timeline:** 2026-05-04 → 2026-05-05 (2 days)
**Stats:** 117 commits, 189 TypeScript source files, 19,139 LOC, 86 test files, 114 v2.3-specific automated tests

**Key accomplishments:**
- Unified design system: semantic CSS tokens (Forge Black, Gunmetal, Panel Elevated, Battle Gold), shared PageHeader component on all 9 pages, enriched StatCard (icon/trend/progress), unified StatusBadge (4-tier color system for all 11 painting statuses)
- "Hobby Command Center" dashboard: CurrentFocusCard (active project with faction accent + next-action hint), HobbyPipeline (11-stage unit funnel), RecentActivityFeed (4 event types, live invalidation), LogSessionSheet, upgraded FactionSummaryCard (progress bar + battle-ready points)
- Global Quick Add: QuickAddContext provider, 8-action dropdown in sidebar (expanded + collapsed states), Sheet overlays from any page without navigation — covers Add Unit, Add Faction, Add Paint, Add Recipe, Create Project, Log Session, Add Purchase, Log Battle
- Collection + Projects upgrade: gallery photo thumbnails (asset:// URL from journal photos), StatusBadge in table and gallery (replacing PaintingRing), enriched kanban cards (last-updated, recipe name, photo count, next-action hint, Log Session shortcut via sibling portal)
- Workshop + Play layer: PaintRow color swatches, RecipeTable palette swatch strip (overlapping h-3 circles, +N overflow), ArmyListSummaryBar readiness panel (bg-battle-gold progress bar + not-ready unit list), BattleLogRow live readiness points (tabular-nums)

**Archived:**
- Roadmap: `.planning/milestones/v2.3-ROADMAP.md`
- Requirements: `.planning/milestones/v2.3-REQUIREMENTS.md`
- Audit: `.planning/milestones/v2.3-MILESTONE-AUDIT.md`

---

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

