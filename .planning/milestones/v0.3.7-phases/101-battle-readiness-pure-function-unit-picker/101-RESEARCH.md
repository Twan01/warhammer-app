# Phase 101: Battle-Readiness Pure Function & Unit Picker - Research

**Researched:** 2026-05-28
**Domain:** Pure function design, React component enhancement, SQLite query optimization
**Confidence:** HIGH

## Summary

Phase 101 introduces a canonical `computeUnitReadiness()` pure function in `src/lib/readiness.ts` and upgrades the existing `UnitPickerDialog` to show readiness badges and a "fits budget" filter. The phase is entirely frontend/UI-layer work -- no new database tables, no new migrations, no new Tauri commands. The data required (unit status fields and effective_points) already exists in the query layer.

The main technical challenge is switching `UnitPickerDialog` from `useUnits()` (returns basic `Unit[]`) to `useUnitsEnriched()` (returns `EnrichedUnit[]` with `effective_points`) so that points display and budget filtering work without additional per-row queries. The existing `useUnitsEnriched` hook and `getUnitsWithPoints()` query already handle this via the COALESCE chain in SQL. The readiness pure function is trivial -- 4 boolean checks -- but must be the single canonical definition to prevent divergence.

**Primary recommendation:** Implement in 3 tasks: (1) pure function + tests, (2) UnitPickerDialog readiness badges, (3) budget display + affordability filter. All work is contained in 4-5 files.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `computeUnitReadiness()` lives in `src/lib/readiness.ts` as a pure function that takes a Unit (or the 4 status fields) and returns a structured result: `{ assembled: boolean, painted: boolean, based: boolean, varnished: boolean, battleReady: boolean }`.
- **D-02:** `battleReady` = `status_painting === 'Completed' && status_assembly === 1 && status_basing === 1 && status_varnished === 1`. This is the canonical definition.
- **D-03:** The function is pure and takes no DB dependency.
- **D-04:** Each unit row in UnitPickerDialog shows a compact readiness indicator: painting status text as a Badge (variant="secondary") plus up to 3 small colored dots/icons for assembly, basing, varnish states. Green dot = done, muted/gray = not done.
- **D-05:** If all 4 readiness checks pass (battleReady = true), show a single "Battle Ready" badge in a success/green variant instead of individual indicators.
- **D-06:** Readiness badges do NOT require additional DB queries -- use unit fields already loaded.
- **D-07:** The picker header shows remaining budget: "{remaining} pts remaining".
- **D-08:** Each unit row in the picker shows the unit's effective_points next to the readiness badge.
- **D-09:** UnitPickerDialog must switch from useUnits() to useUnitsEnriched() (or equivalent) for effective_points.
- **D-10:** A toggle switch labeled "Fits budget" in the picker header -- when ON, hides units whose effective_points > remaining budget. Default: OFF.
- **D-11:** When no budget context is available, the toggle and budget display are hidden.

