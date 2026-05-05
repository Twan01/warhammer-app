---
phase: 28
slug: collection-projects
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/collection/ tests/painting/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/collection/ tests/painting/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-00-01 | 00 | 0 | COLL-01 | unit | `pnpm test -- tests/collection/unitPhotoLatest.test.ts` | ❌ W0 | ⬜ pending |
| 28-00-02 | 00 | 0 | COLL-01 | unit (hook) | `pnpm test -- tests/collection/useLatestUnitPhotos.test.ts` | ❌ W0 | ⬜ pending |
| 28-00-03 | 00 | 0 | COLL-02 | unit | `pnpm test -- tests/collection/StatusPopover.test.ts` | ❌ W0 | ⬜ pending |
| 28-00-04 | 00 | 0 | PROJ-01 | unit | `pnpm test -- tests/painting/kanbanEnrichment.test.ts` | ❌ W0 | ⬜ pending |
| 28-00-05 | 00 | 0 | PROJ-01 | unit (hook) | `pnpm test -- tests/painting/useKanbanEnrichment.test.ts` | ❌ W0 | ⬜ pending |
| 28-00-06 | 00 | 0 | PROJ-03 | unit (RTL) | `pnpm test -- tests/painting/logSessionSheet.test.ts` | ❌ W0 | ⬜ pending |
| 28-01-xx | 01 | 1 | COLL-01 | unit | `pnpm test -- tests/collection/unitPhotoLatest.test.ts` | ❌ W0 | ⬜ pending |
| 28-01-xx | 01 | 1 | PROJ-01 | unit | `pnpm test -- tests/painting/kanbanEnrichment.test.ts` | ❌ W0 | ⬜ pending |
| 28-02-xx | 02 | 2 | COLL-01, COLL-02 | integration | `pnpm test -- tests/collection/` | ❌ W0 | ⬜ pending |
| 28-02-xx | 02 | 2 | PROJ-01, PROJ-02, PROJ-03 | integration | `pnpm test -- tests/painting/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/collection/unitPhotoLatest.test.ts` — stubs for COLL-01 (`getLatestPhotoByUnit`, `getPhotoCountsByUnitIds`)
- [ ] `tests/collection/useLatestUnitPhotos.test.ts` — stubs for COLL-01 hook (Map return shape)
- [ ] `tests/collection/StatusPopover.test.ts` — stubs for COLL-02 (StatusBadge inside trigger) — file was deleted, must recreate
- [ ] `tests/painting/kanbanEnrichment.test.ts` — stubs for PROJ-01 (`getRecipeNamesByUnitIds`, `getPhotoCountsByUnitIds`)
- [ ] `tests/painting/useKanbanEnrichment.test.ts` — stubs for PROJ-01 hook (Map shape, sorted query key)
- [ ] `tests/painting/logSessionSheet.test.ts` — stubs for PROJ-03 (`defaultUnitId` prop pre-populates unit picker)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gallery card shows real photo thumbnail from disk | COLL-01 | Requires Tauri filesystem + real image file | Open Collection gallery with a unit that has journal photos; verify thumbnail appears |
| No-photo placeholder shows faction color | COLL-01 | Visual verification | Check a unit with no photos shows colored placeholder |
| Kanban card Log Session button opens sheet | PROJ-03 | Full interaction + sheet overlay | Click Paintbrush icon on any kanban card; verify LogSessionSheet opens with unit pre-selected |
| Drag interaction not triggered by Log Session click | PROJ-03 | DnD interaction test | Click Log Session button; card must NOT start dragging |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
