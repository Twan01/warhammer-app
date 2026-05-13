---
phase: 63
slug: applied-recipe-ux
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-13
---

# Phase 63 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/collection/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/collection/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 63-01-01 | 01 | 1 | — | — | N/A | setup | `npx shadcn add accordion` | ❌ W0 | ⬜ pending |
| 63-01-02 | 01 | 1 | AR-03 | — | N/A | component | `pnpm test -- tests/collection/AssignmentChecklist.test.ts` | ❌ W0 | ⬜ pending |
| 63-02-01 | 02 | 2 | AR-02 | — | N/A | component | `pnpm test -- tests/collection/ApplyRecipeDialog.test.ts` | ❌ W0 | ⬜ pending |
| 63-02-02 | 02 | 2 | AR-04 | — | N/A | component | `pnpm test -- tests/collection/AppliedRecipesTab.test.ts` | ❌ W0 | ⬜ pending |
| 63-03-01 | 03 | 2 | AR-07 | — | N/A | component | `pnpm test -- tests/collection/ApplyToUnitsDialog.test.ts` | ❌ W0 | ⬜ pending |
| 63-03-02 | 03 | 2 | AR-07 | — | N/A | integration | `pnpm test -- tests/painting/RecipeDetailSheet.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npx shadcn add accordion` — install accordion component
- [ ] `tests/collection/AssignmentChecklist.test.ts` — stubs for AR-03
- [ ] `tests/collection/ApplyRecipeDialog.test.ts` — stubs for AR-02
- [ ] `tests/collection/AppliedRecipesTab.test.ts` — stubs for AR-04
- [ ] `tests/collection/ApplyToUnitsDialog.test.ts` — stubs for AR-07

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recipe preview renders SectionedTimeline in Dialog | AR-02 | Visual layout verification | Open unit detail → Apply Recipe → select a recipe → verify sections/steps display |
| Progress bar fills proportionally on step toggle | AR-04 | Visual animation + calculation verification | Apply a recipe → toggle steps → verify progress bar updates in real-time |
| Bulk apply creates independent progress per unit | AR-07 | Multi-entity state verification | Apply recipe to 3 units → toggle steps on one → verify others unchanged |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
