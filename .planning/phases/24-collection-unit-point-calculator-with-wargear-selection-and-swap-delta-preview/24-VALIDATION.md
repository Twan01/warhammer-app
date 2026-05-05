---
phase: 24
slug: collection-unit-point-calculator-with-wargear-selection-and-swap-delta-preview
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-05
validated: 2026-05-05
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` (jsdom environment) |
| **Quick run command** | `pnpm test -- tests/collection/ tests/army-list/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/collection/ tests/army-list/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | TIER-01 | unit | `pnpm test -- tests/collection/unitPointTierQueries.test.ts` | ✅ | ✅ green |
| 24-01-02 | 01 | 1 | TIER-02 | unit | `pnpm test -- tests/collection/unitPointTierQueries.test.ts` | ✅ | ✅ green |
| 24-01-03 | 01 | 1 | TIER-03 | unit | `pnpm test -- tests/collection/unitPointTierQueries.test.ts` | ✅ | ✅ green |
| 24-02-01 | 02 | 1 | LOAD-01 | unit | `pnpm test -- tests/collection/unitLoadoutQueries.test.ts` | ✅ | ✅ green |
| 24-02-02 | 02 | 1 | LOAD-02 | unit | `pnpm test -- tests/collection/unitLoadoutQueries.test.ts` | ✅ | ✅ green |
| 24-02-03 | 02 | 1 | LOAD-03 | unit | `pnpm test -- tests/collection/unitLoadoutQueries.test.ts` | ✅ | ✅ green |
| 24-03-01 | 03 | 2 | DELTA-01 | unit | `pnpm test -- tests/army-list/deltaPreview.test.ts` | ✅ | ✅ green |
| 24-03-02 | 03 | 2 | COALESCE-01 | unit (existing) | `pnpm test -- tests/foundation/armyListQueries.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/collection/unitPointTierQueries.test.ts` — 5 tests for TIER-01, TIER-02, TIER-03 (all active, green)
- [x] `tests/collection/unitLoadoutQueries.test.ts` — 7 tests for LOAD-01, LOAD-02, LOAD-03 (all active, green)
- [x] `tests/army-list/deltaPreview.test.ts` — 4 tests for DELTA-01 (all active, green)

*All stubs activated in Plan 24-02/03. No `it.skip` remaining.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Delta preview badge renders with correct color | DELTA-01 (visual) | CSS color assertion requires visual check | In army list builder, change model count tier — verify green +N for increase, red -N for decrease |
| PlaybookTab Loadout section layout | LOAD-UI | Layout/spacing not testable in jsdom | Open unit sheet, navigate to Playbook tab, verify loadout section appears below wargear stats |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-05

---

## Validation Audit 2026-05-05

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Test suite:** 644 passed, 2 skipped (pre-existing), 0 failed
**Phase 24 tests:** 16 across 3 files — all green, no `it.skip` remaining
**COALESCE-01 coverage:** Confirmed by existing tests in `foundation/armyListQueries.test.ts` (exact regex assertion on `COALESCE(alu.points_override, u.points, 0) AS effective_points`)
