---
phase: 4
slug: painting-module
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `pnpm test -- --run tests/painting/` |
| **Full suite command** | `pnpm test -- --run` |
| **Estimated runtime** | ~15 seconds (painting suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- --run tests/painting/`
- **After every plan wave:** Run `pnpm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-W0 | 01 | 0 | PROJ-01, PROJ-02, PROJ-07 | unit | `pnpm test -- --run tests/painting/kanbanUtils.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-W0 | 01 | 0 | PROJ-03, PROJ-08 | component | `pnpm test -- --run tests/painting/KanbanCard.test.tsx tests/painting/KanbanBoard.test.tsx` | ❌ W0 | ⬜ pending |
| 4-04-W0 | 04 | 0 | RECIPE-05, RECIPE-06 | unit | `pnpm test -- --run tests/painting/recipeSteps.test.ts` | ❌ W0 | ⬜ pending |
| 4-03-W0 | 03 | 0 | RECIPE-08 | component | `pnpm test -- --run tests/painting/RecipeTable.test.tsx` | ❌ W0 | ⬜ pending |
| 4-04-W0 | 04 | 0 | PAINT-04 | component | `pnpm test -- --run tests/painting/PaintCombobox.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/painting/kanbanUtils.test.ts` — stubs for PROJ-01 (active filter), PROJ-02 (status grouping), PROJ-07 (priority sort)
- [ ] `tests/painting/recipeSteps.test.ts` — stubs for RECIPE-05 (order_index assignment on submit), RECIPE-06 (owned/missing paint logic)
- [ ] `tests/painting/KanbanCard.test.tsx` — stubs for PROJ-03 (card renders name, faction badge, progress, priority)
- [ ] `tests/painting/KanbanBoard.test.tsx` — stubs for PROJ-08 (empty state renders when no active units)
- [ ] `tests/painting/RecipeTable.test.tsx` — stubs for RECIPE-08 (empty state with CTA)
- [ ] `tests/painting/PaintCombobox.test.tsx` — stubs for PAINT-04 (search filters by brand+name)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag card between columns updates status_painting | PROJ-04, PROJ-05 | jsdom has no pointer events / drag simulation for @dnd-kit | Open app → Kanban board → drag card to a different column → confirm status column changes + DB persists on reload |
| Rollback on DB error | PROJ-05 | Requires simulated DB failure | Mock DB failure → drag card → confirm card snaps back to original column + Sonner error toast shown |
| Mark active from Collection table | PROJ-06 | Integration across two pages | Collection → unit row → is_active_project toggle → navigate to Painting Projects → unit appears on board |
| Mark active from UnitDetailSheet | PROJ-06 | Sheet interaction + multi-entry | Open unit detail → toggle active → close → confirm Kanban shows unit |
| Inline paint create inside recipe builder | PAINT-03 | Stacked Sheet + form flow | Recipe form → step paint combobox → "+ Add new paint" → fill PaintSheet → save → new paint auto-selected in step |
| Navigation from UnitDetailSheet linked recipe to /recipes | RECIPE-05 | Cross-route navigation with Sheet open | Unit detail → Linked Recipes → click recipe name → /recipes opens with that recipe's detail Sheet visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
