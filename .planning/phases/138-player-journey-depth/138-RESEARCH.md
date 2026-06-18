# Phase 138: Player-Journey Depth — Research

**Researched:** 2026-06-18
**Domain:** React Query + Zustand + SQLite + TanStack Router — pure frontend and query-layer additions; no schema change
**Confidence:** HIGH (all findings grounded in direct codebase reads; no training-data guesses for file paths or API shapes)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**PLAY-01 — Unit comparison view**
- D-01: Full-page route `/unit-database/compare` (child of `/unit-database`), NOT a dialog.
- D-02: New `getUdbUnitsByIds(ids: string[])` + `useUdbUnitsByIds(ids)` with `staleTime: Infinity`. No hook inside `.map()`.
- D-03: Compare selection stored as `Set<string>` of up to 3 udb ids in `databaseBrowserFilters` Zustand store. Hard cap at 3. Sticky "Compare (N)" action bar navigates to the route.
- D-04: Binary "differs / matches" highlight using existing accent token. No min/max "best value" coloring.

**PLAY-04 — Collection ⇆ UDB loop (audit-and-close, NOT rebuild)**
- D-05: Do NOT re-implement the owned-count badge, Collection→View Datasheet, or UDB→Add-to-Collection. First task is a verification pass.
- D-06: Make the "Owned ×N" badge (row + datasheet header) a deep link into the Collection filtered to that udb unit.
- D-07: Confirm whether `UdbSearchResults` shows owned badges; extend the ownership Map if not. Researcher must confirm whether this is a real gap.
- D-08: Any new/extended ownership hook must invalidate on `units` mutations (create/update/delete/link).

**PLAY-05 — Goal progress on the dashboard**
- D-09: Consume existing `useGoals()` + `useGoalProgress()`. No new query, no derivation rewrite.
- D-10: Compact active-goals card in the dashboard grid. Progress bar per goal. Empty state links to `/goals`.

### Claude's Discretion
- Exact TypeScript type names for the comparison row model and `getUdbUnitsByIds` return shape.
- Exact component filenames for the comparison route/page and the dashboard goal widget.
- Whether the compare action bar lives in `DatabaseBrowserPage` or a small shared toolbar component.
- Precise visual treatment of the diff highlight (token, opacity) within D-04's binary-highlight rule.
- Whether D-07 reuses `getUdbOwnershipForUnit` per searched unit or a single faction-agnostic GROUP BY.

### Deferred Ideas (OUT OF SCOPE)
- Min/max "best value" coloring in the comparison view.
- WeaponTable semantic-`<table>` accessibility conversion.
- "This leader can lead X / can be led by Y" datasheet enrichment.
- 22-faction data audit, French translations, pipeline FK/orphan validation (Phase 139).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAY-01 | Compare 2–3 unit datasheets side-by-side (stats, weapons, abilities, keywords, points) with differences highlighted; reuses shared `WeaponTable` | Batch query shape confirmed; route wiring confirmed; WeaponTable props confirmed |
| PLAY-04 | Collection ⇆ Unit Database loop is bidirectional | Ownership stack verified as shipped; gap confirmed: no nav link on badge; `UdbSearchResults` confirmed as ownership-free (real gap) |
| PLAY-05 | Hobby goal progress on dashboard with progress visualization | Derivation confirmed rules.db-free; hooks exist and ready to reuse; dashboard grid layout confirmed |
</phase_requirements>

---

## Summary

Phase 138 adds three player-journey capabilities: a unit comparison page, a Collection ⇆ UDB navigation closure, and a goal-progress widget on the dashboard. All three are pure frontend and query-layer work with no schema changes.

**PLAY-01** is genuinely new: a full-page route `/unit-database/compare` that renders 2–3 unit columns side-by-side. The key implementation challenge is the batched multi-unit query — `getUdbUnitsByIds` is a multi-id generalization of the existing `getUdbUnitDetail` (confirmed at `src/db/queries/unitDatabase.ts:198`). The comparison page is wired as a child route of `unitDatabaseRoute` in `src/app/router.tsx:200`. Selection state lives in the existing `databaseBrowserFilters` Zustand store with a new `compareIds: Set<string>` field and a cap-3 setter.

**PLAY-04** is an audit-and-close task. The codebase scout and direct reads confirm: owned-count badge exists at `UdbUnitRow.tsx:92-101`, Collection→View Datasheet at `UnitDetailSheet.tsx:108-119`, and UDB→Add-to-Collection at `DatabaseBrowserPage.tsx:157`. The two real gaps are: (1) the owned badge has no `Link`/`navigate` — confirmed by reading `UdbUnitRow.tsx` (no import of any router primitive), and (2) `UdbSearchResults.tsx` has no ownership data at all (it calls only `useUdbSearch`, not `useUdbOwnership`). Gap 2 requires a faction-agnostic `getOwnedCountsByUdbUnitId()` query to cover cross-faction search results.

**PLAY-05** is straightforward. `getGoalProgress` at `src/db/queries/goals.ts:49` queries only `painting_sessions` and `hobby_goals` — zero rules.db references, confirmed by direct read. `useGoals` and `useGoalProgress` at `src/hooks/useGoals.ts:16-27` are ready to consume. The dashboard grid (`DashboardPage.tsx`, confirmed by direct read) uses a two-column `lg:grid-cols-[3fr_2fr]` layout; the goal widget fits as a new card in the right column or a new "Goals" section in the left column.

