# Phase 12: Collection Gallery View - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a visual card grid view to the existing Collection page as an alternate to the existing table — users toggle between the two without losing any active filters. Each gallery card shows: unit name, faction badge, a circular SVG painting-status ring with percentage inside, status text label, model count, points, and active project indicator. Creating/editing/deleting units is unchanged — all actions flow through the existing UnitDetailSheet.

</domain>

<decisions>
## Implementation Decisions

### View Toggle Placement
- Icon-pair button group in the top-right of the Collection page header row, between the page title and the "Add Unit" button
- Two adjacent icon buttons: table-rows icon (Table) and grid icon (Gallery) — the active view gets a `bg-muted` background fill
- Layout: `Collection  [■ Table] [⊞ Gallery]  [+ Add Unit]`

### View Toggle Persistence
- Persists via localStorage, key: `collection-view-mode`, values: `'table' | 'gallery'`, default: `'table'`
- Same pattern as `useSidebarCollapsed.ts` — synchronous read in `useState` initializer, `useEffect` to sync on change
- New hook: `useCollectionViewMode` in `src/hooks/useCollectionViewMode.ts`

### Card Click & Interactions
- Clicking a gallery card opens the existing `UnitDetailSheet` — same behavior as clicking a table row
- Uses the same `selectedUnitId` / `selectedUnit` pattern already in `CollectionPage.tsx`
- No action buttons on gallery cards — Edit and Delete are accessible from inside the detail sheet
- No hover overlay with actions

### Empty States
- Reuse the existing `CollectionEmptyState` component for both "no units" and "no results for filters" states
- No gallery-specific empty state needed

### Painting Ring — Appearance
- Large ring centered at the top of each card (~96px diameter)
- Percentage text rendered inside the ring center (e.g. "72%")
- Ring track: zinc-600 (neutral background arc)
- Ring fill arc: app primary color (same as the `bg-primary` linear progress bar in the table)
- Phase 10 decision carries forward: rings encode painting state, NOT faction identity — no `bg-faction-accent` on rings

### Painting Ring — Implementation
- SVG `<circle>` with `stroke-dasharray` / `stroke-dashoffset` technique (not CSS conic-gradient)
- Two circles: background track circle + foreground progress arc
- `stroke-linecap="round"` on the progress arc
- Component: `PaintingRing` — a small, focused SVG component, likely `src/components/common/PaintingRing.tsx`
- Input: `percentage: number` (0–100), derived from `unit.painting_percentage`

### Gallery Card Layout
- Responsive grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Card content (top to bottom): large painting ring (with % inside), unit name, faction badge, status text label, model count, points, active project flame indicator (if `is_active_project === 1`)
- Fixed sort order: alphabetical by name (no sort control in gallery mode — table view handles sorted browsing)
- Component: `UnitGallery` in `src/features/units/UnitGallery.tsx`, receives same props as `UnitTable` minus sorting/pagination

### Claude's Discretion
- Exact card dimensions (min-width, padding, gap) and typography sizes
- Whether `PaintingRing` is a standalone file or co-located in the units feature folder
- Loading skeleton design for gallery mode
- Exact SVG viewBox dimensions and stroke-width for the ring
- Whether active project flame icon is positioned as an overlay badge on the ring or in a separate row below

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §UI-04 — View toggle spec: Collection page switches between table and gallery without navigating away
- `.planning/REQUIREMENTS.md` §UI-05 — Gallery card spec: unit name, faction badge, painting-status ring, painted percentage
- `.planning/REQUIREMENTS.md` §UI-06 — Filter preservation spec: all active filters survive view toggle

### Phase 10 Foundation
- `.planning/phases/10-theming-foundation/10-CONTEXT.md` — Defines `bg-faction-accent` / `ring-faction-accent` CSS utilities and the decision that painting status rings are excluded from faction accent coloring

No external specs — requirements are fully captured in REQUIREMENTS.md and the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/units/CollectionPage.tsx` — Full page with Zustand filter state, selectedUnitId pattern, all sheet/dialog siblings. Gallery view slots in as a conditional render replacing `<UnitTable>` with `<UnitGallery>` — no structural changes to the page needed
- `src/features/units/collectionFilters.ts` — Zustand store managing all filter state. UI-06 is free: gallery reads the same store, no extra work
- `src/features/units/UnitFilters.tsx` — Filter bar component stays unchanged; shared between table and gallery
- `src/features/units/CollectionEmptyState.tsx` — Handles both "no units" and "filtered-to-zero" empty states; can be passed directly to `UnitGallery`
- `src/features/units/applyUnitFilters.ts` — Filter logic already produces `filteredUnits`; gallery just renders that array differently
- `src/features/dashboard/FactionSummaryCard.tsx` — Reference for Card + faction badge + inline border color pattern
- `src/hooks/useSidebarCollapsed.ts` — localStorage hook pattern to copy exactly for `useCollectionViewMode`
- `src/components/ui/progress.tsx` — Existing linear progress (radix-based); gallery ring is SVG-based and doesn't reuse this
- `src/features/units/UnitTableColumns.tsx` — Shows how faction badge is rendered (`Badge` with `style={{ backgroundColor: faction.color_theme }}`) — same pattern for gallery cards

### Established Patterns
- `selectedUnitId` pattern: store ID in state, derive `selectedUnit` from query cache — gallery cards call the same `handleRowClick` / `handleCloseDetail` handlers
- Sibling Sheet/Dialog portals: `UnitDetailSheet`, `UnitSheet`, `UnitDeleteDialog` all stay as siblings in `CollectionPage` — unchanged
- Zustand for ephemeral filter state, localStorage for persistent UI preferences (sidebar collapse, now view mode)
- `useFactions` hook + `factionMap` from `CollectionPage` — gallery needs the faction name/color; same map already built on the page

### Integration Points
- `src/features/units/CollectionPage.tsx` — Add `useCollectionViewMode` hook call; conditionally render `<UnitTable>` or `<UnitGallery>` based on view state; add toggle buttons to the header row
- `src/hooks/useCollectionViewMode.ts` — New localStorage hook (mirror of `useSidebarCollapsed.ts`)
- `src/features/units/UnitGallery.tsx` — New component; receives `data`, `factions`, `isLoading`, `hasActiveFilters`, `onRowClick`, `onClearFilters` props (subset of `UnitTable` props — no edit/delete/toggleActive needed)
- `src/components/common/PaintingRing.tsx` — New SVG ring component

</code_context>

<specifics>
## Specific Ideas

- The mockup confirmed for toggle: `Collection  [■ Table] [⊞ Gallery]  [+ Add Unit]` — toggle sits between title and Add Unit button
- Card layout confirmed: large ring (96px) at top center with % inside, then name, faction badge, status label, model count, points, active flame below
- Ring confirmed: SVG stroke-dasharray, zinc-600 track, primary-color fill, rounded linecap

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-collection-gallery-view*
*Context gathered: 2026-05-03*
