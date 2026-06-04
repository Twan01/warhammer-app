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
- 🔄 **v0.4.7 Wahapedia Pipeline & Full Data Import** — Phases 116-120 (active)

## Phases

### v0.4.7 Wahapedia Pipeline & Full Data Import

- [ ] **Phase 116: Pipeline Foundation** — BOM fix, Legends dedup, auto-download command, sub-faction static mapping
- [ ] **Phase 117: Points Coverage** — Points from Datasheets_models_cost.csv, BSData removal, 90%+ coverage
- [ ] **Phase 118: Detachments Import** — Schema + Rust import for detachments and detachment abilities
- [ ] **Phase 119: Stratagems & Enhancements Import** — Schema + Rust import for stratagems and enhancements
- [ ] **Phase 120: UI Wiring** — Wire stratagems, enhancements, detachments into Game Day, Rules Hub, Army Lists, PlaybookTab

---

## Phase Details

### Phase 116: Pipeline Foundation

**Goal**: The build pipeline reliably parses all Wahapedia CSVs and produces a clean, deduplicated unit dataset
**Depends on**: Nothing (first phase of milestone)
**Requirements**: PF-01, PF-02, PF-03, PF-04
**Success Criteria** (what must be TRUE):

  1. Running the build script on any Wahapedia CSV never silently drops rows due to BOM characters in headers
  2. Developer can run `pnpm download:wahapedia` to fetch all required CSVs from wahapedia.ru into scripts/data/ without manual file placement
  3. Units marked as Legends in Datasheets.csv are excluded from the output database before any matching or points assignment
  4. When two units share the same name and faction, only the non-Legends entry survives in the built database
  5. Sub-faction assignment for all supported chapters/warbands comes from the static mapping file (not BSData)

**Plans:** 2 plans
Plans:

- [x] 116-01-PLAN.md — BOM fix in CSV parser + Wahapedia auto-download command
- [x] 116-02-PLAN.md — Legends unit filtering and name+faction deduplication

### Phase 117: Points Coverage

**Goal**: Every unit in the canonical database has points resolved directly from Wahapedia's cost CSV, with BSData XML eliminated from the pipeline
**Depends on**: Phase 116
**Requirements**: PTS-01, PTS-02, PTS-03, PTS-04
**Success Criteria** (what must be TRUE):

  1. Points for each unit are resolved by joining on datasheet_id from Datasheets_models_cost.csv — no fuzzy name matching against BSData XML
  2. Points coverage reaches 90% or higher across all factions (measurable via the existing coverage report)
  3. The build pipeline has no reference to @xmldom/xmldom and the dependency is removed from package.json
  4. Sub-faction assignments are preserved correctly in the rebuilt database without any BSData catalogue parsing

**Plans:** 2 plans
Plans:

- [ ] 117-01-PLAN.md — Cost CSV points resolution + keyword-based sub-faction assignment
- [ ] 117-02-PLAN.md — BSData removal, dependency cleanup, threshold raise to 90%

### Phase 118: Detachments Import

**Goal**: The canonical database contains all Wahapedia detachments and their abilities, ready to be consumed by army lists and PlaybookTab
**Depends on**: Phase 116
**Requirements**: DET-01, DET-02
**Success Criteria** (what must be TRUE):

  1. The hobbyforge.db schema includes udb_detachments and udb_detachment_abilities tables with faction, name, and description columns
  2. Running the build + import pipeline populates detachments and their abilities from Detachment_abilities.csv with correct faction associations
  3. Detachment records are queryable by faction_id and are stable across re-imports (no AUTOINCREMENT drift for downstream FK use)

**Plans:** 2 plans
Plans:
**Wave 1**

- [x] 118-01-PLAN.md — Migration, TypeScript types, build script detachment parsing

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 118-02-PLAN.md — Rust importer extension for detachments and abilities

### Phase 119: Stratagems & Enhancements Import

**Goal**: The canonical database contains all Wahapedia stratagems and enhancements, including universal/core stratagems
**Depends on**: Phase 118
**Requirements**: STR-01, STR-02, ENH-01
**Success Criteria** (what must be TRUE):

  1. The hobbyforge.db schema includes udb_stratagems with faction, detachment, name, CP cost, phase, turn, and description columns
  2. The hobbyforge.db schema includes udb_enhancements with faction, detachment, name, cost, and description columns
  3. Stratagems with an empty faction_id (universal/core) are imported and queryable alongside faction-specific ones
  4. Running the build + import pipeline populates both tables with data from Stratagems.csv and Enhancements.csv

**Plans**: TBD

### Phase 120: UI Wiring

**Goal**: Users see real game data from the canonical database everywhere stratagems, enhancements, and detachment abilities previously showed empty stubs or placeholder text
**Depends on**: Phase 119
**Requirements**: STR-03, STR-04, ENH-02, ENH-03, DET-03, DET-04
**Success Criteria** (what must be TRUE):

  1. Game Day page shows real faction stratagems from the canonical database grouped by battle phase, replacing the previous empty state
  2. Rules Hub stratagems tab shows real stratagem data with working search and faction filter
  3. Army list enhancement picker displays description and points cost from the canonical database when assigning an enhancement
  4. Enhancement points are resolved from the canonical database — no manual numeric input required
  5. Army list detachment picker shows real detachment names sourced from udb_detachments for the selected faction
  6. PlaybookTab detachment abilities section shows actual ability text from udb_detachment_abilities for the unit's faction

**Plans**: TBD
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 116. Pipeline Foundation | 2/2 | Complete    | 2026-06-04 |
| 117. Points Coverage | 0/2 | Planned | - |
| 118. Detachments Import | 1/2 | In Progress|  |
| 119. Stratagems & Enhancements Import | 0/? | Not started | - |
| 120. UI Wiring | 0/? | Not started | - |

---

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