**Primary recommendation:** Decompose into 4 plans: P01 PLAY-01 (batch query + route + compare page), P02 PLAY-01 (compare UI: column rendering + diff highlight + selection affordance), P03 PLAY-04 (audit verification + owned-badge deep link + search ownership coverage), P04 PLAY-05 (dashboard goal widget). No migration; no parity gate re-triggered.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Unit comparison page | Frontend (React route) | DB/query layer | Read-only canonical data; pure client render after single batch fetch |
| Compare selection state | Frontend (Zustand) | — | Ephemeral UI state per the store-ID/derive-from-cache key decision |
| Batch unit fetch | DB/query layer | React Query hook | SQLite `WHERE id IN (...)` query generalized from existing single-unit pattern |
| Diff highlight | Frontend (React, pure) | — | Client-side comparison of already-fetched data; no DB round-trip |
| Owned-badge deep link | Frontend (TanStack Router navigate) | Zustand | Navigate to `/collection` + set filter state in `collectionFilters` Zustand store |
| Search ownership coverage | DB/query layer | React Query hook | New faction-agnostic `GROUP BY udb_unit_id` query; result passed to `UdbSearchResults` |
| Goal progress widget | Frontend (React component) | React Query (existing hook) | Renders data from already-existing `useGoalProgress` hook; no new query needed |
| Goal progress derivation | DB/query layer (existing) | — | `getGoalProgress` in goals.ts queries only `painting_sessions` + `hobby_goals`; zero rules.db refs |

---

## Standard Stack

No new external packages for this phase — all work uses the project's existing stack.

| Existing Library | Version | Purpose in this phase |
|-----------------|---------|----------------------|
| `@tanstack/react-query` | 5.x | `useQuery` for `useUdbUnitsByIds`; invalidation for extended ownership hook |
| `zustand` | 4.x | Extend `databaseBrowserFilters` with `compareIds` set + actions |
| `@tanstack/react-router` | 1.x | New `/unit-database/compare` child route; `Link`/`navigate` for owned-badge deep link |
| `lucide-react` | current | Icons (GitCompare or similar) for compare affordance |

### Package Legitimacy Audit

No new packages are installed in this phase. Audit section is not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
User (DatabaseBrowserPage)
  │
  ├── selects "Add to Compare" on UdbUnitRow (up to 3)
  │     └── compareIds Set written to databaseBrowserFilters (Zustand)
  │
  ├── clicks "Compare (N)" action bar
  │     └── navigate("/unit-database/compare")
  │
  └── UnitComparePage (new full-page route)
        ├── reads compareIds from databaseBrowserFilters
        ├── calls useUdbUnitsByIds(Array.from(compareIds))   ← single batched query
        │     └── getUdbUnitsByIds → SQLite WHERE id IN ($1,$2,$3)
        │           → returns UdbUnitDetail[] (one per id)
        ├── computes diffMap: Map<field, boolean> (differs across columns?)
        └── renders N CompareColumn components
              ├── UdbStatBlock (per column)
              ├── WeaponTable (per column, shared component from Phase 136)
              ├── abilities list (per column, cells highlighted if diff)
              ├── keywords (per column, cell highlighted if absent in others)
              └── points tiers (per column)

User (UdbUnitRow / UdbDatasheetSheet)
  │
  └── clicks "Owned ×N" badge  [D-06 gap: this click does nothing today]
        └── navigate("/collection", + set collectionFilters.udbUnitIdFilter)
              └── CollectionPage filters units WHERE udb_unit_id = X

User (UdbSearchResults)           [D-07 gap: no ownership today]
  │
  └── shows search results WITH "Owned ×N" badges
        ├── DatabaseBrowserPage calls useUdbOwnershipAll() (new hook)
        │     └── getOwnedCountsByUdbUnitId() → GROUP BY udb_unit_id
        └── ownershipAllMap passed to UdbSearchResults

Dashboard (DashboardPage)
  │
  └── GoalProgressCard (new widget)
        ├── useGoals() → active goals list
        ├── useGoalProgress() → Map<goalId, count>
        └── renders compact progress bars per goal
              empty state → Link to "/goals"
```

### Recommended Project Structure

New files to create:

```
src/
  features/
    unit-database/
      UnitComparePage.tsx         # Full-page comparison layout (route component)
      UnitCompareColumn.tsx       # Single unit column: stat block + weapons + abilities + keywords + points
      UnitCompareActionBar.tsx    # Sticky "Compare (N)" bar shown when compareIds.size >= 2
    dashboard/
      GoalProgressCard.tsx        # Compact dashboard goal widget (adapts GoalCard idiom)
```

Files to modify:

```
src/
  db/queries/unitDatabase.ts      # Add getUdbUnitsByIds() + getOwnedCountsByUdbUnitId()
  hooks/useUnitDatabase.ts        # Add useUdbUnitsByIds() + useUdbOwnershipAll()
  features/unit-database/
    databaseBrowserFilters.ts     # Add compareIds: Set<string>, addToCompare, removeFromCompare, clearCompare
    UdbUnitRow.tsx                # Add "Add to Compare" affordance; make owned badge a Link
    UdbDatasheetSheet.tsx         # Make owned badge in header a Link
    UdbSearchResults.tsx          # Accept + render ownershipAllMap prop
    DatabaseBrowserPage.tsx       # Wire compareIds, UnitCompareActionBar; pass ownershipAllMap to UdbSearchResults
  features/units/
    collectionFilters.ts          # Add udbUnitIdFilter: string | null + setter + clearAll reset
    applyUnitFilters.ts           # Add udbUnitIdFilter clause (units WHERE udb_unit_id = X)
  features/dashboard/
    DashboardPage.tsx             # Import + render GoalProgressCard in right column
  app/router.tsx                  # Add compareRoute as child of unitDatabaseRoute
