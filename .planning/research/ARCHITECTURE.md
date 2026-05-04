# Architecture Patterns

**Domain:** HobbyForge v2.2 — Full Circle (10 new features)
**Researched:** 2026-05-04
**Confidence:** HIGH — based on direct codebase audit of all existing query/hook/migration/type files

---

## System Overview

Architecture is fully established and non-negotiable. All new features plug into the same stack:

```
Components → hooks (useQuery/useMutation) → db/queries/*.ts → SQLite via tauri-plugin-sql
Ephemeral UI state → Zustand stores
Persistent UI state → localStorage via Zustand persist
Cache invalidation → queryClient.invalidateQueries on mutation onSuccess
```

---

## Feature Classification: New Tables vs. Derived Queries

| Feature | Schema Change | New Query Module | New Hook | New Page/Component |
|---------|--------------|-----------------|----------|-------------------|
| Battle Log | NEW TABLE `battle_logs` (already in schema 001, zero-row) | NEW `src/db/queries/battleLogs.ts` | NEW `useBattleLogs.ts` | NEW `BattleLogPage` |
| Wishlist / To-Buy | NEW TABLE `wishlist_items` | NEW `src/db/queries/wishlist.ts` | NEW `useWishlist.ts` | NEW `WishlistPage` |
| Hobby Goals | NEW TABLE `hobby_goals` | NEW `src/db/queries/hobbyGoals.ts` | NEW `useHobbyGoals.ts` | NEW section on Dashboard or dedicated page |
| Hobby Velocity Tracker | No new tables — derives from `painting_sessions` | EXTEND `src/db/queries/spending.ts` or NEW `src/db/queries/analytics.ts` | NEW `useHobbyAnalytics.ts` | NEW section/widget |
| Spend Over Time chart | No new tables — derives from `units.purchase_price_pence` + `units.purchase_date` | EXTEND `src/db/queries/spending.ts` | EXTEND `useSpendingStats.ts` or NEW export | NEW `SpendOverTimeChart` component |
| Painting Streak | No new tables — derives from `painting_sessions.session_date` | Same analytics query module | Same analytics hook | NEW `PaintingStreakWidget` |
| Ready-to-Play Quick View | No new tables — filter on `units` + `army_lists` | Reuse `getUnits` + filter in JS, or new `getReadyToPlayUnits` query | Reuse `useUnits` with derived filter, or NEW `useReadyToPlay.ts` | NEW `ReadyToPlayPage` or tab on Collection |
| Showcase Mode | No new tables — filter `units` where `status_painting = 'Completed'` | Reuse existing | Reuse `useUnits` | NEW `ShowcasePage` or `ShowcaseMode` view mode on Collection |
| Custom Lore notes | ALTER TABLE `factions` ADD `lore_notes TEXT` + ALTER TABLE `units` ADD `lore_notes TEXT` | Extend existing `getUnitById` / `getFactionById` queries — no new module | Extend existing `useUnit` / `useFactions` type interface | Extend `UnitDetailSheet` + `FactionSheet` |
| Undercoat Log | ALTER TABLE `units` ADD `undercoat TEXT` (nullable enum: "None", "White", "Black", "Grey", "Contrast", "Other") | Extend existing `units.ts` query — new column in SELECT/INSERT/UPDATE | Extend existing `useUnits` type interface | Extend `UnitSheet` (create/edit form) + `UnitDetailSheet` |

---

## Migration 007

Next migration number is 007 (006 was `006_spend_pence.sql`).

**File:** `src-tauri/migrations/007_full_circle.sql`

### New Tables

```sql
-- 007_full_circle.sql — HobbyForge v2.2 Full Circle
-- Additive only. No destructive statements.

-- battle_logs already exists in 001_core_schema.sql (zero rows).
-- No CREATE needed. Confirm row count = 0 before phase begins.

-- wishlist_items: models the user wants to buy before they are in the collection
CREATE TABLE IF NOT EXISTS wishlist_items (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    faction_id           INTEGER REFERENCES factions(id) ON DELETE SET NULL,
    name                 TEXT    NOT NULL,
    unit_type            TEXT,                        -- e.g. "Infantry", "Vehicle"
    priority             INTEGER NOT NULL DEFAULT 2,  -- 1=High, 2=Medium, 3=Low
    estimated_cost_pence INTEGER,                     -- integer pence, nullable
    notes                TEXT,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- hobby_goals: user-defined painting / session targets with a timeframe
CREATE TABLE IF NOT EXISTS hobby_goals (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    category     TEXT    NOT NULL DEFAULT 'units',    -- 'units' | 'sessions'
    target_count INTEGER NOT NULL,
    timeframe    TEXT    NOT NULL,                    -- 'monthly' | 'quarterly' | 'yearly' | custom ISO date
    start_date   TEXT    NOT NULL DEFAULT (date('now')),
    end_date     TEXT,                                -- nullable; derived from timeframe on creation
    notes        TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### ALTER TABLE Additions (units)

```sql
-- Undercoat Log: primer/undercoat type used per unit
ALTER TABLE units ADD COLUMN undercoat TEXT;

