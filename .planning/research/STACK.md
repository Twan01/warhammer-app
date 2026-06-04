# Technology Stack: v0.4.7 Wahapedia Pipeline & Full Data Import

**Project:** HobbyForge v0.4.7
**Researched:** 2026-06-04
**Scope:** New capabilities only — auto-download, new CSV schemas, SQLite schema additions
**Overall confidence:** HIGH

---

## What Does NOT Change

The existing stack (Tauri 2, React 19, TypeScript 5, Vite 6, TailwindCSS 4, SQLite,
tauri-plugin-sql, React Query, Zustand, shadcn/ui) is unchanged. The canonical unit
database architecture (hobbyforge.db, udb_* tables, Rust bulk import, Wahapedia CSV
parsing via `parseWahapediaCsv()`) is already proven and reused as-is.

The research below covers only the NET NEW capabilities required for v0.4.7.

---

## New Capability 1: Auto-Download Wahapedia CSVs

**Requirement:** Download CSVs from `https://wahapedia.ru/wh40k10ed/*.csv` at
`pnpm build:udb` time instead of requiring manual file placement.

**Recommendation: Use native `fetch` in Node.js — no new dependency.**

Node.js 18+ ships `fetch` as a stable global. The project runs Node 24
(confirmed: `node --version` → v24.13.0). Native fetch is sufficient for simple
HTTPS GET requests to static CSV files. The response body is retrieved with `.text()`.

```typescript
// No import needed — fetch is global in Node 18+
const res = await fetch("https://wahapedia.ru/wh40k10ed/Stratagems.csv");
if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.url}`);
const raw = await res.text();
```

**Why not `node-fetch` or `axios`?** Both add devDependencies and version-pinning
burden for what is a build-script-only use case. Native fetch is battle-tested in
Node 18+ and has zero licensing concerns.

**Cache strategy:** Download only if the file is absent, or when a `--refresh` flag
is passed. This preserves the offline/air-gapped rebuild path (important: the build
must still work when CSVs are already in `scripts/data/`). The download function
wraps the existing `existsSync` check:

```typescript
async function downloadCsvIfNeeded(
  dataDir: string,
  filename: string,
  force = false,
  baseUrl = "https://wahapedia.ru/wh40k10ed/"
): Promise<void> {
  const filepath = join(dataDir, filename);
  if (!force && existsSync(filepath)) return; // local cache hit
  console.log(`Downloading ${filename}...`);
  const res = await fetch(baseUrl + filename);
  if (!res.ok) throw new Error(`Download failed ${filename}: HTTP ${res.status}`);
  writeFileSync(filepath, await res.text(), "utf-8");
}
```

This function lives in `scripts/lib/download.ts` and is called from `build-unit-db.ts`
before the CSV verification loop.

**Note on `@tauri-apps/plugin-http`:** This package is already in `package.json`
dependencies as a runtime plugin for the Tauri app. It is NOT usable from Node.js
build scripts. Do not use it here. Node.js native fetch and the Tauri HTTP plugin are
completely separate execution environments.

**Confidence:** HIGH — Node 24 confirmed, native fetch stable since Node 18.

---

## New Capability 2: Points from Datasheets_models_cost.csv

**CSV schema** (confirmed from live `https://wahapedia.ru/wh40k10ed/Datasheets_models_cost.csv`):

```
datasheet_id | line | description | cost
```

- `datasheet_id`: Wahapedia unit ID — matches `udb_units.id` directly (primary key)
- `line`: 1-based tier index (integer)
- `description`: free text like `"1 model"`, `"5 models"`, `"10 models"`
- `cost`: integer points value

**Multi-tier example from live data:**
```
000000016|1|10 models|80|
000000016|2|20 models|170|
000000024|1|2 models|65|
000000024|2|3 models|95|
000000024|3|5 models|160|
000000024|4|6 models|190|
```

**Why this replaces BSData for points:** The `datasheet_id` is the exact Wahapedia
string ID that `udb_units.id` already stores. This gives 100% theoretical match rate
via primary key — no name normalization, no alias table, no 3-pass matching, no XML
parsing. The entire `matchUnit()` / alias / normalization infrastructure was only
needed because BSData uses different names than Wahapedia. That problem disappears.

**Model count parsing:** The `description` field ("5 models", "1 model") contains the
integer model count. Extract with a regex:

```typescript
function parseModelCount(description: string): number {
  const match = description.match(/(\d+)\s+model/i);
  return match ? parseInt(match[1], 10) : 1;
}
```

