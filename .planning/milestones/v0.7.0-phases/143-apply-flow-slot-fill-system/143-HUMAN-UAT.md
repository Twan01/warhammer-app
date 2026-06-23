---
status: partial
phase: 143-apply-flow-slot-fill-system
source: [143-VERIFICATION.md]
started: 2026-06-22T15:30:00Z
updated: 2026-06-22T15:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Picker → slot-fill → apply flow
expected: From the recipe section editor, "Add technique" opens a **Dialog** (not a Sheet); search filters the library; preview shows slots + step tree; "Next: Fill slots" advances to the slot-fill dialog; each slot row shows role hint + swatch (dashed when unassigned, never red); empty slots are allowed; "Apply technique" fires a success toast; the applied technique appears as a badged, locked recipe section.
result: [pending]

### 2. Double-apply visual independence (SLOT-04)
expected: Applying the same technique twice in one recipe yields two independent badged sections; filling slots on one does not change the other's colours.
result: [pending]

### 3. Save round-trip
expected: After applying a technique, saving the recipe and reopening it preserves the technique sections/steps (the saveRecipeGraph guard does not drop or overwrite live-linked steps).
result: [pending]

### 4. Detail-view swatch resolution + "Edit colours" (APPLY-05)
expected: In the recipe detail view, technique-owned steps render read-only with their real paint swatch resolved via the slot map; an "Edit colours" button opens the slot-fill dialog pre-populated with current mappings; changing a paint and saving updates the swatch.
result: [pending]

### 5. Interactive badge navigates to library tab
expected: Clicking the "from technique X" badge in the detail view closes the sheet and switches the Recipes page to the Techniques tab.
result: [pending]

### 6. Plain recipe regression
expected: Recipes with no techniques behave exactly as before — no badges, no locked sections, no missing swatches, paint availability unchanged.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
