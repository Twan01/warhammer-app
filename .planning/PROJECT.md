# HobbyForge

## Current Milestone: v2.1 — Visual Command

**Goal:** Transform HobbyForge's visual identity with faction-aware dynamic theming, a redesigned command-center dashboard, collapsible sidebar, and collection gallery view — plus two new personal tracking features: a per-unit Hobby Journal (photo timeline + session log) and a Spending Tracker.

**Target features:**
- Faction Dynamic Theming — accent colors shift per selected faction across the entire UI
- Dashboard as Command Center — hero stats, animated counters, faction banners, war-room redesign
- Collapsible Icon Sidebar — collapse to icons for more content space
- Collection Gallery View — card grid with painting-status ring alongside existing table view
- Hobby Journal — photo timeline per unit + painting session log with time tracking
- Spending Tracker — log cost per unit and paint, see per-faction and total spend

*v2.0 shipped 2026-05-03 — all 4 phases (Foundation, Paint Inventory, Army List Builder, Unit Playbook) complete.*

---

## What This Is

HobbyForge is a personal Windows desktop app for managing a Warhammer 40K hobby collection. It tracks owned units, painting progress, painting recipes, and a live dashboard answering "what do I own, what's painted, and what's ready to play" — all without ever depending on copyrighted GW data.

Shipped in v1.1 (Phases 1–5): the full hobby command center covering collection management, painting workflow (Kanban + recipes), and a live stats dashboard.

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

### Active

*v2.1 target features (Phases 10–14)*

- [ ] Faction Dynamic Theming — UI accent colors shift per selected faction across the entire app
- [ ] Dashboard as Command Center — hero stats, animated counters, faction banners
- [ ] Collapsible Icon Sidebar — icon-only mode for more content space
- [ ] Collection Gallery View — card grid with painting-status ring as alternate to table
- [ ] Hobby Journal — per-unit photo timeline + painting session log with time tracking
- [ ] Spending Tracker — cost per unit and paint, per-faction and total spend views

### Out of Scope

- Battle Logs — deferred to v2.1 or later
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

- **Current state:** v2.0 shipped. ~14,000+ TypeScript source lines. 212 tests passing. Tauri 2 + React 19 + Tailwind v4 + shadcn/ui (new-york/zinc). All 10 DB tables live + 8 additional strategy-note columns. Paint Inventory, Army Lists, and Unit Playbook all live. Phase 10 Theming Foundation in progress.
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

---
*Last updated: 2026-05-02 after v2.1 milestone start*
