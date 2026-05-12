---
phase: 60
slug: kanban-currentfocus-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-12
---

# Phase 60 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | vitest.config.ts (project root) |
| **Quick run command** | `pnpm test -- tests/lib/computeWorkflowPosition.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/lib/computeWorkflowPosition.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 60-01-01 | 01 | 1 | PROJ-03, PROJ-04 | unit | `pnpm test -- tests/lib/computeWorkflowPosition.test.ts` | ❌ W0 | ⬜ pending |
| 60-01-02 | 01 | 1 | PROJ-05 | unit | `pnpm test -- tests/lib/computeWorkflowPosition.test.ts` | ❌ W0 | ⬜ pending |
| 60-02-01 | 02 | 2 | PROJ-01 | unit | `pnpm test -- tests/painting/KanbanCard.test.tsx` | ✅ (extend) | ⬜ pending |
| 60-02-02 | 02 | 2 | PROJ-02 | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/computeWorkflowPosition.test.ts` — pure function tests covering PROJ-03, PROJ-04, PROJ-05 (all edge cases: sectioned, flat, section-name-only, complete, null fallback, orphaned step IDs)
- [ ] `tests/dashboard/CurrentFocusCard.test.tsx` — workflow display rendering for PROJ-02

*Existing infrastructure covers test framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual rendering of workflow context on KanbanCard | PROJ-01 | CSS styling and layout positioning not verifiable in jsdom | Open Painting Projects page, verify workflow line appears below recipe name on cards with linked recipes and sessions |
| Visual rendering of workflow guidance on CurrentFocusCard | PROJ-02 | CSS styling and icon rendering | Open Dashboard, verify Layers icon + workflow guidance line appears between recipe name and model count |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
