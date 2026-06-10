# Roadmap: HobbyForge

## Milestones

- ✅ **v0.1.1 HobbyForge MVP** — Phases 1-5 (shipped 2024-05-01)
- ✅ **v0.2.0 Utility Layer** — Phases 6-9 (shipped 2024-05-03)
- ✅ **v0.2.1 Visual Command** — Phases 10-16 + 20 (shipped 2026-05-04)
- ✅ **v0.2.2 Full Circle** — Phases 17-19, 21-24, 35 (shipped 2026-05-05)
- ✅ **v0.2.3 Hobby Command Center** — Phases 25-29 (shipped 2026-05-05)
- ✅ **v0.2.4 Premium Dashboard UX & Visual Polish** — Phases 30-34, 36 (shipped 2026-05-06)
- ✅ **v0.2.5 Recipes 2.0 / Painting Studio** — Phases 37-41 (shipped 2026-05-07)
- ✅ **v0.2.6 Rules Sync 2.0 / Rules Data Hub** — Phases 42-47 (shipped 2026-05-08)
- ✅ **v0.2.7 Recipes 3.0 / Hierarchical Painting Workflows** — Phases 48-51 (shipped 2026-05-08)
- ✅ **v0.2.8 Rules Data Hub UI / Army Lists 2.0 / Game Day** — Phases 52-56 (shipped 2026-05-11)
- ✅ **v0.2.9 Recipes 3.1 / Workflow Semantics & Integrations** — Phases 57-60 (shipped 2026-05-12)
- ✅ **v0.2.10 Applied Recipes, Points Import & List Validation** — Phases 61-67 (shipped 2026-05-13)
- ✅ **v0.2.11 Foundation Hardening** — Phases 68-72 (shipped 2026-05-13)
- ✅ **v0.2.13 Data Integrity, Diagnostics & Product Coherence** — Phases 73-78 (shipped 2026-05-15)
- ✅ **v0.2.14 Backup 2.0 — Structured Export, Restore & Safety Backups** — Phases 79-83 (shipped 2026-05-19)
- ✅ **v0.2.15 Painting Mode** — Phases 84-88 (shipped 2026-05-20)
- ✅ **v0.2.18 Army Lists 3.0 — Smart List Builder** — Phases 89-95 (shipped 2026-05-22)
- ✅ **v0.3.0 Robustness & Architecture Hardening** — Phases 96-99 (shipped 2026-05-22)
- ✅ **v0.3.7 Smart Automation** — Phases 100-102 (shipped 2026-05-28)
- ✅ **v0.4.0 Unit Database — Canonical 40k Data Hub** — Phases 103-107 (shipped 2026-05-31)
- ✅ **v0.4.2 Unit Database 2.0 — Data Quality, Sub-factions & Integration** — Phases 108-111 (shipped 2026-06-01)
- ✅ **v0.4.5 Data Quality Audit & Pipeline Improvement** — Phases 112-115 (shipped 2026-06-03)
- ✅ **v0.4.7 Wahapedia Pipeline & Full Data Import** — Phases 116-120 (shipped 2026-06-09)
- 🚧 **v0.5.0 Settings & Preferences** — Phases 121-125 (in progress)

## Phases

### 🚧 v0.5.0 Settings & Preferences (In Progress)

**Milestone Goal:** Build a comprehensive Settings page with tabbed navigation centralizing app configuration, hobby defaults, data management shortcuts, and version info.

- [ ] **Phase 121: Settings Foundation** - app_settings table, query/hook layer, and tabbed UI shell
- [ ] **Phase 122: Preferences Tab** - language, currency, default faction, and points target settings
- [ ] **Phase 123: Hobby Defaults Tab** - customizable pipeline stages, pre-game checklist, and mission format
- [x] **Phase 124: Data Management Tab** - Data Health link, factory reset, preference export/import
- [ ] **Phase 125: About Tab** - app version, data stats, credits and attribution

## Phase Details

### Phase 121: Settings Foundation

**Goal**: Settings page has a working tabbed layout backed by persistent key-value storage
**Depends on**: Nothing (first phase of milestone)
**Requirements**: INF-01, INF-02, INF-03
**Success Criteria** (what must be TRUE):

  1. App launches with `app_settings` table created (migration runs without error on fresh install and existing installs)
  2. Settings page loads at `/settings` with three visible tabs (Preferences / Data / About)
  3. A setting value written via `useUpdateSetting` persists across app restarts
  4. React Query cache invalidates correctly after a setting mutation (UI reflects new value without manual refresh)

**Plans**: 2 plans
Plans:
**Wave 1**

