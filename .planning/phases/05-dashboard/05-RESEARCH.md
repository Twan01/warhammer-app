# Phase 5: Dashboard - Research

**Researched:** 2026-05-01
**Domain:** React dashboard page — read-only aggregation of existing SQLite data via TanStack Query + Zustand
**Confidence:** HIGH

## Summary

The dashboard is a read-only page that aggregates data already owned by Phases 2–4. No new tables, no new mutations. The dominant complexity is: (1) wiring the `useDashboardStats` hook to the query key already being invalidated by every unit mutation, (2) setting the Zustand faction filter then navigating programmatically to `/collection`, and (3) reusing `UnitDetailSheet` directly on `DashboardPage` with the exact same `selectedUnitId` state pattern established in `CollectionPage`.

All formulas, copy, component anatomy, and skeleton patterns are fully locked by the UI-SPEC. Relative time formatting is manual (no library). No new npm packages are required.

**Primary recommendation:** Implement in three plans — (05-01) queries + hook, (05-02) DashboardPage layout + stat cards + lists, (05-03) faction summary cards + empty state + invalidation verification.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Page layout:** Vertical stack — top stat row (4 cards grid-cols-4), progress metrics (3 cards grid-cols-3), faction summary (flex flex-wrap), lists (grid-cols-2). Each section full-width with visible section divider/heading.
- **Top stat row (DASH-01):** 4 shadcn Cards — total models owned, fully-painted models count, battle-ready points, active projects count. Large number + label underneath.
- **Battle-ready definition:** `sum of units.points WHERE status_painting = 'Completed'`
- **Progress metrics (DASH-03, DASH-04):** 3 stat cards matching top row style. Painting %, Assembly %, Basing %.
  - Assembly % = `status_assembly = 1` units / total
  - Basing % = `status_basing = 1` units / total
- **Faction summary cards (DASH-02):** Compact wrapping flex row, one per faction. Fields: faction color left border accent, faction name, model count, painted % (Completed / total), points owned vs points painted. No progress bar. Click navigates to `/collection` pre-filtered to that faction.
- **Lists section (DASH-05, DASH-06):** Side-by-side, top 5 each (not paginated). Row: unit name | faction badge | status abbreviation. Recently Updated rows also show relative time. Clicking row opens UnitDetailSheet directly on DashboardPage.
- **Empty state (DASH-08):** Shown when unit count = 0. Centered icon + "Your collection is empty" + CTA to Collection page.

### Claude's Discretion
- Exact painting % formula (by points vs unit count) — **UI-SPEC locks this: average of `painting_percentage` per unit, not points-weighted**
- Section heading style and divider treatment — **UI-SPEC locks: `text-sm font-semibold uppercase tracking-widest text-muted-foreground`, no horizontal rule**
- Faction card exact border style — **UI-SPEC locks: `border-l-4` with `border-l-[faction.color_theme]`**
- Relative time formatting — **UI-SPEC locks: manual implementation, no library**
- Loading skeleton design — **UI-SPEC locks dimensions per section**

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Top row stat cards: total models owned, fully-painted models, battle-ready points, active projects count | Aggregation queries against `units` table using `status_painting`, `is_active_project`, `points` columns confirmed in schema |
| DASH-02 | Faction summary cards — one per faction, showing points owned vs points painted, painted %, model count | `factions` table + group-by faction_id aggregation; `Faction.color_theme` confirmed as hex string |
| DASH-03 | Painting completion % (overall, by unit-count average of painting_percentage) | Formula locked by UI-SPEC; `units.painting_percentage` column is 0–100 INT |
| DASH-04 | Assembly % and basing % cards | Formula: `status_assembly = 1` count / total; `status_basing = 1` count / total |
| DASH-05 | Active projects list (links to unit detail) | Filter `is_active_project = 1`, ORDER BY `updated_at DESC LIMIT 5`; opens UnitDetailSheet |
| DASH-06 | Recently updated units list (last 5 by `updated_at`) | ORDER BY `updated_at DESC LIMIT 5`; relative time from `updated_at` string |
| DASH-07 | All data from existing queries — no new tables; cache via TanStack Query | `["dashboard-stats"]` query key already invalidated by all unit mutations (confirmed in useUnits.ts) |
| DASH-08 | Empty state when no factions/units (point to Collection page) | Unit count = 0 check; TanStack Router `Link to="/collection"` pattern confirmed |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.100.6 (installed) | `useDashboardStats` hook + query caching | Project standard; all hooks follow this pattern |
| zustand | ^5.0.12 (installed) | `useCollectionFilters` store for faction click-through | Already used for collection filters |
| @tanstack/react-router | ^1.168.26 (installed) | Navigation to `/collection` after faction filter set | `Link` + `router` already in use |
| lucide-react | ^0.460.0 (installed) | Empty state icon | Used across all prior phases |
| shadcn/ui Card, Badge, Skeleton, Button | already installed | All UI primitives | All confirmed installed in components.json |

