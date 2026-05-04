# Phase 15: Warhammer 40K Datasheet Integration — Research

**Researched:** 2026-05-03
**Domain:** External data ingestion (Wahapedia CSV), second SQLite database, HTTP sync, UI extension
**Confidence:** HIGH (all critical questions answered from official docs or live data inspection)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Primary source: Wahapedia (+ any official GW public dataset if one ever becomes available)
- The PROJECT.md constraint against copyrighted GW data is consciously relaxed for Phase 15 — strictly personal, local-only tool, never distributed
- Points values are still excluded — import scope is stats, abilities, and keywords only
- Data stored in a separate local `rules.db` file alongside `hobbyforge.db` in Tauri's `appDataDir()`
- Sync is user-triggered — a sync button/action fetches data from the source, populates `rules.db`; fully offline after that
- Empty rules DB state: subtle banner/prompt in PlaybookTab ("Sync datasheets to auto-fill stats") — not intrusive, not modal
- Matching is explicit: searchable dropdown pre-filtered to the unit's faction; user picks once; `unit.id → datasheet_id` stored permanently
- Picker auto-appears on first Playbook tab open when: (a) unit has no stats yet AND (b) `rules.db` is populated
- "Import stats" button always visible for manual re-import
- ALL fields imported: M, T, Sv, W, Ld, OC stats + keywords + full abilities text (points never imported)
- Abilities imported into new "Datasheet Abilities" collapsible section (separate from existing abilities textarea, renamed "Personal Ability Notes")
- Abilities sub-grouped by category: Core / Faction / Unit — matching Wahapedia's type classification
- "Sources" structured list (publication names) below Datasheet Abilities collapsible
- Single review dialog for all conflicting fields — "Keep yours / Use datasheet" toggle per field (uniform treatment, stats and text)
- Import loads selected values into the form — existing Playbook Save button commits to DB
- PlaybookTab section order after Phase 15:
  1. Stats block (with import/re-import controls)
  2. Datasheet Abilities (new collapsible — Core / Faction / Unit sub-groups)
  3. Sources (new structured list, below Datasheet Abilities)
  4. Personal Ability Notes (renamed from "Abilities" textarea)
  5. Keywords
  6. 8 strategy note fields (unchanged)
  7. Save button

### Claude's Discretion

- Exact visual design of the Datasheet Abilities collapsible (expand/collapse controls, sub-group headers)
- Whether Sources list is inside or just below the Datasheet Abilities collapsible
- Sync button exact location (settings area, sidebar, or PlaybookTab header)
- Error handling when sync fails (network error, source unavailable)
- How to handle units with multiple stat profiles (researcher should investigate — see findings below)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

## Summary

Wahapedia provides a well-documented, stable CSV export system specifically designed for community tooling. All datasheet data (stats, abilities, keywords, sources) is available as pipe-delimited UTF-8 CSV files at predictable `https://wahapedia.ru/wh40k10ed/<filename>.csv` URLs. No scraping is needed — this is an official, blessed export mechanism.

A second SQLite database (`rules.db`) is the correct local storage strategy. `tauri-plugin-sql` natively supports multiple independent databases via chained `.add_migrations()` calls in `lib.rs`. The frontend opens `rules.db` via a separate `Database.load('sqlite:rules.db')` singleton, following the exact same `src/db/client.ts` pattern already established.

For HTTP sync, the project's existing `csp: null` setting in `tauri.conf.json` allows native browser `fetch()` to reach external URLs without any additional plugin. `tauri-plugin-http` is the more robust alternative (handles progress reporting, proper streaming), but either works. Given the project already uses `tauri-plugin-fs` and the existing fetch calls are simple CSV text downloads, `tauri-plugin-http` is recommended for correctness (capability-scoped, Rust-backed) but the simpler path of native `fetch()` + `tauri-plugin-fs` write is also valid.

**Primary recommendation:** Fetch all 6 Wahapedia CSVs using `tauri-plugin-http` (scoped to `wahapedia.ru`), parse pipe-delimited text in the frontend, and bulk-insert into `rules.db` in a single transaction. Use a separate `src/db/rules-client.ts` singleton and `src/db/queries/datasheets.ts` query module following established patterns exactly.

---

## Wahapedia CSV Data Source

### Confirmed CSV Export URLs (10th Edition)

All files live at `https://wahapedia.ru/wh40k10ed/<filename>`. They are pipe `|` delimited, UTF-8 encoded. HTML entities appear in description fields (strip or decode on import).

