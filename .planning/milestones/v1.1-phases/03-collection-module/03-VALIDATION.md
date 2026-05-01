---
phase: 3
slug: collection-module
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react + jsdom (Wave 0 installs) |
| **Config file** | `vitest.config.ts` — Wave 0 creates |
| **Quick run command** | `pnpm vitest run tests/collection/ --reporter=verbose` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run tests/collection/ --reporter=verbose`
- **After every plan wave:** Run `pnpm vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | infra | unit | `pnpm vitest run` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | COLL-01 | manual | manual — table renders in Tauri | ✅ after W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | POLISH-05 | unit | `pnpm vitest run tests/collection/UnitTable.test.ts -t "faction badge"` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | POLISH-02 | unit | `pnpm vitest run tests/collection/UnitTable.test.ts -t "loading"` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | COLL-02 | unit | `pnpm vitest run tests/collection/unitFilters.test.ts -t "search"` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | COLL-03 | unit | `pnpm vitest run tests/collection/unitFilters.test.ts -t "faction"` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | COLL-04 | unit | `pnpm vitest run tests/collection/unitFilters.test.ts -t "status"` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 1 | COLL-05 | unit | `pnpm vitest run tests/collection/unitFilters.test.ts -t "category"` | ❌ W0 | ⬜ pending |
| 03-02-05 | 02 | 1 | COLL-06 | unit | `pnpm vitest run tests/collection/unitFilters.test.ts -t "active"` | ❌ W0 | ⬜ pending |
| 03-02-06 | 02 | 1 | COLL-07 | unit | `pnpm vitest run tests/collection/collectionFilters.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | COLL-09 | manual | manual — Sheet opens on row click | manual | ⬜ pending |
| 03-03-02 | 03 | 2 | COLL-10 | unit | `pnpm vitest run tests/collection/StatusPopover.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | COLL-12 | unit | `pnpm vitest run tests/collection/UnitTable.test.ts -t "empty"` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 2 | COLL-13 | manual | manual — delete confirm dialog in browser | manual | ⬜ pending |
| 03-04-03 | 04 | 2 | POLISH-01 | manual | manual — dialog interaction in browser | manual | ⬜ pending |
| 03-04-04 | 04 | 2 | POLISH-04 | manual | manual — switch units, verify form data resets | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — vitest config with jsdom environment
- [ ] `tests/setup.ts` — shared test setup (@testing-library/jest-dom matchers)
- [ ] `tests/collection/unitFilters.test.ts` — stubs for COLL-02 through COLL-06 (pre-filter logic)
- [ ] `tests/collection/collectionFilters.test.ts` — stubs for COLL-07 Zustand store
- [ ] `tests/collection/StatusPopover.test.ts` — stubs for COLL-10 optimistic update + rollback
- [ ] `tests/collection/UnitTable.test.ts` — stubs for COLL-12 empty state, POLISH-02 skeleton, POLISH-05 faction badge
- [ ] Framework install: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Table sorts and paginates | COLL-01 | TanStack Table interaction requires browser DOM | Open collection page, click column headers to sort, navigate pages |
| Unit detail Sheet opens on row click | COLL-09 | Sheet portal requires Tauri WebView | Click a unit row, verify Sheet opens with correct data; click different unit, verify data updates |
| Delete confirm dialog appears before deletion | COLL-01, POLISH-01 | Dialog interaction requires browser | Click delete in Actions column and detail Sheet footer; verify modal appears before deletion |
| key={unit.id} prevents stale Sheet data | POLISH-04 | Requires switching units in browser | Open Sheet for unit A, open Sheet for unit B, verify B's data shown not A's |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
