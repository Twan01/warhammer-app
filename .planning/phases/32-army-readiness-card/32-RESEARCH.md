# Phase 32: Army Readiness Card - Research

**Researched:** 2026-05-06
**Domain:** React component, React Query hook, SQLite aggregation, localStorage persistence
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Target Selector UX (PANEL-04)**
- Segmented button group (4 buttons in a row: 500 / 1000 / 1500 / 2000) — not a dropdown
- Default target: 2000 pts
- Selection persisted in localStorage — same pattern as sidebar collapsed and collection view mode
- Selecting a threshold immediately updates all faction progress bars (no submit button)
- Button group uses muted/ghost styling for unselected, solid/primary for selected — compact, not visually heavy

**Progress Bar Design (PANEL-05)**
- Each faction with at least one unit shows a row: faction name, progress bar, text summary
- Progress bar fill color uses faction's `color_theme` via inline style
- Progress bar background: `bg-border/40`
- Text: "{pointsPainted} / {target} pts ready, {pointsOwned} pts owned"
- When battle-ready points meet or exceed selected target: bar fills 100%, text uses `text-battle-gold`
- Factions with 0 units are hidden
- Factions sorted by faction name (alphabetical) for stable ordering

**Card Placement & Layout**
- ArmyReadinessCard sits in bento grid layout from Phase 30
- Placement: right column, below Recent Activity
- Section header: `text-sm font-semibold uppercase tracking-widest text-muted-foreground`
- Card container: `bg-card border border-border/60 shadow-sm`
- Empty state: muted text with Shield icon — "Add units to see army readiness"

**Data Source Strategy**
- New query function: `getArmyReadinessByFaction()` in `src/db/queries/dashboard.ts`
- SQL: groups units by faction_id, JOINs factions for name + color_theme, sums points (owned) and Completed-status points (battle-ready)
- New hook: `useArmyReadiness()` — returns per-faction `{ factionId, factionName, colorTheme, pointsOwned, pointsPainted }` array
- Query key: `["army-readiness"]`
- Invalidated by: unit mutations (useCreateUnit, useUpdateUnit, useDeleteUnit) — add `["army-readiness"]` to the same invalidation blocks already handling `["dashboard-stats"]`
- Target threshold is UI-only state (localStorage) — does NOT affect the query; filtering against target happens in component

### Claude's Discretion
- Exact progress bar height and rounded corner radius
- Gap and padding within the card
- Whether faction rows are compact (single line) or two-line layout
- Skeleton loading treatment while query is in flight
- Whether to show a subtle "target met" icon (e.g. CheckCircle) or just gold text color
- Exact localStorage key name for target persistence

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PANEL-04 | ArmyReadinessCard displays per-faction battle-ready points with a target selector (500 / 1000 / 1500 / 2000 pts) | Segmented button group with localStorage persistence; `useArmyReadinessTarget` hook following `useCollectionViewMode` pattern |
| PANEL-05 | ArmyReadinessCard shows progress bar per faction toward selected target with owned-vs-ready breakdown | Per-faction progress bars with `color_theme` inline style fill; `getArmyReadinessByFaction()` SQL aggregation; `useArmyReadiness()` hook with `["army-readiness"]` query key |
</phase_requirements>

---

## Summary

Phase 32 introduces `ArmyReadinessCard`, a new dashboard panel that replaces any existing readiness surface. The card has two distinct concerns that map cleanly to existing patterns: (1) a target selector persisted to localStorage, and (2) per-faction progress bars driven by a dedicated React Query hook. Both patterns have direct analogues already implemented in the codebase.

The SQL aggregation required is a minor adaptation of `getArmyListReadiness()` in `src/db/queries/armyLists.ts` — change the GROUP BY from `army_list_id` to `faction_id` and JOIN the factions table to bring back name and color_theme in one query. The hook follows `useArmyListReadiness` conventions exactly. The localStorage persistence follows `useCollectionViewMode`/`useSidebarCollapsed` conventions exactly.

The implementation is entirely additive: new query function, new hook, new component, new section in DashboardPage, and three additional `invalidateQueries` calls in `useUnits.ts`. No existing files change structurally except DashboardPage (add one section to the right column) and useUnits (add one invalidation per mutation).

**Primary recommendation:** Implement in three tasks — (1) query + hook, (2) component, (3) DashboardPage wiring + useUnits invalidation.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Query (`@tanstack/react-query`) | Already installed | Data fetching + cache invalidation | Project standard — all server state |
| React `useState` / `useEffect` | Built-in | localStorage persistence hook | No external dep needed for simple key/value |
| Tailwind CSS v4 | Already installed | Styling | Project standard |
| shadcn/ui (Card, Button) | Already installed | Card container, segmented buttons | Project standard UI library |
| Lucide React | Already installed | Shield icon for empty state | Project standard icon set |

