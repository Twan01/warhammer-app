# Roadmap: HobbyForge

## Milestones

- ✅ **v1.1 HobbyForge MVP** — Phases 1–5 (shipped 2024-05-01)
- ✅ **v2.0 Utility Layer** — Phases 6–9 (shipped 2024-05-03)
- ✅ **v2.1 Visual Command** — Phases 10–16 + 20 (shipped 2026-05-04)
- ✅ **v2.2 Full Circle** — Phases 17–19, 21–24, 35 (shipped 2026-05-05)
- ✅ **v2.3 Hobby Command Center** — Phases 25–29 (shipped 2026-05-05)
- ✅ **v2.4 Premium Dashboard UX & Visual Polish** — Phases 30–34, 36 (shipped 2026-05-06)
- ✅ **v2.5 Recipes 2.0 / Painting Studio** — Phases 37–41 (shipped 2026-05-07)
- 🚧 **v2.6 Rules Sync 2.0 / Rules Data Hub** — Phases 42–46 (in progress)

## Phases

<details>
<summary>✅ v1.1 HobbyForge MVP (Phases 1–5) — SHIPPED 2024-05-01</summary>

- [x] Phase 1: App Shell — Tauri + React desktop app launches with sidebar, routing, SQLite plumbing, dark mode, and all shadcn components installed (completed 2024-04-30)
- [x] Phase 2: Data Layer + Entity CRUD — Full 10-table schema, FK enforcement, seed data, and CRUD for factions / units / paints (completed 2024-04-30)
- [x] Phase 3: Collection Module — Searchable, filterable unit table with detail drawer, inline status updates, progress bars, and full create/edit/delete UX including all cross-cutting polish patterns (completed 2024-05-01)
- [x] Phase 4: Painting Module — Active painting projects Kanban (status columns, card actions, mark active) plus full recipe CRUD with paint linkage and owned/missing paint indicator (completed 2024-05-01)
- [x] Phase 5: Dashboard — Full dashboard with global stat cards, faction summary cards, painting/assembly/basing percentages, active projects list, and recently updated units (completed 2024-05-01)

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Utility Layer (Phases 6–9) — SHIPPED 2024-05-03</summary>

- [x] **Phase 6: Foundation** — Schema migration 004, TypeScript types for all v2.0 features, query modules (armyLists.ts, strategyNotes.ts), hook modules, and cross-invalidation patch to usePaints.ts (completed 2024-05-01)
- [x] **Phase 7: Paint Inventory** — PaintInventoryPage with brand/type/color-family filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge, inline owned toggle, sidebar nav and route (completed 2024-05-02)
- [x] **Phase 8: Army List Builder** — ArmyListsPage, ArmyListDetailSheet, unit picker, COALESCE-in-SQL points calculation, battle-ready %, pre-delete unit check, sidebar nav and route (completed 2024-05-03)
- [x] **Phase 9: Unit Playbook** — PlaybookTab (stats block grid + abilities/keywords + strategy notes + inline save), UnitDetailSheet wrapped in shadcn Tabs (completed 2024-05-02)

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.1 Visual Command (Phases 10–16 + 20) — SHIPPED 2026-05-04</summary>