```

### Pattern 1: Batched multi-id query (PLAY-01)

**What:** One SQL query with `WHERE id IN ($1, $2, $3)` returns all selected units' base row, then N parallel sub-queries for models/weapons/abilities/keywords/points — same as `getUdbUnitDetail` but parameterized for multiple units.

**When to use:** Whenever the UI needs N datasheets simultaneously without calling a per-unit hook N times.

**Implementation shape** (derived from `unitDatabase.ts:198-265`):

```typescript
// Source: direct read of src/db/queries/unitDatabase.ts:198-265
export async function getUdbUnitsByIds(
  ids: string[],
  locale?: "en" | "fr",
): Promise<UdbUnitDetail[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const fr = locale === "fr";
  // SQLite IN clause: bind each id as $1, $2, $3
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const unitRows = await db.select<...>(
    `SELECT id, faction_id, ${fr ? "COALESCE(name_fr, name) AS name" : "name"}, role, base_points, damaged_w, damaged_desc
     FROM udb_units WHERE id IN (${placeholders})`,
    ids,
  );
  // For each unit, fetch sub-tables in parallel (same Promise.all as getUdbUnitDetail)
  return Promise.all(unitRows.map(async (unit) => {
    const [models, weapons, abilities, keywords, points, composition] = await Promise.all([
      db.select<UdbModel[]>("SELECT * FROM udb_unit_models WHERE unit_id = $1 ORDER BY line_order", [unit.id]),
      // ... same sub-queries as getUdbUnitDetail, parameterized per unit
    ]);
    return { ...unit, models, weapons, abilities, keywords, points, composition };
  }));
}
```

**Hook shape:**

```typescript
// Source: derived from useUdbUnitDetail pattern in src/hooks/useUnitDatabase.ts:73
export const UDB_UNITS_BY_IDS_KEY = (ids: string[], locale: Locale) =>
  ["udb-units-by-ids", ids, locale] as const;

