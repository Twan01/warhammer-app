# Pitfalls Research

**Domain:** HobbyForge v2.2 — Full Circle: Battle Log, Wishlist, Hobby Goals, Hobby Velocity Tracker, Spend Over Time chart, Painting Streak, Ready-to-Play Quick View, Showcase Mode, Custom Lore Notes, Undercoat Log — added to existing Tauri 2 + React 19 + Tailwind v4 + shadcn/ui + SQLite (tauri-plugin-sql, no ORM) app.
**Researched:** 2026-05-04
**Confidence:** HIGH — derived from direct codebase audit of all 6 migrations, all 11 query modules, all type definitions, all test files, and confirmed codebase pitfall history. Confidence levels noted per finding.

---

## Critical Pitfalls

### Pitfall 1: Streak Calculation Off-By-One When "Today" Has No Session

**What goes wrong:**
Painting Streak counts consecutive hobby days. The most common mistake is including today in the streak even when no session has been logged today. The result: a streak that claims "7 days" when the last session was yesterday — but breaks overnight when the calendar rolls to a new day and the app hasn't been opened yet. This creates a "phantom streak" that never breaks even if the user hasn't painted in days.

The inverse error is equally bad: requiring a session today to count the streak at all means a user who painted 6 days in a row sees "0 current streak" at 9am because they haven't painted yet today.

**Why it happens:**
The streak definition is ambiguous at the boundary. "Consecutive days" must answer: does the count include today (if no session exists today), or does it count the run of past days ending at yesterday? Both are defensible interpretations, but only one matches the correct behaviour.

**How to avoid:**
Use this exact definition consistently throughout:

> Current streak = the count of consecutive calendar days ending at **today or yesterday** on which at least one session was logged.

The calculation algorithm:

```typescript
// painting_sessions.session_date is stored as 'YYYY-MM-DD' TEXT
export function computeStreak(sessionDates: string[]): number {
  if (sessionDates.length === 0) return 0;

  // Deduplicate — multiple sessions on same day count as one
  const unique = [...new Set(sessionDates)].sort().reverse(); // newest first

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const toDate = (iso: string) => new Date(iso + 'T00:00:00');

  // Streak must start at today or yesterday (else it's already broken)
  const mostRecent = toDate(unique[0]);
  if (mostRecent < yesterday) return 0; // streak broken — last session is 2+ days ago

  let streak = 0;
  let expected = mostRecent < today ? yesterday : today; // anchor to most recent

  for (const iso of unique) {
    const d = toDate(iso);
    // Allow the first entry to be today or yesterday
    const diff = Math.round((expected.getTime() - d.getTime()) / 86400000);
    if (diff === 0) {
      streak++;
      expected = new Date(expected);
      expected.setDate(expected.getDate() - 1);
    } else {
      break; // gap found — streak ends
    }
  }
  return streak;
}
```

**Warning signs:**
- `computeStreak` uses `new Date()` inside the loop without fixing a single "today" reference — causes inconsistency if midnight crosses during computation
- Streak does not reset the morning after a missed day
- Streak includes today even when the session list has no entry for today's ISO date
- No deduplication of multiple sessions on the same day before streak calculation

**Phase to address:** Hobby Velocity / Streak phase — pure function + TDD Wave 0 tests must explicitly cover: (a) empty sessions, (b) last session today, (c) last session yesterday, (d) last session 2 days ago (streak = 0), (e) gap in the middle.

---

### Pitfall 2: SQLite Date Arithmetic Using JS `new Date()` Timezone Shifts

**What goes wrong:**
`session_date` is stored as `'YYYY-MM-DD'` TEXT (confirmed in `painting_sessions` migration and `PaintingSession` type). When JavaScript parses a bare date string with `new Date('2026-05-03')`, it interprets it as **UTC midnight**, not local midnight. On a machine in UTC+1 or UTC+2 (CET/CEST — which applies to the user in Belgium), this shifts the date backward by 1 or 2 hours.

Consequence: `new Date('2026-05-03')` parsed at 11pm local time on May 3rd in UTC+2 resolves to May 2nd UTC. Streak calculations break: a session logged at 11pm local time gets treated as the previous day. Monthly spend charts attribute purchases to the wrong month.

**Why it happens:**
ECMAScript spec: date-only strings (`YYYY-MM-DD`) are parsed as UTC. Date-time strings with `T` separator but no timezone (`YYYY-MM-DDTHH:MM:SS`) are parsed as local time. This is the single most common JS date parsing bug.

**How to avoid:**
Always parse stored ISO date strings by appending a local time indicator, or by manually splitting the string:

```typescript
// WRONG — interprets as UTC midnight, wrong date in UTC+ zones
const d = new Date('2026-05-03');

// CORRECT — append T00:00:00 to force local midnight interpretation
const d = new Date('2026-05-03T00:00:00');

// ALSO CORRECT — parse manually, never rely on Date constructor for date-only strings
function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day); // local midnight
}
```

For the streak calculator, use `parseLocalDate` for all session_date parsing. For the "today" anchor, use:

```typescript
function todayISO(): string {
  const d = new Date();
  // Use local year/month/day — NOT toISOString() which returns UTC
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
```

The existing `todayISO()` in `JournalTab.tsx` uses `new Date().toISOString().split('T')[0]` — this is UTC and is technically wrong for UTC+ timezones. Flag for correction.

**Warning signs:**
- `new Date(session.session_date)` without the `T00:00:00` suffix
- `new Date().toISOString().split('T')[0]` used as "today's date" when timezone offset matters
- Streak breaks mysteriously in the evening or around midnight
- Monthly chart buckets miscount sessions logged after ~10pm local time

**Phase to address:** Hobby Velocity / Streak phase and Spend Over Time chart phase — define a `parseLocalDate()` and a local `todayISO()` utility in `src/lib/dates.ts` before any date arithmetic is written. Test in the TDD Wave 0 with explicit timezone-edge test cases.

---

### Pitfall 3: SQLite `GROUP BY strftime('%Y-%m', ...)` Is Timezone-Unaware

**What goes wrong:**
For the Spend Over Time chart and Hobby Velocity Tracker, the natural SQL is:

```sql
SELECT strftime('%Y-%m', purchase_date) AS month, SUM(purchase_price_pence) AS total
FROM units
WHERE purchase_date IS NOT NULL
GROUP BY month
ORDER BY month ASC;
```

