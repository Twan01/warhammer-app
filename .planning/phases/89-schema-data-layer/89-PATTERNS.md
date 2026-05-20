# Phase 89: Schema + Data Layer - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 6 (1 new SQL file, 4 modified TS files, 1 modified Rust file)
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src-tauri/migrations/031_army_list_v3.sql` | migration | batch | `src-tauri/migrations/025_tactical_role.sql` + `029_synced_point_tiers.sql` | role-match |
| `src-tauri/src/lib.rs` | config | batch | itself (lines 178–187, version 30 entry) | exact |
| `src/db/queries/armyLists.ts` | service | CRUD + request-response | itself (existing functions) | exact |
| `src/types/armyList.ts` | model | — | itself (existing interfaces) | exact |
| `src/lib/resolveUnitPoints.ts` | utility | transform | itself (current 4-param if-chain) | exact |
| `src/hooks/useArmyLists.ts` | hook | request-response | itself (existing mutation hooks) | exact |

---

## Pattern Assignments

### `src-tauri/migrations/031_army_list_v3.sql` (migration, batch)

**Primary analog:** `src-tauri/migrations/025_tactical_role.sql` (additive ALTER) and the rename-create-copy-drop pattern established for SQLite.

**Full column inventory to preserve** — reconstruct from 001 + 025:
```
From 001_core_schema.sql:
  id, list_id, unit_id, points_override, notes, created_at

From 025_tactical_role.sql:
  tactical_role

Phase 89 additions:
  ghost_unit_name, is_warlord, selected_model_count, leader_attached_to_id
```

**Table recreation pattern** (rename-create-copy-drop, all in one file):
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

-- Step 3: Copy all existing data
INSERT INTO army_list_units (id, list_id, unit_id, ghost_unit_name, is_warlord,
    selected_model_count, leader_attached_to_id, points_override, notes, tactical_role, created_at)
SELECT id, list_id, unit_id, NULL, 0, NULL, NULL, points_override, notes, tactical_role, created_at
FROM army_list_units_old;

-- Step 4: Drop old table
DROP TABLE army_list_units_old;
```

**New join table pattern** (follows `synced_enhancements` TEXT-copy denormalization from `030_bsdata_extended.sql` lines 4–12):
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

**synced_unit_point_tiers schema reference** (`029_synced_point_tiers.sql` lines 1–12):
```sql
-- faction_id is TEXT (not INTEGER) — CAST(u.faction_id AS TEXT) required in JOIN
CREATE TABLE IF NOT EXISTS synced_unit_point_tiers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_name   TEXT NOT NULL,
  faction_id  TEXT,
  model_count INTEGER NOT NULL,
  points      INTEGER NOT NULL,
  synced_at   TEXT NOT NULL,
  UNIQUE (unit_name, faction_id, model_count)
);
```

---

### `src-tauri/src/lib.rs` (config registration)

**Analog:** The version 30 entry at lines 178–187 of `lib.rs`. Copy this block and increment to 31.

**Migration registration pattern** (lines 178–187):
```rust
Migration {
    version: 30,
    description: "bsdata_extended",
    sql: include_str!("../migrations/030_bsdata_extended.sql"),
    kind: MigrationKind::Up,
},
```

**New entry to add immediately after** (version 31):
```rust
Migration {
    version: 31,
    description: "army_list_v3",
    sql: include_str!("../migrations/031_army_list_v3.sql"),
    kind: MigrationKind::Up,
},
```

Note: `get_schema_version()` (line 938) returns `get_migrations().len() as u32`, so adding this entry automatically bumps the schema version to 31.

---

### `src/db/queries/armyLists.ts` (service, CRUD)

**Analog:** The file itself. All new functions follow patterns already established inside it.

**Imports block** (lines 1–9) — no new imports needed; `getDb` covers everything:
```typescript
import { getDb } from "@/db/client";
import type {
  ArmyList,
  ArmyListUnitRow,
  CreateArmyListInput,
  UpdateArmyListInput,
  AddUnitToListInput,
  UpdateArmyListUnitInput,
} from "@/types/armyList";
```
Add new type imports as Phase 89 types are added to `armyList.ts`.

**getArmyListWithUnits extended pattern** (currently lines 52–76):

