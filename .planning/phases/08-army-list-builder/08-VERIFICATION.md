---
phase: 08-army-list-builder
verified: 2026-05-02T09:45:00Z
status: human_needed
score: 6/6 automated must-haves verified
re_verification: false
human_verification:
  - test: "Navigate to /army-lists in the live app and verify full interactive UX (covered by 08-05 smoke test)"
    expected: "All 14 smoke-test steps pass: route, empty state, create/edit/delete lists, add/remove units, points override, notes save, pre-delete warning, sibling portal architecture"
    why_human: "Tauri IPC (SQLite reads/writes, cache invalidation, portal rendering) cannot be exercised in jsdom; Tauri plugin-sql calls crash in vitest — manual app launch is the only option. NOTE: 08-05-SUMMARY.md documents that a human already executed all 14 steps and approved them on 2026-05-02."
---

# Phase 8: Army List Builder Verification Report

**Phase Goal:** Users can create and manage army lists drawn from their collection — adding and removing units, entering per-unit points overrides, and seeing auto-calculated totals (total points, painted points, battle-ready %) — and the unit delete flow warns before removing a unit that belongs to an active list

**Verified:** 2026-05-02T09:45:00Z
**Status:** human_needed (automated checks all pass; human smoke test already documented as approved in 08-05-SUMMARY.md)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | User can create an army list with name, faction, list type tag, and notes | VERIFIED | `ArmyListSheet.tsx` exports `ArmyListSheet` with 5-field form wired to `useCreateArmyList`/`useUpdateArmyList`; `armyListSchema.ts` enforces 5-value enum via zod |
| 2 | User can add/remove units from a list; each unit shows painting status badge | VERIFIED | `UnitPickerDialog.tsx` wires `useAddUnitToList`; `ArmyListUnitRow.tsx` renders `Badge` with `unit.status_painting`; `ArmyListDetailSheet.tsx` wires `useRemoveUnitFromList` per row |
| 3 | Per-unit points override; blank falls back to unit.points; SQL COALESCE | VERIFIED | `ArmyListUnitRow.tsx` blur/Enter saves `points_override`; `armyLists.ts` `getArmyListWithUnits` uses `COALESCE(alu.points_override, u.points, 0) AS effective_points`; JS never reimplements COALESCE |
| 4 | Per-list notes and per-unit-in-list notes save without leaving the sheet | VERIFIED | `ArmyListDetailSheet.tsx` list-level notes textarea wired to `useUpdateArmyList` with Pitfall 5 empty-string discipline; `ArmyListUnitRow.tsx` expandable notes wired to `useUpdateArmyListUnit` preserving both fields (Pitfall 2) |
| 5 | Auto-calculated totals: total pts, painted pts, battle-ready % | VERIFIED | `ArmyListSummaryBar.tsx` sums `u.effective_points` (SQL-computed); uses `status_painting === "Completed"` (canonical value); `battleReadyPct = Math.round((paintedPoints / totalPoints) * 100)` |
| 6 | Unit delete warns by count when unit belongs to active army lists | VERIFIED | `UnitDeleteDialog.tsx` calls `getArmyListsByUnitId(unit.id)` via `useQuery`; renders two-step warning state with list names when `memberLists.length > 0`; preserves simple confirm when `length === 0` |
| 7 (from ROADMAP SC6) | Empty state with CTA appears when no lists exist | VERIFIED | `ArmyListsEmptyState.tsx` renders "Build your first army list" heading and "New List" button; `ArmyListsPage.tsx` renders it when `lists.length === 0 && !isLoading` |
| 8 (from ROADMAP SC goal) | Route registered and nav entry present | VERIFIED | `router.tsx` contains `armyListsRoute` at path `/army-lists`; `AppSidebar.tsx` MAIN_NAV includes `{ to: "/army-lists", label: "Army Lists", icon: ClipboardList }` |

