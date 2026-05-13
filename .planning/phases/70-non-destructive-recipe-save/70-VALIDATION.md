---
phase: 70
slug: non-destructive-recipe-save
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-13
---

# Phase 70 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/painting/recipeSection.pure.test.ts tests/painting/recipeSteps.test.ts tests/painting/recipeDiff.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/recipeSection.pure.test.ts tests/painting/recipeSteps.test.ts tests/painting/recipeDiff.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 70-01-01 | 01 | 1 | REC-02 | — | N/A | unit | `pnpm test -- tests/painting/recipeSection.pure.test.ts` | ✅ | ✅ green |
| 70-01-02 | 01 | 1 | REC-02 | — | N/A | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ | ✅ green |
| 70-02-01 | 02 | 1 | REC-02 | — | N/A | unit | `pnpm test -- tests/painting/recipeDiff.test.ts` | ✅ | ✅ green |
| 70-02-02 | 02 | 1 | REC-02 | — | N/A | unit | `pnpm test -- tests/painting/recipeDiff.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] New diff tests in `tests/painting/recipeDiff.test.ts` — section diff (UPDATE/DELETE/INSERT), sectionIdMap seeding, step-dragged-to-new-section edge case (28 tests)
- [x] Extend `tests/painting/recipeSteps.test.ts` — `dbId` on `DraftStep`, `makeDraftStep` with `dbId: null`

*Diff logic extracted to `src/features/recipes/recipeDiff.ts` (pure functions) for testability.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual UI: edit recipe, save, reopen — step/section IDs preserved | REC-02 | End-to-end UX flow with DB persistence | 1. Open recipe edit sheet, 2. Rename a step, 3. Save, 4. Reopen, 5. Verify renamed step has same visual position and data integrity |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-05-13

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

**Details:**
- Gap 70-02-01 (section diff algorithm): Extracted `computeSectionDiff` + `buildSectionIdMap` to `recipeDiff.ts`, 16 tests
- Gap 70-02-02 (step diff + cross-section drag): Extracted `computeStepDiff` to `recipeDiff.ts`, 12 tests
- RecipeFormSheet.tsx refactored to call extracted functions (identical behavior)
