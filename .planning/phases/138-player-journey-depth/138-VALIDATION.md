---
phase: 138
slug: player-journey-depth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-18
---

# Phase 138 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` (+ `tests/setup.ts` globals) |
| **Quick run command** | `pnpm test -- tests/<changed-file>.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~60–90 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- <relevant test file>`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green + `pnpm build` (tsc) clean
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 138-01-xx | 01 | 1 | PLAY-01 | — | N/A (read-only canonical query) | unit | `pnpm test -- tests/db/queries/unitDatabase.test.ts` | ❌ W0 | ⬜ pending |
| 138-02-xx | 02 | 2 | PLAY-01 | — | N/A | component | `pnpm test -- tests/features/unit-database/UnitCompare.test.tsx` | ❌ W0 | ⬜ pending |
| 138-03-xx | 03 | 2 | PLAY-04 | — | N/A | unit+component | `pnpm test -- tests/db/queries/udbOwnership.test.ts` | ❌ W0 | ⬜ pending |
| 138-04-xx | 04 | 2 | PLAY-05 | — | N/A | component | `pnpm test -- tests/features/dashboard/GoalProgressCard.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/db/queries/unitDatabase.test.ts` — extend for `getUdbUnitsByIds` (multi-id batch, IN-clause, missing-id tolerance) — PLAY-01
- [ ] `tests/features/unit-database/UnitCompare.test.tsx` — comparison render + diff-highlight + 3-unit cap — PLAY-01
- [ ] `tests/db/queries/udbOwnership.test.ts` — `getOwnedCountsByUdbUnitId` faction-agnostic GROUP BY — PLAY-04
- [ ] `tests/features/dashboard/GoalProgressCard.test.tsx` — active-goals render + empty-state link — PLAY-05
- [ ] Invalidation-symmetry assertion: `useCreatePaintingSession`/session mutations invalidate `GOAL_PROGRESS_KEY` (PLAY-05 open question — Wave 0 grep + test)

*Final test file names/IDs to be pinned by the planner against PLAN.md task breakdown.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Side-by-side comparison reads correctly at the full datasheet width on the `/unit-database/compare` route | PLAY-01 | Visual layout / responsive width not assertable in jsdom | Open app → Unit Database → select 2–3 units → Compare → confirm columns align, diffs highlighted, WeaponTable renders per column EN+FR |
| "Owned ×N" badge deep-links into the Collection filtered to that udb unit | PLAY-04 | Cross-route navigation + Zustand filter state | Click "Owned ×N" on a UDB row → lands on Collection filtered to that unit |
| End-to-end bidirectional loop (already-shipped paths) | PLAY-04 | Confirms no regression in existing add/view flows | Collection→View Datasheet resolves; UDB→Add to Collection creates a linked unit; owned count increments |
| Goal progress visualization on the dashboard | PLAY-05 | Visual progress bar / empty state | Open dashboard → confirm active goals show progress bars; with zero goals, empty state links to GoalsPage |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
