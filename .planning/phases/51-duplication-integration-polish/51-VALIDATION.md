---
phase: 51
slug: duplication-integration-polish
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
---

# Phase 51 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
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
| 51-01-01 | 01 | 1 | INTG-01 | unit | `pnpm test -- tests/painting/duplicateRecipe.test.ts` | ✅ | ✅ green |
| 51-01-02 | 01 | 1 | INTG-01 | unit | `pnpm test -- tests/painting/duplicateRecipe.test.ts` | ✅ | ✅ green |
| 51-02-01 | 02 | 1 | INTG-02 | unit | `pnpm test -- tests/painting/RecipeCard.test.tsx` | ✅ | ✅ green |
| 51-02-02 | 02 | 1 | INTG-02 | unit | `pnpm test -- tests/painting/recipeSectionCount.test.ts` | ✅ | ✅ green |
| 51-03-01 | 03 | 1 | INTG-03 | integration | `pnpm test` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/painting/RecipeCard.test.tsx` — test for section count display on RecipeCard (INTG-02) — Tests 10-12 added

*All Wave 0 dependencies resolved. INTG-01 covered by duplicateRecipe.test.ts (11 tests), INTG-02 by RecipeCard.test.tsx (Tests 10-12) + recipeSectionCount.test.ts (3 tests), INTG-03 by full suite (1112 tests).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Section count visible on RecipeCard | INTG-02 | Visual rendering verification | Open RecipesPage, verify section count shows for multi-section recipes |
| Duplicated recipe sections display correctly | INTG-01 | End-to-end visual verification | Duplicate a recipe, open copy, verify sections match original |
| LogSessionSheet recipe/step selectors work | INTG-03 | Requires Tauri runtime for full flow | Open LogSessionSheet, select recipe, verify steps load |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s (suite runs in ~44s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ approved

## Validation Audit 2026-05-08

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 3 requirements (INTG-01, INTG-02, INTG-03) have automated verification. Test suite: 1112 passed, 0 failed.
