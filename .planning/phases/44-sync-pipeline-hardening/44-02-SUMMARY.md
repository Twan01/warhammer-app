---
phase: 44-sync-pipeline-hardening
plan: "02"
subsystem: sync-pipeline
tags: [typescript, react-query, tauri-ipc, testing, sync, cache-invalidation]
dependency_graph:
  requires: [SyncResult, validateCsvHeaders, insertSyncError]
  provides: [useRulesSync-hardened, PlaybookTab-row-count-toast]
  affects: [useRulesSync, PlaybookTab]
tech_stack:
  added: []
  patterns: [typed-tauri-ipc, mutation-level-onError, cache-invalidation-exact-false, vi-hoisted]
key_files:
  created:
    - tests/datasheet/useRulesSync.test.ts
  modified:
    - src/hooks/useRulesSync.ts
    - src/features/units/PlaybookTab.tsx
decisions:
  - "mock.calls tuple types in tests use array types (T[]) not tuple types ([T]) for TypeScript strictness compatibility"
  - "vi.hoisted() used for insertSyncErrorMock to avoid hoisting ReferenceError with vi.mock factories"
  - "Toast shows 5 key table counts (datasheets, stratagems, abilities, wargear, keywords) not all 11 for conciseness"
metrics:
  duration: "8m"
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_changed: 3
requirements_completed: [SYNC-02, SYNC-05]
---

# Phase 44 Plan 02: Sync Pipeline Integration Summary

**One-liner:** useRulesSync now validates CSV headers before Rust invoke, receives typed SyncResult row counts from Rust, logs errors to hobbyforge.db, invalidates all 7 query keys on success, and PlaybookTab shows per-table row counts in the post-sync toast.

## What Was Built

Two integration tasks connecting the Plan 01 foundational artifacts to the live sync flow:

1. **useRulesSync hardening** (`src/hooks/useRulesSync.ts`) — Added `RustSyncResult` interface mirroring the Rust struct. Added `validateCsvHeaders()` calls for all 11 CSV files after parse and before Rust invoke (all-or-nothing abort on bad headers). Changed `invoke()` to `invoke<RustSyncResult>()` for typed IPC. Replaced client-side `.length` row counts with Rust `rows_affected()` counts from the return value. Expanded `onSuccess` from 3 to 7 `invalidateQueries()` calls — adds the 4 Phase 43 query keys (`stratagems-by-faction`, `detachments-by-faction`, `detachment-abilities`, `shared-abilities-by-faction`), all with `exact: false`. Added mutation-level `onError` that classifies errors (`fetch_failed`, `validation_error`, `sync_error`) and calls `insertSyncError()` fire-and-forget.

2. **PlaybookTab toast update** (`src/features/units/PlaybookTab.tsx`) — `handleSyncClick` `onSuccess` now receives `data` parameter and builds a summary string from `data.rowCounts` showing the 5 most user-relevant counts. Error toast now includes `err.message` for actionable feedback (e.g., "Factions.csv: missing required columns: name").

3. **Test suite** (`tests/datasheet/useRulesSync.test.ts`) — 5 passing tests covering SYNC-05 (7-key invalidation), SYNC-05 (Phase 43 keys use `exact: false`), SYNC-04 (validation_error classification), SYNC-04 (fetch_failed classification), SYNC-04 (sync_error default + null csv_file).

## Verification Results

- `pnpm vitest run tests/datasheet/useRulesSync.test.ts` — 5/5 tests pass
- `pnpm build` — TypeScript compilation succeeds, 2790+ modules built
- `pnpm test` — 124 test files pass, 0 failures (6 pre-existing skips unchanged)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 3cd0793 | feat(44-02): integrate validation, Rust counts, error logging, and cache invalidation into useRulesSync |
| Task 2 | b7002e8 | feat(44-02): update PlaybookTab handleSyncClick with row-count toast and fix test tuple types |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.hoisted() for test mock variable hoisting**
- **Found during:** Task 1 (test verification)
- **Issue:** `insertSyncErrorMock` declared as `const` before `vi.mock()` factory, but Vitest hoists `vi.mock()` calls to file top — causing `ReferenceError: Cannot access 'insertSyncErrorMock' before initialization`
- **Fix:** Replaced `const insertSyncErrorMock = vi.fn()` + separate `vi.mock()` with `vi.hoisted()` pattern wrapping both mocks
- **Files modified:** tests/datasheet/useRulesSync.test.ts
- **Commit:** b7002e8

**2. [Rule 1 - Bug] Fixed TypeScript tuple type errors in test mock.calls annotations**
- **Found during:** Task 2 (pnpm build verification)
- **Issue:** `mock.calls` has type `any[][]` — tuple types `[{ queryKey: string[] }]` are not assignable to `any[]`
- **Fix:** Changed tuple parameter types to array types `{ queryKey: string[] }[]` in map/filter callbacks
- **Files modified:** tests/datasheet/useRulesSync.test.ts
- **Commit:** b7002e8

## Self-Check: PASSED
