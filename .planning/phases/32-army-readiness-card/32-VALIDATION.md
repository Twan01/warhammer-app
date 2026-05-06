---
phase: 32
slug: army-readiness-card
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
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
| 32-01-01 | 01 | 1 | PANEL-05 | unit | `pnpm test -- tests/dashboard/armyReadinessQuery.test.ts` | ❌ W0 | ⬜ pending |
| 32-01-02 | 01 | 1 | PANEL-04, PANEL-05 | unit | `pnpm test -- tests/dashboard/useArmyReadiness.test.ts` | ❌ W0 | ⬜ pending |
| 32-01-03 | 01 | 1 | PANEL-04, PANEL-05 | component | `pnpm test -- tests/dashboard/ArmyReadinessCard.test.tsx` | ❌ W0 | ⬜ pending |
| 32-01-04 | 01 | 1 | PANEL-05 | unit | `pnpm test -- tests/foundation/useUnits.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/dashboard/armyReadinessQuery.test.ts` — stubs for PANEL-05 (getArmyReadinessByFaction SQL shape, INNER JOIN, 'Completed', null points)
- [ ] `tests/dashboard/useArmyReadiness.test.ts` — stubs for PANEL-04, PANEL-05 (hook query key, data mapping, localStorage target persistence)
- [ ] `tests/dashboard/ArmyReadinessCard.test.tsx` — stubs for PANEL-04, PANEL-05 (faction rows, target selector, target-met gold text, empty state)

*Existing infrastructure covers unit mutation invalidation testing (tests/foundation/useUnits.test.ts).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Progress bar fills with faction color_theme | PANEL-05 | Visual CSS rendering | Inspect ArmyReadinessCard faction rows — each bar uses inline style with faction's color_theme |
| Card fits in bento grid right column | PANEL-04 | Layout integration | Resize window from 1280px to 900px — card stacks cleanly without overflow |
| Target selector visually highlights selected button | PANEL-04 | Visual state | Click each of the 4 threshold buttons — active button has solid/primary treatment |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
