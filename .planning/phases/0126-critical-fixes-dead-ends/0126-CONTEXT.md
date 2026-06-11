# Phase 126: Critical Fixes & Dead Ends - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate broken flows, dead-end screens, and missing/incorrect feedback across Painting Mode, Army Lists, Recipes, Rules, Goals, and shared UI. Every user action must have an exit path and every error surface must have a recovery option. No new features — fixes only.

11 requirements: FIX-01 through FIX-11.

</domain>

<decisions>
## Implementation Decisions

### Painting Mode Exit UX (FIX-01, FIX-02)
- **D-01:** Completion screen (StepFocalView.tsx) gets a primary "Exit" Button below the success message that calls the existing `handleExit` function from page.tsx, plus a subtle muted text line "Press Escape to exit" beneath the button.
- **D-02:** "Assignment not found" error screen (page.tsx) gets a "Go Back" Button with ArrowLeft icon using `navigate(-1)` or Link to the originating page, plus the same Escape hint text.
- **D-03:** Escape hint in StepFocalView's normal step view (FIX-11/NAV-11 overlap) — add a subtle "Esc to exit" text in the footer area of the focal view so users always know they can leave.

### Toast Discipline (FIX-03, FIX-07, FIX-08, FIX-09)
- **D-04:** FIX-03 — Remove the toast.success() on the early-return path in ArmyListDetailPage notes save (line ~435). When notes haven't changed, the save is a no-op and should produce no toast.
- **D-05:** FIX-07 — Goal delete duplicate toast: audit the GoalDeleteDialog and its parent page. The dialog already has onError handling; ensure the parent page doesn't also catch and toast the same error. Remove the duplicate site.
- **D-06:** FIX-08 — Add `onSuccess` toast callbacks to all 4 mutation calls: enhancement assign ("Enhancement assigned"), enhancement remove ("Enhancement removed"), leader attach ("Leader attached"), leader detach ("Leader detached"). Keep messages short and consistent with existing toast patterns.
- **D-07:** FIX-09 — Add `toast.error("Failed to update favorite. Please try again.")` in the `onError` handler of both `useCreateRulesFavorite` and `useDeleteRulesFavorite` hooks, alongside the existing optimistic rollback.

### Error State Pattern (FIX-04)
- **D-08:** RecipesPage error state: when the query returns `isError`, render a centered block with AlertCircle icon (h-12 w-12, text-destructive), "Failed to load recipes" heading, "Something went wrong" description in text-muted-foreground, and a "Try again" Button that calls `refetch()`. This matches the centered empty-state layout used elsewhere.

### Page Header Consistency (FIX-05)
- **D-09:** Settings page and Data Health page must use the existing `PageHeader` component (text-3xl font-semibold tracking-tight + border-b border-border/40). Replace any custom header markup with the shared component. If PageHeader doesn't accept all needed props, extend it minimally.

### Light-Mode Token Fallbacks (FIX-06)
- **D-10:** Add `:root` fallbacks for all dark-only tokens: `--battle-gold`, `--forge-black`, `--panel-elevated`, `--panel-surface`, and any others defined only in `.dark`. Light-mode values should be reasonable defaults (e.g., slightly different oklch values for readability on white backgrounds). This is a safety net — the app is dark-mode-first but tokens should never be undefined.

### Army List Loading vs Not-Found (FIX-10)
- **D-11:** ArmyListDetailPage: when `!list`, check `isLoading` from the hook. If `isLoading` is true, show the existing skeleton. If `isLoading` is false and `list` is null, show a "List not found" message with a "Back to Army Lists" button. No infinite skeleton for deleted lists.

### Custom Scrollbar (FIX-11)
- **D-12:** CSS-only approach in globals.css. Add `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, and `::-webkit-scrollbar-thumb` rules scoped under `.dark`. Use zinc-700 thumb on zinc-800/900 track, 6px width, rounded-full. Include `scrollbar-width: thin` and `scrollbar-color` for Firefox. Apply to all scrollable areas globally — no per-component changes needed.

### Claude's Discretion
- Exact wording of error messages and toast text — keep consistent with existing patterns
- Whether to extract a shared ErrorState component or inline the pattern — prefer inline for this phase (only 1-2 uses), extract if 3+ uses emerge
- Exact oklch values for light-mode token fallbacks — reasonable defaults that maintain readability

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI Patterns
- `src/components/common/PageHeader.tsx` — Canonical page header pattern (text-3xl, border-b, subtitle prop)
- `src/styles/globals.css` — Theme tokens, dark mode definitions, scrollbar target

### Painting Mode
- `src/app/painting-mode/page.tsx` — Entry point, Escape handler, error screen (FIX-02)
- `src/features/painting-mode/StepFocalView.tsx` — Completion screen (FIX-01), step display

### Army Lists
- `src/features/army-lists/ArmyListDetailPage.tsx` — Notes save toast (FIX-03), loading state (FIX-10)
- `src/features/army-lists/EnhancementPickerSheet.tsx` — Enhancement assign/remove (FIX-08)
- `src/features/army-lists/LeaderAttachmentSheet.tsx` — Leader attach/detach (FIX-08)

### Recipes
- `src/features/recipes/RecipesPage.tsx` — Error state needed (FIX-04)

### Goals
- Goal delete dialog component — Duplicate toast audit (FIX-07)

### Rules
- `src/hooks/useRulesFavorites.ts` — Optimistic rollback error toast (FIX-09)

### Settings & Data Health
- Settings page component — PageHeader replacement (FIX-05)
- Data Health page component — PageHeader replacement (FIX-05)

### Requirements
- `.planning/REQUIREMENTS.md` §v0.5.2 — FIX-01 through FIX-11 requirement definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PageHeader` component: already has title (text-3xl), subtitle, actions props — drop-in for FIX-05
- `toast.success()` / `toast.error()` from sonner: consistent pattern across all features
- `handleExit` in painting-mode/page.tsx: already navigates away, just needs UI surface
- `GoalDeleteDialog` already uses "Deleting..." pending text pattern — reference for FIX-01 delete dialogs in Phase 128

### Established Patterns
- Toast messages: short imperative past tense ("Notes saved.", "Recipe deleted.", "Failed to X. Please try again.")
- Error states: centered flex column with icon + heading + description (seen in empty states)
- Optimistic updates: onMutate sets data, onError rolls back + should toast
- Delete dialogs: AlertDialog with destructive variant Button, disabled during isPending

### Integration Points
- StepFocalView receives `onExit` callback from page.tsx — thread it for the exit button
- ArmyListDetailPage uses `useArmyList(id)` — check if hook exposes `isLoading` separately from data
- RecipesPage uses `useRecipes()` — check if hook exposes `isError` and `refetch`
- globals.css `:root` block is the single source of truth for CSS custom properties

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All fixes are well-defined by the requirements and existing codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 126-Critical Fixes & Dead Ends*
*Context gathered: 2026-06-11*
