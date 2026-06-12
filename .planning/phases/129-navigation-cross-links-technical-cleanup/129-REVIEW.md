---
phase: 129-navigation-cross-links-technical-cleanup
reviewed: 2026-06-12T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - src/app/painting-mode/page.tsx
  - src/app/router.tsx
  - src/components/common/AppSidebar.tsx
  - src/features/army-lists/ArmyListDetailPage.tsx
  - src/features/army-lists/ArmyListUnitRow.tsx
  - src/features/army-lists/DatasheetBrowserDialog.tsx
  - src/features/army-lists/ExportDropdown.tsx
  - src/features/army-lists/LoadoutBuilderSheet.tsx
  - src/features/army-lists/armyListDetailReducer.ts
  - src/features/battle-log/BattleLogRow.tsx
  - src/features/dashboard/DashboardPage.tsx
  - src/features/dashboard/NextPaintingActionCard.tsx
  - src/features/painting-projects/KanbanBoard.tsx
  - src/features/recipes/RecipeCard.tsx
  - src/features/recipes/RecipeDetailSheet.tsx
  - src/features/rules-hub/RulesHubPage.tsx
  - src/features/unit-database/DatabaseBrowserPage.tsx
  - src/features/units/AppliedRecipesTab.tsx
  - src/features/units/UnitDetailSheet.tsx
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 129: Code Review Report

**Reviewed:** 2026-06-12
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

This phase delivers navigation cross-links (painting-mode `returnTo`, battle-log → army-list link, rules-hub ↔ unit-database, unit → datasheet) plus technical cleanup (extracting `armyListDetailReducer.ts`, `memo(RecipeCard)`, inline-style → Tailwind class swaps, doc-comment renames). The changes are small, well-scoped, and well-covered by new tests. No correctness-critical or security defects were found.

The reducer extraction is a verified 1:1 move with no behavioral change. The open-redirect guard on painting-mode exit is correct and tested. The remaining findings concern incomplete cross-link behavior (the "View Datasheet" link does not deep-link to the unit it was opened from), loss of search-param state in `returnTo`, and a partially-defeated `memo` optimization.

No structural findings block was provided for this review.

## Warnings

### WR-01: "View Datasheet" link is a dead-ish cross-link — never surfaces the unit's datasheet

**File:** `src/features/units/UnitDetailSheet.tsx:106-119`
**Issue:** The button only renders when `unit.udb_unit_id` is set (i.e., the unit is linked to a canonical datasheet), implying the user wants to view *that* datasheet. But the handler navigates to the bare `/unit-database` page with no context:
```tsx
onClick={() => {
  onClose();
  navigate({ to: "/unit-database" });
}}
```
`unit.udb_unit_id` is available and ignored. The destination route (`unitDatabaseRoute` in `src/app/router.tsx:207-211`) has no `validateSearch`, so there is no way to deep-link to the specific datasheet even if the caller wanted to. The user lands on a generic browser scoped to whatever faction was last selected, with no indication of which datasheet they asked for. This is the exact "dead end / link goes nowhere useful" class of defect this phase set out to fix.
**Fix:** Add a search param to the unit-database route and pass the linked id through, then have `DatabaseBrowserPage` auto-open the matching datasheet:
```tsx
// router.tsx
const unitDatabaseRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/unit-database",
  validateSearch: z.object({ udbUnitId: z.string().optional() }),
  component: UnitDatabasePageShell,
});

// UnitDetailSheet.tsx
onClick={() => {
  onClose();
  navigate({ to: "/unit-database", search: { udbUnitId: unit.udb_unit_id! } });
}}
```
If deep-linking is genuinely out of scope for this phase, at minimum gate the button so it does not imply more than it delivers, or document the limitation.

### WR-02: `returnTo: location.pathname` silently drops search params, losing page state on return

**File:** `src/features/recipes/RecipeDetailSheet.tsx:319`, `src/features/units/AppliedRecipesTab.tsx:82`, `src/features/painting-projects/KanbanBoard.tsx:95`
**Issue:** All three navigation sources capture only `location.pathname`:
```tsx
search: { returnTo: location.pathname }
```
`useLocation().pathname` excludes the query string. The `recipes` route accepts a `paintId` search param (`router.tsx:119-126`), so a user who opens Painting Mode from `/recipes?paintId=3` and then exits is sent back to `/recipes` with the filter cleared. Any future filtered/search-state route will silently lose state the same way. Exit then feels like a partial dead end — the user does not return to where they were.
**Fix:** Capture the full location including search (e.g. `location.href` — the router-relative href) instead of `location.pathname`, and confirm the painting-mode exit guard (`page.tsx:114`) still rejects `//` and `http:` after the change.

