# Phase 128: Feedback Hardening & Form UX - Pattern Map

**Mapped:** 2026-06-11
**Files analyzed:** 21 (modified only — no new files in this phase)
**Analogs found:** 21 / 21 (all targets have direct codebase analogs)

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `src/features/factions/FactionDeleteDialog.tsx` | component | request-response | `src/features/goals/GoalDeleteDialog.tsx` | exact |
| `src/features/battle-log/BattleLogDeleteDialog.tsx` | component | request-response | `src/features/goals/GoalDeleteDialog.tsx` | exact |
| `src/features/recipes/RecipeDeleteDialog.tsx` | component | request-response | `src/features/goals/GoalDeleteDialog.tsx` | exact |
| `src/features/paints/PaintDeleteDialog.tsx` | component | request-response | `src/features/goals/GoalDeleteDialog.tsx` | exact |
| `src/features/game-day/GameDayPage.tsx` | component | request-response | `src/features/recipes/RecipesPage.tsx` | exact |
| `src/features/spending/SpendingPage.tsx` | component | request-response | `src/features/spending/SpendingPage.tsx` (self) | self |
| `src/features/factions/FactionSheet.tsx` | component | request-response | `src/features/factions/FactionSheet.tsx` (self) | self |
| `src/features/goals/GoalSheet.tsx` | component | request-response | `src/features/factions/FactionSheet.tsx` | exact |
| `src/features/paints/PaintSheet.tsx` | component | request-response | `src/features/factions/FactionSheet.tsx` | exact |
| `src/features/units/UnitFormRequired.tsx` | component | request-response | `src/features/factions/FactionSheet.tsx` | exact |
| `src/features/battle-log/BattleLogSheet.tsx` | component | request-response | `src/features/factions/FactionSheet.tsx` | exact |
| `src/features/recipes/RecipeFormSheet.tsx` | component | request-response | `src/features/factions/FactionSheet.tsx` | exact |
| `src/features/rules-hub/RuleNoteEditor.tsx` | component | event-driven | `src/features/rules-hub/RuleNoteEditor.tsx` (self) | self |
| `src/features/units/PlaybookTab.tsx` | component | request-response | `src/features/units/JournalTab.tsx` | role-match |
| `src/features/units/JournalTab.tsx` | component | request-response | `src/features/units/JournalTab.tsx` (self) | self |
| `src/features/army-lists/SnapshotHistorySheet.tsx` | component | request-response | `src/features/army-lists/SnapshotHistorySheet.tsx` (self) | self |
| `src/hooks/useGameData.ts` | hook | request-response | `src/hooks/useGameData.ts` (self) | self |
| `src/hooks/useDatasheet.ts` | hook | request-response | `src/hooks/useGameData.ts` | exact |
| `src/hooks/useJournalSessions.ts` | hook | request-response | `src/hooks/useGameData.ts` | exact |
| `src/hooks/useStrategyNote.ts` | hook | request-response | `src/hooks/useGameData.ts` | exact |
| `src/hooks/useUnitKeywords.ts` | hook | request-response | `src/hooks/useGameData.ts` | exact |
| `src/hooks/useUnitPhotos.ts` | hook | request-response | `src/hooks/useGameData.ts` | exact |
| `src/hooks/useUnitOverride.ts` | hook | request-response | `src/hooks/useGameData.ts` | exact |
| `src/hooks/useUnitDatabase.ts` | hook | request-response | `src/hooks/useGameData.ts` | exact |
| `src/hooks/useUdbMeta.ts` | hook | request-response | `src/hooks/useGameData.ts` | exact |
| `src/features/units/UnitFormRequired.tsx` | component | request-response | `src/hooks/useGameData.ts` | role-match (inline useQuery) |

---

## Pattern Assignments

### FBK-01: Delete Dialog Pending Text
**Target files:** `FactionDeleteDialog.tsx`, `BattleLogDeleteDialog.tsx`, `RecipeDeleteDialog.tsx`, `PaintDeleteDialog.tsx`
**Analog:** `src/features/goals/GoalDeleteDialog.tsx`

**Reference: the complete GoalDeleteDialog pattern** (lines 1-49):
```tsx
// GoalDeleteDialog passes isPending as a prop — target dialogs own their mutation internally.
// For target dialogs, replace `isPending` prop reference with `deleteMutation.isPending`.

// Footer pattern (lines 38-45):
<DialogFooter className="gap-2 sm:gap-2">
  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
    Cancel
  </Button>
  <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
    {isPending ? "Deleting..." : "Delete"}
  </Button>
</DialogFooter>
```

