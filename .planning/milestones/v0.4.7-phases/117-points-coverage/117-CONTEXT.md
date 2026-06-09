# Phase 117: Points Coverage - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace BSData XML-based points resolution with a direct join on Wahapedia's `Datasheets_models_cost.csv` using `datasheet_id`. Remove all BSData dependencies (`@xmldom/xmldom`, `.cat` parsing, fuzzy name matching, alias table). Achieve 90%+ points coverage across all factions.

</domain>

<decisions>
## Implementation Decisions

### Points Resolution Strategy (PTS-01)
- **D-01:** Parse `Datasheets_models_cost.csv` as a new build step (after Step 3 / Datasheets.csv). Join on `datasheet_id` — the field matches unit IDs already parsed from Datasheets.csv. No fuzzy matching needed.
- **D-02:** Multi-tier units (multiple rows per `datasheet_id`) produce one `UdbUnitPointsRow` per tier. The `description` field contains model counts (e.g., "5 models", "10 models") — extract the numeric model count from description via regex (`/(\d+)\s*model/`). For non-standard descriptions (e.g., "1 Spanner and 4 Burna Boyz"), sum all numeric values or fall back to the `line` field as tier order.
- **D-03:** Single-tier units (one row per `datasheet_id`) set `base_points` on the unit row directly, matching the current BSData single-cost pattern. This preserves downstream compatibility — the app already reads both `base_points` and the points tiers table.

### BSData Removal Scope (PTS-03)
- **D-04:** Remove the entire BSData pipeline: `@xmldom/xmldom` import and `DOMParser` polyfill, `readBsdataCatFiles()`, `parseCatXml()`, `parseBsdataModelCounts()`, `matchUnit()`, alias loading/validation, all BSData matching logic (Step 8 in current script), and `BSDATA_DIR` constant.
- **D-05:** Remove `@xmldom/xmldom` from `package.json` dependencies.
- **D-06:** Files to remove entirely: `scripts/lib/parseXml.ts` (XML parser), `scripts/data/aliases.json` (BSData-to-Wahapedia name map). Files to clean: `scripts/lib/bsdata.ts` (keep `readCsvFile()` which is used for CSV parsing, remove BSData-specific functions), `scripts/lib/normalize.ts` (keep if used elsewhere, remove `loadAliases` if only used for BSData).
- **D-07:** Apply the same changes to both `scripts/build-unit-db.ts` and `scripts/update-unit-database.ts` — they share the same pipeline structure.
- **D-08:** `scripts/audit-faction.ts` also imports `@xmldom/xmldom` and BSData functions — clean it up too.

### Composition Data (from BSData)
- **D-09:** Composition (min/max model counts from `parseBsdataModelCounts`) can be derived from cost CSV tiers. Multi-tier units' descriptions contain model counts for each tier — the min and max across tiers gives composition bounds. Single-tier units get their model count from the description field. This replaces BSData composition without data loss.

### Sub-faction Preservation (PTS-04)
- **D-10:** Sub-faction assignment via `SUB_FACTION_MAP` must be decoupled from BSData. Currently assigned during BSData matching when a catalogue name maps to a sub-faction. Instead, assign sub-factions by reverse-mapping: for each entry in `SUB_FACTION_MAP`, tag matching units by faction_id. The static map already contains the faction_id → sub-faction associations needed.
- **D-11:** `scripts/lib/factionMap.ts` (`SUB_FACTION_MAP`, `CROSS_FACTION_MAP`) stays as-is — it's pure data, no BSData dependency.

### Coverage Threshold (PTS-02)
- **D-12:** Raise `MIN_COVERAGE_PCT` from 58 to 90 after confirming the cost CSV join achieves the target. Current analysis shows 99.8% of units (1697/1701) have cost CSV entries — the threshold bump is safe.
- **D-13:** Update the coverage report to track "Wahapedia cost CSV" as the sole match method instead of exact/normalized/alias. Simplify coverage stats output.

