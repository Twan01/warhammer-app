# Phase 137: Canonical Leader Attachment — Research

**Researched:** 2026-06-17
**Domain:** SQLite migration + Tauri Rust import pipeline + React Query hook rewrite
**Confidence:** HIGH (all findings grounded in direct codebase reads; no training-data speculation)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Create a new `udb_leader_targets` table — do NOT repurpose `synced_leader_targets` (empty, name-keyed, no live writer post-v0.4.7).
- **D-02:** Schema: composite PK `(leader_unit_id, target_unit_id)`, both `TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE`, plus two single-column indexes. Mirrors `udb_unit_keywords` composite-PK pattern.
- **D-03:** New migration is **`050_udb_leader_targets.sql`** — NOT 048 (stale in ARCHITECTURE.md). Migrations 048 and 049 already exist on disk. Never reuse a taken number.
- **D-04:** LF line endings on the migration file (CRLF causes checksum drift / launch breakage). Bump migration count across `lib.rs` `Migration{}`, `tests/data-layer/db-helpers.ts`, and `scripts/check-version.mjs` — in one move.
- **D-05:** Three coordinated edits: (1) `download-wahapedia.ts` — add `"Datasheets_leader.csv"` to `CSV_FILES`; (2) `build-unit-db.ts` — new parse step emitting `leader_targets` array into `UnitDatabaseJson`, added to content hash; (3) `lib.rs import_unit_database_inner` — DELETE list + INSERT loop + struct field + result count.
- **D-06:** The `leader_targets` array MUST be added to the content-hash input that produces `buildVersion`. The Rust importer skips import when `udb_meta.version` already matches — without a hash change, existing dev DBs will never populate the new table. CRITICAL.
- **D-07:** New query module `src/db/queries/leaderTargets.ts` exposing `getLeaderTargetsForList(listId)` — batch join: `army_list_units → units → udb_leader_targets` returning `(leader army_list_unit id, target army_list_unit id)` pairs. Consumed via a page-level `useMemo` Map.
- **D-08:** **Rewrite** `src/hooks/useLeaderTargets.ts` keyed off `listId` / `udb_unit_id` with `staleTime: Infinity`. Repoint `LeaderAttachmentSheet.tsx` lines 57–70 off name-match onto id-based valid-target set.
- **D-09:** NULL `udb_unit_id` fallback: when leader unit has NULL `udb_unit_id`, fall back to **permissive** (no canonical restriction, quiet advisory). Never block ghost/manual units from attaching.
- **D-10:** Remove the dead name-keyed path: delete `getLeaderTargetsByFaction` / `SyncedLeaderTargetRow` usage and `replaceSyncedLeaderTargets` (if unreferenced) once hook is repointed. Leave empty `synced_leader_targets` table in place — no drop migration this phase.

### Claude's Discretion

- Exact TypeScript type/interface names for the new `leader_targets` JSON shape (`UdbLeaderTargetRow`) and the query return row.
- Exact wording/placement of the permissive-fallback advisory in `LeaderAttachmentSheet`.
- Whether to keep a thin `getLeaderTargetIdsForLeader(udbUnitId)` helper alongside the batch query if a non-list caller needs it.
- Batch INSERT chunk size in the Rust importer (follow the existing udb loops — they insert row-by-row, no chunking).

### Deferred Ideas (OUT OF SCOPE)

- Drop `synced_leader_targets` table (own future data-cleanup phase).
- Surface "this leader can lead X / can be led by Y" in the Unit Database browser (Phase 138 or later).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAY-02 | `udb_leader_targets` table (composite PK, both FKs → `udb_units` ON DELETE CASCADE) populated from `Datasheets_leader.csv` via canonical pipeline | §Pipeline Wiring, §Migration, §Rust Importer |
| PLAY-03 | Leader attachment in the builder validates against canonical FK join; graceful fallback for NULL `udb_unit_id` | §Query Shape, §Hook Rewrite, §UI Repoint, §NULL Fallback |

</phase_requirements>

---

## Summary

Phase 137 has two tightly sequenced requirements: ship the `udb_leader_targets` table (PLAY-02), then repoint the army-list builder UI onto it (PLAY-03). All moving parts follow **already-established patterns** in this codebase — the work is additive, not novel.

**PLAY-02** is a pipeline extension. The canonical pipeline (`download-wahapedia.ts` → `build-unit-db.ts` → `lib.rs import_unit_database_inner`) already handles 13+ arrays from 10 CSVs; adding `Datasheets_leader.csv` as the 11th CSV and `leader_targets` as the 14th array requires three coordinated file edits. The single highest-risk step is the content-hash inclusion (D-06): if the new array is assembled but not hashed, the version string will not change and no existing install will ever import the data.

**PLAY-03** is a hook + query layer rewrite. The current `LeaderAttachmentSheet` queries an empty `synced_leader_targets` table via name-matching (lines 58–70). The replacement joins `army_list_units → units → udb_leader_targets` by `udb_unit_id` and delivers a pre-built valid-target set at page level. Ghost/manual units (NULL `udb_unit_id`) fall back to permissive — they keep the ability to attach without canonical validation.

The new migration 050 re-triggers the Phase-130 parity gate (`check-version.mjs` + `migration-parity.test.ts`), which is itself a success criterion proving the gate works on a real new migration.

