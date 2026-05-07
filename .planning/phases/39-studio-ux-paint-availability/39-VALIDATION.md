---
phase: 39
slug: studio-ux-paint-availability
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-07
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vite.config.ts` (Vitest inlined) |
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
| 39-01-01 | 01 | 1 | PAINT-01 | unit | `pnpm test -- tests/painting/recipePaintAvailability.test.ts` | ❌ W0 | ⬜ pending |
| 39-01-02 | 01 | 1 | PAINT-01 | unit | `pnpm test -- tests/painting/recipePaintAvailability.test.ts` | ❌ W0 | ⬜ pending |
| 39-01-03 | 01 | 1 | PAINT-01 | unit | `pnpm test -- tests/painting/recipePaintAvailability.test.ts` | ❌ W0 | ⬜ pending |
| 39-02-01 | 02 | 1 | STUDIO-01 | unit | `pnpm test -- tests/painting/RecipeCard.test.tsx` | ❌ W0 | ⬜ pending |
| 39-02-02 | 02 | 1 | STUDIO-01 | unit | `pnpm test -- tests/painting/RecipeCardGrid.test.tsx` | ❌ W0 | ⬜ pending |
| 39-02-03 | 02 | 1 | STUDIO-02 | unit | `pnpm test -- tests/painting/recipeDetailSheet.test.ts` | ✅ | ⬜ pending |
| 39-02-04 | 02 | 1 | STUDIO-04 | unit | `pnpm test -- tests/painting/recipeStudioFilters.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/painting/recipePaintAvailability.test.ts` — stubs for PAINT-01 (query SQL contract + hook Map mapping + paint_id=0 exclusion)
- [ ] `tests/painting/RecipeCard.test.tsx` — stubs for STUDIO-01 (swatch strip, difficulty badge, availability badge rendering)
- [ ] `tests/painting/RecipeCardGrid.test.tsx` — stubs for STUDIO-01 (grid card count, empty state fallback)
- [ ] `tests/painting/recipeStudioFilters.test.ts` — stubs for STUDIO-04 (surface/style/difficulty filter functions + hasMissing toggle)
- [ ] Extend `tests/painting/recipeDetailSheet.test.ts` — add timeline assertions for STUDIO-02

*Existing infrastructure covers test framework and setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Card grid responsive layout adapts across window sizes | STUDIO-01 | CSS grid responsiveness can't be tested in jsdom | Resize app window from 900px to 1920px — cards should reflow from 2 to 4+ columns |
| Paint availability badge updates when toggling ownership on Paints page | PAINT-01 | Cross-page cache invalidation requires full app context | Toggle a paint's owned status on Paints page, navigate to Recipes — badge should reflect change |
| Step timeline visual appearance (connecting line, phase badges) | STUDIO-02 | Visual styling not testable in jsdom | Open a recipe detail — steps should appear as vertical timeline with connecting line |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
