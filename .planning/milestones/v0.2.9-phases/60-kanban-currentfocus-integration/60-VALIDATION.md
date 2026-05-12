---
phase: 60
slug: kanban-currentfocus-integration
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-12
validated: 2026-05-12
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
| **Estimated runtime** | ~3 seconds (phase tests), ~15 seconds (full suite) |

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
| 60-01-01 | 01 | 1 | PROJ-03, PROJ-04 | unit | `pnpm test -- tests/lib/computeWorkflowPosition.test.ts` | ✅ | ✅ green |
| 60-01-02 | 01 | 1 | PROJ-05 | unit | `pnpm test -- tests/lib/computeWorkflowPosition.test.ts` | ✅ | ✅ green |
| 60-02-01 | 02 | 2 | PROJ-01 | unit | `pnpm test -- tests/painting/KanbanCard.test.tsx` | ✅ | ✅ green |
| 60-02-02 | 02 | 2 | PROJ-02 | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/lib/computeWorkflowPosition.test.ts` — 12 pure function tests covering PROJ-03, PROJ-04, PROJ-05 (sectioned, flat, section-name-only, complete, null fallback, orphaned step IDs)
- [x] `tests/dashboard/CurrentFocusCard.test.tsx` — 6 workflow display tests for PROJ-02 (section+technique, no-technique, complete, null, flat, basic)

*Existing infrastructure covers test framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual rendering of workflow context on KanbanCard | PROJ-01 | CSS styling and layout positioning not verifiable in jsdom | Open Painting Projects page, verify workflow line appears below recipe name on cards with linked recipes and sessions |
| Visual rendering of workflow guidance on CurrentFocusCard | PROJ-02 | CSS styling and icon rendering | Open Dashboard, verify Layers icon + workflow guidance line appears between recipe name and model count |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-05-12

---

## Validation Audit 2026-05-12

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Test coverage:** 43 tests across 3 files — all green (12 pure function + 7 KanbanCard + 22 CurrentFocusCard + 2 hook/integration).
