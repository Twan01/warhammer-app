---
phase: 49
slug: section-read-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 49-01-01 | 01 | 1 | VIEW-01 | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | ❌ W0 | ⬜ pending |
| 49-01-02 | 01 | 1 | VIEW-02 | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | ❌ W0 | ⬜ pending |
| 49-01-03 | 01 | 1 | VIEW-03 | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | ❌ W0 | ⬜ pending |
| 49-01-04 | 01 | 1 | VIEW-04 | unit/regression | `pnpm test -- tests/painting/sectionedTimeline.test.tsx tests/painting/recipeDetailSheet.test.tsx` | ✅ (partial) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/painting/sectionedTimeline.test.tsx` — stubs for VIEW-01, VIEW-02, VIEW-03, VIEW-04
- [ ] Mock addition: `vi.mock("@/hooks/useRecipeSections")` in `tests/painting/recipeDetailSheet.test.tsx` returning `{ data: [] }` for flat fallback regression

*Existing infrastructure covers framework and config — only new test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual spacing between section headers and steps | VIEW-01 | CSS spacing not verifiable via unit tests | Open recipe with sections; confirm visual separation between sections |
| Section header information density readable | VIEW-02 | Readability is subjective | Open recipe with 3+ sections; confirm headers not cluttered |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
