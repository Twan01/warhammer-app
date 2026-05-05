---
phase: 28-collection-projects
verified: 2026-05-05T15:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Gallery card shows real photo thumbnail from disk for a unit that has journal photos"
    expected: "Square photo thumbnail appears at the top of the gallery card, lazy-loaded"
    why_human: "Requires Tauri filesystem + real image file; jsdom cannot verify asset:// URL resolution"
  - test: "Gallery card shows faction-colored placeholder with initials when no photo exists"
    expected: "Colored top border matching faction.color_theme, first 2 initials of unit name centered"
    why_human: "Visual verification of CSS border-top color matching dynamic faction color"
  - test: "Log Session button click opens LogSessionSheet with correct unit pre-selected, drag is not triggered"
    expected: "Paintbrush button fires onLogSession, sheet opens, card does not initiate dnd-kit drag"
    why_human: "DnD pointer-sensor interaction cannot be verified in jsdom"
---

# Phase 28: Collection + Projects Verification Report

**Phase Goal:** Gallery cards show real photo thumbnails for painted units, painting status uses the unified StatusBadge everywhere, and kanban cards are enriched with the context needed to take action without opening a detail sheet
**Verified:** 2026-05-05T15:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Gallery cards show photo thumbnail from latest unit journal photo | VERIFIED | `GalleryCardPhoto` sub-component in `UnitGallery.tsx` renders `<img src={photo.assetUrl} loading="lazy" onError={() => setImgFailed(true)} />` when `latestPhotos?.get(unit.id)` exists |
| 2 | Gallery cards show faction-colored placeholder with unit initials when no photo | VERIFIED | Fallback `<div>` with `style={{ borderTop: '4px solid ${factionColor}' }}` and `unit.name.slice(0, 2).toUpperCase()` inside `GalleryCardPhoto` |
| 3 | Gallery cards show StatusBadge instead of plain status text | VERIFIED | `<StatusBadge status={unit.status_painting} />` present in `UnitGallery.tsx` (line 149); `PaintingRing` completely absent |
| 4 | Gallery cards show a thin progress bar below the StatusBadge | VERIFIED | `<div className="w-full h-0.5 bg-border/40 rounded-full overflow-hidden mt-0.5">` with inner div width set from `painting_percentage` |
| 5 | Table rows show StatusBadge via StatusPopover trigger instead of Badge outline | VERIFIED | `StatusPopover.tsx` imports `StatusBadge`, renders `<StatusBadge status={unit.status_painting} />` inside trigger button; `import { Badge }` removed |
| 6 | CollectionPage fetches batch photo data via useLatestUnitPhotos and passes to UnitGallery | VERIFIED | `CollectionPage.tsx` line 62: `const { data: latestPhotos } = useLatestUnitPhotos()` and `latestPhotos={latestPhotos}` in UnitGallery JSX |
| 7 | Kanban cards show last-updated date in relative time format | VERIFIED | `KanbanCard.tsx` imports `formatRelativeTime` from `@/features/dashboard/relativeTime`; renders `<span>{formatRelativeTime(unit.updated_at)}</span>` in metadata row |
| 8 | Kanban cards show linked recipe name when a recipe is linked to the unit | VERIFIED | `KanbanCard.tsx` renders `recipeName` prop conditionally with 20-char truncation; prop threaded from `KanbanColumn` via `enrichment?.recipeNames.get(u.id)` |
| 9 | Kanban cards show photo count with Camera icon when photos exist | VERIFIED | `KanbanCard.tsx` renders Camera icon + count when `(photoCount ?? 0) > 0`; photoCount threaded from enrichment |
| 10 | Kanban cards show a next-action hint derived from painting status | VERIFIED | `KanbanCard.tsx` imports `getNextActionHint` from `@/features/dashboard/getNextActionHint`; renders `{getNextActionHint(unit.status_painting)}` |
| 11 | Kanban cards hide the next-action hint when status is Completed | VERIFIED | Guard: `{unit.status_painting !== "Completed" && <p ...>}` on line 109 of `KanbanCard.tsx` |
| 12 | Clicking Log Session button opens LogSessionSheet with unit pre-selected | VERIFIED | `KanbanCard.tsx` Paintbrush button calls `onLogSession(unit.id)` with `e.stopPropagation()`; `PaintingProjectsPage.tsx` mounts `<LogSessionSheet defaultUnitId={logSessionUnitId ?? undefined} />` as sibling portal |
| 13 | LogSessionSheet accepts defaultUnitId and pre-populates form | VERIFIED | `LogSessionSheet.tsx` prop `defaultUnitId?: number`; `buildDefaultValues(defaultUnitId)` sets `unit_id: defaultUnitId ?? 0`; useEffect deps include `defaultUnitId` |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/queries/unitPhotos.ts` | `getLatestPhotoByUnit` + `getPhotoCountsByUnitIds` | VERIFIED | Both functions present with MAX(id) subquery, guard clause `if (unitIds.length === 0) return []`, positional params |
| `src/db/queries/recipes.ts` | `getRecipeNamesByUnitIds` | VERIFIED | Present with guard clause and positional params; unit-only filter via `unit_id IN (...)` |
| `src/hooks/useUnitPhotos.ts` | `useLatestUnitPhotos` + `LATEST_UNIT_PHOTOS_KEY` | VERIFIED | Both exported; `staleTime: Infinity`; invalidated in `useCreateUnitPhoto.onSuccess` and `useDeleteUnitPhoto.onSettled` |
| `src/hooks/useKanbanEnrichment.ts` | `useKanbanEnrichment` + `KANBAN_ENRICHMENT_KEY` + `KanbanEnrichment` | VERIFIED | New file present; `[...unitIds].sort((a,b) => a-b)` for stable key; `enabled: sortedIds.length > 0` |
| `src/hooks/useRecipes.ts` | kanban-enrichment invalidation in create + update | VERIFIED | `useCreateRecipe.onSuccess` and `useUpdateRecipe.onSuccess` both call `qc.invalidateQueries({ queryKey: ["kanban-enrichment"] })` |
| `src/features/dashboard/LogSessionSheet.tsx` | `defaultUnitId?: number` prop | VERIFIED | Interface updated; `buildDefaultValues(defaultUnitId)` wired to `useForm` and `useEffect` reset |
| `src/features/units/UnitGallery.tsx` | Photo hero + StatusBadge layout; no PaintingRing | VERIFIED | `GalleryCardPhoto` sub-component; `<StatusBadge>`; no `PaintingRing` anywhere in file |
| `src/features/units/StatusPopover.tsx` | StatusBadge as popover trigger | VERIFIED | `import { StatusBadge }`; no `import { Badge }`; focus-visible ring on button |
| `src/features/units/CollectionPage.tsx` | `useLatestUnitPhotos` call + Map passed to UnitGallery | VERIFIED | Line 24: import; line 62: hook call; line 183: prop passed |
| `src/features/painting-projects/KanbanCard.tsx` | Enriched card with metadata row, hint, Log Session button | VERIFIED | `Paintbrush`, `Camera`, `formatRelativeTime`, `getNextActionHint` all present and wired |
| `src/features/painting-projects/KanbanColumn.tsx` | `onLogSession` + `enrichment` prop threading | VERIFIED | Both props in interface; both threaded to `<KanbanCard>` |
| `src/features/painting-projects/KanbanBoard.tsx` | `useKanbanEnrichment` call + `onLogSession` threading | VERIFIED | `import { useKanbanEnrichment }`; `activeUnitIds` memo; hook called; DragOverlay passes `onLogSession={() => {}}` |
| `src/features/painting-projects/PaintingProjectsPage.tsx` | `LogSessionSheet` sibling + `logSessionUnitId` state | VERIFIED | `useState<number | null>(null)`; `<LogSessionSheet>` as sibling after `<UnitSheet>` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `CollectionPage.tsx` | `src/hooks/useUnitPhotos.ts` | `useLatestUnitPhotos` import | WIRED | Import line 24; used line 62 |
| `UnitGallery.tsx` | `src/components/ui/status-badge.tsx` | `StatusBadge` import | WIRED | Import line 5; used line 149 |
| `StatusPopover.tsx` | `src/components/ui/status-badge.tsx` | `StatusBadge` import | WIRED | Import line 5; used line 60 |
| `useUnitPhotos.ts` | `src/db/queries/unitPhotos.ts` | `getLatestPhotoByUnit` import | WIRED | Import line 10; called in `useLatestUnitPhotos` queryFn |
| `useKanbanEnrichment.ts` | `src/db/queries/recipes.ts` | `getRecipeNamesByUnitIds` import | WIRED | Import line 7; called in queryFn via Promise.all |
| `useKanbanEnrichment.ts` | `src/db/queries/unitPhotos.ts` | `getPhotoCountsByUnitIds` import | WIRED | Import line 8; called in queryFn via Promise.all |
| `KanbanBoard.tsx` | `src/hooks/useKanbanEnrichment.ts` | `useKanbanEnrichment` import | WIRED | Import line 20; called line 53 with `activeUnitIds` |
| `KanbanCard.tsx` | `src/features/dashboard/getNextActionHint.ts` | `getNextActionHint` import | WIRED | Import line 12; used line 111 |
| `KanbanCard.tsx` | `src/features/dashboard/relativeTime.ts` | `formatRelativeTime` import | WIRED | Import line 11; used line 96 |
| `PaintingProjectsPage.tsx` | `src/features/dashboard/LogSessionSheet.tsx` | `LogSessionSheet` import | WIRED | Import line 7; mounted lines 43–47 |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| COLL-01 | 28-00, 28-01, 28-02 | Gallery cards display photo thumbnail or faction-colored placeholder | SATISFIED | `getLatestPhotoByUnit` batch query → `useLatestUnitPhotos` hook → `CollectionPage` → `UnitGallery` → `GalleryCardPhoto`; all links verified |
| COLL-02 | 28-02 | Gallery cards and table rows use unified `StatusBadge` | SATISFIED | `UnitGallery.tsx` renders `<StatusBadge>`; `StatusPopover.tsx` uses `<StatusBadge>` as trigger; `PaintingRing` removed |
| PROJ-01 | 28-00, 28-01, 28-03 | Kanban cards enriched with last-updated, recipe name, photo count | SATISFIED | `useKanbanEnrichment` → `KanbanBoard` → `KanbanColumn` → `KanbanCard`; metadata row present |
| PROJ-02 | 28-03 | Kanban cards show next-action hint derived from painting stage | SATISFIED | `getNextActionHint` imported and called in `KanbanCard.tsx`; hidden for "Completed" status |
| PROJ-03 | 28-00, 28-01, 28-03 | User can open Log Session sheet from kanban card shortcut | SATISFIED | Paintbrush button in `KanbanCard`; `onLogSession` chain; `LogSessionSheet` sibling portal in `PaintingProjectsPage`; `defaultUnitId` pre-populates form |

### Anti-Patterns Found

No blockers or warnings found in production code:

- No `PaintingRing` references in `UnitGallery.tsx`
- No `TODO` / `FIXME` / `PLACEHOLDER` comments in any modified source files
- No stub implementations (`return null`, `return {}`, `return []`) in production functions
- No `it.skip` remaining in test files that cover Phase 28 behaviors (all Wave 0 stubs were activated)
- Note: 19 skipped tests reported in full suite (per 28-03-SUMMARY.md) — these are pre-existing Wave 0 stubs from other features, not Phase 28 regressions

### Human Verification Required

#### 1. Gallery Photo Thumbnail Rendering

**Test:** Navigate to Collection page, switch to Gallery view. Open a unit that has journal photos attached.
**Expected:** Gallery card shows a square photo thumbnail at the top, loaded lazily (Network tab shows images load on scroll).
**Why human:** `convertFileSrc` generates `asset://` URLs that require the Tauri runtime to resolve; jsdom cannot verify real image loading from disk.

#### 2. Faction-Colored Placeholder

**Test:** Find a unit with NO journal photos in gallery view.
**Expected:** The card shows a colored top border matching the faction's color theme, with the unit's first two initials centered in a square area.
**Why human:** Visual verification of dynamic `borderTop: '4px solid ${factionColor}'` requires the live Tauri window.

#### 3. Log Session Button — No Drag Interference

**Test:** Click the Paintbrush icon button on a kanban card (between unit name and 3-dot menu). Then try dragging the same card normally.
**Expected:** Button click opens LogSessionSheet with that unit pre-selected; card does not start dragging on button click.
**Why human:** dnd-kit `PointerSensor` with `activationConstraint: { distance: 5 }` cannot be triggered in jsdom; drag–click separation requires real pointer events.

### Gaps Summary

No gaps. All 13 observable truths are verified by codebase inspection. All 5 requirements (COLL-01, COLL-02, PROJ-01, PROJ-02, PROJ-03) are satisfied with substantive implementations. All key wiring links are confirmed present. Three items are flagged for human verification due to Tauri/visual/dnd constraints that cannot be asserted programmatically.

---

_Verified: 2026-05-05T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