### Claude's Discretion
- Whether to use `useUnitsEnriched()` (existing) or compute effective_points in-memory
- Visual styling of readiness dots (Lucide icons vs CSS dots vs small SVG circles)
- Whether the "Battle Ready" badge uses StatusBadge or a simple Badge with custom color class
- Test strategy for computeUnitReadiness() -- recommend unit tests covering all 16 boolean combinations

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRP-01 | `isUnitBattleReady()` pure function established as canonical readiness definition (painting complete + assembled + based) | D-01/D-02 lock the function signature and location. Existing patterns in `src/lib/` (computeStats, computeUnitWarnings) confirm placement. Note: CONTEXT.md names it `computeUnitReadiness()` while REQUIREMENTS.md names it `isUnitBattleReady()` -- the CONTEXT.md decision (D-01) takes precedence as the locked choice. |
| BRP-02 | Army list unit picker shows painting status and assembly state inline per unit | D-04/D-05/D-06 lock the badge design. Existing `StatusBadge` component provides the painting status dot+text pattern. `Badge` component with variant="secondary" already used in picker rows for category. |
| BRP-03 | Army list unit picker supports filtering/sorting by units that fit within remaining points budget | D-07 through D-11 lock the budget display and filter toggle. `useUnitsEnriched()` hook already exists for points data. Budget context (points_limit, current total) available from the calling page. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Readiness computation | Browser / Client (pure function) | -- | Pure function on already-fetched data; no DB query needed |
| Readiness badge rendering | Browser / Client (React component) | -- | UI-only enhancement to existing CommandItem rows |
| Points display per unit | Browser / Client (React component) | Database (query) | `useUnitsEnriched()` fetches effective_points from SQLite COALESCE chain; UI renders it |
| Budget calculation | Browser / Client (in-memory) | -- | `remaining = points_limit - sum(current list units effective_points)` computed from props already available to the page |
| Affordability filter | Browser / Client (array filter) | -- | Client-side filter on already-fetched enriched unit array |

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | Component rendering | Project foundation |
| shadcn/ui Badge | N/A | Readiness badges | Already used in picker rows for category display |
| StatusBadge | N/A | Painting status dot+text | Existing project component in `src/components/ui/status-badge.tsx` |
| Lucide React | N/A | Small icons for readiness dots | Already used throughout app |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack React Query | N/A | `useUnitsEnriched()` hook | Already wired with `UNITS_ENRICHED_KEY` cache key |
| cmdk/Command | N/A | UnitPickerDialog foundation | Already the picker's core UI pattern |

**No new packages required.** This phase uses only existing project dependencies.

## Architecture Patterns

### System Architecture Diagram

```
ArmyListDetailPage
  |
  |-- useArmyListWithUnits(listId)  --> ArmyListUnitRow[] (has effective_points per list unit)
  |-- computes: totalListPoints = sum(unitRows.effective_points)
  |-- computes: remaining = list.points_limit - totalListPoints
  |
  +-- UnitPickerDialog(open, listId, factionId, remaining, pointsLimit)
        |
        |-- useUnitsEnriched()  --> EnrichedUnit[] (has effective_points per collection unit)
        |-- filters by factionId
        |-- maps each unit through computeUnitReadiness()
        |-- optionally filters by: unit.effective_points <= remaining
        |
        +-- CommandItem per unit:
              |-- unit.name
              |-- ReadinessBadge (computeUnitReadiness result)
              |-- "{effective_points} pts"
              |-- category Badge (existing)
```

### Recommended Project Structure
```
src/
  lib/
    readiness.ts           # NEW: computeUnitReadiness() pure function
  features/
    army-lists/
      UnitPickerDialog.tsx  # MODIFIED: add readiness badges, points, budget filter

tests/
  lib/
    readiness.test.ts      # NEW: 16+ test cases for readiness combinations
```

### Pattern 1: Pure Function in src/lib/
**What:** A stateless function that takes data and returns a result, no side effects.
**When to use:** When the same computation is needed across multiple surfaces.
**Example:**
```typescript
// src/lib/readiness.ts
import type { PaintingStatus } from "@/types/unit";

export interface UnitReadiness {
  assembled: boolean;
  painted: boolean;
  based: boolean;
  varnished: boolean;
  battleReady: boolean;
}

export interface ReadinessInput {
  status_painting: PaintingStatus;
  status_assembly: 0 | 1;
  status_basing: 0 | 1;
  status_varnished: 0 | 1;
}

export function computeUnitReadiness(input: ReadinessInput): UnitReadiness {
  const assembled = input.status_assembly === 1;
  const painted = input.status_painting === "Completed";
  const based = input.status_basing === 1;
  const varnished = input.status_varnished === 1;
  return {
    assembled,
    painted,
    based,
    varnished,
    battleReady: painted && assembled && based && varnished,
  };
}
```
[VERIFIED: codebase analysis -- matches D-02 definition and existing `src/lib/` pure function pattern]

