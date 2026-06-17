# Phase 133: Honest Data Provenance - Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 12 files to modify/delete + 7 test files
**Analogs found:** 12 / 12 (all files read directly; this is a subtractive phase with clear before/after)

---

## File Classification

| File | Change Type | Role | Data Flow | Closest Analog / Pattern Seed | Match Quality |
|------|-------------|------|-----------|-------------------------------|---------------|
| `src/lib/syncFreshness.ts` | DELETE | pure-util | — | N/A — entire module removed | — |
| `src/features/army-lists/StaleDataBanner.tsx` | DELETE | component | — | N/A — zero importers confirmed | — |
| `tests/army-list/StaleDataBanner.test.tsx` | DELETE | test | — | N/A — tests deleted with source | — |
| `src/lib/computeUnitWarnings.ts` | MODIFY (signature) | pure-util | transform | Itself — internal type field removal | exact |
| `src/features/army-lists/ArmyListSummaryBar.tsx` | MODIFY (signature + call site) | component | request-response | `GameDayReadinessPanel.tsx` — parallel component | exact |
| `src/features/army-lists/ArmyListDetailPage.tsx` | MODIFY (memo + prop) | page component | request-response | Itself — remove memo + prop | exact |
| `src/features/army-lists/PointsFreshnessBadge.tsx` | MODIFY (display — seed pattern) | component | request-response | Itself — becomes the honest reference | exact |
| `src/features/game-day/GameDayPage.tsx` | MODIFY (var + hook removal) | page component | request-response | `ReadyToPlayCard.tsx` — same hook-removal pattern | exact |
| `src/features/game-day/GameDayReadinessPanel.tsx` | MODIFY (signature) | component | request-response | `ArmyListSummaryBar.tsx` — parallel component | exact |
| `src/features/dashboard/ReadyToPlayCard.tsx` | MODIFY (display + dead branch) | dashboard card | request-response | `DataHealthSummaryCard.tsx` — same dot/row removal | exact |
| `src/features/dashboard/DataHealthSummaryCard.tsx` | MODIFY (display — honest row) | dashboard card | request-response | `VersionInfoCard.tsx` — already honest | role-match |
| `src/features/data-health/DiagnosticsCard.tsx` | MODIFY (comment only) | component | — | N/A — comment text update only | — |
| `tests/army-lists/ArmyListSummaryBar.test.tsx` | MODIFY | test | — | `tests/lib/computeUnitWarnings.test.ts` | exact |
| `tests/game-day/GameDayReadinessPanel.test.tsx` | MODIFY | test | — | `tests/lib/computeUnitWarnings.test.ts` | exact |
| `tests/lib/computeUnitWarnings.test.ts` | MODIFY | test | — | Itself | exact |
| `tests/army-list/ArmyListDetailNotFound.test.tsx` | MODIFY (remove mock) | test | — | `tests/army-list/ArmyListNotesNoOp.test.tsx` | exact |
| `tests/army-list/ArmyListNotesNoOp.test.tsx` | MODIFY (remove mock) | test | — | `tests/army-list/ArmyListDetailNotFound.test.tsx` | exact |
| `tests/feedback/FBK-02-GameDayErrorState.test.tsx` | MODIFY (remove mock) | test | — | same vi.mock removal pattern | exact |

---

## Seed Pattern: Honest Provenance Display

### `src/features/army-lists/PointsFreshnessBadge.tsx` (the canonical "after" pattern)

This is the reference honest-provenance component. After Phase 133 it becomes text-only.

**Current state** (`src/features/army-lists/PointsFreshnessBadge.tsx`, lines 1–48, read directly):

```typescript
// CURRENT (before) — imports to REMOVE:
import { getSyncFreshness, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";
// ...
const freshness = getSyncFreshness(udbMeta?.built_at ?? null);  // line 26 — REMOVE
// Dot element to REMOVE (lines 37–42):
<span className={cn("inline-block h-2 w-2 rounded-full", FRESHNESS_DOT_CLASS[freshness])} />
```

