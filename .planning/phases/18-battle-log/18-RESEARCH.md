# Phase 18: Battle Log - Research

**Researched:** 2026-05-04
**Domain:** React/TypeScript CRUD page — Tauri + SQLite + TanStack Query + shadcn/ui
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page structure**
- New `/battle-log` route — dedicated first-class page, new sidebar nav entry
- Page header: "Battle Log" title + "Log Game" button (top-right)
- Summary bar below the header: "N games · XW YL ZD · WW% win rate" — overall totals only, no per-faction breakdown
- Chronological list below the summary bar, sorted newest first

**List entry display**
- Compact two-line row:
  - Line 1: color-coded result badge (green=WIN, red=LOSS, yellow/grey=DRAW) + opponent faction + mission + points played
  - Line 2: army list name + date
- Clicking a row expands notes inline (no separate Sheet or dialog for viewing)
- Expanded section shows: opponent name, scores (my VP / opponent VP), MVP unit, underperforming unit, lessons learned, changes next time
- If the linked army list has been deleted: show "(Army list deleted)" in muted text where the army name would be

**Edit / delete actions**
- Hover over a row to reveal Edit (pencil) and Delete (trash) icon buttons at the right
- Delete triggers a confirmation dialog (sibling portal — never nested inside the row or list)
- Edit opens the same Sheet form pre-filled — standard create/edit sheet pattern

**Log creation and editing UX**
- "Log Game" button (top-right) opens a Sheet/drawer form
- Same Sheet used for create and edit (editingLog = null → create; editingLog = log → edit)
- Page owns all portal state (sheetOpen, editingLog, deleteDialogOpen, deletingLog) — mirrors ArmyListsPage architecture

**Form fields — all schema columns exposed**
- **Required fields**: battle_date (date picker, defaults to today), opponent_faction (text), mission (text), result (Win/Loss/Draw select)
- **Optional identifiers**: opponent (text — player name, separate from faction)
- **Optional army linkage**: army_list_id (select from existing army lists; nullable)
- **Optional scores**: points_played (number), my_score (number), opponent_score (number)
- **Optional unit linkage**: mvp_unit_id (unit dropdown — select from owned units), underperforming_unit_id (unit dropdown — select from owned units); both use ON DELETE SET NULL
- **Optional structured notes**: lessons_learned (textarea), changes_next_time (textarea)
- General `notes` column: Claude's discretion whether to expose as a fourth freeform field

**Win/Loss/Draw styling**
- Color-coded pill badge: green for WIN, red for LOSS, yellow/muted for DRAW
- Mirrors the painting status ring pattern — immediately scannable

### Claude's Discretion
- Exact form field layout and grouping within the Sheet (e.g. scores on one row, unit dropdowns on another)
- Whether to expose the general `notes` column as a fourth notes field alongside the three structured ones
- Loading skeleton design for the page
- Icon choice for the Battle Log sidebar nav entry
- Error state handling
- Whether the expanded inline notes section is animated (accordion vs. instant)
- Exact muted text wording for the "(Army list deleted)" case

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BATTLE-01 | User can log a game with opponent faction, mission name, result (Win/Loss/Draw), and date | `battle_logs` table already exists; `getBattleLogs`, `createBattleLog` queries; Sheet form with zod validation |
| BATTLE-02 | User can select which of their existing army lists was used when logging a game | `army_list_id` FK column (ON DELETE SET NULL); `useArmyLists` hook; Select component with sentinel pattern |
| BATTLE-03 | User can add optional notes to a game log entry (MVP unit, lessons learned) | `lessons_learned`, `changes_next_time`, `notes` columns; `mvp_unit_id`, `underperforming_unit_id` FKs; expandable inline row |
| BATTLE-04 | User can view all logged games in a chronological list | `getBattleLogs` query with `ORDER BY battle_date DESC, created_at DESC`; summary bar aggregation query |
| BATTLE-05 | User can delete a game log entry and it is removed from the list immediately | `deleteBattleLog(id)` query; `BattleLogDeleteDialog` sibling portal; TanStack Query invalidation |
</phase_requirements>

---

## Summary

