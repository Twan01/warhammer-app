---
phase: 73
slug: schema-foundation-version-parity
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-14
---

# Phase 73 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/foundation/migration026.test.ts tests/foundation/migration027.test.ts tests/foundation/checkVersion.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 73-01-01 | 01 | 1 | DI-05 | unit (content-shape) | `pnpm test -- tests/foundation/migration026.test.ts` | ✅ | ✅ green |
| 73-01-02 | 01 | 1 | DI-05 | unit (content-shape) | `pnpm test -- tests/foundation/migration026.test.ts tests/foundation/migration027.test.ts` | ✅ | ✅ green |
| 73-02-01 | 02 | 1 | DI-05 | unit (runtime behavior) | `pnpm test -- tests/foundation/checkVersion.test.ts` | ✅ | ✅ green |
| 73-02-02 | 02 | 1 | DI-05 | unit (runtime behavior) | `pnpm test -- tests/foundation/checkVersion.test.ts` | ✅ | ✅ green |

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
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-14

---

## Validation Audit 2026-05-14

| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 4 |
| Escalated | 0 |

### Tests Created

| File | Tests | Coverage |
|------|-------|----------|
| `tests/foundation/migration026.test.ts` | 11 | Migration 026 schema shape + lib.rs v26 registration |
| `tests/foundation/migration027.test.ts` | 9 | Migration 027 additive-only contract + lib.rs v27 registration |
| `tests/foundation/checkVersion.test.ts` | 9 | check-version.mjs content shape + runtime exit codes |
