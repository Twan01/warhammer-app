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
- 🚧 **v0.2.14 Backup 2.0 — Structured Export, Restore & Safety Backups** — Phases 79-83 (in progress)

## Phases

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
- [x] Phase 67: Game Day Integration (1/1 plan) — completed 2026-05-13

Full details: `.planning/milestones/v0.2.10-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.11 Foundation Hardening (Phases 68-72) — SHIPPED 2026-05-13</summary>

- [x] Phase 68: Infrastructure Quick Wins (2/2 plans) — completed 2026-05-13
- [x] Phase 69: Paintless Recipe Steps (1/1 plan) — completed 2026-05-13
- [x] Phase 70: Non-Destructive Recipe Save (2/2 plans) — completed 2026-05-13
- [x] Phase 71: Stable Session Section FK (2/2 plans) — completed 2026-05-13
- [x] Phase 72: Data-Layer Test Suite (2/2 plans) — completed 2026-05-13

Full details: `.planning/milestones/v0.2.11-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.13 Data Integrity, Diagnostics & Product Coherence (Phases 73-78) — SHIPPED 2026-05-15</summary>

- [x] Phase 73: Schema Foundation + Version Parity (2/2 plans) — completed 2026-05-14
- [x] Phase 74: Applied Recipe Identity Hardening (2/2 plans) — completed 2026-05-14
- [x] Phase 75: Transactional Recipe Graph Save (2/2 plans) — completed 2026-05-15
- [x] Phase 76: Points Resolver + Unit Rules Mapping + Split Warnings (2/2 plans) — completed 2026-05-15
- [x] Phase 77: Data Health Page + Backup/Export (2/2 plans) — completed 2026-05-15
- [x] Phase 78: Dashboard Command Center + Game Day After-Action (3/3 plans) — completed 2026-05-15

Full details: `.planning/milestones/v0.2.13-ROADMAP.md`

</details>

---

### 🚧 v0.2.14 Backup 2.0 — Structured Export, Restore & Safety Backups (In Progress)

**Milestone Goal:** Make HobbyForge safe to use long-term by giving the user a reliable way to export, restore, and protect their local data.

- [x] **Phase 79: Rust Backup Foundation** - zip crate + structured export command + validate command + safety backup command (Rust-first; unlocks all UI)
- [ ] **Phase 80: Export UI + Backup Status** - BackupCard upgrade, status indicators, export flow, dashboard integration
- [ ] **Phase 81: Restore Preview + Validation** - file picker, manifest validation, schema version checks, preview modal (non-destructive)
- [ ] **Phase 82: Restore Execution + Safety Backups** - atomic file swap, process restart, pre-sync safety backup, safety backup listing
- [ ] **Phase 83: Backup Diagnostics** - never-backed-up flag, staleness threshold, version mismatch detection, diagnostic detail disclosure

## Phase Details

### Phase 79: Rust Backup Foundation

**Goal**: The Rust backend can create structured backup zips, validate existing backups, and create safety backups — enabling all UI phases that follow
**Depends on**: Phase 78 (v0.2.13 complete)
**Requirements**: EXP-01, EXP-02, EXP-03, EXP-04, EXP-05, SAF-01, SAF-03
**Success Criteria** (what must be TRUE):

  1. Calling `create_structured_backup` from JS produces a .zip file at the chosen path containing hobbyforge.db (via VACUUM INTO) and metadata.json with app version, migration count, timestamp, and platform
  2. Backup filename defaults to `hobbyforge-backup-YYYY-MM-DD-HHMM.zip` format
  3. Calling `create_safety_backup` produces a .zip in the app data directory with an auto-generated timestamped name
  4. Calling `validate_backup` on a valid .zip returns parsed metadata without modifying any file
  5. A JS-triggered export returns success or a typed error message that the UI can display

**Plans**: 2 plans
Plans:

- [x] 79-01-PLAN.md — Dependencies + BackupManifest struct + shared helpers
- [x] 79-02-PLAN.md — Three Tauri commands + registration + smoke test

**UI hint**: no

### Phase 80: Export UI + Backup Status