Phase 18 is a pure UI-and-query addition. The `battle_logs` table was created in `001_core_schema.sql` (the very first migration) with all 15 required columns already present — army_list_id, mvp_unit_id, and underperforming_unit_id all use `ON DELETE SET NULL`, so log entries survive linked record deletion. No migration work is needed for this phase.

The architecture is a direct clone of `ArmyListsPage` (the canonical CRUD page template in this codebase): page component owns all portal state, a `useBattleLogs` hook wraps TanStack Query, `src/db/queries/battleLogs.ts` holds all SQL, a Sheet handles create/edit, a Dialog handles delete confirmation, all as sibling portals. The only genuinely new UI element is the inline expandable row — the rest is established pattern.

The summary bar requires one additional GROUP BY query (`SELECT result, COUNT(*) FROM battle_logs GROUP BY result`) whose results are aggregated in JavaScript to produce the W/L/D counts and win-rate percentage. This is the same compute-in-JS pattern used by `computeSpendingStats`.

**Primary recommendation:** Clone ArmyListsPage/ArmyListSheet/ArmyListDeleteDialog as the structural template, adapt the query module for `battle_logs`, add the inline-expand row component as the only net-new UI pattern.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | already installed | Server-state cache, invalidation | All hooks in this project use it |
| `react-hook-form` + `@hookform/resolvers` | already installed | Form state + zod validation | Used by ArmyListSheet, all other Sheets |
| `zod` | already installed | Schema validation | Used by every form in the project |
| `tauri-plugin-sql` | already installed | SQLite query execution | Only DB access layer in this project |
| `sonner` | already installed | Toast notifications | Used by all mutation hooks |
| shadcn/ui components | already installed | Sheet, Dialog, Select, Badge, Skeleton, Button, Input, Form | Entire UI is shadcn |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | already installed | Icon for sidebar nav entry | Sidebar icons always from lucide-react |
| shadcn `badge` | already installed | WIN/LOSS/DRAW result pill | Color-coded status already uses Badge |

**Installation:** No new packages required for this phase.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/battle-log/
│   └── page.tsx                    # thin wrapper (re-exports BattleLogPage)
├── features/battle-log/
│   ├── BattleLogPage.tsx           # owns all portal state
│   ├── BattleLogRow.tsx            # compact 2-line row + inline expand
│   ├── BattleLogSheet.tsx          # create/edit Sheet form
│   ├── BattleLogDeleteDialog.tsx   # delete confirmation dialog
│   ├── BattleLogSummaryBar.tsx     # "N games · XW YL ZD · WW%" bar
│   ├── BattleLogEmptyState.tsx     # empty state component
│   └── battleLogSchema.ts          # zod schema + form types
├── db/queries/
│   └── battleLogs.ts               # getBattleLogs, createBattleLog, updateBattleLog, deleteBattleLog, getBattleLogSummary
├── hooks/
│   └── useBattleLogs.ts            # useQuery + useMutation hooks
└── types/
    └── battleLog.ts                # BattleLog interface + input types
```

### Pattern 1: Page Owns All Portal State (ArmyListsPage mirror)
**What:** BattleLogPage holds `sheetOpen`, `editingLog`, `deleteDialogOpen`, `deletingLog`. Derived objects use the "store ID, derive from cache" pattern (`selectedLog = logs.find(l => l.id === editingLog?.id)`).
**When to use:** Any CRUD page with Sheet + Dialog portals.
**Example:**
```typescript
// Source: src/features/army-lists/ArmyListsPage.tsx (verified in codebase)
const [sheetOpen, setSheetOpen] = useState(false);
const [editingLog, setEditingLog] = useState<BattleLog | null>(null);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [deletingLog, setDeletingLog] = useState<BattleLog | null>(null);

const openCreate = () => { setEditingLog(null); setSheetOpen(true); };
const openEdit  = (log: BattleLog) => { setEditingLog(log); setSheetOpen(true); };
const closeSheet = () => { setSheetOpen(false); setEditingLog(null); };
const openDelete = (log: BattleLog) => { setDeletingLog(log); setDeleteDialogOpen(true); };
```

### Pattern 2: Query Module
**What:** All SQL in `src/db/queries/battleLogs.ts` using `getDb()` from `@/db/client`. No ORM, no raw tauri invoke — only `db.select` and `db.execute`.
**When to use:** Every data access in this project.
**Example:**
```typescript
// Source: src/db/queries/armyLists.ts (verified in codebase)
import { getDb } from "@/db/client";