### No New Dependencies

This phase requires zero new package installations. All building blocks exist.

---

## Architecture Patterns

### Recommended File Layout

New files:
```
src/hooks/useArmyReadiness.ts           # hook + localStorage target
src/features/dashboard/ArmyReadinessCard.tsx
```

Modified files:
```
src/db/queries/dashboard.ts             # add getArmyReadinessByFaction()
src/hooks/useUnits.ts                   # add ["army-readiness"] invalidation
src/features/dashboard/DashboardPage.tsx # add ArmyReadinessCard section
```

New test files:
```
tests/dashboard/armyReadinessQuery.test.ts   # SQL contract test
tests/dashboard/useArmyReadiness.test.ts     # hook test
tests/dashboard/ArmyReadinessCard.test.tsx   # component test
```

### Pattern 1: SQL Aggregation — Per-Faction Readiness Query

The existing `getArmyListReadiness` in `src/db/queries/armyLists.ts:167-186` is the direct template. Adapt from per-list to per-faction by changing the JOIN target and GROUP BY:

```typescript
// Source: src/db/queries/armyLists.ts:167-186 (adapted)
// File: src/db/queries/dashboard.ts (add below existing functions)

export interface FactionReadiness {
  faction_id: number;
  faction_name: string;
  color_theme: string;
  points_owned: number;
  points_painted: number;
}

export async function getArmyReadinessByFaction(): Promise<FactionReadiness[]> {
  const db = await getDb();
  return db.select<FactionReadiness[]>(
    `SELECT
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
     ORDER BY f.name ASC`
  );
}
```

Key notes:
- The JOIN guarantees only factions with at least one unit appear (no LEFT JOIN needed — locked decision: factions with 0 units are hidden).
- `ORDER BY f.name ASC` in SQL handles the alphabetical sort requirement — no JS sort needed.
- No `points_override` COALESCE needed here — army list units have their own override; regular collection units use `u.points` directly.
- `status_painting = 'Completed'` is the canonical battle-ready check (Pitfall from `armyLists.ts` comment: NOT 'Complete').

### Pattern 2: React Query Hook

Follow `useArmyListReadiness` from `src/hooks/useArmyLists.ts:173-187` — simpler because there are no dynamic input IDs:

```typescript
// Source: src/hooks/useArmyLists.ts:173-187 (adapted)
// File: src/hooks/useArmyReadiness.ts

import { useQuery } from "@tanstack/react-query";
import { getArmyReadinessByFaction, type FactionReadiness } from "@/db/queries/dashboard";

export const ARMY_READINESS_KEY = ["army-readiness"] as const;

export function useArmyReadiness() {
  return useQuery<FactionReadiness[]>({
    queryKey: ARMY_READINESS_KEY,
    queryFn: getArmyReadinessByFaction,
  });
}
```

No `enabled` guard needed (unlike `useArmyListReadiness`) — this query always runs.

### Pattern 3: localStorage Target Persistence

Follow `useCollectionViewMode` from `src/hooks/useCollectionViewMode.ts` exactly:

```typescript
// Source: src/hooks/useCollectionViewMode.ts (adapted)
// In: src/hooks/useArmyReadiness.ts (same file as the query hook)

const TARGET_STORAGE_KEY = "army-readiness:target";
export const ARMY_READINESS_TARGETS = [500, 1000, 1500, 2000] as const;
export type ArmyReadinessTarget = typeof ARMY_READINESS_TARGETS[number];

export function useArmyReadinessTarget(): readonly [
  ArmyReadinessTarget,
  (next: ArmyReadinessTarget) => void
] {
  const [target, setTarget] = useState<ArmyReadinessTarget>(() => {
    if (typeof window === "undefined") return 2000;
    try {
      const raw = window.localStorage.getItem(TARGET_STORAGE_KEY);
      const parsed = Number(raw);
      return ARMY_READINESS_TARGETS.includes(parsed as ArmyReadinessTarget)
        ? (parsed as ArmyReadinessTarget)
        : 2000;
    } catch {
      return 2000;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(TARGET_STORAGE_KEY, String(target));
    } catch {
      /* storage may be blocked — degrade silently */
    }
  }, [target]);

  return [target, setTarget] as const;
}
```

