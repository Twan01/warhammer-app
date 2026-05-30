# Phase 106: Army List Simplification - Pattern Map

**Mapped:** 2026-05-30
**Files analyzed:** 17
**Analogs found:** 15 / 17

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/queries/armyLists.ts` | query-module | CRUD | self (lines 60-93, 406-432) | exact |
| `src/types/armyList.ts` | model | type-def | self (lines 54-69) | exact |
| `src/lib/resolveUnitPoints.ts` | utility | transform | self (lines 31-44) | exact |
| `src/lib/computeUnitWarnings.ts` | utility | transform | self (lines 53-67, 78-93) | exact |
| `src/db/queries/syncedUnitPoints.ts` | query-module | CRUD | DELETE entire file | n/a |
| `src/db/queries/unitRulesMapping.ts` | query-module | CRUD | self (lines 93-107) | exact |
| `src/hooks/useLoadoutOptions.ts` | hook | request-response | self (lines 36-51) | exact |
| `src/hooks/useRulesSync.ts` | hook | request-response | self (lines 27, 362, 380) | exact |
| `src/components/common/DbHealthGate.tsx` | component | request-response | self (lines 55-125) | exact |
| `src/db/queries/diagnostics.ts` | query-module | CRUD | self (lines 18-69, 127-164) | exact |
| `src/db/queries/units.ts` | query-module | CRUD | self (lines 19-35) | exact |
| `src/db/queries/dashboard.ts` | query-module | CRUD | self (lines 86-105) | exact |
| `src/features/data-health/TableCountsGrid.tsx` | component | request-response | self (line 19) | exact |
| `src/features/rules-hub/DatasheetPointsTab.tsx` | component | request-response | self (lines 4, 28) | exact |
| `src/features/army-lists/ArmyListUnitRow.tsx` | component | request-response | self (lines 31, 115-120) | exact |
| `src/types/unit.ts` | model | type-def | self (lines 67-74) | exact |
| `src-tauri/migrations/040_drop_synced_points.sql` | migration | batch | `src-tauri/migrations/039_collection_udb_link.sql` | role-match |

## Pattern Assignments

### `src/db/queries/armyLists.ts` (query-module, CRUD) -- REWRITE 2 queries

**Analog:** Self -- rewrite in place

**Current COALESCE chain** (lines 79, 414):
```typescript
// CURRENT (6-level, name-based joins):
COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0) AS effective_points

// Lines 83-88: name-based LEFT JOINs being replaced
LEFT JOIN unit_rules_mapping urm ON urm.unit_id = u.id
LEFT JOIN synced_unit_points sup
  ON sup.unit_name = COALESCE(urm.datasheet_name, u.name, alu.ghost_unit_name)
LEFT JOIN synced_unit_point_tiers tier
  ON tier.unit_name = COALESCE(urm.datasheet_name, u.name, alu.ghost_unit_name)
  AND tier.model_count = alu.selected_model_count
```

**New COALESCE chain pattern** (replaces above):
```sql
-- FK-based LEFT JOINs (deterministic, no name matching)
LEFT JOIN udb_units udb ON udb.id = u.udb_unit_id
LEFT JOIN udb_unit_points udb_tier
  ON udb_tier.unit_id = u.udb_unit_id
  AND udb_tier.model_count = alu.selected_model_count
LEFT JOIN udb_unit_points udb_base
  ON udb_base.unit_id = u.udb_unit_id
  AND udb_base.model_count = (
    SELECT MIN(model_count)
    FROM udb_unit_points
    WHERE unit_id = u.udb_unit_id
  )