- [x] Phase 10: Theming Foundation — CSS `@theme` faction-accent system, `ActiveFactionContext`, collapsible sidebar with icon-only mode, Radix Tooltip labels, localStorage persistence (completed 2026-05-03)
- [x] Phase 11: Dashboard Command Center — `useCountUp` rAF animated stat counters, `FactionSummaryCard` with `ring-faction-accent` highlight (completed 2026-05-03)
- [x] Phase 12: Collection Gallery View — `UnitGallery` card grid + `PaintingRing` SVG, `useCollectionViewMode` localStorage toggle, filter preservation (completed 2026-05-04)
- [x] Phase 13: Hobby Journal — `painting_sessions` table, `tauri-plugin-fs/dialog`, session log + photo timeline with lightbox, JOUR-06 disk cleanup on unit delete (completed 2026-05-04)
- [x] Phase 14: Spending Tracker — Integer-pence discipline, `formatCurrency`, `SpendingPage` with per-faction breakdown, 6-mutation cache invalidation (completed 2026-05-04)
- [x] Phase 15: Warhammer 40K Datasheet Integration — Dual-DB architecture, `bulk_sync_rules` Rust command, `useRulesSync` 7-CSV parallel fetch, `DatasheetPicker`, `DatasheetImportDialog`, full PlaybookTab (DS-01..12) (completed 2026-05-04)
- [x] Phase 16: Design Overhaul — Geist Variable font, text-3xl page headers, icon-pill empty states across all 7 pages, tabular-nums everywhere, card elevation system (completed 2026-05-04)
- [x] Phase 20: v2.1 Polish & Gap Closure — DS-08 secondary path (DashboardPage conflict dialog), FactionsEmptyState Shield icon-pill, PaintingProjectsPage controlled-props CTA, upsertSyncMeta dead export removed (completed 2026-05-04)

Full details: `.planning/milestones/v2.1-ROADMAP.md`

</details>

---

<details>
<summary>✅ v2.2 Full Circle (Phases 17–19, 21–24, 35) — SHIPPED 2026-05-05</summary>

- [x] Phase 17: Schema Foundation + Enrichment — Migration 008 (lore_notes + undercoat on units, lore_notes on factions, purchase_date on paints), dates.ts UTC utility (completed 2026-05-04)
- [x] Phase 18: Battle Log — Battle log CRUD page with opponent faction, mission, result, army list linkage, notes (completed 2026-05-04)
- [x] Phase 19: Analytics Core — Recharts/shadcn chart, hobby velocity and painting streak on Dashboard, monthly spend trend chart (completed 2026-05-04)
- [x] Phase 21: Wishlist — wishlist_items table (migration 009), full CRUD Wishlist page with cost/notes (completed 2026-05-05)
- [x] Phase 22: Hobby Goals — hobby_goals table (migration 010), goal CRUD with target unit count, progress from session history (completed 2026-05-05)
- [x] Phase 23: Display Features — Battle Ready quick-filter, Showcase Mode full-screen gallery via Tauri window API (completed 2026-05-05)
- [x] Phase 24: Unit Point Calculator — Point tiers, wargear loadout management, swap delta preview in army list builder (completed 2026-05-05)
- [x] Phase 35: v2.2 Gap Closure — BattleLogSheet timezone fix, PaintSheet purchase_date wiring, cache invalidation patches (completed 2026-05-05)

Full details: `.planning/milestones/v2.2-ROADMAP.md`

</details>

---

<details>
<summary>✅ v2.3 Hobby Command Center (Phases 25–29) — SHIPPED 2026-05-05</summary>

- [x] Phase 25: Design Foundation (2/2 plans) — completed 2026-05-04
- [x] Phase 26: Dashboard Redesign (5/5 plans) — completed 2026-05-05
- [x] Phase 27: Navigation & Quick Add (4/4 plans) — completed 2026-05-05
- [x] Phase 28: Collection + Projects (5/5 plans) — completed 2026-05-05
- [x] Phase 29: Workshop + Play (5/5 plans) — completed 2026-05-05

Full details: `.planning/milestones/v2.3-ROADMAP.md`

</details>

---

<details>
<summary>✅ v2.4 Premium Dashboard UX & Visual Polish (Phases 30–34, 36) — SHIPPED 2026-05-06</summary>

- [x] Phase 30: Grid Layout Foundation — Dashboard CSS grid (asymmetric 2-column bento), clickable StatCards, 5-bucket pipeline grouping (completed 2026-05-06)
- [x] Phase 31: Focus & Projects Panels — UnitThumbnail, CurrentFocusCard v2 (photo, metadata, actions), ActiveProjectsPanel (completed 2026-05-06)
- [x] Phase 32: Army Readiness Card — ArmyReadinessCard with target point selector and per-faction progress bars (completed 2026-05-06)
- [x] Phase 33: Data Intelligence — LogSession status updates, spending metrics, recipe-unit navigation (completed 2026-05-06)
- [x] Phase 34: Visual Polish — FactionSummaryCard v2, hero radial gradient, hover shadow hierarchy (completed 2026-05-06)
- [x] Phase 36: v2.4 Gap Closure — Recipe cache invalidation fix, stale doc updates (completed 2026-05-06)

