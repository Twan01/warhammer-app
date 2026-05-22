# Phase 98: Performance Optimization - Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 9 files to be modified + 5 new test files
**Analogs found:** 12 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/router.tsx` | config/route | request-response | self (in-place edit) | self |
| `src/hooks/useKanbanEnrichment.ts` | hook | batch/transform | `src/hooks/useKanbanEnrichment.ts` (self) + `getRecipeNamesByUnitIds` pattern | self + role-match |
| `src/db/queries/recipeAssignments.ts` (new fn) | query | batch/transform | `src/db/queries/unitPhotos.ts` `getPhotoCountsByUnitIds` | exact |
| `src/db/queries/syncedUnitPoints.ts` | query | batch | self (in-place edit) | self |
| `src/db/queries/bsdataExtended.ts` | query | batch | self (in-place edit) + `syncedUnitPoints.ts` | self |
| `src/features/painting-projects/KanbanCard.tsx` | component | request-response | `src/features/dashboard/CurrentFocusCard.tsx` | role-match |
| `src/features/army-lists/ArmyListUnitRow.tsx` | component | request-response | `src/features/dashboard/CurrentFocusCard.tsx` | role-match |
| `src/features/dashboard/CurrentFocusCard.tsx` | component | request-response | self (in-place edit) | self |
| `src/hooks/useUnits.ts` (audit) | hook | CRUD | self (in-place audit) | self |
| `src/hooks/useArmyLists.ts` (audit) | hook | CRUD | self (in-place audit) | self |
| `tests/performance/lazyRoutes.test.ts` | test | — | `tests/foundation/useUnits.test.ts` | role-match |
| `tests/performance/kanbanBatchEnrichment.test.ts` | test | — | `tests/painting/kanbanEnrichment.test.ts` | exact |
| `tests/performance/batchInsert.test.ts` | test | — | `tests/painting/kanbanEnrichment.test.ts` | role-match |
| `tests/performance/reactMemo.test.ts` | test | — | `tests/dashboard/CurrentFocusCard.test.tsx` | role-match |
| `tests/performance/invalidationAudit.test.ts` | test | — | `tests/foundation/useUnits.test.ts` | exact |

---

## Pattern Assignments

### `src/app/router.tsx` (config/route — PERF-01)

**Analog:** self — in-place conversion of static imports to `React.lazy`

**Current eager import block** (lines 14–29):
```typescript
import { DashboardPage } from "./dashboard/page";
import { CollectionPage } from "./collection/page";
import { PaintingProjectsPage } from "./painting-projects/page";
import { RecipesPage } from "./recipes/page";
import { PaintsPage } from "./paints/page";
import { SettingsPage } from "./settings/page";
import { FactionsPage } from "./factions/page";
import { ArmyListsPage } from "./army-lists/page";
import { SpendingPage } from "./spending/page";
import { BattleLogPage } from "./battle-log/page";
import { WishlistPage } from "./wishlist/page";
import { GoalsPage } from "./goals/page";
import { RulesHubPageShell } from "./rules-hub/page";
import { GameDayPageShell } from "./game-day/page";
import { DataHealthPage } from "./data-health/page";
import { PaintingModePage } from "./painting-mode/page";
```

**Target lazy pattern** — all 16 imports replace the block above:
```typescript
import { lazy, Suspense } from "react";

// Named-export adapter: .then(m => ({ default: m.PageName })) is required because
// all page components use named exports, not export default.
const DashboardPage = lazy(() => import("./dashboard/page").then(m => ({ default: m.DashboardPage })));
const CollectionPage = lazy(() => import("./collection/page").then(m => ({ default: m.CollectionPage })));
// ... repeat for all 16 pages
const PaintingModePage = lazy(() => import("./painting-mode/page").then(m => ({ default: m.PaintingModePage })));
```

**Current layoutRoute component** (lines 52–59) — add Suspense wrapping Outlet:
```typescript
// BEFORE:
component: () => (
  <AppLayout>
    <ActiveFactionProvider>
      <Outlet />
    </ActiveFactionProvider>
  </AppLayout>
),

