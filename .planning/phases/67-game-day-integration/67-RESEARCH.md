# Phase 67: Game Day Integration - Research

**Researched:** 2026-05-13
**Domain:** React component integration — surfacing Phase 66 validation infrastructure into the Game Day page
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Validation warnings appear as a pre-game summary section between the header (CP tracker) and the tabs. Always visible when Game Day loads — no tab switch required.
- **D-02:** New `GameDayReadinessPanel` component, NOT a reuse of `ArmyListSummaryBar`. Calls `computeListHealthStats` directly, focuses on actionable pre-game information: points status, readiness %, freshness, warning count, and role coverage gaps.
- **D-03:** Aggregate warnings with a collapsible detail section. Top-level: total warning count (hard + soft split). Toggleable section lists affected units and their specific warnings.
- **D-04:** Points display follows `X / Y pts` format (red when exceeded). Reuse `computeListHealthStats` output for `totalPoints`, `pointsLimit`, `pointsExceeded`.
- **D-05:** Freshness display reuses `PointsFreshnessBadge` (self-contained, queries internally). Placed in the readiness panel stats row.
- **D-06:** Readiness gaps show a compact list of unpainted/unbuilt units with `StatusBadge`. Collapsible format.
- **D-07:** Assembly status (`status_assembly === 0`) surfaces as "Not assembled" alongside painting status.
- **D-08:** Role coverage reuses `TACTICAL_ROLES` / `TACTICAL_ROLES_DISPLAY` pill pattern. Gaps (roles with zero units) use dashed border.
- **D-09:** Role coverage section only shows when at least one unit has a tactical role assigned (`hasAnyRole` check).
- **D-10:** `GameDayPage` already calls `useArmyListWithUnits(listId)` — no new queries needed. All warning/health data derives from the existing hook result.
- **D-11:** `SyncFreshness` for `WarningContext` obtained via `useRulesSyncMeta` (same as `PointsFreshnessBadge`). Readiness panel needs freshness for `computeListHealthStats`.

### Claude's Discretion

- Visual layout of the readiness panel (horizontal stat row vs. grid vs. stacked cards)
- Collapsible mechanism for warning details (Collapsible from shadcn/ui vs. simple toggle)
- Whether to show a "All clear" positive state when zero warnings exist
- Icon choices for warning severity indicators
- Whether role coverage pills wrap or scroll horizontally in the panel

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GD-01 | Game Day pre-game view shows points freshness warnings (stale source, unknown points), readiness gaps (unpainted/unbuilt units), and tactical coverage warnings (missing key roles) + stale data alerts | All data is already available from `useArmyListWithUnits` + `useRulesSyncMeta`. `computeListHealthStats` and `computeUnitWarnings` provide the aggregation. `PointsFreshnessBadge` handles the freshness display. New `GameDayReadinessPanel` component integrates everything between the header and tabs. |
</phase_requirements>

---

## Summary

Phase 67 is a pure integration phase with no new computation logic. Everything the readiness panel needs was built in Phase 66: `computeUnitWarnings` and `computeListHealthStats` pure functions, `PointsFreshnessBadge`, `StatusBadge`, `TACTICAL_ROLES`/`TACTICAL_ROLES_DISPLAY`, and the `ArmyListUnitRow` type with `tactical_role`. The `GameDayPage` already calls both `useArmyList` (for `points_limit`) and `useArmyListWithUnits` (for all unit fields). The `GameDayHeader` renders the CP tracker; the readiness panel goes immediately below it, above the `<Tabs>` block.

