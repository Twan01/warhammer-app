# Phase 106: Army List Simplification - Research

**Researched:** 2026-05-30
**Domain:** SQLite query rewrite, data layer simplification, army list validation
**Confidence:** HIGH

## Summary

This phase rewires army list points resolution from a name-based 6-level COALESCE chain using `synced_unit_points`/`synced_unit_point_tiers` cache tables to a direct FK join through `units.udb_unit_id` -> `udb_unit_points`. It extends validation with database-sourced keywords and roles, then removes the now-dead `synced_unit_points` infrastructure.

The scope is well-defined: two SQL queries to rewrite (`getArmyListWithUnits`, `getArmyListReadiness`), one query module to delete (`syncedUnitPoints.ts`), one pure function library to extend (`computeUnitWarnings.ts`), one type to update (`ArmyListUnitRow`), one JS resolver to simplify (`resolveUnitPoints.ts`), and one migration to DROP the old cache tables. There are 8 additional call sites that reference the synced cache tables and must be updated or removed.

**Primary recommendation:** Execute in two waves -- Wave 1 rewrites the SQL queries and removes the `synced_unit_points` dependency chain; Wave 2 adds keyword/role-based validation and the DROP migration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Replace 6-level COALESCE chain with 5-level: `COALESCE(alu.points_override, udb_tier.points, udb_base.points, uo.points, u.points, 0)`. Two synced LEFT JOINs replaced by FK-based LEFT JOINs through `u.udb_unit_id` -> `udb_points`.
- **D-02:** Tier-based points join: `LEFT JOIN udb_points udb_tier ON udb_tier.unit_id = u.udb_unit_id AND udb_tier.model_count = alu.selected_model_count`.
- **D-03:** Base points join: `LEFT JOIN udb_points udb_base ON udb_base.unit_id = u.udb_unit_id AND udb_base.model_count = (SELECT MIN(model_count) FROM udb_points WHERE unit_id = u.udb_unit_id)`.
- **D-04:** Ghost units (unit_id IS NULL) resolve to 0 via final COALESCE fallback. Users can still set points_override.
- **D-05:** Same COALESCE chain change applies to both `getArmyListWithUnits()` and `getArmyListReadiness()`.
- **D-06:** Enrich `getArmyListWithUnits()` with database role (from `udb_units.role`) and keywords (from `udb_unit_keywords`).
- **D-07:** Extend `computeUnitWarnings()` with role-based warnings.
- **D-08:** Extend `computeListWarnings()` with BATTLELINE count warning (min 3 for 2000pt lists).
- **D-09:** Skip keyword/role validation for unlinked units (udb_unit_id IS NULL).
- **D-10:** DROP `synced_unit_points` and `synced_unit_point_tiers` via new migration.
- **D-11:** Delete `src/db/queries/syncedUnitPoints.ts` entirely.
- **D-12:** Remove all LEFT JOINs to synced tables across the codebase.
- **D-13:** Remove sync pipeline calls to `replaceSyncedUnitPoints()`.
- **D-14:** Keep `unit_overrides` table and query layer.
- **D-15:** Reduce `unit_rules_mapping` role -- no longer needed for points.
- **D-16:** Update or remove `findMatchingDatasheets()` based on remaining callers.

### Claude's Discretion
- SQL optimization for base points subquery (MIN model_count vs simpler approach)
- Subquery/CTE/window function for keyword enrichment
- Migration number (likely 040)
- Whether `unit_rules_mapping` can be fully removed or just simplified
- Warning message text
- Points freshness indicator approach

### Deferred Ideas (OUT OF SCOPE)
- rules.db elimination and dead sync code removal -- Phase 107
- Enhancement data from canonical database -- v2 scope
- Leader attachment validation using database data -- v2 scope
- Detachment rules validation -- future
- Points comparison view -- nice-to-have
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ALI-01 | Army list points resolved from database FK join (simplified COALESCE chain) | D-01 through D-05: rewrite `getArmyListWithUnits` and `getArmyListReadiness` SQL; update `resolveUnitPoints.ts`; update `ArmyListUnitRow` type |
| ALI-02 | Army list validation uses database keywords and roles | D-06 through D-09: enrich query with `udb_units.role` and `udb_unit_keywords`; extend `computeUnitWarnings` and `computeListWarnings` |
| ALI-03 | Remove dependency on synced_unit_points cache table | D-10 through D-16: delete module, remove all JOINs, clean up sync pipeline callers, DROP tables via migration |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Points resolution (COALESCE chain) | Database / Storage | -- | Pure SQL computation, no JS involved |
| Keyword/role enrichment | Database / Storage | -- | SQL JOIN to udb_* tables |
| Unit-level warnings | Frontend (pure lib) | -- | Pure TS function in `src/lib/computeUnitWarnings.ts` |
| List-level validation (BATTLELINE count) | Frontend (pure lib) | -- | Pure TS function, counts from query results |
| Points source labeling | Frontend (pure lib) | -- | `resolveUnitPoints.ts` mirrors SQL COALESCE in JS |
| Cache table removal | Database / Storage | Frontend (cleanup) | Migration DROPs tables; TS code deletion |

