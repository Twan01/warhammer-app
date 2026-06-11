---
phase: "124"
plan: "02"
subsystem: settings
tags: [data-management, export, import, factory-reset, settings]
dependency_graph:
  requires: [121-01, 121-02]
  provides: [data-management-tab, preference-export, preference-import, factory-reset-ui]
  affects: [settings-page]
tech_stack:
  added: []
  patterns: [alert-dialog-confirmation, file-dialog-save-open, json-export-import]
key_files:
  created:
    - src/features/settings/DataManagementTab.tsx
    - tests/settings/DataManagementTab.test.tsx
  modified:
    - src/app/settings/page.tsx
decisions:
  - AlertDialog with RESET confirmation phrase for factory reset safety
  - Preference export uses version 1 schema with settings map
  - Import validates version and settings structure before writing
metrics:
  duration: "6m 38s"
  completed: "2026-06-10"
---

# Phase 124 Plan 02: DataManagementTab Component Summary

DataManagementTab with four card sections: data health navigation, preference export/import via JSON files, and factory reset with typed confirmation dialog.

## What Was Built

### Task 1: DataManagementTab Component
Created `src/features/settings/DataManagementTab.tsx` with four Card sections:
1. **Data Health Link** — navigates to /data-health page
2. **Export Preferences** — saves app settings as versioned JSON file via Tauri save dialog
3. **Import Preferences** — reads JSON file, validates version/structure, upserts settings
4. **Factory Reset** — AlertDialog with "RESET" typed confirmation, invokes factory_reset command, clears localStorage, relaunches app

### Task 2: Settings Page Wiring
Replaced the Data tab placeholder in `src/app/settings/page.tsx` with the DataManagementTab component.

### Task 3: Unit Tests
Created 12 tests in `tests/settings/DataManagementTab.test.tsx`:
- DAT-01: Data Health rendering + navigation (2 tests)
- DAT-02: Factory Reset dialog flow, confirmation gating, invoke/relaunch, error handling (5 tests)
- DAT-03: Export save dialog + writeTextFile, cancel handling (2 tests)
- DAT-04: Import read/upsert, malformed JSON error, missing version error (3 tests)

## Verification

- `pnpm build` — passes (TypeScript check + Vite build)
- `pnpm test -- tests/settings/DataManagementTab.test.tsx` — 12/12 tests pass

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1-3 | 7c5bcb5 | feat(124-02): add DataManagementTab with export, import, factory reset |

## Self-Check: PASSED
