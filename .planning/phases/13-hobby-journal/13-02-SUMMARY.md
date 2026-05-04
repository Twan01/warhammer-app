---
phase: 13-hobby-journal
plan: "02"
subsystem: data-access
tags: [tanstack-query, sqlite, raw-sql, optimistic-delete, tauri-asset-url, tdd]
dependency_graph:
  requires: [13-01]
  provides: [useJournalSessions, useUnitPhotos, paintingSessions-queries, unitPhotos-queries]
  affects: [13-03, 13-04]
tech_stack:
  added: []
  patterns: [raw-SQL-getDb-pattern, optimistic-delete-onMutate-rollback, appDataDir-once-per-hook, convertFileSrc-per-row]
key_files:
  created:
    - src/db/queries/paintingSessions.ts
    - src/db/queries/unitPhotos.ts
    - src/hooks/useJournalSessions.ts
    - src/hooks/useUnitPhotos.ts
    - tests/hobby-journal/useJournalSessions.test.tsx
  modified:
    - tests/hobby-journal/paintingSessionQueries.test.ts
    - tests/hobby-journal/unitPhotoQueries.test.ts
decisions:
  - "useJournalSessions test file renamed .ts -> .tsx (JSX wrapper needs tsx extension — esbuild rejects JSX in .ts; same pattern as Phase 10-01)"
metrics:
  duration_minutes: 6
  tasks_completed: 2
  files_created: 5
  files_modified: 2
  tests_activated: 11
  completed_date: "2026-05-04"
---

# Phase 13 Plan 02: Data-Access Layer (Query Modules + Hooks) Summary

Raw-SQL CRUD query modules for `painting_sessions` and `image_assets (unit photos)`, plus TanStack Query hooks with the optimistic-delete pattern and asset URL derivation — 11 stub tests activated (all green).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | paintingSessions.ts + unitPhotos.ts query modules; flip 9 query tests | fbe3bc5 | src/db/queries/paintingSessions.ts (new), src/db/queries/unitPhotos.ts (new), tests/hobby-journal/paintingSessionQueries.test.ts, tests/hobby-journal/unitPhotoQueries.test.ts |
| 2 | useJournalSessions.ts + useUnitPhotos.ts hooks; flip 2 hook tests | bb18a6f | src/hooks/useJournalSessions.ts (new), src/hooks/useUnitPhotos.ts (new), tests/hobby-journal/useJournalSessions.test.tsx (new, renamed from .ts) |

## Artifacts Produced

### Query Modules

**`src/db/queries/paintingSessions.ts`** — Raw-SQL CRUD for `painting_sessions` table (JOUR-01/02/03 backbone)
- `getSessionsByUnit(unitId)` — `SELECT * ORDER BY session_date DESC, id DESC`
- `createSession(input)` — `INSERT` with `notes ?? null` coercion
- `deleteSession(id)` — `DELETE WHERE id = $1`

**`src/db/queries/unitPhotos.ts`** — Raw-SQL CRUD for `image_assets` where `entity_type = 'unit'` (JOUR-04/05/06 backbone)
- `getPhotosByUnit(unitId)` — `SELECT * ORDER BY taken_at DESC, id DESC`
- `getPhotoFilenamesByUnit(unitId)` — flat `string[]` of `file_path` values for JOUR-06 cleanup
- `createUnitPhoto(input)` — inserts `'unit'` literal as `entity_type`; caller passes `unit_id`
- `deleteUnitPhoto(id)` — `DELETE WHERE id = $1`

### Hook Modules

**`src/hooks/useJournalSessions.ts`** — TanStack Query wrappers for sessions
- `PAINTING_SESSIONS_KEY(unitId)` — `["painting-sessions", unitId]`
- `useJournalSessions(unitId)` — `staleTime: Infinity`
- `useCreatePaintingSession()` — invalidates on success
- `useDeletePaintingSession(unitId)` — optimistic `onMutate` remove, `onError` rollback + `toast.error`, `onSettled` invalidate

**`src/hooks/useUnitPhotos.ts`** — TanStack Query wrappers for unit photos with asset URL derivation
- `UNIT_PHOTOS_KEY(unitId)` — `["unit-photos", unitId]`
- `UnitPhotoWithUrl` — extends `UnitPhoto` with `assetUrl: string`
- `useUnitPhotos(unitId)` — `appDataDir()` resolved ONCE via `useEffect`/`useState`; `convertFileSrc(join(dir, file_path))` per row; `enabled: unitId !== undefined && appDir !== null`
- `useCreateUnitPhoto()` — invalidates on success
- `useDeleteUnitPhoto(unitId)` — optimistic delete pattern mirroring sessions hook

## Test Results

| File | Tests Activated | Status |
|------|----------------|--------|
| tests/hobby-journal/paintingSessionQueries.test.ts | 4 (JOUR-01 ×2, JOUR-02, JOUR-03) | All green |
| tests/hobby-journal/unitPhotoQueries.test.ts | 5 (JOUR-04 ×2, JOUR-04+06, JOUR-06 ×2) | All green |
| tests/hobby-journal/useJournalSessions.test.tsx | 2 (JOUR-03 optimistic + rollback) | All green |
| **Total activated this plan** | **11** | **0 failed** |

**Full suite:** 243 passing, 2 skipped (JournalTab Wave 0 stubs — handled by Plan 13-03), 0 failed.

**Cumulative Phase 13 active tests:** migration005 (4) + query modules (9) + hooks (2) = **15 active tests**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] useJournalSessions test file renamed .ts to .tsx**
- **Found during:** Task 2 test run
- **Issue:** Test uses JSX (`<QueryClientProvider>`) but had `.test.ts` extension; esbuild rejects JSX syntax in `.ts` files with "Expected '>' but found 'client'"
- **Fix:** Renamed `tests/hobby-journal/useJournalSessions.test.ts` to `tests/hobby-journal/useJournalSessions.test.tsx`
- **Files modified:** tests/hobby-journal/useJournalSessions.test.tsx (was .test.ts)
- **Commit:** bb18a6f
- **Note:** Exact same pattern documented in Phase 10-01 decisions ("Test file renamed .ts -> .tsx — JSX in wrapper requires tsx extension") — the plan referenced the old `.test.ts` filename in its acceptance criteria but the fix is canonical

## Self-Check: PASSED

Files verified:
- FOUND: src/db/queries/paintingSessions.ts
- FOUND: src/db/queries/unitPhotos.ts
- FOUND: src/hooks/useJournalSessions.ts
- FOUND: src/hooks/useUnitPhotos.ts
- FOUND: tests/hobby-journal/useJournalSessions.test.tsx

Commits verified:
- FOUND: fbe3bc5 (feat(13-02): create paintingSessions.ts + unitPhotos.ts query modules; flip 9 tests)
- FOUND: bb18a6f (feat(13-02): create useJournalSessions.ts + useUnitPhotos.ts hooks; flip 2 optimistic-delete tests)
