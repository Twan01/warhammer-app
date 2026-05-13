---
phase: 62
slug: applied-recipe-data-layer
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-13
---

# Phase 62 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts tests/painting/recipeAssignments.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~51 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/lib/computeAssignmentProgress.test.ts tests/painting/recipeAssignments.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 51 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 62-01-01 | 01 | 1 | AR-01 (SC-1: assignments table) | migration | `pnpm test -- tests/data-layer/recipe-persistence.test.ts` | ✅ | ✅ green |
| 62-01-02 | 01 | 1 | AR-01 (SC-2: step progress table) | migration | `pnpm test -- tests/data-layer/recipe-persistence.test.ts` | ✅ | ✅ green |
| 62-01-03 | 01 | 1 | AR-01 (SC-4: computeCompletionPercentage) | unit | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` | ✅ | ✅ green |
| 62-01-04 | 01 | 1 | AR-01 (SC-4: computeAssignmentProgress) | unit | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` | ✅ | ✅ green |
| 62-02-01 | 02 | 2 | AR-01 (SC-3: 8 query functions) | unit | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ✅ | ✅ green |
| 62-02-02 | 02 | 2 | AR-01 (SC-3: 7 React Query hooks) | integration | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ✅ | ✅ green |
| 62-02-03 | 02 | 2 | AR-01 (SC-3: 4 cache keys) | integration | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ✅ | ✅ green |
| 62-02-04 | 02 | 2 | D-13 (cache invalidation symmetry) | contract | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Test File Inventory

| Test File | Tests | Covers |
|-----------|-------|--------|
| `tests/lib/computeAssignmentProgress.test.ts` | 11 | SC-4: pure functions (percentage + progress computation) |
| `tests/painting/recipeAssignments.test.ts` | 31 | SC-3: all 8 query functions + 4 mutation hook invalidation contracts |
| `tests/data-layer/recipe-persistence.test.ts` | 3 | SC-1/SC-2: migration schema, cascade, non-destructive save |

**Total: 45 automated tests across 3 files**

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 51s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-13

---

## Validation Audit 2026-05-13

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
