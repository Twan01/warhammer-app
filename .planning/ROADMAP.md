# Roadmap: HobbyForge

## Overview

HobbyForge v1 is built in five phases that follow the natural dependency chain of a local-first desktop CRUD app: foundation before data, data before UI, simple UI before complex interactions, and the Dashboard last because it aggregates everything that came before. Phase 1 wires the desktop shell and confirms irreversible plumbing decisions. Phase 2 creates the full schema and all five entity CRUDs. Phase 3 makes the collection page genuinely usable. Phase 4 delivers the painting workflow (Kanban + Recipes). Phase 5 closes the loop with the full Dashboard. Cross-cutting polish requirements (loading states, toasts, form reset, delete confirms, faction accents) are assigned to Phase 3, where forms and destructive actions first appear at scale — earlier phases add them as they build the first instances of each pattern.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: App Shell** - Tauri + React desktop app launches with sidebar, routing, SQLite plumbing, dark mode, and all shadcn components installed (completed 2026-04-30)
- [x] **Phase 2: Data Layer + Entity CRUD** - Full 10-table schema, FK enforcement, seed data, and CRUD for factions / units / paints (schema + queries + hooks + basic UI for all three) (completed 2026-04-30)
- [ ] **Phase 3: Collection Module** - Searchable, filterable unit table with detail drawer, inline status updates, progress bars, and full create/edit/delete UX including all cross-cutting polish patterns
- [ ] **Phase 4: Painting Module** - Active painting projects Kanban (status columns, card actions, mark active) plus full recipe CRUD with paint linkage and owned/missing paint indicator
- [ ] **Phase 5: Dashboard** - Full dashboard with global stat cards, faction summary cards, painting/assembly/basing percentages, active projects list, and recently updated units

## Phase Details

