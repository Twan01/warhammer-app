# Phase 139: Data Quality at Scale — Pattern Map

**Mapped:** 2026-06-18
**Files analyzed:** 6 (2 new test files, 2 modified scripts, 1 modified JSON, 1 new package.json script)
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `tests/data-layer/fk-integrity.test.ts` | test | batch (import artifact + assert) | `tests/data-layer/leader-targets.test.ts` | exact |
| `tests/data-layer/reimport-preservation.test.ts` | test | CRUD (seed → delete/insert → assert) | `tests/data-layer/recipe-persistence.test.ts` | exact |
| `scripts/build-unit-db.ts` (gate extension) | utility | batch/transform | existing coverage gate at lines 604–611 (same file) | same-file extension |
| `scripts/audit-faction.ts` (batch mode + path fix) | utility | batch | existing single-faction main() at lines 202–216 (same file) | same-file extension |
| `scripts/data/translations_fr.json` (FR content) | config | transform | existing abilities/weapons entries in same file lines 464–490, 3138–3154 | same-file extension |
| `package.json` (`audit:all` script) | config | — | existing `build:udb` / `download:wahapedia` entries at lines 15–16 | exact |

---

## Pattern Assignments

### `tests/data-layer/fk-integrity.test.ts` (test, batch)

**Analog:** `tests/data-layer/leader-targets.test.ts`

**File header + environment directive** (lines 1–3):
```typescript
// @vitest-environment node

/**
 * DAT-01: Referential integrity gate — PRAGMA foreign_key_check + orphan queries.
 *
 * Asserts that unit_database.json, when imported into an in-memory DB built
 * from the real migration DDL, passes:
 *  1. PRAGMA foreign_key_check returns zero rows (all FK constraints satisfied)
 *  2. Orphan sub_faction check (JS-level, sub_faction is not FK-constrained)
 *  3. Orphan leader pairs (belt-and-suspenders over PRAGMA FK check)
 */
```

**Imports pattern** — use `createHobbyforgeDb` from db-helpers (preferred over the inline `createFullDb` that leader-targets.test.ts defined before db-helpers existed):
```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { createHobbyforgeDb } from "./db-helpers";
```

**JSON path resolution** (from `unit-database-artifact.test.ts` lines 7–8):
```typescript
const JSON_PATH = join(__dirname, "../../src-tauri/data/unit_database.json");
```

**In-memory DB setup with FK OFF during insert** (pattern from `leader-targets.test.ts` lines 101–138):
```typescript
// Insert dependency order: factions → units → children (FK OFF), then ON
db.pragma("foreign_keys = OFF");

db.prepare(
  `INSERT OR IGNORE INTO udb_factions (id, name, updated_at)
   VALUES ('TEST_FACTION', 'Test Faction', datetime('now'))`,
).run();
// ... units, then child tables ...

db.pragma("foreign_keys = ON");
// Now assertions
```

**Core FK check assertion pattern:**
```typescript
// 1. PRAGMA foreign_key_check returns zero rows
const fkViolations = db.pragma("foreign_key_check") as unknown[];
expect(fkViolations, `FK violations: ${JSON.stringify(fkViolations)}`).toHaveLength(0);

// 2. Orphan leader pairs (explicit query)
const orphanLeaders = db.prepare(`
  SELECT lt.leader_unit_id FROM udb_leader_targets lt
  WHERE NOT EXISTS (SELECT 1 FROM udb_units WHERE id = lt.leader_unit_id)
`).all();
expect(orphanLeaders, `Orphan leader_unit_id pairs: ${JSON.stringify(orphanLeaders)}`).toHaveLength(0);

const orphanTargets = db.prepare(`
  SELECT lt.target_unit_id FROM udb_leader_targets lt
  WHERE NOT EXISTS (SELECT 1 FROM udb_units WHERE id = lt.target_unit_id)
`).all();
expect(orphanTargets, `Orphan target_unit_id pairs: ${JSON.stringify(orphanTargets)}`).toHaveLength(0);
```

**FK pragma inspection** (from `leader-targets.test.ts` lines 81–98):
```typescript
type FkInfo = { table: string; from: string; on_delete: string };
const fks = db.pragma("foreign_key_list(udb_leader_targets)") as FkInfo[];
```

**Test suite close pattern** (all data-layer tests):
```typescript
afterAll(() => {
  db.close();
});
```

**Note on test design:** The `unit-database-artifact.test.ts` only reads the JSON (it does NOT import rows into an in-memory DB). `fk-integrity.test.ts` is the first test to do a full INSERT of all udb_* rows. Load the full JSON, then insert in dependency order: `udb_factions` → `udb_units` → six child tables → `udb_leader_targets`. Mirror the lib.rs import order (`src-tauri/src/lib.rs` lines 769–885).

