# Phase 31: Focus & Projects Panels - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade CurrentFocusCard from a text-only card to a rich unit preview with photo thumbnail, model count, points, and direct action buttons. Create a new ActiveProjectsPanel component that surfaces the top 5 active projects with photo thumbnails, progress, and quick actions. Both components use a shared photo fallback when no journal photo exists.

</domain>

<decisions>
## Implementation Decisions

### Photo Thumbnail in CurrentFocusCard (PANEL-01, PHOTO-01)
- Left-side square thumbnail (1:1 aspect ratio) at ~80-96px, with metadata stacked vertically to the right
- Photo sourced from `useLatestUnitPhotos()` hook — same hook already used in UnitGallery
- Metadata layout right of photo: unit name (bold), faction name (muted), model count + points value (tabular-nums), painting progress bar
- Progress bar retains existing `bg-faction-accent` styling and percentage display
- Card retains faction-accent left border (existing `border-l-4` pattern)

### Action Buttons (PANEL-02)
- Two action buttons on CurrentFocusCard: "Open Unit" and "Log Progress"
- "Open Unit" calls `setSelectedUnitId(unit.id)` to open UnitDetailSheet — reuses existing DashboardPage pattern
- "Log Progress" opens LogSessionSheet with unit pre-selected — add a `defaultUnitId` prop to LogSessionSheet so it pre-selects the unit in the picker
- Button style: ghost variant, icon + short label (not icon-only) — "Open" with ExternalLink icon, "Log" with Paintbrush icon
- Buttons positioned right-side or bottom of card, depending on responsive layout

### ActiveProjectsPanel (PANEL-03)
- New component rendering up to 5 active projects as compact rows (not full cards — avoids competing visually with CurrentFocusCard)
- Each row shows: photo thumbnail (small, ~40-48px square), unit name, painting progress percentage, last-updated relative date, and two action buttons (Open, Log Session)
- Section header follows existing dashboard section pattern: uppercase tracking-widest muted-foreground label ("Active Projects")
- Data source: `stats.activeProjects` from computeStats (already computed, sorted by updated_at DESC, sliced to 5)
- Panel placement in grid: sits in the layout per Phase 30's bento grid — placement within the grid is Claude's discretion based on what Phase 30 implements
- Empty state: muted text with Target icon — "No active projects — mark one in Projects to see it here." (mirrors CurrentFocusCard empty state pattern)

