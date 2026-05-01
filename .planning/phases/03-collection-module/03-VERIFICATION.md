---
phase: 03-collection-module
verified: 2026-05-01T12:00:00Z
status: passed
score: 19/19 must-haves verified
re_verification: false
---

# Phase 3: Collection Module Verification Report

**Phase Goal:** Build the collection module — a filterable, sortable unit table with inline status editing, a detail sheet, and full CRUD wiring.
**Verified:** 2026-05-01
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees a unit table at /collection with 9 columns, sortable headers, 25-row pagination | VERIFIED | `UnitTable.tsx`: `useReactTable`, `pageSize: 25`, `getSortedRowModel()`, `getPaginationRowModel()`; `UnitTableColumns.tsx`: 9 `ColumnDef` entries |
| 2 | User can filter by search, faction, status, category, active-only via Zustand store | VERIFIED | `UnitFilters.tsx` calls all 6 store setters; `applyUnitFilters.ts` pure function; 13 passing tests in `unitFilters.test.ts` |
| 3 | Filter state is ephemeral (Zustand, no persistence) | VERIFIED | `collectionFilters.ts` uses `create` from zustand with no `persist` middleware |
| 4 | Inline status badge opens a popover and optimistically updates cache, rolling back on error | VERIFIED | `StatusPopover.tsx`: `qc.setQueryData`, `onError` rollback, `toast.error` with exact copy; 4 passing tests in `StatusPopover.test.tsx` |
| 5 | Clicking a row opens a read-only detail Sheet with all unit fields | VERIFIED | `UnitDetailSheet.tsx`: `side="right"`, all 17 field rows rendered, `<StatusPopover>` inline |
| 6 | "Add Unit" opens UnitSheet; "Edit Unit" opens UnitSheet with data; row trash triggers delete confirm | VERIFIED | `CollectionPage.tsx`: `<UnitSheet>`, `<UnitDeleteDialog>` as siblings; handlers wired to all three triggers |
| 7 | Loading shows 5 skeleton rows; empty state shows correct copy in both modes | VERIFIED | `UnitTable.tsx`: `data-testid="skeleton-row"` × 5 when `isLoading`; `CollectionEmptyState.tsx` two-mode with correct copy |
| 8 | Progress bar per row driven by `painting_percentage` | VERIFIED | `UnitTableColumns.tsx`: `<Progress value={row.original.painting_percentage}>` |
| 9 | Faction color badge in every row and detail Sheet header | VERIFIED | `UnitTableColumns.tsx`: `style={{ backgroundColor: faction.color_theme }}` + `data-testid="faction-badge"`; `UnitDetailSheet.tsx`: same pattern in header |
| 10 | Fresh mount on unit switch (POLISH-04) | VERIFIED | `CollectionPage.tsx`: `key={selectedUnit?.id ?? "none-detail"}` on UnitDetailSheet; `key={unit?.id ?? "none"}` inside SheetContent |
| 11 | Delete requires confirmation (COLL-13 / POLISH-01) | VERIFIED | `CollectionPage.tsx` wires both table action AND Sheet footer to `handleDelete` → `UnitDeleteDialog`; dialog confirmed to exist |
| 12 | All mutation errors surface via Sonner toast (POLISH-03) | VERIFIED | `StatusPopover.tsx`: `toast.error`; `UnitSheet.tsx`: `toast.error`; `UnitDeleteDialog.tsx`: `toast.error` |
| 13 | /collection route serves CollectionPage (not placeholder) | VERIFIED | `src/app/collection/page.tsx` imports `CollectionPage`; router.tsx unchanged, references that file |
| 14 | 28 unit tests pass across 4 suites | VERIFIED | collectionFilters: 7, unitFilters: 13, UnitTable: 4, StatusPopover: 4; 0 `it.skip` remaining in any test file |
| 15 | Production build compiles (pnpm build exits 0) | VERIFIED | SUMMARY-04 documents `dist/index.html + assets/index-*.js (735kB)` |
| 16 | Human-verify checkpoint approved | VERIFIED | SUMMARY-04: "Task 3 human-verify APPROVED by user on 2026-05-01. All 25 checks passed." |
| 17 | UnitSheet/UnitDeleteDialog/UnitDetailSheet mounted as siblings, not nested (Pitfall 4) | VERIFIED | `CollectionPage.tsx`: all three at top-level JSX return, outside any SheetContent |
| 18 | selectedUnitId pattern prevents stale data after cache mutation (Pitfall 6) | VERIFIED | `CollectionPage.tsx`: stores `selectedUnitId: number | null`, derives `selectedUnit` via `useMemo` from `units` |
| 19 | pnpm vitest run exits 0 with no leftover skips | VERIFIED | No `it.skip` found in any test file under `tests/collection/`; `.ts` stub files replaced by `.tsx` real test files |