**Score:** 6/6 plan-derived must-have groups verified (automated); full interactive UX verified by human in 08-05 smoke test

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/queries/armyLists.ts` | `getArmyListsByUnitId` function for ARMY-05 pre-delete warning | VERIFIED | Function present at lines 136-147; SQL SELECT/JOIN/WHERE matches plan spec |
| `src/features/army-lists/armyListSchema.ts` | Zod schema with 5-value enum | VERIFIED | All 5 list_type values: Casual/Learning/Narrative/Competitive/Test; no `.default()` (decision 02-03) |
| `src/features/army-lists/ArmyListSheet.tsx` | Create/edit form Sheet (ARMY-01) | VERIFIED | Wired to `useCreateArmyList`, `useUpdateArmyList`, `useFactions`, `zodResolver(armyListSchema)`; useEffect reset on list prop change (Pitfall 6) |
| `src/features/army-lists/ArmyListDeleteDialog.tsx` | Confirmation dialog for list deletion | VERIFIED | Wired to `useDeleteArmyList`; "Keep List" / "Delete List" copy; `variant="destructive"` |
| `src/features/army-lists/ArmyListSummaryBar.tsx` | Pinned 3-stat summary band (ARMY-03) | VERIFIED | Sums `u.effective_points`; `status_painting === "Completed"` (not "Complete"); `Math.round((paintedPoints / totalPoints) * 100)` |
| `src/features/army-lists/ArmyListUnitRow.tsx` | Compact table row with inline points + expandable notes (ARMY-03, ARMY-04) | VERIFIED | blur/Enter points save; expandable notes textarea with Save button; both save handlers pass BOTH fields (Pitfall 2); Trash2 remove button delegates via `onRemove` |
| `src/features/army-lists/UnitPickerDialog.tsx` | Command palette Dialog for adding units (ARMY-02) | VERIFIED | Wired to `useAddUnitToList`; filters by `factionId` when non-null; null faction shows all (Pitfall 3); stays open after select (multi-add) |
| `src/features/army-lists/ArmyListDetailSheet.tsx` | Composite detail sheet — summary + unit table + list notes + footer (ARMY-02..04) | VERIFIED | Composes `ArmyListSummaryBar` + `ArmyListUnitRow`; wires `useRemoveUnitFromList` per row; `useUpdateArmyList` for list notes (Pitfall 5 empty string); does NOT contain `<UnitPickerDialog` (Pitfall 1) |
| `src/features/army-lists/ArmyListCard.tsx` | Card grid item with battle-ready stats | VERIFIED | Same stat logic as SummaryBar; `cursor-pointer border hover:bg-muted/50`; keyboard accessible (`role="button"`, `tabIndex={0}`, Enter handler) |
| `src/features/army-lists/ArmyListsEmptyState.tsx` | Empty state with CTA (ARMY-06) | VERIFIED | "Build your first army list" heading; full body copy; Swords icon; "New List" button wired via `onAdd` prop |
| `src/features/army-lists/ArmyListsPage.tsx` | Root page with sibling portal architecture | VERIFIED | 4 sibling portals at root: ArmyListDetailSheet, ArmyListSheet, ArmyListDeleteDialog, UnitPickerDialog; responsive card grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; `<h1>Army Lists</h1>` |
| `src/app/army-lists/page.tsx` | Route wrapper for /army-lists (ARMY-07) | VERIFIED | Thin wrapper importing `ArmyListsPage` from features |
| `src/app/router.tsx` | `armyListsRoute` at path `/army-lists` (ARMY-07) | VERIFIED | `createRoute({ path: "/army-lists", component: ArmyListsPage })` present; included in `routeTree.addChildren` |
| `src/components/common/AppSidebar.tsx` | "Army Lists" nav entry with ClipboardList icon (ARMY-07) | VERIFIED | `{ to: "/army-lists", label: "Army Lists", icon: ClipboardList }` in MAIN_NAV (7 entries total) |
| `src/features/units/UnitDeleteDialog.tsx` | Enhanced with army-list membership pre-check (ARMY-05) | VERIFIED | `useQuery` for `getArmyListsByUnitId`; two-state render (warning vs simple confirm); "This unit is in active army lists" / "Delete Anyway" copy; "Delete unit?" simple state preserved |
| `tests/army-list/armyListQueries.test.ts` | 2 passing tests for `getArmyListsByUnitId` | VERIFIED | 2 tests pass: SQL contract check (regex on SELECT/FROM/JOIN/WHERE) + passthrough return |
| `tests/army-list/ArmyListsPage.test.tsx` | 3 real assertions (no describe.skip) | VERIFIED | 3 tests pass: empty state heading, loading skeletons, populated card names; no `describe.skip` |
| `tests/army-list/UnitDeleteDialog.test.tsx` | 2 real assertions (no describe.skip) | VERIFIED | 2 tests pass: normal state (simple confirm) + warning state (list names + "Delete Anyway"); no `describe.skip` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/db/queries/armyLists.ts` | `@/db/client getDb` | `import { getDb } from '@/db/client'` | WIRED | Line 1 of armyLists.ts |
| `ArmyListSheet.tsx` | `useCreateArmyList`/`useUpdateArmyList` | `import from @/hooks/useArmyLists` | WIRED | Line 224 of plan spec; confirmed in file |
| `ArmyListSheet.tsx` | `zodResolver(armyListSchema)` | form resolver | WIRED | Present in ArmyListSheet.tsx |
| `ArmyListSheet.tsx` | `useFactions` | `import from @/hooks/useFactions` | WIRED | Confirmed in ArmyListSheet.tsx |
| `ArmyListDeleteDialog.tsx` | `useDeleteArmyList` | `import from @/hooks/useArmyLists` | WIRED | Confirmed in ArmyListDeleteDialog.tsx |
| `ArmyListSummaryBar.tsx` | `u.effective_points` (SQL-computed) | `units.reduce((sum, u) => sum + u.effective_points, 0)` | WIRED | Confirmed; no COALESCE in JS |
| `ArmyListSummaryBar.tsx` | `status_painting === "Completed"` | reduce condition | WIRED | Uses canonical "Completed" value |
| `ArmyListUnitRow.tsx` | `useUpdateArmyListUnit` | `import from @/hooks/useArmyLists` | WIRED | Confirmed; both save handlers pass both fields (Pitfall 2) |
| `UnitPickerDialog.tsx` | `useAddUnitToList` | `import from @/hooks/useArmyLists` | WIRED | Stays open after select; null factionId shows all |
| `ArmyListDetailSheet.tsx` | `useArmyListWithUnits` + `useRemoveUnitFromList` + `useUpdateArmyList` | `import from @/hooks/useArmyLists` | WIRED | All 3 hooks consumed |
| `ArmyListDetailSheet.tsx` | `ArmyListSummaryBar` + `ArmyListUnitRow` | local imports | WIRED | `<ArmyListSummaryBar units={units ?? []} />` + row mapping |
| `ArmyListDetailSheet.tsx` | UnitPickerDialog NOT nested (Pitfall 1) | architecture constraint | WIRED | No `<UnitPickerDialog` found in ArmyListDetailSheet.tsx |
| `ArmyListsPage.tsx` | All 5 plan 01-03 components | local imports | WIRED | ArmyListDetailSheet, ArmyListSheet, ArmyListDeleteDialog, ArmyListCard, UnitPickerDialog all imported and rendered as siblings |
| `src/app/router.tsx` | `armyListsRoute` at `/army-lists` | `createRoute` | WIRED | Route present and in `addChildren` array |
| `AppSidebar.tsx` | MAIN_NAV `{ to: "/army-lists", label: "Army Lists", icon: ClipboardList }` | const array | WIRED | 7th entry in MAIN_NAV |
| `UnitDeleteDialog.tsx` | `getArmyListsByUnitId` | `useQuery` | WIRED | `enabled: open && unit !== null`; two-state render based on `memberLists.length > 0` |