### Pattern 2: Existing useUnitsEnriched() Hook
**What:** The `useUnitsEnriched()` hook in `src/hooks/useUnits.ts` already returns `EnrichedUnit[]` with `effective_points` resolved via SQL COALESCE.
**When to use:** When the picker needs per-unit points without extra DB queries.
**Key detail:** `UNITS_ENRICHED_KEY = ["units", "enriched"]` -- already invalidated by all unit mutation hooks (create, update, delete).
[VERIFIED: codebase -- `src/hooks/useUnits.ts` line 21-23, `src/db/queries/units.ts` line 19-35]

### Pattern 3: Prop-Drilling Budget Context
**What:** `ArmyListDetailPage` already computes `totalPoints` via `useMemo` over `units.effective_points`. The `points_limit` is on `list.points_limit`. These two values provide the budget context.
**When to use:** Pass `remaining` (or `pointsLimit` + `currentTotalPoints`) as new optional props to `UnitPickerDialog`.
[VERIFIED: codebase -- `ArmyListDetailPage.tsx` line 162-164 computes totalPoints]

### Anti-Patterns to Avoid
- **Computing readiness in SQL:** Would create a second definition that can diverge from the pure function. All readiness computation MUST go through `computeUnitReadiness()`.
- **Fetching points per row:** The picker must use a batch query (`useUnitsEnriched()`), not per-row lookups.
- **Nesting UnitPickerDialog inside SheetContent:** Existing architecture uses sibling-portal pattern. Do not change this.
- **Using `useUnits()` and computing points in JS:** `getUnitsWithPoints()` already does the COALESCE in SQL; don't re-implement it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Painting status color coding | Custom color mapping | `StatusBadge` from `src/components/ui/status-badge.tsx` | Already has the 4-tier color system for all 11 PaintingStatus values |
| Unit points resolution | JS-side COALESCE | `useUnitsEnriched()` hook + SQL COALESCE | Points resolution has 6 levels of fallback; SQL handles it correctly |
| Toggle switch | Custom checkbox styling | shadcn/ui Switch (needs install) OR simple checkbox + label | Standard pattern |

**Key insight:** The Switch component from shadcn/ui is NOT currently installed. Options: (a) install it via `npx shadcn@latest add switch`, or (b) use a simple `<button>` toggle or `<Checkbox>` (which IS installed). Given the "Fits budget" toggle is a single boolean, a Checkbox with label is the simplest path using existing components.

## Common Pitfalls

### Pitfall 1: Readiness Definition Divergence
**What goes wrong:** Multiple surfaces compute "battle ready" differently (e.g., dashboard uses `status_painting = 'Completed'` only, while the pure function checks all 4 fields).
**Why it happens:** The existing `getArmyReadinessByFaction()` in `dashboard.ts` line 415 only checks `status_painting = 'Completed'` for battle-ready points. The new D-02 definition requires all 4 checks.
**How to avoid:** The pure function is the canonical definition. Dashboard readiness query is a different scope (aggregated points by faction, not per-unit readiness). Do NOT try to align the dashboard SQL with the pure function -- they serve different purposes. Document the distinction clearly.
**Warning signs:** If any code checks `status_painting === 'Completed'` as the sole readiness check outside the dashboard aggregate query.

### Pitfall 2: EnrichedUnit vs Unit Type Mismatch
**What goes wrong:** `useUnitsEnriched()` returns `EnrichedUnit[]` but the existing `UnitPickerDialog` types its data as `Unit[]` from `useUnits()`. Switching hooks without updating the type will cause TypeScript errors.
**Why it happens:** `EnrichedUnit extends Unit` with additional fields (`effective_points`, `synced_points`, `is_synced`). The switch is type-safe but the component code referencing `unit.points` directly may need updating to `unit.effective_points`.
**How to avoid:** Update the hook call and verify all unit field accesses compile cleanly.
**Warning signs:** TypeScript errors on `effective_points` access.

### Pitfall 3: Ghost Units in the Picker Have No Readiness
**What goes wrong:** The picker shows collection units (real Unit objects), not ghost/planned units. Ghost units only exist in `army_list_units` with `unit_id = NULL`. This is NOT a problem for the picker since it queries the `units` table, which only contains real units.
**Why it happens:** Confusion between "units in the picker" (collection units from `useUnitsEnriched()`) and "units in the list" (from `getArmyListWithUnits()` which includes ghosts).
**How to avoid:** The picker always shows real collection units. Readiness fields (`status_assembly`, `status_painting`, `status_basing`, `status_varnished`) are always present on `EnrichedUnit`.
**Warning signs:** Trying to handle null readiness fields in the picker.