-- Custom Lore notes per unit
ALTER TABLE units ADD COLUMN lore_notes TEXT;
```

### ALTER TABLE Additions (factions)

```sql
-- Custom Lore notes per faction
ALTER TABLE factions ADD COLUMN lore_notes TEXT;
```

### battle_logs status

`battle_logs` was defined in `001_core_schema.sql` and has never been written to. It already has the correct schema (army_list_id FK, battle_date, opponent, opponent_faction, mission, points_played, result, my_score, opponent_score, mvp_unit_id, underperforming_unit_id, lessons_learned, changes_next_time, notes). No migration work needed — just build the query module and hook.

---

## Feature-by-Feature Integration Details

### 1. Battle Log

**Schema:** Uses existing `battle_logs` table from `001_core_schema.sql`. Zero additional migration.

**New file: `src/db/queries/battleLogs.ts`**
```typescript
getBattleLogs(): Promise<BattleLog[]>          // SELECT * ORDER BY battle_date DESC
getBattleLogById(id): Promise<BattleLog | null>
createBattleLog(input): Promise<number>
updateBattleLog(input): Promise<void>
deleteBattleLog(id): Promise<void>
// Stat aggregates for dashboard widget:
getBattleStats(): Promise<{ wins: number; losses: number; draws: number; total: number }>
```

**New file: `src/hooks/useBattleLogs.ts`**
- `BATTLE_LOGS_KEY = ["battle-logs"]`
- `useBattleLogs()` — useQuery
- `useBattleStats()` — useQuery for win/loss/draw stat card
- `useCreateBattleLog()` — useMutation, invalidates `["battle-logs"]` and `["battle-stats"]`
- `useUpdateBattleLog()` — useMutation, invalidates same
- `useDeleteBattleLog()` — useMutation, invalidates same

**New files in `src/features/battle-log/`:**
- `BattleLogPage.tsx` — list of games with stat summary (W/L/D)
- `BattleLogSheet.tsx` — create/edit form (sibling portal pattern)
- `BattleLogDeleteDialog.tsx` — confirm delete
- `BattleLogRow.tsx` — single game row (date, opponent faction, mission, result, score)
- `BattleStatsSummary.tsx` — W/L/D counter cards at top of page
- `battleLogSchema.ts` — Zod validation schema for the form

**Route:** `/battle-log` — add to `router.tsx` and `AppSidebar.tsx` (Lucide `Swords` icon is already imported, use `Trophy` for battle log instead to avoid conflict).

**Type: `src/types/battleLog.ts`** — mirrors `battle_logs` table columns.

**invalidation contract:** `useDeleteUnit.onSuccess` already cascades via FK `ON DELETE SET NULL` — no new invalidations needed on unit delete. `useDeleteArmyList.onSuccess` similarly uses `ON DELETE SET NULL` — battle logs survive list deletion.

---

### 2. Wishlist / To-Buy

**Schema:** New `wishlist_items` table via migration 007.

**New file: `src/db/queries/wishlist.ts`**
```typescript
getWishlistItems(): Promise<WishlistItem[]>
createWishlistItem(input): Promise<number>
updateWishlistItem(input): Promise<void>
deleteWishlistItem(id): Promise<void>
```

**New file: `src/hooks/useWishlist.ts`**
- `WISHLIST_KEY = ["wishlist"]`
- `useWishlistItems()` — useQuery
- `useCreateWishlistItem()`, `useUpdateWishlistItem()`, `useDeleteWishlistItem()` — invalidate `["wishlist"]`

**New files in `src/features/wishlist/`:**
- `WishlistPage.tsx` — sortable table of wishlist items
- `WishlistSheet.tsx` — create/edit form (faction picker, name, unit_type, priority, estimated_cost_pence, notes)
- `WishlistDeleteDialog.tsx`
- `WishlistRow.tsx` — single row with priority badge, faction badge, estimated cost display
- `wishlistFilters.ts` — Zustand ephemeral filter state (priority filter, faction filter)
- `wishlistSchema.ts` — Zod schema

**Route:** `/wishlist` — add to router and sidebar nav (Lucide `ShoppingCart` icon).

**Type: `src/types/wishlistItem.ts`** — mirrors table columns. `estimated_cost_pence: number | null` (pence, never float).

**Display:** Format estimated costs as currency (reuse existing `formatPence` utility if one exists, otherwise create `src/lib/formatCurrency.ts`).

---

### 3. Hobby Goals

**Schema:** New `hobby_goals` table via migration 007.

**New file: `src/db/queries/hobbyGoals.ts`**
```typescript
getHobbyGoals(): Promise<HobbyGoal[]>
createHobbyGoal(input): Promise<number>
updateHobbyGoal(input): Promise<void>
deleteHobbyGoal(id): Promise<void>
```

**Progress is always derived — never stored.** For `category = 'units'`, progress = count of units with `status_painting = 'Completed'` whose `updated_at` falls within `[start_date, end_date]`. For `category = 'sessions'`, progress = count of `painting_sessions` whose `session_date` falls within the goal's timeframe. Both computations run in JS (pure function pattern matching `computeStats`/`computeSpendingStats`).

**New file: `src/hooks/useHobbyGoals.ts`**
- `HOBBY_GOALS_KEY = ["hobby-goals"]`
- `useHobbyGoals()` — useQuery
- mutations invalidate `["hobby-goals"]`
- Goals page also needs `useUnits()` and a cross-query for sessions to compute progress

**New compute function: `src/features/hobby-goals/computeGoalProgress.ts`** (pure function, testable)
```typescript
computeGoalProgress(goal: HobbyGoal, units: Unit[], sessions: PaintingSession[]): {
  current: number;
  target: number;
  pct: number;
  onTrack: boolean;
}
```

**New files in `src/features/hobby-goals/`:**
- `HobbyGoalsPage.tsx` — list of goals with progress bars
- `GoalSheet.tsx` — create/edit form (title, category, target_count, timeframe, start_date)
- `GoalCard.tsx` — single goal with progress bar + on-track indicator
- `hobbyGoalSchema.ts` — Zod schema

**Route:** `/goals` — add to router and sidebar nav (Lucide `Target` icon).

**Cross-query dependency:** Goals page needs painting sessions across ALL units (not per-unit like `useJournalSessions` which is scoped per unitId). This requires a new global sessions query.

**New function in `src/db/queries/paintingSessions.ts`:**
```typescript
getAllSessions(): Promise<PaintingSession[]>
// SELECT * FROM painting_sessions ORDER BY session_date DESC
```

**New hook export from `src/hooks/useJournalSessions.ts`:**
```typescript
export const ALL_SESSIONS_KEY = ["painting-sessions"] as const;
export function useAllSessions(): ...
```

---

### 4. Hobby Velocity Tracker

**Schema:** No new tables. Derives from `painting_sessions`.

**Pattern:** Same as `computeSpendingStats` — raw data from DB, computation in a pure function.

**New file: `src/db/queries/analytics.ts`**
```typescript
getAnalyticsData(): Promise<{
  sessions: PaintingSession[];   // all sessions for velocity/streak
  units: Unit[];                 // for pile-of-shame count
}>
// Uses Promise.all like dashboard.ts / spending.ts
```

**New compute function: `src/features/analytics/computeVelocity.ts`**
```typescript
computeVelocity(sessions: PaintingSession[], units: Unit[]): {
  unitsPerMonth: number;       // sessions in last 30 days / avg duration → painted units rate
  pileOfShameCount: number;    // units with status_painting !== 'Completed'
  projectedCompletionDays: number | null;  // pile / velocity, null if velocity=0
  sessionsLast30Days: number;
  avgSessionMinutes: number;
}
```

**New hook: `src/hooks/useHobbyAnalytics.ts`**
- `HOBBY_ANALYTICS_KEY = ["hobby-analytics"]`
- `useHobbyVelocity()` — calls `getAnalyticsData()`, runs through `computeVelocity()`
- `usePaintingStreak()` — calls same raw data, runs through `computeStreak()` (see feature 6)
- Invalidated by: `useCreatePaintingSession().onSuccess`, `useDeletePaintingSession().onSuccess`, `useUpdateUnit().onSuccess`

**Placement:** Velocity widget renders on the Dashboard as a stat card group, or on a dedicated `/analytics` page shared with Spend Over Time and Painting Streak.

---

### 5. Spend Over Time Chart

**Schema:** No new tables. Derives from `units.purchase_price_pence` and `units.purchase_date`, plus `paints.purchase_price_pence` and `paints.purchase_date` (if that column exists — check migration 006; it adds `purchase_price_pence` to paints but the `purchase_date` column may not exist on paints).

**Check:** `001_core_schema.sql` has `purchase_date TEXT` on `units` only. Paints have no `purchase_date`. For the chart, units-by-month data is reliable; paints may show as a single aggregate if no date is stored. Scope to units-only for v2.2 to avoid gaps.

**New compute function: `src/features/spending/computeSpendOverTime.ts`**
```typescript
export interface MonthlySpend {
  month: string;      // "2026-01" ISO format
  pence: number;
}
computeSpendOverTime(units: Unit[]): MonthlySpend[]
// Groups purchase_price_pence by month(purchase_date), sorted oldest-first
// Units with null purchase_date are excluded from the chart (not from total)
```

**Extend `src/db/queries/spending.ts`:**
```typescript
// Already returns Unit[] with purchase_price_pence. No new query needed.
// computeSpendOverTime takes the existing units array.
```

**New component: `src/features/spending/SpendOverTimeChart.tsx`**
- Receives `MonthlySpend[]`
- Renders a bar chart using shadcn/ui's Recharts-based chart components (already in project as `src/components/ui/chart.tsx` if added, or plain `recharts` if installed)
- Falls back to a simple table if Recharts not available

**Chart library check:** shadcn/ui new-york ships a `chart` component wrapping Recharts. Verify `src/components/ui/chart.tsx` exists before assuming. If not present, add it via shadcn CLI (`npx shadcn@latest add chart`) — Recharts is a peer dependency. Alternatively, render a pure CSS bar chart for v2.2 to avoid adding a dependency.

**Placement:** New section on `SpendingPage` below the existing faction breakdown, or a separate tab within the spending page.

**Invalidation:** `useSpendingStats` already invalidated by `useCreateUnit`/`useUpdateUnit`/`useDeleteUnit`. The chart component can reuse the same data from `useSpendingStats` extended to include the time-series array.

---

### 6. Painting Streak

**Schema:** No new tables. Derives from `painting_sessions.session_date`.

**New compute function: `src/features/analytics/computeStreak.ts`**
```typescript
computeStreak(sessions: PaintingSession[]): {
  currentStreak: number;    // consecutive days with at least 1 session up to today
  longestStreak: number;    // all-time longest
  lastSessionDate: string | null;
}
// Input: all sessions (not per-unit). Algorithm: deduplicate by date, sort desc, count consecutive days
```

**Hook:** Reuse `useHobbyAnalytics.ts` — `usePaintingStreak()` calls `getAnalyticsData()` and runs `computeStreak()`.

**New component: `src/features/analytics/PaintingStreakWidget.tsx`**
- Shows current streak count + flame icon
- Renders on Dashboard (as a stat card) or on the analytics page

**Invalidation:** Same as velocity — `useCreatePaintingSession().onSuccess` must invalidate `["hobby-analytics"]`. Add this to the existing mutation's `onSuccess` in `useJournalSessions.ts`.

---

### 7. Ready-to-Play Quick View

**Schema:** No new tables. Filters existing `units` data.

**Definition:** A unit is "ready to play" when `status_painting = 'Completed'` AND `status_assembly = 1` AND `status_basing = 1`. Optionally filter by `points <= N` for a points budget.

**Approach:** New page that calls `useUnits()` (already cached) and filters client-side.

**New compute function: `src/features/units/applyReadyToPlayFilter.ts`**
```typescript
applyReadyToPlayFilter(units: Unit[], maxPoints: number | null): Unit[]
// Filter: status_painting === 'Completed' && status_assembly === 1 && status_basing === 1
// Optional: && (points ?? 0) <= maxPoints
```

**New page: `src/features/units/ReadyToPlayPage.tsx`**
- Reuses `useUnits()` — no new data fetch
- Points limit input (Zustand ephemeral store)
- Renders the existing `UnitTable` or `UnitGallery` with ready-to-play filtered results
- Summary: total points available for play, count of units

**Zustand store: `src/features/units/readyToPlayFilters.ts`**
- `maxPoints: number | null`
- `factionId: number | null`

**Route:** `/ready-to-play` — add to router and sidebar nav (Lucide `CheckSquare` icon).

**This page does NOT need a new query module.** It reuses the `["units"]` cache.

---

### 8. Showcase Mode

**Schema:** No new tables. Filters `units` where `status_painting = 'Completed'` and shows main_image_path / unit photos.

**Two implementation options:**

Option A: Separate route `/showcase` with a full-screen gallery (recommended for v2.2).
Option B: A toggle on the Collection page's gallery view.

**Recommendation:** Separate route. Showcase is a distinct UX context (club night display, dark background, large images, minimal chrome) — not a filter state on Collection.

**New files in `src/features/showcase/`:**
- `ShowcasePage.tsx` — full-screen dark gallery of painted units
- `ShowcaseCard.tsx` — large unit card: main_image_path, unit name, faction badge
- `ShowcaseEmptyState.tsx`

**Data:** Reuses `useUnits()` (already cached). Filters client-side to `status_painting = 'Completed'`. For images, reuses existing `main_image_path` column on units. Does NOT need `useUnitPhotos`.

**Route:** `/showcase` — add to router. May NOT need a sidebar nav entry (it's a display mode, not a management page). Can be triggered from Collection page header as a button: "Open Showcase" → navigates to `/showcase`.

**UX note:** Showcase should suppress the sidebar (full-screen mode). Implement by checking the current route in `AppLayout` and conditionally hiding the sidebar when on `/showcase`. This is a layout concern, not a data concern.

---

### 9. Custom Lore Notes

**Schema:** ALTER TABLE `units` ADD COLUMN `lore_notes TEXT` + ALTER TABLE `factions` ADD COLUMN `lore_notes TEXT` (migration 007).

**No new query modules.** Extend existing queries:

**`src/db/queries/units.ts`:** Add `lore_notes` to:
- `getUnits()` SELECT (already `SELECT *` — no change needed)
- `getUnitById()` SELECT (already `SELECT *` — no change needed)
- `createUnit()` INSERT columns list and values
- `updateUnit()` SET clause (use raw assignment, NOT COALESCE — lore_notes must be clearable to NULL)

**`src/db/queries/factions.ts`:** Same extension pattern.

**`src/types/unit.ts`:** Add `lore_notes: string | null` to `Unit` interface and `CreateUnitInput` / `UpdateUnitInput`.

**`src/types/faction.ts`:** Add `lore_notes: string | null` to `Faction` interface and input types.

**UI changes:**
- `UnitDetailSheet.tsx` — add a "Lore" tab (alongside existing tabs) with a `<Textarea>` for lore_notes. Save via `useUpdateUnit()`.
- `FactionSheet.tsx` — add a lore_notes `<Textarea>` field to the faction form. Save via `useUpdateFaction()`.

**No new hooks needed.** Existing `useUnit`, `useUpdateUnit`, `useFactions`, `useUpdateFaction` automatically pick up the new column once types are updated.

---

### 10. Undercoat Log

**Schema:** ALTER TABLE `units` ADD COLUMN `undercoat TEXT` (migration 007). Nullable. Enum values in TypeScript, free text in DB (do not use CHECK constraints — SQLite CHECK is not enforced before 3.25 and this avoids migration brittleness).

**TypeScript enum:**
```typescript
// src/types/unit.ts
export const UNDERCOAT_OPTIONS = [
  "None",
  "White",
  "Black",
  "Grey",
  "Contrast",
  "Other",
] as const;
export type Undercoat = typeof UNDERCOAT_OPTIONS[number];
```

**No new query modules.** Same extension pattern as lore_notes:
- Add `undercoat` to `Unit` interface as `undercoat: Undercoat | null`
- `createUnit()` and `updateUnit()` in `units.ts` get `undercoat` column (use raw assignment, NOT COALESCE — must be clearable)

**UI changes:**
- `UnitSheet.tsx` (create/edit form) — add `undercoat` select dropdown using `UNDERCOAT_OPTIONS`
- `UnitDetailSheet.tsx` — display undercoat in the unit details section (read-only badge or editable inline)
- `CollectionPage.tsx` / `UnitTableColumns.tsx` — optionally add undercoat column to table (can defer to polish)

**No new hooks needed.**

---

## New File Inventory

### New DB Migration

```
src-tauri/migrations/
└── 007_full_circle.sql     NEW — wishlist_items, hobby_goals tables; ALTER TABLE units/factions
```

### New Query Modules

```
src/db/queries/
├── battleLogs.ts           NEW — CRUD + stat aggregate for battle_logs table
├── wishlist.ts             NEW — CRUD for wishlist_items table
├── hobbyGoals.ts           NEW — CRUD for hobby_goals table
└── analytics.ts            NEW — getAnalyticsData() fetching sessions + units for velocity/streak
```

Note: `paintingSessions.ts` gains `getAllSessions()` export. `spending.ts` remains unchanged (chart uses existing data).

### New Hooks

```
src/hooks/
├── useBattleLogs.ts        NEW — useBattleLogs, useBattleStats, useCreate/Update/DeleteBattleLog
├── useWishlist.ts          NEW — useWishlistItems, useCreate/Update/DeleteWishlistItem
├── useHobbyGoals.ts        NEW — useHobbyGoals, useCreate/Update/DeleteHobbyGoal
└── useHobbyAnalytics.ts    NEW — useHobbyVelocity, usePaintingStreak (both call analytics query)
```

Note: `useJournalSessions.ts` gains `useAllSessions()` export for goals + streak.

### Modified Hooks (invalidation additions)

```
src/hooks/
├── useJournalSessions.ts   MODIFY — useCreatePaintingSession/useDeletePaintingSession.onSuccess must
│                                    also invalidate ["hobby-analytics"] and ["hobby-goals"]
└── useUnits.ts             MODIFY — useUpdateUnit.onSuccess must also invalidate ["hobby-analytics"]
```

### New Type Files

```
src/types/
├── battleLog.ts            NEW — BattleLog, CreateBattleLogInput, UpdateBattleLogInput
├── wishlistItem.ts         NEW — WishlistItem, CreateWishlistItemInput, UpdateWishlistItemInput
└── hobbyGoal.ts            NEW — HobbyGoal, CreateHobbyGoalInput, UpdateHobbyGoalInput
```

### Modified Type Files

```
src/types/
├── unit.ts                 MODIFY — add lore_notes, undercoat fields + UNDERCOAT_OPTIONS const
└── faction.ts              MODIFY — add lore_notes field
```

### New Feature Folders

```
src/features/
├── battle-log/             NEW — BattleLogPage, BattleLogSheet, BattleLogRow, BattleStatsSummary
├── wishlist/               NEW — WishlistPage, WishlistSheet, WishlistRow, wishlistFilters store
├── hobby-goals/            NEW — HobbyGoalsPage, GoalSheet, GoalCard, computeGoalProgress.ts
├── analytics/              NEW — computeVelocity.ts, computeStreak.ts, PaintingStreakWidget, VelocityWidget
└── showcase/               NEW — ShowcasePage, ShowcaseCard, ShowcaseEmptyState
```

### Modified Feature Files

```
src/features/
├── spending/
│   └── computeSpendOverTime.ts         NEW pure function
│   └── SpendOverTimeChart.tsx          NEW chart component, added to SpendingPage
├── units/
│   ├── applyReadyToPlayFilter.ts       NEW pure function
│   ├── ReadyToPlayPage.tsx             NEW page
│   ├── UnitSheet.tsx                   MODIFY — add undercoat field
│   └── UnitDetailSheet.tsx             MODIFY — add lore_notes tab, undercoat display
└── factions/
    └── FactionSheet.tsx                MODIFY — add lore_notes textarea
