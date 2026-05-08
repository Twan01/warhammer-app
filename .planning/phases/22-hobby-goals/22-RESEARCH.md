# Phase 22: Hobby Goals - Research

**Researched:** 2026-05-05
**Domain:** Feature CRUD — Hobby Goals page with SQLite progress query, Card grid UI, Sheet form, section grouping
**Confidence:** HIGH

## Summary

Phase 22 adds a Goals page where users create monthly or quarterly painting targets and see live progress. The progress is a COUNT(DISTINCT unit_id) from `painting_sessions` WHERE `session_date` falls within the goal's fixed period. Because all decisions are locked in CONTEXT.md and all required patterns already exist in the codebase (BattleLogSheet, StatCard progress bar, analytics queries, dates.ts), this phase is pure execution with no exploratory research needed.

The phase requires one new SQL migration (009) creating the `hobby_goals` table, a query module, a React Query hook, a Zod schema, and a Goals page with four UI components. The migration version counter in `lib.rs` must advance from 8 to 9. The `useCreatePaintingSession` mutation must also invalidate the goal-progress query key so that logging a new session immediately refreshes goal cards.

**Primary recommendation:** Follow the BattleLogPage/BattleLogSheet sibling-portal blueprint exactly. The timeframe boundary logic belongs in a pure `computeGoalPeriod()` helper tested without mocks — identical discipline to `computeHobbyAnalytics.ts`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Goal display layout**
- Card-based grid layout, not table or list
- Each goal card shows: goal name, target count, current progress count, timeframe label, progress bar
- Progress bar uses faction-accent fill (consistent with StatCard progress pattern)
- Cards follow existing Card component styling: bg-card border border-border/60 shadow-sm

**Goal creation flow**
- Side Sheet form (consistent with BattleLogSheet, ArmyListSheet, UnitSheet patterns)
- Fields: name (required), target unit count (required), timeframe (required dropdown: "This Month" / "This Quarter")
- Edit and create use the same Sheet component (null editingGoal = create mode)
- Sibling Sheet/Dialog portal pattern at page root — never nested

**Timeframe mechanics**
- Fixed periods only: "This Month" and "This Quarter"
- Start/end dates derived automatically from current date at query time (not stored as explicit dates)
- Store the timeframe type ("month" | "quarter") and the period identifier (e.g. "2026-05" or "2026-Q2")
- Progress: COUNT(DISTINCT unit_id) from painting_sessions WHERE session_date falls within the goal's period
- A goal created mid-month still counts sessions from the start of that month

**Completed goals treatment**
- Active and completed goals displayed on the same page
- Section grouping: "Active Goals" header above in-progress goals, "Completed" header above finished ones
- Completed goals (progress >= target): muted/success visual — battle-gold accent or check icon, slightly reduced opacity
- No auto-deletion of past goals — they remain as history until manually deleted
- Goals for expired periods (past month/quarter) that weren't completed show as "Missed" with a distinct muted style

**Navigation placement**
- Goals page added to Command nav group (alongside Dashboard, Collection, Projects)
- Route: /goals
- Sidebar icon: Target (from lucide-react)
- Positioned after Painting Projects in COMMAND_NAV

### Claude's Discretion
- Exact card grid responsive breakpoints (grid-cols-1 / grid-cols-2 / grid-cols-3)
- Loading skeleton layout
- Error state handling
- Empty state illustration and copy
- Whether to show percentage text alongside the progress bar
- Delete confirmation dialog styling

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope (auto mode).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANLY-01 | User can create a painting goal by specifying a target unit count and a timeframe (this month / this quarter) — the goal saves and appears on the Goals page | Migration 009 CREATE TABLE, goalSchema Zod, GoalSheet form, useCreateGoal mutation |
| ANLY-02 | Each goal shows a progress bar — the filled portion reflects the count of distinct units that have at least one painting session logged during the goal's timeframe, updated automatically as sessions are added | getGoalProgress SQL with COUNT(DISTINCT unit_id) + strftime period filter; useCreatePaintingSession invalidates goal-progress cache key |
| ANLY-03 | User can view all active and completed goals on the Goals page — completed goals (progress >= target) are visually distinguished from active ones | GoalsPage section grouping (Active / Completed / Missed); GoalCard variant prop or derived status |
</phase_requirements>

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | project-locked | SQLite read/write via `$1, $2` positional params | Sole DB layer in this project |
| @tanstack/react-query | project-locked | Server state cache, `invalidateQueries` for reactivity | Established project hook pattern |
| react-hook-form + @hookform/resolvers | project-locked | Form state + Zod resolver | Used by every Sheet form |
| zod | project-locked | Schema validation | All entity schemas use it |
| shadcn/ui (Card, Sheet, Select, Button, Skeleton, Dialog) | project-locked | UI primitives | All pages use these |
| lucide-react (Target icon) | project-locked | Sidebar icon | Already imported in AppSidebar |
| src/lib/dates.ts | project-local | UTC-safe todayISO() + parseLocalDate() | Required for timezone-safe period boundary calculation |

