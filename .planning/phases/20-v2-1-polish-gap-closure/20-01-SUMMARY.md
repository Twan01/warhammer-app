---
phase: 20-v2-1-polish-gap-closure
plan: "01"
subsystem: ui
tags: [react, lucide-react, typescript, sqlite, dead-code-removal]

# Dependency graph
requires:
  - phase: 16-ui-polish-round-2
    provides: "icon-pill empty-state pattern (ArmyListsEmptyState, KanbanEmptyState)"
  - phase: 15-datasheet-integration
    provides: "datasheets.ts module with upsertSyncMeta; bulk_sync_rules Rust command"
provides:
  - "FactionsEmptyState aligned with project-wide icon-pill pattern (Shield, rounded-xl pill)"
  - "datasheets.ts with upsertSyncMeta dead export removed"
affects:
  - 20-02-PLAN
  - 20-03-PLAN

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Icon-pill empty state: Shield (or domain icon) inside rounded-xl bg-muted/40 p-4 pill, gap-3 outer flex, space-y-1 text wrapper, mt-2 Button"

key-files:
  created: []
  modified:
    - src/features/factions/FactionsEmptyState.tsx
    - src/db/queries/datasheets.ts

key-decisions:
  - "Shield chosen as Factions icon (domain-appropriate: faction heraldry/emblems) replacing generic PackageOpen"
  - "upsertSyncMeta removed without replacement — Rust bulk_sync_rules in lib.rs is the sole sync-meta write path (confirmed by grep)"
  - "getRulesDb import preserved in datasheets.ts — still used by getDatasheetsByFaction, getFullDatasheet, getRulesSyncMeta, resolveWahapediaFactionIdByName"

patterns-established:
  - "Icon-pill pattern is now consistent across ALL 6 empty states in the app (Collection, ArmyLists, Kanban, Recipe, Factions — DashboardEmptyState intentionally different as welcome screen)"

requirements-completed:
  - "tech-debt:upsertSyncMeta-removal"
  - "tech-debt:FactionsEmptyState-icon-pill"

# Metrics
duration: 108min
completed: 2026-05-04
---

# Phase 20 Plan 01: v2.1 Polish Gap Closure (FactionsEmptyState + upsertSyncMeta) Summary

**Shield icon-pill empty state on Factions page and dead upsertSyncMeta export removed from datasheets.ts, leaving Rust bulk_sync_rules as the sole sync-meta write path**

## Performance

- **Duration:** 108 min (includes pnpm test + pnpm build runs)
- **Started:** 2026-05-04T14:56:35Z
- **Completed:** 2026-05-04T17:05:00Z
- **Tasks:** 2 of 2
- **Files modified:** 2

## Accomplishments

- FactionsEmptyState now matches ArmyListsEmptyState / KanbanEmptyState icon-pill structure: Shield in rounded-xl bg-muted/40 p-4 pill, gap-3 outer flex, space-y-1 text wrapper, mt-2 Button, h-8 w-8 icon size
- Five deviations from the canonical pattern corrected in one write: gap-4→gap-3, bare icon→pill, h-12→h-8, no space-y-1→added, no mt-2→added
- Removed upsertSyncMeta function (15 lines) and its 4-line JSDoc block from datasheets.ts; also removed 1 JSDoc reference line from module header
- pnpm build exits 0 under strict TypeScript (noUnusedLocals confirms getRulesDb import still used by 4 remaining functions)
- pnpm test exits 0: 64 files passed, 388 tests passed (2 pre-existing skips unrelated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace FactionsEmptyState with icon-pill pattern (Shield)** - `5c1dbcf` (feat)
2. **Task 2: Remove upsertSyncMeta dead export from datasheets.ts** - `28dcb78` (fix)

**Plan metadata:** (docs commit — see final_commit below)

## Files Created/Modified

- `src/features/factions/FactionsEmptyState.tsx` - Replaced bare-icon pattern with canonical icon-pill; Shield replaces PackageOpen; 5 structural deviations fixed
- `src/db/queries/datasheets.ts` - Removed upsertSyncMeta function + JSDoc (15 lines of function, 4 JSDoc lines, 1 module-header reference line)

## Decisions Made

- Shield chosen as Factions icon (domain-appropriate: faction heraldry/emblems) over PackageOpen (generic empty-box)
- upsertSyncMeta removed without replacement — Rust bulk_sync_rules in src-tauri/src/lib.rs is the sole sync-meta write path (zero callers in src/ confirmed by grep)
- getRulesDb import preserved in datasheets.ts — still required by 4 remaining query functions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `grep -rn "upsertSyncMeta" src-tauri/` matched a compiled `rlib` binary artifact, not source — the `src-tauri/src/` source files contain zero references as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 20 Plan 02 can proceed (independent tech-debt items)
- Manual verification deferred to phase end: Open Factions page with zero factions in live Tauri app — Shield icon-pill should render correctly

---
*Phase: 20-v2-1-polish-gap-closure*
*Completed: 2026-05-04*
