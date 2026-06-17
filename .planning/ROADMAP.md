# Roadmap: HobbyForge

## Milestones

- â **v0.1.1 HobbyForge MVP** â Phases 1-5 (shipped 2024-05-01)
- â **v0.2.0 Utility Layer** â Phases 6-9 (shipped 2024-05-03)
- â **v0.2.1 Visual Command** â Phases 10-16 + 20 (shipped 2026-05-04)
- â **v0.2.2 Full Circle** â Phases 17-19, 21-24, 35 (shipped 2026-05-05)
- â **v0.2.3 Hobby Command Center** â Phases 25-29 (shipped 2026-05-05)
- â **v0.2.4 Premium Dashboard UX & Visual Polish** â Phases 30-34, 36 (shipped 2026-05-06)
- â **v0.2.5 Recipes 2.0 / Painting Studio** â Phases 37-41 (shipped 2026-05-07)
- â **v0.2.6 Rules Sync 2.0 / Rules Data Hub** â Phases 42-47 (shipped 2026-05-08)
- â **v0.2.7 Recipes 3.0 / Hierarchical Painting Workflows** â Phases 48-51 (shipped 2026-05-08)
- â **v0.2.8 Rules Data Hub UI / Army Lists 2.0 / Game Day** â Phases 52-56 (shipped 2026-05-11)
- â **v0.2.9 Recipes 3.1 / Workflow Semantics & Integrations** â Phases 57-60 (shipped 2026-05-12)
- â **v0.2.10 Applied Recipes, Points Import & List Validation** â Phases 61-67 (shipped 2026-05-13)
- â **v0.2.11 Foundation Hardening** â Phases 68-72 (shipped 2026-05-13)
- â **v0.2.13 Data Integrity, Diagnostics & Product Coherence** â Phases 73-78 (shipped 2026-05-15)
- â **v0.2.14 Backup 2.0 â Structured Export, Restore & Safety Backups** â Phases 79-83 (shipped 2026-05-19)
- â **v0.2.15 Painting Mode** â Phases 84-88 (shipped 2026-05-20)
- â **v0.2.18 Army Lists 3.0 â Smart List Builder** â Phases 89-95 (shipped 2026-05-22)
- â **v0.3.0 Robustness & Architecture Hardening** â Phases 96-99 (shipped 2026-05-22)
- â **v0.3.7 Smart Automation** â Phases 100-102 (shipped 2026-05-28)
- â **v0.4.0 Unit Database â Canonical 40k Data Hub** â Phases 103-107 (shipped 2026-05-31)
- â **v0.4.2 Unit Database 2.0 â Data Quality, Sub-factions & Integration** â Phases 108-111 (shipped 2026-06-01)
- â **v0.4.5 Data Quality Audit & Pipeline Improvement** â Phases 112-115 (shipped 2026-06-03)
- â **v0.4.7 Wahapedia Pipeline & Full Data Import** â Phases 116-120 (shipped 2026-06-09)
- â **v0.5.0 Settings & Preferences** â Phases 121-125 (shipped 2026-06-11)
- â **v0.5.2 UX Polish & Consistency** â Phases 126-129 (shipped 2026-06-12)
- ð¨ **v0.6.0 Bulletproof & Honest** â Phases 130-139 (in progress)

## Phases

### v0.6.0 Bulletproof & Honest (Phases 130-139) â IN PROGRESS

**Milestone Goal:** Make every update launch reliably and guard it with CI, stop the UI from showing untrue/dead state, then add the highest-value player-journey capabilities and broaden data quality â in that priority order (Theme A â B â C â D).

**Granularity:** standard Â· **Coverage:** 27/27 requirements mapped

> **Sequencing law:** Theme A (Phases 130â132) must land **and merge to `master`** â CI gate green + ONE verified real in-place NSIS update â **before** any Theme-B refactor begins. The reliability fix on `fix/update-breaks-app-launch` and the large refactors (HON-09, HON-08) must not coexist in-flight.