**Installation:** No new packages required.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Separator (shadcn/ui) | project-locked | Section dividers in Sheet | Between form field groups |

### Alternatives Considered
None — all decisions locked.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
  features/
    goals/
      goalSchema.ts           # Zod schema + GoalFormValues type
      GoalCard.tsx            # Single goal card (progress bar, status variant)
      GoalSheet.tsx           # Create/edit Sheet (null goal = create mode)
      GoalDeleteDialog.tsx    # Delete confirmation Dialog
      GoalEmptyState.tsx      # Icon-pill empty state (no goals yet)
      GoalsPage.tsx           # Page root — owns all portal state

src/
  types/
    goal.ts                   # HobbyGoal + CreateGoalInput + UpdateGoalInput interfaces

  db/
    queries/
      goals.ts                # getGoals, getGoalProgress, createGoal, updateGoal, deleteGoal

  hooks/
    useGoals.ts               # GOALS_KEY, GOAL_PROGRESS_KEY, useGoals, useGoalProgress, useCreateGoal, useUpdateGoal, useDeleteGoal

src-tauri/
  migrations/
    009_hobby_goals.sql       # CREATE TABLE hobby_goals

src/
  app/
    goals/
      page.ts                 # re-export GoalsPage (matches router.tsx convention)
```

### Pattern 1: Migration 009

**What:** New `hobby_goals` table. Append-only — CREATE TABLE in a new numbered file, never edit existing migrations.

**SQL shape:**
```sql
-- 009_hobby_goals.sql — HobbyForge v0.2.2 Phase 22 (ANLY-01..03)
-- Stores user-defined painting targets with fixed-period timeframes.
-- Progress is computed at query time from painting_sessions (not cached here).

CREATE TABLE IF NOT EXISTS hobby_goals (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count > 0),
  timeframe    TEXT    NOT NULL CHECK (timeframe IN ('month', 'quarter')),
  period       TEXT    NOT NULL,   -- 'YYYY-MM' or 'YYYY-QN' e.g. '2026-Q2'
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**lib.rs:** Add `Migration { version: 9, description: "hobby_goals", sql: include_str!("../migrations/009_hobby_goals.sql"), kind: MigrationKind::Up }` to `get_migrations()` vec.

### Pattern 2: Period Identifier Storage

**What:** `period` column stores the human-readable period key — `"2026-05"` for a month goal, `"2026-Q2"` for a quarter goal. Start/end boundaries are always derived at query time from this key using SQLite's `strftime`.

**Period derivation (TypeScript pure function — testable without mocks):**
```typescript
// src/features/goals/computeGoalPeriod.ts
import { todayISO } from "@/lib/dates";

export type TimeframeType = "month" | "quarter";

export interface GoalPeriod {
  period: string;        // e.g. "2026-05" or "2026-Q2"
  startDate: string;     // "YYYY-MM-DD"
  endDate: string;       // "YYYY-MM-DD"
  label: string;         // "May 2026" or "Q2 2026"
  isExpired: boolean;    // today > endDate
}

export function computeGoalPeriod(
  timeframe: TimeframeType,
  period: string,
): GoalPeriod {
  if (timeframe === "month") {
    const [year, month] = period.split("-").map(Number);
    const startDate = `${period}-01`;
    // Last day: new Date(year, month, 0) in local time
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${period}-${String(lastDay).padStart(2, "0")}`;
    const label = new Date(year, month - 1, 1)
      .toLocaleString("en-GB", { month: "long", year: "numeric" });
    return { period, startDate, endDate, label, isExpired: todayISO() > endDate };
  } else {
    // quarter: "2026-Q2" → Q2 = Apr-Jun
    const [yearStr, qStr] = period.split("-Q");
    const year = Number(yearStr);
    const q = Number(qStr);
    const startMonth = (q - 1) * 3 + 1;          // Q1=1, Q2=4, Q3=7, Q4=10
    const endMonth = startMonth + 2;
    const lastDay = new Date(year, endMonth, 0).getDate();
    const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const label = `Q${q} ${year}`;
    return { period, startDate, endDate, label, isExpired: todayISO() > endDate };
  }
}