### WR-03: Painting-mode exit guard is best-effort string-prefix only; unmatched/stale paths are not handled

**File:** `src/app/painting-mode/page.tsx:113-116`
**Issue:** `returnTo` is validated only by string prefix:
```tsx
const target = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
navigate({ to: target });
```
This correctly blocks `//evil.com` and `http://…` (covered by tests). However it accepts *any* internal-looking string, including malformed paths (`/\`), unknown routes, or a stale path to a since-deleted resource (`/army-lists/999`). Passing an unmatched concrete path to `navigate({ to })` lands on a route with no match, which surfaces the router's not-found/error path rather than a graceful return. Because `returnTo` originates from a real prior page's `location.pathname` this is low-likelihood, and in a Tauri desktop app the open-redirect angle is not a true security vector — hence Warning, not Blocker.
**Fix:** Keep the prefix guard but ensure an unmatched target degrades to `/` (e.g. via the router's `defaultNotFoundComponent` or validating `returnTo` against the known route set before navigating). At minimum add a comment clarifying the guard is best-effort and the error boundary is the real backstop.

## Info

### IN-01: `memo(RecipeCard)` is largely defeated by unstable props from the parent

**File:** `src/features/recipes/RecipeCard.tsx:91`, consumed at `src/features/recipes/RecipeCardGrid.tsx:74-85`
**Issue:** `RecipeCard` is now wrapped in `memo`, but the parent passes `swatches={... ?? []}` and `availability={availabilityByRecipe.get(recipe.id)}`. The `?? []` fallback allocates a fresh array literal on every render, so for any recipe lacking swatches the memo comparison always fails and the component re-renders anyway. The optimization helps only for cards whose swatch array is a stable cached reference. (Performance is out of v1 review scope; flagged as Info because the change advertises an optimization that is only partially effective, not because of a correctness defect.)
**Fix:** Memoize a shared empty-array constant (`const EMPTY: string[] = []`) reused for the fallback, or apply the `?? []` inside the map that builds `swatchColorsByRecipe` so the reference is stable across renders.

### IN-02: Duplicated `returnTo: location.pathname` wiring across five call sites

**File:** `src/features/recipes/RecipeDetailSheet.tsx:319`, `src/features/units/AppliedRecipesTab.tsx:82`, `src/features/painting-projects/KanbanBoard.tsx:95` (plus hardcoded `returnTo: "/"` at `DashboardPage.tsx:364`, `NextPaintingActionCard.tsx:67`)
**Issue:** Five components independently construct the same `navigate({ to: "/painting-mode/$assignmentId", params, search: { returnTo } })` shape. The WR-02 fix would need to touch each `location.pathname` site individually, and they can drift out of sync.
**Fix:** Extract a `useStartPainting()` helper returning `(assignmentId: number) => navigate({...})` that centralizes `returnTo` capture, so future changes are made once.

### IN-03: `View Datasheet` button rendered as a sibling of `SheetDescription` inside `SheetHeader`

**File:** `src/features/units/UnitDetailSheet.tsx:106-119`
**Issue:** The `<Button>` sits inside `<SheetHeader>` directly after `<SheetDescription>` (a `<p>`). As a sibling there is no invalid `<button>`-inside-`<p>` nesting, so this renders correctly. The tight styling (`mt-1 h-auto px-0 text-xs`) makes it visually read as part of the description block, which is easy to mis-edit later. Cosmetic / maintainability note only.
**Fix:** Optional — wrap the action in its own container or move it below the header to make the structural separation explicit.

### IN-04: Painting-mode `returnTo` returns to a page with its sheet/tab state reset (expected, documented)

**File:** `src/features/units/AppliedRecipesTab.tsx:82`, `src/features/recipes/RecipeDetailSheet.tsx:319`
**Issue:** Painting Mode is launched from inside a Sheet (UnitDetailSheet's Applied Recipes tab, or RecipeDetailSheet). `returnTo` is the underlying page path, so exiting returns to the page with the sheet closed and any selected tab reset. This is conventional for a full-screen mode and consistent with the rest of the app — noted only so the limitation is documented and not mistaken for a regression.
**Fix:** None required. If sheet-state restoration is ever desired, encode it in `returnTo` search params.

---

_Reviewed: 2026-06-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
