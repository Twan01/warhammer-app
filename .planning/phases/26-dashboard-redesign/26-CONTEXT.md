# Phase 26: Dashboard Redesign - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the existing DashboardPage into a true "Hobby Command Center" — rename the header, wire Quick Add and Log Session action buttons, add a CurrentFocusCard as the primary visual anchor, replace the isolated percentage stat cards with a HobbyPipeline strip, upgrade FactionSummaryCards, and append a Recent Activity feed. All data sourced from existing tables — no new database tables required.

Phase 25 (Design Foundation) ships first: PageHeader, StatusBadge, enriched StatCard, and design tokens are prerequisites. Phase 26 consumes those primitives.

</domain>

<decisions>
## Implementation Decisions

### Header & Subtitle (DASH-01)
- Page title changes to **"Hobby Command Center"** — replaces existing "Dashboard"
- Dynamic subtitle format: `"{N} active projects · {M} models tracked · {P} battle-ready points"` — using existing `activeProjectsCount`, `totalModels`, `battleReadyPoints` from `useDashboardStats`
- Implemented via the Phase 25 `PageHeader` component with `title` and `subtitle` props
- All three render branches (loading, error, populated) use PageHeader with the same title; subtitle is only populated in the data branch (loading/error branches use a static fallback or omit it)

### Action Buttons — Quick Add & Log Session (DASH-02)
- Both buttons live in the `actions` slot of `PageHeader` as outline/secondary `Button` components
- **Quick Add**: opens `UnitSheet` in create mode — same component already used on CollectionPage; no navigation away from Dashboard
- **Log Session**: opens a new `LogSessionSheet` — a lightweight Sheet with a unit picker (showing active projects first, then all units) + session form fields (date, duration, notes); submits via `useCreatePaintingSession`
- Sibling portal pattern (Pitfall 4): both sheets mounted as TOP-LEVEL siblings of the existing UnitDetailSheet, UnitDeleteDialog, etc. — never nested
- Quick Add and Log Session button state (open/close) managed with two `useState` booleans at DashboardPage level

### CurrentFocusCard (DASH-03)
- **Which project**: `activeProjects[0]` from existing `computeStats` — already sorted by `updated_at DESC`, so it's the most recently updated active project
- **Displayed info**: unit name, faction accent color (left border, matching FactionSummaryCard pattern), current painting stage (using `StatusBadge` from Phase 25), `painting_percentage` as a progress bar (using enriched StatCard `progress` prop or an inline bar), and a next-action hint text
- **Next-action hint**: derived via a pure lookup function `getNextActionHint(status: PaintingStatus): string` — maps each status to a short imperative suggestion (e.g. "Not Started" → "Start building", "Built" → "Apply primer", "Primed" → "Apply base coat", etc.)
- **Empty state**: if no active projects exist, CurrentFocusCard renders a muted "No active project — mark one in Projects" placeholder
- **Layout**: full-width card (`bg-card border border-border/60 shadow-sm`), left `border-l-4` colored by faction theme, two-column inner layout (left: unit info, right: progress + hint)
- Component path: `src/features/dashboard/CurrentFocusCard.tsx`

### HobbyPipeline Strip (DASH-04)
- **Replaces** the existing Progress section (the three `paintingPct`/`assemblyPct`/`basingPct` StatCards) — not added alongside it
- **All 11 PAINTING_STATUS_ORDER stages** shown as a horizontal strip: `Not Started | Built | Primed | Basecoated | Shaded | Layered | Highlighted | Details Done | Based | Varnished | Completed`
- Each stage shows: stage name (abbreviated on narrow stages), unit count at that exact stage
- **Stage colors**: reuse StatusBadge tier colors for the count badge background — Not Started (muted), Prep tier (slate-400), Painting tier (violet-400), Done tier (emerald-400); matches StatusBadge tier palette from Phase 25
- Unit counts derived from existing `units` array in `useDashboardStats` (no new query needed): `units.filter(u => u.status_painting === stage).length`
- Layout: horizontal flex strip with each stage as a small column (stage name above count bubble); wraps on narrow windows
- Component path: `src/features/dashboard/HobbyPipeline.tsx`