**Target state (after) — pattern to replicate across all display surfaces:**

```typescript
// AFTER: imports needed
import { cn } from "@/lib/utils";                          // keep (used for className)
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useUdbMeta } from "@/hooks/useUdbMeta";
// REMOVED: getSyncFreshness, FRESHNESS_DOT_CLASS from syncFreshness

export function PointsFreshnessBadge() {
  const { data: udbMeta, isLoading } = useUdbMeta();

  if (isLoading) {
    return <Skeleton className="h-2 w-16" />;
  }

  const displayLabel = udbMeta ? `v${udbMeta.version}` : "No data";
  const tooltipText = udbMeta
    ? `Data version ${udbMeta.version} (built ${udbMeta.built_at})`
    : "Unit database not imported";

  return (
    // AFTER: Tooltip wraps the text span directly — no dot element
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-xs text-muted-foreground">{displayLabel}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
```

**Key principle:** `cn` and the outer `div` with `flex items-center gap-1.5` can be removed since there is only one child now. The `<Tooltip>` wraps the text span directly.

---

## Pattern Assignments

### `src/lib/computeUnitWarnings.ts` (pure-util, signature change)

**What to remove** (line numbers verified in RESEARCH.md and file read):

```typescript
// Line 16 — REMOVE entire import:
import type { SyncFreshness } from "@/lib/syncFreshness";

// Lines 40 — REMOVE from WarningContext interface:
export interface WarningContext {
  totalPoints: number;
  pointsLimit: number | null;
  freshness: SyncFreshness;   // ← DELETE this line
}

// Line 175 — REMOVE parameter from computeListHealthStats:
export function computeListHealthStats(
  units: ArmyListUnitRow[],
  pointsLimit: number | null,
  freshness: SyncFreshness,   // ← DELETE this parameter
  enhancementTotal = 0,
): ListHealthStats {

// Line 191 — REMOVE freshness from context construction:
const context: WarningContext = { totalPoints, pointsLimit, freshness };
// BECOMES:
const context: WarningContext = { totalPoints, pointsLimit };
```

**What stays:** `computeListWarnings`, `computeUnitWarnings`, all BATTLELINE/TRANSPORT/EPIC HERO logic, `ListHealthStats`, `UnitWarnings` — no other changes.

**Enforcement:** After removal, `pnpm build` with `noUnusedLocals`/`noUnusedParameters` validates HON-02 automatically.

---

### `src/features/army-lists/ArmyListSummaryBar.tsx` (component, signature + call site)

**What to remove** (lines verified from file read):

```typescript
// Line 16 — REMOVE:
import type { SyncFreshness } from "@/lib/syncFreshness";

// Lines 21, 35 — REMOVE freshness from interface and destructuring:
interface ArmyListSummaryBarProps {
  units: ArmyListUnitRow[];
  pointsLimit: number | null;
  freshness: SyncFreshness;   // ← DELETE
  enhancements: ArmyListEnhancement[];
}
export function ArmyListSummaryBar({ units, pointsLimit, freshness, enhancements }: ...) {
//                                                          ^^^^^^^^^ DELETE

// Line 42 — update computeListHealthStats call:
// BEFORE:
const stats = useMemo(
  () => computeListHealthStats(units, pointsLimit, freshness, enhancementTotal),
  [units, pointsLimit, freshness, enhancementTotal],
);
// AFTER:
const stats = useMemo(
  () => computeListHealthStats(units, pointsLimit, enhancementTotal),
  [units, pointsLimit, enhancementTotal],
);

// Line 47 — update computeListWarnings call:
// BEFORE:
const listWarnings = useMemo(
  () => computeListWarnings({ totalPoints: stats.totalPoints, pointsLimit, freshness }, units),
  [stats.totalPoints, pointsLimit, freshness, units],
);
// AFTER:
const listWarnings = useMemo(
  () => computeListWarnings({ totalPoints: stats.totalPoints, pointsLimit }, units),
  [stats.totalPoints, pointsLimit, units],
);
```

