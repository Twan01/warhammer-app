---
phase: 03-collection-module
plan: 01
subsystem: ui
tags: [tanstack-table, zustand, react-table, optimistic-update, table, shadcn, vitest]

# Dependency graph
requires:
  - phase: 03-00
    provides: vitest + testing-library infra, Wave 0 stub test files
  - phase: 02-data-layer-entity-crud
    provides: useUnits, useFactions, useUpdateUnit, UNITS_KEY, Unit/Faction types, shadcn UI components

provides:
  - "@tanstack/react-table 8.21.3 and zustand 5.0.12 installed in package.json"
  - "useCollectionFilters Zustand store (collectionFilters.ts) — ephemeral filter state"
  - "StatusPopover component — optimistic status badge + Popover+Command list with rollback"
  - "CollectionEmptyState component — two-mode empty state (no-data / filtered)"
  - "UnitTableColumns (buildColumns) — 9-column ColumnDef array with SortableHeader"
  - "UnitTable — TanStack Table v8 rendering engine with skeleton loading + pagination"

affects:
  - 03-02 (filter wiring — consumes useCollectionFilters and passes pre-filtered data to UnitTable)
  - 03-03 (detail drawer — consumes UnitTable.onRowClick, StatusPopover pattern)
  - 03-04 (page assembly — imports UnitTable as the primary page component)

# Tech tracking
tech-stack:
  added:
    - "@tanstack/react-table 8.21.3 — headless table engine (sorting, pagination, column defs)"
    - "zustand 5.0.12 — ephemeral filter state store (no Provider, no persist middleware)"
  patterns:
    - "pre-filter pattern: Zustand filter values applied to Unit[] before useReactTable receives data"
    - "optimistic cache update: getQueryData snapshot → setQueryData patch → mutate with onError rollback"
    - "buildColumns factory: factionMap + callbacks passed at construction; StatusPopover in status cell"
    - "SortableHeader generic helper: ChevronUp/Down/ChevronsUpDown toggle on sort state"
    - "5 Skeleton rows for loading state; CollectionEmptyState in empty TableCell"

key-files:
  created:
    - src/features/units/collectionFilters.ts
    - src/features/units/StatusPopover.tsx
    - src/features/units/CollectionEmptyState.tsx
    - src/features/units/UnitTableColumns.tsx
    - src/features/units/UnitTable.tsx
    - tests/collection/UnitTable.test.tsx
  modified:
    - package.json (added @tanstack/react-table, zustand)
    - pnpm-lock.yaml
    - tests/collection/collectionFilters.test.ts (replaced it.skip stubs with real assertions)

key-decisions:
  - "UNITS_KEY passed to setQueryData directly (readonly [\"units\"] accepted by TanStack Query QueryKey — no cast needed)"
  - "UnitTable receives pre-filtered data prop — filter logic lives in plan 03-02; table is a pure rendering engine"
  - "UnitTable.test.tsx (not .ts) — JSX required for render(); old UnitTable.test.ts stub deleted to avoid duplicate suite runs"
  - "buildColumns signature: (factionMap, onDelete, onEdit) — onRowClick handled at TableRow level in UnitTable, not passed to columns"

patterns-established:
  - "Optimistic status update: getQueryData snapshot + setQueryData patch + mutate onError rollback (Pattern 4 verbatim)"
  - "Faction color badge: <Badge style={{ backgroundColor: faction.color_theme }} data-testid='faction-badge'>"
  - "SortableHeader<T> generic button: toggleSorting(sorted === 'asc'), aria-label with sort direction"
  - "Empty state: CollectionEmptyState mode='no-data' | mode='filtered' with onAdd / onClearFilters callbacks"

requirements-completed: [COLL-01, COLL-07, COLL-10, COLL-11, COLL-12, POLISH-02, POLISH-03, POLISH-05]

# Metrics
duration: 4min
completed: 2026-05-01
---

# Phase 03 Plan 01: Collection Table Engine Summary

**TanStack Table v8 rendering engine with Zustand filter store, optimistic StatusPopover, faction-color badges, skeleton loading, and two-mode empty state — the composable foundation for plan 03-02 (filter wiring) and 03-04 (page assembly)**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-01T07:20:58Z
- **Completed:** 2026-05-01T07:25:00Z
- **Tasks:** 3
- **Files modified:** 8 (5 created, 2 updated, 1 deleted)

## Accomplishments

- Installed `@tanstack/react-table` 8.21.3 and `zustand` 5.0.12; Zustand store with 6 setters/togglers backed by 7 passing unit tests
- StatusPopover with full optimistic cache update + rollback via `queryClient.setQueryData` — sends only `{ id, status_painting }` (COALESCE-safe)
- UnitTable with 9-column definition, sortable headers, 25-row pagination, 5-skeleton loading state, and two-mode CollectionEmptyState — backed by 4 passing render tests

