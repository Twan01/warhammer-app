---
status: resolved
trigger: "When opening a unit in the collection and trying to update/link the datasheet, the user gets an error message 'failed to link datasheet, try again'."
created: 2026-05-22T00:00:00Z
updated: 2026-05-23T00:00:00Z
---

## Current Focus

hypothesis: Three bare catch blocks in PlaybookTab.tsx swallow all errors with generic messages, hiding the actual failure reason. Additionally, useDatasheet hook errors are silently ignored — the component never checks for error state, so a failed datasheet load shows as "no datasheet linked" instead of surfacing the error.
test: Add console.error + actual error message in toast for all catch blocks; capture and render useDatasheet error state in the UI.
expecting: Errors become visible in dev console and toast; users see specific error messages enabling diagnosis; datasheet load failures show an error banner instead of silently appearing as "unlinked".
next_action: Resolved. User verifies the fix.

## Symptoms

expected: User selects a datasheet from the picker, the link is saved to unit_strategy_notes.datasheet_id, and the datasheet stats are loaded into the PlaybookTab.
actual: Toast error "Failed to link datasheet -- try again." appears after selecting a datasheet. No actual error message visible.
errors: "Failed to link datasheet -- try again." (generic catch-all in PlaybookTab.tsx handlePickerSelect)
reproduction: Open a unit in collection, go to Playbook tab, open datasheet picker, select a datasheet.
started: Unknown -- error message exists since Phase 15 implementation.

## Eliminated

- hypothesis: SQL syntax error in upsertDatasheetLink (INSERT or UPDATE)
  evidence: SQL is syntactically correct; parameter binding ($1, $2) matches array order [unit_id, datasheet_id]; same pattern used successfully in strategyNotes.ts
  timestamp: 2026-05-22

- hypothesis: FK constraint violation on unit_strategy_notes.unit_id
  evidence: unit_id comes from the currently-open unit (unit.id from UnitDetailSheet), which must exist in the units table. FK references units(id) ON DELETE CASCADE.
  timestamp: 2026-05-22

- hypothesis: Missing rw_* tables in rules.db causing getFullDatasheet to fail
  evidence: All 7 rw_* tables (rw_datasheets, rw_datasheet_models, rw_datasheet_abilities, rw_datasheet_keywords, rw_sources, rw_datasheets_wargear, rw_sync_meta) are created in rules_001_schema.sql and rules_002_wargear_abilities.sql; migrations registered in lib.rs
  timestamp: 2026-05-22

- hypothesis: Dynamic import of getFullDatasheet fails
  evidence: The module @/db/queries/datasheets is already partially loaded (upsertDatasheetLink is statically imported from it); Vite bundles resolve dynamic imports to already-loaded modules
  timestamp: 2026-05-22

- hypothesis: DatasheetPicker passes invalid datasheetId
  evidence: Picker renders items from useDatasheetsByFaction which SELECTs id, name, role FROM rw_datasheets; the ds.id is a valid Wahapedia TEXT primary key
  timestamp: 2026-05-22

- hypothesis: Parameter binding order mismatch in UPDATE SQL
  evidence: UPDATE uses $1 for unit_id in WHERE and $2 for datasheet_id in SET; params array is [unit_id, datasheet_id] which maps correctly
  timestamp: 2026-05-22

## Evidence

- timestamp: 2026-05-22
  checked: Error origin location
  found: PlaybookTab.tsx line 462 -- catch block in handlePickerSelect uses bare `catch (e)` but only shows generic toast, never logs `e` to console
  implication: The actual error (SQLite constraint, connection, runtime) is completely invisible

- timestamp: 2026-05-22
  checked: upsertDatasheetLink SQL correctness (datasheets.ts:144-163)
  found: SELECT-then-INSERT/UPDATE pattern; SQL is syntactically correct; param bindings match; no UNIQUE constraint on unit_id (by design)
  implication: SQL itself is unlikely to be the error source unless there's a runtime DB issue

- timestamp: 2026-05-22
  checked: getFullDatasheet query chain (datasheets.ts:63-103)
  found: 5 sequential queries to rules.db tables; all tables exist in migrations; results composed into FullDatasheet object
  implication: Could fail if rules.db is in a bad state or a table is somehow missing, but structurally correct

- timestamp: 2026-05-22
  checked: Prior debug session (faction-creation-fails.md)
  found: Identical anti-pattern -- generic catch block swallowing errors with "Something went wrong" toast. Resolution was to add console.error logging.
  implication: This is a known recurring pattern in the codebase; the fix is always to add error visibility first

- timestamp: 2026-05-22
  checked: Full handlePickerSelect code path
  found: try block spans lines 450-460: upsertDatasheetLink, invalidateQueries (not awaited), dynamic import, getFullDatasheet, null check, applyIncomingOrRouteConflicts. Any of these could throw and trigger the generic toast.
  implication: Without error logging, impossible to determine which step fails

- timestamp: 2026-05-23
  checked: useDatasheet hook error handling in PlaybookTab
  found: Line 65 destructures only `{ data: datasheet }` from useDatasheet -- error and isError are not captured. If getFullDatasheet throws inside the queryFn, React Query catches the error but the component never checks for it. `datasheet` stays undefined, `hasDatasheetLink` evaluates to false, and the UI silently shows "no datasheet linked" even when a link exists.
  implication: This is a secondary failure mode -- even if handlePickerSelect succeeds, subsequent datasheet loads that fail (due to rules.db issues) are invisible to the user.

- timestamp: 2026-05-23
  checked: Previous debug session fix status
  found: The previous session (status: awaiting_human_verify) said it added console.error logging, but the actual code still has bare `catch` blocks with no error variable. The fix was never committed -- subsequent refactoring in commit b799c2d (Phase 99-02) extracted sub-components but the catch blocks remained unchanged.
  implication: The diagnostic improvement from the previous session was lost; the fix needs to be applied fresh.

## Resolution

root_cause: Two-layer error invisibility problem in PlaybookTab.tsx: (1) Three bare `catch` blocks in handlePickerSelect, handleSave, and override save swallow all errors without logging or surfacing the actual message -- showing only generic toasts like "Failed to link datasheet -- try again." (2) The useDatasheet hook's error state is never checked by the component -- when getFullDatasheet throws (e.g., rules.db locked, table missing, connection error), the component silently shows the "no datasheet linked" UI instead of telling the user what happened. The previous debug session identified issue (1) but the fix was never committed.
fix: |
  1. Added `errorMessage()` helper to extract readable messages from unknown caught values.
  2. All three catch blocks now capture the error variable, log with console.error, and include the actual error message in the toast (e.g., "Failed to link datasheet: no such table: rw_datasheets").
  3. Destructured `error` from useDatasheet hook and added a visible error banner at the top of PlaybookTab when the datasheet query fails (red bordered box with the actual error message and guidance to re-sync).
  4. Updated test expectation to match new error toast format; added new test for error banner rendering.
verification: TypeScript check passes (tsc --noEmit). All 49 PlaybookTab tests pass (48 existing + 1 new error state test).
files_changed:
  - src/features/units/PlaybookTab.tsx
  - tests/collection/PlaybookTab.test.tsx
