# Phase 89: Schema + Data Layer — Research

**Researched:** 2026-05-20
**Domain:** SQLite schema migrations + TypeScript query layer (Tauri plugin-sql, army list data model)
**Confidence:** HIGH — all findings derived from direct codebase inspection; no external sources needed for this purely internal phase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Enhancements use a dedicated join table `army_list_enhancements` (not columns on `army_list_units`). Columns: `id`, `list_id FK`, `army_list_unit_id FK`, `enhancement_name TEXT`, `enhancement_points INTEGER`, `created_at`. Enhancement name and points are TEXT/INTEGER copies (no FK to synced_enhancements).

**D-02:** Enhancement points are tracked separately from the COALESCE chain. They are summed at the list level and added to the summary bar total alongside the per-unit effective_points sum. They do NOT flow through the per-unit COALESCE expression.

**D-03:** Leader attachment is a column on `army_list_units`: `leader_attached_to_id INTEGER REFERENCES army_list_units(id) ON DELETE SET NULL`. 1:1 relationship. SET NULL so removing the target row unlinks the leader rather than cascading.

**D-04:** Ghost units use nullable `unit_id` on `army_list_units` plus `ghost_unit_name TEXT`. CHECK constraint: `CHECK (unit_id IS NOT NULL OR ghost_unit_name IS NOT NULL)`. When `unit_id IS NULL` and `ghost_unit_name IS NOT NULL`, the row is a planned entry.

**D-05:** The `unit_id` FK constraint changes from `NOT NULL REFERENCES units(id) ON DELETE RESTRICT` to nullable `REFERENCES units(id) ON DELETE RESTRICT`. SQLite does not support ALTER COLUMN — requires the rename-create-copy-drop pattern in a migration.

**D-06:** Ghost unit points resolve from synced data via name-based join on `ghost_unit_name`. The COALESCE chain uses CASE WHEN to branch: real units join via `u.name`, ghost units join via `ghost_unit_name`.

**D-07:** Ghost units do NOT appear in Collection, Dashboard stats, or Kanban (existing queries read from `units` directly — no additional filtering needed).

**D-08:** Add `selected_model_count INTEGER` column on `army_list_units` (nullable). New 6-level chain: `COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0)` where `tier.points` comes from a LEFT JOIN on `synced_unit_point_tiers` matching `(unit_name, faction_id, selected_model_count)`.

**D-09:** COALESCE chain update MUST be applied atomically across all 3 query sites in the same commit: `getArmyListWithUnits`, `getArmyListReadiness`, and `resolveUnitPoints()`. Grep for `COALESCE(alu.points_override` to find all sites.

**D-10:** Add `is_warlord INTEGER NOT NULL DEFAULT 0` column on `army_list_units`. Enforcement of one-per-list is in the mutation function (deselect-then-select pattern matching `activateLoadout`), not via SQL trigger.

**D-11:** The `getArmyListWithUnits` query already uses `ORDER BY alu.created_at ASC` (armyLists.ts line 72). Verify stability — if `created_at` has second-level granularity, add `ORDER BY alu.id ASC` as tiebreaker.

**D-12:** Single migration file `031_army_list_v3.sql` containing all schema changes. Must be registered in `lib.rs` immediately.

**D-13:** New nullable columns on `army_list_units` that the user should be able to clear back to NULL each get a dedicated clear function (following `clearArmyListDetachment` pattern).

### Claude's Discretion

- Query function naming and signature design
- Whether to extend `resolveUnitPoints()` lib function or keep it SQL-only
- TypeScript type design for new interfaces (ghost unit type unions, enhancement types)
- Test fixture design for the COALESCE chain validation

### Deferred Ideas (OUT OF SCOPE)

- Loadout option storage (selected wargear choices) — Phase 90
- Enhancement validation UI (max 3, no duplicates, character-only) — Phase 91
- Leader attachment visual grouping — Phase 92
- DatasheetBrowserDialog for adding ghost units — Phase 93
- `canonical_name TEXT` on `unit_rules_mapping` — Phase 90
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DL-03 | Units in army list display in stable insertion order (newest at bottom) | D-11: verify `ORDER BY alu.created_at ASC` stability; add `alu.id ASC` tiebreaker — `id` is AUTOINCREMENT so monotonically increasing even within the same second |
| DL-04 | User can designate one unit as Warlord in the army list | D-10: `is_warlord INTEGER NOT NULL DEFAULT 0` column; mutation uses `activateLoadout` two-step deselect-then-select pattern scoped by `list_id` |
</phase_requirements>