## Standard Stack

No new libraries needed. This phase is entirely internal refactoring of existing SQL queries and TypeScript pure functions.

### Core (existing, no changes)
| Library | Version | Purpose | Role in Phase |
|---------|---------|---------|---------------|
| @tauri-apps/plugin-sql | 2.2.0 | SQLite access | Executes rewritten queries |
| @tanstack/react-query | 5.x | Server state | Cache invalidation after query shape changes |
| vitest | 4.x | Testing | Tests for rewritten resolveUnitPoints and new warnings |

## Architecture Patterns

### System Architecture Diagram

```
Army List Page (UI)
       |
       v
useArmyListWithUnits hook (React Query)
       |
       v
getArmyListWithUnits() -----> SQLite (hobbyforge.db)
       |                         |
       |   NEW: FK-based JOIN    |
       |   u.udb_unit_id ------> udb_unit_points (tier + base)
       |                    +--> udb_units.role
       |                    +--> udb_unit_keywords (GROUP_CONCAT)
       |                         |
       |   REMOVED:              |
       |   synced_unit_points    |  (was name-based JOIN)
       |   synced_unit_point_tiers  (was name-based JOIN)
       |
       v
ArmyListUnitRow[] (enriched with role, keywords, effective_points)
       |
       +---> resolveUnitPoints() -- source labeling (pure TS)
       +---> computeUnitWarnings() -- unit-level warnings (pure TS)
       +---> computeListWarnings() -- list-level BATTLELINE count (pure TS)
```

### Component Responsibilities

| File | Change Type | Details |
|------|-------------|---------|
| `src/db/queries/armyLists.ts` | REWRITE | Replace 2 queries (getArmyListWithUnits, getArmyListReadiness) |
| `src/types/armyList.ts` | MODIFY | Add `udb_role`, `udb_keywords` to ArmyListUnitRow; remove `synced_points` |
| `src/lib/resolveUnitPoints.ts` | SIMPLIFY | Remove `synced_points` level; rename `tier_points` source from "synced tier" to "database tier" |
| `src/lib/computeUnitWarnings.ts` | EXTEND | Add role-based warnings, BATTLELINE count check |
| `src/db/queries/syncedUnitPoints.ts` | DELETE | Entire module removed |
| `src/db/queries/unitRulesMapping.ts` | MODIFY | Remove `findMatchingDatasheets()` (searches synced_unit_points); keep other functions |
| `src/hooks/useLoadoutOptions.ts` | REWRITE | `useTiersByUnitName` must query `udb_unit_points` instead of `synced_unit_point_tiers` |
| `src/hooks/useRulesSync.ts` | MODIFY | Remove calls to `replaceSyncedUnitPoints()` and `replaceSyncedUnitPointTiers()` |
| `src/components/common/DbHealthGate.tsx` | MODIFY | Remove synced_unit_points repair block |
| `src/db/queries/diagnostics.ts` | MODIFY | Remove `synced_unit_points` from TableCounts; update `getAmbiguousPointMatches()` |
| `src/db/queries/units.ts` | MODIFY | Update `getUnitsWithPoints()` to use udb_unit_points instead of synced_unit_points |
| `src/db/queries/dashboard.ts` | MODIFY | Update faction points query to use udb_unit_points |
| `src/features/data-health/TableCountsGrid.tsx` | MODIFY | Remove "Synced Points" row |
| `src/features/rules-hub/DatasheetPointsTab.tsx` | MODIFY | Replace `getPointTiersByFaction` with udb_unit_points query |
| `src/features/army-lists/ArmyListUnitRow.tsx` | MODIFY | Remove `findMatchingDatasheets` usage; update ambiguity detection |
| `src/types/unit.ts` | MODIFY | Update EnrichedUnit comments (no more synced_points reference) |
| `src-tauri/migrations/040_drop_synced_points.sql` | CREATE | DROP TABLE synced_unit_points; DROP TABLE synced_unit_point_tiers |