**Current state of FactionDeleteDialog** (`src/features/factions/FactionDeleteDialog.tsx` lines 57-67):
```tsx
// Before — static button text, button already has disabled={deleteFaction.isPending}
<Button
  variant="destructive"
  onClick={handleConfirm}
  disabled={deleteFaction.isPending}
>
  Delete
</Button>

// After — add conditional text:
<Button
  variant="destructive"
  onClick={handleConfirm}
  disabled={deleteFaction.isPending}
>
  {deleteFaction.isPending ? "Deleting..." : "Delete"}
</Button>
```

**Current state of BattleLogDeleteDialog** (`src/features/battle-log/BattleLogDeleteDialog.tsx` lines 48-54):
```tsx
// Before — static "Delete", already has disabled={deleteBattleLog.isPending}
<Button
  variant="destructive"
  onClick={handleConfirm}
  disabled={deleteBattleLog.isPending}
>
  Delete
</Button>

// After — same conditional text substitution as above
```

**Note for RecipeDeleteDialog:** Button text is currently "Delete recipe" — change pending text to "Deleting..." (not "Deleting recipe...") to match GoalDeleteDialog reference.

---

### FBK-02: GameDayPage Error State
**Target file:** `src/features/game-day/GameDayPage.tsx`
**Analog:** `src/features/recipes/RecipesPage.tsx`

**Reference: RecipesPage error pattern** (`src/features/recipes/RecipesPage.tsx` lines 37, 149-160):
```tsx
// Hook destructure — already includes isError and refetch:
const { data: recipes = [], isLoading, isError, refetch } = useRecipes();

// Error branch (place after isLoading guard, before !data guard):
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

**Current GameDayPage hook destructure** (`src/features/game-day/GameDayPage.tsx` line 27):
```tsx
// Before — missing isError and refetch:
const { data: list, isLoading: listLoading } = useArmyList(listId);

// After — add isError and refetch:
const { data: list, isLoading: listLoading, isError: listError, refetch: refetchList } = useArmyList(listId);
```

**Import addition needed** — `AlertCircle` from lucide-react (currently not imported in GameDayPage; imports are `Swords, Users, ClipboardList`).

**Placement rule (from RESEARCH.md Pitfall 6):** Error branch must go AFTER the `listLoading` guard at line 60, BEFORE the `!list` (not found) guard. If placed after `!list`, a failed query shows "not found" instead of the error state.

---

### FBK-03: SpendingPage Error Styling
**Target file:** `src/features/spending/SpendingPage.tsx`

**Current state** (`src/features/spending/SpendingPage.tsx` lines 55-63):
```tsx
// Before — wrong class: text-muted-foreground
if (isError || !data) {
  return (
    <div className="p-6">
      <p className="text-sm text-muted-foreground">
        Could not load spending data. Restart the app or try again.
      </p>
    </div>
  );
}

// After — change one class:
<p className="text-sm text-destructive">
```

---

### FBK-04: Sheet Form autoFocus
**Target files:** `FactionSheet.tsx`, `GoalSheet.tsx`, `PaintSheet.tsx`, `UnitFormRequired.tsx`, `BattleLogSheet.tsx`, `RecipeFormSheet.tsx`
**Analog:** RHF render-prop pattern already in all sheet files

**Pattern** (from `src/features/factions/FactionSheet.tsx` lines 124-136):
```tsx
// autoFocus goes on the <Input> element inside FormControl, NOT on FormField or FormItem
<FormField
  name="name"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Name</FormLabel>
      <FormControl>
        <Input placeholder="e.g. Tau Empire" autoFocus {...field} />
        {/* ^^^ autoFocus added here — before or after {...field} spread, both work */}
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**First text input per target sheet:**
| File | Field name | Note |
|------|-----------|------|
| `FactionSheet.tsx` | `name` | First FormField in the form |
| `GoalSheet.tsx` | `name` | First FormField in the form |
| `PaintSheet.tsx` | `brand` | First text input (name comes second) |
| `UnitFormRequired.tsx` | `name` | autoFocus here, NOT in UnitSheet.tsx |
| `BattleLogSheet.tsx` | `opponent_faction` | battle_date is type="date" with prefilled value — skip it |
| `RecipeFormSheet.tsx` | `name` | First FormField in the form |

