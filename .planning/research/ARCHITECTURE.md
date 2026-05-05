# Architecture Research

**Domain:** HobbyForge v2.4 — Premium Dashboard UX & Visual Polish
**Researched:** 2026-05-05
**Confidence:** HIGH — based on direct codebase inspection of all dashboard, hook, query, and type files

---

## Standard Architecture

The four-layer data flow is established and non-negotiable. All new features plug in:

```
Components (src/features/**) → hooks (useQuery/useMutation) → db/queries/*.ts → SQLite via tauri-plugin-sql
Ephemeral UI state → Zustand stores
Cache invalidation → queryClient.invalidateQueries on mutation onSuccess
```

v2.4 is purely additive within the dashboard feature folder. No new routes, no new pages, no schema migrations. All new SQL queries use existing tables.

---

## System Overview (v2.4 dashboard target)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DashboardPage (MODIFY — CSS grid layout)                 │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                   CSS Grid — 2-column asymmetric                      │    │
│  │                                                                        │    │
│  │  ┌──────────────────────────────┐  ┌──────────────────────────────┐  │    │
│  │  │    CurrentFocusCard v2        │  │      ArmyReadinessCard        │  │    │
│  │  │  photo · actions · metadata   │  │  target selector + per-list  │  │    │
│  │  └──────────────────────────────┘  └──────────────────────────────┘  │    │
│  │                                                                        │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │    │
│  │  │             ActiveProjectsPanel (3–5 project cards)              │  │    │
│  │  │     photo · progress bar · recipe badge · Log Session button     │  │    │
│  │  └─────────────────────────────────────────────────────────────────┘  │    │
│  │                                                                        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │    │
│  │  │ StatCard │ │ StatCard │ │ StatCard │ │ StatCard │ (all clickable) │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                 │    │
│  │                                                                        │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │    │
│  │  │              HobbyPipeline (5 grouped buckets)                   │  │    │
│  │  └─────────────────────────────────────────────────────────────────┘  │    │
│  │                                                                        │    │
│  │  ┌──────────────────────────┐  ┌──────────────────────────────────┐   │    │
│  │  │    FactionCards v2        │  │      RecentActivityFeed          │   │    │
│  │  │  larger · spending line   │  │  photo thumbnail on sessions     │   │    │
│  │  └──────────────────────────┘  └──────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ── Sibling portals (NEVER nested): ──────────────────────────────────────   │
│  LogSessionSheet v2 · UnitDetailSheet · UnitSheet · UnitDeleteDialog          │
└───────────────────────────────────────────────────────────────────────────────┘
         │                    │                    │                    │
         ↓                    ↓                    ↓                    ↓
  useDashboard         useArmyLists +        useLatestUnit        useKanban
  Stats (exists)       useArmyList           Photos (exists)      Enrichment
                        Readiness (exists)                         (exists)
         │                    │                    │                    │
         ↓                    ↓                    ↓                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                         src/db/queries/ (existing)                            │
│  dashboard.ts · armyLists.ts · unitPhotos.ts · spending.ts · recipes.ts      │
└──────────────────────────────────────────────────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│              src/db/client.ts → Tauri plugin-sql → SQLite hobbyforge.db       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Classification: New vs Modified

