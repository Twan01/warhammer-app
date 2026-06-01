# Requirements: HobbyForge v0.4.2

**Defined:** 2026-06-01
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with official points via bundled canonical database for personal use, and reliable backup/restore so local data is always recoverable.

## v0.4.2 Requirements

Requirements for Unit Database 2.0 — Data Quality, Sub-factions & Integration. Each maps to roadmap phases.

### Data Quality & Build Pipeline

- [ ] **DQ-01**: Build script produces a per-faction coverage report (units with/without points, match rate) on every run
- [ ] **DQ-02**: Build script sorts file reads (`files.sort()`) for deterministic output across machines
- [ ] **DQ-03**: Build script applies name normalization (lowercase, strip special chars, trim whitespace) before BSData matching
- [ ] **DQ-04**: Build script loads a manual alias table (`scripts/data/aliases.json`) for units where automatic matching fails
- [ ] **DQ-05**: Points coverage reaches 85%+ across all factions (up from 37%)
- [ ] **DQ-06**: Data Health page shows per-faction points coverage badges (green/amber/red tiers)
- [ ] **DQ-07**: Build script extracts shared parsing logic to `scripts/lib/` to eliminate duplication between build and update scripts

### Sub-faction Filtering

- [ ] **SF-01**: `sub_faction TEXT` column added to `udb_units` table, populated from BSData catalogue names at build time
- [ ] **SF-02**: Build script maps BSData catalogues to sub-factions via a `SUB_FACTION_MAP` for SM chapters, CSM warbands, and Aeldari sub-factions
- [ ] **SF-03**: Database browser shows a sub-faction filter dropdown when browsing factions that have sub-factions
- [ ] **SF-04**: Army list unit picker shows a sub-faction filter for applicable factions
- [ ] **SF-05**: Collection browser shows sub-faction filter for applicable factions
- [ ] **SF-06**: FTS5 search index includes sub-faction names for discoverability

### PlaybookTab & Game Day Revival

- [ ] **INT-01**: PlaybookTab shows canonical unit stats, weapons, and abilities from udb_* tables (replacing null stub)
- [ ] **INT-02**: Game Day UnitAbilityCard shows weapon profiles from canonical database in a collapsible section
- [ ] **INT-03**: Game Day uses stable `unit_id:ability_name` composite keys for OPG toggle persistence (not AUTOINCREMENT IDs)
- [ ] **INT-04**: Army list validation uses canonical roles/keywords from udb_* for enhanced composition checks

### French Translation

- [ ] **FR-01**: Migrations add `_fr` locale columns to udb_units, udb_factions, udb_unit_abilities, udb_unit_weapons, udb_unit_keywords tables
- [ ] **FR-02**: Build script loads French translations from `scripts/data/translations_fr.json` overlay and populates `_fr` columns
- [ ] **FR-03**: Query layer accepts optional `locale` parameter, uses `COALESCE(col_fr, col)` for bilingual fallback
- [ ] **FR-04**: App shows EN/FR locale toggle (persisted to localStorage), switching all canonical data display language
- [ ] **FR-05**: FTS5 search index includes French names for bilingual search
- [ ] **FR-06**: Rust import command extended with `#[serde(default)]` bindings for all `_fr` fields in unit_database.json

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extended Canonical Data

- **EXT-01**: Leader attachment targets in canonical DB
- **EXT-02**: Enhancement data per faction in canonical DB
- **EXT-03**: Stratagems and detachments in canonical DB
- **ADV-01**: Unit comparison view (side-by-side datasheets)
- **ADV-02**: Faction overview page (faction lore, army rule, detachment list)

### Translation Depth

- **FR-EXT-01**: French ability and weapon description text (manual data entry — many weeks of effort)
- **FR-EXT-02**: Full app UI translation (menus, buttons, labels — i18n string extraction)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Runtime auto-sync of data | Breaks offline-first design; updates via app releases |
| Machine translation of game data | Quality insufficient for game rules; manual curation required |
| More than EN/FR locales | Two-locale design; additional languages would need schema refactor |
| Sub-factions as separate faction entries | Breaks FK backfill, army list joins, and FTS5 — research confirmed |
| Stratagem/detachment data in canonical DB | EXT-01..03 deferred; Wahapedia CSVs not verified in scripts/data/ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DQ-01 | — | Pending |
| DQ-02 | — | Pending |
| DQ-03 | — | Pending |
| DQ-04 | — | Pending |
| DQ-05 | — | Pending |
| DQ-06 | — | Pending |
| DQ-07 | — | Pending |
| SF-01 | — | Pending |
| SF-02 | — | Pending |
| SF-03 | — | Pending |
| SF-04 | — | Pending |
| SF-05 | — | Pending |
| SF-06 | — | Pending |
| INT-01 | — | Pending |
| INT-02 | — | Pending |
| INT-03 | — | Pending |
| INT-04 | — | Pending |
| FR-01 | — | Pending |
| FR-02 | — | Pending |
| FR-03 | — | Pending |
| FR-04 | — | Pending |
| FR-05 | — | Pending |
| FR-06 | — | Pending |

**Coverage:**
- v0.4.2 requirements: 23 total
- Mapped to phases: 0
- Unmapped: 23 ⚠️

---
*Requirements defined: 2026-06-01*
*Last updated: 2026-06-01 after initial definition*