### Photo Fallback Component (PHOTO-02)
- Extract a shared `UnitThumbnail` component that handles both photo display and fallback
- Props: `photo: UnitPhotoWithUrl | undefined`, `unit: Unit`, `faction: Faction | undefined`, `size: "sm" | "md"` (sm=40-48px for project rows, md=80-96px for focus card)
- When photo exists: `<img>` with `object-cover`, `rounded-lg`, `onError` fallback
- When no photo (or error): faction-colored background (`faction.color_theme`) with a Swords icon from lucide-react (hobby-thematic) — `rounded-lg` corners
- This component is reused by CurrentFocusCard, ActiveProjectsPanel, and could replace GalleryCardPhoto in UnitGallery for consistency (but that's optional — Phase 31 scope is dashboard only)

### Claude's Discretion
- Exact px values for thumbnail sizes within the sm/md ranges
- Gap and spacing within the upgraded CurrentFocusCard layout
- Whether action buttons are inline-right or below the metadata block (responsive breakpoint dependent)
- ActiveProjectsPanel row hover treatment
- Loading skeleton design for the new photo-bearing components
- Whether to show "next action hint" (getNextActionHint) on CurrentFocusCard v2 or drop it in favor of the richer metadata
- Exact relative date format for "last updated" in ActiveProjectsPanel rows

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §PANEL-01, PANEL-02, PANEL-03, PHOTO-01, PHOTO-02 — Acceptance criteria for Focus card, Projects panel, and photo integration

### Phase 30 context (grid layout decisions)
- `.planning/phases/30-grid-layout-foundation/30-CONTEXT.md` — Bento grid structure, section ordering, responsive breakpoints — Phase 31 components must fit within this grid

### Dashboard components to modify/extend
- `src/features/dashboard/CurrentFocusCard.tsx` — Current text-only implementation; upgrade to photo + metadata + actions
- `src/features/dashboard/DashboardPage.tsx` — Add ActiveProjectsPanel, wire LogSessionSheet defaultUnitId, connect useLatestUnitPhotos
- `src/features/dashboard/LogSessionSheet.tsx` — Add `defaultUnitId` prop for unit pre-selection
- `src/features/dashboard/computeStats.ts` — `activeProjects` array (already computed, sorted, sliced to 5)

### Photo system (existing hooks)
- `src/hooks/useUnitPhotos.ts` — `useLatestUnitPhotos()` returns `Map<number, UnitPhotoWithUrl>` — use this for dashboard photo thumbnails

### Existing photo thumbnail pattern to follow
- `src/features/units/UnitGallery.tsx` — `GalleryCardPhoto` component (lines 26-59) — photo + faction-colored fallback pattern to extract into shared UnitThumbnail

### Type definitions
- `src/types/unit.ts` — Unit interface (model_count, points, is_active_project, painting_percentage fields)
- `src/types/faction.ts` — Faction interface (color_theme for fallback background)

### Prior design decisions
- `.planning/phases/26-dashboard-redesign/26-CONTEXT.md` — CurrentFocusCard original design, sibling portal pattern, section ordering
- `.planning/phases/25-design-foundation/25-CONTEXT.md` — Design tokens, PageHeader, StatusBadge patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useLatestUnitPhotos()` hook (`src/hooks/useUnitPhotos.ts`): Returns `Map<number, UnitPhotoWithUrl>` — batch-loads latest photo per unit, staleTime: Infinity. Already used in CollectionPage/UnitGallery. Provides photo data for both CurrentFocusCard and ActiveProjectsPanel.
- `GalleryCardPhoto` component (`src/features/units/UnitGallery.tsx:26-59`): Photo + fallback pattern with `onError` handling and faction-colored placeholder. Extract and generalize as `UnitThumbnail`.
- `LogSessionSheet` (`src/features/dashboard/LogSessionSheet.tsx`): Already has unit picker with active projects biased to top. Needs `defaultUnitId` prop to pre-select a unit when opened from CurrentFocusCard/ActiveProjectsPanel.
- `getNextActionHint` (`src/features/dashboard/getNextActionHint.ts`): Returns hint text for current painting status — optionally preservable in v2 card.
- `StatusBadge` (`src/components/ui/status-badge.tsx`): 4-tier color system for painting statuses — currently used in CurrentFocusCard.
- `computeStats.activeProjects` (`src/features/dashboard/computeStats.ts:78-82`): Already computes top 5 active projects sorted by updated_at DESC.

### Established Patterns
- Sibling portal pattern: All Sheets/Dialogs are top-level siblings in DashboardPage, never nested inside grid sections
- selectedUnitId pattern: Store unit ID in state, derive unit object from `stats.units` — avoids stale data
- Dashboard section headers: `text-sm font-semibold uppercase tracking-widest text-muted-foreground` — consistent across Hobby Health, By Faction sections
- Card styling: `bg-card border border-border/60 shadow-sm` with hover `shadow-md transition-shadow` — Phase 25 design tokens

### Integration Points
- `DashboardPage.tsx` renders CurrentFocusCard at line 257 — upgrade in place
- `DashboardPage.tsx` already calls `useDashboardStats()` which returns `stats.activeProjects` — no new data hook needed for project list
- `DashboardPage.tsx` already has `setSelectedUnitId` and `setLogSessionOpen` handlers — wire action buttons to these
- LogSessionSheet needs a new `defaultUnitId` prop and `useEffect` to set form's unit_id when it changes
- `useLatestUnitPhotos()` needs to be called in DashboardPage and passed down to CurrentFocusCard and ActiveProjectsPanel

</code_context>

<specifics>
## Specific Ideas

- CurrentFocusCard v2 should feel like a "hero card" — the most prominent element after the page header, giving an at-a-glance status of what the user is working on right now
- ActiveProjectsPanel rows should be compact enough that all 5 fit without scrolling in the dashboard grid, but each row should clearly show progress at a glance
- The shared UnitThumbnail component creates a consistent "photo language" across the dashboard that Phase 33 (DATA-06: recipe name on focus card) can build on
- Action buttons should feel lightweight — this is a dashboard overview, not a detail page. Ghost buttons with small icons keep the focus on the data

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 31-focus-projects-panels*
*Context gathered: 2026-05-06*
