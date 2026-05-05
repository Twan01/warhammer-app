---
phase: 27
slug: navigation-quick-add
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
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
| 27-00-01 | 00 | 0 | NAV-01 | unit | `pnpm test -- tests/navigation/AppSidebar.nav01.test.tsx` | ❌ W0 | ⬜ pending |
| 27-00-02 | 00 | 0 | NAV-02 | unit | `pnpm test -- tests/navigation/QuickAdd.nav02.test.tsx` | ❌ W0 | ⬜ pending |
| 27-00-03 | 00 | 0 | NAV-03 | unit | `pnpm test -- tests/navigation/QuickAddContext.test.tsx` | ❌ W0 | ⬜ pending |
| 27-01-01 | 01 | 1 | NAV-03 | unit | `pnpm test -- tests/navigation/QuickAddContext.test.tsx` | ❌ W0 | ⬜ pending |
| 27-02-01 | 02 | 2 | NAV-01 | unit | `pnpm test -- tests/navigation/AppSidebar.nav01.test.tsx` | ❌ W0 | ⬜ pending |
| 27-02-02 | 02 | 2 | NAV-02 | unit | `pnpm test -- tests/navigation/QuickAdd.nav02.test.tsx` | ❌ W0 | ⬜ pending |
| 27-02-03 | 02 | 2 | NAV-03 | unit | `pnpm test -- tests/navigation/QuickAdd.nav02.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/navigation/AppSidebar.nav01.test.tsx` — stubs for NAV-01 (group labels "Command", "Workshop", "Play", "Management"; no old labels remain; Factions in Management)
- [ ] `tests/navigation/QuickAdd.nav02.test.tsx` — stubs for NAV-02 (Quick Add button renders, dropdown has 8 items, collapsed icon-only, NAV-03 click triggers openQuickAdd)
- [ ] `tests/navigation/QuickAddContext.test.tsx` — stubs for NAV-03 (provider exposes openQuickAdd/closeQuickAdd/activeSheet, state transitions)

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
