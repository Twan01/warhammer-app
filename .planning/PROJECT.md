# HobbyForge

## What This Is

HobbyForge is a personal Windows desktop app for managing a Warhammer 40K hobby collection. It tracks owned units, painting progress, structured painting recipes, army lists, battle logs, spending, and a premium live dashboard answering "what do I own, what's painted, and what's ready to play." Official points and rules data are imported via Wahapedia sync for personal use.

Shipped through v0.2.9 (60 phases): full hobby command center with collection management, painting workflow (Kanban + structured step-by-step recipes with hierarchical section groupings, workflow metadata, paint availability, and DnD reorder), army list builder with detachment selection and inline rules context, battle log, spending tracker, hobby goals, photo journal, session-recipe linking with section-level cascading selectors, premium CSS grid dashboard with workflow-aware CurrentFocusCard and KanbanCards, a complete rules data hub with standalone browser (stratagems/detachments/shared abilities with filtering and search), user annotations (favorites, notes, reminders) on any imported rule, and a Game Day mode for focused in-game reference (CP tracker, phase-grouped stratagems, unit ability cards, pre-game checklist). Now building v0.2.10: applied recipes (recipe-as-painting-plan with per-unit step progress), points import with freshness tracking, and advanced army list validation with tactical role coverage.

## Current Milestone: v0.2.11 Foundation Hardening

**Goal:** Stabilize the technical foundation — migrations, recipe data integrity, version hygiene — so future features are built on reliable data structures.

**Target features:**
- Migration registration & clean DB validation (register 018/019/020, verify fresh install)
- Paintless recipe step support (persist steps without paint, exclude from availability)
- Non-destructive recipe edits (preserve section/step IDs instead of delete-all + re-insert)
- Section metadata clearing (fix COALESCE preventing null assignment)
- Version number hygiene (align package.json and tauri.conf.json)
- Stable recipe_section_id on painting sessions (FK alongside denormalized name)
- Section-aware step ordering (order by section then step in recipe-level queries)
- Data-layer tests (migration, recipe persistence, session links, army list schema)

## Current State

v0.2.11 in progress. v0.2.10 in progress. v0.2.9 shipped 2026-05-12.

## Core Value

A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with official points via Wahapedia sync for personal use.

## Requirements

### Validated

*All v0.1.1 requirements verified and shipped 2026-05-01*

- ✓ App shell (Tauri 2 + React 19 + TS + SQLite, dark mode, sidebar, TanStack Router/Query) — Phase 1 — v0.1.1
- ✓ Full 10-table schema, FK enforcement, seed data (4 factions, 5 units, 6 paints, 3 recipes) — Phase 2 — v0.1.1
- ✓ Faction / Unit / Paint CRUD with typed query → hook → UI stack — Phase 2 — v0.1.1
- ✓ Collection page: searchable, filterable table, optimistic status updates, detail Sheet — Phase 3 — v0.1.1
- ✓ Painting Projects Kanban with dnd-kit drag-and-drop and optimistic rollback — Phase 4 — v0.1.1
- ✓ Painting recipe CRUD with step-level paint linkage and owned/missing indicator — Phase 4 — v0.1.1
- ✓ Dashboard stat cards, faction summaries, active projects list, recently updated — Phase 5 — v0.1.1

*All v0.2.0 requirements verified and shipped 2026-05-03*

- ✓ Schema migration 004 — 8 nullable columns on unit_strategy_notes; typed query/hook modules for army lists, strategy notes, and paint recipes — Phase 6 — v0.2.0
- ✓ Paint Inventory page at /paints: brand/type/color-family filters, running-low/wishlist presets, recipe badge navigation, inline owned toggle — Phase 7 — v0.2.0
- ✓ Army List Builder: create/edit/delete lists, add/remove units, COALESCE-in-SQL points, battle-ready %, per-unit notes, army-list membership pre-check on unit delete — Phase 8 — v0.2.0
- ✓ Unit Playbook tab: stats block (M/T/Sv/W/Ld/OC), abilities, keywords, 8 strategy notes, dirty-state Save with toasts — Phase 9 — v0.2.0