| File | Purpose | Key Columns |
|------|---------|-------------|
| `Datasheets.csv` | One row per unit | `id`, `name`, `faction_id`, `source_id`, `role`, `leader_head`, `damaged_w`, `damaged_description` |
| `Datasheets_models.csv` | Stat profiles (one row per model line) | `datasheet_id`, `line`, `name`, `M`, `T`, `Sv`, `inv_sv`, `W`, `Ld`, `OC`, `base_size` |
| `Datasheets_abilities.csv` | All abilities | `datasheet_id`, `line`, `ability_id`, `model`, `name`, `description`, `type`, `parameter` |
| `Datasheets_keywords.csv` | Keywords | `datasheet_id`, `keyword`, `model`, `is_faction_keyword` |
| `Factions.csv` | Faction lookup | `id`, `name`, `link` |
| `Source.csv` | Publication names | `id`, `name`, `type`, `edition`, `version`, `errata_date` |
| `Last_update.csv` | Single timestamp | `last_update` (e.g. `2026-04-27 20:55:42`) |

**Confidence:** HIGH — verified by directly fetching and inspecting each file.

### Ability Type Values (for Core/Faction/Unit grouping)

The `Datasheets_abilities.csv` `type` column contains these values relevant to the feature:

| type value | Maps to UI group |
|-----------|-----------------|
| `Core` | Core Abilities |
| `Faction` | Faction Abilities |
| `Datasheet` | Unit Abilities |
| `Wargear` | (skip — weapon rules, not unit abilities) |
| `Primarch` | Unit Abilities (treat as Datasheet subtype) |
| `Special (правая колонка)` | Unit Abilities |
| `Fortification (левая колонка)` | (skip unless unit is a fortification) |
| `Wargear profile` | (skip — weapon variant options) |

The user wants Core / Faction / Unit sub-groups. Map `Core` → Core, `Faction` → Faction, `Datasheet` + `Primarch` + `Special (правая колонка)` → Unit.

**Confidence:** HIGH — verified from live CSV.

### Multi-Profile Units (Critical Design Question)

**Finding:** 10th edition unified the "wound track" concept — vehicles and monsters now have a single stat profile with threshold-based damage rules described in text, not separate stat rows. The `Datasheets_models.csv` `line` column exists to handle units that contain genuinely distinct model types (e.g. a unit datasheet covering multiple named variants with different stats within a single entry).

**In practice:** The majority of datasheets have a single `line=1` row. Multi-line datasheets typically represent units where two different model types share a datasheet (rare in 10th edition). Examples: a unit with a mount (different M from the rider), or a unit where a leader attachment is baked into the datasheet.

**Recommendation:** Store ALL model rows for a datasheet in `rules.db`. When displaying in PlaybookTab, use `line=1` as the primary/display profile for the stats block (covers 95%+ of units). Surface additional model rows as a note below the stats block (e.g., "This unit has additional stat profiles — see Datasheet Abilities for details"). Do NOT try to display multiple stat blocks in the edit mode — the existing 6-stat grid UI is designed for one profile. This is a discretion-area item.

**Confidence:** MEDIUM — based on research into 10th edition rules design + live datasheet observation. Edge cases may exist.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tauri-plugin-http` | 2.x | HTTP GET for CSV downloads | Capability-scoped, Rust-backed, already in plugin ecosystem |
| `@tauri-apps/plugin-http` | 2.x | JS bindings for the HTTP plugin | Mirrors fetch API; needed for frontend CSV fetch |
| `tauri-plugin-sql` | 2.x (already installed) | Second `rules.db` connection | Same plugin, second `Database.load()` call |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui `collapsible` | current | Datasheet Abilities collapsible section | Must be installed via `npx shadcn@latest add collapsible` — NOT currently in project |
| Native `TextDecoder` / string split | built-in | Parse pipe-delimited CSV | No CSV library needed for simple pipe-delimited format |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tauri-plugin-http` | Native browser `fetch()` | `csp: null` in project means native fetch works; tauri-plugin-http is safer and capability-scoped |
| shadcn collapsible | Custom `<details>/<summary>` | shadcn collapsible matches existing UI component system |
| Front-end CSV parse | papaparse npm | Overkill for pipe-delimited; papaparse adds a dependency for a 10-line parse function |

**Installation:**

```bash
# HTTP plugin
npm run tauri add http

# shadcn collapsible component
npx shadcn@latest add collapsible
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── db/
│   ├── client.ts                 # existing hobbyforge.db singleton (unchanged)
│   ├── rules-client.ts           # NEW: rules.db singleton (same pattern as client.ts)
│   └── queries/
│       ├── datasheets.ts         # NEW: all rules.db query functions
│       └── ... (existing files unchanged)
├── hooks/
│   ├── useDatasheet.ts           # NEW: TanStack Query hooks for datasheet data
│   └── useRulesSync.ts           # NEW: sync mutation hook (fetch CSVs, populate rules.db)
├── features/units/
│   ├── PlaybookTab.tsx           # MODIFIED: add import controls + new sections
│   ├── DatasheetPicker.tsx       # NEW: searchable faction-filtered picker dialog
│   ├── DatasheetImportDialog.tsx # NEW: conflict resolution dialog (sibling portal)
│   └── CollectionPage.tsx        # MODIFIED: mount DatasheetImportDialog as sibling portal
└── types/
    └── datasheet.ts              # NEW: TypeScript types for rules.db schema
```

