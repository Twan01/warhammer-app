---
phase: 51
slug: duplication-integration-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 51-01-01 | 01 | 1 | INTG-01 | unit | `pnpm test -- tests/painting/duplicateRecipe.test.ts` | ✅ | ⬜ pending |
| 51-01-02 | 01 | 1 | INTG-01 | unit | `pnpm test -- tests/painting/duplicateRecipe.test.ts` | ✅ | ⬜ pending |
| 51-02-01 | 02 | 1 | INTG-02 | unit | `pnpm test -- tests/painting/RecipeCard.test.ts` | ❌ W0 | ⬜ pending |
| 51-02-02 | 02 | 1 | INTG-02 | unit | `pnpm test -- tests/painting/RecipeCard.test.ts` | ❌ W0 | ⬜ pending |
| 51-03-01 | 03 | 1 | INTG-03 | integration | `pnpm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/painting/RecipeCard.test.ts` — test for section count display on RecipeCard (INTG-02)

*Existing test infrastructure covers INTG-01 (duplicateRecipe.test.ts exists) and INTG-03 (regression tests exist across recipe test files).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Section count visible on RecipeCard | INTG-02 | Visual rendering verification | Open RecipesPage, verify section count shows for multi-section recipes |
| Duplicated recipe sections display correctly | INTG-01 | End-to-end visual verification | Duplicate a recipe, open copy, verify sections match original |
| LogSessionSheet recipe/step selectors work | INTG-03 | Requires Tauri runtime for full flow | Open LogSessionSheet, select recipe, verify steps load |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