*All v0.2.1 requirements verified and shipped 2026-05-04*

- ✓ Faction Dynamic Theming — UI accent colors shift per selected faction across the entire app — Phase 10 — v0.2.1
- ✓ Collapsible Icon Sidebar — icon-only mode with tooltip polish, persisted state — Phase 10 — v0.2.1
- ✓ Dashboard Command Center — animated stat counters, faction-accented summary cards — Phase 11 — v0.2.1
- ✓ Collection Gallery View — card grid with painting-status ring as alternate to table — Phase 12 — v0.2.1
- ✓ Hobby Journal — per-unit photo timeline + painting session log with time tracking — Phase 13 — v0.2.1
- ✓ Spending Tracker — cost per unit and paint, per-faction and total spend views — Phase 14 — v0.2.1
- ✓ 40K Datasheet Integration — auto-populate unit stats/abilities/keywords from community data — Phase 15 — v0.2.1
- ✓ Design Overhaul — typography, spacing, layouts, empty states, and overall UI polish — Phase 16 — v0.2.1

*All v0.2.2 requirements verified and shipped 2026-05-05*

- ✓ Schema Foundation + Enrichment — lore_notes and undercoat on units, lore_notes on factions, purchase_date on paints, dates.ts timezone-safe utility — Phase 17 — v0.2.2
- ✓ Battle Log — CRUD page with opponent faction, mission, result, army list linkage, notes, chronological list — Phase 18 — v0.2.2
- ✓ Analytics Core — hobby velocity, painting streak on Dashboard, monthly spend trend chart — Phase 19 — v0.2.2
- ✓ Hobby Goals — create goals with target dates, track progress via painting sessions, dashboard goal card — Phase 21 — v0.2.2
- ✓ Hobby Goals Polish — goal filtering, completion celebrations, streak integration with goals — Phase 22 — v0.2.2
- ✓ Display Features — Battle Ready collection filter preset, unit showcase mode with photo display — Phase 23 — v0.2.2
- ✓ Unit Point Calculator — per-model-count point tiers, wargear loadout selection, delta preview badge in army lists — Phase 24 — v0.2.2
- ✓ Gap Closure — timezone-safe date import, cache invalidation symmetry (delete→goal-progress, update→army-lists), purchase_date form field wiring — Phase 35 — v0.2.2

*All v0.2.3 requirements verified and shipped 2026-05-05*

- ✓ Design Foundation — unified design tokens (Forge Black, Gunmetal, Panel Elevated, Battle Gold), shared PageHeader, enriched MetricCard, StatusBadge — Phase 25 — v0.2.3
- ✓ Dashboard Redesign — "Hobby Command Center" header, CurrentFocusCard, HobbyPipeline, upgraded FactionSummaryCard, Recent Activity feed, LogSessionSheet — Phase 26 — v0.2.3
- ✓ Navigation & Quick Add — hobby-native sidebar groups (Command/Workshop/Play/Management), Quick Add dropdown with 8 actions, Sheet-overlay flows — Phase 27 — v0.2.3
- ✓ Collection visual upgrade — photo thumbnails on gallery cards, unified StatusBadge across table and gallery — Phase 28 — v0.2.3
- ✓ Projects enrichment — last-updated, recipe link, photo count, next-action hint per kanban card; Log Session shortcut — Phase 28 — v0.2.3
- ✓ Workshop improvements — color swatches on paint rows, paint swatch strip on recipe cards — Phase 29 — v0.2.3
- ✓ Play Layer improvements — Army List readiness panel with progress bar, Battle Log live readiness points — Phase 29 — v0.2.3

*All v0.2.4 requirements verified and shipped 2026-05-06*

