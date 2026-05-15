# Phase 76: Points Resolver + Unit Rules Mapping + Split Warnings - Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 16 (6 new, 10 modified)
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/resolveUnitPoints.ts` | utility | transform | `src/lib/computeUnitWarnings.ts` | exact |
| `src/types/unitRulesMapping.ts` | model | N/A | `src/types/unitOverride.ts` | exact |
| `src/db/queries/unitRulesMapping.ts` | service | CRUD | `src/db/queries/unitOverrides.ts` | exact |
| `src/hooks/useUnitRulesMapping.ts` | hook | request-response | `src/hooks/useUnitOverride.ts` | exact |
| `src/features/army-lists/PointsSourceChip.tsx` | component | transform | `src/features/army-lists/PointsFreshnessBadge.tsx` | exact |
| `src/features/army-lists/MatchStatusIndicator.tsx` | component | request-response | `src/components/ui/status-badge.tsx` | role-match |
| `src/features/army-lists/RulesMappingSheet.tsx` | component | CRUD | `src/features/factions/FactionSheet.tsx` | exact |
| `src/lib/computeUnitWarnings.ts` | utility | transform | (self — refactor) | exact |
| `src/types/armyList.ts` | model | N/A | (self — extend) | exact |
| `src/db/queries/armyLists.ts` | service | CRUD | (self — modify SQL) | exact |
| `src/db/queries/dashboard.ts` | service | CRUD | `src/db/queries/armyLists.ts` | exact |
| `src/features/army-lists/ArmyListSummaryBar.tsx` | component | transform | (self — refactor) | exact |
| `src/features/army-lists/ArmyListUnitRow.tsx` | component | request-response | (self — extend) | exact |
| `tests/lib/resolveUnitPoints.test.ts` | test | N/A | `tests/lib/computeUnitWarnings.test.ts` | exact |
| `tests/lib/computeUnitWarnings.test.ts` | test | N/A | (self — update) | exact |
| `tests/army-list/unitRulesMappingQueries.test.ts` | test | N/A | `tests/lib/computeUnitWarnings.test.ts` | role-match |

## Pattern Assignments

### `src/lib/resolveUnitPoints.ts` (utility, transform) -- NEW

**Analog:** `src/lib/computeUnitWarnings.ts`

**Imports pattern** (line 1):
```typescript
// Pure function file — no React, no DB, no hooks. Only type imports.
import type { SyncFreshness } from "@/lib/syncFreshness";
import type { ArmyListUnitRow } from "@/types/armyList";
```

**Core pattern** (lines 49-71 of computeUnitWarnings.ts):
```typescript
// Pure function: takes typed input, returns typed result. No async. No side effects.
export function computeUnitWarnings(
  unit: Pick<ArmyListUnitRow, "effective_points" | "points_override" | "status_painting" | "status_assembly">,
  context: WarningContext,
): UnitWarnings {
  const hard: string[] = [];
  const soft: string[] = [];
  // ... classification logic ...
  return { hard, soft };
}
```

**Type exports pattern** (lines 18-37 of computeUnitWarnings.ts):
```typescript
// Colocate types with the function when they're only used by this module + its consumers
export interface UnitWarnings {
  hard: string[];
  soft: string[];
}

export interface WarningContext {
  totalPoints: number;
  pointsLimit: number | null;
  freshness: SyncFreshness;
}
```

---

### `src/types/unitRulesMapping.ts` (model) -- NEW

**Analog:** `src/types/unitOverride.ts`

**Full file pattern** (lines 1-48):
```typescript
/**
 * UnitOverride entity (OVRD-01..04).
 * Mirrors the unit_overrides table in 017_unit_overrides.sql.
 * [doc block explaining the entity and its relationship to DB schema]
 */
export interface UnitOverride {
  id: number;
  unit_id: number;
  points: number | null;
  // ... all DB columns, nullable where appropriate ...
  created_at: string;
  updated_at: string;
}

/**
 * Upsert payload — all user-editable fields plus unit_id.
 * [doc block explaining upsert semantics]
 */
export type UpsertUnitOverrideInput = {
  unit_id: number;
  points: number | null;
  // ... editable fields only (no id, created_at, updated_at) ...
};
```

**Const array + union type pattern** (from `src/types/armyList.ts` lines 87-97):
```typescript
export const TACTICAL_ROLES = [
  "anti_tank",
  "screening",
  // ...
] as const;