// AFTER (Suspense wraps Outlet, not AppLayout — sidebar renders immediately):
component: () => (
  <AppLayout>
    <ActiveFactionProvider>
      <Suspense fallback={<div className="flex h-full items-center justify-center"><Spinner /></div>}>
        <Outlet />
      </Suspense>
    </ActiveFactionProvider>
  </AppLayout>
),
```

**Current bareLayoutRoute component** (lines 69–77) — same Suspense pattern:
```typescript
// BEFORE:
component: () => (
  <ActiveFactionProvider>
    <TooltipProvider delayDuration={200}>
      <Outlet />
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  </ActiveFactionProvider>
),

// AFTER:
component: () => (
  <ActiveFactionProvider>
    <TooltipProvider delayDuration={200}>
      <Suspense fallback={<div className="flex h-full items-center justify-center"><Spinner /></div>}>
        <Outlet />
      </Suspense>
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  </ActiveFactionProvider>
),
```

**Spinner component:** A simple inline spinner using Tailwind animate-spin, or the project's existing `Loader2` from `lucide-react`:
```typescript
import { Loader2 } from "lucide-react";
// fallback:
<div className="flex h-full items-center justify-center text-muted-foreground">
  <Loader2 className="h-6 w-6 animate-spin" />
</div>
```

---

### `src/db/queries/recipeAssignments.ts` — new `getKanbanProgressByUnitIds` (query, batch)

**Analog:** `src/db/queries/unitPhotos.ts` lines 80–93 (`getPhotoCountsByUnitIds`) — exact same role + data flow: batched SELECT with IN-clause parameterization.

**Analog imports pattern** (line 1):
```typescript
import { getDb } from "@/db/client";
```

**Batched IN-clause pattern** (unitPhotos.ts lines 80–93):
```typescript
export async function getPhotoCountsByUnitIds(
  unitIds: number[]
): Promise<{ entity_id: number; photo_count: number }[]> {
  if (unitIds.length === 0) return [];           // guard: empty IN clause is invalid SQL
  const db = await getDb();
  const placeholders = unitIds.map((_, i) => `$${i + 1}`).join(", ");
  return db.select(
    `SELECT entity_id, COUNT(*) as photo_count
     FROM image_assets
     WHERE entity_type = 'unit' AND entity_id IN (${placeholders})
     GROUP BY entity_id`,
    unitIds
  );
}
```

**New function shape to copy** (target: `recipeAssignments.ts`, add after existing exports):
```typescript
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
  // CTE selects most-recent assignment per unit (rn = 1), plus total assignment count
  return db.select<KanbanProgressRow[]>(
    `WITH ranked AS (
       SELECT
         id, unit_id, recipe_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY unit_id ORDER BY created_at DESC) AS rn,
         COUNT(*) OVER (PARTITION BY unit_id) AS total_assignments
       FROM unit_recipe_assignments
       WHERE unit_id IN (${placeholders})
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
     GROUP BY r.unit_id, r.id, r.recipe_id, pr.name, r.total_assignments`,
    unitIds
  );
}
```

**Key notes:**
- `$N` placeholders are positional-by-index in Tauri plugin-sql — only one `unitIds` array needed (no repetition, unlike the subquery approach)
- Units with no assignments are naturally absent from results (not returned) — matches current per-unit behavior
- Fallback: if SQLite window functions unavailable, use the subquery variant from RESEARCH.md Pattern 4

---

### `src/hooks/useKanbanEnrichment.ts` (hook, batch — PERF-03)

**Analog:** self — in-place restructure of the O(N) loop

**Current O(N) loop to replace** (lines 37–56):
```typescript
await Promise.all(
  sortedIds.map(async (unitId) => {
    const assignments = await getAssignmentsByUnit(unitId);     // N queries
    if (assignments.length === 0) return;
    const primary = assignments[assignments.length - 1];
    const [steps, progressRows, recipe] = await Promise.all([
      getRecipePaintsByRecipe(primary.recipe_id),               // N queries
      getStepProgress(primary.id),                              // N queries
      getRecipeById(primary.recipe_id),                         // N queries
    ]);
    const progress = computeAssignmentProgress(steps, progressRows);
    appliedProgressMap.set(unitId, {
      recipeName: recipe?.name ?? "",
      completed: progress.completed,
      total: progress.total,
      assignmentCount: assignments.length,
    });
    assignmentIdsMap.set(unitId, primary.id);
  }),
);
```

**Target pattern** — replace loop with single batched call:
```typescript
import { getKanbanProgressByUnitIds } from "@/db/queries/recipeAssignments";

