---
status: passed
phase: 146-detach-safety-rails
source: [146-VERIFICATION.md]
started: 2026-06-23T00:00:00Z
updated: 2026-06-23T12:00:00Z
---

## Current Test

Accepted by user 2026-06-23 — end-to-end technique flow confirmed working in-app (author technique with colour slots, apply, slot-fill, detach, delete, live-link re-sync), including the TECH-UX-01 and TECH-UX-02 fixes and the Phase 146.1 resync-section-identity fix.

## Tests

### 1. Editor Unlink dialog copy
expected: On a technique-owned recipe section in the editor, an Unlink affordance appears next to the "From {technique}" badge. Clicking it opens an AlertDialog titled "Detach technique?" with the permanent-break warning, the "Your current steps and colours are kept." reassurance, a "Keep link" cancel, and a destructive "Detach" confirm. "Keep link" (and Escape/backdrop) dismisses with no changes. During an in-flight detach the dialog stays open showing "Detaching…" and cannot be dismissed by Escape/backdrop.
result: pass

### 2. Detach execution — toast and section transition
expected: Confirming Detach shows a success toast ("Technique detached — now plain recipe content"), the badge and Unlink affordance disappear, the section becomes fully editable plain recipe content (name input editable, drag handle present), and the existing step/colour data + step-completion progress remain intact (baked colours visible).
result: pass

### 3. TechniqueDeleteDialog Case B count and copy
expected: Deleting a technique that is live-linked to ≥1 recipe shows the live non-detached recipe count with correct singular/plural ("1 recipe" vs "N recipes"), names the auto-detach consequence, and the confirm button reads "Detach N recipe(s) & delete". A technique with no live instances keeps the simple "permanently remove" copy and "Keep Technique"/"Delete" buttons.
result: pass

### 4. Auto-detach-then-delete preserves recipe content
expected: After deleting a technique that had live recipe instances, every affected recipe keeps its sections and steps as plain content with the previously-resolved slot colours baked in (paint_id set) and any step-completion progress intact. No recipe content is lost.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
