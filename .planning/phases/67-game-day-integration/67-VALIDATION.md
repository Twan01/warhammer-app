---
phase: 67
slug: game-day-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-13
---

# Phase 67 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 67-01-01 | 01 | 1 | GD-01 | — | N/A | unit | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` | ❌ W0 | ⬜ pending |
| 67-01-02 | 01 | 1 | GD-01 | — | N/A | unit | `pnpm test -- tests/game-day/GameDayPage.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/game-day/GameDayReadinessPanel.test.tsx` — stubs for GD-01 (points display, freshness, warnings, readiness gaps, role coverage, collapsible detail, all-clear state)
- [ ] Update `tests/game-day/GameDayPage.test.tsx` — assert GameDayReadinessPanel presence, fix mock field names, add `tactical_role` to unit mock

*Existing infrastructure covers test framework needs — no new installs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual layout matches Game Day aesthetic | GD-01 | CSS layout cannot be tested via jsdom | Open Game Day page, verify panel renders between header and tabs with correct styling |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