### Faction Army Cards (DASH-05)
- `FactionSummaryCard` upgraded in-place (no rename, same file)
- **Existing data already covers DASH-05**: `paintedPct` and `pointsPainted` (battle-ready points) are both in `FactionStat` — just not displayed prominently enough
- Card body restructured to show clearly: **unit count** (primary), **painting progress** (`{paintedPct}%` with a thin progress bar using `bg-faction-accent` fill), **battle-ready points** (`{pointsPainted} pts battle-ready`)
- Points owned line (`pointsOwned pts owned`) kept but de-emphasized (smaller text or tooltip)
- Card min-width kept at `min-w-[180px]` to prevent overflow with more content

### Recent Activity Feed (DASH-06)
- **N = 10 events** shown (last 10 chronologically across all sources)
- **Event sources** (no new tables):
  - Unit added: `units.created_at` with event type `"unit_added"`, label `"Added {unit.name}"`
  - Unit status changed: `units.updated_at` (when `updated_at !== created_at`) with type `"unit_updated"`, label `"Updated {unit.name}"`
  - Session logged: new cross-unit query `SELECT ps.session_date, ps.id, u.name FROM painting_sessions ps JOIN units u ON u.id = ps.unit_id ORDER BY ps.session_date DESC, ps.id DESC LIMIT 20` — event type `"session_logged"`, label `"Session: {unit.name}"`
  - Battle recorded: `battle_logs.created_at` — type `"battle_logged"`, label `"Battle vs {opponent_faction}: {result}"`
- **Query strategy**: new `getRecentActivity()` function in `src/db/queries/dashboard.ts` — fetches session + battle data; units already fetched in `getDashboardStats()`. Recent activity merged in JS (in a new `computeRecentActivity()` pure function), sorted by timestamp DESC, sliced to 10
- **Or simpler**: add a separate `useRecentActivity` React Query hook (query key `['recent-activity']`) that fetches sessions + battles + dedupes with units data from the cache. Claude's discretion on whether to merge into `useDashboardStats` or keep as a separate hook.
- **Display**: compact list rows with icon (e.g. `Paintbrush` for sessions, `Sword` for battles, `Plus` for unit adds, `PenLine` for unit updates), event label, and relative time (using existing `relativeTime.ts` utility)
- Component path: `src/features/dashboard/RecentActivityFeed.tsx`

### Layout Restructure
- New section order (top to bottom):
  1. PageHeader — "Hobby Command Center" + subtitle + Quick Add/Log Session buttons
  2. CurrentFocusCard — full-width, prominent
  3. Top stat row — 4 StatCards (Total Models, Fully Painted, Battle-Ready Points, Active Projects)
  4. HobbyPipeline strip — replaces old Progress section
  5. Hobby Health section — Velocity + Streak (unchanged from Phase 19)
  6. By Faction section — upgraded FactionSummaryCards
  7. Recent Activity feed — replaces old two-column Active Projects/Recently Updated lists
- Old "Active Projects" and "Recently Updated" list sections are **removed** — their content is surfaced via CurrentFocusCard (focus project) and Recent Activity feed (recent updates)

### Claude's Discretion
- Exact abbreviated stage names for narrow HobbyPipeline columns (e.g. "Base" vs "Basecoated")
- Whether `useRecentActivity` is a standalone hook or merged into `useDashboardStats`
- `getNextActionHint` lookup table contents (exact per-stage hint text)
- LogSessionSheet — whether to build as a new file or reuse existing session form patterns from JournalTab
- Loading skeleton layout for new sections (CurrentFocusCard, HobbyPipeline, RecentActivity)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §DASH-01..06 — Acceptance criteria for all six Dashboard Redesign requirements

### Phase 25 outputs (prerequisites — MUST read before coding)
- `.planning/phases/25-design-foundation/25-CONTEXT.md` — PageHeader API, StatusBadge component, StatCard enriched props, design token names
- `.planning/phases/25-design-foundation/25-UI-SPEC.md` — Component rendering specs, CSS class contracts, spacing and typography decisions

### Existing Dashboard code to extend
- `src/features/dashboard/DashboardPage.tsx` — Full existing component; 3-branch render pattern (loading/error/populated) must be preserved
- `src/features/dashboard/computeStats.ts` — Pure aggregation function; extend `ComputedDashboardStats` interface if new fields needed
- `src/features/dashboard/FactionSummaryCard.tsx` — Extend in-place (DASH-05)
- `src/features/dashboard/StatCard.tsx` — Already extended in Phase 25 with icon/trend/progress props
- `src/features/dashboard/DashboardListRow.tsx` — Existing row component (may be repurposed for RecentActivityFeed)
- `src/features/dashboard/relativeTime.ts` — Existing utility for relative timestamps (use in RecentActivityFeed)

