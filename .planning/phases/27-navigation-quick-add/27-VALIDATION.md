---
phase: 27
slug: navigation-quick-add
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-05
validated: 2026-05-05
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/navigation/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/navigation/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-00-01 | 00 | 0 | NAV-01 | unit | `pnpm test -- tests/navigation/AppSidebar.nav01.test.tsx` | ✅ | ✅ green |
| 27-00-02 | 00 | 0 | NAV-02 | unit | `pnpm test -- tests/navigation/QuickAdd.nav02.test.tsx` | ✅ | ✅ green |
| 27-00-03 | 00 | 0 | NAV-03 | unit | `pnpm test -- tests/navigation/QuickAddContext.test.tsx` | ✅ | ✅ green |
| 27-01-01 | 01 | 1 | NAV-03 | unit | `pnpm test -- tests/navigation/QuickAddContext.test.tsx` | ✅ | ✅ green |
| 27-02-01 | 02 | 2 | NAV-01 | unit | `pnpm test -- tests/navigation/AppSidebar.nav01.test.tsx` | ✅ | ✅ green |
| 27-02-02 | 02 | 2 | NAV-02 | unit | `pnpm test -- tests/navigation/QuickAdd.nav02.test.tsx` | ✅ | ✅ green |
| 27-02-03 | 02 | 2 | NAV-03 | unit | `pnpm test -- tests/navigation/QuickAdd.nav02.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/navigation/AppSidebar.nav01.test.tsx` — 9 tests covering NAV-01 (group labels, old labels removed, membership)
- [x] `tests/navigation/QuickAdd.nav02.test.tsx` — 13 tests covering NAV-02 (button states, dropdown items, click triggers)
- [x] `tests/navigation/QuickAddContext.test.tsx` — 6 tests covering NAV-03 (provider state, openQuickAdd, closeQuickAdd, error boundary, action type)

*Existing `tests/theming/AppSidebar.test.tsx` and `tests/app-shell/AppSidebar.test.tsx` cover collapse toggle and SPEND-03; they do NOT cover new group labels or Quick Add button — new test files required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dropdown visually aligns to sidebar button | NAV-02 | Layout/visual positioning cannot be verified in jsdom | Open sidebar expanded + collapsed; verify dropdown appears right-aligned without clipping |
| Sheet opens as overlay without page navigation | NAV-03 | URL change detection unreliable in jsdom without router harness | Navigate to any non-collection page, click Quick Add > Add Unit — verify Sheet opens and URL stays unchanged |
| Collapsed sidebar Quick Add tooltip | NAV-02 | Tooltip rendering is async + portal-based | Collapse sidebar, hover Quick Add icon — verify "Quick Add" tooltip appears |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 8s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-05

---

## Validation Audit 2026-05-05

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 28 navigation tests pass green (9 NAV-01 + 13 NAV-02 + 6 NAV-03). Full suite: 502 passed, 2 skipped (unrelated JOUR-03 Wave 0 stubs).
