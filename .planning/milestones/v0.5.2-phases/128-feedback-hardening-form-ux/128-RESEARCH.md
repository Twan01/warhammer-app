# Phase 128: Feedback Hardening & Form UX — Research

**Researched:** 2026-06-11
**Domain:** React UI feedback patterns — pending states, error states, toast messaging, form UX, React Query cache configuration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (FBK-01):** All 4 delete dialogs (Faction, BattleLog, Recipe, Paint) replace static "Delete" button text with `{isPending ? "Deleting..." : "Delete"}`. Pattern copied verbatim from GoalDeleteDialog.
- **D-02 (FBK-02):** GameDayPage gets a centered error block (AlertCircle icon, heading, description, "Try again" button calling refetch) when query isError is true. Matches RecipesPage error pattern.
- **D-03 (FBK-03):** SpendingPage error message class changes from `text-muted-foreground` to `text-destructive`. Single class swap.
- **D-04 (FBK-04):** Add `autoFocus` attribute to the first text input in every Sheet form: FactionSheet, GoalSheet, PaintSheet, UnitSheet (via UnitFormRequired), BattleLogSheet, RecipeFormSheet.
- **D-05 (FBK-05):** Inline "Saved" text indicator near the RuleNoteEditor textarea. `text-xs text-muted-foreground` span that fades in after successful auto-save and out after ~2 seconds. No toast.
- **D-06 (FBK-06):** Wrap PlaybookTab save button in Tooltip. Context-aware messages: "No changes to save" when `!isDirty`, "Loading..." when `isLoading`. Only show tooltip when button is disabled.
- **D-07 (FBK-07):** Add a "Retry" Button to the existing PlaybookTab `border-destructive/50` error container that calls the datasheet query's `refetch()`.
- **D-08 (FBK-08):** Add `toast.success("Session logged.")` after the successful `mutateAsync` call in JournalTab session creation.
- **D-09 (FBK-09):** Change snapshot delete from neutral `toast()` to `toast.success("Snapshot deleted.")` in SnapshotHistorySheet. Keep the existing undo action if present.
- **D-10 (FBK-10):** Every hook that currently sets `staleTime: Infinity` also gets `gcTime: Infinity`.

### Claude's Discretion

- Exact autoFocus target element in each Sheet (always first text input, but specific field name varies).
- Whether RuleNoteEditor "Saved" indicator uses CSS transition or setTimeout for fade.
- Grouping of changes into plans — recommend grouping by complexity.
- Whether any additional Sheet forms beyond the obvious 6 need autoFocus.

### Deferred Ideas (OUT OF SCOPE)

None.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FBK-01 | 4 delete dialogs show "Deleting..." pending text | Confirmed: all 4 dialogs have `deleteMutation.isPending` and button already `disabled={mutation.isPending}`. Text change only. |
| FBK-02 | GameDayPage has isError handler with user-friendly message | Confirmed: `useArmyList` returns `isError` and `refetch`. Only `listLoading` guard exists — no error branch. Pattern from RecipesPage verified. |
| FBK-03 | Spending error message uses text-destructive | Confirmed: line 58 in SpendingPage has `text-muted-foreground`. Single class swap. |
| FBK-04 | All Sheet forms autoFocus on first input field | Confirmed: none of the 6 Sheets have autoFocus today. First inputs identified per sheet. |
| FBK-05 | RuleNoteEditor auto-save shows subtle "Saved" indicator | Confirmed: `useUpsertRulesNote` mutation has `onSuccess` callback. Component has no current save feedback. |
| FBK-06 | PlaybookTab disabled save button has tooltip | Confirmed: save button at line 244 has no Tooltip. `isDirty` and `isLoading` already available as variables. |
| FBK-07 | PlaybookTab error state includes Retry button | Confirmed: error block at lines 220-223 is a static div. `useDatasheet` returns `error` but not `refetch` — need to destructure it. |
| FBK-08 | JournalTab session create shows success toast | Confirmed: `handleLogSession` at line 68 resets form after success but emits no toast. |
| FBK-09 | Snapshot delete uses toast.success | Confirmed: `handleDelete` at line 182 uses `toast("Snapshot deleted.", {...})` — neutral tone. `toast.success()` + undo action preserved. |
| FBK-10 | staleTime: Infinity hooks also set gcTime: Infinity | Confirmed: grep found 0 existing `gcTime` entries in hooks. 20+ `staleTime: Infinity` occurrences across 8 files need mechanical update. |
</phase_requirements>

