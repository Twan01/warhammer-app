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
| 97-01-01 | 01 | 1 | ERR-01, ERR-02 | unit | `pnpm test -- tests/error-resilience/RouteErrorFallback.test.tsx` | ❌ W0 | ⬜ pending |
| 97-01-02 | 01 | 1 | ERR-02 | unit | `pnpm test -- tests/error-resilience/routerErrorComponents.test.ts` | ❌ W0 | ⬜ pending |
| 97-02-01 | 02 | 1 | ERR-03 | unit | `pnpm test -- tests/error-resilience/DbHealthGate.test.tsx` | ❌ W0 | ⬜ pending |
| 97-02-02 | 02 | 1 | ERR-04 | unit | `pnpm test -- tests/error-resilience/QueryProviderGlobalError.test.tsx` | ❌ W0 | ⬜ pending |
| 97-02-03 | 02 | 1 | ERR-04 | unit | `pnpm test -- tests/error-resilience/globalErrorHandlers.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/error-resilience/RouteErrorFallback.test.tsx` — stubs for ERR-01, ERR-02
- [ ] `tests/error-resilience/routerErrorComponents.test.ts` — stubs for ERR-02 route isolation
- [ ] `tests/error-resilience/DbHealthGate.test.tsx` — stubs for ERR-03
- [ ] `tests/error-resilience/QueryProviderGlobalError.test.tsx` — stubs for ERR-04 React Query
- [ ] `tests/error-resilience/globalErrorHandlers.test.ts` — stubs for ERR-04 window handlers
