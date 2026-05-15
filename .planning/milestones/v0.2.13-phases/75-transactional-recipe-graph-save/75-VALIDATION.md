---
phase: 75
slug: transactional-recipe-graph-save
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-14
validated: 2026-05-15
---

# Phase 75 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~1.6 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/saveRecipeGraph.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 75-01-01 | 01 | 1 | DI-03 | T-75-01 | Atomic save: all-or-nothing on error | unit | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` | ✅ | ✅ green |
| 75-01-02 | 01 | 1 | DI-03 | T-75-01 | ROLLBACK leaves recipe in previous state | unit | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` | ✅ | ✅ green |
| 75-01-03 | 01 | 1 | DI-04 | — | Existing section/step IDs preserved | unit | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` | ✅ | ✅ green |
| 75-01-04 | 01 | 1 | DI-04 | — | New section/step IDs assigned | unit | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` | ✅ | ✅ green |
| 75-02-01 | 02 | 2 | DI-03 | T-75-03 | RecipeFormSheet calls saveRecipeGraph | build | `pnpm build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test Coverage Detail

| Describe Block | Tests | Covers |
|---------------|-------|--------|
| saveRecipeGraph — create path (recipeId = null) | 7 | BEGIN, INSERT recipe, return id, section inserts, step inserts, order_index, COMMIT |
| saveRecipeGraph — edit path (recipeId = 42) | 11 | BEGIN, UPDATE recipe, return id, delete/update/insert sections, delete/update/insert steps, sectionIdMap extension, COMMIT |
| saveRecipeGraph — rollback on error | 3 | ROLLBACK on create error, error re-thrown, ROLLBACK on edit error |
| **Total** | **21** | |

---

## Wave 0 Requirements

- [x] `tests/painting/saveRecipeGraph.test.ts` — 21 tests covering DI-03 + DI-04; mocks `@/db/client` to intercept `db.execute` calls
- [x] Reference: `tests/painting/duplicateRecipe.test.ts` mock pattern followed

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s (actual: ~1.6s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ validated 2026-05-15

---

## Validation Audit 2026-05-15

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Tests verified | 21/21 passing |
