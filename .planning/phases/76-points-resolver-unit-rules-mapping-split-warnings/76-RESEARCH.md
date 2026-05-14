# Phase 76: Points Resolver + Unit Rules Mapping + Split Warnings - Research

**Researched:** 2026-05-14
**Domain:** Pure function extraction, CRUD layer creation, UI refactoring (TypeScript/React/SQLite)
**Confidence:** HIGH

## Summary

This phase has three distinct workstreams that touch different layers of the application: (1) extracting a pure `resolveUnitPoints()` function that labels the source of each unit's point value from already-available SQL columns, (2) building the full type/query/hook/UI stack for the `unit_rules_mapping` table whose schema already exists (migration 026), and (3) splitting the existing `computeUnitWarnings()` function to separate list-level from unit-level warnings.

All three workstreams are well-constrained by locked decisions in CONTEXT.md. The resolver is a pure function (no async, no DB calls) that reads intermediate columns already exposed in SQL. The mapping layer follows established Entity/CreateInput/UpdateInput + query file + hook file + Sheet UI patterns used throughout the codebase. The warning split is a refactor of a single pure function file with comprehensive existing tests.

**Primary recommendation:** Implement bottom-up -- resolver function first (used everywhere), then mapping CRUD layer (types/queries/hooks), then warning split, then UI integration. The resolver and mapping layer are independent; the UI integration depends on both.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** COALESCE chain stays in SQL. `resolveUnitPoints()` is a pure JS function in `src/lib/` that takes column values and returns `{ points: number; source: "override" | "synced" | "user-override" | "base" | "unknown" }`.
- **D-02:** SQL queries must expose intermediate columns (sup.points AS synced_points, uo.points AS override_points) so the resolver can determine which COALESCE level provided the value.
- **D-03:** Source labeling logic: points_override -> "override"; synced_points -> "synced"; override_points -> "user-override"; unit_points -> "base"; else -> "unknown".
- **D-04:** `getArmyReadinessByFaction` in dashboard.ts upgraded to 4-level COALESCE with LEFT JOINs on synced_unit_points and unit_overrides. Army list points_override does NOT apply (aggregates by faction, not by army list).
- **D-05:** Dashboard uses aligned SQL COALESCE for aggregation but does not need source labeling.
- **D-06:** New type file `src/types/unitRulesMapping.ts` with Entity/CreateInput/UpdateInput pattern. match_status typed as `"auto" | "confirmed" | "manual"`.
- **D-07:** New query file `src/db/queries/unitRulesMapping.ts` with CRUD: get, getAll, upsert (INSERT OR REPLACE on unit_id UNIQUE), delete.
- **D-08:** New hook file `src/hooks/useUnitRulesMapping.ts` following KEY/useQuery/useMutation pattern.
- **D-09:** UI: inline indicator on unit rows (badge/icon for match status), clicking opens Sheet for confirm/override.
- **D-10:** Ambiguity detection: when rules_datasheet_id is NULL or match_status='auto' and multiple datasheets share the unit's name, show "needs review" with candidate count.
- **D-11:** Extract list-level warnings into `computeListWarnings()` in same file. List-level: points exceeded, stale data source.
- **D-12:** `computeUnitWarnings()` keeps only unit-level conditions. Remove list-level checks.
- **D-13:** Summary bar renders list warnings directly. Tooltip shows "N list warnings, M unit warnings".

### Claude's Discretion
- Source chip styling and exact badge variants
- Sheet layout for rules mapping confirmation
- Ambiguity detection query specifics (matching logic against rules.db datasheets)
- Error handling for missing rules.db data
- Whether to show batch "confirm all" action (deferred per UI spec)

