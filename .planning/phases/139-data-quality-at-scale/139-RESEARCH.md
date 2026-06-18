# Phase 139: Data Quality at Scale — Research

**Researched:** 2026-06-18
**Domain:** Dev-side data pipeline (build-unit-db.ts, audit-faction.ts, translations_fr.json) + data-layer tests (better-sqlite3, tests/data-layer/)
**Confidence:** HIGH — all findings grounded in direct reads of the actual codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**DAT-01 — Referential-integrity validation gate**
- D-01: Two-layer validation — (a) JSON-level referential checks in build-unit-db.ts extending the existing MIN_COVERAGE_PCT/process.exit(1) gate; (b) a new tests/data-layer/*.test.ts importing the built artifact into an in-memory better-sqlite3 DB built from the real migration DDL with PRAGMA foreign_keys = ON, then asserting PRAGMA foreign_key_check returns zero rows plus targeted orphan queries.
- D-02: No new migration unless genuinely forced — prefer idempotent guards (CREATE TABLE IF NOT EXISTS, WHERE ... IS NULL UPDATEs). Any new migration re-triggers the Phase-130 parity/release gate trio (db-helpers.ts HOBBYFORGE_MIGRATIONS + lib.rs Migration block + version bump).

**DAT-02 — 22-faction audit + correction**
- D-03: Extend audit-faction.ts with a batch/loop mode for all 25 factions; write one {faction}-audit.{json,md} per faction under this phase's reports/ directory.
- D-04: Corrections fix the PIPELINE (scripts/lib/weaponMapping.ts, parseCsv.ts, build-unit-db.ts), never hand-edit unit_database.json. Triage into systematic parsing/mapping bugs (fix in scripts/lib/ — one fix corrects all affected units) vs genuine source gaps (document, accept).

**DAT-03 — French ability/weapon extension**
- D-05: Extend scripts/data/translations_fr.json overlay — no schema change. Ability name_fr/description_fr + weapon name_fr, keyed on stable Wahapedia IDs / weapon keys.
- D-06: FR content is curated data, no machine-translation runtime dependency. Whether Wahapedia FR locale is available via download-wahapedia.ts is an open question; structurally all content lands in translations_fr.json regardless.
- D-07: Add a data-layer test proving overrides/favorites/notes survive a simulated re-import; assert idempotent backfill is safe on second run.

**Sequencing**
- D-08: DAT-01 gate lands FIRST; then per-faction audit+translate batches, each completing a faction group end-to-end.

### Claude's Discretion
- Exact batch grouping of the 22 factions and number of plans the audit+translate work splits into.
- Exact filenames for the new data-layer FK test and re-import preservation test (follow tests/data-layer/ naming).
- Whether the JSON-level referential check (D-01a) is a standalone helper in scripts/lib/ or inline in build-unit-db.ts.
- The precise in-memory-schema construction in the data-layer FK test (all migrations vs udb_* subset) — whichever db-helpers.ts already supports.
- Report directory name/path for the 25 audit reports under this phase.

### Deferred Ideas (OUT OF SCOPE)
- Machine-translation / automated FR sourcing pipeline.
- Surfacing audit reports in-app ("data health" view).
- WeaponTable a11y conversion, leader "can lead X" datasheet enrichment (carried from Phases 136/137).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DAT-01 | Build/data pipeline validates referential integrity (FK/orphan checks — PRAGMA foreign_key_check, orphan sub_faction, orphan leader-target pairs) and fails the build on violations; covered by data-layer tests. | Two-layer gate: JSON checks in build-unit-db.ts (§D-01a) + better-sqlite3 test (§D-01b). Exact udb_* FK graph documented below. |
| DAT-02 | All 25 factions' unit data audited against Wahapedia and corrected (22 factions beyond SM/NEC/DG). | audit-faction.ts already implements the diff harness; needs batch mode + 22 additional faction IDs + FACTION_NAMES expansion. |
| DAT-03 | French ability/weapon descriptions added for audited factions, extending existing _fr overlay, with user overrides/favorites/notes preserved across re-import. | translations_fr.json structure + overlay merge (step 10.5) + re-import safety (DELETE-all udb_* tables, user data lives in separate hobbyforge.db tables). |
</phase_requirements>

---

## Summary

Phase 139 is a pure dev-side data quality phase: no runtime UI changes, no new app features, no new migrations expected. All three requirements operate on the build pipeline (`scripts/build-unit-db.ts`, `scripts/audit-faction.ts`, `scripts/data/translations_fr.json`) and the data-layer test harness (`tests/data-layer/`).

**DAT-01** extends an existing `process.exit(1)` coverage gate with JSON-level referential integrity checks across all six udb_* child-table relationships, plus a new better-sqlite3 test that imports the artifact into an in-memory DB and runs `PRAGMA foreign_key_check`. The test infrastructure (`db-helpers.ts` + `createHobbyforgeDb()`) is fully operational: `HOBBYFORGE_MIGRATIONS` is derived from disk via `readdirSync`, so no manual list maintenance is needed.

**DAT-02** requires expanding `audit-faction.ts` in two ways: (a) adding all 25 faction IDs to `FACTION_NAMES` and removing the whitelist guard at line 204, and (b) adding a batch loop mode (e.g. `--all` flag) that iterates every faction. SM/NEC/DG audits revealed two dominant systematic bugs (weapon.range and weapon.keywords column name mismatches) that are already fixed, so the 22 remaining factions are likely to show residual per-unit errors or source-limitation unmatch. The audit's output path is hardcoded to Phase 113's reports directory — it needs updating to Phase 139's reports directory.

**DAT-03** extends `scripts/data/translations_fr.json`, which already has factions, units, abilities, and weapons sections keyed on Wahapedia IDs. Step 10.5 in `build-unit-db.ts` already merges this overlay — no code changes needed for the plumbing, only content additions. User overrides/favorites/notes are provably safe across re-import: they live in `hobbyforge.db` tables (`unit_overrides`, `rules_favorites`, `rules_notes`) that are keyed on IDs unrelated to `udb_*` Wahapedia IDs, and the re-import does a DELETE-all+INSERT only on `udb_*` tables, never touching those user tables.

**Primary recommendation:** Land DAT-01 (validation gate) as Plan 1, then batch the 22 factions into 2–3 audit+translate plans, each covering a logical group of factions end-to-end.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| FK/orphan referential checks | Build pipeline (scripts/) | Data-layer test (tests/) | Gate runs at `pnpm build:udb` time; test enforces it on CI |
| 22-faction audit | Build pipeline (scripts/) | — | Pure dev-side diff of CSVs vs artifact; no app runtime |
| Pipeline parsing fixes | scripts/lib/ | scripts/build-unit-db.ts | Systematic bugs fix in shared parsing helpers, not the artifact |
| French overlay content | scripts/data/translations_fr.json | Build pipeline (step 10.5) | Content lands in overlay JSON; pipeline merges it into artifact |
| Re-import preservation guarantee | Data-layer test (tests/) | hobbyforge.db schema (migrations) | User tables are structurally separate from udb_* |

---

## DAT-01: Referential Integrity Gate — Technical Mechanics

### udb_* FK Graph (verified from migration files)

All FKs in the udb_* schema were read directly from `038_udb_schema.sql` and subsequent migrations. [VERIFIED: codebase]

**Parent tables:**
- `udb_factions` (PK: `id TEXT`) — root
- `udb_units` (PK: `id TEXT`, FK: `faction_id → udb_factions(id)`) — second level

**Child tables (all FK → `udb_units(id) ON DELETE CASCADE`):**
- `udb_unit_models` — `unit_id`
- `udb_unit_weapons` — `unit_id`
- `udb_unit_abilities` — `unit_id`
- `udb_unit_keywords` — `unit_id`
- `udb_unit_points` — `unit_id`
- `udb_unit_composition` — `unit_id`
- `udb_leader_targets` — `leader_unit_id` AND `target_unit_id` (BOTH FKs → udb_units) [migration 050]

**Additional orphan vectors (not covered by PRAGMA foreign_key_check alone):**
- `udb_units.sub_faction` is a free TEXT column, not a FK — orphan sub_faction means a value in `sub_faction` that does not match any known sub-faction string for that faction's unit set. This must be a JSON-level check since SQLite has no FK constraint to enforce it.
- `udb_leader_targets` orphan pairs: as of Phase 138, 1,918 pairs imported from `Datasheets_leader.csv`; `udb_units` has ~1,711 units. Legends dedup may have removed units referenced in the leader CSV, creating orphan pairs (PITFALLS §7). `PRAGMA foreign_key_check` will catch these IF FK enforcement is ON at import time (which the test ensures via `PRAGMA foreign_keys = ON` before inserting).

### D-01a: JSON-Level Check in build-unit-db.ts

**What to add:** After the existing coverage gate (lines 604–611), extend with referential checks over the in-memory row arrays before writing `unit_database.json`:

```typescript
// Conceptual pseudocode — exact placement: immediately after MIN_COVERAGE_PCT gate

const factionIds = new Set(factions.map(f => f.id));
const unitIds = new Set(units.map(u => u.id));
const refErrors: string[] = [];

// 1. Every unit.faction_id resolves to a faction
for (const u of units) {
  if (!factionIds.has(u.faction_id)) {
    refErrors.push(`unit ${u.id} has unknown faction_id "${u.faction_id}"`);
  }
}

// 2. Every child row's unit_id resolves to a unit
for (const childArray of [weapons, abilities, keywords, models, pointsRows, compositionRows]) {
  for (const row of childArray) {
    if (!unitIds.has(row.unit_id)) {
      refErrors.push(`${tableName} row has unknown unit_id "${row.unit_id}"`);
    }
  }
}

// 3. Both ends of every leader_targets pair resolve to a unit
for (const pair of leaderTargets) {
  if (!unitIds.has(pair.leader_unit_id))
    refErrors.push(`leader_targets: leader_unit_id "${pair.leader_unit_id}" not in units`);
  if (!unitIds.has(pair.target_unit_id))
    refErrors.push(`leader_targets: target_unit_id "${pair.target_unit_id}" not in units`);
}

// 4. No orphan sub_faction (sub_faction values must appear as actual sub_factions in the faction)
// Implementation: collect known sub_faction values per faction from units; any unit.sub_faction
// not in SUB_FACTION_MAP keys is flagged.

if (refErrors.length > 0) {
  for (const e of refErrors) console.error("REF ERROR: " + e);
  process.exit(1);
}
```

**Decision point (Claude's discretion):** Whether this lives as a standalone `validateReferentialIntegrity(data)` helper in `scripts/lib/validateRefs.ts` or inline in `build-unit-db.ts`. The standalone helper is more testable and follows the existing `scripts/lib/` pattern (weaponMapping.ts, parseCsv.ts).

### D-01b: Data-Layer Test

**Pattern:** Mirror `tests/data-layer/leader-targets.test.ts` — it already builds a full in-memory DB from `readdirSync(migrationsDir)` with `PRAGMA foreign_keys = ON`. That test is the closest precedent; the new FK-check test follows the same shape. [VERIFIED: codebase]

The `createHobbyforgeDb()` helper in `db-helpers.ts` is also available and does the same thing (all migrations applied, FK ON verified). Either approach works.

**Core assertions the new test must make:**

```typescript
// File: tests/data-layer/fk-integrity.test.ts (suggested name)

// After importing unit_database.json into in-memory DB:
// 1. PRAGMA foreign_key_check returns zero rows
const fkViolations = db.pragma("foreign_key_check") as unknown[];
expect(fkViolations).toHaveLength(0);

// 2. Orphan sub_faction: udb_units rows with non-null sub_faction that don't
//    correspond to a known sub_faction value within that faction
// (This is a JS-level check over the artifact, since sub_faction is not FK-constrained)

// 3. Orphan leader pairs (belt-and-suspenders over PRAGMA FK check)
const orphanLeaders = db.prepare(`
  SELECT lt.leader_unit_id FROM udb_leader_targets lt
  WHERE NOT EXISTS (SELECT 1 FROM udb_units WHERE id = lt.leader_unit_id)
`).all();
expect(orphanLeaders).toHaveLength(0);
```

**How to import the artifact into the in-memory DB:** The `lib.rs` importer logic is Rust/async — it cannot be called from the test. The test must replicate the INSERT logic directly in better-sqlite3. The existing `unit-database-artifact.test.ts` only reads the JSON, it does NOT import it into an in-memory DB. The new test is the first to do a full import. This is the primary new effort in D-01b.

**Pattern for import in the test:**
```typescript
// Load JSON
const db_json = JSON.parse(readFileSync(JSON_PATH, "utf-8"));

// Use createHobbyforgeDb() to build schema with all migrations
const db = createHobbyforgeDb();
db.pragma("foreign_keys = OFF"); // mirror lib.rs import behavior

// INSERT factions, units, weapons, abilities, keywords, models, points,
// composition, leader_targets using db.prepare().run() for each row

db.pragma("foreign_keys = ON");
// Now run assertions
```

---

## DAT-02: Audit Script — Technical Mechanics

### Current State of audit-faction.ts [VERIFIED: codebase]

- **CLI shape:** `node --experimental-strip-types scripts/audit-faction.ts <FACTION_ID>` (single faction, uppercase)
- **Whitelist guard:** line 204 — `if (!factionId || !["SM", "NEC", "DG"].includes(factionId))` — **this must be removed or replaced** with a check against all known faction IDs from `unit_database.json`
- **FACTION_NAMES map:** lines 192–196 — hardcoded to SM/NEC/DG only. Must expand to all 25 factions (or derive from the JSON)
- **Output path:** hardcoded to `.planning/phases/113-priority-faction-data-audit/reports/` (line 216) — **must be parameterized or updated** to output under Phase 139's reports directory
- **Comparison logic:** CSV field-by-field diff for models (M/T/Sv/W/Ld/OC), weapons (range/attacks/skill/strength/ap/damage/category/keywords), abilities (name/description/type), keywords. Systematic-issue detection runs first.
- **Translation gap tracking:** already counts `translation_gaps.units_missing`, `weapons_missing`, `abilities_missing` per faction

### All 25 Faction IDs (from unit_database.json) [VERIFIED: codebase]

`AC, AdM, AE, AM, AoI, AS, CD, CSM, DG, DRU, EC, GC, GK, LoV, NEC, ORK, QI, QT, SM, TAU, TL, TS, TYR, UN, WE`

- Already audited (Phase 113): SM, NEC, DG
- Remaining 22: AC, AdM, AE, AM, AoI, AS, CD, CSM, DRU, EC, GC, GK, LoV, ORK, QI, QT, TAU, TL, TS, TYR, UN, WE

### SM/NEC/DG Audit Findings — Dominant Patterns [VERIFIED: codebase]

The two systematic bugs found in ALL three factions were identical:
1. **weapon.range** — Pipeline reads `row["Range"]` (capitalized) but CSV header is `range` (lowercase). Affected ALL weapons across all factions (1,899 SM weapons, 172 NEC, all DG weapons). [ASSUMED: already fixed in later pipeline work — verify by checking scripts/lib/weaponMapping.ts]
2. **weapon.keywords** — Pipeline reads `row["keywords"]` but CSV field containing special rules is actually `description`. Affected all weapons with keyword data.

**Per-unit errors** were low in count (23 for SM, 23 for NEC) and mostly `weapon.category` / `weapon.attacks` mismatches — these appear to be Melee-vs-Ranged classification issues from multi-profile weapons.

**Implication for the 22 new factions:** If the two systematic bugs were fixed after Phase 113 (to be verified by running the audit), the 22 remaining factions should show primarily per-unit errors and source-gap unmatch, not systematic zero-fills. The volume of work is per-faction residual errors, not a pipeline rewrite.

### Batch Mode — Implementation Approach

Two options:

**Option A (recommended):** Add an `--all` CLI flag that iterates all faction IDs from `unit_database.json` factions array and writes reports to a Phase 139 reports directory. The existing per-faction logic runs in a loop.

**Option B:** Shell loop in package.json script:
```json
"audit:all": "node --experimental-strip-types scripts/audit-faction.ts AC && ..."
```
Less clean, harder to maintain.

**Suggested batch script addition to package.json:**
```json
"audit:all": "node --experimental-strip-types scripts/audit-faction.ts --all"
```

### Faction Batch Grouping (Claude's Discretion)

Suggested grouping by thematic affinity (smaller factions together, no need for exact sizing since the audit script is fast):

**Batch A (~8 factions, major Xenos + Chaos):** TYR, ORK, TAU, AE, DRU, CD, WE, EC
**Batch B (~7 factions, Imperium):** AM, GK, AC, AS, AdM, AoI, LoV
**Batch C (~7 factions, Chaos + smaller):** CSM, TS, GC, QI, QT, TL, UN

This gives 3 audit+translate plans (one per batch) after the initial DAT-01 plan.

---

## DAT-03: French Overlay — Technical Mechanics

### translations_fr.json Structure [VERIFIED: codebase]

Five top-level sections:
```json
{
  "factions":   { "<faction_id>": "<name_fr>" },
  "units":      { "<wahapedia_unit_id>": "<name_fr>" },
  "abilities":  { "<unit_id>:<ability_name>": { "name_fr": "...", "description_fr": "..." } },
  "weapons":    { "<unit_id>:<weapon_name>": "<name_fr>" },
  "keywords":   { "<keyword>": "<keyword_fr>" }
}
```

**Keying details (from step 10.5 in build-unit-db.ts, lines 641–689):** [VERIFIED: codebase]
- `factions` → keyed by faction short ID (`"SM"`, `"NEC"`, etc.)
- `units` → keyed by Wahapedia unit ID (`"000000882"`, etc.)
- `abilities` → keyed by `"${a.unit_id}:${a.name}"` (composite key)
- `weapons` → keyed by `"${w.unit_id}:${w.name}"` (composite key)
- `keywords` → keyed by the keyword string itself

**Current coverage:** Factions section has 22 entries (3 factions without FR names: EC, TL, UN). Units section has entries for SM, AC, and partial others. Abilities and weapons sections are sparse (SM-focused based on the existing content).

**Target for DAT-03:** For each audited faction, add:
- `units[<wahapedia_id>]` = French unit name
- `abilities["<unit_id>:<ability_name>"]` = `{ name_fr, description_fr }` for each ability
- `weapons["<unit_id>:<weapon_name>"]` = French weapon name

**Schema columns already exist** (migration 041): `name_fr` on `udb_factions`, `udb_units`, `udb_unit_weapons`; `name_fr` + `description_fr` on `udb_unit_abilities`; `keyword_fr` on `udb_unit_keywords`. No schema change needed. [VERIFIED: codebase]

**Rust importer** already binds all `_fr` columns (lib.rs lines 797–885). No Rust changes needed. [VERIFIED: codebase]

### French Content Source — Open Question

D-06 left the sourcing method as an open researcher question. Investigation needed:

- Does `download-wahapedia.ts` have a French locale option? (Need to check `scripts/download-wahapedia.ts`) [ASSUMED: unlikely — Wahapedia is EN-only; FR text must be curated manually or from a separate FR Wahapedia mirror]
- The existing `translations_fr.json` content for factions looks hand-authored (colloquial French translations, not machine-translated). The ability/weapon translations would need the same treatment.

**Practical conclusion for planning:** FR content additions are data authoring tasks, not code tasks. Each faction batch plan should include a task to add FR entries for that batch's factions. The planner should estimate this as an L-sized effort across all 22 factions.

### Re-Import Preservation — Why User Data Is Safe [VERIFIED: codebase]

The Rust importer (`lib.rs` lines 769–790) does a DELETE-all+INSERT only on these tables:
`udb_unit_keywords, udb_unit_points, udb_unit_composition, udb_unit_abilities, udb_unit_weapons, udb_unit_models, udb_leader_targets, udb_units, udb_stratagems, udb_enhancements, udb_detachment_abilities, udb_detachments, udb_factions, udb_meta`

**Tables that hold user overrides/favorites/notes (NOT touched by re-import):**
- `unit_overrides` (migration 017) — per-unit overrides (points, stats, keywords) keyed on `units.id` (INTEGER, not udb ID)
- `rules_favorites` (migration 019) — keyed on `rule_id TEXT` (a Wahapedia ID string) + `rule_type`
- `rules_notes` (migration 019) — same keying as `rules_favorites`
- `units.udb_unit_id` (migration 039) — nullable FK to `udb_units(id) ON DELETE SET NULL` — survives re-import because udb_units are re-inserted with the same Wahapedia IDs

**Critical insight:** `rules_favorites.rule_id` values reference Wahapedia IDs (e.g., stratagem IDs, ability IDs). Re-import deletes and re-inserts `udb_detachments`, `udb_stratagems`, `udb_detachment_abilities` — but `rules_favorites` itself is not deleted. The `rule_id` link works because Wahapedia IDs are stable. After re-import, `rules_favorites` rows pointing to stratagem/ability IDs remain valid as long as those IDs are re-imported.

### D-07: Re-Import Preservation Test

**What it must assert:**
1. Seed `rules_favorites` and `rules_notes` rows pointing to a synthetic stratagem/ability Wahapedia ID
2. Seed `unit_overrides` rows pointing to a `units.id`
3. Simulate the re-import: DELETE all udb_* tables, re-INSERT udb_* rows (with same Wahapedia IDs)
4. Assert `rules_favorites`, `rules_notes`, and `unit_overrides` rows are all still present
5. Assert `units.udb_unit_id` still resolves after re-import (ON DELETE SET NULL means it's NULL if the udb_unit was deleted and not re-inserted — but since we re-insert with same IDs, it should remain non-null)

**Suggested test file:** `tests/data-layer/reimport-preservation.test.ts`

---

## Architecture Patterns

### System Data Flow

```
Wahapedia CSVs (scripts/data/*.csv)
        ↓
scripts/build-unit-db.ts
  Step 1-10: Parse CSVs → in-memory row arrays
  Step 10.5: Merge translations_fr.json overlay
  [NEW D-01a gate]: JSON referential checks → process.exit(1) on violation
  Step 11+: Assemble UnitDatabaseJson
        ↓
src-tauri/data/unit_database.json (generated artifact — NEVER hand-edit)
        ↓
lib.rs import_unit_database_inner (on app launch / Tauri command)
  DELETE all udb_* tables (FK OFF)
  INSERT factions → units → children → leader_targets (FK OFF during insert)
        ↓
hobbyforge.db udb_* tables
        ↓
src/db/queries/unitDatabase.ts (COALESCE(col_fr, col) read layer)

[New D-01b gate]:
tests/data-layer/fk-integrity.test.ts
  createHobbyforgeDb() → import artifact → PRAGMA foreign_key_check → 0 rows
  (runs in CI via Phase-131 test gate)

[New D-07 gate]:
tests/data-layer/reimport-preservation.test.ts
  seed user tables → simulate DELETE/re-INSERT udb_* → assert user rows survive

[DAT-02 loop]:
scripts/audit-faction.ts --all
  per faction: diff unit_database.json vs CSVs → {faction}-audit.md/.json
  systematic bugs → fix in scripts/lib/ → pnpm build:udb → re-audit

[DAT-03 content]:
scripts/data/translations_fr.json (extend per faction batch)
  pnpm build:udb → step 10.5 merges overlay → re-import
```

### Recommended Project Structure (new files only)

```
scripts/
  lib/
    validateRefs.ts          # NEW (optional): extracted JSON referential check helper

tests/data-layer/
  fk-integrity.test.ts       # NEW: PRAGMA foreign_key_check + orphan queries
  reimport-preservation.test.ts  # NEW: D-07 re-import survival test

.planning/phases/139-data-quality-at-scale/
  reports/
    {faction-id}-audit.md    # 25× audit reports (output of audit-faction.ts --all)
    {faction-id}-audit.json  # 25× JSON reports
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PRAGMA foreign_key_check | Custom FK graph traversal | `db.pragma("foreign_key_check")` in better-sqlite3 | SQLite-native, authoritative, already proven in tests |
| Faction-to-CSV diff | New comparison harness | Extend `audit-faction.ts` | Full diff logic already implemented for SM/NEC/DG |
| Batch faction iteration | N separate `pnpm audit:SM && pnpm audit:NEC ...` scripts | `--all` flag in audit-faction.ts | Single source of truth, no drift |
| unit_database.json content edits | Hand-editing the JSON | Fix scripts/lib/ + rebuild | Artifact is overwritten on every `pnpm build:udb` |
| _fr column migration | New ALTER TABLE statements | translations_fr.json overlay | Migration 041 already added all _fr columns |
| In-memory DB from scratch | Custom schema DDL in test | `createHobbyforgeDb()` from db-helpers.ts | Already applies all 50 migrations correctly |

---

## Common Pitfalls

### Pitfall 1: Hardcoded Phase 113 reports path in audit-faction.ts
**What goes wrong:** `REPORTS_DIR` at line 216 is hardcoded to `113-priority-faction-data-audit/reports`. Running the batch for Phase 139 writes into Phase 113's directory.
**How to avoid:** Parameterize the output directory — either via a CLI flag `--output-dir`, an env variable, or by updating the default path constant. The Phase 139 plan must update this before running the batch.
**Warning signs:** Reports appear under `.planning/phases/113-priority-faction-data-audit/reports/` instead of under the Phase 139 directory.

### Pitfall 2: Faction whitelist prevents running any faction other than SM/NEC/DG
**What goes wrong:** Line 204 of audit-faction.ts has `!["SM", "NEC", "DG"].includes(factionId)` — running `audit-faction.ts AC` exits with a usage error.
**How to avoid:** Remove or replace this guard with a check against the actual faction IDs in `unit_database.json`. The `FACTION_NAMES` map at lines 192–196 must also be expanded.
**Warning signs:** `process.exit(1)` with "Usage: …" when invoking any non-SM/NEC/DG faction.

### Pitfall 3: The D-01b test imports the artifact but udb_factions has no REFERENCES guard on unit_database.json factions
**What goes wrong:** The in-memory DB import in the test must insert rows in dependency order (factions before units, units before children). If the test inserts children before parents with FK OFF, then turns FK ON, the PRAGMA check won't fire correctly.
**How to avoid:** Mirror the lib.rs approach: insert factions → units → children with FK OFF, then turn FK ON, then run `PRAGMA foreign_key_check`. The test seed for the D-07 preservation test inserts in the same order.

### Pitfall 4: translations_fr.json ability keying uses name not ID
**What goes wrong:** Ability keys are `"${a.unit_id}:${a.name}"` — if an ability name changes across a Wahapedia update, the overlay key becomes orphaned (the FR text is never applied).
**How to avoid:** This is a known limitation of the existing overlay mechanism. The plan should document it per CONTEXT.md D-05 ("stable Wahapedia-ID keying"). Weapon keys have the same issue. For DAT-03, accept the name-based key since it's the established mechanism; flag it as a known limitation in the per-faction reports.

### Pitfall 5: re-import preservation test assumes rules_favorites.rule_id is a Wahapedia ID
**What goes wrong:** The test seeds `rules_favorites` with a synthetic `rule_id`. If the actual app populates `rule_id` differently (e.g., with a composite key or hash), the test's survival assertion doesn't prove the real case.
**How to avoid:** Read `rules_favorites.rule_id` schema (migration 019) and verify: it is a TEXT NOT NULL referencing Wahapedia IDs (stratagem IDs, ability IDs, detachment ability IDs). The test must use a rule_id format that matches what the re-import would re-create.

### Pitfall 6: Systematic bugs may ALREADY be fixed — running the audit against a pre-fix artifact wastes effort
**What goes wrong:** If weapon.range and weapon.keywords bugs were fixed after Phase 113, the audit will show clean systematic results — but if the artifact is stale (built before the fix), the audit still shows zero-fill errors.
**How to avoid:** Always run `pnpm build:udb` before `pnpm audit:all` to ensure the audit runs against the freshest artifact.

### Pitfall 7: PITFALLS §15 — re-import must not clobber udb_unit_id backlinks [VERIFIED: PITFALLS.md]
**What goes wrong:** `units.udb_unit_id` is a nullable FK to `udb_units(id) ON DELETE SET NULL`. After re-import, if a udb_unit is re-inserted with the same Wahapedia ID, the FK reference survives. If a unit is renamed/removed and its ID changes, the collection unit's `udb_unit_id` becomes NULL.
**How to avoid:** Keep Wahapedia IDs stable (don't change them during audit corrections). Fixes should be to pipeline parsing, not to unit IDs.

---

## Migration Analysis (D-02)

**Expected: no new migration needed.** [VERIFIED: codebase]
- All `_fr` columns exist (migration 041)
- `udb_leader_targets` exists (migration 050)
- The FK/orphan gate is a build-time check + test, not a schema change
- The French overlay extends a JSON file, not the schema

**When a migration would be triggered (unlikely):** Only if orphan cleanup requires a DDL-guarded backfill. The validation gate is designed to fail-fast before writing the artifact, so no orphan data should reach the DB. If somehow the current live DB has orphan rows, a `DELETE FROM udb_leader_targets WHERE leader_unit_id NOT IN (SELECT id FROM udb_units)` cleanup migration could be needed — but this should not arise since the re-import is DELETE-all+INSERT anyway.

**If a migration is added (budget the Phase-130 parity trio):** [CITED: PITFALLS.md §Pitfall 2]
- `db-helpers.ts` derives its list from `readdirSync` — already self-updating, no manual edit
- `lib.rs` Migration{} block count must match
- `package.json` + `tauri.conf.json` version bump required
- CRLF guard: new .sql file must be LF-only (verify with `git ls-files --eol`)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (inferred from project) |
| Quick run command | `pnpm test -- tests/data-layer/fk-integrity.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DAT-01 | PRAGMA foreign_key_check returns 0 rows after artifact import | data-layer | `pnpm test -- tests/data-layer/fk-integrity.test.ts` | ❌ Wave 0 |
| DAT-01 | Orphan sub_faction check | data-layer | same file | ❌ Wave 0 |
| DAT-01 | Orphan leader pairs check | data-layer | same file | ❌ Wave 0 |
| DAT-03 | User overrides/favorites/notes survive re-import | data-layer | `pnpm test -- tests/data-layer/reimport-preservation.test.ts` | ❌ Wave 0 |
| DAT-02 | Audit report exists for each of 25 factions | manual verification | `ls .planning/phases/139.../reports/*.md \| wc -l` | N/A |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/data-layer/` (data-layer suite only, fast)
- **Per wave merge:** `pnpm test` (full suite)
- **Phase gate:** Full suite green + 25 audit reports present + `pnpm build:udb` exits 0

### Wave 0 Gaps

- [ ] `tests/data-layer/fk-integrity.test.ts` — covers DAT-01 (PRAGMA check + orphan queries)
- [ ] `tests/data-layer/reimport-preservation.test.ts` — covers DAT-03 D-07

*(Existing test infrastructure covers all other requirements — no additional setup needed.)*

---

## Security Domain

No security surface changes in this phase (pure dev-side pipeline + test additions, no app runtime, no auth, no input validation from user-facing UI). Security domain is not applicable.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| better-sqlite3 | data-layer tests | ✓ | dev dep in package.json | — |
| node --experimental-strip-types | build-unit-db.ts, audit-faction.ts | ✓ | Node.js 22+ (project standard) | — |
| Wahapedia CSVs in scripts/data/ | audit-faction.ts, build-unit-db.ts | [ASSUMED: present if download:wahapedia was run] | — | Run `pnpm download:wahapedia` |
| unit_database.json | unit-database-artifact.test.ts, fk-integrity.test.ts | ✓ | in src-tauri/data/ (committed) | Run `pnpm build:udb` |

**Missing dependencies with no fallback:** None identified.

**Missing dependencies with fallback:**
- Wahapedia CSVs: `pnpm download:wahapedia` re-fetches them (required before running audit or rebuild).

---

## Package Legitimacy Audit

No new external packages are installed in this phase. All required libraries (`better-sqlite3`, `vitest`, `node:fs`) are either already dev dependencies or Node.js built-ins.

---

## Open Questions (RESOLVED)

1. **Are the weapon.range and weapon.keywords systematic bugs already fixed?**
   - What we know: Both were identified in Phase 113 (June 2026) SM/NEC/DG audits.
   - What's unclear: Subsequent pipeline work (Phases 114–138) may have fixed them.
   - Recommendation: Run `pnpm build:udb && node --experimental-strip-types scripts/audit-faction.ts SM` and check if systematic_issues is empty before declaring them resolved.
   - **RESOLVED:** Planning assumes these were already fixed in the Phase 114 pipeline rebuild; this is **verified at execution** in Plan 139-02 Task 2, which re-runs the SM audit and inspects `systematic_issues` before sizing per-faction correction work. No plan depends on them being unfixed — if residual systematic bugs surface, they are fixed in `scripts/lib/` per D-04 (one fix corrects many units), which the batch plans (03/04) already accommodate.

2. **Is there a Wahapedia French locale data source?**
   - What we know: `download-wahapedia.ts` fetches EN CSVs. `translations_fr.json` appears hand-authored.
   - What's unclear: Whether a Wahapedia FR mirror (wahapedia.fr) has downloadable CSVs, or if a `download-wahapedia.ts --locale fr` option exists/can be added.
   - Recommendation: Check `scripts/download-wahapedia.ts` for locale support. If none, FR text authoring is manual per faction — plan tasks accordingly as data authoring work.
   - **RESOLVED:** No automated FR locale source is assumed. Per locked decision D-06 (no machine-translation runtime dependency), FR content is **curated per faction** and added to `translations_fr.json` keyed on composite Wahapedia keys. Plans 03/04 size the FR work as manual data authoring. If a `--locale fr` download option is later found to be trivial, it is an optional accelerator only — it does not change the overlay mechanism or plan structure.

3. **Exact size of the 22-faction audit effort**
   - What we know: SM had 298 matched units (298 is large — SM is the biggest faction). Other factions are likely smaller.
   - What's unclear: How many per-unit errors remain after systematic bug fixes.
   - Recommendation: Run `pnpm audit:all` (after implementing batch mode) and use the generated reports to re-estimate batch sizing before committing to plan structure.
   - **RESOLVED:** The effort is decomposed into two batch plans — 139-03 (batch 1: ~13 Xenos/Chaos factions) and 139-04 (batch 2: ~9 Imperium/remaining factions) — each auditing + translating its faction group end-to-end. Plan 139-02 produces all 25 audit reports first (via `pnpm audit:all`), so the executor re-confirms batch sizing from real report data before the correction batches run; the two-batch split is robust to that re-estimate (factions can shift between batches without changing plan count).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-maintained HOBBYFORGE_MIGRATIONS list in db-helpers.ts | `readdirSync(migrationsDir)` auto-derives list | Phase 130 | Migration parity test can never drift |
| BSData-keyed leader validation (by name) | Wahapedia-ID-keyed udb_leader_targets | Phase 138 | Canonical leader validation via FK join |
| audit-faction.ts restricted to SM/NEC/DG | Must be extended to all 25 factions | Phase 139 (this phase) | Systematic audit coverage |
| No referential integrity gate on artifact | JSON gate + data-layer PRAGMA check | Phase 139 (this phase) | Pipeline refuses to ship orphan data |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | weapon.range and weapon.keywords systematic bugs were fixed after Phase 113 | DAT-02 Audit Findings | If not fixed, all 22 factions show systematic zero-fills; pipeline fix must land before audit is meaningful |
| A2 | No Wahapedia French locale CSV is downloadable via download-wahapedia.ts | DAT-03 FR Content Source | If FR CSVs are available, FR content authoring can be partially automated rather than fully manual |
| A3 | Wahapedia CSVs are currently present in scripts/data/ | Environment Availability | Audit and rebuild will fail if not present; fix: run pnpm download:wahapedia |

---

## Sources

### Primary (HIGH confidence)
- `scripts/build-unit-db.ts` lines 604–689 — existing validation gate + step 10.5 FR overlay merge
- `scripts/audit-faction.ts` lines 1–778 — CLI shape, whitelist guard, FACTION_NAMES, output path, diff logic
- `tests/data-layer/db-helpers.ts` — createHobbyforgeDb(), readdirSync-based HOBBYFORGE_MIGRATIONS
- `tests/data-layer/leader-targets.test.ts` — established pattern for full-migration in-memory DB + FK assertions
- `tests/data-layer/unit-database-artifact.test.ts` — artifact structure assertions (does NOT import into DB)
- `tests/data-layer/migration041.test.ts` — _fr column verification pattern
- `src-tauri/migrations/038_udb_schema.sql` — complete udb_* FK graph
- `src-tauri/migrations/041_udb_sub_faction_fr.sql` — _fr column additions
- `src-tauri/migrations/050_udb_leader_targets.sql` — leader_targets schema
- `src-tauri/src/lib.rs` lines 769–885 — DELETE-all+INSERT import logic, all _fr column bindings
- `scripts/data/translations_fr.json` — overlay structure and existing content
- `scripts/lib/types.ts` — TranslationsFrOverlay interface + all udb row types
- `src-tauri/migrations/017_unit_overrides.sql` — unit_overrides table (user overrides)
- `src-tauri/migrations/019_rules_favorites_notes.sql` — rules_favorites, rules_notes tables
- `.planning/milestones/v0.4.5-phases/113-priority-faction-data-audit/reports/sm-audit.md` — systematic bug precedent
- `.planning/research/PITFALLS.md` §Pitfall 15, §Pitfall 7 — re-import safety and orphan leader pairs
- `src-tauri/data/unit_database.json` — all 25 faction IDs verified

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` §THEME D — build order and anti-patterns

---

## Metadata

**Confidence breakdown:**
- DAT-01 mechanics: HIGH — all FK relationships verified from migration files; test pattern verified from leader-targets.test.ts
- DAT-02 mechanics: HIGH — audit-faction.ts read directly; SM/NEC/DG reports read
- DAT-03 mechanics: HIGH — translations_fr.json structure verified; lib.rs bindings verified; user table isolation verified
- Migration impact: HIGH — no new migration needed (schema complete)
- FR content sourcing: LOW — [ASSUMED] hand-authored; download-wahapedia.ts not read

**Research date:** 2026-06-18
**Valid until:** 2026-07-18 (stable codebase — 30 days)