**Primary recommendation:** Implement in wave order — (Wave 0) migration DDL + parity bump, (Wave 1) pipeline edits + JSON rebuild, (Wave 2) Rust importer extension, (Wave 3) query/hook layer rewrite + UI repoint, (Wave 4) dead-code removal.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `udb_leader_targets` table DDL | Database / SQLite | — | Schema change; must be a migration file |
| CSV download | Dev-side script | — | `download-wahapedia.ts` owns all Wahapedia CSV fetching |
| JSON build / content hash | Dev-side script | — | `build-unit-db.ts` owns the bundled JSON assembly |
| Rust import of leader pairs | Backend (Rust) | — | `import_unit_database_inner` owns all udb table population |
| Parity gate update | Build system | CI | `lib.rs` + `check-version.mjs` must agree with disk count |
| `getLeaderTargetsForList` query | DB query module | — | `src/db/queries/leaderTargets.ts` (new file) |
| `useLeaderTargets` hook | React Query layer | — | Rewrite `src/hooks/useLeaderTargets.ts` |
| Valid-target Map computation | `LeaderAttachmentSheet` parent | — | Page-level `useMemo`; never per-row hook |
| NULL `udb_unit_id` fallback | `LeaderAttachmentSheet` | — | UI layer — detect null, show advisory |

---

## Standard Stack

No new npm or Cargo dependencies. All work uses the existing stack.

| Layer | Existing Tool | Usage in this Phase |
|-------|--------------|---------------------|
| Migration | Tauri plugin-sql (SQLite) | New DDL-only `050_udb_leader_targets.sql` |
| Rust import | `sqlx` (already in Cargo.toml) | New DELETE + INSERT loop in `import_unit_database_inner` |
| Query | `src/db/client.ts` singleton | New `leaderTargets.ts` query module; `$1,$2` params |
| Hook | `@tanstack/react-query` | Rewrite `useLeaderTargets`; `staleTime: Infinity` |
| Node.js CSV parser | `readCsvFile` from `./lib/parseCsv.ts` | New parse step in `build-unit-db.ts` |
| Content hash | `node:crypto` `createHash("sha256")` | Extend the existing hash input at line 827 |

---

## Package Legitimacy Audit

Not applicable — no new packages are installed in this phase.

---

## Architecture Patterns

### System Architecture Diagram

```
Wahapedia server
       |
       | (dev-time: pnpm download:wahapedia)
       v
scripts/data/Datasheets_leader.csv   [NEW — add to CSV_FILES]
       |
       | (dev-time: pnpm build:udb)
       v
scripts/build-unit-db.ts
  Step N: parse leader.csv → leader_targets[]
  → add to content hash (CRITICAL D-06)
  → emit into UnitDatabaseJson.leader_targets
       |
       v
src-tauri/data/unit_database.json  (bundled resource)
       |
       | (app startup / import_unit_database Tauri command)
       v
src-tauri/src/lib.rs: import_unit_database_inner
  version guard (skip if udb_meta.version matches)
  DELETE udb_leader_targets (FK OFF)
  INSERT leader pairs from payload.leader_targets
  commit + WAL checkpoint
       |
       v
SQLite: udb_leader_targets (leader_unit_id, target_unit_id)
       |
       | (in-list query)
       v
src/db/queries/leaderTargets.ts: getLeaderTargetsForList(listId)
  JOIN army_list_units → units → udb_leader_targets
       |
       v
src/hooks/useLeaderTargets.ts (rewritten, staleTime: Infinity)
       |
       v
LeaderAttachmentSheet.tsx
  useMemo Map: leaderAluId → Set<targetAluId>
  NULL udb_unit_id → permissive fallback + advisory
```

### Recommended Project Structure

No new directories. New files:

```
src-tauri/migrations/
  050_udb_leader_targets.sql        [NEW — DDL only, LF endings]

src/db/queries/
  leaderTargets.ts                  [NEW — getLeaderTargetsForList]

scripts/lib/types.ts                [EDIT — add UdbLeaderTargetRow + extend UnitDatabaseJson]
scripts/download-wahapedia.ts       [EDIT — add "Datasheets_leader.csv" to CSV_FILES]
scripts/build-unit-db.ts            [EDIT — new parse step + hash extension]
src-tauri/src/lib.rs                [EDIT — struct field + DELETE list + INSERT loop + result field]
src/hooks/useLeaderTargets.ts       [REWRITE]
src/features/army-lists/LeaderAttachmentSheet.tsx  [EDIT — lines 44–70]
src/db/queries/bsdataExtended.ts    [EDIT — remove getLeaderTargetsByFaction + SyncedLeaderTargetRow]
```

---

## Key Technical Findings (verified by direct file read)

### Finding 1: CSV List and Data Dir Status

**`scripts/download-wahapedia.ts` lines 30–41:** [VERIFIED]

`CSV_FILES` currently has exactly 10 entries. `Datasheets_leader.csv` is NOT present.

```typescript
const CSV_FILES = [
  "Factions.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Datasheets_wargear.csv",
  "Datasheets_models_cost.csv",
  "Stratagems.csv",
  "Enhancements.csv",
  "Detachment_abilities.csv",    // ← currently last
  // "Datasheets_leader.csv"     ← must be added
];
```

**`scripts/data/` directory contents (confirmed by `ls`):** [VERIFIED]

`Datasheets_leader.csv` is NOT present in `scripts/data/`. The 10 existing CSVs are present. Adding it to `CSV_FILES` and running `pnpm download:wahapedia` will fetch it.

**`Datasheets_leader.csv` column names:** [ASSUMED] — CONTEXT D-05 states `leader_id|attached_id` as both being `udb_units.id` values (1,918 pairs verified live 2026-06-15). Column names must be confirmed against the CSV header at build time. The ARCHITECTURE.md §Q2 notes MEDIUM confidence on exact names — the parse step should `console.warn` on missing columns.

### Finding 2: Migration Number — CONFIRMED 050

**`ls src-tauri/migrations/ | sort` (confirmed by `ls`):** [VERIFIED]

Migrations on disk: 001 through 049 (49 files total). The last two are:
- `048_consolidate_factions.sql`
- `049_drop_promoted_to_reminder.sql`