The existing `UdbUnitPointsRow` type (`unit_id`, `model_count`, `points`) maps
directly — no type changes required.

**Single-tier units:** When a unit has exactly one line in `Datasheets_models_cost.csv`,
set `base_points` on `udb_units` directly (same behavior as the BSData single-cost
path). This preserves the existing query logic (`COALESCE(base_points, ...)`) unchanged.

**Coverage expectation:** Some units may genuinely be absent from `Datasheets_models_cost.csv`
(Legends/Forge World units that Wahapedia does not price). The existing
`MIN_COVERAGE_PCT` threshold check (currently 58%) should be raised after this
migration since direct-PK matching eliminates all name-mismatch gaps.

**Confidence:** HIGH — schema confirmed from live file, direct PK match eliminates
matching complexity.

---

## New Capability 3: New CSV Schemas (Stratagems, Enhancements, Detachment Abilities)

All three schemas confirmed from live Wahapedia CSVs. All are pipe-delimited with a
trailing pipe, consistent with the existing format parsed by `parseWahapediaCsv()`.

### Stratagems.csv

**URL:** `https://wahapedia.ru/wh40k10ed/Stratagems.csv`

**Confirmed columns (11):**
```
faction_id | name | id | type | cp_cost | legend | turn | phase | detachment | detachment_id | description
```

Column notes:
- `faction_id`: Wahapedia faction ID. Some rows have an empty `faction_id`
  (e.g., generic Boarding Actions stratagems not tied to a faction — handle as NULL).
- `id`: Wahapedia string ID, reuse as primary key.
- `type`: category string e.g. `"Boarding Actions – Battle Tactic Stratagem"`,
  `"Epic Deed Stratagem"`. Contains faction name prefix for faction-scoped stratagems.
- `cp_cost`: integer (typically 1 or 2).
- `detachment`: detachment name (empty string for non-detachment stratagems).
- `detachment_id`: Wahapedia detachment ID (empty string when not applicable).
- `description`: HTML-formatted rules text (same as existing ability descriptions).

### Enhancements.csv

**URL:** `https://wahapedia.ru/wh40k10ed/Enhancements.csv`

**Confirmed columns (8):**
```
faction_id | id | name | cost | detachment | detachment_id | legend | description
```

Column notes:
- `cost`: integer points cost (0–45 in observed data).
- `detachment`/`detachment_id`: same pattern as stratagems.

### Detachment_abilities.csv

**URL:** `https://wahapedia.ru/wh40k10ed/Detachment_abilities.csv`

**Confirmed columns (7, trailing pipe):**
```
id | faction_id | name | legend | description | detachment | detachment_id
```

Column notes:
- Column order differs from Stratagems/Enhancements — `id` is first, `faction_id` is second.
- `legend`: flavor text (same pattern as unit abilities).
- `description`: rules text.

**All three parsers** follow the same pattern and can reuse `parseWahapediaCsv()`
unchanged. The field-name differences are handled by accessing the returned record
by column name (e.g., `row["faction_id"]`, `row["cp_cost"]`), which is how all
existing CSV parsing works in `build-unit-db.ts`.

**Confidence:** HIGH — all three schemas confirmed from live CSV files.

---

## New Capability 4: New SQLite Tables

Three new migrations are required. All follow the established project pattern
(one `.sql` file per migration, added to `src-tauri/migrations/`, numbered
sequentially, registered in `src-tauri/src/lib.rs`).

### Migration 042 — `udb_stratagems`

```sql
CREATE TABLE IF NOT EXISTS udb_stratagems (
  id            TEXT PRIMARY KEY,
  faction_id    TEXT REFERENCES udb_factions(id),  -- nullable: some stratagems are generic
  name          TEXT NOT NULL,
  type          TEXT,
  cp_cost       INTEGER NOT NULL DEFAULT 1,
  legend        TEXT,
  turn          TEXT,
  phase         TEXT,
  detachment    TEXT,
  detachment_id TEXT,
  description   TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_udb_stratagems_faction_id ON udb_stratagems(faction_id);
CREATE INDEX IF NOT EXISTS idx_udb_stratagems_detachment_id ON udb_stratagems(detachment_id);
```

Key design decision: `faction_id` is nullable (REFERENCES but no NOT NULL) because
live Stratagems.csv has rows with empty faction_id for generic stratagems. A NOT NULL
FK would either silently drop these rows or require a synthetic faction ID.

### Migration 043 — `udb_enhancements`

