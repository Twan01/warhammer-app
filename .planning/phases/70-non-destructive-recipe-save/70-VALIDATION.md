---
phase: 70
slug: non-destructive-recipe-save
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Quick run command** | `pnpm test -- tests/painting/recipeSection.pure.test.ts tests/painting/recipeSteps.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/recipeSection.pure.test.ts tests/painting/recipeSteps.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 70-01-01 | 01 | 1 | REC-02 | — | N/A | unit | `pnpm test -- tests/painting/recipeSection.pure.test.ts` | ✅ | ⬜ pending |
| 70-01-02 | 01 | 1 | REC-02 | — | N/A | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ | ⬜ pending |
| 70-02-01 | 02 | 1 | REC-02 | — | N/A | unit | `pnpm test -- tests/painting/recipeSection.pure.test.ts` | ❌ W0 | ⬜ pending |
| 70-02-02 | 02 | 1 | REC-02 | — | N/A | unit | `pnpm test -- tests/painting/recipeSection.pure.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New diff tests in `tests/painting/recipeSection.pure.test.ts` — section diff (UPDATE/DELETE/INSERT), sectionIdMap seeding, step-dragged-to-new-section edge case
- [ ] Extend `tests/painting/recipeSteps.test.ts` — `dbId` on `DraftStep`, `makeDraftStep` with `dbId: null`

*If diff logic extracted to pure functions: trivially unit-testable without mocks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual UI: edit recipe, save, reopen — step/section IDs preserved | REC-02 | End-to-end UX flow with DB persistence | 1. Open recipe edit sheet, 2. Rename a step, 3. Save, 4. Reopen, 5. Verify renamed step has same visual position and data integrity |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