-- New projections:
udb_tier.points AS tier_points,
udb_base.points AS udb_base_points,
udb.role AS udb_role,
(SELECT GROUP_CONCAT(keyword, ',')
 FROM udb_unit_keywords
 WHERE unit_id = u.udb_unit_id AND is_faction = 0
) AS udb_keywords,
COALESCE(alu.points_override, udb_tier.points, udb_base.points, uo.points, u.points, 0) AS effective_points
```

**Columns removed from projection:**
- `canonical_name` (line 68) -- was only used as join key for synced tables
- `synced_points` (line 76) -- replaced by `udb_base_points`

**Columns added to projection:**
- `udb_base_points` (from `udb_unit_points` base tier)
- `udb_role` (from `udb_units.role`)
- `udb_keywords` (from GROUP_CONCAT on `udb_unit_keywords`)

**JOINs removed:**
- `LEFT JOIN unit_rules_mapping urm ON urm.unit_id = u.id` (line 83)
- `LEFT JOIN synced_unit_points sup ...` (lines 84-85)
- `LEFT JOIN synced_unit_point_tiers tier ...` (lines 86-88)

**Both queries must change:** `getArmyListWithUnits` (line 60) and `getArmyListReadiness` (line 406). The readiness query uses the same COALESCE pattern at lines 413-414 and the same synced JOINs at lines 422-427.

**Import block** (line 1-12) -- no change needed, types come from `@/types/armyList`.

---

### `src/types/armyList.ts` (model, type-def) -- MODIFY ArmyListUnitRow

**Analog:** Self

**Current type** (lines 54-69):
```typescript
export interface ArmyListUnitRow extends ArmyListUnit {
  unit_name: string;
  canonical_name: string | null;       // REMOVE
  unit_points: number | null;
  effective_points: number;
  faction_id: number | null;
  unit_category: string | null;
  unit_model_count: number | null;
  status_assembly: number | null;
  status_painting: string | null;
  painting_percentage: number | null;
  tactical_role: string | null;
  synced_points: number | null;        // REMOVE -- replace with udb_base_points
  override_points: number | null;
  tier_points: number | null;          // KEEP -- now from udb_unit_points tier
}
```

**New fields to add:**
```typescript
  udb_base_points: number | null;  // from udb_unit_points (min tier fallback)
  udb_role: string | null;         // from udb_units.role (e.g. "Battleline", "Character")
  udb_keywords: string | null;     // comma-separated from udb_unit_keywords (non-faction)
```

**Fields to remove:**
- `canonical_name: string | null` -- only used as join key for synced tables
- `synced_points: number | null` -- replaced by `udb_base_points`

---

### `src/lib/resolveUnitPoints.ts` (utility, transform) -- SIMPLIFY

**Analog:** Self

**Current chain** (lines 31-44):
```typescript
export type PointsSource = "override" | "tier" | "synced" | "user-override" | "base" | "unknown";

export function resolveUnitPoints(row: {
  points_override: number | null;
  tier_points: number | null;    // from synced_unit_point_tiers (Phase 89)
  synced_points: number | null;
  override_points: number | null;
  unit_points: number | null;
}): ResolvedPoints {
  if (row.points_override != null) return { points: row.points_override, source: "override" };
  if (row.tier_points != null)     return { points: row.tier_points,     source: "tier" };
  if (row.synced_points != null)   return { points: row.synced_points,   source: "synced" };
  if (row.override_points != null) return { points: row.override_points, source: "user-override" };
  if (row.unit_points != null)     return { points: row.unit_points,     source: "base" };
  return { points: 0, source: "unknown" };
}
```

**New chain:**
```typescript
export type PointsSource = "override" | "tier" | "database" | "user-override" | "base" | "unknown";

