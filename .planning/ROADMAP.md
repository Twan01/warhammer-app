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
- 🔄 **v0.4.5 Data Quality Audit & Pipeline Improvement** — Phases 112-115 (in progress)

## Phases

<details>
<summary>🔄 v0.4.5 Data Quality Audit & Pipeline Improvement (Phases 112-115) — IN PROGRESS</summary>

- [ ] **Phase 112: Build Pipeline Hardening** - Per-faction coverage report, deterministic builds, shared lib, alias validation, failure threshold
- [ ] **Phase 113: Priority Faction Data Audit** - Space Marines, Necrons, Death Guard — points, stats, weapons, abilities, keywords, French translations
- [ ] **Phase 114: Pipeline Fixes & Database Rebuild** - Fix parsing bugs found during audit, improve normalization, add aliases, rebuild and verify coverage
- [ ] **Phase 115: Sub-faction Filter Fix** - Sub-faction selection includes parent faction generic units across DB browser, army list picker, collection browser

</details>

<details>
<summary>✅ v0.4.2 Unit Database 2.0 (Phases 108-111) — SHIPPED 2026-06-01</summary>

- [x] Phase 108: Build Script Hardening & Schema Foundation (3/3 plans) — completed 2026-06-01
- [x] Phase 109: Sub-faction Filter UI (2/2 plans) — completed 2026-06-01
- [x] Phase 110: PlaybookTab & Game Day Revival (3/3 plans) — completed 2026-06-01
- [x] Phase 111: Bilingual Infrastructure (3/3 plans) — completed 2026-06-01

Full details: `.planning/milestones/v0.4.2-ROADMAP.md`

</details>

<details>
<summary>✅ v0.4.0 Unit Database — Canonical 40k Data Hub (Phases 103-107) — SHIPPED 2026-05-31</summary>

- [x] Phase 103: Data Acquisition & Schema (3/3 plans) — completed 2026-05-29
- [x] Phase 104: Database Browser UI (3/3 plans) — completed 2026-05-30
- [x] Phase 105: Collection Integration (2/2 plans) — completed 2026-05-30
- [x] Phase 106: Army List Simplification (2/2 plans) — completed 2026-05-30
- [x] Phase 107: Cleanup & Pipeline (2/2 plans) — completed 2026-05-31

Full details: `.planning/milestones/v0.4.0-ROADMAP.md`

</details>


## Phase Details

### Phase 112: Build Pipeline Hardening
**Goal**: The build script is production-grade — it reports coverage, builds deterministically, validates its own config, and fails loudly when data quality falls below threshold
**Depends on**: Nothing (first phase of milestone)
**Requirements**: BPH-01, BPH-02, BPH-03, BPH-04, BPH-05
**Success Criteria** (what must be TRUE):
  1. Running the build script prints a per-faction table showing matched vs unmatched unit counts, so coverage gaps are immediately visible without manual inspection
  2. Two consecutive builds on different machines produce identical output with no ordering-dependent variation
  3. `build-unit-db.ts` and `update-unit-database.ts` share a single parsing library from `scripts/lib/` — a fix in one automatically applies to the other
  4. Running with a stale or mismatched `aliases.json` prints a warning identifying the unused or unknown alias entries
  5. The build exits with a non-zero code when BSData points coverage falls below the configured threshold, blocking silent regressions
**Plans:** 2/2 plans complete
Plans:
- [x] 112-01-PLAN.md — Shared library extraction (bsdata.ts) and script rewiring
- [x] 112-02-PLAN.md — Coverage reporting, deterministic output, alias validation, threshold

### Phase 113: Priority Faction Data Audit
**Goal**: Space Marines, Necrons, and Death Guard unit data is fully verified correct — every points value, stat line, weapon profile, ability text, keyword, role, and French translation cross-checked against official sources and corrected in source data
**Depends on**: Phase 112 (coverage report shows where gaps are before audit begins)
**Requirements**: SM-01, SM-02, SM-03, SM-04, NEC-01, NEC-02, NEC-03, NEC-04, DG-01, DG-02, DG-03, DG-04
**Success Criteria** (what must be TRUE):
  1. Opening any Space Marines unit in the database browser shows points, stats, weapons, and abilities that match Wahapedia and the GW app exactly
  2. Opening any Necrons unit shows correct points, stat block, weapon profiles, and ability text with no values pulled from a wrong or mismatched unit
  3. Opening any Death Guard unit shows correct points, stats, weapons, abilities, and keyword/role assignments with no errors
  4. French locale display for SM, Necrons, and Death Guard units shows correct translated unit names, weapon names, and ability names from `translations_fr.json`
**Plans:** 2/2 plans complete
Plans:
- [x] 113-01-PLAN.md — Audit script + run for SM/NEC/DG (error reports + unmatched classification)
- [x] 113-02-PLAN.md — French translations for SM/NEC/DG + database rebuild

### Phase 114: Pipeline Fixes & Database Rebuild
**Goal**: Every error class discovered during the audit is fixed in `build-unit-db.ts` so that a fresh database rebuild produces correct data automatically — no manual patches, no post-hoc overrides
**Depends on**: Phase 113 (audit produces the specific error list the pipeline fixes address)
**Requirements**: PFX-01, PFX-02, PFX-03, PFX-04
**Success Criteria** (what must be TRUE):
  1. Running a fresh database rebuild after pipeline fixes produces the same correct values that were verified manually during the audit — audit corrections are encoded in the pipeline, not applied as one-off data patches
  2. Units with apostrophe variants, spacing differences, or common formatting mismatches in source data are matched automatically without requiring a new alias entry
  3. The Data Health page shows improved coverage percentages for Space Marines, Necrons, and Death Guard compared to the pre-audit baseline
  4. `aliases.json` contains entries only for genuine edge cases that cannot be resolved by improved parsing — the alias count does not grow to mask fixable parser bugs
**Plans**: TBD

### Phase 115: Sub-faction Filter Fix
**Goal**: Selecting a sub-faction anywhere in the app shows both sub-faction-specific units and the parent faction's generic units, so a player filtering to "Ultramarines" sees Space Marines generic units alongside Ultramarines-specific ones
**Depends on**: Phase 112 (pipeline solid before touching filter logic that queries rebuilt data)
**Requirements**: SUB-01, SUB-02, SUB-03
**Success Criteria** (what must be TRUE):
  1. In the database browser, selecting a sub-faction (e.g. Ultramarines) shows both units tagged with that sub-faction AND all units from the parent faction with no sub-faction tag — not just the sub-faction-specific units
  2. In the army list unit picker, selecting a sub-faction shows the same combined result: sub-faction units plus parent faction generic units available for selection
  3. In the collection browser, filtering by a sub-faction shows owned units from that sub-faction plus owned generic parent faction units — no generic parent-faction units are hidden by the sub-faction filter
**Plans:** 1/1 plans complete
Plans:
- [x] 115-01-PLAN.md -- Fix sub-faction filter in SQL query, client-side filter, and tests
**UI hint**: yes


## Progress

**Execution Order:**
Phases execute in numeric order: 112 → 113 → 114 → 115

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 112. Build Pipeline Hardening | 2/2 | Complete    | 2026-06-02 |
| 113. Priority Faction Data Audit | 1/2 | In progress | - |
| 114. Pipeline Fixes & Database Rebuild | 0/? | Not started | - |
| 115. Sub-faction Filter Fix | 1/1 | Complete    | 2026-06-03 |

---

*Previous milestone phases: see archived roadmaps in `.planning/milestones/`*