### Pattern 1: FK-Based Points JOIN (New)
**What:** Direct foreign key join from collection units to canonical database points
**When to use:** Whenever resolving points for a unit that has `udb_unit_id` set

```sql
-- Source: codebase analysis of udb_unit_points schema (038_udb_schema.sql)
-- Tier match (specific model count selected by user)
LEFT JOIN udb_unit_points udb_tier
  ON udb_tier.unit_id = u.udb_unit_id
  AND udb_tier.model_count = alu.selected_model_count

-- Base match (minimum model count = default/cheapest tier)
LEFT JOIN udb_unit_points udb_base
  ON udb_base.unit_id = u.udb_unit_id
  AND udb_base.model_count = (
    SELECT MIN(model_count)
    FROM udb_unit_points
    WHERE unit_id = u.udb_unit_id
  )
```

### Pattern 2: Keyword Enrichment via GROUP_CONCAT
**What:** Aggregate keywords per unit in a single SQL query column
**When to use:** When the query needs to return keywords alongside other unit data without N+1

```sql
-- Source: [ASSUMED] — standard SQLite GROUP_CONCAT pattern
(SELECT GROUP_CONCAT(keyword, ',')
 FROM udb_unit_keywords
 WHERE unit_id = u.udb_unit_id AND is_faction = 0
) AS udb_keywords
```

### Pattern 3: Role Enrichment via Direct JOIN
**What:** Join to `udb_units` to get the canonical role
**When to use:** When the query already joins through `u.udb_unit_id`

```sql
-- Source: 038_udb_schema.sql — udb_units.role column
LEFT JOIN udb_units udb ON udb.id = u.udb_unit_id
-- Then project: udb.role AS udb_role
```

### Anti-Patterns to Avoid
- **Name-based JOINs for canonical data:** The old pattern used `sup.unit_name = COALESCE(urm.datasheet_name, u.name)` which was fragile (BSData vs Wahapedia name mismatches). FK-based JOINs are deterministic.
- **Mixing old and new join paths:** During transition, do NOT partially migrate -- both `getArmyListWithUnits` and `getArmyListReadiness` must be updated together to avoid inconsistent points.
- **Correlated subquery per-row for keywords:** Using a separate SELECT per row for keywords would cause N+1. Use GROUP_CONCAT scalar subquery instead (executes per row but within the same query plan).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Points COALESCE chain | Custom JS fallback logic | SQL COALESCE in the query | Single source of truth; avoids JS/SQL divergence |
| Keyword aggregation | Separate query + JS merge | GROUP_CONCAT subquery in SQL | Avoids N+1 and keeps data layer clean |
| BATTLELINE counting | UI-side manual loop | Pure function in computeListWarnings | Testable, reusable, consistent with existing pattern |

## Common Pitfalls

### Pitfall 1: Ghost Units Have No udb_unit_id Path
**What goes wrong:** Ghost units have `unit_id IS NULL` (no collection entry), therefore no path to `u.udb_unit_id`. The FK join produces NULL for all udb_* columns.
**Why it happens:** Ghost units are deliberately "virtual" -- they exist only in the army list.
**How to avoid:** The COALESCE chain's final `0` fallback handles this. Ghost units with manual `points_override` still work. Keyword/role validation must skip ghost units (D-09).
**Warning signs:** Ghost unit points suddenly showing as 0 when they previously resolved via name-based synced cache.

### Pitfall 2: Unlinked Collection Units (udb_unit_id IS NULL)
**What goes wrong:** Collection units that were never backfilled (migration 039) or manually created without a database link will also have NULL udb_unit_id. Points fall through to `uo.points` (unit_overrides) or `u.points` (manual).
**Why it happens:** Not all units have canonical matches (kitbash, custom models).
**How to avoid:** The COALESCE chain handles this gracefully -- `uo.points` and `u.points` remain as fallbacks. This is correct behavior, not a bug.
**Warning signs:** A unit that previously had synced points suddenly falls through to a different source. Test with units that have `udb_unit_id IS NULL`.

