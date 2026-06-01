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
- 🚧 **v0.4.2 Unit Database 2.0 — Data Quality, Sub-factions & Integration** — Phases 108-111 (in progress)

## Phases

<details>
<summary>✅ v0.4.0 Unit Database — Canonical 40k Data Hub (Phases 103-107) — SHIPPED 2026-05-31</summary>

- [x] Phase 103: Data Acquisition & Schema (3/3 plans) — completed 2026-05-29
- [x] Phase 104: Database Browser UI (3/3 plans) — completed 2026-05-30
- [x] Phase 105: Collection Integration (2/2 plans) — completed 2026-05-30
- [x] Phase 106: Army List Simplification (2/2 plans) — completed 2026-05-30
- [x] Phase 107: Cleanup & Pipeline (2/2 plans) — completed 2026-05-31

Full details: `.planning/milestones/v0.4.0-ROADMAP.md`

</details>

### 🚧 v0.4.2 Unit Database 2.0 — Data Quality, Sub-factions & Integration

**Milestone Goal:** Transform the canonical unit database from a standalone browser into a deeply integrated, high-quality data backbone — with near-100% points coverage, sub-faction filtering, French translation infrastructure, and full integration across Playbook, Game Day, army lists, and collection.

- [ ] **Phase 108: Build Script Hardening & Schema Foundation** - Deterministic builds, 85%+ points coverage, sub-faction column, bilingual columns, Rust import extended
- [ ] **Phase 109: Sub-faction Filter UI** - Chapter/sub-faction filters wired in database browser, army list picker, and collection browser
- [ ] **Phase 110: PlaybookTab & Game Day Revival** - Canonical stats/weapons/abilities in PlaybookTab; weapon profiles and stable OPG keys in Game Day
- [ ] **Phase 111: Bilingual Infrastructure** - EN/FR locale toggle, French data overlay, bilingual query layer, FR FTS5 search

## Phase Details

### Phase 108: Build Script Hardening & Schema Foundation
**Goal**: The canonical unit database has 85%+ points coverage and carries sub-faction + bilingual schema columns, all backed by a deterministic, diagnostic-rich build pipeline
**Depends on**: Phase 107 (v0.4.0 Cleanup & Pipeline)
**Requirements**: DQ-01, DQ-02, DQ-03, DQ-04, DQ-05, DQ-06, DQ-07, SF-01, SF-02, FR-01, FR-06
**Success Criteria** (what must be TRUE):
  1. Running the build script produces a per-faction coverage report showing units with/without points and the overall match rate
  2. Build output is byte-for-byte identical across machines — file reads are sorted before processing
  3. Points coverage reaches 85%+ across all factions (up from 37%), verified by the coverage report
  4. Data Health page shows per-faction points coverage badges (green/amber/red) so the user can spot low-coverage factions at a glance
  5. The `udb_units` table has `sub_faction` and `_fr` locale columns; the Rust import command handles `_fr` fields with `#[serde(default)]` so re-import does not wipe French data
**Plans**: 3 plans
Plans:
- [x] 108-01-PLAN.md — Shared lib extraction, determinism, normalization, aliases
- [x] 108-02-PLAN.md — Multi-pass matching, sub-faction mapping, coverage reporting
- [ ] 108-03-PLAN.md — Migration 041, Rust import extension, Data Health coverage UI

### Phase 109: Sub-faction Filter UI
**Goal**: Users can filter the database browser, army list unit picker, and collection browser by sub-faction (SM chapter, CSM warband, Aeldari sub-faction, etc.)
**Depends on**: Phase 108
**Requirements**: SF-03, SF-04, SF-05, SF-06
**Success Criteria** (what must be TRUE):
  1. The database browser shows a sub-faction dropdown when browsing a faction that has sub-factions; factions without sub-factions show no extra control
  2. The army list unit picker shows a sub-faction filter for applicable factions, narrowing the unit list correctly
  3. The collection browser shows a sub-faction filter for applicable factions
  4. Typing a chapter name (e.g., "Ultramarines") into the FTS5 search returns matching units via the indexed sub-faction field
**Plans**: 3 plans
Plans:
- [ ] 108-01-PLAN.md — Shared lib extraction, determinism, normalization, aliases
- [ ] 108-02-PLAN.md — Multi-pass matching, sub-faction mapping, coverage reporting
- [ ] 108-03-PLAN.md — Migration 041, Rust import extension, Data Health coverage UI
**UI hint**: yes

