# Requirements: HobbyForge v0.4.5

**Defined:** 2026-06-02
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with accurate canonical data and reliable backup/restore

## v0.4.5 Requirements

Requirements for Data Quality Audit & Pipeline Improvement milestone.

### Build Pipeline Hardening

- [x] **BPH-01**: Build script prints per-faction coverage report showing matched/unmatched unit counts after BSData matching
- [x] **BPH-02**: Build script uses `files.sort()` on BSData directory reads for deterministic, reproducible builds across machines
- [x] **BPH-03**: Shared BSData parsing logic extracted to `scripts/lib/` module imported by both `build-unit-db.ts` and `update-unit-database.ts`
- [x] **BPH-04**: Build script validates `aliases.json` entries at build time — warns on unused aliases and unknown unit names
- [x] **BPH-05**: Build script exits non-zero when overall BSData points coverage drops below a configured threshold

### Data Audit — Space Marines

- [ ] **SM-01**: All Space Marines unit points values verified correct against Wahapedia, GW app, and community sources
- [ ] **SM-02**: All Space Marines unit stats (M/T/Sv/W/Ld/OC), weapon profiles, and ability text verified correct
- [ ] **SM-03**: All Space Marines unit keywords and roles verified correct
- [x] **SM-04**: All Space Marines unit French translations (unit names, ability names, weapon names) verified and corrected in translations_fr.json

### Data Audit — Necrons

- [ ] **NEC-01**: All Necrons unit points values verified correct against official sources
- [ ] **NEC-02**: All Necrons unit stats, weapon profiles, and ability text verified correct
- [ ] **NEC-03**: All Necrons unit keywords and roles verified correct
- [x] **NEC-04**: All Necrons unit French translations verified and corrected in translations_fr.json

### Data Audit — Death Guard

- [ ] **DG-01**: All Death Guard unit points values verified correct against official sources
- [ ] **DG-02**: All Death Guard unit stats, weapon profiles, and ability text verified correct
- [ ] **DG-03**: All Death Guard unit keywords and roles verified correct
- [x] **DG-04**: All Death Guard unit French translations verified and corrected in translations_fr.json

### Pipeline Fixes

- [x] **PFX-01**: Build script parsing bugs discovered during audit are fixed in the pipeline (not just aliased)
- [x] **PFX-02**: Name normalization improved to handle apostrophe variants, spacing differences, and common formatting mismatches automatically
- [x] **PFX-03**: New aliases added to aliases.json for edge cases that cannot be fixed by parsing improvements
- [x] **PFX-04**: Unit database rebuilt with pipeline fixes — coverage improvement verified for audited factions

### Sub-faction Filtering

- [x] **SUB-01**: Selecting a sub-faction in the database browser shows sub-faction-specific units PLUS all generic parent faction units (sub_faction IS NULL)
- [x] **SUB-02**: Selecting a sub-faction in the army list unit picker shows sub-faction-specific units PLUS generic parent faction units
- [x] **SUB-03**: Selecting a sub-faction in the collection browser shows sub-faction-specific units PLUS generic parent faction units

## Future Requirements

### Extended Faction Audits

- **EFA-01**: Data audit for remaining 22 factions (points, stats, translations)
- **EFA-02**: French translations for all factions (unit names, ability names, weapon names)
- **EFA-03**: French ability description text for all factions

### Deferred Features

- **EXT-01**: Leader attachment targets in canonical DB
- **EXT-02**: Enhancement data per faction in canonical DB
- **EXT-03**: Stratagems in canonical DB
- **ADV-01**: Unit comparison view
- **ADV-02**: Faction overview page

## Out of Scope

| Feature | Reason |
|---------|--------|
| Stratagems/detachments in canonical DB | Deferred to future milestone (EXT-01/03) |
| PlaybookRules revival | Depends on EXT-03 stratagem data |
| Full 25-faction audit | Scope limited to 3 priority factions for this milestone |
| UI-level manual stat editing | Fights the build pipeline; corrections go through build script |
| French ability description full text | Weeks of manual data entry; unit/weapon/ability names only |
| Sub-faction as new udb_factions rows | Would break FK backfill, army list joins, FTS5 |
| Auto-translate via API | Breaks offline-first; game terms need human translation |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BPH-01 | Phase 112 | Complete |
| BPH-02 | Phase 112 | Complete |
| BPH-03 | Phase 112 | Complete |
| BPH-04 | Phase 112 | Complete |
| BPH-05 | Phase 112 | Complete |
| SM-01 | Phase 113 | Pending |
| SM-02 | Phase 113 | Pending |
| SM-03 | Phase 113 | Pending |
| SM-04 | Phase 113 | Complete |
| NEC-01 | Phase 113 | Pending |
| NEC-02 | Phase 113 | Pending |
| NEC-03 | Phase 113 | Pending |
| NEC-04 | Phase 113 | Complete |
| DG-01 | Phase 113 | Pending |
| DG-02 | Phase 113 | Pending |
| DG-03 | Phase 113 | Pending |
| DG-04 | Phase 113 | Complete |
| PFX-01 | Phase 114 | Complete |
| PFX-02 | Phase 114 | Complete |
| PFX-03 | Phase 114 | Complete |
| PFX-04 | Phase 114 | Complete |
| SUB-01 | Phase 115 | Complete |
| SUB-02 | Phase 115 | Complete |
| SUB-03 | Phase 115 | Complete |

**Coverage:**
- v0.4.5 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-06-02*
*Last updated: 2026-06-02 — traceability updated after roadmap creation*
