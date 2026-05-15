---
phase: 78
slug: dashboard-command-center-game-day-after-action
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-15
---

# Phase 78 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 78-01-01 | 01 | 1 | DB-01 | — | N/A | unit | `pnpm test -- tests/battle-log/battleLogQueries.test.ts` | ✅ | ✅ green |
| 78-01-02 | 01 | 1 | DB-02 | T-78-01 | JSON.parse try/catch; dedup via Set | unit | `pnpm test -- tests/battle-log/getRecentForgottenRules.test.ts` | ✅ | ✅ green |
| 78-01-03 | 01 | 1 | DB-03 | — | N/A | unit | `pnpm test -- tests/dashboard/useNextPaintingAction.test.ts` | ✅ | ✅ green |
| 78-02-01 | 02 | 1 | GD-01 | — | N/A | unit | `pnpm test -- tests/dashboard/NextPaintingActionCard.test.tsx` | ✅ | ✅ green |
| 78-02-02 | 02 | 1 | GD-02 | — | N/A | unit | `pnpm test -- tests/dashboard/ReadyToPlayCard.test.tsx` | ✅ | ✅ green |
| 78-02-03 | 02 | 1 | GD-03, GD-04 | — | N/A | unit | `pnpm test -- tests/dashboard/DataHealthSummaryCard.test.tsx` | ✅ | ✅ green |
| 78-03-03 | 03 | 2 | GD-03 | — | N/A | unit | `pnpm test -- tests/game-day/PreGameChecklist.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Existing test infrastructure covers this phase (Vitest + RTL already configured)

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard cards render with live data | DB-01, DB-02, DB-03 | Requires SQLite with real data | Run `pnpm tauri dev`, verify cards on dashboard |
| End Game pre-fill populates correctly | GD-01 | Requires Game Day session context | Start Game Day, click End Game, verify form fields |
| Forgotten rules appear as reminders | GD-03 | Requires battle log with forgotten_rules data | Log a game with forgotten rules, re-enter Game Day, verify checklist |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-05-15 — all 6 gaps filled, 1717 tests green