The single deliverable is a new `GameDayReadinessPanel` component in `src/features/game-day/`. It receives `units: ArmyListUnitRow[]`, `pointsLimit: number | null`, and `freshness: SyncFreshness` as props (mirroring `ArmyListSummaryBar`'s prop signature), calls `computeListHealthStats` once via `useMemo`, and presents the results with a collapsible per-unit warning detail section. The component is inserted into `GameDayPage.tsx` between `<GameDayHeader>` and `<Tabs>`.

The freshness value for the panel must be obtained in `GameDayPage` via `useRulesSyncMeta` + `getSyncFreshness`, then passed as a prop — because `PointsFreshnessBadge` is self-contained (it queries internally and cannot export its freshness value) but `computeListHealthStats` needs a `SyncFreshness` argument.

**Primary recommendation:** Create `GameDayReadinessPanel` as a thin presentation component that calls `computeListHealthStats` and mirrors the established `ArmyListSummaryBar` visual patterns, then wire it into `GameDayPage` with one `useRulesSyncMeta` call.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pre-game readiness panel | Frontend (React component) | — | Pure UI integration; all computation is already in lib functions |
| Warning aggregation | Pure lib function (`computeListHealthStats`) | — | Already exists in Phase 66; no tier change needed |
| Freshness data | React Query hook (`useRulesSyncMeta`) | — | Self-contained cache shared with `PointsFreshnessBadge` |
| Points/unit data | React Query hook (`useArmyListWithUnits`) | — | Already called in `GameDayPage`; no new query |
| Collapsible UI state | Local React state (`useState`) | — | Per-render toggle, not persisted, no global concern |

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.x | Component rendering | Project stack |
| TypeScript 5 | 5.x | Type safety | Project stack |
| TailwindCSS 4 | 4.x | Utility styling | Project stack |
| shadcn/ui Collapsible | radix-ui primitive | Collapsible warning detail section | Already in `src/components/ui/collapsible.tsx` [VERIFIED: codebase] |
| shadcn/ui Tooltip | — | Warning count tooltip (mirrors ArmyListSummaryBar) | Already used in army-lists feature [VERIFIED: codebase] |

### No new dependencies

This phase installs nothing. All UI primitives, computation functions, and data hooks exist. [VERIFIED: codebase]

---

## Architecture Patterns

### System Architecture Diagram

```
GameDayPage (listId)
  │
  ├─ useArmyList(listId)          → list.points_limit
  ├─ useArmyListWithUnits(listId) → ArmyListUnitRow[]
  ├─ useRulesSyncMeta()           → SyncFreshness (via getSyncFreshness)
  │
  ├─ GameDayHeader           [CP tracker — existing, unchanged]
  │
  ├─ GameDayReadinessPanel   [NEW — Phase 67 deliverable]
  │    ├─ computeListHealthStats(units, pointsLimit, freshness)  → ListHealthStats
  │    ├─ computeUnitWarnings per unit (for collapsible detail)
  │    ├─ PointsFreshnessBadge (self-contained, embedded)
  │    ├─ StatusBadge per not-ready unit
  │    └─ TACTICAL_ROLES coverage pills
  │
  └─ Tabs (Stratagems / Units / Checklist)  [existing, unchanged]
```

### Recommended Project Structure

No new directories. One new file:

```
src/features/game-day/
  GameDayPage.tsx              ← modify: add GameDayReadinessPanel + useRulesSyncMeta
  GameDayReadinessPanel.tsx    ← new
  GameDayHeader.tsx            ← unchanged
  gameDayStore.ts              ← unchanged
  ...other tabs                ← unchanged
```

### Pattern 1: GameDayReadinessPanel Props (mirrors ArmyListSummaryBar)

**What:** The component receives computed data as props — same contract as `ArmyListSummaryBar`. `GameDayPage` is the data owner; panel is pure presentation.

**When to use:** Matches the established feature-module pattern where page-level hooks pass data down to display components.

```typescript
// Source: src/features/army-lists/ArmyListSummaryBar.tsx [VERIFIED: codebase]
interface GameDayReadinessPanelProps {
  units: ArmyListUnitRow[];
  pointsLimit: number | null;
  freshness: SyncFreshness;
}
```

### Pattern 2: Freshness Acquisition in GameDayPage

**What:** `PointsFreshnessBadge` is self-contained but `computeListHealthStats` needs `SyncFreshness` as a parameter. The page must call `useRulesSyncMeta` to get the raw sync meta, then derive freshness via `getSyncFreshness`.

```typescript
// Source: src/features/army-lists/PointsFreshnessBadge.tsx + src/lib/syncFreshness.ts [VERIFIED: codebase]
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
import { getSyncFreshness } from "@/lib/syncFreshness";

// Inside GameDayPage:
const { data: syncMeta } = useRulesSyncMeta();
const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);
// Pass freshness to GameDayReadinessPanel
```

The React Query cache is shared — `PointsFreshnessBadge` (embedded in the panel) and the page-level `useRulesSyncMeta` call will not double-fetch. [VERIFIED: React Query cache-sharing behavior; PointsFreshnessBadge confirmed to use the same hook]

### Pattern 3: Collapsible Warning Detail

**What:** Top-level shows warning counts; detail section is toggleable via shadcn/ui `Collapsible`.

```typescript
// Source: src/components/ui/collapsible.tsx [VERIFIED: codebase]
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

// Pattern (discretionary — Claude's choice):
<Collapsible open={open} onOpenChange={setOpen}>
  <CollapsibleTrigger asChild>
    <button>Warnings: {totalWarnings} ▾</button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* per-unit warning list */}
  </CollapsibleContent>
</Collapsible>
```

### Pattern 4: Role Coverage (mirrors ArmyListSummaryBar)

**What:** Count units per role, show pills with dashed border for uncovered roles.

```typescript
// Source: src/features/army-lists/ArmyListSummaryBar.tsx [VERIFIED: codebase]
const hasAnyRole = units.some((u) => u.tactical_role !== null);

// Only render when hasAnyRole:
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

### Anti-Patterns to Avoid

- **Calling `useRulesSyncMeta` inside the panel:** `PointsFreshnessBadge` already handles freshness display internally. The panel calls `computeListHealthStats` which needs `freshness` as a prop — acquire it once in `GameDayPage`, pass down. Avoids prop-drilling confusion and keeps the component testable.
- **Re-implementing the COALESCE for effective_points:** `ArmyListUnitRow.effective_points` is SQL-computed. Never recalculate in JS — sum `effective_points` directly as `computeListHealthStats` does. [VERIFIED: CLAUDE.md + codebase pattern]
- **Modifying `ArmyListSummaryBar`:** D-02 locks this as a separate component. The summary bar has list-management concerns that don't belong in Game Day.
- **Adding a new DB query:** D-10 locks the data source. `useArmyListWithUnits` already returns all required fields including `tactical_role`, `status_assembly`, `effective_points`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Health aggregation | Custom reduce logic | `computeListHealthStats` | Already aggregates totalPoints, battleReadyPct, hardWarningCount, softWarningCount, pointsExceeded in one call [VERIFIED: codebase] |
| Per-unit warnings | Custom warning checks | `computeUnitWarnings` | Handles all 6 warning conditions including stale/never freshness edge cases [VERIFIED: codebase] |
| Freshness display | Custom dot + label | `PointsFreshnessBadge` | Self-contained, shares React Query cache, handles "No points data" edge case [VERIFIED: codebase] |
| Painting status display | Custom status text | `StatusBadge` | 4-tier color system, consistent with rest of app [VERIFIED: codebase] |
| Collapsible toggle | `useState` + `display:none` | `Collapsible` from shadcn/ui | Accessible, animated, already installed [VERIFIED: codebase] |
| Role labels | Inline string map | `TACTICAL_ROLES_DISPLAY` | Canonical display strings for the 7 roles [VERIFIED: codebase] |

---

## Common Pitfalls

### Pitfall 1: Missing `TooltipProvider` in tests

**What goes wrong:** `GameDayReadinessPanel` will use `<Tooltip>` (mirroring `ArmyListSummaryBar`). Tests that render the panel without wrapping in `<TooltipProvider>` will throw or silently fail.
**Why it happens:** shadcn/ui `Tooltip` requires a provider in the React tree. Phase 66 tests already hit this (see `66-03-PLAN.md` — "wrap test renders in TooltipProvider").
**How to avoid:** Wrap all test renders in `<TooltipProvider>` alongside `<QueryClientProvider>`.
**Warning signs:** Console error "Tooltip must be used within TooltipProvider".

### Pitfall 2: `useRulesSyncMeta` returns `undefined` before data loads

**What goes wrong:** `getSyncFreshness(syncMeta?.last_sync_at ?? null)` is safe — `null` returns `"never"`. But if the caller forgets the `?? null` guard, TypeScript won't catch it if `syncMeta` is typed as `RulesSyncMeta | undefined`.
**How to avoid:** Always use `syncMeta?.last_sync_at ?? null` pattern. `PointsFreshnessBadge` already demonstrates the safe pattern. [VERIFIED: codebase]

### Pitfall 3: `tactical_role` values not in `TACTICAL_ROLES` enum

**What goes wrong:** `roleCounts[u.tactical_role as TacticalRole]` will silently count wrong if an unexpected string is stored. The `in counts` guard used in `ArmyListSummaryBar` prevents this.
**How to avoid:** Mirror the exact guard from `ArmyListSummaryBar`:
```typescript
if (u.tactical_role && u.tactical_role in counts) {
  counts[u.tactical_role as TacticalRole] += 1;
}
```
[VERIFIED: src/features/army-lists/ArmyListSummaryBar.tsx]

### Pitfall 4: Using `status_painting !== "Completed"` instead of the assembly check

**What goes wrong:** D-07 requires both painting and assembly status as pre-game concerns. Filtering only on `status_painting` misses `status_assembly === 0` units.
**How to avoid:** The "not ready" filter should be `unit.status_painting !== "Completed" || unit.status_assembly === 0`. Use `computeUnitWarnings` to get the canonical warning list rather than reinventing readiness logic.

### Pitfall 5: Hardcoding `list_id` field name

**What goes wrong:** `ArmyListUnitRow` extends `ArmyListUnit` which has `list_id` (not `army_list_id`). The existing `GameDayPage.test.tsx` mock incorrectly uses `army_list_id` — don't perpetuate this in new tests.
**How to avoid:** Check `src/types/armyList.ts` — the correct field is `list_id`. [VERIFIED: codebase]

---

## Code Examples

### GameDayPage integration point

```typescript
// Source: src/features/game-day/GameDayPage.tsx [VERIFIED: codebase — add these]
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
import { getSyncFreshness } from "@/lib/syncFreshness";
import { GameDayReadinessPanel } from "./GameDayReadinessPanel";

// In GameDayPage body:
const { data: syncMeta } = useRulesSyncMeta();
const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);

