# HobbyForge

## Current Milestone: v1.1 — Utility Layer

**Goal:** Bring paint inventory, army list building, and unit knowledge (personal rules + strategy notes) to a usable first version — completing the "ready to play" workflow.

**Target features:**
- Paint Inventory page — dedicated UI with filters, running-low/wishlist views, and "used in recipes" back-links
- Army List Builder — create lists from collection, auto-calculate total/painted points and battle-ready %
- Unit Playbook — personal stats block (M/T/Sv/W/Ld/OC), abilities/keywords (manually entered), and strategy notes per unit

## What This Is

HobbyForge is a personal Windows desktop app for managing a Warhammer 40K hobby collection. It tracks owned units, painting progress, painting recipes, paint inventory, and simple manually-built army lists — designed to take one hobbyist from "collector/painter" to "ready-to-play".

## Core Value

A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.

## Requirements

### Validated

(None yet — ship to validate)

### Validated

<!-- v1.0: shipped Phases 1-3 and wrapping up Phase 4-5 -->

- ✓ App shell (Tauri + React + TS + SQLite, dark mode, sidebar) — Phase 1
- ✓ Full 10-table schema, FK enforcement, seed data — Phase 2
- ✓ Faction / Unit / Paint CRUD — Phase 2
- ✓ Painting recipe CRUD with step-level paint linkage — Phase 4
- ✓ Collection page: searchable, filterable table, unit detail drawer — Phase 3
- ✓ Painting Projects Kanban with dnd-kit drag-and-drop — Phase 4
- ✓ Dashboard stat cards, faction summaries, active projects list — Phase 5 (in progress)

### Active

<!-- v1.1: Paint Inventory UI + Army List Builder + Unit Playbook (stats + strategy notes) -->

- [ ] Dedicated Paint Inventory page with filters, running-low/wishlist views, used-in-recipes back-links
- [ ] Army List Builder: create lists from collection, auto-calculated points + painted readiness %
- [ ] Unit Playbook: personal stats block (M/T/Sv/W/Ld/OC) + abilities/keywords text + strategy notes per unit

### Out of Scope

<!-- Deferred beyond v1.1 -->

- Battle Logs — deferred to v1.2 or later
- Image upload, photo timelines, image gallery — deferred; no image storage in v1.1
- Backup / export / import — deferred
- Settings page — deferred
- Multi-game-system support (AoS, Horus Heresy, etc.) — 40K 10th edition only
- macOS / Linux builds — Windows-only
- Mobile companion app — desktop only
- AI features (recipe generator, battle summarizer, recommendations) — V3 territory, deferred
- Official rules, codexes, datasheets, GW point values — legal/copyright constraint, never in scope
- Competitive list optimization or rules validation — explicitly not the goal
- Real-time multiplayer / cloud sync / accounts — local-first by design

## Context

- **Personal tool** — single user (the owner), local-first, no accounts or sync
- **Domain:** Warhammer 40K 10th edition, hobby management (collecting → painting → playing)
- **User journey priority:** painter/collector → ready-to-play, *not* competitive optimization
- **Visual style:** dark slate background, faction-colored accents, rounded cards, compact tables, large painting tiles. Serious dashboard, not toy-like
- **Folder structure for app data (when implemented):** `HobbyForge/database/`, `images/`, `exports/`, `backups/`
- **Source brief:** `ROADMAP.txt` at repo root contains the original product vision and Phase 0-9 breakdown. Treat it as the long-term roadmap; only Phases 0-3 are scoped for v1.

## Constraints

- **Tech stack**: Tauri (desktop shell) + React + TypeScript + Tailwind CSS + shadcn/ui + SQLite — chosen in ROADMAP.txt for local-first desktop with modern web UI
- **ORM**: Prisma if compatible with Tauri, otherwise direct SQLite via Tauri Rust plugin or lightweight TS wrapper — fallback path documented because Prisma + Tauri integration is known to be friction-prone
- **Platform**: Windows only for v1 — matches user's dev environment, avoids cross-platform packaging work
- **Legal**: No scraping, reproducing, or distributing GW rules / codexes / datasheets / points. User manually enters all points and rules notes — non-negotiable copyright constraint
- **Local-first**: All data on local disk (SQLite + filesystem). No network calls, no cloud, no telemetry
- **Code organization**: Database access lives in `src/db/queries/*` — never scattered in UI components. Feature-folder structure under `src/features/*`

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Warhammer 40K 10th edition only for v1 | Simpler scope; multi-system can be added later if real need emerges | — Pending |
| Minimal MVP cut: Phases 0-3 only | Lock in collection + painting workflow before sprawling into army lists / battle logs | — Pending |
| Windows-only for v1 | Matches dev environment; avoids cross-platform packaging overhead | — Pending |
| Tauri over Electron | Smaller binary, native feel, Rust backend — recommended in source roadmap | — Pending |
| Prisma with SQLite fallback path | Prisma DX is great but Tauri integration is friction-prone; pre-commit to a fallback | — Pending |
| Local-first SQLite (no cloud, no accounts) | Personal tool, single user, privacy + offline by default | — Pending |
| Dark-mode-first UI | "Serious hobby command center" feel from source roadmap | — Pending |

---
*Last updated: 2026-05-01 after v1.1 milestone initialization*