/** Returns the current period key for the given timeframe type, derived from today. */
export function currentPeriod(timeframe: TimeframeType): string {
  const today = todayISO();
  const [year, month] = today.split("-").map(Number);
  if (timeframe === "month") {
    return `${year}-${String(month).padStart(2, "0")}`;
  } else {
    const q = Math.ceil(month / 3);
    return `${year}-Q${q}`;
  }
}
```

**Confidence:** HIGH — pure date arithmetic verified against dates.ts patterns already in codebase.

### Pattern 3: Progress Query

**What:** SQL query joins `hobby_goals` with `painting_sessions` using `strftime` on the stored period key. Returns current progress for all goals in one query.

```sql
-- getGoalProgress() — returns progress counts for all goals
SELECT
  g.id                              AS goal_id,
  COUNT(DISTINCT ps.unit_id)        AS progress_count
FROM hobby_goals g
LEFT JOIN painting_sessions ps
  ON ps.session_date >= g.period_start
  AND ps.session_date <= g.period_end
GROUP BY g.id
```

**Implementation approach:** Because SQLite cannot call TypeScript functions, the query module must compute `period_start` / `period_end` in JavaScript (from `computeGoalPeriod`) and pass them as parameters per goal. The simplest efficient approach: fetch all goals, compute boundaries, then run a single query using a CASE WHEN or a JS-side loop.

**Recommended implementation for `getGoalProgress`:**
```typescript
// Returns Map<goal_id, progress_count>
export async function getGoalProgress(
  goals: HobbyGoal[]
): Promise<Map<number, number>> {
  if (goals.length === 0) return new Map();
  const db = await getDb();
  const result = new Map<number, number>();

  // Run parallel selects — one per goal (typically < 20 goals, fast)
  await Promise.all(
    goals.map(async (goal) => {
      const { startDate, endDate } = computeGoalPeriod(goal.timeframe, goal.period);
      const rows = await db.select<{ progress_count: number }[]>(
        `SELECT COUNT(DISTINCT unit_id) AS progress_count
           FROM painting_sessions
          WHERE session_date >= $1 AND session_date <= $2`,
        [startDate, endDate]
      );
      result.set(goal.id, rows[0]?.progress_count ?? 0);
    })
  );
  return result;
}
```

**Why parallel per-goal queries instead of a single SQL with CTEs:** Tauri plugin-sql uses `$1, $2` positional params, not named params. Building a dynamic IN clause with variable-length per-goal boundaries is brittle. Parallel per-goal queries are safe, readable, and fast for typical goal counts.

### Pattern 4: React Query Hook Structure

```typescript
// src/hooks/useGoals.ts
export const GOALS_KEY = ["goals"] as const;
export const GOAL_PROGRESS_KEY = ["goal-progress"] as const;

export function useGoals() {
  return useQuery({ queryKey: GOALS_KEY, queryFn: getGoals });
}

export function useGoalProgress() {
  const { data: goals } = useGoals();
  return useQuery({
    queryKey: GOAL_PROGRESS_KEY,
    queryFn: () => getGoalProgress(goals ?? []),
    enabled: goals !== undefined,  // empty array IS valid — same pattern as useRecentActivity
  });
}
```

**Invalidation:** `useCreatePaintingSession` in `useJournalSessions.ts` must invalidate `["goal-progress"]` on `onSuccess`. Mirrors the existing `["hobby-analytics"]` and `["recent-activity"]` invalidations already present in that hook.

### Pattern 5: GoalCard Component

**What:** Renders one goal card. Derives status (active / completed / missed) from `progressCount`, `goal.target_count`, and `computeGoalPeriod(goal.timeframe, goal.period).isExpired`.

```typescript
// Status derivation (pure, no hooks needed)
type GoalStatus = "active" | "completed" | "missed";