---

## Summary

Phase 89 is a **pure data layer phase** — no UI, no Tauri commands. The deliverables are: one SQL migration file, updated query functions in `src/db/queries/armyLists.ts`, new query functions for the enhancement join table, updated TypeScript interfaces in `src/types/armyList.ts`, and an updated `src/lib/resolveUnitPoints.ts` to match the new COALESCE chain. All five success criteria are achievable within these four files plus `src/hooks/useArmyLists.ts` for new mutation hooks.

The most structurally complex part is the **table recreation** required for D-05 (nullable `unit_id`). SQLite does not support `ALTER COLUMN` — the standard rename-create-copy-drop sequence must preserve all existing data and all columns added by prior migrations (001, 025: `tactical_role`). This is the only irreversible operation; all other changes are additive column additions or new table creations.

The **COALESCE chain extension** (D-08/D-09) touches three files atomically: `armyLists.ts` (two query sites), and `resolveUnitPoints.ts`. The chain gains one new level (`tier.points`) and requires a new LEFT JOIN on `synced_unit_point_tiers`. The D-06 ghost unit branching makes the JOIN clause conditional on whether `unit_id` is NULL, introducing a CASE WHEN inside the LEFT JOIN condition.

**Primary recommendation:** Write the migration first, verify it runs cleanly on a fresh app, then update query functions and types, then add mutation hooks, then tests. The migration is the only step that is hard to undo.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Stable insertion order (DL-03) | Database / Storage | — | `ORDER BY alu.created_at ASC, alu.id ASC` is a query contract; no UI change |
| Warlord designation (DL-04) | Database / Storage | API / Backend (TypeScript query layer) | Schema column + mutation function; no UI in this phase |
| Ghost unit schema (D-04/D-05) | Database / Storage | — | Table recreation migration; query layer adapts existing SELECT |
| Enhancement join table (D-01) | Database / Storage | API / Backend | New table + CRUD functions; no UI in this phase |
| COALESCE chain extension (D-08) | Database / Storage | API / Backend | SQL change in query + pure-function change in resolveUnitPoints |
| Leader attachment column (D-03) | Database / Storage | — | Single nullable FK column; clear function; no UI in this phase |
| TypeScript types | API / Backend | — | Interface extensions; downstream UI phases consume |

---

## Standard Stack

No new packages are required for this phase. All work uses the established project stack.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tauri-plugin-sql` | existing | SQLite migrations + `db.select`/`db.execute` | Project baseline; $1/$2 positional parameter syntax |
| `@tanstack/react-query` | existing | Mutation hooks + cache invalidation | Project baseline for all DB-backed state |

### No New Packages
This phase adds no external dependencies. The Package Legitimacy Audit section is omitted (no installs).

---

## Architecture Patterns

### System Architecture Diagram

```
Migration 031_army_list_v3.sql
        │
        ▼
SQLite (hobbyforge.db)
  army_list_units (recreated — nullable unit_id, +is_warlord, +selected_model_count, +ghost_unit_name, +leader_attached_to_id)
  army_list_enhancements (new join table)
        │
        ▼
src/db/queries/armyLists.ts
  getArmyListWithUnits()  ←── extended SELECT with CASE WHEN branching for ghost units
  getArmyListReadiness()  ←── COALESCE chain updated atomically
  setWarlord()            ←── new: two-step UPDATE (deselect all, select one)
  addGhostUnitToList()    ←── new: INSERT with null unit_id
  clearLeaderAttachment() ←── new: NULL-clear function (D-13 pattern)
  clearSelectedModelCount() ← new: NULL-clear function
        │
  army_list_enhancements CRUD (new functions)
        │
        ▼
src/lib/resolveUnitPoints.ts
  resolveUnitPoints()  ←── gains `tier_points` parameter (5th level becomes tier)
        │
        ▼
src/types/armyList.ts
  ArmyListUnit (extended)
  ArmyListUnitRow (extended)
  ArmyListEnhancement (new interface)
  AddGhostUnitToListInput (new)
        │
        ▼
