# Roadmap: HobbyForge

## Milestones

- ✅ **v0.1.1 HobbyForge MVP** — Phases 1–5 (shipped 2024-05-01)
- ✅ **v0.2.0 Utility Layer** — Phases 6–9 (shipped 2024-05-03)
- ✅ **v0.2.1 Visual Command** — Phases 10–16 + 20 (shipped 2026-05-04)
- ✅ **v0.2.2 Full Circle** — Phases 17–19, 21–24, 35 (shipped 2026-05-05)
- ✅ **v0.2.3 Hobby Command Center** — Phases 25–29 (shipped 2026-05-05)
- ✅ **v0.2.4 Premium Dashboard UX & Visual Polish** — Phases 30–34, 36 (shipped 2026-05-06)
- ✅ **v0.2.5 Recipes 2.0 / Painting Studio** — Phases 37–41 (shipped 2026-05-07)
- ✅ **v0.2.6 Rules Sync 2.0 / Rules Data Hub** — Phases 42–47 (shipped 2026-05-08)
- ✅ **v0.2.7 Recipes 3.0 / Hierarchical Painting Workflows** — Phases 48–51 (shipped 2026-05-08)
- 🚧 **v0.2.8 Rules Data Hub UI / Army Lists 2.0 / Game Day** — Phases 52–56 (in progress)

## Phases

<details>
<summary>✅ v0.1.1 HobbyForge MVP (Phases 1–5) — SHIPPED 2024-05-01</summary>

- [x] Phase 1: App Shell — Tauri + React desktop app launches with sidebar, routing, SQLite plumbing, dark mode, and all shadcn components installed (completed 2024-04-30)
- [x] Phase 2: Data Layer + Entity CRUD — Full 10-table schema, FK enforcement, seed data, and CRUD for factions / units / paints (completed 2024-04-30)
- [x] Phase 3: Collection Module — Searchable, filterable unit table with detail drawer, inline status updates, progress bars, and full create/edit/delete UX including all cross-cutting polish patterns (completed 2024-05-01)
- [x] Phase 4: Painting Module — Active painting projects Kanban (status columns, card actions, mark active) plus full recipe CRUD with paint linkage and owned/missing paint indicator (completed 2024-05-01)
- [x] Phase 5: Dashboard — Full dashboard with global stat cards, faction summary cards, painting/assembly/basing percentages, active projects list, and recently updated units (completed 2024-05-01)

Full details: `.planning/milestones/v0.1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.0 Utility Layer (Phases 6–9) — SHIPPED 2024-05-03</summary>

- [x] **Phase 6: Foundation** — Schema migration 004, TypeScript types for all v0.2.0 features, query modules (armyLists.ts, strategyNotes.ts), hook modules, and cross-invalidation patch to usePaints.ts (completed 2024-05-01)
- [x] **Phase 7: Paint Inventory** — PaintInventoryPage with brand/type/color-family filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge, inline owned toggle, sidebar nav and route (completed 2024-05-02)
- [x] **Phase 8: Army List Builder** — ArmyListsPage, ArmyListDetailSheet, unit picker, COALESCE-in-SQL points calculation, battle-ready %, pre-delete unit check, sidebar nav and route (completed 2024-05-03)
- [x] **Phase 9: Unit Playbook** — PlaybookTab (stats block grid + abilities/keywords + strategy notes + inline save), UnitDetailSheet wrapped in shadcn Tabs (completed 2024-05-02)

Full details: `.planning/milestones/v0.2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.1 Visual Command (Phases 10–16 + 20) — SHIPPED 2026-05-04</summary>

- [x] Phase 10: Theming Foundation — CSS `@theme` faction-accent system, `ActiveFactionContext`, collapsible sidebar with icon-only mode, Radix Tooltip labels, localStorage persistence (completed 2026-05-03)
- [x] Phase 11: Dashboard Command Center — `useCountUp` rAF animated stat counters, `FactionSummaryCard` with `ring-faction-accent` highlight (completed 2026-05-03)
- [x] Phase 12: Collection Gallery View — `UnitGallery` card grid + `PaintingRing` SVG, `useCollectionViewMode` localStorage toggle, filter preservation (completed 2026-05-04)
- [x] Phase 13: Hobby Journal — `painting_sessions` table, `tauri-plugin-fs/dialog`, session log + photo timeline with lightbox, JOUR-06 disk cleanup on unit delete (completed 2026-05-04)
- [x] Phase 14: Spending Tracker — Integer-pence discipline, `formatCurrency`, `SpendingPage` with per-faction breakdown, 6-mutation cache invalidation (completed 2026-05-04)
- [x] Phase 15: Warhammer 40K Datasheet Integration — Dual-DB architecture, `bulk_sync_rules` Rust command, `useRulesSync` 7-CSV parallel fetch, `DatasheetPicker`, `DatasheetImportDialog`, full PlaybookTab (DS-01..12) (completed 2026-05-04)
- [x] Phase 16: Design Overhaul — Geist Variable font, text-3xl page headers, icon-pill empty states across all 7 pages, tabular-nums everywhere, card elevation system (completed 2026-05-04)
- [x] Phase 20: v0.2.1 Polish & Gap Closure — DS-08 secondary path (DashboardPage conflict dialog), FactionsEmptyState Shield icon-pill, PaintingProjectsPage controlled-props CTA, upsertSyncMeta dead export removed (completed 2026-05-04)

