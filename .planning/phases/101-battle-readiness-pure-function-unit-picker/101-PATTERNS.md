# Phase 101: Battle-Readiness Pure Function & Unit Picker - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 4 (2 new, 2 modified)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/readiness.ts` | utility | transform | `src/lib/computeUnitWarnings.ts` | exact |
| `tests/lib/readiness.test.ts` | test | transform | `tests/lib/computeUnitWarnings.test.ts` | exact |
| `src/features/army-lists/UnitPickerDialog.tsx` | component | request-response | (self — existing file being modified) | exact |
| `src/features/army-lists/ArmyListDetailPage.tsx` | component | request-response | (self — existing file being modified) | exact |

## Pattern Assignments

### `src/lib/readiness.ts` (utility, transform) -- NEW

**Analog:** `src/lib/computeUnitWarnings.ts`

**Imports pattern** (lines 16-17):
```typescript
import type { SyncFreshness } from "@/lib/syncFreshness";
import type { ArmyListUnitRow } from "@/types/armyList";
```
For readiness.ts, adapt to:
```typescript
import type { PaintingStatus } from "@/types/unit";
```

**Type definitions pattern** (lines 23-26):
```typescript
export interface UnitWarnings {
  hard: string[];
  soft: string[];
}
```
The project defines result interfaces directly in the same file as the pure function, exported for consumers.

**Core pure function pattern** (lines 53-67):
```typescript
export function computeUnitWarnings(
  unit: Pick<ArmyListUnitRow, "effective_points" | "points_override" | "status_painting" | "status_assembly">,
  _context: WarningContext,
): UnitWarnings {
  const hard: string[] = [];
  const soft: string[] = [];

  // Soft warnings (unit-level only)
  if (unit.status_painting !== "Completed") soft.push("Not painted");
  if (unit.status_assembly === 0) soft.push("Not assembled");
  if (unit.points_override !== null) soft.push("Manual override");
  if (unit.effective_points === 0) soft.push("Unknown points");

  return { hard, soft };
}
```
Key conventions:
- Uses `Pick<>` on existing interface for input type (or defines a dedicated input interface)
- JSDoc comment block at top of file explaining purpose + what phase introduced it
- No side effects, no DB dependency, no React imports
- Boolean checks on `0 | 1` integer fields use `=== 1` or `=== 0` (never truthy/falsy)

---

### `tests/lib/readiness.test.ts` (test, transform) -- NEW

**Analog:** `tests/lib/computeUnitWarnings.test.ts`

**Imports pattern** (lines 1-8):
```typescript
import { describe, expect, it } from "vitest";
import {
  computeUnitWarnings,
  computeListWarnings,
  computeListHealthStats,
} from "@/lib/computeUnitWarnings";
import type { WarningContext } from "@/lib/computeUnitWarnings";
import type { ArmyListUnitRow } from "@/types/armyList";
```

**Factory helper pattern** (lines 13-41):
```typescript
function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
  return {
    id: 1,
    list_id: 1,
    unit_id: 1,
    // ... all required fields with healthy defaults
    status_assembly: 1,
    status_painting: "Completed",
    painting_percentage: 100,
    ...overrides,
  };
}
```
Key conventions:
- Factory function named `make<Entity>` with `overrides: Partial<T> = {}` parameter
- Defaults represent the "happy path" (all green / no warnings)
- Spread `...overrides` at the end so tests only specify the fields under test

**Test structure pattern** (lines 55-180):
```typescript
describe("computeUnitWarnings", () => {
  it("returns soft 'Not painted' when status_painting !== 'Completed'", () => {
    const unit = makeUnit({ status_painting: "Primed" });
    const ctx = makeContext();
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).toContain("Not painted");
  });

  it("does NOT return 'Not painted' when status_painting === 'Completed'", () => {
    const unit = makeUnit({ status_painting: "Completed" });
    const ctx = makeContext();
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).not.toContain("Not painted");
  });
});
```
Key conventions:
- Each boolean condition has both positive and negative test cases
- Test descriptions use `returns X when Y` / `does NOT return X when Y` pattern
- Tests are flat (no nested describes beyond the top-level function grouping)
- `toContain` / `not.toContain` for array membership, `toEqual([])` for empty arrays

---

### `src/features/army-lists/UnitPickerDialog.tsx` (component, request-response) -- MODIFIED

**Analog:** Self (current implementation, lines 1-113)

**Current imports** (lines 1-19):
```typescript
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useUnits } from "@/hooks/useUnits";
import { useAddUnitToList } from "@/hooks/useArmyLists";
```
New imports needed:
- `import { useUnitsEnriched } from "@/hooks/useUnits";` (replace `useUnits`)
- `import { Checkbox } from "@/components/ui/checkbox";`
- `import { computeUnitReadiness } from "@/lib/readiness";`
- `import type { UnitReadiness } from "@/lib/readiness";`

**Current props interface** (lines 21-28):
```typescript
interface UnitPickerDialogProps {
  open: boolean;
  listId: number | null;
  factionId: number | null;
  onClose: () => void;
}
```
Add optional budget props: `remaining?: number | null; pointsLimit?: number | null;`

**Current hook call** (line 48):
```typescript
const { data: units = [] } = useUnits();
```
Switch to: `const { data: units = [] } = useUnitsEnriched();`