SQLite's `strftime()` operates on the stored TEXT value as-is. Since `purchase_date` is stored as `'YYYY-MM-DD'` (local date entered by the user), this SQL works correctly for grouping by month — the stored date string already represents the user's local date, not UTC. There is no timezone shift in the SQL itself.

The pitfall arises if any query or migration ever stores a **datetime with timezone** (e.g., `datetime('now')` stores UTC). If `purchase_date` is ever populated programmatically using `datetime('now')` instead of the user-supplied `YYYY-MM-DD` string, SQLite stores UTC midnight, and the month group will be wrong for UTC+ users.

**Why it happens:**
SQLite's `datetime('now')` returns UTC. If a developer "helpfully" adds a default to the purchase_date column (`DEFAULT (date('now'))`), all auto-filled dates are UTC dates — subtly wrong for UTC+1/+2 users at end-of-month boundaries.

**How to avoid:**
Never add `DEFAULT (date('now'))` or `DEFAULT (datetime('now'))` to `purchase_date` or `battle_date` columns. These are user-entered dates that must be supplied from the frontend using the local-date string from the date input element (already `YYYY-MM-DD` local). The existing `units.purchase_date` column has no default — preserve this pattern for all new date columns.

For `created_at`/`updated_at` audit columns, `datetime('now')` is fine — they are not used for user-visible grouping.

**Warning signs:**
- A migration adds `DEFAULT (date('now'))` or `DEFAULT (datetime('now'))` to a user-visible date column
- Spend chart shows a purchase in the "wrong month" when entered near end-of-month in the evening
- `battle_date`, `goal_target_date`, or `purchase_date` columns have SQLite defaults based on `datetime('now')`

**Phase to address:** Schema migration phase for any feature with user-visible date columns — Battle Log (`battle_date`), Hobby Goals (`target_date`, `start_date`), Wishlist. Flag in migration comments.

---

### Pitfall 4: Charting Library Not in Stack — New Dependency Required and Must Work in Tauri's Sandboxed WebView

**What goes wrong:**
No charting library is installed (confirmed: `package.json` has no recharts, D3, nivo, Victory, or similar). The Spend Over Time chart and Hobby Velocity Tracker require time-series charts. Adding a charting library to a Tauri app has two specific risks:

1. **Canvas-based charting libraries may fail in Tauri's WebView** if they rely on `window.devicePixelRatio` or specific Canvas 2D APIs that behave differently in WebView2 on Windows. Libraries with SVG rendering are safer.

2. **Heavy charting bundles increase Tauri binary size** — the current app is intentionally small. D3 is 500KB+, nivo brings React Spring as a peer dep, Victory brings React Native dependencies.

The recommended choice for this stack is **Recharts** (SVG-based, React-native, ~200KB gzipped, works in Tauri WebView2 on Windows — no Canvas dependency). shadcn/ui ships chart components built on top of Recharts (`npx shadcn@latest add chart`) — this is the correct integration path for this codebase's shadcn style system.

**Why it happens:**
Developers reach for D3 (most powerful, most familiar from web) without checking Tauri compatibility. D3 itself works, but D3-based wrappers that use Canvas APIs may not.

**How to avoid:**
Use the shadcn chart component (`npx shadcn@latest add chart`) which wraps Recharts. This gives:
- SVG rendering (no Canvas) — safe in WebView2
- Already matches the zinc/dark theme from the rest of the app
- `recharts` as the only new peer dependency (~210KB gzipped)
- No React Native, React Spring, or D3 sub-dependencies

Install:
```bash
npm install recharts
npx shadcn@latest add chart
```

Do NOT use: D3 direct, nivo (React Spring), Victory (React Native peer deps), Chart.js (Canvas-based, flaky in WebView2).

**Warning signs:**
- Chart renders blank or crashes in the production Tauri binary but works in `npm run dev`
- Chart uses `canvas.getContext('2d')` — Canvas APIs in WebView2 can behave differently
- `package.json` adds `d3`, `nivo`, or `victory` without prior Tauri WebView2 validation

**Phase to address:** Spend Over Time chart phase and Hobby Velocity Tracker phase — install and validate the charting library in the first task of whichever feature phase introduces charting. Do not assume it works in Tauri without testing in a production build.

---

### Pitfall 5: `ALTER TABLE` Order Must Match Migration Version Numbers in `lib.rs`

**What goes wrong:**
v2.2 adds multiple new schema elements: battle_logs table activation (already in 001_core_schema.sql), new columns on `units` (undercoat, lore notes), new tables (wishlist, hobby_goals). If multiple `ALTER TABLE` statements are split across different migration files but the migration numbers in `lib.rs`'s `get_migrations()` are out of order or have gaps, `tauri-plugin-sql` silently skips migrations that are out of sequence.

The existing pattern (verified): migrations must be registered in `get_migrations()` as a contiguous `vec!` with sequential version numbers (1, 2, 3, 4, 5, 6 — no gaps). The next migration is version 7.

The `battle_logs` table already exists in `001_core_schema.sql` (it was schema-forward designed). Any attempt to re-create it in a v2.2 migration will fail with "table already exists." Use `CREATE TABLE IF NOT EXISTS` only if the table truly did not exist before; do not add `IF NOT EXISTS` to ALTER TABLE statements.

**Why it happens:**
Developers forget that `battle_logs` was pre-created and try to run a "create battle_logs" migration — it fails or is a no-op. Separately, developers unfamiliar with the additive migration rule try to modify `001_core_schema.sql` directly, which has no effect on users who have already run it.

**How to avoid:**
- **Never modify** `001_core_schema.sql` through `006_spend_pence.sql`. They have already run on the existing DB.
- New migration = new numbered file (007, 008, ...) registered in `lib.rs` at the correct version.
- For `battle_logs`: no CREATE TABLE needed — it already exists. Only add to `battle_logs` with `ALTER TABLE IF NEEDED` or populate via INSERT.
- For `units` undercoat/lore columns: use `ALTER TABLE units ADD COLUMN undercoat_product TEXT;` — pattern from 004/005/006.
- For wishlist/goals: new `CREATE TABLE IF NOT EXISTS` in the new migration.
- Consolidate all v2.2 schema changes into the fewest possible migrations (ideally one migration per coherent feature group, not one per column).