src/hooks/useArmyLists.ts
  useSetWarlord()           ←── new mutation
  useAddGhostUnitToList()   ←── new mutation
  useAddEnhancement()       ←── new mutation
  useRemoveEnhancement()    ←── new mutation
  useClearLeaderAttachment() ← new mutation
  (cache invalidation set extended)
```

### Recommended Project Structure

No directory changes. All new code goes into existing files:

```
src/
  db/queries/
    armyLists.ts     ← primary changes (getArmyListWithUnits, getArmyListReadiness,
                        setWarlord, addGhostUnitToList, clearLeaderAttachment,
                        clearSelectedModelCount, army_list_enhancements CRUD)
  types/
    armyList.ts      ← extended interfaces + new ArmyListEnhancement
  lib/
    resolveUnitPoints.ts  ← extended for tier_points parameter
  hooks/
    useArmyLists.ts  ← new mutation hooks

src-tauri/
  migrations/
    031_army_list_v3.sql  ← single migration for ALL Phase 89 schema changes
  src/
    lib.rs           ← Migration version 31 entry added
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table column rename (nullable unit_id) | Custom migration with ALTER | SQLite rename-create-copy-drop | ALTER COLUMN not supported; established SQLite pattern |
| One-warlord-per-list enforcement | SQL trigger | Application-level two-step UPDATE | Matches `activateLoadout` pattern; simpler, no Tauri trigger support issues |
| Ghost unit points resolution | JavaScript COALESCE | SQL CASE WHEN inside LEFT JOIN | Keeps all points logic in SQL per project contract ("Never reimplements the COALESCE in JS") |
| Enhancement points running total | Recompute from synced data | Snapshot `enhancement_points INTEGER` at assignment time | synced tables DELETE-all + re-INSERT on sync (Pitfall 1, 2) |
| Cache invalidation logic | Custom event emitter | React Query `qc.invalidateQueries` | Established project pattern; avoids stale state across Dashboard/GameDay |

---

## Common Pitfalls

### Pitfall 1: Forgetting to include all existing columns in the table recreation
**What goes wrong:** The rename-create-copy-drop migration for `army_list_units` defines the new schema but omits `tactical_role` (added in migration 025). After migration runs, existing army list units lose their tactical role assignments. No error is thrown — `tactical_role` simply becomes NULL everywhere.

**Why it happens:** Migration 025 is a bare `ALTER TABLE army_list_units ADD COLUMN tactical_role TEXT DEFAULT NULL` — a single line. It is easy to miss when reconstructing the CREATE TABLE in 031.

**How to avoid:** Before writing the CREATE TABLE in 031, list every column currently in `army_list_units` by reading 001 and 025 together:
- From 001: `id`, `list_id`, `unit_id`, `points_override`, `notes`, `created_at`
- From 025: `tactical_role`
- Phase 89 additions: `ghost_unit_name`, `is_warlord`, `selected_model_count`, `leader_attached_to_id`

**Warning signs:** `tactical_role` is NULL for all rows after migration; UI tactical role tags all disappear.

---

### Pitfall 2: COALESCE chain divergence across the three query sites
**What goes wrong:** `getArmyListWithUnits` is updated with the new 6-level COALESCE (including `tier.points`), but `getArmyListReadiness` keeps the old 5-level chain. The Dashboard ArmyReadinessCard then shows different totals from the list detail page for any unit that has a tier-specific points value.

**Why it happens:** There are exactly three sites that must be updated atomically (D-09). The current expression `COALESCE(alu.points_override, sup.points, uo.points, u.points, 0)` appears in:
- `armyLists.ts` line 65 (getArmyListWithUnits)
- `armyLists.ts` line 232 (getArmyListReadiness)
- `resolveUnitPoints.ts` if-chain (resolveUnitPoints lib function)

**How to avoid:** Grep `COALESCE(alu.points_override` across all `.ts` files before writing. Update all three in the same commit. Run the test for resolveUnitPoints after extending the function signature to ensure 0-as-valid-value handling is preserved.

**Warning signs:** After implementation, compare `effective_points` between the army list page and the Dashboard ArmyReadinessCard for a unit with a synced tier. Any difference = divergent COALESCE.

---

### Pitfall 3: Ghost unit SELECT requiring UNION instead of CASE WHEN
**What goes wrong:** The query tries to SELECT from `units u` for all rows, then for rows where `unit_id IS NULL` it still tries to JOIN to `units` — producing NULL for all unit-derived fields on ghost rows. The developer patches this with a UNION ALL query, creating two separate code paths and doubling the maintenance surface.

