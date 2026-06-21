---
phase: 142-technique-authoring-library-browse
reviewed: 2026-06-21T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - src/db/queries/techniques.ts
  - src/lib/techniqueDiff.ts
  - src/db/queries/techniqueSections.ts
  - src/db/queries/techniqueColourSlots.ts
  - src/hooks/useTechniques.ts
  - src/hooks/useTechniqueSections.ts
  - src/hooks/useTechniqueColourSlots.ts
  - src/types/technique.ts
  - src/features/techniques/techniqueSchema.ts
  - src/features/techniques/techniqueSection.ts
  - src/features/techniques/applyTechniqueFilters.ts
  - src/features/techniques/TechniqueFormSheet.tsx
  - src/features/techniques/TechniqueSlotRow.tsx
  - src/features/techniques/TechniqueStepRow.tsx
  - src/features/techniques/TechniqueStepList.tsx
  - src/features/techniques/TechniqueSectionCard.tsx
  - src/features/techniques/TechniqueSectionList.tsx
  - src/features/techniques/TechniqueCard.tsx
  - src/features/techniques/TechniqueCardGrid.tsx
  - src/features/techniques/TechniqueEmptyState.tsx
  - src/features/techniques/TechniqueDetailSheet.tsx
  - src/features/techniques/TechniqueDeleteDialog.tsx
  - src/features/techniques/TechniqueLibraryTab.tsx
  - src/features/recipes/RecipesPage.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 142: Code Review Report

**Reviewed:** 2026-06-21
**Depth:** standard
**Files Reviewed:** 24 (23 new/modified + 1 regression check)
**Status:** issues_found

## Summary

Phase 142 delivers a well-structured mirror of the existing recipe authoring stack. The
FND-03 load-bearing invariant (non-destructive save preserving `technique_step_id`) is
correctly implemented: `saveTechniqueGraph` uses UPDATE-by-PK for surviving steps and
never DELETE+INSERTs a surviving step. The slot diff (`computeSlotDiff` / `buildSlotIdMap`)
is correct. The `removeSlot` handler in `TechniqueFormSheet` properly nulls
`colour_slot_id` on all referencing steps. Column trap adherence (no `updated_at` on
`technique_steps` or `technique_colour_slots`, no `step_photo_path`, no `alt_paint_id`)
is confirmed throughout. SQL uses `$1/$2` positional parameters with no string
interpolation. React Query invalidation symmetry in `invalidateTechniqueKeys` covers all
relevant keys. RecipesPage integration uses local state with no route change, no router
or sidebar modifications. No regressions in existing recipes behavior are introduced.

Three warnings and three info items are reported below. No blockers were found.

---

## Warnings

### WR-01: Duplicate DOM `id` attributes from repeated `<datalist>` renders

**File:** `src/features/techniques/TechniqueStepList.tsx:57-65`

**Issue:** `TechniqueStepList` unconditionally renders two `<datalist>` elements
(`id="tool-suggestions"` and `id="technique-suggestions"`). Every section card renders a
`TechniqueStepList`, so a technique with N sections produces 2N datalist elements sharing
the same IDs in the same document. The HTML specification requires IDs to be unique per
document. While most browsers pick the first matching datalist and the autocomplete
feature still appears to work, this is a DOM conformance violation and could produce
surprising behaviour in strict or future browser engines.

**Fix:** Lift the two `<datalist>` elements to the nearest common ancestor that is
rendered once — either `TechniqueSectionList` or `TechniqueFormSheet` — and remove them
from `TechniqueStepList`:

```tsx
// In TechniqueSectionList.tsx (or TechniqueFormSheet.tsx), add once:
<>
  <datalist id="tool-suggestions">
    {["Size 0 brush", "Size 1 brush", "Size 2 brush", "Dry brush",
      "Airbrush", "Sponge", "Palette knife"].map((t) => (
      <option key={t} value={t} />
    ))}
  </datalist>
  <datalist id="technique-suggestions">
    {["Thin layers", "Stipple", "Wet blend", "Dry brush", "Wash",
      "Glaze", "Edge highlight", "Feathering"].map((t) => (
      <option key={t} value={t} />
    ))}
  </datalist>
  <DndContext ...>
    ...
  </DndContext>
</>
```

---

### WR-02: `useEffect` key on content-length metrics loses edits on same-count reloads

**File:** `src/features/techniques/TechniqueFormSheet.tsx:133-147`

**Issue:** The `useEffect` that rebuilds draft slots and sections in edit mode uses
`existingSectionsLen`, `existingStepsLen`, and `existingSlotsLen` as its dependency
triggers (all derived from `.length`). This means if the user: (1) opens a technique for
edit, (2) changes a section name via a separate session/device while React Query cache is
stale, (3) closes and reopens the form — the effect does not re-run because the array
lengths are unchanged, and stale section/slot names are displayed in the form. The more
likely scenario: the form opens before React Query has finished fetching, `existingSections`
arrives from the query a tick later with the same length as a prior stale cache hit, and
the effect does not rebuild.

