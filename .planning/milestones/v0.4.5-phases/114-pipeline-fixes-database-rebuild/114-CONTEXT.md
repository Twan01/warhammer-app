# Phase 114: Pipeline Fixes & Database Rebuild - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix every error class discovered during the Phase 113 audit in `build-unit-db.ts` so that a fresh database rebuild produces correct data automatically. This includes systematic CSV parsing bugs (weapon range, weapon keywords), per-unit weapon stat mismatches, name normalization improvements for unmatched units, and targeted alias additions for genuine edge cases. After fixes, rebuild the database and verify improved coverage. No app runtime code changes, no UI changes, no migrations.

</domain>

<decisions>
## Implementation Decisions

### Systematic CSV Parsing Fixes (PFX-01)
- **D-01:** Fix `weapon.range` bug: change `row["Range"]` to `row["range"]` in `build-unit-db.ts` line 279. The Wahapedia CSV header is lowercase `range`, not `Range`. This affects ALL 2,472+ weapons across all factions (SM: 1,899, NEC: 172, DG: 401).
- **D-02:** Fix `weapon.keywords` bug: change `row["keywords"]` to `row["description"]` in `build-unit-db.ts` line 285. The Wahapedia CSV uses `description` as the column containing weapon special rules/keywords (e.g., "Anti-Infantry 4+", "Devastating Wounds"). This affects all weapons.
- **D-03:** Both fixes are one-line changes to the CSV column name accessor. No structural refactoring needed.

### Per-Unit Weapon Stat Errors (PFX-01)
- **D-04:** The 51 per-unit weapon errors (23 SM, 23 NEC, 5 DG) show patterns of wrong category (Ranged→Melee), wrong attacks/strength/AP/damage values. These are likely caused by weapon ordering or grouping logic issues where the wrong weapon line is being matched to the wrong profile. Root cause investigation required — examine how `weapon_group` tracking and `line_order` parsing interact with the CSV row ordering.
- **D-05:** The error pattern (e.g., Arjac Rockfist expected Ranged/1 attack but got Melee/5 attacks) suggests the audit is comparing weapons by position rather than by name. This may be an audit script comparison issue rather than a pipeline data issue. Verify by spot-checking actual DB data against Wahapedia before changing pipeline code.

### Name Normalization Improvements (PFX-02)
- **D-06:** Improve the name normalization pipeline to handle: apostrophe variants (curly vs straight — already identified in Phase 113), spacing differences (e.g., "Logan Grimnar On Stormrider" vs "Logan Grimnar on Stormrider"), and case differences beyond simple toLowerCase.
- **D-07:** Many of the 94 "missing_alias" units from the audit exist in Wahapedia but not in BSData (they are Wahapedia-only entries with no BSData match). These are not parser bugs — they are units that BSData simply doesn't have data for. Distinguish between: (a) units in both sources but unmatched due to name mismatch, and (b) units only in Wahapedia. Only category (a) needs normalization fixes or aliases.
- **D-08:** Apostrophe normalization: normalize both curly (`’`) and straight (`'`) apostrophes to straight before comparison. This was identified in Phase 113 as a matching blocker.

### Alias Strategy (PFX-03)
- **D-09:** Per PFX-01/02 requirements: parser improvements first, aliases only for genuine edge cases that cannot be fixed by normalization. Do NOT add aliases to mask fixable parser bugs.
- **D-10:** After normalization improvements, re-run the build and check which units are still unmatched. Only those remaining unmatched units with clear BSData↔Wahapedia name mismatches (that cannot be normalized) get alias entries.
- **D-11:** Expected alias categories: chapter-specific named characters (BSData uses different naming convention than Wahapedia), units with parenthetical variants, units with fundamentally different naming (e.g., "Lokhust Heavy Destroyers" vs BSData equivalent).

### Database Rebuild & Verification (PFX-04)
- **D-12:** After all pipeline fixes, run a full database rebuild and compare: (a) weapon range/keywords now populated, (b) coverage percentages improved for SM/NEC/DG, (c) per-unit error count reduced or explained.
- **D-13:** Update `MIN_COVERAGE_PCT` in `build-unit-db.ts` if coverage improves significantly. Current threshold is 55% (set conservatively below the ~60% baseline). If coverage improves to 70%+, raise threshold to 65%.
- **D-14:** Re-run the Phase 113 audit script after rebuild to produce a delta report showing improvements.