| Feature | Schema | Query | Hook | Component |
|---------|--------|-------|------|-----------|
| CSS grid layout + radial gradients | None | None | None | MODIFY `DashboardPage` + `globals.css` |
| CurrentFocusCard v2 | None | None | NEW call to `useLatestUnitPhotos` in Page | MODIFY `CurrentFocusCard` |
| ActiveProjectsPanel | None | None | NEW calls to `useLatestUnitPhotos`, `useKanbanEnrichment` in Page | NEW `ActiveProjectsPanel` |
| ArmyReadinessCard with target selector | None | None | NEW calls to `useArmyLists`, `useArmyListReadiness` in Page | NEW `ArmyReadinessCard` |
| Clickable StatCards | None | None | None | MODIFY `StatCard` — add `to?` prop |
| HobbyPipeline 5-bucket grouping | None | None | None | MODIFY `HobbyPipeline` + NEW pure function |
| FactionCards v2 | None | None | NEW call to `useSpendingStats` in Page | MODIFY `FactionSummaryCard` |
| Photos everywhere | None | None | NEW call to `useLatestUnitPhotos` in Page | MODIFY `RecentActivityFeed` |
| Log Session progress updates | None | None | None (uses existing `useUpdateUnit`) | MODIFY `LogSessionSheet` + `logSessionSchema` |
| Recipe ↔ faction/unit integration | None | NEW `getRecipeNamesByFactionIds` in recipes.ts | None | MODIFY `FactionSummaryCard` |
| Spending intelligence | None | None | None (extends `computeSpendingStats`) | MODIFY `computeSpendingStats`, `SpendingPage` display |

**Key finding:** Zero schema migrations. Zero new hooks. Only two new query functions. All work is in components and pure compute functions.

---

## New Components

### `ActiveProjectsPanel`

**File:** `src/features/dashboard/ActiveProjectsPanel.tsx`

**Props:**
```typescript
interface ActiveProjectsPanelProps {
  units: Unit[];                               // stats.activeProjects (already sorted, capped at 5)
  latestPhotos: Map<number, UnitPhotoWithUrl>; // from useLatestUnitPhotos
  recipeNames: Map<number, string>;            // from useKanbanEnrichment
  onLogSession: (unitId: number) => void;      // opens LogSessionSheet pre-filled
  onUnitClick: (unitId: number) => void;       // opens UnitDetailSheet
}
```

