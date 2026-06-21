---
status: partial
phase: 142-technique-authoring-library-browse
source: [142-VERIFICATION.md]
started: 2026-06-21
updated: 2026-06-21
---

## Current Test

[awaiting human testing]

## Tests

### 1. Create a technique end-to-end
expected: On /recipes → Techniques tab → "Add Technique", the form opens; add 2 sections with steps (phase/tool/dilution/time) and 2 colour slots (name + role hint); save shows "Technique created." toast and the new card appears in the grid.
result: [pending]

### 2. Edit with drag-reorder
expected: Editing a technique, dragging steps/sections (dnd-kit) reorders them; save persists the new order non-destructively (no step-ID churn).
result: [pending]

### 3. Slot removal clears step references
expected: In the form, removing a colour slot that a step references clears that step's slot picker (no dangling slot) before/after save.
result: [pending]

### 4. Duplicate produces an independent copy
expected: "Duplicate Technique" creates a "Copy of {name}" card; editing the copy does not affect the original (independent IDs across sections/steps/slots).
result: [pending]

### 5. Delete with usage warning
expected: Deleting a technique shows a confirm dialog ("used by N recipes" / permanent-remove copy when N=0) with a "Keep Technique" cancel; confirming removes the card. Usage count reads 0 this phase (apply flow lands in Phase 143).
result: [pending]

### 6. Detail sheet with real data
expected: Opening a technique's detail Sheet shows the full colour-slot list, the sectioned step tree, and a "used by N recipes" list ("Not used by any recipes yet." when 0).
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
