# Phase 108: Build Script Hardening & Schema Foundation - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes the canonical unit database build pipeline deterministic, diagnostic-rich, and high-coverage (85%+ points), while extending the schema with sub-faction and French locale columns. It is entirely backend/pipeline work plus one Data Health UI addition (coverage badges). No new pages, no new user workflows — just better data quality and schema readiness for Phases 109-111.

**Requirements in scope:** DQ-01 through DQ-07, SF-01, SF-02, FR-01, FR-06 (11 requirements)

</domain>

<decisions>
## Implementation Decisions

### Points Matching Strategy (DQ-03, DQ-04, DQ-05)
- **D-01:** Multi-pass matching: exact name match → normalized match (lowercase, strip special chars, trim whitespace) → manual alias table fallback (`scripts/data/aliases.json`). This cascading approach maximizes automatic coverage while providing an escape hatch for edge cases.
- **D-02:** The alias table is a flat JSON object mapping Wahapedia unit names to BSData unit names. Manually curated for units that can't be automatically matched (e.g., "Intercessor Squad" vs "Intercessors").
- **D-03:** Target 85%+ coverage across all factions, not per-faction — some xenos factions with unusual naming may lag behind SM/CSM.

### Coverage Report (DQ-01, DQ-06)
- **D-04:** Build script outputs per-faction coverage to console during build AND writes a summary JSON artifact to `scripts/data/coverage-report.json` for programmatic consumption.
- **D-05:** Data Health page gets a new "Points Coverage" section showing a per-faction grid with color-coded badges: green (85%+), amber (50-84%), red (<50%). Coverage data read from `udb_meta` or a computed query at import time.

### Build Determinism (DQ-02)
- **D-06:** Apply `files.sort()` to both `build-unit-db.ts` and `update-unit-database.ts` before processing any file lists. This ensures byte-for-byte identical output across machines regardless of filesystem ordering.

### Shared Parsing Library (DQ-07)
- **D-07:** Extract shared parsing logic (Wahapedia CSV parsing, BSData XML parsing, name normalization, alias loading) to `scripts/lib/` as separate modules. Both build and update scripts import from there.

### Sub-faction Schema (SF-01, SF-02)
- **D-08:** Add `sub_faction TEXT` column to `udb_units` table via migration. Denormalized on the unit row — NOT a separate table (research confirmed separate faction entries break FK backfill and army list joins).
- **D-09:** Build script maps BSData catalogue names to sub-factions via a `SUB_FACTION_MAP` constant (e.g., `"Catalogue - Ultramarines" → "Ultramarines"`). Only SM chapters, CSM warbands, and Aeldari sub-factions mapped initially.

### French Locale Schema (FR-01, FR-06)
- **D-10:** Migration adds `_fr` columns: `name_fr` on udb_units, udb_factions, udb_unit_abilities, udb_unit_weapons; `keyword_fr` on udb_unit_keywords. All nullable TEXT, defaulting to NULL (English fallback until Phase 111 populates them).
- **D-11:** Rust import command extended with `#[serde(default)]` on all `_fr` struct fields so that re-import from JSON without French data does not wipe existing French translations. The `_fr` fields travel in `unit_database.json` alongside English data.
- **D-12:** Build script includes `_fr` fields in output JSON (initially all null). Phase 111 will populate them from `scripts/data/translations_fr.json`.

### Claude's Discretion
- Build script internal architecture (function decomposition, error handling patterns)
- Coverage report JSON schema (as long as it captures per-faction unit count and match count)
- Migration file numbering (next available after current 040)
- Exact name normalization regex patterns
- Console output formatting during build

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build Pipeline
- `scripts/build-unit-db.ts` — Current build script (767 lines); needs determinism fix, shared lib extraction, coverage reporting, sub-faction mapping, _fr fields
- `scripts/update-unit-database.ts` — Update/diff script (937 lines); needs shared lib extraction, determinism fix
- `src-tauri/data/unit_database.json` — Output artifact; needs sub_faction and _fr fields added

### Schema & Import
- `src-tauri/migrations/038_udb_schema.sql` — Current udb_* table definitions; new migration adds sub_faction + _fr columns
- `src-tauri/src/lib.rs` (lines 464-752) — `import_unit_database_inner()` Rust import command; needs _fr field serde bindings + sub_faction handling

### Data Health UI
- `src/features/data-health/DataHealthPage.tsx` — Data Health page; add per-faction coverage badges section

### Data Sources
- `scripts/data/` — Wahapedia CSVs + BSData XML catalogues

### Planning Context
- `.planning/REQUIREMENTS.md` — DQ-01..DQ-07, SF-01, SF-02, FR-01, FR-06 requirement definitions
- `.planning/ROADMAP.md` — Phase 108 success criteria and dependency chain

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `build-unit-db.ts` parsing functions: Wahapedia CSV reader, BSData XML parser, points tier extractor — candidates for `scripts/lib/` extraction
- `DataHealthPage.tsx` existing section layout: VersionInfoCard, TableCountsGrid, DiagnosticsCard pattern — new coverage badges section follows same card pattern
- `DbHealthGate.tsx` with `EXPECTED_SCHEMA_VERSION = 40` — must bump after migration

### Established Patterns
- Migration file naming: sequential `NNN_description.sql` in `src-tauri/migrations/`
- Rust serde structs mirror JSON shape with `#[serde(default)]` for optional fields
- FTS5 virtual table rebuild inside import transaction (DROP + CREATE + populate)
- `udb_meta` single-row version tracking for import idempotency

### Integration Points
- `import_unit_database_inner()` in Rust must handle new JSON fields (sub_faction, _fr columns)
- FTS5 index rebuild should include `sub_faction` in searchable text (for Phase 109 SF-06)
- `EXPECTED_SCHEMA_VERSION` in `DbHealthGate.tsx` must match new migration count
- Coverage data needs to be queryable from TypeScript (either stored in udb_meta or computed via query)

</code_context>

<specifics>
## Specific Ideas

- Sub-faction mapping should start with SM chapters (largest sub-faction set) as the reference implementation, then extend to CSM and Aeldari
- Coverage report badges on Data Health should match the existing diagnostic badge pattern (severity-colored pills)
- The alias table (`aliases.json`) should be small and manually curated — not a massive exhaustive mapping. The normalization pass should handle 80%+ of mismatches automatically.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 108-Build Script Hardening & Schema Foundation*
*Context gathered: 2026-06-01*