// In JSX — between GameDayHeader and Tabs:
<GameDayHeader ... />
<GameDayReadinessPanel
  units={units ?? []}
  pointsLimit={list.points_limit}
  freshness={freshness}
/>
<Tabs ...>
```

### computeListHealthStats call pattern

```typescript
// Source: src/features/army-lists/ArmyListSummaryBar.tsx [VERIFIED: codebase]
const stats = useMemo(
  () => computeListHealthStats(units, pointsLimit, freshness),
  [units, pointsLimit, freshness],
);
```

### Per-unit warning detail for collapsible

```typescript
// Source: src/lib/computeUnitWarnings.ts [VERIFIED: codebase]
// Build per-unit warnings for the collapsible detail list:
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

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No pre-game summary | `ArmyListSummaryBar` with full health panel | Phase 66 | Pattern established for Phase 67 to inherit |
| No tactical roles | `tactical_role` TEXT column + `TACTICAL_ROLES` enum | Phase 66 (migration 025) | Role coverage pills now available in Game Day |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| (none) | All claims verified in codebase or official docs | — | — |

**All claims in this research were verified against the codebase. No user confirmation needed.**

---

## Open Questions

None. CONTEXT.md resolves all gray areas. Phase 66 infrastructure is confirmed complete.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 67 is code-only integration with no external dependencies beyond the project's existing Tauri + Vite stack.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (jsdom environment) |
| Quick run command | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GD-01a | Readiness panel renders in GameDayPage between header and tabs | unit | `pnpm test -- tests/game-day/GameDayPage.test.tsx` | ✅ (needs update) |
| GD-01b | Panel shows points display ("X / Y pts", red when exceeded) | unit | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` | ❌ Wave 0 |
| GD-01c | Panel shows freshness badge (PointsFreshnessBadge rendered) | unit | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` | ❌ Wave 0 |
| GD-01d | Panel shows warning counts (hard + soft split) | unit | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` | ❌ Wave 0 |
| GD-01e | Collapsible detail lists affected units with their warnings | unit | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` | ❌ Wave 0 |
| GD-01f | Readiness gaps show unpainted/unbuilt units with StatusBadge | unit | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` | ❌ Wave 0 |
| GD-01g | Role coverage pills hidden when no unit has a role (progressive disclosure) | unit | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` | ❌ Wave 0 |
| GD-01h | Role coverage shows dashed pill for uncovered roles | unit | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` | ❌ Wave 0 |
| GD-01i | "All clear" positive state shown when zero warnings | unit | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/game-day/GameDayReadinessPanel.test.tsx` — covers GD-01b through GD-01i
- [ ] Update `tests/game-day/GameDayPage.test.tsx` — add `GameDayReadinessPanel` render assertion (GD-01a); add mock for `useRulesSyncMeta` freshness (already present as `{ data: null }` — update unit mock to include `tactical_role: null`)