### Pitfall 4: Budget Remaining Can Be Negative
**What goes wrong:** If the list already exceeds its points limit, `remaining` is negative. The "Fits budget" filter should still work correctly -- when remaining < 0, ALL units are hidden (no unit has negative points).
**Why it happens:** Users can exceed the points limit; it's a soft cap.
**How to avoid:** No special handling needed. `unit.effective_points <= remaining` naturally hides everything when remaining <= 0. The UI should show the negative remaining value clearly (e.g., "-50 pts remaining" with destructive styling).
**Warning signs:** NaN or undefined when computing remaining without a points_limit.

### Pitfall 5: No points_limit on List
**What goes wrong:** `list.points_limit` can be `null`. Computing `remaining = null - totalPoints` produces `NaN`.
**Why it happens:** Army lists don't require a points limit.
**How to avoid:** D-11 explicitly states: when no budget context is available, hide the toggle and budget display. Guard with `pointsLimit !== null` before computing remaining.
**Warning signs:** "NaN pts remaining" in the UI.

### Pitfall 6: Switch Component Not Installed
**What goes wrong:** Trying to import `Switch` from `@/components/ui/switch` fails because the component doesn't exist.
**Why it happens:** shadcn/ui Switch is not in the project.
**How to avoid:** Either install it (`npx shadcn@latest add switch`) or use `Checkbox` (already installed) as the "Fits budget" toggle.
**Warning signs:** Module not found error on `@/components/ui/switch`.

## Code Examples

### computeUnitReadiness() Implementation
```typescript
// src/lib/readiness.ts
// Source: D-01, D-02 from CONTEXT.md
import type { PaintingStatus } from "@/types/unit";

export interface UnitReadiness {
  assembled: boolean;
  painted: boolean;
  based: boolean;
  varnished: boolean;
  battleReady: boolean;
}

export interface ReadinessInput {
  status_painting: PaintingStatus;
  status_assembly: 0 | 1;
  status_basing: 0 | 1;
  status_varnished: 0 | 1;
}

export function computeUnitReadiness(input: ReadinessInput): UnitReadiness {
  const assembled = input.status_assembly === 1;
  const painted = input.status_painting === "Completed";
  const based = input.status_basing === 1;
  const varnished = input.status_varnished === 1;
  return {
    assembled,
    painted,
    based,
    varnished,
    battleReady: painted && assembled && based && varnished,
  };
}
```

### Readiness Badge in CommandItem
```typescript
// Inside UnitPickerDialog, per CommandItem row
// Source: D-04, D-05 from CONTEXT.md
function ReadinessBadge({ readiness }: { readiness: UnitReadiness }) {
  if (readiness.battleReady) {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
        Battle Ready
      </Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${readiness.assembled ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${readiness.based ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${readiness.varnished ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
    </span>
  );
}
```