- [ ] **Phase 130: Migration Parity & Release Gate** (0/2 plans) â Self-deriving migration list + single parity check that makes the red test green and guards against checksum drift
- [ ] **Phase 131: CI Test Gate** (0/2 plans) — PR-triggered CI runs the full suite and a tag can never publish on red
- [ ] **Phase 132: Update Trustworthiness** (0/4 plans) â A real in-place NSIS update launches, relaunches, and leaves a diagnosable log trail (Theme A merges to master here)
- [ ] **Phase 133: Honest Data Provenance** (0/2 plans) â Remove the fake "stale/sync" UI and replace it with a truthful build-version surface
- [ ] **Phase 134: No Dead Ends** (0/2 plans) â Shared Abilities tab shows real data; "Link unit" always leads somewhere
- [ ] **Phase 135: Faction & Navigation Consolidation** (0/? plans) â Zero-data-loss faction consolidation, the redundant /factions page retired, Data Health folded into Settings
- [ ] **Phase 136: Code Honesty & Decomposition** (0/? plans) â One shared WeaponTable, a decomposed ArmyListDetailPage, hooks restored, the vestigial column resolved
- [ ] **Phase 137: Canonical Leader Attachment** (0/? plans) â Leader-target data ships through the canonical pipeline and the builder validates real attachment pairs
- [ ] **Phase 138: Player-Journey Depth** (0/? plans) â Side-by-side unit comparison, the Collection â Unit Database loop, and goals surfaced on the dashboard
- [ ] **Phase 139: Data Quality at Scale** (0/? plans) â Pipeline FK/orphan validation, all 25 factions audited, French translations extended

## Phase Details

### Phase 130: Migration Parity & Release Gate
**Goal**: The build refuses to proceed unless every representation of the schema version agrees, and the migration list can never drift again.
**Depends on**: Nothing (first phase; foundation of Theme A)
**Requirements**: REL-03, REL-04, REL-05
**Success Criteria** (what must be TRUE):
  1. `pnpm test tests/data-layer/migration-parity.test.ts` passes (the currently-RED 046â047 gap is closed) and the wargear schema (047) is exercised by the data-layer suite.
  2. The data-layer migration list is derived from disk (`readdirSync` of `src-tauri/migrations/`), so adding a new migration never re-breaks the parity test.
  3. Running `pnpm check:version` fails when `package.json` version â  `tauri.conf.json` version, or when migration file count â  lib.rs `Migration{}` count â  data-layer migration-list length.
  4. The release gate fails if any `src-tauri/migrations/*.sql` file contains a CR byte.
**Plans**: 2 plans
- [x] 130-01-PLAN.md â Disk-derive the data-layer migration list (REL-03) + assert the 047 wargear schema; turns the RED parity test green
- [x] 130-02-PLAN.md â Extend check-version.mjs into the single release gate (version + migration-count + CR-byte) and wire it via a prebuild hook (REL-04, REL-05)

### Phase 131: CI Test Gate
**Goal**: A failing test or build can never reach the updater; CI is the wall every change passes through.
**Depends on**: Phase 130 (the suite must be green before a blocking gate is switched on, or CI red-fails on first run)
**Requirements**: REL-01, REL-02
**Success Criteria** (what must be TRUE):
  1. Opening a pull request runs `pnpm test` + `cargo test` + `pnpm build` and blocks merge on any failure.
  2. The release workflow cannot publish a GitHub Release / `latest.json` unless the CI test job passed (`release.yml` `needs: test`).
  3. The release job pins the Rust toolchain rather than floating it, so CI-green is not undone by a compiler delta.
**Plans**: 2 plans
- [x] 131-01-PLAN.md — Create rust-toolchain.toml pin + reusable ci.yml (pnpm test + cargo test + pnpm build on PR)
- [x] 131-02-PLAN.md — Restructure release.yml (needs: test + pinned toolchain) + document branch protection (manual checkpoint)

### Phase 132: Update Trustworthiness
**Goal**: Installing an update over an existing install launches into the new version with no manual step, and a broken launch is diagnosable without devtools. **Theme A merges to `master` at the end of this phase.**
**Depends on**: Phase 131 (verification only matters once the gate is green)
**Requirements**: REL-06, REL-07, REL-08
**Success Criteria** (what must be TRUE):
  1. A real two-build in-place NSIS update (local `latest.json`) is performed end-to-end: the updated app launches, existing `%APPDATA%` data is preserved, and `preflight.log` records the repair/consistency outcome.
  2. After an update downloads and installs, the app relaunches into the new version without a manual restart.
  3. Frontend errors and failed-launch conditions are written to a persistent, size-capped `frontend.log` alongside `preflight.log`.
**Plans**: 4 plans
  - [x] 132-01-PLAN.md — frontend.log diagnostics: append_frontend_log command + size-cap + wire error/boot-failure handlers (REL-08)
  - [x] 132-02-PLAN.md — auto-relaunch after install + explicit installMode passive + manual fallback (REL-07)
  - [x] 132-03-PLAN.md — local two-build update tooling + manual REL-06 NSIS verification runbook (REL-06)
  - [ ] 132-04-PLAN.md — full gate (test/cargo/build + CI green) + gated Theme A → master merge (D-11)