Full details: `.planning/milestones/v2.4-ROADMAP.md`

</details>

---

<details>
<summary>✅ v2.5 Recipes 2.0 / Painting Studio (Phases 37–41) — SHIPPED 2026-05-07</summary>

- [x] Phase 37: Schema Foundation + Pre-flight Fixes (2/2 plans) — completed 2026-05-07
- [x] Phase 38: Structured Step Input (2/2 plans) — completed 2026-05-07
- [x] Phase 39: Studio UX + Paint Availability (3/3 plans) — completed 2026-05-07
- [x] Phase 40: Recipe Actions + Step Photos (3/3 plans) — completed 2026-05-07
- [x] Phase 41: Session Integration (2/2 plans) — completed 2026-05-07

Full details: `.planning/milestones/v2.5-ROADMAP.md`

</details>

---

### v2.6 Rules Sync 2.0 / Rules Data Hub (In Progress)

**Milestone Goal:** Stabilize and extend the local rules import architecture so HobbyForge becomes a reliable personal rules and points reference — with extended data types surfaced in the UI, a hardened sync pipeline, sync metadata tracking, and persistent manual overrides that survive re-syncs.

- [x] **Phase 42: Architecture Audit** — Read-only investigation of the current sync pipeline and extended rules schema; produces a written architecture note covering data flow, type/query/hook gaps, and migration plan for metadata and overrides tables (completed 2026-05-08)
- [ ] **Phase 43: Extended Rules Read Layer** — TypeScript types, query functions, and React Query hooks for stratagems, detachments, detachment abilities, and shared faction abilities; all four data types surfaced in PlaybookTab
- [ ] **Phase 44: Sync Pipeline Hardening** — Rust `bulk_sync_rules` returns per-table row counts; TypeScript displays counts in post-sync confirmation; CSV column validation rejects malformed files; sync errors logged to persistent table; all new rules hooks invalidated on sync success
- [ ] **Phase 45: Sync Metadata & Import Tracking** — Last sync date/time, per-table row counts, source version, error history, freshness badge on rules-dependent pages, and pre-sync snapshot mechanism all visible and functional
- [ ] **Phase 46: Manual Overrides & Version Comparison** — Users can override points, stats, keywords, and ability reminders per unit in hobbyforge.db; overrides persist across re-syncs and are visually distinguished from imported data; post-sync diff view shows what changed or was removed

## Phase Details

### Phase 42: Architecture Audit
**Goal**: Developer has a written architecture note that fully maps the current sync pipeline and identifies every gap needed before extending it
**Depends on**: Phase 41 (v2.5 complete)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04
**Success Criteria** (what must be TRUE):
  1. Architecture note confirms which rw_* extended tables exist and are populated after a live sync run
  2. Architecture note documents the complete data flow from TypeScript CSV fetch through Rust transaction to SQLite write
  3. Architecture note lists every TypeScript type, query function, and React Query hook that is missing for stratagems, detachments, detachment abilities, and shared abilities
  4. Architecture note includes a migration plan for sync_meta, sync_errors, rules_snapshot, and unit_overrides tables with column-level detail
**Plans:** 1 plan
Plans:
- [x] 42-01-PLAN.md — Write ARCHITECTURE-AUDIT.md reference document

### Phase 43: Extended Rules Read Layer
**Goal**: Users can view stratagems, detachments, detachment abilities, and shared faction abilities in PlaybookTab — backed by a complete TypeScript data layer
**Depends on**: Phase 42
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05
**Success Criteria** (what must be TRUE):
  1. User can see faction stratagems (name, phase, CP cost, description, keywords) for their linked unit's faction in PlaybookTab
  2. User can see faction detachments (name, description, rule text) in PlaybookTab
  3. User can see detachment abilities grouped by their parent detachment in PlaybookTab
  4. User can see shared faction abilities (non-datasheet-specific) in PlaybookTab
  5. TypeScript types, query functions, and React Query hooks exist for all four extended data types and follow the established src/db/queries + src/hooks pattern