### No New Packages Required
The dashboard requires zero new npm packages. All needed primitives are installed. Relative time formatting is manual (per UI-SPEC decision).

**Installation:** None.

---

## Architecture Patterns

### Existing Query Pattern (HIGH confidence — read from source)

All DB queries in `src/db/queries/<entity>.ts`. Single-file pattern:

```typescript
// src/db/queries/units.ts — established pattern
import { getDb } from "@/db/client";
import type { Unit } from "@/types/unit";

export async function getUnits(): Promise<Unit[]> {
  const db = await getDb();
  return db.select<Unit[]>("SELECT * FROM units ORDER BY name ASC");
}
```

Dashboard queries follow this exact shape: `getDb()` → `db.select<T[]>(sql, params?)`. Parameterized queries use `$1, $2, ...` positional placeholders.

### Dashboard Query Return Type (new — to design)

Since all aggregation can be computed client-side from a single `SELECT * FROM units` + `SELECT * FROM factions`, the dashboard query function should return a typed stats object:

```typescript
// src/db/queries/dashboard.ts
import { getDb } from "@/db/client";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

export interface DashboardStats {
  units: Unit[];
  factions: Faction[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();
  const [units, factions] = await Promise.all([
    db.select<Unit[]>("SELECT * FROM units"),
    db.select<Faction[]>("SELECT * FROM factions"),
  ]);
  return { units, factions };
}
```

Rationale: aggregation math (totals, percentages, active list, recent list) is pure TypeScript computed from raw rows — no SQL GROUP BY needed, simpler to test, avoids multiple round-trips. The `useDashboardStats` hook can return pre-computed derived values.

**Alternative considered:** SQL-level aggregation with `SELECT COUNT(*), SUM(points) ...` — rejected because the data volume is small (personal collection), and TypeScript-side computation is easier to unit-test with vitest without mocking DB calls.

### Hook Pattern (HIGH confidence — mirrored from useUnits.ts)

```typescript
// src/hooks/useDashboardStats.ts
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/db/queries/dashboard";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

export const DASHBOARD_STATS_KEY = ["dashboard-stats"] as const;

export interface ComputedDashboardStats {
  totalModels: number;
  fullyPainted: number;
  battleReadyPoints: number;
  activeProjectsCount: number;
  paintingPct: number;
  assemblyPct: number;
  basingPct: number;
  factionStats: FactionStat[];
  activeProjects: Unit[];
  recentlyUpdated: Unit[];
  factions: Faction[];
  hasUnits: boolean;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: DASHBOARD_STATS_KEY,
    queryFn: async () => {
      const { units, factions } = await getDashboardStats();
      return computeStats(units, factions);
    },
  });
}
```

**Critical:** The query key `["dashboard-stats"]` is already invalidated by `useCreateUnit`, `useUpdateUnit`, and `useDeleteUnit` (confirmed in `src/hooks/useUnits.ts` lines 33, 45, 58). This means the dashboard will automatically refetch whenever any unit mutation completes. No additional wiring needed.

### Faction Filter Click-Through Pattern (HIGH confidence — read from source)

The Zustand store in `src/features/units/collectionFilters.ts` exposes `toggleFaction(id: number)` — it toggles a faction in/out of the array. For dashboard faction card click-through, we need to **set exactly one faction**, not toggle. The correct approach is to use Zustand's `setState` directly (clearing previous state) then navigate:

```typescript
// In FactionSummaryCard onClick handler (on DashboardPage or passed as prop)
import { useCollectionFilters } from "@/features/units/collectionFilters";
import { router } from "@/app/router";

function handleFactionClick(factionId: number) {
  // Replace factions filter with just this one faction, clear all other filters
  useCollectionFilters.setState({ factions: [factionId] });
  router.navigate({ to: "/collection" });
}
```