export type TacticalRole = typeof TACTICAL_ROLES[number];
```

---

### `src/db/queries/unitRulesMapping.ts` (service, CRUD) -- NEW

**Analog:** `src/db/queries/unitOverrides.ts`

**Imports pattern** (lines 1-2):
```typescript
import { getDb } from "@/db/client";
import type { UnitOverride, UpsertUnitOverrideInput } from "@/types/unitOverride";
```

**Get single row pattern** (lines 16-23):
```typescript
export async function getUnitOverride(unitId: number): Promise<UnitOverride | null> {
  const db = await getDb();
  const rows = await db.select<UnitOverride[]>(
    "SELECT * FROM unit_overrides WHERE unit_id = $1 LIMIT 1",
    [unitId],
  );
  return rows[0] ?? null;
}
```

**Upsert (select-then-insert/update) pattern** (lines 25-69):
```typescript
export async function upsertUnitOverride(input: UpsertUnitOverrideInput): Promise<void> {
  const db = await getDb();
  const existing = await db.select<{ id: number }[]>(
    "SELECT id FROM unit_overrides WHERE unit_id = $1",
    [input.unit_id],
  );
  if (existing.length > 0) {
    await db.execute(
      `UPDATE unit_overrides SET
         points=$2, move=$3, ...,
         updated_at=datetime('now')
       WHERE unit_id=$1`,
      [input.unit_id, input.points ?? null, ...],
    );
  } else {
    await db.execute(
      `INSERT INTO unit_overrides
         (unit_id, points, move, ...)
       VALUES ($1, $2, $3, ...)`,
      [input.unit_id, input.points ?? null, ...],
    );
  }
}
```

**Delete pattern** (lines 72-75):
```typescript
export async function deleteUnitOverride(unitId: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM unit_overrides WHERE unit_id = $1", [unitId]);
}
```

**Cross-DB query pattern** (from `src/db/queries/syncedUnitPoints.ts` lines 50-60, for ambiguity detection against hobbyforge.db):
```typescript
export async function getSyncedUnitPointsMap(): Promise<Map<string, number>> {
  const db = await getDb();
  const rows = await db.select<{ unit_name: string; faction_id: string | null; points: number }[]>(
    "SELECT unit_name, faction_id, points FROM synced_unit_points",
  );
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(`${row.unit_name}:${row.faction_id}`, row.points);
  }
  return map;
}
```

---

### `src/hooks/useUnitRulesMapping.ts` (hook, request-response) -- NEW

**Analog:** `src/hooks/useUnitOverride.ts`

**Full file pattern** (lines 1-59):
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUnitOverride,
  upsertUnitOverride,
  deleteUnitOverride,
} from "@/db/queries/unitOverrides";
import type { UpsertUnitOverrideInput } from "@/types/unitOverride";

// Key factory
export const UNIT_OVERRIDE_KEY = (unitId: number) => ["unit-override", unitId] as const;

// Query hook with optional unitId (supports sheets that mount before selection)
export function useUnitOverride(unitId: number | undefined) {
  return useQuery({
    queryKey:
      unitId !== undefined ? UNIT_OVERRIDE_KEY(unitId) : (["unit-override"] as const),
    queryFn: () =>
      unitId !== undefined ? getUnitOverride(unitId) : Promise.resolve(null),
    enabled: unitId !== undefined,
    staleTime: Infinity,
  });
}

// Mutation with cache invalidation symmetry
export function useUpsertUnitOverride() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpsertUnitOverrideInput>({
    mutationFn: upsertUnitOverride,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: UNIT_OVERRIDE_KEY(variables.unit_id) });
      // Cascade invalidation: related views must refetch
      qc.invalidateQueries({ queryKey: ["army-lists"], exact: false });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"], exact: false });
    },
  });
}

export function useDeleteUnitOverride() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteUnitOverride,
    onSuccess: (_, unitId) => {
      qc.invalidateQueries({ queryKey: UNIT_OVERRIDE_KEY(unitId) });
      qc.invalidateQueries({ queryKey: ["army-lists"], exact: false });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"], exact: false });
    },
  });
}
```

---

### `src/features/army-lists/PointsSourceChip.tsx` (component, transform) -- NEW

**Analog:** `src/features/army-lists/PointsFreshnessBadge.tsx`

**Imports pattern** (lines 1-8):
```typescript
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
```

**Dot + label display pattern** (lines 44-58):
```typescript
return (
  <div className="flex items-center gap-1.5">
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            FRESHNESS_DOT_CLASS[freshness],
          )}
        />
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
    <span className="text-xs text-muted-foreground">{displayLabel}</span>
  </div>
);
```

---

### `src/features/army-lists/MatchStatusIndicator.tsx` (component, request-response) -- NEW

**Analog:** `src/components/ui/status-badge.tsx`