### Phase 110: PlaybookTab & Game Day Revival
**Goal**: Users see canonical unit stats, weapons, and abilities from the database in PlaybookTab and Game Day — replacing null stubs with live canonical data
**Depends on**: Phase 108
**Requirements**: INT-01, INT-02, INT-03, INT-04
**Success Criteria** (what must be TRUE):
  1. Opening a unit's PlaybookTab shows its canonical stat block (M/T/Sv/W/Ld/OC), weapon profiles, and ability text pulled from `udb_*` tables — no longer empty
  2. Game Day unit ability cards show a collapsible weapon profiles section sourced from the canonical database
  3. Once-per-game toggle state persists correctly across re-imports — keys are `unit_id:ability_name` composites, not reassignable AUTOINCREMENT IDs
  4. Army list validation uses canonical roles and keywords from `udb_*` for enhanced composition checks (BATTLELINE count, role coverage)
**Plans**: 3 plans
Plans:
- [ ] 108-01-PLAN.md — Shared lib extraction, determinism, normalization, aliases
- [ ] 108-02-PLAN.md — Multi-pass matching, sub-faction mapping, coverage reporting
- [ ] 108-03-PLAN.md — Migration 041, Rust import extension, Data Health coverage UI
**UI hint**: yes

### Phase 111: Bilingual Infrastructure
**Goal**: Users can toggle between English and French for all canonical data display; the build pipeline populates French fields from a manual overlay; search works in both languages
**Depends on**: Phase 108
**Requirements**: FR-02, FR-03, FR-04, FR-05
**Success Criteria** (what must be TRUE):
  1. Running the build script with a populated `scripts/data/translations_fr.json` writes French names and labels into the `_fr` columns of the bundled `unit_database.json`
  2. The query layer uses `COALESCE(col_fr, col)` when the active locale is FR, falling back to English for any untranslated entry — no empty cells shown
  3. An EN/FR locale toggle is visible in the app (persisted to localStorage); switching it changes all canonical data labels (faction names, unit names, ability names) to French
  4. Searching in FTS5 with a French unit name returns the correct unit — French names are indexed alongside English names