export function resolveUnitPoints(row: {
  points_override: number | null;
  tier_points: number | null;       // from udb_unit_points (tier match)
  udb_base_points: number | null;   // from udb_unit_points (min tier)
  override_points: number | null;   // from unit_overrides
  unit_points: number | null;       // from units.points
}): ResolvedPoints {
  if (row.points_override != null)  return { points: row.points_override,  source: "override" };
  if (row.tier_points != null)      return { points: row.tier_points,      source: "tier" };
  if (row.udb_base_points != null)  return { points: row.udb_base_points,  source: "database" };
  if (row.override_points != null)  return { points: row.override_points,  source: "user-override" };
  if (row.unit_points != null)      return { points: row.unit_points,      source: "base" };
  return { points: 0, source: "unknown" };
}
```

**Changes:** `synced_points` param -> `udb_base_points`; `"synced"` source -> `"database"` source.

---

### `src/lib/computeUnitWarnings.ts` (utility, transform) -- EXTEND

**Analog:** Self

**Existing unit warning pattern** (lines 53-67):
```typescript
export function computeUnitWarnings(
  unit: Pick<ArmyListUnitRow, "effective_points" | "points_override" | "status_painting" | "status_assembly">,
  _context: WarningContext,
): UnitWarnings {
  const hard: string[] = [];
  const soft: string[] = [];
  if (unit.status_painting !== "Completed") soft.push("Not painted");
  if (unit.status_assembly === 0) soft.push("Not assembled");
  if (unit.points_override !== null) soft.push("Manual override");
  if (unit.effective_points === 0) soft.push("Unknown points");
  return { hard, soft };
}
```

**Extension pattern -- add `udb_role` to Pick, add role-based soft warning:**
```typescript
// Add udb_role to the Pick type
unit: Pick<ArmyListUnitRow, "effective_points" | "points_override" | "status_painting" | "status_assembly" | "udb_role" | "unit_id">,
// Skip role validation for unlinked/ghost units (D-09)
```

**Existing list warning pattern** (lines 78-93):
```typescript
export function computeListWarnings(context: WarningContext): UnitWarnings {
  const hard: string[] = [];
  const soft: string[] = [];
  if (context.pointsLimit !== null && context.totalPoints > context.pointsLimit) {
    hard.push("Points exceeded");
  }
  if (context.freshness === "stale" || context.freshness === "never") {
    soft.push("Stale points data");
  }
  return { hard, soft };
}
```

**Extension pattern -- add BATTLELINE count check to `computeListWarnings`:**
The function signature must be extended to accept a units array with `udb_role` fields. Follow the same `hard`/`soft` push pattern.

---

### `src/db/queries/syncedUnitPoints.ts` (query-module) -- DELETE

Entire file deleted. All 7 exports removed:
- `replaceSyncedUnitPoints`
- `replaceSyncedUnitPointTiers`
- `getPointTiersByFaction`
- `getTiersByUnitName`
- `getSyncedUnitPointsList`
- `getSyncedUnitPointsMap`

---

### `src/db/queries/unitRulesMapping.ts` (query-module, CRUD) -- MODIFY

**Analog:** Self

**Function to delete** (lines 93-107):
```typescript
export async function findMatchingDatasheets(
  unitName: string,
  _factionId: number | null,
): Promise<Array<{ unit_name: string; faction_id: string | null; points: number }>> {
  const db = await getDb();
  return db.select(
    `SELECT unit_name, faction_id, points
     FROM synced_unit_points
     WHERE unit_name = $1
       OR unit_name LIKE $2 ESCAPE '\\'`,
    [unitName, `%${escapeLike(unitName)}%`],
  );
}
```

**Keep all other functions** (getUnitRulesMapping, getUnitRulesMappings, upsertUnitRulesMapping, deleteUnitRulesMapping, findRulesDatasheets, getDatasheetRoleForUnit).

---

### `src/hooks/useLoadoutOptions.ts` (hook, request-response) -- REWRITE useTiersByUnitName

**Analog:** Self

**Current hook** (lines 36-51):
```typescript
import { getTiersByUnitName } from "@/db/queries/syncedUnitPoints";

