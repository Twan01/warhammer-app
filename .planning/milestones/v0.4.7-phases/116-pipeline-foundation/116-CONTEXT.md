# Phase 116: Pipeline Foundation - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the build pipeline reliably parse all Wahapedia CSVs and produce a clean, deduplicated unit dataset. Four concrete deliverables: BOM fix for CSV headers, auto-download command for Wahapedia CSVs, Legends unit filtering/dedup, and sub-faction static mapping preservation.

</domain>

<decisions>
## Implementation Decisions

### BOM Handling (PF-01)
- **D-01:** Strip UTF-8 BOM in `parseWahapediaCsv()` in `scripts/lib/parseCsv.ts` (centralized). This is the single entry point for all CSV parsing — one fix covers all current and future CSV files.

### Auto-Download Command (PF-02)
- **D-02:** Create `pnpm download:wahapedia` as a new script (e.g., `scripts/download-wahapedia.ts`) that fetches all CSVs needed for the full v0.4.7 milestone from wahapedia.ru, not just the 6 currently used. Include: Factions.csv, Datasheets.csv, Datasheets_models.csv, Datasheets_abilities.csv, Datasheets_keywords.csv, Datasheets_wargear.csv, Datasheets_models_cost.csv, Stratagems.csv, Enhancements.csv, Detachment_abilities.csv.
- **D-03:** Download script is separate from `pnpm build:udb` — deterministic builds require pre-fetched CSVs, not runtime downloads.
- **D-04:** Use Node.js built-in `fetch` (available in Node 18+) — no new HTTP dependency needed. Wahapedia CSVs are at predictable URLs under `wahapedia.ru/wh40k10ed/`.

### Legends Filtering (PF-03, PF-04)
- **D-05:** Filter Legends units during Step 3 (Datasheets.csv parsing) using the `legend` column, before adding IDs to `validUnitIds`. This means all downstream parsing (models, abilities, keywords, weapons) automatically skips Legends units.
- **D-06:** After Legends filtering, warn on any remaining name+faction duplicates rather than silently discarding. These would indicate genuine Wahapedia data issues.

### Sub-faction Mapping (PF-04 related)
- **D-07:** `SUB_FACTION_MAP` in `scripts/lib/factionMap.ts` already implements the static mapping pattern (17 entries covering SM chapters, CSM warbands, Aeldari sub-factions). No schema change needed — just preserve it through the pipeline changes.
- **D-08:** Sub-faction assignment currently happens during BSData matching. As BSData is being phased out (Phase 117), the sub-faction assignment logic must be decoupled from BSData matching — assign from `SUB_FACTION_MAP` based on Wahapedia faction_id directly.

### Claude's Discretion
- Download script implementation details (error handling, progress output, retry behavior)
- Exact console log format for Legends filtering stats
- Whether to add a `--force` flag to re-download existing CSVs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build Pipeline
- `scripts/build-unit-db.ts` — Main build script; Steps 1-3 need modification for BOM fix and Legends filter
- `scripts/lib/parseCsv.ts` — CSV parser; BOM fix goes here (line 14, `lines[0].split`)
- `scripts/lib/bsdata.ts` — `readCsvFile()` uses `parseCsv.ts`; shared by both build scripts
- `scripts/lib/factionMap.ts` — `SUB_FACTION_MAP` and `CROSS_FACTION_MAP` static mapping
- `scripts/update-unit-database.ts` — Parallel build script; must also get Legends filter

### Data Files
- `scripts/data/` — Wahapedia CSV directory; currently has 6 CSVs, needs 4 more
- `src-tauri/data/unit_database.json` — Output of build pipeline

### Package Config
- `package.json` — Add `download:wahapedia` script; currently has `build:udb`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `parseWahapediaCsv()` in `scripts/lib/parseCsv.ts`: Central CSV parser — BOM fix here covers everything
- `readCsvFile()` in `scripts/lib/bsdata.ts`: Wraps `parseWahapediaCsv` with file I/O — no change needed
- `SUB_FACTION_MAP` in `scripts/lib/factionMap.ts`: Already has 17 static entries — reuse directly

### Established Patterns
- Build pipeline follows numbered steps (Step 1: verify CSVs, Step 2: factions, Step 3: units, etc.)
- `REQUIRED_CSVs` array enforces file existence checks before build
- Both `build-unit-db.ts` and `update-unit-database.ts` share the same lib functions
- `readFileSync(path, "utf-8")` is the standard file read pattern throughout scripts/

### Integration Points
- `parseCsv.ts` line 14: `lines[0].split("|")` — BOM would corrupt first header, causing silent field mismatch
- `build-unit-db.ts` line 196-219: Unit parsing loop — add `legend` column check here
- `build-unit-db.ts` line 76-83: `REQUIRED_CSVs` array — expand for download script's target list
- `package.json` scripts section — add `download:wahapedia` entry

</code_context>

<specifics>
## Specific Ideas

- Wahapedia CSV URLs follow pattern: `wahapedia.ru/wh40k10ed/Factions.csv` (pipe-delimited, UTF-8, potential BOM)
- The `legend` column in Datasheets.csv is the authoritative Legends flag — no need for name-pattern matching
- BSData's `[Legends]` tag in XML (seen in `parseXml.ts` line 64, 111) is a separate concern — those filters stay for BSData parsing until Phase 117 removes it entirely

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 116-Pipeline Foundation*
*Context gathered: 2026-06-04*
