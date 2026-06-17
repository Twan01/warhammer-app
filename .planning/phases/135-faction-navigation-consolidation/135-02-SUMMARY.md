---
phase: 135
plan: "02"
subsystem: navigation / settings
tags: [factions, settings, routing, sidebar]
dependency_graph:
  requires: ["135-01"]
  provides: ["faction-management-in-settings-tab"]
  affects: ["src/app/settings/page.tsx", "src/app/router.tsx", "src/components/common/AppSidebar.tsx"]
tech_stack:
  added: []
  patterns: ["TabsTrigger/TabsContent verbatim-reuse", "lazy-import cleanup"]
key_files:
  created: []
  modified:
    - src/app/settings/page.tsx
    - src/app/router.tsx
    - src/components/common/AppSidebar.tsx
  deleted:
    - src/app/factions/page.tsx
decisions:
  - "D-07: Faction management rehomed to Settings → Factions tab (2nd position); Quick Add create path preserved"
  - "D-08: FactionsPage rendered verbatim inside TabsContent; FactionSheet/FactionDeleteDialog/FactionCard/FactionsEmptyState unchanged"
  - "HeartPulse NOT removed here — Plan 03 owns that edit to avoid same-wave file conflict"
metrics:
  duration: "~7 minutes"
  completed: "2026-06-17T10:27:52Z"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 3
  files_deleted: 1
---

# Phase 135 Plan 02: Faction Navigation Consolidation — UI Rehoming Summary

**One-liner:** FactionsPage rehomed to Settings tab (2nd position) with /factions route and sidebar entry removed; Quick Add create path preserved; build clean.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add the Factions tab to Settings | 7ed6ff60 | src/app/settings/page.tsx |
| 2 | Remove /factions route, sidebar entry, and page wrapper | 1a5305f3 | src/app/router.tsx, src/components/common/AppSidebar.tsx, src/app/factions/page.tsx (deleted) |

## What Was Built

Faction management is now reachable from **Settings → Factions** (2nd tab, between Preferences and Data). The `FactionsPage` component is rendered verbatim inside a `<TabsContent value="factions" className="mt-4">` block — no modifications to `FactionsPage`, `FactionSheet`, `FactionDeleteDialog`, `FactionCard`, or `FactionsEmptyState`.

The standalone `/factions` route, its lazy import in `router.tsx`, and the thin page wrapper `src/app/factions/page.tsx` are removed. The sidebar `MANAGEMENT_NAV` no longer contains the Factions entry.

**Quick Add "Add Faction"** (`DropdownMenuItem` with `Shield` icon) is untouched and remains reachable at all times from the sidebar.

**dataHealthRoute** and its lazy import remain intact — Plan 03 owns the Data Health sidebar removal.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows through the existing `useFactions()` React Query hook; no placeholder values introduced.

## Threat Flags

None — this plan removes internal navigation entries only. No new network endpoints, auth paths, file access patterns, or schema changes were introduced.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/app/settings/page.tsx exists | FOUND |
| src/app/router.tsx exists | FOUND |
| src/components/common/AppSidebar.tsx exists | FOUND |
| src/app/factions/page.tsx deleted | CONFIRMED |
| Commit 7ed6ff60 (Task 1) | FOUND |
| Commit 1a5305f3 (Task 2) | FOUND |