- ✓ Dashboard CSS grid bento layout (asymmetric 2-column, responsive stacking) — Phase 30 — v0.2.4
- ✓ Clickable StatCards navigating to relevant pages — Phase 30 — v0.2.4
- ✓ 5-bucket pipeline (Not Started / Assembly / Painting / Finishing / Done) — Phase 30 — v0.2.4
- ✓ CurrentFocusCard v2 (photo thumbnail, metadata, action buttons) — Phase 31 — v0.2.4
- ✓ ActiveProjectsPanel (top 5 with photos, progress, quick actions) — Phase 31 — v0.2.4
- ✓ UnitThumbnail shared component with consistent faction-colored fallback — Phase 31 — v0.2.4
- ✓ ArmyReadinessCard with target selector (500/1000/1500/2000) and per-faction progress bars — Phase 32 — v0.2.4
- ✓ LogSession painting status updates with 3-cache invalidation — Phase 33 — v0.2.4
- ✓ Spending intelligence (cost per completed model, painted vs unpainted value) — Phase 33 — v0.2.4
- ✓ Recipe-unit bidirectional navigation and CurrentFocusCard recipe name display — Phase 33 — v0.2.4
- ✓ FactionSummaryCard v2 (accent band, active glow ring) — Phase 34 — v0.2.4
- ✓ Hero radial gradient + hover shadow hierarchy on all dashboard cards — Phase 34 — v0.2.4

*All v0.2.5 requirements verified and shipped 2026-05-07*

- ✓ Schema foundation: recipe_paints → recipe_steps migration with zero data loss, 6 recipe metadata columns, cache fix, batch step count — Phases 37 — v0.2.5
- ✓ Structured step input: painting phase, tool, technique, dilution, time per step, drag-and-drop reorder — Phase 38 — v0.2.5
- ✓ Studio UX: card grid with paint availability badges, step timeline detail view, 4-dimension filtering — Phase 39 — v0.2.5
- ✓ Recipe actions: duplication, per-step photos, substitute paint linking, bulk wishlist add — Phase 40 — v0.2.5
- ✓ Session-recipe integration: recipe/step selectors in LogSessionSheet, session history in recipe detail — Phase 41 — v0.2.5

*All v0.2.6 requirements verified and shipped 2026-05-08*

- ✓ Architecture audit: full sync pipeline mapping, type/query/hook gap inventory, migration plan — Phase 42 — v0.2.6
- ✓ Extended rules read layer: stratagems, detachments, detachment abilities, shared abilities in PlaybookTab with TypeScript data layer — Phase 43 — v0.2.6
- ✓ Sync pipeline hardening: Rust per-table row counts, CSV header validation, persistent error logging, cache invalidation contract — Phase 44 — v0.2.6
- ✓ Sync metadata & import tracking: last sync date, row counts, source version, error history, freshness badge, pre-sync snapshot — Phase 45 — v0.2.6
- ✓ Manual overrides: per-unit points/stats/keywords/abilities overrides surviving re-syncs, 3-level COALESCE, visual override markers — Phase 46 — v0.2.6
- ✓ Per-field diff: enriched snapshots, stat/keyword/ability value comparison, Modified section in diff UI — Phases 46–47 — v0.2.6

*All v0.2.7 requirements verified and shipped 2026-05-08*

- ✓ Section data layer: recipe_sections table (9 columns), section_id FK on recipe_steps, zero-data-loss migration with default section backfill — Phase 48 — v0.2.7
- ✓ Section CRUD: typed query/hook layer for create/read/update/delete/reorder sections, batch per-section step counts — Phase 48 — v0.2.7
- ✓ Sectioned timeline view: section headers with name, surface badge, step count, time estimate, per-section paint availability — Phase 49 — v0.2.7
- ✓ Flat timeline backward compatibility: recipes without sections render existing flat timeline unchanged — Phase 49 — v0.2.7
- ✓ Section form UI: collapsible DnD section cards with progressive disclosure, section add/rename/delete, step reorder within sections — Phase 50 — v0.2.7
- ✓ Section-aware duplication: recipe copy includes sections with Map<oldId, newId> remapping, section count on recipe cards — Phase 51 — v0.2.7