**Plans**: 3 plans
Plans:
- [ ] 108-01-PLAN.md — Shared lib extraction, determinism, normalization, aliases
- [ ] 108-02-PLAN.md — Multi-pass matching, sub-faction mapping, coverage reporting
- [ ] 108-03-PLAN.md — Migration 041, Rust import extension, Data Health coverage UI
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 108 → 109 → 110 → 111

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. App Shell | v0.1.1 | 4/4 | Complete | 2024-04-30 |
| 2. Data Layer + Entity CRUD | v0.1.1 | 4/4 | Complete | 2024-04-30 |
| 3. Collection Module | v0.1.1 | 5/5 | Complete | 2024-05-01 |
| 4. Painting Module | v0.1.1 | 5/5 | Complete | 2024-05-01 |
| 5. Dashboard | v0.1.1 | 4/4 | Complete | 2024-05-01 |
| 6. Foundation | v0.2.0 | 3/3 | Complete | 2024-05-01 |
| 7. Paint Inventory | v0.2.0 | 4/4 | Complete | 2024-05-02 |
| 8. Army List Builder | v0.2.0 | 4/4 | Complete | 2024-05-02 |
| 9. Unit Playbook | v0.2.0 | 5/5 | Complete | 2024-05-03 |
| 10. Theming Foundation | v0.2.1 | 3/3 | Complete | 2026-05-03 |
| 11. Dashboard Command Center | v0.2.1 | 4/4 | Complete | 2026-05-03 |
| 12. Collection Gallery View | v0.2.1 | 2/2 | Complete | 2026-05-04 |
| 13. Hobby Journal | v0.2.1 | 5/5 | Complete | 2026-05-04 |
| 14. Spending Tracker | v0.2.1 | 3/3 | Complete | 2026-05-04 |
| 15. 40K Datasheet Integration | v0.2.1 | 4/4 | Complete | 2026-05-04 |
| 16. Design Overhaul | v0.2.1 | 3/3 | Complete | 2026-05-04 |
| 20. v0.2.1 Polish & Gap Closure | v0.2.1 | 2/2 | Complete | 2026-05-04 |
| 17. Schema Foundation + Enrichment | v0.2.2 | 2/2 | Complete | 2026-05-04 |
| 18. Battle Log | v0.2.2 | 3/3 | Complete | 2026-05-04 |
| 19. Analytics Core | v0.2.2 | 3/3 | Complete | 2026-05-04 |
| 21. Wishlist | v0.2.2 | 2/2 | Complete | 2026-05-05 |
| 22. Hobby Goals | v0.2.2 | 3/3 | Complete | 2026-05-05 |
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
| 52. Schema + Data Layer Foundation | v0.2.8 | 3/3 | Complete | 2026-05-10 |
| 53. Rules Data Hub UI | v0.2.8 | 3/3 | Complete | 2026-05-11 |
| 54. Army Lists 2.0 — Detachment Selection | v0.2.8 | 2/2 | Complete | 2026-05-11 |
| 55. Playbook Enhancements — Favorites and Notes | v0.2.8 | 2/2 | Complete | 2026-05-11 |
| 56. Game Day Mode | v0.2.8 | 2/2 | Complete | 2026-05-11 |
| 57. Schema & Data Layer | v0.2.9 | 2/2 | Complete | 2026-05-12 |
| 58. Recipe Form & Timeline Display | v0.2.9 | 2/2 | Complete | 2026-05-12 |
| 59. Session Section Cascade | v0.2.9 | 2/2 | Complete | 2026-05-12 |
| 60. Kanban & CurrentFocus Integration | v0.2.9 | 2/2 | Complete | 2026-05-12 |
| 61. Recipe Workflow Hardening | v0.2.10 | 2/2 | Complete | 2026-05-13 |
| 62. Applied Recipe Data Layer | v0.2.10 | 2/2 | Complete | 2026-05-13 |
| 63. Applied Recipe UX | v0.2.10 | 3/3 | Complete | 2026-05-13 |
| 64. Applied Recipe Integrations | v0.2.10 | 3/3 | Complete | 2026-05-13 |
| 65. Points Import Pipeline | v0.2.10 | 3/3 | Complete | 2026-05-13 |
| 66. Army List Validation | v0.2.10 | 3/3 | Complete | 2026-05-13 |
| 67. Game Day Integration | v0.2.10 | 1/1 | Complete | 2026-05-13 |
| 68. Infrastructure Quick Wins | v0.2.11 | 2/2 | Complete | 2026-05-13 |
| 69. Paintless Recipe Steps | v0.2.11 | 1/1 | Complete | 2026-05-13 |
| 70. Non-Destructive Recipe Save | v0.2.11 | 2/2 | Complete | 2026-05-13 |
| 71. Stable Session Section FK | v0.2.11 | 2/2 | Complete | 2026-05-13 |
| 72. Data-Layer Test Suite | v0.2.11 | 2/2 | Complete | 2026-05-13 |
| 73. Schema Foundation + Version Parity | v0.2.13 | 2/2 | Complete | 2026-05-14 |
| 74. Applied Recipe Identity Hardening | v0.2.13 | 2/2 | Complete | 2026-05-14 |
| 75. Transactional Recipe Graph Save | v0.2.13 | 2/2 | Complete | 2026-05-15 |
| 76. Points Resolver + Unit Rules Mapping | v0.2.13 | 2/2 | Complete | 2026-05-15 |
| 77. Data Health Page + Backup/Export | v0.2.13 | 2/2 | Complete | 2026-05-15 |
| 78. Dashboard Command Center + After-Action | v0.2.13 | 3/3 | Complete | 2026-05-15 |
| 79. Rust Backup Foundation | v0.2.14 | 2/2 | Complete | 2026-05-18 |
| 80. Export UI + Backup Status | v0.2.14 | 2/2 | Complete | 2026-05-18 |
| 81. Restore Preview + Validation | v0.2.14 | 2/2 | Complete | - |
| 82. Restore Execution + Safety Backups | v0.2.14 | 3/3 | Complete | 2026-05-19 |
| 83. Backup Diagnostics | v0.2.14 | 2/2 | Complete | 2026-05-19 |
| 84. Data Layer + Early Tests | v0.2.15 | 2/2 | Complete | 2026-05-19 |
| 85. Core Execution UI | v0.2.15 | 3/3 | Complete | 2026-05-19 |
| 86. Shell, Route & Keyboard Shortcuts | v0.2.15 | 2/2 | Complete | 2026-05-19 |
| 87. Session Integration + Entry Points | v0.2.15 | 2/2 | Complete | 2026-05-19 |
| 88. Polish + Test Coverage | v0.2.15 | 2/2 | Complete | 2026-05-20 |
| 89. Schema + Data Layer | v0.2.18 | 2/2 | Complete | 2026-05-20 |
| 90. Loadout Builder | v0.2.18 | 2/2 | Complete | 2026-05-20 |
| 91. Enhancement Assignment | v0.2.18 | 2/2 | Complete | 2026-05-22 |
| 92. Leader Attachment | v0.2.18 | 2/2 | Complete | 2026-05-22 |
| 93. Datasheet Browser + Ghost Units | v0.2.18 | 2/2 | Complete | 2026-05-22 |
| 94. List Export | v0.2.18 | 2/2 | Complete | 2026-05-21 |
| 95. Version Snapshots | v0.2.18 | 2/2 | Complete | 2026-05-22 |
| 96. Database Hardening | v0.3.0 | 1/1 | Complete | 2026-05-22 |
| 97. Error Resilience | v0.3.0 | 2/2 | Complete | 2026-05-22 |
| 98. Performance Optimization | v0.3.0 | 3/3 | Complete | 2026-05-22 |
| 99. Architecture Cleanup | v0.3.0 | 3/3 | Complete | 2026-05-22 |
| 100. Query-Layer Automation | v0.3.7 | 2/2 | Complete | 2026-05-28 |
| 101. Battle-Readiness Pure Function & Unit Picker | v0.3.7 | 2/2 | Complete | 2026-05-28 |
| 102. Smart Context Pre-Filling | v0.3.7 | 2/2 | Complete | 2026-05-28 |
| 103. Data Acquisition & Schema | v0.4.0 | 3/3 | Complete | 2026-05-29 |
| 104. Database Browser UI | v0.4.0 | 3/3 | Complete | 2026-05-30 |
| 105. Collection Integration | v0.4.0 | 2/2 | Complete | 2026-05-30 |
| 106. Army List Simplification | v0.4.0 | 2/2 | Complete | 2026-05-30 |
| 107. Cleanup & Pipeline | v0.4.0 | 2/2 | Complete | 2026-05-31 |
| 108. Build Script Hardening & Schema Foundation | v0.4.2 | 2/3 | In Progress | - |
| 109. Sub-faction Filter UI | v0.4.2 | 0/? | Not started | - |
| 110. PlaybookTab & Game Day Revival | v0.4.2 | 0/? | Not started | - |
| 111. Bilingual Infrastructure | v0.4.2 | 0/? | Not started | - |