### Pitfall 3: MIN Subquery Performance
**What goes wrong:** The correlated subquery `SELECT MIN(model_count) FROM udb_unit_points WHERE unit_id = u.udb_unit_id` runs per-row in the outer query.
**Why it happens:** SQLite correlated subqueries re-evaluate for each outer row.
**How to avoid:** The `udb_unit_points` table has an index on `unit_id` (idx_udb_unit_points_unit_id from 038_udb_schema.sql), so the subquery is an indexed lookup. With typical army lists having 10-30 units, performance impact is negligible.
**Warning signs:** If lists grow to hundreds of units (unlikely in 40k), consider materializing min tiers.

### Pitfall 4: resolveUnitPoints.ts and ArmyListUnitRow Must Stay in Sync
**What goes wrong:** The JS `resolveUnitPoints()` function mirrors the SQL COALESCE chain for source labeling. If the SQL chain order changes but the JS function doesn't, the UI shows wrong source labels.
**Why it happens:** Two representations of the same logic (SQL for computation, JS for labeling).
**How to avoid:** Update `resolveUnitPoints.ts` at the same time as the SQL. The new chain is: `override -> tier -> base(udb) -> user-override -> base(unit) -> unknown`. The `synced_points` level is removed entirely.
**Warning signs:** PointsSourceChip showing "synced" for units that should show "database".

### Pitfall 5: DatasheetPointsTab Still Uses getPointTiersByFaction
**What goes wrong:** The Rules Hub DatasheetPointsTab component uses `getPointTiersByFaction()` from `syncedUnitPoints.ts` to display tier info. If that module is deleted, the component breaks.
**Why it happens:** Multiple consumers of the synced cache exist beyond army lists.
**How to avoid:** Replace with a query against `udb_unit_points` with a faction filter via `udb_units.faction_id`. The schema supports this: `udb_unit_points.unit_id -> udb_units.faction_id`.
**Warning signs:** Compile error on import from deleted module.

### Pitfall 6: useTiersByUnitName in LoadoutBuilderSheet
**What goes wrong:** `useTiersByUnitName()` hook queries `synced_unit_point_tiers` by name. After deletion, loadout tier selection breaks.
**Why it happens:** The loadout builder needs tier data for the selected unit.
**How to avoid:** Replace with a query against `udb_unit_points` using the unit's `udb_unit_id` (available via the collection unit's FK). For ghost units without udb_unit_id, look up by name via `udb_units.name`.
**Warning signs:** LoadoutBuilderSheet tier selector showing empty options.

### Pitfall 7: findMatchingDatasheets Still Used by ArmyListUnitRow
**What goes wrong:** `ArmyListUnitRow.tsx` line 117 calls `findMatchingDatasheets()` for ambiguity detection. This function queries `synced_unit_points`.
**Why it happens:** Ambiguity detection was built for the name-based world.
**How to avoid:** With FK-based joins, ambiguity is eliminated -- the FK is deterministic. Remove the ambiguity detection call entirely, or replace with a check on whether `udb_unit_id IS NULL`.
**Warning signs:** Runtime error from querying dropped table.

### Pitfall 8: DbHealthGate synced_unit_points Repair Logic
**What goes wrong:** `DbHealthGate.tsx` has ~60 lines of repair logic for the synced cache. After table DROP, this code crashes on `SELECT COUNT(*) FROM synced_unit_points`.
**Why it happens:** Health gate runs before the app renders -- any SQL error here blocks the entire app.
**How to avoid:** Remove the entire `synced_unit_points` repair block from DbHealthGate. The health gate should only check schema version (which should be bumped to 40 for the new migration).
**Warning signs:** App fails to start with "no such table: synced_unit_points" error.

## Code Examples

### Rewritten getArmyListWithUnits Query

```sql
-- Source: codebase analysis, D-01 through D-06
SELECT
  alu.id, alu.list_id, alu.unit_id, alu.ghost_unit_name,
  alu.is_warlord, alu.selected_model_count, alu.leader_attached_to_id,
  alu.points_override, alu.notes, alu.sort_order, alu.tactical_role, alu.created_at,
  COALESCE(u.name, alu.ghost_unit_name) AS unit_name,
  u.points AS unit_points,
  u.faction_id,
  u.category AS unit_category,
  u.model_count AS unit_model_count,
  u.status_assembly,
  u.status_painting,
  u.painting_percentage,
  uo.points AS override_points,
  udb_tier.points AS tier_points,
  udb_base.points AS udb_base_points,
  udb.role AS udb_role,
  (SELECT GROUP_CONCAT(keyword, ',')
   FROM udb_unit_keywords
   WHERE unit_id = u.udb_unit_id AND is_faction = 0
  ) AS udb_keywords,
  COALESCE(alu.points_override, udb_tier.points, udb_base.points, uo.points, u.points, 0) AS effective_points
FROM army_list_units alu
LEFT JOIN units u ON u.id = alu.unit_id
LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
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
WHERE alu.list_id = $1
ORDER BY alu.sort_order ASC, alu.created_at ASC, alu.id ASC
```

