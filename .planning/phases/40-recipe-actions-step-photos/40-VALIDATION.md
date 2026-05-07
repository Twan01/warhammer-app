---
phase: 40
slug: recipe-actions-step-photos
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-07
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/painting/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 1 | STEP-05, PAINT-02 | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ✅ (update) | ⬜ pending |
| 40-01-02 | 01 | 1 | STEP-05 | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ (extend) | ⬜ pending |
| 40-01-03 | 01 | 1 | PAINT-02 | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ (extend) | ⬜ pending |
| 40-02-01 | 02 | 1 | STUDIO-03 | unit | `pnpm test -- tests/painting/duplicateRecipe.test.ts` | ❌ Wave 0 | ⬜ pending |
| 40-02-02 | 02 | 1 | STUDIO-03 | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ (extend) | ⬜ pending |
| 40-03-01 | 03 | 2 | STEP-05 | component | `pnpm test -- tests/painting/recipeStepRow.test.tsx` | ✅ (extend) | ⬜ pending |
| 40-03-02 | 03 | 2 | STEP-05 | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ (extend) | ⬜ pending |
| 40-04-01 | 04 | 2 | PAINT-02 | component | `pnpm test -- tests/painting/recipeStepRow.test.tsx` | ✅ (extend) | ⬜ pending |
| 40-04-02 | 04 | 2 | PAINT-03 | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/painting/duplicateRecipe.test.ts` — stubs for STUDIO-03 (recipe copy, step copy, name suffix)
- [ ] Update `tests/painting/addRecipePaintQuery.test.ts` — change 10-column assertions to 12-column for step_photo_path + alt_paint_id

*Existing test files for recipeSteps, recipeStepRow, recipeDetailSheet need extensions, not creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Photo file picker opens native dialog | STEP-05 | Tauri plugin-dialog unavailable in jsdom | Open recipe edit → click photo icon on any step → verify native file dialog opens |
| Photo displays as thumbnail in timeline | STEP-05 | Requires real Tauri filesystem + convertFileSrc | Open recipe detail → verify step photos render inline |
| Duplicate button opens copy in detail view | STUDIO-03 | Full navigation flow | Click Duplicate → verify new sheet opens with "(Copy)" name |
| Toast notification after wishlist add | PAINT-03 | Sonner toast in jsdom | Click "Add all missing" → verify toast appears with count |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