### Deferred Ideas (OUT OF SCOPE)
None

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PV-01 | All surfaces use single centralized points resolver | resolveUnitPoints() pure function + SQL column exposure (D-01, D-02) |
| PV-02 | Points source labeled in UI | PointsSourceChip component consuming resolver output (D-03) |
| PV-03 | User can see auto-matched vs manually confirmed | MatchStatusIndicator on unit rows showing match_status (D-09) |
| PV-04 | User can confirm or override unit-to-rules mapping | RulesMappingSheet with confirm/select/remove flows (D-09) |
| PV-05 | Duplicate/ambiguous matches flagged | Ambiguity detection query against synced_unit_points by name (D-10) |
| PV-06 | List-level warnings shown once in summary | computeListWarnings() + ArmyListSummaryBar refactor (D-11, D-13) |
| PV-07 | Unit-level warnings on unit rows | computeUnitWarnings() cleaned of list-level checks (D-12) |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Points resolution logic | Frontend (pure function) | -- | D-01: pure JS, no DB; SQL COALESCE stays in DB layer |
| SQL column exposure | Database / Storage | -- | D-02: SELECT changes in armyLists.ts, dashboard.ts |
| Dashboard COALESCE fix | Database / Storage | -- | D-04: SQL-only change in dashboard.ts query |
| Unit rules mapping CRUD | Database / Storage | Frontend (hooks) | D-07/D-08: query file + React Query hooks |
| Match status UI | Frontend (React) | -- | D-09: MatchStatusIndicator + RulesMappingSheet |
| Ambiguity detection | Database / Storage | Frontend (logic) | D-10: query against synced_unit_points for name matches |
| Warning split | Frontend (pure function) | -- | D-11/D-12: refactor computeUnitWarnings.ts |
| Summary bar warnings | Frontend (React) | -- | D-13: ArmyListSummaryBar modification |

## Standard Stack

### Core (already installed)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| React 19 | UI components | Project standard |
| TypeScript 5 | Type safety | Project standard |
| TanStack React Query | Server state | Project standard |
| Zod | Schema validation | Project standard for form schemas |
| Lucide React | Icons | Project standard |
| shadcn/ui | UI primitives | Project standard (Sheet, Badge, Button, Input, Select, Tooltip) |

### No new dependencies needed
This phase creates no new external dependencies. All work uses existing libraries and patterns.

## Architecture Patterns

### System Architecture Diagram

```
                    ArmyListUnitRow / GameDayReadinessPanel
                         |                    |
                  PointsSourceChip    MatchStatusIndicator
                         |                    |
                  resolveUnitPoints()    [click opens]
                   (pure function)           |
                         |            RulesMappingSheet
                         |                    |
              ArmyListSummaryBar     useUnitRulesMapping
              computeListWarnings()         |
              computeUnitWarnings()   unitRulesMapping.ts (queries)
                         |                    |
              getArmyListWithUnits    unit_rules_mapping table
              (SQL: exposes intermediate       |
               columns for resolver)     migration 026
                         |
              dashboard.ts (COALESCE fix)
```

### Recommended Project Structure (new/modified files)

```
src/
  lib/
    resolveUnitPoints.ts       # NEW: pure resolver function
    computeUnitWarnings.ts     # MODIFIED: split into list + unit warnings
  types/
    unitRulesMapping.ts        # NEW: Entity/CreateInput/UpdateInput types
    armyList.ts                # MODIFIED: extend ArmyListUnitRow with source columns
  db/queries/
    unitRulesMapping.ts        # NEW: CRUD queries
    armyLists.ts               # MODIFIED: add synced_points, override_points columns
    dashboard.ts               # MODIFIED: upgrade COALESCE to 4-level
  hooks/
    useUnitRulesMapping.ts     # NEW: React Query hooks
  features/army-lists/
    PointsSourceChip.tsx       # NEW: source label display
    MatchStatusIndicator.tsx   # NEW: match status icon button
    RulesMappingSheet.tsx      # NEW: confirm/override Sheet
    ArmyListSummaryBar.tsx     # MODIFIED: list-level warnings
    ArmyListUnitRow.tsx        # MODIFIED: add source chip + match indicator
tests/
  lib/
    resolveUnitPoints.test.ts  # NEW
    computeUnitWarnings.test.ts # MODIFIED: update for warning split
  army-list/
    unitRulesMappingQueries.test.ts # NEW
```

### Pattern 1: Pure Resolver Function

**What:** A synchronous function that takes pre-fetched SQL column values and returns resolved points with source label.
**When to use:** Every surface that displays points (army list rows, Game Day readiness, validation).

```typescript
// src/lib/resolveUnitPoints.ts
export type PointsSource = "override" | "synced" | "user-override" | "base" | "unknown";

export interface ResolvedPoints {
  points: number;
  source: PointsSource;
}

export function resolveUnitPoints(row: {
  points_override: number | null;
  synced_points: number | null;
  override_points: number | null;
  unit_points: number | null;
}): ResolvedPoints {
  if (row.points_override != null) return { points: row.points_override, source: "override" };
  if (row.synced_points != null) return { points: row.synced_points, source: "synced" };
  if (row.override_points != null) return { points: row.override_points, source: "user-override" };
  if (row.unit_points != null) return { points: row.unit_points, source: "base" };
  return { points: 0, source: "unknown" };
}
```

[VERIFIED: codebase analysis of D-01/D-02/D-03 in CONTEXT.md and existing COALESCE chain in armyLists.ts lines 63]