---

## Summary

Phase 128 is a pure feedback-hardening pass — no new features, no schema changes, no new components. All 10 requirements are surgical edits to existing files, using established patterns already present in the codebase. The research task is primarily a code audit: confirm the current state of each target file, identify the exact lines to change, and flag any surprises.

The changes cluster into five categories: (1) pending text on delete dialogs — 4 files, 1-line change each; (2) error state additions — 3 files (GameDayPage, SpendingPage, PlaybookTab); (3) Sheet form autoFocus — 6 files, 1-attribute addition each; (4) feedback indicators — 3 files (RuleNoteEditor, JournalTab, SnapshotHistorySheet); and (5) React Query cache alignment — 8 hook files, mechanical `gcTime: Infinity` additions.

**Primary recommendation:** Group changes into two plans — Plan A for the mechanical/trivial changes (FBK-01, FBK-03, FBK-08, FBK-09, FBK-10), Plan B for the changes requiring new JSX structure (FBK-02, FBK-04, FBK-05, FBK-06, FBK-07).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Delete pending text | UI component | — | Button state is local component concern driven by mutation.isPending |
| Error state (GameDayPage) | UI component | React Query hook | isError/refetch exposed from useArmyList; component renders the UI |
| Error state (SpendingPage) | UI component | — | Class swap only, existing error branch already present |
| Error state (PlaybookTab) | UI component | React Query hook | Need to destructure refetch from useDatasheet |
| Sheet autoFocus | UI component | — | Native HTML attribute on input element |
| RuleNoteEditor "Saved" indicator | UI component | — | Keyed off mutation onSuccess; state/timer local to component |
| JournalTab toast | UI component | — | toast.success() call after successful mutateAsync |
| Snapshot delete toast.success | UI component | — | Change neutral toast() to toast.success() |
| staleTime/gcTime alignment | React Query hook | — | useQuery options object in each hook file |

---

## Standard Stack

No new packages are introduced in this phase. All patterns use existing dependencies.

### Core (already installed)
| Library | Purpose | Usage in This Phase |
|---------|---------|---------------------|
| sonner | Toast notifications | `toast.success()` for FBK-08, FBK-09 |
| @tanstack/react-query | Data fetching / caching | `gcTime: Infinity` additions for FBK-10 |
| shadcn/ui `Tooltip` / `TooltipContent` / `TooltipTrigger` / `TooltipProvider` | Tooltip component | FBK-06 PlaybookTab save button |
| lucide-react `AlertCircle` | Icon | FBK-02 GameDayPage error state (already imported in RecipesPage template) |

---

## Package Legitimacy Audit

No new packages to install in this phase. Section not applicable.

---

## Architecture Patterns

### Pattern 1: Delete Dialog Pending Text (FBK-01 template)

The GoalDeleteDialog is the canonical reference. It receives `isPending` as a prop from the parent and renders the button text conditionally. The 4 target dialogs own their own mutation (`useDeleteFaction`, `useDeleteBattleLog`, etc.) internally — `isPending` is available directly from the mutation object, not passed as a prop.

```tsx
// GoalDeleteDialog pattern (src/features/goals/GoalDeleteDialog.tsx)
<Button variant="destructive" onClick={onConfirm} disabled={isPending}>
  {isPending ? "Deleting..." : "Delete"}
</Button>

// Target dialog pattern (owns mutation internally)
<Button variant="destructive" onClick={handleConfirm} disabled={deleteFaction.isPending}>
  {deleteFaction.isPending ? "Deleting..." : "Delete"}
</Button>
```

**Key finding:** FactionDeleteDialog and PaintDeleteDialog use "Delete" as the button text. BattleLogDeleteDialog also uses "Delete". RecipeDeleteDialog uses "Delete recipe" — pending text should be "Deleting..." for all of them for consistency with the GoalDeleteDialog reference.

### Pattern 2: Centered Error State with Retry (FBK-02 template)

RecipesPage provides the reference pattern (added Phase 126, FIX-04):

```tsx
// Source: src/features/recipes/RecipesPage.tsx lines 149-158
if (isError) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="text-center">
        <h2 className="text-lg font-semibold">Failed to load recipes</h2>
        <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
      </div>
      <Button variant="outline" onClick={() => refetch()}>Reload Recipes</Button>
    </div>
  );
}
```

