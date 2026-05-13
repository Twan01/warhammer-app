# Phase 67: Game Day Integration - Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 3 (1 new component, 1 modified page, 1 new test file)
**Analogs found:** 3 / 3

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/features/game-day/GameDayReadinessPanel.tsx` | component | request-response (read-only display) | `src/features/army-lists/ArmyListSummaryBar.tsx` | exact |
| `src/features/game-day/GameDayPage.tsx` | component (page) | request-response | `src/features/game-day/GameDayPage.tsx` (self — modification) | self |
| `tests/game-day/GameDayReadinessPanel.test.tsx` | test | — | `tests/workshop-play/armyListReadinessPanel.test.tsx` | exact |

---

## Pattern Assignments

### `src/features/game-day/GameDayReadinessPanel.tsx` (component, read-only display)

**Analog:** `src/features/army-lists/ArmyListSummaryBar.tsx`

**Imports pattern** (lines 1–18):
```typescript
import { useMemo, useState } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/ui/status-badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { computeListHealthStats, computeUnitWarnings } from "@/lib/computeUnitWarnings";
import type { WarningContext } from "@/lib/computeUnitWarnings";
import { PointsFreshnessBadge } from "./PointsFreshnessBadge";  // self-contained, no freshness prop needed
import type { ArmyListUnitRow } from "@/types/armyList";
import { TACTICAL_ROLES, TACTICAL_ROLES_DISPLAY } from "@/types/armyList";
import type { TacticalRole } from "@/types/armyList";
import type { SyncFreshness } from "@/lib/syncFreshness";
import type { PaintingStatus } from "@/types/unit";
```

**Props interface** (mirrors ArmyListSummaryBar exactly — analog lines 19–23):
```typescript
interface GameDayReadinessPanelProps {
  units: ArmyListUnitRow[];
  pointsLimit: number | null;
  freshness: SyncFreshness;
}
```

**Core useMemo pattern** (analog lines 33–36):
```typescript
const stats = useMemo(
  () => computeListHealthStats(units, pointsLimit, freshness),
  [units, pointsLimit, freshness],
);
```

**Per-unit warnings for collapsible** (from RESEARCH.md Pattern 3 + computeUnitWarnings.ts lines 49–71):
```typescript
const context: WarningContext = {
  totalPoints: stats.totalPoints,
  pointsLimit,
  freshness,
};
const unitsWithWarnings = useMemo(
  () =>
    units
      .map((u) => ({ unit: u, warnings: computeUnitWarnings(u, context) }))
      .filter(({ warnings }) => warnings.hard.length + warnings.soft.length > 0),
  [units, stats.totalPoints, pointsLimit, freshness],
);
```

**Points display pattern** (analog lines 67–69):
```typescript
const pointsValue = pointsLimit !== null
  ? `${stats.totalPoints} / ${pointsLimit} pts`
  : `${stats.totalPoints} pts`;
// Rendered with: valueClassName={stats.pointsExceeded ? "text-destructive" : undefined}
```

**Warning count with Tooltip pattern** (analog lines 95–110):
```typescript
{totalWarnings > 0 && (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        className={`text-xs font-medium cursor-default ${
          stats.hardWarningCount > 0 ? "text-destructive" : "text-amber-500"
        }`}
      >
        Warnings: {totalWarnings}
      </span>
    </TooltipTrigger>
    <TooltipContent>
      {stats.hardWarningCount} critical, {stats.softWarningCount} informational
    </TooltipContent>
  </Tooltip>
)}
```

**Collapsible pattern** (from collapsible.tsx + RESEARCH.md Pattern 3):
```typescript
const [open, setOpen] = useState(false);

<Collapsible open={open} onOpenChange={setOpen}>
  <CollapsibleTrigger asChild>
    <button>/* warning summary trigger */</button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {unitsWithWarnings.map(({ unit, warnings }) => (
      /* per-unit warning rows */
    ))}
  </CollapsibleContent>
