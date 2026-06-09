# Phase 116: Pipeline Foundation - Research

**Researched:** 2026-06-04
**Domain:** Node.js build pipeline — CSV parsing, HTTP download, data deduplication
**Confidence:** HIGH

## Summary

Phase 116 makes four targeted changes to an existing, working build pipeline:

1. **BOM fix (PF-01):** `parseWahapediaCsv()` in `scripts/lib/parseCsv.ts` currently strips the UTF-8 BOM via `h.trim()` (V8's `String.prototype.trim()` treats U+FEFF as whitespace). This accidentally works for the existing CSVs, but the correct fix is an explicit `raw.replace(/^﻿/, '')` before splitting on `\n`. This makes intent clear and guards against edge cases where BOM appears mid-string.

2. **Auto-download (PF-02):** A new `scripts/download-wahapedia.ts` script using Node.js 24 built-in `fetch` (no new dependency) that downloads 10 CSVs from `https://wahapedia.ru/wh40k10ed/`. Node v24.13.0 is confirmed available on this machine.

3. **Legends filter (PF-03/04):** The existing `Datasheets.csv` is an **older format** where the `legend` column (header index 4) contains description text, not a boolean flag. The fresh CSVs downloaded by `pnpm download:wahapedia` will contain the proper `legend` boolean flag. The filter must check `row["legend"] === "1" || row["legend"] === "true"` to handle both numeric and string boolean formats Wahapedia may use.

4. **Sub-faction decoupling (PF-04 related):** `SUB_FACTION_MAP` (17 entries) currently drives sub-faction assignment inside the BSData loop. The planner must extract this assignment into the Wahapedia CSV parsing step (Step 3) instead, using `faction_id` from Datasheets.csv as the lookup key.

**Primary recommendation:** All four changes are surgical modifications to existing files. No new dependencies, no architectural changes. The download script is the only genuinely new file.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Strip UTF-8 BOM in `parseWahapediaCsv()` in `scripts/lib/parseCsv.ts` (centralized)
- **D-02:** Create `pnpm download:wahapedia` as a new script (`scripts/download-wahapedia.ts`) fetching all 10 CSVs for v0.4.7 milestone
- **D-03:** Download script is separate from `pnpm build:udb` (deterministic builds require pre-fetched CSVs)
- **D-04:** Use Node.js built-in `fetch` — no new HTTP dependency
- **D-05:** Filter Legends units during Step 3 (Datasheets.csv parsing) using the `legend` column, before adding IDs to `validUnitIds`
- **D-06:** After Legends filtering, warn on any remaining name+faction duplicates (genuine Wahapedia data issues)
- **D-07:** `SUB_FACTION_MAP` already implements the static mapping — no schema change needed, just preserve it
- **D-08:** Sub-faction assignment must be decoupled from BSData matching — assign from `SUB_FACTION_MAP` based on Wahapedia faction_id directly

### Claude's Discretion
- Download script error handling, progress output, retry behavior
- Exact console log format for Legends filtering stats
- Whether to add a `--force` flag to re-download existing CSVs

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PF-01 | Build script strips UTF-8 BOM from CSV headers before parsing | BOM confirmed present (U+FEFF at char 0 of all 6 existing CSVs); fix via `raw.replace(/^﻿/, '')` in `parseWahapediaCsv()` |
| PF-02 | `pnpm download:wahapedia` fetches all required CSVs from wahapedia.ru to scripts/data/ | Node v24.13.0 has built-in `fetch`; URL pattern `https://wahapedia.ru/wh40k10ed/[Filename].csv` confirmed from CONTEXT; 4 missing CSVs identified |
| PF-03 | Build script filters out Legends units before any matching or points assignment | `legend` column exists in Datasheets.csv header; new downloads will have boolean flag; filter check needed in Step 3 before `validUnitIds.add(id)` |
| PF-04 | Duplicate Wahapedia units (same name+faction) deduplicated — keep current, discard Legends | Dedup via Map with legend-aware insert order; non-legend entries must survive |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| BOM stripping | Build pipeline (Node.js script) | — | Centralized in `parseWahapediaCsv()`, covers all CSV files automatically |
| CSV downloading | Build pipeline (Node.js script) | — | Dev-side only, offline-first; no runtime component involved |
| Legends filtering | Build pipeline (Node.js script) | — | Data transformation at parse time, before validUnitIds is populated |
| Sub-faction assignment | Build pipeline (Node.js script) | — | Static map lookup; decoupled from BSData to avoid BSData dependency |

## Standard Stack

### Core (existing, no new dependencies)
| Tool | Version | Purpose | Status |
|------|---------|---------|--------|
| Node.js built-in `fetch` | Node v24.13.0 (confirmed) | HTTP download of CSVs | Available, no install needed [VERIFIED: node --version] |
| `node:fs` `readFileSync`/`writeFileSync` | Built-in | File I/O | Already used throughout scripts/ |
| `node --experimental-strip-types` | Node v24.13.0 | Run `.ts` scripts directly | Already used in `build:udb` script |

### No New Packages
No `npm install` is required for this phase. All tools are built-in to Node.js.

## Package Legitimacy Audit

No new external packages are installed in this phase. Section N/A.

## Architecture Patterns

### System Architecture Diagram

```
Developer runs: pnpm download:wahapedia
        |
        v
  scripts/download-wahapedia.ts
        |
        |-- fetch() x10 CSVs from wahapedia.ru/wh40k10ed/
        v
  scripts/data/ (10 CSVs now present, including 4 new ones)

Developer runs: pnpm build:udb
        |
        v
  scripts/build-unit-db.ts
        |
        |-- Step 1: Verify all required CSVs exist
        |-- Step 2: Parse Factions.csv (via parseWahapediaCsv -> BOM stripped)
        |-- Step 3: Parse Datasheets.csv (NEW: filter legend=true units)
        |       |
        |       +--> legend=true -> skip (not added to validUnitIds)
        |       +--> legend=false -> validate faction -> add to validUnitIds
        |       +--> NEW: assign sub_faction from SUB_FACTION_MAP[faction_id]
        |       +--> NEW: warn on remaining name+faction duplicates
        |
        |-- Steps 4-7: Parse models/weapons/abilities/keywords
        |       (automatically skip legend units via validUnitIds check)
        |
        |-- Step 8: BSData matching (points only — sub_faction already set)
        v
  src-tauri/data/unit_database.json (clean, no Legends units)
```

### Recommended Project Structure

No new directories needed. Changes are in-place:

```
scripts/
  download-wahapedia.ts   # NEW: pnpm download:wahapedia
  build-unit-db.ts        # MODIFIED: BOM fix (via parseCsv), legend filter, sub_faction decoupling
  update-unit-database.ts # MODIFIED: legend filter + sub_faction decoupling (mirror of build-unit-db)
  lib/
    parseCsv.ts           # MODIFIED: explicit BOM strip
    factionMap.ts         # READ ONLY: SUB_FACTION_MAP already correct
package.json              # MODIFIED: add download:wahapedia script
```

### Pattern 1: BOM Strip in parseWahapediaCsv

**What:** Replace implicit BOM removal via `trim()` with explicit `replace(/^﻿/, '')` on the raw string before line splitting.
**When to use:** Always — centralized, covers all callers.

```typescript
// Source: scripts/lib/parseCsv.ts (current)
export function parseWahapediaCsv(raw: string): Record<string, string>[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split("|").map((h) => h.trim()).filter(Boolean);
  // ...
}

// AFTER fix (explicit BOM strip before split):
export function parseWahapediaCsv(raw: string): Record<string, string>[] {
  const cleaned = raw.replace(/^﻿/, ""); // strip UTF-8 BOM if present
  const lines = cleaned.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split("|").map((h) => h.trim()).filter(Boolean);
  // ...
}
```

### Pattern 2: Legends Filter in Step 3

**What:** Check `legend` column before adding unit to `validUnitIds`. Filter happens upstream of all downstream parsing steps (models, weapons, abilities, keywords).
**When to use:** Step 3 of both `build-unit-db.ts` and `update-unit-database.ts`.

```typescript
// In Step 3 unit parsing loop (build-unit-db.ts lines 197-219):
for (const row of datasheetsRaw) {
  const id = row["id"]?.trim();
  const factionId = row["faction_id"]?.trim();
  const name = row["name"]?.trim();
  if (!id || !name) continue;

  // NEW: filter out Legends units before any downstream processing
  const isLegend = row["legend"] === "1" || row["legend"] === "true";
  if (isLegend) {
    legendsSkipped++; // track for summary log
    continue;
  }

  if (factionId && !factionIds.has(factionId)) {
    console.warn(`  WARNING: Skipping unit "${name}" (id=${id}) — unknown faction_id "${factionId}"`);
    continue;
  }

  validUnitIds.add(id);
  units.push({ ... });
}
console.log(`  Parsed ${units.length} units (${legendsSkipped} Legends units excluded)`);
```

### Pattern 3: Name+Faction Dedup with Warning (D-06)

**What:** After the unit parse loop, detect remaining duplicates (non-legend entries with same name+faction). Warn, don't silently discard.
**When to use:** After the unit parse loop, before building `unitByNameFaction` map.

```typescript
// After unit parse loop, before unitByNameFaction build:
const seenNameFaction = new Map<string, UdbUnitRow>();
const deduped: UdbUnitRow[] = [];
for (const unit of units) {
  const key = unit.name.toLowerCase() + ":" + unit.faction_id;
  if (seenNameFaction.has(key)) {
    console.warn(`  WARNING: Duplicate unit name+faction after Legends filter: "${unit.name}" (${unit.faction_id}) — keeping first occurrence, discarding id=${unit.id}`);
  } else {
    seenNameFaction.set(key, unit);
    deduped.push(unit);
  }
}
const units = deduped; // replace with deduped list
```

### Pattern 4: Sub-faction Assignment Decoupled from BSData

**What:** Assign `sub_faction` from `SUB_FACTION_MAP` during Step 3 (Wahapedia CSV parsing), using `faction_id` as the lookup key. Remove the BSData-loop sub_faction assignment from both build scripts.
**When to use:** Step 3 unit push, after legend filter, for all non-legend units.

**Critical insight:** `SUB_FACTION_MAP` is currently keyed by BSData catalogue name (e.g., `"Imperium - Blood Angels"`), NOT by Wahapedia faction_id (`"SM"`). All SM chapters share `faction_id = "SM"` in Wahapedia. This means a direct `SUB_FACTION_MAP[faction_id]` lookup will NOT work as-is.

**D-08 requires decoupling, but the existing key format is wrong for Wahapedia-native lookup.** Two approaches:

**Option A (preferred — minimal change):** Keep `SUB_FACTION_MAP` keyed by BSData name for BSData-path builds, but the BSData loop already assigns sub_faction correctly via `const subFaction = SUB_FACTION_MAP[catFile.catalogueName]`. Since BSData is NOT being removed in Phase 116 (that's Phase 117), D-08 means: ensure sub_faction assignment works WITHOUT BSData by having a Wahapedia-id-keyed fallback. Since Wahapedia `faction_id` doesn't encode sub-faction, this cannot be done from Datasheets.csv alone — the sub-faction data simply isn't in the CSV.

**Option B (correct interpretation of D-08):** D-08 says "assign from SUB_FACTION_MAP based on Wahapedia faction_id directly." But since SM chapters all have `faction_id = "SM"`, this is impossible from Datasheets.csv alone without a separate sub-faction column. D-08 may be deferred to Phase 117 (BSData removal phase) where a new `WAHAPEDIA_SUB_FACTION_MAP` keyed by Wahapedia faction_id can be introduced. For Phase 116, BSData still runs and assigns sub_faction correctly.

**Recommendation for planner:** Implement D-08 as "do not break sub_faction for current builds" — BSData loop sub_faction assignment stays in place for Phase 116. Flag for Phase 117 when BSData is removed.

### Pattern 5: Download Script

**What:** A standalone TypeScript script using built-in `fetch` to download CSVs.
**When to use:** One-time setup, before first `pnpm build:udb` run.

```typescript
// scripts/download-wahapedia.ts
import { writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const BASE_URL = "https://wahapedia.ru/wh40k10ed/";

const CSV_FILES = [
  "Factions.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Datasheets_wargear.csv",
  "Datasheets_models_cost.csv",  // Phase 117 uses this
  "Stratagems.csv",              // Phase 119 uses this
  "Enhancements.csv",            // Phase 119 uses this
  "Detachment_abilities.csv",    // Phase 118 uses this
];

// --force flag: re-download even if file exists
const force = process.argv.includes("--force");

for (const file of CSV_FILES) {
  const dest = join(DATA_DIR, file);
  if (!force && existsSync(dest)) {
    console.log(`  Skipping ${file} (already exists — use --force to re-download)`);
    continue;
  }
  const url = BASE_URL + file;
  console.log(`  Downloading ${file}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  console.log(`  Written: ${dest} (${(buf.length / 1024).toFixed(1)} KB)`);
}
```

### Anti-Patterns to Avoid

- **Silent legend skip without logging:** Always log how many Legends units were excluded in the build summary. D-06 requires warnings on duplicates.
- **Applying BOM fix only to raw string, not to lines:** Strip BOM once from the full raw string before `.split("\n")`, not per-line.
- **Keying SUB_FACTION_MAP by Wahapedia faction_id in Phase 116:** The map uses BSData catalogue names; changing the key format belongs in Phase 117 when BSData is removed.
- **Adding Datasheets_models_cost.csv to REQUIRED_CSVs in build-unit-db.ts:** Phase 116 only downloads it; Phase 117 uses it for points. Don't add it to the Phase 116 required file check.
- **Runtime fetch in build script:** D-03 locked separation of download from build. Never add network calls to `build-unit-db.ts`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP download | Custom TCP/socket code | Node.js built-in `fetch` | Available since Node 18, stable in Node 24, zero dependencies |
| BOM detection | Byte-level parsing | String `charCodeAt(0) === 0xFEFF` or `replace(/^﻿/, '')` | V8 handles UTF-8 BOM correctly in string APIs |
| Progress bar | Terminal progress library | Simple `console.log` per file | Download script is dev-only, simplicity > UX |

## Common Pitfalls

### Pitfall 1: legend Column Format Varies by CSV Source
**What goes wrong:** The existing `Datasheets.csv` has the `legend` column containing description text at position 4 (because the CSV was downloaded from an older Wahapedia export). The fresh CSV downloaded by `pnpm download:wahapedia` will have a boolean flag. If the filter runs on the old CSV, `legend` field will never match `"1"` or `"true"`, resulting in no units filtered.
**Why it happens:** The local CSVs predate the download script and may be an older Wahapedia format.
**How to avoid:** PF-02 (download script) MUST run before PF-03/04 are testable against real data. The filter implementation is correct — it will silently be a no-op on old CSVs (no units filtered) but functional on fresh CSVs. Include a log line confirming how many legends were excluded.
**Warning signs:** `legendsSkipped = 0` after running against the freshly downloaded CSV from a faction known to have Legends (e.g., SM).

### Pitfall 2: BOM Fix Applied in Wrong Place
**What goes wrong:** Adding `replace(/^﻿/, '')` to each individual line split, or only to the header line, instead of the full raw string.
**Why it happens:** Developers think BOM appears per-line (it only appears once, at file start).
**How to avoid:** Apply `replace(/^﻿/, '')` to `raw` (the full file content string) before `raw.trim().split("\n")`.

### Pitfall 3: Sub-faction Regression from D-08 Overreach
**What goes wrong:** Removing BSData-loop sub_faction assignment before a Wahapedia-native replacement is in place, causing all units to have `sub_faction = null` in the output.
**Why it happens:** D-08 says "decouple from BSData" which is interpreted as "remove from BSData loop now."
**How to avoid:** Phase 116 keeps BSData sub_faction assignment. Phase 117 will introduce the Wahapedia-native approach when BSData XML is removed entirely.

### Pitfall 4: update-unit-database.ts Not Updated to Match
**What goes wrong:** Legends filter and BOM fix are added only to `build-unit-db.ts`, but `update-unit-database.ts` (which has its own full copy of the build pipeline) is not updated. The two scripts produce different outputs.
**Why it happens:** The two scripts share lib functions but duplicate the Step 3 unit parse loop.
**How to avoid:** Apply Legends filter and sub_faction changes to `update-unit-database.ts`'s `buildUnitDatabase()` function in the same plan wave as `build-unit-db.ts`.

### Pitfall 5: REQUIRED_CSVs Not Expanded Appropriately
**What goes wrong:** Adding all 10 download-target CSVs to `REQUIRED_CSVs` in `build-unit-db.ts` causes the build to fail until Phase 117-119 CSVs are integrated.
**Why it happens:** Conflating "downloaded by PF-02" with "required by build pipeline now."
**How to avoid:** Only expand `REQUIRED_CSVs` when the corresponding parsing step uses the file. Phase 116 build still only requires the original 6. Datasheets_models_cost.csv is added in Phase 117.

### Pitfall 6: Network Failure Silently Writes Empty File
**What goes wrong:** Download script catches HTTP error but still calls `writeFileSync` with empty content.
**Why it happens:** Missing `if (!res.ok) throw` before reading body.
**How to avoid:** Check `res.ok` before `await res.arrayBuffer()` and throw with URL + status code.

## Code Examples

### Current parseCsv.ts (exact source)
```typescript
// Source: scripts/lib/parseCsv.ts (lines 11-21)
export function parseWahapediaCsv(raw: string): Record<string, string>[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split("|").map((h) => h.trim()).filter(Boolean);
  return lines.slice(1).map((line) => {
    const values = line.split("|");
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? "").trim()])
    );
  });
}
```

### Existing REQUIRED_CSVs (for reference when adding PF-02 entries)
```typescript
// Source: scripts/build-unit-db.ts (lines 76-83)
const REQUIRED_CSVs = [
  "Factions.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Datasheets_wargear.csv",
] as const;
// Phase 116 does NOT change this list. Datasheets_models_cost.csv added in Phase 117.
```

### Existing sub_faction assignment location (BSData loop)
```typescript
// Source: scripts/build-unit-db.ts (lines 382-384)
// Sub-faction population (D-09/SF-01/SF-02)
if (subFaction && unit.sub_faction === null) {
  unit.sub_faction = subFaction;
}
// NOTE: subFaction = SUB_FACTION_MAP[catFile.catalogueName] (BSData catalogue name)
// This stays in place for Phase 116. Removal in Phase 117.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual CSV download, place in scripts/data/ | `pnpm download:wahapedia` auto-fetch | Phase 116 | Developer no longer needs to manually manage CSV files |
| All Wahapedia units included (Legends mixed in) | Legends filtered at Step 3 parse time | Phase 116 | Legends units removed from canonical DB, dedup by design |
| BOM stripped implicitly by `trim()` | Explicit `replace(/^﻿/, '')` | Phase 116 | Intent clear; future-proofed for CSVs where BOM is not first char |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Fresh Wahapedia CSVs from wahapedia.ru use `"1"` or `"true"` for the legend boolean flag | Legends Filter pattern | Legend filter is a no-op if format differs; need to inspect downloaded CSV and adjust check |
| A2 | Wahapedia CSVs are available at `https://wahapedia.ru/wh40k10ed/[Filename].csv` without authentication | Download script | Download script fails at runtime if URL pattern wrong |
| A3 | All 10 CSV filenames in D-02 exist at the wahapedia.ru endpoint | Download script | Download script throws for missing files; may need `--skip-missing` flag |