**Current CommandItem row** (lines 93-106):
```typescript
<CommandItem
  key={unit.id}
  value={`${unit.name}-${unit.id}`}
  onSelect={() => handleSelect(unit.id)}
>
  <span className="flex-1">{unit.name}</span>
  {unit.category && (
    <Badge variant="secondary" className="ml-auto">
      {unit.category}
    </Badge>
  )}
</CommandItem>
```
This is the injection point for readiness badges and points display. Add between the name span and the category badge.

**Badge styling pattern** (from `src/components/ui/badge.tsx` lines 7-27):
```typescript
// variant="secondary" is used for metadata display in picker rows
// Custom className overrides for "Battle Ready" success badge:
<Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
  Battle Ready
</Badge>
```

**Checkbox pattern** (from `src/components/ui/checkbox.tsx`):
```typescript
import { Checkbox } from "@/components/ui/checkbox";
// Usage with label:
<div className="flex items-center gap-2">
  <Checkbox id="fits-budget" checked={fitsBudget} onCheckedChange={setFitsBudget} />
  <label htmlFor="fits-budget" className="text-sm">Fits budget</label>
</div>
```

**StatusBadge pattern** (from `src/components/ui/status-badge.tsx` lines 41-49):
```typescript
export function StatusBadge({ status }: StatusBadgeProps) {
  const tier = PAINTING_STATUS_TIER[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2 w-2 rounded-full shrink-0 ${TIER_DOT_CLASS[tier]}`} />
      {status}
    </span>
  );
}
```
Readiness dots should follow the same `h-2 w-2 rounded-full` pattern for visual consistency but at a smaller scale (`h-1.5 w-1.5`) to fit the compact CommandItem rows.

---

### `src/features/army-lists/ArmyListDetailPage.tsx` (component, request-response) -- MODIFIED

**Analog:** Self (current implementation)

**totalPoints computation** (line 330-332):
```typescript
const totalPoints = useMemo(
  () => (units ?? []).reduce((sum, u) => sum + u.effective_points, 0),
  [units],
);
```
Add a `remaining` computation after this:
```typescript
const remaining = list.points_limit != null
  ? list.points_limit - totalPoints
  : null;
```

**UnitPickerDialog invocation** (lines 883-888):
```typescript
<UnitPickerDialog
  open={unitPickerOpen}
  listId={listId}
  factionId={list.faction_id ?? null}
  onClose={() => dispatch({ type: "CLOSE_UNIT_PICKER" })}
/>
```
Add `remaining` and `pointsLimit` props:
```typescript
<UnitPickerDialog
  open={unitPickerOpen}
  listId={listId}
  factionId={list.faction_id ?? null}
  remaining={remaining}
  pointsLimit={list.points_limit}
  onClose={() => dispatch({ type: "CLOSE_UNIT_PICKER" })}
/>
```

---

## Shared Patterns

### Pure Function Placement
**Source:** `src/lib/computeUnitWarnings.ts` (entire file structure)
**Apply to:** `src/lib/readiness.ts`
- JSDoc header comment referencing phase number and requirement IDs
- Types exported from the same file (not split into types/)
- Function takes a `Pick<>` of an existing interface or a dedicated input interface
- No side effects, no imports from React or DB layers

### Badge Display in CommandItem Rows
**Source:** `src/features/army-lists/UnitPickerDialog.tsx` lines 100-104
**Apply to:** Same file (extended with readiness badges)
```typescript
{unit.category && (
  <Badge variant="secondary" className="ml-auto">
    {unit.category}
  </Badge>
)}
```
Readiness info should use the same `Badge` component. For the "Battle Ready" state, use a custom green-tinted className. For partial readiness, use small dot spans matching the StatusBadge dot pattern.

### Boolean Status Handling
**Source:** `src/types/unit.ts` lines 33-38
**Apply to:** `src/lib/readiness.ts`
```typescript
// SQLite stores booleans as INTEGER 0/1 (Pitfall 1)
status_assembly: 0 | 1;
status_basing: 0 | 1;
status_varnished: 0 | 1;
```
Always compare with `=== 1` or `=== 0`, never use truthy/falsy checks on these fields.

### useUnitsEnriched Hook
**Source:** `src/hooks/useUnits.ts` lines 20-23
**Apply to:** `UnitPickerDialog.tsx` (replacing `useUnits()`)
```typescript
/** Units with effective_points resolved from rules.db sync + manual override. */
export function useUnitsEnriched() {
  return useQuery({ queryKey: UNITS_ENRICHED_KEY, queryFn: getUnitsWithPoints });
}
```
Returns `EnrichedUnit[]` which extends `Unit` with `effective_points: number`, `synced_points: number | null`, `is_synced: boolean`.

### Test Factory Functions
**Source:** `tests/lib/computeUnitWarnings.test.ts` lines 13-41
**Apply to:** `tests/lib/readiness.test.ts`
```typescript
function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
  return {
    // ... healthy defaults ...
    ...overrides,
  };
}
```
For readiness tests, use a simpler factory matching `ReadinessInput`:
```typescript
function makeInput(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    status_painting: "Completed",
    status_assembly: 1,
    status_basing: 1,
    status_varnished: 1,
    ...overrides,
  };
}
```

## No Analog Found

No files lack analogs -- all 4 files have exact or self matches in the codebase.

## Metadata

**Analog search scope:** `src/lib/`, `src/features/army-lists/`, `src/hooks/`, `src/components/ui/`, `tests/lib/`
**Files scanned:** 8 analog files read
**Pattern extraction date:** 2026-05-28