**Next free number: 050.** The ARCHITECTURE.md "048" reference is stale — CONTEXT D-03 is correct.

**`lib.rs` Migration{} count (confirmed by `grep -c`):** [VERIFIED]

`lib.rs` has **49** `Migration {}` blocks (versions 1–49), with the last two being:
```rust
Migration { version: 48, description: "consolidate_factions", ... }
Migration { version: 49, description: "drop_promoted_to_reminder", ... }
```

After adding migration 050: disk = 50, lib.rs must = 50. The parity gate (`check-version.mjs`) will fail until both move together.

**`tests/data-layer/db-helpers.ts`:** [VERIFIED]

The migration list is now **disk-derived** (`readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()`). No manual array to update — adding `050_udb_leader_targets.sql` to disk automatically updates `HOBBYFORGE_MIGRATION_COUNT`. The only manual update needed is the `lib.rs` `Migration{}` block.

**`scripts/check-version.mjs`:** [VERIFIED]

The gate checks: (1) `package.json` version == `tauri.conf.json` version, (2) disk `.sql` file count == lib.rs `Migration {}` count, (3) no CR bytes in any `.sql` file. Adding migration 050 triggers Leg 2 failure until lib.rs is updated. No `check-version.mjs` edit is needed beyond the disk count auto-matching.

### Finding 3: Content Hash / Version-Skip Guard

**`build-unit-db.ts` line 827 (exact):** [VERIFIED]

```typescript
const hash = createHash("sha256").update(JSON.stringify({
  factions, units, models, weapons, points, abilities, keywords,
  composition, detachments, detachmentAbilities, stratagems, enhancements
})).digest("hex").slice(0, 8);
const buildVersion = `1.0.0+${hash}`;
```

`leader_targets` MUST be added to this `JSON.stringify({...})` input object. If omitted, rebuilding with `Datasheets_leader.csv` will not change the hash, and existing installs with a matching `udb_meta.version` will skip import — the table will remain empty.

**`lib.rs` lines 724–741 (version-skip guard, verified by read):** [VERIFIED]

```rust
let existing_version: Option<String> = sqlx::query_scalar(
    "SELECT version FROM udb_meta WHERE id = 1",
).fetch_optional(&mut conn).await...;

if let Some(ref ver) = existing_version {
    if ver == &payload.version {
        return Ok(UdbImportResult { factions: 0, units: 0, ... });  // SKIP
    }
}
```

This is the version-skip guard. Any new `unit_database.json` without a changed `version` field will hit this early return on every existing install.

**`output` assembly `build-unit-db.ts` lines 830–848 (verified by read):** [VERIFIED]

```typescript
const output: UnitDatabaseJson = {
  version: buildVersion,
  built_at: ...,
  ...
  enhancements,
  // leader_targets,   ← must be added here
};
```

### Finding 4: Rust Importer Structure

**`lib.rs` `UnitDatabasePayload` struct lines 642–673 (verified by read):** [VERIFIED]

```rust
#[derive(serde::Deserialize)]
pub struct UnitDatabasePayload {
    version: String,
    // ... 12 existing Vec<JsRow> fields ...
    #[serde(default)]
    enhancements: Vec<JsRow>,
    // leader_targets: Vec<JsRow>,   ← must be added
}
```

**`UdbImportResult` struct lines 675–689 (verified by read):** [VERIFIED]

```rust
#[derive(serde::Serialize, Debug)]
pub struct UdbImportResult {
    pub factions: u64, pub units: u64, pub models: u64, pub weapons: u64,
    pub abilities: u64, pub keywords: u64, pub points: u64, pub composition: u64,
    pub detachments: u64, pub detachment_abilities: u64,
    pub stratagems: u64, pub enhancements: u64,
    // pub leader_targets: u64,   ← must be added
}
```

Note: the version-skip early-return at lines 734–740 also initialises `UdbImportResult` with all zeros — it must include `leader_targets: 0`.

**DELETE list lines 758–778 (verified by read):** [VERIFIED]

```rust
for table in [
    "udb_unit_keywords",
    "udb_unit_points",
    "udb_unit_composition",
    "udb_unit_abilities",
    "udb_unit_weapons",
    "udb_unit_models",
    "udb_units",
    "udb_stratagems",
    "udb_enhancements",
    "udb_detachment_abilities",
    "udb_detachments",
    "udb_factions",
    "udb_meta",
    // "udb_leader_targets",   ← must be added (FK OFF, so order is unconstrained)
] { ... }
```

`udb_leader_targets` has FK references to `udb_units`, so it must be deleted BEFORE `udb_units` if FK were ON — but since FK is OFF during this loop, position is unconstrained. Convention: add it before `udb_units` to mirror FK dependency order.

**INSERT loop pattern (established by keywords loop, lines 888–905):** [VERIFIED]

```rust
// INSERT keywords
for row in &payload.keywords {
    let unit_id = str_val(row, "unit_id").unwrap_or_default();
    let keyword = str_val(row, "keyword").unwrap_or_default();
    if unit_id.is_empty() || keyword.is_empty() { continue; }
    let res = sqlx::query(
        "INSERT OR IGNORE INTO udb_unit_keywords (unit_id, keyword, is_faction, keyword_fr) VALUES (?, ?, ?, ?)",
    )
    .bind(&unit_id).bind(&keyword)
    .bind(is_faction).bind(str_val(row, "keyword_fr"))
    .execute(&mut *tx).await
    .map_err(|e| format!("insert keyword unit_id={unit_id} keyword={keyword}: {e}"))?;
    counts.keywords += res.rows_affected();
}
```

The new leader_targets loop follows this exact pattern: skip-on-empty, `INSERT OR IGNORE` (composite PK deduplication), bind both columns, accumulate `rows_affected()`.