export function useUdbUnitsByIds(ids: string[]) {
  const locale = useLocale();
  return useQuery({
    queryKey: UDB_UNITS_BY_IDS_KEY(ids, locale),
    queryFn: () => getUdbUnitsByIds(ids, locale),
    enabled: ids.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
```

### Pattern 2: Faction-agnostic ownership query (PLAY-04 D-07)

**What:** Single `GROUP BY udb_unit_id` query across the entire `units` table, not scoped to a faction.

**When to use:** When any surface (e.g., cross-faction search) needs owned-count without a selected faction.

```sql
-- Source: derived from getUdbOwnershipByFaction at unitDatabase.ts:292
SELECT u.udb_unit_id,
       COUNT(*) AS owned_count,
       GROUP_CONCAT(u.status_painting, '|') AS all_statuses
FROM units u
WHERE u.udb_unit_id IS NOT NULL
GROUP BY u.udb_unit_id
```

**Hook shape:**

```typescript
// New: useUdbOwnershipAll — invalidates on units mutations same as useUdbOwnership
export const UDB_OWNERSHIP_ALL_KEY = ["udb-ownership-all"] as const;

export function useUdbOwnershipAll() {
  return useQuery({
    queryKey: UDB_OWNERSHIP_ALL_KEY,
    queryFn: getOwnedCountsByUdbUnitId,
    staleTime: 0,  // dynamic, same as useUdbOwnership
  });
}
```

The `DatabaseBrowserPage` can call this hook once, build a `useMemo` Map, and pass it to both `UdbSearchResults` (for cross-faction search) and the existing faction-scoped flow (where `ownershipMap` from `useUdbOwnership` remains more granular and is already in place). Alternatively, `useUdbOwnershipAll` can replace `useUdbOwnership` entirely since it is a superset — but that would change the existing faction-browser flow; safer to add it additively.

**Performance note:** `SELECT ... FROM units WHERE udb_unit_id IS NOT NULL GROUP BY udb_unit_id` over a personal collection (typically < 500 rows) is negligible. The result Map is built once at page level, O(1) lookup per search result row. This matches the ARCHITECTURE.md Anti-patterns "page-level useMemo Map" prescription exactly.

### Pattern 3: Diff highlight (PLAY-01 D-04)

**What:** For each comparable field (stat value, points tier, weapon presence, ability name, keyword), compute `isDifferent: boolean` across the N selected units. Cells where any column differs get a highlight class.

**Implementation:** Compute a `Set`-based diff at render time inside `UnitComparePage`, not in the query layer. For stats: collect all values across units; `isDifferent = new Set(values).size > 1`. For weapons/abilities/keywords: collect all names across units into a `Set`; for each column, a name absent in another column's set is highlighted.

```typescript
// Source: derived from page-level useMemo Map pattern
// In UnitComparePage, after units are loaded:
const statDiffMap = useMemo<Map<string, boolean>>(() => {
  const fields = ["M", "T", "Sv", "W", "Ld", "OC"] as const;
  const map = new Map<string, boolean>();
  for (const field of fields) {
    const values = units.map(u => u.models[0]?.[field] ?? null);
    map.set(field, new Set(values.map(String)).size > 1);
  }
  return map;
}, [units]);
```

Highlight class: use `bg-faction-accent/15` (the same accent token used by `GoalCard.tsx` for progress bars and throughout the dashboard for active-state coloring — consistent with the project's accent pattern).

### Pattern 4: Owned-badge deep link (PLAY-04 D-06)

**What:** The "Owned ×N" badge in `UdbUnitRow` and `UdbDatasheetSheet` becomes a navigation trigger to `/collection` with the collection pre-filtered to show only units linked to that `udb_unit_id`.

**Approach:** Two-step:

1. Add `udbUnitIdFilter: string | null` + `setUdbUnitIdFilter: (id: string | null) => void` to `collectionFilters.ts` (Zustand store). Reset it in `clearAll`.
2. Add a filter clause in `applyUnitFilters.ts`: if `udbUnitIdFilter` is set, keep only `unit.udb_unit_id === udbUnitIdFilter`.
3. In `UdbUnitRow`, wrap the badge with a `Link` (TanStack Router) to `/collection` and call `useCollectionFilters(s => s.setUdbUnitIdFilter)(unit.id)` in the `onClick` before navigation. Use `Link` not `navigate` so the badge remains keyboard-accessible.

**Why not a URL search param on `/collection`?** The existing `collectionRoute` has no `validateSearch` and adding one is additional churn. The Zustand store approach is consistent with how the existing `unitDatabaseRoute.useSearch()` deep-link (`udbUnitId`) is stripped on first use — both are "one-shot consume-and-clear" patterns. The Zustand state persists until cleared or the user changes filters, which is the intended behavior (the filter should stay active when the Collection page loads).

### Pattern 5: Goal progress dashboard widget (PLAY-05 D-10)

**What:** A new `GoalProgressCard` component consumes `useGoals()` + `useGoalProgress()` and renders a compact list of active goals with progress bars.

**GoalCard idiom to adapt** (confirmed at `src/features/goals/GoalCard.tsx`): the progress bar pattern (`h-1.5 w-full rounded-full bg-border/40` with inner div width `${pct}%` and `transition-all duration-500`) is the exact idiom to reuse. The dashboard widget drops the edit/delete action buttons (read-only display) and the status badge, keeping only: goal name, period label (`computeGoalPeriod`), `X / Y units (N%)` text, and the progress bar.

**Filtering to active goals:** `deriveGoalStatus(progressCount, target, isExpired)` returns `"active" | "completed" | "missed"`. The widget shows goals where `status !== "missed"` (show both active and completed; hide missed to keep the card optimistic). Or show all — product discretion; research recommendation is to show all non-expired goals.

**Dashboard integration:** `DashboardPage.tsx` uses a two-column layout (`lg:grid-cols-[3fr_2fr]`). The right column currently has `ActiveProjectsPanel` + `RecentActivityFeed` + `ArmyReadinessCard`. The goal widget fits best in the **left column** after "Hobby Health" (goals are a health/progress signal, not an activity feed). Add a new `<section>` with header label "Hobby Goals". The GoalProgressCard is a sibling card, not nested.

**Invalidation:** `useGoalProgress` already invalidates on `GOAL_PROGRESS_KEY` via `useCreateGoal`/`useUpdateGoal`/`useDeleteGoal`. Painting sessions also affect progress counts. Confirm that `useLogSession` (in `LogSessionSheet`) invalidates `GOAL_PROGRESS_KEY` — if not, this is a missing invalidation symmetry (PITFALL #9). See Open Questions.

### Route Wiring for `/unit-database/compare`

The current `unitDatabaseRoute` at `router.tsx:200` is a flat sibling of all other routes under `layoutRoute`. To add `/unit-database/compare`, the `unitDatabaseRoute` must become a parent with an `Outlet`, and the current `DatabaseBrowserPage` moves to an index route. This is the Painting Mode pattern (`paintingModeRoute` is a child of `bareLayoutRoute`).

**Exact change:**

```typescript
// Source: src/app/router.tsx:200-208 (existing) — to be restructured
// New lazy import:
const UnitComparePage = lazy(() => import("./unit-database/compare-page").then(m => ({ default: m.UnitComparePage })));

// unitDatabaseRoute becomes the layout shell (renders Outlet)
export const unitDatabaseRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/unit-database",
  validateSearch: z.object({ udbUnitId: z.string().optional() }),
  component: UnitDatabaseShell,  // thin wrapper rendering <Outlet /> (or keep DatabaseBrowserPage + Outlet side-by-side)
});

// New index route (the existing DatabaseBrowserPage):
export const unitDatabaseIndexRoute = createRoute({
  getParentRoute: () => unitDatabaseRoute,
  path: "/",
  component: UnitDatabasePageShell,
});

// New compare child route:
export const unitDatabaseCompareRoute = createRoute({
  getParentRoute: () => unitDatabaseRoute,
  path: "/compare",
  component: UnitComparePage,
});
```

**Alternative (simpler, avoids Outlet refactor):** Register `/unit-database/compare` as a flat sibling route of `/unit-database` under `layoutRoute` directly, not as a child. The compare page reads its data from Zustand (no path params). This avoids restructuring `unitDatabaseRoute` to render an `Outlet`. **This is the recommended approach** — it mirrors how `/painting-mode/$assignmentId` is a separate route entirely (not a child of a parent route that also renders its own content). The route path still reads as `/unit-database/compare` which satisfies D-01.

```typescript
// In router.tsx routeTree, just add compareRoute alongside unitDatabaseRoute:
const unitDatabaseCompareRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/unit-database/compare",
  component: UnitComparePage,
});
// Add to routeTree: layoutRoute.addChildren([..., unitDatabaseRoute, unitDatabaseCompareRoute])
```

### Anti-Patterns to Avoid

- **`useUdbUnitDetail` called N times in `.map()`**: PITFALLS #8 (hooks-in-loop / N+1). The comparison MUST use the single batch `useUdbUnitsByIds` call.
- **Per-search-result hook for ownership**: calling `useUdbUnitOwnership(result.unit_id)` inside `UdbSearchResults.map()` is a Rules-of-Hooks violation. Use page-level Map from `useUdbOwnershipAll`.
- **Mutating `udb-unit-detail` cache to invalidate comparison**: the comparison result is from `udb-units-by-ids` (a distinct key). The canonical UDB data does not change without a re-import; `staleTime: Infinity` is correct and no special invalidation is needed for PLAY-01.
- **Nesting the comparison Sheet inside DatabaseBrowserPage**: D-01 mandates a full-page route; do not use a Sheet/Dialog even if the route approach seems heavier.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-unit fetch | N calls to `useUdbUnitDetail` in a loop | `useUdbUnitsByIds` — single `WHERE id IN` | Hooks-in-loop is a React violation; N queries is N+1 |
| Diff computation | Custom deep-equality engine | `new Set(values).size > 1` per field | Canonical data is flat; per-field Set comparison is sufficient for binary diff |
| Owned count in search | Per-result `useUdbUnitOwnership` hook | Page-level `Map<udbUnitId, entry>` from `useUdbOwnershipAll` | Page-level Map is the established O(1) idiom for virtual-scrolled lists |
| Collection deep-link filter | URL search param on `/collection` | Zustand `udbUnitIdFilter` in `collectionFilters` | Collection route has no `validateSearch`; Zustand is the project's existing filter persistence pattern |
| Goal progress derivation | New query against painting_sessions | Existing `useGoalProgress()` | Already correct and rules.db-free; rebuild is waste |

---

## PLAY-04 Gap Audit — Verified Findings

**Scout instruction D-07** required the researcher to confirm whether `UdbSearchResults` shows owned badges and whether this is a real gap. Direct read of `src/features/unit-database/UdbSearchResults.tsx` confirms:

- `UdbSearchResults` calls only `useUdbSearch(query)` — NO ownership hook, no `ownershipMap` prop, no badge rendering.
- The component renders `faction_name`, `name`, `keywords` per result — no ownership data.

**D-07 verdict: this is a REAL GAP.** Cross-faction search results never show owned badges. The fix requires:
1. A new `getOwnedCountsByUdbUnitId()` query (confirmed to be safe and O(1) per lookup after initial load).
2. A new `useUdbOwnershipAll()` hook with `staleTime: 0`.
3. `DatabaseBrowserPage` calls `useUdbOwnershipAll()`, builds a `useMemo` Map (`ownershipAllMap`), passes it as a prop to `UdbSearchResults`.
4. `UdbSearchResults` renders owned badges using the map.

**D-06 verification:** Direct read of `UdbUnitRow.tsx:70-108` confirms the owned badge (`Badge variant="outline"` at line 93) has no `Link`, no `onClick` for navigation, and no import of any TanStack Router primitive. The file imports only `Badge` and `PAINTING_STATUS_ORDER`. Confirmed real gap.

**Existing working flows (D-05):**
- "View Datasheet" from Collection: `src/features/units/UnitDetailSheet.tsx:108-119` — confirmed. The button is guarded by `unit.udb_unit_id &&` and calls `navigate({ to: "/unit-database", search: { udbUnitId } })`.
- "Add to Collection" from UDB: `UdbDatasheetSheet.tsx:100-114` — confirmed. The button calls `onAddToCollection(unit)` which flows to `DatabaseBrowserPage.handleAddToCollection:157` → `FactionLinkDialog` or direct `openUnitSheet`.
- Owned count badge in faction browser: `UdbUnitRow.tsx:92-101` + `DatabaseBrowserPage.tsx:87-97` (ownershipMap built from `useUdbOwnership`) — confirmed working.

**Invalidation symmetry (D-08):** `useUdbOwnership` and `useUdbUnitOwnership` in `useUnitDatabase.ts:135,150` both have `staleTime: 0` but no explicit `onSuccess` invalidation in mutation hooks. Invalidation happens naturally because `staleTime: 0` means the cache is always considered stale and refetches on mount/focus. However, the new `useUdbOwnershipAll` must follow the same `staleTime: 0` pattern. The mutations in `useUnits.ts` (create/update/delete) should be checked to confirm they invalidate the `["udb-ownership-all"]` key. If they do not, the plan must add this invalidation.

---

## Common Pitfalls

### Pitfall 1: N+1 hooks-in-loop in the compare page
**What goes wrong:** A naive comparison page calls `useUdbUnitDetail(id)` for each id in `compareIds.map()` — React violations and N queries.
**Why it happens:** The iteration makes per-item hooks feel natural.
**How to avoid:** The single `useUdbUnitsByIds(Array.from(compareIds))` hook returns all units. The page receives the full `UdbUnitDetail[]` array.
**Warning signs:** React warning "Rendered more hooks than previous render" when compare count changes from 2→3.

### Pitfall 2: compareIds Set serialization in Zustand / React Query key
**What goes wrong:** `Set` is not serializable to JSON; if the `Set` is put directly into the React Query key, cache entries may not match across re-renders (identity comparison).
**Why it happens:** `Set` does not compare by value with `===`.
**How to avoid:** Convert to a sorted array for the query key: `[...compareIds].sort()`. The Zustand store holds the `Set<string>` for the UI; the hook call converts to a sorted array. This matches the existing pattern of key serialization in TanStack Query (objects in keys are compared by deep equality but Sets are not plain objects).

### Pitfall 3: Missing painting-session → goal-progress invalidation
**What goes wrong:** User logs a painting session; the dashboard goal widget does not update until manual refresh.
**Why it happens:** `useLogSession` (in `LogSessionSheet`, called from DashboardPage) may not invalidate `GOAL_PROGRESS_KEY`.
**How to avoid:** The plan must verify (and add if missing) that `useLogSession` / `useCreatePaintingSession` invalidates `GOAL_PROGRESS_KEY` on success. This is the PITFALLS #9 cache-invalidation-symmetry rule.
**Warning signs:** Logging a painting session does not change the goal bar count until route navigation away and back.

### Pitfall 4: collectionRoute has no validateSearch — deep-link via URL search param will fail
**What goes wrong:** Adding `?udbUnitId=X` to the `/collection` URL causes TanStack Router to throw if `collectionRoute` has no `validateSearch` schema.
**Why it happens:** TanStack Router validates search params against the route's schema; unknown params throw.
**How to avoid:** Use the Zustand `collectionFilters.setUdbUnitIdFilter(id)` approach (D-06 architecture above) — no URL search param needed.

### Pitfall 5: compareIds Zustand state persists across sessions — stale compare on revisit
**What goes wrong:** User compares unit A vs B, navigates away, comes back — the compare route still shows A vs B even though the user may want a fresh compare.
**Why it happens:** Zustand state persists for the app session (no `sessionStorage` clearing).
**How to avoid:** `UnitComparePage` can show a "Clear" action that calls `clearCompare()`. Or auto-clear when the compare page unmounts. Reasonable UX — do not persist comparison across page visits.

### Pitfall 6: `useUdbOwnershipAll` returns data for all factions — large payload risk
**What goes wrong:** If the user has a large collection with units across many factions, the ownership query returns many rows, making the Map large.
**Why it happens:** `getOwnedCountsByUdbUnitId` has no faction scope.
**How to avoid:** For a personal hobby collection (< 500 units), this is negligible. The Map is built once; per-row lookups are O(1). No optimization needed at this scale.

---

## Code Examples

### Zustand store extension for compareIds (D-03)

```typescript
// Source: derived from existing databaseBrowserFilters.ts pattern
// Add to DatabaseBrowserFiltersState interface:
compareIds: Set<string>;
addToCompare: (id: string) => void;
removeFromCompare: (id: string) => void;
clearCompare: () => void;

