# Phase 26: Dashboard Redesign - Research

**Researched:** 2026-05-04
**Domain:** React component architecture / SQLite query extension / Dashboard UX
**Confidence:** HIGH — all findings sourced directly from codebase; no ambiguity

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Header & Subtitle (DASH-01)**
- Page title: "Hobby Command Center" — replaces "Dashboard"
- Dynamic subtitle: `"{N} active projects · {M} models tracked · {P} battle-ready points"` using existing `activeProjectsCount`, `totalModels`, `battleReadyPoints` from `useDashboardStats`
- Implemented via Phase 25 `PageHeader` with `title` and `subtitle` props
- All three render branches use PageHeader with same title; subtitle only in populated branch

**Action Buttons (DASH-02)**
- Both buttons in `actions` slot of `PageHeader` as outline/secondary `Button` components
- Quick Add: opens `UnitSheet` in create mode — same component as CollectionPage; no navigation
- Log Session: opens new `LogSessionSheet` — lightweight Sheet with unit picker (active projects first, then all units) + session form (date, duration, notes); submits via `useCreatePaintingSession`
- Sibling portal pattern: both sheets mounted as TOP-LEVEL siblings of existing portals — never nested
- Button state managed with two `useState` booleans at DashboardPage level

**CurrentFocusCard (DASH-03)**
- Project: `activeProjects[0]` from existing `computeStats` — sorted by `updated_at DESC`
- Displayed info: unit name, faction accent color (left border), current painting stage (StatusBadge from Phase 25), `painting_percentage` as progress bar, next-action hint text
- Next-action hint: `getNextActionHint(status: PaintingStatus): string` pure lookup function
- Empty state: muted "No active project — mark one in Projects" placeholder when no active projects
- Layout: full-width card, left `border-l-4` colored by faction theme, two-column inner layout
- Component path: `src/features/dashboard/CurrentFocusCard.tsx`

**HobbyPipeline Strip (DASH-04)**
- Replaces the existing Progress section (three paintingPct/assemblyPct/basingPct StatCards) — NOT added alongside it
- All 11 PAINTING_STATUS_ORDER stages shown as horizontal strip
- Each stage: stage name (abbreviated on narrow), unit count at that exact stage
- Stage colors: reuse StatusBadge tier colors for count badge backgrounds
- Unit counts from existing `units` array in `useDashboardStats`: `units.filter(u => u.status_painting === stage).length`
- Layout: horizontal flex strip, each stage as a small column; wraps on narrow windows
- Component path: `src/features/dashboard/HobbyPipeline.tsx`

**Faction Army Cards (DASH-05)**
- `FactionSummaryCard` upgraded in-place — same file, no rename
- Existing data already covers DASH-05: `paintedPct` and `pointsPainted` are in `FactionStat`
- Card body restructured: unit count (primary), painting progress (`{paintedPct}%` with thin progress bar using `bg-faction-accent`), battle-ready points (`{pointsPainted} pts battle-ready`)
- Points owned kept but de-emphasized (smaller text or tooltip)
- Card min-width kept at `min-w-[180px]`

**Recent Activity Feed (DASH-06)**
- N = 10 events (last 10 chronologically across all sources)
- Event sources (no new tables):
  - Unit added: `units.created_at` — event type `"unit_added"`, label `"Added {unit.name}"`
  - Unit status changed: `units.updated_at` (when `updated_at !== created_at`) — type `"unit_updated"`, label `"Updated {unit.name}"`
  - Session logged: new cross-unit SQL query — type `"session_logged"`, label `"Session: {unit.name}"`
  - Battle recorded: `battle_logs.created_at` — type `"battle_logged"`, label `"Battle vs {opponent_faction}: {result}"`
- Query strategy: new `getRecentActivity()` in `src/db/queries/dashboard.ts`; merge in a new `computeRecentActivity()` pure function
- Display: compact list rows with icon (Paintbrush, Sword, Plus, PenLine), event label, relative time via `relativeTime.ts`
- Component path: `src/features/dashboard/RecentActivityFeed.tsx`

**Layout Restructure**
New section order (top to bottom):
1. PageHeader — "Hobby Command Center" + subtitle + Quick Add/Log Session buttons
2. CurrentFocusCard — full-width, prominent
3. Top stat row — 4 StatCards (Total Models, Fully Painted, Battle-Ready Points, Active Projects)
4. HobbyPipeline strip — replaces old Progress section
5. Hobby Health section — Velocity + Streak (unchanged)
6. By Faction section — upgraded FactionSummaryCards
7. Recent Activity feed — replaces old two-column Active Projects/Recently Updated lists

Old "Active Projects" and "Recently Updated" list sections are **removed**.

