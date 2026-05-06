# Phase 30: Grid Layout Foundation - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebuild the DashboardPage layout from a vertical stack to an asymmetric CSS grid bento layout. All existing dashboard sections get column spans in a single atomic commit. StatCards become clickable navigators to their source pages. The 11-stage HobbyPipeline is replaced by a 5-bucket grouped pipeline. No new data queries or database changes — this is purely layout and interaction.

</domain>

<decisions>
## Implementation Decisions

### Grid Layout Structure (LAYOUT-01)
- Replace the current `flex flex-col gap-12` with a CSS grid using `grid-template-columns` and `grid-template-rows`
- Asymmetric 2-column layout on desktop (1280px): left column ~60%, right column ~40% (e.g. `3fr 2fr` or similar)
- Full-width spanning sections (top-to-bottom order):
  1. PageHeader — spans both columns
  2. CurrentFocusCard — spans both columns
  3. StatCards row — 4 cards across both columns (existing `grid-cols-4`)
  4. HobbyPipeline (5-bucket) — spans both columns
- Two-column sections below:
  - Left column (wider): Hobby Health (Velocity + Streak) stacked above By Faction cards
  - Right column (narrower): Recent Activity feed (takes full height of its row)
- At 900px or below (min window width), all sections stack into a single column — use a CSS media query or Tailwind responsive prefix (`md:` or custom breakpoint)
- The grid replaces the outermost layout container only — individual section internals (StatCard grid-cols-4, faction card flex-wrap, etc.) remain unchanged

### StatCard Navigation (LAYOUT-02)
- Each StatCard becomes clickable — navigates to its source data page via `useNavigate` from TanStack Router
- Mapping:
  - "Total Models" → `/collection`
  - "Fully Painted" → `/collection`
  - "Battle-Ready Points" → `/army-lists`
  - "Active Projects" → `/projects`
- StatCard component gains an optional `to` prop (route path string) — when present, the card renders with `cursor-pointer`, `hover:bg-muted/50` transition, and an `onClick` handler calling `navigate({ to })`
- When `to` is absent (e.g. Hobby Health stat cards), the card remains non-interactive — backward compatible
- Keyboard accessible: `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter/Space (same pattern as FactionSummaryCard)

### 5-Bucket Pipeline Grouping (LAYOUT-03)
- The existing HobbyPipeline showing all 11 individual stages is replaced by a grouped 5-bucket view
- Bucket mapping (from PAINTING_STATUS_ORDER):
  - **Not Started**: Not Started
  - **Assembly**: Built, Primed
  - **Painting**: Basecoated, Shaded, Layered, Highlighted, Details Done
  - **Finishing**: Based, Varnished
  - **Done**: Completed
- Each bucket displays: bucket label + summed model count (sum of all statuses in that bucket)
- Visual treatment: 5 wider segments in a horizontal strip (same Card container as current pipeline), each segment with the bucket name above and a count bubble below
- Tier colors remain consistent with existing PAINTING_STATUS_TIER palette:
  - Not Started → muted-foreground/30
  - Assembly → slate-400/30
  - Painting → violet-400/30
  - Finishing → emerald-400/30 (maps to "done" tier since Based/Varnished are late-stage)
  - Done → battle-gold/30 (distinct from Finishing to celebrate completion)
- The bucket mapping is defined as a const array in HobbyPipeline.tsx (not a new file) — keeps the grouping logic co-located with the rendering

### Claude's Discretion
- Exact grid-template-columns values and gap sizing
- Whether to use Tailwind grid classes or inline CSS grid properties
- Responsive breakpoint choice (Tailwind `md:` at 768px vs custom breakpoint matching 900px min-width)
- Hover/focus visual treatment for clickable StatCards (shadow increase, border highlight, or background change)
- Whether Finishing bucket uses emerald-400 (matching "done" tier) or a distinct intermediate color like amber-400
- Loading skeleton layout adjustments for the new grid structure

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §LAYOUT-01, LAYOUT-02, LAYOUT-03 — Acceptance criteria for grid layout, clickable StatCards, and 5-bucket pipeline

### Dashboard code to modify
- `src/features/dashboard/DashboardPage.tsx` — Main layout container; all three render branches (loading/error/populated) need grid treatment
- `src/features/dashboard/StatCard.tsx` — Add optional `to` navigation prop; preserve existing `icon`/`trend`/`progress` props
- `src/features/dashboard/HobbyPipeline.tsx` — Replace 11-stage rendering with 5-bucket grouped view; reuse PAINTING_STATUS_TIER colors

### Prior context (design decisions to preserve)
- `.planning/phases/26-dashboard-redesign/26-CONTEXT.md` — Section order, CurrentFocusCard position, sibling portal pattern, layout restructure decisions
- `.planning/phases/25-design-foundation/25-CONTEXT.md` — PageHeader API, StatusBadge, enriched StatCard props, design token names

### Type definitions
- `src/types/unit.ts` — `PAINTING_STATUS_ORDER` (all 11 stages), `PaintingStatus` type
- `src/components/ui/status-badge.tsx` — `PAINTING_STATUS_TIER` mapping (tier colors to reuse for buckets)

### Navigation
- `src/app/router.tsx` — Route tree; StatCard `to` values must match registered routes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatCard` (`src/features/dashboard/StatCard.tsx`): Already has `icon`, `trend`, `progress` optional props from Phase 25 — adding `to` follows the same optional-prop extension pattern
- `HobbyPipeline` (`src/features/dashboard/HobbyPipeline.tsx`): Existing 11-stage strip with TIER_BUBBLE_CLASS and STAGE_LABEL_SHORT maps — restructure to 5-bucket grouping
- `PAINTING_STATUS_TIER` (`src/components/ui/status-badge.tsx`): Maps each of the 11 statuses to a tier — reuse for bucket color assignments
- `FactionSummaryCard` (`src/features/dashboard/FactionSummaryCard.tsx`): Already has clickable card pattern with `role="button"`, `tabIndex`, `onKeyDown`, `cursor-pointer` — reuse same accessibility pattern for StatCard navigation
- `useNavigate` from TanStack Router: Already used in FactionSummaryCard for click-to-navigate pattern

### Established Patterns
- Current dashboard layout: `flex flex-col gap-12 p-6` with sections stacked vertically — this is the container being replaced by CSS grid
- Three render branches (loading/error/populated): All three must adopt the same grid structure to prevent layout shift during data loading
- StatCard row: Currently `grid grid-cols-4 gap-6` — this stays as a nested grid inside the full-width grid cell
- Sibling portal pattern: Sheets/Dialogs are mounted outside the grid container as React siblings — grid change doesn't affect portals

### Integration Points
- `DashboardPage.tsx` is the only file needing grid layout changes — no other pages affected
- StatCard.tsx gains `to` prop — all 7 call sites in DashboardPage must be reviewed (4 top row + 2 hobby health + 1 any future)
- HobbyPipeline.tsx is self-contained — bucket mapping changes are internal to the component

</code_context>

<specifics>
## Specific Ideas

- The bento grid should feel like a premium hobby dashboard — the asymmetric layout creates visual hierarchy where the wider left column holds the "status overview" sections and the narrower right column provides the "activity feed" reading experience
- FactionSummaryCard's existing clickable card pattern (`role="button"`, `tabIndex`, `cursor-pointer`, `onKeyDown`) is the exact template for making StatCards interactive — copy this accessibility approach
- The 5-bucket pipeline should feel like a simplified funnel: Not Started → Assembly → Painting → Finishing → Done — matching the natural hobby workflow a painter follows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 30-grid-layout-foundation*
*Context gathered: 2026-05-06*
