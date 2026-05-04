# Phase 19: Analytics Core - Research

**Researched:** 2026-05-04
**Domain:** React charting (Recharts/shadcn), SQLite analytical queries, hobby metric calculations
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dashboard gets a new "HOBBY HEALTH" section placed **between the Progress row and the By Faction section**
- Section label follows existing uppercase tracking-widest pattern (`text-sm font-semibold uppercase tracking-widest text-muted-foreground`)
- `grid-cols-2` full-width row — same layout pattern as the Progress `grid-cols-3` row
- Uses existing `StatCard` component with `animate={false}` (values are strings, not integers)
- Section always renders even when no journal sessions exist — shows `"0.0"` / `"0 days"` rather than hiding
- Hobby Velocity: 1 decimal place string (e.g. `"3.1"`), label `"Hobby Velocity · units/month"`, all-time average (`distinct unit_ids with sessions ÷ months between first and last session date`), shows `"0.0"` when no sessions
- Painting Streak: value baked into string `"N days"` or `"0 days"`, label `"Painting Streak"`, consecutive calendar days with at least one painting session, uses `dates.ts` UTC utility
- Spend trend: **Bar chart**, rolling **last 12 months**, Recharts `BarChart` wrapped in shadcn `ChartContainer`, Y-axis and tooltip use `formatCurrency()`, NULL `purchase_date` rows excluded (ANLY-07)
- Chart placed **between hero total card and faction breakdown table** in SpendingPage
- Chart section heading `"Monthly Trend"` (`text-base font-semibold`)
- Inside existing `max-w-3xl mx-auto` wrapper
- No-data state: chart still renders 12 zero-value bars + muted note `"Add purchase dates to units and paints to see trends"` — always present in `!isEmpty` branch

### Claude's Discretion
- Exact bar fill colour — use `hsl(var(--chart-1))` from shadcn chart token (locked in UI-SPEC)
- Bar corner radius `[3, 3, 0, 0]`, bar width auto (no barSize override) — locked in UI-SPEC
- X-axis label format — `"Jan"` abbreviation, `"Jan '25"` style when crossing calendar year boundary
- Whether to show grid lines — `CartesianGrid vertical={false}` (horizontal only) — locked in UI-SPEC
- `react-is ^19.0.0` override placement — goes in `pnpm.overrides` block (project uses pnpm)
- Whether velocity and streak queries are folded into existing `useDashboardStats` or a separate `useHobbyAnalytics` hook — separate hook per STATE.md architecture constraint

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANLY-04 | Dashboard shows hobby velocity — average units worked on per month from journal session history | SQL query over `painting_sessions`: `COUNT(DISTINCT unit_id)` and date-math for months between first/last session; pure `computeHobbyAnalytics.ts` function |
| ANLY-05 | Dashboard shows current painting streak — consecutive calendar days with at least one journal session | SQL `SELECT DISTINCT session_date FROM painting_sessions ORDER BY session_date DESC`; streak loop using `parseLocalDate` + `todayISO` from `dates.ts` |
| ANLY-06 | Spending page shows a monthly spend trend chart combining unit and paint purchases | New `SpendTrendChart` component using shadcn `ChartContainer` + Recharts `BarChart`; monthly bucketing SQL query over `units` + `paints` where `purchase_date IS NOT NULL` |
| ANLY-07 | Spend trend chart uses purchase_date for both units and paints (purchase_date on paints added by migration 008) | `paints.purchase_date` added by `008_enrichment.sql` (Phase 17); units already had `purchase_date TEXT` in `001_core_schema.sql` |
</phase_requirements>

---

## Summary

Phase 19 adds two hobby-health metrics to the Dashboard and a monthly spend trend bar chart to the Spending page. All data comes from existing SQLite tables — no new migrations are required. The key technical work is:

1. **Recharts install via shadcn**: `npx shadcn@latest add chart` installs recharts as a transitive dep and creates `src/components/ui/chart.tsx`. A `pnpm.overrides` block for `react-is: ^19.0.0` is needed in `package.json` because recharts declares a peer dep on react-is <18 but the project runs React 19.