**Why it happens:** The current `getArmyListWithUnits` has `JOIN units u ON u.id = alu.unit_id` (an INNER JOIN). Changing `unit_id` to nullable but keeping INNER JOIN silently drops ghost rows from results. Changing to LEFT JOIN returns them but unit-derived fields (`u.name`, `u.points`, `u.faction_id`) are all NULL.

**How to avoid:** Change the JOIN strategy:
1. Change `JOIN units u ON u.id = alu.unit_id` to `LEFT JOIN units u ON u.id = alu.unit_id`
2. Use `COALESCE(u.name, alu.ghost_unit_name)` as `unit_name` in the SELECT
3. Use a CASE WHEN for the synced_unit_points join key: `ON (CASE WHEN alu.unit_id IS NOT NULL THEN u.name ELSE alu.ghost_unit_name END) = sup.unit_name`
4. Use a CASE WHEN for the synced_unit_point_tiers join key similarly
5. `COALESCE(u.faction_id, NULL)` for ghost units (no faction context from collection)

The result is a single SELECT path, not a UNION.

**Warning signs:** Ghost unit rows missing from the query result; or ghost units present but all fields NULL.

---

### Pitfall 4: setWarlord not scoped by list_id
**What goes wrong:** The warlord mutation runs `UPDATE army_list_units SET is_warlord = 0 WHERE list_id = $2` then `UPDATE army_list_units SET is_warlord = 1 WHERE id = $1`. But if a user has multiple army lists and happens to pass the wrong list_id, units from a different list get their warlord cleared. Or worse, the deselect step omits the `list_id` scope and clears warlord across ALL lists simultaneously.

**Why it happens:** The `activateLoadout` pattern scopes to `unit_id` (one unit has many loadouts). The warlord pattern scopes to `list_id` (one list has one warlord). The scope key is different and must be passed explicitly.

**How to avoid:** The `setWarlord(armyListUnitId: number, listId: number)` function must:
1. `UPDATE army_list_units SET is_warlord = 0 WHERE list_id = $2` — clear all in list
2. `UPDATE army_list_units SET is_warlord = 1 WHERE id = $1` — set target

Both steps require `listId` in the WHERE clause. The mutation hook variable type must include `list_id` alongside `army_list_unit_id`.

---

### Pitfall 5: Missing lib.rs registration for migration 031
**What goes wrong:** `031_army_list_v3.sql` is created but not added to `get_migrations()` in `lib.rs`. The app builds without error. On launch, the new tables and columns do not exist. The first INSERT into `army_list_enhancements` returns "no such table". Ghost unit INSERTs fail because the `ghost_unit_name` column does not exist.

**Why it happens:** Migration registration is a manual step. It has already bitten this project (documented in Pitfall 12 of PITFALLS.md, Phase 68/MIG-01).

**How to avoid:** The migration file and the `lib.rs` entry are a single atomic change. After writing the SQL file, immediately add:
```rust
Migration {
    version: 31,
    description: "army_list_v3",
    sql: include_str!("../migrations/031_army_list_v3.sql"),
    kind: MigrationKind::Up,
},
```
The `schema_version` returned by `get_schema_version()` is `get_migrations().len() as u32`, so adding this entry automatically bumps it to 31.

---

### Pitfall 6: leader_attached_to_id self-referential FK in the migration order
**What goes wrong:** The `army_list_units` table recreation creates the new table with `leader_attached_to_id INTEGER REFERENCES army_list_units(id) ON DELETE SET NULL`. SQLite evaluates this FK at row write time, not table creation time. However, care is needed in the migration order: if the DROP of the old table happens before the CREATE of the new table in the same transaction, the FK reference target momentarily does not exist.

**Why it happens:** The rename-create-copy-drop migration sequence is: (1) RENAME old to temp, (2) CREATE new, (3) INSERT INTO new SELECT FROM temp, (4) DROP temp. The self-referential FK is on the NEW table referencing itself, so it is valid from the moment CREATE runs (step 2). No ordering issue exists in this specific pattern.

**How to avoid:** Follow the sequence strictly. The self-referential FK is safe because it references the table being created, not the temp table. Verify by checking that `ON DELETE SET NULL` fires correctly when a parent row is deleted: the child row's `leader_attached_to_id` becomes NULL rather than being deleted.

