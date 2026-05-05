---
phase: 28
slug: collection-projects
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-05
updated: 2026-05-05
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
| 28-00-01 | 00 | 0 | COLL-01 | unit | `pnpm test -- tests/collection/unitPhotoLatest.test.ts` | ✅ | ✅ green (12 tests) |
| 28-00-02 | 00 | 0 | COLL-01 | unit (hook) | `pnpm test -- tests/collection/useLatestUnitPhotos.test.tsx` | ✅ | ✅ green (4 tests) |
| 28-00-03 | 00 | 0 | COLL-02 | unit | `pnpm test -- tests/collection/StatusPopover.test.tsx` | ✅ | ✅ green (9 tests) |
| 28-00-04 | 00 | 0 | PROJ-01 | unit | `pnpm test -- tests/painting/kanbanEnrichment.test.ts` | ✅ | ✅ green (6 tests) |
| 28-00-05 | 00 | 0 | PROJ-01 | unit (hook) | `pnpm test -- tests/painting/useKanbanEnrichment.test.tsx` | ✅ | ✅ green (4 tests) |
| 28-00-06 | 00 | 0 | PROJ-03 | unit (RTL) | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ | ✅ green (4 tests) |
| 28-01-xx | 01 | 1 | COLL-01 | unit | `pnpm test -- tests/collection/unitPhotoLatest.test.ts` | ✅ | ✅ green |
| 28-01-xx | 01 | 1 | PROJ-01 | unit | `pnpm test -- tests/painting/kanbanEnrichment.test.ts` | ✅ | ✅ green |
| 28-02-xx | 02 | 2 | COLL-01, COLL-02 | integration | `pnpm test -- tests/collection/` | ✅ | ✅ green |
| 28-03-xx | 03 | 2 | PROJ-01, PROJ-02, PROJ-03 | integration | `pnpm test -- tests/painting/` | ✅ | ✅ green |
| 28-audit | — | — | PROJ-02 | unit | `pnpm test -- tests/painting/getNextActionHint.test.ts` | ✅ | ✅ green (5 tests) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/collection/unitPhotoLatest.test.ts` — COLL-01 query functions (12 tests)
- [x] `tests/collection/useLatestUnitPhotos.test.tsx` — COLL-01 hook (4 tests)
- [x] `tests/collection/StatusPopover.test.tsx` — COLL-02 StatusBadge trigger (9 tests)
- [x] `tests/painting/kanbanEnrichment.test.ts` — PROJ-01 query functions (6 tests)
- [x] `tests/painting/useKanbanEnrichment.test.tsx` — PROJ-01 hook (4 tests)
- [x] `tests/painting/logSessionSheet.test.tsx` — PROJ-03 defaultUnitId prop (4 tests)
- [x] `tests/painting/getNextActionHint.test.ts` — PROJ-02 next-action hints (5 tests, added by audit)

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 8s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved

---

## Validation Audit 2026-05-05

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

**Gap:** PROJ-02 `getNextActionHint` — no test existed. Created `tests/painting/getNextActionHint.test.ts` with 5 tests covering exhaustiveness, specific mappings, and Completed-status guard.

Full suite: 561 passed, 2 skipped, 0 failures.