**Plans:** 1/2 plans executed
Plans:
- [ ] 43-01-PLAN.md — Types, query module, hooks module, and data layer tests (SCHEMA-05)
- [ ] 43-02-PLAN.md — PlaybookTab UI integration with collapsible sections and component tests (SCHEMA-01/02/03/04)

### Phase 44: Sync Pipeline Hardening
**Goal**: The sync pipeline validates input, reports outcomes per table, and persists errors — eliminating silent failures and ambiguous post-sync state
**Depends on**: Phase 42
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05
**Success Criteria** (what must be TRUE):
  1. After a sync completes, the confirmation UI shows how many rows were inserted per table (e.g., "datasheets: 847, stratagems: 312, abilities: 1204")
  2. Uploading a CSV file with missing required column headers triggers a visible validation error before any data is inserted
  3. Any error that occurs during sync is written to a persistent errors table with timestamp, error type, and message — and survives app restart
  4. All rules-related React Query hooks (including the new stratagems, detachments, and abilities hooks) are invalidated after a successful sync
**Plans:** 1/2 plans executed
Plans:
- [ ] 44-01-PLAN.md — Rust SyncResult return type, CSV validation module, sync_errors migration and query module
- [ ] 44-02-PLAN.md — Wire validation, Rust counts, error logging, and cache invalidation into useRulesSync and PlaybookTab

### Phase 45: Sync Metadata & Import Tracking
**Goal**: Users can always see when their rules data was last synced, how complete it is, and whether it is fresh — and a pre-sync snapshot is captured before each re-sync
**Depends on**: Phase 44
**Requirements**: META-01, META-02, META-03, META-04, META-05, META-06
**Success Criteria** (what must be TRUE):
  1. User can see the date and time of the last successful sync displayed in the UI
  2. User can see per-table row counts from the most recent sync (matching the counts shown in the post-sync confirmation)
  3. User can see a Wahapedia source version or edition field populated after sync
  4. User can view a timestamped list of past sync errors
  5. Rules-dependent pages (e.g., PlaybookTab) show a stale/fresh badge indicating whether the data needs re-syncing
  6. Before each re-sync, the current rules data is snapshotted into a separate table so version comparison in Phase 46 is possible
**Plans**: TBD

### Phase 46: Manual Overrides & Version Comparison
**Goal**: Users can correct or annotate any imported rules value for their own units, with changes surviving every future re-sync, and can see what the re-sync changed
**Depends on**: Phase 45
**Requirements**: OVRD-01, OVRD-02, OVRD-03, OVRD-04, OVRD-05, OVRD-06, OVRD-07
**Success Criteria** (what must be TRUE):
  1. User can enter a custom points value for a unit that overrides the imported value and is preserved after re-syncing
  2. User can override individual stat fields (M/T/Sv/W/Ld/OC) for a unit and have the overrides preserved after re-syncing
  3. User can override keywords and ability reminders for a unit and have the overrides preserved after re-syncing
  4. In the UI, overridden values are visually distinguished from imported values (e.g., a badge or icon marking the field as manually set)
  5. After a re-sync, user can open a diff view showing which points values, stats, abilities, or keywords changed between the previous snapshot and the new data
  6. After a re-sync, user can see which datasheets were removed or renamed compared to the snapshot