function deriveGoalStatus(
  progressCount: number,
  targetCount: number,
  isExpired: boolean,
): GoalStatus {
  if (progressCount >= targetCount) return "completed";
  if (isExpired) return "missed";
  return "active";
}
```

**Progress bar:** Reuse the `StatCard` progress pattern — a `h-0.5 w-full rounded-full bg-border/40` track with a `h-0.5 rounded-full bg-faction-accent` fill, `width: \`${Math.min(100, pct)}%\``. For completed goals, use `bg-battle-gold` or `bg-green-500` instead of `bg-faction-accent`. For missed goals, use `bg-muted-foreground/40`.

**Progress percentage clamp:** `Math.min(100, Math.round((progressCount / targetCount) * 100))` — never exceeds 100% visually even if sessions > target.

### Pattern 6: GoalsPage Section Grouping

```typescript
// Split goals array into three buckets using useMemo
const { active, completed, missed } = useMemo(() => {
  const active: HobbyGoalWithProgress[] = [];
  const completed: HobbyGoalWithProgress[] = [];
  const missed: HobbyGoalWithProgress[] = [];

  for (const goal of goalsWithProgress) {
    const status = deriveGoalStatus(
      goal.progressCount,
      goal.target_count,
      computeGoalPeriod(goal.timeframe, goal.period).isExpired,
    );
    if (status === "completed") completed.push(goal);
    else if (status === "missed") missed.push(goal);
    else active.push(goal);
  }
  return { active, completed, missed };
}, [goalsWithProgress]);
```

Render order: Active Goals → Completed → Missed. Each section only renders its header when the bucket is non-empty.

### Pattern 7: GoalSheet Form

**Timeframe dropdown + period auto-derivation:**
- Dropdown shows: "This Month" | "This Quarter" — two items only
- On form submit, the stored `timeframe` value is `"month"` or `"quarter"`, and `period` is derived from `currentPeriod(timeframe)` at submit time (not stored in form state)
- This matches CONTEXT.md: "Store the timeframe type ('month' | 'quarter') and the period identifier"

**Zod schema (no `.default()` — same discipline as battleLogSchema):**
```typescript
export const GOAL_TIMEFRAMES = ["month", "quarter"] as const;
export type GoalTimeframe = typeof GOAL_TIMEFRAMES[number];

export const goalSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  target_count: z.number().int().min(1, "Target must be at least 1"),
  timeframe: z.enum(GOAL_TIMEFRAMES),
});

export type GoalFormValues = z.infer<typeof goalSchema>;
```

### Anti-Patterns to Avoid

- **Nesting Sheets inside GoalCard:** Always mount GoalSheet and GoalDeleteDialog as siblings at GoalsPage root — never inside the card loop.
- **Using `.default()` in Zod:** Breaks react-hook-form zodResolver type inference with zod v4. Use `buildDefaultValues()` function pattern from BattleLogSheet.
- **Storing start/end dates in DB:** Period boundaries must be derived at query time, not stored. The CONTEXT.md decision locks this.
- **Blocking goal-progress query on undefined goals:** Use `enabled: goals !== undefined` (not `!!goals`), because an empty array `[]` is a valid state that should still resolve.
- **Calling `new Date().toISOString()` for date operations:** Always use `todayISO()` from `src/lib/dates.ts` for timezone safety.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Period boundary calculation (month/quarter start-end) | Custom date math inline in query | `computeGoalPeriod()` pure helper + `todayISO()` from dates.ts | Already established UTC-safe pattern; needed in tests too |
| Progress bar | Custom CSS animation | StatCard's `h-0.5` track + `bg-faction-accent` fill at `width: ${pct}%` | Identical to existing StatCard progress prop pattern |
| Form state | Manual useState for each field | React Hook Form + Zod via goalSchema | Established in every Sheet in the project |
| Goal status logic | Inline conditionals scattered across render | `deriveGoalStatus()` pure function | Testable without mocks; single source of truth |
| Section headers conditional render | Boolean flags in state | `useMemo` to split goals into buckets | Derived from data; no extra state needed |