---

### `tests/data-layer/reimport-preservation.test.ts` (test, CRUD)

**Analog:** `tests/data-layer/recipe-persistence.test.ts`

**Imports + beforeEach/afterEach pattern** (lines 1–20):
```typescript
// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createHobbyforgeDb } from "./db-helpers";

describe("reimport preservation (DAT-03 D-07)", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createHobbyforgeDb();
  });

  afterEach(() => {
    db.close();
  });
```

**Seed → mutate → assert pattern** (from `recipe-persistence.test.ts` lines 22–48 and `leader-targets.test.ts` lines 101–150):
```typescript
it("rules_favorites survive DELETE-all+INSERT re-import of udb_* tables", () => {
  // 1. Seed udb_* rows needed for FK references
  db.pragma("foreign_keys = OFF");
  db.prepare(`INSERT OR IGNORE INTO udb_factions (id, name, updated_at) VALUES (?, ?, datetime('now'))`).run("SM", "Space Marines");
  db.prepare(`INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at) VALUES (?, ?, ?, datetime('now'))`).run("000000001", "SM", "World Eater");
  // ... other udb_* tables ...
  db.pragma("foreign_keys = ON");

  // 2. Seed user data (rules_favorites, rules_notes, unit_overrides)
  db.prepare(`INSERT INTO rules_favorites (rule_id, rule_type) VALUES (?, ?)`).run("000000001", "ability");
  // ...

  // 3. Simulate re-import: DELETE all udb_* tables (mirror lib.rs order)
  db.pragma("foreign_keys = OFF");
  db.prepare(`DELETE FROM udb_leader_targets`).run();
  db.prepare(`DELETE FROM udb_unit_keywords`).run();
  db.prepare(`DELETE FROM udb_unit_points`).run();
  db.prepare(`DELETE FROM udb_unit_composition`).run();
  db.prepare(`DELETE FROM udb_unit_abilities`).run();
  db.prepare(`DELETE FROM udb_unit_weapons`).run();
  db.prepare(`DELETE FROM udb_unit_models`).run();
  db.prepare(`DELETE FROM udb_units`).run();
  db.prepare(`DELETE FROM udb_factions`).run();
  // Re-INSERT with same Wahapedia IDs
  db.prepare(`INSERT OR IGNORE INTO udb_factions (id, name, updated_at) VALUES (?, ?, datetime('now'))`).run("SM", "Space Marines");
  db.prepare(`INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at) VALUES (?, ?, ?, datetime('now'))`).run("000000001", "SM", "World Eater");
  db.pragma("foreign_keys = ON");

  // 4. Assert user rows survived
  const fav = db.prepare(`SELECT * FROM rules_favorites WHERE rule_id = ?`).get("000000001");
  expect(fav).toBeDefined();
});
```

**Why user tables survive:** `rules_favorites`, `rules_notes`, and `unit_overrides` live in hobbyforge.db tables that are NOT in the udb_* DELETE list. `units.udb_unit_id` is a nullable FK with `ON DELETE SET NULL` (migration 039) — after re-import with the same Wahapedia IDs it stays non-null. The test must assert all three.

---

### `scripts/build-unit-db.ts` — validation gate extension (DAT-01a)

**Analog:** Existing coverage gate at lines 604–611 (same file).

**Existing gate pattern to extend** (lines 604–611):
```typescript
// BPH-05: Coverage failure threshold check (D-09, D-10)
// Uses overall (all factions combined) percentage, not per-faction.
if (overallCoveragePct < MIN_COVERAGE_PCT) {
  console.error(
    "ERROR: Overall coverage " + overallCoveragePct.toFixed(1) + "% is below minimum threshold of " + MIN_COVERAGE_PCT + "%"
  );
  console.error("This indicates a regression. Check Wahapedia CSV freshness.");
  process.exit(1);
}
```

