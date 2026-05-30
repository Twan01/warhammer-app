# Requirements: HobbyForge v0.4.0 — Unit Database

**Defined:** 2026-05-29
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with official points via canonical database for personal use, and reliable backup/restore so local data is always recoverable.

## v1 Requirements

Requirements for v0.4.0 milestone. Each maps to roadmap phases.

### Data Acquisition & Schema

- [x] **DAS-01**: Dev-side Node.js build script parses Wahapedia CSVs + BSData XML into canonical `unit_database.json`
- [x] **DAS-02**: Canonical `udb_*` schema in hobbyforge.db with tables for units, models, weapons, abilities, keywords, points tiers, composition
- [x] **DAS-03**: Rust `import_unit_database` command loads JSON into `udb_*` tables with WAL checkpoint before React Query invalidation
- [x] **DAS-04**: All 40k 10th edition factions and units present with stats, weapons, abilities, keywords
- [x] **DAS-05**: Point tiers with model count brackets per unit (e.g., 5 models: 90pts, 10 models: 180pts)
- [x] **DAS-06**: Composition data per unit (min/max model counts, default equipment)
- [x] **DAS-07**: FTS5 full-text search virtual table for cross-faction unit search
- [x] **DAS-08**: Pre-built data ships bundled with app, loaded on first launch via Rust setup hook

### Database Browser UI

- [x] **BUI-01**: Faction picker page with alignment grouping (Imperium / Space Marines / Chaos / Xenos)
- [x] **BUI-02**: Unit list per faction grouped by 9 GW role categories with points on each row
- [x] **BUI-03**: Full datasheet detail view: stat block, ranged + melee weapon tables, abilities with full text, keywords, damaged profile
- [x] **BUI-04**: Global search across all factions via FTS5
- [x] **BUI-05**: Filters by role, keyword, and point range
- [x] **BUI-06**: Virtual scrolling for large unit lists (@tanstack/react-virtual)

### Collection Integration

- [ ] **COL-01**: "Add from database" flow — browse/search → pick unit → add to collection with faction/role/keywords/points pre-filled
- [ ] **COL-02**: FK link from collection `units.udb_unit_id` to `udb_units.id` (nullable, ON DELETE SET NULL)
- [ ] **COL-03**: Migration backfills existing collection units to database FK by name matching (best-effort, advisory)
- [ ] **COL-04**: Ownership badges on database browser rows (owned / not owned)
- [ ] **COL-05**: Readiness badges on database browser rows (painting status)
- [ ] **COL-06**: Data Health diagnostic surfaces unlinked collection units
- [ ] **COL-07**: Custom/kitbash units can still be added manually without database link

### Army List Integration

- [ ] **ALI-01**: Army list points resolved from database FK join (simplified COALESCE chain)
- [ ] **ALI-02**: Army list validation uses database keywords and roles
- [ ] **ALI-03**: Remove dependency on `synced_unit_points` cache table for points resolution

### Cleanup & Pipeline

- [ ] **CLN-01**: Dev-side update script for re-scraping and producing data diffs for future GW changes
- [ ] **CLN-02**: Eliminate rules.db — all data in single hobbyforge.db
- [ ] **CLN-03**: Remove dead sync code (rules-client.ts, rw_* query modules, CSV fetch pipeline)
- [ ] **CLN-04**: Keep optional "check for points updates" as simplified sync feature

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extended Data

- **EXT-01**: Leader attachment targets (which Character can lead which units)
- **EXT-02**: Enhancement data per faction with point costs
- **EXT-03**: Stratagems and detachment rules in canonical database (currently in rules.db)

### Advanced Browser

- **ADV-01**: Unit comparison side-by-side view
- **ADV-02**: Faction overview page with army-wide stats summary

## Out of Scope

| Feature | Reason |
|---------|--------|
| GW-visual-style datasheet layout | Use HobbyForge design system; GW layout is print-oriented |
| Multi-game-system support | 40K 10th edition only |
| Runtime auto-sync of unit data | Offline-first; updates via app releases |
| Competitive tier ratings / meta analysis | Not the goal; informational not competitive |
| AI-powered unit recommendations | Deferred |
| Unit purchase links / store integration | Not in scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DAS-01 | Phase 103 | Complete |
| DAS-02 | Phase 103 | Complete |
| DAS-03 | Phase 103 | Complete |
| DAS-04 | Phase 103 | Complete |
| DAS-05 | Phase 103 | Complete |
| DAS-06 | Phase 103 | Complete |
| DAS-07 | Phase 103 | Complete |
| DAS-08 | Phase 103 | Complete |
| BUI-01 | Phase 104 | Pending |
| BUI-02 | Phase 104 | Pending |
| BUI-03 | Phase 104 | Pending |
| BUI-04 | Phase 104 | Pending |
| BUI-05 | Phase 104 | Pending |
| BUI-06 | Phase 104 | Pending |
| COL-01 | Phase 105 | Pending |
| COL-02 | Phase 105 | Pending |
| COL-03 | Phase 105 | Pending |
| COL-04 | Phase 105 | Pending |
| COL-05 | Phase 105 | Pending |
| COL-06 | Phase 105 | Pending |
| COL-07 | Phase 105 | Pending |
| ALI-01 | Phase 106 | Pending |
| ALI-02 | Phase 106 | Pending |
| ALI-03 | Phase 106 | Pending |
| CLN-01 | Phase 107 | Pending |
| CLN-02 | Phase 107 | Pending |
| CLN-03 | Phase 107 | Pending |
| CLN-04 | Phase 107 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-29*
*Last updated: 2026-05-29 — traceability filled after roadmap creation*