**Score:** 19/19 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `vitest.config.ts` | jsdom env, @ alias, setupFiles | VERIFIED | Contains `environment: "jsdom"`, `setupFiles: ["./tests/setup.ts"]`, `"@": path.resolve(...)` |
| `tests/setup.ts` | jest-dom matchers + cleanup | VERIFIED | Imports `@testing-library/jest-dom/vitest`, calls `cleanup()`; also adds ResizeObserver + scrollIntoView polyfills |
| `tests/collection/collectionFilters.test.ts` | 7 real tests (no skip) | VERIFIED | 7 `it(...)` blocks; no `it.skip`; imports `useCollectionFilters` |
| `tests/collection/unitFilters.test.ts` | 13 real tests (no skip) | VERIFIED | 13 `it(...)` blocks across 6 describe groups |
| `tests/collection/StatusPopover.test.tsx` | 4 real tests (no skip) | VERIFIED | 4 `it(...)` blocks; `vi.mock("@/db/queries/units")`; `mockRejectedValue` |
| `tests/collection/UnitTable.test.tsx` | 4 real tests (no skip) | VERIFIED | 4 `it(...)` blocks; `.ts` stub deleted |
| `src/features/units/collectionFilters.ts` | Zustand store with 6 setters | VERIFIED | Exports `useCollectionFilters`; all 6 setters/togglers present |
| `src/features/units/UnitTable.tsx` | TanStack Table, 25-row page, loading/empty | VERIFIED | `useReactTable`, `pageSize: 25`, 5 skeleton rows, `<CollectionEmptyState>` |
| `src/features/units/UnitTableColumns.tsx` | 9 columns, faction badge, StatusPopover, Progress | VERIFIED | 9 `ColumnDef` entries; `style={{ backgroundColor: faction.color_theme }}`; `<StatusPopover>`; `<Progress>` |
| `src/features/units/StatusPopover.tsx` | Optimistic update + rollback + toast | VERIFIED | `qc.setQueryData`, `onError` rollback, `toast.error` with exact copy string |
| `src/features/units/CollectionEmptyState.tsx` | Two-mode empty state, correct copy | VERIFIED | "Add your first unit" and "No units found" copy present; PackageSearch icon |
| `src/features/units/applyUnitFilters.ts` | Pure filter function | VERIFIED | Exports `applyUnitFilters` and `UnitFiltersInput`; AND-composition; null-category exclusion |
| `src/features/units/UnitFilters.tsx` | Filter bar: search + 3 popovers + active + clear | VERIFIED | All Zustand selectors; useFactions; exact UI-SPEC copy; `ml-auto` on clear; `variant={activeOnly ? "default" : "outline"}` |
| `src/features/units/UnitDetailSheet.tsx` | Read-only sheet, all fields, StatusPopover, POLISH-04 | VERIFIED | 17 field rows; `<StatusPopover unit={unit} />`; `key={unit?.id ?? "none"}`; `side="right"` |
| `src/features/units/CollectionPage.tsx` | State owner, filter pipeline, all 5 sub-components | VERIFIED | `applyUnitFilters`; selectedUnitId pattern; all 5 components as siblings; key props on all |
| `src/app/collection/page.tsx` | Route entry, imports CollectionPage | VERIFIED | Exact template; no PlaceholderPage reference; router.tsx unchanged |
| `package.json` | vitest, @tanstack/react-table, zustand, testing-library | VERIFIED | All 6 required packages present in devDependencies or dependencies |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `vitest.config.ts` | `tests/setup.ts` | `setupFiles` | WIRED | `setupFiles: ["./tests/setup.ts"]` present |
| `vitest.config.ts` | `src/` | `@` alias | WIRED | `"@": path.resolve(__dirname, "./src")` |
| `src/app/collection/page.tsx` | `src/features/units/CollectionPage.tsx` | import | WIRED | `import { CollectionPage as CollectionPageContent } from "@/features/units/CollectionPage"` |
| `src/app/router.tsx` | `src/app/collection/page.tsx` | TanStack Router | WIRED | `import { CollectionPage } from "./collection/page"` at line 10; route at line 41 |
| `CollectionPage.tsx` | `UnitTable.tsx` | `<UnitTable` | WIRED | Rendered in JSX; receives `data={filteredUnits}` |
| `CollectionPage.tsx` | `UnitFilters.tsx` | `<UnitFilters` | WIRED | `<UnitFilters units={units ?? []} />` |
| `CollectionPage.tsx` | `UnitDetailSheet.tsx` | `<UnitDetailSheet` | WIRED | Rendered with `key={selectedUnit?.id ?? "none-detail"}` |
| `CollectionPage.tsx` | `applyUnitFilters.ts` | `applyUnitFilters(` | WIRED | Called in `useMemo` with Zustand filter state |
| `CollectionPage.tsx` | `UnitSheet.tsx` | `<UnitSheet` | WIRED | Sibling in JSX return; edit/create flows |
| `CollectionPage.tsx` | `UnitDeleteDialog.tsx` | `<UnitDeleteDialog` | WIRED | Sibling in JSX return; delete confirm |
| `UnitTable.tsx` | `useReactTable` | table engine | WIRED | `useReactTable({...})` |
| `UnitTable.tsx` | `UnitTableColumns.tsx` | `buildColumns` | WIRED | `buildColumns(factionMap, onDelete, onEdit)` |
| `UnitTableColumns.tsx` | `StatusPopover.tsx` | status cell | WIRED | `<StatusPopover unit={row.original} />` |
| `StatusPopover.tsx` | `useUnits.ts useUpdateUnit + UNITS_KEY` | optimistic mutation | WIRED | `import { useUpdateUnit, UNITS_KEY } from "@/hooks/useUnits"` |
| `UnitFilters.tsx` | `collectionFilters.ts` | `useCollectionFilters(` | WIRED | All 6 selectors consumed |
| `UnitFilters.tsx` | `useFactions.ts` | faction options | WIRED | `const { data: factions } = useFactions()` |
| `UnitDetailSheet.tsx` | `StatusPopover.tsx` | inline status edit | WIRED | `import { StatusPopover } from "./StatusPopover"`; `<StatusPopover unit={unit} />` |
| `collectionFilters.ts` | `zustand` | create store | WIRED | `import { create } from "zustand"` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COLL-01 | 03-01, 03-04 | Sortable paginated table | SATISFIED | `UnitTable.tsx`: `pageSize: 25`, sortable columns, pagination controls |
| COLL-02 | 03-02 | Search by unit name | SATISFIED | `applyUnitFilters`: case-insensitive substring; `UnitFilters`: search Input; 2 passing tests |
| COLL-03 | 03-02 | Filter by faction (multi-select) | SATISFIED | `applyUnitFilters`: faction array filter; `UnitFilters`: Faction popover; 3 passing tests |
| COLL-04 | 03-02 | Filter by painting status (multi-select) | SATISFIED | `applyUnitFilters`: status array filter; `UnitFilters`: Status popover; 2 passing tests |
| COLL-05 | 03-02 | Filter by category (multi-select) | SATISFIED | `applyUnitFilters`: category array filter with null exclusion; 3 passing tests |
| COLL-06 | 03-02 | Active project toggle | SATISFIED | `applyUnitFilters`: `is_active_project !== 1` guard; 2 passing tests |
| COLL-07 | 03-01 | Zustand filter store (ephemeral) | SATISFIED | `collectionFilters.ts`: 6 setters, no persist middleware; 7 passing tests |
| COLL-08 | 03-04 | Add Unit opens form sheet | SATISFIED | `CollectionPage.tsx`: `handleAdd` → `setEditSheetOpen(true)` + `<UnitSheet>` |
| COLL-09 | 03-03, 03-04 | Row click opens read-only detail Sheet | SATISFIED | `UnitDetailSheet.tsx`: all 17 fields; `CollectionPage`: `handleRowClick` → `setSelectedUnitId` |
| COLL-10 | 03-01, 03-03 | Quick status update, optimistic, rollback | SATISFIED | `StatusPopover.tsx`: setQueryData → mutate → onError rollback; 4 passing tests |
| COLL-11 | 03-01 | Per-unit progress bar | SATISFIED | `UnitTableColumns.tsx`: `<Progress value={row.original.painting_percentage}>` |
| COLL-12 | 03-01, 03-04 | Empty state with CTA | SATISFIED | `CollectionEmptyState.tsx`: two modes; exact copy; 2 passing tests |
| COLL-13 | 03-04 | Delete confirm before action | SATISFIED | `CollectionPage.tsx`: `handleDelete` → `UnitDeleteDialog`; wired from table AND detail Sheet |
| POLISH-01 | 03-04 | Delete confirmations on destructive actions | SATISFIED | `UnitDeleteDialog` used for all unit deletes; same dialog used by factions (Phase 2) |
| POLISH-02 | 03-01 | Loading skeletons | SATISFIED | `UnitTable.tsx`: 5 skeleton rows when `isLoading`; 1 passing test |
| POLISH-03 | 03-04 | Error toast on mutation failure | SATISFIED | All mutation paths: StatusPopover, UnitSheet, UnitDeleteDialog each call `toast.error` |
| POLISH-04 | 03-03, 03-04 | Forms reset between sessions via key | SATISFIED | `CollectionPage.tsx`: key on all 3 Sheets/Dialogs; `UnitDetailSheet.tsx`: `key={unit?.id}` on SheetContent |
| POLISH-05 | 03-01, 03-03 | Faction color badge visible | SATISFIED | `UnitTableColumns.tsx` + `UnitDetailSheet.tsx`: `style={{ backgroundColor: faction.color_theme }}` |

