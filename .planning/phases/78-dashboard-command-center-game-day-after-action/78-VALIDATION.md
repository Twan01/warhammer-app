---
phase: 78
slug: dashboard-command-center-game-day-after-action
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 78-01-01 | 01 | 1 | DB-01 | — | N/A | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 78-01-02 | 01 | 1 | DB-02 | — | N/A | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 78-01-03 | 01 | 1 | DB-03 | — | N/A | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 78-02-01 | 02 | 1 | GD-01 | — | N/A | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 78-02-02 | 02 | 1 | GD-02 | — | N/A | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 78-02-03 | 02 | 1 | GD-03, GD-04 | — | N/A | unit | `pnpm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing test infrastructure covers this phase (Vitest + RTL already configured)

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
