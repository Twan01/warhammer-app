# Phase 32: Army Readiness Card - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

A dedicated ArmyReadinessCard replaces the existing readiness surface on the dashboard. The card shows a per-faction breakdown of battle-ready points against a user-selected target from a preset list (500 / 1000 / 1500 / 2000 pts). The card has its own dedicated query hook — it loads and refreshes independently of the main dashboard stats. No schema changes — all data is derived from existing units table.

</domain>

<decisions>
## Implementation Decisions

### Target Selector UX (PANEL-04)
- Segmented button group (4 buttons in a row: 500 / 1000 / 1500 / 2000) — not a dropdown; most scannable at dashboard glance level
- Default target: 2000 pts (standard Warhammer 40K matched play game size)
- Selection persisted in localStorage — same pattern as sidebar collapsed state and collection view mode
- Selecting a threshold immediately updates all faction progress bars (no submit button)
- Button group uses muted/ghost styling for unselected, solid/primary for selected — compact, not visually heavy

### Progress Bar Design (PANEL-05)
- Each faction with at least one unit shows a row: faction name, progress bar, and text summary
- Progress bar fill color uses faction's `color_theme` — consistent with FactionSummaryCard accent borders
- Progress bar background: `bg-border/40` (matches FactionSummaryCard painting progress bar pattern)
- Text below/beside bar: "{pointsPainted} / {target} pts ready, {pointsOwned} pts owned" — shows both how close to target and total army size
- When battle-ready points meet or exceed the selected target, bar fills 100% and the text uses `text-battle-gold` to celebrate completion
- Factions with 0 units are hidden — only show factions that have models in the collection
- Factions sorted by faction name (alphabetical) for stable ordering

### Card Placement & Layout
- ArmyReadinessCard sits in the bento grid layout established by Phase 30
- Placement: right column, below Recent Activity — readiness is a reference/status surface, not the primary workflow
- Section header follows existing dashboard pattern: "Army Readiness" with `text-sm font-semibold uppercase tracking-widest text-muted-foreground`
- Card container uses standard card styling: `bg-card border border-border/60 shadow-sm`
- If no factions have units, show an empty state: muted text with Shield icon — "Add units to see army readiness"

### Data Source Strategy
- New query function: `getArmyReadinessByFaction()` in `src/db/queries/dashboard.ts` (or co-located) — groups units by faction_id, sums points for all units (owned) and for Completed-status units (battle-ready)
- New hook: `useArmyReadiness()` — returns per-faction `{ factionId, pointsOwned, pointsPainted }` data
- Query key: `["army-readiness"]` — separate from `["dashboard-stats"]`
- Invalidated by: unit mutations (create, update painting status, delete) — same triggers that invalidate `["dashboard-stats"]` should also invalidate `["army-readiness"]`
- The target threshold is UI-only state (localStorage) — it does NOT affect the query; filtering against target happens in the component

### Claude's Discretion
- Exact progress bar height and rounded corner radius
- Gap and padding within the card
- Whether faction rows are compact (single line) or two-line (name + bar above, text summary below)
- Skeleton loading treatment while query is in flight
- Whether to show a subtle "target met" icon (e.g. CheckCircle) or just gold text color
- Exact localStorage key name for target persistence

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §PANEL-04, PANEL-05 — Acceptance criteria for target selector and per-faction progress bars

### Phase 30 context (grid layout)
- `.planning/phases/30-grid-layout-foundation/30-CONTEXT.md` — Bento grid structure, column weights (3fr/2fr), responsive breakpoints — ArmyReadinessCard must fit within this grid

### Phase 31 context (panel patterns)
- `.planning/phases/31-focus-projects-panels/31-CONTEXT.md` — Dashboard panel design patterns, section header styling, card container styling

### Dashboard code
- `src/features/dashboard/DashboardPage.tsx` — Main dashboard layout; ArmyReadinessCard will be added as a new section
- `src/features/dashboard/computeStats.ts` — Existing `factionStats` computation with `pointsOwned` and `pointsPainted` — reference for what battle-ready means (status_painting === "Completed")
- `src/features/dashboard/FactionSummaryCard.tsx` — Existing per-faction card with progress bar pattern and faction `color_theme` accent — visual reference for consistency

### Existing readiness patterns
- `src/features/army-lists/ArmyListSummaryBar.tsx` — Per-list readiness bar with progress and not-ready unit list — pattern reference (but ArmyReadinessCard is per-faction, not per-list)
- `src/hooks/useArmyLists.ts` — `useArmyListReadiness` hook and `ARMY_LIST_READINESS_KEY` — existing readiness hook pattern (per-list); new hook follows same conventions but groups by faction
- `src/db/queries/armyLists.ts` — `getArmyListReadiness()` SQL query — reference for how battle-ready points are computed in SQL (COALESCE + CASE WHEN status_painting = 'Completed')

### Type definitions
- `src/types/unit.ts` — Unit interface (points, status_painting, faction_id fields)
- `src/types/faction.ts` — Faction interface (name, color_theme for progress bar colors)

### Design tokens
- `src/styles/globals.css` — Design tokens: Battle Gold, Panel Elevated, Forge Black
- `src/components/ui/status-badge.tsx` — PAINTING_STATUS_TIER color mapping

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FactionSummaryCard` progress bar pattern (`src/features/dashboard/FactionSummaryCard.tsx:73-84`): `h-0.5 bg-border/40` track with `bg-faction-accent` fill — reuse the same visual pattern for readiness bars but with faction `color_theme` via inline style
- `getArmyListReadiness` SQL pattern (`src/db/queries/armyLists.ts:167-186`): COALESCE + CASE WHEN for battle-ready computation — adapt this pattern from per-list to per-faction grouping
- `useArmyListReadiness` hook pattern (`src/hooks/useArmyLists.ts:173-187`): Returns Map-based results — follow same conventions for the new per-faction hook
- localStorage persistence pattern: `useCollectionViewMode` in UnitGallery and sidebar collapsed state — follow same pattern for target threshold persistence

### Established Patterns
- Dashboard section headers: `text-sm font-semibold uppercase tracking-widest text-muted-foreground` — consistent across Hobby Health, By Faction, Recent Activity
- Card container: `bg-card border border-border/60 shadow-sm` with rounded corners
- Tabular numbers: `tabular-nums` class on all numeric displays for alignment
- Empty state: muted text with icon — pattern from CurrentFocusCard and ActiveProjectsPanel

### Integration Points
- `DashboardPage.tsx` renders all dashboard sections — add ArmyReadinessCard as a new section in the right column
- Unit mutation hooks (`useCreateUnit`, `useUpdateUnit`, `useDeleteUnit` in `src/hooks/useUnits.ts`) must invalidate `["army-readiness"]` query key — same pattern as existing `["dashboard-stats"]` invalidation
- The query groups by `faction_id` and JOINs factions table for name + color_theme — returns everything the component needs in one query

</code_context>

<specifics>
## Specific Ideas

- The segmented button group for target selection should feel integrated into the card header — not a separate control, but part of the "Army Readiness" section identity
- Progress bars should use the faction's actual `color_theme` (the same color that drives accent borders on FactionSummaryCards) — this creates visual consistency between the "By Faction" section and the Army Readiness card
- The "owned vs ready" text breakdown mirrors the pattern already in FactionSummaryCard ("X pts battle-ready / Y pts owned") — users already understand this vocabulary from the existing dashboard

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 32-army-readiness-card*
*Context gathered: 2026-05-06*