**Key insight:** This phase has zero new libraries. All patterns — Sheet CRUD, query module, React Query invalidation, Card grid, progress bar — are established in the codebase. The only novel logic is `computeGoalPeriod()` and `deriveGoalStatus()`, both pure functions with no external dependencies.

---

## Common Pitfalls

### Pitfall 1: Migration version not bumped in lib.rs
**What goes wrong:** App crashes at startup with "migration version mismatch" — the `lib.rs` get_migrations() vec still ends at version 8 but the SQL file declares version 9.
**Why it happens:** The migration SQL file is created but the corresponding `Migration { version: 9 }` entry is not added to the `get_migrations()` vec in `src-tauri/src/lib.rs`.
**How to avoid:** Always update lib.rs in the same task as the SQL file. Verify: count the `Migration { version: N }` entries matches the number of `*.sql` files in `src-tauri/migrations/`.
**Warning signs:** App fails to launch after adding the migration file.

### Pitfall 2: goal-progress query not invalidated when sessions are added
**What goes wrong:** User logs a painting session but the goal progress bar does not update until next app restart.
**Why it happens:** `useCreatePaintingSession` in `useJournalSessions.ts` does not invalidate `["goal-progress"]`.
**How to avoid:** Add `qc.invalidateQueries({ queryKey: ["goal-progress"] })` to `useCreatePaintingSession.onSuccess`. Mirrors the existing `["hobby-analytics"]` and `["recent-activity"]` invalidations already present in that mutation.
**Warning signs:** ANLY-02 smoke test fails — logging a session does not refresh the goal card progress.

### Pitfall 3: Period key encoding inconsistency
**What goes wrong:** A goal created as "This Quarter" stores `"2026-Q2"` but the query uses `"2026-q2"` (lowercase) or `"Q2-2026"` (inverted), causing zero progress even when sessions exist.
**Why it happens:** Quarter period key format is invented for this project — no prior convention. If the Sheet and query module disagree on casing/order, silently returns wrong data.
**How to avoid:** Define `currentPeriod()` once in `computeGoalPeriod.ts` and call it from both the create mutation payload and the progress query. Never construct the period key inline in two places.

### Pitfall 4: isExpired vs progressCount ordering in status derivation
**What goes wrong:** A goal with `progressCount >= targetCount` shows as "Missed" instead of "Completed" because the `isExpired` check runs before the progress check.
**Why it happens:** `deriveGoalStatus` checks `isExpired` first — a completed goal whose period has ended would be misclassified.
**How to avoid:** Check `progressCount >= targetCount` FIRST (returns "completed"), then check `isExpired` (returns "missed"), then default to "active". This matches CONTEXT.md: "completed goals (progress >= target)".

### Pitfall 5: `enabled: !!goals` blocks empty-array state
**What goes wrong:** When a user has no goals yet, `useGoalProgress` never fires because `!![]` is `true` but `enabled: !!goals` where `goals = []` would still be `true`. Actually the real trap is `enabled: goals !== undefined && goals.length > 0` — this blocks the query for a user with zero goals and means `getGoalProgress([])` (which short-circuits immediately) never runs, leaving a stale loading state.
**Why it happens:** Defensive coding treating empty array same as undefined.
**How to avoid:** Use `enabled: goals !== undefined`. `getGoalProgress([])` returns an empty Map immediately — no DB queries, no performance cost.

### Pitfall 6: Percentage display exceeds 100%
**What goes wrong:** A user who painted 5 units against a target of 3 sees "167%" displayed, which looks broken.
**Why it happens:** `progressCount / targetCount * 100` not clamped.
**How to avoid:** `Math.min(100, Math.round(pct))` for both the progress bar width and any text percentage.