### Existing hooks and queries
- `src/hooks/useDashboardStats.ts` — Main data hook; query key `["dashboard-stats"]`
- `src/hooks/useHobbyAnalytics.ts` — Velocity + streak data; query key `["hobby-analytics"]`
- `src/hooks/useBattleLogs.ts` — Battle logs hook; already invalidates `["dashboard-stats"]`
- `src/db/queries/dashboard.ts` — Current `getDashboardStats()` function; new `getRecentActivity()` goes here
- `src/db/queries/paintingSessions.ts` — Existing per-unit session query; cross-unit query needed for DASH-06

### Type definitions
- `src/types/unit.ts` — `PAINTING_STATUS_ORDER` (all 11 stages), `PaintingStatus` type, `Unit` interface
- `src/types/battleLog.ts` — `BattleLog` interface, `BATTLE_LOG_RESULTS` — used for Recent Activity labels

### Established patterns
- `src/app/router.tsx` — Route tree (no new routes in Phase 26)
- `src/components/common/AppSidebar.tsx` — Sibling Sheet pattern; DashboardPage already mounts several sibling portals

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatCard` (Phase 25 extended): already has icon/progress/trend optional props — CurrentFocusCard can use inline progress bar instead, or reuse StatCard progress prop
- `relativeTime.ts`: existing utility for relative timestamps (e.g. "2h ago") — used directly in RecentActivityFeed
- `DashboardListRow.tsx`: existing compact row with unit name + faction + status; adapt or repurpose for RecentActivityFeed rows
- `StatusBadge` (Phase 25 new): use in CurrentFocusCard to display painting stage
- `PageHeader` (Phase 25 new): receives Quick Add + Log Session buttons in `actions` slot
- `useCountUp` hook: existing animated counter — StatCard already uses it via `animate` prop

### Established Patterns
- Sibling sheet/dialog portal pattern: DashboardPage already mounts 4 sibling portals (UnitDetailSheet, UnitSheet, UnitDeleteDialog, DatasheetImportDialog, lightbox Dialog) — Quick Add (UnitSheet) and LogSessionSheet follow the same pattern; no nesting
- selectedUnitId pattern: not needed for Quick Add (create, no selection); LogSessionSheet needs a unit selection step
- Pure functions for data aggregation: `computeStats.ts` pattern → create `computeRecentActivity.ts` for the feed (testable in isolation)
- SQLite `updated_at` vs `created_at`: units have both; battle_logs have only `created_at` (no `updated_at`)
- `useDashboardStats` query key `["dashboard-stats"]`: already invalidated by all unit, battle log, and spending mutations — RecentActivity hook may piggyback on this key or use a separate key

### Integration Points
- `DashboardPage.tsx` is the only integration point — all new components (CurrentFocusCard, HobbyPipeline, RecentActivityFeed, LogSessionSheet) are imported here
- Phase 25 PageHeader replaces the inline `<div className="flex items-center justify-between ...">` in all 3 render branches
- `computeStats` returns `activeProjects: Unit[]` — `activeProjects[0]` feeds CurrentFocusCard directly, no new query
- HobbyPipeline unit counts derived from `stats.units` or the existing unit list via `useDashboardStats` — no new DB query needed

</code_context>

<specifics>
## Specific Ideas

- DASH-01 subtitle mirrors the Phase 26 requirement verbatim: `"2 active projects · 8 models tracked · 0 battle-ready points"` — middle-dot separator, no parentheses
- StatusBadge tier colors (Phase 25 decision) also drive HobbyPipeline stage bubbles — visual consistency between the pipeline and status badges elsewhere
- The left `border-l-4` colored by faction is an established pattern (FactionSummaryCard already does this with `style={{ borderLeftColor: stat.faction.color_theme }}`) — CurrentFocusCard reuses this pattern
- Recent Activity feed replaces the two-column Active Projects / Recently Updated section — the same information is now surfaced via CurrentFocusCard (best active project) and the feed (all recent events)
- `relativeTime.ts` already exists and handles the "2h ago" style timestamps — no new utility needed

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 26-dashboard-redesign*
*Context gathered: 2026-05-04*