### Pattern 1: Second SQLite DB Singleton (rules-client.ts)

```typescript
// src/db/rules-client.ts
import Database from "@tauri-apps/plugin-sql";

let _rulesDb: Database | null = null;

export async function getRulesDb(): Promise<Database> {
  if (!_rulesDb) {
    _rulesDb = await Database.load("sqlite:rules.db");
    await _rulesDb.execute("PRAGMA foreign_keys = ON");
  }
  return _rulesDb;
}
```

The connection string `sqlite:rules.db` resolves to `%APPDATA%\com.hobbyforge.app\rules.db` — same directory as `hobbyforge.db`. No path manipulation needed.

### Pattern 2: rules.db Migrations in lib.rs

```rust
// src-tauri/src/lib.rs — add after get_migrations()
fn get_rules_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "rules_schema",
            sql: include_str!("../migrations/rules_001_schema.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

// In run():
.plugin(
    tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:hobbyforge.db", get_migrations())
        .add_migrations("sqlite:rules.db", get_rules_migrations())
        .build(),
)
```

Also add `"sqlite:rules.db"` to the `preload` array in `tauri.conf.json`:

```json
"plugins": {
  "sql": {
    "preload": ["sqlite:hobbyforge.db", "sqlite:rules.db"]
  }
}
```

**Confidence:** HIGH — verified from official Tauri SQL plugin docs. The `add_migrations` builder method chains correctly for multiple databases.

### Pattern 3: Pipe-Delimited CSV Parse (no library)

```typescript
// Parse a Wahapedia pipe-delimited CSV string
function parseWahapediaCsv(raw: string): Record<string, string>[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split("|").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split("|");
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? "").trim()])
    );
  });
}
```

Note: Wahapedia CSVs have a trailing `|` on each row — the last "column" will be empty string. The headers array handles this gracefully (the trailing empty key just maps to empty values).

### Pattern 4: HTTP Fetch with tauri-plugin-http

```typescript
import { fetch } from "@tauri-apps/plugin-http";

async function fetchWahapediaCsv(filename: string): Promise<string> {
  const response = await fetch(
    `https://wahapedia.ru/wh40k10ed/${filename}`,
    { method: "GET" }
  );
  if (!response.ok) throw new Error(`Failed to fetch ${filename}: ${response.status}`);
  return await response.text();
}
```

Capability grant required in `capabilities/default.json`:

```json
{
  "permissions": [
    "http:default",
    {
      "identifier": "http:allow-fetch",
      "allow": [{ "url": "https://wahapedia.ru/*" }]
    }
  ]
}
```

### Pattern 5: Bulk Insert Transaction

For importing 1000s of rows, use explicit BEGIN/COMMIT transaction:

```typescript
async function bulkInsertDatasheets(db: Database, rows: ParsedRow[]): Promise<void> {
  await db.execute("BEGIN");
  try {
    await db.execute("DELETE FROM datasheets"); // clear before re-import
    for (const row of rows) {
      await db.execute(
        "INSERT INTO datasheets (id, name, faction_id, source_id, role) VALUES ($1, $2, $3, $4, $5)",
        [row.id, row.name, row.faction_id, row.source_id, row.role]
      );
    }
    await db.execute("COMMIT");
  } catch (e) {
    await db.execute("ROLLBACK");
    throw e;
  }
}
```

### Pattern 6: staleTime: Infinity for Datasheet Hooks

```typescript
export function useDatasheet(unitId: number | undefined) {
  return useQuery({
    queryKey: unitId !== undefined ? DATASHEET_KEY(unitId) : ["datasheet"],
    queryFn: () => unitId !== undefined ? getDatasheetForUnit(unitId) : Promise.resolve(null),
    enabled: unitId !== undefined,
    staleTime: Infinity,  // Same as useStrategyNote — data only changes on explicit re-sync
  });
}
```

After sync completes, invalidate `["datasheet"]` broadly to force refresh.

### Pattern 7: Sibling Portal for Conflict Dialog

The conflict-resolution dialog MUST be mounted in `CollectionPage.tsx` as a sibling to `UnitDetailSheet`, not nested inside it. This is the established pattern (Phase 8, Phase 13 lightbox). Same as `DatasheetImportDialog` → `CollectionPage`:

```tsx
// CollectionPage.tsx
<>
  <UnitDetailSheet
    unit={selectedUnit}
    onDatasheetConflict={(payload) => setConflictPayload(payload)}
  />
  <DatasheetImportDialog
    open={conflictPayload !== null}
    payload={conflictPayload}
    onConfirm={handleConflictResolution}
    onClose={() => setConflictPayload(null)}
  />