### Claude's Discretion
- Exact abbreviated stage names for narrow HobbyPipeline columns
- Whether `useRecentActivity` is a standalone hook or merged into `useDashboardStats`
- `getNextActionHint` lookup table contents (exact per-stage hint text)
- LogSessionSheet — whether to build as a new file or reuse existing session form patterns from JournalTab
- Loading skeleton layout for new sections (CurrentFocusCard, HobbyPipeline, RecentActivity)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Dashboard header shows "Hobby Command Center" with dynamic subtitle summarizing active hobby state | PageHeader (Phase 25) API confirmed; subtitle values come from existing `ComputedDashboardStats` fields; no new data needed |
| DASH-02 | Quick Add and Log Session action buttons from dashboard header without leaving the dashboard | UnitSheet (create mode) already exists; LogSessionSheet is new; sibling portal pattern established in DashboardPage with 4+ existing portals |
| DASH-03 | CurrentFocusCard as primary visual anchor — most recently active project with painting stage, progress, next-action | `activeProjects[0]` already sorted by `updated_at DESC` in `computeStats`; StatusBadge (Phase 25) available; `painting_percentage` already on Unit |
| DASH-04 | HobbyPipeline strip replacing isolated percentage stat cards | Unit counts per stage derived client-side from existing `units` array; PAINTING_STATUS_ORDER (11 stages) already defined; StatusBadge tier colors can drive stage coloring |
| DASH-05 | Faction cards upgraded to show painting progress percentage and battle-ready point count | `FactionStat.paintedPct` and `FactionStat.pointsPainted` already computed in `computeStats`; FactionSummaryCard needs UI restructure only |
| DASH-06 | Recent Activity feed from existing data — last N events across units added/updated, sessions, battles | New cross-unit SQL query needed in `dashboard.ts`; `battle_logs` accessed via new `getRecentActivity()`; `relativeTime.ts` utility already exists |

</phase_requirements>

---

## Summary

Phase 26 is a pure UI restructure and data-aggregation phase — no new database tables, no schema migrations, no new Tauri commands. All required data either already exists in `ComputedDashboardStats` or can be derived from existing tables via a single new SQL query function.

The work divides into three tracks: (1) new display components (CurrentFocusCard, HobbyPipeline, RecentActivityFeed, LogSessionSheet), (2) in-place modifications to DashboardPage and FactionSummaryCard, and (3) a single new database query function `getRecentActivity()` in `dashboard.ts`. Every Phase 25 primitive (PageHeader, StatusBadge, enriched StatCard) is consumed here; Phase 26 cannot begin until Phase 25 ships.

The primary integration risk is DashboardPage complexity: it already manages 4 sibling portal sheets/dialogs and a 3-branch render (loading/error/populated). Adding 2 more portals (LogSessionSheet, UnitSheet for Quick Add) must follow the established sibling pattern exactly. The `allDisplayedUnits` memo that feeds `selectedUnit` derivation must be updated to remove references to `recentlyUpdated` and `activeProjects` list sections that are being removed; once those list sections go away, the DashboardPage no longer needs that memo for list-row click handling — but `selectedUnit` is still needed if CurrentFocusCard clicking opens UnitDetailSheet.

**Primary recommendation:** Build in this order: `getRecentActivity()` SQL query + `computeRecentActivity()` pure fn (testable in isolation), then new display components (CurrentFocusCard, HobbyPipeline, RecentActivityFeed), then LogSessionSheet, then wire everything into DashboardPage in a single final task. Keep `allDisplayedUnits` memo but expand its source to include all units (not just the two list sections that are being removed).

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | installed | Component layer | Project standard |
| TanStack Query | installed | Server state, query invalidation | Project standard |
| shadcn/ui (new-york/zinc) | installed | Sheet, Card, Button, Select primitives | Project standard |
| Lucide React | installed | Icons (Paintbrush, Sword, Plus, PenLine, Target) | Project standard |
| Zod + React Hook Form | installed | LogSessionSheet form validation | Project standard |
| tauri-plugin-sql | installed | SQLite queries, `$1/$2` positional params | Project standard |

### Phase 25 Primitives (prerequisites — must ship first)

| Component | Path | Used By |
|-----------|------|---------|
| `PageHeader` | `src/components/common/PageHeader.tsx` | DashboardPage — all 3 branches |
| `StatusBadge` | `src/components/ui/status-badge.tsx` | CurrentFocusCard, HobbyPipeline |
| `StatCard` (enriched) | `src/features/dashboard/StatCard.tsx` | Top stat row (icon, progress props) |
| Design tokens | `globals.css` | `--battle-gold`, `--forge-black` etc. |

### No New Dependencies

Phase 26 introduces zero new npm packages. All required primitives exist.

---

## Architecture Patterns

### Pattern 1: Extend computeStats for CurrentFocusCard Data

