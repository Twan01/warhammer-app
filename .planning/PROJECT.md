# HobbyForge

## What This Is

HobbyForge is a personal Windows desktop app for managing a Warhammer 40K hobby collection. It tracks owned units, painting progress, structured painting recipes, army lists, battle logs, spending, and a premium live dashboard answering "what do I own, what's painted, and what's ready to play." Official points and rules data are imported via Wahapedia sync for personal use.

Shipped through v0.2.15 (88 phases): full hobby command center with collection management, painting workflow (Kanban + structured step-by-step recipes with hierarchical section groupings, workflow metadata, paint availability, DnD reorder, non-destructive save preserving IDs, paintless steps, transactional graph save, recipe_step_id-keyed progress), a dedicated Painting Mode for focused step-by-step recipe execution (distraction-free full-page layout, keyboard shortcuts, section navigator, paint readiness warnings, atomic step completion with session logging, 6 entry points), army list builder with detachment selection, centralized points resolver with source labeling and user-confirmable unit-to-rules mapping, battle log with after-action capture (forgotten rules, MVP/underperformer notes), spending tracker, hobby goals, photo journal, session-recipe linking with section-level cascading selectors and stable FK, premium CSS grid dashboard with workflow-aware CurrentFocusCard, KanbanCards, NextPaintingActionCard, ReadyToPlayCard, and DataHealthSummaryCard, a complete rules data hub with standalone browser (stratagems/detachments/shared abilities with filtering and search), user annotations (favorites, notes, reminders) on any imported rule, Game Day mode for focused in-game reference (CP tracker, phase-grouped stratagems, unit ability cards, pre-game checklist, pre-game readiness panel, end-game after-action with forgotten-rules-to-reminders pipeline), Data Health page with diagnostics, structured backup export (.zip with VACUUM INTO + metadata.json), full restore with preview/validation/atomic swap/restart, automatic safety backups before restore and rules sync, progressive backup diagnostics with version mismatch detection, a data-layer test suite (14 tests via better-sqlite3 covering migration parity, recipe persistence, session FK), version parity enforcement, and auto-update via GitHub Releases with in-app banner.

## Current State

v0.2.18 in progress. Phase 94 (list-export) complete — 4-format army list export via ExportDropdown in detail sheet header: clipboard copy (tournament-style text via Tauri clipboard-manager plugin), print preview (PrintPreviewDialog with @media print CSS), JSON save (versioned hobbyforge-army-list v1.0 schema via native save dialog), PDF export (lazy-loaded jsPDF via write_bytes_to_path Rust command). Shared formatArmyListForExport utility with leader pair grouping, ghost/warlord markers, enhancement listing. 94 phases complete across 17 milestones. ~300+ TypeScript source files. 29 SQLite migrations (27 hobbyforge.db + 2 rules.db). 2,090+ automated tests. 8 Tauri Rust commands.

## Core Value

A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with official points via Wahapedia sync for personal use, and reliable backup/restore so local data is always recoverable.

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

*All v0.2.10 requirements verified and shipped 2026-05-13*

- ✓ RH-01: Migration integrity — fresh install creates recipe_sections with all 4 workflow metadata columns — Phase 61 — v0.2.10
- ✓ RH-02: Workflow position degradation safety — renaming sections doesn't break sessions — Phase 61 — v0.2.10
- ✓ RH-03: Progressive disclosure for simple recipes preserved — Phase 61 — v0.2.10
- ✓ AR-01: Applied recipe data model with composite key surviving DELETE-all + re-INSERT — Phase 62 — v0.2.10
- ✓ AR-02: Apply recipe with section/step preview from Collection/Unit Detail — Phase 63 — v0.2.10
- ✓ AR-03: Step-by-step checklist with independent progress per assignment — Phase 63 — v0.2.10
- ✓ AR-04: Unit detail applied recipe progress display with completion percentage — Phase 63 — v0.2.10
- ✓ AR-05: Log Session auto-marks applied recipe step on session creation — Phase 64 — v0.2.10
- ✓ AR-06: Kanban cards and CurrentFocusCard show applied recipe progress — Phase 64 — v0.2.10
- ✓ AR-07: Bulk apply recipe to multiple units with independent progress — Phase 63 — v0.2.10
- ✓ PI-01: Points import schema with synced_unit_points cache in hobbyforge.db — Phase 65 — v0.2.10
- ✓ PI-02: Wahapedia sync pipeline extended with points CSV import — Phase 65 — v0.2.10
- ✓ PI-03: Points freshness badges (stale/fresh/unknown) on army lists and rules hub — Phase 65 — v0.2.10
- ✓ PI-04: Per-unit points deltas with army list impact after sync — Phase 65 — v0.2.10
- ✓ PI-05: 5-level COALESCE chain applied atomically across all 3 query sites — Phase 65 — v0.2.10
- ✓ LV-01: Hard validation warnings on army lists (points, freshness, ownership, readiness) — Phase 66 — v0.2.10
- ✓ LV-02: Tactical role tags assignable to units — Phase 66 — v0.2.10
- ✓ LV-03: Tactical role coverage visualization with strengths/weaknesses — Phase 66 — v0.2.10
- ✓ LV-04: Health summary panel (points, ownership %, readiness %, freshness, warnings) — Phase 66 — v0.2.10
- ✓ GD-01: Game Day pre-game readiness panel with points/freshness/warnings/role coverage — Phase 67 — v0.2.10