Key changes from current (line 67: `JOIN units u ON u.id = alu.unit_id` → LEFT JOIN; line 65: 5-level COALESCE → 6-level; add tier LEFT JOIN):
```typescript
export async function getArmyListWithUnits(listId: number): Promise<ArmyListUnitRow[]> {
  const db = await getDb();
  const rows = await db.select<ArmyListUnitRow[]>(
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
     ORDER BY alu.created_at ASC, alu.id ASC`,
    [listId]
  );
  return rows;
}
```

**getArmyListReadiness extended pattern** (currently lines 223–245) — must be updated atomically with getArmyListWithUnits:
```typescript
// Change: JOIN units → LEFT JOIN units (line 238)
// Change: 5-level COALESCE → 6-level with tier.points (lines 231–234)
// Add: LEFT JOIN synced_unit_point_tiers tier (after the sup LEFT JOIN)
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
```

**getArmyListUnitNames update** (currently lines 30–41 — INNER JOIN silently drops ghost rows):
```typescript
// Change JOIN → LEFT JOIN; use COALESCE for unit_name
`SELECT al.id AS list_id, al.name AS list_name,
        COALESCE(u.name, alu.ghost_unit_name) AS unit_name
 FROM army_lists al
 JOIN army_list_units alu ON alu.list_id = al.id
 LEFT JOIN units u ON u.id = alu.unit_id
 ORDER BY al.id`
```

**setWarlord pattern** (mirrors `activateLoadout` from `unitLoadouts.ts` lines 68–76):
```typescript
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

**addGhostUnitToList pattern** (mirrors `addUnitToList` at lines 153–161):
```typescript
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

**NULL-clear functions pattern** (mirrors `clearArmyListDetachment` at lines 119–129 and `clearArmyListPointsLimit` at lines 136–145):
```typescript
export async function clearLeaderAttachment(armyListUnitId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET leader_attached_to_id = NULL WHERE id = $1",
    [armyListUnitId],
  );
}

export async function setLeaderAttachment(armyListUnitId: number, targetId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET leader_attached_to_id = $2 WHERE id = $1",
    [armyListUnitId, targetId],
  );
}

export async function clearSelectedModelCount(armyListUnitId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET selected_model_count = NULL WHERE id = $1",
    [armyListUnitId],
  );
}