// Add to create() body:
compareIds: new Set<string>(),
addToCompare: (id) =>
  set((s) => {
    if (s.compareIds.size >= 3) return s;  // hard cap at 3
    const next = new Set(s.compareIds);
    next.add(id);
    return { compareIds: next };
  }),
removeFromCompare: (id) =>
  set((s) => {
    const next = new Set(s.compareIds);
    next.delete(id);
    return { compareIds: next };
  }),
clearCompare: () => set({ compareIds: new Set<string>() }),
```

### Diff highlight rendering (D-04)

```typescript
// Source: pattern derived from GoalCard.tsx progress bar + UdbUnitRow badge
// In UnitCompareColumn, for a stat field:
function StatCell({ value, isDifferent }: { value: string | null; isDifferent: boolean }) {
  return (
    <span
      className={[
        "text-xl font-semibold text-center",
        isDifferent ? "bg-faction-accent/15 rounded" : "",
      ].join(" ").trim()}
    >
      {value ?? "—"}
    </span>
  );
}
```

### Collection filter extension for udbUnitIdFilter (D-06)

```typescript
// Source: derived from collectionFilters.ts (direct read)
// Add to CollectionFiltersState:
udbUnitIdFilter: string | null;
setUdbUnitIdFilter: (id: string | null) => void;

