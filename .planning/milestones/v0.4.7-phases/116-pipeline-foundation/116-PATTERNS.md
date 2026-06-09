# Phase 116: Pipeline Foundation - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 6 (5 modified, 1 new)
**Analogs found:** 5 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/lib/parseCsv.ts` | utility | transform | itself (surgical edit) | exact |
| `scripts/build-unit-db.ts` | utility | batch | `scripts/update-unit-database.ts` | exact |
| `scripts/update-unit-database.ts` | utility | batch | `scripts/build-unit-db.ts` | exact |
| `scripts/download-wahapedia.ts` | utility | file-I/O | `scripts/build-unit-db.ts` (fs/import patterns) | role-match |
| `package.json` | config | — | itself (add one script entry) | exact |
| `tests/build-pipeline/parseCsv.test.ts` | test | — | itself (add test cases) | exact |

---

## Pattern Assignments

### `scripts/lib/parseCsv.ts` (utility, transform)

**Analog:** itself — single surgical edit to existing function

**Full current source** (lines 1-21):
```typescript
/**
 * Wahapedia CSV parser -- pipe-delimited, UTF-8, trailing pipe on every row.
 *
 * Extracted from build-unit-db.ts for shared use by both build scripts.
 */

/**
 * Parse a pipe-delimited Wahapedia CSV string into an array of record objects.
 * Each record maps header names to trimmed string values.
 */
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

**PF-01 change — insert BOM strip before line split:**
```typescript
export function parseWahapediaCsv(raw: string): Record<string, string>[] {
  const cleaned = raw.replace(/^﻿/, ""); // strip UTF-8 BOM if present
  const lines = cleaned.trim().split("\n");
  // ... rest unchanged
}
```

**Critical rule:** Apply `replace(/^﻿/, "")` to the full `raw` string before `.trim().split("\n")`, NOT per-line. BOM appears once, at file start only.

---

### `scripts/build-unit-db.ts` (utility, batch — Step 3 edit)

**Analog:** `scripts/update-unit-database.ts` (mirror script, identical Step 3 loop)

**Imports pattern** (lines 24-47):
```typescript
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCatXml } from "./lib/parseXml.ts";
import { loadAliases } from "./lib/normalize.ts";
import { SUB_FACTION_MAP, CROSS_FACTION_MAP } from "./lib/factionMap.ts";
import { readCsvFile, readBsdataCatFiles, parseBsdataModelCounts, matchUnit } from "./lib/bsdata.ts";
import { mapWeaponRow } from "./lib/weaponMapping.ts";
import type { UdbFactionRow, UdbUnitRow, ... } from "./lib/types.ts";
```

**Existing REQUIRED_CSVs array** (lines 76-83 — DO NOT change in Phase 116):
```typescript
const REQUIRED_CSVs = [
  "Factions.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Datasheets_wargear.csv",
] as const;
```

**Current Step 3 unit parse loop** (lines 197-220 — this is what gets modified):
```typescript
for (const row of datasheetsRaw) {
  const id = row["id"]?.trim();
  const factionId = row["faction_id"]?.trim();
  const name = row["name"]?.trim();
  if (!id || !name) continue;
  if (factionId && !factionIds.has(factionId)) {
    console.warn(`  WARNING: Skipping unit "${name}" (id=${id}) — unknown faction_id "${factionId}"`);
    continue;
  }

  validUnitIds.add(id);
  units.push({
    id,
    faction_id: factionId ?? "",
    name,
    role: row["role"]?.trim() ?? "",
    base_points: null, // filled later from BSData single-tier units
    damaged_w: row["damaged_w"]?.trim() ?? "",
    damaged_desc: row["damaged_description"]?.trim() ?? "",
    sub_faction: null, // populated from SUB_FACTION_MAP during BSData matching
    name_fr: null,
  });
}
console.log("  Parsed " + units.length + " units");
```