### Updated resolveUnitPoints.ts

```typescript
// Source: codebase analysis — new 5-level chain matching D-01
export type PointsSource = "override" | "tier" | "database" | "user-override" | "base" | "unknown";

export function resolveUnitPoints(row: {
  points_override: number | null;
  tier_points: number | null;      // from udb_unit_points (tier match)
  udb_base_points: number | null;  // from udb_unit_points (min tier)
  override_points: number | null;  // from unit_overrides
  unit_points: number | null;      // from units.points
}): ResolvedPoints {
  if (row.points_override != null)  return { points: row.points_override,  source: "override" };
  if (row.tier_points != null)      return { points: row.tier_points,      source: "tier" };
  if (row.udb_base_points != null)  return { points: row.udb_base_points,  source: "database" };
  if (row.override_points != null)  return { points: row.override_points,  source: "user-override" };
  if (row.unit_points != null)      return { points: row.unit_points,      source: "base" };
  return { points: 0, source: "unknown" };
}
```

### Extended computeListWarnings

```typescript
// Source: codebase analysis — D-08 BATTLELINE count warning
export interface ListWarningContext extends WarningContext {
  units: Array<{ udb_role: string | null; unit_id: number | null }>;
}

// Inside computeListWarnings:
const battlelineCount = context.units.filter(
  u => u.udb_role?.toLowerCase() === "battleline"
).length;

// Standard 10th edition thresholds (parameterized)
const minBattleline = (context.pointsLimit ?? 0) >= 2000 ? 3
  : (context.pointsLimit ?? 0) >= 1000 ? 2
  : 1;

if (battlelineCount < minBattleline) {
  soft.push(`Needs ${minBattleline} Battleline (have ${battlelineCount})`);
}
```

### Replacement for getTiersByUnitName (LoadoutBuilder)

```typescript
// Source: codebase analysis — replaces synced_unit_point_tiers lookup
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

### Migration 040

```sql
-- Migration 040: Drop synced_unit_points cache tables
-- Points are now resolved via FK join to udb_unit_points (Phase 106, ALI-03)
DROP TABLE IF EXISTS synced_unit_points;
DROP TABLE IF EXISTS synced_unit_point_tiers;

PRAGMA user_version = 40;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Name-based JOIN via synced cache | FK-based JOIN to udb_unit_points | Phase 106 (this phase) | Eliminates BSData/Wahapedia name mismatch issues |
| unit_rules_mapping.datasheet_name as join key | units.udb_unit_id FK | Phase 105 (FK added) + Phase 106 (used for points) | Deterministic ID-based resolution |
| getUnitKeywords() via rules.db rw_datasheet_keywords | udb_unit_keywords in hobbyforge.db | Phase 106 (this phase) | Single-DB approach, no cross-DB queries |

**Deprecated/outdated:**
- `synced_unit_points` / `synced_unit_point_tiers`: Being removed -- replaced by `udb_unit_points`
- `findMatchingDatasheets()`: Ambiguity detection no longer needed with FK-based approach
- `normalizePointsNames()`: Only needed for BSData->Wahapedia name normalization in synced cache

## Complete Caller Inventory for synced_unit_points Infrastructure

This is the exhaustive list of all callers that must be updated or removed:

