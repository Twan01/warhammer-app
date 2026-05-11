---
phase: 56
slug: game-day-mode
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-11
---

# Phase 56 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/game-day/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/game-day/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 56-01-01 | 01 | 1 | GAME-03 | unit | `pnpm test -- tests/game-day/gameDayStore.test.ts` | ❌ W0 | ⬜ pending |
| 56-01-02 | 01 | 1 | GAME-01 | unit | `pnpm test -- tests/game-day/GameDayPage.test.tsx` | ❌ W0 | ⬜ pending |
| 56-02-01 | 02 | 1 | GAME-02, GAME-07 | unit | `pnpm test -- tests/game-day/StratagemsByPhase.test.tsx` | ❌ W0 | ⬜ pending |
| 56-02-02 | 02 | 1 | GAME-03 | unit | `pnpm test -- tests/game-day/CpTracker.test.tsx` | ❌ W0 | ⬜ pending |
| 56-03-01 | 03 | 2 | GAME-04 | unit | `pnpm test -- tests/game-day/PreGameChecklist.test.tsx` | ❌ W0 | ⬜ pending |
| 56-03-02 | 03 | 2 | GAME-05, GAME-06, GAME-08 | unit | `pnpm test -- tests/game-day/UnitAbilityCards.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/game-day/gameDayStore.test.ts` — Zustand persist store tests for CP, checklist, OPG toggles
- [ ] `tests/game-day/GameDayPage.test.tsx` — Route rendering, header display, tab navigation
- [ ] `tests/game-day/StratagemsByPhase.test.tsx` — Phase grouping logic, reminders pinning
- [ ] `tests/game-day/CpTracker.test.tsx` — CP increment/decrement, undo, spend via stratagem
- [ ] `tests/game-day/PreGameChecklist.test.tsx` — Checkbox toggle, custom item add, reset
- [ ] `tests/game-day/UnitAbilityCards.test.tsx` — Collapsible cards, OPG toggle, painting status badge

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Game Day button navigates correctly from ArmyListDetailSheet | GAME-01 | E2E navigation requires Tauri runtime | Open army list detail → click Game Day → verify route |
| CP tracker persists across navigation | GAME-03 | localStorage persistence requires browser | Spend CP → navigate away → return → verify CP preserved |
| Checklist persists across navigation | GAME-04 | localStorage persistence requires browser | Check items → navigate away → return → verify checked state |
| Once-per-game toggle persists | GAME-06 | localStorage persistence requires browser | Toggle ability → navigate away → return → verify toggle state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