export function useTiersByUnitName(
  unitName: string | undefined,
  factionId: string | null | undefined,
) {
  return useQuery({
    queryKey: unitName !== undefined
      ? SYNCED_TIERS_BY_NAME_KEY(unitName, factionId ?? null)
      : (["synced-tiers-by-name"] as const),
    queryFn: () =>
      unitName !== undefined
        ? getTiersByUnitName(unitName, factionId ?? null)
        : Promise.resolve([]),
    enabled: unitName !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Replacement:** Change import source from `syncedUnitPoints` to a new query function (e.g., `getUdbTiersByUnitId` in `armyLists.ts` or a new export). The hook signature should accept `udbUnitId: string | undefined` instead of `unitName` + `factionId` since FK-based lookups use the ID, not the name. Update query key accordingly.

**New query function pattern** (follows existing query module style from `armyLists.ts`):
```typescript
export async function getUdbTiersByUnitId(
  udbUnitId: string,
): Promise<Array<{ model_count: number; points: number }>> {
  const db = await getDb();
  return db.select(
    `SELECT model_count, points
     FROM udb_unit_points
     WHERE unit_id = $1
     ORDER BY model_count ASC`,
    [udbUnitId],
  );
}
```

---

### `src/hooks/useRulesSync.ts` (hook, request-response) -- MODIFY

**Analog:** Self

**Lines to remove:**
- Line 27: `import { replaceSyncedUnitPoints, replaceSyncedUnitPointTiers } from "@/db/queries/syncedUnitPoints";`
- Line 362: `await replaceSyncedUnitPoints(cacheRows, syncedAt);`
- Line 380: `await replaceSyncedUnitPointTiers(tierRows, syncedAt);`

Also remove the `normalizePointsNames` import (line 39) and its call if it only served the synced cache.

---

### `src/components/common/DbHealthGate.tsx` (component, request-response) -- MODIFY

**Analog:** Self

**Lines to remove:** The entire synced_unit_points repair block (lines 55-125), which includes:
- Import of `replaceSyncedUnitPoints` (line 4)
- Import of `normalizePointsNames` (line 5)
- ~70 lines of repair logic checking and repopulating the synced cache

**Line to update:**
```typescript
// Line 12: Update schema version
export const EXPECTED_SCHEMA_VERSION = 40;  // was 38
```

---

### `src/db/queries/diagnostics.ts` (query-module, CRUD) -- MODIFY

**Analog:** Self

**TableCounts interface** (lines 18-25) -- remove `synced_unit_points`:
```typescript
export interface TableCounts {
  units: number;
  painting_recipes: number;
  unit_recipe_assignments: number;
  unit_recipe_step_progress: number;
  // REMOVE: synced_unit_points: number;
}
```

**getTableCounts** (lines 45-69) -- remove the `synced_unit_points` COUNT query from Promise.all and from the return object.

**getAmbiguousPointMatches** (lines 127-164) -- rewrite to use `udb_unit_points` instead of `synced_unit_points`. The new query should join `units` via `u.udb_unit_id` to `udb_unit_points` and check for units with no matching points entry.

---

### `src/db/queries/units.ts` (query-module, CRUD) -- MODIFY getUnitsWithPoints

**Analog:** Self

**Current query** (lines 19-35):
```typescript
export async function getUnitsWithPoints(): Promise<EnrichedUnit[]> {
  const db = await getDb();
  const rows = await db.select<Array<Unit & { synced_points: number | null }>>(
    `SELECT u.*,
            sup.points AS synced_points
     FROM units u
     LEFT JOIN unit_rules_mapping urm ON urm.unit_id = u.id
     LEFT JOIN synced_unit_points sup
       ON sup.unit_name = COALESCE(urm.datasheet_name, u.name)
     ORDER BY u.name ASC`,
  );
  return rows.map((row) => ({
    ...row,
    effective_points: row.points ?? row.synced_points ?? 0,
    is_synced: row.synced_points !== null,
  }));
}
```

**Replacement pattern:** Join via `u.udb_unit_id` to `udb_unit_points` (MIN model_count for base points). Replace `is_synced` with `is_linked` (based on `udb_unit_id IS NOT NULL`).

---

### `src/db/queries/dashboard.ts` (query-module, CRUD) -- MODIFY getArmyReadinessByFaction

**Analog:** Self

**Current query** (lines 86-105):
```typescript
LEFT JOIN synced_unit_points sup ON sup.unit_name = u.name
  AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))
// COALESCE: COALESCE(sup.points, uo.points, u.points, 0)
```

**Replacement:** Join via `u.udb_unit_id` to `udb_unit_points` (MIN model_count for base points). Replace `sup.points` with `udb_base.points` in the COALESCE chain.

---

### `src/features/data-health/TableCountsGrid.tsx` (component) -- MODIFY

**Line to remove** (line 19):
```typescript
{ key: "synced_unit_points", label: "Synced Points" },
```

---

### `src/features/rules-hub/DatasheetPointsTab.tsx` (component) -- MODIFY

**Import to replace** (line 4):
```typescript
// CURRENT:
import { getPointTiersByFaction } from "@/db/queries/syncedUnitPoints";
// REPLACE WITH query against udb_unit_points via udb_units.faction_id
```

---

### `src/features/army-lists/ArmyListUnitRow.tsx` (component) -- MODIFY

**Import and usage to remove** (lines 31, 115-120):
```typescript
// Line 31: REMOVE
import { findMatchingDatasheets } from "@/db/queries/unitRulesMapping";

// Lines 115-120: REMOVE entire useQuery block for ambiguity detection
const { data: matchingDatasheets } = useQuery({
  queryKey: ["matching-datasheets", unit.unit_name, unit.faction_id],
  queryFn: () => findMatchingDatasheets(unit.unit_name, unit.faction_id),
  staleTime: 5 * 60 * 1000,
});
const ambiguousCount = matchingDatasheets?.length ?? 0;
```

**Replacement:** With FK-based joins, ambiguity is eliminated. Replace with a simple `udb_unit_id IS NULL` check if unlinked status needs display.

---

### `src/types/unit.ts` (model, type-def) -- MODIFY EnrichedUnit

**Current** (lines 67-74):
```typescript
export interface EnrichedUnit extends Unit {
  effective_points: number;
  synced_points: number | null;  // RENAME/REPLACE
  is_synced: boolean;            // RENAME to is_linked
}
```

**New:**
```typescript
export interface EnrichedUnit extends Unit {
  effective_points: number;
  udb_base_points: number | null;  // from udb_unit_points (min tier)
  is_linked: boolean;              // udb_unit_id IS NOT NULL
}
```

---

### `src-tauri/migrations/040_drop_synced_points.sql` (migration) -- CREATE

**Analog:** `src-tauri/migrations/039_collection_udb_link.sql` (latest migration, same pattern)

**Pattern:** Migration files are plain SQL, no header boilerplate. End with PRAGMA user_version bump.
```sql
-- Drop synced_unit_points cache tables (Phase 106, ALI-03)
-- Points are now resolved via FK join to udb_unit_points
DROP TABLE IF EXISTS synced_unit_points;
DROP TABLE IF EXISTS synced_unit_point_tiers;

PRAGMA user_version = 40;
```

---

## Shared Patterns

### Query Module Pattern (getDb + parameterized SELECT)
**Source:** `src/db/queries/armyLists.ts` lines 60-93
**Apply to:** All query module modifications (armyLists, units, dashboard, diagnostics)
```typescript
import { getDb } from "@/db/client";

export async function queryFunction(param: number): Promise<ResultType[]> {
  const db = await getDb();
  return db.select<ResultType[]>(
    `SELECT ... FROM ... WHERE id = $1`,
    [param],
  );
}
```

### Pure Warning Function Pattern
**Source:** `src/lib/computeUnitWarnings.ts` lines 53-67
**Apply to:** New BATTLELINE count warning and role-based warnings
```typescript
export function computeWarnings(
  data: Pick<ArmyListUnitRow, "field1" | "field2">,
  _context: WarningContext,
): UnitWarnings {
  const hard: string[] = [];
  const soft: string[] = [];
  // condition checks -> push to hard or soft
  return { hard, soft };
}
```

### React Query Hook Pattern
**Source:** `src/hooks/useLoadoutOptions.ts` lines 36-51
**Apply to:** Rewritten tier hook
```typescript
export const QUERY_KEY = (id: string) => ["key-name", id] as const;

export function useHookName(id: string | undefined) {
  return useQuery({
    queryKey: id !== undefined ? QUERY_KEY(id) : (["key-name"] as const),
    queryFn: () => id !== undefined ? queryFn(id) : Promise.resolve([]),
    enabled: id !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}
```

### FK-Based JOIN Pattern (new, replaces name-based)
**Source:** `src-tauri/migrations/038_udb_schema.sql` lines 76-82 + `039_collection_udb_link.sql`
**Apply to:** All queries that previously joined via `synced_unit_points`
```sql
-- Join through units.udb_unit_id (TEXT FK to udb_units.id)
LEFT JOIN udb_unit_points udb_base
  ON udb_base.unit_id = u.udb_unit_id
  AND udb_base.model_count = (
    SELECT MIN(model_count)
    FROM udb_unit_points
    WHERE unit_id = u.udb_unit_id
  )
```

### COALESCE Chain Invariant
**Source:** `src/lib/resolveUnitPoints.ts` lines 31-44
**Apply to:** SQL queries AND the JS resolver -- both MUST have identical ordering
```
SQL:  COALESCE(alu.points_override, udb_tier.points, udb_base.points, uo.points, u.points, 0)
JS:   override -> tier -> database -> user-override -> base -> unknown
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | -- | -- | All files are modifications of existing code with clear self-analogs |

## Metadata

**Analog search scope:** `src/db/queries/`, `src/lib/`, `src/types/`, `src/hooks/`, `src/features/`, `src/components/common/`, `src-tauri/migrations/`
**Files scanned:** 17 files to modify/create, all with existing analogs (self or sibling)
**Pattern extraction date:** 2026-05-30