**Critical pitfall:** `UnitSheet.tsx` delegates required fields to `UnitFormRequired.tsx`. The `autoFocus` attribute belongs on the `name` Input in `UnitFormRequired.tsx`, not in `UnitSheet.tsx`.

**Critical pitfall:** `BattleLogSheet.tsx` first Input element is `battle_date` (type="date", pre-filled with today). Do NOT add autoFocus there — it opens the date picker on every sheet open. Apply autoFocus to `opponent_faction` instead.

---

### FBK-05: RuleNoteEditor "Saved" Indicator
**Target file:** `src/features/rules-hub/RuleNoteEditor.tsx`
**Analog:** Self — existing debounce mutation pattern in the same file

**Current state** (`src/features/rules-hub/RuleNoteEditor.tsx` lines 1-82):
```tsx
// Existing: useState, useEffect, useRef already imported (line 1)
// Existing: upsertNote.mutate() called in handleChange (lines 59-66) without callbacks object
// Existing: cleanup useEffect fires upsertNote.mutate() on unmount (lines 43-49) — fire-and-forget

// Pattern: add saved state (after upsertNote declaration, line 28)
const [saved, setSaved] = useState(false);

// Pattern: add onSuccess callback to the debounced mutate() call only (lines 59-66)
timerRef.current = setTimeout(() => {
  upsertNote.mutate({
    rule_id: ruleId,
    rule_type: ruleType,
    rule_name: ruleName,
    note_text: value,
  }, {
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });
}, 500);

// Pattern: add indicator JSX after </textarea> (line 79)
{saved && (
  <span className="text-xs text-muted-foreground transition-opacity">
    Saved
  </span>
)}
```

**Critical pitfall:** Do NOT add the onSuccess callback to the cleanup useEffect's `upsertNote.mutate()` call (lines 43-49). That path fires on unmount; calling `setSaved(true)` from its callback updates state on an unmounted component.

---

### FBK-06: PlaybookTab Save Button Tooltip
**Target file:** `src/features/units/PlaybookTab.tsx`
**Analog:** `src/features/units/JournalTab.tsx` — Tooltip already imported and used there

**JournalTab Tooltip imports** (`src/features/units/JournalTab.tsx` lines 18-23):
```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

**Current PlaybookTab save button** (`src/features/units/PlaybookTab.tsx` line 244):
```tsx
// Before — no Tooltip, no span wrapper:
<Button type="button" variant="default" className="w-full mt-4" disabled={!isDirty || isLoading || upsert.isPending} onClick={handleSave}>
  Save Playbook
</Button>

// After — same imports as JournalTab, wrap with TooltipProvider + span:
const saveDisabled = !isDirty || isLoading || upsert.isPending;
const tooltipMessage = isLoading ? "Loading..." : "No changes to save";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
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

**Critical pitfall:** A disabled `<button>` does not fire pointer events — tooltip hover never triggers. The `<span>` wrapper is mandatory when the button is disabled. This is the standard shadcn/ui pattern.

---

### FBK-07: PlaybookTab Error Retry Button
**Target file:** `src/features/units/PlaybookTab.tsx`
**Analog:** `src/features/recipes/RecipesPage.tsx` refetch pattern

**Current PlaybookTab hook destructure** (`src/features/units/PlaybookTab.tsx` line 57):
```tsx
// Before — missing refetch:
const { data: datasheet, error: datasheetError } = useDatasheet(unitId);

// After — add refetch:
const { data: datasheet, error: datasheetError, refetch: refetchDatasheet } = useDatasheet(unitId);
```

**Current error block** (`src/features/units/PlaybookTab.tsx` lines 220-223):
```tsx
// Before — static div, no retry:
{datasheetError && (
  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
    Failed to load datasheet: {errorMessage(datasheetError)}.
  </div>
)}

// After — flex layout with inline Retry button:
{datasheetError && (
  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center justify-between gap-2">
    <span>Failed to load datasheet: {errorMessage(datasheetError)}.</span>
    <Button variant="outline" size="sm" onClick={() => refetchDatasheet()}>
      Retry
    </Button>
  </div>
)}
```

**Note:** `Button` is already imported in PlaybookTab.tsx (line 3). No new imports needed for this change beyond the `refetch` destructure.

---

### FBK-08: JournalTab Session Toast
**Target file:** `src/features/units/JournalTab.tsx`
**Analog:** Self — `toast` already imported from sonner (line 3)

