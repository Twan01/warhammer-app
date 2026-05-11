---
phase: 56
slug: game-day-mode
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
audited: 2026-05-11
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
| 56-01-T1 | 01 | 1 | GAME-01, GAME-03 | unit | `pnpm test -- tests/game-day/gameDayStore.test.ts tests/game-day/GameDayPage.test.tsx` | ✓ | green |
| 56-01-T2 | 01 | 1 | GAME-02, GAME-07 | unit | `pnpm test -- tests/game-day/StratagemsByPhase.test.tsx tests/game-day/CpTracker.test.tsx` | ✓ | green |
| 56-02-T1 | 02 | 2 | GAME-05, GAME-06, GAME-08 | unit | `pnpm test -- tests/game-day/UnitAbilityCards.test.tsx` | ✓ | green |
| 56-02-T2 | 02 | 2 | GAME-04 | unit | `pnpm test -- tests/game-day/PreGameChecklist.test.tsx` | ✓ | green |

*Status: pending / green / red / flaky*

---

## Test Coverage Summary

| Test File | Tests | Targets |
|-----------|-------|---------|
| `tests/game-day/gameDayStore.test.ts` | 13 | Store CRUD: spend/gain/undo CP, checklist toggle/add/reset, ability toggle |
| `tests/game-day/GameDayPage.test.tsx` | 4 | Page rendering: list name, faction badge, detachment, 3 tab triggers |
| `tests/game-day/StratagemsByPhase.test.tsx` | 6 | Phase grouping, reminders section, empty state, stratagem names |
| `tests/game-day/CpTracker.test.tsx` | 6 | CP spend/gain/undo/starting with specific value assertions |
| `tests/game-day/UnitAbilityCards.test.tsx` | 6 | Painting badge, OPG section, regular abilities, strategy notes, empty state |
| `tests/game-day/PreGameChecklist.test.tsx` | 4 | Default items, progress counter, add input, reset disabled state |

**Total: 39 automated tests across 6 files**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Game Day button navigates correctly from ArmyListDetailSheet | GAME-01 | E2E navigation requires Tauri runtime | Open army list detail, click Game Day, verify route |
| CP tracker persists across navigation | GAME-03 | localStorage persistence requires browser | Spend CP, navigate away, return, verify CP preserved |
| Checklist persists across navigation | GAME-04 | localStorage persistence requires browser | Check items, navigate away, return, verify checked state |
| Once-per-game toggle persists | GAME-06 | localStorage persistence requires browser | Toggle ability, navigate away, return, verify toggle state |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-05-11

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 8 requirements (GAME-01 through GAME-08) have automated test coverage across 6 test files (39 tests total). No gaps detected.