```sql
CREATE TABLE IF NOT EXISTS udb_enhancements (
  id            TEXT PRIMARY KEY,
  faction_id    TEXT REFERENCES udb_factions(id),
  name          TEXT NOT NULL,
  cost          INTEGER NOT NULL DEFAULT 0,
  detachment    TEXT,
  detachment_id TEXT,
  legend        TEXT,
  description   TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_udb_enhancements_faction_id ON udb_enhancements(faction_id);
CREATE INDEX IF NOT EXISTS idx_udb_enhancements_detachment_id ON udb_enhancements(detachment_id);
```

### Migration 044 — `udb_detachment_abilities`

```sql
CREATE TABLE IF NOT EXISTS udb_detachment_abilities (
  id            TEXT PRIMARY KEY,
  faction_id    TEXT REFERENCES udb_factions(id),
  name          TEXT NOT NULL,
  legend        TEXT,
  description   TEXT,
  detachment    TEXT,
  detachment_id TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_udb_detachment_abilities_faction_id ON udb_detachment_abilities(faction_id);
CREATE INDEX IF NOT EXISTS idx_udb_detachment_abilities_detachment_id ON udb_detachment_abilities(detachment_id);
```

**Why `detachment_id` is TEXT (not FK to a detachment table):** There is no
`udb_detachments` table in the schema (migrations 038–041). Adding one is out of
scope per PROJECT.md (EXT-01..03 deferred to v2). Storing the raw Wahapedia string ID
preserves the cross-reference for future use without requiring a parent table now.

**Why separate migrations per table:** The established pattern is one concern per
migration file. Combining all three into one file works technically but breaks the
naming convention and makes rollback reasoning harder. Follow the existing pattern.

**Confidence:** HIGH — same migration tooling used 41 times.

---

## New Capability 5: JSON Schema Extensions for unit_database.json

The build script assembles `src-tauri/data/unit_database.json`. The Rust import
command bulk-INSERTs from this JSON. The JSON must include three new arrays.

**New types to add to `scripts/lib/types.ts`:**

```typescript
export interface UdbStratagem {
  id: string;
  faction_id: string;   // empty string when not faction-scoped
  name: string;
  type: string;
  cp_cost: number;
  legend: string;
  turn: string;
  phase: string;
  detachment: string;
  detachment_id: string;
  description: string;
}

export interface UdbEnhancement {
  id: string;
  faction_id: string;
  name: string;
  cost: number;
  detachment: string;
  detachment_id: string;
  legend: string;
  description: string;
}

export interface UdbDetachmentAbility {
  id: string;
  faction_id: string;
  name: string;
  legend: string;
  description: string;
  detachment: string;
  detachment_id: string;
}
```

**Extension to `UnitDatabaseJson`:**
```typescript
// Add these three fields to the existing interface
stratagems: UdbStratagem[];
enhancements: UdbEnhancement[];
detachment_abilities: UdbDetachmentAbility[];
```

Use empty string (not null) for empty CSV fields in these types. The Rust serde
deserializer already handles empty strings for optional fields (established in v0.4.2
with `serde(default)`). Keeping nullable as empty string avoids an `Option<String>`
proliferation in the Rust structs.

**Confidence:** HIGH — direct mapping from confirmed CSV columns.

---

## Dependency Changes Summary

| Dependency | Action | Reason |
|------------|--------|--------|
| `@xmldom/xmldom` (devDep) | **Remove** after BSData code deletion | XML parsing only needed for BSData .cat files; becomes dead code |
| `better-sqlite3` (devDep) | **Keep** | Still used by data-layer tests (14 tests) |
| Native `fetch` (Node 24 built-in) | **Use** | HTTP download — zero new packages |
| `node:fs`, `node:path`, `node:url` | **Keep** | Already used throughout `scripts/` |

**No `pnpm add` or `pnpm install` required for new capabilities.**
The only `package.json` change is removing `@xmldom/xmldom` from devDependencies
after the BSData code is fully deleted.

---

## BSData Removal Scope

After `Datasheets_models_cost.csv` replaces BSData as the points source, the
following code becomes dead:

| File | Action |
|------|--------|
| `scripts/lib/parseXml.ts` | Delete entirely |
| `scripts/lib/bsdata.ts` | Delete (after extracting `readCsvFile` to `parseCsv.ts`) |
| `scripts/lib/factionMap.ts` | Partial: `FACTION_MAP` + `CROSS_FACTION_MAP` delete; `SUB_FACTION_MAP` needs replacement strategy |
| `scripts/lib/normalize.ts` | Keep — `normalizeName` still useful for defensive deduplication |
| `scripts/data/bsdata/` directory | Not tracked in git (gitignored); no action |