**Note on existing GameDayPage test:** The existing mock for `useArmyListWithUnits` uses `army_list_id` (incorrect field name) and omits `tactical_role`, `points_override`. The test still passes because the incorrect field is unused in assertions. New test for `GameDayReadinessPanel` should use the correct `list_id` field and include all `ArmyListUnitRow` fields including `tactical_role`.

---

## Security Domain

Step 2.6 security: SKIPPED — Phase 67 adds a display-only component reading data already in memory from existing React Query hooks. No new data entry, no new queries, no authentication changes, no new API surface. ASVS V5 input validation is not applicable (no user input in this component). Existing FK constraints and query parameterization from hobbyforge.db apply unchanged.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/computeUnitWarnings.ts` — `computeUnitWarnings`, `computeListHealthStats`, `ListHealthStats`, `WarningContext`, `UnitWarnings` types — read directly
- `src/types/armyList.ts` — `ArmyListUnitRow`, `TACTICAL_ROLES`, `TACTICAL_ROLES_DISPLAY`, `TacticalRole` — read directly
- `src/features/game-day/GameDayPage.tsx` — insertion point, existing hooks, JSX structure — read directly
- `src/features/game-day/GameDayHeader.tsx` — header boundary for panel placement — read directly
- `src/features/army-lists/ArmyListSummaryBar.tsx` — canonical pattern reference for props, stats row, role coverage, readiness section — read directly
- `src/features/army-lists/PointsFreshnessBadge.tsx` — self-contained freshness badge internals — read directly
- `src/lib/syncFreshness.ts` — `SyncFreshness` type, `getSyncFreshness`, `FRESHNESS_DOT_CLASS` — read directly
- `src/components/ui/collapsible.tsx` — Collapsible/CollapsibleTrigger/CollapsibleContent exports — read directly
- `src/components/ui/status-badge.tsx` — `StatusBadge` props and rendering — read directly
- `tests/game-day/GameDayPage.test.tsx` — existing test structure, mock patterns — read directly
- `tests/lib/computeUnitWarnings.test.ts` — factory helpers and test conventions — read directly
- `.planning/config.json` — `nyquist_validation: true` confirmed — read directly

### Secondary (MEDIUM confidence)
- `.planning/phases/67-game-day-integration/67-CONTEXT.md` — all implementation decisions (D-01 through D-11) — read directly
- `.planning/STATE.md` — Phase 66 confirmed complete, no open blockers — read directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies confirmed present in codebase
- Architecture: HIGH — all integration points read from source files
- Pitfalls: HIGH — derived from Phase 66 test fixes and direct inspection of existing component patterns
- Test infrastructure: HIGH — existing test files read, framework confirmed

**Research date:** 2026-05-13
**Valid until:** Stable — no external dependencies; validity bounded only by Phase 66 code changes
