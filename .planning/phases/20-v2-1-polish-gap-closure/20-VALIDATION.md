---
phase: 20
slug: v2-1-polish-gap-closure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `pnpm test -- tests/painting/KanbanBoard.test.tsx tests/dashboard/DashboardPage.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/KanbanBoard.test.tsx tests/dashboard/DashboardPage.test.tsx`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| DS-08 conflict dialog | 01 | 1 | DS-08 (secondary path) | Integration (render) | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ✅ | ⬜ pending |
| FactionsEmptyState icon | 01 | 1 | (visual debt) | Unit (render) | `pnpm test` | N/A | ⬜ pending |
| AddProjectPicker controlled-props | 01 | 1 | (tech debt) | Unit | `pnpm test -- tests/painting/KanbanBoard.test.tsx` | ✅ | ⬜ pending |
| upsertSyncMeta removal | 01 | 1 | (dead code) | Type check | `pnpm build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test stubs required.

- `tests/dashboard/DashboardPage.test.tsx` — existing; may need minor update if DashboardPage prop changes break mock setup (unlikely — test mocks at query layer)
- `tests/painting/KanbanBoard.test.tsx` — existing; will pass unchanged (renders KanbanBoard directly, AddProjectPicker not mounted in that test)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Opening a unit from Dashboard active-projects list and triggering Re-import with conflicts shows DatasheetImportDialog | DS-08 secondary path | Requires live rules sync + conflict scenario; no test fixture for Wahapedia conflict data | 1. Sync rules, 2. Open unit from Dashboard active-projects list, 3. Re-import → trigger conflict, 4. Verify dialog appears |
| FactionsEmptyState renders Shield icon-pill correctly | visual debt | No snapshot tests; visual-only | Open Factions page with zero factions; verify Shield icon in rounded-xl container |
| Empty Painting Projects state shows "Add Project" button that opens the picker | tech debt | Requires mounted app with no active projects | Open Painting Projects with no active units; verify "Add Project" button opens the picker popover |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
