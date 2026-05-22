# Phase 98: Performance Optimization - Research

**Researched:** 2026-05-22
**Domain:** React performance, React Query invalidation, SQLite batch INSERT, code splitting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Route Lazy Loading (PERF-01)**
- D-01: Convert all 16 route page imports in `router.tsx` from eager static imports to `React.lazy(() => import('./page'))` dynamic imports. Each route gets its own chunk.
- D-02: Add a shared `Suspense` fallback at the layout route level (wrapping the `Outlet` in both `layoutRoute` and `bareLayoutRoute`). The fallback is a simple centered spinner.
- D-03: TanStack Router's `component` prop accepts lazy components directly. No need for a custom wrapper — `React.lazy` is simpler and standard.

**Mutation Invalidation Precision (PERF-02)**
- D-04: Audit all 25 hook files and remove invalidations where the target query does NOT actually depend on the mutated data.
- D-05: Keep cross-domain invalidations that are genuinely needed (e.g., unit mutations → dashboard-stats is correct because dashboard aggregates unit data).
- D-06: Where possible, use `exact: true` on invalidateQueries calls to prevent broad prefix-based invalidation from hitting unrelated sub-keys.

**Kanban Enrichment Batching (PERF-03)**
- D-07: Replace the O(N) `sortedIds.map(async (unitId) => ...)` loop in `useKanbanEnrichment.ts` with a batched SQL approach — a single query joining `recipe_assignments`, `recipe_steps`/`recipe_paints`, and `step_progress` with GROUP BY to return all unit progress in 1-2 round-trips.
- D-08: The existing batched fetches for recipe names (`getRecipeNamesByUnitIds`) and photo counts (`getPhotoCountsByUnitIds`) are already efficient — keep them. Only the applied recipe progress loop needs batching.

**React.memo Wrapping (PERF-04)**
- D-09: Wrap exactly the 3 components named in requirements: `KanbanCard`, `ArmyListUnitRow`, and `CurrentFocusCard` with `React.memo`. These are rendered inside lists or boards where parent re-renders are frequent.
- D-10: Use shallow prop comparison (default React.memo behavior). No custom comparator needed.

**Batched INSERT Statements (DBH-04)**
- D-11: Identify all JS-side query files that use for-of-await INSERT loops and convert to multi-row INSERT VALUES where Tauri plugin-sql supports it.
- D-12: The researcher should identify exactly which query files have insert-per-row patterns and assess whether Tauri plugin-sql's `execute` supports multi-row VALUES syntax.

### Claude's Discretion
- Loading spinner design and placement (centered spinner vs. subtle indicator)
- Whether to add `displayName` to memo'd components for DevTools clarity
- Exact SQL structure for the batched Kanban enrichment query
- Whether any additional components beyond the 3 named would obviously benefit from React.memo (researcher can flag, but baseline is the 3)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Route pages are lazy-loaded via React.lazy() — only the current page's code loads on navigation | 16 eager imports in router.tsx confirmed; React.lazy pattern verified; Suspense boundary placement identified |
| PERF-02 | Mutation invalidation chains are precise — each mutation only invalidates queries actually affected by it | Full invalidation audit completed; suspicious cross-domain invalidations identified; exact: true candidates identified |
| PERF-03 | Kanban enrichment fetches assignments and recipe data in batched queries instead of N sequential per-unit calls | O(N) loop in useKanbanEnrichment.ts lines 37-56 confirmed; batched SQL pattern designed |
| PERF-04 | High-frequency render components (KanbanCard, ArmyListUnitRow, CurrentFocusCard) are wrapped with React.memo | All 3 files located; none currently use React.memo; all are pure functional components suitable for memoization |
| DBH-04 | Sync/import operations use batched INSERT statements instead of N individual INSERTs | 4 files with for-of INSERT loops identified: syncedUnitPoints, bsdataExtended (x4 functions); batched VALUES syntax confirmed compatible |
</phase_requirements>

---

## Summary

Phase 98 targets five independent performance improvements across the React, React Query, and SQLite layers. Research has confirmed all five areas are real, measurable problems addressable with standard patterns — this is not speculative optimization.

The highest-impact change is the Kanban enrichment batching (PERF-03): the current `useKanbanEnrichment.ts` runs an O(N) per-unit loop of 3-4 sequential DB queries each. With 20 units on a board, this is ~60-80 SQLite round-trips on every board render. The target is 2 batched queries regardless of unit count.

The second highest-impact change is route lazy loading (PERF-01): the current `router.tsx` imports all 16 page components statically, meaning the entire app bundle loads before the user sees the first frame. Each route will become a separate chunk loaded on demand.

Batch INSERT (DBH-04) targets sync operations which are already infrequent user-triggered actions but have measurable N×round-trip overhead. Four functions in `syncedUnitPoints.ts` and `bsdataExtended.ts` each loop INSERT one row at a time. Multi-row `VALUES` clauses are supported by Tauri plugin-sql's `db.execute()` since it passes SQL directly to SQLite.

