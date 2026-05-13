---
phase: 63
slug: applied-recipe-ux
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-13
validated: 2026-05-13
---

# Phase 63 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/applied-recipes/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/applied-recipes/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 63-01-01 | 01 | 1 | — | setup | `npx tsc --noEmit` | ✅ | ✅ green |
| 63-01-02 | 01 | 1 | AR-03 | component | `pnpm test -- tests/applied-recipes/assignmentChecklist.test.tsx` | ✅ | ✅ green |
| 63-02-01 | 02 | 2 | AR-02 | component | `pnpm test -- tests/applied-recipes/applyRecipeDialog.test.tsx` | ✅ | ✅ green |
| 63-02-02 | 02 | 2 | AR-04 | component | `pnpm test -- tests/applied-recipes/appliedRecipesTab.test.tsx` | ✅ | ✅ green |
| 63-03-01 | 03 | 2 | AR-07 | component | `pnpm test -- tests/applied-recipes/applyToUnitsDialog.test.tsx` | ✅ | ✅ green |
| 63-03-02 | 03 | 2 | AR-07 | integration | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test Coverage Summary

| Test File | Tests | Pass | Fail |
|-----------|-------|------|------|
| tests/applied-recipes/assignmentChecklist.test.tsx | 5 | 5 | 0 |
| tests/applied-recipes/applyRecipeDialog.test.tsx | 4 | 4 | 0 |
| tests/applied-recipes/appliedRecipesTab.test.tsx | 4 | 4 | 0 |
| tests/applied-recipes/applyToUnitsDialog.test.tsx | 5 | 5 | 0 |
| tests/painting/recipeDetailSheet.test.tsx | 32 | 32 | 0 |
| **Total** | **50** | **50** | **0** |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recipe preview renders SectionedTimeline in Dialog | AR-02 | Visual layout verification | Open unit detail → Apply Recipe → select a recipe → verify sections/steps display |
| Progress bar fills proportionally on step toggle | AR-04 | Visual animation + calculation verification | Apply a recipe → toggle steps → verify progress bar updates in real-time |
| Bulk apply creates independent progress per unit | AR-07 | Multi-entity state verification | Apply recipe to 3 units → toggle steps on one → verify others unchanged |

---

## Validation Audit 2026-05-13

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] All test files exist on disk
- [x] All 50 tests pass (18 applied-recipes + 32 RecipeDetailSheet)
- [x] Feedback latency < 15s (~10s actual)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated
