---
status: partial
phase: 144-live-link-re-sync
source: [144-VERIFICATION.md]
started: 2026-06-22T18:30:00Z
updated: 2026-06-22T18:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Structural edit shows confirmation dialog (LINK-02, LINK-03)
expected: Editing an applied technique structurally (add/remove/reorder a step) and saving shows a confirmation dialog titled "Update N recipe(s)?" with an aggregated change summary (e.g. "adds 1 step, reorders 1 step") and the reassurance "Step completion progress is preserved."
result: [pending]

### 2. Cancel writes nothing
expected: Pressing Cancel in the confirmation dialog aborts the entire save — the technique and all affected recipes are unchanged (no partial writes).
result: [pending]

### 3. Confirm propagates + preserves completion (LINK-01)
expected: Pressing Confirm propagates the structural change to every non-detached recipe using the technique — the new/removed/reordered step is reflected, and a step that was already marked complete stays complete (progress preserved). Each recipe keeps its own slot colours.
result: [pending]

### 4. Metadata-only edit skips the dialog
expected: A pure metadata edit (rename a step, change notes/time — no add/remove/reorder) saves directly with no confirmation dialog, and still propagates the new content to linked recipes.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