### Phase 133: Honest Data Provenance
**Goal**: No UI tells the user that bundled data is stale or that they should "sync" â the app states truthfully what data it carries.
**Depends on**: Phase 132 (Theme A merged to master)
**Requirements**: HON-01, HON-02
**Success Criteria** (what must be TRUE):
  1. `StaleDataBanner` and the dead "stale points" dashboard branches are gone, replaced by an honest data-provenance/version surface based on the build's content hash.
  2. No UI offers a "sync" or "refresh data" action (the deliberate offline architecture is preserved).
  3. All former `syncFreshness` consumers compile cleanly (`pnpm build` green) with no dead branches, dangling imports, or unused exports â and any *real* backup-staleness warning is preserved, not conflated with the fake sync staleness.
**Plans**: 2 plans
  - [x] 133-01-PLAN.md — warnings-layer signature cut: remove threaded freshness from computeUnitWarnings + 4 components/tests (HON-02)
  - [x] 133-02-PLAN.md — honest provenance UI + delete syncFreshness.ts/StaleDataBanner + finish tests; preserve backup warning (HON-01)

### Phase 134: No Dead Ends
**Goal**: Every datasheet surface the user reaches leads somewhere real â no empty stub tabs, no permanent dead-end buttons.
**Depends on**: Phase 133
**Requirements**: HON-03, HON-04
**Success Criteria** (what must be TRUE):
  1. The Rules Hub "Shared Abilities" tab displays real faction shared/army-rule abilities from the canonical database (no empty stub).
  2. A unit's datasheet "Link unit" action always leads to a way to link/match the unit against the canonical Unit Database â it is never a permanent dead end.
**Plans**: 2 plans
  - [x] 134-01-PLAN.md — HON-03: swap the empty Shared Abilities stub for useDetachmentAbilities + adapter; honest empty states
  - [x] 134-02-PLAN.md — HON-04: remove the disabled Link-unit gate; CollectionFactionLinkDialog maps the faction; DatasheetPicker browse-all fallback
**UI hint**: yes

### Phase 135: Faction & Navigation Consolidation
**Goal**: Faction management lives in one coherent home with zero data loss, and the sidebar stops carrying redundant destinations.
**Depends on**: Phase 134
**Requirements**: HON-05, HON-06, HON-07
**Success Criteria** (what must be TRUE):
  1. A **map-not-delete** migration consolidates user factions into the canonical faction model preserving every FK reference â units, army_lists, painting_sessions, wishlist, and `default_faction_id` theming â with zero data loss verified (every existing unit still resolves its faction, theming still loads cold, wishlist counts unchanged).
  2. The standalone `/factions` sidebar page is removed, and faction create/edit/theming remains reachable from its new home with no loss of capability.
  3. Data Health is moved out of the main sidebar into Settings â Data.
**Plans**: 4 plans
  - [x] 132-01-PLAN.md — frontend.log diagnostics: append_frontend_log command + size-cap + wire error/boot-failure handlers (REL-08)
  - [x] 132-02-PLAN.md — auto-relaunch after install + explicit installMode passive + manual fallback (REL-07)
  - [ ] 132-03-PLAN.md — local two-build update tooling + manual REL-06 NSIS verification runbook (REL-06)
  - [ ] 132-04-PLAN.md — full gate (test/cargo/build + CI green) + gated Theme A → master merge (D-11)
**Notes**: HON-05 is the data-loss trap of the milestone (FK semantics: units RESTRICT, army_lists/sessions SET NULL, wishlist CASCADE). Treat the migration as its own careful, verified step â do NOT bundle the route removal (HON-06) in a way that risks data.
**UI hint**: yes

### Phase 136: Code Honesty & Decomposition
**Goal**: The army-list and datasheet code is honest about its architecture â one shared weapon table, focused files, and every component going through hooks.
**Depends on**: Phase 135 (Theme A merged; freshness removed in 133 simplifies the ArmyListDetailPage extraction)
**Requirements**: HON-08, HON-09, HON-10, HON-11
**Success Criteria** (what must be TRUE):
  1. `WeaponTable` is a single shared component (duplicate `UdbWeaponsTable` eliminated) consumed by all datasheet/weapon surfaces, rendering identically (EN and FR) everywhere.
  2. `ArmyListDetailPage` is decomposed into focused sub-components/hooks within the project's file-size conventions, with no behavior regression.
  3. The 7 components that call query functions directly are routed through React Query hooks, restoring cache and invalidation guarantees with no hook-in-loop or N+1 regressions.
  4. The vestigial `promoted_to_reminder` column is removed, or its retention is explicitly justified in the schema.