**Warning signs:**
- App boots but columns don't exist — INSERT statements throw "no such column"
- `get_migrations()` vec skips a version number (e.g., version 7 is missing, version 8 exists)
- A developer edits an existing migration file instead of creating a new one
- `CREATE TABLE battle_logs` in a new migration (it already exists from 001)

**Phase to address:** Schema migration task — first deliverable of any v2.2 phase that touches the DB. Include a test (pattern from `tests/spending/migration005.test.ts`) that asserts the migration SQL text contains the expected column/table names and does NOT contain `CREATE TABLE battle_logs` without `IF NOT EXISTS`.

---

### Pitfall 6: Hobby Goals "Derived Progress" Computed in JS Can Diverge from DB State

**What goes wrong:**
Hobby Goals track progress toward painting targets (e.g., "paint 10 units by June 30"). Progress is derived from existing data: count of units with `status_painting = 'Completed'` (or another terminal status) that were updated within the goal's time window. If this count is computed in JS by filtering the full units array in memory, two problems occur:

1. **Stale cache:** If a unit's painting status is updated in a different part of the app (Collection page, Kanban), the Hobby Goals hook may show stale progress until TanStack Query refetches.

2. **Wrong window:** The goal has `start_date` and `target_date`. Progress should only count units that reached the target status **within that date range**. But `units.updated_at` is a datetime that changes on ANY field update — not just status changes. A unit that had its notes updated today but was painted last year gets counted incorrectly.

**Why it happens:**
`updated_at` is a general-purpose audit column, not a "painting completed at" timestamp. The schema has no `status_changed_at` or `painting_completed_at` field.

**How to avoid:**
Two approaches, in order of preference:

**Option A (recommended — no schema change):** Count progress by querying `painting_sessions` for sessions that occurred within the goal's date range, joined to units that are in a target-or-better painting status. This uses the session log as the temporal anchor:

```sql
SELECT COUNT(DISTINCT ps.unit_id) AS progress
FROM painting_sessions ps
JOIN units u ON u.id = ps.unit_id
WHERE u.status_painting IN ('Completed', 'Varnished')
  AND ps.session_date >= :start_date
  AND ps.session_date <= :target_date;
```

This counts units that both (a) have reached target status AND (b) have a session in the goal window — a reasonable proxy for "painted during this period."

**Option B (simpler, less precise):** Track goal progress as a pure snapshot — count all currently-completed units, regardless of when. Suitable for "how far am I overall" rather than "what did I paint this quarter." Clearly label this in the UI as "current total" not "painted this period."

Do NOT use `updated_at` for goal progress date filtering.

**Warning signs:**
- Goal progress query filters by `WHERE updated_at >= goal_start_date` — will double-count units whose notes were edited
- Goal progress is computed in JS by filtering the full `useUnits()` result without invalidating on status changes
- No cache invalidation of `["hobby-goals"]` query when a unit's painting status changes

**Phase to address:** Hobby Goals phase — query design decision before schema migration. Document the chosen approach in the phase CONTEXT.md before implementation.

---

### Pitfall 7: Spend Over Time Chart Buckets Break When `purchase_date` Is NULL

**What goes wrong:**
The Spend Over Time chart groups units by `purchase_date` month. A significant portion of units have `purchase_date = NULL` (the field is optional — confirmed in `001_core_schema.sql` and `Unit` type). A naive `GROUP BY strftime('%Y-%m', purchase_date)` silently includes a bucket for `NULL` — SQLite groups all NULL dates together as a single `NULL` key. This NULL bucket appears in the result set and the chart tries to render a data point with `month: null`, either throwing or rendering as "1970-01" or an empty label.

**Why it happens:**
SQLite includes NULL in GROUP BY results as a distinct group. This is correct SQL behavior but unexpected when building a time-axis chart.

**How to avoid:**
Always filter out NULL dates in the spending query:

```sql
SELECT strftime('%Y-%m', purchase_date) AS month,
       COALESCE(SUM(purchase_price_pence), 0) AS total_pence
FROM units
WHERE purchase_date IS NOT NULL
  AND purchase_price_pence IS NOT NULL
GROUP BY month
ORDER BY month ASC;
```

In the JS aggregation layer (`computeSpendOverTime`), additionally filter any result where `month` is null or empty before passing to the chart.

Also: if `purchase_price_pence IS NULL`, `SUM` returns NULL for that group — wrap with `COALESCE`. The existing `getSpendingStats` already does this for the paint total; apply the same pattern here.

**Warning signs:**
- Chart receives a data point with `month: null` or `month: ""`
- Recharts renders an extra unlabelled bar/point at the left of the time axis
- SQL query lacks `WHERE purchase_date IS NOT NULL`
- `COALESCE` is missing from the SUM in the spending query

**Phase to address:** Spend Over Time chart phase — validate the SQL in the Wave 0 test by checking that the query string contains both `IS NOT NULL` filters.

---

## High-Severity Pitfalls

### Pitfall 8: Showcase Mode Fullscreen CSS Conflicts With Tauri's Fixed Window Chrome

**What goes wrong:**
Showcase Mode is a full-screen gallery for displaying at club nights. The natural implementation uses CSS `position: fixed; inset: 0; z-index: 9999` to cover the entire screen. However, Tauri on Windows renders the app inside a WebView2 frame with the OS window chrome (title bar, borders). "Full screen" in the WebView context means full WebView — not the full monitor.

To go truly full-screen (hiding the OS title bar), the Tauri window must be set to `fullscreen: true` via `window.setFullscreen(true)` from `@tauri-apps/api/window`. This changes the OS window state and removes the title bar, which requires the user to have a way to exit (ESC key or a visible close button).

If the implementation only uses CSS `position: fixed` without calling the Tauri window API, Showcase Mode fills the WebView but does NOT hide the OS title bar — it looks unpolished at a club night presentation.

**Why it happens:**
Web developers naturally reach for CSS fullscreen without considering the OS window layer. The Fullscreen API (`document.documentElement.requestFullscreen()`) works in browsers but is blocked in Tauri's WebView2 by default.

**How to avoid:**
Use Tauri's window API, not the browser Fullscreen API:

```typescript
import { getCurrentWindow } from '@tauri-apps/api/window';

async function enterShowcaseMode() {
  await getCurrentWindow().setFullscreen(true);
}

async function exitShowcaseMode() {
  await getCurrentWindow().setFullscreen(false);
}
```