`useCollectionFilters.setState` is available because `zustand` `create()` stores expose `.setState` on the store reference directly. This is cleaner than calling `clearAll()` then `toggleFaction(factionId)` as two separate state updates (avoids a flash of empty factions array).

**TanStack Router navigation pattern:** The project uses `Link` from `@tanstack/react-router` for static navigation (NavItem). For programmatic navigation (faction card click), import `router` from `@/app/router` and call `router.navigate({ to: "/collection" })`. The `router` object is the singleton created by `createRouter()` and exported from `router.tsx`.

Alternatively `useNavigate` hook from `@tanstack/react-router` can be used inside a component:

```typescript
import { useNavigate } from "@tanstack/react-router";
const navigate = useNavigate();
// then: navigate({ to: "/collection" });
```

Both patterns work. `useNavigate` is preferred inside components as it's the idiomatic TanStack Router v1 API.

### UnitDetailSheet Reuse Pattern (HIGH confidence — read from source)

`CollectionPage.tsx` demonstrates the exact pattern DashboardPage must replicate:

```typescript
// State on DashboardPage
const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
const selectedUnit = useMemo(
  () => (selectedUnitId !== null ? (stats?.units ?? []).find((u) => u.id === selectedUnitId) ?? null : null),
  [stats, selectedUnitId]
);

// UnitDetailSheet mounted as sibling (Pitfall: never nest inside ScrollArea or another Sheet)
<UnitDetailSheet
  key={selectedUnit?.id ?? "none-detail"}
  open={selectedUnitId !== null}
  unit={selectedUnit}
  onClose={() => setSelectedUnitId(null)}
  onEdit={handleEdit}   // DashboardPage: navigate to Collection for edit? Or open UnitSheet?
  onDelete={handleDelete}
/>
```

**Edge case on Dashboard:** `UnitDetailSheet` requires `onEdit` and `onDelete` callbacks. On DashboardPage, the dashboard is read-only — but the Sheet's footer still shows Edit/Delete buttons (they're baked into UnitDetailSheet). Options:
1. Pass no-op handlers that navigate to CollectionPage (simplest)
2. Mount `UnitSheet` and `UnitDeleteDialog` as siblings on DashboardPage too (full CRUD parity)

The UI-SPEC says the dashboard is "fully read-only" — however, `UnitDetailSheet` always shows Edit/Delete buttons internally. The simplest correct approach: pass edit handler that opens `UnitSheet` on DashboardPage (mirrors FactionsPage pattern which also mounts UnitSheet). The planner should decide whether to include full edit+delete or route to Collection. Research recommendation: include `UnitSheet` as a sibling, matching the FactionsPage precedent.

### Recommended Project Structure

```
src/features/dashboard/        (new — feature folder)
├── DashboardPage.tsx          (top-level page + all state)
├── StatCard.tsx               (shared 7-card component)
├── FactionSummaryCard.tsx     (per-faction card with color border)
├── DashboardListRow.tsx       (shared row for both lists)
└── DashboardEmptyState.tsx    (unit count = 0 state)

src/db/queries/
└── dashboard.ts               (new — getDashboardStats())

src/hooks/
└── useDashboardStats.ts       (new — ["dashboard-stats"] key)

src/app/dashboard/
└── page.tsx                   (replace placeholder with real DashboardPage import)
```

### Anti-Patterns to Avoid
- **Using `toggleFaction()` for faction click-through:** toggleFaction adds/removes from an array — calling it when a faction is already selected would deselect it. Use `setState({ factions: [id] })` instead.
- **Nesting Sheet/Dialog inside ScrollArea or another Sheet:** Same pitfall from Phase 3. Mount `UnitDetailSheet` as sibling to the main content div, not inside a Card or container.
- **Separate queries for units + factions:** The hook should fetch both in a single `queryFn` call (via `Promise.all`) so the query key represents the full dashboard payload.
- **SQL aggregation for small collections:** `GROUP BY faction_id` SQL is unnecessary here — TypeScript reduce/filter over <1000 rows is negligible performance, and TS-side logic is unit-testable without DB mocking.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time | `date-fns.formatDistanceToNow` | Manual formatter (per UI-SPEC) | UI-SPEC prescribes exact format rules: Xm/Xh/Xd/Xw/Xmo — 5 cases, ~10 lines of code |
| Cache invalidation | Custom event system | TanStack Query key invalidation | Already wired in useUnits mutations; just use `["dashboard-stats"]` key |
| Faction filter navigation | URL search params | Zustand state + router.navigate | COLL-07: filter state is ephemeral Zustand, not URL-persisted |
| Skeleton loaders | Custom CSS animations | shadcn `Skeleton` component | Already installed; dimensions specified in UI-SPEC |
| Stat computation | External analytics lib | TypeScript array methods | Pure functions over Unit[]; testable; no library needed |