---

### Pitfall 7: updateArmyListUnit missing new columns
**What goes wrong:** The existing `updateArmyListUnit` function uses a hard-coded `SET points_override=$2, notes=$3, tactical_role=$4`. After Phase 89 adds `is_warlord`, `selected_model_count`, `ghost_unit_name`, and `leader_attached_to_id`, callers that want to update these fields have no mutation path. Worse, if a future caller passes all columns to a generic UPDATE and omits the new ones, the UPDATE silently leaves them at their current value.

**Why it happens:** The full-replacement UPDATE pattern for `army_list_units` works for columns that can be set together. But `is_warlord` has its own dedicated mutation (`setWarlord`), `selected_model_count` needs its own clear function (D-13 pattern), and ghost unit fields are write-once at insertion time.

**How to avoid:** Keep `updateArmyListUnit` scoped to the fields it already manages (`points_override`, `notes`, `tactical_role`). New fields get their own dedicated functions:
- `setWarlord(id, listId)` — the two-step pattern
- `setSelectedModelCount(id, count)` / `clearSelectedModelCount(id)` — D-13 pair
- `setLeaderAttachment(id, targetId)` / `clearLeaderAttachment(id)` — D-13 pair
- `UpdateArmyListUnitInput` interface should NOT gain the new fields (they have dedicated functions)

---

## Code Examples

All verified from direct codebase inspection.

### Pattern 1: SQLite table recreation (rename-create-copy-drop)
[CITED: established SQLite migration pattern — confirmed in-project via migrations 001–030]

```sql
-- Step 1: Rename existing table
ALTER TABLE army_list_units RENAME TO army_list_units_old;

-- Step 2: Create new table with full desired schema
CREATE TABLE army_list_units (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id               INTEGER NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
    unit_id               INTEGER REFERENCES units(id) ON DELETE RESTRICT,  -- NOW NULLABLE
    ghost_unit_name       TEXT,
    is_warlord            INTEGER NOT NULL DEFAULT 0,
    selected_model_count  INTEGER,
    leader_attached_to_id INTEGER REFERENCES army_list_units(id) ON DELETE SET NULL,
    points_override       INTEGER,
    notes                 TEXT,
    tactical_role         TEXT DEFAULT NULL,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (unit_id IS NOT NULL OR ghost_unit_name IS NOT NULL)
);

-- Step 3: Copy all existing data (ghost_unit_name / is_warlord / selected_model_count / leader_attached_to_id get defaults)
INSERT INTO army_list_units (id, list_id, unit_id, ghost_unit_name, is_warlord,
    selected_model_count, leader_attached_to_id, points_override, notes, tactical_role, created_at)
SELECT id, list_id, unit_id, NULL, 0, NULL, NULL, points_override, notes, tactical_role, created_at
FROM army_list_units_old;

-- Step 4: Drop old table
DROP TABLE army_list_units_old;
```

### Pattern 2: army_list_enhancements join table
[CITED: D-01 decision, follows detachment_name TEXT copy pattern from army_lists]

```sql
CREATE TABLE army_list_enhancements (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id             INTEGER NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
    army_list_unit_id   INTEGER NOT NULL REFERENCES army_list_units(id) ON DELETE CASCADE,
    enhancement_name    TEXT NOT NULL,
    enhancement_points  INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Pattern 3: Ghost unit branching in getArmyListWithUnits
[CITED: D-06 decision; follows existing LEFT JOIN + COALESCE pattern from armyLists.ts]

```typescript
// Key JOIN changes from current armyLists.ts:
// 1. INNER JOIN → LEFT JOIN on units
// 2. COALESCE(u.name, alu.ghost_unit_name) AS unit_name
// 3. CASE WHEN for synced_unit_points join key
// 4. LEFT JOIN synced_unit_point_tiers for tier.points

