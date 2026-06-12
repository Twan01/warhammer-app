---
phase: 129
slug: navigation-cross-links-technical-cleanup
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-11
validated: 2026-06-12
---

# Phase 129 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 129-01-01 | 01 | 1 | NAV-01 | unit | `pnpm test -- tests/navigation/paintingModeReturnTo.test.tsx` | ✅ green |
| 129-01-02 | 01 | 1 | NAV-11 | unit | `pnpm test -- tests/painting-mode/StepFocalView.escHint.test.tsx` | ✅ green |
| 129-02-01 | 02 | 1 | NAV-02 | unit | `pnpm test -- tests/units/UnitDetailSheet.viewDatasheet.test.tsx` | ✅ green |
| 129-02-02 | 02 | 1 | NAV-03 | integration | `pnpm test -- tests/navigation/rulesUnitCrossLinks.test.tsx` | ✅ green |
| 129-02-03 | 02 | 1 | NAV-06 | unit | `pnpm test -- tests/battle-log/BattleLogRow.armyLink.test.tsx` | ✅ green |
| 129-03-01 | 03 | 1 | NAV-07 | unit | `pnpm build` (no dead imports) | ✅ green |
| 129-03-02 | 03 | 1 | NAV-08 | unit | `pnpm build` (memo export type) | ✅ green |
| 129-03-03 | 03 | 1 | NAV-09 | unit | `pnpm build` (reducer extracted) | ✅ green |
| 129-04-01 | 04 | 2 | NAV-04 | integration | `pnpm test -- tests/app-shell/AppSidebar.dividers.test.tsx` (nav entry; active-CSS highlight manual) | ✅ green |
| 129-04-02 | 04 | 2 | NAV-05 | integration | `pnpm test -- tests/app-shell/AppSidebar.dividers.test.tsx` | ✅ green |
| 129-04-03 | 04 | 2 | NAV-10 | manual | Visual: sidebar collapse transition smoothness (CSS animation) | ⬜ manual-only |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or fixtures needed.

---

## Manual-Only Verifications

Reduced to genuinely-visual residue after the 2026-06-12 validation audit. Structural/logic
layers of NAV-01/02/03/05/06/11 and the Game Day nav entry (NAV-04) are now covered by
automated tests (see Per-Task Verification Map). What remains can only be confirmed by eye:

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar active-state highlight | NAV-04 | NavItem active CSS class is a runtime DOM/visual condition | Navigate to `/game-day` and `/game-day/:id`; confirm Game Day item is visually highlighted in both |
| Sidebar collapse transition smoothness | NAV-10 | CSS animation quality is subjective | Toggle collapse repeatedly; width animates at 200ms with no text snap/wrap mid-animation |

---

## Validation Sign-Off

- [x] All tasks have automated or manual verification mapped
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-06-12

---

## Validation Audit 2026-06-12

10 of 11 requirements now carry automated verification (8 via new unit/integration tests,
3 via `pnpm build`; NAV-04 overlaps both layers). Only NAV-10 (animation smoothness) and the
NAV-04 active-CSS highlight remain manual-only — both genuinely visual. 6 new test files,
18 tests, all green (`vitest run`, 11.58s).

| Metric | Count |
|--------|-------|
| Gaps found (manual-only, automatable) | 6 |
| Resolved (automated tests written) | 6 |
| Escalated | 0 |

**Tests added:**

| Requirement | Test File |
|-------------|-----------|
| NAV-01 | `tests/navigation/paintingModeReturnTo.test.tsx` |
| NAV-02 | `tests/units/UnitDetailSheet.viewDatasheet.test.tsx` |
| NAV-03 | `tests/navigation/rulesUnitCrossLinks.test.tsx` |
| NAV-04 / NAV-05 | `tests/app-shell/AppSidebar.dividers.test.tsx` |
| NAV-06 | `tests/battle-log/BattleLogRow.armyLink.test.tsx` |
| NAV-11 | `tests/painting-mode/StepFocalView.escHint.test.tsx` |
