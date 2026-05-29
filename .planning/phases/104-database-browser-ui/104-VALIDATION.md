---
phase: 104
slug: database-browser-ui
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-29
---

# Phase 104 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/unit-database/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/unit-database/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 104-01-01 | 01 | 1 | all BUI-* | stub | `pnpm test -- tests/unit-database/` | Wave 0 (Plan 01 Task 1) | ⬜ pending |
| 104-01-02 | 01 | 1 | BUI-13/14 | unit | `pnpm test -- tests/unit-database/unitDatabase.queries.test.ts` | Wave 0 (Plan 01 Task 1) | ⬜ pending |
| 104-01-03 | 01 | 1 | BUI-01 | unit | `pnpm test -- tests/unit-database/factionAlignmentMap.test.ts` | Wave 0 (Plan 01 Task 1) | ⬜ pending |
| 104-02-01 | 02 | 2 | BUI-01,02 | component | `pnpm test -- tests/unit-database/FactionPicker.test.tsx` | Wave 0 (Plan 01 Task 1) | ⬜ pending |
| 104-02-02 | 02 | 2 | BUI-02,05 | component | `pnpm test -- tests/unit-database/UdbUnitList.test.tsx` | Wave 0 (Plan 01 Task 1) | ⬜ pending |
| 104-02-03 | 02 | 2 | BUI-03 | component | `pnpm test -- tests/unit-database/UdbDatasheetSheet.test.tsx` | Wave 0 (Plan 01 Task 1) | ⬜ pending |
| 104-02-04 | 02 | 2 | BUI-04 | component | `pnpm test -- tests/unit-database/applyUdbFilters.test.ts` | Wave 0 (Plan 01 Task 1) | ⬜ pending |
| 104-02-05 | 02 | 2 | BUI-06 | component | `pnpm test -- tests/unit-database/UdbUnitRow.test.tsx` | Wave 0 (Plan 01 Task 1) | ⬜ pending |

*Status: ⬜ pending | ✅ green | ❌ red | ⚠ flaky*

---

## Wave 0 Requirements

- [x] `tests/unit-database/applyUdbFilters.test.ts` — covers BUI-05 (created by Plan 01 Task 1)
- [x] `tests/unit-database/factionAlignmentMap.test.ts` — covers BUI-01 alignment (created by Plan 01 Task 1)
- [x] `tests/unit-database/unitDatabase.queries.test.ts` — covers BUI-04 queries (created by Plan 01 Task 1)
- [x] `tests/unit-database/FactionPicker.test.tsx` — covers BUI-01 component (created by Plan 01 Task 1)
- [x] `tests/unit-database/UdbUnitRow.test.tsx` — covers BUI-02 (created by Plan 01 Task 1)
- [x] `tests/unit-database/UdbDatasheetSheet.test.tsx` — covers BUI-03 (created by Plan 01 Task 1)
- [x] `tests/unit-database/UdbUnitList.test.tsx` — covers BUI-06 (created by Plan 01 Task 1)

*All Wave 0 test stubs are created by Plan 01 Task 1 as it.todo entries. Vitest already installed — no framework setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Virtual scrolling smoothness | BUI-06 | Performance perception requires visual inspection | Open faction with 100+ units, scroll rapidly, check for jank |
| FTS5 search near-instant results | BUI-04 | Perceived latency requires Tauri runtime | Type in search, verify results appear within ~300ms |
| Datasheet visual layout | BUI-03 | Layout correctness requires visual inspection | Open 3+ datasheets, verify stat block, weapons, abilities render correctly |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
