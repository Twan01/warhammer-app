---
phase: 6
slug: foundation
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-01
audited: 2026-05-03
---

# Phase 6 — Validation Strategy

> Per-phase validation contract. All Wave 0 stubs filled and green.
> Phase shipped 2026-05-01. Audit confirmed compliant 2026-05-03.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react + jsdom |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run tests/foundation/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~3 seconds (foundation suite: 38 tests) |

---

## Sampling Rate

Phase 6 is complete and shipped. Retroactive audit confirmed all automated tests green.

- **Foundation suite:** `npx vitest run tests/foundation/` — 38 tests, ~3s
- **Full suite:** 210 tests green (no regressions from Phase 6 tests)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-??-01/02 | migration | 1 | STRAT-06 (SC-2) | Unit (file content) | `npx vitest run tests/foundation/migration004.test.ts` | ✅ exists | ✅ green |
| 6-??-03 | queries | 1 | STRAT-06 (SC-4) | Unit (mock db) | `npx vitest run tests/foundation/armyListQueries.test.ts` | ✅ exists | ✅ green |
| 6-??-04 | queries | 1 | STRAT-06 (SC-4) | Unit (mock db) | `npx vitest run tests/foundation/strategyNoteQueries.test.ts` | ✅ exists | ✅ green |
| 6-??-05/06 | hooks | 2 | STRAT-06 (SC-5) | Unit (hook) | `npx vitest run tests/foundation/usePaints.test.ts` | ✅ exists | ✅ green |
| 6-??-07 | types | 1 | STRAT-06 (SC-3) | Compile check | `pnpm exec tsc --noEmit` | Manual | ✅ verified |
| manual | — | — | STRAT-06 (SC-1) | Manual | app launch + DevTools | Manual | ✅ verified |

*Status: ✅ green · Manual — verified in human checkpoint*

---

## Wave 0 Requirements

- [x] `tests/foundation/migration004.test.ts` — reads `004_unit_playbook_stats.sql` as string; asserts only ALTER TABLE ADD COLUMN statements; all 8 column names present; save=INTEGER, keywords/abilities=TEXT; lib.rs version-4 entry — 6 tests green
- [x] `tests/foundation/armyListQueries.test.ts` — mocks `getDb()`; tests `getArmyLists()`, `getArmyListWithUnits()` (COALESCE effective_points), `createArmyList()`, `updateArmyList()`, `deleteArmyList()`, `addUnitToList()`, `removeUnitFromList()`, `updateArmyListUnit()` (NULL-passthrough, not COALESCE) — 10 tests green
- [x] `tests/foundation/strategyNoteQueries.test.ts` — mocks `getDb()`; tests `getStrategyNote()` null path, INSERT path (no existing row), UPDATE path (existing row found by SELECT); save column stores INTEGER not string — 5 tests green
- [x] `tests/foundation/usePaints.test.ts` — verifies `useCreatePaint`, `useUpdatePaint`, `useDeletePaint` each invalidate both `PAINTS_KEY` and `PAINTS_WITH_RECIPES_KEY`; `PAINTS_WITH_RECIPES_KEY` constant contract; `usePaintsWithRecipeCount` hook — 8 tests green

*Bonus: `tests/foundation/useUnits.test.ts` (9 tests, Phase 2 DATA-09 gap closure) also lives here.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| App launches without error after migration 004 | STRAT-06 SC-1 | tauri-plugin-sql IPC only exists in real Tauri process | ✅ Verified in 06-04 checkpoint |
| `unit_strategy_notes` has 8 nullable columns, pre-existing rows intact | STRAT-06 SC-1 | Schema state requires live SQLite file | ✅ Verified in 06-04 checkpoint |
| TypeScript types compile without errors | STRAT-06 SC-3 | Build-time check — `tsc --noEmit` exits 0 | ✅ Verified at end of each plan |

---

## Validation Audit 2026-05-03

| Metric | Count |
|--------|-------|
| Requirements audited | STRAT-06 SC-1..5 (5 success criteria) |
| Gaps found | 0 |
| Already green (automated) | 29 tests across 4 Wave 0 files |
| Already verified (manual-only) | 3 behaviors |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 all complete: 29 tests green across 4 test files (38 total including Phase 2 bonus)
- [x] No watch-mode flags
- [x] Feedback latency < 15s (foundation suite ~3s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** compliant 2026-05-03