---

## Common Pitfalls

### Pitfall 1: `status_assembly` and `status_basing` are `0 | 1`, not `boolean`
**What goes wrong:** `unit.status_assembly === true` always returns false; `filter(u => u.status_assembly)` works because 1 is truthy, but explicit equality checks fail.
**Why it happens:** SQLite stores booleans as INTEGER — TypeScript type is `0 | 1` (DATA-02 decision documented in STATE.md and unit.ts).
**How to avoid:** Use `unit.status_assembly === 1` or `!!unit.status_assembly` for explicit boolean contexts. In filter formulas: `units.filter(u => u.status_assembly === 1)`.

### Pitfall 2: `useCollectionFilters.setState` clears prior faction selection
**What goes wrong:** If the user clicks faction A then faction B, the store must have exactly [B] — not [A, B]. Using `toggleFaction` alone won't achieve this if A was already in the array.
**How to avoid:** Use `useCollectionFilters.setState({ factions: [factionId] })` — this replaces the entire state slice. Optionally also clear `search`, `statuses`, `categories`, `activeOnly` for a clean navigation: `useCollectionFilters.setState({ factions: [factionId], search: "", statuses: [], categories: [], activeOnly: false })`.

### Pitfall 3: UnitDetailSheet requires `onEdit` and `onDelete` — dashboard is "read-only"
**What goes wrong:** Passing `() => {}` no-ops to `onEdit`/`onDelete` means clicking those buttons silently does nothing — confusing UX.
**How to avoid:** Either mount `UnitSheet` + `UnitDeleteDialog` as siblings on DashboardPage (full parity with CollectionPage), or navigate to `/collection?unit=id` on edit click. Recommend: full parity — mount UnitSheet as sibling.

### Pitfall 4: `painting_percentage` null safety
**What goes wrong:** `units.reduce((sum, u) => sum + u.painting_percentage, 0)` works fine — `painting_percentage` is `number` (non-nullable) in the TypeScript type. But `units.length === 0` division by zero produces `NaN`, which renders as empty string.
**How to avoid:** Guard division: `units.length > 0 ? Math.round(sum / units.length) : 0`.

### Pitfall 5: `updated_at` is a SQLite datetime string, not ISO 8601 with timezone
**What goes wrong:** SQLite `datetime('now')` stores UTC time as `"2026-05-01 08:28:15"` (space separator, no T, no Z). `new Date("2026-05-01 08:28:15")` is implementation-defined in browsers — may parse as local time or return Invalid Date.
**How to avoid:** In the relative time formatter, replace the space with `T` and append `Z`: `new Date(updatedAt.replace(" ", "T") + "Z")`. This normalizes the SQLite datetime to a valid UTC ISO string.

### Pitfall 6: `["dashboard-stats"]` invalidation already wired — don't add it twice
**What goes wrong:** If plan 05-03 tries to "add dashboard-stats invalidation to mutations," those mutations already have it (confirmed in useUnits.ts). Adding it again causes duplicate invalidation events (harmless but wasteful).
**How to avoid:** Plan 05-03 verification step should READ existing mutation files to confirm the `["dashboard-stats"]` invalidation is already there, not add it.

---

## Code Examples

### Formula implementations (from UI-SPEC data contracts)