### Phase 1: App Shell
**Goal**: The desktop app launches, navigates, and has confirmed SQLite plumbing — every irreversible infrastructure decision is locked before any data work begins
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06, SETUP-07, SETUP-08, SETUP-09, SETUP-10, POLISH-06
**Success Criteria** (what must be TRUE):
  1. User can launch the packaged Windows binary and see a dark-mode sidebar app with no white flash on cold start
  2. User can click every sidebar entry (Dashboard, Collection, Painting Projects, Recipes, Paints, Settings) and land on a placeholder page with no navigation errors
  3. A SQLite file appears in `%APPDATA%\HobbyForge\` after first launch of the production binary (not just `tauri dev`)
  4. All shadcn/ui components needed for v1 (Table, Dialog, Sheet, Drawer, Badge, Progress, Select, Form, Command, Sonner, Card, Tabs, Combobox) are installed and importable
  5. Inserting a test row via a DB call succeeds, confirming `sql:allow-execute` capability is wired
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Tauri 2 + React 19 + TS + Vite scaffold, Tailwind v4, dark mode FOUC fix, SETUP-08 folder structure, shadcn batch install (POLISH-06)
- [x] 01-02-PLAN.md — Tauri SQL plugin wiring, capabilities (sql:allow-*), Rust setup() with create_dir_all(app_data_dir()), tauri.conf preload, getDb() singleton with FK pragma
- [x] 01-03-PLAN.md — TanStack Router 6-route tree, AppLayout + AppSidebar (collapse + localStorage persist), QueryClient (desktop defaults), 6 placeholder pages, human-verify checkpoint for SETUP-09

### Phase 2: Data Layer + Entity CRUD
**Goal**: All 10 tables exist in a single migration, FK enforcement is verified, seed data is in place, and factions / units / paints are fully CRUD-able through a typed query + hook + UI stack
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, FACT-01, FACT-02, FACT-03, FACT-04, FACT-05, UNIT-01, UNIT-02, UNIT-03, UNIT-04, UNIT-05, UNIT-06, PAINT-01, PAINT-02, SEED-01, SEED-02, SEED-03, SEED-04, SEED-05, SEED-06
**Success Criteria** (what must be TRUE):
  1. User can create, edit, and delete a faction — attempting to delete a faction that has units shows an error (FK enforcement confirmed, not silent success)
  2. User can create a unit with all required fields (faction dropdown, category combobox with free-text, all status fields, points, notes) and the unit persists after an app restart
  3. User can create and delete a paint; deleting a paint referenced by a recipe step is blocked with an error
  4. Seed data loads on first launch — four fictional factions appear in the factions list with no GW proper nouns in any shipped file
  5. The `model_instances` table does NOT exist in the schema; all other 10 tables do
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — `001_core_schema.sql` (all 10 v1 tables with FK constraints, model_instances explicitly absent), Migration version 1 wired in lib.rs via include_str!(), README SEED-06 personal-use disclaimer
- [x] 02-02-PLAN.md — Seed migrations (002 factions, 003 units/paints/recipes/recipe_paints), TypeScript types in src/types/ (PAINTING_STATUS_ORDER constant included), query modules in src/db/queries/, TanStack Query hooks in src/hooks/ (units mutations invalidate ['dashboard-stats'] for Phase 5 forward-compat)
- [x] 02-03-PLAN.md — Faction CRUD UI: /factions route + sidebar entry, FactionsPage with 4px color-theme left border per row, FactionSheet with native color picker + 24px live preview swatch, FactionDeleteDialog with FK error toast, empty/loading states (autonomous: false — includes human-verify checkpoint)
- [x] 02-04-PLAN.md — Unit two-step Sheet form with CategoryCombobox (free-text + 10 suggestions) + collapsible 'More details' section, Unit delete dialog, FactionsPage updated to list units per faction, Paints minimal CRUD page replacing the placeholder (PAINT-01/02 with FK error toast) (autonomous: false — includes human-verify checkpoint)

### Phase 3: Collection Module
**Goal**: The collection page is the primary daily-use interface — users can see, search, filter, add, edit, delete, and quickly update any unit in their collection with polish-quality UX throughout
**Depends on**: Phase 2
**Requirements**: COLL-01, COLL-02, COLL-03, COLL-04, COLL-05, COLL-06, COLL-07, COLL-08, COLL-09, COLL-10, COLL-11, COLL-12, COLL-13, POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05
**Success Criteria** (what must be TRUE):
  1. User can type in the search box and see the unit list filter live by name with no page reload
  2. User can filter by faction, painting status, and category (multi-select each) and toggle the "active project only" filter — filter state persists within the session but not across restarts
  3. User can click a unit row to open a detail drawer showing all fields, then click Edit to update any field — reopening the drawer for a different unit shows that unit's data (not the previous unit's)
  4. User can update a unit's painting status in 1-2 clicks from the collection table without opening the detail drawer
  5. User can delete a unit only after confirming a modal — the collection table updates immediately after deletion
  6. An empty state ("Add your first unit") appears with a CTA when no units match the current filter
**Plans**: TBD

Plans:
- [ ] 03-01: UnitTable with TanStack Table (columns: name, faction badge, category, status, painting_percentage progress bar, points), Zustand filter store
- [ ] 03-02: UnitFilters (search input, faction multi-select, status multi-select, category multi-select, active-project toggle), filter wire-up to useUnits hook
- [ ] 03-03: UnitDetail drawer (Sheet), full field display, quick status inline dropdown, COLL-10 mutation with dual invalidation
- [ ] 03-04: UnitForm (react-hook-form + zod, key={unit.id}, all fields, faction dropdown, category combobox), add/edit flows, delete confirm modal, empty state, loading/error/toast polish

### Phase 4: Painting Module
**Goal**: The painting workflow is complete — active projects are visible on a status-grouped Kanban board, recipes document paint schemes with step-level paint linkage, and owned/missing paints are visually distinguished
**Depends on**: Phase 3
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, PROJ-07, PROJ-08, RECIPE-01, RECIPE-02, RECIPE-03, RECIPE-04, RECIPE-05, RECIPE-06, RECIPE-07, RECIPE-08, PAINT-03, PAINT-04
**Success Criteria** (what must be TRUE):
  1. The Painting Projects page shows only units with `is_active_project = true`, grouped into columns ordered by PAINTING_STATUS_ORDER — columns appear in workflow order (Not Started → Completed), not alphabetically
  2. User can drag a Kanban card to a different column and the unit's `status_painting` updates immediately (optimistic) — if the DB write fails, the card snaps back to its original column
  3. User can mark a unit as active project from the Kanban card menu, the unit detail drawer, and the collection table — all three entry points work
  4. User can create a recipe with step fields, link it to a faction and optionally a unit, and add paints to individual recipe steps via a combobox search
  5. Recipe detail view shows a visual indicator distinguishing owned paints (green) from unowned paints (red) on each recipe step
  6. An empty state appears on the Kanban when no units are marked active ("Mark a unit as active project to see it here")
**Plans**: TBD

Plans:
- [ ] 04-01: KanbanBoard + KanbanCard components, PAINTING_STATUS_ORDER column ordering, active-project filter, card menu (mark inactive, edit status)
- [ ] 04-02: Drag-and-drop with @dnd-kit/core + @dnd-kit/sortable, optimistic mutation, rollback on error, invalidates units + dashboard-stats
- [ ] 04-03: RecipesPage (list, faction/unit filter, empty state), RecipeForm (all step fields, tutorial_link, faction/unit dropdowns, key={recipe.id})
- [ ] 04-04: RecipePaintLinker (paint combobox search by brand/name, add/remove paints per step, owned/missing visual indicator), PAINT-03/04 inline paint create inside recipe builder

### Phase 5: Dashboard
**Goal**: The dashboard answers "what do I own, what's painted, and what's ready to play" in a single view — all stat cards and faction summaries are live-computed from existing data with no new tables
**Depends on**: Phase 4
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08
**Success Criteria** (what must be TRUE):
  1. The top stat row shows correct counts for total models owned, fully-painted models, battle-ready points, and active projects count — updating a unit's painting status in the collection page causes the dashboard stats to reflect the change on next navigation
  2. Each faction has a summary card showing points owned vs painted, painted percentage, and model count — the numbers match what the collection page shows for that faction
  3. Painting completion percentage, assembly completion percentage, and basing completion percentage are each visible and correctly calculated across all units
  4. The "Current active projects" list links to unit detail and the "Recently updated" list shows the correct last 5-10 units by updated_at
  5. An empty state (pointing to Collection) appears when no factions or units have been added yet
**Plans**: TBD

Plans:
- [ ] 05-01: Dashboard stat queries (aggregation SQL in src/db/queries/dashboard.ts), useDashboardStats hook with dashboard-stats query key
- [ ] 05-02: DashboardPage layout — top stat cards (DASH-01), painting/assembly/basing percentage cards (DASH-03, DASH-04), active projects list (DASH-05), recently updated list (DASH-06)
- [ ] 05-03: Faction summary cards (DASH-02), empty state (DASH-08), verify all invalidations from Phase 3+4 mutations reach dashboard-stats key

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. App Shell | 3/3 | Complete   | 2026-04-30 |
| 2. Data Layer + Entity CRUD | 4/4 | Complete   | 2026-04-30 |
| 3. Collection Module | 0/4 | Not started | - |
| 4. Painting Module | 0/4 | Not started | - |
| 5. Dashboard | 0/3 | Not started | - |
