---
phase: 138-player-journey-depth
plan: "01"
subsystem: unit-database
tags: [query, react-query, zustand, routing, tdd]
dependency_graph:
  requires: []
  provides:
    - getUdbUnitsByIds batch query
    - useUdbUnitsByIds hook
    - compareIds Zustand store (cap-3)
    - /unit-database/compare route
  affects:
    - src/db/queries/unitDatabase.ts
    - src/hooks/useUnitDatabase.ts
    - src/features/unit-database/databaseBrowserFilters.ts
    - src/app/router.tsx
tech_stack:
  added: []
  patterns:
    - WHERE id IN ($1,$2,...) positional placeholders for batched canonical query
    - Sorted-array React Query key for Set-backed Zustand state
    - Flat sibling route under layoutRoute (no Outlet refactor)
key_files:
  created:
    - tests/unit-database/compareFilters.test.ts
    - src/features/unit-database/UnitComparePage.tsx (stub — replaced in 138-02)
  modified:
    - src/db/queries/unitDatabase.ts
    - src/hooks/useUnitDatabase.ts
    - src/features/unit-database/databaseBrowserFilters.ts
    - src/app/router.tsx
    - tests/unit-database/unitDatabase.queries.test.ts
decisions:
  - Flat sibling /unit-database/compare route under layoutRoute (no Outlet refactor) — confirmed RESEARCH.md finding #1
  - compareIds held in databaseBrowserFilters Zustand store (not URL params) — consistent with project ephemeral-filter pattern
  - clearFilters does NOT reset compareIds — selection is independent of search/faction (PITFALL #5)
  - UnitComparePage.tsx stub committed now so router.tsx lazy import resolves; full component in 138-02
metrics:
  duration_seconds: 562
  completed_date: "2026-06-18"
  tasks_completed: 3
  files_modified: 6
---

# Phase 138 Plan 01: Batch Query + Compare Store + Route Foundation Summary

Batch multi-id UDB query with positional `$1,$2,...` IN-clause, stable sorted-array React Query key, cap-3 Zustand compare store, and flat sibling `/unit-database/compare` route stub.

## What Was Built

**Task 1 (TDD RED):** Added `getUdbUnitsByIds` describe block (4 tests: empty short-circuit, batch-of-2, positional placeholder assertion, missing-id tolerance) to `unitDatabase.queries.test.ts`. Created `compareFilters.test.ts` with 9 tests covering `addToCompare` (cap-3 hard cap), `removeFromCompare`, and `clearCompare` actions via Zustand `getState()`/`setState()`. Both sets failed as expected (RED).

**Task 2 (GREEN — batch query):** Added `getUdbUnitsByIds(ids: string[], locale?: "en" | "fr"): Promise<UdbUnitDetail[]>` to `src/db/queries/unitDatabase.ts`. Guards with early `return []` for empty input. Builds positional placeholders from the ids array index — ids are never string-interpolated (T-138-01 mitigation). For each returned unit row, runs the identical 6 sub-queries as `getUdbUnitDetail` via `Promise.all`. Returns `UdbUnitDetail[]` reusing the existing type. All 4 query tests GREEN.

**Task 3 (GREEN — hook + store + route):** Added `UDB_UNITS_BY_IDS_KEY` and `useUdbUnitsByIds` to `useUnitDatabase.ts` with sorted-array key (`[...ids].sort()` for stable cache identity from a Zustand `Set`), `staleTime: Infinity`, `gcTime: Infinity`, `enabled: ids.length > 0`. Extended `databaseBrowserFilters.ts` with `compareIds: Set<string>` + `addToCompare` (hard cap `>= 3`), `removeFromCompare`, `clearCompare` — all three create a new Set before mutating so Zustand sees a fresh reference. `clearFilters` left unchanged (compare selection independent). Registered `/unit-database/compare` as a flat sibling route under `layoutRoute` with a lazy-imported stub `UnitComparePage` (returns null). All 9 compareFilters tests GREEN. Build clean.

## Deviations from Plan

### Auto-added — Stub Component

**[Rule 3 - Blocking] Created UnitComparePage.tsx stub for router.tsx lazy import**
- **Found during:** Task 3
- **Issue:** The plan's Task 3 note correctly anticipated that `UnitComparePage.tsx` does not exist (138-02 creates it); the lazy import in router.tsx would fail TypeScript resolution without a stub.
- **Fix:** Created a minimal stub (`export function UnitComparePage() { return null }`) so the lazy dynamic import resolves at build time.
- **Files modified:** `src/features/unit-database/UnitComparePage.tsx` (new, stub)
- **Commit:** b9f6af0e
- **Resolution:** 138-02 will replace this stub with the full column rendering implementation.

## TDD Gate Compliance

- RED gate: `test(138-01): add failing tests for batch query + compare store` — commit c8750f16
- GREEN gate (batch query): `feat(138-01): add getUdbUnitsByIds batch query` — commit 44306579
- GREEN gate (hook + store + route): `feat(138-01): add useUdbUnitsByIds hook + compareIds store + compare route` — commit b9f6af0e

All three RED/GREEN gates satisfied.

## Security

T-138-01 (SQL injection via IN-clause): mitigated. `getUdbUnitsByIds` builds `$1, $2, ...` placeholders from array indices and binds the `ids` array as parameters. No id value appears in the SQL string. Grep confirmed:

```
WHERE id IN (${placeholders})   ← only the placeholder string, not ids
db.select(..., ids)             ← ids bound as parameters
```

## Known Stubs

| File | Description |
|------|-------------|
| `src/features/unit-database/UnitComparePage.tsx` | Stub returning `null` — full UI implemented in 138-02 |

## Self-Check: PASSED

- `tests/unit-database/compareFilters.test.ts` — exists, 9 tests, all GREEN
- `tests/unit-database/unitDatabase.queries.test.ts` — `getUdbUnitsByIds` describe block with 4 tests, all GREEN
- `src/db/queries/unitDatabase.ts` — `getUdbUnitsByIds` exported, positional params confirmed
- `src/hooks/useUnitDatabase.ts` — `useUdbUnitsByIds` + `UDB_UNITS_BY_IDS_KEY` exported
- `src/features/unit-database/databaseBrowserFilters.ts` — `compareIds` + 3 actions present
- `src/app/router.tsx` — `/unit-database/compare` route registered in `layoutRoute.addChildren`
- Build: clean (`pnpm build` passes, no TS errors)
- Commits: c8750f16, 44306579, b9f6af0e — all verified in git log