Also provide an ESC key handler and a visible "Exit Showcase" button overlaid on the gallery, because the OS title bar (with its close/minimize controls) is hidden in fullscreen.

Add `window:allow-set-fullscreen` to the capabilities file:
```json
"core:window:allow-set-fullscreen"
```

**Warning signs:**
- Showcase Mode uses only `position: fixed; inset: 0` without calling `getCurrentWindow().setFullscreen()`
- No ESC key handler to exit fullscreen
- `document.requestFullscreen()` used — blocked by WebView2
- No capability for `core:window:allow-set-fullscreen`

**Phase to address:** Showcase Mode phase — capability declaration and Tauri window API usage must be the first task, before any gallery layout is built.

---

### Pitfall 9: Wishlist as Separate Entity vs. a Status Flag on Units — Schema Decision With Long-Term Consequences

**What goes wrong:**
Wishlist items are "models to acquire before they're in the collection." There are two possible implementations:
- **Status flag on units:** Add `is_wishlist INTEGER DEFAULT 0` to the `units` table — wishlist items are just units with a flag set
- **Separate table:** `wishlist_items` as a distinct entity

The status flag approach seems simpler but creates a false conceptual merge: units are things the user owns; wishlist items are things they want. Mixing them means `owned_count`, `status_assembly`, `status_painting`, etc. are all meaningless for wishlist items but must accept null or placeholder values. Every query that pulls "owned units" must add `WHERE is_wishlist = 0 OR is_wishlist IS NULL`, which is a global change to all 11 existing query modules. Miss one and the Collection page shows wishlist items as owned units; the Dashboard stat "total units owned" inflates; the Spending Tracker includes wish-priced items in real totals.

**Why it happens:**
The flag approach avoids a new table and new query module — it "fits" the existing schema. The contamination of every downstream query is not visible until the feature is 80% built.

**How to avoid:**
Use a **separate `wishlist_items` table** — a distinct entity with its own query module, hook, and UI. No shared type with `Unit`. No alteration to existing unit queries. Schema:

```sql
CREATE TABLE IF NOT EXISTS wishlist_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    faction_id      INTEGER REFERENCES factions(id) ON DELETE SET NULL,
    name            TEXT    NOT NULL,
    category        TEXT,
    unit_type       TEXT,
    model_count     INTEGER,
    estimated_price_pence INTEGER,
    priority        INTEGER,
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

When the user "buys" a wishlist item, it becomes a new unit entry via a manual conversion flow — not an automatic flag flip.

**Warning signs:**
- `ALTER TABLE units ADD COLUMN is_wishlist INTEGER DEFAULT 0` in the migration
- `getUnits()` query gets `WHERE is_wishlist = 0` appended
- Dashboard stats start using `WHERE is_wishlist = 0 OR is_wishlist IS NULL`
- Wishlist items appear in the Collection page or spending totals

**Phase to address:** Wishlist phase — schema decision (separate table) must be locked in the CONTEXT.md before any migration is written.

---

### Pitfall 10: Ready-to-Play Quick View Cross-Filter Requires a JOIN That Returns Unexpected Null Behaviour

**What goes wrong:**
Ready-to-Play Quick View filters units by battle-ready status (e.g., `status_painting IN ('Completed', 'Varnished')`) AND checks if they appear in army lists within a points limit. The natural SQL involves a JOIN to `army_list_units`:

```sql
SELECT u.*
FROM units u
JOIN army_list_units alu ON alu.unit_id = u.id
JOIN army_lists al ON al.id = alu.list_id
WHERE u.status_painting IN ('Completed', 'Varnished')
  AND al.points_limit <= :limit;
```

This query returns only units that are in at least one army list — units not in any list are excluded entirely, even if they are fully painted. For a personal collection with many painted units not yet placed in lists, this produces an empty or near-empty result that looks like a bug.

Additionally, `army_lists.points_limit` is nullable (`points_limit INTEGER` — confirmed in `001_core_schema.sql`). A list with `points_limit = NULL` is silently excluded by `al.points_limit <= :limit` (NULL comparisons return NULL, which is falsy).

**Why it happens:**
The JOIN removes non-matching rows. The developer sees "all painted units" as the desired output and doesn't realize the JOIN is excluding units with no list membership.

**How to avoid:**
Use a LEFT JOIN and include units with no list:

```sql
SELECT DISTINCT u.*,
       COALESCE(MAX(al.points_limit), 0) AS max_list_points