```

### Router and Sidebar

```
src/app/router.tsx          MODIFY — add routes: /battle-log, /wishlist, /goals, /ready-to-play, /showcase, /analytics
src/components/common/AppSidebar.tsx  MODIFY — add nav entries for new pages (omit /showcase from nav)
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `BattleLogPage` | List + stat summary for all games | `useBattleLogs`, `useBattleStats`, sibling `BattleLogSheet` |
| `BattleLogSheet` | Create/edit a game entry | `useCreateBattleLog`, `useUpdateBattleLog`; needs `useArmyLists` for army picker |
| `WishlistPage` | Wishlist item list with filters | `useWishlistItems`, `useFactions`, sibling `WishlistSheet` |
| `HobbyGoalsPage` | Goals with live progress bars | `useHobbyGoals`, `useUnits`, `useAllSessions`, `computeGoalProgress` |
| `ReadyToPlayPage` | Battle-ready unit filter view | `useUnits` (cached), `applyReadyToPlayFilter`, existing `UnitTable`/`UnitGallery` |
| `ShowcasePage` | Full-screen painted unit gallery | `useUnits` (cached, filter client-side), hides sidebar |
| `SpendOverTimeChart` | Monthly spend bar chart | Receives `MonthlySpend[]` as prop from `SpendingPage` |
| `PaintingStreakWidget` | Current streak display | `usePaintingStreak` |
| `VelocityWidget` | Pace + pile projection | `useHobbyVelocity` |
| `GoalCard` | Single goal progress bar | Receives `HobbyGoal + progress` as props from `HobbyGoalsPage` |

