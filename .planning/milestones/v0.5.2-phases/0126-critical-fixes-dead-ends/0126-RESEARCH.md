# Phase 126: Critical Fixes & Dead Ends - Research

**Researched:** 2026-06-11
**Domain:** UI bug fixes, dead-end elimination, toast discipline, CSS tokens
**Confidence:** HIGH

## Summary

Phase 126 is a pure fix phase -- no new features, no schema changes, no new dependencies. All 11 requirements (FIX-01 through FIX-11) target existing code with well-defined bugs: dead-end screens in Painting Mode, incorrect/missing toast feedback, missing error states, inconsistent page headers, undefined CSS tokens in light mode, loading vs not-found confusion, and missing custom scrollbar styling.

Every fix has been traced to a specific file and line range. The codebase already contains all the patterns needed (PageHeader, toast.success/error from sonner, React Query isLoading/isError/refetch, CSS custom properties). No external packages are required.

**Primary recommendation:** Group fixes by file proximity to minimize context switches. The largest single file is ArmyListDetailPage.tsx (860 lines) which touches FIX-03, FIX-08, and FIX-10.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Completion screen gets primary "Exit" Button + "Press Escape to exit" text
- D-02: "Assignment not found" screen gets "Go Back" Button with ArrowLeft + Escape hint
- D-03: StepFocalView normal step view gets subtle "Esc to exit" in footer
- D-04: Remove toast.success() on early-return path in ArmyListDetailPage notes save (line ~435)
- D-05: Audit GoalDeleteDialog and parent page for duplicate error toast -- remove duplicate
- D-06: Add onSuccess toast callbacks to all 4 mutation calls in EnhancementPickerSheet and LeaderAttachmentSheet
- D-07: Add toast.error in onError handler of useUpsertRulesFavorite and useDeleteRulesFavorite
- D-08: RecipesPage error state with AlertCircle, heading, description, and refetch() button
- D-09: Settings and Data Health pages must use PageHeader component
- D-10: Add :root fallbacks for all dark-only tokens
- D-11: ArmyListDetailPage: check isLoading before showing skeleton, show "List not found" when !isLoading && !list
- D-12: CSS-only scrollbar in globals.css under .dark, 6px width, zinc-700/zinc-800 colors

### Claude's Discretion
- Exact wording of error messages and toast text -- keep consistent with existing patterns
- Whether to extract a shared ErrorState component or inline (prefer inline for 1-2 uses)
- Exact oklch values for light-mode token fallbacks

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIX-01 | Painting Mode completion screen exit button + Escape hint | StepFocalView.tsx line 42-49: isAllComplete branch has no exit affordance. onExit prop must be threaded through PaintingModeView. |
| FIX-02 | Painting Mode "assignment not found" back button + Escape | page.tsx line 127-137: !assignment block has no navigation. handleExit already exists (line 109). Button + navigate(-1) or Link needed. |
| FIX-03 | Notes save no-op toast removal | ArmyListDetailPage.tsx line 434-436: early return fires toast.success("Notes saved.") when notesDraft equals list.notes. Remove the toast.success call. |
| FIX-04 | RecipesPage error state | RecipesPage.tsx: useRecipes() destructures only { data, isLoading }. Must also destructure isError and refetch. Add error UI block before the card grid. |
| FIX-05 | Settings + Data Health use PageHeader | SettingsPage: uses `<h1 className="text-xl font-semibold">` (not text-3xl, no border-b). DataHealthPage: same pattern. Both need PageHeader import + replacement. |
| FIX-06 | Light-mode token fallbacks | globals.css :root block (lines 1-40) is missing --forge-black, --panel-elevated, --panel-surface, --battle-gold. These are only defined in .dark (lines 71-77). |
| FIX-07 | Goal delete duplicate toast | useGoals.ts line 66-68: onError toasts "Failed to delete goal -- changes were not saved." GoalsPage.tsx line 78: catch block toasts "Failed to delete goal." Both fire on error. Remove the catch toast in GoalsPage. |
| FIX-08 | Enhancement/leader mutation success toasts | EnhancementPickerSheet.tsx: addEnhancement.mutate (line 210) and removeEnhancement.mutate (line 177) have onError but no onSuccess. LeaderAttachmentSheet.tsx: same pattern for setLeaderAttachment (line 195) and clearLeaderAttachment (lines 119, 160). |
| FIX-09 | Rules favorites error toast | useRulesFavorites.ts: useUpsertRulesFavorite onError (line 54) and useDeleteRulesFavorite onError (line 79) only rollback optimistic data -- no toast.error call. |
| FIX-10 | Army list loading vs not-found | ArmyListDetailPage.tsx line 253-255: useArmyList returns { data: list } but isLoading is not destructured. Line 526-543: !list guard shows skeleton unconditionally. |
| FIX-11 | Custom scrollbar styling | globals.css: no scrollbar rules exist. CSS-only addition at end of file. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Painting Mode exit UX (FIX-01, FIX-02) | Frontend (React) | -- | Component-level button/navigation additions |
| Toast discipline (FIX-03, FIX-07, FIX-08, FIX-09) | Frontend (React) | -- | React Query mutation callback changes |
| Error state UI (FIX-04) | Frontend (React) | -- | React Query isError handling in component |
| Page header consistency (FIX-05) | Frontend (React) | -- | Swap inline h1 for shared PageHeader component |
| CSS token fallbacks (FIX-06) | Browser/CSS | -- | :root custom property definitions |
| Loading vs not-found (FIX-10) | Frontend (React) | -- | Conditional rendering based on React Query state |
| Custom scrollbar (FIX-11) | Browser/CSS | -- | CSS pseudo-element rules in globals.css |