`SELECT
   alu.id, alu.list_id, alu.unit_id, alu.ghost_unit_name,
   alu.is_warlord, alu.selected_model_count, alu.leader_attached_to_id,
   alu.points_override, alu.notes, alu.tactical_role, alu.created_at,
   COALESCE(u.name, alu.ghost_unit_name) AS unit_name,
   u.points AS unit_points,
   u.faction_id,
   u.status_assembly,
   u.status_painting,
   u.painting_percentage,
   sup.points AS synced_points,
   uo.points AS override_points,
   tier.points AS tier_points,
   COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0) AS effective_points
 FROM army_list_units alu
 LEFT JOIN units u ON u.id = alu.unit_id
 LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
 LEFT JOIN synced_unit_points sup
   ON sup.unit_name = COALESCE(u.name, alu.ghost_unit_name)
   AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))
 LEFT JOIN synced_unit_point_tiers tier
   ON tier.unit_name = COALESCE(u.name, alu.ghost_unit_name)
   AND tier.model_count = alu.selected_model_count
   AND (tier.faction_id IS NULL OR tier.faction_id = CAST(u.faction_id AS TEXT))
 WHERE alu.list_id = $1
 ORDER BY alu.created_at ASC, alu.id ASC`
```

### Pattern 4: setWarlord two-step UPDATE
[CITED: D-10 decision; mirrors activateLoadout pattern from unitLoadouts.ts lines 68–76]

```typescript
// src/db/queries/armyLists.ts
export async function setWarlord(armyListUnitId: number, listId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE army_list_units
        SET is_warlord = CASE WHEN id = $1 THEN 1 ELSE 0 END
      WHERE list_id = $2`,
    [armyListUnitId, listId],
  );
}

export async function clearWarlord(listId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE army_list_units SET is_warlord = 0 WHERE list_id = $1`,
    [listId],
  );
}
```

### Pattern 5: Dedicated NULL-clear functions (D-13)
[CITED: clearArmyListDetachment / clearArmyListPointsLimit pattern — armyLists.ts lines 119–145]

```typescript
export async function clearLeaderAttachment(armyListUnitId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET leader_attached_to_id = NULL WHERE id = $1",
    [armyListUnitId],
  );
}

export async function clearSelectedModelCount(armyListUnitId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET selected_model_count = NULL WHERE id = $1",
    [armyListUnitId],
  );
}
```

### Pattern 6: resolveUnitPoints extended for tier_points
[CITED: resolveUnitPoints.ts — must maintain strict != null (not truthiness) for 0-valid-value contract]

```typescript
// New parameter added between synced_points and override_points
export function resolveUnitPoints(row: {
  points_override: number | null;
  tier_points: number | null;      // NEW — from synced_unit_point_tiers
  synced_points: number | null;
  override_points: number | null;
  unit_points: number | null;
}): ResolvedPoints {
  if (row.points_override != null) return { points: row.points_override, source: "override" };
  if (row.tier_points != null)     return { points: row.tier_points,     source: "tier" };     // NEW
  if (row.synced_points != null)   return { points: row.synced_points,   source: "synced" };
  if (row.override_points != null) return { points: row.override_points, source: "user-override" };
  if (row.unit_points != null)     return { points: row.unit_points,     source: "base" };
  return { points: 0, source: "unknown" };
}
// PointsSource union gains "tier"
export type PointsSource = "override" | "tier" | "synced" | "user-override" | "base" | "unknown";
```

### Pattern 7: getArmyListReadiness updated COALESCE
[CITED: armyLists.ts lines 223–245 — must match getArmyListWithUnits atomically]

```typescript
// Same LEFT JOIN additions as getArmyListWithUnits; ghost units handled via LEFT JOIN units
`SELECT al.id,
   SUM(COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0)) AS total_points,
   SUM(CASE WHEN u.status_painting = 'Completed'
            THEN COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0)
            ELSE 0 END) AS battle_ready_points
 FROM army_lists al
 JOIN army_list_units alu ON alu.list_id = al.id
 LEFT JOIN units u ON u.id = alu.unit_id
 LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
 LEFT JOIN synced_unit_points sup
   ON sup.unit_name = COALESCE(u.name, alu.ghost_unit_name)
   AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))
 LEFT JOIN synced_unit_point_tiers tier
   ON tier.unit_name = COALESCE(u.name, alu.ghost_unit_name)
   AND tier.model_count = alu.selected_model_count
   AND (tier.faction_id IS NULL OR tier.faction_id = CAST(u.faction_id AS TEXT))
 WHERE al.id IN (${placeholders})
 GROUP BY al.id`
// Note: ghost units have u.status_painting = NULL → CASE WHEN evaluates to ELSE 0 (correct)
```

### Pattern 8: addGhostUnitToList
[CITED: D-04 decision; addUnitToList pattern from armyLists.ts line 153]

```typescript
export interface AddGhostUnitToListInput {
  list_id: number;
  ghost_unit_name: string;
  points_override?: number | null;
  notes?: string | null;
}

