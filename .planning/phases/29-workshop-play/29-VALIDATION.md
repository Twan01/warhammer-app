---
phase: 29
slug: workshop-play
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-05
validated: 2026-05-05
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
| 29-00-01 | 00 | 0 | WKSP-01 | unit stub | `pnpm test -- tests/workshop-play/paintRowSwatch.test.tsx` | ✅ | ✅ green |
| 29-00-02 | 00 | 0 | WKSP-02 | unit stub | `pnpm test -- tests/workshop-play/recipeSwatchData.test.ts` | ✅ | ✅ green |
| 29-00-03 | 00 | 0 | PLAY-01 | unit stub | `pnpm test -- tests/workshop-play/armyListReadinessPanel.test.tsx` | ✅ | ✅ green |
| 29-00-04 | 00 | 0 | PLAY-02 | unit stub | `pnpm test -- tests/workshop-play/armyListReadiness.test.tsx` | ✅ | ✅ green |
| 29-01-* | 01 | 1 | WKSP-02, PLAY-02 | unit | `pnpm test -- tests/workshop-play/` | ✅ | ✅ green |
| 29-02-* | 02 | 2 | WKSP-01, WKSP-02 | unit | `pnpm test -- tests/workshop-play/` | ✅ | ✅ green |
| 29-03-* | 03 | 2 | PLAY-01, PLAY-02 | unit | `pnpm test -- tests/workshop-play/` | ✅ | ✅ green |
| 29-04-* | 04 | 3 | ALL | smoke | `pnpm test && pnpm build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/workshop-play/paintRowSwatch.test.tsx` — 3 tests for WKSP-01 (PaintRow swatch rendering)
- [x] `tests/workshop-play/recipeSwatchData.test.ts` — 8 tests for WKSP-02 (batch query + hook + swatch strip component)
- [x] `tests/workshop-play/armyListReadinessPanel.test.tsx` — 6 tests for PLAY-01 (ArmyListSummaryBar upgrade)
- [x] `tests/workshop-play/armyListReadiness.test.tsx` — 11 tests for PLAY-02 (batch query + hook + BattleLogRow integration)

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s (2.58s actual)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ compliant (2026-05-05)

---

## Validation Audit 2026-05-05

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests | 28 |
| Test files | 4 |
| Suite duration | 2.58s |
