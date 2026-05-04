# Phase 19: Analytics Core - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two auto-calculated hobby health metrics to the Dashboard (Hobby Velocity + Painting Streak) and a monthly spend trend bar chart to the Spending page. All data comes from existing tables — `painting_sessions` (Phase 13) and `purchase_date` / `purchase_price_pence` on units and paints (Phases 14 + 17). No new database tables. Chart library (Recharts via shadcn) is not yet installed.

</domain>

<decisions>
## Implementation Decisions

### Dashboard layout
- New dedicated "HOBBY HEALTH" section placed **between the Progress row and the By Faction section**
- Section label follows the existing uppercase tracking-widest pattern (matches "PROGRESS", "BY FACTION")
- `grid-cols-2` full-width row — same layout pattern as the Progress `grid-cols-3` row
- Uses the existing `StatCard` component with `animate={true}` — no new card style
- Always rendered even when no journal sessions exist — shows `0` / `"0 days"` rather than hiding the section

### Hobby Velocity display
- Value: decimal with 1 decimal place (e.g. `"3.1"`) — not integer-rounded
- StatCard label: `"Hobby Velocity"` with a sub-label or suffix `"units/month"`
- Calculation: all-time average — `distinct unit_ids with sessions ÷ months between first and last session date`
- Shows `"0.0"` when no sessions exist

### Painting Streak display
- Value: the count with unit baked in — e.g. `"14 days"` (not just `14`)
- StatCard label: `"Painting Streak"`
- Shows `"0 days"` when streak is zero — consistent format, no special-case messaging
- Streak = consecutive calendar days with at least one painting session; uses `dates.ts` UTC utility to avoid off-by-one

### Spend trend chart type
- **Bar chart** — one bar per calendar month, natural for discrete monthly totals
- Renders using Recharts `BarChart` wrapped in shadcn `ChartContainer`
- Rolling **last 12 months** window — fixed count, never overcrowded, months with zero spend show as zero-height bars
- Y-axis and tooltip use `formatCurrency()` (existing utility) — e.g. `"£12.50"`
- ANLY-07: entries with `NULL purchase_date` are excluded from chart data (not bucketed to epoch)

### Chart placement in SpendingPage
- Position: **between the hero total card and the faction breakdown table**
  - Narrative flow: Total → How it changed over time → How it breaks down by faction
- Section heading: `"Monthly Trend"` (same `text-base font-semibold` as `"Breakdown"` heading)
- Inside the existing `max-w-3xl mx-auto` wrapper — consistent with the rest of the page
- **No purchase_date data state**: chart still renders 12 zero-value bars + a muted note below:
  `"Add purchase dates to units and paints to see trends"` — chart section is always present, not conditionally hidden

### Claude's Discretion
- Exact bar fill colour (faction-accent or a muted chart colour from shadcn's default palette)
- Bar corner radius / bar width
- X-axis label format for month (e.g. "Jan", "Jan '25", "01/25")
- Whether to show the Y-axis grid lines or just the axis ticks
- `react-is ^19.0.0` override placement in package.json (required for Recharts peer dep)
- Whether velocity and streak queries are folded into the existing `useDashboardStats` or a separate `useHobbyAnalytics` hook

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §ANLY-04..07 — Full acceptance criteria for velocity, streak, spend chart, and purchase_date scoping

### Schema
- `src-tauri/migrations/001_core_schema.sql` — `painting_sessions` table (session_date, unit_id)
- `src-tauri/migrations/rules_002_wargear_abilities.sql` — check for any purchase_date additions (Phase 17 migration)
- Look for the Phase 17 migration file (likely `007_enrichment.sql` or similar) — defines `purchase_date TEXT` on paints and units

### Existing code to extend
- `src/features/dashboard/DashboardPage.tsx` — current section structure (top stats → Progress → By Faction → Lists); Hobby Health section inserted before By Faction
- `src/features/spending/SpendingPage.tsx` — current layout (hero card → breakdown table); Monthly Trend chart inserted between them
- `src/hooks/useDashboardStats.ts` — existing `["dashboard-stats"]` key and pattern to mirror or extend
- `src/hooks/useSpendingStats.ts` — existing `["spending-stats"]` key and pattern
- `src/lib/dates.ts` — UTC date utility from Phase 17; required for streak calculation

### Prior phase context
- `.planning/STATE.md` §Architecture constraints — confirms `analytics.ts` module with `["hobby-analytics"]` key; confirms `react-is ^19.0.0` override requirement for Recharts
- `.planning/phases/13-hobby-journal/13-CONTEXT.md` — painting sessions data model (session_date column, per-unit structure)
- `.planning/phases/14-spending-tracker/14-CONTEXT.md` — integer pence discipline, `formatCurrency` as the only /100 site

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/dashboard/StatCard.tsx` — existing card component with `animate` prop; Hobby Velocity + Painting Streak use this directly
- `src/features/dashboard/computeStats.ts` — pure computation pattern to mirror for `computeHobbyAnalytics.ts`
- `src/lib/formatCurrency.ts` — existing currency formatter; used for chart Y-axis and tooltip
- `src/lib/dates.ts` — UTC-safe date utility from Phase 17; streak calculation must use this
- `src/hooks/useSpendingStats.ts` — hook pattern to mirror for new analytics hook

### Established Patterns
- All queries via `tauri-plugin-sql` directly — no ORM
- Query modules in `src/db/queries/`, hook modules in `src/hooks/` — new `analytics.ts` + `useHobbyAnalytics.ts` follows this
- TDD Wave 0 pattern: stub tests first, then implementation, then flip stubs to active (used in Phases 11–18)
- `computeXxx` pure function pattern (computeStats, computeSpendingStats) — analytics computation goes in its own pure function
- Integer pence discipline — spend data stays in pence until `formatCurrency` formats it for display

### Integration Points
- `src/features/dashboard/DashboardPage.tsx` — add `<section>` with "HOBBY HEALTH" label + 2-card `grid-cols-2` between Progress section and By Faction section
- `src/features/spending/SpendingPage.tsx` — add "Monthly Trend" `<section>` with shadcn `ChartContainer` + Recharts `BarChart` between hero card and Breakdown section
- `src/db/queries/analytics.ts` — new module (does not exist yet); contains velocity and streak SQL queries + monthly spend bucketing query
- `src/hooks/useHobbyAnalytics.ts` — new hook (does not exist yet); wraps analytics queries with `["hobby-analytics"]` key
- New session mutations should invalidate `["hobby-analytics"]` (mirrors how unit mutations invalidate `["dashboard-stats"]`)
- `package.json` — needs `react-is: ^19.0.0` override for Recharts peer dependency + `shadcn add chart` installs `src/components/ui/chart.tsx`

</code_context>

<specifics>
## Specific Ideas

No specific visual references given beyond the layout mockup discussed:
```
[ Total Models ] [ Painted ] [ Battle-Ready Pts ] [ Active Projects ]

PROGRESS
[ Painting % ] [ Assembly % ] [ Basing % ]

HOBBY HEALTH
[ Hobby Velocity ] [ Painting Streak ]

BY FACTION
...
```

And for Spending page:
```
[ Total Hobby Spend hero card          ]

MONTHLY TREND
[ Bar chart (12 months)                ]
  "Add purchase dates..." note if all-zero

BREAKDOWN
[ Faction | Spend table                ]
```

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 19-analytics-core*
*Context gathered: 2026-05-04*
