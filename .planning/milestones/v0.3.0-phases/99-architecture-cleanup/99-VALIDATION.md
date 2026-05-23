---
phase: 99
slug: architecture-cleanup
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-22
---

# Phase 99 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/{path}` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~79 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/{relevant}`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 79 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 99-01-01 | 01 | 1 | ARCH-01 | T-99-01 | N/A (pure refactor) | unit | `pnpm test -- tests/goals/computeGoalPeriod.test.ts tests/painting/recipeDiff.test.ts tests/painting/recipeSteps.test.ts` | ✅ | ✅ green |
| 99-01-02 | 01 | 1 | ARCH-04 | T-99-01 | N/A (pure refactor) | unit | `pnpm test -- tests/army-lists/armyListsReducer.test.ts` | ✅ | ✅ green |
| 99-02-01 | 02 | 1 | ARCH-02 | T-99-02 | N/A (pure refactor) | integration | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ | ✅ green |
| 99-03-01 | 03 | 1 | ARCH-03 | T-99-03 | N/A (pure refactor) | integration | `pnpm test -- tests/units/UnitFormRequired.test.tsx tests/units/UnitFormOptional.test.tsx tests/units/UnitSheet.decomposition.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 79s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-22

---

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

### Gap Details

| Requirement | Gap Type | Resolution | Test Files Created |
|-------------|----------|------------|-------------------|
| ARCH-03 | MISSING | Generated 27 tests across 3 files | `tests/units/UnitFormRequired.test.tsx`, `tests/units/UnitFormOptional.test.tsx`, `tests/units/UnitSheet.decomposition.test.tsx` |