This is a pre-existing pattern shared with the recipe form (the `eslint-disable`
suppression is intentional). However because `existingSlots`, `existingSections`, and
`existingSteps` are already destructured variables (not functions), including them as
stable React Query result references would be correct:

**Fix:** Remove the length intermediates and include the actual data arrays in deps.
React Query memoises query results by structural equality only when the data changes, so
this will not cause infinite-loop re-runs:

```tsx
useEffect(() => {
  form.reset(buildDefaults(technique));
  if (technique && (existingSlots.length > 0 || existingSections.length > 0)) {
    const draftSlots = buildDraftTechniqueSlots(existingSlots);
    setSlots(draftSlots);
    setSections(buildDraftTechniqueSections(existingSections, existingSteps, draftSlots));
  } else if (!technique) {
    setSlots([]);
    setSections([makeDraftTechniqueSection("Steps")]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [technique?.id, existingSlots, existingSections, existingSteps]);
```

---

### WR-03: Silent data loss — `description`, `estimated_minutes`, and `result_photo_path` fields persist nowhere

**File:** `src/features/techniques/TechniqueFormSheet.tsx:82-93` and `src/db/queries/techniques.ts:363-374`

**Issue:** `TechniqueFormSheet` renders user-facing inputs for `description` (textarea),
`estimated_minutes` (number input), and `result_photo_path` (file upload button with
Tauri `readFile`/`writeFile`). The form's `onSubmit` passes `formValues` (which includes
these fields) to `saveTechniqueGraph`, but `saveTechniqueGraph` ignores them — the INSERT
and UPDATE SQL only bind `name`, `effect`, `difficulty`, `notes`. The `Technique` DB row
type and migration 051 have no columns for these fields.

The result photo upload is the most harmful case: the user selects a file, the handler
copies it to `BaseDirectory.AppData` with a generated UUID filename, sets the form field,
and the user sees the filename displayed — but the filename is never written to the
database. The copied file is stranded in AppData with no record pointing to it (a file
leak per save attempt).

The 142-03 summary acknowledges this as intentional ("form-level-only fields silently
discarded"), but:
1. The UI offers no indication to the user that the entered data will not persist.
2. The result photo creates an orphaned file on disk on every create/edit that includes a
   photo upload.

**Fix (minimum for correctness):** Remove the `result_photo_path` upload button entirely
from `TechniqueFormSheet` until the corresponding DB column exists, or add a migration 052
column and persist it. For `description` and `estimated_minutes`, either add a
`<p class="text-xs text-muted-foreground">Not saved yet — coming in a future update.</p>`
label, or remove the fields until the columns exist.

If removing the upload button is not desirable in this phase, add a guard that skips the
file copy when `result_photo_path` would be discarded:

```tsx
// Do NOT copy the file if it won't be persisted
// Remove handleResultPhotoUpload from TechniqueFormSheet entirely until
// a DB column exists, or add the column in a migration.
```

---

## Info

### IN-01: Dead guard — `section.notes !== undefined` always true

**File:** `src/features/techniques/TechniqueSectionCard.tsx:145`

**Issue:** `DraftTechniqueSection.notes` is typed as `string | null` (never `undefined`).
The conditional `{section.notes !== undefined && (...)}` always evaluates to `true` and
is dead code. The notes input is always rendered, which is actually the correct behaviour
(the 142-03 summary explicitly says "always renders notes Input — no conditional"), but
the guard is misleading and could confuse future readers into thinking notes can be absent.

**Fix:** Remove the conditional wrapper:

```tsx
// Before:
{section.notes !== undefined && (
  <div className="mb-2">
    <Input ... />
  </div>
)}

// After:
<div className="mb-2">
  <Input ... />
</div>
```

---

### IN-02: `console.error` debug artifact in production path

**File:** `src/features/techniques/TechniqueFormSheet.tsx:272`

**Issue:** `console.error("[TechniqueFormSheet] save failed:", err)` logs save errors to
the browser console in production. Errors are already surfaced to the user via
`toast.error(...)`, so the console log adds no user value. This is a minor code-quality
item matching the CLAUDE.md prohibition on debug artifacts.

**Fix:**

```tsx
// Remove:
console.error("[TechniqueFormSheet] save failed:", err);
```

---

### IN-03: Both "slots" and "steps" count use the same `Layers` icon

**File:** `src/features/techniques/TechniqueCard.tsx:61-68`

**Issue:** The card displays both slot count and step count, but both lines use
`<Layers className="h-3 w-3" />` as the icon. They are visually indistinguishable,
requiring the user to read the label text to differentiate. This is a UI-quality issue
only — no functional defect.

**Fix:** Use a different icon for one of the two counts. For example, `Layers` for slots
and `ListOrdered` (or `Footprints`) for steps — both are available in `lucide-react`:

```tsx
import { Layers, ListOrdered } from "lucide-react";

// slot count:
<Layers className="h-3 w-3" />
{slot_count} {slot_count === 1 ? "slot" : "slots"}

// step count:
<ListOrdered className="h-3 w-3" />
{step_count} {step_count === 1 ? "step" : "steps"}
```

---

_Reviewed: 2026-06-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