**Plans**: TBD

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 35 → 25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34 → 36 → 37 → 38 → 39 → 40 → 41 → 42 → 43 → 44 → 45 → 46

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. App Shell | v1.1 | 3/3 | Complete | 2024-04-30 |
| 2. Data Layer + Entity CRUD | v1.1 | 4/4 | Complete | 2024-04-30 |
| 3. Collection Module | v1.1 | 5/5 | Complete | 2024-05-01 |
| 4. Painting Module | v1.1 | 4/4 | Complete | 2024-05-01 |
| 5. Dashboard | v1.1 | 4/4 | Complete | 2024-05-01 |
| 6. Foundation | v2.0 | 5/5 | Complete | 2024-05-01 |
| 7. Paint Inventory | v2.0 | 5/5 | Complete | 2024-05-02 |
| 8. Army List Builder | v2.0 | 6/6 | Complete | 2024-05-03 |
| 9. Unit Playbook | v2.0 | 4/4 | Complete | 2024-05-02 |
| 10. Theming Foundation | v2.1 | 4/4 | Complete | 2026-05-03 |
| 11. Dashboard Command Center | v2.1 | 4/4 | Complete | 2026-05-03 |
| 12. Collection Gallery View | v2.1 | 4/4 | Complete | 2026-05-04 |
| 13. Hobby Journal | v2.1 | 6/6 | Complete | 2026-05-04 |
| 14. Spending Tracker | v2.1 | 5/5 | Complete | 2026-05-04 |
| 15. 40K Datasheet Integration | v2.1 | 7/7 | Complete | 2026-05-04 |
| 16. Design Overhaul | v2.1 | 8/8 | Complete | 2026-05-04 |
| 17. Schema Foundation + Enrichment | v2.2 | 1/1 | Complete | 2026-05-04 |
| 18. Battle Log | v2.2 | 4/4 | Complete | 2026-05-04 |
| 19. Analytics Core | v2.2 | 4/4 | Complete | 2026-05-04 |
| 20. v2.1 Polish & Gap Closure | v2.1 | 3/3 | Complete | 2026-05-04 |
| 21. Wishlist | v2.2 | 3/3 | Complete | 2026-05-05 |
| 22. Hobby Goals | v2.2 | 4/4 | Complete | 2026-05-05 |
| 23. Display Features | v2.2 | 2/2 | Complete | 2026-05-05 |
| 24. Unit Point Calculator | v2.2 | 4/4 | Complete | 2026-05-05 |
| 35. v2.2 Gap Closure | v2.2 | 1/1 | Complete | 2026-05-05 |
| 25. Design Foundation | v2.3 | 2/2 | Complete | 2026-05-04 |
| 26. Dashboard Redesign | v2.3 | 5/5 | Complete | 2026-05-05 |
| 27. Navigation & Quick Add | v2.3 | 4/4 | Complete | 2026-05-05 |
| 28. Collection + Projects | v2.3 | 5/5 | Complete | 2026-05-05 |
| 29. Workshop + Play | v2.3 | 5/5 | Complete | 2026-05-05 |
| 30. Grid Layout Foundation | v2.4 | 2/2 | Complete | 2026-05-06 |
| 31. Focus & Projects Panels | v2.4 | 3/3 | Complete | 2026-05-06 |
| 32. Army Readiness Card | v2.4 | 1/1 | Complete | 2026-05-06 |
| 33. Data Intelligence | v2.4 | 4/4 | Complete | 2026-05-06 |
| 34. Visual Polish | v2.4 | 2/2 | Complete | 2026-05-06 |
| 36. v2.4 Gap Closure | v2.4 | 1/1 | Complete | 2026-05-06 |
| 37. Schema Foundation + Pre-flight Fixes | v2.5 | 2/2 | Complete | 2026-05-07 |
| 38. Structured Step Input | v2.5 | 2/2 | Complete | 2026-05-07 |
| 39. Studio UX + Paint Availability | v2.5 | 3/3 | Complete | 2026-05-07 |
| 40. Recipe Actions + Step Photos | v2.5 | 3/3 | Complete | 2026-05-07 |
| 41. Session Integration | v2.5 | 2/2 | Complete | 2026-05-07 |
| 42. Architecture Audit | v2.6 | 1/1 | Complete | 2026-05-08 |
| 43. Extended Rules Read Layer | 1/2 | In Progress|  | - |
| 44. Sync Pipeline Hardening | 1/2 | In Progress|  | - |
| 45. Sync Metadata & Import Tracking | v2.6 | 0/TBD | Not started | - |
| 46. Manual Overrides & Version Comparison | v2.6 | 0/TBD | Not started | - |