- [x] 121-01-PLAN.md — Migration 044 + query module + React Query hooks (INF-01, INF-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 121-02-PLAN.md — Tabbed Settings page shell with placeholder content (INF-03)

**UI hint**: yes

### Phase 122: Preferences Tab

**Goal**: Users can configure their core app preferences and see them applied across the app
**Depends on**: Phase 121
**Requirements**: PREF-01, PREF-02, PREF-03, PREF-04
**Success Criteria** (what must be TRUE):

  1. User can switch language between EN and FR from Settings, and the DB browser locale toggle stays in sync
  2. User can pick a currency (EUR/GBP/USD/CAD/AUD/JPY), and the spending tracker displays amounts in the selected currency
  3. User can set a default faction that loads as the active faction on app startup (integrates with ActiveFactionContext)
  4. User can set a default army readiness points target (preset or custom), and the ArmyReadinessCard uses it on load

**Plans**: TBD
**UI hint**: yes

### Phase 123: Hobby Defaults Tab

**Goal**: Users can customize their hobby workflow defaults without editing code
**Depends on**: Phase 121
**Requirements**: HOB-01, HOB-02, HOB-03
**Success Criteria** (what must be TRUE):

  1. User can rename any of the 5 painting pipeline stage labels, and the new labels appear on the Dashboard pipeline, Collection filters, and Kanban columns
  2. User can add, remove, and reorder default pre-game checklist items, and new Game Day sessions start with the customized checklist
  3. User can set a default mission format, and new battle logs pre-fill with that format

**Plans**: 2 plans
Plans:
**Wave 1**

- [x] 123-01-PLAN.md — Stage label utility + Hobby Defaults editors + SettingsPage wiring + tests (HOB-01, HOB-02, HOB-03)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 123-02-PLAN.md — Wire consumers: HobbyPipeline labels, BattleLogSheet mission pre-fill, gameDayStore checklist defaults + tests (HOB-01, HOB-02, HOB-03)

**UI hint**: yes

### Phase 124: Data Management Tab

**Goal**: Users can manage their data health, reset the app, and transfer preferences between installs
**Depends on**: Phase 121
**Requirements**: DAT-01, DAT-02, DAT-03, DAT-04
**Success Criteria** (what must be TRUE):

  1. Data tab shows a clickable link that navigates to the Data Health page
  2. User can trigger a factory reset with multi-step confirmation (type confirmation text), and after reset the app restarts with a clean database
  3. User can export current preferences to a `.json` file via file picker
  4. User can import a previously exported preferences JSON file, and all settings update to the imported values

**Plans**: 2 plans
Plans:
**Wave 1** *(both plans run in parallel)*

- [x] 124-01-PLAN.md — Rust factory_reset Tauri command (DAT-02)
- [ ] 124-02-PLAN.md — DataManagementTab component + Settings page wiring + tests (DAT-01, DAT-02, DAT-03, DAT-04)

**UI hint**: yes

### Phase 125: About Tab

**Goal**: Users can see app identity, data provenance, and attribution at a glance
**Depends on**: Phase 121
**Requirements**: ABT-01, ABT-02, ABT-03
**Success Criteria** (what must be TRUE):

  1. About tab displays the current app version matching package.json/tauri.conf.json
  2. About tab shows data stats: total unit count, faction count, and Wahapedia data date
  3. About tab displays credits with Wahapedia attribution and tech stack information

**Plans**: 1 plan
Plans:
**Wave 1**

- [x] 125-01-PLAN.md — AboutTab component + integration + tests (ABT-01, ABT-02, ABT-03)

**UI hint**: yes

## Progress

**Execution Order:**
Phase 121 first (foundation), then 122 + 123 + 124 + 125 in parallel (all tabs independent after foundation)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 121. Settings Foundation | 2/2 | Complete   | 2026-06-10 |
| 122. Preferences Tab | 0/TBD | Not started | - |
| 123. Hobby Defaults Tab | 0/2 | Planned | - |
| 124. Data Management Tab | 1/2 | In Progress|  |
| 125. About Tab | 1/1 | Complete | 2026-06-10 |

---

<details>
<summary>✅ v0.4.7 Wahapedia Pipeline & Full Data Import (Phases 116-120) — SHIPPED 2026-06-09</summary>

- [x] Phase 116: Pipeline Foundation (2/2 plans) — completed 2026-06-04
- [x] Phase 117: Points Coverage (2/2 plans) — completed 2026-06-04
- [x] Phase 118: Detachments Import (2/2 plans) — completed 2026-06-04
- [x] Phase 119: Stratagems & Enhancements Import (2/2 plans) — completed 2026-06-04
- [x] Phase 120: UI Wiring (2/2 plans) — completed 2026-06-08

Full details: `.planning/milestones/v0.4.7-ROADMAP.md`

</details>

<details>
<summary>v0.4.5 Data Quality Audit & Pipeline Improvement (Phases 112-115) -- SHIPPED 2026-06-03</summary>

- [x] **Phase 112: Build Pipeline Hardening** (2/2 plans) -- completed 2026-06-02
- [x] **Phase 113: Priority Faction Data Audit** (2/2 plans) -- completed 2026-06-03
- [x] **Phase 114: Pipeline Fixes & Database Rebuild** (2/2 plans) -- completed 2026-06-03
- [x] **Phase 115: Sub-faction Filter Fix** (1/1 plans) -- completed 2026-06-03

Full details: `.planning/milestones/v0.4.5-ROADMAP.md`

</details>

<details>
<summary>v0.4.2 Unit Database 2.0 (Phases 108-111) -- SHIPPED 2026-06-01</summary>

- [x] Phase 108: Build Script Hardening & Schema Foundation (3/3 plans) -- completed 2026-06-01
- [x] Phase 109: Sub-faction Filter UI (2/2 plans) -- completed 2026-06-01
- [x] Phase 110: PlaybookTab & Game Day Revival (3/3 plans) -- completed 2026-06-01
- [x] Phase 111: Bilingual Infrastructure (3/3 plans) -- completed 2026-06-01

Full details: `.planning/milestones/v0.4.2-ROADMAP.md`

</details>

<details>
<summary>v0.4.0 Unit Database -- Canonical 40k Data Hub (Phases 103-107) -- SHIPPED 2026-05-31</summary>

- [x] Phase 103: Data Acquisition & Schema (3/3 plans) -- completed 2026-05-29
- [x] Phase 104: Database Browser UI (3/3 plans) -- completed 2026-05-30
- [x] Phase 105: Collection Integration (2/2 plans) -- completed 2026-05-30
- [x] Phase 106: Army List Simplification (2/2 plans) -- completed 2026-05-30
- [x] Phase 107: Cleanup & Pipeline (2/2 plans) -- completed 2026-05-31

Full details: `.planning/milestones/v0.4.0-ROADMAP.md`

</details>

---

*Previous milestone phases: see archived roadmaps in `.planning/milestones/`*
