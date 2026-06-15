---
slug: collection-unit-delete-freeze
status: awaiting_human_verify
trigger: Deleting a unit from collection causes the entire React UI to freeze
created: 2026-06-11
updated: 2026-06-11
---

# Debug: Collection unit delete freezes UI

## Symptoms
- User deletes a unit from the collection page
- Expected: unit disappears from list, UI remains responsive
- Actual: entire React UI freezes (Tauri window still movable/resizable)
- Frequency: every time, any unit
- No error messages visible
- Previous related fix (2026-06-10): handleCloseDelete race condition was fixed, but freeze persists

## Current Focus

hypothesis: "Radix Dialog/Sheet cleanup (focus trap, pointer-events:none on body, scroll lock) is skipped because key changes on UnitDeleteDialog AND UnitDetailSheet cause React to unmount the old component instances in the SAME render cycle as open transitions to false. Radix never gets to run its close cleanup, leaving body locked."
test: "Remove key props from Dialog and Sheet components, or defer key changes to AFTER close animation. Check if UI remains responsive after delete."
expecting: "If hypothesis is correct, removing the key-driven unmount during close will allow Radix cleanup to run and UI will remain responsive."
next_action: "Apply fix: remove key props from UnitDeleteDialog and UnitDetailSheet (they already handle null unit via conditional rendering), or use onAnimationEnd/setTimeout to defer key changes."

reasoning_checkpoint:
  hypothesis: "Key change on UnitDeleteDialog and UnitDetailSheet during close causes Radix Dialog/Sheet to unmount before cleanup (focus trap release, body pointer-events reset, scroll lock removal), freezing the UI."
  confirming_evidence:
    - "Both UnitDeleteDialog and UnitDetailSheet use key={unit?.id ?? 'fallback'} which changes when unit state is cleared"
    - "handleCloseDelete batches setDeleteDialogOpen(false) + setDeletingUnit(null) + setSelectedUnitId(null) in one render — key changes simultaneous with open=false"
    - "Radix Dialog applies pointer-events:none to body when open; cleanup runs on unmount transition — key change skips this"
    - "Symptom is 'React UI frozen but Tauri window responsive' = exactly what pointer-events:none on body produces"
    - "Sheet component also uses Radix Dialog primitive (imported as SheetPrimitive from radix-ui), compounding the issue"
  falsification_test: "If removing the key props from UnitDeleteDialog and UnitDetailSheet does NOT fix the freeze, then Radix cleanup is not the issue."
  fix_rationale: "Removing key props lets Radix Dialog/Sheet persist across state changes and properly run close animations + cleanup. The components already guard with {unit && ...} for null unit."
  blind_spots: "Haven't observed pointer-events:none stuck on body directly (would need DevTools in Tauri). Possible that radix-ui 1.4.3 handles key-driven unmount gracefully."

## Evidence

- timestamp: 2026-06-11T01
  checked: CollectionPage.tsx handleCloseDelete flow
  found: Three setState calls batched — setDeleteDialogOpen(false), setSelectedUnitId(null), setDeletingUnit(null). This changes keys on BOTH UnitDeleteDialog and UnitDetailSheet in the same render as open transitions to false.
  implication: Radix Dialog/Sheet components are unmounted (via key change) before they can run close cleanup.

- timestamp: 2026-06-11T02
  checked: UnitDeleteDialog.tsx and UnitDetailSheet.tsx component structure
  found: UnitDeleteDialog key={deletingUnit?.id ?? "none-delete"}, UnitDetailSheet key={selectedUnit?.id ?? "none-detail"}. Both use Radix Dialog primitive under the hood.
  implication: Two Radix dialog instances have cleanup skipped simultaneously.

- timestamp: 2026-06-11T03
  checked: sheet.tsx imports
  found: Sheet is `import { Dialog as SheetPrimitive } from "radix-ui"` — same primitive as Dialog. Both apply body-level locks.
  implication: Two instances of the same focus-trap/body-lock mechanism both fail to clean up.

## Eliminated

## Resolution

root_cause: "Key props on UnitDeleteDialog and UnitDetailSheet cause React to unmount these components (via key change) in the same render cycle where open transitions to false. This prevents Radix Dialog from running its close cleanup — body pointer-events lock, focus trap, and scroll lock persist, making the entire React UI appear frozen while the Tauri window remains responsive."
fix: "Remove key props from UnitDeleteDialog, UnitDetailSheet, and UnitSheet across all pages (CollectionPage, DashboardPage, FactionsPage, PaintingProjectsPage). Also removed key from SheetContent inside UnitDetailSheet. These components already handle null unit via conditional rendering ({unit && ...}) and useEffect-based form resets. The key props were an over-cautious freshness mechanism that conflicts with Radix Dialog lifecycle."
verification: "Build passes, 2571/2571 tests pass (1 pre-existing unrelated failure in bsdata.ts). Awaiting human verification of actual delete behavior."
files_changed: ["src/features/units/CollectionPage.tsx", "src/features/units/UnitDetailSheet.tsx", "src/features/dashboard/DashboardPage.tsx", "src/features/factions/FactionsPage.tsx", "src/features/painting-projects/PaintingProjectsPage.tsx"]