**New referential check block to insert immediately after line 611:**
```typescript
// DAT-01a: JSON-level referential integrity checks
// Runs over the in-memory row arrays before writing unit_database.json.
// Any violation → console.error + process.exit(1), failing pnpm build:udb.
{
  const factionIds = new Set(factions.map((f) => f.id));
  const unitIds = new Set(units.map((u) => u.id));
  const refErrors: string[] = [];

  // Every unit.faction_id must resolve to a known faction
  for (const u of units) {
    if (!factionIds.has(u.faction_id)) {
      refErrors.push(`unit ${u.id} has unknown faction_id "${u.faction_id}"`);
    }
  }

  // Every child row's unit_id must resolve to a known unit
  const childArrays: Array<[string, { unit_id: string }[]]> = [
    ["udb_unit_weapons", weapons],
    ["udb_unit_abilities", abilities],
    ["udb_unit_keywords", keywords],
    ["udb_unit_models", models],
    ["udb_unit_points", pointsRows],
    ["udb_unit_composition", compositionRows],
  ];
  for (const [tableName, arr] of childArrays) {
    for (const row of arr) {
      if (!unitIds.has(row.unit_id)) {
        refErrors.push(`${tableName}: unit_id "${row.unit_id}" not in units`);
      }
    }
  }

  // Both ends of every leader_targets pair must resolve to a unit
  for (const pair of leaderTargets) {
    if (!unitIds.has(pair.leader_unit_id)) {
      refErrors.push(`leader_targets: leader_unit_id "${pair.leader_unit_id}" not in units`);
    }
    if (!unitIds.has(pair.target_unit_id)) {
      refErrors.push(`leader_targets: target_unit_id "${pair.target_unit_id}" not in units`);
    }
  }

  if (refErrors.length > 0) {
    console.error(`\nERROR: ${refErrors.length} referential integrity violation(s):`);
    for (const e of refErrors) console.error("  " + e);
    process.exit(1);
  }
  console.log("  Referential integrity: OK");
}
```

**Discretion note:** The referential check may be extracted to `scripts/lib/validateRefs.ts` as a standalone `validateReferentialIntegrity(data: UnitDatabaseJson): string[]` helper, following the `scripts/lib/` pattern of `weaponMapping.ts` / `parseCsv.ts`. The call site in `build-unit-db.ts` would then be two lines. Either inline or extracted is acceptable; extracted is more testable in isolation.

---

### `scripts/audit-faction.ts` — batch mode + path fix (DAT-02)

**Analog:** Existing single-faction CLI main() at lines 202–216 (same file).

**Current CLI entrypoint to replace** (lines 202–216):
```typescript
function main() {
  const factionId = process.argv[2]?.toUpperCase();
  if (!factionId || !["SM", "NEC", "DG"].includes(factionId)) {
    console.error("Usage: node --experimental-strip-types scripts/audit-faction.ts <SM|NEC|DG>");
    process.exit(1);
  }

  const factionName = FACTION_NAMES[factionId] ?? factionId;
  console.log(`\n=== Auditing ${factionName} (${factionId}) ===\n`);

  const DATA_DIR = join(__dirname, "data");
  const UDB_PATH = join(REPO_ROOT, "src-tauri", "data", "unit_database.json");
  const COVERAGE_PATH = join(DATA_DIR, "coverage-report.json");
  const REPORTS_DIR = join(REPO_ROOT, ".planning", "phases", "113-priority-faction-data-audit", "reports");
  // ...
}
```

**Changes required (two independent edits):**

1. **Remove the SM/NEC/DG whitelist** (line 204) — replace with a check against `unit_database.json`'s factions array:
```typescript
// BEFORE (line 204):
if (!factionId || !["SM", "NEC", "DG"].includes(factionId)) {
  console.error("Usage: node --experimental-strip-types scripts/audit-faction.ts <SM|NEC|DG>");
  process.exit(1);
}

// AFTER:
const udbForValidation: UnitDatabaseJson = JSON.parse(readFileSync(UDB_PATH, "utf-8"));
const knownFactionIds = new Set(udbForValidation.factions.map((f) => f.id));
if (!factionId || !knownFactionIds.has(factionId)) {
  console.error(`Usage: node --experimental-strip-types scripts/audit-faction.ts <FACTION_ID|--all>`);
  console.error(`Known faction IDs: ${[...knownFactionIds].sort().join(", ")}`);
  process.exit(1);
}
```

2. **Add `--all` batch mode** (loop that calls the existing per-faction logic for every faction):
```typescript
function main() {
  const arg = process.argv[2]?.toUpperCase();
  const DATA_DIR = join(__dirname, "data");
  const UDB_PATH = join(REPO_ROOT, "src-tauri", "data", "unit_database.json");
  const udb: UnitDatabaseJson = JSON.parse(readFileSync(UDB_PATH, "utf-8"));

  if (arg === "--ALL") {
    const factionIds = udb.factions.map((f) => f.id);
    console.log(`\nBatch audit: ${factionIds.length} factions\n`);
    for (const id of factionIds) {
      auditFaction(id, udb, DATA_DIR);
    }
    return;
  }

  const knownFactionIds = new Set(udb.factions.map((f) => f.id));
  if (!arg || !knownFactionIds.has(arg)) {
    console.error(`Usage: node --experimental-strip-types scripts/audit-faction.ts <FACTION_ID|--all>`);
    process.exit(1);
  }
  auditFaction(arg, udb, DATA_DIR);
}
```