### Claude's Discretion
- Order of fixes within the pipeline (systematic bugs first is natural)
- Whether to create a separate normalization pass or integrate apostrophe handling into existing `normalize()` function
- How to structure the verification step (re-run audit script vs manual spot-check vs both)
- Whether the per-unit weapon errors are pipeline bugs or audit comparison artifacts — investigate and fix accordingly

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build Pipeline
- `scripts/build-unit-db.ts` — Primary build script containing ALL parsing bugs to fix (weapon range line 279, weapon keywords line 285, weapon grouping logic lines 257-288)
- `scripts/lib/bsdata.ts` — Shared BSData parsing library (matchUnit, readBsdataCatFiles)
- `scripts/lib/normalize.ts` — Name normalization + alias loading; apostrophe normalization goes here
- `scripts/lib/factionMap.ts` — FACTION_MAP, SUB_FACTION_MAP, CROSS_FACTION_MAP
- `scripts/lib/types.ts` — TypeScript interfaces for build pipeline entities

### Data Files
- `scripts/data/aliases.json` — Manual name mappings; updated by PFX-03 (edge cases only)
- `scripts/data/translations_fr.json` — French translations (not modified by this phase)
- `scripts/data/coverage-report.json` — Coverage data; regenerated after rebuild
- `scripts/data/Datasheets_wargear.csv` — Source CSV; headers: `datasheet_id|line|line_in_wargear|dice|name|description|range|type|A|BS_WS|S|AP|D|`

### Audit Reports (Phase 113 output — error inventory for this phase)
- `.planning/phases/113-priority-faction-data-audit/reports/sm-audit.md` — 23 per-unit errors, 2 systematic, 79 missing_alias, 43 forge_world
- `.planning/phases/113-priority-faction-data-audit/reports/nec-audit.md` — 23 per-unit errors, 2 systematic, 6 missing_alias, 7 forge_world
- `.planning/phases/113-priority-faction-data-audit/reports/dg-audit.md` — 5 per-unit errors, 2 systematic, 9 missing_alias, 26 forge_world
- `.planning/phases/113-priority-faction-data-audit/reports/sm-audit.json` — Machine-readable SM error data
- `.planning/phases/113-priority-faction-data-audit/reports/nec-audit.json` — Machine-readable NEC error data
- `.planning/phases/113-priority-faction-data-audit/reports/dg-audit.json` — Machine-readable DG error data

### Database Output
- `src-tauri/data/unit_database.json` — Canonical database rebuilt after fixes

### Requirements
- `.planning/REQUIREMENTS.md` §Pipeline Fixes — PFX-01 through PFX-04

### Prior Phase Context
- `.planning/phases/112-build-pipeline-hardening/112-CONTEXT.md` — Shared lib extraction, coverage reporting, alias validation
- `.planning/phases/113-priority-faction-data-audit/113-CONTEXT.md` — Audit methodology, error documentation format

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/lib/normalize.ts` — `normalizeUnitName()` function and `loadAliases()` — extend with apostrophe normalization
- `scripts/lib/bsdata.ts` — `matchUnit()` with 3-pass matching (exact → normalized → alias) — add apostrophe pass
- Phase 113 audit scripts — re-run after fixes to verify improvements
- `scripts/check-db.mjs` — Database inspection utility

### Established Patterns
- CSV column access via `row["column_name"]` — fix must match exact CSV header casing
- `loadAliases()` graceful-degrade pattern (returns empty on missing file with console.warn)
- `files.sort()` for deterministic directory reads
- `MIN_COVERAGE_PCT` constant at top of build script for threshold

### Integration Points
- `coverage-report.json` consumed by Data Health SQL queries for live coverage badges in-app
- `unit_database.json` consumed by Rust `import_unit_database` command at startup
- `aliases.json` loaded by `loadAliases()` in normalize.ts, validated by BPH-04 logic in build script

</code_context>

<specifics>
## Specific Ideas

No specific requirements — fixes are driven entirely by the Phase 113 audit error reports. The audit data provides the exact error list to address.

</specifics>

<deferred>
## Deferred Ideas

- French translation gaps for abilities (174 SM, 38 NEC, 25 DG abilities missing name_fr) — deferred to FR-EXT-01 scope
- Extended faction audits for remaining 22 factions — deferred to EFA-01..03 scope
- Composition data sparseness (only 12 entries total) — future milestone

</deferred>

---

*Phase: 114-Pipeline Fixes & Database Rebuild*
*Context gathered: 2026-06-03*