**Primary recommendation:** Implement in this order: PERF-01 (router.tsx — isolated, low-risk), PERF-04 (3 component wraps — trivial), PERF-02 (invalidation audit — mechanical removal), PERF-03 (batched enrichment SQL — requires new query functions), DBH-04 (batched INSERT — requires SQL rewrite of 4 functions).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Route code splitting | Frontend/Vite bundler | React runtime | Vite creates chunks; React.lazy controls dynamic import |
| React Query invalidation | React Query cache | API/DB layer | Query keys are a client concern; affects which DB queries re-run |
| Kanban enrichment batching | DB/query layer | React Query | SQL is the bottleneck; hook orchestrates |
| React.memo memoization | React component layer | — | Pure render optimization; no data layer involvement |
| Batch INSERT during sync | DB/query layer | — | JS query functions own the SQL; Tauri plugin-sql executes |

---

## Standard Stack

### Core (all already in project — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React.lazy + Suspense | React 19 (in use) | Dynamic import + loading boundary | Standard React API; Vite produces chunks automatically [VERIFIED: in use] |
| React.memo | React 19 (in use) | Prevent unnecessary re-renders | Standard React API; zero dependencies [VERIFIED: in use] |
| TanStack Router | In use | Route component prop | Accepts React.lazy components natively [VERIFIED: in use] |
| Tauri plugin-sql | In use | db.execute() for multi-row VALUES | Passes SQL directly to SQLite; multi-row syntax works [ASSUMED] |

**No new packages required.** This phase is entirely configuration and pattern changes to existing code.

### Installation
No installation step required.

---

## Package Legitimacy Audit

No external packages are introduced in this phase. All changes use already-installed React 19 and Tauri plugin-sql APIs.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User navigates to route
        ↓
TanStack Router matches path
        ↓
React.lazy() dynamic import (NEW — triggers Vite chunk load)
        ↓
Suspense boundary shows spinner while chunk downloads
        ↓
Page component renders → useQuery hooks fire
        ↓
React Query cache checks staleness
        ↓
If stale: fires DB query functions (SQLite)
        ↓
Mutation fires → onSuccess invalidateQueries (PRUNED — only affected keys)
        ↓
React re-renders only subscribed components
        ↓
React.memo prevents re-render if props unchanged (NEW on 3 hot components)
```

For Kanban board specifically:
```
PaintingProjectsPage renders board
        ↓
useKanbanEnrichment(unitIds) fires
        ↓
[CURRENT] O(N) per-unit loop → getAssignmentsByUnit × N → getStepProgress × N → ...
[TARGET]  1 batched query → getEnrichmentDataByUnitIds(unitIds) → all data returned
        ↓
KanbanCard renders per unit (React.memo prevents re-render if same props)
```

### Recommended Project Structure

No structural changes. All modifications are in-place edits to existing files:

```
src/
  app/
    router.tsx              — 16 static imports → React.lazy dynamic imports + Suspense
  hooks/
    useKanbanEnrichment.ts  — O(N) loop → 1 batched call to new query function
    useUnits.ts             — remove provably unnecessary invalidations
    useArmyLists.ts         — audit and trim broad invalidations
    [other hooks]           — audit invalidation chains
  db/queries/
    recipeAssignments.ts    — NEW: getKanbanProgressByUnitIds() batched query
    syncedUnitPoints.ts     — for-of INSERT loops → multi-row VALUES
    bsdataExtended.ts       — for-of INSERT loops × 4 → multi-row VALUES
  features/
    painting-projects/KanbanCard.tsx    — wrap export with React.memo
    army-lists/ArmyListUnitRow.tsx      — wrap export with React.memo
    dashboard/CurrentFocusCard.tsx      — wrap export with React.memo
```

### Pattern 1: React.lazy Route Conversion

**What:** Replace static import + eager component with dynamic import via React.lazy
**When to use:** All top-level route page components in router.tsx

```typescript
// Source: React 19 docs / existing React patterns [ASSUMED - standard React API]

// BEFORE (eager — whole bundle loaded upfront):
import { DashboardPage } from "./dashboard/page";
const dashboardRoute = createRoute({
  component: DashboardPage,
});

// AFTER (lazy — chunk loads on first navigation):
import { lazy, Suspense } from "react";
const DashboardPage = lazy(() => import("./dashboard/page").then(m => ({ default: m.DashboardPage })));