*All v0.2.8 requirements verified and shipped 2026-05-11*

- ✓ Rules Data Hub UI: standalone RulesHubPage with sync status, 3-tab browser (stratagems/detachments/shared abilities), faction filtering, text search, error history, diff summary, disclaimer — Phases 52–53 — v0.2.8
- ✓ Army Lists 2.0: detachment selection with DetachmentPicker, inline detachment ability and filtered stratagems, StaleDataBanner, reminders section — Phase 54 — v0.2.8
- ✓ Playbook annotations: star/favorite toggle, Game Day reminder flag, inline personal notes with debounced auto-save on every rule entry across RulesHubPage and PlaybookTab — Phase 55 — v0.2.8
- ✓ Game Day Mode: GameDayPage with CP tracker, phase-grouped stratagems, pinned reminders, collapsible unit ability cards with OPG toggles, persistent pre-game checklist, painting status badges — Phase 56 — v0.2.8
- ✓ Points import design: schema, versioning, deltas, manual override interaction, COALESCE precedence documented — Phase 52 — v0.2.8

*All v0.2.9 requirements verified and shipped 2026-05-12*

- ✓ Section-level workflow metadata (section_type, technique, execution_mode, applies_to) — Phase 57 — v0.2.9
- ✓ Workflow metadata editing UI with progressive disclosure — Phase 58 — v0.2.9
- ✓ Compact metadata display in SectionedTimeline (section_type Badge, technique/execution_mode dot-separated) — Phase 58 — v0.2.9
- ✓ Log Session section-aware cascading selectors (recipe → section → step) — Phase 59 — v0.2.9
- ✓ Kanban card current workflow/next step display — Phase 60 — v0.2.9
- ✓ Current Focus card section-aware next action guidance — Phase 60 — v0.2.9

### Active

*v0.2.11 — Foundation Hardening*

- [ ] **MIG-01**: Register migrations 018/019/020 in lib.rs — fresh install creates all required tables/columns
- [ ] **MIG-02**: Clean DB validation — fresh app launch from empty app data directory succeeds without errors
- [ ] **REC-01**: Paintless recipe steps — persist steps without paint_id, exclude from availability calculations
- [ ] **REC-02**: Non-destructive recipe edits — preserve section/step IDs, update in place, delete only removed items
- [ ] **REC-03**: Section metadata clearing — direct assignment instead of COALESCE for nullable metadata fields
- [ ] **REC-04**: Stable recipe_section_id on painting sessions — FK reference alongside denormalized section_name
- [ ] **REC-05**: Section-aware step ordering — recipe-level queries order by section index then step index
- [ ] **VER-01**: Version number hygiene — package.json and tauri.conf.json match current release
- [ ] **TST-01**: Data-layer tests — migration registration, recipe persistence, session links, schema validation

### Out of Scope

- Backup / export / import — deferred
- Settings page — deferred
- Multi-game-system support (AoS, Horus Heresy, etc.) — 40K 10th edition only
- macOS / Linux builds — Windows-only
- Mobile companion app — desktop only
- AI features (recipe generator, battle summarizer, recommendations) — deferred
- Competitive list optimization or rules validation — explicitly not the goal
- Real-time multiplayer / cloud sync / accounts — local-first by design
- Real-time auto-sync (scheduled Wahapedia fetch) — local-first, user triggers manually
- ATTACH DATABASE for cross-DB queries — tauri-plugin-sql limitation; dual-query merge pattern continues

## Context