## Standard Stack

No new packages. All fixes use existing dependencies:

| Library | Version | Purpose | Already Installed |
|---------|---------|---------|-------------------|
| react | 19 | Component rendering | Yes |
| sonner | (current) | Toast notifications | Yes |
| @tanstack/react-query | (current) | Data fetching state (isLoading, isError, refetch) | Yes |
| lucide-react | (current) | Icons (AlertCircle, ArrowLeft) | Yes |
| @tanstack/react-router | (current) | Navigation (useNavigate, Link) | Yes |

## Architecture Patterns

### Pattern 1: Toast Callback Convention
**What:** All mutations use onSuccess/onError callbacks in the mutate() call site, not in the hook definition, unless the toast is universal (every call site wants it).
**When to use:** Per-component feedback that varies by context.
**Current convention in codebase:**
```typescript
// Per-call-site pattern (most common):
mutation.mutate(args, {
  onSuccess: () => toast.success("Action completed."),
  onError: () => toast.error("Failed to perform action. Please try again."),
});

// Hook-level pattern (when every call site wants the same toast):
// Used in useDeleteGoal -- onError in hook definition
```

**Key insight for FIX-07:** The duplicate arises because useDeleteGoal has hook-level onError AND GoalsPage has a try/catch around mutateAsync. When mutateAsync rejects, BOTH fire. Fix: remove the try/catch toast in GoalsPage since the hook already handles it. The catch block should still exist for flow control (closeDeleteDialog) but not toast.

**Key insight for FIX-08:** Enhancement and leader mutations have onError at call sites but no onSuccess. Add onSuccess callbacks at the same call sites.

**Key insight for FIX-09:** Rules favorites hooks have onError that rolls back but doesn't toast. Add toast.error in the existing onError handlers within the hook definitions (since all call sites want the same error message).

### Pattern 2: Error State Rendering
**What:** Centered flex column with icon + heading + description + action button.
**Existing examples:** Multiple empty states use this layout.
```typescript
// FIX-04 target pattern:
if (isError) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="text-center">
        <h2 className="text-lg font-semibold">Failed to load recipes</h2>
        <p className="text-sm text-muted-foreground mt-1">Something went wrong</p>
      </div>
      <Button variant="outline" onClick={() => refetch()}>Try again</Button>
    </div>
  );
}
```

