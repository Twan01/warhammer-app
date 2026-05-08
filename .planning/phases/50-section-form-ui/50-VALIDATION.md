---
phase: 50
slug: section-form-ui
status: audited
nyquist_compliant: true
wave_0_complete: true
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
| **Quick run command** | `pnpm test -- tests/painting/recipeSection.pure.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/recipeSection.pure.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 50-01-01 | 01 | 0 | FORM-05, FORM-06 | unit (pure fn) | `pnpm test -- tests/painting/recipeSection.pure.test.ts` | W0 | green |
| 50-01-02 | 01 | 0 | FORM-05, FORM-06 | unit (pure fn) | `pnpm test -- tests/painting/recipeSection.pure.test.ts` | W0 | green |
| 50-02-01 | 02 | 1 | FORM-01, FORM-02 | component | `pnpm test -- tests/painting/recipeSectionCard.test.tsx` | yes | green |
| 50-02-02 | 02 | 1 | FORM-03, FORM-04 | build + test | `pnpm build && pnpm test -- tests/painting/recipeSection.pure.test.ts` | n/a | green |
| 50-03-01 | 03 | 2 | FORM-01 to FORM-06 | build + test | `pnpm build && pnpm test -- tests/painting/recipeSection.pure.test.ts` | n/a | green |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/painting/recipeSection.pure.test.ts` — created by plan 01 Task 1 (TDD RED phase): pure function tests for `buildDraftSections`, `makeDraftSection`

*Note: `tests/painting/recipeSection.test.ts` already exists from Phase 48 (hook invalidation tests) — this is a DIFFERENT file. The `.pure.test.ts` suffix disambiguates pure function tests from hook tests.*

*Existing `tests/painting/recipeSteps.test.ts` covers step-level pure functions — no Wave 0 gap for FORM-04.*

---

## Sampling Continuity

Verify no 3 consecutive tasks use build-only verification:

| Task | Verify Type | Breaks streak? |
|------|------------|----------------|
| 50-01-01 | test (RED) | yes |
| 50-01-02 | test (GREEN) | yes |
| 50-02-01 | build only | streak=1 |
| 50-02-02 | build + test | yes (resets) |
| 50-03-01 | build + test | yes (resets) |

Maximum consecutive build-only: 1. Compliant.

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready

---

## Validation Audit 2026-05-08

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

**Tests added:** `tests/painting/recipeSectionCard.test.tsx` (17 tests)
- FORM-01: 4 tests — collapse toggle, re-expand, step count badge when collapsed
- FORM-02: 13 tests — name edit, empty delete (no dialog), non-empty delete (AlertDialog confirm/cancel), multi-section list rendering
