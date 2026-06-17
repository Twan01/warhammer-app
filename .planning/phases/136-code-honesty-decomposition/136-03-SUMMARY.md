---
phase: 136-code-honesty-decomposition
plan: 03
subsystem: data-layer / types
tags: [migration, schema, types, parity-gate]
dependency_graph:
  requires: []
  provides: [migration-049, parity-gate-49]
  affects: [src/types/battleLog.ts, src-tauri/migrations, src-tauri/src/lib.rs]
tech_stack:
  added: []
  patterns: [sqlite-drop-column, migration-parity-gate]
key_files:
  created:
    - src-tauri/migrations/049_drop_promoted_to_reminder.sql
  modified:
    - src-tauri/src/lib.rs
    - src/types/battleLog.ts
    - src/features/battle-log/BattleLogSheet.tsx
    - tests/data-layer/migration-parity.test.ts
    - tests/battle-log/BattleLogRow.armyLink.test.tsx
    - tests/feedback/FBK-01-DeletePendingText.test.tsx
    - tests/workshop-play/armyListReadiness.test.tsx
decisions:
  - "D-10: removed vestigial promoted_to_reminder column (genuinely dead, zero usage)"
  - "D-11: new migration 049 DDL DROP COLUMN, never edited 027, removed type field + simplified CreateBattleLogInput Omit"
  - "D-12: atomic change — migration + lib.rs block 49 + type cleanup + consumer fix + test fixes all in one commit"
metrics:
  duration: 12m
  completed: 2026-06-17
  tasks_completed: 2
  files_changed: 8
---

# Phase 136 Plan 03: HON-11 Remove Vestigial promoted_to_reminder Column Summary

**One-liner:** DDL DROP COLUMN migration 049 (LF, SQLite 3.35+) removes the never-built "remind-from-battle" column; Migration block 49 registered in lib.rs; BattleLog type cleaned up; parity gate stays green at 49.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Author migration 049, register block 49, remove type field | 315c7480 | 7 files |
| 2 | Verify column gone via data-layer migration test | 6da01fc9 | 1 file |

## Verification Results

- `pnpm check:version`: PASS — 49 sql files == 49 lib.rs Migration{} entries, no CR bytes
- `pnpm build`: PASS — TypeScript + Vite build clean
- `grep -rn "promoted_to_reminder" src/`: 0 results
- `git diff --quiet src-tauri/migrations/027_battle_log_after_action.sql`: migration 027 untouched
- `PRAGMA table_info(battle_logs)` via in-memory better-sqlite3: column absent after 49 migrations
- data-layer test suite: PASS (exit code 0)
- migration file line endings: LF only (0 CR bytes)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed promoted_to_reminder: 0 from BattleLogSheet payload**
- **Found during:** Task 1 (`pnpm build` TypeScript check)
- **Issue:** `BattleLogSheet.tsx` line 182 had `promoted_to_reminder: 0` in the payload object. After removing the field from `BattleLog`, `CreateBattleLogInput` no longer includes this key — TypeScript reported the property as excess.
- **Fix:** Deleted the `promoted_to_reminder: 0` line from the submit payload in `BattleLogSheet.tsx`.
- **Files modified:** `src/features/battle-log/BattleLogSheet.tsx`
- **Commit:** 315c7480

**2. [Rule 1 - Bug] Removed promoted_to_reminder from 3 test mock BattleLog objects**
- **Found during:** Task 1 (`pnpm build` TypeScript check)
- **Issue:** Three test files contained `promoted_to_reminder: 0` in mock `BattleLog` literal objects. After type removal, TypeScript reported TS2353 (unknown property) on all three.
- **Fix:** Removed the property from mock objects in:
  - `tests/battle-log/BattleLogRow.armyLink.test.tsx`
  - `tests/feedback/FBK-01-DeletePendingText.test.tsx`
  - `tests/workshop-play/armyListReadiness.test.tsx`
- **Commit:** 315c7480 (bundled atomically with Task 1 per D-12)

## Known Stubs

None. All changes are structural removal of dead code — no stubs introduced.

## Threat Flags

None. The single DDL change is scoped to a vestigial INTEGER NOT NULL DEFAULT 0 column with no FK references and zero usage surface. The threat mitigations (T-136-11-01, T-136-11-02) are confirmed satisfied by the parity gate pass and data-layer column-absent assertion.

## Self-Check: PASSED

- `src-tauri/migrations/049_drop_promoted_to_reminder.sql`: FOUND
- `src-tauri/src/lib.rs` contains `version: 49`: FOUND
- `src/types/battleLog.ts` no promoted_to_reminder: CONFIRMED
- Commit 315c7480: FOUND
- Commit 6da01fc9: FOUND