**What stays:** `PointsFreshnessBadge` at line 162 — untouched, it renders the honest version text.

---

### `src/features/army-lists/ArmyListDetailPage.tsx` (page component, memo + prop)

**What to remove** (lines verified in RESEARCH.md):

```typescript
// Line 21 — REMOVE entire import:
import { getSyncFreshness } from "@/lib/syncFreshness";

// Lines 179–182 — REMOVE entire memo:
const freshness = useMemo(
  () => getSyncFreshness(udbMeta?.built_at ?? null),
  [udbMeta?.built_at],
);

// The useUdbMeta hook at line 156:
const { data: udbMeta } = useUdbMeta();
// VERIFIED: udbMeta is ONLY used for the freshness memo above.
// After removing the memo, remove the entire hook call and import too.

// In JSX — remove freshness prop from ArmyListSummaryBar:
// BEFORE:
<ArmyListSummaryBar units={...} pointsLimit={...} freshness={freshness} enhancements={...} />
// AFTER:
<ArmyListSummaryBar units={...} pointsLimit={...} enhancements={...} />

// Line 68 — OPTIONAL low-priority cleanup:
// Phase 107: StaleDataBanner removed
// Can be deleted or left as historical comment (executor's discretion).
```

**Pitfall guard (RESEARCH Pitfall 5):** `udbMeta` in this file is confirmed used ONLY for the `freshness` memo. The `wahapediaFactionId` logic at line 177 uses `faction?.wahapedia_faction_id`, NOT `udbMeta`. Safe to remove `useUdbMeta`.

---

### `src/features/game-day/GameDayPage.tsx` (page component, var + hook removal)

**What to remove** (lines verified in file read and RESEARCH.md):

```typescript
// Line 10 — REMOVE:
import { getSyncFreshness } from "@/lib/syncFreshness";

// Line 9 — useUdbMeta hook:
const { data: udbMeta } = useUdbMeta();
// Line 31 — freshness var:
const freshness = getSyncFreshness(udbMeta?.built_at ?? null);
// VERIFIED: udbMeta used ONLY for freshness. Remove both lines.
// Also remove useUdbMeta from the import at line 9.

// Lines 108–112 — remove freshness prop from GameDayReadinessPanel:
// BEFORE:
<GameDayReadinessPanel
  units={units ?? []}
  pointsLimit={list.points_limit}
  freshness={freshness}
/>
// AFTER:
<GameDayReadinessPanel
  units={units ?? []}
  pointsLimit={list.points_limit}
/>
```

---

### `src/features/game-day/GameDayReadinessPanel.tsx` (component, signature)

**What to remove** (lines verified in file read):

```typescript
// Line 34 — REMOVE:
import type { SyncFreshness } from "@/lib/syncFreshness";

// Lines 41–42 — REMOVE from interface and destructuring:
interface GameDayReadinessPanelProps {
  units: ArmyListUnitRow[];
  pointsLimit: number | null;
  freshness: SyncFreshness;   // ← DELETE
}
export function GameDayReadinessPanel({
  units,
  pointsLimit,
  freshness,              // ← DELETE from destructuring (lines 44–48)
}: GameDayReadinessPanelProps) {

// Line 52 — update computeListHealthStats call:
// BEFORE:
const stats = useMemo(
  () => computeListHealthStats(units, pointsLimit, freshness),
  [units, pointsLimit, freshness],
);
// AFTER:
const stats = useMemo(
  () => computeListHealthStats(units, pointsLimit),
  [units, pointsLimit],
);
```

**What stays:** `PointsFreshnessBadge` at line 129 — untouched.

---

### `src/features/dashboard/ReadyToPlayCard.tsx` (dashboard card, display + dead branch)

**What to remove** (lines verified in file read):