**Behavior:** Renders 3–5 project cards. Each card: faction-accent left border, photo thumbnail (asset:// URL from `latestPhotos.get(unit.id)`), unit name, `StatusBadge`, painting progress bar, recipe badge if `recipeNames.has(unit.id)`, "Log Session" button that calls `onLogSession(unit.id)`. Empty state: muted card with "Mark projects active in Projects to see them here."

**Data note:** Uses existing `stats.activeProjects` from `computeStats` (already sorted DESC by `updated_at`, already capped at 5). No new data fetching inside this component.

### `ArmyReadinessCard`

**File:** `src/features/dashboard/ArmyReadinessCard.tsx`

**Props:**
```typescript
interface ArmyReadinessCardProps {
  armyLists: ArmyList[];
  readiness: Map<number, { total: number; battleReady: number }>;
}
```

**Internal state:** `selectedTarget: 500 | 1000 | 1500 | 2000` — `useState(1000)`. Ephemeral. No persistence.

**Behavior:** Four target buttons (500/1000/1500/2000). For each army list: list name, progress bar showing `Math.min(readiness.get(id)?.battleReady ?? 0, selectedTarget) / selectedTarget * 100`%, fraction label "X / Y pts". Empty state when no lists.

---

## Modified Components

### `DashboardPage` — new hook calls + CSS grid

Currently calls: `useDashboardStats`, `useHobbyAnalytics`, `useRecentActivity`.

Additions required:
```typescript
// 4 new hook calls — all parallel (React Query deduplicates)
const { data: latestPhotos } = useLatestUnitPhotos();

const activeProjectIds = useMemo(
  () => (stats?.activeProjects ?? []).map((u) => u.id),
  [stats?.activeProjects]
);
const { data: enrichment } = useKanbanEnrichment(activeProjectIds);

const { data: armyLists } = useArmyLists();
const allListIds = useMemo(
  () => (armyLists ?? []).map((l) => l.id),
  [armyLists]
);
const { data: readiness } = useArmyListReadiness(allListIds);

const { data: spendingStats } = useSpendingStats();  // for FactionCards v2 spending lines
```

**CSS grid:** Replace the outermost `flex flex-col gap-12` with a CSS grid. The asymmetric 2-column layout is applied at the section level, not on every card. The existing `p-6` padding on the outer div is preserved.

**New state:**
```typescript
const [logSessionDefaultUnit, setLogSessionDefaultUnit] = useState<number | undefined>(undefined);
```

When `ActiveProjectsPanel` calls `onLogSession(unitId)`, set `logSessionDefaultUnit` and open `logSessionOpen`. The `LogSessionSheet` already accepts a `defaultUnitId` prop.

**Sibling portal additions:** No new Sheet components added at the DashboardPage level — `LogSessionSheet` (already a sibling) now receives `defaultUnitId={logSessionDefaultUnit}`.

### `CurrentFocusCard` — photo + actions + metadata

**Extended props:**
```typescript
export interface CurrentFocusCardProps {
  unit: Unit | null;
  faction: Faction | undefined;
  photo?: UnitPhotoWithUrl;     // NEW — from latestPhotos.get(focusUnit.id)
  onLogSession?: () => void;    // NEW — triggers DashboardPage's logSession handler
}
```

**Render changes:** Add photo thumbnail (`<img src={photo.assetUrl}>`) left of the text content when `photo` is defined. Add model count (`unit.model_count` + "models") and points (`unit.points` + "pts") below the faction/status line. Add "Log Session" action button that calls `onLogSession()`.

### `StatCard` — clickable navigation

**Extended props:**
```typescript
export interface StatCardProps {
  // existing: value, label, animate, icon, trend, progress
  to?: string;  // NEW — TanStack Router route string e.g. "/collection"
}
```

**Behavior:** When `to` is provided, wrap the card with a `role="button"` + `useNavigate()` call. Maintain keyboard accessibility (`onKeyDown Enter/Space`). The underlying `Card` component handles the visual — add `cursor-pointer hover:bg-muted/50` conditional classes.

### `HobbyPipeline` — 5-bucket grouping

**New pure function (TDD wave):**
```typescript
// src/features/dashboard/groupPipelineBuckets.ts
export interface PipelineBucket {
  label: string;
  stages: PaintingStatus[];
  count: number;
  tier: "not-started" | "prep" | "painting" | "finishing" | "done";
}

export function groupPipelineBuckets(units: Unit[]): PipelineBucket[] {
  return [
    { label: "Not Started", stages: ["Not Started"], tier: "not-started" },
    { label: "Prep",        stages: ["Built", "Primed"], tier: "prep" },
    { label: "Painting",    stages: ["Basecoated", "Shaded", "Layered", "Highlighted", "Details Done"], tier: "painting" },
    { label: "Finishing",   stages: ["Based", "Varnished"], tier: "finishing" },
    { label: "Done",        stages: ["Completed"], tier: "done" },
  ].map((b) => ({
    ...b,
    count: units.filter((u) => (b.stages as readonly string[]).includes(u.status_painting)).length,
  }));
}
```

`HobbyPipeline.tsx` calls this function and renders 5 bucket columns instead of 11 stage columns. The tier-to-bubble-color map is simplified from 4 tiers (existing `TIER_BUBBLE_CLASS`) to 5.

### `LogSessionSheet` — status + progress update fields

**Extended schema (`logSessionSchema.ts`):**
```typescript
export const logSessionSchema = z.object({
  unit_id: z.number().int().positive(),
  session_date: z.string(),
  duration_minutes: z.number().int().min(1).max(1440),
  notes: z.string().nullable(),
  // NEW optional fields for progress update:
  status_painting: z.enum(PAINTING_STATUS_ORDER).nullable().optional(),
  painting_percentage: z.number().int().min(0).max(100).nullable().optional(),
});
```

**Extended submit logic:**
```typescript
async function onSubmit(values: LogSessionFormValues) {
  // Step 1: update unit status/progress if changed
  if (values.status_painting || values.painting_percentage !== null) {
    await updateUnit.mutateAsync({
      id: values.unit_id,
      ...(values.status_painting ? { status_painting: values.status_painting } : {}),
      ...(values.painting_percentage !== null ? { painting_percentage: values.painting_percentage } : {}),
    });
    // useUpdateUnit.onSuccess already invalidates ["dashboard-stats"] — no extra wiring
  }
  // Step 2: log the session (existing)
  await createSession.mutateAsync({ ... });
}
```

**UI additions:** Collapsible "Update Progress" section below the notes field. Status picker (optional `<Select>`) and percentage input (optional `<Input type="number">`). Both fields default to empty (not pre-populated with current unit state) so they are opt-in.

### `FactionSummaryCard` — larger layout + spending line

**Extended props:**
```typescript
export interface FactionSummaryCardProps {
  stat: FactionStat;
  isActive?: boolean;
  onActivate?: () => void;
  spendPence?: number;          // NEW — faction's total unit spend from spending stats
  recipeCount?: number;         // NEW — count of recipes linked to this faction
}
```

The spending line renders below the battle-ready points: `£X.XX spent` using existing `formatCurrency` (or raw `pence / 100` — the single site rule). Visual size increase: widen from `min-w-[180px]` to `min-w-[220px]`, increase font sizes for primary stats.

### `RecentActivityFeed` — photo thumbnails for session rows

**Extended event type:** `session_logged` rows gain an optional `unitId` (already present in `ActivityEvent`) which is used to look up `latestPhotos.get(event.unitId)`. If a photo exists, render a 32×32 thumbnail before the icon.

**Props extension:**
```typescript
export interface RecentActivityFeedProps {
  events: ActivityEvent[];
  onUnitClick?: (unitId: number) => void;
  latestPhotos?: Map<number, UnitPhotoWithUrl>;  // NEW
}
```

### `computeSpendingStats` — spending intelligence fields

**Extended `SpendingStats` interface:**
```typescript
export interface SpendingStats {
  totalPence: number;
  factionBreakdown: FactionSpend[];
  paintsPence: number;
  // NEW:
  costPerCompletedModelPence: number | null;  // null when fullyPainted === 0
  paintedValuePence: number;                  // sum(purchase_price_pence) for Completed units
  unpaintedValuePence: number;                // sum for non-Completed units
}
```

All three new fields derive from the existing `units` array passed to `computeSpendingStats`. Zero new SQL.

---

## Data Flow Changes

### 1. DashboardPage parallel data fetch (v2.4)

```
DashboardPage mounts
      ↓ (all parallel — React Query cache-deduplicates)
useDashboardStats        useLatestUnitPhotos      useArmyLists         useSpendingStats
useHobbyAnalytics        useKanbanEnrichment      useArmyListReadiness
useRecentActivity        (enabled when ids > 0)   (enabled when ids > 0)
      ↓                          ↓                       ↓                    ↓
computeStats()           getLatestPhotoByUnit()   getArmyLists()       getSpendingStats()
                         + convertFileSrc per row  getArmyListReadiness()  computeSpendingStats()
      ↓                          ↓                       ↓                    ↓
stats object             Map<id, UnitPhotoWithUrl>  Map<id, readiness>   SpendingStats
      ↓──────────────────────────↓───────────────────────↓────────────────────↓
                              DashboardPage JSX props passed to children
```

### 2. Log Session → Unit Update flow (new for v2.4)

```
User opens LogSessionSheet (from header button OR ActiveProjectsPanel "Log Session" button)
      ↓
If opened via ActiveProjectsPanel:
  setLogSessionDefaultUnit(unitId) → LogSessionSheet pre-populates unit picker
      ↓
User fills: unit, date, duration, [optional: new status, new percentage], notes
      ↓ form submit
if (status or percentage set):
    useUpdateUnit.mutateAsync({ id: unit_id, status_painting, painting_percentage })
      → onSuccess invalidates: ["dashboard-stats"], ["spending-stats"]
then:
    useCreatePaintingSession.mutateAsync({ unit_id, session_date, duration_minutes, notes })
      → onSuccess invalidates: ["hobby-analytics"], ["recent-activity"]
      ↓
React Query refetches affected cache keys → all dashboard panels update in one render cycle
```

### 3. Recipe ↔ faction integration data flow

```
DashboardPage renders FactionSummaryCard for each faction stat
      ↓
Need: recipe count per faction
      ↓ (already in memory from useRecipes — no new fetch)
const recipesByFaction = useMemo(
  () => new Map(factions.map(f => [
    f.id,
    (recipes ?? []).filter(r => r.faction_id === f.id).length
  ])),
  [factions, recipes]
);
```

`DashboardPage` calls `useRecipes()` (already exists, `RECIPES_KEY = ["recipes"]`). The count is derived in JS — no new query. The `getRecipeNamesByFactionIds` query function is only needed if we display recipe names (not just counts) on faction cards. A count suffices for v2.4; the query function can be deferred.

---

## Build Order (phase-by-phase, considering data dependencies)

### Phase 1: Pure foundations (no data dependencies, enable parallelism)

1. `groupPipelineBuckets.ts` pure function + tests
2. Extensions to `computeSpendingStats.ts` (new fields) + tests
3. `globals.css` — add `--panel-gradient` custom property for radial depth effect

**Why first:** Pure functions and CSS tokens have zero runtime dependencies. Tests validate them before any component touches them. These unblock Phases 2–5.

### Phase 2: StatCard clickability + CSS grid layout

1. Extend `StatCard` with `to?` prop + `useNavigate`
2. Modify `DashboardPage` outer layout: CSS grid replacing `flex flex-col gap-12`
3. Update loading skeleton to match new grid
4. Wire `StatCard` route targets in `DashboardPage`

**Why second:** Layout and navigation are independent of data. Establishes the visual skeleton that the new panels will slot into.

### Phase 3: HobbyPipeline 5-bucket grouping

1. Modify `HobbyPipeline.tsx` to call `groupPipelineBuckets` (pure function from Phase 1)
2. Update tier-to-color map for 5 tiers
3. Update pipeline loading skeleton in `DashboardPage`

**Why third:** Self-contained within `HobbyPipeline` — no new hook wiring needed.

### Phase 4: CurrentFocusCard v2 (requires `useLatestUnitPhotos` wiring in DashboardPage)

1. Add `useLatestUnitPhotos()` call to `DashboardPage`
2. Extend `CurrentFocusCardProps` with `photo?` and `onLogSession?`
3. Extend `CurrentFocusCard` render: photo thumbnail, model count, points, action button
4. Pass `latestPhotos.get(focusUnit?.id)` from `DashboardPage`

**Why fourth:** The `useLatestUnitPhotos` call added here is reused by Phase 5 (`ActiveProjectsPanel`).

### Phase 5: ActiveProjectsPanel (requires Phase 4 wiring + `useKanbanEnrichment`)

1. Add `useKanbanEnrichment(activeProjectIds)` call to `DashboardPage`
2. Add `logSessionDefaultUnit` state + update `LogSessionSheet` open handler
3. Create `ActiveProjectsPanel.tsx`
4. Wire into CSS grid layout

**Why fifth:** Depends on `useLatestUnitPhotos` wired in Phase 4. `useKanbanEnrichment` is additive.

### Phase 6: ArmyReadinessCard (requires `useArmyLists` + `useArmyListReadiness` in DashboardPage)

1. Add `useArmyLists()` and `useArmyListReadiness(allListIds)` calls to `DashboardPage`
2. Create `ArmyReadinessCard.tsx` with local target selector state
3. Wire into CSS grid layout

**Why sixth:** Independent of Phases 4–5 but placed here to batch the DashboardPage hook additions logically. Could technically run in parallel with Phase 5.

### Phase 7: Log Session progress updates (requires `useUpdateUnit` in LogSessionSheet)

1. Extend `logSessionSchema.ts` with optional `status_painting` + `painting_percentage` fields
2. Extend `LogSessionSheet.tsx`: add collapsible progress update section, two-mutation submit
3. `useUpdateUnit` is already imported in `DashboardPage` scope via the unit edit flow — `LogSessionSheet` needs to call it directly, meaning it needs `useUpdateUnit` added to its imports

**Why seventh:** Depends on Phase 5 establishing the `defaultUnitId` flow (so Log Session from ActiveProjectsPanel pre-fills correctly).

### Phase 8: FactionCards v2 + spending intelligence display

1. Add `useSpendingStats()` call to `DashboardPage`
2. Add `useRecipes()` call to `DashboardPage` (recipe count per faction)
3. Derive `recipesByFaction` map in `DashboardPage`
4. Extend `FactionSummaryCardProps` with `spendPence?` + `recipeCount?`
5. Modify `FactionSummaryCard` layout: larger card, spending line, recipe count badge
6. Surface `costPerCompletedModelPence` on `SpendingPage` (extend existing display)

**Why last among core panels:** Depends on `computeSpendingStats` extension (Phase 1) and needs the most props changes. Placed after the structural layout work is stable.

### Phase 9: RecentActivityFeed photo thumbnails + visual depth pass

1. Extend `RecentActivityFeedProps` with `latestPhotos?` prop
2. Add photo thumbnail to `session_logged` event rows
3. Apply radial gradient depth to card backgrounds (use `--panel-gradient` token from Phase 1)
4. Final visual polish: elevated card surfaces, premium depth across all dashboard cards

**Why last:** Polish pass. Depends on all panels being in place so the visual hierarchy can be evaluated holistically.

---

## Integration Points

### Existing → Modified Component Boundaries

| Existing Component | New Prop/Call | Source |
|-------------------|---------------|--------|
| `DashboardPage` → `CurrentFocusCard` | `photo?: UnitPhotoWithUrl` | `latestPhotos.get(focusUnit.id)` |
| `DashboardPage` → `LogSessionSheet` | `defaultUnitId={logSessionDefaultUnit}` (already accepted) | New `logSessionDefaultUnit` state |
| `DashboardPage` → `RecentActivityFeed` | `latestPhotos` | `useLatestUnitPhotos` result |
| `DashboardPage` → `FactionSummaryCard` | `spendPence`, `recipeCount` | `spendingStats`, `useRecipes` |
| `DashboardPage` → `StatCard` | `to` route strings | TanStack Router paths |

### New Component Boundaries

| New Component | Parent | Props Received | Internal Hook Calls |
|--------------|--------|----------------|---------------------|
| `ActiveProjectsPanel` | `DashboardPage` | `units`, `latestPhotos`, `recipeNames`, `onLogSession`, `onUnitClick` | None — pure display |
| `ArmyReadinessCard` | `DashboardPage` | `armyLists`, `readiness` | `useState` for target only |

### Cache Invalidation Map (additions for v2.4)

All existing invalidation contracts are preserved. The only addition:

| Mutation | Addition to existing invalidations |
|----------|----------------------------------|
| `useUpdateUnit` (called from `LogSessionSheet v2`) | Already invalidates `["dashboard-stats"]` and `["spending-stats"]` — no new wiring |
| `useCreatePaintingSession` (called from `LogSessionSheet v2`) | Already invalidates `["hobby-analytics"]` and `["recent-activity"]` — no new wiring |

The two-mutation submit in `LogSessionSheet` reuses existing hooks with existing invalidation contracts. Zero new invalidation wiring is required for v2.4.

---

## Architectural Patterns

### Pattern 1: DashboardPage as Single Data Hub (mandatory — established)

All React Query hooks live in `DashboardPage`. Child components are pure display — they accept typed props, call no data hooks (only local UI state hooks like `useState`). This prevents waterfall fetches and centralizes the skeleton loading state.

**Applied to v2.4:** `ActiveProjectsPanel` and `ArmyReadinessCard` receive all their data as props. The `Map<>` types (photos, enrichment, readiness) are pre-derived in `DashboardPage` before being passed down.

### Pattern 2: Sibling Portal Contract (mandatory — established)

Every Sheet, Dialog, and Lightbox is a top-level sibling of the main content div, never nested inside child components. Adding `ActiveProjectsPanel` with a "Log Session" button does not mean putting a `<LogSessionSheet>` inside it — the button calls `onLogSession(unitId)` prop callback, `DashboardPage` sets state and the sibling sheet opens.

### Pattern 3: selectedUnitId ID Pattern (mandatory — established)

Store IDs in state, derive full objects from the React Query cache. `ActiveProjectsPanel` receives `onUnitClick(unitId: number)`, never `onUnitClick(unit: Unit)`. The `DashboardPage` derives `selectedUnit` from `stats.units` on render.

### Pattern 4: Pure Compute Functions + Tests Before UI (mandatory — established)

`groupPipelineBuckets` and the `computeSpendingStats` extensions are pure functions written and tested before any component touches them. This matches the `computeStats`, `computeRecentActivity`, `computeSpendingStats` pattern already in production.

### Pattern 5: 0|1 Boolean Discipline (mandatory — established)

No new boolean columns in v2.4. The existing `is_active_project === 1` checks in `computeStats` are already correct. No risk of regression here.

---

## Anti-Patterns

### Anti-Pattern 1: Hook calls inside `ActiveProjectsPanel` or `ArmyReadinessCard`

**What people do:** Call `useLatestUnitPhotos()` inside `ActiveProjectsPanel`.

**Why it's wrong:** Creates waterfall fetches (panel renders → fetches → renders again). Duplicates cache subscriptions. Makes the skeleton loading state in `DashboardPage` impossible to coordinate.

**Do this instead:** All hooks at the top of `DashboardPage`. Pass `Map<>` data as props.

### Anti-Pattern 2: Nesting Sheet inside `ActiveProjectsPanel`

**What people do:** Put `<LogSessionSheet>` inside `ActiveProjectsPanel` so each project card owns its sheet.

**Why it's wrong:** Violates the sibling portal contract. Radix portals nested inside feature components cause z-index and React context boundary issues (documented Pitfall 1 from Phase 26).

**Do this instead:** `onLogSession(unitId: number)` callback prop. `DashboardPage` owns the sheet.

### Anti-Pattern 3: Storing Unit objects in ActiveProjectsPanel state

**What people do:** `setFocusUnit(unit)` when a project card is clicked.

**Why it's wrong:** The `Unit` object becomes stale after mutations. Established pitfall from Phase 26.

**Do this instead:** `onUnitClick(unit.id)`. `DashboardPage` derives the unit from `stats.units`.

### Anti-Pattern 4: Two-mutation sequential await in onSubmit without error handling

**What people do:** `await updateUnit.mutateAsync(); await createSession.mutateAsync();` with a single try/catch.

**Why it's wrong:** If `updateUnit` fails, `createSession` does not run (correct). But if `updateUnit` succeeds and `createSession` fails, the unit is updated but the session is not logged, and the user sees a "Failed" toast without knowing their progress update was saved.

**Do this instead:** Show granular feedback. Wrap each mutateAsync in its own try/catch. If step 1 succeeds, show a brief intermediate success (optional). If step 2 fails, toast "Session not logged — but progress was saved." Sheet stays open for retry of step 2 only.

### Anti-Pattern 5: Merging spending fields into `useDashboardStats`

**What people do:** Add paint/spend queries to `getDashboardStats()` to avoid calling `useSpendingStats()` separately in `DashboardPage`.

**Why it's wrong:** `getDashboardStats` is intentionally minimal (units + factions only). Adding spend queries increases dashboard load latency for the case where the user is not focused on spending data. `useSpendingStats` has its own cache key `["spending-stats"]` and invalidation contract — merging it breaks that contract.

**Do this instead:** `useSpendingStats()` called in `DashboardPage`. Both hooks run in parallel via React Query — the extra call costs nothing when the data is already cached.

### Anti-Pattern 6: Computing recipe-faction mapping inside `getRecipeNamesByFactionIds` SQL before it's needed

**What people do:** Build the new `getRecipeNamesByFactionIds` query function speculatively.

**Why it's wrong:** For v2.4, the faction cards only need a recipe count (not names). The count is trivially derivable in JS from `useRecipes()` data already in memory. The SQL query adds code complexity and a round-trip for no benefit.

**Do this instead:** `recipes.filter(r => r.faction_id === faction.id).length` in `DashboardPage`'s `useMemo`. Only add `getRecipeNamesByFactionIds` if the design requires displaying individual recipe names on faction cards.

---

## Scaling Considerations

This is a single-user local desktop app. "Scale" means performance with growing personal collections.

| Concern | At 50 units | At 200+ units | Mitigation already in place |
|---------|-------------|---------------|------------------------------|
| `useLatestUnitPhotos` batch query | Fast (1 SQL + N async joins) | Watch N `join()` + `convertFileSrc` calls | Already uses `Promise.all` |
| `useKanbanEnrichment` for active projects | Trivial (≤5 units) | Bounded by `activeProjects` slice | `computeStats` caps at 5 |
| `useArmyListReadiness` IN clause | Fast | Fast (2–10 lists typical) | Dynamic placeholder pattern already defensive |
| `computeSpendingStats` with new fields | Negligible (pure JS) | Negligible (pure JS loop) | No new SQL |
| CSS grid reflow | No concern | No concern | Pure CSS layout |

---

## Sources

- Direct inspection: `src/features/dashboard/DashboardPage.tsx` — current layout, hook calls, portal pattern
- Direct inspection: `src/features/dashboard/computeStats.ts` — `ComputedDashboardStats` interface, `activeProjects` derivation
- Direct inspection: `src/features/dashboard/CurrentFocusCard.tsx` — existing props interface
- Direct inspection: `src/features/dashboard/HobbyPipeline.tsx` — existing 11-stage implementation
- Direct inspection: `src/features/dashboard/StatCard.tsx` — existing props
- Direct inspection: `src/features/dashboard/FactionSummaryCard.tsx` — existing props + navigation pattern
- Direct inspection: `src/features/dashboard/LogSessionSheet.tsx` — existing form + schema
- Direct inspection: `src/features/dashboard/RecentActivityFeed.tsx` — existing `ActivityEvent` consumption
- Direct inspection: `src/db/queries/dashboard.ts` — `getDashboardStats`, `getRecentActivity`
- Direct inspection: `src/db/queries/armyLists.ts` — `getArmyListReadiness` SQL pattern
- Direct inspection: `src/db/queries/unitPhotos.ts` — `getLatestPhotoByUnit` batch query
- Direct inspection: `src/db/queries/recipes.ts` — `getRecipeNamesByUnitIds` IN-clause pattern
- Direct inspection: `src/db/queries/spending.ts` — `getSpendingStats` pattern
- Direct inspection: `src/hooks/useDashboardStats.ts` — `DASHBOARD_STATS_KEY`, invalidation contract
- Direct inspection: `src/hooks/useArmyLists.ts` — `useArmyListReadiness`, readiness Map derivation
- Direct inspection: `src/hooks/useUnitPhotos.ts` — `useLatestUnitPhotos`, `Map<id, UnitPhotoWithUrl>`
- Direct inspection: `src/hooks/useKanbanEnrichment.ts` — `KanbanEnrichment` interface, sorted key
- Direct inspection: `src/hooks/useJournalSessions.ts` — `useCreatePaintingSession` invalidations
- Direct inspection: `src/hooks/useSpendingStats.ts` — `SPENDING_STATS_KEY`
- Direct inspection: `src/hooks/useRecipes.ts` — `RECIPES_KEY`
- Direct inspection: `src/features/spending/computeSpendingStats.ts` — `SpendingStats` interface
- Direct inspection: `src/types/unit.ts` — `Unit` interface, `PAINTING_STATUS_ORDER`
- Direct inspection: `src/types/recipe.ts` — `PaintingRecipe` with `faction_id`, `unit_id` columns
- Direct inspection: `src/styles/globals.css` — existing CSS token definitions (`--battle-gold`, `--faction-accent`)

---
*Architecture research for: HobbyForge v2.4 — Premium Dashboard UX*
*Researched: 2026-05-05*
