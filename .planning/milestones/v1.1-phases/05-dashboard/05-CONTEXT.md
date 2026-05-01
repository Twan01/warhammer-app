# Phase 5: Dashboard - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

A single Dashboard page that live-computes and displays aggregated stats from existing data — answering "what do I own, what's painted, and what's ready to play." No new database tables; all numbers derived from units, factions, and painting_recipes tables already populated by Phases 2–4.

Eight requirements: top stat row (DASH-01), faction summary cards (DASH-02), painting/assembly/basing % cards (DASH-03/04), active projects list (DASH-05), recently-updated list (DASH-06), query-only data sourcing (DASH-07), and empty state (DASH-08).

</domain>

<decisions>
## Implementation Decisions

### Page layout
- Vertical stack, top to bottom:
  1. Top stat row — 4 cards (total models, fully-painted models, battle-ready points, active projects count)
  2. Progress metrics row — 3 cards (painting %, assembly %, basing %)
  3. Faction summary cards — wrapping flex row
  4. Two lists side by side — active projects (left) | recently updated (right)
- Each section is full-width with a visible section divider/heading

### Top stat row (DASH-01)
- 4 shadcn Cards in a 4-column grid: total models owned, fully-painted models count, battle-ready points, active projects count
- Large number + label underneath — same card style carries through to progress metrics row

### Battle-ready definition
- Battle-ready points = sum of `units.points` where `status_painting = 'Completed'`
- No percentage threshold — "Completed" status is the gate

### Progress metrics (DASH-03, DASH-04)
- 3 stat cards matching the top row style (large % + label) — unified card language throughout the dashboard
- Cards: Painting %, Assembly %, Basing %
- Painting % = overall across all units (by points or by count — Claude's discretion on formula)
- Assembly % = percentage of units where `status_assembly = 1`
- Basing % = percentage of units where `status_basing = 1`

### Faction summary cards (DASH-02)
- Compact cards in a wrapping flex row, one per faction
- Each card shows: faction color as left border or top accent, faction name, model count, painted % (painted models / total models), points owned vs points painted
- No progress bar on faction card — just text values
- Clicking a faction card navigates to `/collection` pre-filtered to that faction (sets the faction filter in Zustand store)

### Lists section (DASH-05, DASH-06)
- Side-by-side: Active Projects (left half) | Recently Updated (right half)
- Each list shows 5 items max (not paginated — just top 5)
- Row content: unit name | faction colored badge | painting status abbreviation
  - Recently Updated rows also show relative time (e.g. "2h", "1d")
- Clicking any row opens the unit detail Sheet directly on the Dashboard page (same Sheet component used in Collection — no navigation required)

### Empty state (DASH-08)
- Shown when no units exist (check unit count = 0)
- Centered: icon + "Your collection is empty" + CTA button pointing to Collection page
- Partial state (factions exist but no units): same empty state treatment

### Claude's Discretion
- Exact painting % formula (by points vs by unit count)
- Section heading style and divider treatment
- Faction card exact border style (left border vs top accent vs colored header strip)
- Relative time formatting for "recently updated" (library choice or manual)
- Loading skeleton design for each section

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dashboard requirements
- `.planning/REQUIREMENTS.md` §Dashboard (Full per ROADMAP section 3.1 / 6.2) — DASH-01 through DASH-08: all stat card definitions, faction card fields, list behavior, empty state rule

### Prior phase decisions to carry forward
- `.planning/phases/03-collection-module/03-CONTEXT.md` — Unit detail Sheet spec; Dashboard must open the same Sheet component from its lists
- `.planning/phases/04-painting-module/04-CONTEXT.md` — Kanban card density and active project definition; Dashboard's active projects list pulls the same `is_active_project = 1` filter

### Architecture constraints
- `.planning/REQUIREMENTS.md` §Out of Scope — tauri-plugin-sql directly (no ORM); aggregation queries must use raw SQL
- `.planning/PROJECT.md` — "dark slate, compact tables, serious command center" visual principle; faction `color_theme` as accent

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/card.tsx` — shadcn Card; use for all stat cards, progress cards, faction cards, and list containers
- `src/components/ui/badge.tsx` — faction colored badge (hex-driven); reuse in list rows
- `src/components/ui/progress.tsx` — progress bar; available but NOT used on dashboard (user chose stat cards over bars)
- `src/components/ui/sheet.tsx` — unit detail Sheet; dashboard lists open this directly, needs selectedUnitId state on DashboardPage
- `src/components/ui/sonner.tsx` — error toasts already wired in AppLayout
- `src/hooks/useUnits.ts` — `useUnits()` provides the raw data; dashboard aggregation hook will wrap a dedicated dashboard query
- `src/types/unit.ts` — `PAINTING_STATUS_ORDER` constant for status display; status_painting enum values

### Established Patterns
- Dashboard query key `["dashboard-stats"]` already invalidated by all Phase 2–4 mutations — hook must use this key
- All DB queries in `src/db/queries/dashboard.ts` (new file to create); hook in `src/hooks/useDashboardStats.ts`
- Feature folder: `src/features/dashboard/DashboardPage.tsx` (replaces existing placeholder)
- TanStack Router: replace placeholder at `/` (dashboard route) in `src/app/router.tsx`
- CollectionPage state pattern: `selectedUnitId` + `editingUnit` — DashboardPage needs `selectedUnitId` state to open unit detail Sheet
- Faction filter in Zustand store — clicking faction card sets this filter, then navigates to `/collection`

### Integration Points
- `src/app/router.tsx` — replace DashboardPage placeholder with real component
- Unit detail Sheet (from Phase 3) — import and reuse directly in DashboardPage for list row clicks
- Zustand collection filter store — faction card click must set faction filter before navigating

</code_context>

<specifics>
## Specific Ideas

- The dashboard's top stat row + progress row effectively creates a 7-card grid (4 + 3) — researcher should verify whether one unified 7-card row or two distinct rows (4 then 3) reads better at typical desktop window widths
- Faction cards wrapping flex row: cards should have a minimum width so they don't collapse below readable size on narrow windows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-dashboard*
*Context gathered: 2026-05-01*