`computeStats.ts` already returns `activeProjects: Unit[]` sorted by `updated_at DESC`. CurrentFocusCard receives `stats.activeProjects[0]` directly — no new computation needed. The `ComputedDashboardStats` interface does NOT need new fields for DASH-03.

However, `units` (the raw array) must remain accessible to HobbyPipeline for per-stage counts. The current `getDashboardStats()` already returns the full `units` array, but `computeStats()` does not surface it on the result object. Two options:

- **Option A (recommended):** Add `units: Unit[]` to `ComputedDashboardStats` interface — expose the raw array so HobbyPipeline can filter it without a new query. Low risk; `computeStats` already receives the full array.
- **Option B:** HobbyPipeline derives counts from `PAINTING_STATUS_ORDER.map(stage => stats.activeProjects.concat(stats.recentlyUpdated))` — but this is incomplete since those lists are sliced to 5. Must use full units array.

**Use Option A.** Add `units: Unit[]` to `ComputedDashboardStats` and return it from `computeStats`.

### Pattern 2: New getRecentActivity() Query

The cross-unit session query and battle log fetch go in `src/db/queries/dashboard.ts` alongside `getDashboardStats()`. This follows the existing pattern where dashboard data is co-located.

```typescript
// Source: existing paintingSessions.ts and battleLogs.ts patterns
export interface RecentActivityRow {
  type: "session_logged" | "battle_logged";
  timestamp: string;        // ISO datetime string
  sessionUnitId?: number;   // for session_logged
  sessionUnitName?: string; // joined from units
  battleOpponentFaction?: string;
  battleResult?: string;
}

export async function getRecentActivity(): Promise<{
  sessions: Array<{ session_date: string; id: number; unit_name: string }>;
  battles: Array<{ created_at: string; id: number; opponent_faction: string; result: string }>;
}> {
  const db = await getDb();
  const [sessions, battles] = await Promise.all([
    db.select<Array<{ session_date: string; id: number; unit_name: string }>>(
      `SELECT ps.session_date, ps.id, u.name AS unit_name
       FROM painting_sessions ps
       JOIN units u ON u.id = ps.unit_id
       ORDER BY ps.session_date DESC, ps.id DESC
       LIMIT 20`
    ),
    db.select<Array<{ created_at: string; id: number; opponent_faction: string; result: string }>>(
      `SELECT id, created_at, opponent_faction, result
       FROM battle_logs
       ORDER BY created_at DESC
       LIMIT 20`,
    ),
  ]);
  return { sessions, battles };
}
```

### Pattern 3: computeRecentActivity Pure Function

Merge unit events (from stats.units already in cache) + sessions + battles into a unified feed in JS. This is testable in isolation exactly like `computeStats`.

```typescript
// src/features/dashboard/computeRecentActivity.ts
export type ActivityEventType = "unit_added" | "unit_updated" | "session_logged" | "battle_logged";

export interface ActivityEvent {
  id: string;           // unique key for React (type + source id)
  type: ActivityEventType;
  label: string;
  timestamp: string;    // ISO datetime string for relativeTime()
}

export function computeRecentActivity(
  units: Unit[],
  sessions: SessionRow[],
  battles: BattleRow[],
  limit = 10,
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  // unit_added events from units.created_at
  // unit_updated events from units where updated_at !== created_at
  // session_logged events from sessions
  // battle_logged events from battles
  // sort by timestamp DESC, slice to limit
}
```

### Pattern 4: useRecentActivity Standalone Hook (Recommended)

Keep as a separate hook with its own query key `["recent-activity"]`. Rationale:
- It fetches different data than `useDashboardStats` (sessions + battles from DB)
- `useDashboardStats` already returns the units needed for unit_added/unit_updated events — `computeRecentActivity` can consume those from the RQ cache
- Separation of concerns: the dashboard stats query stays fast (only units + factions), the activity query runs in parallel
- Invalidation: `useCreatePaintingSession` must invalidate `["recent-activity"]`; `useCreateBattleLog` / `useUpdateBattleLog` / `useDeleteBattleLog` must invalidate `["recent-activity"]`; unit mutations already invalidate `["dashboard-stats"]` which is where unit events come from

```typescript
// src/hooks/useRecentActivity.ts
export const RECENT_ACTIVITY_KEY = ["recent-activity"] as const;

export function useRecentActivity(units: Unit[] | undefined) {
  return useQuery({
    queryKey: RECENT_ACTIVITY_KEY,
    queryFn: async () => {
      const { sessions, battles } = await getRecentActivity();
      return computeRecentActivity(units ?? [], sessions, battles);
    },
    enabled: units !== undefined,
  });
}
```

