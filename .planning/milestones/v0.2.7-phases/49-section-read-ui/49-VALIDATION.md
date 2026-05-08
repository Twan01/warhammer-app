---
phase: 49
slug: section-read-ui
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
---

# Phase 49 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vite.config.ts` (vitest inline config) |
| **Quick run command** | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/sectionedTimeline.test.tsx`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 49-01-01 | 01 | 1 | VIEW-01 | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | ✅ | ✅ green |
| 49-01-02 | 01 | 1 | VIEW-02 | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | ✅ | ✅ green |
| 49-01-03 | 01 | 1 | VIEW-03 | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | ✅ | ✅ green |
| 49-01-04 | 01 | 1 | VIEW-04 | unit/regression | `pnpm test -- tests/painting/sectionedTimeline.test.tsx tests/painting/recipeDetailSheet.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/painting/sectionedTimeline.test.tsx` — 13 tests for VIEW-01 through VIEW-04
- [x] Mock addition: `vi.mock("@/hooks/useRecipeSections")` in `tests/painting/recipeDetailSheet.test.tsx` returning `{ data: [], isLoading: false }` for flat fallback regression

*All Wave 0 requirements fulfilled during execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual spacing between section headers and steps | VIEW-01 | CSS spacing not verifiable via unit tests | Open recipe with sections; confirm visual separation between sections |
| Section header information density readable | VIEW-02 | Readability is subjective | Open recipe with 3+ sections; confirm headers not cluttered |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-08

---

## Validation Audit 2026-05-08

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 4 requirements (VIEW-01 through VIEW-04) have automated test coverage. 13 tests in `sectionedTimeline.test.tsx` + 31 regression tests in `recipeDetailSheet.test.tsx` — full suite 1,078 passing.