**Current handleLogSession** (`src/features/units/JournalTab.tsx` lines 68-85):
```tsx
// Before — form reset on success, no toast:
async function handleLogSession() {
  const minutes = Number(duration);
  if (!sessionDate || !Number.isFinite(minutes) || minutes <= 0) return;
  try {
    await createSession.mutateAsync({ ... });
    // Reset form to defaults
    setSessionDate(todayISO());
    setDuration("");
    setNotes("");
  } catch {
    toast.error("Failed to log session — try again.");
  }
}

// After — add toast.success immediately after mutateAsync:
    await createSession.mutateAsync({ ... });
    toast.success("Session logged.");
    // Reset form to defaults
    setSessionDate(todayISO());
```

**Toast message:** `"Session logged."` — short imperative past tense, period, matches project convention.

---

### FBK-09: Snapshot Delete toast.success
**Target file:** `src/features/army-lists/SnapshotHistorySheet.tsx`
**Analog:** Self — `toast` already imported from sonner

**Current snapshot delete** (`src/features/army-lists/SnapshotHistorySheet.tsx` lines 181-195):
```tsx
// Before — neutral toast():
onSuccess: () => {
  toast("Snapshot deleted.", {
    action: savedData ? {
      label: "Undo",
      onClick: () => { createSnapshot.mutate({ ... }); },
    } : undefined,
  });
},

// After — toast.success() with undo action preserved:
onSuccess: () => {
  toast.success("Snapshot deleted.", {
    action: savedData ? {
      label: "Undo",
      onClick: () => { createSnapshot.mutate({ ... }); },
    } : undefined,
  });
},
```

**Change:** `toast(` → `toast.success(` — single token change, all arguments preserved.

---

### FBK-10: staleTime/gcTime Alignment
**Target files:** 10 hook files (see table below)
**Analog:** `src/hooks/useGameData.ts` — representative staleTime: Infinity pattern

**Current pattern** (`src/hooks/useGameData.ts` lines 48-60):
```tsx
// Before — staleTime without gcTime:
return useQuery({
  queryKey: ...,
  queryFn: ...,
  enabled: !!detachmentId,
  staleTime: Infinity,
});

// After — add gcTime: Infinity on line immediately after staleTime:
return useQuery({
  queryKey: ...,
  queryFn: ...,
  enabled: !!detachmentId,
  staleTime: Infinity,
  gcTime: Infinity,
});
```

**Files and occurrence counts (all confirmed by grep):**
| File | Occurrences |
|------|-------------|
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

**Total: ~27 occurrences.** The change is purely additive — one line added below each `staleTime: Infinity` occurrence. No existing code removed.

---

## Shared Patterns

### Toast Convention
**Source:** All feature files using sonner
**Apply to:** FBK-08 (JournalTab), FBK-09 (SnapshotHistorySheet)
```tsx
// Import — already present in all target files:
import { toast } from "sonner";

// Success toast pattern — short imperative past tense, period:
toast.success("Session logged.");
toast.success("Snapshot deleted.");

// Error toast pattern:
toast.error("Something went wrong. Please try again.");
```

### Delete Dialog Structure
**Source:** `src/features/battle-log/BattleLogDeleteDialog.tsx` (lines 46-55) — representative of all 4 target dialogs
**Apply to:** All 4 delete dialogs (FBK-01)

The 4 target dialogs all share this structure:
- Own their mutation internally (no isPending prop from parent)
- mutation object named after the action: `deleteFaction`, `deleteBattleLog`, etc.
- Button already has `disabled={mutation.isPending}`
- Only missing: conditional button text

### RHF FormField Input Pattern
**Source:** `src/features/factions/FactionSheet.tsx` lines 124-136
**Apply to:** All 6 Sheet form autoFocus changes (FBK-04)
```tsx
// autoFocus placement — on <Input>, inside <FormControl>, inside render prop:
render={({ field }) => (
  <FormItem>
    <FormLabel>...</FormLabel>
    <FormControl>
      <Input autoFocus {...field} />
    </FormControl>
    <FormMessage />
  </FormItem>
)}
```

### Tooltip Import Block
**Source:** `src/features/units/JournalTab.tsx` lines 18-23
**Apply to:** `PlaybookTab.tsx` (FBK-06)
```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

---

## No Analog Found

All files in this phase have existing analogs. No entries.

---

## Metadata

**Analog search scope:** `src/features/`, `src/hooks/`
**Files read:** 12 source files + 2 planning files
**Pattern extraction date:** 2026-06-11