## Installed Versions

| Package | Version |
|---------|---------|
| `@tanstack/react-table` | 8.21.3 |
| `zustand` | 5.0.12 |

## Task Commits

1. **Task 1: Install deps + build collectionFilters store** - `fb6bad7` (feat)
2. **Task 2: Build StatusPopover** - `5bf7f94` (feat)
3. **Task 3: CollectionEmptyState + UnitTableColumns + UnitTable + tests** - `696593a` (feat)

## Test Results

| Suite | Passed | Skipped | Failed |
|-------|--------|---------|--------|
| collectionFilters.test.ts | 7 | 0 | 0 |
| UnitTable.test.tsx | 4 | 0 | 0 |
| **Total (plan 03-01 scope)** | **11** | **0** | **0** |

Wave 0 stubs in `StatusPopover.test.ts` and `unitFilters.test.ts` remain skipped (filled in plans 03-02/03-03).

## Files Created/Modified

- `src/features/units/collectionFilters.ts` — Zustand store: `useCollectionFilters` with `search`, `factions[]`, `statuses[]`, `categories[]`, `activeOnly` + 6 setters/togglers
- `src/features/units/StatusPopover.tsx` — Props: `{ unit: Unit }`. Renders `<Badge variant="outline">` trigger + Popover+Command list of `PAINTING_STATUS_ORDER`. Optimistic `setQueryData` update + `toast.error` rollback on `onError`
- `src/features/units/CollectionEmptyState.tsx` — Props: `{ mode: "no-data" | "filtered"; onAdd?; onClearFilters? }`. Two modes with exact UI-SPEC copywriting
- `src/features/units/UnitTableColumns.tsx` — Exports `buildColumns(factionMap, onDelete, onEdit): ColumnDef<Unit>[]`. 9 columns: name, faction, category, status_painting, painting_percentage, points, model_count, active, actions. `SortableHeader<T>` helper at top
- `src/features/units/UnitTable.tsx` — Props: `{ data, factions, isLoading, hasActiveFilters, onRowClick, onAdd, onEdit, onDelete, onClearFilters }`. Default sort: name asc; pageSize: 25
- `tests/collection/collectionFilters.test.ts` — Replaced 7 `it.skip` stubs with real Zustand state assertions
- `tests/collection/UnitTable.test.tsx` — New file (JSX); 4 tests covering POLISH-02, COLL-12 x2, POLISH-05
- `tests/collection/UnitTable.test.ts` — Deleted (replaced by .tsx to support JSX)

## TypeScript Decisions

- `UNITS_KEY` (type `readonly ["units"]`) passed directly to `qc.getQueryData<Unit[]>()` and `qc.setQueryData<Unit[]>()` — TanStack Query v5 accepts `readonly string[]` as `QueryKey`; no `as unknown as readonly unknown[]` cast required
- `buildColumns` signature uses `(factionMap, onDelete, onEdit)` — `onRowClick` is wired at `TableRow` level inside `UnitTable`, keeping columns free of row-navigation concerns

## Decisions Made

- UnitTable is a pure rendering engine — accepts pre-filtered `data: Unit[]` prop. No Zustand filter reads inside UnitTable itself. Filter application lives in plan 03-02 (CollectionPage)
- `UnitTable.test.tsx` required `.tsx` extension (JSX for `<QueryClientProvider>` wrapper); old `.ts` stub deleted to prevent duplicate suite execution
- `buildColumns` does not receive `onRowClick` — row click is a `TableRow.onClick` concern at the UnitTable level, not a column-level concern

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Open Items for Consumers

**Plan 03-02 (filter wiring):**
- Import `useCollectionFilters` to derive `filteredUnits` via `useMemo` (Pattern 2 from RESEARCH.md)
- Pass `filteredUnits` as `data` prop to `UnitTable`
- Pass `hasActiveFilters` derived from `factions.length + statuses.length + categories.length + (activeOnly ? 1 : 0) > 0`

**Plan 03-03 (UnitDetailSheet):**
- `StatusPopover` is already built — reuse directly in the detail Sheet (same `unit: Unit` prop interface)
- Avoid mounting `UnitSheet` inside `SheetContent` — use sibling Portal pattern (Pitfall 4)

**Plan 03-04 (page assembly):**
- `UnitTable` exports are stable; import from `@/features/units/UnitTable`
- `CollectionEmptyState` is embedded inside `UnitTable` — no direct import needed from CollectionPage

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 5 new source files are importable and TypeScript-clean
- 11 tests passing, 0 failures
- Plan 03-02 can immediately consume `useCollectionFilters` + `UnitTable` without modification

---
*Phase: 03-collection-module*
*Completed: 2026-05-01*