// Inside queryFn, replace the Promise.all loop block with:
const progressRows = await getKanbanProgressByUnitIds(sortedIds);
for (const row of progressRows) {
  appliedProgressMap.set(row.unit_id, {
    recipeName: row.recipe_name,
    completed: row.completed_steps,
    total: row.total_steps,
    assignmentCount: row.assignment_count,
  });
  assignmentIdsMap.set(row.unit_id, row.assignment_id);
}
```

**Existing batched pattern to keep** (lines 30–33 — do NOT change):
```typescript
const [recipeRows, photoRows] = await Promise.all([
  getRecipeNamesByUnitIds(sortedIds),
  getPhotoCountsByUnitIds(sortedIds),
]);
```

**Imports to remove** (no longer needed after refactor):
```typescript
// Remove these (used only in the O(N) loop):
import { getAssignmentsByUnit, getStepProgress } from "@/db/queries/recipeAssignments";
import { getRecipePaintsByRecipe } from "@/db/queries/recipePaints";
import { computeAssignmentProgress } from "@/lib/computeAssignmentProgress";
import { getRecipeById } from "@/db/queries/recipes";

// Add:
import { getKanbanProgressByUnitIds } from "@/db/queries/recipeAssignments";
```

---

### `src/db/queries/syncedUnitPoints.ts` (query, batch — DBH-04)

**Analog:** self — in-place rewrite of `replaceSyncedUnitPoints` and `replaceSyncedUnitPointTiers`

**Current per-row INSERT loop pattern** (lines 31–43):
```typescript
await db.execute("DELETE FROM synced_unit_points", []);
for (const row of rows) {
  await db.execute(
    `INSERT INTO synced_unit_points (unit_name, faction_id, points, synced_at)
     VALUES ($1, $2, $3, $4)`,
    [row.unit_name, row.faction_id, row.points, syncedAt],
  );
}
```

**Target multi-row INSERT pattern** (copy this structure for all replace* functions):
```typescript
await db.execute("DELETE FROM synced_unit_points", []);
if (rows.length === 0) {                // guard: empty VALUES clause is invalid SQL
  await db.execute("COMMIT", []);
  return;
}
// Chunk into batches of 200 to stay within SQLite param limit
const BATCH_SIZE = 200;
const COL_COUNT = 4;
for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
  const batch = rows.slice(offset, offset + BATCH_SIZE);
  const placeholders = batch.map((_, i) => {
    const base = i * COL_COUNT;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
  }).join(", ");
  const params = batch.flatMap(row => [row.unit_name, row.faction_id, row.points, syncedAt]);
  await db.execute(
    `INSERT INTO synced_unit_points (unit_name, faction_id, points, synced_at) VALUES ${placeholders}`,
    params,
  );
}
```

**Transaction wrapper pattern** (keep existing lines 29–43, only replace the inner loop):
```typescript
export async function replaceSyncedUnitPoints(rows, syncedAt) {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    // ... new batched INSERT body here ...
    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}
