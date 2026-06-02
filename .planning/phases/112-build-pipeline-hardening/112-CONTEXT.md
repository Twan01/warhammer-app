# Phase 112: Build Pipeline Hardening - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Make `build-unit-db.ts` production-grade: per-faction coverage reporting, deterministic builds, shared parsing library, alias validation, and a coverage failure threshold that blocks silent regressions. This is a dev-side tooling phase — no app runtime code changes, no UI changes, no migrations.

</domain>

<decisions>
## Implementation Decisions

### Coverage Report (BPH-01)
- **D-01:** The per-faction coverage table already exists in build-unit-db.ts Step 10 — it prints to stdout AND writes `coverage-report.json`. Phase 112 refines this: ensure the table includes matched vs unmatched counts (not just points coverage), and add a column showing the match method (exact/normalized/alias) per faction.
- **D-02:** Coverage report should also print unmatched unit names per faction (currently only logged as a total count), so the auditor in Phase 113 can see exactly which units are missing.

### Deterministic Builds (BPH-02)
- **D-03:** `build-unit-db.ts` already calls `files.sort()` on BSData directory reads. Extend determinism to ALL array outputs: sort units by id, points by (unit_id, model_count), weapons by (unit_id, weapon_group, line_order), etc. before JSON serialization. Two builds from identical inputs must produce byte-identical JSON.

### Shared Library Extraction (BPH-03)
- **D-04:** Extract `matchUnit()`, `readBsdataCatFiles()`, `parseBsdataModelCounts()`, and the `readCsv()` helper into `scripts/lib/`. These are duplicated between `build-unit-db.ts` and `update-unit-database.ts` — but the update script's copies have diverged (missing multi-pass matching, no French overlay, no sub_faction).
- **D-05:** After extraction, `update-unit-database.ts` should import from shared lib and use the same matching logic as `build-unit-db.ts`. The update script's standalone `buildUnitDatabase()` function (~230 lines) should call the shared pipeline rather than reimplementing it.
- **D-06:** Keep the French overlay loading (`loadTranslationsFr()`) in `build-unit-db.ts` only — not shared lib. The update script doesn't need translations for its diff comparison.

### Alias Validation (BPH-04)
- **D-07:** At build time, validate every entry in `aliases.json` against the current Wahapedia and BSData data. Print warnings (not errors) for: unused aliases (the BSData name doesn't appear in any .cat file) and unknown targets (the Wahapedia name doesn't match any unit). Warnings do NOT fail the build.
- **D-08:** Print a summary line: "Alias validation: N used, M unused, K unknown target" so the developer can decide whether to clean up.

### Failure Threshold (BPH-05)
- **D-09:** Define a `MIN_COVERAGE_PCT` constant at the top of `build-unit-db.ts` (default: 90%). If overall BSData points coverage drops below this threshold, exit with code 1. This catches regressions from BSData schema changes or broken .cat files.
- **D-10:** The threshold is overall (all factions combined), not per-faction. Per-faction thresholds would be too noisy given naturally different faction sizes.

### Claude's Discretion
- Exact function signatures and module boundaries within `scripts/lib/` — Claude picks the cleanest API
- Sort key choices for deterministic output arrays — use natural ordering (id, then sub-keys)
- Whether to add a `--verbose` flag for extra diagnostic output vs always printing full details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build Pipeline
- `scripts/build-unit-db.ts` — Primary build script; all 5 requirements modify this file
- `scripts/update-unit-database.ts` — Update/diff script; shares pipeline logic, currently diverged
- `scripts/lib/normalize.ts` — Name normalization + alias loading (already shared)
- `scripts/lib/parseXml.ts` — BSData XML parsing (already shared)
- `scripts/lib/parseCsv.ts` — Wahapedia CSV parsing (already shared)
- `scripts/lib/factionMap.ts` — FACTION_MAP, SUB_FACTION_MAP, CROSS_FACTION_MAP (already shared)
- `scripts/lib/types.ts` — All TypeScript interfaces for the build pipeline (already shared)

### Data Files
- `scripts/data/aliases.json` — Manual name mappings (BSData→Wahapedia); validated by BPH-04
- `scripts/data/coverage-report.json` — Generated coverage report; refined by BPH-01
- `scripts/data/translations_fr.json` — French translation overlay (not touched by this phase)

### Requirements
- `.planning/REQUIREMENTS.md` §Build Pipeline Hardening — BPH-01 through BPH-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/lib/` (5 modules): types, parseCsv, parseXml, normalize, factionMap — already shared between both scripts
- `matchUnit()` in build-unit-db.ts:157-184 — 3-pass matching (exact → normalized → alias) ready to extract
- `readBsdataCatFiles()` in build-unit-db.ts:104-139 — file reading with sort + FACTION_MAP lookup, duplicated in update script
- `parseBsdataModelCounts()` in build-unit-db.ts:141-151 — XML extraction wrapper, duplicated in update script
- Coverage report logic in build-unit-db.ts:530-611 — per-faction table generation, already functional

### Established Patterns
- Graceful-degrade pattern: `loadAliases()` and `loadTranslationsFr()` return empty/null on missing files with console.warn
- `files.sort()` for deterministic directory reads (D-06 comment convention)
- Content-hash versioning: `1.0.0+{sha256-8chars}` in output JSON
- `process.exit(1)` on fatal errors (CSV missing, unit count < 100)

### Integration Points
- `scripts/data/coverage-report.json` is read by the app's Data Health SQL queries for live coverage badges
- `src-tauri/data/unit_database.json` is the final output consumed by the Rust import command
- `package.json` likely has a `build:udb` script that invokes the build

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for tooling hardening.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 112-Build Pipeline Hardening*
*Context gathered: 2026-06-02*
