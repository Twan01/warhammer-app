---
phase: 8
slug: army-list-builder
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-02
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds (baseline: 157 tests) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| getArmyListsByUnitId | 01 | 1 | ARMY-05 | unit | `npx vitest run tests/army-list/armyListQueries.test.ts -t "getArmyListsByUnitId"` | ❌ W0 | ⬜ pending |
| createArmyList query | 01 | 1 | ARMY-01 | unit | `npx vitest run tests/army-list/armyListQueries.test.ts -t "createArmyList"` | ❌ W0 | ⬜ pending |
| addUnitToList / removeUnitFromList | 01 | 1 | ARMY-02 | unit | `npx vitest run tests/army-list/armyListQueries.test.ts` | ❌ W0 | ⬜ pending |
| updateArmyListUnit null-clear | — | — | ARMY-03 | unit | `npx vitest run tests/foundation/armyListQueries.test.ts -t "updateArmyListUnit"` | ✅ exists | ⬜ pending |
| UnitDeleteDialog warning state | 01 | 1 | ARMY-05 | component | `npx vitest run tests/army-list/UnitDeleteDialog.test.tsx` | ❌ W0 | ⬜ pending |
| ArmyListsPage empty state | 01 | 1 | ARMY-06 | component | `npx vitest run tests/army-list/ArmyListsPage.test.tsx` | ❌ W0 | ⬜ pending |
| Per-unit / list notes save | — | — | ARMY-04 | unit + component | `npx vitest run tests/army-list/` | ❌ W0 | ⬜ pending |
| Route + sidebar nav | — | — | ARMY-07 | manual | — | Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/army-list/armyListQueries.test.ts` — stubs for `getArmyListsByUnitId` (new query); do NOT duplicate existing `tests/foundation/armyListQueries.test.ts` which already covers `createArmyList`, `addUnitToList`, `removeUnitFromList`, `updateArmyListUnit`
- [ ] `tests/army-list/UnitDeleteDialog.test.tsx` — stubs for ARMY-05 warning state (two-step confirmation flow)
- [ ] `tests/army-list/ArmyListsPage.test.tsx` — stubs for ARMY-06 empty state, loading state, card render

Note: `tests/setup.ts` already includes ResizeObserver + scrollIntoView polyfills — required for Command component tests; no new polyfills needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/army-lists` route registered and navigable from sidebar | ARMY-07 | Router integration requires live Tauri/browser render | Launch app, click "Army Lists" in sidebar, confirm page loads without error |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