**Tier-based dot/icon pattern** (lines 30-48):
```typescript
const TIER_DOT_CLASS: Record<Tier, string> = {
  "not-started": "bg-muted-foreground/50",
  prep: "bg-slate-400",
  painting: "bg-violet-400",
  done: "bg-emerald-400",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const tier = PAINTING_STATUS_TIER[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-1 w-1 rounded-full shrink-0 ${TIER_DOT_CLASS[tier]}`} />
      {status}
    </span>
  );
}
```

**Inline icon button pattern** (from `ArmyListUnitRow.tsx` lines 274-286):
```typescript
<Button
  type="button"
  variant="ghost"
  size="icon"
  className="h-7 w-7"
  onClick={() => setExpanded((v) => !v)}
  aria-label={expanded ? "Collapse notes" : "Expand notes"}
>
  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
</Button>
```

---

### `src/features/army-lists/RulesMappingSheet.tsx` (component, CRUD) -- NEW

**Analog:** `src/features/factions/FactionSheet.tsx`

**Sheet structure pattern** (lines 108-247):
```typescript
interface FactionSheetProps {
  open: boolean;
  faction: Faction | null; // null = create mode; Faction = edit mode
  onClose: () => void;
}

export function FactionSheet({ open, faction, onClose }: FactionSheetProps) {
  const createFaction = useCreateFaction();
  const updateFaction = useUpdateFaction();
  const isEdit = faction !== null;

  // ... form setup with useForm + zodResolver ...

  async function onSubmit(values: FactionFormValues) {
    try {
      if (isEdit && faction) {
        await updateFaction.mutateAsync({ ... });
        toast.success("Faction updated.");
      } else {
        await createFaction.mutateAsync({ ... });
        toast.success("Faction created.");
      }
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>...</SheetTitle>
          <SheetDescription>...</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
            {/* FormField components */}
            <SheetFooter className="mt-6 gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Discard changes</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>Save</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
```

**Sheet imports pattern** (lines 1-25):
```typescript
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
```

---

### `src/db/queries/armyLists.ts` (service, CRUD) -- MODIFY

**Self-reference:** Lines 52-72 of `src/db/queries/armyLists.ts`

**Current SQL SELECT to extend** (lines 55-63):
```sql
SELECT
  alu.id, alu.list_id, alu.unit_id, alu.points_override, alu.notes, alu.tactical_role, alu.created_at,
  u.name AS unit_name,
  u.points AS unit_points,
  u.faction_id,
  u.status_assembly,
  u.status_painting,
  u.painting_percentage,
  COALESCE(alu.points_override, sup.points, uo.points, u.points, 0) AS effective_points
```

Must add after `u.painting_percentage,`:
```sql
  sup.points AS synced_points,
  uo.points AS override_points,
```

---

### `src/db/queries/dashboard.ts` (service, CRUD) -- MODIFY

**Analog for COALESCE upgrade:** `src/db/queries/armyLists.ts` lines 63-68

**Current divergent SQL** (dashboard.ts lines 89-101):
```sql
SELECT
  f.id AS faction_id,
  f.name AS faction_name,
  f.color_theme,
  SUM(COALESCE(u.points, 0)) AS points_owned,
  SUM(CASE WHEN u.status_painting = 'Completed'
           THEN COALESCE(u.points, 0)
           ELSE 0 END) AS points_painted
FROM factions f
JOIN units u ON u.faction_id = f.id
GROUP BY f.id, f.name, f.color_theme
ORDER BY f.name ASC
```

**LEFT JOIN pattern to copy** (from armyLists.ts lines 64-68):
```sql
LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
LEFT JOIN synced_unit_points sup ON sup.unit_name = u.name
  AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))
```

---

### `src/lib/computeUnitWarnings.ts` (utility, transform) -- MODIFY

**Self-reference.** Current file is the analog. Key sections for the split:

**List-level warnings to extract** (lines 56-59, 66-68):
```typescript
// Hard: points exceeded when pointsLimit is set and total exceeds it
if (context.pointsLimit !== null && context.totalPoints > context.pointsLimit) {
  hard.push("Points exceeded");
}

// (inside soft block)
if (context.freshness === "stale" || context.freshness === "never") {
  soft.push("Stale points");
}
```

**computeListHealthStats deduplication to remove** (lines 103-108):
```typescript
let hardWarningCount = pointsExceeded ? 1 : 0;
let softWarningCount = 0;
for (const unit of units) {
  const warnings = computeUnitWarnings(unit, context);
  hardWarningCount += warnings.hard.filter((w) => w !== "Points exceeded").length;
  softWarningCount += warnings.soft.length;
}
```

---

### `src/features/army-lists/ArmyListUnitRow.tsx` (component, request-response) -- MODIFY

**Self-reference.** Key integration points:

**Warning display area** (lines 136-154) -- add PointsSourceChip + MatchStatusIndicator nearby:
```typescript
<div className="flex items-center">
  {warnings.hard.length > 0 ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex mr-1">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{[...warnings.hard, ...warnings.soft].join(", ")}</TooltipContent>
    </Tooltip>
  ) : /* ... */ null}
  <span>{unit.unit_name}</span>