### Pattern 2: Entity CRUD Layer (established codebase pattern)

**What:** Type file + query file + hook file for unit_rules_mapping.
**When to use:** Every new entity in the app follows this pattern.

```typescript
// src/types/unitRulesMapping.ts — follows unitOverride.ts pattern
export type MatchStatus = "auto" | "confirmed" | "manual";

export interface UnitRulesMapping {
  id: number;
  unit_id: number;
  rules_datasheet_id: string | null;
  match_status: MatchStatus;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export type UpsertUnitRulesMappingInput = {
  unit_id: number;
  rules_datasheet_id: string | null;
  match_status: MatchStatus;
  source?: string | null;
};
```

[VERIFIED: migration 026 schema, unitOverride.ts pattern, CONTEXT.md D-06]

### Pattern 3: Warning Split

**What:** Extract list-level warnings from `computeUnitWarnings()` into a separate `computeListWarnings()` function.
**When to use:** Refactoring existing warning system per D-11/D-12.

Current `computeUnitWarnings` contains two list-level checks that must move:
1. "Points exceeded" (hard) -- lines 57-59 in computeUnitWarnings.ts
2. "Stale points" (soft) -- lines 66-68 in computeUnitWarnings.ts

After split:
- `computeListWarnings(context)` returns `{ hard: string[], soft: string[] }` for list-level conditions
- `computeUnitWarnings(unit, context)` returns only unit-level conditions (not painted, not assembled, manual override, unknown points)

[VERIFIED: current computeUnitWarnings.ts source code]

### Anti-Patterns to Avoid
- **Computing COALESCE in JS:** The effective_points COALESCE chain MUST stay in SQL. The resolver function only determines the SOURCE label by examining which intermediate column is non-null.
- **Querying rules.db directly from resolver:** The resolver is a pure function. Ambiguity detection is a separate query concern.
- **Duplicating list-level warnings per unit:** After the split, `computeUnitWarnings` must NOT include "Points exceeded" or "Stale points".

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form Sheet UI | Custom modal/dialog | shadcn Sheet | Already used for UnitSheet, RecipeSheet, ArmyListSheet |
| Status indicators | Custom styled spans | StatusBadge + Badge | Existing components with correct styling |
| Toast notifications | Custom alert system | Sonner toast | Already integrated, used in all mutation callbacks |
| Inline icon buttons | Custom clickable icons | Button variant="ghost" size="icon" | Pattern from ArmyListUnitRow trash/expand buttons |

## Common Pitfalls

### Pitfall 1: Resolver diverging from SQL COALESCE order
**What goes wrong:** The resolver's if-chain order doesn't match the SQL COALESCE argument order, causing the source label to be wrong even though effective_points is correct.
**Why it happens:** SQL COALESCE is `COALESCE(alu.points_override, sup.points, uo.points, u.points, 0)` -- the resolver must check in the same order.
**How to avoid:** Document the canonical order in the resolver function comment. Test with cases where multiple columns are non-null.
**Warning signs:** Source chip says "synced" but the unit has a points_override set.

### Pitfall 2: ArmyListUnitRow type mismatch after adding columns
**What goes wrong:** Adding `synced_points` and `override_points` to the SQL SELECT without updating the `ArmyListUnitRow` interface causes runtime errors or silent drops.
**Why it happens:** TypeScript interfaces must match SQL output columns exactly.
**How to avoid:** Update `ArmyListUnitRow` in `src/types/armyList.ts` to include `synced_points: number | null` and `override_points: number | null` BEFORE changing the SQL.
**Warning signs:** Build succeeds but source chip always shows "unknown".

### Pitfall 3: computeListHealthStats double-counting after warning split
**What goes wrong:** `computeListHealthStats` currently deduplicates "Points exceeded" from hardWarningCount (line 108: `warnings.hard.filter(w => w !== "Points exceeded")`). After removing "Points exceeded" from `computeUnitWarnings`, this filter becomes a no-op but the list-level count must now come from `computeListWarnings`.
**Why it happens:** Two functions both responsible for the same warning.
**How to avoid:** Update `computeListHealthStats` to call `computeListWarnings` for list-level counts and `computeUnitWarnings` for unit-level counts. Remove the deduplication filter.
**Warning signs:** Warning counts are wrong in the summary bar tooltip.