Full details: `.planning/milestones/v0.2.1-ROADMAP.md`

</details>

---

<details>
<summary>✅ v0.2.2 Full Circle (Phases 17–19, 21–24, 35) — SHIPPED 2026-05-05</summary>

- [x] Phase 17: Schema Foundation + Enrichment — Migration 008 (lore_notes + undercoat on units, lore_notes on factions, purchase_date on paints), dates.ts UTC utility (completed 2026-05-04)
- [x] Phase 18: Battle Log — Battle log CRUD page with opponent faction, mission, result, army list linkage, notes (completed 2026-05-04)
- [x] Phase 19: Analytics Core — Recharts/shadcn chart, hobby velocity and painting streak on Dashboard, monthly spend trend chart (completed 2026-05-04)
- [x] Phase 21: Wishlist — wishlist_items table (migration 009), full CRUD Wishlist page with cost/notes (completed 2026-05-05)
- [x] Phase 22: Hobby Goals — hobby_goals table (migration 010), goal CRUD with target unit count, progress from session history (completed 2026-05-05)
- [x] Phase 23: Display Features — Battle Ready quick-filter, Showcase Mode full-screen gallery via Tauri window API (completed 2026-05-05)
- [x] Phase 24: Unit Point Calculator — Point tiers, wargear loadout management, swap delta preview in army list builder (completed 2026-05-05)
- [x] Phase 35: v0.2.2 Gap Closure — BattleLogSheet timezone fix, PaintSheet purchase_date wiring, cache invalidation patches (completed 2026-05-05)

Full details: `.planning/milestones/v0.2.2-ROADMAP.md`

</details>

---

<details>
<summary>✅ v0.2.3 Hobby Command Center (Phases 25–29) — SHIPPED 2026-05-05</summary>

- [x] Phase 25: Design Foundation (2/2 plans) — completed 2026-05-04
- [x] Phase 26: Dashboard Redesign (5/5 plans) — completed 2026-05-05
- [x] Phase 27: Navigation & Quick Add (4/4 plans) — completed 2026-05-05
- [x] Phase 28: Collection + Projects (5/5 plans) — completed 2026-05-05
- [x] Phase 29: Workshop + Play (5/5 plans) — completed 2026-05-05

Full details: `.planning/milestones/v0.2.3-ROADMAP.md`

</details>

---

<details>
<summary>✅ v0.2.4 Premium Dashboard UX & Visual Polish (Phases 30–34, 36) — SHIPPED 2026-05-06</summary>

- [x] Phase 30: Grid Layout Foundation — Dashboard CSS grid (asymmetric 2-column bento), clickable StatCards, 5-bucket pipeline grouping (completed 2026-05-06)
- [x] Phase 31: Focus & Projects Panels — UnitThumbnail, CurrentFocusCard v2 (photo, metadata, actions), ActiveProjectsPanel (completed 2026-05-06)
- [x] Phase 32: Army Readiness Card — ArmyReadinessCard with target point selector and per-faction progress bars (completed 2026-05-06)
- [x] Phase 33: Data Intelligence — LogSession status updates, spending metrics, recipe-unit navigation (completed 2026-05-06)
- [x] Phase 34: Visual Polish — FactionSummaryCard v2, hero radial gradient, hover shadow hierarchy (completed 2026-05-06)
- [x] Phase 36: v0.2.4 Gap Closure — Recipe cache invalidation fix, stale doc updates (completed 2026-05-06)

Full details: `.planning/milestones/v0.2.4-ROADMAP.md`

</details>

---