```typescript
// Line 1 — update Lucide import (Clock becomes unused):
// BEFORE:
import { Shield, Clock } from "lucide-react";
// AFTER:
import { Shield } from "lucide-react";

// Line 5 — REMOVE:
import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";

// In ReadyToPlayCardInner:
// Line 35 — useUdbMeta hook call:
const { data: udbMeta } = useUdbMeta();
// Lines 37–38 — vars:
const freshness = getSyncFreshness(udbMeta?.built_at ?? null);
const syncLabel = getSyncAgeLabel(udbMeta?.built_at ?? null);
// VERIFIED: udbMeta used ONLY for freshness/syncLabel. Remove all three lines.
// Also remove useUdbMeta import.

// Lines 63–68 — REMOVE the Clock + dot + syncLabel row entirely:
<div className="flex items-center gap-1.5">
  <span className={`inline-block h-2 w-2 rounded-full ${FRESHNESS_DOT_CLASS[freshness]}`} />
  <Clock size={12} />
  <span>{syncLabel}</span>
</div>

// Lines 70–74 — collapse dead branch (D-07):
// BEFORE:
{(unpaintedCount > 0 || freshness === "stale" || freshness === "aging") && (
  <span ...>
    {unpaintedCount > 0 ? `${unpaintedCount} unpainted` : "Sync stale"}
  </span>
)}
// AFTER:
{unpaintedCount > 0 && (
  <span className="inline-flex w-fit items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-600 dark:text-amber-400">
    {unpaintedCount} unpainted
  </span>
)}
```

---

### `src/features/dashboard/DataHealthSummaryCard.tsx` (dashboard card, honest row + DO-NOT-TOUCH boundary)

**What to remove and replace** (lines verified in file read):

```typescript
// Line 8 — REMOVE sync freshness imports (keep backup freshness imports on line 9):
// BEFORE line 8:
import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";
// AFTER: delete line 8 entirely
// Line 9 STAYS UNTOUCHED:
import { getBackupFreshness, getBackupAgeLabel, hasVersionMismatch, BACKUP_FRESHNESS_DOT_CLASS } from "@/lib/backupFreshness";

// Lines 21–22 — REMOVE:
const freshness = getSyncFreshness(udbMeta?.built_at ?? null);
const syncLabel = getSyncAgeLabel(udbMeta?.built_at ?? null);

// Lines 39–43 — REPLACE sync dot row with honest provenance text:
// BEFORE (sync dot row):
<div className="flex items-center gap-1.5">
  <span className={`inline-block h-2 w-2 rounded-full ${FRESHNESS_DOT_CLASS[freshness]}`} />
  <span className="text-muted-foreground">{syncLabel}</span>
</div>
// AFTER (honest provenance row — UI-SPEC §2: "Data {udbMeta.version}"):
<span className="text-xs text-muted-foreground">
  {udbMeta ? `Data ${udbMeta.version}` : "Data version unavailable"}
</span>

// useUdbMeta hook (line 12) STAYS:
const { data: udbMeta, isLoading: syncLoading } = useUdbMeta();
// Still needed for the honest version display.
```

**DO-NOT-TOUCH boundary — lines 60–69 (verified in file read — backup row):**

```typescript
// PRESERVE EXACTLY — these lines use backupFreshness.ts exclusively:
<div className="flex items-center gap-1.5">
  <span className={`inline-block h-2 w-2 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[backupTier]}`} />
  <span className="text-muted-foreground">{backupLabel}</span>
  {versionMismatch && (
    <>
      <AlertTriangle size={12} className="text-amber-500" />
      <span className="text-amber-500">(outdated)</span>
    </>
  )}
</div>
```

**Loading skeleton pattern** (line 36–38, stays for the honest row):

```typescript
{syncLoading ? (
  <Skeleton className="h-4 w-28" />
) : (
  // honest provenance row above
)}
```

---

### `src/features/data-health/DiagnosticsCard.tsx` (comment-only change)

No imports or code to remove. Update the stale comment text:

```typescript
// BEFORE (approximate text from RESEARCH.md):
// "with a stale-sync check computed client-side from syncFreshness"

// AFTER (UI-SPEC §6):
// data version is sourced from udb_meta (udb_meta.version contains the content hash)
```