**FTS5 rebuild (lines 1032–1052):** [VERIFIED]

The FTS5 `udb_search` rebuild at end of `import_unit_database_inner` does NOT need changes — it only indexes unit names/keywords, not leader pairs.

### Finding 5: Current UI Name-Match Path

**`src/features/army-lists/LeaderAttachmentSheet.tsx` (full file read):** [VERIFIED]

Lines 44–70 contain the entire name-matching block to be replaced:

```typescript
// LINE 44-50: faction_id string coercion (IRRELEVANT AFTER REWRITE — no faction needed)
const factionIdStr = unit?.faction_id != null
  ? String(unit.faction_id)
  : list?.faction_id != null ? String(list.faction_id) : null;

// LINE 52: old hook call (to be replaced)
const { data: leaderTargets = [] } = useLeaderTargets(factionIdStr);

// LINES 57-64: name-match valid targets (to be replaced)
const validTargetNames = useMemo(() => {
  if (!unit) return new Set<string>();
  const leaderName = unit.unit_name.toLowerCase();
  return leaderTargets
    .filter((lt) => lt.leader_name.toLowerCase() === leaderName)
    .map((lt) => lt.target_name);
}, [unit, leaderTargets]);

// LINES 67-70: name-filter (to be replaced)
const validTargetUnits = useMemo(() => {
  const targetNamesLower = new Set(validTargetNames.map((n) => n.toLowerCase()));
  return units.filter((u) => u.unit_name && targetNamesLower.has(u.unit_name.toLowerCase()));
}, [units, validTargetNames]);
```

Lines 72–76 (`currentTarget` memo) are UNCHANGED — they use `leader_attached_to_id` which is a different concern.

Lines 136–142 (`existingLeader` check within the `validTargetUnits.map()`) are UNCHANGED — they check `u.leader_attached_to_id === target.id`, purely ID-based, already correct.

**`src/hooks/useLeaderTargets.ts` (full file read):** [VERIFIED]

Current hook is 23 lines. Queries by `factionId` (string), `staleTime: 5 * 60 * 1000` (5 min, not Infinity). Calls `getLeaderTargetsByFaction` from `bsdataExtended.ts`.

**`src/db/queries/bsdataExtended.ts` lines 185–202 (verified by read):** [VERIFIED]

```typescript
export interface SyncedLeaderTargetRow {
  leader_name: string;
  faction_id: string | null;
  target_name: string;
}

export async function getLeaderTargetsByFaction(factionId: string): Promise<SyncedLeaderTargetRow[]> {
  const db = await getDb();
  return db.select<SyncedLeaderTargetRow[]>(
    `SELECT leader_name, faction_id, target_name
     FROM synced_leader_targets
     WHERE faction_id = $1
     ORDER BY leader_name, target_name`,
    [factionId],
  );
}
```

This entire block (interface + function) will be removed in D-10.

### Finding 6: Army-List Join Exposing `udb_unit_id`

**`src/db/queries/armyLists.ts` lines 63–107 (verified by read):** [VERIFIED]

`getArmyListWithUnits(listId)` already selects `u.udb_unit_id` per `army_list_units` row (line 72). The `ArmyListUnitRow` type therefore already carries `udb_unit_id: string | null`. The new batch query joins on this column.

**New query shape for `getLeaderTargetsForList(listId)`:**

```typescript
// src/db/queries/leaderTargets.ts
export interface CanonicalLeaderPairRow {
  leader_alu_id: number;   // army_list_units.id of the leader
  target_alu_id: number;   // army_list_units.id of the valid target
}

export async function getLeaderTargetsForList(
  listId: number,
): Promise<CanonicalLeaderPairRow[]> {
  const db = await getDb();
  return db.select<CanonicalLeaderPairRow[]>(
    `SELECT
       leader_alu.id AS leader_alu_id,
       target_alu.id AS target_alu_id
     FROM army_list_units leader_alu
     JOIN units leader_u ON leader_u.id = leader_alu.unit_id
     JOIN udb_leader_targets lt ON lt.leader_unit_id = leader_u.udb_unit_id
     JOIN units target_u ON target_u.udb_unit_id = lt.target_unit_id
     JOIN army_list_units target_alu
       ON target_alu.unit_id = target_u.id
       AND target_alu.list_id = $1
     WHERE leader_alu.list_id = $1`,
    [listId],
  );
}
```

This returns all valid `(leader_alu_id, target_alu_id)` pairs for units in the list that have canonical pairing data. Units with `NULL udb_unit_id` are excluded from the join result (they match no `lt.leader_unit_id`) — the sheet handles that as the permissive fallback.

### Finding 7: NULL `udb_unit_id` Fallback Path

**Where NULL units come from (confirmed by CONTEXT D-09 + `armyLists.ts` line 72):**

`army_list_units.unit_id` links to `units` via LEFT JOIN. `units.udb_unit_id` is `ON DELETE SET NULL` (migration 039). Ghost units have `unit_id = NULL` in `army_list_units` (they use `ghost_unit_name`). Regular units may have `udb_unit_id = NULL` if manually added or if the canonical unit was deleted during a re-import.

**In `getArmyListWithUnits`, the result row already has:** `u.udb_unit_id` (nullable). The new query silently excludes NULL-`udb_unit_id` units — they produce no rows in `CanonicalLeaderPairRow[]`.

**In `LeaderAttachmentSheet` (rewritten):**

```typescript
// After rewrite: check if leader has a udb_unit_id to look up
const leaderHasCanonicalData = unit?.udb_unit_id != null;
const validTargetIds = useMemo(() => {
  if (!unit || !leaderHasCanonicalData) return null;  // null = permissive
  return new Set(
    leaderTargetPairs
      .filter(p => p.leader_alu_id === unit.id)
      .map(p => p.target_alu_id)
  );
}, [unit, leaderHasCanonicalData, leaderTargetPairs]);

// validTargetUnits:
const validTargetUnits = useMemo(() => {
  if (validTargetIds === null) return units; // permissive: all units are valid targets
  return units.filter(u => validTargetIds.has(u.id));
}, [units, validTargetIds]);
```

