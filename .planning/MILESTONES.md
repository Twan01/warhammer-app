# Milestones
## v0.2.9 Recipes 3.1 / Workflow Semantics & Integrations (Shipped: 2026-05-12)

**Phases completed:** 4 phases (57–60), 8 plans
**Timeline:** 2026-05-12 (single day)
**Stats:** 16 feat/test commits, 68 files changed, +8,458 / -83 lines, 18/19 requirements satisfied (1 partial)

**Key accomplishments:**
- Schema & data layer: migration 020 adds 4 workflow metadata columns (section_type, technique, execution_mode, applies_to) to recipe_sections + section_name on painting_sessions; const arrays as single sources of truth for dropdowns
- Recipe form & timeline display: Workflow collapsible with progressive disclosure on RecipeSectionCard (4 Select controls); compact badges and dot-separated metadata in SectionedTimeline
- Session section cascade: 3-level cascading selector (recipe → section → step) in LogSessionSheet with dual reset chains and filtered step dropdown
- Kanban & CurrentFocus integration: pure `computeWorkflowPosition` function (12 unit tests) + `useWorkflowPositions` batch hook; section-aware workflow display on KanbanCard and CurrentFocusCard with 5 graceful degradation paths
- Cache fix: workflow-positions invalidation added to useCreatePaintingSession for real-time position updates after session logging

**Known gap:** RUI-03 partial — execution_mode as dot-separated text instead of Badge (intentional design deviation D-08)

**Archived:**
- Roadmap: `.planning/milestones/v0.2.9-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.9-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.9-MILESTONE-AUDIT.md`

---

## v0.2.8 Rules Data Hub UI / Army Lists 2.0 / Game Day (Shipped: 2026-05-11)

**Phases completed:** 5 phases (52–56), 12 plans
**Timeline:** 2026-05-10 → 2026-05-11 (2 days)
**Stats:** 82 commits, 70 files changed, +6,137 / -28 lines, 27 requirements satisfied, ~87,660 total LOC

**Key accomplishments:**
- Schema + data layer foundation: Migration 019 adds detachment_id to army_lists, rules_favorites and rules_notes tables in hobbyforge.db; typed query modules with optimistic updates; points import design document with 5-level COALESCE precedence chain
- Rules Data Hub UI: standalone RulesHubPage with sync status header, faction browser, 3-tab rules browser (stratagems/detachments/shared abilities) with phase/CP filtering and text search, sync error history, diff summary, and Wahapedia disclaimer
- Army Lists 2.0 — Detachment Selection: DetachmentPicker Combobox scoped to faction, detachment ability and filtered stratagems display inline, StaleDataBanner for >30-day stale rules, favorites reminder section in army list detail
- Playbook enhancements: star/favorite toggle and Game Day reminder flag on every rule entry across RulesHubPage and PlaybookTab, inline personal notes with debounced auto-save, page-level Map<compositeKey, T> pattern preventing N+1 hooks
- Game Day Mode: GameDayPage launched from army list with CP tracker (spend/gain/undo), phase-grouped stratagems with pinned reminders, collapsible unit ability cards with once-per-game toggles, persistent pre-game checklist, painting status badges

**Archived:**
- Roadmap: `.planning/milestones/v0.2.8-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.8-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.8-MILESTONE-AUDIT.md`

---

## v0.2.7 Recipes 3.0 / Hierarchical Painting Workflows (Shipped: 2026-05-08)

**Phases completed:** 4 phases (48–51), 8 plans
**Timeline:** 2026-05-08 (single day)
**Stats:** 14 commits, 59 files changed, +8,259 / -174 lines, 19 requirements satisfied, 1,112 automated tests passing

**Key accomplishments:**
- Section data layer: migration 018 creates recipe_sections table with zero-data-loss default section backfill, typed CRUD queries, 5-key cascade invalidation contract on section delete
- Sectioned timeline view: SectionedTimeline component with section headers showing name, surface badge, step count, estimated time, and per-section owned/missing paint availability dots — backward-compatible flat fallback for unsectioned recipes
- Section form UI: collapsible DnD-reorderable section cards with progressive disclosure (single-section recipes stay flat as before), DraftSection/buildDraftSections pure functions with TDD
- Section-aware recipe duplication: Map<oldId, newId> remapping during section copy, section count badges on recipe cards (hidden for single-section recipes)
- Full backward compatibility: all pre-existing recipe workflows (availability, swatches, LogSession, CRUD) unchanged — 1,112 tests passing with zero regressions