**Hook invalidation wiring required:**
- `useCreatePaintingSession` → add `qc.invalidateQueries({ queryKey: ["recent-activity"] })`
- `useCreateBattleLog`, `useUpdateBattleLog`, `useDeleteBattleLog` → add same invalidation
- `useCreateUnit`, `useUpdateUnit`, `useDeleteUnit` → these already invalidate `["dashboard-stats"]`; since unit events are derived from `stats.units` (which re-fetches on `["dashboard-stats"]` invalidation), no additional wiring needed for unit events

### Pattern 5: LogSessionSheet — New File

Build as a new component at `src/features/dashboard/LogSessionSheet.tsx`. Do NOT reuse JournalTab.tsx directly — that component is tightly coupled to `unitId` (already known), the Tauri file system API for photos, and many photo-specific concerns.

LogSessionSheet is a focused Sheet with:
- Unit picker: `<Select>` showing active projects first, then all units (sorted by name); derives from `useDashboardStats` stats that are already in RQ cache, or from `useUnits()` hook
- Date: `<Input type="date">` defaulting to today via `todayISO()` from `src/lib/dates`
- Duration: `<Input type="number">` (minutes)
- Notes: `<textarea>`
- Submit: calls `useCreatePaintingSession().mutateAsync`

The form fields mirror JournalTab's `handleLogSession` logic exactly — same mutation hook, same field names, same validation. Use React Hook Form + Zod for consistency with UnitSheet.

### Pattern 6: Sibling Portal Registration in DashboardPage

DashboardPage currently mounts 4 portals as top-level siblings:
- `UnitDetailSheet` (selectedUnit)
- `UnitSheet` (edit)
- `UnitDeleteDialog`
- `Dialog` (lightbox)
- `DatasheetImportDialog`

Phase 26 adds 2 more:
- `UnitSheet` in create mode (Quick Add) — **same component, open controlled by `quickAddOpen` boolean**
- `LogSessionSheet` — new, open controlled by `logSessionOpen` boolean**

Pattern: add `quickAddOpen` and `logSessionOpen` `useState` booleans. The existing `UnitSheet` mounted for edits (`key={editingUnit?.id ?? "new-edit"}`) should remain; the Quick Add UnitSheet is a SEPARATE sibling instance (different key) to avoid state conflicts between create and edit modes.

```tsx
// In DashboardPage populated state fragment:
const [quickAddOpen, setQuickAddOpen] = useState(false);
const [logSessionOpen, setLogSessionOpen] = useState(false);

// PageHeader actions prop:
actions={
  <>
    <Button variant="outline" size="sm" onClick={() => setLogSessionOpen(true)}>
      <Paintbrush size={14} className="mr-1.5" /> Log Session
    </Button>
    <Button variant="outline" size="sm" onClick={() => setQuickAddOpen(true)}>
      <Plus size={14} className="mr-1.5" /> Quick Add
    </Button>
  </>
}

// Sibling portals (after main content div):
<UnitSheet key="quick-add" open={quickAddOpen} unit={null} onClose={() => setQuickAddOpen(false)} />
<LogSessionSheet open={logSessionOpen} onClose={() => setLogSessionOpen(false)} stats={stats} />
```

**CRITICAL:** Quick Add and Log Session button state must also be wired in the empty-state branch (so users can add their first unit from the dashboard). In the loading/error branches, buttons should not be rendered (no actions prop) or render as disabled.

### Pattern 7: allDisplayedUnits Memo After Removal of List Sections

The current `allDisplayedUnits` memo combines `stats.recentlyUpdated` and `stats.activeProjects` to support `selectedUnit` derivation for row click → UnitDetailSheet. When those list sections are removed, the click source for UnitDetailSheet changes:

- CurrentFocusCard may offer a click-through to UnitDetailSheet — if so, `allDisplayedUnits` should include the focus unit
- If CurrentFocusCard does NOT open UnitDetailSheet, the memo can be simplified or removed
- RecentActivityFeed rows click through to... what? The CONTEXT.md does not specify. Research recommendation: RecentActivityFeed rows for unit_added/unit_updated events should open UnitDetailSheet; rows for session_logged and battle_logged can be non-interactive or navigate to their respective pages.

**Decision needed by planner:** Does clicking a unit event in RecentActivityFeed open UnitDetailSheet? If yes, `allDisplayedUnits` must be replaced with `stats.units` (full list) as the derivation source — or derive `selectedUnit` directly from `stats.units` via `useDashboardStats`. This is the cleaner approach since Phase 26 now exposes `units` on `ComputedDashboardStats`.

### Recommended Project Structure Changes