</>
```

### Anti-Patterns to Avoid

- **Nested portals:** Never mount `DatasheetImportDialog` inside `SheetContent` — Radix portals nest incorrectly
- **ORM or CSV library for parse:** Wahapedia CSV is simple pipe-delimited; a 10-line parse function is sufficient
- **Fetching on every PlaybookTab render:** Fetch only on explicit user-triggered sync; `staleTime: Infinity` for query cache
- **Storing HTML entities raw:** Strip HTML tags from `description` and `name` fields on import (Wahapedia uses HTML formatting in some ability text)
- **Single-row assumption in Datasheets_models.csv:** Always query with ORDER BY `line` and handle multiple rows even if only showing the first for display

---

## rules.db Schema Design

```sql
-- rules_001_schema.sql

-- factions from Wahapedia (Factions.csv)
CREATE TABLE IF NOT EXISTS rw_factions (
    id    TEXT PRIMARY KEY,  -- Wahapedia faction ID e.g. "SM", "ORK"
    name  TEXT NOT NULL
);

-- datasheets (Datasheets.csv)
CREATE TABLE IF NOT EXISTS rw_datasheets (
    id               TEXT PRIMARY KEY,  -- Wahapedia 9-digit ID e.g. "000000882"
    name             TEXT NOT NULL,
    faction_id       TEXT REFERENCES rw_factions(id),
    source_id        TEXT,
    role             TEXT,              -- "Battleline", "Characters", etc.
    damaged_w        TEXT,              -- wound threshold for damaged text (e.g. "3+")
    damaged_description TEXT            -- degraded behavior description text
);

-- stat profiles (Datasheets_models.csv) — one row per model line
CREATE TABLE IF NOT EXISTS rw_datasheet_models (
    datasheet_id  TEXT NOT NULL REFERENCES rw_datasheets(id) ON DELETE CASCADE,
    line          INTEGER NOT NULL,
    name          TEXT,                 -- model name (often same as datasheet name)
    M             TEXT,                 -- e.g. "6\""
    T             INTEGER,
    Sv            TEXT,                 -- e.g. "3+"
    inv_sv        TEXT,                 -- e.g. "4+"
    W             INTEGER,
    Ld            TEXT,                 -- e.g. "6+"
    OC            INTEGER,
    PRIMARY KEY (datasheet_id, line)
);

-- abilities (Datasheets_abilities.csv)
CREATE TABLE IF NOT EXISTS rw_datasheet_abilities (
    datasheet_id  TEXT NOT NULL REFERENCES rw_datasheets(id) ON DELETE CASCADE,
    line          INTEGER NOT NULL,
    ability_id    TEXT,
    name          TEXT NOT NULL,
    description   TEXT,
    type          TEXT,                 -- "Core", "Faction", "Datasheet", "Wargear", etc.
    parameter     TEXT,
    PRIMARY KEY (datasheet_id, line)
);

-- keywords (Datasheets_keywords.csv)
CREATE TABLE IF NOT EXISTS rw_datasheet_keywords (
    datasheet_id       TEXT NOT NULL REFERENCES rw_datasheets(id) ON DELETE CASCADE,
    keyword            TEXT NOT NULL,
    is_faction_keyword INTEGER NOT NULL DEFAULT 0  -- 0|1 boolean; Wahapedia sends "true"/"false"
);

-- sources (Source.csv)
CREATE TABLE IF NOT EXISTS rw_sources (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    type         TEXT,
    edition      INTEGER,
    version      TEXT,
    errata_date  TEXT
);

-- sync metadata (single row)
CREATE TABLE IF NOT EXISTS rw_sync_meta (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_at TEXT,
    wahapedia_version TEXT  -- value from Last_update.csv
);

-- Unit-to-datasheet mapping stored in hobbyforge.db (migration 007)
-- ALTER TABLE unit_strategy_notes ADD COLUMN datasheet_id TEXT;
-- (or add to units table directly — see hobbyforge.db Migration section below)
```

**Key design decisions:**

1. All table names prefixed `rw_` (rules wahapedia) to avoid any future collision if rules.db and hobbyforge.db were ever merged.
2. IDs are TEXT (Wahapedia uses 9-digit zero-padded strings like `"000000882"`) — stored as TEXT, not INTEGER.
3. The `is_faction_keyword` field from Wahapedia is `"true"`/`"false"` string — convert to `1`/`0` on import.
4. Stats (`M`, `Sv`, `Ld`, `OC`) are stored as TEXT because Wahapedia includes the suffix (`6"`, `3+`, `6+`) — parse on display OR strip suffix on import and reformat in UI (recommend strip on import, matches how `unit_strategy_notes` works).
5. HTML tags in `description` fields MUST be stripped on import — Wahapedia uses `<b>`, `<i>`, `<br>` etc. in ability text. Use a simple regex: `text.replace(/<[^>]*>/g, "")`.

