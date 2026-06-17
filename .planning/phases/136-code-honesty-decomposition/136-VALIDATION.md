---
phase: 136
slug: code-honesty-decomposition
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-17
audited: 2026-06-17
---

# Phase 136 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `136-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vite.config.ts` / `tests/setup.ts` (existing) |
| **Quick run command** | `pnpm test -- <file>` |
| **Full suite command** | `pnpm test` |
| **Type/build gate** | `pnpm build` (tsc strict + Vite) |
| **Migration/version gate** | `pnpm check:version` |
| **Estimated runtime** | ~30–60 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run the task's targeted `pnpm test -- <file>` (and `pnpm build` for type-affecting changes)
- **After every plan wave:** Run `pnpm test` (full suite) + `pnpm build`
- **Before `/gsd:verify-work`:** Full suite green + `pnpm build` green + `pnpm check:version` green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

> Populated/refined by the planner per task. Seed rows derive from RESEARCH.md acceptance tests.

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 136-01-1 | HON-08 | — | HON-08 | N/A (no behavior change) | smoke | `grep -rn "function WeaponTable" src/` → exactly 1 | ✅ | ✅ green |
| 136-01-3 | HON-08 | — | HON-08 | N/A | smoke | `grep -rn "UdbWeaponsTable" src/` → 0 | ✅ | ✅ green |
| 136-01-1 | HON-08 | — | HON-08 | EN/FR identical render | component | `pnpm test -- tests/units/WeaponTable.test.tsx` (19 tests) | ✅ | ✅ green |
| 136-02-3 | HON-09 | — | HON-09 | each child < 200 (orchestrator <250 overridden — see VERIFICATION) | line-count | `wc -l` children < 200; orchestrator 446 (D-06 accepted override) | ✅ | ✅ green |
| 136-02-1 | HON-09 | 0 | HON-09 | portals/sections preserved | integration | `pnpm test -- tests/army-list/ArmyListDetailPage.decomposition.test.tsx` (24 tests) | ✅ | ✅ green |
| 136-04-3 | HON-10 | 0 | HON-10 | cache+invalidation restored | unit | `pnpm test -- tests/army-list/armyListHookInvalidations.test.ts tests/army-list/UnitDeleteDialog.test.tsx` | ✅ | ✅ green |
| 136-03-2 | HON-11 | — | HON-11 | column gone, parity green | data-layer | `pnpm test -- tests/data-layer/migration-parity.test.ts` + `pnpm check:version` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/army-list/ArmyListDetailPage.decomposition.test.tsx` — render-with-mocked-hooks integration test asserting Header / QuickAdd / UnitTable / export actions / portals all present (24-test behavior-preservation guard, written Wave-0 pre-extraction, green throughout — commit `112fae2c`)
- [x] Hook-symmetry test — `tests/army-list/armyListHookInvalidations.test.ts` asserts `useAddUnitToList`/`useRemoveUnitFromList` invalidate `["unit-army-lists"]`; `tests/army-list/UnitDeleteDialog.test.tsx` covers membership render via `useUnitArmyLists` (commits `9b0624c2` RED → `23c5aa93` GREEN)
- [x] EN/FR parity assertion in `tests/units/WeaponTable.test.tsx` for the merged component (11 HON-08 lock tests added)

*Existing infrastructure (Vitest + RTL + migration-parity test) covers the remainder.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| In-place NSIS update applies migration 049 without launch failure | HON-11 | Requires a packaged two-build update; not reproducible in jsdom | Build prev + new, install over, confirm app launches and `promoted_to_reminder` is gone |
| WeaponTable renders pixel-identically across all 5+ live surfaces | HON-08 | Cross-surface visual parity beyond unit-test assertions | Open datasheet/army-list/game-day surfaces in EN and FR, compare against pre-change build |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-06-17 (audit confirmed all 4 requirements COVERED)

---

## Validation Audit 2026-06-17

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Method:** State-A audit. Re-ran all 5 phase test files (`WeaponTable`, `ArmyListDetailPage.decomposition`, `armyListHookInvalidations`, `UnitDeleteDialog`, `migration-parity`) → **95 passed, 1 todo** (the todo is a pre-existing Phase-107 rules.db placeholder, out of scope). `pnpm check:version` → green (49/49 migrations, no CR bytes).

**Result:** All four requirements (HON-08, HON-09, HON-10, HON-11) are COVERED by automated tests that run green. All three Wave-0 requirements were satisfied during execution. No tests needed to be generated. Phase is **Nyquist-compliant**.

> Note: the orchestrator `<250` line-count criterion (HON-09) is an accepted override in `136-VERIFICATION.md` (446 lines, D-06 mechanical-only). The behavior-preservation guard (24 tests) — the validation-relevant artifact — is green; the line target is a design metric, not a verification gap.