---

## Patterns to Follow

### Pattern 1: Pure Compute Functions (established — mandatory)

All aggregation lives in a testable pure function, never in hooks or components.

```
getAnalyticsData() → raw { sessions, units }
                ↓
useHobbyAnalytics() → calls queryFn → passes to computeVelocity() / computeStreak()
                ↓
Widget receives typed result as prop
```

New compute files: `computeVelocity.ts`, `computeStreak.ts`, `computeSpendOverTime.ts`, `computeGoalProgress.ts`.

### Pattern 2: Sibling Portal Pattern for Sheets/Dialogs (mandatory)

All new Sheets and Dialogs must follow the established sibling portal pattern. Never nest a Sheet inside another Sheet. All new pages follow the `selectedItemId` pattern: store the selected ID in local state, derive the full item from the query cache.

### Pattern 3: Shared Analytics Query Module

`useHobbyVelocity` and `usePaintingStreak` both need all painting sessions + all units. Both must read from the SAME `["hobby-analytics"]` query key to share the TanStack Query cache. Both hooks call `getAnalyticsData()` with the same cache key — TanStack Query deduplicates concurrent calls. Do NOT create separate query keys for velocity vs. streak — they share data.

### Pattern 4: Clearable Columns Use Raw Assignment (not COALESCE)

