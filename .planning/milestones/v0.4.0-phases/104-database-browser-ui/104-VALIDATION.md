---
phase: 104
slug: database-browser-ui
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-29
audited: 2026-05-30
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 104-01-01 | 01 | 1 | all BUI-* | stub | `pnpm test -- tests/unit-database/` | ✅ green |
| 104-01-02 | 01 | 1 | BUI-13/14 | unit | `pnpm test -- tests/unit-database/unitDatabase.queries.test.ts` | ✅ green |
| 104-01-03 | 01 | 1 | BUI-01 | unit | `pnpm test -- tests/unit-database/factionAlignmentMap.test.ts` | ✅ green |
| 104-02-01 | 02 | 2 | BUI-01,02 | component | `pnpm test -- tests/unit-database/FactionPicker.test.tsx` | ✅ green |
| 104-02-02 | 02 | 2 | BUI-02,05 | component | `pnpm test -- tests/unit-database/UdbUnitList.test.tsx` | ✅ green |
| 104-02-03 | 02 | 2 | BUI-03 | component | `pnpm test -- tests/unit-database/UdbDatasheetSheet.test.tsx` | ✅ green |
| 104-02-04 | 02 | 2 | BUI-04 | component | `pnpm test -- tests/unit-database/applyUdbFilters.test.ts` | ✅ green |
| 104-02-05 | 02 | 2 | BUI-06 | component | `pnpm test -- tests/unit-database/UdbUnitRow.test.tsx` | ✅ green |

*Status: ⬜ pending | ✅ green | ❌ red | ⚠ flaky*

---

## Wave 0 Requirements

- [x] `tests/unit-database/applyUdbFilters.test.ts` — 9 tests covering BUI-05 (role, keyword, points, AND logic, null handling)
- [x] `tests/unit-database/factionAlignmentMap.test.ts` — 7 tests covering BUI-01 alignment (25 IDs, 4 groups, specific mappings)
- [x] `tests/unit-database/unitDatabase.queries.test.ts` — 10 tests covering BUI-04 queries (FTS5 search, sanitization, CRUD)
- [x] `tests/unit-database/FactionPicker.test.tsx` — 5 tests covering BUI-01 component (alignment headers, selection, loading)
- [x] `tests/unit-database/UdbUnitRow.test.tsx` — 5 tests covering BUI-02 (name, points, role badge, click)
- [x] `tests/unit-database/UdbDatasheetSheet.test.tsx` — 7 tests covering BUI-03 (stats, weapons, abilities, keywords, damaged)
- [x] `tests/unit-database/UdbUnitList.test.tsx` — 5 tests covering BUI-06 (role headers, rows, virtualizer, loading, empty)

*All 48 tests implemented and passing. 0 it.todo() stubs remaining.*

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

---

## Validation Audit 2026-05-30

| Metric | Count |
|--------|-------|
| Gaps found | 42 |
| Resolved | 48 |
| Escalated | 0 |

*All 42 it.todo() stubs replaced with 48 real tests (some stubs split into multiple test cases). All passing.*
