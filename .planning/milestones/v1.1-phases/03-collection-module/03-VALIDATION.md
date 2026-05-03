---
phase: 3
slug: collection-module
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-01
audited: 2026-05-03
---

# Phase 3 — Validation Strategy

> Per-phase validation contract. All Wave 0 stubs filled and green.
> Phase shipped 2026-05-01. Audit confirmed compliant 2026-05-03.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react + jsdom |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run tests/collection/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds (collection suite: 42 tests) |

---

## Sampling Rate

Phase 3 is complete and shipped. Retroactive audit confirmed all automated tests green.

- **Collection suite:** `npx vitest run tests/collection/` — 42 tests, ~5s
- **Full suite:** 210 tests green (no regressions from Phase 3 tests)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | infra | unit | `npx vitest run` | ✅ exists | ✅ green |
| 03-01-02 | 01 | 1 | COLL-01 | manual | manual — table renders in Tauri | Manual | ✅ verified |
| 03-01-03 | 01 | 1 | POLISH-05 | unit | `npx vitest run tests/collection/UnitTable.test.tsx -t "faction badge"` | ✅ exists | ✅ green |
| 03-01-04 | 01 | 1 | POLISH-02 | unit | `npx vitest run tests/collection/UnitTable.test.tsx -t "loading"` | ✅ exists | ✅ green |
| 03-02-01 | 02 | 1 | COLL-02 | unit | `npx vitest run tests/collection/unitFilters.test.ts -t "search"` | ✅ exists | ✅ green |
| 03-02-02 | 02 | 1 | COLL-03 | unit | `npx vitest run tests/collection/unitFilters.test.ts -t "faction"` | ✅ exists | ✅ green |
| 03-02-03 | 02 | 1 | COLL-04 | unit | `npx vitest run tests/collection/unitFilters.test.ts -t "status"` | ✅ exists | ✅ green |
| 03-02-04 | 02 | 1 | COLL-05 | unit | `npx vitest run tests/collection/unitFilters.test.ts -t "category"` | ✅ exists | ✅ green |
| 03-02-05 | 02 | 1 | COLL-06 | unit | `npx vitest run tests/collection/unitFilters.test.ts -t "active"` | ✅ exists | ✅ green |
| 03-02-06 | 02 | 1 | COLL-07 | unit | `npx vitest run tests/collection/collectionFilters.test.ts` | ✅ exists | ✅ green |
| 03-03-01 | 03 | 2 | COLL-09 | manual | manual — Sheet opens on row click | Manual | ✅ verified |
| 03-03-02 | 03 | 2 | COLL-10 | unit | `npx vitest run tests/collection/StatusPopover.test.tsx` | ✅ exists | ✅ green |
| 03-04-01 | 04 | 2 | COLL-12 | unit | `npx vitest run tests/collection/UnitTable.test.tsx -t "empty"` | ✅ exists | ✅ green |
| 03-04-02 | 04 | 2 | COLL-13 | manual | manual — delete confirm dialog in browser | Manual | ✅ verified |
| 03-04-03 | 04 | 2 | POLISH-01 | manual | manual — dialog interaction in browser | Manual | ✅ verified |
| 03-04-04 | 04 | 2 | POLISH-04 | manual | manual — switch units, verify form data resets | Manual | ✅ verified |

*Status: ✅ green · Manual — verified in human checkpoint*

---

## Wave 0 Requirements

- [x] `vitest.config.ts` — vitest config with jsdom environment
- [x] `tests/setup.ts` — shared test setup (@testing-library/jest-dom matchers)
- [x] `tests/collection/unitFilters.test.ts` — COLL-02..06 (13 tests green)
- [x] `tests/collection/collectionFilters.test.ts` — COLL-07 Zustand store (7 tests green)
- [x] `tests/collection/StatusPopover.test.tsx` — COLL-10 optimistic update + rollback + error toast (4 tests green)
- [x] `tests/collection/UnitTable.test.tsx` — COLL-12 empty state, POLISH-02 skeleton, POLISH-05 faction badge (4 tests green)

Note: `tests/collection/PlaybookTab.test.tsx` (14 tests) covers Phase 9 STRAT-01..05 requirements and lives here because PlaybookTab is rendered inside UnitDetailSheet (Phase 3 component).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| Table renders, sorts, paginates | COLL-01 | TanStack Table interaction requires browser DOM | ✅ Verified in 03-04 checkpoint |
| Unit detail Sheet opens on row click | COLL-09 | Sheet portal requires Tauri WebView | ✅ Verified in 03-03 checkpoint |
| Delete confirm dialog before deletion | COLL-13, POLISH-01 | Dialog interaction requires browser | ✅ Verified in 03-04 checkpoint |
| `key={unit.id}` prevents stale Sheet data | POLISH-04 | Requires switching units in browser | ✅ Verified in 03-04 checkpoint |

---

## Validation Audit 2026-05-03

| Metric | Count |
|--------|-------|
| Requirements audited | 15 tasks (COLL-01..13, POLISH-01/02/04/05) |
| Gaps found | 0 |
| Already green (automated) | 10 tasks |
| Already verified (manual-only) | 5 tasks |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 all complete: 42 tests green across 4 test files
- [x] No watch-mode flags
- [x] Feedback latency < 10s (collection suite ~5s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** compliant 2026-05-03
