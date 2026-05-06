---
phase: 33
slug: data-intelligence
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-06
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vite.config.ts` (vitest config inline) |
| **Quick run command** | `pnpm test -- tests/spending/computeSpendingStats.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run relevant test file for the task
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 33-00-01 | 00 | 0 | DATA-02,05,06 | stubs | `pnpm test -- tests/dashboard/useLogSessionWithStatus.test.ts tests/painting/recipeDetailSheet.test.ts` | ✅ | ✅ green |
| 33-01-01 | 01 | 1 | DATA-01 | unit | `pnpm test -- tests/dashboard/logSessionSchema.test.ts` | ✅ | ✅ green |
| 33-01-02 | 01 | 1 | DATA-01,02 | unit + RTL | `pnpm test -- tests/dashboard/useLogSessionWithStatus.test.tsx && pnpm build` | ✅ | ✅ green |
| 33-02-01 | 02 | 1 | DATA-03,04 | unit | `pnpm test -- tests/spending/computeSpendingStats.test.ts` | ✅ | ✅ green |
| 33-02-02 | 02 | 1 | DATA-03,04 | unit + RTL | `pnpm test -- tests/spending/SpendingPage.test.tsx && pnpm build` | ✅ | ✅ green |
| 33-03-01 | 03 | 1 | DATA-05 | unit (RTL) | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx && pnpm build` | ✅ | ✅ green |
| 33-03-02 | 03 | 1 | DATA-06 | unit (RTL) | `pnpm test -- tests/dashboard/CurrentFocusCard.test.tsx && pnpm build` | ✅ | ✅ green |

*Status: ⬜ pending | ✅ green | ❌ red | ⚠️ flaky*

---

## Wave 0 Requirements (33-00-PLAN.md)

- [x] `tests/dashboard/useLogSessionWithStatus.test.ts` — stubs for DATA-02 cache invalidation (plan 00 creates)
- [x] `tests/painting/recipeDetailSheet.test.ts` — stubs for DATA-05 unit link Button render (plan 00 creates)
- [x] `tests/dashboard/CurrentFocusCard.test.ts` — extend with DATA-06 recipe display stubs (plan 00 extends)
- [x] `tests/spending/SpendingPage.test.tsx` — extend with DATA-03/04 metric card stubs (plan 00 extends)
- [x] Extend `tests/spending/computeSpendingStats.test.ts` — add DATA-03/04 cases (plan 02 task 1 handles via TDD)

*Existing infrastructure covers framework install.*

---

## Sampling Continuity Check

No 3+ consecutive tasks verify with `pnpm build` only:
- 33-01-01: `pnpm test -- logSessionSchema.test.ts` (behavioral)
- 33-01-02: `pnpm test -- useLogSessionWithStatus.test.ts && pnpm build` (behavioral + type)
- 33-02-01: `pnpm test -- computeSpendingStats.test.ts` (behavioral)
- 33-02-02: `pnpm test -- SpendingPage.test.tsx && pnpm build` (behavioral + type)
- 33-03-01: `pnpm test -- recipeDetailSheet.test.ts && pnpm build` (behavioral + type)
- 33-03-02: `pnpm test -- CurrentFocusCard.test.ts && pnpm build` (behavioral + type)

Maximum consecutive build-only tasks: 0 (all have behavioral tests).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LogSessionSheet UI flow (select status -> submit -> see dashboard update) | DATA-01, DATA-02 | Full E2E flow crosses Tauri bridge | Open app -> Log Session -> Select status -> Submit -> Verify dashboard StatCards update |
| Spending page metric card layout | DATA-03, DATA-04 | Visual layout verification | Open Spending page -> Verify 2 metric cards between hero and Monthly Trend |
| RecipeDetailSheet -> Collection navigation | DATA-05 | Navigation crosses page boundaries | Open Recipe detail -> Click linked unit -> Verify Collection page opens |
| CurrentFocusCard recipe name display | DATA-06 | Depends on Phase 31 UI | Open Dashboard -> Verify recipe name appears below faction name on focus card |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-06

---

## Validation Audit 2026-05-06

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 6 requirements (DATA-01 through DATA-06) have behavioral automated tests. Full suite: 768 tests pass, 107 test files pass. No gaps detected.
