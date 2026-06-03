# Phase 113: Priority Faction Data Audit - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify and correct data accuracy for 3 priority factions in the canonical unit database: Space Marines (298 units), Necrons (64 units), and Death Guard (71 units). Cross-check every unit's points, stat block, weapon profiles, ability text, keywords, roles, and French translations against Wahapedia, the GW app, and community sources. Produce a structured error report per faction. This phase discovers and documents errors — pipeline fixes belong in Phase 114.

</domain>

<decisions>
## Implementation Decisions

### Audit Methodology (SM-01..04, NEC-01..04, DG-01..04)
- **D-01:** The audit uses an automated script approach: read official sources (Wahapedia pages, GW app data) and compare field-by-field against the values in `unit_database.json`. Not manual spot-checking.
- **D-02:** Audit order is SM first (largest faction, 298 units), then Necrons (64 units), then Death Guard (71 units). Each faction produces its own audit report.
- **D-03:** The audit covers both matched units (verify data correctness) AND unmatched units (categorize as Legends, Forge World, missing alias, or genuinely missing from BSData).

### Error Documentation Format
- **D-04:** Each faction audit produces a structured JSON report listing every error found: `{ unit_id, unit_name, field, expected, actual, source, severity }`. Severity levels: `error` (wrong value), `missing` (field empty when source has data), `extra` (data present but not in source).
- **D-05:** A summary markdown file accompanies each JSON report with human-readable tables: error counts by category, most common error patterns, and the unmatched units classification.

### Verification Scope
- **D-06:** For matched units: verify all fields — base_points, model stats (M/T/Sv/inv_sv/W/Ld/OC), weapon profiles (name, category, range, attacks, skill, strength, ap, damage, keywords), ability text (name, description, ability_type), keywords (keyword, is_faction), and role.
- **D-07:** For unmatched units: classify each as Legends (marked Legends on Wahapedia), Forge World (FW-only model), missing alias (exists in Wahapedia but name mismatch), or genuinely unavailable. This classification feeds Phase 114's alias improvements.
- **D-08:** Points verification includes both `base_points` on the unit record AND `points` tiers (model_count → points) where BSData provides tier data.

### French Translation Audit
- **D-09:** Check completeness: every matched unit should have `name_fr` populated in `translations_fr.json`. Every weapon and ability for matched units should have `name_fr` (and `description_fr` for abilities where applicable).
- **D-10:** Verify correctness against French Wahapedia where available. Flag translations that look machine-translated or have obvious errors.
- **D-11:** French translations for unmatched/Legends units are out of scope — only verify translations for units that are matched and have data in the database.

### Data Sources
- **D-12:** Primary sources for verification: Wahapedia (web scraping or cached pages), GW app (Munitorum field manual for points), BSData XML for raw stat extraction. Cross-reference when sources disagree.
- **D-13:** When sources conflict, Wahapedia takes precedence for stats/weapons/abilities (most frequently updated), GW app/Munitorum for points (official source).

### Claude's Discretion
- Script structure and file organization for audit tooling
- How to efficiently read/parse Wahapedia data for comparison (web fetch vs cached HTML vs API)
- Error report file naming and location within `.planning/`
- Whether to audit unit composition data (model counts/options) or defer to Phase 114

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build Pipeline & Data Files
- `scripts/build-unit-db.ts` — Primary build script that produces unit_database.json; contains matching logic
- `scripts/lib/bsdata.ts` — Shared BSData parsing library (extracted in Phase 112)
- `scripts/lib/normalize.ts` — Name normalization + alias loading
- `scripts/lib/factionMap.ts` — FACTION_MAP, SUB_FACTION_MAP, CROSS_FACTION_MAP
- `scripts/lib/types.ts` — TypeScript interfaces for the build pipeline
- `scripts/data/aliases.json` — Manual name mappings (BSData→Wahapedia); audit may suggest new entries
- `scripts/data/translations_fr.json` — French translation overlay; verified/corrected by this phase
- `scripts/data/coverage-report.json` — Current coverage data showing matched/unmatched per faction

### Database Output
- `src-tauri/data/unit_database.json` — The canonical database being audited; contains units, models, weapons, abilities, keywords, points, composition

### Requirements
- `.planning/REQUIREMENTS.md` §Data Audit — Space Marines (SM-01..04), §Data Audit — Necrons (NEC-01..04), §Data Audit — Death Guard (DG-01..04)

### Prior Phase Context
- `.planning/phases/112-build-pipeline-hardening/112-CONTEXT.md` — Pipeline hardening decisions (coverage reporting, shared lib, alias validation)

</canonical_refs>

<code_context>
## Existing Code Insights

### Current Data State
- SM: 298 total units, 182 matched (175 exact + 4 normalized + 3 alias), 122 unmatched, 161 with base_points
- NEC: 64 total units, 53 matched (45 exact + 4 normalized + 4 alias), 13 unmatched, 51 with base_points
- DG: 71 total units, 36 matched (35 exact + 0 normalized + 1 alias), 35 unmatched, 36 with base_points
- Points tiers (model_count → points) exist for only 110 units total across all factions
- Many weapon entries have empty `range` fields; abilities have some empty `name`/`description` fields

### Database Structure (unit_database.json)
- `units[]`: id, faction_id, name, role, base_points, damaged_w, damaged_desc, sub_faction, name_fr
- `models[]`: unit_id, line_order, name, M, T, Sv, inv_sv, W, Ld, OC (stat block)
- `weapons[]`: unit_id, weapon_group, line_order, name, category, range, attacks, skill, strength, ap, damage, keywords, name_fr
- `abilities[]`: unit_id, line_order, name, description, ability_type, name_fr, description_fr
- `keywords[]`: unit_id, keyword, is_faction, keyword_fr
- `points[]`: unit_id, model_count, points (tier-based points, sparse)
- `composition[]`: unit_id, min, max, model_name (only 12 entries total)

### Reusable Assets
- `scripts/lib/parseCsv.ts` — Can read Wahapedia CSV exports for comparison data
- `scripts/lib/parseXml.ts` — Can read BSData XML for raw stat extraction
- Coverage report JSON already categorizes matched/unmatched per faction with names

### Integration Points
- Audit errors feed directly into Phase 114 pipeline fixes
- New alias suggestions feed into `aliases.json` updates
- French translation corrections go into `translations_fr.json`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard data auditing approaches. The audit should be thorough enough that Phase 114 has a clear, actionable error list to work from.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 113-Priority Faction Data Audit*
*Context gathered: 2026-06-03*
