# Requirements: HobbyForge

**Defined:** 2026-04-30
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.

## v1 Requirements

Requirements for the Minimal MVP (Phases 0-3 from ROADMAP.txt + Full Dashboard). Each maps to a roadmap phase.

### Setup (App Shell)

- [x] **SETUP-01**: Tauri 2.x + React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui CLI v4 project scaffolds and launches as a Windows desktop app
- [x] **SETUP-02**: Sidebar navigation with entries for Dashboard, Collection, Painting Projects, Recipes, Paints, Settings (Settings can be a placeholder)
- [x] **SETUP-03**: TanStack Router wires sidebar entries to placeholder routes; navigation works
- [x] **SETUP-04**: Dark-mode-first styling with no FOUC on cold start (inline `<script>document.documentElement.classList.add('dark')</script>` in `index.html` before stylesheet)
- [x] **SETUP-05**: TanStack Query client configured with desktop defaults (staleTime 5min, gcTime 10min, refetchOnWindowFocus false)
- [x] **SETUP-06**: Tauri capabilities grant `sql:allow-load`, `sql:allow-select`, `sql:allow-execute`, `sql:allow-close` in `src-tauri/capabilities/default.json`
- [x] **SETUP-07**: Rust `setup()` calls `create_dir_all(app_data_dir())` before `tauri-plugin-sql` initializes
- [x] **SETUP-08**: Folder structure matches ROADMAP section 9.2 (`src/app`, `src/components/{ui,common,forms}`, `src/features/*`, `src/db/{client,queries}`, `src/types`, `src/utils`, `src/styles`)
- [x] **SETUP-09**: Production binary writes its SQLite file to `%APPDATA%\HobbyForge\` (verified by running the packaged build, not just `tauri dev`)
- [x] **SETUP-10**: `tauri.conf.json` has `plugins.sql.preload` entry so migrations complete before UI renders

### Database (Schema, Plumbing, Migrations)

- [x] **DATA-01**: `src/db/client.ts` exports a `getDb()` singleton that calls `Database.load('sqlite:hobbyforge.db')` once
- [x] **DATA-02**: `getDb()` runs `PRAGMA foreign_keys = ON` immediately after first load — verified by deleting a faction with units and observing an error (not silent success)
- [x] **DATA-03**: All 10 tables created in a single first migration (`001_core_schema.sql`): factions, units, paints, painting_recipes, recipe_paints, army_lists, army_list_units, unit_strategy_notes, battle_logs, image_assets — even though only 5 get UI in v1
- [x] **DATA-04**: `model_instances` table is NOT created (deferred indefinitely)
- [x] **DATA-05**: Migrations are append-only, numbered, and managed by `tauri-plugin-sql`'s built-in `_sqlx_migrations` runner; SQL files live under `src-tauri/migrations/` and are loaded via `include_str!()`
- [x] **DATA-06**: TypeScript types for every entity live in `src/types/` and stay in sync with the SQL schema
- [x] **DATA-07**: Each entity has a query module under `src/db/queries/<entity>.ts` (factions, units, paints, recipes, recipePaints) — no DB calls anywhere outside this folder
- [x] **DATA-08**: Each entity has a TanStack Query hooks module under `src/hooks/use<Entity>.ts` — components only call hooks, never query functions directly
- [x] **DATA-09**: Mutations invalidate the right query keys (e.g., updating a unit invalidates units list AND any dashboard-stats query)

### Factions

- [x] **FACT-01**: User can create a faction with name, game_system (default "Warhammer 40K"), description, color_theme (hex string), icon_path
- [x] **FACT-02**: User can edit any faction field
- [x] **FACT-03**: User can delete a faction; FK constraint blocks deletion if any unit still references it
- [x] **FACT-04**: User can list all factions
- [x] **FACT-05**: Faction `color_theme` is applied as a visible accent (sidebar badge, card border, or similar) for that faction's units and recipes

### Units / Collection Schema

- [x] **UNIT-01**: User can create a unit with: faction (required), name, category (free-text VARCHAR with combobox suggestions: HQ/Leader, Battleline, Infantry, Elite, Vehicle, Monster, Transport, Character, Dedicated Transport, Other), unit_type, model_count, owned_count, points (manual)
- [x] **UNIT-02**: Unit status fields stored separately: status_assembly (boolean), status_painting (enum: Not Started, Built, Primed, Basecoated, Shaded, Layered, Highlighted, Details Done, Based, Varnished, Completed), painting_percentage (0-100), status_basing (boolean), status_varnished (boolean), is_active_project (boolean), priority (integer or enum), target_completion_date
- [x] **UNIT-03**: Unit also stores: purchase_date, purchase_price, storage_location, main_image_path (string only — no upload UI in v1), notes
- [x] **UNIT-04**: User can edit any unit field
- [x] **UNIT-05**: User can delete a unit (with confirmation modal)
- [x] **UNIT-06**: A `PAINTING_STATUS_ORDER` constant defined in `src/types/` drives Kanban column ordering and progress mapping (not alphabetical)

### Collection Page (Phase 2 UI)

- [x] **COLL-01**: Collection page shows units in a sortable, paginated table OR card grid view
- [x] **COLL-02**: Search by unit name (live filter)
- [x] **COLL-03**: Filter by faction (multi-select)
- [x] **COLL-04**: Filter by painting status (multi-select)
- [x] **COLL-05**: Filter by category (multi-select)
- [x] **COLL-06**: Filter "active project only" toggle
- [x] **COLL-07**: Filter state lives in Zustand (ephemeral; not persisted to URL in v1)
- [x] **COLL-08**: "Add unit" button opens a form (sheet/dialog) with all required fields + faction dropdown
- [x] **COLL-09**: Clicking a unit row opens a detail drawer with full info, status fields, and quick-edit
- [x] **COLL-10**: Quick status update from the table — inline dropdown changes painting_status in 1-2 clicks; mutation invalidates units + dashboard stats
- [x] **COLL-11**: Per-unit progress bar visible in table (driven by painting_percentage)
- [x] **COLL-12**: Empty state when no units exist ("Add your first unit" with CTA)
- [x] **COLL-13**: Delete unit confirms via a modal before destructive action

### Paints (Schema + CRUD; UI lives inside recipe builder)

- [x] **PAINT-01**: User can create a paint with: brand, name, paint_type (Primer, Base, Layer, Contrast, Shade, Technical, Dry, Air, Metallic, Ink, Oil, Enamel, Pigment, Other), color_family, hex_color (optional), owned (bool), quantity, running_low (bool), wishlist (bool), notes
- [x] **PAINT-02**: User can edit and delete paints; FK from `recipe_paints` blocks delete if paint is referenced by any recipe step
- [x] **PAINT-03**: Paint create/edit happens inline inside the recipe builder (no standalone Paint Inventory page in v1 — that's Phase 4)
- [x] **PAINT-04**: Paint search/picker (combobox) used inside recipe builder filters by brand and name as you type

### Painting Recipes

- [x] **RECIPE-01**: User can create a recipe with: name, faction (optional), unit (optional), area (free-text — armor, weapon, skin, cloth, lens, metal, base, etc.)
- [x] **RECIPE-02**: Recipe step fields: primer, basecoat, shade, layer, highlight, glaze/filter, weathering, technical, basing — all free-text per stage
- [x] **RECIPE-03**: Recipe stores notes, tutorial_link (URL — renders as clickable link)
- [x] **RECIPE-04**: User can edit and delete recipes
- [x] **RECIPE-05**: User can attach paints to recipe steps via the `recipe_paints` join table — each link captures step_name, order_index, optional notes
- [x] **RECIPE-06**: Recipe detail view shows owned/missing paints visually (e.g., red badge for unowned, green for owned)
- [x] **RECIPE-07**: User can list/filter recipes by faction or unit
- [x] **RECIPE-08**: Empty state for "no recipes yet" with CTA

### Painting Projects (Kanban — Phase 3)

- [x] **PROJ-01**: Painting Projects page shows ONLY units where `is_active_project = true`
- [x] **PROJ-02**: Cards grouped into columns by `status_painting`, ordered by `PAINTING_STATUS_ORDER` constant
- [x] **PROJ-03**: Each Kanban card shows unit name, faction (with color accent), painting_percentage progress bar, priority, target_completion_date if set
- [x] **PROJ-04**: User can drag a card between columns to update `status_painting`; uses @dnd-kit/core + @dnd-kit/sortable; reference pattern: Georgegriff/react-dnd-kit-tailwind-shadcn-ui
- [x] **PROJ-05**: Drag-drop mutation is optimistic (UI updates immediately; rollback on DB error) and invalidates units + dashboard stats
- [x] **PROJ-06**: User can mark/unmark a unit as active project from anywhere (Kanban card menu, unit detail drawer, collection table)
- [x] **PROJ-07**: Sortable cards within a column by priority then target_completion_date
- [x] **PROJ-08**: Empty state when no active projects ("Mark a unit as active project to see it here")

### Dashboard (Full per ROADMAP section 3.1 / 6.2)

- [x] **DASH-01**: Top row stat cards: total models owned, fully-painted models, battle-ready points, active projects count
- [x] **DASH-02**: Faction summary cards — one per faction, showing points owned vs points painted, painted percentage, model count
- [x] **DASH-03**: Painting completion percentage (overall, across all units, by points)
- [x] **DASH-04**: Assembly completion percentage and basing completion percentage cards
- [x] **DASH-05**: Current active painting projects list (links to unit detail)
- [x] **DASH-06**: Recently updated units list (last 5-10 by `updated_at`)
- [x] **DASH-07**: All dashboard data sources from existing queries (units, factions, recipes) — no new tables; cache via TanStack Query
- [x] **DASH-08**: Empty state when no factions/units exist (point to Collection page)

### Seed Data

- [x] **SEED-01**: Seed migration ships factions: Tau Empire, Ultramarines, Necrons, Tyranids (real GW names — personal/local use, README disclaimer)
- [x] **SEED-02**: Seed migration ships sample units: Tau Fire Warriors, Crisis Battlesuits, Commander in Battlesuit, Necron Warriors, Ultramarines Intercessors
- [x] **SEED-03**: Seed migration ships sample paints: Citadel Abaddon Black, Citadel White Scar, Citadel Nuln Oil, Citadel Leadbelcher, Citadel Macragge Blue, Citadel Retributor Armour
- [x] **SEED-04**: Seed migration ships sample recipes: Tau White Armor, Ultramarines Blue Armor, Necron Ancient Metal — with paint linkages
- [x] **SEED-05**: Seed uses `INSERT OR IGNORE` with stable IDs for idempotency
- [x] **SEED-06**: README documents the personal-use, no-redistribution disclaimer for the GW-named seed data

### Cross-cutting Polish

- [x] **POLISH-01**: Delete confirmations on all destructive actions (factions, units, paints, recipes)
- [x] **POLISH-02**: Loading states (spinners or skeletons) on all data-fetching components
- [x] **POLISH-03**: Error states surfaced via toast (shadcn sonner) when mutations fail
- [x] **POLISH-04**: Forms reset between edit sessions via `key={entity.id}` to prevent stale state
- [x] **POLISH-05**: Visible faction-color accent in cards/sidebar tied to `faction.color_theme`
- [x] **POLISH-06**: All shadcn components installed in one batch session in Phase 0 (Table, Dialog, Sheet, Drawer, Badge, Progress, Select, Form, Command, Sonner, Card, Tabs, Combobox)

## v2 Requirements

Deferred to next milestone. Tracked but not in current roadmap.

### Paint Inventory (Phase 4)

- **PINV-01**: Dedicated Paint Inventory page with filterable table (brand, type, color family)
- **PINV-02**: Running-low view (filter `running_low = true`)
- **PINV-03**: Wishlist view (filter `wishlist = true`)
- **PINV-04**: "Used in recipes" back-link per paint
- **PINV-05**: Pagination (50/page default)

### Army List Builder (Phase 5)

- **ARMY-01**: Create/edit/delete army lists
- **ARMY-02**: Add units from collection with manual points or override
- **ARMY-03**: Auto-calculated total points, painted points, painted-readiness percentage
- **ARMY-04**: List type tags (Casual, Learning, Narrative, Competitive, Test)
- **ARMY-05**: Notes per list and per unit-in-list
- **ARMY-06**: "Battle ready" status indicator

### Strategy Notes (Phase 6)

- **STRAT-01**: Per-unit strategy notes integrated into unit detail
- **STRAT-02**: Fields: battlefield_role, strengths, weaknesses, best_targets, synergies, mistakes_to_avoid, rules_references, notes
- **STRAT-03**: List-level strategy notes

### Battle Logs (Phase 7)

- **BTL-01**: Create/edit/delete battle logs
- **BTL-02**: Link battle log to army list
- **BTL-03**: Track date, opponent, opponent_faction, mission, points_played, result, scores
- **BTL-04**: MVP unit and underperforming unit references
- **BTL-05**: Lessons learned and changes-next-time fields
- **BTL-06**: Basic analytics: win/loss/draw, most-used list, frequent MVPs

### Images (Phase 8)

- **IMG-01**: Local image storage via `@tauri-apps/plugin-fs`
- **IMG-02**: Image upload/selection for units and recipes
- **IMG-03**: Progress photo gallery per unit
- **IMG-04**: Captions and dates on images
- **IMG-05**: Thumbnail generation

### Backup / Settings (Phase 9)

- **BAK-01**: JSON export of full database
- **BAK-02**: JSON import (with conflict resolution)
- **BAK-03**: Database backup button
- **BAK-04**: Image folder backup guidance
- **BAK-05**: Settings page (theme, app data folder, etc.)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Official GW rules, codexes, datasheets, point values | Hard legal constraint — GW copyright. User manually enters all points and rules notes |
| Rules validation / legal-list-building / detachment rules | Requires copyrighted data; wrong scope (HobbyForge is hobby tracking, not competitive tool) |
| Cloud sync / accounts / multi-device | Contradicts local-first design; adds auth surface and server liability |
| Social features / public profiles / community sharing | Personal-tool scope; out of scope |
| AI recipe generator / "what to paint next" engine | V3 territory; ship functional basics first |
| Barcode scanning for paints | Disproportionate complexity vs manual entry for v1 |
| Cross-brand paint equivalents (curated DB) | Significant ongoing data work; not core |
| Mobile companion app | Desktop-only for v1 |
| macOS / Linux builds | Windows-only for v1 |
| Multi-game-system support (AoS, Horus Heresy, etc.) | 40K 10th edition only in v1 — `game_system` field exists for forward compatibility |
| Hobby calendar / streaks / gamification | Complexity without core-value payoff |
| Import from BattleScribe / New Recruit | .ros format contains GW data — IP risk; brittle format |
| Tournament organization | Wrong audience |
| `model_instances` table (per-individual-model tracking) | Premature; unit-level tracking is sufficient for v1 |
| Prisma ORM | Confirmed dead-end inside Tauri WebView (production build freezes); `tauri-plugin-sql` directly is the chosen path |
| Drizzle ORM at runtime | Adds proxy + migration runner complexity for no v1 win; raw typed query functions are correct for v1. Drizzle is a v2 escape hatch only |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Complete |
| SETUP-02 | Phase 1 | Complete |
| SETUP-03 | Phase 1 | Complete |
| SETUP-04 | Phase 1 | Complete |
| SETUP-05 | Phase 1 | Complete |
| SETUP-06 | Phase 1 | Complete |
| SETUP-07 | Phase 1 | Complete |
| SETUP-08 | Phase 1 | Complete |
| SETUP-09 | Phase 1 | Complete |
| SETUP-10 | Phase 1 | Complete |
| POLISH-06 | Phase 1 | Complete |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 | Complete |
| DATA-04 | Phase 2 | Complete |
| DATA-05 | Phase 2 | Complete |
| DATA-06 | Phase 2 | Complete |
| DATA-07 | Phase 2 | Complete |
| DATA-08 | Phase 2 | Complete |
| DATA-09 | Phase 2 | Complete |
| FACT-01 | Phase 2 | Complete |
| FACT-02 | Phase 2 | Complete |
| FACT-03 | Phase 2 | Complete |
| FACT-04 | Phase 2 | Complete |
| FACT-05 | Phase 2 | Complete |
| UNIT-01 | Phase 2 | Complete |
| UNIT-02 | Phase 2 | Complete |
| UNIT-03 | Phase 2 | Complete |
| UNIT-04 | Phase 2 | Complete |
| UNIT-05 | Phase 2 | Complete |
| UNIT-06 | Phase 2 | Complete |
| PAINT-01 | Phase 2 | Complete |
| PAINT-02 | Phase 2 | Complete |
| SEED-01 | Phase 2 | Complete |
| SEED-02 | Phase 2 | Complete |
| SEED-03 | Phase 2 | Complete |
| SEED-04 | Phase 2 | Complete |
| SEED-05 | Phase 2 | Complete |
| SEED-06 | Phase 2 | Complete |
| COLL-01 | Phase 3 | Complete |
| COLL-02 | Phase 3 | Complete |
| COLL-03 | Phase 3 | Complete |
| COLL-04 | Phase 3 | Complete |
| COLL-05 | Phase 3 | Complete |
| COLL-06 | Phase 3 | Complete |
| COLL-07 | Phase 3 | Complete |
| COLL-08 | Phase 3 | Complete |
| COLL-09 | Phase 3 | Complete |
| COLL-10 | Phase 3 | Complete |
| COLL-11 | Phase 3 | Complete |
| COLL-12 | Phase 3 | Complete |
| COLL-13 | Phase 3 | Complete |
| POLISH-01 | Phase 3 | Complete |
| POLISH-02 | Phase 3 | Complete |
| POLISH-03 | Phase 3 | Complete |
| POLISH-04 | Phase 3 | Complete |
| POLISH-05 | Phase 3 | Complete |
| PROJ-01 | Phase 4 | Complete |
| PROJ-02 | Phase 4 | Complete |
| PROJ-03 | Phase 4 | Complete |
| PROJ-04 | Phase 4 | Complete |
| PROJ-05 | Phase 4 | Complete |
| PROJ-06 | Phase 4 | Complete |
| PROJ-07 | Phase 4 | Complete |
| PROJ-08 | Phase 4 | Complete |
| RECIPE-01 | Phase 4 | Complete |
| RECIPE-02 | Phase 4 | Complete |
| RECIPE-03 | Phase 4 | Complete |
| RECIPE-04 | Phase 4 | Complete |
| RECIPE-05 | Phase 4 | Complete |
| RECIPE-06 | Phase 4 | Complete |
| RECIPE-07 | Phase 4 | Complete |
| RECIPE-08 | Phase 4 | Complete |
| PAINT-03 | Phase 4 | Complete |
| PAINT-04 | Phase 4 | Complete |
| DASH-01 | Phase 5 | Complete |
| DASH-02 | Phase 5 | Complete |
| DASH-03 | Phase 5 | Complete |
| DASH-04 | Phase 5 | Complete |
| DASH-05 | Phase 5 | Complete |
| DASH-06 | Phase 5 | Complete |
| DASH-07 | Phase 5 | Complete |
| DASH-08 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 83 total (note: header originally said 64 — actual count from file is 83)
- Mapped to phases: 83
- Unmapped: 0

---
*Requirements defined: 2026-04-30*
*Last updated: 2026-04-30 — traceability populated by roadmap creation*