---

## Test Pattern Assignments

### Pattern: Remove `vi.mock("@/lib/syncFreshness", …)` block

**Apply to:** `tests/army-list/ArmyListDetailNotFound.test.tsx` (lines 84–86), `tests/army-list/ArmyListNotesNoOp.test.tsx` (lines 90–92), `tests/feedback/FBK-02-GameDayErrorState.test.tsx` (lines 37–39).

```typescript
// REMOVE entire block in each file:
vi.mock("@/lib/syncFreshness", () => ({
  getSyncFreshness: () => "fresh",   // or () => null
}));
```

No other change needed in these test files — the source files they test will no longer import `syncFreshness`.

---

### `tests/army-lists/ArmyListSummaryBar.test.tsx` (signature change)

**Current pattern** (lines 16, 59–68, read directly):

```typescript
// Line 16 — REMOVE:
import type { SyncFreshness } from "@/lib/syncFreshness";

// Lines 59–68 — update renderBar signature:
// BEFORE:
function renderBar(
  units: ArmyListUnitRow[],
  pointsLimit: number | null,
  freshness: SyncFreshness,           // ← REMOVE
) {
  return render(
    <TooltipProvider>
      <ArmyListSummaryBar units={units} pointsLimit={pointsLimit} freshness={freshness} enhancements={[]} />
      {/*                                                          ^^^^^^^^^^^^^^^^^ REMOVE */}
    </TooltipProvider>,
  );
}
// AFTER:
function renderBar(units: ArmyListUnitRow[], pointsLimit: number | null) {
  return render(
    <TooltipProvider>
      <ArmyListSummaryBar units={units} pointsLimit={pointsLimit} enhancements={[]} />
    </TooltipProvider>,
  );
}

// All call sites: renderBar(units, limit, "fresh") → renderBar(units, limit)
```

**What stays:** The mock for `PointsFreshnessBadge` at lines 19–21 is stable — it will continue to work since `PointsFreshnessBadge` is still rendered in `ArmyListSummaryBar`.

---

### `tests/game-day/GameDayReadinessPanel.test.tsx` (prop type change)

```typescript
// REMOVE (line 55):
import type { SyncFreshness } from "@/lib/syncFreshness";

// REMOVE freshness from defaultProps (line 59):
// BEFORE:
const defaultProps = {
  units: [],
  pointsLimit: 2000,
  freshness: "fresh" as SyncFreshness,  // ← DELETE
};
// AFTER:
const defaultProps = { units: [], pointsLimit: 2000 };

// Update test at lines 107–115 that passes freshness: "stale":
// Remove the freshness override from the renderPanel() call.
// The test still validates warnings appear from points/battleline conditions.
```

---

### `tests/lib/computeUnitWarnings.test.ts` (factory cleanup)

**Current pattern** (lines 45–52, read directly):

```typescript
// BEFORE makeContext factory (line 49 has freshness):
function makeContext(overrides: Partial<WarningContext> = {}): WarningContext {
  return {
    totalPoints: 1500,
    pointsLimit: 2000,
    freshness: "fresh",    // ← REMOVE — field no longer in WarningContext
    ...overrides,
  };
}

// AFTER:
function makeContext(overrides: Partial<WarningContext> = {}): WarningContext {
  return {
    totalPoints: 1500,
    pointsLimit: 2000,
    ...overrides,
  };
}
```

**Three tests with `freshness: "stale"` override** (RESEARCH lines 210–226): rewrite as `makeContext()` with no freshness key. The "does NOT return Stale points data" assertion stays valid — the code never returns that warning regardless.

---

## Shared Patterns

### Unused-hook removal pattern

Applies to three files where `useUdbMeta()` is used ONLY to feed `getSyncFreshness`:

| File | Confirmed by | Action |
|------|-------------|--------|
| `GameDayPage.tsx` | RESEARCH Assumption A2 (VERIFIED) | Remove hook call + import |
| `ReadyToPlayCard.tsx` | RESEARCH Assumption A3 (VERIFIED) | Remove hook call + import (from inner component) |
| `ArmyListDetailPage.tsx` | RESEARCH Assumption A1 (VERIFIED) | Remove hook call + import |

