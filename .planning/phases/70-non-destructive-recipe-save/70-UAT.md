---
status: complete
phase: 70-non-destructive-recipe-save
source: 70-01-SUMMARY.md, 70-02-SUMMARY.md
started: 2026-05-13T12:00:00Z
updated: 2026-05-13T12:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Edit Step Field — IDs Preserved
expected: Open an existing recipe with multiple sections/steps. Edit one step (e.g. rename it or change a field). Save. Re-open the recipe. The edited step shows the new value, and all section/step rows in the DB kept their original IDs — no new IDs were assigned to unchanged items.
result: pass

### 2. Reorder Steps — IDs Preserved
expected: Open an existing recipe. Drag-reorder steps within a section (or between sections). Save. Re-open. Steps appear in the new order, but each step still has its original database ID — no delete+re-insert occurred.
result: pass

### 3. Remove a Step — Only That Row Deleted
expected: Open an existing recipe with 3+ steps. Remove one step. Save. Re-open. The removed step is gone. The remaining steps still have their original IDs and data — only the removed step's DB row was deleted.
result: pass

### 4. Add a New Step During Edit
expected: Open an existing recipe. Add a new step to an existing section. Save. Re-open. The new step appears with a new DB ID. All pre-existing steps retain their original IDs — they were not deleted and re-inserted.
result: pass

### 5. Remove a Section — CASCADE Cleanup
expected: Open a recipe with 2+ sections. Remove an entire section. Save. Re-open. The removed section and its steps are gone. All other sections and their steps retain original IDs.
result: pass

### 6. Duplicate Recipe — Fresh IDs
expected: Duplicate an existing recipe. Open the duplicate. All sections and steps have new IDs (different from the original). The original recipe is completely unaffected — its IDs haven't changed.
result: pass

### 7. Create New Recipe — Unaffected by Diff Logic
expected: Create a brand-new recipe with sections and steps from scratch. Save. Re-open. All data persisted correctly. The create path works identically to before the diff changes.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
