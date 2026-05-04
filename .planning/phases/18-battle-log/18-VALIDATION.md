---
phase: 18
slug: battle-log
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (vitest.config.ts) |
| **Config file** | `vitest.config.ts` — already configured, jsdom environment |
| **Quick run command** | `pnpm vitest run tests/battle-log/` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run tests/battle-log/`
- **After every plan wave:** Run `pnpm vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-00-01 | 00 | 0 | BATTLE-01,02,03,05 | unit | `pnpm vitest run tests/battle-log/battleLogQueries.test.ts` | ❌ W0 | ⬜ pending |
| 18-00-02 | 00 | 0 | BATTLE-04 | unit | `pnpm vitest run tests/battle-log/computeBattleLogSummary.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-01 | 01 | 1 | BATTLE-01,02,03,04,05 | unit | `pnpm vitest run tests/battle-log/battleLogQueries.test.ts` | ✅ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | BATTLE-04 | unit | `pnpm vitest run tests/battle-log/computeBattleLogSummary.test.ts` | ✅ W0 | ⬜ pending |
| 18-02-01 | 02 | 2 | BATTLE-01..05 | manual | Open Battle Log page, verify layout, nav, empty state | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/battle-log/battleLogQueries.test.ts` — stubs for BATTLE-01, BATTLE-02, BATTLE-03, BATTLE-05 (mocks `getDb()`, verifies SQL strings + param arrays; follows `tests/foundation/armyListQueries.test.ts`)
- [ ] `tests/battle-log/computeBattleLogSummary.test.ts` — stubs for BATTLE-04 (pure function, no mocks needed; follows `tests/spending/computeSpendingStats.test.ts`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Battle Log page renders in sidebar nav and is navigable | BATTLE-04 | Tauri window + React Router integration | Open app, click Battle Log in sidebar, verify page loads |
| Compact row displays result badge + opponent + mission + date correctly | BATTLE-04 | Visual layout verification | Log a game, verify row layout matches UI-SPEC mockup |
| Edit/Delete icons appear on row hover | BATTLE-05 | CSS hover state | Hover over a battle log row, verify icons appear |
| Inline expand shows structured notes on click | BATTLE-03 | DOM interaction | Click a row with notes, verify expand reveals lessons_learned, changes_next_time |
| Deleted army list displays "(Army list deleted)" | BATTLE-02 | DB FK SET NULL behavior | Log game with list, delete list, verify display text |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