export async function getBattleLogs(): Promise<BattleLog[]> {
  const db = await getDb();
  return db.select<BattleLog[]>(
    "SELECT * FROM battle_logs ORDER BY battle_date DESC, created_at DESC"
  );
}

export async function getBattleLogSummary(): Promise<{ result: string; count: number }[]> {
  const db = await getDb();
  return db.select<{ result: string; count: number }[]>(
    "SELECT result, COUNT(*) AS count FROM battle_logs GROUP BY result"
  );
}
```

### Pattern 3: Hook Module
**What:** `useBattleLogs.ts` exports named hooks — `useBattleLogs()`, `useCreateBattleLog()`, `useUpdateBattleLog()`, `useDeleteBattleLog()`. Cache key: `["battle-logs"]`. All mutations call `qc.invalidateQueries({ queryKey: ["battle-logs"] })`.
**When to use:** All queries and mutations exposed to components through hooks only.
**Example:**
```typescript
// Source: src/hooks/useArmyLists.ts (verified in codebase)
export const BATTLE_LOGS_KEY = ["battle-logs"] as const;

export function useBattleLogs() {
  return useQuery({ queryKey: BATTLE_LOGS_KEY, queryFn: getBattleLogs });
}

export function useDeleteBattleLog() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteBattleLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: BATTLE_LOGS_KEY }),
  });
}
```

### Pattern 4: Route Registration
**What:** Add `battleLogRoute` to `src/app/router.tsx` alongside `armyListsRoute`. The page file at `src/app/battle-log/page.tsx` is a thin wrapper that re-exports the feature component.
**When to use:** Every page in this project.
**Example:**
```typescript
// Source: src/app/router.tsx (verified in codebase)
import { BattleLogPage } from "./battle-log/page";

const battleLogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/battle-log",
  component: BattleLogPage,
});
// Add to routeTree: rootRoute.addChildren([..., battleLogRoute, ...])
```

### Pattern 5: Sidebar Nav Entry
**What:** Add an entry to `TRACKING_NAV` (or a new `PLAY_NAV` group) in `src/components/common/AppSidebar.tsx`. Icon from `lucide-react`. Active state handled automatically by `NavItem` via `location.pathname === to`.
**When to use:** Every page needs a sidebar entry.

### Pattern 6: Inline Expandable Row
**What:** BattleLogRow maintains local `expanded` state. Clicking the row body toggles it. Hover reveals Edit/Delete icon buttons (CSS `group`/`group-hover` pattern). This is the only net-new UI pattern in this phase.
**Example:**
```typescript
// Pattern — no direct existing equivalent, but uses standard Tailwind group pattern
function BattleLogRow({ log, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="group relative ...">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left ...">
        {/* Line 1: badge + faction + mission + points */}
        {/* Line 2: army name + date */}
      </button>
      {/* Hover actions — only visible on group-hover */}
      <div className="absolute right-2 top-2 hidden group-hover:flex gap-1">
        <Button size="icon" variant="ghost" onClick={() => onEdit(log)}><Pencil /></Button>
        <Button size="icon" variant="ghost" onClick={() => onDelete(log)}><Trash2 /></Button>
      </div>
      {/* Inline expand */}
      {expanded && <div className="px-4 pb-3 ...">...</div>}
    </div>
  );
}
```

### Pattern 7: Select with Nullable FK (sentinel pattern)
**What:** shadcn Select cannot have `value=""`. Use a sentinel string (`"__none__"`) for the null/empty state. Convert to `null` on form submission.
**When to use:** Any optional FK dropdown (army_list_id, mvp_unit_id, underperforming_unit_id).
**Example:**
```typescript
// Source: src/features/army-lists/ArmyListSheet.tsx (verified in codebase)
const NO_LIST = "__none__";
// value prop: field.value !== null ? String(field.value) : NO_LIST
// onValueChange: (v) => field.onChange(v === NO_LIST ? null : Number(v))
```

### Pattern 8: Summary Bar Aggregation (compute-in-JS)
**What:** `getBattleLogSummary()` returns `{ result, count }[]` rows from a GROUP BY query. A pure JS function (`computeBattleLogSummary`) converts this to `{ wins, losses, draws, total, winRate }`. The hook composes both.
**When to use:** Any derived stats that need display but don't warrant a separate React Query key.
**Example:**
```typescript
// Modelled on src/hooks/useSpendingStats.ts + src/features/spending/computeSpendingStats.ts
export function useBattleLogSummary() {
  return useQuery({
    queryKey: ["battle-logs", "summary"],
    queryFn: async () => {
      const rows = await getBattleLogSummary();
      return computeBattleLogSummary(rows);
    },
  });
}
```

### Anti-Patterns to Avoid
- **Nesting Sheet inside Dialog or vice versa:** Radix portals must be siblings at the page root, never nested. (Pitfall 1, documented throughout the codebase)
- **Importing DB in UI components:** All SQL goes in `src/db/queries/`, all TanStack Query in `src/hooks/`. Components only call hooks.
- **COALESCE for nullable columns that must be clearable:** `army_list_id`, `mvp_unit_id`, `underperforming_unit_id` use `ON DELETE SET NULL` and must be clearable by the user. Use full-replacement UPDATE (`SET col = $N`) not `COALESCE($N, col)` for these columns.
- **`value=""` on SelectItem:** Radix Select treats `""` as unselected. Always use a named sentinel like `"__none__"`.
- **Sorting by created_at alone:** Battle dates are user-entered. Sort by `battle_date DESC, created_at DESC` so manually-entered historical games appear in the right position.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | `react-hook-form` + `zod` | Already in use for all Sheet forms; handles error display via `FormMessage` |
| Toast notifications | Custom alert/banner | `sonner` (`toast.success`, `toast.error`) | Already installed, consistent with all other mutations |
| Modal/Sheet portal management | Custom modal state machine | Radix Dialog + Sheet sibling pattern | Already established; nested portals cause z-index and focus trap failures |
| Date formatting | Manual date string manipulation | `new Date(log.battle_date).toLocaleDateString()` | SQLite stores TEXT dates (ISO 8601); JS Date parses them directly |
| Win rate computation | Complex formula | Simple integer division in `computeBattleLogSummary` | `wins / total * 100` — pure function, testable |
| Conditional badge colors | CSS-in-JS or runtime style | Tailwind class maps by result value | Consistent with painting status badges already in the project |

---

## Common Pitfalls

### Pitfall 1: Nested Portals
**What goes wrong:** Placing `BattleLogSheet` or `BattleLogDeleteDialog` inside `BattleLogRow` or inside each other causes z-index stacking failures and Radix focus trap errors.
**Why it happens:** Natural instinct to co-locate dialogs with the elements that trigger them.
**How to avoid:** All Sheet and Dialog components are rendered as direct children of `BattleLogPage` (page root), not inside list items.
**Warning signs:** Dialog appears behind the Sheet; pressing Escape closes the wrong portal.

### Pitfall 2: Battle Date Sort Order
**What goes wrong:** Sorting only by `created_at DESC` puts games in insertion order. If a user logs a game they played last week, it appears at the top but should be sorted by the game date.
**Why it happens:** `created_at` is auto-populated and always "now", so it never matches `battle_date`.
**How to avoid:** `ORDER BY battle_date DESC, created_at DESC` — primary sort on the user-entered date.

### Pitfall 3: Stale Form Data on Re-Open
**What goes wrong:** Opening the Sheet to edit log A, closing it, then opening it to edit log B shows log A's data.
**Why it happens:** `useForm` with `defaultValues` does not re-initialise when props change.
**How to avoid:** `useEffect(() => { form.reset(buildDefaultValues(log)); }, [log, form])` — same belt-and-braces pattern as `ArmyListSheet`.
**Warning signs:** Edit form shows previous log's opponent faction.

### Pitfall 4: Army List Deleted State
**What goes wrong:** `JOIN army_lists ON army_list_id = ...` omits logs whose army list was deleted (NULL FK). Use a LEFT JOIN or handle the nullable `army_list_id` in the query result.
**Why it happens:** Inner JOIN silently hides rows with NULL FK.
**How to avoid:** Either (a) select `army_list_id` from the base `battle_logs` table and join army list name in JS from the `useArmyLists` cache, or (b) use `LEFT JOIN army_lists al ON al.id = bl.army_list_id` and check `al.name IS NULL` in the UI.
**Warning signs:** Logged games disappear from the list when their army list is deleted.

### Pitfall 5: COALESCE Prevents Clearing Nullable FKs
**What goes wrong:** Using `COALESCE($2, army_list_id)` in `updateBattleLog` means the user can never clear a previously-set army list — the old value is retained.
**Why it happens:** Copying the standard `updateArmyList` pattern which uses COALESCE for text/number fields.
**How to avoid:** Use full-replacement UPDATE for all three FK columns: `SET army_list_id = $2, mvp_unit_id = $3, underperforming_unit_id = $4` — same as `updateArmyListUnit`.

### Pitfall 6: Date Input Display Mismatch
**What goes wrong:** SQLite stores `battle_date` as TEXT (`YYYY-MM-DD`). An `<input type="date">` requires `value` in `YYYY-MM-DD` format. If `battle_date` is stored with time component (`2026-05-04 00:00:00`), the input shows empty.
**Why it happens:** The schema uses `TEXT` with no enforced format.
**How to avoid:** When inserting, write `battle_date` as `YYYY-MM-DD` only (e.g., `new Date().toISOString().slice(0, 10)`). Default value in form: `new Date().toISOString().slice(0, 10)`.

---

## Code Examples

### Complete `battle_logs` table schema (from 001_core_schema.sql)
```sql
-- Source: src-tauri/migrations/001_core_schema.sql (verified in codebase)
CREATE TABLE IF NOT EXISTS battle_logs (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    army_list_id            INTEGER REFERENCES army_lists(id) ON DELETE SET NULL,
    battle_date             TEXT,
    opponent                TEXT,
    opponent_faction        TEXT,
    mission                 TEXT,
    points_played           INTEGER,
    result                  TEXT,
    my_score                INTEGER,
    opponent_score          INTEGER,
    mvp_unit_id             INTEGER REFERENCES units(id) ON DELETE SET NULL,
    underperforming_unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
    lessons_learned         TEXT,
    changes_next_time       TEXT,
    notes                   TEXT,
    created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);
