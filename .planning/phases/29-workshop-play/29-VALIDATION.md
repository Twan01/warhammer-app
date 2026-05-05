---
phase: 29
slug: workshop-play
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/workshop-play/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/workshop-play/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-00-01 | 00 | 0 | WKSP-01 | unit stub | `pnpm test -- tests/workshop-play/paintRowSwatch.test.tsx` | ❌ W0 | ⬜ pending |
| 29-00-02 | 00 | 0 | WKSP-02 | unit stub | `pnpm test -- tests/workshop-play/recipeSwatchData.test.ts` | ❌ W0 | ⬜ pending |
| 29-00-03 | 00 | 0 | PLAY-01 | unit stub | `pnpm test -- tests/workshop-play/armyListReadinessPanel.test.tsx` | ❌ W0 | ⬜ pending |
| 29-00-04 | 00 | 0 | PLAY-02 | unit stub | `pnpm test -- tests/workshop-play/armyListReadiness.test.ts` | ❌ W0 | ⬜ pending |
| 29-01-* | 01 | 1 | WKSP-01, WKSP-02, PLAY-01, PLAY-02 | unit | `pnpm test -- tests/workshop-play/` | ✅ W0 | ⬜ pending |
| 29-02-* | 02 | 2 | WKSP-01, WKSP-02 | unit | `pnpm test -- tests/workshop-play/` | ✅ W0 | ⬜ pending |
| 29-03-* | 03 | 2 | PLAY-01, PLAY-02 | unit | `pnpm test -- tests/workshop-play/` | ✅ W0 | ⬜ pending |
| 29-04-* | 04 | 3 | ALL | smoke | manual smoke test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/workshop-play/paintRowSwatch.test.tsx` — stubs for WKSP-01 (PaintRow swatch rendering)
- [ ] `tests/workshop-play/recipeSwatchData.test.ts` — stubs for WKSP-02 (batch query + hook + swatch strip component)
- [ ] `tests/workshop-play/armyListReadinessPanel.test.tsx` — stubs for PLAY-01 (ArmyListSummaryBar upgrade)
- [ ] `tests/workshop-play/armyListReadiness.test.ts` — stubs for PLAY-02 (batch query + hook + BattleLogRow integration)

*No new test framework install needed — Vitest 4 + RTL 16 already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Swatch colors visually match paint hex values | WKSP-01 | Color rendering is browser-dependent | Open Paints page, verify swatches match hex values |
| Recipe swatch strip overlapping circles visual | WKSP-02 | CSS negative margin rendering | Open Recipes page, verify overlapping circle strip on recipe rows |
| Army List readiness progress bar visual | PLAY-01 | CSS battle-gold fill rendering | Open Army List detail, verify gold progress bar proportion |
| Battle Log live readiness updates | PLAY-02 | End-to-end data flow through React Query | Change unit painting status, verify Battle Log points update |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
