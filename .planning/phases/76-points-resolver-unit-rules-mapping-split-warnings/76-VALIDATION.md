---
phase: 76
slug: points-resolver-unit-rules-mapping-split-warnings
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-15
---

# Phase 76 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/army-lists/ tests/lib/resolveUnitPoints.test.ts tests/lib/computeUnitWarnings.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~4 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 4 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 76-01-01 | 01 | 1 | PV-01 | unit | `pnpm test -- tests/lib/resolveUnitPoints.test.ts` | ✅ | ✅ green |
| 76-01-02 | 01 | 1 | PV-06, PV-07 | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ✅ | ✅ green |
| 76-02-01 | 02 | 2 | PV-02 | component | `pnpm test -- tests/army-lists/PointsSourceChip.test.tsx` | ✅ | ✅ green |
| 76-02-02 | 02 | 2 | PV-03 | component | `pnpm test -- tests/army-lists/MatchStatusIndicator.test.tsx` | ✅ | ✅ green |
| 76-02-03 | 02 | 2 | PV-04, PV-05 | component | `pnpm test -- tests/army-lists/RulesMappingSheet.test.tsx` | ✅ | ✅ green |
| 76-02-04 | 02 | 2 | PV-06 | component | `pnpm test -- tests/army-lists/ArmyListSummaryBar.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Source chip dot colors render correctly in browser | PV-02 | CSS color rendering requires visual inspection | Open army list, verify dot colors match source type |
| RulesMappingSheet interactive flow end-to-end | PV-04 | Full sheet interaction with real DB requires desktop app | Run `pnpm tauri dev`, click match indicator, test confirm/search/remove |
| List-level warnings appear only in summary bar, not per-unit | PV-06 | Visual separation requires rendered app with real data | Create list exceeding points limit, verify badges in summary only |

---

## Validation Audit 2026-05-15

| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 4 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 4s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-15