```typescript
// All formulas — pure functions over Unit[]
function computeStats(units: Unit[], factions: Faction[]): ComputedDashboardStats {
  if (units.length === 0) {
    return { /* zero-state */ hasUnits: false, ... };
  }

  const totalModels = units.length;
  const fullyPainted = units.filter(u => u.status_painting === "Completed").length;
  const battleReadyPoints = units
    .filter(u => u.status_painting === "Completed")
    .reduce((sum, u) => sum + (u.points ?? 0), 0);
  const activeProjectsCount = units.filter(u => u.is_active_project === 1).length;

  const paintingPct = Math.round(
    units.reduce((sum, u) => sum + u.painting_percentage, 0) / units.length
  );
  const assemblyPct = Math.round(
    (units.filter(u => u.status_assembly === 1).length / units.length) * 100
  );
  const basingPct = Math.round(
    (units.filter(u => u.status_basing === 1).length / units.length) * 100
  );

  const activeProjects = units
    .filter(u => u.is_active_project === 1)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);

  const recentlyUpdated = [...units]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);

  const factionStats = factions.map(f => {
    const fUnits = units.filter(u => u.faction_id === f.id);
    const painted = fUnits.filter(u => u.status_painting === "Completed");
    return {
      faction: f,
      modelCount: fUnits.length,
      paintedPct: fUnits.length > 0
        ? Math.round((painted.length / fUnits.length) * 100)
        : 0,
      pointsOwned: fUnits.reduce((s, u) => s + (u.points ?? 0), 0),
      pointsPainted: painted.reduce((s, u) => s + (u.points ?? 0), 0),
    };
  });

  return {
    totalModels, fullyPainted, battleReadyPoints, activeProjectsCount,
    paintingPct, assemblyPct, basingPct,
    factionStats, activeProjects, recentlyUpdated,
    factions, hasUnits: true,
  };
}
```

### Relative time formatter (manual, per UI-SPEC)

```typescript
// src/features/dashboard/DashboardListRow.tsx or extracted to src/utils/relativeTime.ts
export function formatRelativeTime(updatedAt: string): string {
  // SQLite datetime('now') format: "2026-05-01 08:28:15" — normalize to UTC ISO
  const date = new Date(updatedAt.replace(" ", "T") + "Z");
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w`;
  return `${Math.floor(diffWeeks / 4)}mo`;
}
```

### Status abbreviation map (from UI-SPEC)

```typescript
const STATUS_ABBR: Record<PaintingStatus, string> = {
  "Not Started": "None",
  "Built": "Built",
  "Primed": "Prime",
  "Basecoated": "Base",
  "Shaded": "Shade",
  "Layered": "Layer",
  "Highlighted": "High",
  "Details Done": "Detail",
  "Based": "Based",
  "Varnished": "Varn",
  "Completed": "Done",
};
```

### FactionSummaryCard click-through pattern

```typescript
// In DashboardPage or FactionSummaryCard via prop
import { useNavigate } from "@tanstack/react-router";
import { useCollectionFilters } from "@/features/units/collectionFilters";

// Inside FactionSummaryCard component:
const navigate = useNavigate();
const handleClick = () => {
  useCollectionFilters.setState({
    factions: [faction.id],
    search: "",
    statuses: [],
    categories: [],
    activeOnly: false,
  });
  navigate({ to: "/collection" });
};
```

### DashboardPage route replacement (src/app/dashboard/page.tsx)

```typescript
// Replace placeholder:
// export function DashboardPage() { return <PlaceholderPage ... /> }
// With:
export { DashboardPage } from "@/features/dashboard/DashboardPage";
```

The router.tsx import `import { DashboardPage } from "./dashboard/page"` stays unchanged.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SQL GROUP BY aggregation | TypeScript-side reduce/filter | Project convention | Simpler, testable without DB mock |
| `date-fns.formatDistanceToNow` | Manual 5-case formatter | UI-SPEC decision | No library added |
| Route-level data loading | TanStack Query hook + cache | Phase 1 setup | Standard; `staleTime: 5min` configured |

---

## Open Questions

1. **UnitDetailSheet edit/delete on Dashboard**
   - What we know: UnitDetailSheet always renders Edit + Delete footer buttons (baked in). Dashboard is "read-only" per UI-SPEC.
   - What's unclear: Should clicking Edit/Delete on Dashboard Sheet open UnitSheet/UnitDeleteDialog on DashboardPage, or navigate to CollectionPage?
   - Recommendation: Mount `UnitSheet` + `UnitDeleteDialog` as siblings on DashboardPage (matches FactionsPage precedent). If the planner wants minimal scope, no-op + `navigate({ to: "/collection" })` is acceptable fallback.

2. **Faction cards with zero units**
   - What we know: `factionStats` will include factions with 0 units — division guard needed (`fUnits.length > 0 ? pct : 0`).
   - What's unclear: Should faction cards with 0 units be hidden or shown with "0 models"?
   - Recommendation: Show all factions (consistent with "your factions are your collection structure"). Display "0 models, 0% painted".

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.5 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- --reporter=verbose` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | `computeStats` returns correct totalModels, fullyPainted, battleReadyPoints, activeProjectsCount | unit | `pnpm test -- -t "computeStats"` | ❌ Wave 0 |
| DASH-03 | `computeStats` returns correct paintingPct (average of painting_percentage) | unit | `pnpm test -- -t "paintingPct"` | ❌ Wave 0 |
| DASH-04 | `computeStats` returns correct assemblyPct and basingPct | unit | `pnpm test -- -t "assemblyPct\|basingPct"` | ❌ Wave 0 |
| DASH-05 | Active projects list returns top 5 `is_active_project=1` units by updated_at DESC | unit | `pnpm test -- -t "activeProjects"` | ❌ Wave 0 |
| DASH-06 | Recently updated list returns top 5 units by updated_at DESC | unit | `pnpm test -- -t "recentlyUpdated"` | ❌ Wave 0 |
| DASH-02 | `factionStats` entries have correct modelCount, paintedPct, pointsOwned, pointsPainted | unit | `pnpm test -- -t "factionStats"` | ❌ Wave 0 |
| DASH-08 | `computeStats` returns `hasUnits: false` when units array is empty | unit | `pnpm test -- -t "empty state"` | ❌ Wave 0 |
| DASH-06 | `formatRelativeTime` returns correct abbreviations for all time ranges | unit | `pnpm test -- -t "formatRelativeTime"` | ❌ Wave 0 |