When `validTargetIds === null` (permissive), `validTargetUnits` is the full `units` list — no restriction. The advisory string is shown when `leaderHasCanonicalData === false`.

### Finding 8: How the Import Is Triggered

**`lib.rs import_unit_database` Tauri command (lines 1072–1077, verified):** [VERIFIED]

```rust
#[tauri::command]
async fn import_unit_database(app: tauri::AppHandle) -> Result<UdbImportResult, String> {
    import_unit_database_inner(&app).await
}
```

**Frontend invocation:** [ASSUMED — not read in this session, but established by prior phases]

The frontend calls `invoke("import_unit_database")` at app startup (via `useImportUnitDatabase` or equivalent in the setup flow). After rebuilding `unit_database.json` with `pnpm build:udb`, the next app launch triggers re-import because `udb_meta.version` will differ from the bundled JSON's new hash. Dev DBs will also re-import on first launch after the rebuild.

### Finding 9: Keywords Step as Template for Leader Step

**`build-unit-db.ts` Step 7 (lines 311–331, verified):** [VERIFIED]

```typescript
// 7. Parse Datasheets_keywords.csv -> udb_unit_keywords rows
const keywordsRaw = readCsvFile(DATA_DIR, "Datasheets_keywords.csv");
const keywords: UdbUnitKeywordRow[] = [];
const seenKeywords = new Set<string>();

for (const row of keywordsRaw) {
  const unitId = row["datasheet_id"]?.trim();
  if (!unitId || !validUnitIds.has(unitId)) continue;
  const keyword = row["keyword"]?.trim();
  if (!keyword) continue;
  const dupeKey = unitId + ":" + keyword;
  if (seenKeywords.has(dupeKey)) continue;
  seenKeywords.add(dupeKey);
  keywords.push({ unit_id: unitId, keyword, is_faction: isFaction, keyword_fr: null });
}
```

The leader step is analogous, but with TWO `validUnitIds` guards (both `leader_id` and `attached_id` must be in set), and deterministic sort after collection:

```typescript
// Step N: Parse Datasheets_leader.csv -> udb_leader_targets rows
const leaderRaw = readCsvFile(DATA_DIR, "Datasheets_leader.csv");
const leaderTargets: UdbLeaderTargetRow[] = [];
const seenPairs = new Set<string>();
let leaderOrphanSkipped = 0;

for (const row of leaderRaw) {
  const leaderId = row["leader_id"]?.trim();    // [ASSUMED column name]
  const attachedId = row["attached_id"]?.trim(); // [ASSUMED column name]
  if (!leaderId || !attachedId) continue;
  if (!validUnitIds.has(leaderId)) { leaderOrphanSkipped++; continue; }
  if (!validUnitIds.has(attachedId)) { leaderOrphanSkipped++; continue; }
  const pairKey = leaderId + "|" + attachedId;
  if (seenPairs.has(pairKey)) continue;
  seenPairs.add(pairKey);
  leaderTargets.push({ leader_unit_id: leaderId, target_unit_id: attachedId });
}
if (leaderOrphanSkipped > 0)
  console.warn(`  WARNING: Skipped ${leaderOrphanSkipped} leader pairs with unknown unit IDs`);
leaderTargets.sort((a, b) => {
  const c = a.leader_unit_id.localeCompare(b.leader_unit_id);
  return c !== 0 ? c : a.target_unit_id.localeCompare(b.target_unit_id);
});
console.log(`  Parsed ${leaderTargets.length} leader attachment pairs`);
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Content hash version bump | Manual version string | Extend existing `createHash("sha256")` at line 827 | Same pattern used for all 13 existing arrays |
| Leader data seeding | INSERT in migration | Rust import from bundled JSON | Boot-loop incident (documented in migration 038 comment) |
| Per-leader valid-target query | Hook inside `validTargetUnits.map()` | Batch `getLeaderTargetsForList(listId)` + `useMemo` Map | N+1 hooks-in-loop (Rules of Hooks violation) |
| Name normalization for matching | Custom string fuzzy-match | Join by `udb_unit_id` (ID is stable) | Name matching is the fragility being removed |
| Custom dedup logic | Hand-rolled Set with complex keys | `seenPairs = new Set<string>()` with `"id1|id2"` key | Established pattern (seenKeywords, seenDetachmentIds) |

---

## Common Pitfalls

### Pitfall 1: Version-skip kills population on all existing installs (CRITICAL — D-06)
**What goes wrong:** `leader_targets` array is added to `UnitDatabaseJson` but NOT to the `JSON.stringify({...})` hash input on line 827. The content hash does not change. `udb_meta.version` in existing DBs matches the new bundled JSON's version. Import is skipped. The new table is always empty.
**How to avoid:** Add `leaderTargets` to the `JSON.stringify` call object at line 827, BEFORE writing the output. Verify by checking that two builds with different `Datasheets_leader.csv` produce different `version` strings.
**Warning signs:** `udb_leader_targets` table exists (migration ran) but `SELECT COUNT(*) FROM udb_leader_targets` returns 0 after app restart with a new bundle.

### Pitfall 2: CRLF on migration 050 (HIGH RISK — reoccurrence of prior incident)
**What goes wrong:** `050_udb_leader_targets.sql` is created on Windows with CRLF line endings. `check-version.mjs` Leg 3 fails (CR byte detected). Worse: if it slips through, sqlx computes a CRLF checksum; any later LF-normalisation causes `VersionMismatch` panic on launch.
**How to avoid:** Author the file with LF endings. After creation, run `pnpm check:version` locally — Leg 3 will catch any CR bytes. Confirm `git ls-files --eol src-tauri/migrations/050_udb_leader_targets.sql` shows `w/lf`.
**Warning signs:** `pnpm check:version` fails with `[cr-byte] FAIL`; or the migration applies once but fails on second app launch with a checksum error.

### Pitfall 3: lib.rs Migration{} not updated alongside new .sql file
**What goes wrong:** `050_udb_leader_targets.sql` exists on disk (50 files) but lib.rs still has 49 `Migration {}` blocks. `check-version.mjs` Leg 2 fails: `50 .sql files !== 49 Migration{} entries`. The build gate blocks pnpm build until resolved.
**How to avoid:** Add the `Migration { version: 50, description: "udb_leader_targets", sql: include_str!("../migrations/050_udb_leader_targets.sql"), kind: MigrationKind::Up }` block immediately after version 49 in `get_migrations()`. Do this in the same commit as the `.sql` file.
**Warning signs:** `pnpm check:version` fails with `[migration-count] MISMATCH`.

### Pitfall 4: `UdbImportResult` zero-return not updated (version-skip path)
**What goes wrong:** `leader_targets` field is added to `UdbImportResult` struct and to the normal return value, but the early-return at lines 734–740 (version-skip path) still initialises without `leader_targets`. Rust compile error: `missing field 'leader_targets' in initializer of 'UdbImportResult'`.
**How to avoid:** Update BOTH the early-return initializer (line 734) AND the `counts` initializer (line 751–756) when adding the field to the struct.

### Pitfall 5: Ghost units blocked from attaching (regression from D-09)
**What goes wrong:** The `validTargetIds === null` permissive path is omitted. Ghost/manual units (NULL `udb_unit_id`) get `validTargetUnits = []` because no canonical pairs exist for them. The user loses the ability to attach leaders to manually-added units — regression vs the current (broken) name-match which at least returns "no valid targets" rather than blocking attachment.
**How to avoid:** Explicitly check `unit.udb_unit_id == null` and set `validTargetIds = null` (permissive sentinel) rather than an empty set. An empty set means "canonically no valid targets"; null means "no canonical data — show all".

### Pitfall 6: `leaderTargetPairs` consumed at wrong level (hooks-in-loop)
**What goes wrong:** `getLeaderTargetsForList` is called inside `SortableUnitRow` or any other per-row component. Each row triggers an independent DB query. With 20 units in a list, that's 20 queries. React may also flag a hooks-in-loop violation if called conditionally.
**How to avoid:** Call `useLeaderTargets(list.id)` once at the `ArmyListDetailPage` or `ArmyListUnitTable` level. Pass `leaderTargetPairs` down as a prop. Build the `useMemo Map<leaderId, Set<targetId>>` at the level where the prop lands, not per-row.

---

## Code Examples

### Migration 050 DDL template
```sql
-- Migration 050: canonical leader-attachment targets (udb id-keyed).
-- DDL only — no seed (data arrives via the Rust udb import, like all udb_* tables).
-- Per D-01/D-02: composite PK mirrors udb_unit_keywords; both sides FK → udb_units ON DELETE CASCADE.
CREATE TABLE IF NOT EXISTS udb_leader_targets (
  leader_unit_id  TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  target_unit_id  TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  PRIMARY KEY (leader_unit_id, target_unit_id)
);

