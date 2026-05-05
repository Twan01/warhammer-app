---
phase: 22
slug: hobby-goals
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-05
validated: 2026-05-05
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vite.config.ts` (vitest block inline) |
| **Quick run command** | `pnpm test -- tests/goals/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/goals/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-00-01 | 00 | 0 | ANLY-01 | unit | `pnpm test -- tests/goals/goalQueries.test.ts` | ✅ | ✅ green (6 tests) |
| 22-00-02 | 00 | 0 | ANLY-01 | unit | `pnpm test -- tests/goals/goalSchema.test.ts` | ✅ | ✅ green (4 tests) |
| 22-00-03 | 00 | 0 | ANLY-02 | unit | `pnpm test -- tests/goals/computeGoalPeriod.test.ts` | ✅ | ✅ green (10 tests) |
| 22-00-04 | 00 | 0 | ANLY-02 | unit | `pnpm test -- tests/goals/useGoals.test.tsx` | ✅ | ✅ green (6 tests) |
| 22-00-05 | 00 | 0 | ANLY-01 | unit | `pnpm test -- tests/goals/GoalSheet.test.tsx` | ✅ | ✅ green (3 tests) |
| 22-00-06 | 00 | 0 | ANLY-03 | unit | `pnpm test -- tests/goals/GoalsPage.test.tsx` | ✅ | ✅ green (4 tests) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/goals/goalQueries.test.ts` — 6 tests for ANLY-01 (createGoal SQL), ANLY-02 (getGoalProgress SQL)
- [x] `tests/goals/goalSchema.test.ts` — 4 tests for ANLY-01 (Zod validation)
- [x] `tests/goals/computeGoalPeriod.test.ts` — 10 tests for ANLY-02 (period boundary math) + ANLY-03 (deriveGoalStatus ordering)
- [x] `tests/goals/useGoals.test.tsx` — 6 tests for ANLY-02 (invalidation of goal-progress), useCreateGoal/useDeleteGoal cache behavior
- [x] `tests/goals/GoalSheet.test.tsx` — 3 tests for ANLY-01 (form submit, edit mode reset)
- [x] `tests/goals/GoalsPage.test.tsx` — 4 tests for ANLY-03 (Active/Completed/Missed section grouping)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Goal progress bar visually updates after logging a painting session | ANLY-02 | Requires real Tauri window + SQLite to verify cross-query reactivity | 1. Create a goal for this month 2. Log a painting session 3. Verify progress bar updates without page refresh |
| Completed/Missed visual styling is distinct from active goals | ANLY-03 | Visual appearance cannot be verified in jsdom | 1. Create goals spanning past/current periods 2. Verify section grouping and color distinction |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-05

---

## Validation Audit 2026-05-05

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

33 active tests across 6 files. All 3 requirements (ANLY-01, ANLY-02, ANLY-03) fully covered with automated verification. Full suite: 610 passed, 2 pre-existing skips.
