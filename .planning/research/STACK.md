# Technology Stack — v0.4.0 Unit Database / Canonical 40k Data Hub

**Project:** HobbyForge v0.4.0
**Researched:** 2026-05-29
**Confidence:** HIGH for new additions; MEDIUM for single-DB migration timing

---

## Context: Existing Stack (Do Not Re-Research)

The following are validated and shipped. They are referenced here so decisions below can state integration points precisely.

| Layer | Tech | Notes |
|---|---|---|
| App shell | Tauri 2 + Rust + sqlx 0.8 | 8 commands, preflight repair, VACUUM INTO backup |
| Frontend | React 19 + TypeScript 5 + Vite 6 + TailwindCSS 4 + shadcn/ui | Stable |
| DB access (JS) | tauri-plugin-sql 2.x — parameterized `$1, $2` syntax | hobbyforge.db + rules.db |
| DB access (Rust) | sqlx 0.8 direct connection | `bulk_sync_rules`, backup commands |
| Migrations | 37 hobbyforge.db + 4 rules.db — auto-run at startup | rules.db to be eliminated |
| XML parsing (runtime) | Browser `DOMParser` in `src/lib/fetchBsdataPoints.ts` | Not available in Node.js scripts |
| CSV parsing | `src/lib/parseWahapediaCsv.ts` (custom) | Reusable for build script |
| Data-layer tests | `better-sqlite3` ^12.10.0 (devDependency, already installed) | 14 tests in production |
| State | React Query 5, Zustand 5, React Context | Unchanged |

---

## Recommended Additions

### 1. Virtual Scrolling: `@tanstack/react-virtual`

**Version:** `^3.13.26` (latest as of 2026-05-29, per npm)

**Why needed:** The unit database browser will display 2,500+ datasheets across 30+ factions in a scrollable list. Rendering all items simultaneously causes frame drops. TanStack Virtual renders only the visible items plus a small overscan buffer, achieving 60 fps even for 100k-item lists (cold mount ~4.5ms per TanStack benchmark).

**Why TanStack Virtual specifically:**
- Same vendor ecosystem as `@tanstack/react-query` and `@tanstack/react-router` already in use — React 19 compatibility is guaranteed
- Headless — no layout opinion; integrates with existing zinc/dark shadcn/ui card and table components without style overrides
- `react-window` is in maintenance mode since 2022 with no React 19 roadmap
- `react-virtuoso` imposes opinionated scroll containers that conflict with the existing shadcn Sheet/Dialog overlay pattern

**Where it applies:** The faction unit list inside the database browser page (2,500+ items across all factions, or ~50–300 per faction when filtered). Not needed for the faction picker grid (30 factions) or unit detail view (single item).

**Integration pattern:**
```ts
// src/features/unit-database/UnitList.tsx
import { useVirtualizer } from "@tanstack/react-virtual";

const rowVirtualizer = useVirtualizer({
  count: units.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72,   // card height in px
  overscan: 5,
});
```

**Install:**
```bash
pnpm add @tanstack/react-virtual@^3.13.26
```

---

### 2. SQLite FTS5 Full-Text Search: No New Dependency

**Why needed:** Global search across 2,500+ unit names, keywords, faction names, and ability text.

**Why no library:** FTS5 is compiled into the SQLite binary that ships with Tauri 2 (via sqlx's bundled SQLite). `CREATE VIRTUAL TABLE ... USING fts5` works as a migration DDL statement through tauri-plugin-sql.

**Migration approach (new migration `038_unit_database_schema.sql` or later):**
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS udb_search USING fts5(
  name,
  keywords,
  faction_name,
  content='udb_units',
  content_rowid='rowid'
);
```

**Query pattern (via tauri-plugin-sql `$1` positional syntax):**
```sql
SELECT u.*
FROM udb_units u
JOIN udb_search s ON u.rowid = s.rowid
WHERE udb_search MATCH $1
ORDER BY rank
LIMIT 50;
```

**Confidence note (MEDIUM):** FTS5 `CREATE VIRTUAL TABLE` is confirmed to work as DDL through tauri-plugin-sql migrations based on community reports. The content table sync pattern (keeping the FTS index in sync with `udb_units` on INSERT/UPDATE/DELETE) is standard SQLite but needs validation in Phase 1 — the plugin's transaction model may require triggers to be set up through the Rust `setup` hook rather than a migration file. Fall back to `LIKE '%query%'` on indexed TEXT columns if trigger registration proves incompatible.

---

### 3. Build-Time XML Parsing: `fast-xml-parser`

**Version:** `^4.5.3` (v4 stable; v5 is experimental beta as of 2025)

**Why needed:** The dev-side import script that builds the pre-populated unit database must parse BSData `.cat` XML files in a Node.js context. The existing `DOMParser`-based parsers in `src/lib/fetchBsdataPoints.ts` and `src/lib/parseBsdataExtended.ts` use the browser DOM API, which is unavailable outside Tauri/browser.

**Why fast-xml-parser over alternatives:**
- 80M+ weekly npm downloads — most widely used pure-JS XML parser
- Zero dependencies; works identically in Node.js and browser (future-proof if browser-side parsing is needed)
- Benchmarked faster than `xml2js` on large files (BSData `.cat` files can exceed 10MB per faction)
- `xml2js` is older, uses callbacks by default, and requires more config to get clean attribute access

**Usage in build script:**
```ts
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => ["selectionEntry", "modifier", "condition"].includes(name),
});
const result = parser.parse(catFileXml);
```

**Install (devDependency — never bundled into the app):**
```bash
pnpm add -D fast-xml-parser@^4.5.3
```

---

### 4. Build-Time SQLite Writing: `better-sqlite3` (Already Installed)

**Version:** `^12.10.0` (already in `devDependencies`)

**Why adequate:** `better-sqlite3` is already installed for the 14-test data-layer test suite. Its synchronous API makes bulk-insert scripting simple and performant. Wrapping inserts in a transaction provides a 10–100x speedup over row-by-row autocommit for large datasets.

**Build script pattern:**
```ts
// scripts/build-unit-db.mjs
import Database from "better-sqlite3";

