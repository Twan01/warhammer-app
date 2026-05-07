---
phase: 38
slug: structured-step-input
status: audited
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-07
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vite.config.ts` (vitest section) |
| **Quick run command** | `pnpm test -- tests/painting/recipeSteps.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/recipeSteps.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 38-01-01 | 01 | 1 | STEP-01 | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ | ✅ green |
| 38-01-02 | 01 | 1 | STEP-01 | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ✅ | ✅ green |
| 38-01-03 | 01 | 1 | STEP-01/03 | unit | `pnpm test -- tests/painting/recipeStepRow.test.tsx` | ✅ | ✅ green |
| 38-01-04 | 01 | 1 | STEP-02 | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ | ✅ green |
| 38-01-05 | 01 | 1 | STEP-03 | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ | ✅ green |
| 38-01-06 | 01 | 1 | STEP-03 | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ✅ | ✅ green |
| 38-01-07 | 01 | 1 | STEP-04 | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ | ✅ green |
| 38-01-08 | 01 | 1 | STEP-04 | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ✅ | ✅ green |
| 38-01-09 | 01 | 1 | STEP-04 | unit | `pnpm test -- tests/painting/formatMinutes.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/painting/addRecipePaintQuery.test.ts` — 5 tests covering INSERT column correctness, param order, null guards
- [x] `tests/painting/recipeStepRow.test.tsx` — 21 tests covering painting_phase Select, tool/technique/dilution/time inputs, old datalist removal
- [x] `tests/painting/formatMinutes.test.tsx` — 6 tests covering formatMinutes via RecipeFormSheet render (0/30/60/90 min, multi-step sums)

*Existing `tests/painting/recipeSteps.test.ts` extended with 6 new tests during Plan 01 execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop reorder persists after close/reopen | STEP-02 | Requires Tauri + SQLite round-trip | Open recipe, drag step, save, close sheet, reopen — verify order |
| Two-line layout renders correctly in Tauri window | STEP-01/03 | Visual layout verification in native window | Open recipe form, add step, confirm two-line arrangement |
| Time sum updates live as steps change | STEP-04 | UI reactivity check in running app | Add steps with time estimates, verify header sum changes |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-07

---

## Validation Audit 2026-05-07

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved | 3 |
| Escalated | 0 |

**Tests added:** 32 new tests (5 + 21 + 6) across 3 files
**Commit:** `715f129` test(phase-38): add Nyquist validation tests