The existing `updateUnit` uses `COALESCE($N, column)` for most columns — this prevents nullifying a field when only updating some fields. However, for new text fields (`lore_notes`, `undercoat`, `notes`), users must be able to clear them back to NULL. Use raw assignment for these:

```sql
lore_notes = $N,   -- NOT COALESCE($N, lore_notes)
undercoat  = $N,   -- NOT COALESCE($N, undercoat)
```

This is consistent with how `purchase_price_pence = $18` is already implemented (raw, not COALESCE — because it must be clearable to NULL).

### Pattern 5: 0|1 Integer Booleans (established — mandatory)

No new boolean columns are added in v2.2. All new tables use INTEGER priority (1/2/3) and TEXT enums — no boolean pitfall risk for the new tables.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Per-Unit Session Hook for Cross-Cutting Analytics

`useJournalSessions(unitId)` is scoped per unit and is the right hook for the Journal tab on a unit sheet. For analytics (streak, velocity, goals), you need ALL sessions across all units. Do NOT call `useJournalSessions` in a loop over all units — this creates N parallel queries and N cache entries.

**Instead:** Add `getAllSessions()` to `paintingSessions.ts` and `useAllSessions()` to `useJournalSessions.ts`. Use a single `["painting-sessions"]` (no unitId) cache key for the global view.

