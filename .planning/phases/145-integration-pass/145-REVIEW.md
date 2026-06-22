---
phase: 145-integration-pass
reviewed: 2026-06-22T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/db/queries/recipeTechniqueSlotMaps.ts
  - src/hooks/useSlotResolutionMap.ts
  - src/features/painting-mode/PaintingModeView.tsx
  - src/features/painting-mode/StepFocalView.tsx
  - src/features/painting-mode/SlotReassignMiniDialog.tsx
  - src/features/recipes/AssignmentChecklist.tsx
  - src/features/recipes/ChecklistStepRow.tsx
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 145: Code Review Report

**Reviewed:** 2026-06-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

The effectivePaintId() wiring is substantially correct in PaintingModeView and
AssignmentChecklist — no direct step.paint_id reads leak for technique steps in
either consumer. The SQL for getUnfilledSlotCount uses a LEFT JOIN and correctly
gates on detached = 0.

Two blockers surface: (1) getSlotResolutionMap does not filter detached instances,
meaning stale slot fills from a detached technique application persist in the
resolution map and can cause wrong paints to be shown for currently active steps.
(2) ChecklistStepRow has no visual representation for an unfilled technique slot —
a step whose only "detail" is an unfilled slot collapses to a plain text row
(no chevron, no indicator), making it indistinguishable from a step with no data
at all, which is a silent undercounting in the checklist UX.

Three warnings round out the review: a secondary-only `showCloseButton={false}`
prop silently ignored by shadcn/ui DialogContent; getStepSlotIdMap also missing
the detached filter (allows reassign dialog to target stale instances); and
the PaintReadinessBanner dismiss state persisting across recipe navigation sessions.

---

## Critical Issues

### CR-01: getSlotResolutionMap does not exclude detached instances

**File:** `src/db/queries/recipeTechniqueSlotMaps.ts:59-69`

**Issue:** The SQL query in `getSlotResolutionMap` JOINs
`recipe_technique_instances` without filtering `rti.detached = 0`. When a
technique is detached (the user has unlinked the instance from the technique
definition), the recipe_steps rows still carry their `technique_step_id` values
and the slot maps written during that instance's lifetime are still in
`recipe_technique_slot_maps`. The LEFT JOIN will pick up those stale fills.

`effectivePaintId()` routes every step whose `technique_step_id IS NOT NULL`
through the slotMap. If a step belongs to a detached instance, its entry in the
resolution map comes from a stale slot fill rather than showing as unfilled.
This means the paint swatch shown in Painting Mode and the "missing paint" banner
calculation are both wrong for those steps.

`getUnfilledSlotCount` already guards with `AND rti.detached = 0` (line 137),
but `getSlotResolutionMap` does not. The inconsistency means the banner can
report zero unfilled slots while the swatch still shows a stale colour.

**Fix:**

```sql
-- getSlotResolutionMap — add detached guard to the WHERE clause
WHERE rs.recipe_id = $1
  AND rs.technique_step_id IS NOT NULL
  AND rti.detached = 0
```

The full corrected query in `getSlotResolutionMap`:

```ts
const rows = await db.select<{ recipe_step_id: number; paint_id: number | null }[]>(
  `SELECT rs.id AS recipe_step_id, sm.paint_id
   FROM recipe_steps rs
   JOIN recipe_sections rsec ON rsec.id = rs.section_id
   JOIN recipe_technique_instances rti ON rti.id = rsec.technique_instance_id
   JOIN technique_steps ts ON ts.id = rs.technique_step_id
   LEFT JOIN recipe_technique_slot_maps sm
     ON sm.instance_id = rti.id AND sm.slot_id = ts.colour_slot_id
   WHERE rs.recipe_id = $1
     AND rs.technique_step_id IS NOT NULL
     AND rti.detached = 0`,
  [recipeId],
);
```

---

### CR-02: ChecklistStepRow renders unfilled technique slots as invisible plain rows

