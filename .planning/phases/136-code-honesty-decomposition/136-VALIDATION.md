---
phase: 136
slug: code-honesty-decomposition
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-17
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
| 136-*-* | HON-08 | — | HON-08 | N/A (no behavior change) | smoke | `grep -rn "function WeaponTable" src/` → exactly 1 | ✅ | ⬜ pending |
| 136-*-* | HON-08 | — | HON-08 | N/A | smoke | `grep -rn "UdbWeaponsTable" src/` → 0 | ✅ | ⬜ pending |
| 136-*-* | HON-08 | — | HON-08 | EN/FR identical render | component | `pnpm test -- tests/units/WeaponTable.test.tsx` | ✅ | ⬜ pending |
| 136-*-* | HON-09 | — | HON-09 | no behavior regression | line-count | `wc -l ArmyListDetailPage.tsx` < 250; each child < 200 | ✅ | ⬜ pending |
| 136-*-* | HON-09 | — | HON-09 | portals/sections preserved | integration | `pnpm test -- tests/army-list/...` | ❌ W0 | ⬜ pending |
| 136-*-* | HON-10 | — | HON-10 | cache+invalidation restored | unit | new hook tests + symmetry test | ❌ W0 | ⬜ pending |
| 136-*-* | HON-11 | — | HON-11 | column gone, parity green | data-layer | `pnpm test -- tests/data-layer/` + `pnpm check:version` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/army-list/ArmyListDetailPage.*.test.tsx` — render-with-mocked-hooks integration test asserting Header / QuickAdd / UnitTable / export actions / portals all present (behavior-preservation guard before decomposition)
- [ ] Hook-symmetry test stub — removing a unit from an army list reflects in `UnitDeleteDialog` membership count (no stale cache) for the new `useUnitArmyLists` hook
- [ ] EN/FR parity assertion in `tests/units/WeaponTable.test.tsx` for the merged component

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
