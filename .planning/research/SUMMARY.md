# Research Summary: HobbyForge v0.4.2

**Domain:** Tauri 2 desktop app — incremental feature additions to existing canonical unit database
**Researched:** 2026-06-01
**Confidence:** HIGH (architecture, pitfalls, build script, sub-factions); MEDIUM (French data availability)

## Executive Summary

v0.4.2 extends the shipped canonical unit database (1,711 units, 25 factions) with four capabilities: improving points coverage from 37% to 85%+, adding sub-faction chapter filtering, wiring bilingual infrastructure for French translation, and reviving PlaybookTab and Game Day enrichment from canonical data.

**Data quality first.** At 37% points coverage, army lists — the core product value — show 0 pts for most units. The build script needs diagnostic output, deterministic file ordering (`files.sort()`), name normalization, and a manual alias override file before any UI work depends on its output.

**Sub-factions and PlaybookTab revival are quick wins** once data is solid — both require only UI wiring to data already in the database. French translation requires new schema but contributes zero data until manual entry occurs; scaffold early, populate incrementally.

## Stack Additions

| Addition | Version | Why |
|----------|---------|-----|
| `i18next` | ^26.3.0 | Locale state machine (EN/FR toggle), offline-first, in-memory resources |
| `react-i18next` | ^17.0.8 | React 19 compatible hooks for locale context |

No other dependencies. `@xmldom/xmldom` stays — matching failures are algorithm problems, not parser problems.

## Key Technical Decisions

- **Sub-factions:** Denormalized `sub_faction TEXT` column on `udb_units` (not a new table). New `udb_factions` rows would break FK backfill, army list joins, and FTS5.
- **Bilingual:** `_fr` suffix columns with `COALESCE(col_fr, col)` at query layer. Two fixed locales makes a translation table over-engineered.
- **FTS5:** Cannot ALTER — concatenate French names into existing `name` column with pipe separator, or DROP+CREATE with import trigger.
- **French source:** No machine-readable FR data source exists. Manual `scripts/data/translations_fr.json` overlay is the only viable path.
- **PlaybookTab:** 7-line null stub → rewrite using `useUdbRules.ts` hooks against udb_* tables. Data already exists.

## Critical Pitfalls

1. **Boot-loop trap:** Migration 038 has documented incident. DDL only in migrations; all data through JSON payload + Rust import.
2. **FTS5 columns immutable:** Cannot `ALTER TABLE ADD COLUMN` on virtual tables.
3. **Non-deterministic build:** `readdirSync` without `.sort()` in both build scripts. One-line fix, must apply to both.
4. **Sub-faction FK chain:** New `udb_factions` rows silently break migration 039 backfill, `getUdbOwnershipByFaction`, army list joins.
5. **French data wiped on re-import:** `_fr` fields must travel in `unit_database.json` with `#[serde(default)]` in Rust.
6. **Game Day OPG keys:** AUTOINCREMENT IDs reassigned on re-import. Use `unit_id:ability_name` composite.

## Feature Priorities

**P1 (Must have):**
- Build script diagnostics + alias table + name normalization
- Points coverage 85%+ (from 37%)
- PlaybookTab revival (stats/weapons/abilities from udb_*)
- Game Day canonical ability cards

**P2 (Should have):**
- Sub-faction chapter filter (database browser + army list picker)
- Coverage badge in Data Health
- Army list composition enforcement (min/max models)

**P3 (Defer partial):**
- French translation infrastructure (schema + locale toggle — ships empty)
- French ability/weapon text (many weeks of manual data entry)

## Suggested Build Order (4 phases)

1. **Build Script Hardening + Schema Foundation** — deterministic build, coverage report, alias table, migrations 041–044, Rust import extended, points at 85%+
2. **Sub-faction Filter UI** — chapter filter in browser/army list/collection using static keyword map
3. **PlaybookTab + Game Day Revival** — revive null stubs, wire canonical data, weapon profiles in Game Day
4. **Bilingual Infrastructure** — EN/FR locale toggle, `_fr` columns populated via build script, manual FR JSON overlay

## Gaps to Address

- French data: no automated source; manual curation is the only path
- Stratagem CSV availability: verify `Detachments.csv` etc. exist in `scripts/data/` before Phase 1
- `update-unit-database.ts` duplicates full BSData parsing logic — fixes must be applied to both scripts
- `ability_type` values audit needed before Phase 3 PlaybookRules UI

---
*Synthesized: 2026-06-01*
