---
phase: 18-battle-log
plan: "02"
subsystem: ui-layer
tags: [battle-log, react, tanstack-query, zod, react-hook-form, collapsible, sibling-portal]
dependency_graph:
  requires: [18-01]
  provides: [battle-log-ui, battle-log-route, battle-log-sidebar-entry]
  affects: [18-03]
tech_stack:
  added: []
  patterns: [sibling-portal, inline-collapsible-expand, sentinel-select, o1-lookup-map]
key_files:
  created:
    - src/features/battle-log/resultBadge.ts
    - src/features/battle-log/BattleLogDeleteDialog.tsx
    - src/features/battle-log/BattleLogSheet.tsx
    - src/features/battle-log/BattleLogEmptyState.tsx
    - src/features/battle-log/BattleLogSummaryBar.tsx
    - src/features/battle-log/BattleLogRow.tsx
    - src/features/battle-log/BattleLogPage.tsx
    - src/app/battle-log/page.tsx
  modified:
    - src/app/router.tsx
    - src/components/common/AppSidebar.tsx
decisions:
  - "Dialog (not AlertDialog) used for BattleLogDeleteDialog — alert-dialog not installed, fallback to existing dialog with destructive Button per UI-SPEC §BattleLogDeleteDialog alternative"
  - "armyListNameById and unitNameById built as Map<number,string> in useMemo for O(1) lookup — plan specifies this explicitly"
  - "BattleLogSummaryBar imports BattleLogSummary type directly from ./computeBattleLogSummary (not from useBattleLogs) — matches the type source"
  - "battleLogRoute added to routeTree between spendingRoute and settingsRoute — preserves existing alphabetical/functional ordering"
  - "TRACKING_NAV updated to 3 entries: Army Lists → Battle Log → Spending with Swords (plural) icon per UI-SPEC"
metrics:
  duration: "8 minutes"
  completed: "2026-05-04"
  tasks_completed: 3
  files_created: 8
  files_modified: 2
  tests_added: 0
  tests_passing: 329
---

# Phase 18 Plan 02: Battle Log UI Layer Summary

**One-liner:** Complete /battle-log UI layer: Sheet form (zodResolver + 4 grouped field sections) + inline-Collapsible row + summary bar + empty state + sibling-portal delete dialog + route + sidebar nav — mirrors ArmyListsPage architecture verbatim.

## What Was Built

Wave 2 of Phase 18 delivers every BATTLE-01..05 success criterion at the UI level. Eight new feature files wired to Plan 01's data layer provide a complete, working /battle-log page.

### Files Created

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/features/battle-log/resultBadge.ts` | Semantic Win/Loss/Draw Tailwind class map | `RESULT_BADGE_CLASS`, `RESULT_BADGE_LABEL` |
| `src/features/battle-log/BattleLogDeleteDialog.tsx` | Sibling Dialog delete confirmation | `BattleLogDeleteDialog` |
| `src/features/battle-log/BattleLogSheet.tsx` | Create/edit Sheet form (react-hook-form + zod, 4 groups) | `BattleLogSheet` |
| `src/features/battle-log/BattleLogEmptyState.tsx` | Phase 16 empty-state pattern with Swords icon | `BattleLogEmptyState` |
| `src/features/battle-log/BattleLogSummaryBar.tsx` | N games · XW YL ZD · Z% win rate strip | `BattleLogSummaryBar` |
| `src/features/battle-log/BattleLogRow.tsx` | 2-line compact row + inline Collapsible expand | `BattleLogRow` |
| `src/features/battle-log/BattleLogPage.tsx` | Root page owning all portal state | `BattleLogPage` |
| `src/app/battle-log/page.tsx` | Thin wrapper re-export | `BattleLogPage` |

### Files Modified

| File | Change |
|------|--------|
| `src/app/router.tsx` | Added `import { BattleLogPage }`, `battleLogRoute` at `/battle-log`, inserted in `addChildren([])` between `spendingRoute` and `settingsRoute` |
| `src/components/common/AppSidebar.tsx` | Added `Swords` to lucide-react import; inserted `{ to: "/battle-log", label: "Battle Log", icon: Swords }` in `TRACKING_NAV` between Army Lists and Spending |

## Architecture

### Router/Sidebar Wiring

`battleLogRoute` slots into the routeTree at position 9 (between `spendingRoute` and `settingsRoute`). The import is `./battle-log/page` which re-exports `BattleLogPage` from `@/features/battle-log/BattleLogPage`.

`TRACKING_NAV` is now a 3-entry array: Army Lists (`/army-lists`, ClipboardList) → Battle Log (`/battle-log`, Swords) → Spending (`/spending`, Wallet). The existing `.map(...)` block in `AppSidebar` renders the new entry automatically.

### ArmyListsPage Architecture Mirrored Verbatim

`BattleLogPage` implements the identical sibling-portal pattern:
- `sheetOpen` + `editingLog` state (null editingLog = create)
- `deleteDialogOpen` + `deletingLog` state
- `openCreate`, `openEdit`, `closeSheet`, `openDelete`, `closeDelete` handlers
- `<BattleLogSheet>` and `<BattleLogDeleteDialog>` rendered as **siblings** at page root (never nested inside row components — Pitfall 1)
- `key={editingLog?.id ?? "new-edit"}` and `key={deletingLog?.id ?? "none-delete"}` force remount when target changes

### BattleLogSheet Form

4 field groups separated by `<Separator />` + section label:
1. **Required** (no separator): `battle_date`, `opponent_faction`, `mission`, `result`
2. **Game Details**: `opponent`, `points_played`, `my_score`/`opponent_score` (grid-cols-2)
3. **Linked Records**: `army_list_id`, `mvp_unit_id`, `underperforming_unit_id` (sentinel `__none__` Select pattern)
4. **Post-Game Notes**: `lessons_learned`, `changes_next_time` (TEXTAREA_CLASS)

Pitfall 3 (`useEffect form.reset(buildDefaultValues(log))`) and Pitfall 6 (`new Date().toISOString().slice(0, 10)`) both implemented.

### Name Resolution in BattleLogPage

`armyListNameById` and `unitNameById` are built in `useMemo` as `Map<number, string>` objects. Each `BattleLogRow` receives resolved string names (or `null`) as props — row components never call hooks directly.

## Plan 03 Note

Smoke-test checklist is already documented in `18-VALIDATION.md §Manual-Only Verifications`. Plan 03 is the final validation/smoke-test plan for Phase 18.

## Test Results

```
Test Files  58 passed | 1 skipped (59)
     Tests  329 passed | 2 skipped (331)
  Start at  14:11:28
  Duration  19.88s
```

No new tests added (UI layer — per plan spec `pnpm vitest run exits 0 — full suite still green (no new tests required for this UI task)`). All 329 existing tests remain green.

`pnpm tsc --noEmit` exits 0.
`pnpm build` exits 0 — production bundle includes battle-log (pre-existing chunk size warning unrelated to this plan).

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