FROM units u
LEFT JOIN army_list_units alu ON alu.unit_id = u.id
LEFT JOIN army_lists al ON al.id = alu.list_id
WHERE u.status_painting IN ('Completed', 'Varnished')
GROUP BY u.id
HAVING max_list_points <= :limit OR :limit IS NULL OR max_list_points = 0;
```

Alternatively: compute this entirely in JS as a filter on the existing `useUnits()` result combined with the army lists cache — no new SQL JOIN needed. This is simpler and avoids the NULL-propagation problems:

```typescript
function getReadyToPlayUnits(units: Unit[], armyListUnits: ArmyListUnit[], limit?: number): Unit[] {
  const readyStatuses: PaintingStatus[] = ['Completed', 'Varnished', 'Based'];
  const unitIdsInLists = new Set(armyListUnits.map(alu => alu.unit_id));
  return units.filter(u =>
    readyStatuses.includes(u.status_painting) &&
    (limit == null || unitIdsInLists.has(u.id))
  );
}
```

**Warning signs:**
- Ready-to-Play returns 0 results when the user has painted units but no army lists built yet
- INNER JOIN to army_list_units in the query
- `points_limit` comparison without NULL guard

**Phase to address:** Ready-to-Play Quick View phase — query strategy decision before implementation. Prefer JS filtering over SQL JOIN for this feature.

---

### Pitfall 11: Custom Lore Notes `ALTER TABLE` on Large Existing Tables Requires Careful NULL Handling

**What goes wrong:**
Custom Lore requires adding free-text columns to existing tables — at minimum `lore_notes TEXT` to `units` (for per-unit lore) and possibly to `factions`. The `units` table already has data (the user's collection). `ALTER TABLE units ADD COLUMN lore_notes TEXT` is additive and safe in SQLite, and all existing rows get `lore_notes = NULL`.

The risk is in the TypeScript type update. If `Unit` is updated to `lore_notes: string` (non-nullable) instead of `lore_notes: string | null`, every existing unit read from the DB has `lore_notes = null` but TypeScript expects a string. Code that does `unit.lore_notes.trim()` or `unit.lore_notes.length` throws at runtime on every existing row.

**Why it happens:**
Developers add the column to the type as `string` because "it will always have a value when the user fills it in." They forget every existing row returns null.

**How to avoid:**
Always type new optional text columns as `string | null`. Every render site must guard: `unit.lore_notes ?? ''` or `unit.lore_notes?.trim()`. The Zod schema for the edit form uses `.optional().nullable()` (the established pattern — confirmed in `unitSchema.ts` comments).

For factions: faction lore is likely more structured (e.g., `lore_notes TEXT` nullable). Same pattern.

**Warning signs:**
- `lore_notes: string` (non-nullable) in the `Unit` type after migration
- `unit.lore_notes.length` or `unit.lore_notes.trim()` without null guard in component code
- TypeScript errors hidden by `!` non-null assertions on the lore field

**Phase to address:** Custom Lore Notes phase — type definition is the first deliverable; null safety enforced by TypeScript strict mode and reviewed in code review.

---

### Pitfall 12: Undercoat Log as New Enum vs. Free-Text Field — Type Safety Trap

**What goes wrong:**
Undercoat Log tracks "primer/undercoat used per unit." The temptation is to create a TypeScript union type for known undercoat values (`'Chaos Black' | 'Wraithbone' | 'Grey Seer' | ...`). This breaks immediately when the user uses a non-GW primer. The alternative — storing as unconstrained `TEXT` — is correct for the DB, but if the TypeScript type is a union the form validation rejects valid user input.

The secondary issue: if the column is added as `undercoat TEXT` (nullable), existing rows have `undercoat = NULL`. If the UI renders `unit.undercoat` directly in a Badge component that expects a non-empty string, it renders "null" or crashes.

**How to avoid:**
Store as `TEXT NULL` in the DB — no enum constraint. Use a free-text input with optional preset suggestions (datalist or combobox). TypeScript type: `undercoat: string | null`. Zod: `.optional().nullable()`. UI guard: `{unit.undercoat && <Badge>{unit.undercoat}</Badge>}`.

Do NOT use a TypeScript `as const` union for undercoat values unless the feature spec explicitly requires a fixed list with no user input. The Warhammer undercoat market has dozens of products.

**Warning signs:**
- `undercoat: 'Chaos Black' | 'Wraithbone' | 'Grey Seer' | null` in the Unit type
- Zod schema uses `z.enum([...undercoats])` — users can't enter custom values
- Badge renders `{unit.undercoat}` without null guard

**Phase to address:** Undercoat Log phase — type decision (free text, not enum) locked in CONTEXT.md before schema migration.

---

### Pitfall 13: Battle Log Optional FK to `army_lists` — `SET NULL` Cascade Is Already Correct but Must Be Verified After Army List Deletion

**What goes wrong:**
`battle_logs.army_list_id` uses `ON DELETE SET NULL` (confirmed in `001_core_schema.sql`). This is correct — deleting an army list should not delete the battle history. But the Battle Log UI must handle the case where `army_list_id` is not null in the DB row but the army list no longer exists. If the UI does a JOIN to `army_lists` without a LEFT JOIN, that battle log row disappears from the list silently.

Additionally: the `battle_logs` table is in the DB but has never had application code written for it. The `getDb().select<BattleLog[]>()` type must be defined fresh. `BattleLog` as a TypeScript type does not exist yet — it must be created following the `PaintingSession` pattern in `src/types/paintingSession.ts`.

**Why it happens:**
The table was pre-created in migration 001 but no query module, type, or hook exists. A developer starting from scratch might miss that the table already exists and try to create it in a new migration.

**How to avoid:**
- Check `001_core_schema.sql` for the existing `battle_logs` schema before writing any migration
- Create `src/types/battleLog.ts` (not auto-derived from schema — must be handwritten)
- Create `src/db/queries/battleLogs.ts` following `paintingSessions.ts` pattern
- All queries to `battle_logs` that reference `army_list_id` must use LEFT JOIN or handle null in JS
- After army list deletion, verify battle log rows still appear with `army_list_id = NULL` and the UI shows "No list" placeholder instead of breaking

**Warning signs:**
- A new migration contains `CREATE TABLE battle_logs` — this table already exists
- `BattleLog` TypeScript type doesn't exist; developer uses `any` or `Record<string, unknown>`
- Battle log query uses INNER JOIN to army_lists — log disappears after army list deletion

**Phase to address:** Battle Log phase — read `001_core_schema.sql` battle_logs definition as the first step; create the type before writing any query.

---

## Moderate Pitfalls

### Pitfall 14: Hobby Velocity Tracker — "Sessions Per Week" Divided By Zero When No Sessions Exist

**What goes wrong:**
Hobby Velocity computes painting pace from session data. The metric "sessions per week" involves dividing the session count by the number of weeks between the first session and today. If there are no sessions at all, this division is `0 / 0 = NaN`. `NaN` propagates through further computations (e.g., "projected completion in X weeks") and renders as `"NaN weeks"` in the UI.

**How to avoid:**
All velocity computations must be pure functions with explicit zero-guards:

```typescript
export function computeVelocity(sessions: PaintingSession[]): HobbyVelocity {
  if (sessions.length === 0) return { sessionsPerWeek: 0, minutesPerWeek: 0, projectedWeeks: null };
  const firstDate = parseLocalDate(sessions[sessions.length - 1].session_date);
  const today = new Date();
  const weeksElapsed = Math.max(1, (today.getTime() - firstDate.getTime()) / (7 * 86400000));
  return {
    sessionsPerWeek: sessions.length / weeksElapsed,
    minutesPerWeek: sessions.reduce((s, x) => s + x.duration_minutes, 0) / weeksElapsed,
    projectedWeeks: null, // requires target unit count from Hobby Goals
  };
}
```

`Math.max(1, ...)` prevents division by zero when `weeksElapsed < 1` (first session today).

**Warning signs:**
- Velocity renders "NaN weeks" or "Infinity sessions/week" in the UI
- No early-return guard for empty sessions array
- `sessions.length / weeksElapsed` without `Math.max(1, ...)` denominator guard

**Phase to address:** Hobby Velocity Tracker phase — TDD Wave 0 must have an explicit test for zero-sessions input returning `{ sessionsPerWeek: 0, minutesPerWeek: 0 }`.

---

### Pitfall 15: Battle Log Score Fields — INTEGER vs TEXT for Structured Results

**What goes wrong:**
`battle_logs.result` is `TEXT` in the schema (e.g., "Win", "Loss", "Draw"). `my_score` and `opponent_score` are `INTEGER`. If the UI uses a free-text input for `result` instead of a controlled select/enum, users enter inconsistent values: "Win", "win", "W", "Victory", "won". Any win-rate computation becomes unreliable.

**Why it happens:**
The column is TEXT in the schema, and TEXT inputs are the default. No validation layer is designed upfront.

**How to avoid:**
Enforce a controlled vocabulary at the application layer even though the DB column is TEXT:

```typescript
export const BATTLE_RESULTS = ['Win', 'Loss', 'Draw'] as const;
export type BattleResult = typeof BATTLE_RESULTS[number];
```

Use a Select (not an Input) for the result field. Zod: `z.enum(BATTLE_RESULTS)`. This prevents free-text entry. The DB column stays TEXT — no schema constraint needed.

**Warning signs:**
- `result` field is an `<Input type="text">` in the battle log form
- Win rate calculated by `sessions.filter(s => s.result === 'Win').length` without normalizing case
- Multiple casing variants of "Win"/"Loss" appear in the DB

**Phase to address:** Battle Log phase — define `BATTLE_RESULTS` const in `src/types/battleLog.ts` alongside the BattleLog type.

---

### Pitfall 16: New Query Cache Keys Must Be Invalidated by Existing Mutation Hooks

**What goes wrong:**
v2.2 introduces multiple new TanStack Query cache keys: `["battle-logs"]`, `["wishlist"]`, `["hobby-goals"]`, `["hobby-velocity"]`, `["spend-over-time"]`, `["painting-streak"]`. When a user updates a unit's painting status (via the Collection page or Kanban), the `["hobby-velocity"]`, `["painting-streak"]`, and `["hobby-goals"]` caches may be stale but won't refetch until the page reloads.

This is the same pitfall as v2.1's spending-stats invalidation (Pitfall 2 in the previous research). It is documented in `14-RESEARCH.md` and confirmed as a real issue.

**Why it happens:**
Existing mutation hooks (`useUpdateUnit`, `useCreatePaintingSession`, `useDeletePaintingSession`) pre-date the new query keys. The new keys must be manually added to the `onSuccess` invalidation calls in those hooks.

**How to avoid:**
At the start of v2.2, audit all existing mutation hooks for which new cache keys they should invalidate:

| Mutation | New keys to invalidate |
|----------|----------------------|
| `useCreatePaintingSession` | `["painting-streak"]`, `["hobby-velocity"]`, `["hobby-goals"]` |
| `useDeletePaintingSession` | `["painting-streak"]`, `["hobby-velocity"]`, `["hobby-goals"]` |
| `useUpdateUnit` (status change) | `["hobby-goals"]`, `["hobby-velocity"]` |
| `useCreateUnit` / `useDeleteUnit` | `["wishlist"]` if conversion flow exists; `["spending-stats"]` (already wired) |
| `useCreateBattleLog` | `["battle-logs"]` |

Define all new query key constants in their respective hook files (`STREAK_KEY`, `VELOCITY_KEY`, etc.) before implementing any hook that consumes them.

**Warning signs:**
- Painting Streak shows stale count after logging a new session until page reload
- Hobby Goals progress doesn't update after marking a unit complete
- No `invalidateQueries` call for `["painting-streak"]` in `useCreatePaintingSession`

**Phase to address:** Each feature phase — include cache invalidation in the query module design. Add to the Wave 0 test checklist: "does the mutation hook invalidate the correct keys?"

---

### Pitfall 17: Showcase Mode Gallery Image Loading — `convertFileSrc` Must Be Called Per Image

**What goes wrong:**
Showcase Mode displays a full-screen gallery of unit photos. Photos are stored as relative paths in `image_assets` (established in v2.1 Hobby Journal — see existing PITFALLS.md Pitfall 5). Each photo requires a call to `convertFileSrc(absolutePath)` to get the `asset://` URL for the `<img>` src.