**PF-03/PF-04 change pattern — insert legend filter + dedup after the loop:**
```typescript
// PF-03: track legends count for build summary
let legendsSkipped = 0;

for (const row of datasheetsRaw) {
  const id = row["id"]?.trim();
  const factionId = row["faction_id"]?.trim();
  const name = row["name"]?.trim();
  if (!id || !name) continue;

  // PF-03: filter out Legends units before any downstream processing
  const isLegend = row["legend"] === "1" || row["legend"] === "true";
  if (isLegend) {
    legendsSkipped++;
    continue;
  }

  if (factionId && !factionIds.has(factionId)) {
    console.warn(`  WARNING: Skipping unit "${name}" (id=${id}) — unknown faction_id "${factionId}"`);
    continue;
  }

  validUnitIds.add(id);
  units.push({
    id,
    faction_id: factionId ?? "",
    name,
    role: row["role"]?.trim() ?? "",
    base_points: null,
    damaged_w: row["damaged_w"]?.trim() ?? "",
    damaged_desc: row["damaged_description"]?.trim() ?? "",
    sub_faction: null, // populated from SUB_FACTION_MAP during BSData matching (Phase 117 decouples)
    name_fr: null,
  });
}
console.log(`  Parsed ${units.length} units (${legendsSkipped} Legends units excluded)`);

// PF-04: warn on remaining name+faction duplicates (genuine Wahapedia data issues)
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
// Replace units with deduped list before building unitByNameFaction
```

**Sub-faction assignment** (lines 382-384 — DO NOT change in Phase 116):
```typescript
// Sub-faction population (D-09/SF-01/SF-02)
if (subFaction && unit.sub_faction === null) {
  unit.sub_faction = subFaction;
}
// NOTE: subFaction = SUB_FACTION_MAP[catFile.catalogueName] (BSData catalogue name)
// This stays in place for Phase 116. Removal in Phase 117.
```

---

### `scripts/update-unit-database.ts` (utility, batch — Step 3 mirror edit)

**Analog:** `scripts/build-unit-db.ts` (primary script; same Step 3 structure)

**Existing Step 3 loop** (lines 122-153 — same shape as build-unit-db.ts, needs the same PF-03/PF-04 changes):
```typescript
for (const row of datasheetsRaw) {
  const id = row["id"]?.trim();
  const factionId = row["faction_id"]?.trim();
  const name = row["name"]?.trim();
  if (!id || !name) continue;
  if (factionId && !factionIds.has(factionId)) {
    console.warn(`  WARNING: Skipping unit "${name}" (id=${id}) — unknown faction_id "${factionId}"`);
    continue;
  }

  validUnitIds.add(id);
  units.push({
    id,
    faction_id: factionId ?? "",
    name,
    role: row["role"]?.trim() ?? "",
    base_points: null,
    damaged_w: row["damaged_w"]?.trim() ?? "",
    damaged_desc: row["damaged_description"]?.trim() ?? "",
    sub_faction: null,
    name_fr: null,
  });
}
```

**Sub-faction assignment** (lines 244-249 — DO NOT change in Phase 116):
```typescript
// Sub-faction population (mirrors build-unit-db.ts SUB_FACTION_MAP usage)
if (subFaction && unit.sub_faction === null) {
  unit.sub_faction = subFaction;
}
```

Apply identical PF-03/PF-04 changes as `build-unit-db.ts`. The two scripts share `readCsvFile` from `scripts/lib/bsdata.ts` but each has its own copy of the Step 3 loop.

---

### `scripts/download-wahapedia.ts` (utility, file-I/O — NEW file)

**Analog:** `scripts/build-unit-db.ts` (establishes `__dirname`, `DATA_DIR`, `node:fs` import pattern)

**File header + path setup pattern** (from build-unit-db.ts lines 49-52):
```typescript
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");
const DATA_DIR = join(REPO_ROOT, "scripts", "data");
```

**Node built-in imports pattern** (from build-unit-db.ts lines 24-26):
```typescript
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
```

**Console log step pattern** (from build-unit-db.ts lines 152-156):
```typescript
console.log("=== HobbyForge Unit Database Builder ===");
console.log("Data directory: " + DATA_DIR);
```

**New file full pattern** (from RESEARCH.md Pattern 5 — reference implementation):
```typescript
// scripts/download-wahapedia.ts
import { writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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
  const res = await fetch(url, {
    headers: { "User-Agent": "HobbyForge-UDB-Builder/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  console.log(`  Written: ${dest} (${(buf.length / 1024).toFixed(1)} KB)`);
}
```

**Notes:**
- No top-level `async function main()` wrapper needed — Node 24 supports top-level `await` natively
- Add `User-Agent` header per RESEARCH.md open question #2 (Wahapedia bot detection)
- Check `res.ok` before `res.arrayBuffer()` to avoid writing empty files (RESEARCH.md Pitfall 6)

