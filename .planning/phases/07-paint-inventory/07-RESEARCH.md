# Phase 7: Paint Inventory - Research

**Researched:** 2026-05-01
**Domain:** Paint Inventory UI — filter bar, Zustand store, TanStack Router search params, optimistic owned toggle, recipe count badge cross-page navigation
**Confidence:** HIGH — based on direct codebase audit of all relevant source files plus TanStack Router docs verification

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- `PaintInventoryPage` replaces `PaintsPage` at `/paints` — same route, same sidebar label "Paints", same icon. No new route. PINV-01 wording ("at `/paint-inventory`") is overridden by this decision.
- Edit sheet (`PaintSheet`) and Delete dialog (`PaintDeleteDialog`) are retained per row — no regression on CRUD
- Table density stays compact (same row height as today's PaintsPage)
- Filter bar: one horizontal row `[ Brand ] [ Type ] [ Color-family ] [ Running Low ] [ Wishlist ] [Clear]`
- Brand, Type, Color-family: multi-select popovers using the same `MultiSelectPopover` pattern as `UnitFilters.tsx`
- Running Low and Wishlist: simple toggle buttons — active = `variant="default"`, inactive = `variant="outline"`
- All filters AND-combined; both presets can be active simultaneously (independent toggles)
- "Clear" button appears only when `hasAny === true`; clears all filters and presets
- Filter state lives in new Zustand store `usePaintInventoryFilters` — follows `useCollectionFilters` pattern exactly; resets on navigation
- Inline owned toggle uses optimistic update pattern identical to `handleToggleActive` in `CollectionPage.tsx`
- Switch is NOT installed — use clickable `Badge` for the owned toggle (confirmed: no `switch.tsx` in `src/components/ui/`)
- "Used in N recipes" badge: always rendered (shown even when count = 0). Count > 0 navigates to `/recipes?paintId=X` via TanStack Router `useNavigate`
- The Recipes page reads `paintId` from the URL on mount, initializes its Zustand filter store with that paint, and shows only matching recipes
- Data source: `usePaintsWithRecipeCounts()` hook (Phase 6 deliverable) — NOT `usePaints()`
- `PAINTS_WITH_RECIPES_KEY` used for all mutations' `invalidateQueries` calls on this page
- Column order: Name+swatch, Brand, Type, Color Family, Owned, Recipes, Actions

### Claude's Discretion

- Exact component for the inline owned toggle — locked to Badge (Switch not installed)
- Whether brand and color-family options are derived dynamically or hardcoded — LOCKED to: Brand = dynamic from paint list via `useMemo`; Type = hardcoded from `PAINT_TYPES` constant; Color-family = dynamic from paint list via `useMemo` (null excluded)
- Column order — confirmed above
- Pagination — confirmed as NO pagination in Phase 7 (seed data = 6 paints; threshold for adding pagination is >200 rows at runtime)

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PINV-01 | User can view all paints in a dedicated filterable table at `/paints` (route override from CONTEXT.md) | `PaintsPage.tsx` is the file being evolved; no new route needed; router.tsx `paintsRoute` stays at `/paints` |
| PINV-02 | User can filter paints by brand, paint type, and color family (multi-select) | `MultiSelectPopover` in `UnitFilters.tsx` is the exact pattern; `usePaintInventoryFilters` Zustand store is the state layer; filter logic applies `Array.includes()` per active selection |
| PINV-03 | User can toggle "Running Low" preset view (`running_low = 1`) | Toggle button `variant="outline"` → `variant="default"` when active; filter checks `paint.running_low === 1` (SQLite boolean discipline) |
| PINV-04 | User can toggle "Wishlist" preset view (`wishlist = 1`) | Same toggle pattern as PINV-03; independent boolean in the Zustand store |
| PINV-05 | Each paint row shows a color swatch from `hex_color` and a "used in N recipes" badge linking to `/recipes?paintId=X` | Swatch already exists in `PaintRow.tsx`; badge uses `PaintWithRecipeCount.recipe_count` (Phase 6 type); navigation uses TanStack Router `useNavigate` + `validateSearch` on `/recipes` route |
| PINV-06 | User can toggle `owned` status inline without opening edit form | Optimistic update: `qc.getQueryData(PAINTS_WITH_RECIPES_KEY)` → `qc.setQueryData` → `useUpdatePaint.mutate` → `onError: rollback + toast.error`; clickable Badge (not Switch — not installed) |
</phase_requirements>

---

## Summary

Phase 7 is a pure UI evolution — no new routes, no schema changes, no new queries beyond what Phase 6 delivers. The existing `PaintsPage.tsx` is extended in place to become a full-featured paint inventory. All patterns needed are already demonstrated in the Collection module (`CollectionPage.tsx`, `UnitFilters.tsx`, `collectionFilters.ts`) and just need to be replicated with paint-specific fields.

The biggest new technical territory is TanStack Router search params (`validateSearch`). No route in this app currently uses it. Phase 7 must add `validateSearch` to the `/recipes` route so `paintId` is a typed URL parameter. This is a straightforward one-function addition to `router.tsx` — the route object just needs `validateSearch` added alongside the existing `component` prop. The Recipes page then reads the param on mount and seeds its filter state.

A critical dependency chain: Phase 7 requires Phase 6's `getPaintsWithRecipeCount()`, `PaintWithRecipeCount` type, `PAINTS_WITH_RECIPES_KEY`, and `usePaintsWithRecipeCounts()` hook. If Phase 6 is not complete, the page cannot be built. The planner must verify these exist before any Phase 7 plan attempts to import them. Plans 06-03 and 06-04 cover these deliverables — check `STATE.md` to confirm completion before starting Phase 7 execution.

The Recipes page filter system currently uses local `useState` (not Zustand) for its filters. Adding paintId filtering requires extracting at least the paint filter into a Zustand store OR adding a local `useEffect` that reads the search param on mount and sets local state. Given the CONTEXT.md spec ("Once on the Recipes page the filter behaves like any user-applied filter"), the simplest approach is a `useEffect` with `paintId` from `recipesRoute.useSearch()` that calls `setUnitFilter` (or adds a `setPaintFilter`). This avoids converting the entire Recipes filter to Zustand just for Phase 7.

**Primary recommendation:** Build in wave order — Zustand store first, then filter bar component, then extend PaintRow, then wire PaintsPage together, then add search param support to router + RecipesPage. All patterns are proven; implementation risk is low.

---

## Standard Stack

### Core (No new installs — all already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zustand` | ^5.0.12 | Ephemeral filter state (`usePaintInventoryFilters`) | Already installed; `useCollectionFilters` is the established pattern |
| `@tanstack/react-query` | ^5.100.6 | Data fetching via `usePaintsWithRecipeCounts()` hook; optimistic updates via `qc.setQueryData` | Already installed; all data access goes through hooks |
| `@tanstack/react-router` | ^1.168.26 | `validateSearch` on `/recipes` route; `useNavigate` for badge cross-page navigation | Already installed; first use of `validateSearch` in this app |
| shadcn/ui (`Badge`, `Button`, `Table`, `Popover`, `Command`, `Skeleton`) | Already installed | UI primitives | Already installed in Phase 1 (POLISH-06) |
| `lucide-react` | ^0.460.0 | Icons (`Plus`, `X`, `Pencil`, `Trash2`) | Already installed |

No new packages are required for Phase 7.

### Supporting (Already in codebase)

| Pattern | Location | Use in Phase 7 |
|---------|----------|----------------|
| `MultiSelectPopover` | Defined inline in `UnitFilters.tsx` | Copy verbatim to `PaintInventoryFilters.tsx` — do not import from UnitFilters (coupling risk) |
| `useCollectionFilters` store | `src/features/units/collectionFilters.ts` | Template for `usePaintInventoryFilters` in `src/features/paints/paintInventoryFilters.ts` |
| `handleToggleActive` pattern | `CollectionPage.tsx` lines 81-96 | Template for inline `owned` toggle; replace `UNITS_KEY` with `PAINTS_WITH_RECIPES_KEY`, `Unit` with `PaintWithRecipeCount` |
| `PaintRow.tsx` | `src/features/paints/PaintRow.tsx` | Extended in place — add `recipe_count` badge, clickable owned Badge, Color Family column |
| `PAINT_TYPES` constant | `src/types/paint.ts` | Already exported; use directly for Type filter options (no hardcoding needed in filter component) |

**Installation:** None required.

---

## Architecture Patterns

### Recommended File Structure Changes

```
src/features/paints/
├── PaintsPage.tsx             # EVOLVE in place → PaintInventoryPage logic
├── PaintRow.tsx               # EVOLVE in place → add recipe badge + owned toggle
├── PaintInventoryFilters.tsx  # NEW — filter bar component
├── paintInventoryFilters.ts   # NEW — Zustand store
├── PaintSheet.tsx             # UNCHANGED
├── PaintDeleteDialog.tsx      # UNCHANGED
└── PaintsEmptyState.tsx       # UNCHANGED

src/app/router.tsx             # PATCH — add validateSearch to recipesRoute
src/features/recipes/RecipesPage.tsx  # PATCH — read paintId on mount, add paint filter
```

### Pattern 1: Zustand Filter Store — `paintInventoryFilters.ts`

**What:** Ephemeral filter store parallel to `useCollectionFilters`. Five filter fields: brands (string[]), types (PaintType[]), colorFamilies (string[]), runningLow (boolean), wishlist (boolean).

**Source:** Direct audit of `src/features/units/collectionFilters.ts`

```typescript
// src/features/paints/paintInventoryFilters.ts
import { create } from "zustand";
import type { PaintType } from "@/types/paint";

interface PaintInventoryFiltersState {
  brands: string[];
  types: PaintType[];
  colorFamilies: string[];
  runningLow: boolean;
  wishlist: boolean;
  toggleBrand: (b: string) => void;
  toggleType: (t: PaintType) => void;
  toggleColorFamily: (cf: string) => void;
  toggleRunningLow: () => void;
  toggleWishlist: () => void;
  clearAll: () => void;
}

export const usePaintInventoryFilters = create<PaintInventoryFiltersState>((set) => ({
  brands: [],
  types: [],
  colorFamilies: [],
  runningLow: false,
  wishlist: false,
  toggleBrand: (b) =>
    set((s) => ({
      brands: s.brands.includes(b) ? s.brands.filter((x) => x !== b) : [...s.brands, b],
    })),
  toggleType: (t) =>
    set((s) => ({
      types: s.types.includes(t) ? s.types.filter((x) => x !== t) : [...s.types, t],
    })),
  toggleColorFamily: (cf) =>
    set((s) => ({
      colorFamilies: s.colorFamilies.includes(cf)
        ? s.colorFamilies.filter((x) => x !== cf)
        : [...s.colorFamilies, cf],
    })),
  toggleRunningLow: () => set((s) => ({ runningLow: !s.runningLow })),
  toggleWishlist: () => set((s) => ({ wishlist: !s.wishlist })),
  clearAll: () => set({ brands: [], types: [], colorFamilies: [], runningLow: false, wishlist: false }),
}));
```

### Pattern 2: Filter Logic — apply function (inline in PaintsPage or separate file)

```typescript
// Inline in PaintsPage or separate applyPaintFilters.ts
function applyPaintFilters(
  paints: PaintWithRecipeCount[],
  filters: { brands: string[]; types: PaintType[]; colorFamilies: string[]; runningLow: boolean; wishlist: boolean }
): PaintWithRecipeCount[] {
  return paints.filter((p) => {
    if (filters.brands.length > 0 && !filters.brands.includes(p.brand)) return false;
    if (filters.types.length > 0 && !filters.types.includes(p.paint_type)) return false;
    if (filters.colorFamilies.length > 0) {
      if (!p.color_family || !filters.colorFamilies.includes(p.color_family)) return false;
    }
    if (filters.runningLow && p.running_low !== 1) return false;  // SQLite 0|1 discipline
    if (filters.wishlist && p.wishlist !== 1) return false;        // SQLite 0|1 discipline
    return true;
  });
}
```

**CRITICAL:** Boolean columns `running_low` and `wishlist` are `0 | 1` integers in SQLite — always compare to `=== 1`, never to `=== true`.

### Pattern 3: Optimistic Owned Toggle

**Source:** Direct audit of `CollectionPage.tsx` lines 81-96 (`handleToggleActive`). Substitute `PaintWithRecipeCount` for `Unit`, `PAINTS_WITH_RECIPES_KEY` for `UNITS_KEY`.

```typescript
// In PaintsPage.tsx (evolved)
function handleToggleOwned(paint: PaintWithRecipeCount) {
  const next = (paint.owned === 1 ? 0 : 1) as 0 | 1;
  const previous = qc.getQueryData<PaintWithRecipeCount[]>(PAINTS_WITH_RECIPES_KEY);
  qc.setQueryData<PaintWithRecipeCount[]>(PAINTS_WITH_RECIPES_KEY, (old) =>
    old?.map((p) => (p.id === paint.id ? { ...p, owned: next } : p)) ?? []
  );
  updatePaint.mutate(
    { id: paint.id, owned: next },
    {
      onError: () => {
        qc.setQueryData(PAINTS_WITH_RECIPES_KEY, previous);
        toast.error("Failed to update owned status. Please try again.");
      },
    }
  );
}
```

**CRITICAL:** `useUpdatePaint` currently invalidates only `PAINTS_KEY` and `PAINT_KEY(id)`. Phase 6 plan 06-04 patches it to also invalidate `PAINTS_WITH_RECIPES_KEY`. If Phase 6 is not complete, the optimistic update will still work (setQueryData is client-only), but after the mutation resolves, the `paints-with-recipes` cache won't be refetched automatically. Confirm Phase 6 completion before Phase 7.

### Pattern 4: TanStack Router `validateSearch` on the `/recipes` Route

**What:** Add `validateSearch` to `recipesRoute` in `router.tsx` so `paintId` is a typed optional URL parameter. The RecipesPage reads it on mount to pre-filter.

**Source:** TanStack Router v1 official docs. Verified API: `validateSearch` is a function or schema passed alongside `component` in `createRoute`. Works with Zod (already in project as `zod ^4.4.1`).

```typescript
// src/app/router.tsx — PATCH recipesRoute

import { z } from "zod";

const recipesSearchSchema = z.object({
  paintId: z.number().optional(),
});

const recipesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recipes",
  validateSearch: recipesSearchSchema,  // ADD THIS
  component: RecipesPage,
});
```

**Accessing in `RecipesPage.tsx`:**

```typescript
// src/features/recipes/RecipesPage.tsx
import { useEffect } from "react";

// At top of RecipesPage component:
const { paintId } = recipesRoute.useSearch();

// OR using generic useSearch — recipesRoute.useSearch() is preferred for type safety
```

**IMPORTANT:** `recipesRoute.useSearch()` requires `recipesRoute` to be importable in `RecipesPage.tsx`. Since `router.tsx` currently imports `RecipesPage`, a circular import would result if `RecipesPage` also imports from `router.tsx`. The correct pattern is to export `recipesRoute` from `router.tsx` and import it in `RecipesPage.tsx` — OR use the generic `useSearch` with a route ID string. The cleanest approach for this codebase's pattern (non-file-based routing) is:

```typescript
// Option A — export recipesRoute from router.tsx
// router.tsx: export const recipesRoute = createRoute({ ... })
// RecipesPage.tsx: import { recipesRoute } from "@/app/router";
// ✓ Type-safe; no new pattern

// Option B — use generic useSearch with strict: false
// import { useSearch } from "@tanstack/react-router"
// const { paintId } = useSearch({ strict: false }) as { paintId?: number }
// ✗ Loses type safety
```

**Recommendation: Option A.** Export `recipesRoute` from `router.tsx`. `RecipesPage.tsx` imports it for typed `useSearch()`. This does not create a circular dependency because `router.tsx` imports the `RecipesPage` component (not a type from `RecipesPage.tsx`).

### Pattern 5: RecipesPage paintId Integration

**What:** RecipesPage currently uses `useState` for all filters (faction, unit, area). Adding paintId support does NOT require converting to Zustand. Use a `useEffect` that reads `paintId` from `recipesRoute.useSearch()` and seeds a local `paintFilter` state on mount.

**Source:** Direct audit of `RecipesPage.tsx` — filter state is fully local `useState`.

```typescript
// src/features/recipes/RecipesPage.tsx — PATCH
const [paintFilter, setPaintFilter] = useState<number | null>(null);
const { paintId } = recipesRoute.useSearch();

// Seed on mount — runs once when navigated-to from paint badge
useEffect(() => {
  if (paintId !== undefined) {
    setPaintFilter(paintId);
  }
}, []); // empty deps — only on mount; user can clear it like any normal filter

// Add to filtered useMemo:
if (paintFilter !== null) {
  // Need to check recipe_paints linkage OR add a paint filter field to the recipe type
  // NOTE: recipes do NOT store paint_id directly — they link via recipe_paints join table
  // This means filtering by paint requires either:
  //   (a) a new query that returns recipe IDs linked to a given paint, OR
  //   (b) filtering stepCountByRecipe map against a "does this recipe use paintId" boolean
  // See "Open Questions" section
}
```

**IMPORTANT DISCOVERY:** Recipes are linked to paints via `recipe_paints` table, not a direct `paint_id` column on `painting_recipes`. `RecipesPage.tsx` currently queries step counts via `getRecipePaintsByRecipe(r.id)` per recipe but this result is a count, not a paint list. Filtering recipes by paintId requires knowing which recipe IDs contain a given paint — this is NOT currently queryable in O(1) from the existing data the page has loaded.

**Resolution options for Phase 7 planner:**
- Add a new query `getRecipeIdsByPaintId(paintId: number): Promise<number[]>` in `src/db/queries/recipePaints.ts` that does `SELECT DISTINCT recipe_id FROM recipe_paints WHERE paint_id = $1`
- Call this query inside a new `useRecipesByPaint(paintId)` hook used only when `paintId` is set
- Filter `recipes` in the `filtered` useMemo to only those whose `r.id` is in the returned set

This is Phase 7 new work. The query is simple SQL; the hook follows the existing patterns exactly.

### Pattern 6: Navigation to /recipes?paintId=X from PaintRow

**Source:** TanStack Router docs `useNavigate` API verified above.

```typescript
// In PaintRow or PaintsPage
import { useNavigate } from "@tanstack/react-router";

const navigate = useNavigate();

// Called from recipe badge onClick:
navigate({ to: "/recipes", search: { paintId: paint.id } });
```

### Pattern 7: Filter Reset on Navigation

**What:** The Zustand store should reset when the user navigates away from `/paints`. Follows the existing pattern from `useCollectionFilters` — the reset is called in a `useEffect` with a location/route dependency.

**Source:** `CONTEXT.md` — "resets on navigation (call `clearAll` in a `useEffect` with router location dependency, matching existing pattern)".

In TanStack Router (non-file-based), use `useRouterState` or `useMatch` to detect when the route becomes inactive:

```typescript
// In PaintsPage.tsx:
const clearAll = usePaintInventoryFilters((s) => s.clearAll);
const router = useRouterState();

useEffect(() => {
  return () => {
    // Called on unmount — Zustand store persists between renders but page unmounts on nav
    clearAll();
  };
}, [clearAll]);
```

The simplest approach: call `clearAll()` in the component's cleanup effect (return from `useEffect`). Since the page component unmounts when navigating away, this reliably resets state.

### Anti-Patterns to Avoid

- **Using `usePaints()` instead of `usePaintsWithRecipeCounts()`:** The base `usePaints()` hook returns `Paint[]` without `recipe_count`. The page must use `usePaintsWithRecipeCounts()` (Phase 6) and type its data as `PaintWithRecipeCount[]`.
- **Checking `paint.running_low === true`:** SQLite stores these as `0|1`. The check MUST be `=== 1`.
- **Nesting PaintSheet/PaintDeleteDialog inside rows:** Follow the sibling portal pattern from `PaintsPage.tsx` — Sheets and Dialogs are siblings of the Table, not children of PaintRow (prevents Radix portal nesting issues).
- **Calling `updatePaint.mutate` without the optimistic update:** A non-optimistic owned toggle would cause a visible flash (latency of local IPC). The optimistic pattern is required for UX quality.
- **Importing `MultiSelectPopover` from `UnitFilters.tsx`:** It is not exported from that file (it's a module-internal function). Copy it verbatim into `PaintInventoryFilters.tsx`.
- **Creating a new `/paint-inventory` route:** CONTEXT.md explicitly overrides PINV-01 — the route stays `/paints`.
- **Using `useNavigate({ from: "/paints" })`:** The `from` option narrows type-safety but is optional; `useNavigate()` without `from` works for cross-route navigation to `/recipes`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-select popover with search | Custom dropdown | `MultiSelectPopover` (copy from `UnitFilters.tsx`) | Existing code handles Radix Popover + Command + CommandInput + checkbox pattern correctly |
| Filter toggle button state | Custom toggle component | shadcn `Button` with `variant` flip + `aria-pressed` | One-liner pattern proven in UnitFilters "Active only" button |
| Optimistic update rollback | Custom state management | `qc.getQueryData` → `qc.setQueryData` → `onError: rollback` | TanStack Query pattern already proven in CollectionPage |
| URL search param parsing | Manual `URLSearchParams` | `validateSearch` + `recipesRoute.useSearch()` | TanStack Router types and validates automatically; manual parsing is untyped and error-prone |
| Recipe count per paint | Re-query `recipe_paints` in UI | `PaintWithRecipeCount.recipe_count` from Phase 6 query | The LEFT JOIN + COUNT is done once in SQL; never re-aggregate in JavaScript |
| Find recipes by paint | N+1 loop over `getRecipePaintsByRecipe` | Single `getRecipeIdsByPaintId(paintId)` query | N+1 pattern would issue one query per recipe; SQL SELECT DISTINCT is O(1) |

---

## Common Pitfalls

### Pitfall 1: Phase 6 Dependency Not Complete

**What goes wrong:** Phase 7 imports `usePaintsWithRecipeCounts`, `PAINTS_WITH_RECIPES_KEY`, `PaintWithRecipeCount` — if Phase 6 plans 06-03 and 06-04 haven't been executed, these don't exist and TypeScript compilation fails.

**How to avoid:** The planner must note this dependency in every Phase 7 plan. The implementer must verify Phase 6 is complete (`STATE.md` currently shows 06-02 done, 06-03 and 06-04 pending) before executing Phase 7 plans.

**Warning signs:** `Module not found: "@/hooks/usePaints" has no exported member 'usePaintsWithRecipeCounts'` at compile time.

### Pitfall 2: SQLite Boolean Comparison (0|1 vs true/false)

**What goes wrong:** Writing `if (filters.runningLow && paint.running_low)` instead of `if (filters.runningLow && paint.running_low === 1)`. In JavaScript, `0` is falsy so `paint.running_low === 0` would incorrectly pass the filter.

**Wait — actually:** `paint.running_low` is typed as `0 | 1`. If `paint.running_low` is `0`, JavaScript coerces it to `false` so the implicit boolean check would WORK. But the TypeScript type is `0 | 1`, not `boolean`, and explicit comparison `=== 1` matches the established codebase pattern and avoids any confusion about intent. Always use `=== 1` per the `PITFALLS.md` codebase convention.

### Pitfall 3: Circular Import with router.tsx

**What goes wrong:** Exporting `recipesRoute` from `router.tsx` and importing it in `RecipesPage.tsx`, while `router.tsx` already imports `RecipesPage`. In ES modules this creates a circular dependency.

**How to avoid:** JavaScript ES modules handle circular imports through live bindings, so this specific pattern (module A exports a class/const, module B imports the class and exports a component, module A imports the component) usually works. But to be safe, consider putting `recipesRoute` definition in a separate file like `src/app/routes.ts` that `router.tsx` imports from. Alternatively, test the circular import first — if TanStack Router and Vite handle it (they typically do), no refactor is needed.

**Warning signs:** `Cannot access 'recipesRoute' before initialization` runtime error.

### Pitfall 4: recipe_paints Linkage for Paint Filter on RecipesPage

**What goes wrong:** Filtering recipes by paintId requires knowing which recipes use a given paint. The current `RecipesPage` state only has recipe-level data and a step count per recipe — it does NOT have a list of paint IDs per recipe.

**How to avoid:** A new query `getRecipeIdsByPaintId(paintId)` returning `number[]` is required. This is a simple `SELECT DISTINCT recipe_id FROM recipe_paints WHERE paint_id = $1`. Without this, the paint filter on RecipesPage has no data to filter against.

### Pitfall 5: `useUpdatePaint` Invalidates Only `PAINTS_KEY`, Not `PAINTS_WITH_RECIPES_KEY` (Before Phase 6 Complete)

**What goes wrong:** The optimistic update patches the `PAINTS_WITH_RECIPES_KEY` cache directly (via `qc.setQueryData`), so the UI updates instantly. But when `useUpdatePaint.mutate` resolves, its `onSuccess` only invalidates `PAINTS_KEY` and `PAINT_KEY(id)` — NOT `PAINTS_WITH_RECIPES_KEY` (Phase 6 plan 06-04 adds this). Result: the "paints-with-recipes" cache becomes stale if another component fetches the plain `paints` key and triggers a full refetch.

**How to avoid:** Ensure Phase 6 plan 06-04 is complete before executing Phase 7. The inline owned toggle will still work optimistically, but the full cache correctness requires Phase 6's patch.

### Pitfall 6: Navigation Without Search Params Clears Existing Params

**What goes wrong:** Using `navigate({ to: "/recipes" })` without a `search` property navigates to `/recipes` with no search params (clearing any existing faction/unit/area filters on that page).

**How to avoid:** Always pass `search: { paintId: paint.id }` when navigating to the recipe filter link. Other params (faction, unit, area) don't need to be preserved since the user is intentionally jumping to a pre-filtered view.

### Pitfall 7: MultiSelectPopover Not Exported from UnitFilters.tsx

**What goes wrong:** Attempting `import { MultiSelectPopover } from "@/features/units/UnitFilters"` fails at compile time — `MultiSelectPopover` is a module-private function in `UnitFilters.tsx` (lowercase `function`, not exported).

**How to avoid:** Copy `MultiSelectPopover` and its `Option`/`MultiSelectPopoverProps` interfaces verbatim into `PaintInventoryFilters.tsx`. Do not attempt to import or export it from `UnitFilters.tsx` — changing that file's exports is out of Phase 7 scope.

---

## Code Examples

### Recipe Filter Query (New Work)

```typescript
// src/db/queries/recipePaints.ts — ADD this function (Phase 7 new work)
export async function getRecipeIdsByPaintId(paintId: number): Promise<number[]> {
  const db = await getDb();
  const rows = await db.select<{ recipe_id: number }[]>(
    "SELECT DISTINCT recipe_id FROM recipe_paints WHERE paint_id = $1",
    [paintId]
  );
  return rows.map((r) => r.recipe_id);
}
```

### TanStack Router validateSearch Addition (Minimal Patch)

```typescript
// src/app/router.tsx — two changes:
// 1. Add import
import { z } from "zod";

// 2. Change recipesRoute definition
export const recipesRoute = createRoute({  // export added
  getParentRoute: () => rootRoute,
  path: "/recipes",
  validateSearch: z.object({
    paintId: z.number().optional(),
  }),
  component: RecipesPage,
});
```

### RecipesPage paintId Consumption (Minimal Patch)

```typescript
// src/features/recipes/RecipesPage.tsx — additions only

import { recipesRoute } from "@/app/router";
import { useEffect, useState } from "react";  // useEffect already imported

// Inside RecipesPage():
const { paintId } = recipesRoute.useSearch();
const [paintFilter, setPaintFilter] = useState<number | null>(null);

// Seed paint filter from URL on mount
useEffect(() => {
  if (paintId !== undefined) setPaintFilter(paintId);
}, []); // intentionally empty — only seed on first mount

// New hook for paint-based recipe filtering
const { data: recipeIdsByPaint } = useQuery({
  queryKey: ["recipe-ids-by-paint", paintFilter],
  queryFn: () => paintFilter !== null ? getRecipeIdsByPaintId(paintFilter) : Promise.resolve(null),
  enabled: paintFilter !== null,
});

// Add to existing filtered useMemo:
if (paintFilter !== null && recipeIdsByPaint !== undefined) {
  if (!recipeIdsByPaint.includes(r.id)) return false;
}
```

### Inline Owned Badge in PaintRow

```typescript
// src/features/paints/PaintRow.tsx — extend PaintRowProps and add column

interface PaintRowProps {
  paint: PaintWithRecipeCount;  // upgraded from Paint
  onEdit: (paint: PaintWithRecipeCount) => void;
  onDelete: (paint: PaintWithRecipeCount) => void;
  onToggleOwned: (paint: PaintWithRecipeCount) => void;
  onRecipeBadgeClick: (paint: PaintWithRecipeCount) => void;
}

// Owned badge cell:
<TableCell>
  <Badge
    variant={paint.owned === 1 ? "default" : "secondary"}
    role="button"
    tabIndex={0}
    onClick={() => onToggleOwned(paint)}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggleOwned(paint); }}
    className="cursor-pointer"
    aria-label={`Toggle owned status for ${paint.brand} ${paint.name}`}
  >
    {paint.owned === 1 ? "Owned" : "Not owned"}
  </Badge>
</TableCell>

// Recipe count badge cell:
<TableCell>
  {paint.recipe_count > 0 ? (
    <Badge
      variant="secondary"
      className="cursor-pointer hover:bg-secondary/80"
      role="link"
      tabIndex={0}
      onClick={() => onRecipeBadgeClick(paint)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onRecipeBadgeClick(paint); }}
      aria-label={`${paint.name} used in ${paint.recipe_count} recipe${paint.recipe_count === 1 ? "" : "s"} — click to filter recipes`}
    >
      Used in {paint.recipe_count} recipe{paint.recipe_count === 1 ? "" : "s"}
    </Badge>
  ) : (
    <Badge variant="outline">0 recipes</Badge>
  )}
</TableCell>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `PaintsPage` — plain list, no filters | `PaintsPage` evolves to full inventory page with filter bar | Phase 7 | Route unchanged; component behavior extended |
| No search params on any route | `/recipes` route gets `validateSearch` | Phase 7 | First use of typed URL params; sets precedent for Phase 8+ |
| Recipe filter = local `useState` only | Recipe filter gains `paintId` entry point via URL param | Phase 7 | Filter stays local state; URL param seeds it once on mount |

**Deprecated/outdated:**
- `usePaints()` is replaced by `usePaintsWithRecipeCounts()` as the data source for `PaintsPage`. The old hook still exists and is used by `PaintSheet` internally (for the paint picker combobox).

---

## Open Questions

1. **Circular import: `recipesRoute` export from `router.tsx` → import in `RecipesPage.tsx`**
   - What we know: ES module circular imports with Vite and TanStack Router generally work when the import is a `const` (not a class or dynamic export). The pattern "router imports page component, page component imports route object" is common in non-file-based TanStack Router setups.
   - What's unclear: Whether Vite's module graph evaluates `router.tsx` before `RecipesPage.tsx` at runtime, or if the `recipesRoute` const is available when `RecipesPage.tsx` calls `recipesRoute.useSearch()`.
   - Recommendation: Export `recipesRoute` from `router.tsx` and test the circular import first. If it causes a runtime error, extract route definitions to a `src/app/routes.ts` file that both `router.tsx` and `RecipesPage.tsx` import from.

2. **Phase 6 completion status before Phase 7 can begin**
   - What we know: `STATE.md` shows 06-02 complete (types created including `PaintWithRecipeCount`), 06-03 and 06-04 pending. Phase 7 requires 06-03 (`getPaintsWithRecipeCount` query function) and 06-04 (`usePaintsWithRecipeCounts` hook + `PAINTS_WITH_RECIPES_KEY`).
   - What's unclear: Whether the GSD executor will run Phase 6 to completion before starting Phase 7.
   - Recommendation: Phase 7 plans must start with a note: "Assumes Phase 6 plans 06-03 and 06-04 are complete." Phase 7 Wave 0 should include a smoke-test import check for these exports.

3. **`getRecipePaintsByRecipe` currently issues N queries in `useAllStepCounts` — does Phase 7 worsen this?**
   - What we know: `RecipesPage.tsx` already does one `getRecipePaintsByRecipe(r.id)` per recipe in `useAllStepCounts`. Adding `getRecipeIdsByPaintId` adds ONE query total (only when `paintFilter !== null`).
   - Recommendation: Not a concern for Phase 7. The `getRecipeIdsByPaintId` is a single SQL query, not a per-recipe loop.

---

## Validation Architecture

nyquist_validation is enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PINV-02 | `usePaintInventoryFilters` store — toggleBrand/toggleType/toggleColorFamily add/remove correctly | Unit (Zustand store) | `npm test -- -t "paintInventoryFilters"` | Wave 0 |
| PINV-03 | `usePaintInventoryFilters` — `toggleRunningLow` flips boolean; filter function returns only `running_low === 1` paints | Unit | `npm test -- -t "paintInventoryFilters"` | Wave 0 |
| PINV-04 | `usePaintInventoryFilters` — `toggleWishlist` flips boolean; filter function returns only `wishlist === 1` paints | Unit | `npm test -- -t "paintInventoryFilters"` | Wave 0 |
| PINV-02 | `clearAll` resets all five fields to defaults | Unit | `npm test -- -t "paintInventoryFilters"` | Wave 0 |
| PINV-05 | `getRecipeIdsByPaintId` SQL query uses correct `SELECT DISTINCT recipe_id FROM recipe_paints WHERE paint_id = $1` | Unit (mock getDb) | `npm test -- -t "recipePaints"` | Wave 0 |
| PINV-01 | `PaintsPage` renders table with brand, type, color-family, owned, recipes columns | Integration (renderHook + render) | manual-only — requires Tauri IPC mock | Manual only |
| PINV-06 | Inline owned toggle — optimistic update flips badge; rollback restores on error | Integration | manual-only — requires Tauri IPC mock | Manual only |

Rationale for manual-only on PINV-01/PINV-06: Tauri IPC (`tauri-plugin-sql`) cannot be mocked in jsdom without significant test infrastructure work. The established codebase pattern (see Phase 6 research) is to test logic (Zustand stores, filter functions, SQL query strings) in Vitest and verify UI behavior via manual smoke testing during `/gsd:verify-work`.

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + manual smoke test (add paint, apply each filter, toggle owned, click recipe badge, verify navigation to `/recipes?paintId=X`) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/paint-inventory/paintInventoryFilters.test.ts` — Zustand store unit tests: initial state, toggleBrand/toggleType/toggleColorFamily toggle behavior, toggleRunningLow/toggleWishlist, clearAll resets all fields. Follows exact structure of `tests/collection/collectionFilters.test.ts`.
- [ ] `tests/paint-inventory/recipePaintQuery.test.ts` — mocks `getDb()`, asserts `getRecipeIdsByPaintId(5)` calls `db.select` with `"SELECT DISTINCT recipe_id FROM recipe_paints WHERE paint_id = $1"` and `[5]`.

---

## Sources

### Primary (HIGH confidence)

- `src/features/units/collectionFilters.ts` — Zustand store template; directly audited
- `src/features/units/UnitFilters.tsx` — `MultiSelectPopover` component; directly audited; confirmed not exported
- `src/features/units/CollectionPage.tsx` — `handleToggleActive` optimistic pattern; directly audited
- `src/features/paints/PaintsPage.tsx` — current state of the file being evolved; directly audited
- `src/features/paints/PaintRow.tsx` — existing swatch + owned Badge implementation; directly audited
- `src/features/recipes/RecipesPage.tsx` — current filter state (local useState, no Zustand, no search params); directly audited
- `src/app/router.tsx` — current route definitions (no `validateSearch` on any route); directly audited
- `src/hooks/usePaints.ts` — `PAINTS_KEY`, `PAINTS_WITH_RECIPES_KEY` (after Phase 6), `useUpdatePaint` signature; directly audited
- `src/types/paint.ts` — `Paint`, `PaintWithRecipeCount`, `PAINT_TYPES` constant; directly audited
- `package.json` — `@tanstack/react-router ^1.168.26`, `zod ^4.4.1` confirmed installed
- TanStack Router v1 official docs — `validateSearch`, `useSearch`, `useNavigate` with search params; verified via WebFetch

### Secondary (MEDIUM confidence)

- TanStack Router search params pattern for non-file-based routing — verified from official docs; circular import behavior is an inference (no direct doc statement)

### Tertiary (LOW confidence)

- Circular import `recipesRoute` from `router.tsx` → `RecipesPage.tsx` behavior at runtime — inferred from ES module spec; needs runtime verification during implementation

---

## Metadata

**Confidence breakdown:**
- Zustand filter store pattern: HIGH — direct copy of proven `collectionFilters.ts`
- Optimistic owned toggle: HIGH — direct copy of proven `handleToggleActive` in `CollectionPage.tsx`
- TanStack Router `validateSearch` API: HIGH — verified against official docs
- `recipe_paints` join requirement for paint filter on RecipesPage: HIGH — direct audit confirms no direct paint_id on recipes
- Circular import risk: LOW — theoretical; needs runtime validation

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (stable codebase; risk from Phase 6 completing changes to usePaints.ts)