If Showcase Mode fetches all images for all units at once and calls `convertFileSrc` for each in a loop before rendering, the gallery blocks on path resolution for collections with 50+ units and 200+ photos. Additionally, if the gallery uses a CSS grid that loads all `<img>` elements simultaneously, 200+ concurrent file reads will cause WebView2 to stutter on first load.

**How to avoid:**
- Lazy-load images: only resolve `convertFileSrc` for images in or near the viewport. Use `IntersectionObserver` or the `loading="lazy"` attribute on `<img>` elements.
- In Showcase Mode specifically (full-screen, one-at-a-time display), pre-fetch only the current image and the next image — not all images.
- Use the `useUnitPhotos` hook pattern already established in Phase 13 — it already handles the `assetUrl` conversion per unit. In Showcase Mode, filter to units with `status_painting = 'Completed'` or similar, then load photos lazily per card.

**Warning signs:**
- Gallery loads all 200+ photos before rendering anything
- `convertFileSrc` called in a synchronous loop outside React rendering
- First paint of Showcase Mode takes 3+ seconds with a moderate-sized collection

**Phase to address:** Showcase Mode phase — establish lazy-loading strategy before building the gallery grid.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Wishlist as `is_wishlist` flag on `units` | No new table | All 11 unit queries need `WHERE is_wishlist = 0` guards; Dashboard inflates owned count; Spending Tracker includes wish prices in real totals | Never |
| Using `updated_at` for Hobby Goals date range filter | No schema change | Goals count units edited (not painted) within the window; wrong progress values forever | Never |
| `new Date(session_date)` without `T00:00:00` | Fewer characters | Date shifts backward by 1-2 hours in UTC+ timezones; streak breaks at 10pm; charts show wrong month | Never — always append `T00:00:00` |
| Computing streak in SQL with `strftime` window functions | All logic in DB | SQLite window functions poorly supported in older versions; JS pure function is testable and correct | Never — use JS pure function |
| Undercoat as TypeScript enum | Type-safe input | Rejects valid user input (non-GW primers); requires migration to add new values | Never — use free text with preset suggestions |
| INNER JOIN for Ready-to-Play query | Simpler SQL | Units not in any army list disappear from Ready-to-Play even when fully painted | Never — use LEFT JOIN or JS filtering |
| Charting with Canvas-based library | More powerful charts | May fail silently in WebView2 production build; blank chart | Never — use SVG-based Recharts via shadcn chart |
| Adding streak/velocity logic to existing hooks | Fewer files | Business logic entangled with data fetching; untestable without IPC mocks | Never — keep pure compute functions separate |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Recharts + shadcn chart + Tauri dark mode | Default Recharts colors don't match zinc dark theme | Use `<ChartContainer>` from `components/ui/chart.tsx` which reads CSS variables; don't hardcode colors |
| `getCurrentWindow().setFullscreen()` + Showcase Mode | Use CSS `position: fixed` only | Call Tauri window API for true fullscreen; add `core:window:allow-set-fullscreen` capability |
| `battle_logs` table + new migration | Try to `CREATE TABLE battle_logs` in migration 007 | Table already exists from 001_core_schema.sql — only `ALTER TABLE` or INSERT needed |
| Hobby Goals progress + `updated_at` | `WHERE updated_at BETWEEN start AND end` | Use `painting_sessions.session_date` as temporal anchor; `updated_at` is a general audit column |
| Streak calculation + `new Date(isoString)` | Parse bare `YYYY-MM-DD` strings with `new Date()` | Append `T00:00:00` or use `parseLocalDate()` — bare date strings are parsed as UTC |
| `SUM()` on nullable pence column | `SUM(purchase_price_pence)` returns NULL for no rows | Always `COALESCE(SUM(...), 0)` — established pattern from spending tracker |
| New query keys + existing mutations | Forget to invalidate `["painting-streak"]` in `useCreatePaintingSession` | Audit all existing mutation hooks at start of v2.2; add new cache key invalidation |
| Spend Over Time chart + NULL purchase_date | `GROUP BY strftime('%Y-%m', purchase_date)` includes NULL group | Add `WHERE purchase_date IS NOT NULL` before grouping |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Showcase Mode loads all photos upfront | 3+ second blank screen before gallery renders | Lazy-load via `IntersectionObserver` or `loading="lazy"`; only pre-fetch current+next in slideshow mode | ~50+ photos |
| Streak/velocity computed on full session history every render | Noticeable lag on Collection page for active painters | Memoize with `useMemo`; query sessions once; keep pure function fast (O(n) max) | ~500+ sessions over 2 years |
| Spend Over Time chart re-renders on every route visit | Chart animates on every navigation to the page | Set `staleTime` on spend-over-time query; avoid animation on re-render | Immediate if staleTime = 0 |
| Hobby Goals progress recomputed on every unit in list | Slow goal list when collection is large | Precompute progress in the query layer; don't filter full unit array per goal per render | ~50+ goals (unlikely but possible) |
| Ready-to-Play cross-filter fetches all army_list_units | Extra IPC call on every Ready-to-Play view | Reuse existing `useArmyLists()` cache; filter in JS from existing cached data | Immediate — avoid extra query |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Hobby Goals shows "0% complete" for a goal with no sessions in the period | Looks like a bug or broken feature | Show "No sessions logged yet in this period" instead of 0% progress bar |
| Painting Streak shows "0 days" after midnight when user hasn't painted yet today | User feels discouraged — streak appears broken | Only break streak at 48h since last session (allow "paint today or yesterday" window per the streak definition) |
| Battle Log win/loss stats with only 1-2 games | "33% win rate" from 1 win out of 3 games is misleading | Show raw "W/L/D: 1/2/0" counts alongside the percentage; add a disclaimer for low sample sizes |
| Showcase Mode has no navigation affordance | User at a club night can't advance to next unit photo without keyboard | Show subtle left/right arrow buttons overlaid on the gallery; support keyboard arrow keys |
| Wishlist "convert to owned" button is in a confusing location | User can't figure out how to move a wishlist item to collection | Place the conversion action prominently in the wishlist item detail view, not in a context menu |
| Undercoat Log shows "—" for units with no undercoat recorded | Looks like missing data / error | Show a neutral "Not recorded" label or hide the field entirely for units without an undercoat entry |
| Spend Over Time chart shows a flat line for January-April if all purchases are recent | Chart looks broken (no data in most buckets) | Show only the months with data; use a reasonable X-axis range (e.g., last 12 months) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Painting Streak:** Streak shows 0 after midnight when user hasn't painted today (but painted yesterday) — this is correct
- [ ] **Painting Streak:** Logging a session today increments the streak counter immediately (TanStack Query invalidation works)
- [ ] **Painting Streak:** Streak with gap in the middle (Day 1, Day 2, Day 4) counts as 1 (only the most recent run)
- [ ] **Spend Over Time:** Units with `purchase_date = NULL` do not appear in any chart bucket (not as a phantom "Unknown month" bar)
- [ ] **Spend Over Time:** Chart renders correctly in production Tauri binary (Recharts SVG works in WebView2)
- [ ] **Battle Log:** Deleting an army list doesn't delete battle logs — they remain with `army_list_id = NULL`
- [ ] **Battle Log:** Battle logs page renders when some rows have `army_list_id = NULL`
- [ ] **Wishlist:** Wishlist items do NOT appear in the Collection page unit count or spending totals
- [ ] **Hobby Goals:** Goal progress updates when a unit's painting status is changed anywhere in the app
- [ ] **Showcase Mode:** Pressing ESC exits fullscreen (Tauri window restores to normal)
- [ ] **Showcase Mode:** App closes cleanly after being in fullscreen (no window state corruption)
- [ ] **Custom Lore:** Existing units with `lore_notes = NULL` render without errors
- [ ] **Undercoat Log:** Existing units with `undercoat = NULL` render without errors
- [ ] **All new migrations:** `lib.rs` `get_migrations()` vec has no version gaps; next version is 7
- [ ] **Velocity:** Zero sessions input returns `{ sessionsPerWeek: 0 }` (not NaN, not Infinity)
- [ ] **Date parsing:** All ISO date strings in streak/chart computation use `T00:00:00` suffix (not bare YYYY-MM-DD)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wishlist implemented as `is_wishlist` flag on units | HIGH | Add new `wishlist_items` table via migration; write data migration to move flagged units; remove flag from unit queries; rewrite UI |
| `updated_at` used for Hobby Goals date filter | MEDIUM | Switch to `painting_sessions.session_date` join; no data loss but query rewrite required |
| Streak broken by UTC timezone parsing | LOW | Fix `parseLocalDate()` utility; add `T00:00:00`; retest streak computation; no DB changes needed |
| Charting library incompatible with WebView2 | MEDIUM | Replace with Recharts + shadcn chart; chart components rewrite required |
| Battle log table re-created in migration (conflicts with 001) | LOW | Remove the CREATE TABLE from the new migration; `IF NOT EXISTS` prevents failure but wastes a migration version |
| `["painting-streak"]` not invalidated in session mutations | LOW | Add `invalidateQueries` calls to `useCreatePaintingSession` and `useDeletePaintingSession`; no data loss |
| Showcase Mode exits fullscreen incorrectly on app close | MEDIUM | Add `beforeunload` handler (Tauri's `onCloseRequested`) to call `setFullscreen(false)` |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Streak off-by-one (today/yesterday boundary) | Hobby Velocity / Streak phase — TDD Wave 0 | Unit test: 5 sessions ending yesterday → streak = 5; 5 sessions ending 2 days ago → streak = 0 |
| UTC timezone shift in date parsing | Hobby Velocity / Streak phase and Spend Over Time phase — `src/lib/dates.ts` utility | Unit test: `parseLocalDate('2026-05-03')` equals local midnight May 3, not UTC midnight |
| SQLite strftime timezone on user-entered dates | Schema migration phase — migration comment | Grep: no `DEFAULT (date('now'))` or `DEFAULT (datetime('now'))` on user-visible date columns |
| Charting library + Tauri WebView2 | Spend Over Time chart phase — library selection task 0 | Production build: chart renders with data, not blank |
| Migration version gaps + lib.rs | Every schema migration phase | Test: grep migration 007 SQL for expected table/column names; verify lib.rs version sequence has no gaps |
| Hobby Goals using `updated_at` for progress | Hobby Goals phase — query design in CONTEXT.md | Query review: no `updated_at` in the progress filter; uses `painting_sessions.session_date` |
| NULL `purchase_date` in chart grouping | Spend Over Time chart phase | Test: unit with `purchase_date = NULL` does not produce a chart bucket; SQL contains `IS NOT NULL` |
| Showcase Mode CSS-only fullscreen | Showcase Mode phase — capability + window API task 0 | Manual: Showcase Mode hides OS title bar in production build |
| Wishlist as flag on units | Wishlist phase — CONTEXT.md locked decision | Grep: no `is_wishlist` column in `units` table; no `WHERE is_wishlist = 0` in unit queries |
| Ready-to-Play INNER JOIN drops unlisted units | Ready-to-Play phase — query strategy review | Manual: painted unit not in any army list appears in Ready-to-Play output |
| `lore_notes` / `undercoat` non-nullable type | Custom Lore / Undercoat phases — type definition | TypeScript: field typed as `string \| null`; grep: no `unit.lore_notes.` without null guard |
| Battle log re-created in migration | Battle Log phase — read 001_core_schema.sql first | Migration SQL does not contain `CREATE TABLE battle_logs` without `IF NOT EXISTS` |
| Missing cache invalidation for new query keys | Every v2.2 feature phase | Per-hook test: mutation → query key invalidated → dependent view updates without page reload |
| NaN in velocity computation | Hobby Velocity Tracker phase — TDD Wave 0 | Unit test: `computeVelocity([])` returns `{ sessionsPerWeek: 0 }` |
| Battle result free-text inconsistency | Battle Log phase — type definition | TypeScript: `BATTLE_RESULTS` const defined; result field uses Select not Input |

---

## Sources

- `src-tauri/migrations/001_core_schema.sql` — `battle_logs` pre-existing table definition; `units` nullable columns; `image_assets` polymorphic pattern (HIGH confidence — direct audit)
- `src-tauri/migrations/005_hobby_journal.sql` — `painting_sessions` table; `session_date TEXT NOT NULL` (HIGH confidence)
- `src-tauri/migrations/006_spend_pence.sql` — `purchase_price_pence INTEGER` pattern; COALESCE migration approach (HIGH confidence)
- `src-tauri/src/lib.rs` — migration registration pattern; current max version = 6 (HIGH confidence — direct audit)
- `src/types/paintingSession.ts` — session_date as `ISO 'YYYY-MM-DD'` documented (HIGH confidence)
- `src/types/unit.ts` — `purchase_date: string | null`, `purchase_price_pence: number | null` (HIGH confidence)
- `src/db/queries/spending.ts` — COALESCE(SUM(...), 0) pattern; `WHERE owned = 1` pattern (HIGH confidence)
- `src/db/queries/units.ts` — `purchase_price_pence = $18` unconditional assignment (not COALESCE) pattern (HIGH confidence)
- `src/features/units/JournalTab.tsx` — `todayISO()` uses `toISOString().split('T')[0]` — UTC-based, flagged for correction (HIGH confidence)
- `package.json` — no charting library present; recharts/d3/nivo all absent (HIGH confidence)
- MDN ECMAScript spec: date-only string `YYYY-MM-DD` parsed as UTC — confirmed behavior (HIGH confidence)
- Tauri v2 docs: `getCurrentWindow().setFullscreen()` — core:window:allow-set-fullscreen capability required (HIGH confidence)
- SQLite official docs: `GROUP BY` includes NULL as distinct group; `SUM()` of 0 rows returns NULL (HIGH confidence)
- `.planning/research/PITFALLS.md` (v2.1) — existing pitfalls context; v2.2 pitfalls do not duplicate those already resolved (HIGH confidence)
- `.planning/phases/14-spending-tracker/14-RESEARCH.md` — cache invalidation pitfall documented and resolved in v2.1 (HIGH confidence)

---
*Pitfalls research for: HobbyForge v2.2 — Full Circle (Battle Log, Wishlist, Hobby Goals, Hobby Velocity, Spend Over Time, Painting Streak, Ready-to-Play, Showcase Mode, Lore Notes, Undercoat Log)*
*Researched: 2026-05-04*
