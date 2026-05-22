---
phase: 97
slug: error-resilience
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-22
---

# Phase 97 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 97-01-01 | 01 | 1 | ERR-01 | unit | `pnpm test -- tests/common/RouteErrorFallback.test.tsx` | ❌ W0 | ⬜ pending |
| 97-01-02 | 01 | 1 | ERR-02 | unit | `pnpm test -- tests/common/RouteErrorFallback.test.tsx` | ❌ W0 | ⬜ pending |
| 97-01-03 | 01 | 1 | ERR-03 | unit | `pnpm test -- tests/common/DbHealthGate.test.tsx` | ❌ W0 | ⬜ pending |
| 97-01-04 | 01 | 1 | ERR-04 | unit | `pnpm test -- tests/common/GlobalErrorHandlers.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/common/RouteErrorFallback.test.tsx` — stubs for ERR-01, ERR-02
- [ ] `tests/common/DbHealthGate.test.tsx` — stubs for ERR-03
- [ ] `tests/common/GlobalErrorHandlers.test.tsx` — stubs for ERR-04
