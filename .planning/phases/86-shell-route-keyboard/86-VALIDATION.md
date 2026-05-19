---
phase: 86
slug: shell-route-keyboard
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-19
---

# Phase 86 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/painting-mode/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~69s (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting-mode/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 70 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 86-01-01 | 01 | 1 | PX-02 | T-86-02 | Keyboard event flooding accepted (low risk desktop app) | integration | `pnpm test -- tests/painting-mode/PaintingModePage.test.tsx` | ✅ | ✅ green |
| 86-01-02 | 01 | 1 | PX-03 | — | N/A | integration | `pnpm test -- tests/painting-mode/PaintingModePage.test.tsx` | ✅ | ✅ green |
| 86-01-03 | 01 | 1 | PX-04 | — | N/A | integration | `pnpm test -- tests/painting-mode/PaintingModePage.test.tsx` | ✅ | ✅ green |
| 86-01-04 | 01 | 1 | PX-05 | — | Shortcuts disabled when focus inside form input | integration | `pnpm test -- tests/painting-mode/PaintingModePage.test.tsx` | ✅ | ✅ green |
| 86-01-05 | 01 | 1 | PX-06 | — | N/A | unit | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx` | ✅ | ✅ green |
| 86-02-01 | 02 | 2 | SP-05 | T-86-03 | Progress display uses local data only (accept) | unit | `pnpm test -- tests/painting-mode/SectionNavigator.test.tsx` | ✅ | ✅ green |
| 86-02-02 | 02 | 2 | D-10 | — | N/A | unit | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 70s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-19

---

## Validation Audit 2026-05-19

| Metric | Count |
|--------|-------|
| Requirements audited | 7 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Result:** Full Nyquist compliance — all 7 requirements (PX-02 through PX-06, SP-05, D-10) have automated test coverage across 3 test files with 10+ targeted test cases. Full suite: 211 files, 1901 tests, 0 failures.