</Collapsible>
```

**Role coverage pattern with guard** (analog lines 46–62, 64, 114–138):
```typescript
// Guard from ArmyListSummaryBar.tsx lines 57-59 — prevents wrong counts from
// unexpected tactical_role string values:
for (const u of units) {
  if (u.tactical_role && u.tactical_role in counts) {
    counts[u.tactical_role as TacticalRole] += 1;
  }
}

const hasAnyRole = units.some((u) => u.tactical_role !== null);

// Render only when hasAnyRole (progressive disclosure per D-09):
{hasAnyRole && (
  <div className="flex flex-wrap gap-2">
    {TACTICAL_ROLES.map((role) => {
      const count = roleCounts[role];
      const isCovered = count >= 1;
      return (
        <span
          key={role}
          className={
            isCovered
              ? "bg-secondary text-secondary-foreground rounded-full px-2 py-1 text-xs"
              : "bg-transparent border border-dashed border-muted-foreground/40 text-muted-foreground rounded-full px-2 py-1 text-xs"
          }
        >
          {TACTICAL_ROLES_DISPLAY[role]} {count}
        </span>
      );
    })}
  </div>
)}
```

**Readiness gap + StatusBadge pattern** (analog lines 40–43, 140–158):
```typescript
// Not-ready filter must include BOTH painting AND assembly (D-07):
const notReadyUnits = useMemo(
  () => units.filter((u) => u.status_painting !== "Completed" || u.status_assembly === 0),
  [units],
);

// Render each gap unit with StatusBadge (analog lines 150-155):
{notReadyUnits.map((u) => (
  <div key={u.id} className="flex items-center justify-between text-sm py-0.5">
    <span>{u.unit_name}</span>
    <StatusBadge status={u.status_painting as PaintingStatus} />
  </div>
))}
```

**Stat helper sub-component** (analog lines 162–168):
```typescript
function Stat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <span className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className={`font-semibold ${valueClassName ?? ""}`}>{value}</span>
    </span>
  );
}
```

**Container layout** (analog lines 71–72 — panel sits between header and tabs, uses border-b):
```typescript
<div className="flex flex-col gap-3 px-4 py-3 bg-muted/30 border-b">
  {/* stat row, freshness+warnings row, collapsible detail, role coverage */}
</div>
```

---

### `src/features/game-day/GameDayPage.tsx` (page, modification)

**Analog:** `src/features/game-day/GameDayPage.tsx` (self — existing file to modify)

**New imports to add** (after existing imports at lines 1–12):
```typescript
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
import { getSyncFreshness } from "@/lib/syncFreshness";
import { GameDayReadinessPanel } from "./GameDayReadinessPanel";
```

**Freshness acquisition pattern** (RESEARCH.md Pattern 2 — add inside `GameDayPage` body after existing hooks):
```typescript
// Pattern: useRulesSyncMeta already mocked in tests as { data: null }
// getSyncFreshness(null) returns "never" — safe default
const { data: syncMeta } = useRulesSyncMeta();
const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);
```

**JSX insertion point** (between `<GameDayHeader>` line 59 and `<Tabs>` line 66):
```typescript
<GameDayHeader
  listName={list.name}
  factionName={faction?.name ?? null}
  detachmentName={list.detachment_name}
  listId={listId}
/>

{/* Phase 67 — pre-game readiness panel */}
<GameDayReadinessPanel
  units={units ?? []}
  pointsLimit={list.points_limit}
  freshness={freshness}
/>

<Tabs defaultValue="stratagems" className="flex-1 px-4 py-3">
```

---

### `tests/game-day/GameDayReadinessPanel.test.tsx` (test, new)

**Analog:** `tests/workshop-play/armyListReadinessPanel.test.tsx`

**Test file header pattern** (analog lines 1–7):
```typescript
/**
 * Phase 67 — GameDayReadinessPanel component tests.
 *
 * Tests the pre-game readiness panel: points display, warning counts,
 * collapsible detail, readiness gaps, role coverage pills.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameDayReadinessPanel } from "@/features/game-day/GameDayReadinessPanel";
import type { ArmyListUnitRow } from "@/types/armyList";
```

**PointsFreshnessBadge mock** (analog lines 14–17 — always mock; it calls hooks internally):
```typescript
vi.mock("@/features/army-lists/PointsFreshnessBadge", () => ({
  PointsFreshnessBadge: () => <span data-testid="freshness-badge">Fresh</span>,
}));
```

**`makeUnit` factory** (analog lines 19–27 — CRITICAL: use `list_id` not `army_list_id`; include `tactical_role: null`):
```typescript
function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
  return {
    id: 1, list_id: 1, unit_id: 1, points_override: null, notes: null,
    created_at: "2024-01-01", unit_name: "Intercessors", unit_points: 100,
    faction_id: 1, status_assembly: 1, status_painting: "Completed",
    painting_percentage: 100, effective_points: 100, tactical_role: null,
    ...overrides,
  };
}
```

**Default props pattern** (analog line 30):
```typescript
const defaultProps = { pointsLimit: null as number | null, freshness: "fresh" as const };
```

**Render wrapper — MUST wrap in TooltipProvider** (analog lines 38, 50, 62 — learned from Phase 66):
```typescript
render(
  <TooltipProvider>
    <GameDayReadinessPanel units={units} {...defaultProps} />
  </TooltipProvider>
);
```

**GameDayPage.test.tsx update pattern** (existing file — add `tactical_role` and `points_override` fields to `useArmyListWithUnits` mock; add `useRulesSyncMeta` mock for freshness):
```typescript
// In useArmyListWithUnits mock — add missing fields:
{
  id: 1,
  list_id: 1,          // CORRECT field name (not army_list_id)
  unit_id: 100,
  points_override: null,   // add this
  unit_name: "Intercessors",
  unit_points: 80,
  effective_points: 80,
  faction_id: 10,
  status_assembly: 1,
  status_painting: "Painted",
  painting_percentage: 100,
  tactical_role: null,     // add this
}

// useRulesSyncMeta mock already present as { data: null } — no change needed
```

---

## Shared Patterns

### TooltipProvider in Tests
**Source:** `tests/workshop-play/armyListReadinessPanel.test.tsx` lines 5, 38
**Apply to:** All test files that render `GameDayReadinessPanel` or any component using `<Tooltip>`
```typescript
import { TooltipProvider } from "@/components/ui/tooltip";
// Wrap every render call:
render(<TooltipProvider><ComponentUnderTest /></TooltipProvider>);
```

### useMemo for Derived Stats
**Source:** `src/features/army-lists/ArmyListSummaryBar.tsx` lines 33–36, 40–43, 46–62
**Apply to:** `GameDayReadinessPanel` — all derived values (stats, notReadyUnits, roleCounts, unitsWithWarnings) should use `useMemo` to avoid recomputation on every render.

### Freshness null-safety Pattern
**Source:** `src/features/army-lists/PointsFreshnessBadge.tsx` line 30
**Apply to:** `GameDayPage.tsx` where `useRulesSyncMeta` result is consumed
```typescript
const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);
// The `?? null` guard is mandatory — syncMeta is undefined before data loads
```

### ArmyListUnitRow field names
**Source:** `src/types/armyList.ts` lines 27–35, 43–52
**Apply to:** All test factory functions and component props
- Correct field: `list_id` (NOT `army_list_id` — the existing GameDayPage test is wrong)
- Include in all mocks: `points_override`, `tactical_role`, `status_assembly`

---

## No Analog Found

All files have strong analogs. No entries.

---

## Metadata

**Analog search scope:** `src/features/army-lists/`, `src/features/game-day/`, `src/lib/`, `src/types/`, `tests/workshop-play/`, `tests/game-day/`
**Files scanned:** 10 source files read directly
**Pattern extraction date:** 2026-05-13