</div>
```

**Points cell area** (lines 201-215) -- add source chip after the points Input:
```typescript
<TableCell>
  <div className="flex items-center gap-1.5">
    <Input type="number" min={0} className="w-20 h-7 text-sm" ... />
    {delta !== 0 && ( <Badge ... /> )}
  </div>
</TableCell>
```

---

### `src/features/army-lists/ArmyListSummaryBar.tsx` (component, transform) -- MODIFY

**Self-reference.** Key refactor point:

**Warning tooltip to change** (lines 96-111):
```typescript
{totalWarnings > 0 && (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className={`text-xs font-medium cursor-default ${
        stats.hardWarningCount > 0 ? "text-destructive" : "text-amber-500"
      }`}>
        Warnings: {totalWarnings}
      </span>
    </TooltipTrigger>
    <TooltipContent>
      {stats.hardWarningCount} critical, {stats.softWarningCount} informational
    </TooltipContent>
  </Tooltip>
)}
```

Must change to distinguish list-level vs unit-level warnings per D-13.

---

### `src/types/armyList.ts` (model) -- MODIFY

**Self-reference.** `ArmyListUnitRow` interface (lines 43-52) must add two nullable columns:

```typescript
export interface ArmyListUnitRow extends ArmyListUnit {
  unit_name: string;
  unit_points: number | null;
  effective_points: number;
  faction_id: number;
  status_assembly: number;
  status_painting: string;
  painting_percentage: number;
  tactical_role: string | null;
  // ADD:
  // synced_points: number | null;
  // override_points: number | null;
}
```

---

## Shared Patterns

### Database Access
**Source:** `src/db/client.ts` (getDb singleton)
**Apply to:** `unitRulesMapping.ts` queries, ambiguity detection queries
```typescript
import { getDb } from "@/db/client";
// All queries: const db = await getDb();
// Parameterized: db.select<T[]>("SELECT ... WHERE x = $1", [value]);
// Mutations: db.execute("INSERT ... VALUES ($1, $2)", [v1, v2]);
```

### Rules DB Access (for Sheet search)
**Source:** `src/db/rules-client.ts`
**Apply to:** `unitRulesMapping.ts` (findRulesDatasheets query only)
```typescript
import { getRulesDb } from "@/db/rules-client";
// const db = await getRulesDb();
// db.select<T[]>("SELECT ... FROM rw_datasheets WHERE ...", [...]);
```

### Toast Notifications
**Source:** Used consistently across all Sheets and mutation callbacks
**Apply to:** RulesMappingSheet, MatchStatusIndicator (confirm action)
```typescript
import { toast } from "sonner";
// Success: toast.success("Mapping confirmed.");
// Error: toast.error("Something went wrong. Please try again.");
```

### Cache Invalidation Pattern
**Source:** `src/hooks/useUnitOverride.ts` lines 39-44
**Apply to:** `useUnitRulesMapping.ts` mutations
```typescript
onSuccess: (_, variables) => {
  qc.invalidateQueries({ queryKey: UNIT_RULES_MAPPING_KEY(variables.unit_id) });
  // Cascade: army list views may show mapping indicators
  qc.invalidateQueries({ queryKey: ["army-lists"], exact: false });
},
```

### Tooltip + Dot Indicator
**Source:** `src/features/army-lists/PointsFreshnessBadge.tsx` lines 44-58
**Apply to:** PointsSourceChip, MatchStatusIndicator
```typescript
<Tooltip>
  <TooltipTrigger asChild>
    <span className={cn("inline-block h-2 w-2 rounded-full", dotClass)} />
  </TooltipTrigger>
  <TooltipContent>{label}</TooltipContent>
</Tooltip>
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | -- | -- | All files have strong analogs in the existing codebase |

## Metadata

**Analog search scope:** `src/lib/`, `src/types/`, `src/db/queries/`, `src/hooks/`, `src/features/army-lists/`, `src/features/factions/`, `src/components/ui/`
**Files scanned:** 12 analog files read
**Pattern extraction date:** 2026-05-14