<details>
<summary>✅ v0.2.14 Backup 2.0 (Phases 79-83) — SHIPPED 2026-05-19</summary>

- [x] Phase 79: Rust Backup Foundation (2/2 plans) — completed 2026-05-18
- [x] Phase 80: Export UI + Backup Status (2/2 plans) — completed 2026-05-18
- [x] Phase 81: Restore Preview + Validation (2/2 plans) — completed 2026-05-18
- [x] Phase 82: Restore Execution + Safety Backups (3/3 plans) — completed 2026-05-19
- [x] Phase 83: Backup Diagnostics (2/2 plans) — completed 2026-05-19

Full details: `.planning/milestones/v0.2.14-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.8 Rules Data Hub UI / Army Lists 2.0 / Game Day (Phases 52-56) — SHIPPED 2026-05-11</summary>

- [x] Phase 52: Schema + Data Layer Foundation (3/3 plans) — completed 2026-05-10
- [x] Phase 53: Rules Data Hub UI (3/3 plans) — completed 2026-05-11
- [x] Phase 54: Army Lists 2.0 — Detachment Selection (2/2 plans) — completed 2026-05-11
- [x] Phase 55: Playbook Enhancements — Favorites and Notes (2/2 plans) — completed 2026-05-11
- [x] Phase 56: Game Day Mode (2/2 plans) — completed 2026-05-11

Full details: `.planning/milestones/v0.2.8-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.9 Recipes 3.1 / Workflow Semantics & Integrations (Phases 57-60) — SHIPPED 2026-05-12</summary>