```
src/features/dashboard/
├── DashboardPage.tsx          (modified — heavy rework)
├── computeStats.ts            (modified — add units field to ComputedDashboardStats)
├── computeRecentActivity.ts   (NEW — pure function, testable)
├── CurrentFocusCard.tsx       (NEW)
├── HobbyPipeline.tsx          (NEW)
├── RecentActivityFeed.tsx     (NEW)
├── LogSessionSheet.tsx        (NEW)
├── FactionSummaryCard.tsx     (modified — UI restructure in-place)
├── StatCard.tsx               (unchanged — Phase 25 already enriched it)
├── relativeTime.ts            (unchanged — used by RecentActivityFeed)
├── statusAbbr.ts              (unchanged or retired if DashboardListRow is removed)
├── DashboardListRow.tsx       (retired — replaced by RecentActivityFeed rows)
└── DashboardEmptyState.tsx    (unchanged)

src/db/queries/
└── dashboard.ts               (modified — add getRecentActivity())

src/hooks/
└── useRecentActivity.ts       (NEW)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time formatting | Custom formatter | `formatRelativeTime()` in `relativeTime.ts` | Already exists, tested, handles SQLite datetime space-separator pitfall |
| Session form state | Ad-hoc controlled inputs | React Hook Form + Zod (LogSessionSheet) | Consistent with all other forms in codebase; zod v4 `.default()` pitfall already documented |
| Unit picker in LogSessionSheet | Custom combobox | shadcn `Select` (already installed) | Sufficient for this use case; CategoryCombobox is for free-text, not needed here |
| Progress bar in FactionSummaryCard | Custom element | Inline `div` with `bg-faction-accent` fill, matching StatCard pattern | StatCard progress bar pattern already established in Phase 25 |
| Status dot in HobbyPipeline | Custom colored circle | Import `PAINTING_STATUS_TIER` from `status-badge.tsx` (Phase 25) | Reuse the tier color mapping — visual consistency guaranteed |
| Cross-unit session query | Multiple per-unit fetches | Single SQL JOIN query in `getRecentActivity()` | One round-trip; avoid N+1 |

---

## Common Pitfalls

### Pitfall 1: Nesting Radix Portals

**What goes wrong:** Mounting LogSessionSheet or Quick Add UnitSheet inside the JSX tree of DashboardPage's main content div, instead of as siblings of the outer fragment.

**Why it happens:** Natural JSX nesting instinct; the portal appears to work in dev but Radix/shadcn Sheet portals misbehave when nested — focus trapping, z-index, and overlay stacking break.

**How to avoid:** All Sheet/Dialog/AlertDialog components must be mounted at the TOP-LEVEL of the returned fragment, as siblings, not inside the `<div className="flex flex-col gap-12 p-6">` wrapper. This is documented in STATE.md "Sibling Sheet/Dialog portal pattern — never nest Radix portals" and is already established in DashboardPage with 4 portals.

**Warning signs:** Any Sheet or Dialog that renders inside a JSX subtree that is also rendered inside another Sheet or Dialog.

### Pitfall 2: Quick Add UnitSheet Key Collision

**What goes wrong:** Reusing `key={editingUnit?.id ?? "new-edit"}` for both the edit UnitSheet and the Quick Add UnitSheet — they are the same component but must be separate React instances.

**Why it happens:** Only one UnitSheet import; easy to assume one instance can handle both create and edit modes via the `unit` prop.

**How to avoid:** Mount two separate `<UnitSheet>` siblings. Edit UnitSheet: `key={editingUnit?.id ?? "new-edit"}` controlled by `editSheetOpen`. Quick Add UnitSheet: `key="quick-add"` controlled by `quickAddOpen`. They share the same component but are independent instances. When `unit={null}` on Quick Add, the form renders in create mode.

### Pitfall 3: allDisplayedUnits Memo Becomes Stale

**What goes wrong:** `allDisplayedUnits` is built from `stats.recentlyUpdated` and `stats.activeProjects` (each sliced to 5). After removing those list sections, `selectedUnit` derivation can fail to find units that are in the full collection but not in those 5-item slices.

**Why it happens:** The derivation was designed for the two list sections; Phase 26 removes those sections but may introduce new click targets (CurrentFocusCard, RecentActivityFeed unit rows).

**How to avoid:** After adding `units` to `ComputedDashboardStats`, derive `selectedUnit` from `stats.units` instead of the sliced sub-lists. The memo becomes: `const allDisplayedUnits = stats.units`.

### Pitfall 4: SQLite Session Date Format

**What goes wrong:** `painting_sessions.session_date` is stored as `YYYY-MM-DD` (date-only, no time component). When sorting/comparing with battle_logs.created_at (which is a full datetime `YYYY-MM-DD HH:MM:SS`), direct string comparison gives wrong chronological ordering.

**Why it happens:** Mixing date-only and datetime strings in the same sort.

**How to avoid:** In `computeRecentActivity()`, normalize session events: use `session_date + " 23:59:59"` as the sort timestamp (treat the session as occurring at end of day), or sort by id DESC as tiebreaker within same-day events. The `formatRelativeTime()` utility already handles the space→T+Z conversion for display.

### Pitfall 5: battle_logs Has No updated_at

**What goes wrong:** Trying to use `updated_at` on battle_log rows in the Recent Activity query.

**Why it happens:** `BattleLog` interface documents this: "NO updated_at — schema does not have one". Using `updated_at` would produce a SQL error or undefined.

**How to avoid:** Use `created_at` for battle_logs sort and display. This is documented in `src/types/battleLog.ts` with a comment: "NO updated_at — schema does not have one".

### Pitfall 6: HobbyPipeline Counts Require Full units Array

**What goes wrong:** Computing stage counts from `stats.activeProjects` or `stats.recentlyUpdated` instead of the full `units` array.

**Why it happens:** Those are the two available Unit arrays on the current `ComputedDashboardStats` interface. The full collection is not currently exposed.

**How to avoid:** Add `units: Unit[]` to `ComputedDashboardStats` in `computeStats.ts` and expose it in the return value. HobbyPipeline then uses `stats.units.filter(u => u.status_painting === stage).length` for accurate counts.

### Pitfall 7: Subtitle Renders in Loading/Error Branches

**What goes wrong:** The CONTEXT.md decision says subtitle is only populated in the data branch; loading and error branches use a static fallback or omit it. If the subtitle string references `stats` fields without a guard, TypeScript errors occur in the loading/error branches where `stats` is undefined.

**How to avoid:** In loading/error branches, pass `PageHeader` with `title="Hobby Command Center"` and either `subtitle="Loading..."` or no subtitle prop. Never access `stats.activeProjectsCount` in those branches.

### Pitfall 8: Zod .default() in LogSessionSheet Schema

**What goes wrong:** Using `.default()` in the Zod schema for LogSessionSheet causes react-hook-form + zodResolver to infer incorrect TypeScript types with zod v4.

**Why it happens:** Documented in STATE.md Phase 18 decisions: "battleLogSchema avoids zod .default() — same as armyListSchema; react-hook-form zodResolver type inference breaks with zod v4 .default()".

**How to avoid:** Use `buildDefaultValues()` pattern (as in UnitSheet) — supply defaults via `useForm({ defaultValues: buildDefaultValues() })` instead of zod `.default()`.

---

## Code Examples

Verified patterns from existing codebase:

### Cross-Unit Painting Sessions Query Pattern
```typescript
// Source: src/db/queries/paintingSessions.ts (per-unit pattern to generalize)
// New getRecentActivity() in src/db/queries/dashboard.ts follows this style:
db.select<Array<{ session_date: string; id: number; unit_name: string }>>(
  `SELECT ps.session_date, ps.id, u.name AS unit_name
   FROM painting_sessions ps
   JOIN units u ON u.id = ps.unit_id
   ORDER BY ps.session_date DESC, ps.id DESC
   LIMIT 20`
)
// Note: $1/$2 positional params only needed when WHERE clause is parameterized.
// No parameters here — plain SQL string is fine.
```

### Faction Left Border Pattern (reuse in CurrentFocusCard)
```tsx
// Source: src/features/dashboard/FactionSummaryCard.tsx line 49
style={{ borderLeftColor: stat.faction.color_theme }}
className="border-l-4 ..."
```

### StatusBadge Usage (Phase 25)
```tsx
// Source: src/components/ui/status-badge.tsx (Phase 25 — not yet created)
// API confirmed in 25-UI-SPEC.md:
<StatusBadge status={unit.status_painting} />
// Props: status: PaintingStatus — single prop, no others needed
```

### PAINTING_STATUS_TIER Map (for HobbyPipeline stage colors)
```typescript
// Source: src/components/ui/status-badge.tsx (Phase 25 — exported const)
// PAINTING_STATUS_TIER maps PaintingStatus → tier string:
//   "Not Started" → "not-started" (muted)
//   "Built"|"Primed"|"Basecoated" → "prep" (slate-400)
//   "Shaded"|"Layered"|"Highlighted"|"Details Done"|"Based" → "painting" (violet-400)
//   "Varnished"|"Completed" → "done" (emerald-400)
// HobbyPipeline imports this to pick bubble background color per stage
```

### Sibling Portal Pattern (DashboardPage)
```tsx
// Source: src/features/dashboard/DashboardPage.tsx — existing 4-portal pattern
// New portals follow same pattern:
<>
  <div className="flex flex-col gap-12 p-6">
    {/* main content */}
  </div>

  {/* ALL portals are siblings of the main div, never nested inside it */}
  <UnitDetailSheet ... />
  <UnitSheet key={editingUnit?.id ?? "new-edit"} ... />      // edit mode
  <UnitSheet key="quick-add" open={quickAddOpen} unit={null} onClose={...} />  // create mode
  <UnitDeleteDialog ... />
  <LogSessionSheet open={logSessionOpen} onClose={...} />
  <Dialog ... />           // lightbox
  <DatasheetImportDialog ... />