Key difference from string-valued hooks: must validate the parsed number is one of the four allowed values before accepting it — handles corrupted localStorage gracefully.

### Pattern 4: Progress Bar with Faction color_theme

Reuse the exact progress bar pattern from `FactionSummaryCard.tsx:73-84`:

```tsx
// Source: src/features/dashboard/FactionSummaryCard.tsx:73-84
// Progress bar track:
<div className="h-1.5 w-full rounded-full bg-border/40">
  <div
    className="h-1.5 rounded-full transition-all duration-500"
    style={{
      width: `${Math.min(100, Math.round((row.points_painted / target) * 100))}%`,
      backgroundColor: row.color_theme,
    }}
  />
</div>
```

The `Math.min(100, ...)` cap prevents overflow when `pointsPainted >= target`. The `transition-all duration-500` provides smooth animation when the target threshold changes.

### Pattern 5: Cache Invalidation Wiring

Add `["army-readiness"]` to all three unit mutation `onSuccess` blocks in `src/hooks/useUnits.ts`, following the exact pattern of the existing `["dashboard-stats"]` line:

```typescript
// Source: src/hooks/useUnits.ts (three places: useCreateUnit, useUpdateUnit, useDeleteUnit)
qc.invalidateQueries({ queryKey: ["army-readiness"] });
```

All three mutations already invalidate `["dashboard-stats"]`, `["spending-stats"]`, and `["hobby-analytics"]`. The `["army-readiness"]` line goes alongside them.

### Pattern 6: DashboardPage Section Addition

The right column currently renders only `<RecentActivityFeed>`. Per the locked decision, `ArmyReadinessCard` goes below it. The right column `<div>` becomes:

```tsx
// Right column — wraps RecentActivityFeed and ArmyReadinessCard
<div className="flex flex-col gap-6">
  <RecentActivityFeed
    events={activityEvents ?? []}
    onUnitClick={handleUnitIdClick}
  />
  <ArmyReadinessCard />
</div>
```

This requires wrapping what was a naked `<RecentActivityFeed>` in a `<div className="flex flex-col gap-6">`. Check the loading skeleton branch as well — the right column skeleton `<Skeleton className="h-72 w-full" />` should get a companion skeleton below it.

### Anti-Patterns to Avoid

- **Extending getDashboardStats:** The locked decision explicitly forbids this. `["army-readiness"]` is a separate cache entry.
- **Putting target threshold in the query:** Target is pure UI state. The query always returns all factions with their raw point totals; the component does `pointsPainted >= target` comparison.
- **LEFT JOIN in SQL:** Using LEFT JOIN would return factions with 0 units (null aggregates). The locked decision says hide those factions. INNER JOIN via `JOIN units u ON u.faction_id = f.id` achieves this cleanly.
- **JS-side sorting:** SQL `ORDER BY f.name ASC` handles alphabetical sort. Don't re-sort in JS.
- **Conditional hook call:** `useArmyReadiness()` and `useArmyReadinessTarget()` must be called unconditionally inside `ArmyReadinessCard` — Rules of Hooks.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress bar component | Custom SVG or canvas progress | Tailwind div-in-div pattern from FactionSummaryCard | Already proven; consistent height + transition |
| Segmented button group | Custom toggle component | shadcn/ui `Button` with variant logic | Avoids new UI primitive; consistent styling |
| localStorage persistence | Custom React context or Zustand store | `useState` + `useEffect` hook (useCollectionViewMode pattern) | Simple key/value; no cross-component sharing needed |
| Battle-ready computation | JS map/reduce over units | SQL CASE WHEN aggregation (getArmyListReadiness pattern) | DB does the work; single query; no large in-memory array needed |

---

## Common Pitfalls

### Pitfall 1: 'Completed' vs 'Complete' in SQL
**What goes wrong:** Using `status_painting = 'Complete'` misses all battle-ready units.
**Why it happens:** Typo; the status is "Completed" (with 'd') per `PAINTING_STATUS_ORDER` in `src/types/unit.ts:18`.
**How to avoid:** Copy the CASE WHEN from the existing `getArmyListReadiness` SQL — it already uses `'Completed'` correctly.
**Warning signs:** `points_painted` returns 0 for everything.

### Pitfall 2: LEFT JOIN Returns Factions with 0 Units
**What goes wrong:** Using `LEFT JOIN units` returns all factions, including those with no models, producing null `SUM()` values (SQLite returns null for SUM of empty set).
**Why it happens:** Natural reflex when wanting faction data.
**How to avoid:** Use `JOIN units u ON u.faction_id = f.id` (implicit INNER JOIN). Zero-unit factions are excluded — matching the locked decision.
**Warning signs:** `points_owned: null` for some factions, or `NaN` in rendered points.

