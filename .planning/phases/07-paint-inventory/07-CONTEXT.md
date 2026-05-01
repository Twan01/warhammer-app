# Phase 7: Paint Inventory - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Evolve the existing `/paints` route into a full-featured Paint Inventory page. No new route, no separate page — the existing `PaintsPage` is extended in place to add filters, preset views, a color swatch (already rendered), a recipe usage badge with cross-page navigation, and an inline owned toggle. Edit and Delete row actions are retained. Sidebar nav entry "Paints" is unchanged.

</domain>

<decisions>
## Implementation Decisions

### Page identity
- `PaintInventoryPage` replaces the existing `PaintsPage` at `/paints` — same route, same sidebar label "Paints", same icon
- No new route (`/paint-inventory` is NOT created — PINV-01 wording is overridden by this decision)
- Edit sheet (`PaintSheet`) and Delete dialog (`PaintDeleteDialog`) are retained per row — no regression on CRUD
- Table density stays compact (same row height as today's PaintsPage)

### Filter bar layout
- One horizontal filter bar row containing: `[ Brand ] [ Type ] [ Color-family ] [ Running Low ] [ Wishlist ] [Clear]`
- Brand, Type, Color-family: multi-select popovers (same `MultiSelectPopover` pattern as `UnitFilters.tsx`)
- Running Low and Wishlist: simple toggle buttons — active state styled like the "Active only" button in Collection (variant toggles `"default"` ↔ `"outline"`)
- All filters stack together — presets AND dropdowns apply simultaneously (e.g., Running Low + Brand=Citadel shows only Citadel paints that are running low)
- Both presets can be active at the same time (independent toggles, not mutually exclusive)
- "Clear" button appears when any filter or preset is active, clears everything
- Filter state lives in a new Zustand store `usePaintInventoryFilters` — follows the `useCollectionFilters` pattern exactly; resets on navigation

### Inline owned toggle
- Owned column becomes a clickable toggle — optimistic update pattern identical to `handleToggleActive` in `CollectionPage.tsx`
- Visual: a `Switch` component or checkbox (Claude's discretion on exact component — follow existing shadcn/ui patterns)
- Toggling owned does NOT automatically affect `wishlist` or `running_low` flags

### "Used in N recipes" badge
- Rendered per row using `PaintWithRecipeCount.recipe_count` from `getPaintsWithRecipeCount()` (Phase 6 deliverable)
- Badge text: "Used in N recipes" (or "0 recipes" when count is 0 — still shown, not hidden)
- Clicking the badge navigates to `/recipes?paintId=X`
- The Recipes page reads `paintId` from the URL on mount, initializes its Zustand filter store with that paint, and shows only recipes that include that paint as an ingredient
- Once on the Recipes page the filter behaves like any user-applied filter: Clear button removes it, navigating away resets it (existing Zustand reset behavior)
- This requires: (a) TanStack Router search param support on the `/recipes` route, (b) a "filter by paint" capability added to the Recipes page filter logic

### Data source
- Page uses `getPaintsWithRecipeCount()` (Phase 6) via `usePaintsWithRecipeCounts()` hook — NOT the plain `usePaints()` hook — so recipe counts are always available without a second query
- The `PAINTS_WITH_RECIPES_KEY` query key (Phase 6) is used for all mutations' `invalidateQueries` calls on this page

### Claude's Discretion
- Exact component for the inline owned toggle (Switch vs checkbox vs clickable badge)
- Whether brand and color-family options are derived dynamically from the current paint list or hardcoded
- Column order in the table (swatch + name is first, then brand, type, color-family, owned toggle, recipe badge, actions)
- Pagination: add TanStack Table pagination (like `UnitTable.tsx`) if paint count warrants it, or keep simple list rendering if count is small (Claude's call based on seed data count)

</decisions>

<specifics>
## Specific Ideas

No specific references cited. Implementation should follow existing patterns in `CollectionPage.tsx`, `UnitFilters.tsx`, and `useCollectionFilters.ts` — those are the closest analogues.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and success criteria
- `.planning/ROADMAP.md` §Phase 7 — success criteria 1–5 define the acceptance bar (note: route decision above overrides "sidebar nav and route" wording — no new route is added)
- `.planning/milestones/v1.1-REQUIREMENTS.md` §PINV-01..06 — exact requirement text for all six paint inventory requirements

### Existing patterns to follow
- `src/features/units/collectionFilters.ts` — Zustand filter store pattern; create `src/features/paints/paintInventoryFilters.ts` using the same structure
- `src/features/units/UnitFilters.tsx` — `MultiSelectPopover` component and filter bar layout; replicate for paint filters
- `src/features/units/CollectionPage.tsx` — optimistic toggle pattern (`handleToggleActive`); use for inline owned toggle
- `src/features/units/UnitTable.tsx` — TanStack Table with sorting + pagination; reference if pagination is added

### Phase 6 deliverables this page depends on
- `src/db/queries/paints.ts` `getPaintsWithRecipeCount()` — the query this page uses (added in Phase 6)
- `src/types/paint.ts` `PaintWithRecipeCount` — type for rows (added in Phase 6)
- `src/hooks/usePaints.ts` `PAINTS_WITH_RECIPES_KEY` — query key for invalidation (added in Phase 6)

### Recipe page integration
- `src/app/router.tsx` — add `validateSearch` / search params to the `/recipes` route for `paintId`
- `src/features/recipes/` — existing recipe page code; the `paintId` filter capability is NEW work in this phase, scoped to reading the URL param on mount

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/paints/PaintsPage.tsx` — the file being evolved; keep as the entry point, extend in place
- `src/features/paints/PaintRow.tsx` — extend to add recipe count badge and inline owned toggle column
- `src/features/paints/PaintSheet.tsx`, `PaintDeleteDialog.tsx` — retained unchanged
- `MultiSelectPopover` (defined inline in `UnitFilters.tsx`) — copy or extract to reuse for brand/type/color-family filters
- `src/hooks/usePaints.ts` `useUpdatePaint` — the mutation for the inline owned toggle (same as Edit uses)

### Established Patterns
- Zustand filter store: `useCollectionFilters` in `collectionFilters.ts` — create a parallel `usePaintInventoryFilters` in `paintInventoryFilters.ts`
- Optimistic toggle: `handleToggleActive` in `CollectionPage.tsx` — use the same `qc.getQueryData` → `qc.setQueryData` → mutate → `onError: rollback` pattern for the owned toggle
- `0|1` integers for SQLite booleans — `running_low`, `wishlist`, `owned` are all `0|1`; filter checks must compare to `1`, not `true`
- TanStack Router search params: currently no route uses `validateSearch` — this is the first instance; check TanStack Router v1 docs for the correct API

### Integration Points
- `src/app/router.tsx` — `/recipes` route needs `validateSearch` added so `paintId` search param is typed and accessible in `RecipesPage`
- `src/features/recipes/RecipesPage.tsx` (or equivalent) — on mount, read `paintId` from search params and initialize the recipe filter Zustand store
- `src/hooks/usePaints.ts` — `useUpdatePaint` already invalidates `PAINTS_WITH_RECIPES_KEY` (Phase 6 patch); no change needed here

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-paint-inventory*
*Context gathered: 2026-05-01*
