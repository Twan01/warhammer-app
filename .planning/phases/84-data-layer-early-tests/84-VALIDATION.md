---
phase: 84
slug: data-layer-early-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-19
---

# Phase 84 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/painting-mode/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting-mode/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 84-01-01 | 01 | 1 | DL-01 | — | N/A | unit | `pnpm test -- tests/painting-mode/completeStepWithSession.test.ts` | ❌ W0 | ⬜ pending |
| 84-01-02 | 01 | 1 | DL-02 | — | N/A | unit | `pnpm test -- tests/painting-mode/paintingModeState.test.ts` | ❌ W0 | ⬜ pending |
| 84-01-03 | 01 | 1 | DL-03 | — | N/A | unit | `pnpm test -- tests/painting-mode/useCompleteStep.test.ts` | ❌ W0 | ⬜ pending |
| 84-01-04 | 01 | 1 | DL-04 | — | N/A | unit | `pnpm test -- tests/painting-mode/paintingModeState.test.ts` | ❌ W0 | ⬜ pending |
| 84-02-01 | 02 | 1 | TS-01 | — | N/A | unit | `pnpm test -- tests/painting-mode/paintingModeState.test.ts` | ❌ W0 | ⬜ pending |
| 84-02-02 | 02 | 1 | TS-02 | — | N/A | unit | `pnpm test -- tests/painting-mode/completeStepWithSession.test.ts` | ❌ W0 | ⬜ pending |
| 84-02-03 | 02 | 1 | TS-03 | — | N/A | unit | `pnpm test -- tests/painting-mode/paintingModeState.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/painting-mode/completeStepWithSession.test.ts` — SQL assertions for atomic transaction (DL-01)
- [ ] `tests/painting-mode/paintingModeState.test.ts` — navigation logic tests (DL-02, DL-04, TS-01, TS-03)
- [ ] `tests/painting-mode/useCompleteStep.test.ts` — hook invalidation contract (DL-03)

*Existing test infrastructure covers the framework. Only test files are needed.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
