---
phase: 111-bilingual-infrastructure
plan: "02"
subsystem: unit-database
tags: [locale, i18n, zustand, react-query, sqlite, coalesce]
dependency_graph:
  requires: [111-01]
  provides: [locale-store, locale-aware-queries, locale-keyed-hooks]
  affects: [src/db/queries/unitDatabase.ts, src/hooks/useUnitDatabase.ts]
tech_stack:
  added: [src/stores/localeStore.ts]
  patterns: [zustand-persist, coalesce-sql-interpolation, locale-keyed-react-query]
key_files:
  created:
    - src/stores/localeStore.ts
    - tests/unit-database/locale-store.test.ts
    - tests/unit-database/locale-queries.test.ts
  modified:
    - src/db/queries/unitDatabase.ts
    - src/hooks/useUnitDatabase.ts
    - src/hooks/useDatasheet.ts
decisions:
  - "locale parameter is TypeScript 'en' | 'fr' union — safe for SQL template literal interpolation (no user input)"
  - "UDB_FACTIONS_KEY changed from const array to function accepting Locale — no external consumers"
  - "useDatasheet.ts queryFn wrapped in lambda to fix TypeScript overload error after getUdbFactions signature change"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-01"
  tasks_completed: 2
  files_changed: 6
---

# Phase 111 Plan 02: Locale Store + Bilingual Query Layer Summary

Zustand persist store for locale preference plus COALESCE-based SQL query layer giving all UDB-displaying surfaces automatic French name support when locale is 'fr'.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Locale store + COALESCE query extensions + tests | 22984f3 | src/stores/localeStore.ts, unitDatabase.ts, useUnitDatabase.ts, useDatasheet.ts, 2 test files |
| 2 | Thread locale into React Query hooks with key parameterization | 979c360 | src/hooks/useUnitDatabase.ts |

## What Was Built

**Locale store** (`src/stores/localeStore.ts`): Minimal Zustand persist store exporting `Locale = 'en' | 'fr'` type and `useLocaleStore` with `{ locale: 'en', setLocale }`. Persists to `localStorage` under key `"app:locale"`. Follows `gameDayStore.ts` persist pattern exactly.

**Locale-aware query layer** (`src/db/queries/unitDatabase.ts`): Three query functions extended with optional `locale?: 'en' | 'fr'` parameter:
- `getUdbFactions(locale?)` — `COALESCE(name_fr, name) AS name` when fr
- `getUdbUnitsByFaction(factionId, locale?)` — `COALESCE(u.name_fr, u.name) AS name` when fr
- `getUdbUnitDetail(unitId, locale?)` — three COALESCE points: unit name, ability name+description, weapon name

`searchUdbUnits` intentionally has NO locale param — FTS5 indexes both languages in one column.

**Locale-keyed hooks** (`src/hooks/useUnitDatabase.ts`): Key factories updated to functions accepting `Locale`. `useUdbFactions`, `useUdbUnits`, `useUdbUnitDetail` read locale from `useLocaleStore` and pass it to both key factory and query function — cache auto-refreshes on locale switch. `useUdbSearch`, `useUdbOwnership`, `useUdbKeywords` unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Build Blocker] Wrapped queryFn lambdas after signature change**
- **Found during:** Task 1 build verification
- **Issue:** `getUdbFactions` previously had no parameters; after adding `locale?`, TypeScript rejected `queryFn: getUdbFactions` in React Query's `useQuery` because it inferred the function as taking a `locale` arg but React Query passes a `QueryContext` object. Two sites affected: `useUnitDatabase.ts` and `useDatasheet.ts`.
- **Fix:** Changed `queryFn: getUdbFactions` → `queryFn: () => getUdbFactions()` (and matching lambda in `useDatasheet.ts`). Task 2 then correctly extended this to pass locale.
- **Files modified:** `src/hooks/useUnitDatabase.ts`, `src/hooks/useDatasheet.ts`
- **Commit:** 22984f3

**2. [Rule 3 - Test Fix] Fixed circular type annotation in locale-store.test.ts mock**
- **Found during:** Task 1 test compilation
- **Issue:** `vi.mock("zustand/middleware", () => ({ persist: (fn: Parameters<typeof fn>[0]) => fn }))` caused TS error `'fn' is referenced directly or indirectly in its own type annotation`.
- **Fix:** Changed to `persist: (fn: any) => fn` with eslint-disable comment.
- **Files modified:** `tests/unit-database/locale-store.test.ts`
- **Commit:** 22984f3

## Test Results

```
Test Files  2 passed (2)
     Tests  13 passed (13)
```

- `locale-store.test.ts`: 4 tests — defaults to 'en', setLocale to 'fr', setLocale back to 'en', type-level validation
- `locale-queries.test.ts`: 9 tests — COALESCE in SQL for fr, plain columns for en/omitted (factions, units, detail, search)

## Build Verification

`pnpm build` passes with zero TypeScript errors. Only pre-existing chunk size warnings (unrelated).

## Known Stubs

None — locale store initializes with real defaults, query COALESCE logic is fully wired.

## Threat Flags

None — locale is a TypeScript union `'en' | 'fr'` only; SQL interpolation uses conditional template literal, not user input.

## Self-Check: PASSED

- [x] `src/stores/localeStore.ts` — exists, exports `useLocaleStore` and `Locale`
- [x] `tests/unit-database/locale-store.test.ts` — exists, 4 tests pass
- [x] `tests/unit-database/locale-queries.test.ts` — exists, 9 tests pass
- [x] Commit `22984f3` — exists (Task 1)
- [x] Commit `979c360` — exists (Task 2)
- [x] `pnpm build` — passes cleanly
