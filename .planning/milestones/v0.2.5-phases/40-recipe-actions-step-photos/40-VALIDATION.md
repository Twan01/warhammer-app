---
phase: 40
slug: recipe-actions-step-photos
status: complete
nyquist_compliant: true
wave_0_complete: true
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
| 40-01-01 | 01 | 1 | STEP-05, PAINT-02 | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ✅ | ✅ green |
| 40-01-02 | 01 | 1 | STEP-05 | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ | ✅ green |
| 40-01-03 | 01 | 1 | PAINT-02 | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ | ✅ green |
| 40-02-01 | 02 | 1 | STUDIO-03 | unit | `pnpm test -- tests/painting/duplicateRecipe.test.ts` | ✅ | ✅ green |
| 40-02-02 | 02 | 1 | STUDIO-03 | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ | ✅ green |
| 40-03-01 | 03 | 2 | STEP-05 | component | `pnpm test -- tests/painting/recipeStepRow.test.tsx` | ✅ | ✅ green |
| 40-03-02 | 03 | 2 | STEP-05 | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ | ✅ green |
| 40-04-01 | 03 | 2 | PAINT-02 | component | `pnpm test -- tests/painting/recipeStepRow.test.tsx` | ✅ | ✅ green |
| 40-04-02 | 03 | 2 | PAINT-02, PAINT-03 | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/painting/duplicateRecipe.test.ts` — 8 STUDIO-03 tests (SQL coverage)
- [x] Update `tests/painting/addRecipePaintQuery.test.ts` — 12-column assertions with $11/$12

*All Wave 0 requirements satisfied during Phase 40 execution.*

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** PASSED

---

## Validation Audit 2026-05-07

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

**Gap details:**
1. **PAINT-02 alt paint timeline display** — MISSING → 4 tests added to `recipeDetailSheet.test.tsx` (alt-paint-display render, "Alt:" prefix, brand+name, hidden when no alt_paint_id)
2. **PAINT-03 wishlist button click behavior** — PARTIAL → 1 test added to `recipeDetailSheet.test.tsx` (calls createWishlistItem.mutateAsync with correct args)