### Claude's Discretion
- Model count extraction regex for non-standard descriptions (exact pattern)
- Whether to keep `readCsvFile()` in `bsdata.ts` or move it to `parseCsv.ts` (both reasonable)
- Coverage report format adjustments (column headers, badge thresholds)
- Whether to delete the `scripts/data/bsdata/` directory or just stop reading from it

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build Pipeline (modify)
- `scripts/build-unit-db.ts` — Main build script; replace Step 8 (BSData) with cost CSV join
- `scripts/update-unit-database.ts` — Parallel build script; same changes needed
- `scripts/audit-faction.ts` — Faction audit script; remove BSData imports

### Shared Libraries (modify/remove)
- `scripts/lib/bsdata.ts` — Keep `readCsvFile()`, remove BSData functions (`readBsdataCatFiles`, `parseBsdataModelCounts`, `matchUnit`)
- `scripts/lib/parseXml.ts` — Remove entirely (BSData XML parser)
- `scripts/lib/normalize.ts` — Check if `loadAliases` is only used for BSData; remove if so
- `scripts/lib/factionMap.ts` — Keep as-is; `SUB_FACTION_MAP` used for sub-faction assignment
- `scripts/lib/types.ts` — May need cleanup of BSData-specific types

### Data Files
- `scripts/data/Datasheets_models_cost.csv` — Source for points (pipe-delimited: `datasheet_id|line|description|cost|`)
- `scripts/data/aliases.json` — Remove (BSData-to-Wahapedia name map, no longer needed)
- `package.json` — Remove `@xmldom/xmldom` dependency

### Prior Phase Context
- `.planning/phases/116-pipeline-foundation/116-CONTEXT.md` — BOM fix, Legends filter, sub-faction map decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `readCsvFile()` in `scripts/lib/bsdata.ts`: CSV file reader wrapping `parseWahapediaCsv` — reuse for cost CSV parsing
- `UdbUnitPointsRow` type in `scripts/lib/types.ts`: Already defines `{unit_id, model_count, points}` — exact match for cost CSV output
- `parseWahapediaCsv()` in `scripts/lib/parseCsv.ts`: Central pipe-delimited CSV parser (already has BOM fix from Phase 116)
- `SUB_FACTION_MAP` in `scripts/lib/factionMap.ts`: 17 static entries — decouple from BSData and apply directly

### Established Patterns
- Build pipeline follows numbered steps; cost CSV becomes a new step replacing Step 8
- Both build scripts share the same lib functions — changes must be mirrored
- `validUnitIds` set gates all downstream parsing — cost CSV join naturally uses this
- Coverage report with per-faction stats already exists — simplify, don't restructure

### Integration Points
- Cost CSV `datasheet_id` matches unit IDs from Step 3 (Datasheets.csv) — direct join, no matching needed
- Multi-tier cost rows map 1:1 to `UdbUnitPointsRow` entries (same model_count + points structure)
- `MIN_COVERAGE_PCT` constant (line 62) — raise from 58 to 90
- `@xmldom/xmldom` import (line 20-22) — remove along with DOMParser polyfill

### Data Analysis
- Cost CSV: 2135 rows, 1707 unique datasheet_ids, covering 1697/1701 current units (99.8%)
- 1347 single-tier units, 360 multi-tier units in cost CSV
- 4 units without cost CSV entry — likely edge cases (investigate during implementation)

</code_context>

<specifics>
## Specific Ideas

- The `description` field in cost CSV uses patterns like "N models", "N ModelName and N ModelName" — a regex extracting all numbers and summing them gives the total model count for each tier
- The `line` field provides natural tier ordering (1, 2, 3...) — use as fallback for model_count if description parsing fails
- After BSData removal, the alias validation step (Step 8c) and `validateAliases()` function become dead code — remove entirely

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 117-Points Coverage*
*Context gathered: 2026-06-04*
