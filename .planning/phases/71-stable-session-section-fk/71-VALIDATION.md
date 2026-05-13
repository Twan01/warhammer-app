---
phase: 71
slug: stable-session-section-fk
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-13
---

# Phase 71 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts tests/dashboard/logSessionSchema.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts tests/dashboard/logSessionSchema.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | 71-01 | 1 | REC-04 | — | Parameterized $8 prevents injection | unit | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts` | ✅ (needs update) | pending |
| TBD | 71-01 | 1 | REC-04 | — | Zod int().positive().nullable() validates input | unit | `pnpm test -- tests/dashboard/logSessionSchema.test.ts` | ✅ (needs update) | pending |
| TBD | 71-01 | 1 | REC-04 | — | TypeScript types match DB schema | type | `pnpm build` | ✅ | pending |

---

## Wave 0 Gaps

None — existing test files cover both affected modules. Tests need updating (not creation).