### Pitfall 3: Progress Bar Overflows Past 100%
**What goes wrong:** `style={{ width: '${ratio * 100}%' }}` renders wider than container when `pointsPainted > target`.
**Why it happens:** No cap on the percentage.
**How to avoid:** `Math.min(100, Math.round((pointsPainted / target) * 100))`.
**Warning signs:** Progress bar breaks out of its container visually.

### Pitfall 4: Target Validation on localStorage Read
**What goes wrong:** User has old/corrupt localStorage value (e.g., "750" from a different app version) — `Number("750")` passes but is not in `ARMY_READINESS_TARGETS`, causing a TypeScript type mismatch at runtime.
**Why it happens:** localStorage is untyped; any string could be stored.
**How to avoid:** Validate with `ARMY_READINESS_TARGETS.includes(parsed as ArmyReadinessTarget)` before accepting; fall back to 2000.
**Warning signs:** TypeScript error or unexpected button state on app startup.

### Pitfall 5: Missing Invalidation in useDeleteUnit
**What goes wrong:** Deleting a unit doesn't refresh the ArmyReadinessCard — the bar stays at the old value until next app launch.
**Why it happens:** `useDeleteUnit` is often the last mutation updated when wiring new cache keys.
**How to avoid:** Add `["army-readiness"]` invalidation to ALL three mutations (create, update, delete) at the same time.
**Warning signs:** Stale readiness data visible after unit deletion.

### Pitfall 6: DashboardPage Loading Skeleton Not Updated
**What goes wrong:** The loading skeleton branch still has `<Skeleton className="h-72 w-full" />` for the right column as a lone element, causing layout shift when ArmyReadinessCard appears below RecentActivityFeed after data loads.
**Why it happens:** The three render branches (loading/error/populated) all need matching grid structure.
**How to avoid:** Wrap the right column in the skeleton branch with a `flex flex-col gap-6` div and add a second skeleton below the activity skeleton.
**Warning signs:** Visible layout jump when the dashboard data resolves.

---

## Code Examples

### Full SQL Query (Verified Pattern)

```typescript
// Adapted from: src/db/queries/armyLists.ts:173-186
// Battle-ready = status_painting = 'Completed' (NOT 'Complete' — Pitfall 1)
// INNER JOIN excludes factions with 0 units — matching locked decision
// ORDER BY f.name ASC — SQL-side sort, no JS sort needed
`SELECT
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
 ORDER BY f.name ASC`
```

### Segmented Button Group (PANEL-04)

```tsx
// Source: shadcn/ui Button patterns (project standard)
// No import changes needed — Button already used throughout dashboard
{ARMY_READINESS_TARGETS.map((t) => (
  <Button
    key={t}
    size="sm"
    variant={target === t ? "default" : "ghost"}
    onClick={() => setTarget(t)}
    className="tabular-nums"
  >
    {t}
  </Button>
))}
```

### Target-Met State (PANEL-05)

```tsx
// Battle Gold token: text-battle-gold (defined in globals.css Phase 25)
const isTargetMet = row.points_painted >= target;

<span className={`text-xs tabular-nums ${isTargetMet ? "text-battle-gold" : "text-muted-foreground"}`}>
  {row.points_painted} / {target} pts ready, {row.points_owned} pts owned
</span>
```

### Empty State Pattern

