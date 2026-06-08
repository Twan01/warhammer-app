# Requirements: HobbyForge v0.4.7

**Defined:** 2026-06-04
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with accurate canonical data and reliable backup/restore

## v0.4.7 Requirements

Requirements for Wahapedia Pipeline & Full Data Import milestone.

### Pipeline Foundation

- [x] **PF-01**: Build script strips UTF-8 BOM from CSV headers before parsing (fixes silent row-drop bug for new CSV files)
- [x] **PF-02**: `pnpm download:wahapedia` command fetches all required CSVs from wahapedia.ru to scripts/data/ (separate from build, preserves deterministic builds)
- [x] **PF-03**: Build script filters out Legends units (legend column in Datasheets.csv) before any matching or points assignment
- [x] **PF-04**: Duplicate Wahapedia units with the same name+faction are deduplicated (keep current, discard Legends)

### Points & Coverage

- [ ] **PTS-01**: Points imported from Datasheets_models_cost.csv via direct datasheet_id join (no BSData name matching)
- [ ] **PTS-02**: Points coverage reaches 90%+ for all factions (up from 60%)
- [ ] **PTS-03**: BSData XML parsing removed from build pipeline (@xmldom/xmldom dependency removed)
- [ ] **PTS-04**: Sub-faction assignment preserved via static mapping file (replaces BSData catalogue-based assignment)

### Stratagems

- [x] **STR-01**: Stratagems imported from Stratagems.csv into udb_stratagems table (faction, detachment, name, CP cost, phase, turn, description)
- [x] **STR-02**: Universal/core stratagems (empty faction_id) included alongside faction-specific ones
- [x] **STR-03**: Game Day page shows real stratagems from canonical database grouped by battle phase
- [x] **STR-04**: Rules Hub stratagems tab shows real data from canonical database with search/filter

### Enhancements

- [x] **ENH-01**: Enhancements imported from Enhancements.csv into udb_enhancements table (faction, detachment, name, cost, description)
- [x] **ENH-02**: Army list enhancement picker shows descriptions from canonical database
- [x] **ENH-03**: Enhancement points resolved from canonical database (replaces manual input)

### Detachment Abilities

- [x] **DET-01**: Detachments imported from Wahapedia CSV into udb_detachments table (faction, name)
- [x] **DET-02**: Detachment abilities imported into udb_detachment_abilities table (detachment, name, description)
- [x] **DET-03**: Army list detachment picker shows real detachment data from canonical database
- [x] **DET-04**: PlaybookTab detachment abilities section shows real data

## Future Requirements

- **EXT-01**: Leader attachment targets in canonical DB
- **ADV-01**: Unit comparison view
- **ADV-02**: Faction overview page
- **FR-EXT-01**: French ability/weapon description text
- **FR-EXT-02**: Full app UI translation
- **EFA-01..03**: Extended faction audits (French translations for all factions)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Runtime auto-download of CSVs | Offline-first; download is dev-side only |
| Points history tracking | Would add complexity; just use latest values |
| Competitive list validation (detachment restrictions) | Not the goal; hobby management, not tournament prep |
| French translations for new entities (stratagems/enhancements) | Keep at SM/NEC/DG unit names only for now |
| Sub-faction derivation from Wahapedia | Static mapping file is sufficient; Wahapedia CSV doesn't export sub-factions |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PF-01 | Phase 116 | Complete |
| PF-02 | Phase 116 | Complete |
| PF-03 | Phase 116 | Complete |
| PF-04 | Phase 116 | Complete |
| PTS-01 | Phase 117 | Pending |
| PTS-02 | Phase 117 | Pending |
| PTS-03 | Phase 117 | Pending |
| PTS-04 | Phase 117 | Pending |
| DET-01 | Phase 118 | Complete |
| DET-02 | Phase 118 | Complete |
| STR-01 | Phase 119 | Complete |
| STR-02 | Phase 119 | Complete |
| ENH-01 | Phase 119 | Complete |
| STR-03 | Phase 120 | Complete |
| STR-04 | Phase 120 | Complete |
| ENH-02 | Phase 120 | Complete |
| ENH-03 | Phase 120 | Complete |
| DET-03 | Phase 120 | Complete |
| DET-04 | Phase 120 | Complete |

**Coverage:**
- v0.4.7 requirements: 19 total
- Mapped to phases: 19/19
- Unmapped: 0

---
*Requirements defined: 2026-06-04*