CREATE INDEX IF NOT EXISTS idx_udb_leader_targets_leader
  ON udb_leader_targets(leader_unit_id);

CREATE INDEX IF NOT EXISTS idx_udb_leader_targets_target
  ON udb_leader_targets(target_unit_id);
```
[VERIFIED pattern: mirrors `038_udb_schema.sql` lines 68–73 `udb_unit_keywords` composite PK and `042_udb_detachments.sql` index style]

### TypeScript type additions (scripts/lib/types.ts)
```typescript
// Add before UnitDatabaseJson:
export interface UdbLeaderTargetRow {
  leader_unit_id: string;
  target_unit_id: string;
}

// Extend UnitDatabaseJson (after enhancements):
export interface UnitDatabaseJson {
  // ... existing fields ...
  enhancements: UdbEnhancementRow[];
  leader_targets: UdbLeaderTargetRow[];  // ← add
}
```

### Hash extension (build-unit-db.ts line 827)
```typescript
// BEFORE:
const hash = createHash("sha256").update(JSON.stringify({
  factions, units, models, weapons, points, abilities, keywords,
  composition, detachments, detachmentAbilities, stratagems, enhancements
})).digest("hex").slice(0, 8);

// AFTER (add leaderTargets to the object):
const hash = createHash("sha256").update(JSON.stringify({
  factions, units, models, weapons, points, abilities, keywords,
  composition, detachments, detachmentAbilities, stratagems, enhancements,
  leaderTargets    // ← CRITICAL D-06
})).digest("hex").slice(0, 8);
```

### Rust UnitDatabasePayload field addition
```rust
#[derive(serde::Deserialize)]
pub struct UnitDatabasePayload {
    // ... existing fields ...
    #[serde(default)]
    enhancements: Vec<JsRow>,
    #[serde(default)]
    leader_targets: Vec<JsRow>,   // ← add
}
```

### Rust UdbImportResult field addition (BOTH initializers)
```rust
// Struct definition:
pub struct UdbImportResult {
    // ... existing fields ...
    pub enhancements: u64,
    pub leader_targets: u64,   // ← add
}

// Early-return (version-skip) initializer at line ~734:
return Ok(UdbImportResult {
    factions: 0, units: 0, models: 0, weapons: 0,
    abilities: 0, keywords: 0, points: 0, composition: 0,
    detachments: 0, detachment_abilities: 0,
    stratagems: 0, enhancements: 0,
    leader_targets: 0,   // ← add
});