*All v0.2.11 requirements verified and shipped 2026-05-13*

- ✓ MIG-01: All migrations (018-021) registered in lib.rs — fresh install creates all tables/columns — Phase 68 — v0.2.11
- ✓ MIG-02: Fresh app launch from empty data directory succeeds without errors — Phase 68 — v0.2.11
- ✓ REC-01: Paintless recipe steps persist without paint_id, excluded from availability calculations — Phase 69 — v0.2.11
- ✓ REC-02: Non-destructive recipe save preserves section/step IDs via five-phase diff — Phase 70 — v0.2.11
- ✓ REC-03: Section metadata clearing via direct assignment (not COALESCE) — Phase 68 — v0.2.11
- ✓ REC-04: Stable recipe_section_id FK on painting sessions with denormalized section_name — Phase 71 — v0.2.11
- ✓ REC-05: Section-aware step ordering via LEFT JOIN + COALESCE ORDER BY — Phase 68 — v0.2.11
- ✓ VER-01: package.json and tauri.conf.json version numbers aligned — Phase 68 — v0.2.11
- ✓ TST-01: 14 data-layer tests via better-sqlite3 covering migration parity, recipe persistence, session FK, schema shape — Phase 72 — v0.2.11

*All v0.2.13 requirements verified and shipped 2026-05-15*

- ✓ DI-01: Applied recipe step progress keyed by recipe_step_id — reordering steps does not move completion — Phase 74 — v0.2.13
- ✓ DI-02: Existing progress rows migrated safely from order_index to recipe_step_id with section-disambiguated back-fill — Phase 74 — v0.2.13
- ✓ DI-03: Recipe metadata, sections, and steps save atomically in a single transaction — Phase 75 — v0.2.13
- ✓ DI-04: Recipe graph save preserves existing section/step IDs (non-destructive five-phase diff) — Phase 75 — v0.2.13
- ✓ DI-05: package.json and tauri.conf.json versions match, enforced by pnpm check:version — Phase 73 — v0.2.13
- ✓ PV-01: All army list / Game Day / validation surfaces use centralized resolveUnitPoints() — Phase 76 — v0.2.13
- ✓ PV-02: Points source labeled in UI (synced / manual override / unknown) — Phase 76 — v0.2.13
- ✓ PV-03: Auto-matched vs manually confirmed visible per unit — Phase 76 — v0.2.13
- ✓ PV-04: User can confirm or override unit-to-rules mapping — Phase 76 — v0.2.13
- ✓ PV-05: Duplicate or ambiguous matches flagged — Phase 76 — v0.2.13
- ✓ PV-06: List-level warnings shown once in summary panel — Phase 76 — v0.2.13
- ✓ PV-07: Unit-level warnings attached to individual unit rows — Phase 76 — v0.2.13
- ✓ DX-01: Data Health shows versions, sync date, sync error count — Phase 77 — v0.2.13
- ✓ DX-02: Data Health shows table counts for key tables — Phase 77 — v0.2.13
- ✓ DX-03: Data Health flags orphans, ambiguous matches, stale data — Phase 77 — v0.2.13
- ✓ DX-04: Diagnostics async/lazy — Phase 77 — v0.2.13
- ✓ BK-01: Backup via file picker — Phase 77 — v0.2.13
- ✓ BK-02: VACUUM INTO backup — Phase 77 — v0.2.13
- ✓ BK-03: Backup status displayed — Phase 77 — v0.2.13
- ✓ DB-01: Dashboard Next Painting Action card — Phase 78 — v0.2.13
- ✓ DB-02: Dashboard Ready to Play summary — Phase 78 — v0.2.13
- ✓ DB-03: Dashboard Data Health summary — Phase 78 — v0.2.13
- ✓ GD-01: End Game pre-filled battle log — Phase 78 — v0.2.13
- ✓ GD-02: After-action learnings capture (forgotten rules, MVP/underperformer) — Phase 78 — v0.2.13
- ✓ GD-03: Forgotten rules become Game Day reminders — Phase 78 — v0.2.13
- ✓ GD-04: Notes editable from after-action — Phase 78 — v0.2.13