**Archived:**
- Roadmap: `.planning/milestones/v0.2.7-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.7-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.7-MILESTONE-AUDIT.md`

---


## v0.2.6 Rules Sync 2.0 / Rules Data Hub (Shipped: 2026-05-08)

**Phases completed:** 6 phases (42–47), 11 plans
**Timeline:** 2026-05-08 (single day)
**Stats:** 79 commits, 32 files changed, +3,816 / -159 lines, 27 requirements satisfied, 1,031 automated tests passing

**Key accomplishments:**
- Architecture audit: full sync pipeline mapping (TypeScript CSV fetch → Rust transaction → SQLite) with gap inventory for types, queries, hooks, and migration plan
- Extended rules read layer: TypeScript types, query functions, and React Query hooks for stratagems, detachments, detachment abilities, and shared faction abilities — all four surfaced in PlaybookTab collapsible sections
- Sync pipeline hardening: Rust `bulk_sync_rules` returns per-table row counts via `SyncResult`, CSV column header validation rejects malformed files, sync errors logged to persistent `sync_errors` table, all rules query keys invalidated on success
- Sync metadata & import tracking: last sync date/time, per-table row counts, Wahapedia source version, sync error history, freshness badge (stale/fresh) on rules pages, pre-sync snapshot mechanism capturing all 11 tables
- Manual overrides: per-unit points/stats/keywords/abilities overrides in hobbyforge.db that survive re-syncs, 3-level COALESCE chain for effective points, override markers in PlaybookTab UI
- Per-field diff: enriched snapshot stores full field values for models/keywords/abilities, `computeSyncDiff` compares per-field changes, PlaybookTab Modified section shows stat/keyword/ability value changes after re-sync

**Archived:**
- Roadmap: `.planning/milestones/v0.2.6-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.6-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.6-MILESTONE-AUDIT.md`

---

## v0.2.5 Recipes 2.0 / Painting Studio (Shipped: 2026-05-07)

**Phases completed:** 5 phases (37–41), 12 plans
**Timeline:** 2026-05-07 (single day)
**Stats:** 87 files changed, +13,262 / -623 lines, 18 requirements satisfied

**Key accomplishments:**
- Schema foundation: migration 012 renames recipe_paints → recipe_steps (zero data loss), adds 11 columns across 3 migrations (012/013/014), fixes pre-existing kanban cache invalidation bug, replaces N+1 step count with batch GROUP BY query
- Structured step input: full painting step UI with phase label (10-value dropdown), tool, technique, dilution, time estimate per step with recipe total sum, @dnd-kit drag-and-drop reordering with persist-on-save cycle
- Studio UX transformation: RecipeTable replaced with responsive card grid (RecipeCard + RecipeCardGrid), paint availability badges (owned/missing/running-low per recipe via batch SQL), step-by-step vertical timeline detail view, 4-dimension filtering (surface/style/difficulty/missing paints)
- Recipe actions: one-click recipe duplication (copies header + all 12 step columns + substitutions), per-step photo upload via Tauri FS API with timeline thumbnails, alternate substitute paint linking per step, bulk "Add all missing to wishlist" with name-based deduplication
- Session-recipe integration: LogSessionSheet recipe/step dropdowns with faction-sorted picker and cascading clear, RecipeDetailSheet sessions history section — closes the planning-to-execution loop

**Archived:**
- Roadmap: `.planning/milestones/v0.2.5-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.5-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.5-MILESTONE-AUDIT.md`

---

## v0.2.4 Premium Dashboard UX & Visual Polish (Shipped: 2026-05-06)

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
- Roadmap: `.planning/milestones/v0.2.4-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.4-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.4-MILESTONE-AUDIT.md`

---

## v0.2.2 Full Circle (Shipped: 2026-05-05)

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
- Roadmap: `.planning/milestones/v0.2.2-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.2-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.2-MILESTONE-AUDIT.md`

---

## v0.2.3 Hobby Command Center (Shipped: 2026-05-05)

**Phases completed:** 5 phases (25-29), 21 plans
**Timeline:** 2026-05-04 → 2026-05-05 (2 days)
**Stats:** 117 commits, 189 TypeScript source files, 19,139 LOC, 86 test files, 114 v0.2.3-specific automated tests