// counts initializer at line ~751:
let mut counts = UdbImportResult {
    factions: 0, units: 0, models: 0, weapons: 0,
    abilities: 0, keywords: 0, points: 0, composition: 0,
    detachments: 0, detachment_abilities: 0,
    stratagems: 0, enhancements: 0,
    leader_targets: 0,   // ← add
};
```

### Rust INSERT loop for leader_targets (after enhancements loop)
```rust
// INSERT leader_targets
for row in &payload.leader_targets {
    let leader_unit_id = str_val(row, "leader_unit_id").unwrap_or_default();
    let target_unit_id = str_val(row, "target_unit_id").unwrap_or_default();
    if leader_unit_id.is_empty() || target_unit_id.is_empty() { continue; }
    let res = sqlx::query(
        "INSERT OR IGNORE INTO udb_leader_targets (leader_unit_id, target_unit_id) VALUES (?, ?)",
    )
    .bind(&leader_unit_id)
    .bind(&target_unit_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("insert leader_target {leader_unit_id}→{target_unit_id}: {e}"))?;
    counts.leader_targets += res.rows_affected();
}
```

### New `useLeaderTargets` hook (rewritten)
```typescript
// src/hooks/useLeaderTargets.ts
import { useQuery } from "@tanstack/react-query";
import { getLeaderTargetsForList, type CanonicalLeaderPairRow } from "@/db/queries/leaderTargets";

export const LEADER_TARGETS_KEY = (listId: number) =>
  ["leader-targets", listId] as const;

export function useLeaderTargets(listId: number | null) {
  return useQuery<CanonicalLeaderPairRow[]>({
    queryKey: listId != null ? LEADER_TARGETS_KEY(listId) : ["leader-targets"],
    queryFn: () => getLeaderTargetsForList(listId!),
    enabled: listId != null,
    staleTime: Infinity,   // canonical data — immutable between imports
  });
}
```

### LeaderAttachmentSheet repoint (lines 44–70 replacement)
```typescript
// Replace lines 44–70 with:

// Batch pair data for entire list (replaces faction-based name-match)
const { data: leaderTargetPairs = [] } = useLeaderTargets(list?.id ?? null);

// Determine if this leader has canonical data
const leaderHasCanonicalData = unit?.udb_unit_id != null;

// Build valid-target Set for this leader (null = permissive)
const validTargetIds = useMemo(() => {
  if (!unit || !leaderHasCanonicalData) return null;
  return new Set(
    leaderTargetPairs
      .filter((p) => p.leader_alu_id === unit.id)
      .map((p) => p.target_alu_id),
  );
}, [unit, leaderHasCanonicalData, leaderTargetPairs]);

