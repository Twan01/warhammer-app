---
phase: 32
slug: army-readiness-card
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-06
audited: 2026-05-06
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/dashboard/armyReadinessQuery.test.ts tests/dashboard/useArmyReadiness.test.ts tests/dashboard/ArmyReadinessCard.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/dashboard/armyReadinessQuery.test.ts tests/dashboard/useArmyReadiness.test.ts tests/dashboard/ArmyReadinessCard.test.tsx`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | PANEL-05 | unit | `pnpm test -- tests/dashboard/armyReadinessQuery.test.ts` | ✅ | ✅ green |
| 32-01-02 | 01 | 1 | PANEL-04, PANEL-05 | unit | `pnpm test -- tests/dashboard/armyReadinessQuery.test.ts` | ✅ (merged) | ✅ green |
| 32-01-03 | 01 | 1 | PANEL-04, PANEL-05 | component | `pnpm test -- tests/dashboard/ArmyReadinessCard.test.tsx` | ✅ | ✅ green |
| 32-01-04 | 01 | 1 | PANEL-05 | unit | `pnpm test -- tests/foundation/useUnits.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/dashboard/armyReadinessQuery.test.ts` — SQL contract + hook tests for PANEL-04, PANEL-05 (10 tests)
- [x] `tests/dashboard/ArmyReadinessCard.test.tsx` — Component tests for PANEL-04, PANEL-05 (11 tests)
- [x] `tests/foundation/useUnits.test.ts` — Invalidation tests for PANEL-05 (3 tests added)

*Note: `useArmyReadiness.test.ts` was merged into `armyReadinessQuery.test.ts` by executor — all hook tests (5-10) present there.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Progress bar fills with faction color_theme | PANEL-05 | Visual CSS rendering | Inspect ArmyReadinessCard faction rows — each bar uses inline style with faction's color_theme |
| Card fits in bento grid right column | PANEL-04 | Layout integration | Resize window from 1280px to 900px — card stacks cleanly without overflow |
| Target selector visually highlights selected button | PANEL-04 | Visual state | Click each of the 4 threshold buttons — active button has solid/primary treatment |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-06

---

## Validation Audit 2026-05-06

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All requirements (PANEL-04, PANEL-05) have automated test coverage. 684 tests pass, 0 failures. Hook tests consolidated into `armyReadinessQuery.test.ts` (file path deviation, not a coverage gap).
