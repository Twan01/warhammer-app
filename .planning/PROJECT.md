# HobbyForge

## What This Is

HobbyForge is a personal Windows desktop app for managing a Warhammer 40K hobby collection. It tracks owned units, painting progress, painting recipes, paint inventory, and simple manually-built army lists — designed to take one hobbyist from "collector/painter" to "ready-to-play".

## Core Value

A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.

## Requirements

### Validated

(None yet — ship to validate)

### Active

<!-- Minimal MVP cut: Phases 0-3 from ROADMAP.txt. Strategy notes, battle logs, images, backup, full army lists deferred to later milestones. -->

- [ ] App shell: Tauri + React + TypeScript desktop app launches on Windows with sidebar navigation and placeholder pages
- [ ] Local SQLite database with schema for factions, units, paints, painting_recipes, recipe_paints
- [ ] Faction CRUD: create / edit / delete / list factions
- [ ] Unit CRUD: create / edit / delete / list units with all collection fields (faction, category, model count, status fields, points, purchase info, notes)
- [ ] Paint CRUD: create / edit / delete / list paints with brand, type, color family, owned/running-low/wishlist flags
- [ ] Painting recipe CRUD: create / edit / delete / list recipes with steps and faction/unit linkage
- [ ] Recipe-paint linkage via join table (paints used per recipe step)
- [ ] Collection page: searchable, filterable table/grid of units (faction, category, painting status, active project)
- [ ] Unit detail view with status progress and quick status update
- [ ] Painting Projects page: Kanban view by painting status, showing only active projects
- [ ] Painting status updates (move units between stages)
- [ ] Manual painting percentage and active-project flag per unit
- [ ] Seed data: Tau Empire / Ultramarines / Necrons / Tyranids factions plus sample units, paints, recipes
- [ ] Data persists across app restarts
- [ ] Dark-mode-first UI consistent with "personal command center" feel (cards, tags, status indicators, progress bars)

### Out of Scope

<!-- Cut from v1 to keep MVP focused. Listed in ROADMAP.txt phases 4-9 and beyond. -->

- Paint Inventory page (deferred to next milestone — Phase 4 in ROADMAP) — paint CRUD exists but no dedicated inventory UI
- Army List Builder (deferred to next milestone — Phase 5 in ROADMAP) — schema may be present but UI deferred
- Strategy / unit tactical notes UI (Phase 6) — deferred
- Battle logs (Phase 7) — deferred
- Image upload, photo timelines, image gallery (Phase 8) — deferred; no image storage in v1
- Backup / export / import (Phase 9) — deferred
- Settings page (Phase 9) — deferred
- Multi-game-system support (AoS, Horus Heresy, etc.) — 40K 10th edition only in v1
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
*Last updated: 2026-04-30 after initialization*