All tests are pure unit tests on `computeStats` and `formatRelativeTime` — no DB mocking required (functions take plain arrays as input).

### Sampling Rate
- **Per task commit:** `pnpm test -- -t "computeStats\|factionStats\|formatRelativeTime\|activeProjects\|recentlyUpdated"`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/dashboard/dashboardStats.test.ts` — covers DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-08 (computeStats pure function tests)
- [ ] `tests/dashboard/relativeTime.test.ts` — covers DASH-06 relative time formatter (formatRelativeTime)

*(No new framework install needed — vitest already configured)*

---

## Sources

### Primary (HIGH confidence)
- Direct source read: `src/hooks/useUnits.ts` — confirms `["dashboard-stats"]` key already invalidated by all three unit mutations
- Direct source read: `src/features/units/collectionFilters.ts` — exact Zustand store shape, `toggleFaction` signature, `clearAll` behavior
- Direct source read: `src/features/units/CollectionPage.tsx` — `selectedUnitId` pattern, UnitDetailSheet sibling mounting
- Direct source read: `src/features/units/UnitDetailSheet.tsx` — exact props interface: `{open, unit, onClose, onEdit, onDelete}`
- Direct source read: `src/types/unit.ts` — `0 | 1` boolean types, `PAINTING_STATUS_ORDER` constant, `updated_at: string` type
- Direct source read: `src/app/router.tsx` — `dashboardRoute` at path `"/"`, `collectionRoute` at `"/collection"`, router export
- Direct source read: `src/components/common/NavItem.tsx` — `Link` from `@tanstack/react-router` confirmed as navigation primitive
- Direct source read: `src/app/dashboard/page.tsx` — placeholder confirmed: `<PlaceholderPage title="Dashboard" phase={5} />`
- Direct source read: `package.json` — all required libraries confirmed installed; no new packages needed

### Secondary (MEDIUM confidence)
- `.planning/phases/05-dashboard/05-UI-SPEC.md` — all component anatomy, formula contracts, copy, skeleton dimensions, interaction states
- `.planning/phases/05-dashboard/05-CONTEXT.md` — locked decisions, discretion areas
- `.planning/STATE.md` — `02-02` decision: `["dashboard-stats"]` invalidation added to useUnits for DATA-09 forward-compatibility

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed in package.json
- Architecture: HIGH — query pattern, hook pattern, Zustand pattern all read directly from source
- Formulas: HIGH — locked by UI-SPEC, cross-referenced with CONTEXT.md
- Pitfalls: HIGH — `0|1` boolean pitfall documented in STATE.md decision log; `updated_at` format read from updateUnit SQL
- Navigation: HIGH — TanStack Router Link confirmed in NavItem.tsx; `useNavigate` is standard TanStack Router v1 API

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (stable stack — no fast-moving dependencies)