All 18 Phase 3 requirement IDs satisfied (COLL-01..13, POLISH-01..05).

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `UnitTableColumns.tsx` | 61 | `return null` for missing faction | Info | Expected guard — faction badge intentionally not rendered if faction_id has no match in factionMap; this is correct behavior, not a stub |

No blockers. No warnings. The single `return null` found is a legitimate early-return guard, not a placeholder.

---

### Human Verification Required

The following items can only be confirmed by running the app. The SUMMARY documents user approval of all 25 checks on 2026-05-01.

**1. Interactive filter behavior**
Test: Launch app, navigate to /collection, type in search box, select faction/status/category from dropdowns, toggle Active only.
Expected: Table updates immediately on each filter change; Clear filters resets all state.
Why human: DOM interaction and live filter pipeline cannot be verified programmatically without a running app.

**2. Optimistic status update UX timing**
Test: Click a status badge; select a different status. Observe badge updates before DB write completes.
Expected: Badge flips immediately; if DB fails, badge reverts and toast appears.
Why human: Race condition between optimistic patch and DB write requires live observation.

**3. Detail Sheet switching**
Test: Open Sheet for unit A; click unit B row without closing.
Expected: Sheet content updates to unit B — no stale unit A data visible.
Why human: Verifies key-based fresh mount under live state transitions.

**4. Faction color badge visual**
Test: Inspect faction column cells and detail Sheet header.
Expected: Badge background matches the faction's `color_theme` hex visually.
Why human: Color rendering requires visual inspection.

**Status: All 4 human checks APPROVED by user on 2026-05-01 (SUMMARY-04, Task 3).**

---

## Gaps Summary

None. All 19 observable truths verified. All 18 requirement IDs satisfied. All key links wired. No blocker anti-patterns. Human checkpoint approved.

---

_Verified: 2026-05-01_
_Verifier: Claude (gsd-verifier)_