**Goal**: Users can export a structured backup from the Data Health page and see live backup health status across the app
**Depends on**: Phase 79
**Requirements**: STS-01, STS-02, STS-03, STS-04
**Success Criteria** (what must be TRUE):

  1. The BackupCard on Data Health shows the last backup date as a human-readable age (e.g., "2 days ago") or "Never backed up"
  2. A health indicator (Healthy / Recommended / Overdue / Never) is visible on the BackupCard with appropriate color coding
  3. Clicking the export action opens a save dialog, runs the backup, and shows a success or error toast
  4. The DataHealthSummaryCard on the Dashboard reflects current backup status (healthy / needs attention)

**Plans**: 2 plans
Plans:
**Wave 1**

- [ ] 80-01-PLAN.md — Backup freshness utility + unit tests

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 80-02-PLAN.md — BackupCard migration + DataHealthSummaryCard update + test updates

**UI hint**: yes

### Phase 81: Restore Preview + Validation

**Goal**: Users can select a backup file and see a safe, informative preview of what will be restored before committing to anything destructive
**Depends on**: Phase 79
**Requirements**: RST-01, RST-02, RST-03, RST-04, RST-05, RST-09
**Success Criteria** (what must be TRUE):

  1. Clicking "Restore from backup" on Data Health opens a file picker filtered to .zip files
  2. After selecting a file, the app shows a preview card: backup date, app version, schema version, file size — no data has changed yet
  3. A backup with a schema version newer than the running app is rejected with a clear error message
  4. A backup with an older schema version shows a warning but allows the user to continue
  5. The restore cannot proceed past the preview without explicit user confirmation (e.g., a confirm button that names the destructive action)

**Plans**: 2 plans
Plans:

- [x] 81-01-PLAN.md — Rust get_schema_version command + BackupManifest TS type + formatBytes utility
- [ ] 81-02-PLAN.md — BackupCard restore button + RestorePreviewDialog + tests

**UI hint**: yes

### Phase 82: Restore Execution + Safety Backups

**Goal**: Users can complete a restore that atomically replaces the database and restarts the app, with automatic safety backups protecting against data loss before any risky operation
**Depends on**: Phase 81
**Requirements**: RST-06, RST-07, RST-08, SAF-02, SAF-04
**Success Criteria** (what must be TRUE):

  1. Confirming a restore automatically creates a safety backup of the current database before any file is touched
  2. The restore replaces hobbyforge.db atomically: WAL/SHM/journal sidecars are deleted, then the extracted db file is swapped in
  3. The app restarts after a successful restore and the Data Health page reflects the restored database state
  4. A safety backup is automatically created before every Wahapedia rules sync
  5. The Data Health page lists available safety backups with their timestamps and sizes

**Plans**: 2 plans
Plans:

- [ ] 80-01-PLAN.md — Backup freshness utility + unit tests
- [ ] 80-02-PLAN.md — BackupCard migration + DataHealthSummaryCard update + test updates

**UI hint**: yes

### Phase 83: Backup Diagnostics

**Goal**: The Data Health page surfaces actionable backup health problems without overwhelming users who have a recent backup
**Depends on**: Phase 80, Phase 82
**Requirements**: DGN-01, DGN-02, DGN-03, DGN-04
**Success Criteria** (what must be TRUE):

  1. A user who has never exported a backup sees a "Never backed up" diagnostic flag on Data Health
  2. A user whose last backup is older than the staleness threshold sees an "Overdue" flag with the backup age
  3. A user whose backup was created with a different app version sees a version mismatch warning
  4. Diagnostic detail (exact age, version numbers) is available on expansion but not displayed by default — users with a healthy backup see a clean green state

**Plans**: 2 plans
Plans:

- [ ] 80-01-PLAN.md — Backup freshness utility + unit tests
- [ ] 80-02-PLAN.md — BackupCard migration + DataHealthSummaryCard update + test updates

**UI hint**: yes

---

## Progress

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
| 80. Export UI + Backup Status | v0.2.14 | 0/TBD | Not started | - |
| 81. Restore Preview + Validation | v0.2.14 | 0/2 | Not started | - |
| 82. Restore Execution + Safety Backups | v0.2.14 | 0/TBD | Not started | - |
| 83. Backup Diagnostics | v0.2.14 | 0/TBD | Not started | - |

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
