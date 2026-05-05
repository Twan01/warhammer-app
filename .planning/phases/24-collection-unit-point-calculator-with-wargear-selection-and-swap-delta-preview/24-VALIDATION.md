---
phase: 24
slug: collection-unit-point-calculator-with-wargear-selection-and-swap-delta-preview
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
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
| 24-01-01 | 01 | 1 | TIER-01 | unit | `pnpm test -- tests/collection/unitPointTierQueries.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 1 | TIER-02 | unit | `pnpm test -- tests/collection/unitPointTierQueries.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-03 | 01 | 1 | TIER-03 | unit | `pnpm test -- tests/collection/unitPointTierQueries.test.ts` | ❌ W0 | ⬜ pending |
| 24-02-01 | 02 | 1 | LOAD-01 | unit | `pnpm test -- tests/collection/unitLoadoutQueries.test.ts` | ❌ W0 | ⬜ pending |
| 24-02-02 | 02 | 1 | LOAD-02 | unit | `pnpm test -- tests/collection/unitLoadoutQueries.test.ts` | ❌ W0 | ⬜ pending |
| 24-02-03 | 02 | 1 | LOAD-03 | unit | `pnpm test -- tests/collection/unitLoadoutQueries.test.ts` | ❌ W0 | ⬜ pending |
| 24-03-01 | 03 | 2 | DELTA-01 | unit | `pnpm test -- tests/army-list/deltaPreview.test.ts` | ❌ W0 | ⬜ pending |
| 24-03-02 | 03 | 2 | COALESCE-01 | unit (existing) | `pnpm test -- tests/army-list/armyListQueries.test.ts` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/collection/unitPointTierQueries.test.ts` — stubs for TIER-01, TIER-02, TIER-03
- [ ] `tests/collection/unitLoadoutQueries.test.ts` — stubs for LOAD-01, LOAD-02, LOAD-03
- [ ] `tests/army-list/deltaPreview.test.ts` — stubs for DELTA-01 (pure function, no DB mock)

*Existing infrastructure covers framework install — Vitest and RTL already present.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Delta preview badge renders with correct color | DELTA-01 (visual) | CSS color assertion requires visual check | In army list builder, change model count tier — verify green +N for increase, red -N for decrease |
| PlaybookTab Loadout section layout | LOAD-UI | Layout/spacing not testable in jsdom | Open unit sheet, navigate to Playbook tab, verify loadout section appears below wargear stats |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
