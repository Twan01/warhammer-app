---
phase: 138
slug: player-journey-depth
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-18
validated: 2026-06-18
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

> Reconciled 2026-06-18: actual test files (written via TDD during execution) live under
> `tests/unit-database/`, `tests/collection/`, and `tests/dashboard/` — not the predicted
> `tests/db/queries/` / `tests/features/` paths in the original draft. All green (60 tests).

| Task | Plan | Wave | Requirement | Test Type | Test File | Automated Command | File Exists | Status |
|------|------|------|-------------|-----------|-----------|-------------------|-------------|--------|
| Batch query `getUdbUnitsByIds` (positional params, missing-id tolerance) | 01 | 1 | PLAY-01 | unit | `tests/unit-database/unitDatabase.queries.test.ts` | `pnpm test -- tests/unit-database/unitDatabase.queries.test.ts` | ✅ | ✅ green (4) |
| Compare store cap-3 (`addToCompare`/`removeFromCompare`/`clearCompare`) | 01 | 1 | PLAY-01 | unit | `tests/unit-database/compareFilters.test.ts` | `pnpm test -- tests/unit-database/compareFilters.test.ts` | ✅ | ✅ green (9) |
| Compare page render + diff-highlight + empty state + row toggle | 02 | 2 | PLAY-01 | component | `tests/unit-database/UnitCompare.test.tsx` | `pnpm test -- tests/unit-database/UnitCompare.test.tsx` | ✅ | ✅ green (12) |
| `UdbUnitRow` render (name, points, role badge, onOpen) | 02 | 2 | PLAY-01 | component | `tests/unit-database/UdbUnitRow.test.tsx` | `pnpm test -- tests/unit-database/UdbUnitRow.test.tsx` | ✅ | ✅ green (5) |
| `getOwnedCountsByUdbUnitId` faction-agnostic (GROUP BY, no JOIN, no params) | 03 | 2 | PLAY-04 | unit | `tests/unit-database/udbOwnership.test.ts` | `pnpm test -- tests/unit-database/udbOwnership.test.ts` | ✅ | ✅ green (5) |
| Search owned badges from `ownershipAllMap` + Link to /collection | 03 | 2 | PLAY-04 | component | `tests/unit-database/UdbSearchResults.test.tsx` | `pnpm test -- tests/unit-database/UdbSearchResults.test.tsx` | ✅ | ✅ green (6) |
| `udbUnitIdFilter` clause (null no-op, match, compose) | 03 | 2 | PLAY-04 | unit | `tests/collection/applyUnitFilters.test.ts` | `pnpm test -- tests/collection/applyUnitFilters.test.ts` | ✅ | ✅ green (6) |
| `GoalProgressCard` render (active goals + empty-state link) | 04 | 2 | PLAY-05 | component | `tests/dashboard/GoalProgressCard.test.tsx` | `pnpm test -- tests/dashboard/GoalProgressCard.test.tsx` | ✅ | ✅ green (2) |
| Session→goal-progress invalidation symmetry lock | 04 | 2 | PLAY-05 | unit | `tests/dashboard/goalProgressInvalidation.test.ts` | `pnpm test -- tests/dashboard/goalProgressInvalidation.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements — COMPLETE

- [x] `getUdbUnitsByIds` (multi-id batch, positional placeholders, missing-id tolerance) — PLAY-01 → `tests/unit-database/unitDatabase.queries.test.ts`
- [x] Comparison render + diff-highlight + 3-unit cap — PLAY-01 → `tests/unit-database/UnitCompare.test.tsx` + `tests/unit-database/compareFilters.test.ts`
- [x] `getOwnedCountsByUdbUnitId` faction-agnostic GROUP BY — PLAY-04 → `tests/unit-database/udbOwnership.test.ts`
- [x] Active-goals render + empty-state link — PLAY-05 → `tests/dashboard/GoalProgressCard.test.tsx`
- [x] Invalidation-symmetry assertion: session mutations invalidate `["goal-progress"]` — PLAY-05 → `tests/dashboard/goalProgressInvalidation.test.ts`

*Resolved during execution: actual paths differ from the draft predictions (see Per-Task Map note).*

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-06-18 — all 9 automated requirement tests green (60 tests).

---

## Validation Audit 2026-06-18

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Outcome:** NYQUIST-COMPLIANT. Every requirement (PLAY-01, PLAY-04, PLAY-05) has automated
verification that runs green. No auditor spawn required — all tests were authored via TDD
during execution (commits c8750f16, f29c0d8f, addee424, 974aaaae). This audit only
reconciled the pre-execution draft's predicted test paths with the actual files on disk
and flipped the status/frontmatter to reflect green coverage. The 5 visual/interactive
items remain Manual-Only (jsdom cannot assert pixel-level diff highlight, cross-route
navigation render, or progress-bar fill) — these are tracked in `138-HUMAN-UAT.md`.