3. **Parameterize the REPORTS_DIR** (line 216) — update default from Phase 113 to Phase 139:
```typescript
// BEFORE (line 216):
const REPORTS_DIR = join(REPO_ROOT, ".planning", "phases", "113-priority-faction-data-audit", "reports");

// AFTER (support --output-dir CLI flag or default to Phase 139):
const outputDirArg = process.argv.find((a) => a.startsWith("--output-dir="))?.split("=")[1];
const REPORTS_DIR = outputDirArg
  ? resolve(outputDirArg)
  : join(REPO_ROOT, ".planning", "phases", "139-data-quality-at-scale", "reports");
```

4. **Expand FACTION_NAMES** (lines 192–196) to all 25 factions (or derive from `unit_database.json` at runtime — simpler):
```typescript
// All 25 faction IDs verified from unit_database.json:
// AC, AdM, AE, AM, AoI, AS, CD, CSM, DG, DRU, EC, GC, GK, LoV, NEC, ORK, QI, QT, SM, TAU, TL, TS, TYR, UN, WE
const FACTION_NAMES: Record<string, string> = {
  SM: "Space Marines",       NEC: "Necrons",             DG: "Death Guard",
  AC: "Adeptus Custodes",    AdM: "Adeptus Mechanicus",  AE: "Aeldari",
  AM: "Astra Militarum",     AoI: "Agents of the Imperium", AS: "Adepta Sororitas",
  CD: "Chaos Daemons",       CSM: "Chaos Space Marines", DRU: "Drukhari",
  EC: "Emperor's Children",  GC: "Genestealer Cults",   GK: "Grey Knights",
  LoV: "Leagues of Votann",  ORK: "Orks",                QI: "Imperial Knights",
  QT: "Chaos Knights",       TAU: "T'au Empire",         TL: "The Legion of the Damned",
  TS: "Thousand Sons",       TYR: "Tyranids",            UN: "Unaligned",
  WE: "World Eaters",
};
```

**Report output pattern** (lines 556–564, unchanged — just REPORTS_DIR changes):
```typescript
const jsonPath = join(REPORTS_DIR, `${factionId.toLowerCase()}-audit.json`);
const mdPath = join(REPORTS_DIR, `${factionId.toLowerCase()}-audit.md`);
writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
const md = generateMarkdown(report);
writeFileSync(mdPath, md, "utf-8");
```

---

### `scripts/data/translations_fr.json` — FR content extension (DAT-03)

**Analog:** Existing entries in same file.

**`factions` section key format** (lines 2–25):
```json
"factions": {
  "SM": "Space Marines",
  "EC": "Enfants de l'Empereur",
  "TL": "Légion des Damnés",
  "UN": "Non-alignés"
}
```
(Three factions currently missing: EC, TL, UN — fill these.)

**`units` section key format** — Wahapedia unit ID (lines 27–60):
```json
"units": {
  "000000882": "Garde Custodien",
  "000000060": "Apothicaire Biologis"
}
```
Key = Wahapedia unit ID string (`udb_units.id`), value = French unit name string.

**`abilities` section key format** — composite `"${unit_id}:${ability_name}"` (lines 465–490):
```json
"abilities": {
  "000000001:Might is Right": {
    "name_fr": "La Force Fait Loi",
    "description_fr": "Tant que ce modèle dirige une unité, à chaque fois qu'un modèle de cette unité effectue une attaque de mêlée, ajoutez 1 au jet de touche."
  },
  "000000060:Surgical Precision": {
    "name_fr": "Precision Chirurgicale",
    "description_fr": null
  }
}
```
Key = `"${udb_unit_abilities.unit_id}:${udb_unit_abilities.name}"`, value = object with `name_fr` (string) and `description_fr` (string | null).

**`weapons` section key format** — composite `"${unit_id}:${weapon_name}"` (lines 3139–3154):
```json
"weapons": {
  "000000882:Guardian spear": "Lance gardienne",
  "000000061:Bolt pistol": "Pistolet bolter"
}
```
Key = `"${udb_unit_weapons.unit_id}:${udb_unit_weapons.name}"`, value = French weapon name string.

