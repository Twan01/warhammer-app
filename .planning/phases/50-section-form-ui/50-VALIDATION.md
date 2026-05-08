---
phase: 50
slug: section-form-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-08
---

# Phase 50 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/painting/recipeSection.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/recipeSection.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 50-01-01 | 01 | 0 | FORM-03, FORM-05, FORM-06 | unit (pure fn) | `pnpm test -- tests/painting/recipeSection.test.ts` | ❌ W0 | ⬜ pending |
| 50-01-02 | 01 | 0 | FORM-01, FORM-02 | unit (component) | `pnpm test -- tests/painting/RecipeSectionCard.test.tsx` | ❌ W0 | ⬜ pending |
| 50-02-01 | 02 | 1 | FORM-01 | unit (component) | `pnpm test -- tests/painting/RecipeSectionCard.test.tsx` | ❌ W0 | ⬜ pending |
| 50-02-02 | 02 | 1 | FORM-02 | unit (component) | `pnpm test -- tests/painting/RecipeSectionCard.test.tsx` | ❌ W0 | ⬜ pending |
| 50-02-03 | 02 | 1 | FORM-03 | unit (pure fn) | `pnpm test -- tests/painting/recipeSection.test.ts` | ❌ W0 | ⬜ pending |
| 50-02-04 | 02 | 1 | FORM-04 | unit (pure fn) | Covered by existing `tests/painting/recipeSteps.test.ts` | ✅ | ⬜ pending |
| 50-02-05 | 02 | 1 | FORM-05 | unit (pure fn) | `pnpm test -- tests/painting/recipeSection.test.ts` | ❌ W0 | ⬜ pending |
| 50-02-06 | 02 | 1 | FORM-06 | unit (pure fn) | `pnpm test -- tests/painting/recipeSection.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/painting/recipeSection.test.ts` — stubs for FORM-03, FORM-05, FORM-06: `buildDraftSections`, `makeDraftSection`, `computeSectionOrder` pure functions
- [ ] `tests/painting/RecipeSectionCard.test.tsx` — stubs for FORM-01, FORM-02: collapse/expand behavior, header fields, delete confirmation guard

*Existing `tests/painting/recipeSteps.test.ts` covers step-level pure functions — no Wave 0 gap for FORM-04*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Section drag reorder visual feedback | FORM-03 | @dnd-kit drag animations require real browser interaction | Open recipe form, drag section card, verify visual reorder |
| Step drag reorder within section | FORM-04 | Nested DndContext isolation requires real browser interaction | Open recipe form, drag step within section, verify it stays in section |
| Progressive disclosure transition | FORM-05 | Visual UI state transition (section scaffolding appearing) | Create new recipe, add second section, verify first section header appears |
| Collapsible section expand/collapse | FORM-01 | Radix Collapsible animation + ARIA state in real DOM | Click collapse chevron, verify section content toggles |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