### hobbyforge.db Migration (migration 007)

```sql
-- 007_datasheet_link.sql
-- Adds permanent unit→datasheet link to unit_strategy_notes.
-- References rules.db (which is a separate SQLite file), so NO FK constraint is possible.
-- The reference is enforced at application level only.
ALTER TABLE unit_strategy_notes ADD COLUMN datasheet_id TEXT;
```

The link is stored on `unit_strategy_notes` (not `units`) because all other playbook data lives there. `datasheet_id` is TEXT (Wahapedia ID), not INTEGER. No FK across DB files — SQLite cannot reference foreign databases.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP request to Wahapedia | Custom Rust command | `tauri-plugin-http` JS fetch API | Plugin handles CORS, capability scoping, TLS |
| Collapsible section | `<details>` / custom toggle | `shadcn/ui collapsible` (install via CLI) | Matches existing UI system; handles animation correctly |
| CSV parsing | Full CSV parser | 10-line `parseWahapediaCsv()` function | Wahapedia CSVs are simple pipe-delimited; edge cases in quoted fields don't apply |
| Multi-DB connection | Writing custom Rust IPC command | `Database.load("sqlite:rules.db")` in frontend | tauri-plugin-sql supports multiple independent connections natively |
| Data freshness check | Timestamp file polling | Fetch `Last_update.csv` (1-line file, instant) | Compare stored `wahapedia_version` in `rw_sync_meta` to `Last_update.csv` value |

**Key insight:** All the hard problems (HTTP, multi-DB, collapsibles) have existing solutions in the already-established plugin and component ecosystem. Nothing novel needs to be invented.

---

## Common Pitfalls

### Pitfall 1: Cross-DB Foreign Key Enforcement

**What goes wrong:** Adding `REFERENCES rw_datasheets(id)` in `unit_strategy_notes.datasheet_id` (in hobbyforge.db) — SQLite cannot enforce FKs across database files.

**Why it happens:** Developer habit from single-DB work.

**How to avoid:** The `datasheet_id` column in `unit_strategy_notes` has NO REFERENCES clause. Enforce the link at application level: before writing `datasheet_id`, verify it exists in `rules.db`. When `rules.db` is cleared on re-sync, update any stale links if the datasheet was removed.

**Warning signs:** `SQLITE_ERROR: no such table: rw_datasheets` when running FK-constrained migrations.

### Pitfall 2: rules.db Migrations Version Numbering

**What goes wrong:** The `add_migrations` for `rules.db` uses version numbers that must be independent of `hobbyforge.db`. If version 1 exists for both, they do NOT conflict — `tauri-plugin-sql` tracks migrations per connection string.

**How to avoid:** `get_rules_migrations()` starts at `version: 1`. This is correct and independent.

**Warning signs:** Confusing why version 7 in `rules.db` doesn't apply migration 7 from `hobbyforge.db`.

### Pitfall 3: rules.db Not in preload → App Startup Error

**What goes wrong:** If `rules.db` is referenced in `add_migrations` in `lib.rs` but NOT in the `preload` array in `tauri.conf.json`, the migration runs at first `Database.load()` call instead of at startup. This is actually acceptable, BUT if rules.db migrations are in `lib.rs` without preload, they only run when the frontend loads the DB — this is fine for an optional DB.

**Recommendation:** Add `"sqlite:rules.db"` to preload so the schema is guaranteed to exist on startup. If preload is omitted, `Database.load("sqlite:rules.db")` still runs migrations on first call — functionally correct but less predictable.

**Warning signs:** "database not found" errors when querying `rw_sync_meta` before first DatasheetPicker open.

### Pitfall 4: HTML Entities in Wahapedia Ability Text

**What goes wrong:** Wahapedia stores ability descriptions in HTML — `<b>Sustained Hits 1</b>`, `<br>`, `&nbsp;`, etc. If stored raw and rendered in a textarea, the user sees HTML markup.

**How to avoid:** Strip HTML tags on import using a regex (`text.replace(/<[^>]*>/g, "")`), then decode HTML entities (`&amp;` → `&`, `&lt;` → `<`, etc.). Use a simple entity decoder rather than DOMParser to avoid jsdom dependency in the sync code path.

