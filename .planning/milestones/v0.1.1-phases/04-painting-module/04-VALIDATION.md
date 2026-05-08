---
phase: 4
slug: painting-module
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-01
audited: 2026-05-03
---

# Phase 4 — Validation Strategy

> Per-phase validation contract. All Wave 0 stubs filled and green.
> Phase shipped 2026-05-01. Audit confirmed compliant 2026-05-03.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react + jsdom |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run tests/painting/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds (painting suite: 42 tests) |

---

## Sampling Rate

Phase 4 is complete and shipped. Retroactive audit confirmed all automated tests green.

- **Painting suite:** `npx vitest run tests/painting/` — 42 tests, ~5s
- **Full suite:** 210 tests green (no regressions from Phase 4 tests)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-W0 | 01 | 0 | PROJ-01, PROJ-02, PROJ-07 | unit | `npx vitest run tests/painting/kanbanUtils.test.ts` | ✅ exists | ✅ green |
| 4-01-W0 | 01 | 0 | PROJ-03 | component | `npx vitest run tests/painting/KanbanCard.test.tsx` | ✅ exists | ✅ green |
| 4-01-W0 | 01 | 0 | PROJ-08 | component | `npx vitest run tests/painting/KanbanBoard.test.tsx` | ✅ exists | ✅ green |
| 4-04-W0 | 04 | 0 | RECIPE-05, RECIPE-06 | unit | `npx vitest run tests/painting/recipeSteps.test.ts` | ✅ exists | ✅ green |
| 4-03-W0 | 03 | 0 | RECIPE-07, RECIPE-08 | component | `npx vitest run tests/painting/RecipeTable.test.tsx` | ✅ exists | ✅ green |
| 4-04-W0 | 04 | 0 | PAINT-03, PAINT-04 | component | `npx vitest run tests/painting/PaintCombobox.test.tsx` | ✅ exists | ✅ green |
| PROJ-04, PROJ-05 | 01 | — | drag-and-drop | manual | — | Manual | ✅ verified |
| PROJ-06 | 01 | — | mark active cross-page | manual | — | Manual | ✅ verified |
| PAINT-03 inline create | 04 | — | stacked Sheet flow | manual | — | Manual | ✅ verified |
| RECIPE-05 nav | 03 | — | cross-route Sheet navigation | manual | — | Manual | ✅ verified |

*Status: ✅ green · Manual — verified in human checkpoint*

---

## Wave 0 Requirements

- [x] `tests/painting/kanbanUtils.test.ts` — PROJ-01 (active filter, 3), PROJ-02 (status grouping, 2), PROJ-07 (priority sort, 5), plus `getVisibleColumns` (3) — 11 tests green
- [x] `tests/painting/recipeSteps.test.ts` — RECIPE-05 `computeOrderIndex` (3), RECIPE-06 `isPaintMissing` (4), `makeDraftStep` (1) — 8 tests green
- [x] `tests/painting/KanbanCard.test.tsx` — PROJ-03 name/badge/progress/priority/date (3 tests) green
- [x] `tests/painting/KanbanBoard.test.tsx` — PROJ-08 empty state, PROJ-02 column grouping, PROJ-01 active filter (3 tests) green
- [x] `tests/painting/RecipeTable.test.tsx` — RECIPE-08 empty state, RECIPE-07 row render, onRowClick (4 tests) green
- [x] `tests/painting/PaintCombobox.test.tsx` — PAINT-04 search/filter (7), RECIPE-06 owned dots (2), PAINT-03 Add new paint (2), onChange (1) — 13 tests green

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| Drag card between columns updates status_painting | PROJ-04, PROJ-05 | jsdom has no pointer events / @dnd-kit drag simulation | ✅ Verified in 04-03 checkpoint |
| Rollback on DB error | PROJ-05 | Requires simulated DB failure | ✅ Verified in 04-03 checkpoint |
| Mark active from Collection / UnitDetailSheet | PROJ-06 | Cross-page integration | ✅ Verified in 04-03 checkpoint |
| Inline paint create inside recipe builder | PAINT-03 | Stacked Sheet + form flow | ✅ Verified in 04-03 checkpoint |
| Navigation from UnitDetailSheet linked recipe to /recipes | RECIPE-05 | Cross-route navigation with Sheet open | ✅ Verified in 04-03 checkpoint |

---

## Validation Audit 2026-05-03

| Metric | Count |
|--------|-------|
| Requirements audited | 10 task entries |
| Gaps found | 0 |
| Already green (automated) | 6 task entries (42 tests) |
| Already verified (manual-only) | 5 behaviors |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 all complete: 42 tests green across 6 test files
- [x] No watch-mode flags
- [x] Feedback latency < 15s (painting suite ~5s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** compliant 2026-05-03