**Plans**: 4 plans
  - [x] 132-01-PLAN.md — frontend.log diagnostics: append_frontend_log command + size-cap + wire error/boot-failure handlers (REL-08)
  - [ ] 132-02-PLAN.md — auto-relaunch after install + explicit installMode passive + manual fallback (REL-07)
  - [ ] 132-03-PLAN.md — local two-build update tooling + manual REL-06 NSIS verification runbook (REL-06)
  - [ ] 132-04-PLAN.md — full gate (test/cargo/build + CI green) + gated Theme A → master merge (D-11)
**Notes**: HON-08 (shared WeaponTable) GATES PLAY-01 (comparison consumes it). Do the decomposition (HON-09) as mechanical block-moves only, after the reliability branch has merged (Theme A done).
**UI hint**: yes

### Phase 137: Canonical Leader Attachment
**Goal**: Leader attachment in the army-list builder validates against real canonical attachment pairs instead of fragile name matching.
**Depends on**: Phase 136 (army-list table extraction lands first so the leader-target shape is written once)
**Requirements**: PLAY-02, PLAY-03
**Success Criteria** (what must be TRUE):
  1. A `udb_leader_targets` table (composite PK, both columns FK â `udb_units` ON DELETE CASCADE) is created and populated from Wahapedia `Datasheets_leader.csv` via the canonical build â bundled JSON â Rust import pipeline.
  2. Leader attachment in the builder permits only valid leaderâtarget pairs via the FK join (the Phase-92 UI repointed off name-matching), with a graceful fallback for units that have a NULL `udb_unit_id`.
  3. Adding migration 048 re-triggers the Phase-130 parity gate and it passes (proving the gate works on a real new migration).
**Plans**: 4 plans
  - [ ] 132-01-PLAN.md — frontend.log diagnostics: append_frontend_log command + size-cap + wire error/boot-failure handlers (REL-08)
  - [ ] 132-02-PLAN.md — auto-relaunch after install + explicit installMode passive + manual fallback (REL-07)
  - [ ] 132-03-PLAN.md — local two-build update tooling + manual REL-06 NSIS verification runbook (REL-06)
  - [ ] 132-04-PLAN.md — full gate (test/cargo/build + CI green) + gated Theme A → master merge (D-11)
**Notes**: PLAY-02 (migration 048 + pipeline) GATES PLAY-03 (validation UI rewire). The new migration re-triggers the REL-04 parity gate â this is expected/good.
**UI hint**: yes

### Phase 138: Player-Journey Depth
**Goal**: The user can compare units side by side, see what they own straight from the database, and watch goal progress on the dashboard.
**Depends on**: Phase 137 (comparison reuses the deduped WeaponTable from Phase 136; this phase groups the remaining player-journey features)
**Requirements**: PLAY-01, PLAY-04, PLAY-05
**Success Criteria** (what must be TRUE):
  1. The user can compare 2â3 unit datasheets side-by-side (stats, weapons, abilities, keywords, points) with differences highlighted; comparison reuses the shared `WeaponTable` and fetches all units in one batched query (no hooks-in-loop / N+1).
  2. The Collection â Unit Database loop is bidirectional: from the Collection the user opens a canonical datasheet and adds units; from the Unit Database the user sees an "owned ÃN" count per unit (via a single page-level Map lookup).
  3. Hobby goal progress is surfaced on the dashboard with a progress visualization, after verifying the goal-progress derivation still computes correctly post-rules.db-elimination.
**Plans**: 4 plans
  - [ ] 132-01-PLAN.md — frontend.log diagnostics: append_frontend_log command + size-cap + wire error/boot-failure handlers (REL-08)
  - [ ] 132-02-PLAN.md — auto-relaunch after install + explicit installMode passive + manual fallback (REL-07)
  - [ ] 132-03-PLAN.md — local two-build update tooling + manual REL-06 NSIS verification runbook (REL-06)
  - [ ] 132-04-PLAN.md — full gate (test/cargo/build + CI green) + gated Theme A → master merge (D-11)
**Notes**: PLAY-01 consumes the shared WeaponTable from HON-08 (Phase 136). Verify PLAY-05's goal-progress derivation before building the visualization.
**UI hint**: yes