### Anti-Pattern 2: Battle Stats in a Separate DB Round-Trip

Win/loss/draw counts for the battle stats widget are trivially derivable from the full `battle_logs` array. Do NOT write a separate `getBattleStats()` aggregate SQL query.

**Instead:** Compute stats as a pure function from the existing `useBattleLogs()` data. Only add a `getBattleStats()` SQL aggregate if the battle log grows to hundreds of rows (unlikely for a personal tool).

### Anti-Pattern 3: Storing Goal Progress in the DB

Goal progress changes whenever a unit's painting status changes or a new session is logged. Storing it would require invalidation on every painting mutation.

**Instead:** Derive progress at read time via `computeGoalProgress(goal, units, sessions)`. Pure function, no storage.

### Anti-Pattern 4: Showcase Page Embedded in Collection Page

The Gallery view toggle on Collection is for navigation-style browsing. Showcase Mode is a distinct UX context (full-screen, club night display, no sidebar). Mixing them adds conditional complexity to `CollectionPage`.

**Instead:** Separate `/showcase` route. Link to it from Collection header ("Open Showcase" button). `CollectionPage` stays clean.

### Anti-Pattern 5: Recharts Installed Without Checking shadcn chart Component

HobbyForge already uses shadcn/ui new-york. The shadcn `chart` component wraps Recharts with consistent theming. Adding Recharts directly (bypassing shadcn's wrapper) produces inconsistent dark-mode styling.

**Instead:** Run `npx shadcn@latest add chart` if `src/components/ui/chart.tsx` does not yet exist. Use the shadcn `ChartContainer` / `ChartTooltip` wrappers for `SpendOverTimeChart`. If chart component is unavailable, a plain CSS bar chart is preferable to a raw Recharts install.

---

## Suggested Build Order (Phase Groupings)

Dependencies and risk profile drive order.

### Phase 17: Schema + Simple Column Extensions (migration foundation)

Build first — all other features depend on the DB being ready.

1. Write `007_full_circle.sql` — new tables + ALTER TABLE columns
2. Register migration 007 in `lib.rs`
3. Add `lore_notes` and `undercoat` to `src/types/unit.ts` + extend `units.ts` queries + `UnitSheet.tsx` / `UnitDetailSheet.tsx`
4. Add `lore_notes` to `src/types/faction.ts` + extend `factions.ts` queries + `FactionSheet.tsx`
5. Tests for the type extensions (ensure `Unit` and `Faction` interfaces are complete)

**Rationale:** Migration + lore/undercoat are low-risk, high-leverage. Running the migration first unblocks every other feature. Lore notes and undercoat are pure extensions to existing CRUD forms — lowest complexity in the milestone.

### Phase 18: Battle Log (independent entity, fullest CRUD feature)

1. `src/types/battleLog.ts`
2. `src/db/queries/battleLogs.ts`
3. `src/hooks/useBattleLogs.ts`
4. `src/features/battle-log/` — full page + sheet + delete dialog
5. Route `/battle-log` + sidebar nav entry

**Rationale:** Battle Log uses the pre-existing `battle_logs` table (zero new schema). It is the largest new CRUD feature. Building it second validates the full query → hook → page pattern for a new entity before building wishlist and goals.

### Phase 19: Wishlist (simpler CRUD, new table)

1. `src/types/wishlistItem.ts`
2. `src/db/queries/wishlist.ts`
3. `src/hooks/useWishlist.ts`
4. `src/features/wishlist/` — page + sheet + delete dialog + filters
5. Route `/wishlist` + sidebar nav entry

**Rationale:** Wishlist is structurally identical to Battle Log (CRUD entity, independent table). After Phase 18 has validated the pattern, Phase 19 is faster to build.

### Phase 20: Analytics (Velocity + Streak + Spend Chart)

Group velocity, streak, and spend chart together — they share the analytics query module and the compute-function-then-widget architecture.

1. `getAllSessions()` in `paintingSessions.ts` + `useAllSessions()` in `useJournalSessions.ts`
2. `src/db/queries/analytics.ts` — `getAnalyticsData()`
3. `src/hooks/useHobbyAnalytics.ts` — `useHobbyVelocity`, `usePaintingStreak`
4. `computeVelocity.ts`, `computeStreak.ts` — pure functions + tests
5. `VelocityWidget.tsx`, `PaintingStreakWidget.tsx`
6. `computeSpendOverTime.ts` — pure function + tests
7. `SpendOverTimeChart.tsx` — extend `SpendingPage.tsx` to include chart section
8. Add analytics invalidations to `useJournalSessions.ts` and `useUnits.ts` mutations
9. Route `/analytics` (if analytics warrants its own page) or embed on Dashboard

**Rationale:** All three features pull from existing tables with no new schema. Grouping them minimizes context-switching and allows the analytics query module to be written once and reused.

### Phase 21: Hobby Goals (cross-cutting, depends on analytics infrastructure)

1. `src/types/hobbyGoal.ts`
2. `src/db/queries/hobbyGoals.ts`
3. `src/hooks/useHobbyGoals.ts`
4. `computeGoalProgress.ts` — pure function (uses `useAllSessions` from Phase 20)
5. `src/features/hobby-goals/` — page + goal cards + sheet
6. Route `/goals` + sidebar nav entry

**Rationale:** Goals depend on `useAllSessions` built in Phase 20. Building goals after analytics avoids building the same infrastructure twice.

### Phase 22: Ready-to-Play + Showcase (view-only, no new queries)

1. `applyReadyToPlayFilter.ts` — pure function + tests
2. `ReadyToPlayPage.tsx` — reuses `useUnits`, applies filter
3. Route `/ready-to-play` + sidebar nav entry
4. `ShowcasePage.tsx` — reuses `useUnits`, filters to Completed, full-screen layout
5. Route `/showcase` (no sidebar entry — triggered from Collection header)
6. Sidebar hide logic for `/showcase` route in `AppLayout.tsx`

**Rationale:** Both features are view-only, zero new DB work, zero new query modules. Lightest possible phase. Placed last because they depend on the collection data being stable (which it is from v2.1) and add polish without risk.

---

## Cache Invalidation Contract (complete for v2.2)

| Mutation | Invalidates | Reason |
|----------|-------------|--------|
| `useCreateBattleLog.onSuccess` | `["battle-logs"]` | Battle log list and stats refresh |
| `useUpdateBattleLog.onSuccess` | `["battle-logs"]`, `["battle-logs", id]` | Same |
| `useDeleteBattleLog.onSuccess` | `["battle-logs"]` | Same |
| `useCreateWishlistItem.onSuccess` | `["wishlist"]` | Wishlist list refresh |
| `useUpdateWishlistItem.onSuccess` | `["wishlist"]`, `["wishlist", id]` | Same |
| `useDeleteWishlistItem.onSuccess` | `["wishlist"]` | Same |
| `useCreateHobbyGoal.onSuccess` | `["hobby-goals"]` | Goal list refresh |
| `useUpdateHobbyGoal.onSuccess` | `["hobby-goals"]`, `["hobby-goals", id]` | Same |
| `useDeleteHobbyGoal.onSuccess` | `["hobby-goals"]` | Same |
| `useCreatePaintingSession.onSuccess` (EXTEND) | `["painting-sessions", unitId]` + `["hobby-analytics"]` + `["hobby-goals"]` | Streak/velocity/goals depend on session data |
| `useDeletePaintingSession.onSuccess` (EXTEND) | same as above | Same |
| `useUpdateUnit.onSuccess` (EXTEND) | existing + `["hobby-analytics"]` | Velocity uses pile-of-shame count from units |

---

## Sources

- Direct audit: `src-tauri/migrations/001_core_schema.sql` — `battle_logs` table already defined, zero rows (HIGH confidence)
- Direct audit: `src-tauri/migrations/005_hobby_journal.sql` — `painting_sessions` table structure, confirms `session_date TEXT` (HIGH confidence)
- Direct audit: `src-tauri/migrations/006_spend_pence.sql` — confirms `purchase_price_pence INTEGER` on units + paints; paints have no `purchase_date` column (HIGH confidence)
- Direct audit: `src/db/queries/paintingSessions.ts` — confirms per-unit scoping of existing session queries (HIGH confidence)
- Direct audit: `src/db/queries/spending.ts` — confirms dashboard/compute-function pattern; `Promise.all` parallel selects (HIGH confidence)
- Direct audit: `src/db/queries/dashboard.ts` — confirms `Promise.all` pattern for multi-table fetches (HIGH confidence)
- Direct audit: `src/hooks/useUnits.ts` — confirms cross-query invalidation pattern (DATA-09, SPEND-03/04 contract) (HIGH confidence)
- Direct audit: `src/hooks/useSpendingStats.ts` — confirms query key naming convention and invalidation contract (HIGH confidence)
- Direct audit: `src/hooks/useJournalSessions.ts` — confirms per-unit key pattern; identifies gap for global `useAllSessions` (HIGH confidence)
- Direct audit: `src/features/spending/computeSpendingStats.ts` — confirms pure compute function pattern (HIGH confidence)
- Direct audit: `src/types/unit.ts` — confirms `0|1` boolean pattern, `PAINTING_STATUS_ORDER` const (HIGH confidence)
- Direct audit: `src/app/router.tsx` — confirms TanStack Router pattern for new routes (HIGH confidence)
- Direct audit: `src/components/common/AppSidebar.tsx` — confirms MAIN_NAV structure, existing icon imports (HIGH confidence)

---
*Architecture research for: HobbyForge v2.2 — Full Circle*
*Researched: 2026-05-04*