2. **Three new SQL queries**: velocity (COUNT DISTINCT unit_ids + date-math), streak (DISTINCT session_dates, loop from today backwards), and monthly spend buckets (UNION from units + paints bucketed into 12-month rolling window).

3. **New `analytics.ts` query module + `useHobbyAnalytics` hook + `computeHobbyAnalytics.ts` pure function**: follows the established `dashboard.ts` / `useDashboardStats` / `computeStats` pattern exactly. The hook uses `["hobby-analytics"]` cache key (documented in STATE.md).

4. **SpendTrendChart component**: new isolated component wrapping Recharts inside shadcn's `ChartContainer`. Chart bars use `var(--color-chart-1)` (not faction-accent) so the chart stays visually stable across faction theme changes.

**Primary recommendation:** Implement the Recharts install + package.json `pnpm.overrides` as Wave 0 work (before any implementation), then follow the established computeXxx / queryModule / hook / page-integration layered approach used in Phases 13–18.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | transitive via `shadcn add chart` (~2.15.x) | SVG bar chart rendering | Industry-standard React charting lib; shadcn wraps it; 1M+ weekly downloads |
| shadcn chart (`chart.tsx`) | n/a (copy-pasted by shadcn CLI) | `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` | Project already uses shadcn; chart component is the official shadcn chart story |
| react-is | ^19.0.0 (override) | Recharts peer dep resolution for React 19 | Recharts declares peer dep on older react-is; override unblocks install on React 19 project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | ^5.100.6 (already installed) | `useQuery` for `useHobbyAnalytics` hook | Same hook pattern used by every other data hook in the project |
| dates.ts (`todayISO`, `parseLocalDate`) | in-project (Phase 17) | Timezone-safe streak calculation | MUST be used — prevents off-by-one errors for users east/west of UTC |
| formatCurrency | in-project (Phase 14) | Y-axis tick formatter + tooltip | Only valid location for `/100` division — must not be bypassed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts via shadcn | Chart.js, Victory, Nivo | Recharts is the shadcn-blessed choice; others would require custom styling and have no ChartContainer wrapper |
| Separate `useHobbyAnalytics` hook | Fold into `useDashboardStats` | Separate hook keeps cache keys independent; `["hobby-analytics"]` invalidation can be targeted (SpendingPage also needs monthly data without dashboard overhead) |
| SQL-only velocity/streak computation | JS-side computation on all session rows | SQL COUNT DISTINCT + MIN/MAX is cheaper than fetching all rows; streak SQL only needs DISTINCT dates |

**Installation:**
```bash
# Add react-is override to package.json FIRST (pnpm.overrides block):
# "pnpm": { "overrides": { "react-is": "^19.0.0" } }
pnpm add react-is
npx shadcn@latest add chart
```

**Version verification:** recharts is installed as a transitive dep of the shadcn chart component. The version installed will be whatever shadcn's registry pins at time of install (currently ~2.15.x). After install, confirm with `pnpm list recharts`.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── db/queries/
│   └── analytics.ts          # NEW — velocity + streak + monthly-spend queries
├── features/
│   ├── dashboard/
│   │   ├── DashboardPage.tsx  # MODIFIED — add HOBBY HEALTH section
│   │   └── computeHobbyAnalytics.ts  # NEW — pure computation (velocity, streak)
│   └── spending/
│       ├── SpendingPage.tsx   # MODIFIED — add Monthly Trend section
│       └── SpendTrendChart.tsx # NEW — Recharts BarChart component
├── hooks/
│   └── useHobbyAnalytics.ts  # NEW — ["hobby-analytics"] query key
└── components/ui/
    └── chart.tsx             # NEW — added by `shadcn add chart`
```

### Pattern 1: Query Module + Pure Compute Function + Hook (established convention)
**What:** All data fetching via `getDb()` + raw SQL in `src/db/queries/`. Pure aggregation in `computeXxx.ts`. Hook wraps with `useQuery`.
**When to use:** Always — every data feature in this project uses this pattern.
**Example:**
```typescript
// analytics.ts — mirrors spending.ts pattern
export interface RawAnalyticsData {
  sessions: { unit_id: number; session_date: string }[];
  monthlySpend: { month: string; pence: number }[];
}