-- NOTE: No updated_at column — battle_logs has no updated_at in the schema.
-- Do NOT add one. Use created_at only.
```

### battleLogs.ts query module skeleton
```typescript
// Source: modelled on src/db/queries/armyLists.ts (verified in codebase)
import { getDb } from "@/db/client";
import type { BattleLog, CreateBattleLogInput, UpdateBattleLogInput } from "@/types/battleLog";

export async function getBattleLogs(): Promise<BattleLog[]> {
  const db = await getDb();
  return db.select<BattleLog[]>(
    "SELECT * FROM battle_logs ORDER BY battle_date DESC, created_at DESC"
  );
}

export async function getBattleLogSummary(): Promise<{ result: string; count: number }[]> {
  const db = await getDb();
  return db.select<{ result: string; count: number }[]>(
    "SELECT result, COUNT(*) AS count FROM battle_logs GROUP BY result"
  );
}

export async function createBattleLog(input: CreateBattleLogInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO battle_logs
       (army_list_id, battle_date, opponent, opponent_faction, mission,
        points_played, result, my_score, opponent_score,
        mvp_unit_id, underperforming_unit_id,
        lessons_learned, changes_next_time, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      input.army_list_id ?? null, input.battle_date, input.opponent ?? null,
      input.opponent_faction, input.mission, input.points_played ?? null,
      input.result, input.my_score ?? null, input.opponent_score ?? null,
      input.mvp_unit_id ?? null, input.underperforming_unit_id ?? null,
      input.lessons_learned ?? null, input.changes_next_time ?? null,
      input.notes ?? null,
    ]
  );
  return result.lastInsertId ?? 0;
}

