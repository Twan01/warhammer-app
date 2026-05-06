---
phase: 33
slug: data-intelligence
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 33-01-01 | 01 | 1 | DATA-01 | unit | `pnpm test -- tests/dashboard/logSessionSchema.test.ts` | ❌ W0 | ⬜ pending |
| 33-01-02 | 01 | 1 | DATA-01 | unit | included in logSessionSchema.test.ts | ❌ W0 | ⬜ pending |
| 33-01-03 | 01 | 1 | DATA-02 | unit (mock QC) | `pnpm test -- tests/dashboard/useLogSessionWithStatus.test.ts` | ❌ W0 | ⬜ pending |
| 33-02-01 | 02 | 1 | DATA-03 | unit | `pnpm test -- tests/spending/computeSpendingStats.test.ts` | ✅ (extend) | ⬜ pending |
| 33-02-02 | 02 | 1 | DATA-03 | unit | included in computeSpendingStats.test.ts | ✅ (extend) | ⬜ pending |
| 33-02-03 | 02 | 1 | DATA-04 | unit | included in computeSpendingStats.test.ts | ✅ (extend) | ⬜ pending |
| 33-03-01 | 03 | 1 | DATA-05 | unit (RTL) | `pnpm test -- tests/painting/recipeDetailSheet.test.ts` | ❌ W0 | ⬜ pending |
| 33-03-02 | 03 | 1 | DATA-06 | unit (RTL) | `pnpm test -- tests/dashboard/currentFocusCard.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/dashboard/logSessionSchema.test.ts` — stubs for DATA-01 schema extension
- [ ] `tests/dashboard/useLogSessionWithStatus.test.ts` — stubs for DATA-02 cache invalidation
- [ ] `tests/painting/recipeDetailSheet.test.ts` — stubs for DATA-05 unit link Button render
- [ ] `tests/dashboard/currentFocusCard.test.ts` — stubs for DATA-06 recipe name display
- [ ] Extend `tests/spending/computeSpendingStats.test.ts` — add DATA-03/04 cases

*Existing infrastructure covers framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LogSessionSheet UI flow (select status → submit → see dashboard update) | DATA-01, DATA-02 | Full E2E flow crosses Tauri bridge | Open app → Log Session → Select status → Submit → Verify dashboard StatCards update |
| Spending page metric card layout | DATA-03, DATA-04 | Visual layout verification | Open Spending page → Verify 2 metric cards between hero and Monthly Trend |
| RecipeDetailSheet → Collection navigation | DATA-05 | Navigation crosses page boundaries | Open Recipe detail → Click linked unit → Verify Collection page opens |
| CurrentFocusCard recipe name display | DATA-06 | Depends on Phase 31 UI | Open Dashboard → Verify recipe name appears below faction name on focus card |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