<details>
<summary>✅ v0.2.5 Recipes 2.0 / Painting Studio (Phases 37–41) — SHIPPED 2026-05-07</summary>

- [x] Phase 37: Schema Foundation + Pre-flight Fixes (2/2 plans) — completed 2026-05-07
- [x] Phase 38: Structured Step Input (2/2 plans) — completed 2026-05-07
- [x] Phase 39: Studio UX + Paint Availability (3/3 plans) — completed 2026-05-07
- [x] Phase 40: Recipe Actions + Step Photos (3/3 plans) — completed 2026-05-07
- [x] Phase 41: Session Integration (2/2 plans) — completed 2026-05-07

Full details: `.planning/milestones/v0.2.5-ROADMAP.md`

</details>

---

<details>
<summary>✅ v0.2.6 Rules Sync 2.0 / Rules Data Hub (Phases 42–47) — SHIPPED 2026-05-08</summary>

- [x] Phase 42: Architecture Audit (1/1 plans) — completed 2026-05-08
- [x] Phase 43: Extended Rules Read Layer (2/2 plans) — completed 2026-05-08
- [x] Phase 44: Sync Pipeline Hardening (2/2 plans) — completed 2026-05-08
- [x] Phase 45: Sync Metadata & Import Tracking (2/2 plans) — completed 2026-05-08
- [x] Phase 46: Manual Overrides & Version Comparison (2/2 plans) — completed 2026-05-08
- [x] Phase 47: v0.2.6 Gap Closure (2/2 plans) — completed 2026-05-08

Full details: `.planning/milestones/v0.2.6-ROADMAP.md`

</details>

---

<details>
<summary>✅ v0.2.7 Recipes 3.0 / Hierarchical Painting Workflows (Phases 48–51) — SHIPPED 2026-05-08</summary>

- [x] Phase 48: Section Data Layer (2/2 plans) — Migration 018, recipe_sections table, typed CRUD queries + hooks (completed 2026-05-08)
- [x] Phase 49: Section Read UI (1/1 plans) — SectionedTimeline component with section headers and flat fallback (completed 2026-05-08)
- [x] Phase 50: Section Form UI (3/3 plans) — Collapsible DnD section cards, progressive disclosure, RecipeFormSheet rewrite (completed 2026-05-08)
- [x] Phase 51: Duplication + Integration Polish (2/2 plans) — Section-aware duplication, section count badges, regression verification (completed 2026-05-08)

Full details: `.planning/milestones/v0.2.7-ROADMAP.md`

</details>

---

### 🚧 v0.2.8 Rules Data Hub UI / Army Lists 2.0 / Game Day (In Progress)

**Milestone Goal:** Expose synced Wahapedia rules data in a standalone browser, connect detachment selection to army lists, and deliver a focused Game Day mode for in-game reference — making rules data visible, searchable, and useful for real game preparation.

- [x] **Phase 52: Schema + Data Layer Foundation** — Migration 019: detachment_id on army_lists, rules_favorites and rules_notes tables in hobbyforge.db; typed query modules and hooks for all new tables; points import design documentation (completed 2026-05-10)
- [x] **Phase 53: Rules Data Hub UI** — Standalone RulesHubPage with sync status header, faction browser, rules browser (stratagems/detachments/shared abilities) with filtering and search, sync error history, diff summary, and Wahapedia disclaimer (completed 2026-05-11)
- [ ] **Phase 54: Army Lists 2.0 — Detachment Selection** — DetachmentPicker in ArmyListDetailSheet, detachment ability and filtered stratagems display, stale-data warning, favorites summary; user can see all rules-data context for their list in one place
- [ ] **Phase 55: Playbook Enhancements — Favorites and Notes** — Star/favorite toggle and Game Day reminder flag on any rule entry; inline personal notes on any rule; visual distinction between imported data and user annotations throughout PlaybookTab and RulesHubPage
- [ ] **Phase 56: Game Day Mode** — GameDayPage launched from army list: CP tracker, phase-grouped stratagem view, pre-game checklist (Zustand persist), per-unit ability quick reference, once-per-game ability toggles, painting status of units in list, favorited reminders surfaced at top

## Phase Details