// Full-replacement UPDATE — NULL passthrough for all three FK columns (Pitfall 5)
export async function updateBattleLog(input: UpdateBattleLogInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE battle_logs SET
       army_list_id = $2, battle_date = $3, opponent = $4,
       opponent_faction = $5, mission = $6, points_played = $7,
       result = $8, my_score = $9, opponent_score = $10,
       mvp_unit_id = $11, underperforming_unit_id = $12,
       lessons_learned = $13, changes_next_time = $14, notes = $15
     WHERE id = $1`,
    [
      input.id, input.army_list_id ?? null, input.battle_date, input.opponent ?? null,
      input.opponent_faction, input.mission, input.points_played ?? null,
      input.result, input.my_score ?? null, input.opponent_score ?? null,
      input.mvp_unit_id ?? null, input.underperforming_unit_id ?? null,
      input.lessons_learned ?? null, input.changes_next_time ?? null,
      input.notes ?? null,
    ]
  );
}

export async function deleteBattleLog(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM battle_logs WHERE id = $1", [id]);
}
```

### BattleLog TypeScript interface
```typescript
// Mirrors battle_logs schema exactly (no updated_at — it does not exist in the table)
export interface BattleLog {
  id: number;
  army_list_id: number | null;
  battle_date: string;           // "YYYY-MM-DD"
  opponent: string | null;
  opponent_faction: string;
  mission: string;
  points_played: number | null;
  result: "Win" | "Loss" | "Draw";
  my_score: number | null;
  opponent_score: number | null;
  mvp_unit_id: number | null;
  underperforming_unit_id: number | null;
  lessons_learned: string | null;
  changes_next_time: string | null;
  notes: string | null;
  created_at: string;
  // No updated_at — not in schema
}

export type CreateBattleLogInput = Omit<BattleLog, "id" | "created_at">;
export type UpdateBattleLogInput = CreateBattleLogInput & { id: number };
```

### Result badge color mapping
```typescript
// Tailwind class map — no runtime style computation
const RESULT_BADGE: Record<string, string> = {
  Win:  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Loss: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Draw: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};
// Usage: <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RESULT_BADGE[log.result] ?? RESULT_BADGE.Draw}`}>
//           {log.result}
//        </span>
```

### computeBattleLogSummary pure function
```typescript
// Modelled on src/features/spending/computeSpendingStats.ts (verified in codebase)
export interface BattleLogSummary {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // 0-100, integer
}

export function computeBattleLogSummary(
  rows: { result: string; count: number }[]
): BattleLogSummary {
  const get = (r: string) => rows.find(x => x.result === r)?.count ?? 0;
  const wins = get("Win");
  const losses = get("Loss");
  const draws = get("Draw");
  const total = wins + losses + draws;
  const winRate = total === 0 ? 0 : Math.round((wins / total) * 100);
  return { total, wins, losses, draws, winRate };
}
```

### Sidebar nav entry
```typescript
// Source: src/components/common/AppSidebar.tsx (verified in codebase)
// Add to TRACKING_NAV array:
{ to: "/battle-log", label: "Battle Log", icon: Swords }
// Swords is already imported. Alternatively use BookOpenCheck or Scroll from lucide-react.
// Icon choice is Claude's discretion — Swords is used for the wordmark; a different icon
// avoids visual collision (e.g., ScrollText, Swords is already the app logo icon).
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global sidebar state via context | `useSidebarCollapsed` custom hook (localStorage) | Phase 16 | Sidebar collapse is already handled; just add to nav array |
| Per-page DB import | All SQL in `src/db/queries/` | Phase 1 | Query module pattern is mandatory |
| Inline dialog per list item | Sibling portal at page root | Phase 6+ | BattleLogPage must own all Sheet/Dialog state |

---

## Open Questions

1. **General `notes` field exposure**
   - What we know: `notes TEXT` column exists in `battle_logs`. Three structured note fields (`lessons_learned`, `changes_next_time`) already cover the main use cases.
   - What's unclear: Whether the user wants a fourth free-form notes textarea alongside the structured ones.
   - Recommendation: Expose it as a fourth optional "General Notes" textarea grouped below the structured notes section. It adds one field to the form and has no implementation cost. If the form feels cluttered, omit it — this is Claude's discretion per CONTEXT.md.

2. **MVP/underperforming unit dropdown scope**
   - What we know: `mvp_unit_id` and `underperforming_unit_id` FK to `units`. `useUnits()` returns all units regardless of faction.
   - What's unclear: Should the dropdown be filtered to units belonging to the selected army list's faction?
   - Recommendation: Show all units unfiltered for simplicity. Users have small personal collections. Filtering adds complexity with no clear correctness benefit at this scale.

