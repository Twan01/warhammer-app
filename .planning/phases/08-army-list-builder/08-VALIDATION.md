---
phase: 8
slug: army-list-builder
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-02
audited: 2026-05-03
---

# Phase 8 — Validation Strategy

> Per-phase validation contract. All Wave 0 stubs filled and green.
> Phase shipped 2026-05-02. Audit confirmed compliant 2026-05-03.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react + jsdom |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run tests/army-list/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~3 seconds (army-list suite: 7 tests) |

---

## Sampling Rate

Phase 8 is complete and shipped. Retroactive audit confirmed all automated tests green.

- **Army-list suite:** `npx vitest run tests/army-list/` — 7 tests, ~3s
- **Foundation coverage:** `tests/foundation/armyListQueries.test.ts` covers createArmyList, addUnitToList, removeUnitFromList, updateArmyListUnit (Phase 6 tests, still green)
- **Full suite:** 212 tests (7 new Phase 8 tests included)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| getArmyListsByUnitId | 01 | 1 | ARMY-05 | Unit (mock DB) | `npx vitest run tests/army-list/armyListQueries.test.ts` | ✅ exists | ✅ green |
| createArmyList / addUnit / removeUnit | 01 | 1 | ARMY-01, ARMY-02 | Unit (mock DB) | `npx vitest run tests/foundation/armyListQueries.test.ts` | ✅ exists | ✅ green |
| updateArmyListUnit null-clear | — | — | ARMY-03 | Unit (mock DB) | `npx vitest run tests/foundation/armyListQueries.test.ts -t "updateArmyListUnit"` | ✅ exists | ✅ green |
| UnitDeleteDialog warning state | 04 | 2 | ARMY-05 | Component | `npx vitest run tests/army-list/UnitDeleteDialog.test.tsx` | ✅ exists | ✅ green |
| ArmyListsPage states | 04 | 2 | ARMY-06 | Component | `npx vitest run tests/army-list/ArmyListsPage.test.tsx` | ✅ exists | ✅ green |
| Route + sidebar nav | 04 | — | ARMY-07 | Manual | app launch + navigation | Manual | ✅ verified |

*Status: ✅ green · Manual — verified in human checkpoint*

---

## Wave 0 Requirements

- [x] `tests/army-list/armyListQueries.test.ts` — `getArmyListsByUnitId`: SQL contract (SELECT/JOIN/WHERE with unit_id param), passthrough return — 2 tests green
- [x] `tests/army-list/UnitDeleteDialog.test.tsx` — normal state (0 lists: simple confirm), warning state (2 lists: names shown + "Delete Anyway" button) — 2 tests green
- [x] `tests/army-list/ArmyListsPage.test.tsx` — empty state ("Build your first army list" heading + CTA), loading state (skeleton elements), populated state (both list names rendered) — 3 tests green

*Pre-existing coverage: `tests/foundation/armyListQueries.test.ts` covers createArmyList, getArmyListWithUnits (COALESCE), addUnitToList, removeUnitFromList, updateArmyListUnit (Phase 6, 10 tests)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| `/army-lists` route registered and navigable from sidebar | ARMY-07 | Router integration requires live Tauri/browser render | ✅ Verified in 08-05 smoke test |
| Full Army List Builder UX (create/edit/delete lists, add/remove units, points override, notes, summary bar, sibling portal architecture) | ARMY-01..06 | Tauri IPC (SQLite reads/writes, cache invalidation, portal z-index) cannot be mocked in jsdom | ✅ All 14 steps verified in 08-05 smoke test (2026-05-02) |

---

## Validation Audit 2026-05-03

| Metric | Count |
|--------|-------|
| Requirements audited | ARMY-01..07 (7 requirements) |
| Gaps found | 0 |
| Already green (automated) | 5 task entries (7 new tests + 10 Phase 6 foundation tests) |
| Already verified (manual-only) | 2 behaviors (08-05 smoke test) |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 all complete: 7 tests green across 3 test files
- [x] No watch-mode flags
- [x] Feedback latency < 5s (army-list suite ~3s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** compliant 2026-05-03
