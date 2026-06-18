---
phase: 138-player-journey-depth
plan: "03"
subsystem: unit-database
tags: [collection, udb, deep-link, ownership, search, zustand, react-query, tdd]
dependency_graph:
  requires:
    - useUdbOwnership faction-scoped hook (Phase 105)
    - UdbUnitRow owned badge (Phase 105)
    - units mutations with ["udb-ownership"] invalidation (Phase 105)
    - collectionFilters Zustand store (prior phases)
    - applyUnitFilters pure function (prior phases)
    - UdbSearchResults component (Phase 104)
    - DatabaseBrowserPage ownershipMap (Phase 105)
  provides:
    - getOwnedCountsByUdbUnitId faction-agnostic GROUP BY query
    - useUdbOwnershipAll hook (staleTime 0, UDB_OWNERSHIP_ALL_KEY)
    - udbUnitIdFilter in collectionFilters + applyUnitFilters + CollectionPage
    - UdbUnitRow owned badge deep-links to /collection
    - UdbDatasheetSheet header owned badge deep-links to /collection
    - UdbSearchResults shows owned badges from ownershipAllMap
    - D-08 invalidation symmetry: all 3 units mutations invalidate ["udb-ownership-all"]
  affects:
    - src/db/queries/unitDatabase.ts
    - src/hooks/useUnitDatabase.ts
    - src/hooks/useUnits.ts
    - src/features/unit-database/UdbUnitRow.tsx
    - src/features/unit-database/UdbDatasheetSheet.tsx
    - src/features/unit-database/UdbSearchResults.tsx
    - src/features/unit-database/DatabaseBrowserPage.tsx
    - src/features/units/collectionFilters.ts
    - src/features/units/applyUnitFilters.ts
    - src/features/units/CollectionPage.tsx
    - tests/unit-database/udbOwnership.test.ts
    - tests/unit-database/UdbSearchResults.test.tsx
    - tests/collection/applyUnitFilters.test.ts
tech_stack:
  added: []
  patterns:
    - Faction-agnostic GROUP BY query (no JOIN, no params) for cross-faction ownership
    - Distinct query key ["udb-ownership-all"] with explicit per-mutation invalidation (D-08)
    - useCollectionFilters selector in UDB components for deep-link wiring
    - Page-level ownershipAllMap useMemo from useUdbOwnershipAll (no N+1)
    - TanStack Router Link + e.stopPropagation() in nested badge (parent has onClick)
key_files:
  created:
    - tests/unit-database/udbOwnership.test.ts
    - tests/unit-database/UdbSearchResults.test.tsx
    - tests/collection/applyUnitFilters.test.ts
  modified:
    - src/db/queries/unitDatabase.ts (getOwnedCountsByUdbUnitId)
    - src/hooks/useUnitDatabase.ts (useUdbOwnershipAll + UDB_OWNERSHIP_ALL_KEY)
    - src/hooks/useUnits.ts (D-08: ["udb-ownership-all"] invalidation in all 3 mutations)
    - src/features/units/collectionFilters.ts (udbUnitIdFilter + setUdbUnitIdFilter + clearAll)
    - src/features/units/applyUnitFilters.ts (udbUnitIdFilter clause in UnitFiltersInput + filter)
    - src/features/units/CollectionPage.tsx (read udbUnitIdFilter + pass to applyUnitFilters)
    - src/features/unit-database/UdbUnitRow.tsx (Link-wrapped owned badge + setUdbUnitIdFilter)
    - src/features/unit-database/UdbDatasheetSheet.tsx (Link-wrapped header owned badge)
    - src/features/unit-database/UdbSearchResults.tsx (ownershipAllMap prop + badges)
    - src/features/unit-database/DatabaseBrowserPage.tsx (useUdbOwnershipAll + ownershipAllMap)
    - tests/collection/addToCollectionFlow.test.tsx (Rule 1: router + collectionFilters mocks)
    - tests/navigation/rulesUnitCrossLinks.test.tsx (Rule 1: useUdbOwnershipAll mock)
decisions:
  - getOwnedCountsByUdbUnitId is parameterless (no user input, no injection surface — T-138-05)
  - ["udb-ownership-all"] key is distinct from ["udb-ownership", factionId] prefix — requires explicit invalidation per D-08 (PITFALL #9)
  - UdbDatasheetSheet Link does NOT call e.stopPropagation() — the sheet owns full-screen and navigating away closes it naturally (no parent click conflict)
  - UdbUnitRow Link calls e.stopPropagation() — parent div has onClick={onOpen}, nested Link must stop propagation
  - ownershipAllMap lives in DatabaseBrowserPage (page-level useMemo) — no per-row hooks, coexists with faction-scoped ownershipMap
metrics:
  duration_seconds: 1200
  completed_date: "2026-06-18"
  tasks_completed: 5
  files_modified: 12
---

# Phase 138 Plan 03: PLAY-04 Deep-Link + Search Ownership Summary

Closed the two confirmed PLAY-04 gaps: (D-06) owned-count badges now deep-link into the Collection pre-filtered to that unit, and (D-07) cross-faction search results show owned badges from a faction-agnostic ownership Map. Added D-08 invalidation symmetry so owned counts never go stale. No shipped flow was rebuilt (D-05 audit-not-rebuild honored).

## Task 1 Verification Notes (D-05 — shipped flows confirmed working)

1. **Owned-count badge populates from ownershipMap** — WORKING. `DatabaseBrowserPage:88-97` builds `ownershipMap` from `useUdbOwnership(selectedFactionId)` entries and passes it to `UdbUnitList` → `UdbUnitRow.ownershipData`. The badge renders when `owned_count > 0`. Confirmed by existing tests (all green at baseline: 2858 tests).

2. **Collection → "View Datasheet"** — WORKING. `UnitDetailSheet.tsx:108-126` navigates to `/unit-database?udbUnitId=...` when `unit.udb_unit_id` is set; `DatabaseBrowserPage` consumes the route search param and auto-opens the datasheet.

3. **UDB → "Add to Collection"** — WORKING. `UdbDatasheetSheet.onAddToCollection` calls `DatabaseBrowserPage.handleAddToCollection`, which auto-matches via `wahapedia_faction_id` or shows `FactionLinkDialog`, then opens `UnitSheet` pre-filled with `udb_unit_id`.

4. **units mutations invalidate `["udb-ownership"]`** — WORKING. All three `useUnits.ts` mutations (create/update/delete) call `qc.invalidateQueries({ queryKey: ["udb-ownership"] })` at lines 49, 74, 94. (D-08 gap found: `["udb-ownership-all"]` was not present — closed in Task 3.)

## What Was Built

**Task 2 (TDD RED):** Created three test files:
- `tests/unit-database/udbOwnership.test.ts` — 5 assertions: GROUP BY, WHERE IS NOT NULL, no faction JOIN, no params, correct return shape.
- `tests/unit-database/UdbSearchResults.test.tsx` — 6 assertions: badge renders from ownershipAllMap, absent without map, scoped to matching unit, badge is Link to /collection.
- `tests/collection/applyUnitFilters.test.ts` — 6 assertions: null/undefined no-op, filter match, null udb_unit_id excluded, empty result, composes with other filters.
All 13 new tests RED as expected.

**Task 3 (GREEN — query + hook + D-08):**
- `getOwnedCountsByUdbUnitId()`: parameterless `SELECT ... GROUP BY u.udb_unit_id WHERE u.udb_unit_id IS NOT NULL` over the local `units` table; no JOIN to `udb_units` (faction-agnostic); reuses `UdbOwnershipEntry` type.
- `useUdbOwnershipAll()`: `queryKey: ["udb-ownership-all"]`, `queryFn: getOwnedCountsByUdbUnitId`, `staleTime: 0` (dynamic ownership data, per PITFALL #3).
- D-08: Added `qc.invalidateQueries({ queryKey: ["udb-ownership-all"] })` to all three `useUnits.ts` mutations (create, update, delete) alongside the existing `["udb-ownership"]` invalidation.

**Task 4 (GREEN — Collection filter wiring):**
- `collectionFilters.ts`: added `udbUnitIdFilter: string | null`, `setUdbUnitIdFilter(id)` action, and `udbUnitIdFilter: null` in `clearAll()` reset.
- `applyUnitFilters.ts`: added `udbUnitIdFilter?: string | null` to `UnitFiltersInput`; first filter clause: `if (filters.udbUnitIdFilter && unit.udb_unit_id !== filters.udbUnitIdFilter) return false`.
- `CollectionPage.tsx`: added `const udbUnitIdFilter = useCollectionFilters((s) => s.udbUnitIdFilter)` selector; passed `udbUnitIdFilter` into `applyUnitFilters` filters object AND the `useMemo` dependency array. This is the critical D-06 call site wiring.

**Task 5 (GREEN — deep links + search badges):**
- `UdbUnitRow.tsx`: imported `Link` from `@tanstack/react-router` and `useCollectionFilters`; wrapped owned `Badge` in `<Link to="/collection" onClick={(e) => { e.stopPropagation(); setUdbUnitIdFilter(unit.id); }}>` with aria-label; added `hover:bg-secondary cursor-pointer` to badge className.
- `UdbDatasheetSheet.tsx`: same Link treatment for header owned badge (no stopPropagation needed — sheet unmounts on route change).
- `UdbSearchResults.tsx`: added `ownershipAllMap?: Map<string, ...>` prop; per-result lookup `ownershipAllMap?.get(result.unit_id)` renders owned badge Link when `owned_count > 0`; imported `Link` + `useCollectionFilters`.
- `DatabaseBrowserPage.tsx`: called `useUdbOwnershipAll()`, built `ownershipAllMap` useMemo (mirrors existing `ownershipMap` pattern), passed `ownershipAllMap={ownershipAllMap}` to `<UdbSearchResults />`. Faction-scoped `ownershipMap`/`useUdbOwnership` flow left untouched (coexist per D-07/RESEARCH OQ#3).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] addToCollectionFlow.test.tsx broke after UdbDatasheetSheet got Link + useCollectionFilters**
- **Found during:** Task 5
- **Issue:** `UdbDatasheetSheet` now imports `Link` from `@tanstack/react-router` and `useCollectionFilters` from the collection store. The existing test had neither mocked, causing `TypeError: Cannot read properties of null (reading 'isServer')` (TanStack Router context error).
- **Fix:** Added `vi.mock("@tanstack/react-router", ...)` and `vi.mock("@/features/units/collectionFilters", ...)` to `tests/collection/addToCollectionFlow.test.tsx`.
- **Files modified:** `tests/collection/addToCollectionFlow.test.tsx`
- **Commit:** df0c1150

**2. [Rule 1 - Bug] rulesUnitCrossLinks.test.tsx crashed on useUdbOwnershipAll**
- **Found during:** Task 5 (DatabaseBrowserPage now calls useUdbOwnershipAll)
- **Issue:** `rulesUnitCrossLinks.test.tsx` renders `DatabaseBrowserPage` in integration. It mocks `@/hooks/useUnitDatabase` but the mock did not include `useUdbOwnershipAll`, causing: `[vitest] No "useUdbOwnershipAll" export is defined on the "@/hooks/useUnitDatabase" mock`.
- **Fix:** Added `useUdbOwnershipAll: vi.fn(() => ({ data: [] }))` to the mock.
- **Files modified:** `tests/navigation/rulesUnitCrossLinks.test.tsx`
- **Commit:** df0c1150

## TDD Gate Compliance

- RED gate: `test(138-03): add failing tests for ownership-all + search badges + collection filter` — commit 4eaef2f6
- GREEN gate (query/hook/D-08): `feat(138-03): add getOwnedCountsByUdbUnitId + useUdbOwnershipAll + D-08 invalidation` — commit c52a9de7
- GREEN gate (collection filter): `feat(138-03): Collection deep-link filter — collectionFilters + applyUnitFilters + CollectionPage` — commit 4e000469
- GREEN gate (deep links + search): `feat(138-03): owned-badge deep links + search ownership wiring (PLAY-04 D-06/D-07)` — commit df0c1150

All RED/GREEN gates satisfied.

## Known Stubs

None — all features are fully wired end-to-end.

## Security

- T-138-05 (SQL injection): `getOwnedCountsByUdbUnitId` is parameterless, static SELECT aggregate — zero injection surface.
- T-138-06 (stale owned counts): mitigated. `useUdbOwnershipAll` uses `staleTime: 0` AND all three units mutations explicitly invalidate `["udb-ownership-all"]` (D-08).
- T-138-07 (info disclosure): accepted. Deep link navigates within the local app to the user's own collection — no new data exposure.

## Threat Flags

None — plan is pure client-side, no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `src/db/queries/unitDatabase.ts` — contains `getOwnedCountsByUdbUnitId`, `GROUP BY u.udb_unit_id`, `WHERE u.udb_unit_id IS NOT NULL`, no `JOIN udb_units`
- `src/hooks/useUnitDatabase.ts` — contains `useUdbOwnershipAll`, `UDB_OWNERSHIP_ALL_KEY`, `staleTime: 0`
- `src/hooks/useUnits.ts` — contains `["udb-ownership-all"]` ×3 (one per mutation)
- `src/features/units/collectionFilters.ts` — contains `udbUnitIdFilter`, `setUdbUnitIdFilter`, `udbUnitIdFilter: null` in clearAll
- `src/features/units/applyUnitFilters.ts` — contains `udbUnitIdFilter` in interface + filter clause
- `src/features/units/CollectionPage.tsx` — contains `udbUnitIdFilter` (selector + passed into applyUnitFilters + in useMemo deps)
- `src/features/unit-database/UdbUnitRow.tsx` — contains `setUdbUnitIdFilter`, `Link to="/collection"`, `e.stopPropagation()`
- `src/features/unit-database/UdbDatasheetSheet.tsx` — contains `Link` (owned badge), `setUdbUnitIdFilter`
- `src/features/unit-database/UdbSearchResults.tsx` — contains `ownershipAllMap`, badge renders from it
- `src/features/unit-database/DatabaseBrowserPage.tsx` — contains `useUdbOwnershipAll`, `ownershipAllMap`, passed to UdbSearchResults
- Tests: 2876 passed (up from 2858 baseline + 18 new passing tests)
- Build: `pnpm build` clean (no TS errors; existing chunk-size warning only)
- Commits: 4eaef2f6 (RED), c52a9de7 (GREEN query), 4e000469 (GREEN filter), df0c1150 (GREEN deep links)