| # | File | Function/Usage | Action |
|---|------|---------------|--------|
| 1 | `src/db/queries/armyLists.ts` | `getArmyListWithUnits()` -- 2 LEFT JOINs | REWRITE: FK-based joins |
| 2 | `src/db/queries/armyLists.ts` | `getArmyListReadiness()` -- 2 LEFT JOINs | REWRITE: FK-based joins |
| 3 | `src/db/queries/syncedUnitPoints.ts` | Entire module (7 exports) | DELETE |
| 4 | `src/db/queries/unitRulesMapping.ts` | `findMatchingDatasheets()` -- queries synced_unit_points | DELETE function |
| 5 | `src/db/queries/units.ts` | `getUnitsWithPoints()` -- LEFT JOIN synced_unit_points | REWRITE: use udb_unit_points |
| 6 | `src/db/queries/dashboard.ts` | `getFactionPointsSummary()` -- LEFT JOIN synced_unit_points | REWRITE: use udb_unit_points |
| 7 | `src/db/queries/diagnostics.ts` | `getTableCounts()` -- counts synced_unit_points | REMOVE from counts |
| 8 | `src/db/queries/diagnostics.ts` | `getAmbiguousPointMatches()` -- JOINs synced_unit_points | REWRITE: use udb approach |
| 9 | `src/hooks/useLoadoutOptions.ts` | `useTiersByUnitName()` -- imports getTiersByUnitName | REWRITE: use udb_unit_points |
| 10 | `src/hooks/useRulesSync.ts` | Calls `replaceSyncedUnitPoints()` and `replaceSyncedUnitPointTiers()` | REMOVE calls |
| 11 | `src/components/common/DbHealthGate.tsx` | ~60 lines of synced cache repair logic | REMOVE repair block; update EXPECTED_SCHEMA_VERSION to 40 |
| 12 | `src/features/data-health/TableCountsGrid.tsx` | "Synced Points" row | REMOVE row |
| 13 | `src/features/rules-hub/DatasheetPointsTab.tsx` | `usePointTiers()` -- imports getPointTiersByFaction | REWRITE: use udb_unit_points |
| 14 | `src/features/army-lists/ArmyListUnitRow.tsx` | `findMatchingDatasheets()` call for ambiguity detection | REMOVE or replace with udb_unit_id null check |
| 15 | `src/types/armyList.ts` | `ArmyListUnitRow.synced_points`, `tier_points` | UPDATE: replace synced_points with udb_base_points, keep tier_points |
| 16 | `src/types/unit.ts` | `EnrichedUnit.synced_points`, `is_synced` | UPDATE: change to udb-based fields |
| 17 | `src/lib/resolveUnitPoints.ts` | `synced_points` in chain | REMOVE level, add `udb_base_points` |

### unit_rules_mapping Analysis

The `unit_rules_mapping` table has these remaining uses after removing `findMatchingDatasheets()`:

| Function | File | Purpose | Depends on synced_unit_points? |
|----------|------|---------|-------------------------------|
| `getUnitRulesMapping()` | unitRulesMapping.ts | Read mapping for a unit | No |
| `getUnitRulesMappings()` | unitRulesMapping.ts | List all mappings | No |
| `upsertUnitRulesMapping()` | unitRulesMapping.ts | Create/update mapping | No |
| `deleteUnitRulesMapping()` | unitRulesMapping.ts | Delete mapping | No |
| `findRulesDatasheets()` | unitRulesMapping.ts | Search rules.db datasheets (UI search) | No -- uses rules.db |
| `getDatasheetRoleForUnit()` | unitRulesMapping.ts | Get role from rules.db | No -- uses rules.db |
| LEFT JOIN in armyLists.ts | armyLists.ts | Provides canonical_name for COALESCE join key | **YES** -- this JOIN is no longer needed |

**Conclusion:** `unit_rules_mapping` itself stays (it has non-points uses in the UI -- RulesMappingSheet, PlaybookTab), but the LEFT JOIN in armyLists.ts queries should be removed since `canonical_name` (from `urm.datasheet_name`) was only used as the join key for synced_unit_points. The `canonical_name` column can be removed from the query projection.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test -- tests/lib/resolveUnitPoints.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ALI-01 | resolveUnitPoints with new 5-level chain | unit | `pnpm test -- tests/lib/resolveUnitPoints.test.ts` | Yes -- needs update |
| ALI-01 | getArmyListWithUnits SQL shape | unit | `pnpm test -- tests/army-list/armyListQueries.test.ts` | Yes -- needs update |
| ALI-02 | computeUnitWarnings with role data | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | No -- Wave 0 |
| ALI-02 | computeListWarnings BATTLELINE count | unit | `pnpm test -- tests/lib/computeListWarnings.test.ts` | No -- Wave 0 |
| ALI-03 | syncedUnitPoints module deleted | compile | `pnpm build` | N/A |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/lib/resolveUnitPoints.test.ts tests/lib/computeUnitWarnings.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `tests/lib/computeUnitWarnings.test.ts` -- covers ALI-02 (unit role warnings)
- [ ] `tests/lib/computeListWarnings.test.ts` -- covers ALI-02 (BATTLELINE count)
- [ ] Update `tests/lib/resolveUnitPoints.test.ts` -- covers ALI-01 (new chain, remove synced_points level)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | yes | Parameterized queries ($1, $2) -- already enforced |
| V6 Cryptography | no | -- |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via dynamic placeholders | Tampering | Positional $1, $2 params (existing pattern) |