export async function getAnalyticsData(): Promise<RawAnalyticsData> {
  const db = await getDb();
  const [sessions, monthlySpend] = await Promise.all([
    db.select<{ unit_id: number; session_date: string }[]>(
      "SELECT DISTINCT unit_id, session_date FROM painting_sessions ORDER BY session_date"
    ),
    db.select<{ month: string; pence: number }[]>(`
      SELECT strftime('%Y-%m', purchase_date) AS month,
             COALESCE(SUM(purchase_price_pence), 0) AS pence
        FROM (
          SELECT purchase_date, purchase_price_pence FROM units WHERE purchase_date IS NOT NULL
          UNION ALL
          SELECT purchase_date, purchase_price_pence FROM paints WHERE purchase_date IS NOT NULL
        )
       WHERE month >= strftime('%Y-%m', date('now', '-11 months'))
       GROUP BY month
       ORDER BY month
    `)
  ]);
  return { sessions, monthlySpend };
}
```

### Pattern 2: computeHobbyAnalytics Pure Function
**What:** Takes raw `sessions` array and `monthlySpend` from SQL and returns computed metrics ready for display.
**When to use:** All computation logic lives here — testable in isolation, no Tauri IPC needed.

```typescript
// computeHobbyAnalytics.ts
export interface HobbyAnalytics {
  velocityString: string;   // "3.1" or "0.0"
  streakString: string;     // "14 days" or "0 days"
  monthlyData: { month: string; pence: number }[]; // 12 entries
}

export function computeHobbyAnalytics(
  sessions: { unit_id: number; session_date: string }[],
  rawMonthlySpend: { month: string; pence: number }[]
): HobbyAnalytics {
  // velocity: distinct unit_ids ÷ months between first and last date
  // streak: walk backwards from todayISO(), check Set<session_date>
  // monthlyData: build 12-entry array for last 12 months, fill gaps with 0
}
```

### Pattern 3: shadcn ChartContainer + Recharts BarChart
**What:** `ChartContainer` provides responsive sizing and CSS variable injection. `BarChart` renders inside it.
**When to use:** Wrapping all Recharts usage.

```typescript
// SpendTrendChart.tsx
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/formatCurrency";

const chartConfig = {
  pence: { label: "Spend", color: "hsl(var(--chart-1))" },
};

export function SpendTrendChart({ data }: { data: { month: string; pence: number }[] }) {
  const allZero = data.every((d) => d.pence === 0);
  return (
    <>
      <ChartContainer config={chartConfig} className="h-60">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(v) => formatCurrency(v)} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />} />
          <Bar dataKey="pence" fill="var(--color-pence)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartContainer>
      {allZero && (
        <p className="text-sm text-muted-foreground text-center">
          Add purchase dates to units and paints to see trends
        </p>
      )}
    </>
  );
}
```

### Pattern 4: 12-Month Rolling Window Construction (JS-side)
**What:** SQL only returns months that have data. JS must pad to 12 entries with zero for months without spend.
**When to use:** Monthly spend bucketing.

```typescript
// Build 12-month labels and merge with SQL results
function buildRollingWindow(raw: { month: string; pence: number }[]): { month: string; pence: number }[] {
  const lookup = new Map(raw.map((r) => [r.month, r.pence]));
  const result: { month: string; pence: number }[] = [];
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = buildLabel(d, today); // "Jan" or "Jan '25"
    result.push({ month: label, pence: lookup.get(key) ?? 0 });
  }
  return result;
}
```

### Pattern 5: Streak Calculation Using dates.ts
**What:** Walk backwards from `todayISO()` checking a `Set` of session dates. Stop when gap found.
**When to use:** ANLY-05 painting streak.

```typescript
import { todayISO, parseLocalDate } from "@/lib/dates";