// Suspense boundary in layoutRoute:
component: () => (
  <AppLayout>
    <ActiveFactionProvider>
      <Suspense fallback={<div className="flex h-full items-center justify-center"><Spinner /></div>}>
        <Outlet />
      </Suspense>
    </ActiveFactionProvider>
  </AppLayout>
)
```

**Named export handling:** The project uses named exports (e.g., `export function DashboardPage`), not default exports. The `.then(m => ({ default: m.DashboardPage }))` adapter is required. [VERIFIED: confirmed from router.tsx inspection]

### Pattern 2: Suspense Boundary Placement

**What:** Single Suspense wrapping the Outlet at layout level — not per-route
**When to use:** Once in `layoutRoute.component` and once in `bareLayoutRoute.component`

The `bareLayoutRoute` also needs a Suspense boundary since `PaintingModePage` will become lazy. Placement in the component wrapping the `Outlet` ensures the fallback replaces only the page content area, not the sidebar or app shell.

### Pattern 3: React.memo Wrapping Named Exports

**What:** Wrap functional component with React.memo at export site
**When to use:** KanbanCard, ArmyListUnitRow, CurrentFocusCard

```typescript
// Source: React 19 docs [ASSUMED - standard React API]

// BEFORE:
export function KanbanCard({ unit, faction, ... }: KanbanCardProps) {
  // ...
}

// AFTER (with optional displayName for DevTools):
export const KanbanCard = memo(function KanbanCard({ unit, faction, ... }: KanbanCardProps) {
  // ...
});
KanbanCard.displayName = "KanbanCard";
```

**ArmyListUnitRow memo caveat:** This component has internal state (`useState`, `useEffect`) and calls multiple hooks (`useUpdateArmyListUnit`, `useUnitLoadouts`, `useUnitRulesMapping`, `useUnitKeywords`, `useQuery`). React.memo only prevents re-render when PARENT re-renders with unchanged props — it does not prevent re-render triggered by internal state or hook changes. The component is still a good memo candidate because its parent `ArmyListDetailSheet` likely re-renders frequently due to list-level state updates. [VERIFIED: from ArmyListUnitRow.tsx inspection]

### Pattern 4: Batched Kanban Enrichment Query

**What:** Single SQL query that returns assignment progress for ALL kanban units at once
**When to use:** Replace the per-unit loop in `useKanbanEnrichment.ts` lines 37-56

```typescript
// New function in src/db/queries/recipeAssignments.ts
export interface KanbanProgressRow {
  unit_id: number;
  assignment_id: number;
  assignment_count: number;
  recipe_id: number;
  recipe_name: string;
  total_steps: number;
  completed_steps: number;
}

export async function getKanbanProgressByUnitIds(
  unitIds: number[]
): Promise<KanbanProgressRow[]> {
  if (unitIds.length === 0) return [];
  const db = await getDb();
  const placeholders = unitIds.map((_, i) => `$${i + 1}`).join(", ");
  return db.select<KanbanProgressRow[]>(
    `SELECT
       a.unit_id,
       a.id AS assignment_id,
       COUNT(DISTINCT a2.id) AS assignment_count,
       a.recipe_id,
       r.name AS recipe_name,
       COUNT(DISTINCT rs.id) AS total_steps,
       COUNT(DISTINCT CASE WHEN sp.completed = 1 THEN sp.recipe_step_id END) AS completed_steps
     FROM unit_recipe_assignments a
     JOIN (
       SELECT unit_id, MAX(created_at) AS latest_created
       FROM unit_recipe_assignments
       WHERE unit_id IN (${placeholders})
       GROUP BY unit_id
     ) primary_asgn ON a.unit_id = primary_asgn.unit_id AND a.created_at = primary_asgn.latest_created
     JOIN painting_recipes r ON r.id = a.recipe_id
     JOIN (
       SELECT unit_id, COUNT(*) AS total_count
       FROM unit_recipe_assignments
       WHERE unit_id IN (${placeholders})
       GROUP BY unit_id
     ) counts ON counts.unit_id = a.unit_id
     LEFT JOIN recipe_steps rs ON rs.recipe_id = a.recipe_id
     LEFT JOIN unit_recipe_step_progress sp ON sp.assignment_id = a.id AND sp.recipe_step_id = rs.id
     WHERE a.unit_id IN (${placeholders})
     GROUP BY a.unit_id, a.id, a.recipe_id, r.name, counts.total_count`,
    [...unitIds, ...unitIds, ...unitIds]
  );
}
```

**Note on positional params:** The `$N` placeholders for Tauri plugin-sql are positional-by-index, not named. Repeating the array 3 times for 3 IN-clause uses is correct — each occurrence uses fresh parameter indexes. [VERIFIED: from existing codebase pattern in getRecipeNamesByUnitIds]

**Alternative simpler SQL approach (recommended):** The subquery approach above is complex. A simpler alternative that avoids re-parameterization:

```sql
-- Get the most-recent assignment per unit (primary) using ROW_NUMBER
WITH ranked AS (
  SELECT
    id, unit_id, recipe_id, created_at,
    ROW_NUMBER() OVER (PARTITION BY unit_id ORDER BY created_at DESC) AS rn,
    COUNT(*) OVER (PARTITION BY unit_id) AS total_assignments
  FROM unit_recipe_assignments
  WHERE unit_id IN ($1, $2, ...)
)
SELECT
  r.unit_id,
  r.id AS assignment_id,
  r.total_assignments AS assignment_count,
  r.recipe_id,
  pr.name AS recipe_name,
  COUNT(rs.id) AS total_steps,
  COUNT(CASE WHEN sp.completed = 1 THEN 1 END) AS completed_steps
