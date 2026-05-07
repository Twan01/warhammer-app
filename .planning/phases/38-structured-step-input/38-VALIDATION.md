---
phase: 38
slug: structured-step-input
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 38-01-01 | 01 | 1 | STEP-01 | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ (extend) | ⬜ pending |
| 38-01-02 | 01 | 1 | STEP-01 | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ❌ W0 | ⬜ pending |
| 38-01-03 | 01 | 1 | STEP-01 | unit | `pnpm test -- tests/painting/recipeStepRow.test.ts` | ❌ W0 | ⬜ pending |
| 38-01-04 | 01 | 1 | STEP-02 | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ (existing) | ⬜ pending |
| 38-01-05 | 01 | 1 | STEP-03 | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ (extend) | ⬜ pending |
| 38-01-06 | 01 | 1 | STEP-03 | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ❌ W0 | ⬜ pending |
| 38-01-07 | 01 | 1 | STEP-04 | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ (extend) | ⬜ pending |
| 38-01-08 | 01 | 1 | STEP-04 | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ❌ W0 | ⬜ pending |
| 38-01-09 | 01 | 1 | STEP-04 | unit | `pnpm test -- tests/painting/recipeStepRow.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/painting/addRecipePaintQuery.test.ts` — stubs for STEP-01/03/04 INSERT expansion
- [ ] `tests/painting/recipeStepRow.test.ts` — stubs for RecipeStepRow new inputs + formatMinutes

*Existing `tests/painting/recipeSteps.test.ts` requires extension for new DraftStep fields, but the file already exists.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop reorder persists after close/reopen | STEP-02 | Requires Tauri + SQLite round-trip | Open recipe, drag step, save, close sheet, reopen — verify order |
| Two-line layout renders correctly | STEP-01/03 | Visual layout verification | Open recipe form, add step, confirm two-line arrangement |
| Time sum updates live | STEP-04 | UI reactivity check | Add steps with time estimates, verify header sum changes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