**Warning signs:** `<br>` visible in the Datasheet Abilities section text.

### Pitfall 5: Wahapedia Faction IDs vs hobbyforge.db Faction Names

**What goes wrong:** HobbyForge factions are stored with their full name (e.g. "Space Marines") while Wahapedia uses short codes (`"SM"`). Matching for the faction picker pre-filter requires mapping between them.

**How to avoid:** Store Wahapedia faction IDs verbatim in `rw_factions`. Build a `rw_faction_id` column on `unit_strategy_notes` or derive it from the faction name matching `rw_factions.name` at picker-open time. The picker loads all datasheets where `faction_id = <matched rw_factions.id>`.

**Recommendation:** At sync time, attempt to match HobbyForge faction names to `rw_factions.name` values and store the mapping. The DatasheetPicker for a unit loads datasheets where `rw_datasheets.faction_id` matches the unit's Wahapedia faction code.

**Warning signs:** DatasheetPicker shows 0 results for Space Marines units because faction ID mismatch.

### Pitfall 6: tauri-plugin-http Capability Grant Required

**What goes wrong:** Without the HTTP capability grant in `capabilities/default.json`, any `fetch()` call from `@tauri-apps/plugin-http` throws a permission error even though CSP is null.

**How to avoid:** Add to `default.json`:
```json
{
  "identifier": "http:allow-fetch",
  "allow": [{ "url": "https://wahapedia.ru/*" }]
}
```

Also register `tauri_plugin_http::init()` in `lib.rs` plugin chain.

**Warning signs:** Sync button silently fails or throws "command not found" in the Tauri window console.

### Pitfall 7: Large Import Volume — No Transaction = Slow

**What goes wrong:** Inserting 5000+ rows individually (one `db.execute()` per row) via tauri-plugin-sql IPC takes 20-60 seconds — each IPC call has overhead.

**How to avoid:** Wrap all inserts in `BEGIN; ... COMMIT;` as shown in Pattern 5. Alternatively, batch inserts into multi-value INSERT statements (SQLite supports `INSERT INTO t VALUES (a1,b1), (a2,b2), ...`). A single transaction reduces 5000 individual IPC calls to ~1 second total.

**Warning signs:** Sync button appears to hang for 30+ seconds before completing.

### Pitfall 8: collapsible.tsx Not Installed

**What goes wrong:** `import { Collapsible } from "@/components/ui/collapsible"` throws a module-not-found error — the component is not yet in the project.

**How to avoid:** Wave 0 of Phase 15 must install it: `npx shadcn@latest add collapsible`. Verify `src/components/ui/collapsible.tsx` exists before importing.

**Warning signs:** Build error on any component that imports from `@/components/ui/collapsible`.

---

## Code Examples

### Fetching the Last_update.csv for Freshness Check

```typescript
// Source: Wahapedia data export (verified live)
async function getWahapediaVersion(): Promise<string> {
  const text = await fetchWahapediaCsv("Last_update.csv");
  // Format: "last_update|2026-04-27 20:55:42|\n"
  const parts = text.trim().split("|");
  return parts[1]?.trim() ?? "";
}
```

### Parsing Datasheets_keywords.csv

```typescript
// Wahapedia sends "true"/"false" strings for is_faction_keyword
const rows = parseWahapediaCsv(rawCsv);
const keywords = rows.map(r => ({
  datasheet_id: r.datasheet_id,
  keyword: r.keyword,
  is_faction_keyword: r.is_faction_keyword === "true" ? 1 : 0,
}));
```

### Stripping HTML from Ability Descriptions

```typescript
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")           // strip HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}
```

### Querying Datasheets for Faction Picker (pre-filtered)

```typescript
// src/db/queries/datasheets.ts
export async function getDatasheetsByFaction(factionId: string): Promise<DatasheetSummary[]> {
  const db = await getRulesDb();
  return db.select<DatasheetSummary[]>(
    `SELECT id, name, role FROM rw_datasheets
     WHERE faction_id = $1
     ORDER BY name ASC`,
    [factionId]
  );
}
```

No FTS5 needed — simple `ORDER BY name` with ~200 units per faction. LIKE search on the picker's client-side filter is sufficient for this dataset size.

### Querying Full Datasheet for Import

