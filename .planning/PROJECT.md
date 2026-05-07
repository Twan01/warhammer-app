# HobbyForge

## What This Is

HobbyForge is a personal Windows desktop app for managing a Warhammer 40K hobby collection. It tracks owned units, painting progress, structured painting recipes, army lists, battle logs, spending, and a premium live dashboard answering "what do I own, what's painted, and what's ready to play" — all without ever depending on copyrighted GW data.

Shipped through v2.5 (41 phases): full hobby command center with collection management, painting workflow (Kanban + structured step-by-step recipes with paint availability), army list builder, battle log, spending tracker, hobby goals, Wahapedia datasheet integration, photo journal, session-recipe linking, and a premium CSS grid dashboard with photo-rich panels, army readiness tracking, and visual polish.

## Core Value

A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.

## Requirements

### Validated

*All v1.1 requirements verified and shipped 2026-05-01*

- ✓ App shell (Tauri 2 + React 19 + TS + SQLite, dark mode, sidebar, TanStack Router/Query) — Phase 1 — v1.1
- ✓ Full 10-table schema, FK enforcement, seed data (4 factions, 5 units, 6 paints, 3 recipes) — Phase 2 — v1.1
- ✓ Faction / Unit / Paint CRUD with typed query → hook → UI stack — Phase 2 — v1.1
- ✓ Collection page: searchable, filterable table, optimistic status updates, detail Sheet — Phase 3 — v1.1
- ✓ Painting Projects Kanban with dnd-kit drag-and-drop and optimistic rollback — Phase 4 — v1.1
- ✓ Painting recipe CRUD with step-level paint linkage and owned/missing indicator — Phase 4 — v1.1
- ✓ Dashboard stat cards, faction summaries, active projects list, recently updated — Phase 5 — v1.1

*All v2.0 requirements verified and shipped 2026-05-03*

- ✓ Schema migration 004 — 8 nullable columns on unit_strategy_notes; typed query/hook modules for army lists, strategy notes, and paint recipes — Phase 6 — v2.0
- ✓ Paint Inventory page at /paints: brand/type/color-family filters, running-low/wishlist presets, recipe badge navigation, inline owned toggle — Phase 7 — v2.0
- ✓ Army List Builder: create/edit/delete lists, add/remove units, COALESCE-in-SQL points, battle-ready %, per-unit notes, army-list membership pre-check on unit delete — Phase 8 — v2.0
- ✓ Unit Playbook tab: stats block (M/T/Sv/W/Ld/OC), abilities, keywords, 8 strategy notes, dirty-state Save with toasts — Phase 9 — v2.0

*All v2.1 requirements verified and shipped 2026-05-04*

- ✓ Faction Dynamic Theming — UI accent colors shift per selected faction across the entire app — Phase 10 — v2.1
- ✓ Collapsible Icon Sidebar — icon-only mode with tooltip polish, persisted state — Phase 10 — v2.1
- ✓ Dashboard Command Center — animated stat counters, faction-accented summary cards — Phase 11 — v2.1
- ✓ Collection Gallery View — card grid with painting-status ring as alternate to table — Phase 12 — v2.1
- ✓ Hobby Journal — per-unit photo timeline + painting session log with time tracking — Phase 13 — v2.1
- ✓ Spending Tracker — cost per unit and paint, per-faction and total spend views — Phase 14 — v2.1
- ✓ 40K Datasheet Integration — auto-populate unit stats/abilities/keywords from community data — Phase 15 — v2.1
- ✓ Design Overhaul — typography, spacing, layouts, empty states, and overall UI polish — Phase 16 — v2.1

*All v2.2 requirements verified and shipped 2026-05-05*

- ✓ Schema Foundation + Enrichment — lore_notes and undercoat on units, lore_notes on factions, purchase_date on paints, dates.ts timezone-safe utility — Phase 17 — v2.2
- ✓ Battle Log — CRUD page with opponent faction, mission, result, army list linkage, notes, chronological list — Phase 18 — v2.2
- ✓ Analytics Core — hobby velocity, painting streak on Dashboard, monthly spend trend chart — Phase 19 — v2.2
- ✓ Hobby Goals — create goals with target dates, track progress via painting sessions, dashboard goal card — Phase 21 — v2.2
- ✓ Hobby Goals Polish — goal filtering, completion celebrations, streak integration with goals — Phase 22 — v2.2
- ✓ Display Features — Battle Ready collection filter preset, unit showcase mode with photo display — Phase 23 — v2.2
- ✓ Unit Point Calculator — per-model-count point tiers, wargear loadout selection, delta preview badge in army lists — Phase 24 — v2.2
- ✓ Gap Closure — timezone-safe date import, cache invalidation symmetry (delete→goal-progress, update→army-lists), purchase_date form field wiring — Phase 35 — v2.2

*All v2.3 requirements verified and shipped 2026-05-05*

- ✓ Design Foundation — unified design tokens (Forge Black, Gunmetal, Panel Elevated, Battle Gold), shared PageHeader, enriched MetricCard, StatusBadge — Phase 25 — v2.3
- ✓ Dashboard Redesign — "Hobby Command Center" header, CurrentFocusCard, HobbyPipeline, upgraded FactionSummaryCard, Recent Activity feed, LogSessionSheet — Phase 26 — v2.3
- ✓ Navigation & Quick Add — hobby-native sidebar groups (Command/Workshop/Play/Management), Quick Add dropdown with 8 actions, Sheet-overlay flows — Phase 27 — v2.3
- ✓ Collection visual upgrade — photo thumbnails on gallery cards, unified StatusBadge across table and gallery — Phase 28 — v2.3
- ✓ Projects enrichment — last-updated, recipe link, photo count, next-action hint per kanban card; Log Session shortcut — Phase 28 — v2.3
- ✓ Workshop improvements — color swatches on paint rows, paint swatch strip on recipe cards — Phase 29 — v2.3
- ✓ Play Layer improvements — Army List readiness panel with progress bar, Battle Log live readiness points — Phase 29 — v2.3