**File:** `src/features/recipes/ChecklistStepRow.tsx:37-58`

**Issue:** `hasDetail` is computed as:

```ts
const hasDetail =
  !!paint ||
  !!altPaint ||
  !!step.technique ||
  !!step.tool ||
  ...
```

For a technique-owned step with an unfilled slot, `paint` is `undefined`
(effectivePaintId returns null → AssignmentChecklist's resolvedPaint returns
undefined). If that step also has no tool, technique text, dilution, notes, or
time estimate on the materialised `recipe_steps` row (which is typical for
technique-library steps that carry metadata on `technique_steps`, not on
the materialised row), `hasDetail` is `false`.

The component then renders the no-detail branch (lines 50-58): a plain checkbox
row with no chevron and no visual cue that a slot is unfilled. The user sees a
step listed without any paint indication and cannot distinguish it from a
deliberately paintless step.

This is the checklist equivalent of the unfilled-slot indicator in StepFocalView
(which shows a dashed circle). The checklist silently drops the unfilled-slot
state.

Additionally, `ChecklistStepRow` receives no `isUnfilledSlot` prop at all —
AssignmentChecklist (lines 133-141, 157-165, 175-181) does not pass one. The
component therefore has no way to render a different indicator even if the
`hasDetail` branch was taken.

**Fix:** Add an `isUnfilledSlot` prop to `ChecklistStepRow` and include it in
`hasDetail`:

```ts
// ChecklistStepRow.tsx — extend props
interface ChecklistStepRowProps {
  step: RecipeStep;
  completed: boolean;
  paint: Paint | undefined;
  altPaint: Paint | undefined;
  isUnfilledSlot: boolean;       // NEW
  onToggle: (checked: boolean) => void;
}

// hasDetail must include isUnfilledSlot
const hasDetail =
  !!paint ||
  isUnfilledSlot ||              // NEW — unfilled slot counts as detail
  !!altPaint ||
  ...
```

