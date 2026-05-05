# Phase 23: Display Features - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

The Collection page gains a one-click Battle Ready filter showing only painted and assembled units, and users can enter Showcase Mode — a full-screen chromeless gallery of painted units — ideal for displaying the collection at club nights.

No new database tables. No new data model changes. Two features that surface existing data in new ways.

</domain>

<decisions>
## Implementation Decisions

### Battle Ready Filter Criteria (DISP-01)
- "Battle Ready" = `status_assembly === 1` AND `status_painting === "Completed"` — matches success criteria "fully painted and assembled"
- Basing and varnish status are NOT required for Battle Ready (optional finishing steps in hobby terms)
- Filter is a boolean toggle like the existing `activeOnly` — stored in Zustand collectionFilters store
- Composes additively with all existing filters (search, faction, status, category, active only)

### Battle Ready Filter Placement (DISP-01)
- Toggle button placed alongside existing "Active only" button in UnitFilters component
- Same visual style: `variant="outline"` when off, `variant="default"` when active, with `aria-pressed`
- Active filter state reflected in `hasActiveFilters` check (clears with "Clear filters")
- Works in both table and gallery view modes

### Showcase Mode Scope
- Showcase shows currently filtered units that have at least one photo
- Respects active filters — user can combine Battle Ready + Showcase for tournament display, or use any other filter combination
- Units without photos are excluded (nothing to showcase)
- If no units with photos exist in current filter, show a message "No photos to showcase" with suggestion to add journal photos

### Showcase Mode Entry (DISP-02)
- "Enter Showcase" button placed in PageHeader actions area, next to the table/gallery view mode toggles
- Icon: `Maximize` (lucide) or `Presentation` — small icon button with tooltip
- Only enabled when at least one filtered unit has a photo (disabled with tooltip "No photos to showcase" otherwise)

### Showcase Mode Implementation (DISP-02)
- Use Tauri window API: `getCurrentWindow().setFullscreen(true)` from `@tauri-apps/api/window`
- Hide app chrome (sidebar, header) by rendering a dedicated full-screen overlay component
- Showcase is a React component mounted at CollectionPage level (sibling portal pattern) — not a new route
- Dark background (`bg-black`) fills the entire screen
- Add required Tauri capability permission for window fullscreen operations

### Showcase Navigation
- Arrow keys (left/right) cycle through units
- On-screen arrow buttons (semi-transparent, appear on hover) on left/right edges
- Unit counter "3 of 15" displayed bottom-center in subtle text
- Current unit's name and faction shown as minimal overlay at bottom

### Showcase Display
- Photo displayed large and centered, `object-contain` to preserve aspect ratio, filling available space
- Unit name and faction name as a minimal translucent overlay bar at the bottom
- No other chrome — no progress bars, no metadata, no action buttons
- Background: solid black for maximum contrast with painted miniatures

### Showcase Exit (DISP-03)
- Escape key exits showcase (keydown listener)
- Visible X button in top-right corner (semi-transparent, appears on hover/mouse move)
- Exit calls `getCurrentWindow().setFullscreen(false)` and unmounts the showcase overlay
- App returns to normal windowed view with sidebar and header restored

### Claude's Discretion
- Exact Tauri capability permission name for window fullscreen
- Whether to use `requestFullscreen` (browser API) as fallback for dev mode (Vite without Tauri)
- Photo transition animation between units (crossfade, instant swap, or slide)
- Exact semi-transparent styling for nav arrows and exit button
- Whether to auto-hide cursor after inactivity in Showcase Mode

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — DISP-01 (Battle Ready filter), DISP-02 (Showcase Mode), noted in Future Requirements section
- `.planning/ROADMAP.md` §Phase 23 — Success criteria defining exact acceptance conditions

### Collection code to modify
- `src/features/units/CollectionPage.tsx` — Page root (add Showcase button, mount Showcase overlay)
- `src/features/units/collectionFilters.ts` — Zustand store (add `battleReady` toggle)
- `src/features/units/applyUnitFilters.ts` — Filter function (add battle ready condition)
- `src/features/units/UnitFilters.tsx` — Filter bar (add Battle Ready toggle button)
- `src/features/units/UnitGallery.tsx` — Gallery component (referenced for Showcase photo rendering patterns)

### Photo data (from Phase 28)
- `src/hooks/useUnitPhotos.ts` — `useLatestUnitPhotos()` hook returning `Map<number, UnitPhotoWithUrl>` (reuse for Showcase)
- `src/db/queries/unitPhotos.ts` — `getLatestPhotoByUnit()` batch query

### Tauri window API
- `src-tauri/capabilities/default.json` — Current capabilities (needs fullscreen permission added)
- `src-tauri/tauri.conf.json` — Window config (1280x800, min 900x600, resizable)

### Type definitions
- `src/types/unit.ts` — Unit interface (`status_assembly`, `status_painting`, `painting_percentage`)

### Design system (from Phase 25/28)
- `src/components/common/PageHeader.tsx` — Shared page header with actions slot
- `src/components/ui/status-badge.tsx` — StatusBadge component

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useLatestUnitPhotos()` (Phase 28): batch photo query returning `Map<number, UnitPhotoWithUrl>` — reuse directly for Showcase unit photos
- `convertFileSrc` + `appDataDir()`: photo URL conversion pattern already established
- `useCollectionViewMode`: localStorage persistence hook — same pattern for showcase state if needed
- `PageHeader` actions slot: existing slot where Showcase button will be placed
- `collectionFilters` Zustand store: established toggle pattern (`activeOnly`) to replicate for `battleReady`
- `applyUnitFilters()`: pure filter function to extend with battle ready condition

### Established Patterns
- Toggle filter buttons: `activeOnly` in UnitFilters — same variant toggle pattern for Battle Ready
- Sibling portal pattern: all overlays mounted as siblings at page level (not nested in Sheet/Dialog)
- Fullscreen photo display: lightbox Dialog in CollectionPage already handles large photo display — Showcase is a full-screen version
- `GalleryCardPhoto` fallback chain: real photo → faction placeholder — Showcase should only show units with real photos

### Integration Points
- `CollectionPage.tsx` — mounts Showcase overlay, passes filtered units + photo map
- `collectionFilters.ts` — new `battleReady` boolean + `toggleBattleReady` action
- `applyUnitFilters.ts` — new filter condition checking assembly + painting status
- `UnitFilters.tsx` — new toggle button in filter bar
- `default.json` capabilities — new window fullscreen permission

</code_context>

<specifics>
## Specific Ideas

- Battle Ready filter uses the same visual toggle pattern as "Active only" — users already understand this interaction
- Showcase Mode is specifically designed for "club nights" — dark background maximizes contrast with painted miniatures
- Photo-only constraint means Showcase is aspirational — encourages users to add journal photos to their units
- Showcase navigation via arrow keys matches standard gallery/slideshow conventions
- Minimal overlay (name + faction only) keeps focus on the painted miniature, not app UI

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 23-display-features*
*Context gathered: 2026-05-05*