export async function addGhostUnitToList(input: AddGhostUnitToListInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO army_list_units (list_id, unit_id, ghost_unit_name, points_override, notes)
     VALUES ($1, NULL, $2, $3, $4)`,
    [input.list_id, input.ghost_unit_name, input.points_override ?? null, input.notes ?? null],
  );
  return result.lastInsertId ?? 0;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unit_id NOT NULL REFERENCES units(id)` | `unit_id NULL REFERENCES units(id)` + `ghost_unit_name` | Phase 89 | Enables planned units without polluting the units table |
| 5-level COALESCE: override → synced → user-override → base → 0 | 6-level COALESCE: override → **tier** → synced → user-override → base → 0 | Phase 89 | Model-count-based points resolution from synced_unit_point_tiers |
| No warlord tracking in schema | `is_warlord INTEGER NOT NULL DEFAULT 0` | Phase 89 | DL-04 requirement; one-per-list enforcement in mutation layer |
| Enhancements not tracked per list | `army_list_enhancements` join table | Phase 89 | Supports Phase 91 enhancement assignment UI |

**The current `getArmyListWithUnits` uses `ORDER BY alu.created_at ASC`** which is already correct for DL-03. The only gap is the same-second tiebreaker: `created_at` stores second-level precision (`datetime('now')`). Adding `alu.id ASC` as a tiebreaker is safe because `id` is `AUTOINCREMENT` — guaranteed monotonically increasing even within the same second. [VERIFIED: SQLite AUTOINCREMENT guarantees from SQLite documentation — AUTOINCREMENT prevents reuse of prior max rowid; IDs are strictly increasing per table]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Ghost unit `status_painting` being NULL is correctly handled by `getArmyListReadiness` CASE WHEN (evaluates to 0 battle-ready points) | Code Examples #7 | Ghost units would incorrectly contribute to or subtract from battle_ready_points |
| A2 | SQLite evaluates self-referential FK in `army_list_units.leader_attached_to_id` at row write time, not table creation time, so the rename-create-copy-drop sequence is valid | Common Pitfalls #6 | Migration would fail at the CREATE TABLE step if SQLite validates self-referential FKs eagerly |
| A3 | `synced_unit_point_tiers` faction_id is stored as TEXT (cast from INTEGER faction_id), consistent with how `synced_unit_points` faction_id is used | Code Examples #3 | Tier join would return NULL for all real units, making `tier.points` always NULL |

Note on A3: This is [VERIFIED] from reading `029_synced_point_tiers.sql` (faction_id TEXT) and the existing join pattern in `armyLists.ts` line 70 `CAST(u.faction_id AS TEXT)`. Included in the log for planner awareness, not as a true uncertainty.

---

## Open Questions

1. **getArmyListUnitNames helper function (armyLists.ts line 30)**
   - What we know: it has `JOIN units u ON u.id = alu.unit_id` (INNER JOIN), so ghost rows will be silently excluded after Phase 89.
   - What's unclear: whether this function is used downstream in a way that requires ghost units to appear.
   - Recommendation: Update to `LEFT JOIN units u ON u.id = alu.unit_id` and use `COALESCE(u.name, alu.ghost_unit_name) AS unit_name`. Low risk; the function is only used for delta impact analysis (confirmed in comment: "Lightweight projection... for delta impact analysis").

2. **army_list_enhancements CASCADE vs RESTRICT for army_list_unit_id**
   - What we know: D-01 specifies `army_list_unit_id FK` with CASCADE deletion (removing a unit from list removes its enhancements).
   - What's unclear: no decision explicitly states ON DELETE action.
   - Recommendation: `ON DELETE CASCADE` on `army_list_unit_id` — same as `army_list_units.list_id` relationship. Removing a unit from the list should remove its assigned enhancements.

---

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. This phase is purely SQL migration + TypeScript query layer changes within the existing Tauri + SQLite stack.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vitest.config.ts (existing) |
| Quick run command | `pnpm test -- tests/army-list/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DL-03 | `getArmyListWithUnits` query uses `ORDER BY alu.created_at ASC, alu.id ASC` | unit (mock DB) | `pnpm test -- tests/army-list/armyListQueries.test.ts` | ✅ (extend existing) |
| DL-04 | `setWarlord` sends two-step UPDATE with correct list scoping | unit (mock DB) | `pnpm test -- tests/army-list/armyListQueries.test.ts` | ✅ (extend existing) |
| D-08/D-09 | `resolveUnitPoints` handles `tier_points` at correct priority level, preserves 0-as-valid-value | unit (pure function) | `pnpm test -- tests/lib/resolveUnitPoints.test.ts` | ✅ (extend existing) |
| D-04 | `addGhostUnitToList` inserts with `unit_id = NULL` and `ghost_unit_name` set | unit (mock DB) | `pnpm test -- tests/army-list/armyListQueries.test.ts` | ✅ (extend existing) |
| D-01 | `addEnhancement` / `removeEnhancement` execute correct SQL against `army_list_enhancements` | unit (mock DB) | `pnpm test -- tests/army-list/armyListEnhancements.test.ts` | ❌ Wave 0 |
| D-13 | `clearLeaderAttachment` / `clearSelectedModelCount` send NULL-SET UPDATE | unit (mock DB) | `pnpm test -- tests/army-list/armyListQueries.test.ts` | ✅ (extend existing) |
| TypeScript | `ArmyListUnitRow` type includes all new fields (`ghost_unit_name`, `is_warlord`, `tier_points`, `leader_attached_to_id`, `selected_model_count`) | type (compile check) | `pnpm build` | ✅ compile-time |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/army-list/ tests/lib/resolveUnitPoints.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/army-list/armyListEnhancements.test.ts` — covers D-01 (army_list_enhancements CRUD functions)

---

## Security Domain

This phase adds no authentication, session management, user input from external sources, or cryptographic operations. The only input is integers and text from the local SQLite database. The existing FK constraints with ON DELETE CASCADE/SET NULL enforce referential integrity. No ASVS categories apply beyond V5 Input Validation (parameterized $1/$2 queries — already the project standard throughout). Security section abbreviated accordingly.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `src/db/queries/armyLists.ts` — COALESCE chain (3 sites: lines 65, 232, resolveUnitPoints.ts), clearArmyListDetachment/clearArmyListPointsLimit patterns, getArmyListWithUnits JOIN structure, getArmyListReadiness
- `src/types/armyList.ts` — ArmyListUnit, ArmyListUnitRow interfaces, existing field inventory
- `src/hooks/useArmyLists.ts` — cache key definitions, invalidation patterns, mutation hook structure
- `src/lib/resolveUnitPoints.ts` — current 4-parameter if-chain, PointsSource union, 0-as-valid-value contract
- `src-tauri/migrations/001_core_schema.sql` — original army_list_units columns
- `src-tauri/migrations/025_tactical_role.sql` — tactical_role column addition (must be preserved in recreation)
- `src-tauri/migrations/029_synced_point_tiers.sql` — synced_unit_point_tiers schema (unit_name, faction_id TEXT, model_count, points)
- `src-tauri/migrations/030_bsdata_extended.sql` — synced_enhancements schema (confirmed TEXT fields, no integer FKs)
- `src-tauri/src/lib.rs` — migration registration pattern, current highest migration version = 30, next = 31
- `src/db/queries/unitLoadouts.ts` lines 68–76 — `activateLoadout` two-step pattern template for `setWarlord`
- `.planning/research/PITFALLS.md` — 14 domain-specific pitfalls with in-project evidence
- `.planning/phases/89-schema-data-layer/89-CONTEXT.md` — locked decisions D-01 through D-13

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — DL-03, DL-04 requirement text and traceability
- `.planning/STATE.md` — accumulated context and decisions from v0.2.18 milestone start

---

## Metadata

**Confidence breakdown:**
- Migration strategy: HIGH — derived directly from reading all 30 prior migrations and the exact column history
- COALESCE chain: HIGH — all three sites identified by direct file inspection, not search
- Ghost unit query pattern: HIGH — based on reading the current INNER JOIN and working through the LEFT JOIN + CASE WHEN alternative
- TypeScript types: HIGH — derived from reading existing interfaces and extending them
- Test coverage: HIGH — existing test patterns are clear and the new tests follow the same mock-DB structure

**Research date:** 2026-05-20
**Valid until:** Stable — this is internal codebase analysis; no external documentation expires