GameDayPage currently destructures `{ data: list, isLoading: listLoading }` from `useArmyList(listId)`. It must also destructure `isError` and `refetch`. The error branch must go between the loading guard and the `!list` (not found) guard.

### Pattern 3: Sheet Form autoFocus (FBK-04)

`autoFocus` is a native HTML attribute that works directly on `<Input>` (shadcn/ui wraps a `<input>` element). For RHF `FormField` using the `render` prop, `autoFocus` goes on the `<Input>` element inside `<FormControl>`, not on the `Controller` itself.

```tsx
// Pattern — add autoFocus to the rendered Input
render={({ field }) => (
  <FormItem>
    <FormLabel>Name</FormLabel>
    <FormControl>
      <Input placeholder="e.g. Tau Empire" autoFocus {...field} />
    </FormControl>
  </FormItem>
)}
```

**First input per Sheet:**
| Sheet | First text input | Field name |
|-------|-----------------|------------|
| FactionSheet | Name | `name` |
| GoalSheet | Name | `name` |
| PaintSheet | Brand | `brand` |
| UnitSheet (via UnitFormRequired) | Name | `name` (in UnitFormRequired.tsx, not UnitSheet.tsx) |
| BattleLogSheet | Opponent Faction | `opponent_faction` (date input is first but type="date") |
| RecipeFormSheet | Name | `name` |

