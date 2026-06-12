---
phase: 129-navigation-cross-links-technical-cleanup
reviewed: 2026-06-11T00:00:00Z
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
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 129: Code Review Report

**Reviewed:** 2026-06-11
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Phase 129 implements returnTo navigation for Painting Mode, cross-page links, sidebar improvements (Game Day entry, collapsed dividers), dead code removal (ArmyListDetailSheet deleted), RecipeCard memoization, and reducer extraction for ArmyListDetailPage.

The overall implementation is clean and follows established patterns. The routing additions are structurally sound, the reducer extraction is a faithful refactor with no behavior change, and all five entry points correctly pass `returnTo`. One correctness bug was found in `BattleLogRow.tsx` where a null `army_list_id` would generate a malformed route param. Two warnings cover the absence of `returnTo` validation and a missing entry point. Two info items cover the `displayName` omission on `RecipeCard` and a stale comment in `exportArmyListPdf.ts`.

---

## Critical Issues

### CR-01: BattleLogRow produces `/army-lists/null` when armyListName is truthy but army_list_id is null

**File:** `src/features/battle-log/BattleLogRow.tsx:90`

**Issue:** The `Link` to `/army-lists/$listId` renders when `armyListName` is truthy, passing `String(log.army_list_id)` as the param. The `army_list_id` field is typed `number | null`. If the caller ever provides a truthy `armyListName` but a null `army_list_id` (e.g., a defensive bug in the parent that resolves a name from a different source, or future refactoring that loosens the caller contract), `String(null)` produces the literal string `"null"`, generating the route `/army-lists/null`. TanStack Router will accept this string as a valid param, causing a page load for a non-existent list ID without a runtime error, silently displaying the "list not found" UI. The component's own prop doc comment says `armyListName: null = army_list_id is null OR list deleted`, but the branch logic at line 86 branches only on `armyListName` truthiness, not on `army_list_id` truthiness.

**Fix:** Add a guard that also requires `army_list_id` to be non-null before rendering the link:

```tsx
{armyListName && log.army_list_id !== null ? (
  <>
    <Link
      to="/army-lists/$listId"
      params={{ listId: String(log.army_list_id) }}
      className="hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {armyListName}
    </Link>
    ...
  </>
) : log.army_list_id !== null ? (
  <span className="italic">(Army list deleted)</span>
) : (
  <span className="italic">No army list</span>
)}
```

---

## Warnings

### WR-01: `returnTo` search param has no pathname validation — arbitrary strings navigate to unknown routes

**File:** `src/app/painting-mode/page.tsx:114` / `src/app/router.tsx:220`

**Issue:** `handleExit` calls `navigate({ to: returnTo ?? "/" })` where `returnTo` is an arbitrary `z.string()` from the URL. TanStack Router v1's `navigate({ to: string })` with a non-typed string path will attempt to resolve the route; if the path is unknown, it will navigate to a 404/error state rather than failing loudly. More importantly, a value like `//evil.com` or `/painting-mode/999?returnTo=//evil.com` would produce a navigable TanStack path. In the Tauri desktop context this is low-risk (no HTTP navigation), but there is no defense-in-depth validation. The threat model in 129-01-PLAN.md accepts this (T-129-01) but notes "navigate() rejects external URLs" — which is not guaranteed for all edge cases.

**Fix:** Add a path sanitization guard before navigating. A simple check that `returnTo` starts with `/` and does not start with `//` is sufficient:

```tsx
const handleExit = () => {
  const safe =
    returnTo &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//")
      ? returnTo
      : "/";
  navigate({ to: safe });
};
```

### WR-02: `DashboardPage` `onPaint` entry point uses `location.pathname` but this is the Dashboard route (`/`), making it equivalent to the hard-coded `"/"` fallback — masking a missing `returnTo` in the `ActiveProjectsPanel` entry point

**File:** `src/features/dashboard/DashboardPage.tsx:365`

**Issue:** `DashboardPage` passes `search: { returnTo: location.pathname }` in the `onPaint` callback for `CurrentFocusCard`. Since this component only renders at `/`, `location.pathname` will always be `"/"`, making it functionally identical to the hard-coded `"/"` in `NextPaintingActionCard`. This is not incorrect, but the use of `location.pathname` here is misleading — it suggests dynamic origin tracking when the value is always constant. More importantly: a grep for `painting-mode` in `src/` shows 5 call sites total (AppliedRecipesTab, DashboardPage, NextPaintingActionCard, KanbanBoard, RecipeDetailSheet). The plan (129-01-PLAN.md task 2) specifies updating these 5 files. All 5 are updated. However, if a future entry point (e.g. `ActiveProjectsPanel` or a new feature) navigates to `painting-mode` without `returnTo`, the exit will silently fall back to `"/"`. There is no lint rule or type enforcement ensuring `returnTo` is always passed. This is a maintainability warning, not a blocking bug.

**Fix:** Use a hard-coded `"/"` instead of `location.pathname` in `DashboardPage.tsx` to make the intent explicit and avoid importing `useLocation` for a constant value:

```tsx
onPaint={primaryAssignment !== undefined
  ? () => navigate({
      to: "/painting-mode/$assignmentId",
      params: { assignmentId: String(primaryAssignment.id) },
      search: { returnTo: "/" },
    })
  : undefined
}
```

This makes `useLocation` importable only in files where it provides non-constant values, and removes the misleading implication of dynamic origin tracking.

---

## Info

### IN-01: `RecipeCard` memo wrapper lacks `.displayName` — inconsistent with `ArmyListUnitRow` pattern

**File:** `src/features/recipes/RecipeCard.tsx:91`

**Issue:** `RecipeCard` is exported as `memo(function RecipeCard(...))`. Using a named function expression inside `memo()` does preserve the name in React DevTools. However, `ArmyListUnitRow.tsx` (line 397) explicitly sets `.displayName = "ArmyListUnitRow"` as a supplementary line after the memo wrapping. The codebase pattern is inconsistent: some memo'd components rely on the named function, others have an explicit `displayName`. No functional bug, but an inconsistency worth noting if the team standardizes on explicit `displayName`.

**Fix:** Either add `RecipeCard.displayName = "RecipeCard";` after the export (matching ArmyListUnitRow), or remove the `displayName` line from ArmyListUnitRow (relying on named function form everywhere). Pick one pattern and apply it consistently.

### IN-02: Stale comment in `src/lib/exportArmyListPdf.ts` references deleted file

**File:** `src/lib/exportArmyListPdf.ts:4`

**Issue:** A comment reads "Used by both ArmyListDetailPage and ArmyListDetailSheet to avoid...". `ArmyListDetailSheet.tsx` was deleted in this phase (NAV-07). The comment is now inaccurate and references a file that no longer exists.

**Fix:** Update the comment to remove the reference to `ArmyListDetailSheet`:

```ts
// Used by ArmyListDetailPage for export functionality.
```

---

_Reviewed: 2026-06-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
