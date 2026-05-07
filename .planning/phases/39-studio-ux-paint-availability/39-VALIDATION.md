---
phase: 39
slug: studio-ux-paint-availability
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-07
validated: 2026-05-07
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
| **Estimated runtime** | ~42 seconds (full suite) |

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
| 39-01-01 | 01 | 1 | PAINT-01 | unit | `pnpm test -- tests/painting/recipePaintAvailability.test.ts` | ✅ | ✅ green |
| 39-01-02 | 01 | 1 | PAINT-01 | unit | `pnpm test -- tests/painting/recipePaintAvailability.test.ts` | ✅ | ✅ green |
| 39-01-03 | 01 | 1 | PAINT-01 | unit | `pnpm test -- tests/painting/recipePaintAvailability.test.ts` | ✅ | ✅ green |
| 39-02-01 | 02 | 2 | STUDIO-01 | unit | `pnpm test -- tests/painting/RecipeCard.test.tsx` | ✅ | ✅ green |
| 39-02-02 | 02 | 2 | STUDIO-01 | unit | `pnpm test -- tests/painting/RecipeCardGrid.test.tsx` | ✅ | ✅ green |
| 39-02-03 | 02 | 2 | STUDIO-02 | unit | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ | ✅ green |
| 39-02-04 | 02 | 2 | STUDIO-04 | unit | `pnpm test -- tests/painting/recipeStudioFilters.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement Coverage Detail

### PAINT-01 — Paint Availability Data Layer (9 tests)

| # | Test | File |
|---|------|------|
| 1 | passes SQL with GROUP BY rs.recipe_id | recipePaintAvailability.test.ts |
| 2 | WHERE clause excludes paint_id IS NULL and paint_id = 0 | recipePaintAvailability.test.ts |
| 3 | returns rows shaped as {recipe_id, owned, missing, running_low} | recipePaintAvailability.test.ts |
| 4 | SQL aggregates owned with CASE WHEN p.owned = 1 AND p.running_low = 0 | recipePaintAvailability.test.ts |
| 5 | SQL aggregates missing with CASE WHEN p.owned != 1 | recipePaintAvailability.test.ts |
| 6 | SQL aggregates running_low with CASE WHEN p.owned = 1 AND p.running_low = 1 | recipePaintAvailability.test.ts |
| 7 | RECIPE_AVAILABILITY_KEY equals ["recipe-paint-availability"] | recipePaintAvailability.test.ts |
| 8 | returns Map<number, AvailabilityStats> with camelCase keys | recipePaintAvailability.test.ts |
| 9 | returns empty Map when no recipes have steps with paints | recipePaintAvailability.test.ts |

### STUDIO-01 — Recipe Card Grid (14 tests)

| # | Test | File |
|---|------|------|
| 1 | renders recipe name in card | RecipeCard.test.tsx |
| 2 | renders faction badge with backgroundColor when faction exists | RecipeCard.test.tsx |
| 3 | renders difficulty badge with correct color class for Beginner | RecipeCard.test.tsx |
| 4 | renders difficulty badge with correct color class for Expert | RecipeCard.test.tsx |
| 5 | renders estimated time text when estimated_minutes is set | RecipeCard.test.tsx |
| 6 | renders step count text | RecipeCard.test.tsx |
| 7 | renders swatch circles from swatches array | RecipeCard.test.tsx |
| 8 | renders green availability badge when all owned | RecipeCard.test.tsx |
| 9 | renders red availability badge when any missing | RecipeCard.test.tsx |
| 10 | renders no availability badge when availability is undefined | RecipeCard.test.tsx |
| 11 | onClick fires with recipe on card click | RecipeCard.test.tsx |
| 12 | renders correct number of RecipeCard elements matching data array | RecipeCardGrid.test.tsx |
| 13 | renders RecipeEmptyState when data is empty and not loading | RecipeCardGrid.test.tsx |
| 14 | renders skeleton cards when isLoading=true | RecipeCardGrid.test.tsx |

### STUDIO-02 — Recipe Detail Timeline (10 tests)

| # | Test | File |
|---|------|------|
| 1 | renders metadata badge row when recipe has surface | recipeDetailSheet.test.tsx |
| 2 | renders style badge in metadata row | recipeDetailSheet.test.tsx |
| 3 | renders difficulty badge with correct text | recipeDetailSheet.test.tsx |
| 4 | renders estimated time badge with '45 min' format | recipeDetailSheet.test.tsx |
| 5 | does not render metadata row when all metadata fields are null | recipeDetailSheet.test.tsx |
| 6 | renders step-timeline testid when steps exist | recipeDetailSheet.test.tsx |
| 7 | renders 'No steps added yet.' when steps array is empty | recipeDetailSheet.test.tsx |
| 8 | step-timeline not shown when steps is empty | recipeDetailSheet.test.tsx |
| 9 | still renders Linked Unit field | recipeDetailSheet.test.tsx |
| 10 | still renders Area field | recipeDetailSheet.test.tsx |

### STUDIO-04 — Studio Filters (8 tests)

| # | Test | File |
|---|------|------|
| 1 | all filters null/false/empty returns full list | recipeStudioFilters.test.ts |
| 2 | surfaceFilter='Armor' keeps only recipes with surface='Armor' | recipeStudioFilters.test.ts |
| 3 | styleFilter='Battle Ready' keeps only recipes with style='Battle Ready' | recipeStudioFilters.test.ts |
| 4 | difficultyFilter='Beginner' keeps only recipes with difficulty='Beginner' | recipeStudioFilters.test.ts |
| 5 | hasMissingFilter=true keeps only recipes whose availability has missing > 0 | recipeStudioFilters.test.ts |
| 6 | hasMissingFilter=true excludes recipes not in availability map | recipeStudioFilters.test.ts |
| 7 | combining surface + difficulty narrows correctly | recipeStudioFilters.test.ts |
| 8 | combining surface + difficulty returns empty when no match | recipeStudioFilters.test.ts |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Card grid responsive layout adapts across window sizes | STUDIO-01 | CSS grid responsiveness can't be tested in jsdom | Resize app window from 900px to 1920px — cards should reflow from 2 to 4+ columns |
| Paint availability badge updates when toggling ownership on Paints page | PAINT-01 | Cross-page cache invalidation requires full app context | Toggle a paint's owned status on Paints page, navigate to Recipes — badge should reflect change |
| Step timeline visual appearance (connecting line, phase badges) | STUDIO-02 | Visual styling not testable in jsdom | Open a recipe detail — steps should appear as vertical timeline with connecting line |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated

---

## Validation Audit 2026-05-07

| Metric | Count |
|--------|-------|
| Requirements audited | 4 |
| Automated tests | 41 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Manual-only behaviors | 3 |
| Full suite status | 879 passed, 0 failed |