const db = new Database("src-tauri/resources/unit_database.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const insertUnit = db.prepare(`
  INSERT OR REPLACE INTO udb_units (id, name, faction_id, role, ...)
  VALUES (@id, @name, @faction_id, @role, ...)
`);

const insertBatch = db.transaction((units) => {
  for (const u of units) insertUnit.run(u);
});

insertBatch(parsedUnits);
db.close();
```

**Script location:** `scripts/build-unit-db.mjs` — run manually by the developer when GW data changes, produces `src-tauri/resources/unit_database.db`. Not part of `pnpm build`.

---

### 5. Bundled Pre-Populated Database: Tauri Resources + Rust File Copy

**Problem:** `tauri-plugin-sql` does not support loading pre-populated databases from bundled resources. This is an open feature request (issue #1155 in tauri-apps/plugins-workspace, unresolved as of 2025). The plugin only opens databases in `app_data_dir`.

**Solution (validated community pattern):** Bundle the pre-built `.db` file as a Tauri resource, then copy it to `app_data_dir` on first launch from the Rust `setup` hook.

**`tauri.conf.json`:**
```json
{
  "bundle": {
    "resources": ["resources/unit_database.db"]
  }
}
```

**Rust `setup` in `lib.rs`:**
```rust
.setup(|app| {
    let app_data_dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&app_data_dir)?;

    let unit_db_dest = app_data_dir.join("unit_database.db");
    if !unit_db_dest.exists() {
        let resource_path = app.path()
            .resolve("unit_database.db", tauri::path::BaseDirectory::Resource)?;
        std::fs::copy(&resource_path, &unit_db_dest)?;
        println!("[hobbyforge] unit_database.db copied to app_data_dir");
    }

    // ... existing app_data_dir creation
    Ok(())
})
```

**After copy, open normally via tauri-plugin-sql:**
```ts
// src/db/unit-db-client.ts
const db = await Database.load("sqlite:unit_database.db");
```

**Update strategy:** When GW publishes points changes, the developer runs `scripts/build-unit-db.mjs` and ships a new app version. To force overwrite (not just first-run copy), store a `data_version` INTEGER in the bundled db and compare against the copy in `app_data_dir`. If bundled version is higher, overwrite.

**Size:** Estimated 20–50MB uncompressed for 2,500+ units with full stats/weapons/abilities. Acceptable for a Windows desktop installer.

**No new Rust crates.** `std::fs::copy` and `tauri::path::BaseDirectory::Resource` are in the already-imported `tauri` crate.

---

### 6. Rust Changes for Single-DB Migration

**Remove from `lib.rs`:**
- `get_rules_migrations()` function and the `.add_migrations("sqlite:rules.db", ...)` plugin builder call
- `bulk_sync_rules` Tauri command (keep as a stub returning an error for one version to avoid crashes from cached frontend calls, then remove in Phase 5)

**Add to `lib.rs`:**
- File-copy logic in `setup` hook (above)
- Optional: `get_unit_db_migrations()` if the unit_database.db schema needs to evolve post-ship (or handle it via the build script regenerating the file from scratch)

**hobbyforge.db: new migrations (sequential after current 037):**

| Migration | Content |
|---|---|
| `038_unit_database_factions.sql` | `udb_factions` table — canonical faction list |
| `039_unit_database_units.sql` | `udb_units` — name, faction_id, role, damaged_w, damaged_description |
| `040_unit_database_models.sql` | `udb_models` — stat profiles (M/T/Sv/inv/W/Ld/OC per line) |
| `041_unit_database_weapons.sql` | `udb_weapons` — ranged + melee with A/BS_WS/S/AP/D |
| `042_unit_database_abilities.sql` | `udb_abilities` — datasheet + faction + shared abilities |
| `043_unit_database_keywords.sql` | `udb_keywords` — per-unit, is_faction_keyword flag |
| `044_unit_database_points.sql` | `udb_point_tiers` — model_count + points per tier |
| `045_unit_database_composition.sql` | `udb_compositions` — min/max models, default equipment |
| `046_unit_database_leader_targets.sql` | `udb_leader_targets` — character attachment rules |
| `047_unit_database_enhancements.sql` | `udb_enhancements` — per-faction/detachment upgrades |
| `048_collection_db_link.sql` | ADD COLUMN `db_unit_id TEXT` on `units` table with FK to `udb_units.id` |
| `049_unit_database_fts.sql` | FTS5 virtual table `udb_search` |

**Existing hobbyforge.db tables to preserve (not drop):**
`synced_unit_points`, `unit_rules_mapping`, `synced_enhancements`, `synced_loadout_options`, `synced_model_counts`, `synced_leader_targets` — keep through Phase 3, drop in Phase 5 cleanup. This allows gradual migration without breaking existing collection/army-list pages during development.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|---|---|---|
| `xml2js` | Older API, callback-first, slower than fast-xml-parser on large files | `fast-xml-parser` |
| `react-window` | Maintenance mode since 2022, no React 19 roadmap | `@tanstack/react-virtual` |
| `react-virtuoso` | Opinionated scroll container conflicts with shadcn Sheet/Dialog overlay z-index pattern | `@tanstack/react-virtual` |
| Drizzle ORM | Adds proxy complexity; documented dead-end note in PROJECT.md Key Decisions | Continue typed raw queries |
| Prisma | Freezes in Tauri production builds — documented in PROJECT.md Key Decisions | Continue typed raw queries |
| `node:sqlite` (Node built-in) | Vitest 4.x import-stripping bug (#7177) confirmed in v0.2.11 — breaks data-layer tests | `better-sqlite3` (already installed) |
| Python scraping tools | Adds non-JS dependency; `fast-xml-parser` in Node.js handles BSData XML equivalently to the existing DOMParser-based parsers | Node.js script with `fast-xml-parser` |
| Runtime Wahapedia sync as primary data source | Persistent WAL checkpoint bugs, ~20% name-matching failures, requires network on first launch — root cause of issues across 3 milestones | Pre-built bundled database |
| Opening `unit_database.db` as a second tauri-plugin-sql connection | Plugin supports multiple `Database.load()` calls, but adds a second singleton file → same WAL/checkpoint complexity that caused rules.db issues | Single `hobbyforge.db` via migration path; OR separate `unit_database.db` opened only after the file-copy setup is confirmed |
| Separate `unit_database.db` managed by tauri-plugin-sql migrations | plugin-sql cannot initialize a DB from a bundled resource (issue #1155, open) — migrations would run on an empty file ignoring the pre-built data | Bundled resource + Rust file copy (see Section 5) |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---|---|---|---|
| `@tanstack/react-virtual` | ^3.13.26 | React 19, TypeScript 5 | Same TanStack vendor as existing query/router |
| `fast-xml-parser` | ^4.5.3 | Node.js 18+ | devDependency — build script only, never bundled |
| `better-sqlite3` | ^12.10.0 | Node.js 18+ | Already installed as devDependency |
| FTS5 virtual tables | — | SQLite (bundled with Tauri 2 sqlx) | FTS5 compiled in by default; DDL via migrations |

---

## Installation Summary

```bash
# New runtime dependency
pnpm add @tanstack/react-virtual@^3.13.26

# New devDependency (build script only)
pnpm add -D fast-xml-parser@^4.5.3

# Already installed — no action needed
# better-sqlite3 ^12.10.0  (devDependency, existing)
# @tauri-apps/plugin-fs    (existing, needed for fs capability)
```

**Rust — no new crates.** `std::fs::copy` is in std. `tauri::path::BaseDirectory::Resource` is in the existing `tauri` crate. FTS5 is in the bundled SQLite.

---

## Sources

- [@tanstack/react-virtual npm](https://www.npmjs.com/package/@tanstack/react-virtual) — v3.13.26 confirmed latest (2026-05-29)
- [TanStack Virtual docs](https://tanstack.com/virtual/latest) — useVirtualizer API, React 19 support confirmed
- [TanStack Virtual perf blog](https://tanstack.com/blog/tanstack-virtual-perf-and-ios) — cold mount 4.5ms on 100k items benchmark
- [tauri-plugin-sql bundled resources issue #1155](https://github.com/tauri-apps/plugins-workspace/issues/1155) — confirmed read-only bundled DB unsupported; copy workaround is the documented pattern
- [Tauri 2 resources docs](https://v2.tauri.app/develop/resources/) — `bundle.resources` + `PathResolver::resolve` + `BaseDirectory::Resource`
- [fast-xml-parser npm](https://www.npmjs.com/package/fast-xml-parser) — 80M weekly downloads, v4.5.x stable (2025)
- [BSData wh40k-10e GitHub](https://github.com/BSData/wh40k-10e) — .cat XML format, publicly accessible, community maintained
- [SQLite FTS5 guide](https://blog.sqlite.ai/fts5-sqlite-text-search-extension) — CREATE VIRTUAL TABLE USING fts5 syntax
- [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3) — v12.10.0, fastest synchronous SQLite for Node.js

---
*Stack research for: HobbyForge v0.4.0 — Unit Database / Canonical 40k Data Hub*
*Researched: 2026-05-29*