### Phase 52: Schema + Data Layer Foundation
**Goal**: All new schema, query functions, hooks, and design documentation for v0.2.8 exist and are fully typed — every downstream phase builds on this layer without touching migrations again
**Depends on**: Phase 51 (v0.2.7 shipped)
**Requirements**: ARMY-06
**Success Criteria** (what must be TRUE):
  1. Migration 019 runs on app start with zero errors: army_lists gains detachment_id TEXT NULL column, hobbyforge.db gains rules_favorites table (rule_id TEXT, rule_type TEXT, rule_name TEXT, is_reminder INTEGER) and rules_notes table (rule_id TEXT, rule_type TEXT, rule_name TEXT, note_text TEXT)
  2. TypeScript types ArmyList (updated), RulesFavorite, and RulesNote exist and are imported without errors
  3. Query functions getDetachmentById, getStratagemsByDetachment (rulesExtended.ts), getRulesFavorites, upsertRulesFavorite, deleteRulesFavorite (rulesFavorites.ts), getRulesNotes, upsertRulesNote (rulesNotes.ts) exist with correct parameterized SQL
  4. React Query hooks useDetachmentById, useStratagemsByDetachment, useRulesFavorites, useRulesNotes, and matching mutations are registered with staleTime: Infinity where reading from rules.db and registered for cache invalidation in useRulesSync.onSuccess
  5. Points import design document is written at `.planning/points-import-design.md` covering schema, versioning, deltas, manual override interaction, and army list impact
**Plans**: 3 plans
Plans:
- [ ] 52-01-PLAN.md — Migration 019 + TypeScript types + army list query extensions
- [ ] 52-02-PLAN.md — Points import design document (ARMY-06)
- [ ] 52-03-PLAN.md — Query modules + hooks + sync invalidation

### Phase 53: Rules Data Hub UI
**Goal**: Users can browse all synced Wahapedia rules data from a dedicated page — stratagems, detachments, and shared abilities — with faction filtering, text search, sync status, error history, and diff summary visible at a glance
**Depends on**: Phase 52
**Requirements**: RULES-01, RULES-02, RULES-03, RULES-04, RULES-05, RULES-06, RULES-07, RULES-08, RULES-09
**Success Criteria** (what must be TRUE):
  1. RulesHubPage is accessible via sidebar nav and route /rules-hub; displays sync status header (last sync date, row counts per table, source version, freshness badge) and a trigger-sync button
  2. User can filter rules by faction (using useWahapediaFactionId translation) and search by name/keyword across stratagems, detachments, and shared abilities simultaneously
  3. User can browse stratagems filtered by phase (Command/Movement/Shooting/Charge/Fight) and CP cost; user can browse detachments and their abilities; user can browse shared abilities — each as a distinct, labeled section or tab
  4. User can view sync error history with timestamps and error messages; user can view a diff summary showing how many datasheets were added, removed, modified, or renamed since the last sync
  5. A visible disclaimer on the page identifies all data as community-sourced Wahapedia data, not official Games Workshop material
**Plans**: 3 plans
Plans:
- [ ] 53-01-PLAN.md — Page scaffold: route, sidebar, sync status card, faction picker, tabs shell, disclaimer
- [ ] 53-02-PLAN.md — Stratagems tab: expandable cards, phase/CP filter chips, text search
- [ ] 53-03-PLAN.md — Detachments tab + Shared Abilities tab with search
### Phase 54: Army Lists 2.0 — Detachment Selection
**Goal**: Users can select a detachment for each army list and immediately see the detachment's ability and its filtered stratagems in the army list detail — closing the most-requested gap in the current army list builder
**Depends on**: Phase 52
**Requirements**: ARMY-01, ARMY-02, ARMY-03, ARMY-04, ARMY-05
**Success Criteria** (what must be TRUE):
  1. ArmyListDetailSheet contains a DetachmentPicker (Combobox) scoped to the list's faction; selecting a detachment persists detachment_id and a detachment_name TEXT copy to hobbyforge.db
  2. After selecting a detachment, the user can see the detachment's ability displayed in the army list detail below the picker
  3. The user can see stratagems filtered to the selected detachment listed in the army list detail, using the same StratagemEntry display component as PlaybookTab
  4. When the last sync occurred more than 30 days ago, a visible stale-data warning appears in the army list detail (not a blocking error — just a banner)
  5. User-marked favorites from PlaybookTab (is_reminder = 1) appear as a "Reminders" section within the army list detail, so game-relevant rules are one place to check before play
**Plans**: 3 plans
Plans:
- [ ] 52-01-PLAN.md — Migration 019 + TypeScript types + army list query extensions
- [ ] 52-02-PLAN.md — Points import design document (ARMY-06)
- [ ] 52-03-PLAN.md — Query modules + hooks + sync invalidation