No new attack surface introduced. This phase removes code (reducing surface area) and uses the same parameterized query pattern already enforced by CLAUDE.md.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GROUP_CONCAT is the best approach for keyword enrichment in the query | Architecture Patterns | Low -- alternatives (subquery array, CTE) also work but GROUP_CONCAT is standard SQLite |
| A2 | BATTLELINE thresholds: 3 for 2000pt, 2 for 1000pt, 1 otherwise | Code Examples | Medium -- user should confirm 10th edition army construction rules |
| A3 | Migration number is 040 (next after 039) | Component Responsibilities | Low -- easy to verify by checking migrations directory |
| A4 | `canonical_name` in ArmyListUnitRow is only used as join key for synced points | Caller Inventory | Medium -- if UI displays canonical_name anywhere, removing it from the query would break display |

## Open Questions

1. **Ghost Unit Tier Selection After Removal**
   - What we know: Ghost units currently resolve tiers via name-based lookup in `synced_unit_point_tiers`. After removal, they have no path to tiers.
   - What's unclear: Should ghost units support tier selection at all? With FK-based joins, ghost units can't resolve tiers (no `udb_unit_id`).
   - Recommendation: Ghost units fall through to `points_override` or 0. Users who need specific points for ghost units should use manual `points_override`. This matches D-04.

2. **Points Freshness Warning Source**
   - What we know: `computeListWarnings` uses `SyncFreshness` based on last Wahapedia sync. With the synced cache removed, the freshness concept changes -- udb data freshness is tied to app version, not sync timestamps.
   - What's unclear: Should the "stale points data" warning be removed, or repointed to `udb_meta.version`?
   - Recommendation: Keep the freshness check but base it on `udb_meta.built_at` instead of sync timestamp. This is Phase 107 territory though -- for now, the warning can remain as-is since the sync pipeline itself isn't being removed in this phase.

3. **DatasheetPointsTab Tier Data Source**
   - What we know: `DatasheetPointsTab` currently uses `getPointTiersByFaction()` from `syncedUnitPoints.ts` which queries `synced_unit_point_tiers`.
   - What's unclear: Whether this component should query `udb_unit_points` (same data, different table) or be considered Phase 107 cleanup.
   - Recommendation: Include in this phase since `syncedUnitPoints.ts` is being deleted. Create a `getUdbPointsByFaction()` query in `unitDatabase.ts`.

## Sources

### Primary (HIGH confidence)
- `src/db/queries/armyLists.ts` -- exact SQL for both queries, all JOINs documented
- `src-tauri/migrations/038_udb_schema.sql` -- udb_unit_points, udb_unit_keywords, udb_units schema
- `src-tauri/migrations/039_collection_udb_link.sql` -- units.udb_unit_id FK column
- `src-tauri/migrations/024_points_import_history.sql` -- synced_unit_points CREATE TABLE
- `src-tauri/migrations/029_synced_point_tiers.sql` -- synced_unit_point_tiers CREATE TABLE
- `src/db/queries/syncedUnitPoints.ts` -- complete caller surface for the module being deleted
- `src/lib/resolveUnitPoints.ts` -- current JS chain matching SQL COALESCE
- `src/lib/computeUnitWarnings.ts` -- current warning functions to extend

### Secondary (MEDIUM confidence)
- Grep-based exhaustive search across `src/` for all `synced_unit_points` references (17 call sites identified)
- Grep-based search for `unit_rules_mapping` references (11 call sites)

### Tertiary (LOW confidence)
- 10th edition BATTLELINE thresholds (A2 in Assumptions Log) -- based on training knowledge, not verified against official GW rules

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, pure internal refactoring
- Architecture: HIGH -- all SQL schemas verified from migration files, all callers identified via grep
- Pitfalls: HIGH -- 8 specific pitfalls identified from actual codebase analysis with file/line references

**Research date:** 2026-05-30
**Valid until:** 2026-06-30 (stable internal refactoring, no external dependencies)