function computeStreak(sessionDates: Set<string>): number {
  let streak = 0;
  let cursor = parseLocalDate(todayISO());
  while (true) {
    const key = formatDateKey(cursor); // YYYY-MM-DD
    if (!sessionDates.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
```

### Pattern 6: Velocity Calculation
**What:** `distinct unit_ids ÷ months between first and last session date`.
**Edge cases:** 0 sessions → `"0.0"`; 1 session (same day) → treat as 1 month minimum to avoid division by zero.

```typescript
function computeVelocity(sessions: { unit_id: number; session_date: string }[]): string {
  if (sessions.length === 0) return "0.0";
  const unitIds = new Set(sessions.map((s) => s.unit_id));
  const dates = sessions.map((s) => s.session_date).sort();
  const first = parseLocalDate(dates[0]);
  const last = parseLocalDate(dates[dates.length - 1]);
  const monthsDiff = (last.getFullYear() - first.getFullYear()) * 12
    + (last.getMonth() - first.getMonth());
  const months = Math.max(monthsDiff, 1); // minimum 1 month
  return (unitIds.size / months).toFixed(1);
}
```

### Anti-Patterns to Avoid
- **Conditionally hiding HOBBY HEALTH**: always render — show `"0.0"` / `"0 days"` when no sessions
- **animate={true} on string StatCard values**: StatCard's `useCountUp` is only safe on integers; velocity and streak are strings, use `animate={false}`
- **Applying faction-accent to chart bars**: use `var(--color-chart-1)` so chart color is stable across faction theme changes
- **Dividing pence in query or compute layer**: integer pence travels through the entire pipeline; `formatCurrency` is the only division site
- **Nesting recharts inside another Radix portal**: SpendTrendChart is not a Radix component — no portal collision, but do not inadvertently wrap it in a Sheet/Dialog
- **NULL purchase_date bucketed as epoch**: SQL `WHERE purchase_date IS NOT NULL` in both units and paints UNION — never bucket NULL dates to "1970-01"
- **Direct new Date() in streak calculation**: must use `parseLocalDate(todayISO())` from `dates.ts` to avoid UTC edge case

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive SVG chart sizing | Manual SVG viewBox math | `ChartContainer` from shadcn chart | ChartContainer handles ResponsiveContainer wrapping and CSS variable color injection |
| Chart tooltip styling | Custom tooltip component | `ChartTooltip` + `ChartTooltipContent` | shadcn ChartTooltipContent accepts a `formatter` prop for value formatting |
| pence → currency display in chart | Custom `/100` inline | `formatCurrency(v)` | formatCurrency is the only valid `/100` site per integer-pence discipline |
| CSS variable color theming for chart | Hardcoded hex in fill | `var(--color-chart-1)` via ChartContainer config | ChartContainer maps config keys to CSS vars automatically |
| Date timezone handling | `new Date().toISOString().split("T")[0]` | `todayISO()` + `parseLocalDate()` from `dates.ts` | jsdom + user timezones cause off-by-one; dates.ts exists specifically for this |

**Key insight:** The shadcn chart component abstracts the most error-prone parts of Recharts (responsive container, color variables, tooltip formatting). Bypassing ChartContainer would require re-implementing these features manually.

---

## Common Pitfalls

### Pitfall 1: react-is Peer Dependency Conflict
**What goes wrong:** `pnpm add recharts` (or `shadcn add chart`) fails or shows peer dep warnings because recharts declares `react-is` as a peer dependency with a version range that doesn't include `^19.x`.
**Why it happens:** Recharts ships its peer dep range narrowly; this project runs React 19.
**How to avoid:** Add `"pnpm": { "overrides": { "react-is": "^19.0.0" } }` to `package.json` BEFORE running `shadcn add chart`. Then `pnpm add react-is` to ensure the package is present.
**Warning signs:** `pnpm install` warns about unresolved peer dependencies; Recharts imports crash at runtime.

### Pitfall 2: Velocity Division by Zero (Single Session)
**What goes wrong:** If all sessions occurred on the same date, `monthsDiff = 0` and `unitIds.size / 0 = Infinity`.
**Why it happens:** `last - first = 0 months` is a real valid state (user only painted today).
**How to avoid:** `const months = Math.max(monthsDiff, 1)` — treat 0-month span as 1 month minimum.
**Warning signs:** `"Infinity"` appears in velocity StatCard display.

### Pitfall 3: Monthly Spend — SQL Gaps vs JS Padding
**What goes wrong:** SQL GROUP BY only returns months that have data. If March has no spend, March is missing from the result — chart shows fewer than 12 bars.
**Why it happens:** GROUP BY collapses rows, never inserts absent keys.
**How to avoid:** Build the full 12-month label array in `computeHobbyAnalytics.ts` JS, then merge SQL results into it with `?? 0` for missing months.
**Warning signs:** Chart occasionally shows 11, 10, or fewer bars.

### Pitfall 4: purchase_date on Units vs Paints Schema Difference
**What goes wrong:** `units.purchase_date` has existed since `001_core_schema.sql`. `paints.purchase_date` was added by `008_enrichment.sql` (Phase 17). If the migration hasn't run (fresh DB), paints has no `purchase_date` column — UNION query fails.
**Why it happens:** `008_enrichment.sql` is a Phase 17 migration; if a developer runs an old DB without applying it, the column is absent.
**How to avoid:** No special mitigation needed in Phase 19 code — `008_enrichment.sql` is already in the migrations sequence and will have been applied by `tauri-plugin-sql`. Document the dependency in tests.
**Warning signs:** SQLite error "no such column: purchase_date" on paints table.

### Pitfall 5: Streak Off-By-One for Non-UTC Users
**What goes wrong:** Streak calculation using `new Date().toISOString()` produces the wrong date for users in UTC+X or UTC-X timezones, potentially missing today's session.
**Why it happens:** `toISOString()` returns UTC time; a user at UTC+10 at 11pm gets "tomorrow's" date; a user at UTC-5 at midnight gets "yesterday's" date.
**How to avoid:** Use `todayISO()` from `dates.ts` which uses `getFullYear/getMonth/getDate` in local timezone. Use `parseLocalDate()` for date arithmetic in the streak loop.
**Warning signs:** Streak resets unexpectedly or includes future dates in test fixtures.

### Pitfall 6: X-Axis Label Crossing Calendar Year Boundary
**What goes wrong:** A 12-month window spanning two years (e.g. May 2025 – May 2026) shows two "Jan" labels — ambiguous.
**Why it happens:** Short month abbreviations repeat annually.
**How to avoid:** Detect year-crossing in the 12-month window; render `"Jan '25"` style labels for months that belong to the year before the current year.
**Warning signs:** Two identical "Jan" bars on the chart.

### Pitfall 7: SpendingPage Chart State Machine
**What goes wrong:** The Monthly Trend chart might render inside the `isEmpty` branch, or might try to render before `useHobbyAnalytics` resolves.
**Why it happens:** SpendingPage has two data sources: `useSpendingStats` (existing) and `useHobbyAnalytics` (new). They load independently.
**How to avoid:** Per UI-SPEC state machine: chart is inside `!isEmpty` branch only. Chart renders its own `<Skeleton className="h-60 w-full" />` while analytics is loading — does NOT block hero card or breakdown from showing. Hero card + breakdown come from `useSpendingStats`; chart comes from `useHobbyAnalytics`.
**Warning signs:** Skeleton covering the entire SpendingPage while chart loads; chart rendering in empty state.

---

## Code Examples

### SQL: Velocity + Streak (raw data fetch)
```sql
-- Fetch all DISTINCT (unit_id, session_date) pairs for velocity and streak computation
-- Planner: sort is optional here since compute function will process them
SELECT DISTINCT unit_id, session_date
  FROM painting_sessions
 ORDER BY session_date ASC;
```

### SQL: Monthly Spend Bucketing (UNION, NULL excluded)
```sql
-- Returns only months that have data (JS fills gaps)
SELECT strftime('%Y-%m', purchase_date) AS month,
       COALESCE(SUM(purchase_price_pence), 0) AS pence
  FROM (
    SELECT purchase_date, purchase_price_pence
      FROM units
     WHERE purchase_date IS NOT NULL AND purchase_price_pence IS NOT NULL
    UNION ALL
    SELECT purchase_date, purchase_price_pence
      FROM paints
     WHERE purchase_date IS NOT NULL AND purchase_price_pence IS NOT NULL
  )
 WHERE month >= strftime('%Y-%m', date('now', '-11 months'))
 GROUP BY month
 ORDER BY month ASC;
```

### Hook: useHobbyAnalytics
```typescript
// src/hooks/useHobbyAnalytics.ts
import { useQuery } from "@tanstack/react-query";
import { getAnalyticsData } from "@/db/queries/analytics";
import { computeHobbyAnalytics, type HobbyAnalytics } from "@/features/analytics/computeHobbyAnalytics";

export const HOBBY_ANALYTICS_KEY = ["hobby-analytics"] as const;

export function useHobbyAnalytics() {
  return useQuery<HobbyAnalytics, Error>({
    queryKey: HOBBY_ANALYTICS_KEY,
    queryFn: async () => {
      const { sessions, monthlySpend } = await getAnalyticsData();
      return computeHobbyAnalytics(sessions, monthlySpend);
    },
  });
}
```

### DashboardPage: HOBBY HEALTH section insertion point
The section goes between the PROGRESS `</section>` and the BY FACTION `<section>`:
```tsx
{/* Progress section */}
<section className="flex flex-col gap-4">
  <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Progress</p>
  <div className="grid grid-cols-3 gap-6">...</div>
</section>

{/* HOBBY HEALTH section — NEW */}
<section className="flex flex-col gap-4">
  <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
    Hobby Health
  </p>
  <div className="grid grid-cols-2 gap-6">
    {analyticsLoading ? (
      <>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </>
    ) : (
      <>
        <StatCard value={analytics?.velocityString ?? "0.0"} label="Hobby Velocity · units/month" animate={false} />
        <StatCard value={analytics?.streakString ?? "0 days"} label="Painting Streak" animate={false} />
      </>
    )}
  </div>
</section>

{/* By Faction section */}
<section className="flex flex-col gap-4">...</section>
```

### Loading skeleton for chart (SpendingPage)
```tsx
{analyticsLoading ? (
  <Skeleton className="h-60 w-full rounded-lg" />
) : (
  <SpendTrendChart data={analytics?.monthlyData ?? []} />
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chart.js as default React chart | Recharts for shadcn projects | ~2023 (shadcn chart release) | shadcn chart component wraps recharts; project must follow shadcn's choice |
| recharts direct color props | CSS variable color injection via ChartContainer config | shadcn chart v1 | Colors are now set via config object + CSS vars, not hardcoded in JSX |
| `react-is` bundled with react-dom | Separate optional package | React 17+ | recharts peer dep requires explicit install + override for React 19 projects |

**Deprecated/outdated:**
- Raw `new Date().toISOString().split("T")[0]` for today's date: replaced by `todayISO()` in Phase 17 — do not use anywhere in Phase 19
- `purchase_price REAL` on units: superseded by `purchase_price_pence INTEGER` in Phase 14 — analytics queries must reference `purchase_price_pence` only

---

## Open Questions

1. **computeHobbyAnalytics file location**
   - What we know: `computeStats.ts` lives in `src/features/dashboard/`. STATE.md says new query module is `src/db/queries/analytics.ts` but doesn't specify the compute function location.
   - What's unclear: Should `computeHobbyAnalytics.ts` live in `src/features/dashboard/` (since velocity+streak display there) or in `src/features/analytics/` (new folder)?
   - Recommendation: Place in `src/features/dashboard/computeHobbyAnalytics.ts` to mirror `computeStats.ts`. The monthly data computation can live in the same file since it is consumed by SpendingPage via the hook, not by direct import. Alternatively a top-level `src/features/analytics/` folder could be created but adds folder for just one file.

2. **X-axis year disambiguation**
   - What we know: UI-SPEC says `"Jan"` for normal months, `"Jan '25"` when crossing a calendar year boundary.
   - What's unclear: Exact condition — is it "any month in a different year than the most recent month"?
   - Recommendation: If the window's oldest month is in a different year than the newest, render year suffix for all months not in the current year. E.g. window May 2025 – Apr 2026: all 2025 months get `"' 25"` suffix.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANLY-04 | `computeHobbyAnalytics` velocity: 0 sessions → `"0.0"`, single session → 1-month floor, multi-session correct average | unit | `pnpm test -- --reporter=verbose tests/analytics/computeHobbyAnalytics.test.ts` | ❌ Wave 0 |
| ANLY-05 | `computeHobbyAnalytics` streak: 0 sessions → `"0 days"`, streak-breaking gap → correct count, today included | unit | `pnpm test -- --reporter=verbose tests/analytics/computeHobbyAnalytics.test.ts` | ❌ Wave 0 |
| ANLY-06 | `computeHobbyAnalytics` monthlyData: 12 entries always, gaps filled with 0, month labels correct | unit | `pnpm test -- --reporter=verbose tests/analytics/computeHobbyAnalytics.test.ts` | ❌ Wave 0 |
| ANLY-07 | `getAnalyticsData` (mocked) SQL includes `purchase_date IS NOT NULL` filter for both units and paints | unit (mock) | `pnpm test -- --reporter=verbose tests/analytics/analyticsQueries.test.ts` | ❌ Wave 0 |
| ANLY-04/05 | `HOBBY_ANALYTICS_KEY` === `["hobby-analytics"]` — cache key contract | unit | `pnpm test -- --reporter=verbose tests/analytics/useHobbyAnalytics.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test` (full suite — runs in ~3–5s)
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/analytics/computeHobbyAnalytics.test.ts` — covers ANLY-04, ANLY-05, ANLY-06 (velocity + streak + monthlyData computation)
- [ ] `tests/analytics/analyticsQueries.test.ts` — covers ANLY-07 (SQL query mock verifying NULL purchase_date exclusion, confirms HOBBY_ANALYTICS_KEY)
- [ ] `tests/analytics/useHobbyAnalytics.test.ts` — cache key contract (mirrors `tests/spending/useSpendingStats.test.ts` pattern)

---

## Sources

### Primary (HIGH confidence)
- Codebase scan (direct file reads): DashboardPage.tsx, SpendingPage.tsx, useDashboardStats.ts, useSpendingStats.ts, computeStats.ts, computeSpendingStats.ts, spending.ts query, dashboard.ts query, paintingSessions.ts query, StatCard.tsx, dates.ts, formatCurrency.ts
- Migration files: 001_core_schema.sql (units.purchase_date confirmed), 005_hobby_journal.sql (painting_sessions schema), 006_spend_pence.sql (purchase_price_pence), 008_enrichment.sql (paints.purchase_date added by Phase 17)
- `.planning/phases/19-analytics-core/19-CONTEXT.md` — all locked decisions
- `.planning/phases/19-analytics-core/19-UI-SPEC.md` — visual contract, component inventory, bar chart code sketch
- `.planning/STATE.md` — architecture constraints, `["hobby-analytics"]` key documented, pnpm as package manager
- `package.json` — recharts NOT yet installed, react-is NOT yet installed, no overrides block yet

### Secondary (MEDIUM confidence)
- Existing test file patterns: `tests/spending/useSpendingStats.test.ts`, `tests/dashboard/computeStats.test.ts`, `tests/hobby-journal/paintingSessionQueries.test.ts` — verified exact mock/fixture patterns
- `vitest.config.ts` — confirmed jsdom environment, `tests/**/*.test.ts` glob

### Tertiary (LOW confidence)
- Recharts ChartContainer/ChartTooltip API shape inferred from UI-SPEC code snippets (chart.tsx not yet installed, cannot verify exact import names until `shadcn add chart` runs)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pnpm as package manager confirmed in STATE.md; recharts/shadcn chart pattern confirmed in CONTEXT.md + UI-SPEC; react-is override confirmed as project requirement
- Architecture: HIGH — all patterns verified directly from existing codebase files (dashboard.ts, spending.ts, computeStats.ts, useSpendingStats.ts)
- Pitfalls: HIGH — division by zero, NULL purchase_date, streak off-by-one, and year boundary all derived from schema inspection + date utility code; react-is peer dep confirmed by checking package.json (no overrides block present)
- SQL queries: HIGH — schema verified from migration files; units.purchase_date in 001, paints.purchase_date in 008
- Recharts API surface (ChartContainer internals): MEDIUM — chart.tsx not installed yet; API shape from UI-SPEC snippets matches recharts docs

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (stable libraries; recharts API unlikely to change in 30 days)