### Phase 55: Playbook Enhancements — Favorites and Notes
**Goal**: Users can mark any rule as a favorite or Game Day reminder and attach personal notes to any imported rule — with all user annotations visually distinct from synced Wahapedia data and surviving re-syncs
**Depends on**: Phase 52, Phase 53
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04
**Success Criteria** (what must be TRUE):
  1. Every stratagem, detachment ability, and shared ability entry in PlaybookTab and RulesHubPage shows a star toggle; toggling it immediately persists a rules_favorites row in hobbyforge.db and survives a rules.db re-sync
  2. Every rule entry shows a "Game Day reminder" flag toggle (distinct from the favorite star); rules with is_reminder = 1 are the source for ARMY-05 (army list reminders) and GAME-07 (Game Day reminders)
  3. Every rule entry shows a note textarea; typing and saving a note persists a rules_notes row in hobbyforge.db using the rule_name TEXT copy; the note survives re-sync and reappears on rule re-display
  4. Favorited rules and user notes are visually distinct from imported Wahapedia data — different background, label, or icon — making it clear which content is user-generated vs. community-sourced
**Plans**: 3 plans
Plans:
- [ ] 52-01-PLAN.md — Migration 019 + TypeScript types + army list query extensions
- [ ] 52-02-PLAN.md — Points import design document (ARMY-06)
- [ ] 52-03-PLAN.md — Query modules + hooks + sync invalidation

### Phase 56: Game Day Mode
**Goal**: Users can launch a focused in-game reference view from any army list — with a CP tracker, phase-grouped stratagems for the selected detachment, a persistent pre-game checklist, per-unit ability cards, and painting status visible at a glance
**Depends on**: Phase 53, Phase 54, Phase 55
**Requirements**: GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07, GAME-08
**Success Criteria** (what must be TRUE):
  1. A "Game Day" button on ArmyListDetailSheet navigates to GameDayPage pre-scoped to that army list; the page shows the list name, detachment name, and faction
  2. Stratagems for the selected detachment are grouped by game phase (Command, Movement, Shooting, Charge, Fight) and displayed as readable cards; user-marked reminders (is_reminder = 1) appear at the top of the stratagem view
  3. A CP tracker shows current CP remaining (starts at user-set value); each tap on a stratagem card decrements CP by that stratagem's cost, with undo available; CP state persists across navigation using Zustand persist (localStorage)
  4. A pre-game checklist is displayed with user-defined setup steps; checked items remain checked until the user explicitly resets the checklist; checklist state persists using Zustand persist (localStorage)
  5. Each unit in the army list has a collapsible ability quick-reference card; abilities with an explicit once-per-game marker show a used/unused toggle; unit painting status (painted/unpainted) is visible on each card as a contextual readiness signal
