# Phase 66: Army List Validation - Research

**Researched:** 2026-05-13
**Domain:** Army list health validation, tactical role tagging, summary panel UX
**Confidence:** HIGH

## Summary

Phase 66 extends the army list detail view with comprehensive health information. The work divides into four streams: (1) a pure-function warning system classifying units by hard/soft warning severity, (2) a `tactical_role` column on `army_list_units` with a fixed 7-role enum, (3) aggregated role coverage visualization with progressive disclosure, and (4) extending `ArmyListSummaryBar` into a full health summary panel with points/limit display, ownership %, freshness, and warning counts.

All four streams build on well-established codebase patterns: pure computation functions (like `computeWorkflowPosition`), const array enums (like `PAINTING_STATUS_ORDER`), per-list-per-unit data on the join table (like `points_override`), and extending existing components (like the summary bar). The SQL query `getArmyListWithUnits` already returns the fields needed for warning classification -- only `tactical_role` needs to be added to the SELECT.

**Primary recommendation:** Build the `computeUnitWarnings` pure function first (with tests), then the migration + query changes, then the UI components. The warning logic is the core of this phase and determines the shape of all downstream UI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Warnings surface at two levels: inline per-unit icons AND consolidated warning count in health panel
- D-02: Two severity levels: hard (points exceeded, unowned) and soft (unpainted, not battle-ready, stale, override, unknown points)
- D-03: Warning computation is SQL-derived for data + pure TypeScript function for classification
- D-04: Points-exceeded triggers when SUM(effective_points) > army_lists.points_limit; suppressed when points_limit is NULL
- D-05: Tactical role lives on army_list_units (per-list-per-unit context)
- D-06: New `tactical_role` TEXT column on army_list_units, nullable, Migration 021
- D-07: Fixed enum: anti_tank, screening, objective_holder, fire_support, melee_threat, utility, transport as TACTICAL_ROLES const array
- D-08: Single role per unit (TEXT column, not join table)
- D-09: Horizontal indicators per role (label + count), not a chart
- D-10: Gap = 0 units; covered = 1+ units; no minimum thresholds
- D-11: Role coverage visible only when at least one unit has a tactical_role assigned
- D-12: Extend ArmyListSummaryBar, not a separate panel
- D-13: Health summary displays: points X/Y, ownership %, readiness %, freshness badge, warning count
- D-14: points_limit column already exists -- activate it with form input in ArmyListSheet
- D-15: Ownership % always 100% in current schema (FK constraint), but show for completeness

