---
phase: 105
slug: collection-integration
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-30
validated: 2026-05-30
---

# Phase 105 — Validation Strategy

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
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|--------------------|--------|
| T1 | 105-01 | 1 | COL-02 | migration | `pnpm test` | green |
| T2 | 105-01 | 1 | COL-03 | migration | `pnpm test` | green |
| T3 | 105-01 | 1 | COL-02 | type-check | `pnpm build` | green |
| T4 | 105-02 | 2 | COL-01 | component | `pnpm test -- tests/collection/addToCollectionFlow.test.tsx` | green |
| T5 | 105-02 | 2 | COL-04 | component | `pnpm test -- tests/collection/udbCollectionLink.test.ts` | green |
| T6 | 105-02 | 2 | COL-05 | component | `pnpm test -- tests/collection/udbCollectionLink.test.ts` | green |
| T7 | 105-02 | 2 | COL-06 | query | `pnpm test -- tests/data-health/unlinkedUnitsDiagnostic.test.ts` | green |
| T8 | 105-02 | 2 | COL-07 | component | `pnpm test -- tests/units/UnitSheet.prefill.test.tsx` | green |

---

## Validation Architecture

Derived from RESEARCH.md — covers migration safety, type extension, ownership queries, readiness aggregation, diagnostic extension, and "Add from Database" pre-fill flow.

---

## Validation Audit 2026-05-30

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

**Gap 1 (COL-01):** Added `tests/collection/addToCollectionFlow.test.tsx` — 14 tests covering UdbDatasheetSheet button rendering, label switching, faction mapping, and data extraction.

**Gap 2 (COL-07):** Added `tests/units/UnitSheet.prefill.test.tsx` — 9 tests covering buildDefaultValues overlay, prefillUdbUnitId pass-through, and Database Link status text.