**Plans**: 3 plans
Plans:
- [ ] 52-01-PLAN.md — Migration 019 + TypeScript types + army list query extensions
- [ ] 52-02-PLAN.md — Points import design document (ARMY-06)
- [ ] 52-03-PLAN.md — Query modules + hooks + sync invalidation

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 35 → 25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34 → 36 → 37 → 38 → 39 → 40 → 41 → 42 → 43 → 44 → 45 → 46 → 47 → 48 → 49 → 50 → 51 → 52 → 53 → 54 → 55 → 56

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. App Shell | v0.1.1 | 3/3 | Complete | 2024-04-30 |
| 2. Data Layer + Entity CRUD | v0.1.1 | 4/4 | Complete | 2024-04-30 |
| 3. Collection Module | v0.1.1 | 5/5 | Complete | 2024-05-01 |
| 4. Painting Module | v0.1.1 | 4/4 | Complete | 2024-05-01 |
| 5. Dashboard | v0.1.1 | 4/4 | Complete | 2024-05-01 |
| 6. Foundation | v0.2.0 | 5/5 | Complete | 2024-05-01 |
| 7. Paint Inventory | v0.2.0 | 5/5 | Complete | 2024-05-02 |
| 8. Army List Builder | v0.2.0 | 6/6 | Complete | 2024-05-03 |
| 9. Unit Playbook | v0.2.0 | 4/4 | Complete | 2024-05-02 |
| 10. Theming Foundation | v0.2.1 | 4/4 | Complete | 2026-05-03 |
| 11. Dashboard Command Center | v0.2.1 | 4/4 | Complete | 2026-05-03 |
| 12. Collection Gallery View | v0.2.1 | 4/4 | Complete | 2026-05-04 |
| 13. Hobby Journal | v0.2.1 | 6/6 | Complete | 2026-05-04 |
| 14. Spending Tracker | v0.2.1 | 5/5 | Complete | 2026-05-04 |
| 15. 40K Datasheet Integration | v0.2.1 | 7/7 | Complete | 2026-05-04 |
| 16. Design Overhaul | v0.2.1 | 8/8 | Complete | 2026-05-04 |
| 17. Schema Foundation + Enrichment | v0.2.2 | 1/1 | Complete | 2026-05-04 |
| 18. Battle Log | v0.2.2 | 4/4 | Complete | 2026-05-04 |
| 19. Analytics Core | v0.2.2 | 4/4 | Complete | 2026-05-04 |
| 20. v0.2.1 Polish & Gap Closure | v0.2.1 | 3/3 | Complete | 2026-05-04 |
| 21. Wishlist | v0.2.2 | 3/3 | Complete | 2026-05-05 |
| 22. Hobby Goals | v0.2.2 | 4/4 | Complete | 2026-05-05 |
| 23. Display Features | v0.2.2 | 2/2 | Complete | 2026-05-05 |
| 24. Unit Point Calculator | v0.2.2 | 4/4 | Complete | 2026-05-05 |
| 35. v0.2.2 Gap Closure | v0.2.2 | 1/1 | Complete | 2026-05-05 |
| 25. Design Foundation | v0.2.3 | 2/2 | Complete | 2026-05-04 |
| 26. Dashboard Redesign | v0.2.3 | 5/5 | Complete | 2026-05-05 |
| 27. Navigation & Quick Add | v0.2.3 | 4/4 | Complete | 2026-05-05 |
| 28. Collection + Projects | v0.2.3 | 5/5 | Complete | 2026-05-05 |
| 29. Workshop + Play | v0.2.3 | 5/5 | Complete | 2026-05-05 |
| 30. Grid Layout Foundation | v0.2.4 | 2/2 | Complete | 2026-05-06 |
| 31. Focus & Projects Panels | v0.2.4 | 3/3 | Complete | 2026-05-06 |
| 32. Army Readiness Card | v0.2.4 | 1/1 | Complete | 2026-05-06 |
| 33. Data Intelligence | v0.2.4 | 4/4 | Complete | 2026-05-06 |
| 34. Visual Polish | v0.2.4 | 2/2 | Complete | 2026-05-06 |
| 36. v0.2.4 Gap Closure | v0.2.4 | 1/1 | Complete | 2026-05-06 |
| 37. Schema Foundation + Pre-flight Fixes | v0.2.5 | 2/2 | Complete | 2026-05-07 |
| 38. Structured Step Input | v0.2.5 | 2/2 | Complete | 2026-05-07 |
| 39. Studio UX + Paint Availability | v0.2.5 | 3/3 | Complete | 2026-05-07 |
| 40. Recipe Actions + Step Photos | v0.2.5 | 3/3 | Complete | 2026-05-07 |
| 41. Session Integration | v0.2.5 | 2/2 | Complete | 2026-05-07 |
| 42. Architecture Audit | v0.2.6 | 1/1 | Complete | 2026-05-08 |
| 43. Extended Rules Read Layer | v0.2.6 | 2/2 | Complete | 2026-05-08 |
| 44. Sync Pipeline Hardening | v0.2.6 | 2/2 | Complete | 2026-05-08 |
| 45. Sync Metadata & Import Tracking | v0.2.6 | 2/2 | Complete | 2026-05-08 |
| 46. Manual Overrides & Version Comparison | v0.2.6 | 2/2 | Complete | 2026-05-08 |
| 47. v0.2.6 Gap Closure | v0.2.6 | 2/2 | Complete | 2026-05-08 |
| 48. Section Data Layer | v0.2.7 | 2/2 | Complete | 2026-05-08 |
| 49. Section Read UI | v0.2.7 | 1/1 | Complete | 2026-05-08 |
| 50. Section Form UI | v0.2.7 | 3/3 | Complete | 2026-05-08 |
| 51. Duplication + Integration Polish | v0.2.7 | 2/2 | Complete | 2026-05-08 |
| 52. Schema + Data Layer Foundation | 3/3 | Complete    | 2026-05-10 | - |
| 53. Rules Data Hub UI | 3/3 | Complete   | 2026-05-11 | - |
| 54. Army Lists 2.0 — Detachment Selection | v0.2.8 | 0/TBD | Not started | - |
| 55. Playbook Enhancements — Favorites and Notes | v0.2.8 | 0/TBD | Not started | - |
| 56. Game Day Mode | v0.2.8 | 0/TBD | Not started | - |