### Phase 139: Data Quality at Scale
**Goal**: The canonical data is verifiably correct, broadly accurate across all factions, and the pipeline refuses to ship referential garbage.
**Depends on**: Phase 138 (independent of Theme C; sequenced last as the heaviest body of work)
**Requirements**: DAT-01, DAT-02, DAT-03
**Success Criteria** (what must be TRUE):
  1. The build/data pipeline validates referential integrity (FK/orphan checks â `PRAGMA foreign_key_check`, orphan `sub_faction`, orphan leader-target pairs) and **fails the build on violations**, covered by data-layer tests.
  2. All 25 factions' unit data (points, stats, weapons, abilities, keywords) is audited against Wahapedia and corrected (the 22 factions beyond the already-audited SM/NEC/DG).
  3. French ability and weapon descriptions are added for the audited factions, extending the existing `_fr` overlay (`COALESCE(col_fr, col)` query layer), with user overrides and favorites/notes preserved across the re-import.
**Plans**: 4 plans
  - [ ] 132-01-PLAN.md — frontend.log diagnostics: append_frontend_log command + size-cap + wire error/boot-failure handlers (REL-08)
  - [ ] 132-02-PLAN.md — auto-relaunch after install + explicit installMode passive + manual fallback (REL-07)
  - [ ] 132-03-PLAN.md — local two-build update tooling + manual REL-06 NSIS verification runbook (REL-06)
  - [ ] 132-04-PLAN.md — full gate (test/cargo/build + CI green) + gated Theme A → master merge (D-11)
**Notes**: Heaviest phase of the milestone (DAT-02 + DAT-03 are L-sized). Expect multiple plans â likely one for FK/orphan validation, then incremental faction-audit + translation batches. Keep all data work keyed on stable Wahapedia IDs and migrations idempotent so re-runs never clobber overrides.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 130. Migration Parity & Release Gate | 2/2 | Complete    | 2026-06-15 |
| 131. CI Test Gate | 2/2 | Complete    | 2026-06-16 |
| 132. Update Trustworthiness | 3/4 | In Progress|  |
| 133. Honest Data Provenance | 2/2 | Complete    | 2026-06-17 |
| 134. No Dead Ends | 2/2 | Complete   | 2026-06-17 |
| 135. Faction & Navigation Consolidation | 0/? | Not started | - |
| 136. Code Honesty & Decomposition | 0/? | Not started | - |
| 137. Canonical Leader Attachment | 0/? | Not started | - |
| 138. Player-Journey Depth | 0/? | Not started | - |
| 139. Data Quality at Scale | 0/? | Not started | - |

<details>
<summary>â v0.5.2 UX Polish & Consistency (Phases 126-129) â SHIPPED 2026-06-12</summary>

**Milestone Goal:** Deep audit and improvement of every page â fix navigation friction, inconsistent feel, missing feedback, and technical polish across the entire app without adding new features.

- [x] Phase 126: Critical Fixes & Dead Ends (4/4 plans) â completed 2026-06-11
- [x] Phase 127: Visual Consistency & PageHeader Unification (3/3 plans) â completed 2026-06-11
- [x] Phase 128: Feedback Hardening & Form UX (2/2 plans) â completed 2026-06-11
- [x] Phase 129: Navigation, Cross-Links & Technical Cleanup (4/4 plans) â completed 2026-06-12

Full details: `.planning/milestones/v0.5.2-ROADMAP.md`

</details>

<details>
<summary>â v0.5.0 Settings & Preferences (Phases 121-125) â SHIPPED 2026-06-11</summary>

- [x] Phase 121: Settings Foundation (2/2 plans) â completed 2026-06-10
- [x] Phase 122: Preferences Tab (2/2 plans) â completed 2026-06-11
- [x] Phase 123: Hobby Defaults Tab (2/2 plans) â completed 2026-06-10
- [x] Phase 124: Data Management Tab (2/2 plans) â completed 2026-06-10
- [x] Phase 125: About Tab (1/1 plan) â completed 2026-06-10

Full details: `.planning/milestones/v0.5.0-ROADMAP.md`

</details>

<details>
<summary>â v0.4.7 Wahapedia Pipeline & Full Data Import (Phases 116-120) â SHIPPED 2026-06-09</summary>

- [x] Phase 116: Pipeline Foundation (2/2 plans) â completed 2026-06-04
- [x] Phase 117: Points Coverage (2/2 plans) â completed 2026-06-04
- [x] Phase 118: Detachments Import (2/2 plans) â completed 2026-06-04
- [x] Phase 119: Stratagems & Enhancements Import (2/2 plans) â completed 2026-06-04
- [x] Phase 120: UI Wiring (2/2 plans) â completed 2026-06-08

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