```typescript
export async function getFullDatasheet(datasheetId: string): Promise<FullDatasheet | null> {
  const db = await getRulesDb();
  const [ds] = await db.select<RwDatasheet[]>(
    "SELECT * FROM rw_datasheets WHERE id = $1", [datasheetId]
  );
  if (!ds) return null;
  const models = await db.select<RwDatasheetModel[]>(
    "SELECT * FROM rw_datasheet_models WHERE datasheet_id = $1 ORDER BY line", [datasheetId]
  );
  const abilities = await db.select<RwDatasheetAbility[]>(
    `SELECT * FROM rw_datasheet_abilities
     WHERE datasheet_id = $1 AND type NOT IN ('Wargear', 'Wargear profile', 'Fortification (левая колонка)')
     ORDER BY line`, [datasheetId]
  );
  const keywords = await db.select<RwDatasheetKeyword[]>(
    "SELECT * FROM rw_datasheet_keywords WHERE datasheet_id = $1 ORDER BY is_faction_keyword DESC, keyword", [datasheetId]
  );
  const source = await db.select<RwSource[]>(
    "SELECT * FROM rw_sources WHERE id = $1", [ds.source_id]
  );
  return { ds, models, abilities, keywords, source: source[0] ?? null };
}
```

### Checking Rules DB Population Status

```typescript
export async function getRulesSyncMeta(): Promise<RulesSyncMeta | null> {
  try {
    const db = await getRulesDb();
    const rows = await db.select<RulesSyncMeta[]>(
      "SELECT * FROM rw_sync_meta WHERE id = 1"
    );
    return rows[0] ?? null;
  } catch {
    return null;  // rules.db may be empty (schema not yet populated)
  }
}
```

---

## Multi-Profile Units: Recommendation

In 10th edition, the vast majority of units have exactly ONE stat profile (confirmed: Intercessors, basic infantry, etc.). The `line` field in `Datasheets_models.csv` handles edge cases:

1. **Units where every model in a squad uses the same stats** (>90% of cases): `line=1` only.
2. **Units where one model variant has different stats** (e.g. a mount or merged unit): `line=2` will exist.
3. **Degraded vehicle profiles**: Removed in 10th edition — no longer appear as separate stat lines.

**Recommended implementation:** Query `ORDER BY line`, take `line=1` as the primary profile for the stats block M/T/Sv/W/Ld/OC. Store all rows in `rw_datasheet_models`. If `MAX(line) > 1`, display a note in the Datasheet Abilities section: "Additional model profiles: [model names with stats]". This handles the edge case without complicating the main stats block UI.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| Vehicle wound track (multiple stat rows per unit) | Single stat profile + text threshold rules | 10th edition launch (2023) | Almost no units have multiple stat lines |
| Scraping Wahapedia HTML | Official Wahapedia CSV export | Data export has existed since at least 9th ed | No scraping needed — CSV is blessed |
| BattleScribe XML (BSData) | Wahapedia CSV export | BSData is still active but more complex format | Wahapedia CSV is simpler and more complete for our fields |

**On BSData:** The BSData project (GitHub: BSData/wh40k-10e) is actively maintained with 3000+ commits as of early 2026. However, the `.cat` file format is complex BattleScribe-specific XML requiring a specialized parser. Wahapedia CSV is simpler, officially published, and covers exactly what this phase needs. BSData is better for army builder apps (includes points, wargear options, etc.). **Use Wahapedia CSV.**

---

## Open Questions

1. **Wahapedia Faction ID to HobbyForge Faction Mapping**
   - What we know: Wahapedia uses short codes (`SM`, `ORK`, `NEC`, etc.); HobbyForge factions have user-entered full names ("Space Marines", "Necrons")
   - What's unclear: Are the user's existing HobbyForge faction names predictably mappable to Wahapedia codes? (Likely yes for core factions)
   - Recommendation: At first sync, offer a one-time faction mapping step (or attempt fuzzy match). Alternatively, store `rw_faction_id` on the HobbyForge faction record and let the user pick the mapping once. The DatasheetPicker always works by showing ALL datasheets if no faction filter is possible.

2. **Units with No Wahapedia Match (custom/converted units)**
   - What we know: Users may have custom units with names that don't match any Wahapedia datasheet
   - What's unclear: Whether the picker should show "no match" gracefully or just leave stats empty
   - Recommendation: The picker is optional — "Skip" dismisses it; the Playbook tab still works fully manual if no datasheet is linked.

