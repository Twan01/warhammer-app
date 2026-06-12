---
phase: 126
slug: critical-fixes-dead-ends
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-11
---

# Phase 126 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 126-01-01 | 01 | 1 | FIX-01 | — | N/A | unit | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx` | ✅ | ✅ green |
| 126-01-02 | 01 | 1 | FIX-02 | — | N/A | unit | `pnpm test -- tests/painting-mode/PaintingModeNotFound.test.tsx` | ✅ | ✅ green |
| 126-01-03 | 01 | 1 | FIX-03 | — | N/A | unit | `pnpm test -- tests/army-list/ArmyListNotesNoOp.test.tsx` | ✅ | ✅ green |
| 126-01-04 | 01 | 1 | FIX-04 | — | N/A | unit | `pnpm test -- tests/recipes/RecipesPageError.test.tsx` | ✅ | ✅ green |
| 126-01-05 | 01 | 1 | FIX-05 | — | N/A | unit | `pnpm test -- tests/settings/SettingsPage.test.tsx` | ✅ | ✅ green |
| 126-01-06 | 01 | 1 | FIX-06 | — | N/A | unit | `pnpm test -- tests/design-foundation/designTokens.test.ts` | ✅ | ✅ green |
| 126-01-07 | 01 | 1 | FIX-07 | — | N/A | unit | `pnpm test -- tests/goals/GoalsPage.test.tsx` | ✅ | ✅ green |
| 126-01-08 | 01 | 1 | FIX-08 | — | N/A | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx tests/army-lists/LeaderAttachmentSheet.test.tsx` | ✅ | ✅ green |
| 126-01-09 | 01 | 1 | FIX-09 | — | N/A | unit | `pnpm test -- tests/datasheet/useRulesFavorites.test.tsx` | ✅ | ✅ green |
| 126-01-10 | 01 | 1 | FIX-10 | — | N/A | unit | `pnpm test -- tests/army-list/ArmyListDetailNotFound.test.tsx` | ✅ | ✅ green |
| 126-01-11 | 01 | 1 | FIX-11 | — | N/A | unit | `pnpm test -- tests/design-foundation/designTokens.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. Most fixes are visual/behavioral and verified manually.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exit button on completion screen | FIX-01 | Visual UI element | Complete all painting steps, verify exit button and Escape hint visible |
| Back button on error screen | FIX-02 | Visual UI element | Navigate to invalid painting assignment, verify back button and Escape work |
| No toast on unchanged notes | FIX-03 | Toast absence verification | Open army list, don't change notes, click save — no toast should appear |
| Error state on RecipesPage | FIX-04 | Network error simulation | Simulate query failure, verify error UI with retry button |
| PageHeader consistency | FIX-05 | Visual consistency | Open Settings and Data Health, verify text-3xl + border-b headers |
| Light-mode token fallbacks | FIX-06 | CSS token verification | Inspect :root in dev tools, verify tokens defined |
| Single error toast on goal delete | FIX-07 | Toast count verification | Simulate goal delete failure, verify only one error toast |
| Success toasts on mutations | FIX-08 | Toast presence verification | Assign/remove enhancement, attach/detach leader — verify success toasts |
| Error toast on favorite rollback | FIX-09 | Network error simulation | Toggle favorite, simulate failure, verify error toast |
| Loading vs not-found | FIX-10 | State distinction | Delete army list, navigate to its URL, verify "not found" instead of skeleton |
| Dark scrollbar styling | FIX-11 | Visual CSS | Scroll any long list, verify zinc-colored thin scrollbars |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved

---

## Validation Audit 2026-06-11

| Metric | Count |
|--------|-------|
| Gaps found | 11 |
| Resolved | 11 |
| Escalated | 0 |

Tests added/updated: StepFocalView.test.tsx, PaintingModeNotFound.test.tsx (new), ArmyListNotesNoOp.test.tsx (new), RecipesPageError.test.tsx (new), SettingsPage.test.tsx, designTokens.test.ts, GoalsPage.test.tsx, enhancementPickerSheet.test.tsx, LeaderAttachmentSheet.test.tsx, useRulesFavorites.test.tsx, ArmyListDetailNotFound.test.tsx (new). Suite: 2609 pass, 2 pre-existing failures (unrelated determinism.test.ts).

## Validation Audit 2026-06-12

Re-audit triggered by milestone v0.5.2 audit (`/gsd:audit-milestone`), which flagged
the absence of a formal `126-VERIFICATION.md`. This phase's VALIDATION.md was already
State-A complete and `nyquist_compliant: true`; this pass confirms coverage still holds.

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

- All 11 per-task validation test files confirmed present on disk.
- Full suite re-run: **2695 pass / 6 skip / 38 todo / 0 failures** (the 2 pre-existing
  determinism.test.ts failures noted on 2026-06-11 are now resolved).
- Includes FIX-02 follow-up: the assignment-not-found "Go Back" button now routes through
  `handleExit` → `resolveReturnTo(returnTo)` (was hardcoded `/`), exercised by
  `PaintingModeNotFound.test.tsx`. Closes the FIX-02/NAV-01 inconsistency flagged in
  `.planning/v0.5.2-MILESTONE-AUDIT.md`.

**Phase 126 remains NYQUIST-COMPLIANT.**