### Budget Props Threading
```typescript
// In ArmyListDetailPage, where UnitPickerDialog is rendered:
// Source: codebase analysis of ArmyListDetailPage.tsx lines 162-164, 883-888
const remaining = list.points_limit != null
  ? list.points_limit - totalPoints
  : null;

<UnitPickerDialog
  open={unitPickerOpen}
  listId={listId}
  factionId={list.faction_id ?? null}
  remaining={remaining}
  pointsLimit={list.points_limit}
  onClose={() => dispatch({ type: "CLOSE_UNIT_PICKER" })}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `status_painting = 'Completed'` as sole readiness check (dashboard) | All 4 fields: painted + assembled + based + varnished (Phase 101) | Phase 101 | Per-unit readiness is now a richer definition; dashboard aggregate remains painting-only for points calculation |
| UnitPickerDialog uses `useUnits()` (no points) | Switch to `useUnitsEnriched()` (with effective_points) | Phase 101 | Enables budget filtering without extra queries |

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | shadcn/ui Switch component is not installed and Checkbox should be used instead | Pitfall 6 / Don't Hand-Roll | Low -- if Switch is preferred, it can be added with one command |
| A2 | Using CSS dots (1.5px rounded spans) for readiness indicators matches the Command palette aesthetic | Code Examples | Low -- purely visual, easily changed |

**All other claims are verified from codebase analysis.**

## Open Questions

1. **Should the dashboard readiness query be updated to match the new 4-field definition?**
   - What we know: `getArmyReadinessByFaction()` currently checks only `status_painting = 'Completed'` for battle_ready_points. The new `computeUnitReadiness()` checks all 4 fields.
   - What's unclear: Whether the dashboard should show "battle ready" based on all 4 fields or keep the painting-only definition.
   - Recommendation: Out of scope for Phase 101. The dashboard aggregate serves a different purpose (points calculation by faction). Aligning it can be a future enhancement.

2. **Should the Switch component be installed or should we use Checkbox?**
   - What we know: Switch is not in the project. Checkbox is available.
   - What's unclear: User preference for visual style of the "Fits budget" toggle.
   - Recommendation: Use Checkbox with label for simplicity. If the user prefers Switch, add it in one command: `npx shadcn@latest add switch`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/lib/readiness.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRP-01 | computeUnitReadiness returns correct readiness for all 16 combinations of 4 boolean fields | unit | `pnpm test -- tests/lib/readiness.test.ts` | Wave 0 |
| BRP-01 | battleReady is true only when all 4 checks pass | unit | `pnpm test -- tests/lib/readiness.test.ts` | Wave 0 |
| BRP-01 | Function accepts Unit-like objects (ReadinessInput shape) | unit | `pnpm test -- tests/lib/readiness.test.ts` | Wave 0 |
| BRP-02 | Readiness badge renders "Battle Ready" when all checks pass | component (manual) | N/A -- visual rendering in Command palette | manual-only: cmdk items don't render well in jsdom |
| BRP-03 | Affordability filter hides units exceeding remaining budget | unit | `pnpm test -- tests/lib/readiness.test.ts` (filter logic can be extracted as pure function) | Wave 0 |
| BRP-03 | Remaining budget display shows correct value | unit | `pnpm test -- tests/lib/readiness.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/lib/readiness.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/readiness.test.ts` -- covers BRP-01 (all 16 boolean combinations + edge cases)

## Security Domain

No security concerns for this phase. The phase adds:
- A pure function with no I/O
- Client-side filtering on already-fetched data
- No new user input handling (toggle is boolean only)
- No new database queries (reuses existing `useUnitsEnriched()`)

## Sources

### Primary (HIGH confidence)
- Codebase analysis of `src/features/army-lists/UnitPickerDialog.tsx` -- current picker implementation
- Codebase analysis of `src/hooks/useUnits.ts` -- confirms `useUnitsEnriched()` exists and returns `EnrichedUnit[]`
- Codebase analysis of `src/types/unit.ts` -- confirms Unit interface with all 4 readiness fields and EnrichedUnit with effective_points
- Codebase analysis of `src/db/queries/units.ts` -- confirms `getUnitsWithPoints()` SQL COALESCE chain
- Codebase analysis of `src/features/army-lists/ArmyListDetailPage.tsx` -- confirms totalPoints computation and UnitPickerDialog sibling-portal pattern
- Codebase analysis of `src/components/ui/status-badge.tsx` -- confirms existing StatusBadge with 4-tier color system
- Codebase analysis of `src/components/ui/badge.tsx` -- confirms Badge component with variant system
- CONTEXT.md D-01 through D-11 -- locked implementation decisions

### Secondary (MEDIUM confidence)
- None needed -- all research is codebase-verified

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new dependencies
- Architecture: HIGH -- straightforward extension of existing UnitPickerDialog with well-defined data flow
- Pitfalls: HIGH -- identified from codebase analysis of actual data types and query patterns

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (stable -- pure function + UI enhancement, no external dependencies)