### Claude's Discretion
- Icon choices for warning indicators (AlertTriangle for hard, Info for soft per UI-SPEC)
- Visual treatment of role coverage indicators
- Summary tooltip on warning count badge
- Loading/skeleton states
- Stat order in health summary panel
- Tactical role dropdown as inline select vs edit flow

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LV-01 | Army list shows hard validation warnings: points exceeded, unknown/stale points, manual override in use, unowned/unbuilt/unpainted/not-battle-ready units | computeUnitWarnings pure function + inline icons + warning count badge. All data already available from getArmyListWithUnits query. |
| LV-02 | User can assign tactical role tags to units | Migration 021 adds tactical_role to army_list_units; updateArmyListUnit extended to persist it; inline Select on ArmyListUnitRow |
| LV-03 | Army list shows aggregated tactical role coverage with visual indicators | Role coverage section in extended SummaryBar; pill badges per role with covered/gap styling |
| LV-04 | Army list detail displays health summary panel with points total, ownership %, readiness %, freshness, warning count | Extended ArmyListSummaryBar with all 5 stats + conditional role coverage |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Warning classification | Pure TypeScript (src/lib) | -- | Pure function for testability, no DB dependency |
| Warning data sourcing | Database / SQL | -- | getArmyListWithUnits already returns all needed fields |
| Tactical role persistence | Database / SQL | -- | New column on army_list_units, standard migration |
| Tactical role assignment UX | Frontend (React) | -- | Inline Select on unit row, immediate save |
| Health summary display | Frontend (React) | -- | Extended ArmyListSummaryBar component |
| Role coverage aggregation | Frontend (React) | -- | Computed from units array in useMemo, no SQL needed |
| Points limit form | Frontend (React) | -- | Already exists in ArmyListSheet, just needs activation |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI components | Project standard [VERIFIED: package.json] |
| TypeScript | 5.x | Type safety | Project standard [VERIFIED: package.json] |
| TailwindCSS | 4.x | Styling | Project standard [VERIFIED: package.json] |
| shadcn/ui | new-york preset | UI primitives (Select, Badge, Tooltip) | Project standard [VERIFIED: CLAUDE.md] |
| React Query | 5.x | Server state | Project standard [VERIFIED: package.json] |
| Zod | 3.x | Schema validation | Project standard [VERIFIED: package.json] |
| Vitest | 4.x | Testing | Project standard [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | latest | Icons (AlertTriangle, Info) | Warning indicator icons |
| sonner | latest | Toast notifications | Error feedback on mutation failure |

No new dependencies required. All components use existing project libraries.

## Architecture Patterns

### System Architecture Diagram

```
ArmyListSheet (form)
    |
    v [points_limit input]
updateArmyList() --> army_lists table
                         |
ArmyListDetailSheet      |
    |                    |
    v                    v
getArmyListWithUnits() --> JOIN army_list_units + units + unit_overrides + synced_unit_points
    |                           |
    |                   returns ArmyListUnitRow[] with:
    |                   - effective_points (COALESCE chain)
    |                   - status_assembly, status_painting
    |                   - points_override, tactical_role (NEW)
    |
    v
computeUnitWarnings()   <-- pure function, per unit
    |
    v
ArmyListSummaryBar (extended)
    |-- points total / limit (color-coded)
    |-- ownership %
    |-- readiness % + progress bar
    |-- PointsFreshnessBadge (embedded)
    |-- warning count badge
    |-- role coverage pills (conditional)
    |-- not-ready unit list (existing)
    |
ArmyListUnitRow (extended)
    |-- warning icon (AlertTriangle / Info) with tooltip
    |-- tactical role Select dropdown
    |-- existing: points override, tier selector, notes
```

### Recommended File Changes

```
src/
  lib/
    computeUnitWarnings.ts     # NEW — pure warning classification function
  types/
    armyList.ts                # MODIFY — add tactical_role to ArmyListUnitRow, add TACTICAL_ROLES const
  db/queries/
    armyLists.ts               # MODIFY — extend getArmyListWithUnits SELECT, extend updateArmyListUnit
  hooks/
    useArmyLists.ts            # MODIFY — update UpdateArmyListUnitVariables type
  features/army-lists/
    ArmyListSummaryBar.tsx     # MODIFY — extend into health summary
    ArmyListUnitRow.tsx        # MODIFY — add warning icons + role dropdown
    ArmyListSheet.tsx          # MODIFY — add points_limit input (already exists in form!)
    ArmyListDetailSheet.tsx    # MODIFY — pass pointsLimit + listId to SummaryBar
    armyListSchema.ts          # NO CHANGE — points_limit already in schema

src-tauri/migrations/
    025_tactical_role.sql      # NEW — add tactical_role column

tests/lib/
    computeUnitWarnings.test.ts  # NEW — unit tests for warning classification
```

### Pattern 1: Pure Warning Computation (follows computeWorkflowPosition)

**What:** A pure function that takes unit data + list context and returns classified warnings
**When to use:** Every unit row render and summary bar aggregation

```typescript
// Source: codebase pattern from src/lib/computeWorkflowPosition.ts
export interface UnitWarnings {
  hard: string[];
  soft: string[];
}

export interface WarningContext {
  totalPoints: number;
  pointsLimit: number | null;
  freshness: SyncFreshness;
}

export function computeUnitWarnings(
  unit: Pick<ArmyListUnitRow, "effective_points" | "points_override" | "status_painting" | "status_assembly">,
  context: WarningContext,
): UnitWarnings {
  const hard: string[] = [];
  const soft: string[] = [];

  // Hard: points exceeded (list-level, but flagged on every unit)
  if (context.pointsLimit !== null && context.totalPoints > context.pointsLimit) {
    hard.push("Points exceeded");
  }

  // Soft warnings
  if (unit.status_painting !== "Completed") soft.push("Not painted");
  if (unit.status_assembly === 0) soft.push("Not assembled");
  if (unit.points_override !== null) soft.push("Manual override");
  if (unit.effective_points === 0) soft.push("Unknown points");
  if (context.freshness === "stale") soft.push("Stale points");

  return { hard, soft };
}
```

### Pattern 2: Const Array Enum (follows PAINTING_STATUS_ORDER)

**What:** Fixed tactical role enum as const array + inferred type
**When to use:** Type definition for tactical_role column values

```typescript
// Source: codebase pattern from src/types/unit.ts PAINTING_STATUS_ORDER
export const TACTICAL_ROLES = [
  "anti_tank",
  "screening",
  "objective_holder",
  "fire_support",
  "melee_threat",
  "utility",
  "transport",
] as const;

export type TacticalRole = typeof TACTICAL_ROLES[number];

export const TACTICAL_ROLES_DISPLAY: Record<TacticalRole, string> = {
  anti_tank: "Anti-Tank",
  screening: "Screening",
  objective_holder: "Obj. Holder",
  fire_support: "Fire Support",
  melee_threat: "Melee Threat",
  utility: "Utility",
  transport: "Transport",
};
```

### Pattern 3: Full-Replacement UPDATE Extension

**What:** Extending updateArmyListUnit to include tactical_role
**When to use:** When adding new columns to the join table

```typescript
// Source: existing pattern in src/db/queries/armyLists.ts line 155
// CRITICAL: full-replacement, NOT COALESCE — all fields must be passed every time
export async function updateArmyListUnit(input: UpdateArmyListUnitInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET points_override=$2, notes=$3, tactical_role=$4 WHERE id=$1",
    [input.id, input.points_override, input.notes, input.tactical_role]
  );
}
```

### Anti-Patterns to Avoid
- **Reimplementing COALESCE in JS:** Never compute effective_points in TypeScript. It is SQL-computed and the UI sums it directly. [VERIFIED: codebase comments + CLAUDE.md]
- **Partial update on army_list_units:** The UPDATE is full-replacement. Every caller MUST pass ALL fields (points_override, notes, tactical_role) or the un-passed field gets overwritten with undefined. [VERIFIED: existing code comments]
- **Using "Complete" instead of "Completed":** The canonical fully-painted status is "Completed" from PAINTING_STATUS_ORDER. "Complete" does not exist. [VERIFIED: src/types/unit.ts]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Freshness display | Custom freshness badge | PointsFreshnessBadge (self-contained) | Already queries useRulesSyncMeta internally, shared cache |
| Status badges | Custom status pills | StatusBadge from components/ui | Consistent styling across app |
| Dropdown UI | Custom select | shadcn Select component | Already used in ArmyListUnitRow for tier selector |
| Tooltip | Custom hover popup | shadcn Tooltip | Already used by PointsFreshnessBadge |

## Common Pitfalls

### Pitfall 1: COALESCE Blocks NULL-Clearing on points_limit

**What goes wrong:** `updateArmyList` uses `COALESCE($4, points_limit)` for the points_limit column. Passing `null` preserves the old value instead of clearing it. Users cannot remove a points limit once set.
**Why it happens:** The same COALESCE-blocks-null pattern that required `clearArmyListDetachment` for detachment columns.
**How to avoid:** Either (a) create a `clearArmyListPointsLimit()` query function (like `clearArmyListDetachment`), or (b) handle in the form by passing a sentinel value, or (c) modify the ArmyListSheet submit to call a separate clear function when points_limit transitions from non-null to null.
**Warning signs:** User sets a points limit, then tries to remove it, and it persists. [VERIFIED: src/db/queries/armyLists.ts line 91]

### Pitfall 2: Full-Replacement UPDATE Must Pass ALL Fields

**What goes wrong:** Adding `tactical_role` to `updateArmyListUnit` means every existing call site (points override blur, notes save) must now also pass `tactical_role` to avoid overwriting it.
**Why it happens:** The UPDATE is `SET points_override=$2, notes=$3, tactical_role=$4` with no COALESCE. Omitting a field sets it to undefined/null.
**How to avoid:** Audit all call sites of `updateArmyListUnit` and add `tactical_role: unit.tactical_role` (preserve current value) to every mutation call.
**Warning signs:** Saving notes clears the tactical role, or changing points override resets the role. [VERIFIED: src/features/army-lists/ArmyListUnitRow.tsx lines 76-85, 94-108]

### Pitfall 3: Migration Number Collision

**What goes wrong:** CONTEXT.md says "Migration 021" but migration 021 already exists (`021_applied_recipe_assignments.sql`). The latest migration is `024_points_import_history.sql`.
**Why it happens:** CONTEXT.md was written before Phase 65 shipped migrations 021-024.
**How to avoid:** Use migration number 025 (`025_tactical_role.sql`). [VERIFIED: migration file listing]

### Pitfall 4: Points-Exceeded is List-Level, Not Unit-Level

**What goes wrong:** The "points exceeded" warning applies when the SUM of all effective_points exceeds points_limit. It's a list-level condition flagged on every unit, not a per-unit calculation.
**Why it happens:** Confusing the warning classification with per-unit data.
**How to avoid:** The `computeUnitWarnings` function receives `totalPoints` and `pointsLimit` as context parameters, not per-unit data. The sum is computed once in the parent component and passed down.

### Pitfall 5: addUnitToList Does Not Include tactical_role

**What goes wrong:** The `addUnitToList` INSERT only passes `points_override` and `notes`. New units added to a list will have `tactical_role = NULL`, which is correct (unassigned by default). But the `AddUnitToListInput` type needs no change since NULL default is desired.
**Why it happens:** N/A -- this is correct behavior, not a bug. Noting it to prevent unnecessary type changes.

### Pitfall 6: ArmyListSheet Already Has points_limit Field

**What goes wrong:** Implementing a new points_limit input when one already exists in the form.
**Why it happens:** D-14 says "needs a points_limit input field" but ArmyListSheet.tsx already has it at line 210-230 with proper Zod validation.
**How to avoid:** The form field exists. The "activation" is about the SummaryBar using it for display and validation, not about adding a form field. No form changes needed unless the existing field needs UX polish. [VERIFIED: src/features/army-lists/ArmyListSheet.tsx lines 210-230, armyListSchema.ts line 31]

## Code Examples

### Extended getArmyListWithUnits SQL

```sql
-- Source: existing query at src/db/queries/armyLists.ts line 52, extended
SELECT
  alu.id, alu.list_id, alu.unit_id, alu.points_override, alu.notes,
  alu.tactical_role,  -- NEW
  alu.created_at,
  u.name AS unit_name,
  u.points AS unit_points,
  u.faction_id,
  u.status_assembly,
  u.status_painting,
  u.painting_percentage,
  COALESCE(alu.points_override, sup.points, uo.points, u.points, 0) AS effective_points
FROM army_list_units alu
JOIN units u ON u.id = alu.unit_id
LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
LEFT JOIN synced_unit_points sup ON sup.unit_name = u.name
  AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))
WHERE alu.list_id = $1
ORDER BY alu.created_at ASC
```

### Migration 025

```sql
-- 025_tactical_role.sql
ALTER TABLE army_list_units ADD COLUMN tactical_role TEXT DEFAULT NULL;
```

### Role Coverage Aggregation (in SummaryBar)

```typescript
// Computed in ArmyListSummaryBar via useMemo
const roleCounts = useMemo(() => {
  const counts: Record<TacticalRole, number> = {
    anti_tank: 0, screening: 0, objective_holder: 0,
    fire_support: 0, melee_threat: 0, utility: 0, transport: 0,
  };
  for (const u of units) {
    if (u.tactical_role && u.tactical_role in counts) {
      counts[u.tactical_role as TacticalRole]++;
    }
  }
  return counts;
}, [units]);

const hasAnyRole = units.some((u) => u.tactical_role !== null);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SummaryBar shows 3 stats only | Extended to full health panel | Phase 66 | Ownership, freshness, warnings added |
| No warning system | Pure function warning classification | Phase 66 | Testable, consistent warning logic |
| No tactical roles | Single role per unit via TEXT column | Phase 66 | Simple start, upgradeable to multi-role later |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "Not in collection" warning is always false in current schema (D-15 states FK ensures ownership) | Pitfall 5 | Low -- would just add an unused warning path |

All other claims verified against codebase source code.

## Open Questions (RESOLVED)

1. **Points-limit NULL-clearing strategy**
   - What we know: updateArmyList uses COALESCE which blocks NULL passthrough for points_limit
   - What's unclear: Whether to create a separate `clearArmyListPointsLimit()` or modify the update function
   - Recommendation: Create a `clearArmyListPointsLimit()` function following the `clearArmyListDetachment` pattern -- it's a 5-line function and the pattern is already established

2. **Freshness context for per-unit warnings**
   - What we know: PointsFreshnessBadge queries useRulesSyncMeta internally; computeUnitWarnings needs freshness tier
   - What's unclear: Whether to pass freshness as a prop from the parent (which already has syncMeta) or let computeUnitWarnings accept a pre-computed SyncFreshness
   - Recommendation: Pass `SyncFreshness` as part of WarningContext -- the parent component already has access to syncMeta via the existing hook in ArmyListDetailSheet

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + React Testing Library 16 |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LV-01 | computeUnitWarnings classifies hard/soft warnings correctly | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | Wave 0 |
| LV-01 | Points exceeded triggers when total > limit, suppressed when limit NULL | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | Wave 0 |
| LV-01 | Soft warnings: unpainted, unassembled, manual override, unknown points, stale | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | Wave 0 |
| LV-02 | Tactical role persists via updateArmyListUnit and appears in getArmyListWithUnits | manual-only | N/A -- requires Tauri SQLite bridge | N/A |
| LV-03 | Role coverage counts computed correctly from units array | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | Wave 0 |
| LV-04 | Ownership % computed correctly (all owned = 100%) | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/lib/computeUnitWarnings.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/computeUnitWarnings.test.ts` -- covers LV-01, LV-03, LV-04 warning/coverage/ownership computation

## Security Domain

This phase introduces no authentication, session, access control, cryptographic, or input validation concerns beyond what already exists. Tactical role values are constrained to a fixed enum in TypeScript (TACTICAL_ROLES const array) and stored as TEXT in SQLite. Points limit is validated by Zod schema (z.number().int().min(0).nullable()). All queries use parameterized `$1, $2` syntax (existing pattern). No new external inputs or attack surfaces.

## Sources

### Primary (HIGH confidence)
- `src/db/queries/armyLists.ts` -- all COALESCE sites, updateArmyListUnit full-replacement pattern
- `src/types/armyList.ts` -- ArmyListUnitRow interface, type patterns
- `src/features/army-lists/ArmyListSummaryBar.tsx` -- existing layout and computation
- `src/features/army-lists/ArmyListUnitRow.tsx` -- existing row layout, mutation call sites
- `src/features/army-lists/ArmyListSheet.tsx` -- existing points_limit form field
- `src/features/army-lists/ArmyListDetailSheet.tsx` -- integration target, existing structure
- `src/lib/computeWorkflowPosition.ts` -- pure function pattern to follow
- `src/lib/syncFreshness.ts` -- freshness tier computation, reusable types
- `src-tauri/migrations/` -- migration numbering (latest: 024)
- `.planning/phases/66-army-list-validation/66-UI-SPEC.md` -- approved visual/interaction contract

### Secondary (MEDIUM confidence)
- `.planning/phases/66-army-list-validation/66-CONTEXT.md` -- locked decisions from discuss phase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing project libraries
- Architecture: HIGH -- all patterns verified against existing codebase
- Pitfalls: HIGH -- all identified from direct code inspection (especially COALESCE null-clearing, full-replacement UPDATE, migration numbering)

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (stable -- internal codebase patterns, no external API changes)