### Pitfall 7: Quarter boundary — Q4 endMonth = 12, not 13
**What goes wrong:** `endMonth = startMonth + 2` for Q4 gives month 12. `new Date(year, 12, 0)` gives the last day of November (December = month index 11 in JS, so month 12 = January of next year — actually `new Date(year, 12, 0)` IS the last day of December). This works correctly but needs a comment.
**Why it happens:** JavaScript's `new Date(year, month, 0)` uses 0-indexed months for the month parameter but 1-indexed for day-0 trick.
**How to avoid:** Unit-test `computeGoalPeriod("quarter", "2026-Q4")` explicitly and assert `endDate = "2026-12-31"`.

---

## Code Examples

### Migration 009 (verified pattern from 008_enrichment.sql)
```sql
-- 009_hobby_goals.sql — HobbyForge v0.2.2 Phase 22 (ANLY-01..03)
CREATE TABLE IF NOT EXISTS hobby_goals (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count > 0),
  timeframe    TEXT    NOT NULL CHECK (timeframe IN ('month', 'quarter')),
  period       TEXT    NOT NULL,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### lib.rs Migration Entry (verified from existing lib.rs)
```rust
Migration {
    version: 9,
    description: "hobby_goals",
    sql: include_str!("../migrations/009_hobby_goals.sql"),
    kind: MigrationKind::Up,
},
```

### TypeScript Types (verified from types/battleLog.ts pattern)
```typescript
// src/types/goal.ts
export const GOAL_TIMEFRAMES = ["month", "quarter"] as const;
export type GoalTimeframe = typeof GOAL_TIMEFRAMES[number];

export interface HobbyGoal {
  id: number;
  name: string;
  target_count: number;
  timeframe: GoalTimeframe;
  period: string;          // "YYYY-MM" or "YYYY-QN"
  created_at: string;
}

export type CreateGoalInput = Omit<HobbyGoal, "id" | "created_at">;
export type UpdateGoalInput = Partial<CreateGoalInput> & { id: number };
```

### COMMAND_NAV addition (verified from AppSidebar.tsx)
```typescript
const COMMAND_NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/collection", label: "Collection", icon: Package },
  { to: "/painting-projects", label: "Painting Projects", icon: Palette },
  { to: "/goals", label: "Goals", icon: Target },   // ADD — after Painting Projects
] as const;
```
Import: `import { ..., Target } from "lucide-react";`

### Router entry (verified from router.tsx)
```typescript
// In router.tsx — import + route creation
import { GoalsPage } from "./goals/page";

const goalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/goals",
  component: GoalsPage,
});

