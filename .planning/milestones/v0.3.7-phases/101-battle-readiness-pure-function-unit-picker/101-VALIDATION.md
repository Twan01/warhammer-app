---
phase: 101
slug: battle-readiness-pure-function-unit-picker
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-28
---

# Phase 101 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/lib/readiness.test.ts tests/army-lists/UnitPickerDialog.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 101-01-01 | 01 | 1 | BRP-01 | T-101-01 | N/A (pure function, no I/O) | unit | `pnpm test -- tests/lib/readiness.test.ts` | ✅ | ✅ green |
| 101-02-01 | 02 | 2 | BRP-03 | T-101-02 | N/A (informational budget) | component | `pnpm test -- tests/army-lists/UnitPickerDialog.test.tsx` | ✅ | ✅ green |
| 101-02-02 | 02 | 2 | BRP-02, BRP-03 | T-101-03 | N/A (local data only) | component | `pnpm test -- tests/army-lists/UnitPickerDialog.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Audit 2026-05-28

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

### Tests Generated

| File | Tests | Covers |
|------|-------|--------|
| tests/lib/readiness.test.ts | 16 | BRP-01 (pre-existing, TDD) |
| tests/army-lists/UnitPickerDialog.test.tsx | 10 | BRP-02 (4 tests), BRP-03 (6 tests) |

---

## Validation Sign-Off

- [x] All tasks have automated verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-28