3. **Summary bar query caching**
   - What we know: The summary bar needs a separate GROUP BY query. It could share the `["battle-logs"]` key (compute from the full list in JS) or use a separate `["battle-logs", "summary"]` key (separate DB round-trip).
   - What's unclear: Whether computing counts from the already-fetched full list in JS is cleaner than a second query.
   - Recommendation: Compute from the full list returned by `useBattleLogs()` — avoid the second query entirely. `computeBattleLogSummary` can accept `BattleLog[]` directly and count by `result` field. This eliminates the second query and the `getBattleLogSummary` DB function.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts) |
| Config file | `vitest.config.ts` — already configured, jsdom environment |
| Quick run command | `pnpm vitest run tests/battle-log/` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BATTLE-01 | `createBattleLog` inserts correct columns; `getBattleLogs` returns DESC order | unit | `pnpm vitest run tests/battle-log/battleLogQueries.test.ts` | Wave 0 |
| BATTLE-02 | `createBattleLog` accepts nullable `army_list_id`; `updateBattleLog` uses full-replacement (not COALESCE) for army_list_id | unit | `pnpm vitest run tests/battle-log/battleLogQueries.test.ts` | Wave 0 |
| BATTLE-03 | `createBattleLog` stores `lessons_learned`, `changes_next_time`, nullable `mvp_unit_id`/`underperforming_unit_id` | unit | `pnpm vitest run tests/battle-log/battleLogQueries.test.ts` | Wave 0 |
| BATTLE-04 | `computeBattleLogSummary` returns correct W/L/D counts and win rate from GROUP BY rows | unit | `pnpm vitest run tests/battle-log/computeBattleLogSummary.test.ts` | Wave 0 |
| BATTLE-05 | `deleteBattleLog` issues correct DELETE statement | unit | `pnpm vitest run tests/battle-log/battleLogQueries.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run tests/battle-log/`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/battle-log/battleLogQueries.test.ts` — covers BATTLE-01, BATTLE-02, BATTLE-03, BATTLE-05 (mocks `getDb()`, verifies SQL strings + param arrays; follows `tests/foundation/armyListQueries.test.ts` exactly)
- [ ] `tests/battle-log/computeBattleLogSummary.test.ts` — covers BATTLE-04 (pure function, no mocks needed; follows `tests/spending/computeSpendingStats.test.ts`)

---

## Sources

### Primary (HIGH confidence)
- `src-tauri/migrations/001_core_schema.sql` — `battle_logs` table definition with all 15 columns verified
- `src/features/army-lists/ArmyListsPage.tsx` — Portal state architecture verified
- `src/features/army-lists/ArmyListSheet.tsx` — Form pattern, sentinel pattern, useEffect reset verified
- `src/features/army-lists/ArmyListDeleteDialog.tsx` — Delete confirmation pattern verified
- `src/db/queries/armyLists.ts` — Query module pattern, full-replacement UPDATE contract verified
- `src/hooks/useArmyLists.ts` — Hook pattern, cache key convention, invalidation chain verified
- `src/hooks/useSpendingStats.ts` — Compute-in-JS stats pattern verified
- `src/app/router.tsx` — TanStack Router route registration pattern verified
- `src/components/common/AppSidebar.tsx` — Sidebar nav group and NavItem pattern verified
- `.planning/phases/18-battle-log/18-CONTEXT.md` — All locked decisions

### Secondary (MEDIUM confidence)
- `src/hooks/useUnits.ts` — Confirms `UNITS_KEY = ["units"]` for MVP/underperforming unit dropdown
- `tests/foundation/armyListQueries.test.ts` — Confirms test pattern for query module tests
- `tests/spending/computeSpendingStats.test.ts` — Confirms pure-function test pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in active use, verified against codebase
- Architecture: HIGH — patterns are directly readable from existing feature code
- Pitfalls: HIGH — all identified from existing codebase code comments and established conventions
- SQL schema: HIGH — verified directly from `001_core_schema.sql`

**Research date:** 2026-05-04
**Valid until:** 2026-07-04 (stable project; patterns only change when the design overhaul phase ships new conventions)