---

### `package.json` (config — add one script entry)

**Analog:** itself — copy the `build:udb` script entry pattern

**Existing script entry** (line 14):
```json
"build:udb": "node --experimental-strip-types scripts/build-unit-db.ts"
```

**New entry to add** (same `node --experimental-strip-types` invocation pattern):
```json
"download:wahapedia": "node --experimental-strip-types scripts/download-wahapedia.ts"
```

---

### `tests/build-pipeline/parseCsv.test.ts` (test — add cases)

**Analog:** itself — copy the existing `describe`/`it`/`expect` pattern

**Existing test structure** (lines 1-9):
```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseWahapediaCsv } from "../../scripts/lib/parseCsv.ts";

describe("parseWahapediaCsv: DQ-07 — Wahapedia pipe-delimited CSV parsing", () => {
  it("...", () => { ... });
});
```

**New test cases to add** (PF-01 requirement):
```typescript
it("strips UTF-8 BOM from the beginning of the string (PF-01)", () => {
  // U+FEFF BOM prepended to a normal CSV string
  const raw = "﻿id|name|\nSM|Space Marines|\n";
  const result = parseWahapediaCsv(raw);
  expect(result).toHaveLength(1);
  // Key must be "id", not "﻿id"
  expect(result[0]["id"]).toBe("SM");
  expect(Object.keys(result[0])).not.toContain("﻿id");
});

it("returns correct records when no BOM is present (regression guard)", () => {
  const raw = "id|name|\nSM|Space Marines|\n";
  const result = parseWahapediaCsv(raw);
  expect(result[0]["id"]).toBe("SM");
});
```

---

## Shared Patterns

### File I/O Pattern
**Source:** `scripts/build-unit-db.ts` lines 24-26 and 49-51
**Apply to:** `scripts/download-wahapedia.ts`
```typescript
import { writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### Console Logging Pattern
**Source:** `scripts/build-unit-db.ts` lines 152-173
**Apply to:** `scripts/download-wahapedia.ts`, modified Step 3 in both build scripts
- Use `console.log("  Found: " + csv)` with 2-space indent for items
- Use `console.warn(`  WARNING: ...`)` for non-fatal anomalies
- Use `console.error("ERROR: ...")` + `process.exit(1)` for fatal failures

### Warning Emission Pattern
**Source:** `scripts/build-unit-db.ts` lines 202-205
**Apply to:** PF-04 dedup warning in both build scripts
```typescript
console.warn(`  WARNING: Skipping unit "${name}" (id=${id}) — unknown faction_id "${factionId}"`);
```

### `node --experimental-strip-types` Script Pattern
**Source:** `package.json` line 14
**Apply to:** New `download:wahapedia` package.json script entry
```json
"build:udb": "node --experimental-strip-types scripts/build-unit-db.ts"
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/lib/factionMap.ts` | config | — | Read-only in Phase 116 — no changes needed; `SUB_FACTION_MAP` is preserved as-is |

---

## Anti-Patterns (from RESEARCH.md)

| Anti-Pattern | Correct Approach |
|---|---|
| Apply BOM fix per-line or only to header | Apply `replace(/^﻿/, "")` to full `raw` string before `.trim().split("\n")` |
| Add all 10 download CSVs to `REQUIRED_CSVs` in build script | `REQUIRED_CSVs` stays at 6 in Phase 116; expand in Phase 117 when those files are actually parsed |
| Remove BSData sub_faction assignment loop | Keep BSData sub_faction assignment — Phase 117 decouples it when BSData XML is removed |
| Mirror changes only to `build-unit-db.ts` | Apply PF-03/PF-04 to both `build-unit-db.ts` AND `update-unit-database.ts` |
| Add `fetch()` call inside `build-unit-db.ts` | D-03 is locked: download is always a separate `pnpm download:wahapedia` step |
| Write file before checking `res.ok` | Always check `if (!res.ok) throw new Error(...)` before `await res.arrayBuffer()` |

---

## Metadata

**Analog search scope:** `scripts/`, `tests/build-pipeline/`
**Files scanned:** 11 script files + 9 test files
**Pattern extraction date:** 2026-06-04
