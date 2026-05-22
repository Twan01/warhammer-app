---
phase: 98
slug: performance-optimization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-22
---

# Phase 98 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test && pnpm build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 98-01-01 | 01 | 1 | PERF-01 | unit | `pnpm test -- tests/performance/lazyRoutes.test.ts` | ❌ W0 | ⬜ pending |
| 98-01-02 | 01 | 1 | PERF-04 | unit | `pnpm test -- tests/performance/reactMemo.test.ts` | ❌ W0 | ⬜ pending |
| 98-02-01 | 02 | 1 | DBH-04 | unit | `pnpm test -- tests/performance/batchInsert.test.ts` | ❌ W0 | ⬜ pending |
| 98-03-01 | 03 | 1 | PERF-03 | unit | `pnpm test -- tests/performance/kanbanBatchEnrichment.test.ts` | ❌ W0 | ⬜ pending |
| 98-03-02 | 03 | 1 | PERF-02 | unit | `pnpm test -- tests/performance/invalidationAudit.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/performance/lazyRoutes.test.ts` — stubs for PERF-01 (lazy route verification)
- [ ] `tests/performance/reactMemo.test.ts` — stubs for PERF-04 (React.memo verification)
- [ ] `tests/performance/batchInsert.test.ts` — stubs for DBH-04 (multi-row INSERT)
- [ ] `tests/performance/kanbanBatchEnrichment.test.ts` — stubs for PERF-03 (batched enrichment)
- [ ] `tests/performance/invalidationAudit.test.ts` — stubs for PERF-02 (invalidation audit)

---

## Validation Architecture

### PERF-01: Lazy Routes
- Verify dynamic imports via mocked `import()` or checking chunk output in build
- Test Suspense fallback renders during loading state

### PERF-02: Invalidation Precision
- Mock React Query client and verify mutation onSuccess only invalidates expected keys
- Regression test: unit mutation must NOT invalidate recipe or battle log keys

### PERF-03: Kanban Batching
- Verify `getKanbanProgressByUnitIds` returns correct progress for multiple units in single query
- Verify empty unit list returns empty result

### PERF-04: React.memo
- Verify components are wrapped (check `.type` or `$$typeof` on memo'd component)
- Verify re-render count doesn't increase when parent re-renders with same props

### DBH-04: Batch INSERT
- Verify multi-row VALUES generates correct SQL with positional params
- Verify chunking at 200 rows produces correct number of batches
- Verify empty array guard prevents invalid SQL