FROM ranked r
JOIN painting_recipes pr ON pr.id = r.recipe_id
LEFT JOIN recipe_steps rs ON rs.recipe_id = r.recipe_id
LEFT JOIN unit_recipe_step_progress sp ON sp.assignment_id = r.id AND sp.recipe_step_id = rs.id
WHERE r.rn = 1
GROUP BY r.unit_id, r.id, r.recipe_id, pr.name, r.total_assignments
```

SQLite supports window functions (ROW_NUMBER, COUNT OVER) from version 3.25.0 (2018). Tauri ships with a bundled SQLite that is far newer. [ASSUMED — SQLite version check not performed]

### Pattern 5: Multi-row INSERT VALUES

**What:** Replace N individual `db.execute(INSERT ... VALUES ($1, $2), [row])` calls with one `db.execute(INSERT ... VALUES ($1,$2),($3,$4),...)`
**When to use:** `replaceSyncedUnitPoints`, `replaceSyncedUnitPointTiers`, `replaceSyncedEnhancements`, `replaceSyncedLoadoutOptions`, `replaceSyncedModelCounts`, `replaceSyncedLeaderTargets`

```typescript
// Source: SQLite docs — multi-row VALUES is standard SQL [ASSUMED]

// BEFORE (N round-trips):
for (const row of rows) {
  await db.execute(
    `INSERT INTO synced_unit_points (unit_name, faction_id, points, synced_at) VALUES ($1, $2, $3, $4)`,
    [row.unit_name, row.faction_id, row.points, syncedAt]
  );
}