**Pattern:**
```typescript
// 1. Remove the import from the hook barrel:
import { useUdbMeta } from "@/hooks/useUdbMeta";   // ← DELETE (in these 3 files only)

// 2. Remove the hook call:
const { data: udbMeta } = useUdbMeta();            // ← DELETE

// 3. Remove the freshness derivation:
const freshness = getSyncFreshness(udbMeta?.built_at ?? null);  // ← DELETE
```

**Exception — DataHealthSummaryCard:** `useUdbMeta` stays because `udbMeta.version` feeds the new honest provenance row.

---

### Grep guard: identifiers to target vs. identifiers to never touch

**Target these identifiers for removal:**
- `SyncFreshness` (type)
- `getSyncFreshness` (function)
- `getSyncAgeLabel` (function)
- `FRESHNESS_DOT_CLASS` (constant)
- `syncFreshness` (module path in imports and mocks)

**Never touch these identifiers (backup freshness — real staleness):**
- `BackupFreshness`
- `getBackupFreshness`
- `getBackupAgeLabel`
- `hasVersionMismatch`
- `BACKUP_FRESHNESS_DOT_CLASS`
- `backupFreshness` (module path)

---

## No Analog Found

No files in this phase require an analog from outside the immediate codebase. All changes are:
- Deletions (module and components with zero importers)
- Parameter removal from well-understood existing functions
- Display simplification guided by the UI-SPEC before/after contract

---

## Execution Order (Dependency-Safe)

The plan must sequence changes in this order to avoid broken intermediate TypeScript state:

```
Wave A — pure-logic layer (no React, no display):
  1. src/lib/computeUnitWarnings.ts     — remove SyncFreshness import + WarningContext.freshness + computeListHealthStats param

Wave B — component signature propagation:
  2. src/features/army-lists/ArmyListSummaryBar.tsx    — update call sites + remove prop
  3. src/features/army-lists/ArmyListDetailPage.tsx    — remove memo + prop pass + useUdbMeta
  4. src/features/game-day/GameDayPage.tsx             — remove var + prop pass + useUdbMeta
  5. src/features/game-day/GameDayReadinessPanel.tsx   — remove prop + update computeListHealthStats call

Wave C — display-only cleanup:
  6. src/features/army-lists/PointsFreshnessBadge.tsx  — drop dot; keep text + tooltip (honest provenance seed)
  7. src/features/dashboard/ReadyToPlayCard.tsx        — drop dot + syncLabel + dead "Sync stale" branch
  8. src/features/dashboard/DataHealthSummaryCard.tsx  — drop sync dot row; add honest version text; PRESERVE backup row
  9. src/features/data-health/DiagnosticsCard.tsx      — update stale comment (no code change)

Wave D — deletions:
  10. DELETE src/lib/syncFreshness.ts
  11. DELETE src/features/army-lists/StaleDataBanner.tsx

Wave E — tests:
  12. DELETE tests/army-list/StaleDataBanner.test.tsx
  13. UPDATE tests/army-lists/ArmyListSummaryBar.test.tsx
  14. UPDATE tests/game-day/GameDayReadinessPanel.test.tsx
  15. UPDATE tests/lib/computeUnitWarnings.test.ts
  16. REMOVE mock blocks: ArmyListDetailNotFound, ArmyListNotesNoOp, FBK-02
```

**Gates:** After Wave D: `pnpm build` must be green (TS strict enforces HON-02). After Wave E: `pnpm test` must pass (net −5 tests from deleted StaleDataBanner suite; 2744 tests expected green).

---

## Metadata

**Analog search scope:** `src/lib/`, `src/features/army-lists/`, `src/features/game-day/`, `src/features/dashboard/`, `src/features/data-health/`, `tests/`
**Files read:** 10 source files + 2 test files
**Pattern extraction date:** 2026-06-17