- [x] Phase 57: Schema & Data Layer - Migration + types + queries for workflow metadata columns and session section linking
- [x] Phase 58: Recipe Form & Timeline Display - Workflow metadata editing with progressive disclosure and compact timeline badges (2/2 plans) — completed 2026-05-12
- [x] Phase 59: Session Section Cascade - LogSessionSheet 3-level cascading selector (recipe -> section -> step) (2/2 plans) — completed 2026-05-12
- [x] Phase 60: Kanban & CurrentFocus Integration - Section-aware workflow display on project cards and dashboard focus (2/2 plans) — completed 2026-05-12

Full details: `.planning/milestones/v0.2.9-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.10 Applied Recipes, Points Import & List Validation (Phases 61-67) — SHIPPED 2026-05-13</summary>

- [x] Phase 61: Recipe Workflow Hardening (2/2 plans) — completed 2026-05-13
- [x] Phase 62: Applied Recipe Data Layer (2/2 plans) — completed 2026-05-13
- [x] Phase 63: Applied Recipe UX (3/3 plans) — completed 2026-05-13
- [x] Phase 64: Applied Recipe Integrations (3/3 plans) — completed 2026-05-13
- [x] Phase 65: Points Import Pipeline (3/3 plans) — completed 2026-05-13
- [x] Phase 66: Army List Validation (3/3 plans) — completed 2026-05-13
- [x] Phase 67: Game Day Integration (1/1 plans) — completed 2026-05-13

Full details: `.planning/milestones/v0.2.10-ROADMAP.md`

</details>

<details>
<summary>✅ v0.1.1 HobbyForge MVP (Phases 1-5) — SHIPPED 2024-05-01</summary>

- [x] Phase 1: App Shell — Tauri + React desktop app launches with sidebar, routing, SQLite plumbing, dark mode, and all shadcn components installed (completed 2024-04-30)
- [x] Phase 2: Data Layer + Entity CRUD — Full 10-table schema, FK enforcement, seed data, and CRUD for factions / units / paints (completed 2024-04-30)
- [x] Phase 3: Collection Module — Searchable, filterable unit table with detail drawer, inline status updates, progress bars, and full create/edit/delete UX including all cross-cutting polish patterns (completed 2024-05-01)
- [x] Phase 4: Painting Module — Active painting projects Kanban (status columns, card actions, mark active) plus full recipe CRUD with paint linkage and owned/missing paint indicator (completed 2024-05-01)
- [x] Phase 5: Dashboard — Full dashboard with global stat cards, faction summary cards, painting/assembly/basing percentages, active projects list, and recently updated units (completed 2024-05-01)

Full details: `.planning/milestones/v0.1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.0 Utility Layer (Phases 6-9) — SHIPPED 2024-05-03</summary>

- [x] **Phase 6: Foundation** — Schema migration 004, TypeScript types for all v0.2.0 features, query modules (armyLists.ts, strategyNotes.ts), hook modules with DATA-09 forward-compat invalidation, 38 automated tests
- [x] **Phase 7: Paint Inventory** — PaintsPage at `/paints` with brand/type/color-family multi-select filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge with navigation to `/recipes?paintId=X`, inline owned toggle with optimistic update
- [x] **Phase 8: Army List Builder** — ArmyListsPage, ArmyListDetailSheet, unit picker, COALESCE-in-SQL points calculation, battle-ready %, pre-delete unit check, sibling portal architecture confirmed
- [x] **Phase 9: Unit Playbook** — PlaybookTab inside shadcn Tabs with 6-field stats block (M/T/Sv/W/Ld/OC, suffix display, pencil edit mode), abilities/keywords, 8 strategy note fields in fixed order, dirty-state Save with toasts, SQLite persistence round-tripped in live app

Full details: `.planning/milestones/v0.2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.1 Visual Command (Phases 10-16 + 20) — SHIPPED 2026-05-04</summary>

- [x] Phase 10: Theming Foundation (completed 2026-05-03)
- [x] Phase 11: Dashboard Command Center (completed 2026-05-03)
- [x] Phase 12: Collection Gallery View (completed 2026-05-04)
- [x] Phase 13: Hobby Journal (completed 2026-05-04)
- [x] Phase 14: Spending Tracker (completed 2026-05-04)
- [x] Phase 15: 40K Datasheet Integration (completed 2026-05-04)
- [x] Phase 16: Design Overhaul (completed 2026-05-04)
- [x] Phase 20: v0.2.1 Polish & Gap Closure (completed 2026-05-04)

Full details: `.planning/milestones/v0.2.1-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.2 Full Circle (Phases 17-19, 21-24, 35) — SHIPPED 2026-05-05</summary>