</>
```

### relativeTime Usage
```typescript
// Source: src/features/dashboard/relativeTime.ts
// Handles SQLite datetime space separator: "2026-01-01 12:00:00" → "3d"
import { formatRelativeTime } from "./relativeTime";
const display = formatRelativeTime(event.timestamp); // returns "3d", "2h", "5m", etc.
```

### FactionSummaryCard Progress Bar (DASH-05 upgrade)
```tsx
// Source: src/features/dashboard/StatCard.tsx (Phase 25 progress bar pattern)
// Apply same pattern inline in FactionSummaryCard:
<div className="mt-2">
  <div className="h-0.5 w-full rounded-full bg-border/40">
    <div
      className="h-0.5 rounded-full bg-faction-accent transition-all duration-500"
      style={{ width: `${stat.paintedPct}%` }}
    />
  </div>
</div>
```

### todayISO() for LogSessionSheet date default
```typescript
// Source: src/lib/dates.ts (used in JournalTab.tsx line 64)
import { todayISO } from "@/lib/dates";
// Returns "YYYY-MM-DD" string for today — use as defaultValues.session_date
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `<div className="flex items-center justify-between pb-6 border-b border-border/40">` header | `<PageHeader title="..." subtitle="..." actions={...} />` | Phase 25 | All 3 render branches in DashboardPage must adopt PageHeader |
| Three `paintingPct`/`assemblyPct`/`basingPct` StatCards in Progress section | `HobbyPipeline` strip with all 11 stages | Phase 26 (this phase) | Progress section is fully removed and replaced — existing 3-StatCard grid removed from all 3 branches' loading skeletons too |
| Two-column "Active Projects" + "Recently Updated" list sections | `CurrentFocusCard` (focus project) + `RecentActivityFeed` (all recent events) | Phase 26 (this phase) | `DashboardListRow` and `statusAbbr.ts` become unused — candidates for deletion |
| `allDisplayedUnits` built from two 5-item sliced arrays | `stats.units` (full unit array now on ComputedDashboardStats) | Phase 26 (this phase) | Fixes selectedUnit derivation for all click targets |