---

### Requirements Coverage

Note: There is a semantic mismatch between `v0.1.1-REQUIREMENTS.md` and the ROADMAP/plan frontmatter IDs. The ROADMAP.md is the authoritative planning document. Both are cross-referenced below.

| ROADMAP Req ID | REQUIREMENTS.md Mapping | Description | Plan | Status | Evidence |
|----------------|------------------------|-------------|------|--------|---------|
| ARMY-01 (ROADMAP) | ARMY-01 (REQ) | Create army list with name/faction/list-type/notes | 08-01 | SATISFIED | `ArmyListSheet.tsx` + `armyListSchema.ts` wired to `useCreateArmyList` |
| ARMY-02 (ROADMAP) | ARMY-02 (REQ) | Add/remove units; painting status + assembled status per unit | 08-02, 08-03 | SATISFIED | `UnitPickerDialog` + `ArmyListUnitRow` (Badge shows `status_painting`); remove via `useRemoveUnitFromList` |
| ARMY-03 (ROADMAP) | ARMY-03 (REQ) | Per-unit points override; COALESCE in SQL | 08-02 | SATISFIED | `ArmyListUnitRow` inline input; `getArmyListWithUnits` SQL COALESCE confirmed |
| ARMY-04 (ROADMAP) | ARMY-05 (REQ) | Per-list notes and per-unit-in-list notes | 08-02, 08-03 | SATISFIED | `ArmyListUnitRow` expandable notes + `ArmyListDetailSheet` list-level textarea; both wired to save hooks |
| ARMY-05 (ROADMAP) | ARMY-06 (REQ) | Unit delete pre-check warns if unit belongs to army lists | 08-00, 08-04 | SATISFIED | `getArmyListsByUnitId` query + enhanced `UnitDeleteDialog` two-state render; 2 passing tests |
| ARMY-06 (ROADMAP) | ARMY-07 (REQ) | Empty state CTA when no lists exist | 08-04 | SATISFIED | `ArmyListsEmptyState.tsx` with "Build your first army list" heading; 3 passing tests |
| ARMY-07 (ROADMAP) | (no direct REQ match — route/nav not explicitly in REQUIREMENTS.md) | Route + sidebar nav | 08-04 | SATISFIED | `armyListsRoute` + `AppSidebar.tsx` MAIN_NAV entry |

