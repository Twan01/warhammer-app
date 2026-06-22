---
phase: 144-live-link-re-sync
plan: "03"
subsystem: ui
tags: [confirmation-dialog, resync, technique, link-02, link-03, fnd-03]
dependency_graph:
  requires: [144-01, 144-02]
  provides: [LINK-02-warning-dialog, LINK-03-change-summary-dialog, structural-edit-gate]
  affects: [TechniqueFormSheet, recipe-resync]
tech_stack:
  added: []
  patterns: [submit-intercept-with-pending-ref, dialog-gate-before-mutateAsync]
key_files:
  created: []
  modified:
    - src/features/techniques/TechniqueFormSheet.tsx
key_decisions:
  - "executeSave helper extracts create/update mutateAsync + toast + onClose so both the direct path and the confirm-dialog path share identical save logic"
  - "pendingSubmitRef stores pre-computed orderedSlots/orderedSections from the suspended onSubmit call — avoids recomputing order_index in the confirm handler"
  - "onSubmit returns before any DB write when dialog opens; Cancel calls setConfirmDialog(null) only — zero DB calls reachable from Cancel path"
  - "Dialog renders outside the Sheet via a React fragment wrapper — ensures it renders on top and is not clipped by SheetContent overflow"
requirements-completed: [LINK-02, LINK-03]
duration: 12min
completed: "2026-06-22"
---

# Phase 144 Plan 03: Structural Edit Confirmation Dialog Summary

**One-liner:** Confirmation dialog intercept in TechniqueFormSheet that gates structural technique edits on used recipes — shows "Update N recipe(s)?" with aggregated change summary (adds/removes/reorders) and "Step completion progress is preserved." before any DB write.

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-22T18:15:00Z
- **Completed:** 2026-06-22T18:27:00Z
- **Tasks:** 1 (+ 1 human-verify checkpoint deferred as UAT)
- **Files modified:** 1

## Accomplishments

- `TechniqueFormSheet.onSubmit` now intercepts structural edits: calls `previewTechniqueResyncDiff` then `getNonDetachedInstanceCount`; if `isStructural && count > 0`, stores pending values in `pendingSubmitRef` and opens the dialog — no DB write until Confirm
- `executeSave` helper extracted from the old try/catch block — shared by the direct path (create, metadata edits, zero-instance) and the Confirm button
- Dialog title pluralises correctly ("Update 1 recipe?" vs "Update 3 recipes?"); body filters zero counts and joins non-zero as "adds N step(s), removes M step(s), reorders K step(s)" ending with "Step completion progress is preserved."
- Cancel button calls `setConfirmDialog(null)` only — T-144-09 (tamper-on-cancel) mitigated
- Full test suite: 335 passed, 6 skipped (pre-existing), 0 failures; `pnpm build` clean

## Task Commits

1. **Task 1: Confirmation-dialog intercept in TechniqueFormSheet.onSubmit** - `7e314831` (feat)

## Files Created/Modified

- `src/features/techniques/TechniqueFormSheet.tsx` — Added Dialog imports, `useRef`, `confirmDialog` state, `pendingSubmitRef`, `executeSave` helper, structural-edit intercept in `onSubmit`, and Dialog JSX inside a React fragment wrapper

## Decisions Made

- **executeSave helper:** The existing try/catch block was extracted verbatim into `executeSave(values, orderedSlots, orderedSections)`. Both the direct-save path and the confirm-dialog path call the same function — no divergence risk.
- **pendingSubmitRef over re-running onSubmit:** The confirm button reads values from the ref rather than re-submitting the form. This avoids re-triggering React Hook Form validation and re-running `previewTechniqueResyncDiff` / `getNonDetachedInstanceCount` on confirm.
- **React fragment wrapper:** The Sheet + Dialog are wrapped in `<>...</>` because rendering Dialog inside SheetContent causes z-index/overflow clipping. The fragment keeps the JSX return clean.
- **Zero-count filter in change summary:** `[...].filter(Boolean).join(", ")` ensures only non-zero counts appear. If only step adds occurred, the body reads "adds 2 steps." with no spurious "removes 0 steps" noise.

## Deviations from Plan

None — plan executed exactly as written.

## Human UAT (deferred)

The following verification steps are deferred to end-of-phase human UAT. These are NOT blocking for plan completion per autonomous-run-note.

**What was built:** The affected-recipes confirmation dialog in the technique edit form (LINK-02/03). When you save a structural change (add/remove/reorder a step) to a technique that is applied in one or more recipes, a dialog now appears before the save commits, showing how many recipes are affected and an itemised change summary. Confirm propagates the change (resync) to every recipe; Cancel writes nothing. The data-layer resync correctness was already proven by automated tests in plan 01.

**How to verify:**

1. Run the app: `pnpm tauri dev`.
2. Pick (or create) a technique and apply it to at least one recipe (Workshop → Recipes → a recipe → add technique). Mark one of its technique-sourced steps complete in that recipe.
3. Open the technique in the technique library and edit its structure — add one step and reorder another.
4. Save. EXPECT: a dialog titled "Update 1 recipe?" (or N) with a summary like "adds 1 step, reorders 1 step" and the line "Step completion progress is preserved."
5. Click Cancel → reopen the affected recipe → EXPECT no structural change (the edit did not apply).
6. Edit + save again, this time click "Update Recipes" → reopen the recipe → EXPECT the new step is present, the reordered step moved, and the previously-completed step is STILL marked complete.
7. Now make a metadata-only edit (rename a step, change a note) and save → EXPECT NO dialog (direct save).

**Resume signal:** Type "approved" or describe what differed (dialog wording, missing reassurance line, dialog appearing on metadata edit, lost completion, etc.)

## Known Stubs

None — the confirmation dialog is fully wired to `previewTechniqueResyncDiff` and `getNonDetachedInstanceCount`; the Confirm path calls `executeSave` which calls `updateTechnique.mutateAsync` which calls `saveTechniqueGraph` which calls `resyncTechniqueInstances`.

## Threat Flags

No new network endpoints, auth paths, or schema changes.

- T-144-08 (repudiation — silent propagation): mitigated — structural edits on used techniques cannot save without explicit user confirmation
- T-144-09 (tampering — partial write on Cancel): mitigated — Cancel calls `setConfirmDialog(null)` only; `pendingSubmitRef` is never read on Cancel path
- T-144-10 (dialog fatigue on metadata edits): accepted — `isStructural===false` skips dialog for rename/notes edits; confirmed correct by build + test

## Self-Check: PASSED

- `src/features/techniques/TechniqueFormSheet.tsx` imports `previewTechniqueResyncDiff` and `getNonDetachedInstanceCount` — VERIFIED
- Commit 7e314831 — FOUND
- `pnpm build` clean (no error lines) — VERIFIED
- `pnpm test` 335 passed, 0 failures — VERIFIED
