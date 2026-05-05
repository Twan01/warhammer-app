# Phase 28: Collection + Projects - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Gallery cards show real photo thumbnails for painted units, painting status uses the unified StatusBadge everywhere in the collection (table + gallery), and kanban cards are enriched with the context needed to take action without opening a detail sheet — last-updated date, linked recipe name, photo count, next-action hint, and a Log Session shortcut.

No new database tables. No new routes. No new features beyond enriching existing cards with existing data.

</domain>

<decisions>
## Implementation Decisions

### Photo Thumbnail Data Strategy (COLL-01)

- **Batch query, not N+1**: a new `getLatestPhotoByUnit()` query in `src/db/queries/unitPhotos.ts` fetches the most recent photo per unit in a single SQL query:
  ```sql
  SELECT ia.* FROM image_assets ia
  INNER JOIN (
    SELECT entity_id, MAX(id) as max_id
    FROM image_assets WHERE entity_type = 'unit'
    GROUP BY entity_id
  ) latest ON ia.id = latest.max_id
  ```
  Returns `UnitPhoto[]` — caller builds a `Map<number, UnitPhoto>` from the array
- **New hook**: `useLatestUnitPhotos()` in `src/hooks/useUnitPhotos.ts` — query key `['unit-photos', 'latest']`, returns `Map<number, UnitPhotoWithUrl>` after converting file paths via `convertFileSrc`
- **Fetched at page level**: `CollectionPage` calls `useLatestUnitPhotos()` and passes the Map to both `UnitGallery` and `UnitTable` (UnitTable doesn't display photos but StatusBadge needs no photo data)
- **Cache invalidation**: invalidate `['unit-photos', 'latest']` when `useCreateUnitPhoto` or `useDeleteUnitPhoto` fires — add to existing onSettled handlers

### Gallery Card Layout (COLL-01 + COLL-02)

- **Photo as card hero**: top portion of the gallery card becomes a square (1:1 aspect ratio) photo thumbnail area
- **Photo rendering**: `<img>` with `object-cover` fills the square; `loading="lazy"` for performance
- **No-photo placeholder**: a solid `bg-panel-surface` square with the faction's color as a subtle border-top-4 accent and unit initials centered (text-muted-foreground, text-lg)
- **PaintingRing removed**: the existing circular SVG progress ring is replaced by:
  - `StatusBadge` component (from Phase 25) showing the painting status
  - A thin progress bar below the photo area (same style as enriched StatCard progress — 2px, bg-faction-accent fill)
- **Card body below photo**: unit name, faction badge, StatusBadge, and `painting_percentage` as text (tabular-nums)
- **Sort order unchanged**: alphabetical by name (Phase 12 locked decision)
- **Grid responsive columns unchanged**: 2–4 columns based on viewport

### Collection Table StatusBadge (COLL-02)

- **StatusPopover replaced**: the existing `StatusPopover` component in `UnitTableColumns.tsx` is replaced by `StatusBadge` for display — inline in the table cell
- **Status editing preserved**: clicking the StatusBadge in table context opens the same status-change interaction (popover or inline select) that `StatusPopover` currently provides — the badge becomes the trigger
- **Implementation**: wrap `StatusBadge` inside a `Popover` trigger OR keep `StatusPopover` and replace its internal display text with `StatusBadge` rendering (Claude's discretion — preserve edit UX, upgrade visual)

### Kanban Card Enrichment Data (PROJ-01)

- **Batch recipe lookup**: a new `getRecipeNamesByUnitIds(unitIds: number[])` function in `src/db/queries/recipes.ts`:
  ```sql
  SELECT unit_id, name FROM painting_recipes WHERE unit_id IN (...)
  ```
  Returns `{ unit_id: number; name: string }[]` — caller builds `Map<number, string>`
- **Batch photo count**: a new `getPhotoCountsByUnitIds(unitIds: number[])` function in `src/db/queries/unitPhotos.ts`:
  ```sql
  SELECT entity_id, COUNT(*) as photo_count FROM image_assets
  WHERE entity_type = 'unit' AND entity_id IN (...)
  GROUP BY entity_id
  ```
  Returns `{ entity_id: number; photo_count: number }[]` — caller builds `Map<number, number>`
- **New hook**: `useKanbanEnrichment(unitIds: number[])` in `src/hooks/useKanbanEnrichment.ts` — fetches both recipe names and photo counts in parallel, returns `{ recipeNames: Map<number, string>; photoCounts: Map<number, number> }`
- **Query key**: `['kanban-enrichment', ...unitIds.sort()]` — stable key regardless of dnd-kit order changes
- **Last-updated date**: derived from `unit.updated_at` using `relativeTime.ts` (already exists) — no extra query needed
- **Invalidation**: invalidate on recipe mutations (`useCreateRecipe`, `useUpdateRecipe`) and photo mutations

### Kanban Card Layout (PROJ-01 + PROJ-02)

- **Existing content preserved**: unit name, faction badge, painting percentage bar, priority flag, target date, drag handle, action popover
- **New metadata section**: a compact row below the existing progress bar, showing:
  - Last updated: `"2d ago"` in `text-xs text-muted-foreground` using `relativeTime(unit.updated_at)`
  - Recipe link: `"Recipe: {name}"` truncated to ~20 chars with ellipsis — only shown when a recipe is linked
  - Photo count: Camera icon (lucide `Camera`) + count in `text-xs text-muted-foreground` — only shown when count > 0
- **Next-action hint (PROJ-02)**: below the metadata row, a short italic text in `text-xs text-muted-foreground/70`:
  - Reuses `getNextActionHint(unit.status_painting)` from `src/features/dashboard/getNextActionHint.ts`
  - Example: `"→ Apply primer"` — leading arrow separates it from metadata
  - Hidden when status is "Completed" (hint is "Battle ready — log a game" which is less actionable on a project card)

### Log Session Shortcut (PROJ-03)

- **Placement**: a small icon button (`Paintbrush` lucide icon, `size={14}`) placed in the card's top-right area alongside the existing action popover trigger — always visible, not hover-only
- **Click behavior**: opens `LogSessionSheet` with the unit pre-selected
- **LogSessionSheet extension**: add optional `defaultUnitId?: number` prop to `LogSessionSheet` — when provided, `buildDefaultValues()` uses it as the initial `unit_id` and the unit picker is pre-populated (but still changeable)
- **Sheet mount point**: `LogSessionSheet` mounted at `PaintingProjectsPage` level (sibling portal pattern) — state managed by `logSessionUnitId: number | null` at page level; non-null opens the sheet with that unit pre-selected
- **Cache invalidation after session log**: `useCreatePaintingSession` already invalidates `['dashboard-stats']` — add invalidation for `['kanban-enrichment']` to refresh the "last updated" display (or rely on `updated_at` changing on the unit itself via existing invalidation)

### Claude's Discretion

- Exact SQL for batch queries (IN-clause vs subquery; whether to use a CTE)
- Whether StatusPopover is refactored internally or replaced with a new StatusBadge+Popover wrapper
- Gallery card exact spacing/padding between photo area and info section
- Whether `useKanbanEnrichment` uses `Promise.all` inside queryFn or two separate queries merged
- Photo thumbnail fallback behavior if the file is missing on disk (broken image vs placeholder)
- Whether to show the recipe "area" (e.g. "Armour") alongside the recipe name on the kanban card or just the name
- KanbanCard metadata row exact layout (single row flex-wrap vs two rows)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §COLL-01, COLL-02, PROJ-01, PROJ-02, PROJ-03 — Acceptance criteria

### Phase 25 outputs (design system prerequisites)
- `.planning/phases/25-design-foundation/25-CONTEXT.md` — StatusBadge API, design tokens, PAINTING_STATUS_TIER map location
- `src/components/ui/status-badge.tsx` — StatusBadge component (4-tier color system, dot+text format)

### Phase 26 outputs (reusable assets)
- `src/features/dashboard/getNextActionHint.ts` — NEXT_ACTION_HINTS map + getNextActionHint() function (reuse for PROJ-02)
- `src/features/dashboard/LogSessionSheet.tsx` — Existing sheet to extend with defaultUnitId prop (PROJ-03)
- `src/features/dashboard/relativeTime.ts` — relativeTime() utility for "2d ago" strings

### Collection code to modify
- `src/features/units/UnitGallery.tsx` — Gallery card component (hero photo + StatusBadge + remove PaintingRing)
- `src/features/units/UnitTableColumns.tsx` — Table status column (replace StatusPopover display with StatusBadge)
- `src/features/units/CollectionPage.tsx` — Page root (add useLatestUnitPhotos call, pass Map to gallery)

### Kanban code to modify
- `src/features/painting-projects/KanbanCard.tsx` — Card component (add metadata row, next-action hint, Log Session button)
- `src/features/painting-projects/KanbanBoard.tsx` — Board container (pass enrichment data to cards)
- `src/features/painting-projects/PaintingProjectsPage.tsx` — Page root (add LogSessionSheet sibling, useKanbanEnrichment call)

### Query/hook code to extend
- `src/db/queries/unitPhotos.ts` — Add getLatestPhotoByUnit() and getPhotoCountsByUnitIds()
- `src/db/queries/recipes.ts` — Add getRecipeNamesByUnitIds()
- `src/hooks/useUnitPhotos.ts` — Add useLatestUnitPhotos() hook

### Type definitions
- `src/types/unit.ts` — Unit interface (has updated_at, status_painting, is_active_project)
- `src/types/unitPhoto.ts` — UnitPhoto interface (file_path, taken_at, stage_label)
- `src/types/recipe.ts` — PaintingRecipe interface (unit_id nullable FK, name)

### Established patterns
- Sibling portal pattern: sheets mounted as top-level siblings (DashboardPage, CollectionPage)
- `convertFileSrc` + `appDataDir()` for photo URL conversion (useUnitPhotos.ts lines 39–60)
- Batch query + Map pattern (see Phase 18 `armyListNameById` and `unitNameById` useMemo approach)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatusBadge` (Phase 25): ready to drop into gallery cards and table rows — import from `@/components/ui/status-badge`
- `getNextActionHint()` (Phase 26): maps PaintingStatus → imperative string — reuse directly for PROJ-02
- `relativeTime()` (Phase 26): formats timestamps as "2h ago" — reuse for kanban card last-updated
- `LogSessionSheet` (Phase 26): lightweight session form — extend with `defaultUnitId` prop for PROJ-03
- `convertFileSrc` from `@tauri-apps/api/core`: converts local file paths to asset:// protocol URLs for img src
- `appDataDir()` from `@tauri-apps/api/path`: resolves the base directory for photo file paths

### Established Patterns
- Gallery view alphabetical sort (Phase 12 locked decision) — do not change sort order
- `PaintingRing` SVG (Phase 12): will be removed from gallery cards in favor of StatusBadge + thin progress bar
- KanbanCard dnd-kit sortable pattern: `useSortable` hook with transform/transition styles — new metadata must not break drag interaction
- `StatusPopover` in table: currently handles both display AND edit — Phase 28 upgrades display visual while preserving edit interaction
- Recipe `unit_id` FK: nullable — many recipes are faction-wide, not unit-specific; only unit-linked recipes appear on kanban cards

### Integration Points
- `CollectionPage.tsx` — mounts useLatestUnitPhotos, passes to UnitGallery
- `PaintingProjectsPage.tsx` — mounts useKanbanEnrichment + LogSessionSheet sibling
- `KanbanBoard.tsx` — receives enrichment data, passes per-card props to KanbanCard
- `useUnitPhotos.ts` — new batch hook alongside existing per-unit hook (shared module)

</code_context>

<specifics>
## Specific Ideas

- COLL-01 uses `MAX(id)` not `MAX(taken_at)` because `taken_at` is nullable (user may not set a date when uploading); `id` is always monotonically increasing and represents upload order
- PROJ-01 recipe name is only shown when `painting_recipes.unit_id` matches the kanban unit — faction-wide recipes (unit_id IS NULL) are NOT shown on individual unit cards
- PROJ-03 pre-selection: LogSessionSheet's form reset in `useEffect([open])` must respect the new `defaultUnitId` prop — `buildDefaultValues(defaultUnitId)` pattern
- Gallery card photo fallback chain: real photo → faction-colored placeholder with initials → generic muted placeholder (handles both "no photo" and "file not found on disk")
- Kanban card metadata is secondary info — use `text-xs text-muted-foreground` consistently to keep visual hierarchy clear (unit name remains the primary element)

</specifics>

<deferred>
## Deferred Ideas

None — all decisions stay within phase scope.

</deferred>

---

*Phase: 28-collection-projects*
*Context gathered: 2026-05-05*
