---
phase: 105-collection-integration
plan: "02"
subsystem: ui-integration
tags: [ui, collection, unit-database, ownership, prefill, badges]
dependency_graph:
  requires: [105-01]
  provides: [ownership-badge, readiness-dot, add-to-collection-flow, unitsheet-prefill]
  affects: [UdbUnitRow, UdbUnitList, UdbDatasheetSheet, DatabaseBrowserPage, UnitSheet]
tech_stack:
  added: []
  patterns: [ownershipMap-prop-threading, prefill-overlay-pattern, sheet-on-sheet]
key_files:
  created: []
  modified:
    - src/features/unit-database/UdbUnitRow.tsx
    - src/features/unit-database/UdbUnitList.tsx
    - src/features/unit-database/UdbDatasheetSheet.tsx
    - src/features/unit-database/DatabaseBrowserPage.tsx
    - src/features/units/UnitSheet.tsx
decisions:
  - resolveReadinessDotClass checks ALL statuses against DONE_STATUSES for green (not just worst) — a unit with Completed|Not Started is amber not green
  - DONE_STATUSES includes Display Ready and Battle Ready per D-11 in addition to Varnished/Completed
  - Database Link field shown in both create and edit modes (not just edit) — simpler implementation, aligns with D-15/D-16 intent
  - prefill applied as spread overlay — all pre-filled fields remain editable per D-06
  - udb_unit_id not in Zod unitSchema — system-managed, passed outside form values
metrics:
  duration: "~25 minutes"
  completed_date: "2026-05-30"
  tasks_completed: 3
  files_changed: 5
---

# Phase 105 Plan 02: Ownership Badges, Readiness Dots, and Add-to-Collection Flow Summary

UI integration wiring Plan 01's data layer into the database browser: ownership badges and readiness dots on UdbUnitRow, "Add to Collection" button on UdbDatasheetSheet, page-level orchestration in DatabaseBrowserPage, and prefill support in UnitSheet.

## Tasks Completed

| Task | Name | Commit | Key Outputs |
|------|------|--------|-------------|
| 1 | Ownership badges + readiness dots + UdbUnitList threading | 6d680fb | resolveWorstStatus, resolveReadinessDotClass exports; UdbUnitRow ownershipData prop; UdbUnitList ownershipMap prop |
| 2 | Add to Collection flow — UdbDatasheetSheet + DatabaseBrowserPage | c8226e6 | onAddToCollection callback, ownershipData prop, handleAddToCollection with faction mapping and prefill |
| 3 | UnitSheet prefill support + Database Link display | 2597a62 | prefill/prefillUdbUnitId props, buildDefaultValues overlay, udb_unit_id in both create/edit payloads, database link status text |

## What Was Built

**UdbUnitRow** — Extended with `ownershipData` optional prop. When `owned_count > 0`, renders an "Owned xN" outline Badge and a readiness dot (h-2 w-2 rounded-full). Two exported pure functions:
- `resolveWorstStatus(allStatuses)`: splits pipe-delimited string, returns status with lowest `PAINTING_STATUS_ORDER` index (index -1 for unknowns = worst).
- `resolveReadinessDotClass(allStatuses)`: checks ALL statuses against `DONE_STATUSES` {Varnished, Completed, Display Ready, Battle Ready}. All done → `bg-emerald-400`; all not-started → `bg-muted-foreground/50`; otherwise → `bg-amber-500`.

**UdbUnitList** — Extended with optional `ownershipMap: Map<string, { owned_count, all_statuses }>` prop. Each row receives `ownershipMap?.get(item.unit.id) ?? null`.

**UdbDatasheetSheet** — Extended with `onAddToCollection` and `ownershipData` props. When `onAddToCollection` is provided, renders a full-width "Add to Collection" Button (default variant, Plus icon). Label changes to "Add Another to Collection" when `ownershipData.owned_count > 0`.

**DatabaseBrowserPage** — Orchestrator for the full flow:
1. Calls `useUdbOwnership(selectedFactionId)` for real-time ownership data.
2. Calls `useFactions()` for the collection faction list.
3. Builds `ownershipMap` via `useMemo`.
4. `handleAddToCollection`: maps UDB `faction_id` (string) to collection `faction_id` (integer) via `wahapedia_faction_id` match; extracts `points[0].points` and `composition[0].min_models`; opens UnitSheet with prefill.
5. Passes `ownershipMap` to UdbUnitList and `ownershipData` to UdbDatasheetSheet.
6. Renders UnitSheet at end of JSX in create mode (`unit={null}`) with prefill props.

**UnitSheet** — Extended with `prefill?: Partial<UnitFormValues>` and `prefillUdbUnitId?: string | null` props:
- `buildDefaultValues` now accepts a third `prefill` parameter; spreads over empty defaults in create mode.
- `useEffect` dependency array updated to include `prefill`.
- `onSubmit` payload: create path uses `prefillUdbUnitId ?? null`; edit path uses `(unit as Unit).udb_unit_id ?? null`. Ensures the no-COALESCE `updateUnit` SQL is always called with an explicit value.
- `udb_unit_id` NOT added to Zod `unitSchema` — system-managed.
- Database Link status paragraph: "Linked to unit database" when linked, "Custom unit (no database link)" when not.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria met.

## Known Stubs

None — all data paths use real hooks and query layer from Plan 01.

## Threat Flags

No new security surface beyond the plan's threat model. T-105-04 mitigated: prefill values pass through existing Zod schema validation before `createUnit` call. T-105-05 accepted: local-only data, no spoofing vector.

## Test Status

- **resolveWorstStatus tests:** PASS (3/3) — turned GREEN from Plan 01 RED
- **resolveReadinessDotClass tests:** PASS (6/6) — turned GREEN from Plan 01 RED
- **getUdbOwnershipByFaction tests:** PASS (3/3) — unchanged
- **PAINTING_STATUS_ORDER contract:** PASS (1/1) — unchanged
- **UnitSheet decomposition tests:** PASS (6/6) — new prefill/prefillUdbUnitId props backward-compatible
- **pnpm build:** PASS — no TypeScript errors
- **Pre-existing failures:** 19 tests in unrelated files remain failing (painting-mode, army-lists, spending, wishlist, hobby-journal) — out of scope, not caused by this plan

## Self-Check: PASSED

- src/features/unit-database/UdbUnitRow.tsx exports resolveWorstStatus: FOUND
- src/features/unit-database/UdbUnitRow.tsx exports resolveReadinessDotClass: FOUND
- src/features/unit-database/UdbUnitList.tsx has ownershipMap prop: FOUND
- src/features/unit-database/UdbDatasheetSheet.tsx has onAddToCollection prop: FOUND
- src/features/unit-database/DatabaseBrowserPage.tsx uses useUdbOwnership: FOUND
- src/features/units/UnitSheet.tsx has prefill prop: FOUND
- src/features/units/UnitSheet.tsx has prefillUdbUnitId prop: FOUND
- Commits 6d680fb, c8226e6, 2597a62: FOUND
