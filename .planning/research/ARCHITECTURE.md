# Architecture Research

**Domain:** HobbyForge v1.1 — Paint Inventory, Army List Builder, Unit Playbook integration into existing codebase
**Researched:** 2026-05-01
**Confidence:** HIGH — based on direct codebase audit of all relevant source files

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React UI Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ PaintInv     │  │  ArmyLists   │  │ UnitDetail   │       │
│  │ Page+Filters │  │  Page+Detail │  │ Sheet+Tabs   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
├─────────┴──────────────────┴──────────────────┴─────────────┤
│                   TanStack Query Hooks Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  usePaints   │  │ useArmyLists │  │useStrategyNote│      │
│  │  (enhanced)  │  │  (new)       │  │  (new)        │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
├─────────┴──────────────────┴──────────────────┴─────────────┤
│                   src/db/queries/* Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  paints.ts   │  │ armyLists.ts │  │strategyNotes │       │
│  │  (+ join fn) │  │  (new file)  │  │  .ts (new)   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
├─────────┴──────────────────┴──────────────────┴─────────────┤
│                   SQLite (tauri-plugin-sql)                   │
│  paints  recipe_paints  army_lists  army_list_units           │
│  unit_strategy_notes (migration 002 adds 8 columns)           │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|----------------|----------|
| `PaintInventoryPage` | Filterable paint table with running-low/wishlist views and used-in-recipes back-links | `src/features/paints/PaintInventoryPage.tsx` (NEW) |
| `PaintInventoryFilters` | Local filter controls — brand, type, owned, running-low, wishlist | `src/features/paints/PaintInventoryFilters.tsx` (NEW) |
| `ArmyListsPage` | List index, create/delete army lists | `src/features/army-lists/ArmyListsPage.tsx` (NEW) |
| `ArmyListDetailSheet` | Add/remove units, display point totals and painted % | `src/features/army-lists/ArmyListDetailSheet.tsx` (NEW) |
| `PlaybookTab` | Stats block form + strategy notes inside UnitDetailSheet | `src/features/units/PlaybookTab.tsx` (NEW) |
| `UnitDetailSheet` | Existing drawer — gains Tabs wrapper, adds Playbook tab | `src/features/units/UnitDetailSheet.tsx` (MODIFY) |
| `PaintsPage` | Existing paint CRUD at `/paints` — unchanged | `src/features/paints/PaintsPage.tsx` (UNCHANGED) |

## Schema Gap Analysis

### unit_strategy_notes — Migration Required

The existing `001_core_schema.sql` (lines 127-140) creates `unit_strategy_notes` with:
`battlefield_role`, `strengths`, `weaknesses`, `best_targets`, `synergies`, `mistakes_to_avoid`, `rules_references`, `notes`

**Missing for v1.1 Unit Playbook — 8 columns absent:**

| Missing Column | Type | Purpose |
|---------------|------|---------|
| `move` | TEXT | M stat (e.g. "6") |
| `toughness` | INTEGER | T stat |
| `save` | TEXT | Sv stat (e.g. "3+") |
| `wounds` | INTEGER | W stat |
| `leadership` | TEXT | Ld stat (e.g. "6+") |
| `objective_control` | INTEGER | OC stat |
| `keywords` | TEXT | Comma-separated or free-text block |
| `abilities` | TEXT | Free-text ability descriptions |

**Migration 002 required** (`src-tauri/migrations/002_unit_playbook_stats.sql`):
```sql
-- 002_unit_playbook_stats.sql
-- Adds stats block + abilities/keywords to unit_strategy_notes for v1.1 Unit Playbook
ALTER TABLE unit_strategy_notes ADD COLUMN move TEXT;
ALTER TABLE unit_strategy_notes ADD COLUMN toughness INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN save TEXT;
ALTER TABLE unit_strategy_notes ADD COLUMN wounds INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN leadership TEXT;
ALTER TABLE unit_strategy_notes ADD COLUMN objective_control INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN keywords TEXT;
ALTER TABLE unit_strategy_notes ADD COLUMN abilities TEXT;
```

The migration must also be registered in `src-tauri/src/lib.rs` as version 2 in the `get_migrations()` vec.

### army_lists + army_list_units — No Gap

Both tables are complete for v1.1:
- `army_lists`: `id, name, faction_id, points_limit, list_type, notes, created_at, updated_at` — covers all of ARMY-01, ARMY-04, ARMY-05
- `army_list_units`: `id, list_id, unit_id, points_override, notes, created_at` — `points_override` satisfies ARMY-02 "manual points or override"

No schema changes needed for Army List Builder.

### paints — No Gap

`paints` already has `running_low`, `wishlist`, `owned`, `brand`, `paint_type`, `color_family` — all filter dimensions needed by `PaintInventoryPage`. No schema changes needed for Paint Inventory.

## Recommended Project Structure

### New Files to Create

```
src-tauri/migrations/
└── 002_unit_playbook_stats.sql          # NEW — 8 ADD COLUMN statements

src/
├── app/
│   ├── paint-inventory/
│   │   └── page.tsx                     # NEW — thin re-export wrapper
│   └── army-lists/
│       └── page.tsx                     # NEW — thin re-export wrapper
│
├── features/
│   ├── paints/
│   │   ├── PaintInventoryPage.tsx       # NEW — dedicated inventory page
│   │   └── PaintInventoryFilters.tsx    # NEW — filter controls component
│   └── army-lists/                      # NEW folder
│       ├── ArmyListsPage.tsx
│       ├── ArmyListsEmptyState.tsx
│       ├── ArmyListSheet.tsx            # create/edit list metadata
│       ├── ArmyListDeleteDialog.tsx
│       ├── ArmyListDetailSheet.tsx      # unit picker + points summary
│       └── ArmyListUnitRow.tsx
│
├── db/queries/
│   ├── armyLists.ts                     # NEW — full CRUD + unit membership
│   └── strategyNotes.ts                 # NEW — getByUnit + upsert
│
├── hooks/
│   ├── useArmyLists.ts                  # NEW — TanStack Query wrappers
│   └── useStrategyNote.ts               # NEW — TanStack Query wrappers
│
└── types/
    ├── armyList.ts                      # NEW — ArmyList, ArmyListUnit interfaces
    └── strategyNote.ts                  # NEW — StrategyNote, UpsertStrategyNoteInput
```

### Files to Modify

```
src-tauri/src/
└── lib.rs                               # MODIFY — register migration version 2

src/
├── app/
│   └── router.tsx                       # MODIFY — add /paint-inventory + /army-lists routes
│
├── components/common/
│   └── AppSidebar.tsx                   # MODIFY — add "Paint Inventory" + "Army Lists" nav entries
│
├── db/queries/
│   └── paints.ts                        # MODIFY — add getPaintsWithRecipeCount() function
│
├── hooks/
│   └── usePaints.ts                     # MODIFY — add usePaintsWithRecipeCount() hook;
│                                        #   also add invalidate ['paints-with-recipes'] to
│                                        #   useCreatePaint/useUpdatePaint/useDeletePaint onSuccess
│
├── features/units/
│   └── UnitDetailSheet.tsx              # MODIFY — wrap content in Tabs, add PlaybookTab
│
└── types/
    └── paint.ts                         # MODIFY — add PaintWithRecipeCount type
```

### New Feature Components (units folder)

```
src/features/units/
└── PlaybookTab.tsx                      # NEW — stats block + strategy notes form
```

## Architectural Patterns

### Pattern 1: Route Strategy for Paint Inventory

The existing `/paints` route renders `PaintsPage` (paint CRUD). Do NOT replace it. Add `/paint-inventory` as a separate route.

**Rationale:** The recipe builder's "Add Paint" flow and the `PaintCombobox` in `src/features/recipes/` reference the paints domain as a management context. Replacing `/paints` would break that workflow's mental model. The two pages serve genuinely different purposes: `/paints` = manage your paint catalog (CRUD), `/paint-inventory` = browse and filter what you own.

**Router addition to `src/app/router.tsx`:**
```typescript
import { PaintInventoryPage } from "./paint-inventory/page";
import { ArmyListsPage } from "./army-lists/page";

const paintInventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/paint-inventory",
  component: PaintInventoryPage,
});

const armyListsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/army-lists",
  component: ArmyListsPage,
});

// Add to routeTree.addChildren([..., paintInventoryRoute, armyListsRoute])
```

**Sidebar addition to `src/components/common/AppSidebar.tsx`:**
Add two entries to `MAIN_NAV` using appropriate Lucide icons — `FlaskConical` for Paint Inventory, `Scroll` or `ListChecks` for Army Lists.

### Pattern 2: Paint Inventory Filter Strategy

Filters are applied client-side in `PaintInventoryPage`. Fetch the full list once via `usePaintsWithRecipeCount()`, filter in-memory with `useMemo`.

**Rationale:** A personal paint collection is realistically 50-500 entries. Client-side filtering is instant at that scale and avoids parameterized DB queries for each filter change. This matches the existing `CollectionPage` pattern — `useUnits()` fetches all units, `UnitFilters` controls Zustand store state, and the collection renders a filtered subset.

**Do NOT use Zustand for paint inventory filter state.** Unlike the Collection page where filter state must survive navigation back from a unit detail drawer, paint inventory filters reset naturally on navigation away. Local `useState` inside `PaintInventoryPage` is sufficient.

### Pattern 3: "Used in Recipes" Join Query

New query function added to `src/db/queries/paints.ts`:

```typescript
export interface PaintWithRecipeCount extends Paint {
  recipe_count: number;
}

export async function getPaintsWithRecipeCount(): Promise<PaintWithRecipeCount[]> {
  const db = await getDb();
  return db.select<PaintWithRecipeCount[]>(`
    SELECT p.*, COUNT(rp.id) AS recipe_count
    FROM paints p
    LEFT JOIN recipe_paints rp ON rp.paint_id = p.id
    GROUP BY p.id
    ORDER BY p.brand ASC, p.name ASC
  `);
}
```

Existing `getPaints()` is untouched — recipe builder combobox and `PaintSheet` continue using it.

### Pattern 4: Strategy Note Upsert

`unit_strategy_notes` has a logical 1:1 relationship with `units` (one strategy note record per unit) but the current schema has no `UNIQUE` constraint on `unit_id`. Use a conditional upsert pattern: select first, then insert or update.

```typescript
// src/db/queries/strategyNotes.ts
export async function upsertStrategyNote(input: UpsertStrategyNoteInput): Promise<void> {
  const db = await getDb();
  const existing = await db.select<{id: number}[]>(
    "SELECT id FROM unit_strategy_notes WHERE unit_id = $1",
    [input.unit_id]
  );
  if (existing.length > 0) {
    await db.execute(
      `UPDATE unit_strategy_notes SET
        move=$2, toughness=$3, save=$4, wounds=$5, leadership=$6,
        objective_control=$7, keywords=$8, abilities=$9,
        battlefield_role=$10, strengths=$11, weaknesses=$12,
        best_targets=$13, synergies=$14, mistakes_to_avoid=$15,
        rules_references=$16, notes=$17, updated_at=datetime('now')
       WHERE unit_id=$1`,
      [input.unit_id, ...]
    );
  } else {
    await db.execute(
      `INSERT INTO unit_strategy_notes (unit_id, move, ...) VALUES ($1, $2, ...)`,
      [input.unit_id, ...]
    );
  }
}
```

**Why not ON CONFLICT:** `ON CONFLICT(unit_id)` requires a UNIQUE index. Adding that index in migration 002 is possible but the select-then-insert/update is safer for an existing production schema with no existing unique constraint.

### Pattern 5: UnitDetailSheet Tab Integration

`UnitDetailSheet` (`src/features/units/UnitDetailSheet.tsx`) is currently a flat scrollable panel with a single content block. The `Tabs` shadcn component is already installed.

**Modification approach:**
1. Import `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
2. Wrap the existing `<div className="flex flex-col gap-4 p-4">` block in `<TabsContent value="overview">`
3. Add `<TabsContent value="playbook"><PlaybookTab unit={unit} /></TabsContent>`
4. `PlaybookTab` owns its own `useStrategyNote(unit.id)` hook call — do NOT fetch strategy note data in `UnitDetailSheet` and pass it as props

**Why PlaybookTab fetches its own data:** TanStack Query deduplicates in-flight requests and caches results. The strategy note query only fires when the Playbook tab is rendered. Passing data as props from UnitDetailSheet would force a DB call on every unit row click even when the user never opens the Playbook tab.

### Pattern 6: Army List Points Calculation

Points totals (total points, painted points, painted readiness %) are computed client-side from joined data. Do not store denormalized aggregates in `army_lists`.

```typescript
// Computed in ArmyListDetailSheet from ArmyListWithUnits data
const totalPoints = units.reduce((sum, row) =>
  sum + (row.points_override ?? row.unit.points ?? 0), 0);
const paintedPoints = units
  .filter(row => row.unit.painting_percentage === 100)
  .reduce((sum, row) => sum + (row.points_override ?? row.unit.points ?? 0), 0);
const battleReadyPct = totalPoints > 0
  ? Math.round((paintedPoints / totalPoints) * 100) : 0;
```

**Why:** Stored aggregates go stale when a unit's `painting_percentage` changes elsewhere (Collection page, Kanban). Recomputing from the join is instant at any realistic army list size.

## Data Flow

### Paint Inventory Filter Flow

```
User changes filter control
    ↓
PaintInventoryFilters (calls onChange prop)
    ↓
PaintInventoryPage (local useState holds filter values)
    ↓
useMemo filters the usePaintsWithRecipeCount() cached data
    ↓
Table re-renders with filtered rows (no new DB call)
```

### Army List Mutation and Invalidation

```
ArmyListDetailSheet (user adds unit to list)
    ↓
useAddUnitToList() mutation fires
    ↓
onSuccess: invalidate ['army-lists', listId]   ← refreshes detail view
onSuccess: invalidate ['army-lists']            ← refreshes index (total points badge)
    ↓
DO NOT invalidate ['units'] or ['dashboard-stats']
    (army list membership does not affect unit painting state)
```

**Note on FK constraint:** `army_list_units.unit_id` uses `RESTRICT`. Attempting to delete a unit that is in an army list throws a FK error. `useDeleteUnit` in `src/hooks/useUnits.ts` already has a comment acknowledging this and relies on component try/catch + toast. No change needed there.

### Strategy Note Save Flow

```
PlaybookTab form submit
    ↓
useUpsertStrategyNote(unit.id) mutation
    ↓
onSuccess: invalidate ['strategy-note', unit.id]
    ↓
NO invalidation of ['units'] or ['dashboard-stats']
    (strategy notes are not surfaced in dashboard or collection table)
```

## Query Key Conventions

Following the pattern established in `src/hooks/useUnits.ts` and `src/hooks/usePaints.ts`:

| Hook File | Exported Key | Shape |
|-----------|-------------|-------|
| `usePaints.ts` (existing) | `PAINTS_KEY` | `['paints']` |
| `usePaints.ts` (add) | `PAINTS_WITH_RECIPES_KEY` | `['paints-with-recipes']` |
| `useArmyLists.ts` (new) | `ARMY_LISTS_KEY` | `['army-lists']` |
| `useArmyLists.ts` (new) | `ARMY_LIST_KEY(id)` | `['army-lists', id]` |
| `useStrategyNote.ts` (new) | `STRATEGY_NOTE_KEY(unitId)` | `['strategy-note', unitId]` |

**Critical cross-invalidation:** `useCreatePaint`, `useUpdatePaint`, and `useDeletePaint` in `src/hooks/usePaints.ts` currently only invalidate `['paints']`. When `PaintInventoryPage` uses `['paints-with-recipes']`, edits made on the `/paints` CRUD page will NOT refresh the inventory view. Add `qc.invalidateQueries({ queryKey: PAINTS_WITH_RECIPES_KEY })` to all three mutation `onSuccess` handlers.

## Build Order

Dependencies determine order. Schema first, then types, queries, hooks, components, routes.

### Phase A: Schema + Types (no UI dependencies, build first)

1. Write `src-tauri/migrations/002_unit_playbook_stats.sql` — 8 ADD COLUMN statements
2. Register migration version 2 in `src-tauri/src/lib.rs`
3. Write `src/types/strategyNote.ts` — `StrategyNote` interface matching updated table, `UpsertStrategyNoteInput`
4. Write `src/types/armyList.ts` — `ArmyList`, `ArmyListUnit`, `ArmyListWithUnits`, `CreateArmyListInput`
5. Modify `src/types/paint.ts` — add `PaintWithRecipeCount` extending `Paint`

### Phase B: Query Modules (depends on types, no React)

6. Add `getPaintsWithRecipeCount()` to `src/db/queries/paints.ts`
7. Write `src/db/queries/strategyNotes.ts` — `getStrategyNote(unitId)`, `upsertStrategyNote(input)`
8. Write `src/db/queries/armyLists.ts` — `getArmyLists()`, `getArmyListWithUnits(id)`, `createArmyList()`, `updateArmyList()`, `deleteArmyList()`, `addUnitToList()`, `removeUnitFromList()`

### Phase C: Hook Modules (depends on queries)

9. Add `usePaintsWithRecipeCount()` to `src/hooks/usePaints.ts`; add `PAINTS_WITH_RECIPES_KEY` invalidation to all three existing mutation `onSuccess` handlers
10. Write `src/hooks/useStrategyNote.ts` — `useStrategyNote(unitId)`, `useUpsertStrategyNote()`
11. Write `src/hooks/useArmyLists.ts` — `useArmyLists()`, `useArmyListDetail(id)`, `useCreateArmyList()`, `useUpdateArmyList()`, `useDeleteArmyList()`, `useAddUnitToList()`, `useRemoveUnitFromList()`

### Phase D: Unit Playbook Tab (modifies existing component — isolated risk)

12. Write `src/features/units/PlaybookTab.tsx` — stats block grid (6 fields) + text areas for keywords/abilities/strategy fields + save button wired to `useUpsertStrategyNote()`
13. Modify `src/features/units/UnitDetailSheet.tsx` — add Tabs wrapper; "Overview" tab wraps existing content, "Playbook" tab renders `<PlaybookTab unit={unit} />`

**Build PlaybookTab as standalone component first (step 12) before touching UnitDetailSheet (step 13).** This limits blast radius on an existing working component.

### Phase E: Paint Inventory Page (independent of D and F)

14. Write `src/features/paints/PaintInventoryFilters.tsx`
15. Write `src/features/paints/PaintInventoryPage.tsx`
16. Write `src/app/paint-inventory/page.tsx` — thin re-export wrapper following existing pattern

### Phase F: Army List Builder (most new components, build last)

17. Write `src/features/army-lists/ArmyListsEmptyState.tsx`
18. Write `src/features/army-lists/ArmyListSheet.tsx` — create/edit list name, faction, points limit, list type, notes
19. Write `src/features/army-lists/ArmyListDeleteDialog.tsx`
20. Write `src/features/army-lists/ArmyListUnitRow.tsx` — displays unit name, points, painted %, remove button
21. Write `src/features/army-lists/ArmyListDetailSheet.tsx` — unit picker (reuses `useUnits()` data), unit rows, computed totals
22. Write `src/features/army-lists/ArmyListsPage.tsx`
23. Write `src/app/army-lists/page.tsx` — thin re-export wrapper

### Phase G: Router and Sidebar Wiring (build last — avoids broken imports during construction)

24. Modify `src/app/router.tsx` — add `paintInventoryRoute` and `armyListsRoute`
25. Modify `src/components/common/AppSidebar.tsx` — add nav entries for "Paint Inventory" and "Army Lists"

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `PlaybookTab` inside `UnitDetailSheet` | Receives `unit: Unit` as prop; fetches own strategy note via `useStrategyNote(unit.id)` | Do not pass strategy note data from UnitDetailSheet — avoids unnecessary DB call when tab not visible |
| `ArmyListDetailSheet` unit picker | Uses existing `useUnits()` hook (no new query) | Reuses `UNITS_KEY` cache already populated by Collection page visit |
| Paint Inventory page vs Paint CRUD page | Separate routes, separate hook functions, shared invalidation | `usePaints.ts` mutations must invalidate both `['paints']` and `['paints-with-recipes']` |
| `PlaybookTab` save vs `UnitDetailSheet` data | Strategy note upsert does NOT invalidate `['units']` | Stats block is separate from unit collection fields — no cross-invalidation needed |

### Cross-Feature Invalidation Summary

| Mutation | Currently Invalidates | Must Also Invalidate After v1.1 |
|----------|----------------------|--------------------------------|
| `useCreatePaint.onSuccess` | `['paints']` | `['paints-with-recipes']` |
| `useUpdatePaint.onSuccess` | `['paints']`, `['paints', id]` | `['paints-with-recipes']` |
| `useDeletePaint.onSuccess` | `['paints']` | `['paints-with-recipes']` |
| All other existing mutations | No change | No change |

## Anti-Patterns

### Anti-Pattern 1: Replacing `/paints` with `/paint-inventory`

**What to avoid:** Redirecting `/paints` to `/paint-inventory` or merging both purposes into one page.

**Why:** The recipe builder `PaintCombobox` component and the `PaintSheet` add/edit flow both exist in the mental model of "managing the paint catalog." The inventory page serves a different workflow: browsing what you own. Merging them creates a page that does two jobs poorly.

**Do instead:** Keep `/paints` as-is for CRUD. Add `/paint-inventory` for browsing. Sidebar can label `/paint-inventory` as the primary entry point, with `/paints` remaining accessible.

### Anti-Pattern 2: Fetching strategy note in UnitDetailSheet

**What to avoid:** Adding `useStrategyNote(unit?.id)` to `UnitDetailSheet` and passing the result as a prop to `PlaybookTab`.

**Why:** Forces a strategy note DB call on every unit drawer open, even when the user never touches the Playbook tab. Also couples UnitDetailSheet to strategy note data it doesn't need.

**Do instead:** Let `PlaybookTab` own its own `useStrategyNote(unit.id)` call. TanStack Query fetches only when the tab renders, caches the result for the session.

### Anti-Pattern 3: Storing computed army list totals in the database

**What to avoid:** Adding `total_points`, `painted_points`, `battle_ready_pct` columns to `army_lists` and updating them via triggers or additional mutation steps.

**Why:** These values go stale the moment a unit's `painting_percentage` changes from the Collection page or Kanban board. Synchronizing derived state across two mutation paths is a reliability bug waiting to happen.

**Do instead:** Compute totals in `ArmyListDetailSheet` from the joined `ArmyListWithUnits` data. A realistic army list has 10-30 units — computation is instantaneous.

### Anti-Pattern 4: Forgetting cross-invalidation for PaintWithRecipeCount

**What to avoid:** Adding `usePaintsWithRecipeCount()` with query key `['paints-with-recipes']` but not updating the existing paint mutation `onSuccess` handlers to also invalidate that key.

**Why:** A user edits a paint on `/paints`, then navigates to `/paint-inventory` — they see stale recipe count data from the cache. The inventory feels broken.

**Do instead:** Immediately add the `['paints-with-recipes']` invalidation to all three paint mutation hooks when adding `usePaintsWithRecipeCount`. This is a three-line change in `src/hooks/usePaints.ts`.

## Sources

- Direct audit: `src-tauri/migrations/001_core_schema.sql` — schema facts (HIGH confidence)
- Direct audit: `src/db/queries/paints.ts` — existing query function signatures (HIGH confidence)
- Direct audit: `src/hooks/usePaints.ts`, `src/hooks/useUnits.ts` — hook patterns and query keys (HIGH confidence)
- Direct audit: `src/features/units/UnitDetailSheet.tsx` — component structure for tab integration (HIGH confidence)
- Direct audit: `src/app/router.tsx` — route tree shape and import patterns (HIGH confidence)
- Direct audit: `src/components/common/AppSidebar.tsx` — nav entry pattern (HIGH confidence)

---
*Architecture research for: HobbyForge v1.1 — Paint Inventory, Army List Builder, Unit Playbook*
*Researched: 2026-05-01*