**Loading skeletons to update:** The loading branch currently renders skeletons for Progress (3 cards) and the two-column lists. These must be replaced with skeletons for CurrentFocusCard (1 full-width block) and RecentActivityFeed (N compact rows).

---

## Open Questions

1. **Does clicking a unit event in RecentActivityFeed open UnitDetailSheet?**
   - What we know: CONTEXT.md specifies the display format but not the click behavior for feed rows
   - What's unclear: Whether feed rows are interactive or display-only; whether UnitDetailSheet is triggered
   - Recommendation: Make unit_added/unit_updated rows clickable (open UnitDetailSheet). Session and battle rows: display-only for Phase 26. Derive selectedUnit from `stats.units` (full list) rather than sliced sub-lists.

2. **Quick Add and Log Session buttons in empty-state branch?**
   - What we know: The empty state branch currently mounts no-op portals; CONTEXT.md says buttons are in PageHeader
   - What's unclear: Whether the empty-state branch should show Quick Add (to add first unit) — this is the primary CTA on the empty state
   - Recommendation: Yes — Quick Add button should appear in empty-state PageHeader (it's the most useful action when no units exist). Log Session button can be omitted in empty state (no units to log for).

3. **LogSessionSheet unit picker data source?**
   - What we know: CONTEXT.md says "showing active projects first, then all units"
   - What's unclear: Whether to use `useDashboardStats` cache (already fetched) or `useUnits()` (separate fetch, but always fresh)
   - Recommendation: Use `useUnits()` inside LogSessionSheet — it's already fetched and cached globally (`UNITS_KEY`). This avoids passing `stats` as prop to LogSessionSheet, keeping the component self-contained.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (inferred from package.json `pnpm test`) |
| Quick run command | `pnpm test -- tests/dashboard/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | `computeStats` exposes subtitle fields (`activeProjectsCount`, `totalModels`, `battleReadyPoints`) | unit | `pnpm test -- tests/dashboard/computeStats.test.ts` | YES (existing tests cover these fields) |
| DASH-03 | `computeStats.activeProjects[0]` is most-recently-updated active unit | unit | `pnpm test -- tests/dashboard/computeStats.test.ts` | YES (DASH-05 test block covers sort order) |
| DASH-04 | HobbyPipeline stage counts — `units.filter(u => u.status_painting === stage).length` | unit | `pnpm test -- tests/dashboard/computeStats.test.ts` | PARTIAL — `computeStats` tests don't cover `units` field (new); Wave 0 gap |
| DASH-05 | `FactionStat.paintedPct` and `FactionStat.pointsPainted` correct | unit | `pnpm test -- tests/dashboard/computeStats.test.ts` | YES (existing tests cover these fields) |
| DASH-06 | `computeRecentActivity()` merges and sorts 4 event types correctly | unit | `pnpm test -- tests/dashboard/computeRecentActivity.test.ts` | NO — Wave 0 gap |
| DASH-06 | `getRecentActivity()` SQL query returns correct shape | unit (mock) | `pnpm test -- tests/dashboard/recentActivityQuery.test.ts` | NO — Wave 0 gap |
| DASH-02 | LogSessionSheet form validation — date required, duration > 0 | unit | `pnpm test -- tests/dashboard/logSessionSheet.test.ts` | NO — Wave 0 gap (optional, form is simple) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/dashboard/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before verify-work

### Wave 0 Gaps

- [ ] `tests/dashboard/computeRecentActivity.test.ts` — covers DASH-06 pure function: merge, sort, slice to N, all 4 event types
- [ ] `tests/dashboard/recentActivityQuery.test.ts` — covers `getRecentActivity()` SQL query with mocked DB (mirrors `tests/hobby-journal/paintingSessionQueries.test.ts` pattern)
- [ ] `computeStats.test.ts` — extend existing file to cover the new `units` field on `ComputedDashboardStats` (add 2–3 assertions to existing describe blocks)

Note: `computeStats.test.ts` already exists and covers DASH-01, 03, 04, 05, 06, 08 thoroughly. The Wave 0 gap is only the `units` field addition and the new `computeRecentActivity` function.

---

## Sources

### Primary (HIGH confidence)
- `src/features/dashboard/DashboardPage.tsx` — full existing render structure, portal pattern, state management
- `src/features/dashboard/computeStats.ts` — ComputedDashboardStats interface, all computed fields
- `src/features/dashboard/FactionSummaryCard.tsx` — existing card structure, `borderLeftColor` pattern
- `src/features/dashboard/relativeTime.ts` — confirmed datetime format handling (space→T+Z)
- `src/db/queries/dashboard.ts` — `getDashboardStats()` pattern; where `getRecentActivity()` goes
- `src/db/queries/paintingSessions.ts` — per-unit session query to generalize to cross-unit
- `src/hooks/useDashboardStats.ts` — query key `["dashboard-stats"]`, invalidation pattern
- `src/hooks/useJournalSessions.ts` — `useCreatePaintingSession` mutation + invalidation
- `src/hooks/useBattleLogs.ts` — query key `["battle-logs"]`, invalidation includes `["dashboard-stats"]`
- `src/hooks/useUnits.ts` — `UNITS_KEY`, mutation invalidation pattern
- `src/types/unit.ts` — `PAINTING_STATUS_ORDER` (11 stages), `PaintingStatus`, `Unit` interface
- `src/types/battleLog.ts` — `BattleLog` interface; confirmed no `updated_at`
- `src/types/paintingSession.ts` — `PaintingSession`, `CreateSessionInput`
- `src/features/units/UnitSheet.tsx` — UnitSheet API (open, unit, onClose), `buildDefaultValues` pattern, zod `.default()` avoidance
- `src/features/units/JournalTab.tsx` — session form field names, `useCreatePaintingSession` usage pattern
- `src/features/dashboard/StatCard.tsx` — Phase 25-enriched props (icon, trend, progress)
- `.planning/phases/25-design-foundation/25-UI-SPEC.md` — PageHeader API, StatusBadge rendering, StatCard progress bar
- `.planning/phases/26-dashboard-redesign/26-CONTEXT.md` — all locked decisions
- `tests/dashboard/computeStats.test.ts` — existing test coverage baseline; Wave 0 gap identification

### Secondary (MEDIUM confidence)
- `src/features/dashboard/statusAbbr.ts` — STATUS_ABBR map; DashboardListRow likely retired in Phase 26
- `src/features/dashboard/DashboardListRow.tsx` — existing row component; RecentActivityFeed rows are likely built fresh (different data shape)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed; no new dependencies
- Architecture: HIGH — all patterns sourced from existing codebase code, not speculation
- SQL query design: HIGH — mirrors established patterns in paintingSessions.ts and battleLogs.ts
- Pitfalls: HIGH — all sourced from STATE.md accumulated decisions or directly from code comments
- Wave 0 test gaps: HIGH — identified by comparing requirement behaviors against existing test files

**Research date:** 2026-05-04
**Valid until:** 2026-07-04 (stable stack; Phase 25 must ship before any Phase 26 implementation)
