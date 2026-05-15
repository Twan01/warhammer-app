---
phase: 78
plan: 02
status: complete
commit: 1919217
---

# Plan 78-02 Summary — Dashboard Command Center Cards

## What was done

### Task 1: Created three dashboard card components
- **NextPaintingActionCard** — calls `useNextPaintingAction()`, renders step description, section name, time estimate, paint availability dots (emerald/amber/zinc), "Go to recipe" link. Empty state with Palette icon.
- **ReadyToPlayCard** — calls `useArmyLists()`, sorts by `updated_at` DESC, renders list name, total points, unpainted count, sync freshness dot, warning badge. Empty state with Shield icon.
- **DataHealthSummaryCard** — calls `useRulesSyncMeta()`, `useDiagnosticFlags()`, `useBackupStatus()`. Renders sync dot, warning count, backup age in horizontal flex row. "View full report" link to `/data-health`.

### Task 2: Wired cards into DashboardPage
- Added "Command Center" section with uppercase tracking-widest label in left column above Hobby Health
- Cards render in order: NextPaintingActionCard, ReadyToPlayCard, DataHealthSummaryCard

## Verification
- `npx tsc --noEmit` exits 0
- `pnpm build` exits 0