3. **HTML in Ability Descriptions: Edge Cases**
   - What we know: Wahapedia uses HTML tags and entities in description fields
   - What's unclear: Whether any ability text relies on formatting (bold/italic) for meaning that would be lost when stripping
   - Recommendation: Strip all HTML. The ability text is readable as plain text; formatting is cosmetic.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in config.json).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already installed) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test --reporter=verbose` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| CSV parse (pipe-delimited) | unit | `pnpm test tests/datasheet/csvParse.test.ts -x` | Wave 0 |
| HTML strip function | unit | `pnpm test tests/datasheet/stripHtml.test.ts -x` | Wave 0 |
| rules.db migration schema | content | `pnpm test tests/datasheet/migration.test.ts -x` | Wave 0 |
| datasheets query module | unit | `pnpm test tests/datasheet/datasheetQueries.test.ts -x` | Wave 0 |
| useDatasheet hook | unit | `pnpm test tests/datasheet/useDatasheet.test.tsx -x` | Wave 0 |
| DatasheetPicker render | component | `pnpm test tests/datasheet/DatasheetPicker.test.tsx -x` | Wave 0 |
| DatasheetImportDialog render | component | `pnpm test tests/datasheet/DatasheetImportDialog.test.tsx -x` | Wave 0 |
| PlaybookTab with datasheet sections | component | `pnpm test tests/collection/PlaybookTab.test.tsx -x` | exists (extend) |

### Sampling Rate

- **Per task commit:** `pnpm test tests/datasheet/ --reporter=verbose`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/datasheet/csvParse.test.ts` — pipe-delimited parse + trailing pipe handling
- [ ] `tests/datasheet/stripHtml.test.ts` — HTML tag stripping + entity decode
- [ ] `tests/datasheet/migration.test.ts` — rules_001_schema.sql content assertions (mirrors migration005.test.ts pattern)
- [ ] `tests/datasheet/datasheetQueries.test.ts` — stub tests for query functions
- [ ] `tests/datasheet/useDatasheet.test.tsx` — stub tests for hook
- [ ] `tests/datasheet/DatasheetPicker.test.tsx` — stub render tests for picker component
- [ ] `tests/datasheet/DatasheetImportDialog.test.tsx` — stub render tests for conflict dialog

---

## Sources

### Primary (HIGH confidence)

- Live fetch of `https://wahapedia.ru/wh40k10ed/Datasheets.csv` — confirmed column headers
- Live fetch of `https://wahapedia.ru/wh40k10ed/Datasheets_models.csv` — confirmed stat columns (M, T, Sv, W, Ld, OC, inv_sv)
- Live fetch of `https://wahapedia.ru/wh40k10ed/Datasheets_abilities.csv` — confirmed `type` column values (Core, Faction, Datasheet, Wargear, Primarch)
- Live fetch of `https://wahapedia.ru/wh40k10ed/Datasheets_keywords.csv` — confirmed `is_faction_keyword` "true"/"false" values
- Live fetch of `https://wahapedia.ru/wh40k10ed/Factions.csv` — confirmed faction ID codes (SM, ORK, NEC, etc.)
- Live fetch of `https://wahapedia.ru/wh40k10ed/Source.csv` — confirmed publication names and structure
- Live fetch of `https://wahapedia.ru/wh40k10ed/Last_update.csv` — confirmed single timestamp format
- [Wahapedia Data Export page](https://wahapedia.ru/wh40k10ed/the-rules/data-export/) — official confirmation of export mechanism
- [Tauri SQL Plugin docs](https://v2.tauri.app/plugin/sql/) — `add_migrations` chaining for multiple databases
- [Tauri HTTP Client docs](https://v2.tauri.app/plugin/http-client/) — `fetch()` API and capability grant format
- Existing `src-tauri/src/lib.rs` — confirmed `add_migrations` pattern for chaining
- Existing `src/db/client.ts` — confirmed singleton pattern to replicate for `rules-client.ts`
- Existing `src-tauri/capabilities/default.json` — confirmed capability grant format

### Secondary (MEDIUM confidence)

- [GitHub depot project (fjlaubscher/depot)](https://github.com/fjlaubscher/depot) — community confirmation that Wahapedia CSV exports are usable for app tooling
- [Intercessor Squad Wahapedia page](https://wahapedia.ru/wh40k10ed/factions/space-marines/Intercessor-Squad) — verified single stat profile for infantry in 10th ed
- Multiple web sources confirming 10th edition removed wound track multi-profile for vehicles

### Tertiary (LOW confidence)

- WebSearch findings on 10th edition multi-profile units — cross-referenced with live Wahapedia data

---

## Metadata

**Confidence breakdown:**

- Wahapedia CSV schema: HIGH — inspected live files directly
- Second SQLite DB pattern: HIGH — verified from official Tauri SQL plugin docs + existing codebase lib.rs pattern
- HTTP sync mechanism: HIGH — tauri-plugin-http documented + csp:null native fetch fallback confirmed
- rules.db schema: HIGH — derived from actual CSV column structures
- Multi-profile units: MEDIUM — pattern confirmed from 10th edition rules research + Intercessor example; edge cases unconfirmed without exhaustive sampling
- Faction ID mapping: LOW — shortcode-to-fullname mapping not verified across all factions; needs implementation-time lookup

**Research date:** 2026-05-03
**Valid until:** 2026-11-03 (stable API/plugin ecosystem; Wahapedia CSV structure rarely changes; data content updates continuously but schema is stable)