*All v2.4 requirements verified and shipped 2026-05-06*

- ✓ Dashboard CSS grid bento layout (asymmetric 2-column, responsive stacking) — Phase 30 — v2.4
- ✓ Clickable StatCards navigating to relevant pages — Phase 30 — v2.4
- ✓ 5-bucket pipeline (Not Started / Assembly / Painting / Finishing / Done) — Phase 30 — v2.4
- ✓ CurrentFocusCard v2 (photo thumbnail, metadata, action buttons) — Phase 31 — v2.4
- ✓ ActiveProjectsPanel (top 5 with photos, progress, quick actions) — Phase 31 — v2.4
- ✓ UnitThumbnail shared component with consistent faction-colored fallback — Phase 31 — v2.4
- ✓ ArmyReadinessCard with target selector (500/1000/1500/2000) and per-faction progress bars — Phase 32 — v2.4
- ✓ LogSession painting status updates with 3-cache invalidation — Phase 33 — v2.4
- ✓ Spending intelligence (cost per completed model, painted vs unpainted value) — Phase 33 — v2.4
- ✓ Recipe-unit bidirectional navigation and CurrentFocusCard recipe name display — Phase 33 — v2.4
- ✓ FactionSummaryCard v2 (accent band, active glow ring) — Phase 34 — v2.4
- ✓ Hero radial gradient + hover shadow hierarchy on all dashboard cards — Phase 34 — v2.4

*All v2.5 requirements verified and shipped 2026-05-07*

- ✓ Schema foundation: recipe_paints → recipe_steps migration with zero data loss, 6 recipe metadata columns, cache fix, batch step count — Phases 37 — v2.5
- ✓ Structured step input: painting phase, tool, technique, dilution, time per step, drag-and-drop reorder — Phase 38 — v2.5
- ✓ Studio UX: card grid with paint availability badges, step timeline detail view, 4-dimension filtering — Phase 39 — v2.5
- ✓ Recipe actions: duplication, per-step photos, substitute paint linking, bulk wishlist add — Phase 40 — v2.5
- ✓ Session-recipe integration: recipe/step selectors in LogSessionSheet, session history in recipe detail — Phase 41 — v2.5

### Active

## Current Milestone: v2.6 Rules Sync 2.0 / Rules Data Hub

**Goal:** Stabilize and extend the local rules import architecture so HobbyForge becomes a reliable personal rules and points reference.

**Target features:**
- Architecture audit of current sync pipeline (TypeScript useRulesSync vs Rust bulk_sync_rules)
- Extended rules schema: wargear, shared abilities, stratagems, detachments, detachment abilities
- Sync pipeline extension for new CSV data types
- Sync metadata and import tracking (source registry, freshness, error logs)
- Manual overrides for points/stats/keywords that persist across re-syncs
- Version comparison showing what changed after a re-sync

### Out of Scope

- Wishlist (user-curated buy lists with price tracking) — feature distinct from Hobby Goals; deferred
- Image upload, photo timelines, image gallery — deferred in v2.0; now in scope for v2.1 Hobby Journal
- Backup / export / import — deferred
- Settings page — deferred
- Multi-game-system support (AoS, Horus Heresy, etc.) — 40K 10th edition only
- macOS / Linux builds — Windows-only
- Mobile companion app — desktop only
- AI features (recipe generator, battle summarizer, recommendations) — deferred
- Official rules, codexes, datasheets, GW point values — legal/copyright constraint, never in scope
- Competitive list optimization or rules validation — explicitly not the goal
- Real-time multiplayer / cloud sync / accounts — local-first by design

## Context

- **Current state:** v2.5 shipped. ~240 TypeScript source files. ~900 automated tests passing. Tauri 2 + React 19 + Tailwind v4 + shadcn/ui (new-york/zinc). 9 main pages (Dashboard, Collection, Projects, Recipes, Paints, Army Lists, Battle Log, Spending, Factions). Recipes transformed into structured painting knowledge system: step-by-step workflows with phase/tool/technique/dilution/time, card grid studio with paint availability badges, timeline detail view, recipe duplication, per-step photos, substitute paints, bulk wishlist add, and session-recipe linking. 14 SQLite migrations, 3 new in v2.5 (012/013/014).
- **Personal tool** — single user (the owner), local-first, no accounts or sync
- **Domain:** Warhammer 40K 10th edition, hobby management (collecting → painting → playing)
- **User journey priority:** painter/collector → ready-to-play, *not* competitive optimization
- **Visual style:** dark slate background, faction-colored accents, rounded cards, compact tables. Serious dashboard, not toy-like.

## Constraints

- **Tech stack**: Tauri 2 (desktop shell) + React 19 + TypeScript + Tailwind v4 CSS + shadcn/ui + SQLite — chosen for local-first desktop with modern web UI
- **ORM**: `tauri-plugin-sql` directly (no ORM). Prisma confirmed dead-end in Tauri production builds. Drizzle is a v3 escape hatch only if raw typed queries become unmanageable.
- **Platform**: Windows only for v2.0 — matches user's dev environment
- **Legal**: No scraping, reproducing, or distributing GW rules / codexes / datasheets / points. User manually enters all points and rules notes — non-negotiable copyright constraint
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
| Windows-only for v2.0 | Matches dev environment; avoids cross-platform packaging overhead | ✓ Good — no issues in Phases 6–9 |
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

---
*Last updated: 2026-05-07 after v2.6 milestone start*