*All v0.2.14 requirements verified and shipped 2026-05-19*

- ✓ EXP-01–05: Structured backup export (.zip with VACUUM INTO + metadata.json, timestamped filename, success/failure feedback) — Phases 79–80 — v0.2.14
- ✓ RST-01–09: Full restore pipeline (file picker, manifest validation, schema compatibility preview, explicit confirmation, auto safety backup, atomic swap, app restart) — Phases 81–82 — v0.2.14
- ✓ STS-01–04: Backup status display (last backup age, health tier indicator, action links, dashboard summary) — Phase 80 — v0.2.14
- ✓ SAF-01–04: Safety backups (pre-restore, pre-sync, app data directory, visible in Data Health) — Phases 79, 82 — v0.2.14
- ✓ DGN-01–04: Backup diagnostics (never-backed-up flag, staleness threshold, version mismatch, progressive disclosure) — Phase 83 — v0.2.14

*All v0.2.15 requirements verified and shipped 2026-05-20*

- ✓ DL-01..DL-04: Atomic step completion transaction, section-aware ordering, 6-key cache invalidation, navigation hook with first-incomplete selection — Phase 84 — v0.2.15
- ✓ SE-01..SE-05: Step execution view with paint swatch, technique/tool/dilution/time, mark done, prev/next navigation, position indicator, reference photo — Phase 85 — v0.2.15
- ✓ SP-01..SP-05: Section navigator with progress counts, current section highlight, jump-to-section/step, optional section badges, section completion acknowledgment — Phases 85–86 — v0.2.15
- ✓ PR-01..PR-03: Paint readiness warning at entry, non-blocking missing paint display, paintless step handling without false warnings — Phase 85 — v0.2.15
- ✓ SL-01..SL-03: Prefilled session logger, atomic done+log action, standalone mark-done alternative — Phase 87 — v0.2.15
- ✓ EP-01..EP-06: Six entry points (Dashboard, CurrentFocus, Unit Detail, Kanban, RecipeDetail), empty state guidance — Phase 87 — v0.2.15
- ✓ PX-01..PX-06: Distraction-free layout, keyboard shortcuts (Space/Arrow/Escape), input guards, time estimate per step — Phases 85–86 — v0.2.15
- ✓ TS-01..TS-07: Test coverage for step selection, completion, navigation, optional sections, paintless steps, paint warnings, session prefill — Phases 84, 88 — v0.2.15

## Current Milestone: v0.2.18 Army Lists 3.0 — Smart List Builder

**Goal:** Transform army lists from a simple unit tracker into a full list-building experience with auto-resolved points, loadout configuration, enhancements, list export, version history, and the ability to plan with units you don't yet own.

**Target features:**
- Auto-link units to rules datasheets (auto-match by name, manual fallback for ambiguous)
- Full loadout builder (model count tiers, wargear options, per-choice points adjustment)
- Enhancement assignment to character units with auto-points
- Collection + rules browsing (add owned units AND plan with unowned datasheets, with indicator)
- List export (text/clipboard, print-friendly, JSON/PDF)
- Version snapshots (save named versions, side-by-side comparison)
- Bug fix: units display order in army list

### Active

*Requirements being defined — see REQUIREMENTS.md*

### Out of Scope

- Auto-backup on schedule — manual backup + safety backups before risky operations sufficient for now
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

