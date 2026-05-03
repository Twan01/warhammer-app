---
phase: 9
slug: unit-playbook
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-02
audited: 2026-05-03
---

# Phase 9 — Validation Strategy

> Per-phase validation contract. All Wave 0 stubs filled and green.
> Phase shipped 2026-05-02. Audit confirmed compliant 2026-05-03.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react + jsdom |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run tests/collection/PlaybookTab.test.tsx --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds (PlaybookTab suite: 14 tests) |

---

## Sampling Rate

Phase 9 is complete and shipped. Retroactive audit confirmed all automated tests green.

- **PlaybookTab suite:** `npx vitest run tests/collection/PlaybookTab.test.tsx` — 14 tests, ~5s
- **Note:** Test lives in `tests/collection/` because `PlaybookTab` is rendered inside Phase 3's `UnitDetailSheet`
- **Foundation coverage:** `tests/foundation/strategyNoteQueries.test.ts` covers the query layer (Phase 6, 5 tests)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-W0-01 | 00 | 0 | STRAT-01..05 stubs | component | `npx vitest run tests/collection/PlaybookTab.test.tsx` | ✅ exists | ✅ green |
| 9-01-01 | 01 | 1 | STRAT-01 | component | `npx vitest run tests/collection/PlaybookTab.test.tsx -t "STRAT-01"` | ✅ exists | ✅ green |
| 9-01-02 | 01 | 1 | STRAT-02 | component | `npx vitest run tests/collection/PlaybookTab.test.tsx -t "STRAT-02"` | ✅ exists | ✅ green |
| 9-01-03 | 01 | 1 | STRAT-03 | component | `npx vitest run tests/collection/PlaybookTab.test.tsx -t "STRAT-03"` | ✅ exists | ✅ green |
| 9-01-04 | 01 | 1 | STRAT-04 | component | `npx vitest run tests/collection/PlaybookTab.test.tsx -t "STRAT-04"` | ✅ exists | ✅ green |
| 9-01-05 | 01 | 1 | STRAT-05 | component | `npx vitest run tests/collection/PlaybookTab.test.tsx -t "STRAT-05"` | ✅ exists | ✅ green |
| manual smoke | 03 | — | STRAT-01..05 live | Manual | app launch + smoke test | Manual | ✅ verified |

*Status: ✅ green · Manual — verified in human checkpoint*

---

## Wave 0 Requirements

- [x] `tests/collection/PlaybookTab.test.tsx` — STRAT-01: tab trigger + click switch (2), STRAT-02: 6 stat cells + null placeholder + suffixes + edit mode (4), STRAT-03: Abilities rows=3 + Keywords single-line (2), STRAT-04: 8 fields in order + rows=2 (2), STRAT-05: disabled when clean + enables on edit + save calls upsert + error toast (4) — 14 tests green

*Pre-existing coverage: `tests/foundation/strategyNoteQueries.test.ts` covers query layer (getStrategyNote null/INSERT/UPDATE paths, Phase 6, 5 tests)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| Tab switching without closing/reopening sheet | STRAT-01 | Visual interaction in live Tauri app | ✅ Verified in 09-03 smoke test (Step 2) |
| Stats suffix display (", +) at render time | STRAT-02 | Rendered output with live DB values | ✅ Verified in 09-03 smoke test (Step 3-4) |
| SheetFooter Edit/Delete visible on both tabs | STRAT-01 | Layout co-visibility requires visual inspection | ✅ Verified in 09-03 smoke test (Step 9) |
| SQLite persistence round-trip + no data bleed across units | STRAT-05 | Requires live Tauri IPC | ✅ Verified in 09-03 smoke test (Step 8) |
| Escape key cancels stats edit mode | STRAT-02 | Keyboard interaction in live app | ✅ Verified in 09-03 smoke test (Step 4) |

---

## Validation Audit 2026-05-03

| Metric | Count |
|--------|-------|
| Requirements audited | STRAT-01..05 (5 requirements) |
| Gaps found | 0 |
| Already green (automated) | 6 task entries (14 tests across 1 file) |
| Already verified (manual-only) | 5 behaviors (09-03 smoke test) |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 all complete: 14 tests green across 1 test file
- [x] No watch-mode flags
- [x] Feedback latency < 5s (PlaybookTab suite ~5s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** compliant 2026-05-03