### Pitfall 4: Ambiguity detection cross-DB query attempt
**What goes wrong:** Trying to query `rw_datasheets` in rules.db for ambiguity detection alongside hobbyforge.db data.
**Why it happens:** rules.db is a separate SQLite connection; cross-DB JOINs are not possible.
**How to avoid:** Use `synced_unit_points` table (already in hobbyforge.db) for name-based matching. The `unit_name` + `faction_id` columns provide sufficient matching capability.
**Warning signs:** "Cannot find table rw_datasheets" errors.

### Pitfall 5: Full-replacement UPDATE on army_list_units
**What goes wrong:** When saving mapping-related state, forgetting to pass ALL existing fields (points_override, notes, tactical_role) causes them to be overwritten with null.
**Why it happens:** `updateArmyListUnit` uses full-replacement UPDATE, not COALESCE.
**How to avoid:** Unit rules mapping is a separate table (unit_rules_mapping) with its own upsert function. Do NOT accidentally wire mapping state through army_list_units.
**Warning signs:** Points override or notes disappear when confirming a rules mapping.

### Pitfall 6: Dashboard COALESCE upgrade missing LEFT JOINs
**What goes wrong:** Adding `sup.points` and `uo.points` to the COALESCE without adding LEFT JOINs causes the query to return 0 rows.
**Why it happens:** INNER JOIN semantics -- without LEFT JOIN, units without overrides or synced points are excluded.
**How to avoid:** Use LEFT JOIN for both synced_unit_points and unit_overrides, exactly as in `getArmyListWithUnits`.
**Warning signs:** Dashboard army readiness shows 0 for all factions.

## Code Examples

### SQL Column Exposure (D-02)

Current `getArmyListWithUnits` SELECT (armyLists.ts line 55-63):
```sql
SELECT
  alu.id, alu.list_id, alu.unit_id, alu.points_override, ...
  u.points AS unit_points,
  COALESCE(alu.points_override, sup.points, uo.points, u.points, 0) AS effective_points
FROM army_list_units alu
JOIN units u ON u.id = alu.unit_id
LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
LEFT JOIN synced_unit_points sup ON sup.unit_name = u.name
  AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))
```

Must add two columns:
```sql
  sup.points AS synced_points,
  uo.points AS override_points,
```

[VERIFIED: armyLists.ts lines 52-72]

### Dashboard COALESCE Upgrade (D-04)

Current (dashboard.ts lines 86-100):
```sql
SUM(COALESCE(u.points, 0)) AS points_owned
```

Must become:
```sql
SUM(COALESCE(sup.points, uo.points, u.points, 0)) AS points_owned
```

With added LEFT JOINs:
```sql
LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
LEFT JOIN synced_unit_points sup ON sup.unit_name = u.name
  AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))
```

[VERIFIED: dashboard.ts lines 86-100]

### Upsert Query Pattern (D-07)

Following the established select-then-insert/update pattern from unitOverrides.ts:
```typescript
export async function upsertUnitRulesMapping(input: UpsertUnitRulesMappingInput): Promise<void> {
  const db = await getDb();
  const existing = await db.select<{ id: number }[]>(
    "SELECT id FROM unit_rules_mapping WHERE unit_id = $1",
    [input.unit_id],
  );
  if (existing.length > 0) {
    await db.execute(
      `UPDATE unit_rules_mapping SET
         rules_datasheet_id=$2, match_status=$3, source=$4, updated_at=datetime('now')
       WHERE unit_id=$1`,
      [input.unit_id, input.rules_datasheet_id, input.match_status, input.source ?? null],
    );
  } else {
    await db.execute(
      `INSERT INTO unit_rules_mapping (unit_id, rules_datasheet_id, match_status, source)
       VALUES ($1, $2, $3, $4)`,
      [input.unit_id, input.rules_datasheet_id, input.match_status, input.source ?? null],
    );
  }
}
```

[VERIFIED: unitOverrides.ts upsert pattern]

### Ambiguity Detection Query (D-10)

Query synced_unit_points (hobbyforge.db) for name-based matches:
```typescript
export async function findMatchingDatasheets(
  unitName: string,
  factionId: number | null,
): Promise<Array<{ unit_name: string; faction_id: string | null; points: number }>> {
  const db = await getDb();
  return db.select(
    `SELECT unit_name, faction_id, points
     FROM synced_unit_points
     WHERE unit_name = $1
       OR unit_name LIKE $2`,
    [unitName, `%${unitName}%`],
  );
}
```

For more precise matching (checking rules.db datasheets), use `getRulesDb()`:
```typescript
import { getRulesDb } from "@/db/rules-client";

export async function findRulesDatasheets(
  searchTerm: string,
): Promise<Array<{ id: string; name: string; faction_id: string | null }>> {
  const db = await getRulesDb();
  return db.select(
    `SELECT id, name, faction_id FROM rw_datasheets
     WHERE name LIKE $1 ORDER BY name LIMIT 20`,
    [`%${searchTerm}%`],
  );
}
```