**`TranslationsFrOverlay` TypeScript interface** (from `scripts/lib/types.ts` lines 156–162):
```typescript
export interface TranslationsFrOverlay {
  factions?: Record<string, string>;
  units?: Record<string, string>;
  abilities?: Record<string, { name_fr?: string | null; description_fr?: string | null }>;
  weapons?: Record<string, string>;
  keywords?: Record<string, string>;
}
```

**How step 10.5 merges the overlay** (build-unit-db.ts lines 641–689) — no code change needed, content extension only:
- `factions[f.id]` → `f.name_fr`
- `units[u.id]` → `u.name_fr`
- `abilities["${a.unit_id}:${a.name}"]` → `a.name_fr` + `a.description_fr`
- `weapons["${w.unit_id}:${w.name}"]` → `w.name_fr`
- `keywords[k.keyword]` → `k.keyword_fr`

**Known limitation (document in reports):** Ability and weapon keys use name strings, not stable IDs. If Wahapedia renames an ability or weapon, the overlay key becomes orphaned. Accept for DAT-03 — it's the established mechanism.

---

### `package.json` — `audit:all` script

**Analog:** Lines 15–16:
```json
"build:udb": "node --experimental-strip-types scripts/build-unit-db.ts",
"download:wahapedia": "node --experimental-strip-types scripts/download-wahapedia.ts"
```

**New entry to add** (insert after `download:wahapedia`):
```json
"audit:all": "node --experimental-strip-types scripts/audit-faction.ts --all"
```

---

## Shared Patterns

### In-memory DB construction (all data-layer tests)

**Source:** `tests/data-layer/db-helpers.ts` — `createHobbyforgeDb()` (lines 43–59)

**Apply to:** `fk-integrity.test.ts`, `reimport-preservation.test.ts`

```typescript
export function createHobbyforgeDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  for (const file of HOBBYFORGE_MIGRATIONS) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
    db.exec(sql);
  }

  // Migration 022 toggles FK off/on — verify it's back ON
  const fkState = db.pragma("foreign_keys") as { foreign_keys: number }[];
  if (fkState[0]?.foreign_keys !== 1) {
    throw new Error("PRAGMA foreign_keys not ON after migration chain");
  }

  return db;
}
```

`HOBBYFORGE_MIGRATIONS` is derived from `readdirSync(migrationsDir)` — no manual list maintenance needed. Adding a new migration `.sql` file auto-updates the list.

### FK OFF during seed / ON for assertions

**Source:** `tests/data-layer/leader-targets.test.ts` lines 101–138

**Apply to:** `fk-integrity.test.ts` (udb_* import section), `reimport-preservation.test.ts` (DELETE/re-INSERT section)

```typescript
// Disable FK to insert seed rows without ordering constraint
db.pragma("foreign_keys = OFF");
// ... INSERT parent rows, then child rows ...
// Re-enable FK enforcement before assertions
db.pragma("foreign_keys = ON");
```

This mirrors the lib.rs importer behavior (`src-tauri/src/lib.rs` lines 769–790).

### process.exit(1) gate pattern

**Source:** `scripts/build-unit-db.ts` lines 606–611

**Apply to:** `scripts/build-unit-db.ts` new referential check block, `scripts/audit-faction.ts` validation guard

```typescript
if (/* violation condition */) {
  console.error("ERROR: " + message);
  process.exit(1);
}
```

### `__dirname` / `__filename` ESM polyfill

**Source:** `scripts/audit-faction.ts` lines 30–32 and `tests/data-layer/leader-targets.test.ts` lines 23–25

**Apply to:** any new script file in `scripts/` or `tests/data-layer/` that needs `__dirname`

```typescript
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

Or for tests, use `join(__dirname, "../../src-tauri/data/unit_database.json")` directly as in `unit-database-artifact.test.ts` line 7.

### Violation array pattern (collect all errors, then fail once)

**Source:** `tests/data-layer/unit-database-artifact.test.ts` lines 162–178, and `scripts/build-unit-db.ts` referential check concept

**Apply to:** `fk-integrity.test.ts` orphan checks, build-unit-db.ts referential gate

```typescript
const violations: string[] = [];
for (let i = 0; i < items.length; i++) {
  if (/* bad condition */) {
    violations.push(`item[${i}] id=${item.id} reason`);
  }
}
expect(violations, `Violations:\n${violations.join("\n")}`).toHaveLength(0);
```

---

## No Analog Found

None — all files have direct analogs in the codebase.

---

## Metadata

**Analog search scope:** `tests/data-layer/`, `scripts/`, `scripts/data/`, `scripts/lib/`, `package.json`
**Files scanned:** 11 (8 test files + 3 script/config files read in full or targeted sections)
**Pattern extraction date:** 2026-06-18