```tsx
// Source: src/features/dashboard/CurrentFocusCard.tsx and ActiveProjectsPanel patterns
// Shield icon from lucide-react
import { Shield } from "lucide-react";

// When query returns empty array (no factions have units):
<div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
  <Shield size={20} className="opacity-40" />
  <span className="text-sm">Add units to see army readiness</span>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-list readiness only | Per-faction readiness (new) | Phase 32 | Answers "can I play a game with this faction?" at a glance |
| Global battle-ready points in dashboard subtitle | Per-faction breakdown with target | Phase 32 | More actionable — users can see which faction is "playable" |

---

## Open Questions

1. **Right column layout after adding ArmyReadinessCard**
   - What we know: Currently `<RecentActivityFeed>` is a direct child of the grid. After adding ArmyReadinessCard it needs a wrapper div.
   - What's unclear: Whether RecentActivityFeed should grow to fill its space or remain fixed height after the wrapper is added.
   - Recommendation: Wrap in `<div className="flex flex-col gap-6">` (no `flex-1`/`h-full`). Let both panels size naturally.

2. **ArmyReadinessCard height when many factions exist**
   - What we know: No max-height or scroll is specified in locked decisions.
   - What's unclear: Whether a user with 10+ factions would produce a very tall card.
   - Recommendation: Add `max-h-96 overflow-y-auto` at Claude's discretion, or omit for now and revisit during Phase 34 visual polish. This is explicitly Claude's discretion.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/dashboard/armyReadinessQuery.test.ts tests/dashboard/useArmyReadiness.test.ts tests/dashboard/ArmyReadinessCard.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PANEL-04 | Target selector persists to localStorage, defaults to 2000, validates stored value | unit | `pnpm test -- tests/dashboard/useArmyReadiness.test.ts` | ❌ Wave 0 |
| PANEL-04 | Segmented buttons render; clicking updates target immediately | component | `pnpm test -- tests/dashboard/ArmyReadinessCard.test.tsx` | ❌ Wave 0 |
| PANEL-05 | `getArmyReadinessByFaction` SQL uses INNER JOIN, 'Completed', GROUP BY faction | unit | `pnpm test -- tests/dashboard/armyReadinessQuery.test.ts` | ❌ Wave 0 |
| PANEL-05 | Per-faction rows render with correct points text | component | `pnpm test -- tests/dashboard/ArmyReadinessCard.test.tsx` | ❌ Wave 0 |
| PANEL-05 | Target-met state applies `text-battle-gold` class | component | `pnpm test -- tests/dashboard/ArmyReadinessCard.test.tsx` | ❌ Wave 0 |
| PANEL-05 | `useArmyReadiness` hook uses `["army-readiness"]` key; maps rows correctly | unit | `pnpm test -- tests/dashboard/useArmyReadiness.test.ts` | ❌ Wave 0 |
| PANEL-05 | `useUnits` mutations all invalidate `["army-readiness"]` | unit | existing `tests/foundation/useUnits.test.ts` (extend) | ✅ exists |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/dashboard/armyReadinessQuery.test.ts tests/dashboard/useArmyReadiness.test.ts tests/dashboard/ArmyReadinessCard.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/dashboard/armyReadinessQuery.test.ts` — SQL contract tests for PANEL-05 (getArmyReadinessByFaction shape, INNER JOIN, 'Completed' keyword, null points handling)
- [ ] `tests/dashboard/useArmyReadiness.test.ts` — hook tests: query key, data mapping, localStorage target persistence (PANEL-04, PANEL-05)
- [ ] `tests/dashboard/ArmyReadinessCard.test.tsx` — component tests: renders faction rows, target selector interaction, target-met gold text, empty state, skeleton (PANEL-04, PANEL-05)

---

## Sources

### Primary (HIGH confidence)

- `src/db/queries/armyLists.ts:167-186` — `getArmyListReadiness` SQL pattern; direct template for `getArmyReadinessByFaction`
- `src/hooks/useArmyLists.ts:173-187` — `useArmyListReadiness` hook pattern; direct template for `useArmyReadiness`
- `src/hooks/useCollectionViewMode.ts` — localStorage persistence pattern; direct template for `useArmyReadinessTarget`
- `src/components/common/useSidebarCollapsed.ts` — localStorage boolean pattern (corroborates view mode pattern)
- `src/hooks/useUnits.ts` — existing mutation invalidation blocks; `["army-readiness"]` wired in same locations as `["dashboard-stats"]`
- `src/features/dashboard/FactionSummaryCard.tsx:73-84` — progress bar visual pattern (track + fill + transition)
- `src/features/dashboard/DashboardPage.tsx` — current right column structure; identifies wrapper div requirement
- `src/styles/globals.css:76,120` — `--battle-gold` token definition and `--color-battle-gold` Tailwind mapping
- `src/types/unit.ts:18` — `"Completed"` is the canonical final status (not "Complete")
- `src/types/faction.ts` — `color_theme: string` field confirmed on Faction interface

### Secondary (MEDIUM confidence)

- `tests/workshop-play/armyListReadiness.test.tsx` — test conventions for SQL contract tests and hook tests in this project; confirms mock pattern for `@/db/client`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all tools already installed
- Architecture: HIGH — all patterns have direct codebase analogues
- SQL query: HIGH — derived from existing `getArmyListReadiness` with minor adaptation
- Pitfalls: HIGH — sourced from existing code comments and established project pitfall documentation
- Test patterns: HIGH — `tests/workshop-play/armyListReadiness.test.tsx` provides exact template

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (stable stack — no fast-moving dependencies)
