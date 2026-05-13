# Phase 65: Points Import Pipeline - Research

**Researched:** 2026-05-13
**Domain:** Wahapedia sync pipeline extension, SQLite cross-database JOIN, React Query invalidation, sync diff computation
**Confidence:** HIGH (codebase) / LOW (Wahapedia points CSV existence — critical open question)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Points Data Source & Storage (PI-01, PI-02)**
- D-01: Points data flows through the existing Wahapedia sync pipeline — extend `RULES_SYNC_FILES` to include the points CSV from Wahapedia (researcher must verify which CSV contains points data and the exact column names). NOT a separate user-initiated CSV import flow.
- D-02: Synced points data goes in **rules.db** (consistent with roadmap SC#1).
- D-03: Import history / delta audit data (`points_import_history`) goes in **hobbyforge.db** — survives rules.db re-syncs. Schema follows design doc with `imported_at`, `source_file`, `version`, `row_count`, `delta_added`, `delta_removed`, `delta_changed`.
- D-04: The design doc's `points_imports` table in hobbyforge.db is NOT needed — extend existing rules.db datasheets table or create a dedicated `datasheet_points` table in rules.db (researcher decides based on Wahapedia CSV structure).
- D-05: `faction_id` matching uses Wahapedia text keys (e.g. `"SM"`), consistent with `unit_overrides` and existing rules.db patterns.

**5-Level COALESCE Chain (PI-05)**
- D-06: Precedence: `COALESCE(alu.points_override, synced_points, uo.points, u.points, 0)` where `synced_points` comes from rules.db via LEFT JOIN.
- D-07: Synced points > uo.points (imported official data is more authoritative than manual unit-level override).
- D-08: All 3 COALESCE sites in `src/db/queries/armyLists.ts` updated atomically: `getArmyListWithUnits` (line 49), `getArmyListReadiness` (lines 197, 199).
- D-09: Dashboard stats queries in `src/db/queries/dashboard.ts` (lines 93-95) are NOT updated — different concern (collection-level, not army-list-level).
- D-10: LEFT JOIN condition: `ON unit_name = u.name AND (faction_id IS NULL OR faction_id = u.faction_id)` — NULL faction_id means globally scoped.

**Freshness Badges (PI-03)**
- D-11: Reuse existing `src/lib/syncFreshness.ts` tiers (fresh/aging/stale/never) — points freshness equals sync freshness (same pipeline).
- D-12: Add freshness badges to: (a) army list cards/detail, (b) rules hub SyncStatusCard with "includes points" indication.
- D-13: "unknown" (neutral) for lists with no synced points; 7/14-day tiers from syncFreshness.ts supersede the design doc's 30-day threshold.

**Delta Detection (PI-04)**
- D-14: Extends existing snapshot/diff pattern (`rulesSnapshot.ts` + `computeSyncDiff.ts`). Snapshot current points before sync, compare after.
- D-15: Delta summary in RulesHubPage sync diff — add "Points Changes" section alongside existing rules diff.
- D-16: Army list impact: after sync, compute which lists contain units with changed points.
- D-17: Delta counts written to `points_import_history` in hobbyforge.db after each sync.

**Sync Pipeline Extension**
- D-18: Extend Rust `bulk_sync_rules` command in `src-tauri/src/lib.rs` — points table follows same DELETE + bulk INSERT pattern.
- D-19: `RustSyncResult` interface gains a `points: number` field.
- D-20: Cache invalidation after sync MUST also invalidate `ARMY_LISTS_KEY` and `["army-list-readiness"]` prefix keys.

### Claude's Discretion
- Whether to add points as columns on the existing `datasheets` table in rules.db or create a separate `datasheet_points` table (depends on Wahapedia CSV structure — researcher decides).
- Exact visual treatment of freshness badge on army list cards.
- Whether delta display shows full unit-by-unit diff or summary counts with expandable details.
- Loading/skeleton state for freshness badges while sync data is loading.
- Whether to show a pre-sync confirmation dialog with estimated changes.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PI-01 | rules.db schema extended with points data columns/table populated via Wahapedia sync; user overrides remain in hobbyforge.db | Requires `datasheet_points` table in rules.db via rules migration; Wahapedia CSV source is an open question (see Open Questions) |
| PI-02 | Wahapedia sync pipeline imports official points data alongside existing rules data, with sync metadata tracked | Rust `bulk_sync_rules` extension pattern is clear; the CSV source URL and column names must be confirmed first |
| PI-03 | Points freshness visible on army lists and rules hub via stale/fresh/unknown badges showing source version and sync date | `syncFreshness.ts` is fully reusable; `SyncStatusCard` and `ArmyListDetailSheet` are the integration points |
| PI-04 | After sync, user sees per-unit points deltas (increased/decreased/new/removed) and which army lists are affected | Extends `computeSyncDiff.ts` and `rulesSnapshot.ts`; delta counts land in `points_import_history` in hobbyforge.db |
| PI-05 | All 3 COALESCE query sites updated atomically to 5-level chain | Three exact sites identified in `armyLists.ts` lines 49, 197, 199; LEFT JOIN pattern from design doc |
</phase_requirements>

---

## Summary

Phase 65 extends the Wahapedia sync pipeline to import official points data, surfaces it through a 5-level COALESCE chain in army list queries, adds freshness badges, and computes per-unit point deltas after each sync. The codebase is mature and well-structured — every pattern this phase needs already exists and can be extended.

The critical risk is **PI-01/PI-02**: Wahapedia's 10th edition data export does not appear to include a dedicated unit points CSV file at the standard export location. Tested URLs (Datasheets_points.csv, Points.csv, Points_cost.csv, Datasheets_costs.csv, Cost.csv) all return HTTP 404. The current `Datasheets.csv` (10th ed) has no cost/points column. This is a blocking open question that must be resolved before implementation begins — the planner must verify the exact CSV file name and column structure before planning PI-01 and PI-02.

All other requirements (PI-03, PI-04, PI-05) are fully researchable from the existing codebase and have clear integration paths. PI-05 is the simplest: three exact SQL sites are already identified.

**Primary recommendation:** Resolve the Wahapedia points CSV source before planning the sync pipeline tasks. Once confirmed, the full implementation follows established patterns with zero new npm dependencies.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Points schema (rules.db `datasheet_points` table) | Database/Storage | — | Rules data in rules.db, cleared on every sync like other rw_ tables |
| Points audit history (`points_import_history`) | Database/Storage (hobbyforge.db) | — | User-generated audit data must survive rules.db re-syncs |
| Sync pipeline extension (CSV fetch + Rust INSERT) | API/Backend (Rust) | React hook (orchestration) | Rust owns the single-transaction bulk insert; hook fetches and passes CSV data |
| COALESCE chain in army list queries | Database/Storage | — | All effective_points computations stay in SQL, never in JS |
| Cache invalidation (army lists after sync) | React Query hook | — | `onSuccess` in `useRulesSync` already owns all invalidation |
| Delta detection (points before/after snapshot) | Frontend (pure TS lib) | hobbyforge.db | `computeSyncDiff` pattern extended; counts written to audit table |
| Freshness badges (army list, rules hub) | Browser/Client (React) | — | Read syncMeta.last_sync_at, apply syncFreshness.ts tiers |

---

## Standard Stack

### Core (all already in project — zero new dependencies)

| Library | Purpose | Existing Location |
|---------|---------|-------------------|
| Tauri plugin-sql | Cross-database queries, migrations | `src/db/client.ts`, `src/db/rules-client.ts` |
| sqlx (Rust) | Bulk sync transaction in rules.db | `src-tauri/src/lib.rs` |
| React Query | Cache invalidation, query keys | `src/hooks/useArmyLists.ts`, `src/hooks/useRulesSync.ts` |
| TypeScript | Types for new tables and IPC interfaces | Throughout |

### No new dependencies required

The v0.2.10 milestone decision explicitly states "Zero new npm dependencies needed." [VERIFIED: project_v0.2.10_milestone.md]

---

## Architecture Patterns

### System Architecture Diagram

```
useRulesSync mutationFn
  │
  ├─ fetch Wahapedia points CSV (URL TBD)
  ├─ parseWahapediaCsv(pointsRaw)
  ├─ validateCsvHeaders("Datasheets_points.csv", pointsRows)
  │
  ├─ capturePreSyncPointsSnapshot()  ──► hobbyforge.db (rules_snapshot or new table)
  │
  ├─ invoke("bulk_sync_rules", { ..., points: pointsRows })
  │     │
  │     └─ Rust: DELETE rw_datasheet_points
  │              INSERT rw_datasheet_points rows
  │              UPDATE rw_sync_meta (points_count)
  │              COMMIT
  │
  ├─ computePointsDelta(before, after)
  ├─ insertPointsImportHistory(hobbyforge.db)
  │
  └─ onSuccess: invalidate ARMY_LISTS_KEY, army-list-readiness, RULES_SYNC_META_KEY
         │
         ▼
   getArmyListWithUnits / getArmyListReadiness
     LEFT JOIN rw_datasheet_points dp
       ON dp.datasheet_name = u.name
       AND (dp.faction_id IS NULL OR dp.faction_id = u.faction_id)
     COALESCE(alu.points_override, dp.points, uo.points, u.points, 0)
```

### Recommended Project Structure (additions only)

```
src-tauri/migrations/
  024_points_import_history.sql  # hobbyforge.db: points_import_history table
  rules_004_datasheet_points.sql # rules.db: rw_datasheet_points table

src/db/queries/
  pointsImportHistory.ts         # insert/query points_import_history (hobbyforge.db)

src/hooks/
  usePointsImportHistory.ts      # React Query hook for points audit trail (optional)

src/lib/
  computePointsDelta.ts          # pure function: before/after points maps → delta counts

src/features/army-lists/
  PointsFreshnessBadge.tsx        # freshness dot + tooltip for army list cards/detail

src/features/rules-hub/
  PointsDeltaSection.tsx          # "Points Changes" collapsible in RulesHubPage diff area
```

### Pattern 1: Extending bulk_sync_rules (Rust)

The existing pattern is DELETE-all + bulk INSERT for each table. Points follows the same structure:

```rust
// Source: src-tauri/src/lib.rs (existing pattern, verified)
// Add to BulkSyncPayload:
//   points: Vec<JsRow>,
// Add to SyncResult:
//   pub points: u64,

// In DELETE loop, add "rw_datasheet_points" to the table list.
// Then insert loop:
for row in &payload.points {
    let ds_name = str_val(row, "datasheet_name").unwrap_or_default();
    if ds_name.is_empty() { continue; }
    let res = sqlx::query(
        "INSERT INTO rw_datasheet_points (datasheet_name, faction_id, points) VALUES (?, ?, ?)",
    )
    .bind(&ds_name)
    .bind(str_val(row, "faction_id"))
    .bind(i64_val(row, "points").unwrap_or(0))
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("insert points {ds_name}: {e}"))?;
    counts.points += res.rows_affected();
}
// Also update rw_sync_meta to include points_count column (rules migration needed).
```

**Note:** The exact column names (`datasheet_name`, `faction_id`, `points`) depend on the actual Wahapedia CSV structure, which is an open question.

### Pattern 2: COALESCE Chain Update (SQL — 3 sites)

```sql
-- Source: src/db/queries/armyLists.ts line 49 (verified)
-- BEFORE:
COALESCE(alu.points_override, uo.points, u.points, 0) AS effective_points

-- AFTER (all 3 sites):
COALESCE(alu.points_override, dp.points, uo.points, u.points, 0) AS effective_points

-- New LEFT JOIN added to getArmyListWithUnits and getArmyListReadiness:
LEFT JOIN rw_datasheet_points dp
  ON dp.datasheet_name = u.name
 AND (dp.faction_id IS NULL OR dp.faction_id = u.faction_id)
```

**Critical:** The LEFT JOIN targets rules.db (`rw_datasheet_points`), but `getArmyListWithUnits` queries hobbyforge.db via `getDb()`. SQLite does not support cross-database JOINs through the plugin-sql layer — **this is the key architectural challenge.** See Pitfall 1.

### Pattern 3: ExtendedSnapshotData for Points Delta

```typescript
// Source: src/lib/computeSyncDiff.ts (verified existing type)
// Extension pattern — add points to ExtendedSnapshotData:
export interface ExtendedSnapshotData {
  models?: { before: string | null; after: string | null };
  keywords?: { before: string | null; after: string | null };
  abilities?: { before: string | null; after: string | null };
  points?: { before: string | null; after: string | null };  // NEW
}
```

For points delta: snapshot is a `Map<"name:faction_id", number>` serialized as JSON. Before sync, read from `rw_datasheet_points`; after sync, re-read. The delta computation is simpler than model stats — just compare the integer values.

### Pattern 4: Cache Invalidation Extension

```typescript
// Source: src/hooks/useRulesSync.ts onSuccess (verified)
// Add to existing onSuccess:
qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
qc.invalidateQueries({ queryKey: ["army-list-readiness"], exact: false });
```

`ARMY_LISTS_KEY = ["army-lists"]` from `useArmyLists.ts` [VERIFIED].
`ARMY_LIST_READINESS_KEY` factory uses `["army-list-readiness", ...ids]` prefix [VERIFIED].

### Pattern 5: `points_import_history` Migration (hobbyforge.db)

Next hobbyforge.db migration number: **024** (current highest is 023). [VERIFIED: migration file listing]

```sql
-- 024_points_import_history.sql
CREATE TABLE IF NOT EXISTS points_import_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  imported_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  source_file     TEXT,
  version         TEXT,
  row_count       INTEGER NOT NULL DEFAULT 0,
  delta_added     INTEGER NOT NULL DEFAULT 0,
  delta_removed   INTEGER NOT NULL DEFAULT 0,
  delta_changed   INTEGER NOT NULL DEFAULT 0
);
```

Schema taken directly from design doc. [CITED: .planning/points-import-design.md]

### Pattern 6: rules.db Points Table (rules_004)

Next rules.db migration number: **rules_004** (current highest is rules_003). [VERIFIED: migration file listing]

```sql
-- rules_004_datasheet_points.sql
-- Separate table preferred over columns on rw_datasheets:
-- (1) rw_datasheets has no cost column in 10th ed export
-- (2) Separate table is deleted and recreated on every sync like all rw_ tables
-- (3) Matching is by name string (not datasheet ID) for cross-DB query compatibility
CREATE TABLE IF NOT EXISTS rw_datasheet_points (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  datasheet_name  TEXT NOT NULL,
  faction_id   TEXT,  -- NULL = globally applicable
  points       INTEGER NOT NULL DEFAULT 0,
  UNIQUE (datasheet_name, faction_id)
);
```

**Schema decision (Claude's discretion):** Use a **separate `rw_datasheet_points` table** rather than adding columns to `rw_datasheets`. Rationale: the 10th edition `rw_datasheets` table has no cost column and adding one would require an ALTER TABLE on an rw_ table that is deleted and recreated on every sync (the schema lives in rules_001_schema.sql which is a migration, not subject to re-runs). A separate table is cleaner and follows the existing pattern of splitting large tables (models, abilities, keywords are all separate tables). [ASSUMED — depends on Wahapedia CSV column names not yet confirmed]

### Anti-Patterns to Avoid

- **Cross-database JOIN in plugin-sql:** `getArmyListWithUnits` uses `getDb()` (hobbyforge.db). You cannot JOIN `rw_datasheet_points` (rules.db) in the same SQL statement. See Pitfall 1 for the solution.
- **Computing effective_points in JavaScript:** Always keep the COALESCE in SQL. Never sum points in TS.
- **Forgetting the readiness test for `"army-list-readiness"`:** The readiness key uses a sorted ID array — blanket invalidation with `exact: false` on the prefix `["army-list-readiness"]` is correct (see `ARMY_LIST_READINESS_KEY` factory).
- **Editing existing migration files:** Never. Always create a new numbered file.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom parser | `parseWahapediaCsv` (src/lib/) | Already handles Wahapedia's pipe-delimited format correctly |
| Header validation | Custom header check | `validateCsvHeaders` (src/lib/) | Add the new CSV filename and required columns to `REQUIRED_HEADERS` |
| Freshness computation | Custom date logic | `getSyncFreshness` + `getSyncAgeLabel` + `FRESHNESS_DOT_CLASS` from `syncFreshness.ts` | 3 tiers already defined and tested |
| Snapshot capture | Custom snapshot logic | Extend `capturePreSyncSnapshot` in `rulesSnapshot.ts` | Already handles multiple tables with before/after JSON |
| Diff computation | Custom delta logic | Extend `computeSyncDiff` with points field in `ExtendedSnapshotData` | Pure function, test coverage exists |
| Query invalidation | Manual cache busting | React Query `invalidateQueries` in `useRulesSync.ts` `onSuccess` | Pattern already used for 10 query keys |

---

## Common Pitfalls

### Pitfall 1: Cross-Database JOIN for Effective Points (CRITICAL)

**What goes wrong:** `getArmyListWithUnits` uses `getDb()` which connects to `hobbyforge.db`. `rw_datasheet_points` lives in `rules.db`. SQLite (via tauri-plugin-sql) does not support cross-database JOINs in a single query. Adding `LEFT JOIN rw_datasheet_points dp ON ...` to the existing query will fail at runtime with "no such table: rw_datasheet_points."

**Why it happens:** The design doc (`.planning/points-import-design.md`) assumes `points_imports` lives in hobbyforge.db. The CONTEXT.md changed storage to rules.db. This creates a cross-database JOIN problem that the design doc didn't have.

**How to avoid:** Use a two-step approach at the query layer:
1. Before calling `getArmyListWithUnits`, fetch the relevant points rows from rules.db (`getRulesDb()`): `SELECT datasheet_name, faction_id, points FROM rw_datasheet_points WHERE faction_id = $1 OR faction_id IS NULL`.
2. Pass the resulting map as a parameter to a modified query, OR attach rules.db using SQLite `ATTACH DATABASE` inside the transaction.

**Preferred solution:** Use SQLite's `ATTACH DATABASE` in the Rust command, or restructure to do a two-query approach in TypeScript: (a) read points map from rules.db, (b) pass points data as a lookup in the hobbyforge.db query using a VALUES subquery or a temporary approach.

**Alternative preferred by this codebase:** Since the COALESCE must stay in SQL (project convention), the cleanest approach is to copy the relevant points values into a temporary structure. In practice, the hook layer (`useArmyListWithUnits`) can pre-fetch the points map from rules.db and pass it to the query — but this breaks the "keep COALESCE in SQL" convention.

**Recommended resolution:** The planner must decide between:
  - Option A: ATTACH rules.db inside a special query function to enable cross-DB JOIN (non-standard, experimental for tauri-plugin-sql)
  - Option B: Store a denormalized copy of synced points in hobbyforge.db (a `synced_unit_points` cache table, refreshed on sync), enabling the SQL COALESCE without cross-DB complexity
  - Option C: Perform the points lookup in TypeScript and compute effective_points in JS (violates project convention but is the simplest)

Option B is most aligned with the project's existing patterns (denormalized copies are used for `detachment_name` on `army_lists`). **This is flagged as ASSUMED — planner must confirm the cross-DB resolution strategy.** [ASSUMED]

**Warning signs:** "no such table: rw_datasheet_points" runtime error when opening an army list.

### Pitfall 2: COALESCE Site 3 in getArmyListReadiness Has Conditional SUM

**What goes wrong:** Lines 197 and 199 in `armyLists.ts` are NOT the same COALESCE — line 197 is the `total_points` SUM, line 199 is the `battle_ready_points` conditional SUM. Both must be updated with the same 5-level chain. Missing line 199 causes `battle_ready_points` to disagree with `total_points` calculation.

**How to avoid:** Treat these as two separate COALESCE update sites even though they're in the same query. Update both.

### Pitfall 3: RustSyncResult / BulkSyncPayload Must Match on Both Sides

**What goes wrong:** The Rust `BulkSyncPayload` struct and `SyncResult` struct must gain a `points` field. The TypeScript `RustSyncResult` interface and `useRulesSync` payload object must gain the same field. If Rust adds `points` but TypeScript doesn't, or vice versa, the Tauri IPC call fails with a deserialization error.

**How to avoid:** Update Rust struct, TypeScript interface, and payload construction in the same plan task.

### Pitfall 4: onSuccess Query Key Count in Tests

**What goes wrong:** `tests/datasheet/useRulesSync.test.ts` has a hardcoded assertion `expect(invalidateQueriesMock).toHaveBeenCalledTimes(10)`. Adding two new invalidations (`ARMY_LISTS_KEY`, `army-list-readiness`) makes the test fail with "expected 10 calls, received 12."

**How to avoid:** Update the test to expect 12 (or the new total) and add assertions for the two new keys.

**Warning signs:** Vitest failure in `tests/datasheet/useRulesSync.test.ts` SYNC-05 test.

### Pitfall 5: rules.db Migration Must Be Registered in lib.rs

**What goes wrong:** Creating `rules_004_datasheet_points.sql` but forgetting to add the `Migration { version: 4, ... }` entry to `get_rules_migrations()` in `lib.rs`. The table silently doesn't exist at runtime.

**How to avoid:** The plan for the migration task must explicitly include the lib.rs registration as a step — not a separate task, but part of the same task.

### Pitfall 6: Delta Snapshot Timing

**What goes wrong:** The points delta snapshot (before sync) must be read BEFORE the Rust DELETE-all runs. The existing `capturePreSyncSnapshot` / `getLatestSnapshot` pattern already handles this for datasheets. If points snapshot is captured AFTER `invoke("bulk_sync_rules")`, the "before" state is gone.

**How to avoid:** Read the pre-sync points snapshot in the same try-catch block before `invoke(...)`, following the exact pattern already in `useRulesSync.ts` lines 144-166.

### Pitfall 7: `faction_id` is Wahapedia text key, NOT hobbyforge.db integer

**What goes wrong:** Units in hobbyforge.db have `faction_id` as INTEGER (FK to `factions.id`). The `rw_datasheet_points` table uses Wahapedia faction text IDs (e.g., `"SM"`). The LEFT JOIN `dp.faction_id = u.faction_id` would always fail because types differ.

**How to avoid:** The join must use the unit's Wahapedia faction key, not the hobbyforge faction integer. This requires either:
- Joining through `unit_overrides` which stores the Wahapedia key (but `unit_overrides.unit_id` only stores the integer)
- OR requiring the points CSV to be matched by `datasheet_name` only (ignoring faction, relying on name uniqueness, or using IS NULL to mean "global")

This is related to Pitfall 1. The design doc's `LEFT JOIN points_imports pi ON pi.unit_name = u.name AND (pi.faction_id IS NULL OR pi.faction_id = u.faction_id)` assumes both faction_id values are the same type. Since they aren't, **the join should likely match on name only with `faction_id IS NULL`** (global scope), OR the rw_datasheet_points table uses datasheet_id (the 9-digit Wahapedia ID) as the join key, which is more reliable.

**Recommended:** Confirm the actual Wahapedia CSV columns before finalizing join strategy.

---

## Code Examples

### Existing Freshness Badge Pattern (reuse directly)

```tsx
// Source: src/features/army-lists/ArmyListDetailSheet.tsx (verified import)
// + src/lib/syncFreshness.ts (verified exports)
import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";
import { useRulesSyncMeta } from "@/hooks/useDatasheet";

const { data: syncMeta } = useRulesSyncMeta();
const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);
const ageLabel = getSyncAgeLabel(syncMeta?.last_sync_at ?? null);

<Tooltip>
  <TooltipTrigger asChild>
    <span className={cn("inline-block h-2 w-2 rounded-full", FRESHNESS_DOT_CLASS[freshness])} />
  </TooltipTrigger>
  <TooltipContent>{ageLabel}</TooltipContent>
</Tooltip>
```

### Existing SyncStatusCard Stats Row Pattern (extend for points count)

```tsx
// Source: src/features/rules-hub/SyncStatusCard.tsx lines 96-121 (verified)
// Add a new stats row to the existing flex-wrap gap-4 div:
{syncMeta.points_count !== null && (
  <span>
    <span className="font-semibold text-foreground">{syncMeta.points_count}</span>{" "}
    point entries
  </span>
)}
```

This requires adding `points_count` to the `rw_sync_meta` table (rules_004 or a separate ALTER TABLE migration), and updating the Rust INSERT OR REPLACE in `bulk_sync_rules` to include it.

### Existing points_import_history Insert (pure TS, hobbyforge.db)

```typescript
// Pattern from src/db/queries/syncErrors.ts (analogous pattern, verified)
export async function insertPointsImportHistory(input: {
  source_file: string | null;
  version: string | null;
  row_count: number;
  delta_added: number;
  delta_removed: number;
  delta_changed: number;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO points_import_history
       (source_file, version, row_count, delta_added, delta_removed, delta_changed)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.source_file, input.version, input.row_count,
     input.delta_added, input.delta_removed, input.delta_changed],
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Design doc: `points_imports` in hobbyforge.db | CONTEXT.md: points in rules.db (`rw_datasheet_points`), history in hobbyforge.db | Cross-database JOIN challenge — see Pitfall 1 |
| Design doc: 30-day staleness threshold | Existing syncFreshness.ts: 7/14-day tiers | Use existing tiers; "never" for lists with no points |
| 4-level COALESCE `(alu.override, uo.points, u.points, 0)` | 5-level: `(alu.override, dp.points, uo.points, u.points, 0)` | Three SQL sites need updating |

**Current COALESCE state (verified from armyLists.ts):**
- Line 49 (getArmyListWithUnits): `COALESCE(alu.points_override, uo.points, u.points, 0)`
- Line 197 (getArmyListReadiness total): `SUM(COALESCE(alu.points_override, uo.points, u.points, 0))`
- Line 199 (getArmyListReadiness battle_ready): `COALESCE(alu.points_override, uo.points, u.points, 0)` inside CASE

---

## Runtime State Inventory

This is NOT a rename/refactor phase. No runtime state inventory needed.

---

## Environment Availability

Step 2.6: SKIPPED — phase is pure code/config changes targeting existing databases. No new external tools, services, or CLIs are required.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Wahapedia 10th ed has no dedicated points CSV file (tested ~8 URL variants, all 404) | Open Questions | If a points CSV exists, PI-01/PI-02 implementation is straightforward; if not, an alternative data source must be designed |
| A2 | Separate `rw_datasheet_points` table preferred over adding columns to `rw_datasheets` | Architecture Patterns / Pattern 6 | If points are columns on rw_datasheets, a rules_001 schema ALTER is needed instead |
| A3 | Option B (denormalized `synced_unit_points` cache in hobbyforge.db) is the right cross-DB JOIN solution | Pitfall 1 | If Option A (ATTACH) works via plugin-sql, it's cleaner; if Option C (JS compute) is chosen, project conventions change |
| A4 | `rw_sync_meta` can be extended with `points_count` via a new ALTER TABLE rules migration | Code Examples | If the migration ordering causes issues, points_count could live in a separate meta query |

---

## Open Questions (RESOLVED)

1. **[BLOCKING for PI-01, PI-02] What Wahapedia CSV file contains 10th edition unit points?**
   - What we know: The standard wh40k10ed export (confirmed via HTTP fetch of actual CSVs) does NOT include a unit points CSV at any tested URL (Datasheets_points.csv, Points.csv, etc.). The `Datasheets.csv` (10th ed) has 14 columns — none are cost/points. The `Enhancements.csv` has a `cost` column for enhancement costs (not unit costs). The 9th edition had `cost` in `Datasheets_models.csv` but 10th ed does not.
   - What's unclear: (a) Does a points CSV exist but under an unknown filename? (b) Does Wahapedia 10th ed simply not export unit points in machine-readable form? (c) Is there a separate community-maintained CSV source for 40k 10th ed points (e.g., the Munitorum Field Manual data)?
   - Recommendation: **The user must verify the points CSV source before implementation begins.** Possible approaches if Wahapedia has no points CSV: (1) Use the Wahapedia `Enhancements.csv` for enhancement costs only, and leave unit points as manual-only; (2) Find an alternative community CSV source that mirrors GW Munitorum Field Manual data; (3) Implement a manual CSV upload fallback. This is a phase-blocking question.

2. **[Cross-DB JOIN resolution] How should `rw_datasheet_points` (rules.db) be JOINed into `getArmyListWithUnits` (hobbyforge.db)?**
   - What we know: tauri-plugin-sql opens connections per database. The plugin does not support `ATTACH DATABASE`. The existing code never does cross-DB JOINs.
   - What's unclear: Whether a two-query approach (fetch points map from rules.db, pass as VALUES subquery to hobbyforge.db query) is feasible without violating the "COALESCE in SQL" convention.
   - Recommendation: The simplest correct option is **Option B** — write a denormalized points cache to hobbyforge.db after each sync (a `synced_unit_points` table, keyed by unit name + faction text key). This table is cleared and repopulated on every sync. The COALESCE query joins this hobbyforge.db table normally. This matches how `detachment_name` is denormalized in `army_lists`.

3. **[Faction key matching] What faction_id format does the Wahapedia points CSV use?**
   - What we know: `rw_datasheets.faction_id` is Wahapedia text key (e.g., `"SM"`). `units.faction_id` is integer FK to `factions.id` in hobbyforge.db.
   - Recommendation: Points JOIN should use `datasheet_name` as primary match key. Faction scoping (to handle units with the same name in different factions) requires either the Wahapedia text key or matching by datasheet_id, depending on what the CSV provides.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest config embedded) |
| Quick run command | `pnpm test -- tests/army-list/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PI-01 | `rw_datasheet_points` table schema correct; `points_import_history` table exists in hobbyforge.db | unit | `pnpm test -- tests/datasheet/pointsSchema.test.ts` | ❌ Wave 0 |
| PI-02 | `useRulesSync` passes points to Rust; `RustSyncResult.points` is returned; onSuccess invalidates army-list keys | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ✅ (extend existing) |
| PI-03 | `getSyncFreshness` returns correct tier for points freshness; badge renders on army list | unit | `pnpm test -- tests/datasheet/syncFreshness.test.ts` | ✅ (extend existing) |
| PI-04 | `computePointsDelta` returns correct added/removed/changed counts | unit | `pnpm test -- tests/datasheet/computePointsDelta.test.ts` | ❌ Wave 0 |
| PI-05 | `getArmyListWithUnits` returns correct `effective_points` with 5-level COALESCE; synced points override uo.points but not alu.points_override | unit | `pnpm test -- tests/foundation/armyListQueries.test.ts` | ✅ (extend existing) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/datasheet/ tests/army-list/ tests/foundation/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/datasheet/pointsSchema.test.ts` — covers PI-01 (schema shape validation)
- [ ] `tests/datasheet/computePointsDelta.test.ts` — covers PI-04 (pure function delta computation)

---

## Security Domain

This phase is data-only (SQLite + local sync). No authentication, session management, user-facing input validation beyond existing patterns, or cryptography. ASVS categories V2/V3/V4/V6 do not apply.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes (CSV parsing) | `validateCsvHeaders` pattern already in place; extend `REQUIRED_HEADERS` for new CSV |
| All others | no | — |

---

## Sources

### Primary (HIGH confidence — verified by direct code read)
- `src/db/queries/armyLists.ts` — 3 exact COALESCE sites confirmed; current 4-level chain documented
- `src/hooks/useRulesSync.ts` — sync pipeline structure, RustSyncResult, RULES_SYNC_FILES, invalidation pattern
- `src-tauri/src/lib.rs` — BulkSyncPayload, SyncResult, bulk_sync_rules Rust implementation
- `src/lib/syncFreshness.ts` — freshness tiers, FRESHNESS_DOT_CLASS, getSyncAgeLabel
- `src/lib/computeSyncDiff.ts` — ExtendedSnapshotData pattern, SyncDiff interface
- `src/db/queries/rulesSnapshot.ts` — pre-sync snapshot pattern
- `src/features/rules-hub/SyncStatusCard.tsx` — freshness badge and stats row UI patterns
- `src/features/army-lists/StaleDataBanner.tsx` — existing stale data warning
- `src-tauri/migrations/` — confirmed next migration numbers: 024 (hobbyforge.db), rules_004 (rules.db)
- `.planning/points-import-design.md` — schema designs, delta algorithm, COALESCE documentation

### Secondary (MEDIUM confidence)
- [Wahapedia data export page](https://wahapedia.ru/wh40k10ed/the-rules/data-export/) — confirmed current 10th edition CSV file list structure
- Direct HTTP fetch of Datasheets.csv — confirmed 14 columns, no points/cost column present
- Direct HTTP fetch of Enhancements.csv — has `cost` column but for enhancements only
- Direct HTTP fetch of Datasheets_models.csv — confirmed no cost column in 10th edition

### Tertiary (LOW confidence — flagged for validation)
- ~8 attempted Wahapedia CSV URL probes for points data — all returned 404 (Datasheets_points.csv, Points.csv, etc.) [LOW — absence of evidence is not evidence of absence; there may be an unlisted file]

---

## Metadata

**Confidence breakdown:**
- COALESCE sites and SQL patterns: HIGH — directly verified from source
- Rust extension pattern: HIGH — directly verified from source
- Freshness/delta patterns: HIGH — directly verified from source
- Migration numbers: HIGH — directly verified from file listing
- Cross-DB JOIN problem: HIGH — SQLite architecture is well-understood
- Wahapedia points CSV source: LOW — no file found; user confirmation required

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (Wahapedia CSV structure may change; everything else is codebase-internal and stable)