// Filter list units: null validTargetIds = permissive (all units pass)
const validTargetUnits = useMemo(() => {
  if (validTargetIds === null) return units;
  return units.filter((u) => validTargetIds.has(u.id));
}, [units, validTargetIds]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| BSData sync populates `synced_leader_targets` by name | Wahapedia CSV gives id pairs → `udb_leader_targets` | Phase 137 | Stable IDs, no name normalization, no empty table |
| `useLeaderTargets(factionId)` with 5 min staleTime | `useLeaderTargets(listId)` with `staleTime: Infinity` | Phase 137 | Correct: canonical data never changes between imports |
| Empty `synced_leader_targets` → 0 valid targets always | Canonical pairs → real validation, permissive fallback for NULL | Phase 137 | Removes the "silent no-op" that made leader attachment useless |

**Deprecated after this phase:**
- `getLeaderTargetsByFaction` + `SyncedLeaderTargetRow` in `bsdataExtended.ts` — dead code once hook is repointed (D-10)
- `useLeaderTargets(factionId: string)` — replaced by `useLeaderTargets(listId: number)`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Datasheets_leader.csv` columns are `leader_id` and `attached_id` | Finding 1, leader step code example | Parse step silently produces 0 pairs; must add `console.warn` for missing columns |
| A2 | Frontend calls `invoke("import_unit_database")` at app startup triggering re-import after version bump | Finding 8 | Dev DBs may need manual trigger; not a ship blocker |
| A3 | `ArmyListDetailPage` or `ArmyListUnitTable` is where `useLeaderTargets` should be called (the level above `LeaderAttachmentSheet`) | Finding 7 | If sheet is a pure portal with no `list.id` access, need to thread `list.id` prop from parent |

---

## Open Questions (RESOLVED)

1. **Exact `Datasheets_leader.csv` column names** — **RESOLVED:** handled operationally at build time. The `build-unit-db.ts` parse step (Plan 02 Task 1) reads `leader_id`/`attached_id` and `console.warn`s the first row's actual header keys + skip count if zero pairs match (column-presence check, never silently emits 0); the live header is confirmed in Plan 02 Task 3 (the build/parse task) before the JSON is committed, with an explicit instruction to correct the column reads if the live header differs.
   - What we know: CONTEXT D-05 and ARCHITECTURE §Q2 say `leader_id|attached_id`; 1,918 pairs verified live 2026-06-15
   - What's unclear: Exact header strings — Wahapedia CSV headers are not always obvious
   - Recommendation: The build step should `console.error` and skip (not crash) if a row lacks the expected column, and log the first unexpected header it sees. Verify against live CSV at `pnpm build:udb` time.

2. **`list.id` prop threading into `LeaderAttachmentSheet`** — **RESOLVED:** `LeaderAttachmentSheet` already receives `list: ArmyList | null` at line 25, so `list.id` is available when the sheet is open. Plan 03 Task 2 consumes it directly as `useLeaderTargets(list?.id ?? null)` (permissive null guard when the list is absent), so no additional prop threading is required.
   - What we know: `LeaderAttachmentSheet` already receives `list: ArmyList | null` as a prop (line 25); `ArmyList` type carries `.id`
   - What's unclear: Whether `list` is non-null when the sheet is open (it should be — the sheet is only opened from within a list context)
   - Recommendation: Add a guard `if (!list)` that returns early; treat as same pattern as the existing `!factionIdStr` guard.

---

## Environment Availability

All dependencies are already present. No new tools required.

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| `pnpm download:wahapedia` | Fetch new CSV | Yes (already works for 10 CSVs) | Just add filename to list |
| `pnpm build:udb` | Rebuild JSON | Yes | `node --experimental-strip-types` available |
| SQLite (via Tauri plugin-sql) | Migration + query | Yes | Already in production |
| `sqlx` (Cargo) | Rust INSERT loop | Yes | Already in Cargo.toml |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 + better-sqlite3 (data-layer) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/data-layer/migration-parity.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAY-02 | Migration 050 applies cleanly in migration chain | Integration | `pnpm test -- tests/data-layer/migration-parity.test.ts` | Yes — auto-covers via `createHobbyforgeDb()` |
| PLAY-02 | `udb_leader_targets` table exists with correct schema | Integration | `pnpm test -- tests/data-layer/` | Covered when migration chain runs |
| PLAY-02 | Parity gate passes with 50 migrations | Integration | `pnpm check:version` | Yes (check-version.mjs) |
| PLAY-03 | `getLeaderTargetsForList` returns correct pairs | Unit | New test file needed | No — Wave 0 gap |
| PLAY-03 | NULL `udb_unit_id` → permissive (no restriction) | Unit | New test file or component test | No — Wave 0 gap |
| PLAY-03 | `LeaderAttachmentSheet` renders valid targets from canonical data | Component | New component test | No — Wave 0 gap |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/data-layer/migration-parity.test.ts && pnpm check:version`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/data-layer/leader-targets.test.ts` — covers PLAY-02 table schema + PLAY-03 query shape
- [ ] `tests/features/army-lists/LeaderAttachmentSheet.test.tsx` — covers PLAY-03 UI (canonical path + NULL fallback)

---

## Security Domain

`security_enforcement` not set in config — treat as enabled. No authentication, no network endpoints, no user-supplied input to SQL in new code.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Yes (CSV parse) | Skip rows with empty/missing ids; `validUnitIds` guard |
| V6 Cryptography | No | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via CSV data | Tampering | Parameterized `?` bindings in sqlx; no string interpolation |
| Malformed CSV with injected SQL in id column | Tampering | `$1,$2` positional params in tauri-plugin-sql; id treated as data not code |
| Oversized CSV causing OOM | DoS | `validUnitIds` guard naturally bounds the leader_targets array to known units |

---

## Sources

### Primary (HIGH confidence — direct file reads in this session)
- `scripts/download-wahapedia.ts` (lines 30–41) — CSV_FILES list; `Datasheets_leader.csv` absent
- `scripts/build-unit-db.ts` (lines 311–331, 820–848) — keywords step template; hash input; output assembly
- `scripts/lib/types.ts` (lines 159–177) — `UnitDatabaseJson` type to extend
- `scripts/check-version.mjs` — 3-leg gate: version, migration count, CR-byte scan
- `src-tauri/src/lib.rs` (lines 642–1070) — `UnitDatabasePayload`, `UdbImportResult`, `import_unit_database_inner`; version-skip guard at 724–741; DELETE list 758–778; INSERT loops; FTS rebuild
- `src-tauri/migrations/038_udb_schema.sql` (lines 68–73) — `udb_unit_keywords` composite-PK template
- `src-tauri/migrations/042_udb_detachments.sql` — child-table FK + index pattern
- `src/features/army-lists/LeaderAttachmentSheet.tsx` (full file) — lines 44–70 name-match to replace
- `src/hooks/useLeaderTargets.ts` (full file) — hook to rewrite
- `src/db/queries/bsdataExtended.ts` (lines 185–202) — `getLeaderTargetsByFaction` + `SyncedLeaderTargetRow` to remove
- `src/db/queries/armyLists.ts` (lines 63–107) — `getArmyListWithUnits` already exposes `u.udb_unit_id`
- `tests/data-layer/db-helpers.ts` (full file) — migration list now disk-derived (no manual array)
- `ls src-tauri/migrations/` — confirmed 49 files; last is 049
- `grep -c "Migration {"` — confirmed 49 blocks in lib.rs
- `ls scripts/data/` — confirmed `Datasheets_leader.csv` absent

### Secondary (MEDIUM confidence — CONTEXT.md decisions grounded in prior research)
- `.planning/research/ARCHITECTURE.md` §Q2, §Q3 — full design; migration "048" is stale (correct: 050)
- `.planning/research/PITFALLS.md` — Pitfalls #1 (CRLF), #3 (parity), #7 (id vs name), #8 (hooks-in-loop)
- `.planning/phases/137-canonical-leader-attachment/137-CONTEXT.md` — D-01..D-10 (locked decisions)

---

## Metadata

**Confidence breakdown:**
- Migration DDL: HIGH — exact template from 038/042
- Pipeline wiring: HIGH — all three files read and insertion points identified
- Rust importer: HIGH — all structs and loops read directly
- Query shape: HIGH — `getArmyListWithUnits` join verified; SQL shape derived from it
- Hook rewrite: HIGH — both old and new shapes fully mapped
- UI repoint: HIGH — entire LeaderAttachmentSheet.tsx read; exact lines identified
- `Datasheets_leader.csv` column names: MEDIUM (ASSUMED from CONTEXT D-05; verify at build time)

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (stable patterns; only invalidated by changes to lib.rs importer shape or build-unit-db.ts assembly)