- **Current state:** v0.2.15 shipped. ~300+ TypeScript source files. ~100,000+ LOC. Tauri 2 + React 19 + Tailwind v4 + shadcn/ui (new-york/zinc). 13 main pages (including Painting Mode). Dual-DB architecture (hobbyforge.db + rules.db) with hardened sync pipeline. 28 SQLite migrations (26 hobbyforge.db + 2 rules.db). 7 Rust Tauri commands. Structured backup/restore with preview + atomic swap + restart. Automatic safety backups before restore and rules sync. Progressive backup diagnostics. Transactional recipe graph save, recipe_step_id-keyed progress, centralized points resolver, Painting Mode with full-page execution view + keyboard shortcuts + 6 entry points, dashboard command center (NextPaintingAction, ReadyToPlay, DataHealthSummary), Game Day after-action loop. 1,831+ automated tests. Version parity enforcement. Auto-update via GitHub Releases.
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
| better-sqlite3 for data-layer tests (not node:sqlite) | Vitest 4.x import-stripping bug (#7177) breaks node:sqlite; better-sqlite3 is battle-tested | ✓ Good — 14 tests running reliably in CI-ready setup |
| Five-phase diff for non-destructive save | Preserves section/step IDs; avoids UPDATE complexity of row-by-row comparison | ✓ Good — clean separation (delete removed → update existing → insert new) |
| Direct assignment (not COALESCE) for nullable metadata updates | Users need to clear fields to NULL; COALESCE($N, column) prevents clearing | ✓ Good — consistent with recipe metadata pattern from v0.2.6 |
| ON DELETE SET NULL for session → section FK | Session survives section deletion; link cleared not orphaned | ✓ Good — consistent with session → recipe FK pattern |
| Dual-write (FK + denormalized text) for session sections | recipe_section_id for analytics, section_name for display after section delete | ✓ Good — follows weapon_name/detachment_name pattern |
| recipe_step_id as progress key (not order_index) | Reordering steps must not move completion markers | ✓ Excellent — identity-safe progress tracking across any recipe edit |
| Flat inline SQL for transactions (no nested BEGIN) | tauri-plugin-sql cannot nest transactions; helper delegation with own BEGIN crashes | ✓ Good — saveRecipeGraph proven stable |
| VACUUM INTO via Rust command (not JS bridge) | tauri-plugin-sql JS bridge cannot execute VACUUM INTO; Rust command bypasses this | ✓ Good — safe SQLite backup without raw file copy |
| resolveUnitPoints() pure function in src/lib/ | Single computation point for all surfaces; prevents COALESCE divergence | ✓ Good — consumed by 3 query sites |
| ReadyToPlayCard uses SQL COALESCE directly | Summary card doesn't need per-unit source labeling; resolveUnitPoints() would add complexity for no user value | — Accepted architectural divergence |
| promoted_to_reminder column vestigial | Design chose automatic promotion (all forgotten rules become reminders); column typed but never written | — Accepted tech debt; column removable if schema changes |
| Warning split: computeListWarnings vs computeUnitWarnings | List-level warnings (points exceeded, stale) in summary panel; unit-level (no points, not ready) on rows | ✓ Good — clean separation, no duplicate warnings |
| localStorage for backup status | Backup metadata (date, path) persists across sessions without SQLite schema change | ✓ Good — appropriate for single-value persistence |
| VACUUM INTO via Rust for structured backup | tauri-plugin-sql JS bridge can't execute VACUUM INTO; Rust command creates clean .zip with db + metadata.json | ✓ Good — consistent, safe backups without raw file copy |
| App restart via relaunch() after restore | tauri-plugin-sql has no reconnect API; relaunch() from @tauri-apps/plugin-process cleanly reinitializes | ✓ Good — clean restart, process plugin already permitted |
| WAL/SHM/journal sidecar cleanup before swap | SQLite sidecars must be deleted before replacing the main db file to prevent corruption | ✓ Good — atomic restore with no leftover state |
| rules.db excluded from backups | Fully regenerable via Wahapedia sync; including it doubles zip size for zero recovery value | ✓ Good — smaller backups, no information loss |
| Schema version = migration count (integer) | Counting migration files in src-tauri/migrations/ gives a reliable, monotonic version number | ✓ Good — simple comparison for schema compatibility checks |
| Two-step restore (preview then commit) | Non-destructive validation and preview before any destructive operation | ✓ Good — prevents accidental data loss from wrong backup file |
| Pre-sync safety backup aborts sync on failure | Safety backup must succeed before risking rules.db wipe; fail-fast prevents data loss | ✓ Good — defense-in-depth for the most dangerous automatic operation |
| Full-page route for Painting Mode (not Sheet/Dialog) | Painting desk needs maximum screen real estate; sidebar hidden for distraction-free focus | ✓ Good — mirrors GameDayPage pattern; clean layout route nesting |
| react-hotkeys-hook for keyboard shortcuts | 8 KB, React 19 compatible, declarative API for Space/Arrow/Escape | ✓ Good — clean input guards via enableOnFormTags: false |
| Sibling Fragment pattern for button pair | Mark Done + Done & Log Session as Fragment siblings avoids nested Sheet/Dialog issues | ✓ Good — consistent with established sibling portal pattern |
| No new migrations for Painting Mode | Entire data layer (step progress, sessions, recipe assignments) already in place from v0.2.10/v0.2.11 | ✓ Excellent — zero schema risk, pure UI milestone |
| completeStepWithSession flat inline transaction | Follows saveRecipeGraph BEGIN/COMMIT pattern; tauri-plugin-sql cannot nest transactions | ✓ Good — consistent with established transaction pattern |

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
*Last updated: 2026-05-20 — v0.2.18 milestone started*