### Pattern 3: Loading vs Not-Found Guard
**What:** Distinguish query loading from query settled with null result.
```typescript
// FIX-10 pattern:
const { data: list, isLoading: listLoading } = useArmyList(listId);

if (listLoading) {
  return <Skeleton ... />;  // existing skeleton
}

if (!list) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/army-lists"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Army Lists</Link>
      </Button>
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">List not found</h2>
        <p className="text-sm text-muted-foreground mt-1">This army list may have been deleted.</p>
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Double error handling (mutateAsync + hook onError):** When a hook defines onError AND the call site wraps mutateAsync in try/catch with its own toast, both fire. Pick one site.
- **Skeleton for all falsy states:** `if (!data)` catches both "still loading" and "loaded but null". Always check `isLoading` first.
- **Toast on no-op:** Showing success feedback when no mutation actually ran confuses users about whether their change was saved.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Page headers | Custom h1 with inline styles | `PageHeader` component | Already exists, ensures text-3xl + border-b consistency |
| Toast notifications | Custom notification system | `toast.success()` / `toast.error()` from sonner | Already integrated, consistent positioning |
| CSS scrollbar | JS-based custom scrollbar library | CSS `::-webkit-scrollbar` + `scrollbar-width` | Pure CSS, no bundle impact, covers Tauri's Chromium webview |

## Common Pitfalls

### Pitfall 1: StepFocalView onExit Prop Threading
**What goes wrong:** StepFocalView doesn't currently accept an onExit prop. Adding the exit button requires threading it through PaintingModeView.
**Why it happens:** The component was designed for step navigation only, not lifecycle control.
**How to avoid:** Add `onExit` to StepFocalViewProps, pass through PaintingModeView from page.tsx's handleExit. Check PaintingModeView renders StepFocalView and passes all required props.
**Warning signs:** Exit button renders but does nothing -- forgot to pass the callback.

### Pitfall 2: ArmyListDetailPage useArmyList isLoading Naming
**What goes wrong:** The component already destructures `isLoading` from `useArmyListWithUnits` (line 256). Adding `isLoading` from `useArmyList` creates a name collision.
**Why it happens:** Two hooks on the same entity with different loading states.
**How to avoid:** Rename: `const { data: list, isLoading: listLoading } = useArmyList(listId);`
**Warning signs:** TypeScript error about duplicate identifier, or wrong loading state used in guard.

### Pitfall 3: GoalDeleteDialog Duplicate Toast -- Wrong Fix
**What goes wrong:** Removing the hook-level onError instead of the catch-block toast breaks error handling for any future call sites.
**Why it happens:** Both sites look equally valid to remove.
**How to avoid:** Keep the hook-level onError (it's the canonical error handler). Remove only the catch-block toast in GoalsPage. Keep the catch block itself for flow control (closing dialog).
**Warning signs:** No error toast appears on delete failure after fix.

### Pitfall 4: Light-Mode Token Values
**What goes wrong:** Using identical oklch/hsl values as dark mode makes tokens invisible on white backgrounds.
**Why it happens:** Copy-paste from .dark block without adjusting for light background.
**How to avoid:** --battle-gold can stay similar (gold is readable on white). --forge-black, --panel-elevated, --panel-surface should use the existing :root light-mode equivalents (--background, --card, --secondary).
**Warning signs:** Elements using these tokens become invisible or unreadable in light mode.

### Pitfall 5: Scrollbar Styling Specificity
**What goes wrong:** Scrollbar rules don't apply because they target wrong selectors or are overridden.
**Why it happens:** Webkit scrollbar pseudo-elements need to be at global scope.
**How to avoid:** Place rules after all other styles in globals.css. Scope under `.dark` as decided. Use `scrollbar-color` for Firefox fallback.
**Warning signs:** Default browser scrollbar still shows in dark mode.

## Code Examples

### FIX-01: StepFocalView Exit Button (completion screen)
```typescript
// In StepFocalView -- add onExit to props interface
export interface StepFocalViewProps {
  // ... existing props ...
  onExit?: () => void;  // NEW
}