**REQUIREMENTS.md ARMY-04 coverage note:** ARMY-04 in v0.1.1-REQUIREMENTS.md reads "Army list detail auto-calculates: total points, painted points (units where `status_painting = 'Completed'`), and battle-ready %". This corresponds to `ArmyListSummaryBar.tsx` and `ArmyListCard.tsx` auto-calculation logic, which is present and verified. The ROADMAP.md does not assign a dedicated ID for this (it is covered under Success Criterion 3 as part of what ARMY-03 enables). This requirement is SATISFIED.

---

### Anti-Patterns Found

None detected. Scanned all 10 files in `src/features/army-lists/`, `src/features/units/UnitDeleteDialog.tsx`, `src/app/router.tsx`, `src/components/common/AppSidebar.tsx`, and all 3 test files in `tests/army-list/`. No TODO/FIXME/placeholder patterns, no empty implementations, no stub components, no `describe.skip` or `it.skip` remaining.

---

### Test Results

Full suite run: **178 passed, 0 failed, 0 skipped** (25 test files)

Army-list specific:
- `tests/army-list/armyListQueries.test.ts` — 2 passing (getArmyListsByUnitId SQL contract + passthrough)
- `tests/army-list/UnitDeleteDialog.test.tsx` — 2 passing (normal state + warning state)
- `tests/army-list/ArmyListsPage.test.tsx` — 3 passing (empty state + loading + populated)

---

### Human Verification Required

#### 1. Full Army List Builder Interactive UX

**Test:** Run `pnpm tauri dev`, navigate to Army Lists in sidebar, and exercise the full 14-step smoke test from 08-05-PLAN.md
**Expected:** All steps pass — route loads, empty state shows, create/edit/delete lists work, unit add/remove/points/notes all function, pre-delete warning shows list names, summary bar updates on mutations, sibling portal architecture holds (Sheet + Dialog visible simultaneously), key prop prevents stale data
**Why human:** Tauri IPC (SQLite reads/writes, cache invalidation after mutations, portal z-index rendering) cannot be mocked in jsdom. All state machine behavior requires the live Tauri desktop app.

**Status note:** 08-05-SUMMARY.md documents that a human executed all 14 steps on 2026-05-02 and approved them with explicit PASS on all three critical Pitfall verifications (Pitfall 1 sibling portals, Pitfall 2 full-replacement UPDATE, Pitfall 6 key prop). This human verification step is considered satisfied per the existing smoke test record.

---

## Summary

Phase 8 goal is fully achieved. All 10 army-list feature components exist, are substantive (no stubs or placeholders), and are correctly wired. The route, sidebar nav entry, and pre-delete dialog enhancement are all in place. The test suite is clean — 178 tests passing with 0 skipped, including 7 new army-list tests covering the query contract, page states, and dialog states. A human smoke test was conducted and approved on 2026-05-02 covering all 14 interactive behaviors.

The only gap between this report and `status: passed` is the programmatic inability to automate Tauri IPC verification — which is an inherent constraint of this stack, not a code quality issue.

---

_Verified: 2026-05-02T09:45:00Z_
_Verifier: Claude (gsd-verifier)_