**`readCsvFile` extraction:** The `readCsvFile()` function in `bsdata.ts` (readFileSync
+ parseWahapediaCsv wrapper) is used by `build-unit-db.ts`. Before deleting `bsdata.ts`,
move `readCsvFile` into `scripts/lib/parseCsv.ts` so `build-unit-db.ts` imports it
from there.

**Sub-faction without BSData:** `SUB_FACTION_MAP` currently assigns `sub_faction` by
matching BSData catalogue filenames (e.g., `"Space Marines - Black Templars"` →
`"Black Templars"`). Without BSData, this data source disappears. Options:
1. Derive sub-faction from the unit's relationship to stratagems/enhancements
   (units whose detachment_id appears in a sub-faction stratagem are that sub-faction)
2. Static JSON file `scripts/data/sub_faction_map.json` keyed by `unit_id` ranges
3. Leave sub_faction populated from the last BSData-era build (no regression for
   existing data, just no new sub-faction assignments going forward)

This is a design decision for the roadmap, not a stack question.

**Confidence for BSData removal:** HIGH for what can be deleted; MEDIUM for sub-faction
re-sourcing (design decision needed).

---

## Existing Code to Reuse Unchanged

| Asset | How Reused |
|-------|-----------|
| `scripts/lib/parseCsv.ts` → `parseWahapediaCsv()` | Parses all three new CSV files — no changes |
| `scripts/lib/normalize.ts` → `normalizeName()` | Optional deduplication for duplicate detection |
| `scripts/lib/types.ts` | Extended with new interfaces above |
| `src-tauri/migrations/038_udb_schema.sql` | Schema reference only — not modified |
| Rust `bulk_sync_rules` command pattern | Reuse (or add a separate bulk command) for new tables |
| `MIN_COVERAGE_PCT` threshold gate | Raise from 58% → 90%+ after this milestone |

---

## Open Questions for Roadmap Phases

1. **Empty faction_id in Stratagems.csv:** Generic stratagems (Boarding Actions, Core
   stratagems) have empty `faction_id`. The `udb_stratagems` migration uses a nullable
   FK (above). The parser must convert empty string → NULL when inserting. Confirm
   this behavior in the Rust serde layer.

2. **Sub-faction re-sourcing without BSData:** Design decision needed before Phase 1.
   Recommendation: static `scripts/data/sub_faction_units.json` keyed by unit_id,
   maintained manually alongside `aliases.json`. This follows the established manual-
   data-file pattern and is the lowest-risk replacement.

3. **Legends deduplication:** Wahapedia `Datasheets.csv` has a `legend` column
   (currently parsed but not stored in `udb_units`). For deduplication, a boolean
   `is_legend INTEGER NOT NULL DEFAULT 0` column should be added to `udb_units`
   via a separate migration (045). This allows filtering Legends units out of the
   DB browser and army list picker. This is a v0.4.7 feature concern, not a stack
   concern — but the migration needs to be planned.

4. **Coverage threshold after migration:** Once `Datasheets_models_cost.csv` drives
   points, the `MIN_COVERAGE_PCT = 58` threshold should be raised immediately.
   Based on live data, the new coverage should approach 95%+ (only genuine Legends/
   no-cost units will remain unmatched). Raise to 90 initially, then audit.

5. **`@tauri-apps/plugin-http` vs native fetch confusion risk:** The existing
   `package.json` `dependencies` section includes `@tauri-apps/plugin-http ~2.5.9`.
   This is the Tauri app runtime plugin. Any developer reading the package.json might
   assume it covers the build script HTTP need. Add a comment in `download.ts` making
   clear that native `fetch` is used here, not the Tauri plugin.

---

## Sources

- Direct code inspection: `scripts/build-unit-db.ts`, `scripts/lib/*.ts`, `package.json`,
  `src-tauri/migrations/038_udb_schema.sql` — HIGH confidence
- Live CSV inspection: `https://wahapedia.ru/wh40k10ed/Stratagems.csv` (11 cols confirmed)
- Live CSV inspection: `https://wahapedia.ru/wh40k10ed/Enhancements.csv` (8 cols confirmed)
- Live CSV inspection: `https://wahapedia.ru/wh40k10ed/Detachment_abilities.csv` (7 cols confirmed)
- Live CSV inspection: `https://wahapedia.ru/wh40k10ed/Datasheets_models_cost.csv` (4 cols, multi-tier confirmed)
- Node.js v24.13.0 confirmed via `node --version`

---

*Stack research for: v0.4.7 Wahapedia Pipeline & Full Data Import*
*Researched: 2026-06-04*