// In routeTree.addChildren([...]):
// Add goalsRoute after paintingProjectsRoute
```

### useCreatePaintingSession invalidation patch (verified from useJournalSessions.ts)
```typescript
// In useJournalSessions.ts — useCreatePaintingSession.onSuccess
onSuccess: (_, variables) => {
  qc.invalidateQueries({ queryKey: PAINTING_SESSIONS_KEY(variables.unit_id) });
  qc.invalidateQueries({ queryKey: ["hobby-analytics"] });
  qc.invalidateQueries({ queryKey: ["recent-activity"] });
  qc.invalidateQueries({ queryKey: ["goal-progress"] });  // ADD
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single DB queries | Parallel Promise.all per-entity | Phase 19 analytics | Goal progress uses same pattern |
| Inline date string construction | `todayISO()` + `parseLocalDate()` from dates.ts | Phase 17 | All period boundary calcs use dates.ts |
| Nested Radix portals | Sibling portal pattern at page root | Phase 18 | GoalSheet + GoalDeleteDialog mount as siblings |

**Deprecated/outdated:**
- `new Date().toISOString().split("T")[0]`: Replaced by `todayISO()`. Do not use for any date comparison in this phase.

---

## Open Questions

1. **Should `useGoalProgress` be one query key per goal or a single batch key?**
   - What we know: Analytics uses a single `["hobby-analytics"]` key for the whole analytics batch. Goal progress changes per-goal when sessions are logged.
   - What's unclear: Whether per-goal keys (`["goal-progress", goalId]`) or a single `["goal-progress"]` key is better for granular invalidation.
   - Recommendation: Use a single `["goal-progress"]` key for the whole map. Goals change infrequently; invalidating all progress at once when any session is added is acceptable and matches how `["hobby-analytics"]` works.

2. **"Missed" styling — exact color values**
   - What we know: Completed = battle-gold or check icon. Missed = "distinct muted style" per CONTEXT.md.
   - Recommendation (Claude's discretion): Missed goals use `opacity-60` on the card + a strikethrough or `text-muted-foreground` on the name. Progress bar fill: `bg-muted-foreground/30`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest block inline) |
| Quick run command | `pnpm test -- tests/goals/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANLY-01 | createGoal inserts all columns; getGoals returns rows | unit | `pnpm test -- tests/goals/goalQueries.test.ts` | Wave 0 |
| ANLY-01 | goalSchema validates name/target_count/timeframe | unit | `pnpm test -- tests/goals/goalSchema.test.ts` | Wave 0 |
| ANLY-01 | GoalSheet renders fields, submits, calls createGoal | unit | `pnpm test -- tests/goals/GoalSheet.test.tsx` | Wave 0 |
| ANLY-02 | getGoalProgress returns COUNT(DISTINCT unit_id) filtered by period | unit | `pnpm test -- tests/goals/goalQueries.test.ts` | Wave 0 |
| ANLY-02 | computeGoalPeriod returns correct startDate/endDate for month + quarter | unit | `pnpm test -- tests/goals/computeGoalPeriod.test.ts` | Wave 0 |
| ANLY-02 | useCreatePaintingSession invalidates goal-progress key | unit | `pnpm test -- tests/goals/useGoals.test.tsx` | Wave 0 |
| ANLY-03 | GoalsPage renders Active / Completed / Missed sections correctly | unit | `pnpm test -- tests/goals/GoalsPage.test.tsx` | Wave 0 |
| ANLY-03 | deriveGoalStatus: completed before missed check | unit | `pnpm test -- tests/goals/computeGoalPeriod.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/goals/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/goals/goalQueries.test.ts` — covers ANLY-01 (createGoal SQL), ANLY-02 (getGoalProgress SQL)
- [ ] `tests/goals/goalSchema.test.ts` — covers ANLY-01 (Zod validation)
- [ ] `tests/goals/computeGoalPeriod.test.ts` — covers ANLY-02 period boundary math + ANLY-03 deriveGoalStatus ordering
- [ ] `tests/goals/useGoals.test.tsx` — covers ANLY-02 invalidation of goal-progress; useCreateGoal/useDeleteGoal cache behavior
- [ ] `tests/goals/GoalSheet.test.tsx` — covers ANLY-01 form submit; edit mode reset
- [ ] `tests/goals/GoalsPage.test.tsx` — covers ANLY-03 section grouping render

---

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/db/queries/analytics.ts` — parallel Promise.all SQL pattern for progress queries
- Project codebase: `src/lib/dates.ts` — UTC-safe date utilities, confirmed required by CONTEXT.md canonical_refs
- Project codebase: `src/features/battle-log/BattleLogPage.tsx` — sibling portal pattern, page structure blueprint
- Project codebase: `src/features/battle-log/BattleLogSheet.tsx` — Sheet form pattern, buildDefaultValues, no-default() discipline
- Project codebase: `src/features/battle-log/battleLogSchema.ts` — Zod schema discipline
- Project codebase: `src/features/dashboard/StatCard.tsx` — progress bar implementation (`h-0.5`, `bg-faction-accent`, `width: ${progress}%`)
- Project codebase: `src-tauri/src/lib.rs` — migration registration pattern, confirmed version 8 is latest
- Project codebase: `src/components/common/AppSidebar.tsx` — COMMAND_NAV array structure, Target icon addition point
- Project codebase: `src/app/router.tsx` — route registration pattern
- Project codebase: `src/hooks/useJournalSessions.ts` — confirmed `["goal-progress"]` invalidation insertion point

### Secondary (MEDIUM confidence)
- `.planning/phases/22-hobby-goals/22-CONTEXT.md` — all user decisions locked; period storage format confirmed

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all libraries confirmed in codebase
- Architecture: HIGH — patterns taken directly from BattleLogPage/Sheet, analytics.ts, StatCard
- SQL migration: HIGH — migration 008 is the direct prior example
- Period boundary logic: HIGH — pure date arithmetic, testable; quarter end-of-month uses standard JS Date trick
- Pitfalls: HIGH — all derived from explicit prior phase pitfalls documented in STATE.md and existing test files

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (stable patterns — no external library dependencies to go stale)