Render the unfilled slot inline (matching StepFocalView's dashed-circle pattern):

```tsx
{/* In CollapsibleContent, before StepMetadataRow */}
{isUnfilledSlot && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <div className="h-4 w-4 rounded-full border border-dashed border-muted-foreground bg-transparent shrink-0" />
    <span>Slot unfilled</span>
  </div>
)}
```

In `AssignmentChecklist`, compute and pass `isUnfilledSlot`:

```ts
function isStepUnfilledSlot(step: RecipeStep) {
  return (step.technique_step_id ?? null) !== null &&
    effectivePaintId(step, slotMap) === null;
}
```

Pass it wherever `ChecklistStepRow` is rendered:

```tsx
<ChecklistStepRow
  ...
  isUnfilledSlot={isStepUnfilledSlot(step)}
  ...
/>
```

---

## Warnings

### WR-01: getStepSlotIdMap does not filter detached instances

**File:** `src/db/queries/recipeTechniqueSlotMaps.ts:166-174`

**Issue:** `getStepSlotIdMap` uses the same JOIN chain as `getSlotResolutionMap`
but also lacks `AND rti.detached = 0`. The map is used by `handleReassignSlot`
in `PaintingModeView` to find the `instanceId` and `slotId` for the
`SlotReassignMiniDialog`. For steps belonging to a detached instance, this will
find a non-null `instanceId` and open the dialog targeting the stale (detached)
instance. The user's save will write a slot fill to a detached instance that no
longer contributes to the recipe's active resolution map.

The user gets no error (the write succeeds), the swatch does not update (stale
instance fills are excluded from the resolution map per CR-01 fix above), and
the unfilled-slot count does not change — a silent no-op that appears to succeed.

**Fix:**

```sql
WHERE rs.recipe_id = $1
  AND rs.technique_step_id IS NOT NULL
  AND rti.detached = 0
```

---

### WR-02: SlotReassignMiniDialog passes showCloseButton={false} — non-standard prop

**File:** `src/features/painting-mode/SlotReassignMiniDialog.tsx:92`

**Issue:**

```tsx
<DialogContent className="sm:max-w-xs" showCloseButton={false}>
```

The shadcn/ui `DialogContent` component (new-york style) does not accept a
`showCloseButton` prop in its standard form. The prop will be silently spread
onto the underlying `div` (or ignored, depending on the component version). The
built-in close button (`X`) will still render and give the user a second
dismissal path independent of the `onClose` callback. This is a minor UX
inconsistency: a user clicking the `X` will call `onOpenChange(false)` which
calls `onClose()`, so the behavior is still correct — but the comment in the
file (`showCloseButton={false}`) signals intent that is not achieved.

If the project's shadcn/ui copy has been patched to accept `showCloseButton`,
this warning does not apply. Otherwise:

**Fix:** Remove `showCloseButton={false}` and instead rely on the existing
`onOpenChange` handler, or patch `DialogContent` to accept and respect the prop.

---

### WR-03: PaintReadinessBanner dismiss flag survives recipe navigation

**File:** `src/features/painting-mode/PaintingModeView.tsx:151`

**Issue:** `bannerDismissed` is local React state initialized once per mount of
`PaintingModeView`. If the parent page reuses the same mounted `PaintingModeView`
instance across different recipes (e.g. the user navigates from Recipe A to
Recipe B without unmounting), a previously dismissed banner for Recipe A will
suppress the banner for Recipe B even if Recipe B has missing paints or unfilled
slots.

This is contingent on how the parent routes between recipes. If the parent always
unmounts `PaintingModeView` on recipe change (e.g. keyed on `recipeId`), this
is not a live bug. But the component itself does not guard against it.

**Fix:** Reset `bannerDismissed` when `recipeId` changes:

```ts
const [bannerDismissed, setBannerDismissed] = useState(false);
// Reset when recipe changes
useEffect(() => {
  setBannerDismissed(false);
}, [recipeId]);
```

---

## Info

### IN-01: useSlotResolutionMap JSDoc says "technique_step_id" key — should be "recipe_step_id"

**File:** `src/hooks/useSlotResolutionMap.ts:27`

**Issue:** The JSDoc comment for `useSlotResolutionMap` reads:

```
// useSlotResolutionMap — Map<technique_step_id, paint_id|null> for a recipe
```

The actual map key is `recipe_step_id` (recipe_steps.id), not `technique_step_id`.
This was the SLOT-04 bug fix (documented in `recipeTechniqueSlotMaps.ts` header).
The stale label in the hook file contradicts the corrected semantics and will
mislead the next developer who reads it.

**Fix:** Update the section comment:

```ts
// useSlotResolutionMap — Map<recipe_step_id, paint_id|null> for a recipe
```

---

### IN-02: resolvedPaint() defined as inline function in AssignmentChecklist — not memoized

**File:** `src/features/recipes/AssignmentChecklist.tsx:50-53`

**Issue:**

```ts
function resolvedPaint(step: RecipeStep) {
  const id = effectivePaintId(step, slotMap);
  return id !== null ? paintsById.get(id) : undefined;
}
```

This is a plain function expression inside the component body. It closes over
`slotMap` and `paintsById`, which are memoized Maps. On every render, a new
function identity is created. Since it is passed as a computed value at call
sites (not as a prop), React cannot optimize this away via shallow comparison.
For large recipes (50+ steps) this is acceptable — `effectivePaintId` is pure
and cheap. Not a correctness issue.

**Fix (optional):** Wrap with `useCallback` if profiling ever shows this as a
hotspot:

```ts
const resolvedPaint = useCallback(
  (step: RecipeStep) => {
    const id = effectivePaintId(step, slotMap);
    return id !== null ? paintsById.get(id) : undefined;
  },
  [slotMap, paintsById],
);
```

---

_Reviewed: 2026-06-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
