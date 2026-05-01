---
phase: 6
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (via `vitest.config.ts`) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green + app launches without error (manual smoke test)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-??-01 | migration | 1 | STRAT-06 | Unit (file content) | `pnpm test -- -t "migration"` | ❌ W0 | ⬜ pending |
| 6-??-02 | migration | 1 | STRAT-06 | Unit (file content) | `pnpm test -- -t "migration"` | ❌ W0 | ⬜ pending |
| 6-??-03 | queries | 1 | STRAT-06 | Unit (mock db) | `pnpm test -- -t "armyLists"` | ❌ W0 | ⬜ pending |
| 6-??-04 | queries | 1 | STRAT-06 | Unit (mock db) | `pnpm test -- -t "strategyNotes"` | ❌ W0 | ⬜ pending |
| 6-??-05 | queries | 1 | STRAT-06 | Unit (mock db) | `pnpm test -- -t "paints"` | ❌ W0 | ⬜ pending |
| 6-??-06 | hooks | 2 | STRAT-06 | Unit (hook) | `pnpm test -- -t "usePaints"` | ❌ W0 | ⬜ pending |
| 6-??-07 | types | 1 | STRAT-06 | Compile check | `pnpm build` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Note: Task IDs will be filled in by the planner when PLAN.md files are created.*

---

## Wave 0 Requirements

- [ ] `tests/foundation/migration004.test.ts` — reads `src-tauri/migrations/004_unit_playbook_stats.sql` as a string; asserts no `DROP` or `CREATE TABLE` statements; asserts all 8 column names present (`move`, `toughness`, `save`, `wounds`, `leadership`, `objective_control`, `keywords`, `abilities`); asserts `save` column is `INTEGER` not `TEXT`
- [ ] `tests/foundation/armyListQueries.test.ts` — mocks `getDb()`; tests `getArmyLists()`, `getArmyListWithUnits()`, `createArmyList()`, `deleteArmyList()`, `addUnitToList()`, `removeUnitFromList()`, `updateArmyListUnit()`; verifies `points_override` uses `NULL` passthrough (not `COALESCE`) in the UPDATE statement
- [ ] `tests/foundation/strategyNoteQueries.test.ts` — mocks `getDb()`; tests `getStrategyNote()` returns `null` when no row exists; tests `upsertStrategyNote()` INSERT path (no existing row); tests `upsertStrategyNote()` UPDATE path (existing row found by SELECT)
- [ ] `tests/foundation/usePaints.test.ts` — verifies `useCreatePaint`, `useUpdatePaint`, and `useDeletePaint` each call `invalidateQueries` with both `PAINTS_KEY` (`['paints']`) and `PAINTS_WITH_RECIPES_KEY` (`['paints-with-recipes']`) in their `onSuccess` handlers

*Note: `tauri-plugin-sql` uses IPC — `db.select` and `db.execute` cannot call a real SQLite file in the Vitest jsdom environment. All query function tests mock `getDb()` and assert correct SQL strings and parameter arrays are passed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App launches without error after migration 004 runs | STRAT-06 (Success 1) | tauri-plugin-sql IPC cannot be exercised in Vitest; migration runs only in the real Tauri process | Run `pnpm tauri dev`, verify no console errors, open DevTools to confirm DB is accessible |
| `unit_strategy_notes` has 8 new nullable columns and pre-existing rows remain intact | STRAT-06 (Success 1) | Schema state can only be verified against the live SQLite file | After `pnpm tauri dev`, open DevTools console and run `window.__gsd_smoke?.()` or query the DB directly; confirm all 8 columns exist and seed rows are present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