**Key accomplishments:**
- Unified design system: semantic CSS tokens (Forge Black, Gunmetal, Panel Elevated, Battle Gold), shared PageHeader component on all 9 pages, enriched StatCard (icon/trend/progress), unified StatusBadge (4-tier color system for all 11 painting statuses)
- "Hobby Command Center" dashboard: CurrentFocusCard (active project with faction accent + next-action hint), HobbyPipeline (11-stage unit funnel), RecentActivityFeed (4 event types, live invalidation), LogSessionSheet, upgraded FactionSummaryCard (progress bar + battle-ready points)
- Global Quick Add: QuickAddContext provider, 8-action dropdown in sidebar (expanded + collapsed states), Sheet overlays from any page without navigation — covers Add Unit, Add Faction, Add Paint, Add Recipe, Create Project, Log Session, Add Purchase, Log Battle
- Collection + Projects upgrade: gallery photo thumbnails (asset:// URL from journal photos), StatusBadge in table and gallery (replacing PaintingRing), enriched kanban cards (last-updated, recipe name, photo count, next-action hint, Log Session shortcut via sibling portal)
- Workshop + Play layer: PaintRow color swatches, RecipeTable palette swatch strip (overlapping h-3 circles, +N overflow), ArmyListSummaryBar readiness panel (bg-battle-gold progress bar + not-ready unit list), BattleLogRow live readiness points (tabular-nums)

**Archived:**
- Roadmap: `.planning/milestones/v0.2.3-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.3-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.3-MILESTONE-AUDIT.md`

---

## v0.2.1 Visual Command (Shipped: 2026-05-04)

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
- v0.2.1 gap closure (Phase 20): DS-08 secondary path (DashboardPage conflict dialog), FactionsEmptyState Shield icon-pill, PaintingProjectsPage controlled-props CTA lift, upsertSyncMeta dead export removed

**Archived:**
- Roadmap: `.planning/milestones/v0.2.1-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.1-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.1-MILESTONE-AUDIT.md`

---

## v0.1.1 HobbyForge MVP (Shipped: 2026-05-01)

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
- Roadmap: `.planning/milestones/v0.1.1-ROADMAP.md`
- Requirements: `.planning/milestones/v0.1.1-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.1.1-MILESTONE-AUDIT.md`

**Tech debt carried forward:**
- PROJ-02: REQUIREMENTS.md text still said "empty columns hidden" — KanbanBoard ships all 11 columns always (user-approved UX improvement). Update when planning next milestone.
- PaintingProjectsPage empty-state CTA uses fragile DOM query; replace with `useState` pattern.

---

## v0.2.0 Utility Layer (Shipped: 2026-05-03)

**Phases completed:** 4 phases (6–9), 20 plans
**Timeline:** 2026-05-01 → 2026-05-03 (3 days)
**Stats:** 74 automated tests, ~14,000+ TypeScript LOC

**Key accomplishments:**
- Phase 6 back-end foundation: migration 004 (8 ALTER TABLE ADD COLUMN on `unit_strategy_notes`), TypeScript types for all three v0.2.0 features, query modules (`armyLists.ts`, `strategyNotes.ts`), hook modules with DATA-09 forward-compat invalidation, 38 automated tests
- Phase 7 Paint Inventory: PaintsPage at `/paints` with brand/type/color-family multi-select filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge with navigation to `/recipes?paintId=X`, inline owned toggle with optimistic update
- Phase 8 Army List Builder: ArmyListsPage, CRUD sheets, UnitPickerDialog (multi-add, stays open), ArmyListDetailSheet with pinned summary bar (COALESCE effective_points in SQL), per-unit notes, UnitDeleteDialog army-list membership pre-check, sibling portal architecture confirmed
- Phase 9 Unit Playbook: PlaybookTab inside shadcn Tabs with 6-field stats block (M/T/Sv/W/Ld/OC, suffix display, pencil edit mode), abilities/keywords, 8 strategy note fields in fixed order, dirty-state Save with toasts, SQLite persistence round-tripped in live app

**Archived:**
- Roadmap: `.planning/milestones/v0.2.0-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.0-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.0-MILESTONE-AUDIT.md`

**Tech debt carried forward:**
- PINV-01 requirement text says `/paint-inventory` but implementation uses `/paints` (CONTEXT.md decision not reflected in requirements doc)
- STRAT-06 requirement text references wrong migration filename (002 vs 004)
- PaintingProjectsPage empty-state CTA uses fragile DOM query (carried from v0.1.1)

---