// In isAllComplete branch (line 42-49):
if (isAllComplete) {
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center gap-4">
      <CheckCircle className="h-16 w-16 text-green-500" />
      <p className="text-2xl font-semibold">All steps complete!</p>
      {onExit && (
        <>
          <Button onClick={onExit}>Exit Painting Mode</Button>
          <p className="text-xs text-muted-foreground">Press Escape to exit</p>
        </>
      )}
    </div>
  );
}
```

### FIX-03: Remove No-Op Toast
```typescript
// ArmyListDetailPage.tsx handleSaveListNotes (line 433-448):
function handleSaveListNotes() {
  if (!list) return;
  if (notesDraft === (list.notes ?? "")) {
    // REMOVE: toast.success("Notes saved.");
    return;  // Silent no-op
  }
  // ... rest unchanged
}
```

### FIX-06: Light-Mode Token Fallbacks
```css
/* In :root block of globals.css, add after existing tokens: */
--forge-black: hsl(var(--background));
--panel-elevated: hsl(var(--card));
--panel-surface: hsl(var(--secondary));
--battle-gold: oklch(0.65 0.17 85);  /* Slightly darker for light backgrounds */
```

### FIX-11: Custom Scrollbar
```css
/* At end of globals.css */
.dark ::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.dark ::-webkit-scrollbar-track {
  background: hsl(240 5.9% 10%);  /* zinc-900 */
}
.dark ::-webkit-scrollbar-thumb {
  background: hsl(240 3.7% 30%);  /* zinc-700 approx */
  border-radius: 9999px;
}
.dark ::-webkit-scrollbar-thumb:hover {
  background: hsl(240 3.7% 40%);  /* zinc-600 approx */
}
.dark {
  scrollbar-width: thin;
  scrollbar-color: hsl(240 3.7% 30%) hsl(240 5.9% 10%);
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test -- tests/specific-file.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIX-01 | Exit button renders on completion screen | unit | `pnpm test -- tests/painting-mode/StepFocalView.exit.test.tsx` | Wave 0 |
| FIX-02 | Back button renders on not-found screen | unit | `pnpm test -- tests/painting-mode/PaintingModePage.notfound.test.tsx` | Wave 0 |
| FIX-03 | No toast on no-op notes save | unit | `pnpm test -- tests/army-list/notesToast.test.ts` | Wave 0 |
| FIX-04 | Error state renders when query fails | unit | `pnpm test -- tests/painting/RecipesPage.error.test.tsx` | Wave 0 |
| FIX-05 | Settings + DataHealth use PageHeader | unit | `pnpm test -- tests/settings/PageHeader.test.tsx` | Wave 0 |
| FIX-06 | Light-mode tokens defined in :root | unit | `pnpm test -- tests/design-foundation/designTokens.test.ts` | Existing (extend) |
| FIX-07 | Single error toast on goal delete failure | unit | `pnpm test -- tests/goals/useGoals.test.tsx` | Existing (extend) |
| FIX-08 | Success toasts on enhancement/leader mutations | unit | `pnpm test -- tests/army-list/enhancementLeaderToasts.test.tsx` | Wave 0 |
| FIX-09 | Error toast on favorites rollback | unit | `pnpm test -- tests/datasheet/useRulesFavorites.test.tsx` | Existing (extend) |
| FIX-10 | Not-found vs loading distinction | unit | `pnpm test -- tests/army-list/listNotFound.test.tsx` | Wave 0 |
| FIX-11 | CSS scrollbar rules present | unit | `pnpm test -- tests/design-foundation/designTokens.test.ts` | Existing (extend) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/<relevant-file>.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] `tests/painting-mode/StepFocalView.exit.test.tsx` -- FIX-01 exit button
- [ ] `tests/painting-mode/PaintingModePage.notfound.test.tsx` -- FIX-02 back button
- [ ] `tests/army-list/notesToast.test.ts` -- FIX-03 no-op toast
- [ ] `tests/painting/RecipesPage.error.test.tsx` -- FIX-04 error state
- [ ] `tests/settings/PageHeader.test.tsx` -- FIX-05 header consistency
- [ ] `tests/army-list/enhancementLeaderToasts.test.tsx` -- FIX-08 success toasts
- [ ] `tests/army-list/listNotFound.test.tsx` -- FIX-10 loading vs not-found

## File Change Inventory

| File | Requirements | Change Type |
|------|-------------|-------------|
| `src/features/painting-mode/StepFocalView.tsx` | FIX-01, FIX-11/NAV-11 | Add onExit prop, exit button, escape hint |
| `src/features/painting-mode/PaintingModeView.tsx` | FIX-01 | Thread onExit prop to StepFocalView |
| `src/app/painting-mode/page.tsx` | FIX-02 | Add back button + escape hint to not-found screen |
| `src/features/army-lists/ArmyListDetailPage.tsx` | FIX-03, FIX-10 | Remove no-op toast, add isLoading guard |
| `src/features/recipes/RecipesPage.tsx` | FIX-04 | Add isError/refetch, render error state |
| `src/app/settings/page.tsx` | FIX-05 | Replace h1 with PageHeader |
| `src/features/data-health/DataHealthPage.tsx` | FIX-05 | Replace h1 with PageHeader |
| `src/styles/globals.css` | FIX-06, FIX-11 | Add :root token fallbacks, scrollbar rules |
| `src/features/goals/GoalsPage.tsx` | FIX-07 | Remove duplicate toast.error in catch block |
| `src/features/army-lists/EnhancementPickerSheet.tsx` | FIX-08 | Add onSuccess toasts to assign/remove mutations |
| `src/features/army-lists/LeaderAttachmentSheet.tsx` | FIX-08 | Add onSuccess toasts to attach/detach mutations |
| `src/hooks/useRulesFavorites.ts` | FIX-09 | Add toast.error + toast import in onError handlers |

**Total files changed:** 12 (all existing, no new source files)

## Assumptions Log

> All claims in this research were verified by direct codebase inspection. No external sources needed for a fix-only phase.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| -- | (none) | -- | -- |

**All claims verified via codebase grep/read -- no assumptions needed.**

## Open Questions

None. All 11 fixes are fully scoped with specific file locations, line numbers, and implementation patterns identified.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all 12 target files
- CONTEXT.md decisions D-01 through D-12
- REQUIREMENTS.md FIX-01 through FIX-11

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new packages, all existing
- Architecture: HIGH - all patterns verified in codebase
- Pitfalls: HIGH - identified through code reading, not speculation

**Research date:** 2026-06-11
**Valid until:** 2026-07-11 (stable -- no external dependencies)