// In clearAll: udbUnitIdFilter: null

// In applyUnitFilters.ts UnitFiltersInput, add:
udbUnitIdFilter?: string | null;

// In applyUnitFilters filter body, add before return true:
if (filters.udbUnitIdFilter && unit.udb_unit_id !== filters.udbUnitIdFilter) return false;
```

### GoalProgressCard compact widget (D-10)

```typescript
// Source: adapted from GoalCard.tsx idiom (direct read)
export function GoalProgressCard() {
  const { data: goals = [] } = useGoals();
  const { data: progressMap } = useGoalProgress();

  const activeGoals = goals.filter(g => {
    const period = computeGoalPeriod(g.timeframe, g.period);
    return !period.isExpired;
  });

  if (activeGoals.length === 0) {
    return (
      <Card className="bg-card border border-border/60 shadow-sm">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">No active goals.</p>
          <Link to="/goals" className="text-sm text-faction-accent mt-1 inline-block">
            Set a hobby goal →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {activeGoals.map(goal => {
        const count = progressMap?.get(goal.id) ?? 0;
        const period = computeGoalPeriod(goal.timeframe, goal.period);
        const pct = Math.min(100, Math.round((count / Math.max(1, goal.target_count)) * 100));
        return (
          <div key={goal.id} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium truncate flex-1">{goal.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums shrink-0">
                {count} / {goal.target_count}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{period.label}</p>
            <div className="h-1.5 w-full rounded-full bg-border/40">
              <div
                className="h-1.5 rounded-full transition-all duration-500 bg-faction-accent"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `UdbWeaponsTable` in `unit-database/` | Single shared `WeaponTable` in `units/` | Phase 136 (HON-08) | Compare page can now use one component per column without maintaining two table variants |
| Name-based leader validation | FK-based `udb_leader_targets` join | Phase 137 (PLAY-03) | No direct impact on Phase 138 |
| Owned badge (display only, no navigation) | Owned badge with deep link to Collection | This phase (PLAY-04 D-06) | Completes the UDB → Collection round-trip |
| Goal progress only visible on `/goals` page | Goal progress surfaced on dashboard | This phase (PLAY-05) | Passive visibility; user sees goal state without navigating |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `bg-faction-accent/15` is a valid Tailwind class producing a semi-transparent accent highlight (the CSS var `--faction-accent` is defined) | Code Examples (diff highlight) | [ASSUMED] — the token is used in GoalCard.tsx and DashboardPage gradient style, so it exists; but the exact opacity suffix `/15` vs `/10` or `/20` is style discretion |
| A2 | The `SET` type in Zustand state serializes correctly for Tauri (no native bridge storage of Zustand state) | Architecture Patterns (compareIds) | [ASSUMED] — Zustand is in-memory only for this store (no `persist` middleware shown); should be safe |
| A3 | `useLogSession` / painting session mutations do NOT currently invalidate `GOAL_PROGRESS_KEY` | Pitfall 3 / Open Questions | [ASSUMED] — requires grep verification in the plan's Wave 0 |

**If this table is empty:** All claims in this research were verified or cited.

---

## Open Questions

1. **Does `useCreatePaintingSession` (or equivalent) invalidate `GOAL_PROGRESS_KEY`?**
   - What we know: `useGoals.ts` mutations (create/update/delete goal) invalidate `GOAL_PROGRESS_KEY`. Painting sessions change the progress count but are managed by a different hook.
   - What's unclear: `LogSessionSheet` calls a mutation — is `GOAL_PROGRESS_KEY` in its `onSuccess` invalidation set?
   - Recommendation: Plan Wave 0 must grep `src/hooks/usePaintingSession*.ts` or equivalent for `GOAL_PROGRESS_KEY`. If missing, add invalidation to `useCreatePaintingSession.onSuccess` — this is a Pitfall #9 symmetry fix.

2. **Should `GoalProgressCard` be placed in the left column (after Hobby Health) or the right column (before/after ActiveProjectsPanel)?**
   - What we know: Left column has Command Center + Hobby Health + By Faction; right column has Active Projects + Recent Activity + Army Readiness.
   - What's unclear: Goals are a "health" signal but also an "active" signal.
   - Recommendation: Left column, after "Hobby Health" section, as a new "Hobby Goals" section. This keeps the right column focused on activity/status feeds (D-10 is "card in dashboard grid" — no specific column mandated).

3. **Should `useUdbOwnershipAll` replace `useUdbOwnership` or coexist with it?**
   - What we know: `useUdbOwnership(factionId)` serves the faction-browser flow; `useUdbOwnershipAll` would serve the search flow. The faction-browser `ownershipMap` is built from `useUdbOwnership` results.
   - Recommendation: Coexist. `useUdbOwnership` is already scoped and efficient for the faction browser. Add `useUdbOwnershipAll` only for search results. `DatabaseBrowserPage` calls both; passes `ownershipMap` (faction-scoped) to `UdbUnitList` and `ownershipAllMap` to `UdbSearchResults`.

---

## Environment Availability

Step 2.6 SKIPPED — this phase is purely frontend and query-layer changes. No external tools, services, runtimes, databases, or CLI utilities beyond the project's own code are required. The existing Tauri + SQLite + Node.js dev environment is sufficient.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (jsdom environment) |
| Quick run command | `pnpm test -- tests/unit-database/ tests/goals/ tests/dashboard/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAY-01 | `getUdbUnitsByIds([id1, id2])` returns detail for each id | unit | `pnpm test -- tests/unit-database/unitDatabase.queries.test.ts` | ✅ (extend existing) |
| PLAY-01 | `useUdbUnitsByIds` returns array, disabled when empty | unit | `pnpm test -- tests/unit-database/` | ❌ Wave 0 new test |
| PLAY-01 | `databaseBrowserFilters.addToCompare` respects cap-3 | unit | `pnpm test -- tests/unit-database/` | ❌ Wave 0 new test |
| PLAY-01 | `UnitComparePage` renders N columns for N compare ids | component | `pnpm test -- tests/unit-database/UnitComparePage.test.tsx` | ❌ Wave 0 new file |
| PLAY-04 | `getOwnedCountsByUdbUnitId()` returns GROUP BY map | unit | `pnpm test -- tests/unit-database/unitDatabase.queries.test.ts` | ✅ (extend existing) |
| PLAY-04 | `UdbSearchResults` renders owned badge when map provided | component | `pnpm test -- tests/unit-database/UdbSearchResults.test.tsx` | ❌ Wave 0 new test |
| PLAY-04 | `UdbUnitRow` owned badge navigates to `/collection` | component | `pnpm test -- tests/unit-database/UdbUnitRow.test.tsx` | ✅ (extend existing) |
| PLAY-04 | `applyUnitFilters` respects `udbUnitIdFilter` | unit | `pnpm test -- tests/collection/` (or `units/`) | ❌ Wave 0 new test |
| PLAY-05 | `GoalProgressCard` renders progress bar per active goal | component | `pnpm test -- tests/dashboard/GoalProgressCard.test.tsx` | ❌ Wave 0 new file |
| PLAY-05 | `GoalProgressCard` shows empty state + link when no goals | component | same file | ❌ Wave 0 new file |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/unit-database/ tests/goals/ tests/dashboard/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit-database/UnitComparePage.test.tsx` — covers PLAY-01 column rendering + diff highlight
- [ ] `tests/unit-database/compareFilters.test.ts` — covers `compareIds` Zustand actions + cap-3 enforcement
- [ ] `tests/unit-database/UdbSearchResults.test.tsx` — covers owned badge in search results (extend UdbSearchResults to accept ownershipMap)
- [ ] `tests/dashboard/GoalProgressCard.test.tsx` — covers PLAY-05 widget rendering + empty state
- [ ] Extend `tests/unit-database/UdbUnitRow.test.tsx` — add navigate test for owned-badge deep link
- [ ] Extend `tests/unit-database/unitDatabase.queries.test.ts` — add `getUdbUnitsByIds` + `getOwnedCountsByUdbUnitId` test cases

---

## Security Domain

ASVS assessment: this phase adds only read-only UI components, a read-only batch query, and a navigation deep-link via Zustand filter state. No authentication, sessions, access control, cryptography, or user input processed into the database. The only new data path is `getOwnedCountsByUdbUnitId` (a SELECT aggregate with no user-supplied parameters). `getUdbUnitsByIds` accepts an array of canonical UDB ids from UI state (the Zustand compareIds Set). These ids originate from the UDB browser's unit rows, not from free-form user text entry — no injection vector.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | low | compareIds are `string[]` of UDB unit ids from in-app selection; not user-typed |
| V6 Cryptography | no | — |

**Security domain: no material concerns for this phase.**

---

## Sources

### Primary (HIGH confidence — direct codebase reads)
- `src/db/queries/unitDatabase.ts:198-265` — `getUdbUnitDetail` shape (basis for `getUdbUnitsByIds`)
- `src/db/queries/unitDatabase.ts:267-307` — `getUdbOwnershipForUnit` + `getUdbOwnershipByFaction` (basis for `getOwnedCountsByUdbUnitId`)
- `src/db/queries/goals.ts:49-66` — `getGoalProgress` — confirmed zero rules.db references
- `src/hooks/useUnitDatabase.ts` — confirmed `useUdbOwnership` / `useUdbUnitOwnership` patterns, `staleTime: 0`, key factories
- `src/hooks/useGoals.ts` — confirmed `GOALS_KEY`, `GOAL_PROGRESS_KEY`, `useGoals`, `useGoalProgress` shapes
- `src/features/unit-database/UdbUnitRow.tsx` — confirmed owned badge exists with no navigation primitive
- `src/features/unit-database/UdbSearchResults.tsx` — confirmed no ownership data (real gap, D-07)
- `src/features/unit-database/DatabaseBrowserPage.tsx` — confirmed page-level `ownershipMap` + all three existing flows (add-to-collection, faction-link, search)
- `src/features/unit-database/UdbDatasheetSheet.tsx` — confirmed WeaponTable import (shared component post-Phase-136)
- `src/features/unit-database/databaseBrowserFilters.ts` — confirmed existing Zustand store shape (basis for compareIds extension)
- `src/features/units/collectionFilters.ts` — confirmed no `udbUnitIdFilter` today (basis for D-06 extension)
- `src/features/units/applyUnitFilters.ts` — confirmed no `udb_unit_id` clause today
- `src/features/goals/GoalCard.tsx` — confirmed progress bar idiom (`h-1.5`, `bg-faction-accent`, `bg-border/40`, `pct%`)
- `src/features/dashboard/DashboardPage.tsx` — confirmed dashboard grid layout and right-column structure
- `src/app/router.tsx:200-248` — confirmed `unitDatabaseRoute` shape and route tree
- `src/features/units/UnitDetailSheet.tsx:108-119` — confirmed Collection→View Datasheet works

### Secondary (MEDIUM confidence — prior-phase research verified against codebase)
- `.planning/research/ARCHITECTURE.md §Q4` — comparison view design, owned-loop design, batch query pattern
- `.planning/research/PITFALLS.md §8,9,14` — hooks-in-loop, invalidation symmetry, hook-layer bypass
- `.planning/phases/138-player-journey-depth/138-CONTEXT.md` — all locked decisions D-01 through D-10

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all patterns from direct codebase reads
- Architecture: HIGH — all integration points confirmed by file reads
- Pitfalls: HIGH — rooted in confirmed code state (no navigation on badge, no ownership in search)
- PLAY-04 gap audit: HIGH — two gaps confirmed by direct reads (UdbUnitRow, UdbSearchResults)
- PLAY-05 derivation audit: HIGH — `getGoalProgress` confirmed rules.db-free by direct read

**Research date:** 2026-06-18
**Valid until:** 60 days (stable — all findings are code-grounded, not documentation-dependent)