- [x] Phase 17: Schema Foundation + Enrichment (completed 2026-05-04)
- [x] Phase 18: Battle Log (completed 2026-05-04)
- [x] Phase 19: Analytics Core (completed 2026-05-04)
- [x] Phase 21: Wishlist (completed 2026-05-05)
- [x] Phase 22: Hobby Goals (completed 2026-05-05)
- [x] Phase 23: Display Features (completed 2026-05-05)
- [x] Phase 24: Unit Point Calculator (completed 2026-05-05)
- [x] Phase 35: v0.2.2 Gap Closure (completed 2026-05-05)

Full details: `.planning/milestones/v0.2.2-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.3 Hobby Command Center (Phases 25-29) — SHIPPED 2026-05-05</summary>

- [x] Phase 25: Design Foundation (2/2 plans) — completed 2026-05-04
- [x] Phase 26: Dashboard Redesign (5/5 plans) — completed 2026-05-05
- [x] Phase 27: Navigation & Quick Add (4/4 plans) — completed 2026-05-05
- [x] Phase 28: Collection + Projects (5/5 plans) — completed 2026-05-05
- [x] Phase 29: Workshop + Play (5/5 plans) — completed 2026-05-05

Full details: `.planning/milestones/v0.2.3-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.4 Premium Dashboard UX & Visual Polish (Phases 30-34, 36) — SHIPPED 2026-05-06</summary>

- [x] Phase 30: Grid Layout Foundation (completed 2026-05-06)
- [x] Phase 31: Focus & Projects Panels (completed 2026-05-06)
- [x] Phase 32: Army Readiness Card (completed 2026-05-06)
- [x] Phase 33: Data Intelligence (completed 2026-05-06)
- [x] Phase 34: Visual Polish (completed 2026-05-06)
- [x] Phase 36: v0.2.4 Gap Closure (completed 2026-05-06)

Full details: `.planning/milestones/v0.2.4-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.5 Recipes 2.0 / Painting Studio (Phases 37-41) — SHIPPED 2026-05-07</summary>

- [x] Phase 37: Schema Foundation + Pre-flight Fixes (2/2 plans) — completed 2026-05-07
- [x] Phase 38: Structured Step Input (2/2 plans) — completed 2026-05-07
- [x] Phase 39: Studio UX + Paint Availability (3/3 plans) — completed 2026-05-07
- [x] Phase 40: Recipe Actions + Step Photos (3/3 plans) — completed 2026-05-07
- [x] Phase 41: Session Integration (2/2 plans) — completed 2026-05-07

Full details: `.planning/milestones/v0.2.5-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.6 Rules Sync 2.0 / Rules Data Hub (Phases 42-47) — SHIPPED 2026-05-08</summary>

- [x] Phase 42: Architecture Audit (1/1 plans) — completed 2026-05-08
- [x] Phase 43: Extended Rules Read Layer (2/2 plans) — completed 2026-05-08
- [x] Phase 44: Sync Pipeline Hardening (2/2 plans) — completed 2026-05-08
- [x] Phase 45: Sync Metadata & Import Tracking (2/2 plans) — completed 2026-05-08
- [x] Phase 46: Manual Overrides & Version Comparison (2/2 plans) — completed 2026-05-08
- [x] Phase 47: v0.2.6 Gap Closure (2/2 plans) — completed 2026-05-08

Full details: `.planning/milestones/v0.2.6-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.7 Recipes 3.0 / Hierarchical Painting Workflows (Phases 48-51) — SHIPPED 2026-05-08</summary>

- [x] Phase 48: Section Data Layer (2/2 plans) — completed 2026-05-08
- [x] Phase 49: Section Read UI (1/1 plans) — completed 2026-05-08
- [x] Phase 50: Section Form UI (3/3 plans) — completed 2026-05-08
- [x] Phase 51: Duplication + Integration Polish (2/2 plans) — completed 2026-05-08

Full details: `.planning/milestones/v0.2.7-ROADMAP.md`

</details>