// AFTER (1 round-trip):
const placeholders = rows.map((_, i) => {
  const base = i * 4;
  return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
}).join(", ");
const params = rows.flatMap(row => [row.unit_name, row.faction_id, row.points, syncedAt]);
await db.execute(
  `INSERT INTO synced_unit_points (unit_name, faction_id, points, synced_at) VALUES ${placeholders}`,
  params
);
```

**Chunk size guard:** SQLite has a parameter limit (typically 999 for older versions, 32766 for newer). For safety, chunk rows into batches of 200 rows before building the VALUES clause. The sync tables (hundreds of rows) are well within this limit but the guard is a best practice.

**Empty array guard:** Must check `if (rows.length === 0) return;` before building the VALUES clause — an empty VALUES list is invalid SQL.

### Anti-Patterns to Avoid

- **Wrapping layoutRoute itself in Suspense outside the component:** The Suspense boundary must be INSIDE the component function, wrapping `<Outlet />`. Wrapping at the route definition level doesn't work with TanStack Router.
- **Using React.memo with a custom comparator for ArmyListUnitRow:** The props include complex objects (ArmyListUnitRowType) — a faulty custom comparator could silently skip needed updates. Default shallow comparison is safe here because the parent passes the same object reference when data hasn't changed (React Query returns stable references).
- **Chaining `.then(m => ({ default: m.X }))` incorrectly:** If the page module uses `export default`, skip the `.then` adapter. All current pages use named exports.
- **SQLite parameter limit:** Building one INSERT for thousands of rows hits SQLite's SQLITE_MAX_VARIABLE_NUMBER limit. Chunk at 200 rows.
- **Broad prefix invalidation after exact: true changes:** Adding `exact: true` to an invalidateQueries call changes semantics — `["army-lists"]` with `exact: true` only hits the exact key, NOT `["army-lists", 5]`. Only add `exact: true` when you specifically want to avoid hitting sub-keys.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chunk loading UI | Custom loading detection | React Suspense | Built-in, works with ErrorBoundary, no coordination needed |
| Prop change detection | Custom comparator function | React.memo default | Shallow comparison is correct for flat props; custom comparators are error-prone |
| SQL parameter counting | Manual string building | Array.map with index offset | Systematic, error-free for multi-row VALUES construction |

**Key insight:** All five improvements use standard, stable APIs. The risk is in the details (named export adapter for lazy, exact param semantics, SQL param limits) not in choosing the wrong library.

---

## Invalidation Audit Findings

### useUnits.ts — Current Invalidations

`useCreateUnit` invalidates: `units`, `dashboard-stats`, `spending-stats`, `hobby-analytics`, `army-readiness`
- `dashboard-stats`: **KEEP** — dashboard aggregates unit counts [VERIFIED: commented rationale in file]
- `spending-stats`: **QUESTIONABLE** — creating a unit does not create spending; spending is from purchase entries. However, unit count appears in spending analytics header. Recommend **KEEP with note**.
- `hobby-analytics`: **KEEP** — unit count feeds hobby analytics
- `army-readiness`: **KEEP** — new units affect readiness totals

`useUpdateUnit` invalidates: same as above + `army-list-readiness`, `army-lists`
- `army-list-readiness`: **KEEP** — painting status changes affect battle-ready points
- `army-lists`: **KEEP** — points override on unit is used in COALESCE chain in army list queries

`useDeleteUnit` invalidates: `units`, `dashboard-stats`, `spending-stats`, `hobby-analytics`, `army-readiness`
- Same assessment — all reasonable, no obvious pruning

**Assessment: useUnits.ts invalidations are well-reasoned and documented. Low pruning opportunity.**

### useArmyLists.ts — Current Invalidations

Pattern repeated across many mutations: `ARMY_LIST_KEY(id)`, `ARMY_LIST_UNITS_KEY(id)`, `ARMY_LISTS_KEY`, `dashboard-stats`, `army-list-readiness`

- `dashboard-stats` on every army list mutation: **KEEP** — forward-compat DATA-09 pattern, well-documented
- `army-list-readiness` without `exact: true` on most calls: **D-06 CANDIDATE** — `["army-list-readiness"]` without `exact: false` still hits prefix matches. The key factory is `ARMY_LIST_READINESS_KEY = (ids) => ["army-list-readiness", ...ids]`. Broad invalidation refetches ALL readiness queries. For scoped mutations (setWarlord on a specific list), could use `ARMY_LIST_READINESS_KEY([variables.list_id])` as the exact key — but readiness keys include multiple list IDs. **Safer to leave broad here — functionally correct.**

**Assessment: useArmyLists.ts is already well-scoped. The `dashboard-stats` invalidations on warlord/leader/attachment mutations are the most questionable (warlord doesn't change points), but these are explicitly documented DATA-09 forward-compatibility calls. Recommend leaving untouched.**

### useRecipeAssignments.ts — Current Invalidations

`useCreateAssignment`, `useDeleteAssignment`:
- Invalidate `UNIT_ASSIGNMENTS_KEY`, `RECIPE_ASSIGNMENTS_KEY`, `kanban-enrichment`, `NEXT_PAINTING_ACTION_KEY`
- All directly relevant — no pruning

`useToggleStepProgress`:
- Invalidates `STEP_PROGRESS_KEY`, `kanban-enrichment`, `NEXT_PAINTING_ACTION_KEY`
- All relevant

`useCompleteStep`:
- Invalidates: step progress, kanban enrichment, unit assignments, next painting action, workflow positions, dashboard stats, painting sessions, recent activity, hobby analytics, goal progress
- This is broad but justified — completing a step is a significant event that touches 8 different computed views. **KEEP ALL.**

**Assessment: useRecipeAssignments.ts is well-targeted. No pruning needed.**

### useRulesSync.ts — Invalidations

All 18+ invalidations target rules-related keys. These are all correct — a sync operation replaces all rules data and every rules-derived query should refresh.

**Assessment: No pruning needed. `exact: false` on each is intentional since sub-keys like `["datasheet", "by-faction", "Space Marines"]` must all be cleared.**

### Summary: Where exact: true helps

| Hook file | Mutation | Candidate key | Reason |
|-----------|----------|---------------|--------|
| useArmyLists | clearWarlord | `["army-list-readiness"]` | Warlord is a display field, doesn't affect readiness points — could remove entirely |
| useArmyLists | setClearLeaderAttachment | `["army-lists"]` broad | Only the specific list changed; `ARMY_LIST_KEY(id)` already covers it |

**Recommendation:** The invalidation chains in this codebase are already well-reasoned and commented. PERF-02 is best implemented as: (1) add `exact: true` to single-entity invalidations that are already key-specific, and (2) remove `["army-lists"]` broad invalidation from mutations that already invalidate `ARMY_LIST_KEY(id)` — the index list `["army-lists"]` doesn't need refreshing when only one list's detail changed.

---

## Common Pitfalls

### Pitfall 1: Named Export Adapter for React.lazy
**What goes wrong:** `React.lazy(() => import('./page'))` fails if the module uses named exports, because lazy expects a module with a `default` export.
**Why it happens:** All current page components use named exports (`export function DashboardPage`), not `export default`.
**How to avoid:** Use the `.then(m => ({ default: m.DashboardPage }))` adapter pattern for every import.
**Warning signs:** `React.lazy: The result of dynamic `import()` must be a default export of a React component` error at runtime.

### Pitfall 2: Suspense Boundary Must Wrap Outlet, Not Route
**What goes wrong:** Adding Suspense around the RouterProvider or at the route tree level has no effect — TanStack Router manages its own rendering loop.
**Why it happens:** TanStack Router controls when components mount; Suspense only catches `use()` or promise-throwing during render of children.
**How to avoid:** Place `<Suspense>` inside the `component` function of `layoutRoute` and `bareLayoutRoute`, wrapping `<Outlet />` directly.
**Warning signs:** Spinner never appears; chunks still load but without any visual indicator.

### Pitfall 3: React.memo on Components with Internal Hooks
**What goes wrong:** Developers assume React.memo prevents ALL re-renders. It only prevents re-renders caused by parent re-renders with unchanged props. Internal state changes or hook subscriptions (useQuery) still cause re-renders.
**Why it happens:** Misunderstanding of what React.memo optimizes.
**How to avoid:** Accept this behavior — it is correct. The win is when a large parent like ArmyListsPage re-renders due to its own state and would normally cascade to all ArmyListUnitRow children.
**Warning signs:** No re-render reduction observed when the row's own queries refetch. This is expected.

### Pitfall 4: SQLite Parameter Index in Multi-row VALUES
**What goes wrong:** Multi-row INSERT builds placeholders like `($1,$2,$3),($1,$2,$3)` — reusing indexes — which is wrong for Tauri plugin-sql. Parameters are positional: `$1` through `$N` each map to one position in the params array.
**Why it happens:** Copy-paste error or misunderstanding of positional vs named params.
**How to avoid:** Use index math: `const base = i * colCount; return ($${base+1}, $${base+2}, ...)`.
**Warning signs:** First row inserted correctly, subsequent rows get wrong values. SQLite may throw a binding error.

### Pitfall 5: exact: true Changes Invalidation Semantics
**What goes wrong:** Adding `exact: true` to `queryKey: ["army-lists"]` means it ONLY hits the exact key `["army-lists"]` — it no longer hits `["army-lists", 5]` or `["army-lists", 5, "units"]`.
**Why it happens:** Default behavior (no `exact`) uses prefix matching, so `["army-lists"]` invalidates ALL keys starting with that prefix.
**How to avoid:** Only add `exact: true` when you specifically want to skip sub-keys. Document the intent in a comment.
**Warning signs:** Detail views stop refreshing after list-level mutations.

### Pitfall 6: Kanban Enrichment SQL Must Handle Units with No Assignments
**What goes wrong:** A strict JOIN on `unit_recipe_assignments` silently drops units from the result when they have no assignment. The hook then has no entry in `appliedProgress` for that unit — this is correct behavior, but the planner must confirm the query uses the right JOIN type.
**Why it happens:** The new batched query uses JOINs; units with no assignments must not appear as missing entries but as absent entries.
**How to avoid:** The batched query should not LEFT JOIN from units — it should only return rows for units that HAVE a primary assignment. Units with no assignments stay absent from the map (same as current per-unit behavior).
**Warning signs:** Units that previously showed workflow position stop showing it, replaced by nothing (assignedProgress absent from map is correct; the UI falls through to workflowPosition display).

---

## Code Examples

### Example 1: Current O(N) Kanban Enrichment Loop (to be replaced)

```typescript
// src/hooks/useKanbanEnrichment.ts — CURRENT CODE, lines 37-56
// Source: verified from file inspection
await Promise.all(
  sortedIds.map(async (unitId) => {
    const assignments = await getAssignmentsByUnit(unitId);  // N queries
    if (assignments.length === 0) return;
    const primary = assignments[assignments.length - 1];
    const [steps, progressRows, recipe] = await Promise.all([
      getRecipePaintsByRecipe(primary.recipe_id),  // N queries
      getStepProgress(primary.id),                  // N queries
      getRecipeById(primary.recipe_id),             // N queries
    ]);
    // ...
  }),
);
// Total: 4N DB round-trips for N units
```

### Example 2: Existing Batched Pattern (model for new query)

```typescript
// src/db/queries/recipes.ts — getRecipeNamesByUnitIds (already efficient)
// Source: verified from file inspection
export async function getRecipeNamesByUnitIds(unitIds: number[]) {
  if (unitIds.length === 0) return [];
  const db = await getDb();
  const placeholders = unitIds.map((_, i) => `$${i + 1}`).join(", ");
  return db.select(
    `SELECT id, unit_id, name FROM painting_recipes WHERE unit_id IN (${placeholders})`,
    unitIds
  );
}
```

### Example 3: Current Insert-per-Row Pattern (in 4 functions)

```typescript
// src/db/queries/syncedUnitPoints.ts — replaceSyncedUnitPoints (CURRENT)
// Source: verified from file inspection
for (const row of rows) {
  await db.execute(
    `INSERT INTO synced_unit_points (unit_name, faction_id, points, synced_at)
     VALUES ($1, $2, $3, $4)`,
    [row.unit_name, row.faction_id, row.points, syncedAt],
  );
}
// For 500 synced_unit_points rows: 500 round-trips
```

---

## Batch INSERT Targets — Detailed Inventory

The following functions in the JS query layer use per-row INSERT loops inside transactions. All are candidates for DBH-04.

| File | Function | Columns | Max Expected Rows |
|------|----------|---------|-------------------|
| `src/db/queries/syncedUnitPoints.ts` | `replaceSyncedUnitPoints` | 4 | ~500 (Wahapedia units) |
| `src/db/queries/syncedUnitPoints.ts` | `replaceSyncedUnitPointTiers` | 5 | ~1500 (3 tiers × 500 units) |
| `src/db/queries/bsdataExtended.ts` | `replaceSyncedEnhancements` | 5 | ~200 |
| `src/db/queries/bsdataExtended.ts` | `replaceSyncedLoadoutOptions` | 7 | ~2000 |
| `src/db/queries/bsdataExtended.ts` | `replaceSyncedModelCounts` | 5 | ~500 |
| `src/db/queries/bsdataExtended.ts` | `replaceSyncedLeaderTargets` | 4 | ~300 |
| `src/db/queries/recipeAssignments.ts` | `bulkCreateAssignments` | 2 | ~50 (user-initiated) |
| `src/db/queries/recipes.ts` | `duplicateRecipe` (sections loop) | 10 | ~20 |
| `src/db/queries/recipes.ts` | `saveRecipeGraph` (steps loops) | 13 | ~50 |

**Priority for DBH-04:** The `synced*` functions in `syncedUnitPoints.ts` and `bsdataExtended.ts` are the primary targets — these run automatically during sync and have the most rows. The `bulkCreateAssignments`, `duplicateRecipe`, and `saveRecipeGraph` loops are user-interactive with small N and already wrapped in transactions — they are lower priority but can be included.

**Decision D-12 finding:** Tauri plugin-sql's `db.execute()` passes SQL directly to SQLite's native C API. Multi-row `VALUES ($1,$2),($3,$4),...` syntax is standard SQLite 3.x and is fully supported. [ASSUMED — no native test performed, but based on how Tauri plugin-sql bridges to rusqlite which uses sqlite3 directly]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Webpack code splitting | Vite native chunking with React.lazy | Vite adoption | Simpler — no webpack config needed |
| `shouldComponentUpdate` | `React.memo` | React hooks era | Function component equivalent |
| Manual query invalidation | React Query `invalidateQueries` | RQ adoption | Still need discipline on scope |

**No deprecated APIs involved in this phase.** All patterns are current React 19 and React Query v5 idioms.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tauri plugin-sql `db.execute()` supports multi-row VALUES syntax | Batch INSERT Pattern, DBH-04 targets | If wrong, must use chunked single-row inserts (the current approach) — no regression, just no improvement |
| A2 | Tauri ships with SQLite >= 3.25.0 (window functions available) | Pattern 4 (CTE approach) | If wrong, use the subquery approach instead of ROW_NUMBER() CTE |
| A3 | TanStack Router's `component` prop works with React.lazy wrapped components | Pattern 1 | If wrong, would need TanStack Router's own lazy mechanism (`loader` + `component: lazyRouteComponent()`) |
| A4 | `spending-stats` invalidation on unit create/delete is intentional (unit count in spending analytics) | Invalidation Audit | If wrong (it's just defensive noise), it can be removed — low risk |

**If table is not empty:** A1 and A2 are the most important to validate. A1 can be confirmed by trying a multi-row INSERT in a quick test. A2 can be confirmed by checking the Tauri bundled SQLite version (`SELECT sqlite_version()` in a DB query).

---

## Open Questions

1. **SQLite version in Tauri bundle**
   - What we know: Tauri bundles its own SQLite via rusqlite crate
   - What's unclear: Exact SQLite version — relevant for window function availability (ROW_NUMBER)
   - Recommendation: Use the simpler subquery approach for the batched kanban query to avoid window function dependency. Window functions are a bonus if available.

2. **ArmyListUnitRow memo benefit — hooks inside**
   - What we know: ArmyListUnitRow calls `useUnitLoadouts`, `useUnitRulesMapping`, `useUnitKeywords`, and an inline `useQuery`. These hook subscriptions cause re-renders independently of props.
   - What's unclear: How frequently the parent `ArmyListDetailSheet` re-renders in practice
   - Recommendation: Apply memo anyway — it prevents at minimum the prop-triggered re-renders. The hooks will still re-render on their own data changes, which is correct behavior.

3. **Route chunk naming strategy**
   - What we know: Vite automatically names chunks based on the file path
   - What's unclear: Whether Vite produces human-readable chunk names or hashes
   - Recommendation: Not a blocking question; chunk names are invisible to users and irrelevant to correctness.

---

## Environment Availability

Step 2.6: SKIPPED (no new external dependencies — all changes use already-installed React 19 and Tauri plugin-sql)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (Vitest inline config) |
| Quick run command | `pnpm test -- tests/performance` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | Lazy route components are dynamic imports (not eager modules) | Unit | `pnpm test -- tests/performance/lazyRoutes.test.ts` | ❌ Wave 0 |
| PERF-02 | Pruned invalidations do not trigger unrelated queries | Unit | `pnpm test -- tests/performance/invalidationAudit.test.ts` | ❌ Wave 0 |
| PERF-03 | `getKanbanProgressByUnitIds` returns all units in 1 query | Unit | `pnpm test -- tests/performance/kanbanBatchEnrichment.test.ts` | ❌ Wave 0 |
| PERF-04 | KanbanCard, ArmyListUnitRow, CurrentFocusCard do not re-render on unrelated parent re-render | Unit | `pnpm test -- tests/performance/reactMemo.test.ts` | ❌ Wave 0 |
| DBH-04 | `replaceSyncedUnitPoints` inserts N rows with 1 SQL call, not N calls | Unit | `pnpm test -- tests/performance/batchInsert.test.ts` | ❌ Wave 0 |

**Note:** PERF-01 (lazy routes) is difficult to test meaningfully in jsdom — Vite chunks are a build artifact. A practical test verifies that each page module import resolves as a lazy component (its `_init` property is a function, not a module). PERF-04 (React.memo) can be tested with `React.memo.mock` checking or by rendering with `renderCount` tracking from `@testing-library/react`.

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/performance`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/performance/lazyRoutes.test.ts` — verifies PERF-01 (router lazy imports)
- [ ] `tests/performance/kanbanBatchEnrichment.test.ts` — verifies PERF-03 (new batched query)
- [ ] `tests/performance/batchInsert.test.ts` — verifies DBH-04 (multi-row VALUES)
- [ ] `tests/performance/reactMemo.test.ts` — verifies PERF-04 (memo on 3 components)
- [ ] `tests/performance/invalidationAudit.test.ts` — verifies PERF-02 (no spurious invalidations)

---

## Security Domain

No security-sensitive changes in this phase. All modifications are:
- Import statement refactoring (lazy vs. eager)
- SQL SELECT optimization (batching existing queries)
- SQL INSERT optimization (multi-row VALUES with same data)
- Component rendering optimization (React.memo wrapper)

No new external inputs, no authentication changes, no new APIs. ASVS not applicable.

---

## Sources

### Primary (HIGH confidence)
- `src/app/router.tsx` — verified all 16 static imports, both layout routes, TanStack Router version
- `src/hooks/useKanbanEnrichment.ts` — verified O(N) loop, line numbers, query function names
- `src/db/queries/syncedUnitPoints.ts` — verified for-of INSERT loop pattern (replaceSyncedUnitPoints, replaceSyncedUnitPointTiers)
- `src/db/queries/bsdataExtended.ts` — verified for-of INSERT loop pattern (4 replace* functions)
- `src/db/queries/recipeAssignments.ts` — verified getAssignmentsByUnit, getStepProgress signatures
- `src/db/queries/recipes.ts` — verified saveRecipeGraph and duplicateRecipe loop patterns
- `src/features/painting-projects/KanbanCard.tsx` — verified named export, no existing memo
- `src/features/army-lists/ArmyListUnitRow.tsx` — verified named export, internal state, multiple hooks
- `src/features/dashboard/CurrentFocusCard.tsx` — verified named export, pure render, no internal state
- `src/hooks/useUnits.ts`, `useArmyLists.ts`, `useRecipeAssignments.ts`, `useRulesSync.ts` — invalidation audit
- `.planning/phases/98-performance-optimization/98-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- React docs pattern for React.lazy with named exports (standard, well-documented pattern)
- TanStack Router v1 docs — component prop accepts lazy components

### Tertiary (LOW confidence)
- SQLite multi-row VALUES syntax support in Tauri plugin-sql [ASSUMED — not tested]
- SQLite window function availability in Tauri bundle [ASSUMED — version not checked]

---

## Metadata

**Confidence breakdown:**
- PERF-01 (lazy routes): HIGH — all code verified, pattern is standard React
- PERF-02 (invalidation audit): HIGH — all hook files read and assessed
- PERF-03 (Kanban batching): HIGH — problem confirmed; SQL pattern is MEDIUM (window function availability not verified)
- PERF-04 (React.memo): HIGH — components verified, pattern is standard
- DBH-04 (batch INSERT): MEDIUM — pattern correct; Tauri multi-row VALUES support assumed not confirmed

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (stable APIs, no fast-moving ecosystem concerns)