[VERIFIED: rules_001_schema.sql for rw_datasheets structure, syncedUnitPoints.ts for hobbyforge.db pattern]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 2-level COALESCE in dashboard | 5-level COALESCE everywhere else | Phase 65 (v0.2.10) | Dashboard shows wrong totals -- this phase fixes it |
| Mixed list+unit warnings | Separate list/unit warning functions | This phase | Cleaner UI, no duplicated warnings |
| No rules mapping | unit_rules_mapping table | Phase 73 schema, Phase 76 layer | Users can track and confirm auto-matches |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Ambiguity detection can use synced_unit_points for name matching as primary source, with rw_datasheets in rules.db as secondary for the Sheet search | Code Examples | If synced_unit_points has no entries, ambiguity detection returns nothing -- need graceful degradation |
| A2 | The RulesMappingSheet search queries rw_datasheets in rules.db directly | Code Examples | If rules.db is empty (never synced), the search returns nothing -- empty state needed |

## Open Questions

1. **Ambiguity detection across factions**
   - What we know: synced_unit_points has (unit_name, faction_id) as UNIQUE; rw_datasheets has (id, name, faction_id). Same datasheet name can appear in multiple factions.
   - What's unclear: Should ambiguity detection be scoped to the unit's faction, or show cross-faction matches?
   - Recommendation: Scope to same faction first, then fall back to cross-faction matches. This is Claude's discretion per CONTEXT.md.

2. **Game Day source chip integration**
   - What we know: GameDayReadinessPanel receives `ArmyListUnitRow[]` as props and shows per-unit warnings.
   - What's unclear: Whether Game Day should show source chips on individual units or just in the readiness panel aggregate.
   - Recommendation: Add source chip to Game Day unit cards if they show individual points. The resolver function is already available.

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
| PV-01 | resolveUnitPoints returns correct source for each COALESCE level | unit | `pnpm test -- tests/lib/resolveUnitPoints.test.ts` | Wave 0 |
| PV-02 | PointsSourceChip renders correct dot color and label | unit | `pnpm test -- tests/army-list/pointsSourceChip.test.ts` | Wave 0 |
| PV-03 | MatchStatusIndicator renders correct icon per status | unit | `pnpm test -- tests/army-list/matchStatusIndicator.test.ts` | Wave 0 |
| PV-04 | upsertUnitRulesMapping writes correct match_status | unit | `pnpm test -- tests/army-list/unitRulesMappingQueries.test.ts` | Wave 0 |
| PV-05 | Ambiguity detection returns count > 1 for duplicate names | unit | `pnpm test -- tests/army-list/unitRulesMappingQueries.test.ts` | Wave 0 |
| PV-06 | computeListWarnings returns points exceeded + stale | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | Exists (modify) |
| PV-07 | computeUnitWarnings excludes list-level warnings | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | Exists (modify) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/lib/resolveUnitPoints.test.ts tests/lib/computeUnitWarnings.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/resolveUnitPoints.test.ts` -- covers PV-01
- [ ] `tests/army-list/unitRulesMappingQueries.test.ts` -- covers PV-04, PV-05
- [ ] Update `tests/lib/computeUnitWarnings.test.ts` -- covers PV-06, PV-07 (existing file, tests need updating)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A (local desktop app) |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A (single-user) |
| V5 Input Validation | yes | Zod schema for RulesMappingSheet form, parameterized SQL queries ($1, $2) |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via search term | Tampering | Parameterized queries ($1, $2 positional syntax) |
| LIKE wildcard injection | Tampering | Limit search results (LIMIT 20), no user-controlled wildcards in production |

## Sources

### Primary (HIGH confidence)
- Codebase analysis: armyLists.ts, dashboard.ts, computeUnitWarnings.ts, unitOverrides.ts, migration 026
- CONTEXT.md D-01 through D-13 -- locked decisions
- UI-SPEC.md -- component inventory and interaction patterns

### Secondary (MEDIUM confidence)
- Migration 026 schema for unit_rules_mapping table structure
- rules_001_schema.sql for rw_datasheets structure

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all established patterns
- Architecture: HIGH - every file and pattern directly inspected in codebase
- Pitfalls: HIGH - identified from concrete code analysis (COALESCE order, full-replacement UPDATE, cross-DB)

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (stable -- no external dependencies changing)