**BattleLogSheet note:** The first rendered field is `battle_date` (type="date"). The first *text* input is `opponent_faction`. Per D-04 wording "first text input" — use `opponent_faction`. However, the date field has a prefilled value (today's date), so focusing the opponent field is more useful UX.

**UnitSheet note:** The name input is rendered inside `UnitFormRequired.tsx`, not `UnitSheet.tsx` itself. The `autoFocus` attribute must go on the Input in `UnitFormRequired.tsx`.

### Pattern 4: RuleNoteEditor "Saved" Indicator (FBK-05)

The existing `upsertNote` mutation object exposes `isSuccess`. The cleanest implementation uses a `useState` boolean toggled via `useEffect` watching `upsertNote.isSuccess`, then reset with `setTimeout`. Alternatively, use mutation `onSuccess` callback in the `mutate()` call.

```tsx
// Recommended: setTimeout approach (simpler, avoids useEffect dependency array)
const [saved, setSaved] = useState(false);

function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
  // ...existing debounce logic...
  timerRef.current = setTimeout(() => {
    upsertNote.mutate({ ... }, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }, 500);
}

// JSX — place after the textarea
{saved && (
  <span className="text-xs text-muted-foreground transition-opacity">
    Saved
  </span>
)}
```

**Note:** `upsertNote.mutate()` is currently called without a callbacks options object. Adding `{ onSuccess: ... }` is the minimal change. The cleanup `useEffect` also calls `upsertNote.mutate()` directly on unmount — that path will not show the indicator, which is acceptable (unmount means the panel is closing).

### Pattern 5: PlaybookTab Tooltip on Save Button (FBK-06)

The Tooltip component from shadcn/ui is already used in `JournalTab.tsx` (already imported via `TooltipProvider`, `Tooltip`, `TooltipContent`, `TooltipTrigger`). PlaybookTab does not currently import Tooltip.

```tsx
// Import additions needed in PlaybookTab.tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Wrap the existing save button
const saveDisabled = !isDirty || isLoading || upsert.isPending;
const tooltipMessage = isLoading ? "Loading..." : "No changes to save";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      {/* span wrapper required — disabled button doesn't fire mouse events */}
      <span className={saveDisabled ? "w-full" : undefined}>
        <Button
          type="button"
          variant="default"
          className="w-full mt-4"
          disabled={saveDisabled}
          onClick={handleSave}
        >
          Save Playbook
        </Button>
      </span>
    </TooltipTrigger>
    {saveDisabled && (
      <TooltipContent>{tooltipMessage}</TooltipContent>
    )}
  </Tooltip>
</TooltipProvider>
```

**Critical pitfall:** A disabled `<button>` does not fire pointer events, so tooltip hover will not trigger. The standard solution is wrapping the button in a `<span>` when disabled. This is the pattern used throughout shadcn/ui documentation.

### Pattern 6: PlaybookTab Retry Button (FBK-07)

The existing error block at lines 220-223 is:
```tsx
{datasheetError && (
  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
    Failed to load datasheet: {errorMessage(datasheetError)}.
  </div>
)}
```

`useDatasheet(unitId)` currently destructures `{ data: datasheet, error: datasheetError }`. Adding `refetch` requires destructuring it too: `{ data: datasheet, error: datasheetError, refetch: refetchDatasheet }`.

```tsx
// Updated error block
{datasheetError && (
  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center justify-between gap-2">
    <span>Failed to load datasheet: {errorMessage(datasheetError)}.</span>
    <Button variant="outline" size="sm" onClick={() => refetchDatasheet()}>
      Retry
    </Button>
  </div>
)}
```

### Pattern 7: staleTime/gcTime Alignment (FBK-10)

React Query default `gcTime` is 5 minutes (300,000 ms). When `staleTime: Infinity` is set without a corresponding `gcTime: Infinity`, the query is marked never-stale but the cache entry is still eligible for garbage collection after 5 minutes of inactivity. This means navigating away and returning after 5 minutes triggers a fresh fetch despite `staleTime: Infinity`.

```tsx
// Before
useQuery({
  queryKey: [...],
  queryFn: ...,
  staleTime: Infinity,
});

// After
useQuery({
  queryKey: [...],
  queryFn: ...,
  staleTime: Infinity,
  gcTime: Infinity,
});
```

**Files to update (all confirmed by grep):**
| File | Count of staleTime: Infinity |
|------|------------------------------|
| `src/hooks/useGameData.ts` | 5 |
| `src/hooks/useDatasheet.ts` | 5 |
| `src/hooks/useJournalSessions.ts` | 2 |
| `src/hooks/useStrategyNote.ts` | 1 |
| `src/hooks/useUnitKeywords.ts` | 1 |
| `src/hooks/useUnitPhotos.ts` | 2 |
| `src/hooks/useUnitOverride.ts` | 1 |
| `src/hooks/useUnitDatabase.ts` | 8 |
| `src/hooks/useUdbMeta.ts` | 1 |
| `src/features/units/UnitFormRequired.tsx` | 1 (inline useQuery) |

**Total: ~27 occurrences across 10 files.** The change is purely additive — add one line below each `staleTime: Infinity`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Tooltip on disabled button | Custom hover state with CSS | shadcn/ui `Tooltip` + `<span>` wrapper |
| "Saved" fade animation | CSS keyframes | Simple `useState` boolean + 2s `setTimeout` |
| Pending button text | Separate loading state variable | `mutation.isPending` from TanStack Query |
| Error state with retry | Custom error boundary | Inline `isError` branch with `refetch()` |

---

## Common Pitfalls

### Pitfall 1: Disabled Button Tooltip Not Triggering
**What goes wrong:** `<Button disabled>` does not fire pointer events, so the Tooltip hover never activates.
**Why it happens:** HTML spec — disabled form elements do not participate in pointer event dispatching.
**How to avoid:** Wrap the disabled button in a `<span>` element. The span receives the pointer events and passes them to the Tooltip trigger.
**Warning signs:** Tooltip renders in DOM but never appears on hover.

### Pitfall 2: autoFocus on Wrong Element
**What goes wrong:** Adding `autoFocus` to the `<FormField>` or `<FormItem>` wrapper instead of the inner `<Input>`.
**Why it happens:** RHF's render-prop pattern has multiple levels of nesting.
**How to avoid:** `autoFocus` goes on `<Input>` (the native input element), not on any RHF wrapper.
**Warning signs:** TypeScript will not catch this — the attribute is spread to the DOM element. Test by opening the Sheet and confirming cursor is in the field.

### Pitfall 3: UnitSheet autoFocus in Wrong File
**What goes wrong:** Adding `autoFocus` to a field in `UnitSheet.tsx` when the name input is rendered in `UnitFormRequired.tsx`.
**Why it happens:** UnitSheet delegates required fields to a child component.
**How to avoid:** The `autoFocus` attribute belongs on the `name` Input in `UnitFormRequired.tsx`, not in `UnitSheet.tsx`.

### Pitfall 4: BattleLogSheet First "Text" Input Is Actually a Date Input
**What goes wrong:** Adding `autoFocus` to `battle_date` (type="date") which is pre-filled, causing the browser to open the date picker on every sheet open.
**Why it happens:** `battle_date` is the first Input element rendered, but it is type="date" with a default value.
**How to avoid:** Apply `autoFocus` to `opponent_faction` (the first actual text input where the user needs to type something new).

### Pitfall 5: RuleNoteEditor Saved Indicator on Cleanup Path
**What goes wrong:** The cleanup `useEffect` fires `upsertNote.mutate()` on unmount but the component is already unmounting — calling `setSaved(true)` from its `onSuccess` callback will update state on an unmounted component.
**Why it happens:** Async callbacks can fire after unmount.
**How to avoid:** Only add the `onSuccess` callback to the debounced `mutate()` call inside `handleChange`, not to the cleanup path. The cleanup path is intentionally "fire and forget."

### Pitfall 6: GameDayPage isError Branch Placement
**What goes wrong:** Placing the error branch after the `!list` (not-found) branch means a query error shows the "Army list not found" message instead of the error state.
**Why it happens:** `isError` and `!list` are both truthy when a query fails (data is undefined).
**How to avoid:** Place `isError` branch immediately after `isLoading` guard, before the `!list` guard.

### Pitfall 7: useDatasheet refetch Scope in PlaybookTab
**What goes wrong:** `useDatasheet` is called as `const { data: datasheet, error: datasheetError } = useDatasheet(unitId)`. Adding `refetch` requires destructuring it from the same hook call — do not add a second `useDatasheet` call.
**How to avoid:** Update the existing destructure to `const { data: datasheet, error: datasheetError, refetch: refetchDatasheet } = useDatasheet(unitId)`.

---

## Code Examples

### Delete Dialog Pending Text (verbatim from GoalDeleteDialog)
```tsx
// Source: src/features/goals/GoalDeleteDialog.tsx lines 42-44
<Button variant="destructive" onClick={onConfirm} disabled={isPending}>
  {isPending ? "Deleting..." : "Delete"}
</Button>

// Applied to FactionDeleteDialog (uses internal mutation):
<Button
  variant="destructive"
  onClick={handleConfirm}
  disabled={deleteFaction.isPending}
>
  {deleteFaction.isPending ? "Deleting..." : "Delete"}
</Button>
```

### GameDayPage Error Branch (adapted from RecipesPage)
```tsx
// Add after listLoading guard, before !list guard
const { data: list, isLoading: listLoading, isError: listError, refetch: refetchList } = useArmyList(listId);

// ...

if (listError) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="text-center">
        <h2 className="text-lg font-semibold">Failed to load army list</h2>
        <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
      </div>
      <Button variant="outline" onClick={() => refetchList()}>Try again</Button>
    </div>
  );
}
```

### gcTime Addition Pattern
```tsx
// Before
staleTime: Infinity,

// After
staleTime: Infinity,
gcTime: Infinity,
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `staleTime: Infinity` only | `staleTime: Infinity` + `gcTime: Infinity` | Prevents silent cache eviction after 5min inactivity |
| Static "Delete" button text | `{isPending ? "Deleting..." : "Delete"}` | User knows delete is in progress |
| Neutral `toast()` | `toast.success()` | Consistent visual hierarchy (green success vs neutral gray) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | BattleLogSheet autoFocus should go on `opponent_faction` not `battle_date` | Architecture Patterns §Sheet autoFocus | Low — date input auto-focus would open date picker unexpectedly |
| A2 | RecipeDetailSheet referenced in CONTEXT.md is actually RecipeFormSheet | Phase Requirements FBK-04 | Low — RecipeDetailSheet is a read-only view with no form inputs |

---

## Open Questions

1. **RecipeDetailSheet vs RecipeFormSheet for FBK-04**
   - What we know: CONTEXT.md lists `RecipeDetailSheet` but that file has no form inputs — it is a read-only detail view.
   - What's unclear: Whether the intent was `RecipeDetailSheet.tsx` (which has no inputs) or `RecipeFormSheet.tsx` (which has a `name` field as its first text input).
   - Recommendation: Apply `autoFocus` to `RecipeFormSheet.tsx` — this is the form users interact with when creating/editing a recipe.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config changes only. No external tools, CLIs, databases, or services beyond the project's existing stack.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest block) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FBK-01 | Delete button shows "Deleting..." during isPending | unit | `pnpm test -- tests/` | ❌ Wave 0 — no existing delete dialog tests |
| FBK-02 | GameDayPage shows error state when query fails | unit | `pnpm test -- tests/game-day/` | ❌ Wave 0 |
| FBK-03 | SpendingPage error uses text-destructive | unit | `pnpm test -- tests/spending/` | ❌ Wave 0 |
| FBK-04 | Sheet forms autoFocus first input | unit | manual-only | Manual — jsdom autoFocus behavior unreliable |
| FBK-05 | RuleNoteEditor shows "Saved" after auto-save | unit | `pnpm test -- tests/rules-hub/` | ❌ Wave 0 |
| FBK-06 | PlaybookTab save tooltip shows message | unit | `pnpm test -- tests/units/` | ❌ Wave 0 |
| FBK-07 | PlaybookTab error has Retry button | unit | `pnpm test -- tests/units/` | ❌ Wave 0 |
| FBK-08 | JournalTab session create shows toast | unit | `pnpm test -- tests/units/` | ❌ Wave 0 |
| FBK-09 | Snapshot delete uses toast.success | unit | `pnpm test -- tests/army-lists/` | ❌ Wave 0 |
| FBK-10 | All staleTime:Infinity hooks have gcTime:Infinity | static/grep | grep-based | ✅ Verifiable by grep |

**Note on autoFocus testing (FBK-04):** jsdom does not reliably implement HTML `autoFocus` behavior. The `document.activeElement` check after rendering does not consistently reflect autoFocus in vitest/jsdom. This is best verified manually by opening each Sheet in the running app. Do not write a test that will produce false negatives in CI.

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/settings/DataManagementTab.test.tsx` — already modified (visible in git status), verify passing before starting
- No new test infrastructure required — existing vitest + RTL setup covers all new test targets

---

## Security Domain

This phase contains no authentication, session management, access control, input validation, cryptography, or user-provided data processing. All changes are UI-layer cosmetic and configuration updates.

ASVS: Not applicable for this phase.

---

## Sources

### Primary (HIGH confidence — verified by direct code inspection)
- `src/features/goals/GoalDeleteDialog.tsx` — FBK-01 reference pattern, lines 42-44
- `src/features/recipes/RecipesPage.tsx` — FBK-02 reference pattern, lines 149-158
- `src/features/factions/FactionDeleteDialog.tsx` — FBK-01 target, confirmed `deleteFaction.isPending` usage
- `src/features/battle-log/BattleLogDeleteDialog.tsx` — FBK-01 target
- `src/features/recipes/RecipeDeleteDialog.tsx` — FBK-01 target
- `src/features/paints/PaintDeleteDialog.tsx` — FBK-01 target
- `src/features/game-day/GameDayPage.tsx` — FBK-02 target, confirmed no isError branch
- `src/features/spending/SpendingPage.tsx` — FBK-03 target, line 58 confirmed
- `src/features/units/PlaybookTab.tsx` — FBK-06, FBK-07 target, lines 220-244 inspected
- `src/features/rules-hub/RuleNoteEditor.tsx` — FBK-05 target, mutation usage confirmed
- `src/features/units/JournalTab.tsx` — FBK-08 target, `handleLogSession` inspected
- `src/features/army-lists/SnapshotHistorySheet.tsx` — FBK-09 target, line 182 confirmed
- Grep over `src/hooks/` — FBK-10, confirmed 0 existing `gcTime` entries, ~27 `staleTime: Infinity` occurrences across 10 files
- `src/features/factions/FactionSheet.tsx`, `src/features/goals/GoalSheet.tsx`, `src/features/paints/PaintSheet.tsx`, `src/features/units/UnitFormRequired.tsx`, `src/features/battle-log/BattleLogSheet.tsx`, `src/features/recipes/RecipeFormSheet.tsx` — FBK-04 targets, first inputs confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all patterns already exist in codebase
- Architecture: HIGH — direct code inspection of every target file
- Pitfalls: HIGH — derived from actual code structure (disabled button tooltip, autoFocus placement in RHF render prop)
- FBK-10 scope: HIGH — grep confirms exact file set and occurrence count

**Research date:** 2026-06-11
**Valid until:** This research does not decay — all findings are based on stable codebase snapshots.
