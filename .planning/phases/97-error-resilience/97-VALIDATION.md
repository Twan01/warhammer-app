---
phase: 97
slug: error-resilience
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-22
validated: 2026-05-22
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
| 97-01-01 | 01 | 1 | ERR-01, ERR-02 | unit | `pnpm test -- tests/error-resilience/RouteErrorFallback.test.tsx` | ✅ | ✅ green |
| 97-01-02 | 01 | 1 | ERR-02 | unit | `pnpm test -- tests/error-resilience/routerErrorComponents.test.ts` | ✅ | ✅ green |
| 97-02-01 | 02 | 1 | ERR-03 | unit | `pnpm test -- tests/error-resilience/DbHealthGate.test.tsx` | ✅ | ✅ green |
| 97-02-02 | 02 | 1 | ERR-04 | unit | `pnpm test -- tests/error-resilience/QueryProviderGlobalError.test.tsx` | ✅ | ✅ green |
| 97-02-03 | 02 | 1 | ERR-04 | unit | `pnpm test -- tests/error-resilience/globalErrorHandlers.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/error-resilience/RouteErrorFallback.test.tsx` — 5 tests for ERR-01 (heading, DEV display, PROD hiding, reset callback, dashboard link)
- [x] `tests/error-resilience/routerErrorComponents.test.ts` — 2 tests for ERR-02 (layoutRoute + bareLayoutRoute errorComponent identity)
- [x] `tests/error-resilience/DbHealthGate.test.tsx` — 5 tests for ERR-03 (health pass, getDb throw, version mismatch, retry, constant)
- [x] `tests/error-resilience/QueryProviderGlobalError.test.tsx` — 2 tests for ERR-04 (QueryCache onError, MutationCache onError)
- [x] `tests/error-resilience/globalErrorHandlers.test.ts` — 4 tests for ERR-04 (onerror structured, missing params, rejection Error, rejection non-Error)

---

## Manual-Only

None.

---

## Sign-Off

| Metric | Value |
|--------|-------|
| Total requirements | 4 (ERR-01 through ERR-04) |
| Automated coverage | 4/4 (100%) |
| Total test cases | 18 |
| All green | Yes |
| Nyquist compliant | Yes |

---

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