export async function setSelectedModelCount(armyListUnitId: number, count: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET selected_model_count = $2 WHERE id = $1",
    [armyListUnitId, count],
  );
}
```

**army_list_enhancements CRUD pattern** (follows `addUnitToList` / `removeUnitFromList` pattern):
```typescript
export async function addEnhancement(input: AddEnhancementInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO army_list_enhancements (list_id, army_list_unit_id, enhancement_name, enhancement_points)
     VALUES ($1, $2, $3, $4)`,
    [input.list_id, input.army_list_unit_id, input.enhancement_name, input.enhancement_points],
  );
  return result.lastInsertId ?? 0;
}

export async function removeEnhancement(enhancementId: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM army_list_enhancements WHERE id = $1", [enhancementId]);
}

export async function getEnhancementsByList(listId: number): Promise<ArmyListEnhancement[]> {
  const db = await getDb();
  return db.select<ArmyListEnhancement[]>(
    "SELECT * FROM army_list_enhancements WHERE list_id = $1 ORDER BY created_at ASC",
    [listId],
  );
}
```

---

### `src/types/armyList.ts` (model)

**Analog:** The file itself. Pattern follows existing interface extension style (lines 27–54 show how `ArmyListUnitRow extends ArmyListUnit`).

**ArmyListUnit extension** (currently lines 27–35) — add new columns:
```typescript
export interface ArmyListUnit {
  id: number;
  list_id: number;
  unit_id: number | null;           // CHANGED: was number, now nullable for ghost units
  ghost_unit_name: string | null;   // NEW
  is_warlord: number;               // NEW — 0 | 1 integer per SQLite boolean pattern
  selected_model_count: number | null; // NEW
  leader_attached_to_id: number | null; // NEW
  points_override: number | null;
  notes: string | null;
  created_at: string;
}
```

**ArmyListUnitRow extension** (currently lines 43–54) — add tier_points:
```typescript
export interface ArmyListUnitRow extends ArmyListUnit {
  unit_name: string;
  unit_points: number | null;
  effective_points: number;
  faction_id: number | null;        // CHANGED: null for ghost units
  status_assembly: number | null;   // CHANGED: null for ghost units
  status_painting: string | null;   // CHANGED: null for ghost units
  painting_percentage: number | null; // CHANGED: null for ghost units
  tactical_role: string | null;
  synced_points: number | null;
  override_points: number | null;
  tier_points: number | null;       // NEW
}
```

**New interfaces** (follow `AddUnitToListInput` pattern at lines 64–69):
```typescript
export interface AddGhostUnitToListInput {
  list_id: number;
  ghost_unit_name: string;
  points_override?: number | null;
  notes?: string | null;
}

export interface ArmyListEnhancement {
  id: number;
  list_id: number;
  army_list_unit_id: number;
  enhancement_name: string;
  enhancement_points: number;
  created_at: string;
}

export interface AddEnhancementInput {
  list_id: number;
  army_list_unit_id: number;
  enhancement_name: string;
  enhancement_points: number;
}
```

---

### `src/lib/resolveUnitPoints.ts` (utility, transform)

**Analog:** The file itself (lines 1–41). Extend — do NOT replace.

**PointsSource union** (currently line 19) — add "tier":
```typescript
// Before:
export type PointsSource = "override" | "synced" | "user-override" | "base" | "unknown";
// After:
export type PointsSource = "override" | "tier" | "synced" | "user-override" | "base" | "unknown";
```

**resolveUnitPoints extended signature** (currently lines 30–41):
```typescript
export function resolveUnitPoints(row: {
  points_override: number | null;
  tier_points: number | null;      // NEW — inserted between points_override and synced_points
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
```

Critical constraint: use `!= null` (strict null check), NOT truthiness. Preserves 0-as-valid-value contract from existing tests.

---

### `src/hooks/useArmyLists.ts` (hook, request-response)

**Analog:** The file itself. All new mutation hooks follow patterns already established inside it.

**Cache key constants** (currently lines 35–47) — no new keys needed; existing set covers all new mutations:
```typescript
export const ARMY_LISTS_KEY = ["army-lists"] as const;
export const ARMY_LIST_KEY = (id: number) => ["army-lists", id] as const;
export const ARMY_LIST_UNITS_KEY = (id: number) => ["army-lists", id, "units"] as const;
export const ARMY_LIST_READINESS_KEY = (ids: number[]) =>
  ["army-list-readiness", ...[...ids].sort((a, b) => a - b)] as const;
```

**Standard invalidation set** (from `useAddUnitToList` at lines 135–147) — all new unit-level mutations must invalidate:
```typescript
onSuccess: (_, variables) => {
  qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
  qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
  qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
  qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
},
```

**useSetWarlord pattern** (mirrors `useUpdateArmyListUnit` structure at lines 183–194):
```typescript
export interface SetWarlordVariables {
  army_list_unit_id: number;
  list_id: number;
}

export function useSetWarlord() {
  const qc = useQueryClient();
  return useMutation<void, Error, SetWarlordVariables>({
    mutationFn: ({ army_list_unit_id, list_id }) => setWarlord(army_list_unit_id, list_id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}
```

**useAddGhostUnitToList pattern** (mirrors `useAddUnitToList` at lines 135–147):
```typescript
export function useAddGhostUnitToList() {
  const qc = useQueryClient();
  return useMutation<number, Error, AddGhostUnitToListInput>({
    mutationFn: addGhostUnitToList,
    onSuccess: (_insertedId, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}
```

**useAddEnhancement / useRemoveEnhancement pattern** (mirrors useAddUnitToList / useRemoveUnitFromList):
```typescript
export interface AddEnhancementVariables extends AddEnhancementInput {
  // list_id already in AddEnhancementInput — used for invalidation
}

export function useAddEnhancement() {
  const qc = useQueryClient();
  return useMutation<number, Error, AddEnhancementVariables>({
    mutationFn: addEnhancement,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}

export interface RemoveEnhancementVariables {
  enhancement_id: number;
  list_id: number;
}

export function useRemoveEnhancement() {
  const qc = useQueryClient();
  return useMutation<void, Error, RemoveEnhancementVariables>({
    mutationFn: ({ enhancement_id }) => removeEnhancement(enhancement_id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}
```

**useClearLeaderAttachment pattern** (mirrors `useClearArmyListDetachment` at lines 93–104):
```typescript
export interface ClearLeaderAttachmentVariables {
  army_list_unit_id: number;
  list_id: number;
}

export function useClearLeaderAttachment() {
  const qc = useQueryClient();
  return useMutation<void, Error, ClearLeaderAttachmentVariables>({
    mutationFn: ({ army_list_unit_id }) => clearLeaderAttachment(army_list_unit_id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}
```

---

## Shared Patterns

### DB Access
**Source:** `src/db/client.ts` (imported as `getDb`)
**Apply to:** All new query functions in `armyLists.ts`
```typescript
const db = await getDb();
// db.select<T[]>(sql, params) — returns typed array
// db.execute(sql, params) — returns { lastInsertId?: number, rowsAffected: number }
// Parameterized with $1, $2 positional syntax (NOT ?, NOT @name)
```

### Boolean Storage
**Source:** Existing pattern throughout `armyLists.ts` and `unitLoadouts.ts`
**Apply to:** `is_warlord` read/write in `armyLists.ts`
```typescript
// Storage: 0 | 1 integer
// Write: is_warlord: 1 (not true)
// Read: row.is_warlord === 1 (cast on read if needed)
// CASE WHEN pattern from activateLoadout: CASE WHEN id = $1 THEN 1 ELSE 0 END
```

### Cache Invalidation Symmetry
**Source:** `src/hooks/useArmyLists.ts` lines 135–147
**Apply to:** All new mutation hooks in `useArmyLists.ts`

Every mutation touching `army_list_units` or `army_list_enhancements` must invalidate:
- `ARMY_LIST_KEY(list_id)`
- `ARMY_LIST_UNITS_KEY(list_id)`
- `ARMY_LISTS_KEY`
- `["dashboard-stats"]`
- `["army-list-readiness"]`

Mutations that only update metadata (clear leader attachment, set model count) may omit `["dashboard-stats"]` and `ARMY_LISTS_KEY` if no aggregate changes.

### TEXT Denormalization
**Source:** `src/types/armyList.ts` lines 22–23; `030_bsdata_extended.sql` lines 4–12
**Apply to:** `army_list_enhancements` table, `ghost_unit_name` column
```typescript
// Store TEXT copies of synced data, NOT foreign keys to synced tables.
// synced tables are DELETE-all + re-INSERT on every sync.
// detachment_name TEXT — copy of name at assignment time (existing example)
// enhancement_name TEXT, enhancement_points INTEGER — snapshot at assignment time
```

### NULL-Clear Function Pattern
**Source:** `src/db/queries/armyLists.ts` lines 119–145 (`clearArmyListDetachment`, `clearArmyListPointsLimit`)
**Apply to:** `clearLeaderAttachment`, `clearSelectedModelCount`
```typescript
// Pattern: dedicated function that does SET col = NULL WHERE id = $1
// Reason: COALESCE in updateArmyList blocks NULL passthrough
// Pair with a "set" function: setLeaderAttachment(id, targetId)
// Note: army_list_units uses full-replacement UPDATE (not COALESCE) — so
// clearLeaderAttachment is actually just setting to NULL via dedicated call,
// NOT a workaround for COALESCE. Keep the same separate-function pattern anyway
// for symmetry and clarity.
```

### Strict Null Check in Pure Functions
**Source:** `src/lib/resolveUnitPoints.ts` lines 36–40
**Apply to:** `resolveUnitPoints.ts` extension
```typescript
// Use != null (not !value) so that 0 is treated as a valid value
if (row.tier_points != null) return { points: row.tier_points, source: "tier" };
// NOT: if (row.tier_points) — this would skip 0-cost units
```

---

## Testing Patterns

### Mock DB pattern
**Source:** `tests/army-list/armyListQueries.test.ts` lines 1–24 and `tests/army-list/clearArmyListDetachment.test.ts` lines 1–20

All new query function tests must mock `@/db/client` using this structure:
```typescript
const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});
```

### resolveUnitPoints test extension pattern
**Source:** `tests/lib/resolveUnitPoints.test.ts` — extend, do not replace

The existing 9 test cases validate the 4-parameter version. Phase 89 adds a 10th parameter (`tier_points`). New tests must:
1. Add `tier_points: null` to all existing test fixture objects (non-breaking — TypeScript will flag missing field)
2. Add new test cases for: tier_points at correct priority, tier_points = 0 as valid value, tier_points null falls through to synced

### SQL assertion pattern
**Source:** `tests/army-list/clearArmyListDetachment.test.ts` lines 23–42
```typescript
const [sql, params] = executeMock.mock.calls[0];
expect(sql).toMatch(/SET\s+is_warlord\s*=\s*CASE/);
expect(sql).toMatch(/WHERE\s+list_id\s*=\s*\$2/);
expect(params).toEqual([armyListUnitId, listId]);
```

### New test file for enhancements
**File to create:** `tests/army-list/armyListEnhancements.test.ts`
**Template:** Copy structure from `tests/army-list/clearArmyListDetachment.test.ts` (same mock setup, same assertion style)

---

## No Analog Found

All files have direct analogs in the codebase. No entries in this section.

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/hooks/`, `src/lib/`, `src/types/`, `src-tauri/migrations/`, `src-tauri/src/`, `tests/army-list/`, `tests/lib/`
**Files scanned:** 12 (armyLists.ts, armyList.ts, useArmyLists.ts, resolveUnitPoints.ts, unitLoadouts.ts, lib.rs, 001_core_schema.sql, 025_tactical_role.sql, 029_synced_point_tiers.sql, 030_bsdata_extended.sql, armyListQueries.test.ts, clearArmyListDetachment.test.ts, resolveUnitPoints.test.ts)
**Pattern extraction date:** 2026-05-20