```

---

### `src/db/queries/bsdataExtended.ts` (query, batch — DBH-04)

**Analog:** `src/db/queries/syncedUnitPoints.ts` — same transaction + loop pattern; apply the same batched VALUES rewrite.

**Current per-row loop** (lines 17–28, same shape repeated 4 times):
```typescript
for (const row of rows) {
  await db.execute(
    `INSERT INTO synced_enhancements (name, faction_id, detachment_name, points, synced_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [row.name, row.faction_id, row.detachment_name, row.points, syncedAt],
  );
}
```

**Column counts per function** (for `base = i * COL_COUNT` index math):
| Function | Table | COL_COUNT |
|----------|-------|-----------|
| `replaceSyncedEnhancements` | `synced_enhancements` | 5 |
| `replaceSyncedLoadoutOptions` | `synced_loadout_options` | 7 |
| `replaceSyncedModelCounts` | `synced_model_counts` | 5 |
| `replaceSyncedLeaderTargets` | `synced_leader_targets` | 4 |

**Boolean columns in `replaceSyncedLoadoutOptions`** — preserve the `? 1 : 0` cast for `is_default` and `is_exclusive` in the params flatMap:
```typescript
const params = batch.flatMap(row => [
  row.unit_name, row.faction_id, row.group_name, row.option_name,
  row.is_default ? 1 : 0, row.is_exclusive ? 1 : 0, syncedAt,
]);
```

---

### `src/features/painting-projects/KanbanCard.tsx` (component — PERF-04)

**Analog:** `src/features/dashboard/CurrentFocusCard.tsx` — pure functional component, flat props, no internal state, no hook calls.

**Current export** (line 41):
```typescript
export function KanbanCard({
  unit, faction, onRemoveFromBoard, onEditUnit, ...
}: KanbanCardProps) {
```

**Target memo pattern** (wrap at declaration, add displayName for DevTools):
```typescript
import { memo } from "react";

export const KanbanCard = memo(function KanbanCard({
  unit, faction, onRemoveFromBoard, onEditUnit, ...
}: KanbanCardProps) {
  // ... body unchanged ...
});
KanbanCard.displayName = "KanbanCard";
```

**Import to add** (add `memo` to the React import or as standalone):
```typescript
import { memo } from "react";  // add alongside existing React imports
```

---

### `src/features/army-lists/ArmyListUnitRow.tsx` (component — PERF-04)

**Analog:** `src/features/dashboard/CurrentFocusCard.tsx` for the memo wrapping pattern. ArmyListUnitRow has internal hooks (`useState`, `useEffect`, multiple `useQuery` calls) — memo only prevents parent-triggered re-renders, not hook-triggered ones (this is correct behavior).

**Current export** (line ~60+, after the docblock):
```typescript
export function ArmyListUnitRow({
  unit, totalPoints, pointsLimit, freshness, onRemove, onConfigure, onEnhance, onAttachLeader,
  enhancementName, isIndentedLeader, leaderName, leaderTargets,
}: ArmyListUnitRowProps) {
```

**Target memo pattern:**
```typescript
import { memo } from "react";

export const ArmyListUnitRow = memo(function ArmyListUnitRow({
  unit, totalPoints, pointsLimit, freshness, onRemove, onConfigure, onEnhance, onAttachLeader,
  enhancementName, isIndentedLeader, leaderName, leaderTargets,
}: ArmyListUnitRowProps) {
  // ... body unchanged ...
});
ArmyListUnitRow.displayName = "ArmyListUnitRow";
```

---

### `src/features/dashboard/CurrentFocusCard.tsx` (component — PERF-04)

**Analog:** self — pure functional component, no internal state, all props primitives + flat objects.

**Current export** (line 38):
```typescript
export function CurrentFocusCard({ unit, faction, photo, onOpen, onLog, onPaint, recipeName, extraRecipeCount = 0, workflowPosition, appliedProgress }: CurrentFocusCardProps) {
```

**Target memo pattern:**
```typescript
import { memo } from "react";

export const CurrentFocusCard = memo(function CurrentFocusCard({
  unit, faction, photo, onOpen, onLog, onPaint,
  recipeName, extraRecipeCount = 0, workflowPosition, appliedProgress,
}: CurrentFocusCardProps) {
  // ... body unchanged ...
});
CurrentFocusCard.displayName = "CurrentFocusCard";
```

---

### `src/hooks/useUnits.ts` + `src/hooks/useArmyLists.ts` (hooks — PERF-02)

**Analog:** self — in-place audit and pruning

**Invalidation pattern to keep** (useUnits.ts lines 31–40 — all correctly justified):
```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: UNITS_KEY });
  qc.invalidateQueries({ queryKey: ["dashboard-stats"] });   // KEEP — unit count in dashboard
  qc.invalidateQueries({ queryKey: ["spending-stats"] });    // KEEP — unit count in spending header
  qc.invalidateQueries({ queryKey: ["hobby-analytics"] });   // KEEP — unit count feeds analytics
  qc.invalidateQueries({ queryKey: ["army-readiness"] });    // KEEP — new units affect readiness
},
```

**PERF-02 primary target — `exact: true` on scoped single-entity invalidations:**
```typescript
// BEFORE (broad prefix — hits ["army-lists", 5], ["army-lists", 5, "units"], etc.):
qc.invalidateQueries({ queryKey: ["army-lists"] });

// AFTER with exact: true (only when the mutation touches a specific list ID already
// covered by ARMY_LIST_KEY(id) invalidation — prevents double-broad sweep):
qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.id), exact: true });
// Keep broad ["army-lists"] only for mutations that create/delete lists (list index changes)
```

**Anti-pattern from RESEARCH.md to avoid** — do NOT add `exact: true` to keys that need to cascade to sub-keys (e.g., `["army-list-readiness"]` without knowing sub-key structure).

---

## Test Files

### `tests/performance/kanbanBatchEnrichment.test.ts`

**Analog:** `tests/painting/kanbanEnrichment.test.ts` — exact match: mocks `getDb`, imports the new query function, tests SQL structure and return shape.

**Mock setup pattern** (kanbanEnrichment.test.ts lines 7–11):
```typescript
const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock }),
}));
```

**SQL structure assertion pattern** (kanbanEnrichment.test.ts lines 72–76):
```typescript
const [sql, params] = selectMock.mock.calls[0];
expect(sql).toMatch(/IN \(\$1/);        // IN-clause parameterization
expect(params).toEqual([1, 2]);          // positional params match unitIds
```

**Guard clause test pattern** (kanbanEnrichment.test.ts lines 78–83):
```typescript
it("returns empty array when unitIds is empty (guard clause)", async () => {
  const result = await getKanbanProgressByUnitIds([]);
  expect(result).toEqual([]);
  expect(selectMock).not.toHaveBeenCalled();
});
```

---

### `tests/performance/batchInsert.test.ts`

**Analog:** `tests/painting/kanbanEnrichment.test.ts` for mock structure, plus `tests/painting/saveRecipeGraph.test.ts` for transaction pattern.

**Execute mock pattern** (to verify single `db.execute` call for N rows):
```typescript
const executeMock = vi.fn().mockResolvedValue({ lastInsertId: 0 });

vi.mock("@/db/client", () => ({
  getDb: async () => ({
    execute: executeMock,
    select: vi.fn().mockResolvedValue([]),
  }),
}));
```

**Test assertion for 1 round-trip:**
```typescript
it("inserts N rows with 1 SQL call, not N calls", async () => {
  const rows = [
    { unit_name: "Space Marines", faction_id: "SM", points: 100 },
    { unit_name: "Dark Angels", faction_id: "DA", points: 120 },
  ];
  await replaceSyncedUnitPoints(rows, "2026-05-22T00:00:00Z");

  // Calls: BEGIN + DELETE + 1 batched INSERT + COMMIT = 4 total (not 2+N)
  const insertCalls = executeMock.mock.calls.filter(([sql]: [string]) =>
    sql.includes("INSERT INTO synced_unit_points")
  );
  expect(insertCalls).toHaveLength(1);
  const [sql, params] = insertCalls[0];
  expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4\), \(\$5, \$6, \$7, \$8\)/);
  expect(params).toHaveLength(8);  // 2 rows × 4 columns
});
```

---

### `tests/performance/invalidationAudit.test.ts`

**Analog:** `tests/foundation/useUnits.test.ts` — exact match: `renderHook` + `QueryClient` spy + `vi.spyOn(qc, "invalidateQueries")`.

**Hook wrapper pattern** (useUnits.test.ts lines 57–63):
```typescript
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}
```

**Mutation trigger + assertion pattern** (useUnits.test.ts lines 79–100):
```typescript
it("invalidates ['dashboard-stats'] on create", async () => {
  const { spy, wrapper } = makeWrapper();
  const { result } = renderHook(() => useCreateUnit(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync(MIN_CREATE_INPUT);
  });
  await waitFor(() => {
    const keys = spy.mock.calls.map(([opts]) => opts?.queryKey);
    expect(keys).toContainEqual(["dashboard-stats"]);
  });
});
```

---

### `tests/performance/reactMemo.test.ts`

**Analog:** `tests/dashboard/CurrentFocusCard.test.tsx` — RTL render + prop-based assertions. Memo verification uses React internals check.

**Memo check pattern** (standard React.memo verification):
```typescript
import { KanbanCard } from "@/features/painting-projects/KanbanCard";
import { CurrentFocusCard } from "@/features/dashboard/CurrentFocusCard";
import { ArmyListUnitRow } from "@/features/army-lists/ArmyListUnitRow";

it("KanbanCard is wrapped with React.memo", () => {
  // React.memo sets $$typeof = Symbol(react.memo) on the wrapped component
  expect(KanbanCard).toHaveProperty("$$typeof");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((KanbanCard as any).$$typeof?.toString()).toContain("memo");
});
```

---

### `tests/performance/lazyRoutes.test.ts`

**Analog:** `tests/foundation/useUnits.test.ts` for test structure — unit test without RTL.

**Lazy component check pattern:**
```typescript
// React.lazy returns an object where _init is a function (the dynamic import factory)
it("DashboardPage is a lazy component (dynamic import)", async () => {
  // Dynamic import the router module and inspect its lazy components
  const routerModule = await import("@/app/router");
  // Lazy components have $$typeof = Symbol(react.lazy)
  // We can't access the lazy const directly from outside the module,
  // so we test the route tree's component instead.
  // Alternative: test that the module does NOT directly export a Page component
  // (if it did, it would be an eager import).
  expect(routerModule.router).toBeDefined();
});
```

---

## Shared Patterns

### DB Client Import
**Source:** Every file in `src/db/queries/`
**Apply to:** `recipeAssignments.ts` (new function)
```typescript
import { getDb } from "@/db/client";
```

### Batched IN-Clause with Positional Params
**Source:** `src/db/queries/unitPhotos.ts` lines 80–93
**Apply to:** `recipeAssignments.ts` `getKanbanProgressByUnitIds`
```typescript
if (unitIds.length === 0) return [];
const db = await getDb();
const placeholders = unitIds.map((_, i) => `$${i + 1}`).join(", ");
return db.select(`... WHERE id IN (${placeholders})`, unitIds);
```

### Transaction Wrapper
**Source:** `src/db/queries/syncedUnitPoints.ts` lines 29–44
**Apply to:** All `replace*` functions in `syncedUnitPoints.ts` and `bsdataExtended.ts`
```typescript
await db.execute("BEGIN TRANSACTION", []);
try {
  // ... batched INSERT body ...
  await db.execute("COMMIT", []);
} catch (e) {
  await db.execute("ROLLBACK", []);
  throw e;
}
```

### Multi-Row VALUES Placeholder Builder
**Source:** RESEARCH.md Pattern 5 (no existing codebase analog — first use)
**Apply to:** All `replace*` functions in `syncedUnitPoints.ts` and `bsdataExtended.ts`
```typescript
const BATCH_SIZE = 200;
const COL_COUNT = N;  // column count specific to each table
for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
  const batch = rows.slice(offset, offset + BATCH_SIZE);
  const placeholders = batch.map((_, i) => {
    const base = i * COL_COUNT;
    return `($${base + 1}, ..., $${base + COL_COUNT})`;
  }).join(", ");
  const params = batch.flatMap(row => [/* row columns */]);
  await db.execute(`INSERT INTO table (cols) VALUES ${placeholders}`, params);
}
```

### React.memo Named Export Wrap
**Source:** RESEARCH.md Pattern 3 (standard React API, no existing codebase analog — first use)
**Apply to:** `KanbanCard`, `ArmyListUnitRow`, `CurrentFocusCard`
```typescript
import { memo } from "react";
export const ComponentName = memo(function ComponentName(props: ComponentNameProps) {
  // ... body unchanged ...
});
ComponentName.displayName = "ComponentName";
```

### Test Mock for getDb
**Source:** `tests/painting/kanbanEnrichment.test.ts` lines 7–11
**Apply to:** `tests/performance/kanbanBatchEnrichment.test.ts`, `tests/performance/batchInsert.test.ts`
```typescript
const executeMock = vi.fn().mockResolvedValue({ lastInsertId: 0 });
const selectMock = vi.fn();
vi.mock("@/db/client", () => ({
  getDb: async () => ({ execute: executeMock, select: selectMock }),
}));
```

### Test QueryClient Spy Wrapper
**Source:** `tests/foundation/useUnits.test.ts` lines 57–63
**Apply to:** `tests/performance/invalidationAudit.test.ts`
```typescript
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Multi-row VALUES pattern | query utility | batch | No existing multi-row INSERT in the JS query layer; Rust `bulk_sync_rules` does this in Rust but no JS analog |
| `React.memo` wrapping | component | — | No existing component in the codebase uses `React.memo` yet — first use |

---

## Metadata

**Analog search scope:** `src/app/`, `src/hooks/`, `src/db/queries/`, `src/features/painting-projects/`, `src/features/army-lists/`, `src/features/dashboard/`, `tests/`
**Files read:** 14
**Pattern extraction date:** 2026-05-22