- **Current state:** v0.2.9 shipped. ~290 TypeScript source files. ~96,000 LOC. Tauri 2 + React 19 + Tailwind v4 + shadcn/ui (new-york/zinc). 11 main pages. Dual-DB architecture (hobbyforge.db + rules.db) with hardened sync pipeline. 20 SQLite migrations (19 hobbyforge.db + 1 rules.db wargear extension). Workflow-aware painting recipes with section metadata, cascading session logging, and Kanban/CurrentFocus integration.
- **Personal tool** — single user (the owner), local-first, no accounts or sync
- **Domain:** Warhammer 40K 10th edition, hobby management (collecting → painting → playing)
- **User journey priority:** painter/collector → ready-to-play, *not* competitive optimization
- **Visual style:** dark slate background, faction-colored accents, rounded cards, compact tables. Serious dashboard, not toy-like.

## Constraints

- **Tech stack**: Tauri 2 (desktop shell) + React 19 + TypeScript + Tailwind v4 CSS + shadcn/ui + SQLite — chosen for local-first desktop with modern web UI
- **ORM**: `tauri-plugin-sql` directly (no ORM). Prisma confirmed dead-end in Tauri production builds. Drizzle is a v3 escape hatch only if raw typed queries become unmanageable.
- **Platform**: Windows only for v0.2.0 — matches user's dev environment
- **Legal**: Private personal tool — official points imported via Wahapedia sync for personal use only. Not distributed publicly.
- **Local-first**: All data on local disk (SQLite + filesystem). No network calls, no cloud, no telemetry
- **Code organization**: Database access lives in `src/db/queries/*`. Feature-folder structure under `src/features/*`. Components only call hooks, never query functions directly.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri over Electron | Smaller binary, native feel, Rust backend | ✓ Good — build size and startup performance better than Electron alternative |
| tauri-plugin-sql directly (no ORM) | Prisma confirmed dead-end in Tauri production (freezes). Drizzle adds proxy complexity for no v1 win | ✓ Good — typed query functions work well; 0 ORM issues in 5 phases |
| Local-first SQLite (no cloud, no accounts) | Personal tool, single user, privacy + offline by default | ✓ Good — no auth surface, instant startup |
| Dark-mode-first UI | "Serious hobby command center" feel | ✓ Good — consistent with zinc/shadcn dark theme throughout |
| All 10 tables in one migration | Avoid migration risk across phases; schema complete before any UI work | ✓ Good — zero migration issues in Phases 2–5 |
| 0\|1 literal types for SQLite booleans | Runtime mismatch prevention — SQLite returns integers, not booleans | ✓ Good — caught by TypeScript; prevented several silent bugs |
| `useUnits` mutations invalidate `["dashboard-stats"]` in Phase 2 | Forward-compat for Phase 5 Dashboard — zero work at Phase 5 time | ✓ Excellent — DATA-09 paid off exactly as designed |
| Kanban shows all 11 columns (not just populated) | All columns visible = all drop targets always reachable (better DnD UX) | ✓ User-approved — more intuitive drag experience |
| Zustand for filter state (not URL params) | Ephemeral UX — filters reset on navigation, no URL complexity | ✓ Good for personal tool; URL params deferred if multi-device ever needed |
| TDD Wave 0 pattern (pure functions + tests before UI) | Provides automated verification signal throughout execution | ✓ Good — computeStats/relativeTime/kanbanUtils bugs caught before UI existed |
| selectedUnitId pattern (store ID, derive unit from cache) | Prevents stale data after optimistic cache updates | ✓ Good — correctly handles post-mutation refresh without extra re-fetches |
| Sibling Sheet/Dialog portal pattern | Nested Radix portals cause z-index and context issues | ✓ Good — consistent pattern across all 3 pages using Sheets/Dialogs |
| Windows-only for v0.2.0 | Matches dev environment; avoids cross-platform packaging overhead | ✓ Good — no issues in Phases 6–9 |
| 40K 10th edition only | Simpler scope; multi-system via game_system field later if needed | ✓ Good — no scope pressure yet |
| COALESCE in SQL for effective_points | DB-side computation prevents N-place reimplementation | ✓ Excellent — ArmyListSummaryBar just sums; zero JS math |
| Full-replacement UPDATE for army_list_units | NULL must be clearable (points_override back to inherited) | ✓ Good — confirmed correct via smoke test Pitfall 2 check |
| Zustand for paint inventory filters (same as collection) | Consistent ephemeral UX; filters reset on navigation | ✓ Good — identical pattern to Phase 3 collection filters |
| PlaybookTab SheetHeader/Footer outside Tabs | Edit/Delete must work from any tab without closing sheet | ✓ Good — Pitfall 5 avoidance; confirmed in Phase 9 smoke test |
| weapon_name as TEXT copy in unit_loadout_wargear | Cross-database FK to rules.db not supported in SQLite | ✓ Good — avoids cross-DB join complexity |
| COALESCE chain in army list SQL (alu.points_override → u.points → 0) | DB-side computation; tier confirms write to u.points, army lists pick up automatically | ✓ Excellent — delta preview just reads effective_points |
| Cache invalidation symmetry rule | If useCreate invalidates a key, useDelete must too | ✓ Good — enforced in Phase 35 gap closure; prevents stale UI |
| todayISO() from @/lib/dates (local timezone) | UTC-based .toISOString().slice(0,10) produces off-by-one after midnight | ✓ Good — single source of truth for date defaults |
| CSS grid atomic migration (Phase 30) | All 4 DashboardPage render branches updated atomically — never half-migrated grid | ✓ Good — zero layout regression during development |
| ArmyReadinessCard dedicated query hook | Separate from getDashboardStats to avoid full dashboard re-fetch on target change | ✓ Good — independent cache invalidation and loading |
| UnitThumbnail with Swords icon fallback | No text initials, no border-top — consistent faction-colored placeholder with icon | ✓ Good — clean fallback across CurrentFocusCard and ActiveProjectsPanel |
| useLatestUnitPhotos called once in DashboardPage | Photo hook called once at page level, prop-drilled to panels — prevents N+1 queries | ✓ Good — single query for all dashboard photo needs |
| FactionSummaryCard accent band via absolute div | Not CSS border — prevents border-radius clipping on rounded-xl cards | ✓ Good — clean visual at all sizes |
| Recipe by-unit cache invalidation prefix match | Raw array literal `["recipes", "by-unit"]` invalidates all `["recipes", "by-unit", *]` keys | ✓ Good — React Query prefix matching, no new constant needed |
| recipe_paints RENAME to recipe_steps (not new table) | Preserves all existing data; avoids copy+drop migration risk | ✓ Excellent — zero data loss, backward compat via type alias |
| Raw assignment (not COALESCE) for recipe metadata UPDATE | Users need to clear fields to NULL; COALESCE prevents clearing | ✓ Good — explicit design; consistent with how optional fields work |
| useFieldArray NOT used for step forms | Documented ID collision with @dnd-kit useSortable (RHF #10607) | ✓ Good — manual array + useMemo avoids the bug |
| Batch GROUP BY for step counts | Single query replaces N+1 per-recipe loop on RecipesPage | ✓ Excellent — O(1) vs O(N) queries |
| JOIN (not LEFT JOIN) for paint availability | Steps with deleted paints excluded from availability counts | ✓ Good — avoids NULL aggregation noise |
| Sequential mutateAsync for bulk wishlist add | Simpler error handling than Promise.all; first failure surfaces | ✓ Good — fine for local desktop app with low item counts |
| ON DELETE SET NULL for session-recipe FKs | Session survives recipe/step deletion; link cleared not orphaned | ✓ Good — preserves session data integrity |
| Conditional RECIPE_SESSIONS_KEY invalidation | Only when recipe_id != null — no unnecessary cache busts for unlinked sessions | ✓ Good — precise invalidation following symmetry rule |
| Overrides in hobbyforge.db, not rules.db | rules.db is destroyed and re-inserted on every sync — any data in rw_* tables is lost | ✓ Good — overrides survive re-syncs reliably |
| ExtendedSnapshotData options object for computeSyncDiff | Avoids 8-param explosion; optional third param maintains full backward compat | ✓ Good — clean API; existing call sites unchanged |
| Record<string, unknown>[] for snapshot select() generic | Composite-PK tables return different row shapes than simple id+name tables | ✓ Good — result goes to JSON.stringify so shape only matters at runtime |
| 3-level COALESCE for effective points | alu.points_override > uo.points > u.points — army-list override takes priority | ✓ Excellent — single SQL expression, no JS math |
| Pre-sync snapshot read before capture | getLatestSnapshot() → capturePreSyncSnapshot() ordering ensures baseline for diff | ✓ Good — first sync gracefully returns empty diff |
| Promise.all for post-sync extended queries | Three parallel SELECT queries with same ORDER BY as SNAPSHOT_TABLES for deterministic comparison | ✓ Good — minimal latency overhead for per-field diff |
| Two-DndContext nested approach for section + step DnD | Outer DndContext for section reorder, inner DndContext per section for step reorder | ✓ Good — avoids cross-container DnD complexity; each context independent |
| DELETE-all + re-INSERT for section saves | Avoids diff algorithm; CASCADE removes steps atomically before re-INSERT | ✓ Good — clean ordering, no orphaned rows |
| Progressive disclosure threshold (sections.length <= 1) | Single-section recipes show flat step list, 2+ shows section cards | ✓ Good — preserves simple UX for simple recipes |
| sectionIdMap in duplicateRecipe | Map<oldId, newId> built during section copy loop, used for step section_id remapping | ✓ Excellent — O(1) remap per step, prevents structural corruption |
| ON DELETE CASCADE for recipe_steps.section_id | Deleting a section automatically removes its steps — no manual cleanup | ✓ Good — consistent with recipe→section CASCADE |
| User data in hobbyforge.db, never rules.db | rules.db is destroyed on every sync — favorites, notes, detachment selection survive | ✓ Good — zero data loss on re-sync |
| detachment_name denormalized on army_lists | rules.db wipe removes detachment records; TEXT copy preserves display name | ✓ Good — consistent with weapon_name pattern |
| Page-level Map<compositeKey, T> for annotations | Load favorites/notes once, build Map via useMemo, pass to cards — no N+1 hooks | ✓ Excellent — O(1) per-card lookup, single query |
| Sub-component pattern for hooks-in-loop | DetachmentAbilityRow wraps per-item hook calls — satisfies Rules of Hooks | ✓ Good — clean pattern, reused in PlaybookTab and RulesHubPage |
| Game Day state in Zustand persist (localStorage) | CP, checklist, OPG toggles persist across navigation; SQLite deferred | ✓ Good — simple, appropriate for single-session game tracking |
| Heuristic OPG detection (keyword scan) | Detects "once per" in ability text for used/unused toggle; no rules.db schema change | ✓ Good — covers common patterns without brittle parsing |
| staleTime: Infinity + sync invalidation for rules.db hooks | Rules data only changes on sync; Infinity prevents spurious refetches | ✓ Good — consistent with read-heavy, write-rare access pattern |
| Denormalized section_name on painting_sessions | DELETE-all + re-INSERT save pattern destroys FK links; derive section from step's section_id instead | ✓ Good — matches detachment_name, weapon_name pattern |
| computeWorkflowPosition as pure function in src/lib/ | No React/DB deps; testable in isolation; usable by both Kanban and CurrentFocus | ✓ Excellent — 12 unit tests, zero coupling |
| useWorkflowPositions batch enrichment pattern | Sorted ID key for cache stability, Map result, 5min staleTime; follows useKanbanEnrichment exactly | ✓ Good — consistent with established hook patterns |
| Workflow progressive disclosure threshold | Check metadata presence, not just section count; hide when no data set | ✓ Good — simple recipes stay uncluttered |
| Design deviation D-08: execution_mode as text not Badge | Dot-separated string more compact than Badge for metadata-heavy timelines | — Accepted design trade-off (RUI-03 partial) |

---
## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-13 after v0.2.11 milestone started*
