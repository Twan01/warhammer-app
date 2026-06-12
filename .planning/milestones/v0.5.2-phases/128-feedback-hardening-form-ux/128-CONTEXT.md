# Phase 128: Feedback Hardening & Form UX - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Add missing action confirmations, loading states, auto-save indicators, and error recovery paths so every significant user action produces appropriate feedback. 10 requirements: FBK-01 through FBK-10. No new features — feedback hardening only.

</domain>

<decisions>
## Implementation Decisions

### Delete Dialog Pending Text (FBK-01)
- **D-01:** All 4 delete dialogs (Faction, BattleLog, Recipe, Paint) replace static "Delete" button text with `{isPending ? "Deleting..." : "Delete"}` — matching the existing GoalDeleteDialog pattern. The button is already `disabled={mutation.isPending}`.

### GameDay Error State (FBK-02)
- **D-02:** GameDayPage gets a centered error block (AlertCircle icon, heading, description, "Try again" button calling refetch) when query isError is true. Matches the RecipesPage error pattern added in Phase 126 (FIX-04).

### Spending Error Styling (FBK-03)
- **D-03:** SpendingPage error message class changes from `text-muted-foreground` to `text-destructive`. Single class swap.

### Sheet Form autoFocus (FBK-04)
- **D-04:** Add `autoFocus` attribute to the first text input in every Sheet form: FactionSheet, GoalSheet, PaintSheet, UnitSheet, BattleLogSheet, RecipeDetailSheet, and any others discovered. No custom focus management hook needed — native HTML autoFocus is sufficient since Sheets render their content on open.

### RuleNoteEditor Save Indicator (FBK-05)
- **D-05:** Add a subtle inline "Saved" text indicator near the editor (not a toast) that appears briefly after each successful auto-save debounce. Implementation: a small `text-xs text-muted-foreground` span that fades in on save success and fades out after ~2 seconds using a CSS transition or simple state toggle. Toast would be too noisy since auto-save fires on every edit after 500ms debounce.

### PlaybookTab Disabled Save Tooltip (FBK-06)
- **D-06:** Wrap the save button in a Tooltip component. Show context-aware messages: "No changes to save" when `!isDirty`, "Loading..." when `isLoading`. Only show tooltip when button is disabled.

### PlaybookTab Error Retry (FBK-07)
- **D-07:** Add a "Retry" Button to the existing error display in PlaybookTab that calls the datasheet query's `refetch()`. Place it inline within the existing `border-destructive/50` error container.

### JournalTab Session Toast (FBK-08)
- **D-08:** Add `toast.success("Session logged.")` after the successful `mutateAsync` call in JournalTab session creation. Matches existing toast patterns (short imperative past tense).

### Snapshot Delete Toast (FBK-09)
- **D-09:** Change snapshot delete from neutral `toast()` to `toast.success("Snapshot deleted.")` in SnapshotHistorySheet. Keep the existing undo action if present.

### staleTime/gcTime Alignment (FBK-10)
- **D-10:** Every hook that currently sets `staleTime: Infinity` also gets `gcTime: Infinity`. This prevents the React Query garbage collector from evicting data that was intentionally marked as never-stale. Mechanical find-and-add across all affected hooks (~10+ files).

### Claude's Discretion
- Exact autoFocus target element in each Sheet (always first text input, but specific field name varies)
- Whether RuleNoteEditor "Saved" indicator uses CSS transition or setTimeout for fade — pick whichever is simpler
- Grouping of changes into plans — recommend grouping by complexity (quick fixes in one plan, more involved changes in another)
- Whether any additional Sheet forms beyond the obvious 6 need autoFocus

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Reference Patterns
- `src/features/goals/GoalDeleteDialog.tsx` — Reference for "Deleting..." pending text pattern (FBK-01 template)
- `src/features/recipes/RecipesPage.tsx` — Reference for centered error state with retry (FBK-02 template, added in Phase 126)

### Delete Dialogs (FBK-01)
- `src/features/factions/FactionDeleteDialog.tsx` — Faction delete, needs pending text
- `src/features/battle-log/BattleLogDeleteDialog.tsx` — Battle Log delete, needs pending text
- `src/features/recipes/RecipeDeleteDialog.tsx` — Recipe delete, needs pending text
- `src/features/paints/PaintDeleteDialog.tsx` — Paint delete, needs pending text

### Error States (FBK-02, FBK-03, FBK-07)
- `src/features/game-day/GameDayPage.tsx` — Main GameDay component, needs isError handler
- `src/features/spending/SpendingPage.tsx` — Error message at ~line 58, needs text-destructive
- `src/features/units/PlaybookTab.tsx` — Error state at ~line 220, needs Retry button; save button at ~line 244, needs Tooltip

### Sheet Forms (FBK-04)
- `src/features/factions/FactionSheet.tsx` — Needs autoFocus on name input
- `src/features/goals/GoalSheet.tsx` — Needs autoFocus on name input
- `src/features/paints/PaintSheet.tsx` — Needs autoFocus on brand/name input
- `src/features/units/UnitSheet.tsx` — Needs autoFocus on name input
- `src/features/battle-log/BattleLogSheet.tsx` — Needs autoFocus on first input
- `src/features/recipes/RecipeDetailSheet.tsx` — Needs autoFocus on name input

### Auto-save & Feedback (FBK-05, FBK-08, FBK-09)
- `src/features/rules-hub/RuleNoteEditor.tsx` — Auto-save with 500ms debounce, needs "Saved" indicator
- `src/features/units/JournalTab.tsx` — Session create at ~line 72, needs success toast
- `src/features/army-lists/SnapshotHistorySheet.tsx` — Snapshot delete at ~line 182, needs toast.success

### React Query Hooks (FBK-10)
- All hooks with `staleTime: Infinity` — add `gcTime: Infinity` (grep for `staleTime: Infinity` in `src/hooks/`)

### Requirements
- `.planning/REQUIREMENTS.md` §v0.5.2 — FBK-01 through FBK-10 requirement definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GoalDeleteDialog` "Deleting..." pattern: `{isPending ? "Deleting..." : "Delete"}` — copy verbatim to 4 other dialogs
- `RecipesPage` centered error pattern: AlertCircle + heading + description + refetch button — template for FBK-02
- `toast.success()` / `toast.error()` from sonner: consistent across all features
- `Tooltip` component from shadcn/ui: already used elsewhere, drop-in for FBK-06
- Native HTML `autoFocus` attribute: works in Sheet content since it renders fresh on open

### Established Patterns
- Toast messages: short imperative past tense ("Session logged.", "Snapshot deleted.")
- Delete dialogs: AlertDialog with destructive Button, disabled during isPending
- Error states: centered flex column with icon + heading + description + optional CTA
- Auto-save: debounced with useEffect cleanup (RuleNoteEditor pattern)
- React Query: staleTime/gcTime set in useQuery options object

### Integration Points
- Delete dialogs all follow the same AlertDialog structure — change is button text only
- GameDayPage needs its query hook to expose isError and refetch
- PlaybookTab save button needs wrapping in Tooltip — check if button is already inside any wrapper
- Sheet forms use react-hook-form — autoFocus goes on the rendered input element, not the RHF Controller
- staleTime: Infinity hooks are spread across `src/hooks/` — mechanical grep-and-add

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond what's defined in REQUIREMENTS.md. All 10 changes are well-scoped feedback improvements with clear before/after states and established reference patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 128-Feedback Hardening & Form UX*
*Context gathered: 2026-06-11*