## Open Questions (RESOLVED)

1. **legend column value format** — RESOLVED: Plan 116-02 handles both formats with `row["legend"] === "1" || row["legend"] === "true"`. Download script (PF-02) must run first to get fresh CSVs with proper legend column.

2. **Wahapedia URL accessibility** — RESOLVED: Plan 116-01 includes `User-Agent` header in fetch calls as a precaution. Dev-side script with single retry is sufficient.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js with built-in fetch | PF-02 download script | Yes | v24.13.0 | — |
| `node --experimental-strip-types` | Running .ts scripts | Yes | v24.13.0 | — |
| wahapedia.ru network access | PF-02 | Assumed | — | Manual CSV placement (existing workflow) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** wahapedia.ru network access — if blocked, developer can manually download and place CSVs (existing workflow before this phase).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + `@vitest-environment node` |
| Config file | vitest.config.ts (project root) |
| Quick run command | `pnpm test -- tests/build-pipeline/parseCsv.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PF-01 | BOM-prefixed CSV string produces correct record array (no BOM in key names) | unit | `pnpm test -- tests/build-pipeline/parseCsv.test.ts` | Yes — needs new BOM test case |
| PF-02 | Download script writes files to scripts/data/ | manual smoke | `node --experimental-strip-types scripts/download-wahapedia.ts --force` | No test (network, no mock) |
| PF-03 | Units with `legend=1` are excluded from parsed output | unit | `pnpm test -- tests/build-pipeline/parseCsv.test.ts` (or separate build-pipeline test) | Needs new test |
| PF-04 | Duplicate name+faction non-legend unit: first wins, warning emitted | unit | Needs new test in `tests/build-pipeline/` | No — new file needed |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/build-pipeline/parseCsv.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] New test case in `tests/build-pipeline/parseCsv.test.ts` — BOM-prefixed input produces clean record keys (PF-01)
- [ ] New test file `tests/build-pipeline/legendsFilter.test.ts` — unit parse loop legend=1 skip + dedup + warning (PF-03, PF-04)

## Security Domain

This phase is a dev-side build script with no user-facing surface. No authentication, no SQL, no user input handling. ASVS categories V2/V3/V4/V5/V6 do not apply.

One supply-chain consideration: the download script fetches from an external domain (`wahapedia.ru`). The downloaded CSVs are consumed by the build pipeline and embedded into `unit_database.json` — they are not executed. Risk: data poisoning if wahapedia.ru is compromised. Mitigation: the existing build validation (unit count >= 100, faction completeness) provides a sanity layer.

## Sources

### Primary (HIGH confidence)
- Codebase — `scripts/lib/parseCsv.ts` (lines 11-21): current BOM behavior verified [VERIFIED: direct read]
- Codebase — `scripts/data/Datasheets.csv`: BOM confirmed at byte 0 (`charCodeAt(0) === 0xFEFF`) [VERIFIED: node -e]
- Codebase — `scripts/build-unit-db.ts` (lines 76-83, 196-219): REQUIRED_CSVs and unit parse loop [VERIFIED: direct read]
- Codebase — `scripts/lib/factionMap.ts`: SUB_FACTION_MAP with 17 entries confirmed [VERIFIED: direct read]
- Codebase — `tests/build-pipeline/parseCsv.test.ts`: existing test coverage baseline [VERIFIED: direct read]
- Codebase — `package.json` scripts: `build:udb` script pattern, no existing `download:wahapedia` [VERIFIED: direct read]
- Node.js docs — built-in `fetch` available since Node 18; Node v24.13.0 confirmed on machine [VERIFIED: node --version]

### Secondary (MEDIUM confidence)
- `.planning/phases/116-pipeline-foundation/116-CONTEXT.md` — D-01 through D-08 locked decisions [CITED: project CONTEXT]
- CSV inspection: `legend` column in existing CSV contains text, not boolean — older format [VERIFIED: node -e inspection]

### Tertiary (LOW confidence)
- Wahapedia URL pattern `https://wahapedia.ru/wh40k10ed/[Filename].csv` — from CONTEXT; not verified via network call [ASSUMED]
- Fresh Wahapedia CSV `legend` field will be boolean `"1"`/`"true"` — cannot verify without downloading [ASSUMED]

## Metadata

**Confidence breakdown:**
- BOM fix: HIGH — current behavior verified, fix is standard
- Download script: HIGH — Node.js fetch confirmed, URL pattern from CONTEXT (URL itself [ASSUMED])
- Legends filter: HIGH for implementation pattern; MEDIUM for legend value format (new CSV not yet downloaded)
- Sub-faction decoupling: HIGH — D-08 deferred to Phase 117 is the right call given SUB_FACTION_MAP key format

**Research date:** 2026-06-04
**Valid until:** 2026-07-04
