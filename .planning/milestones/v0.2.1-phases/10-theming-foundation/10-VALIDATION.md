---
phase: 10
slug: theming-foundation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-02
completed: 2026-05-03
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.5 + @testing-library/react ^16.3.2 |
| **Config file** | `vitest.config.ts` (jsdom environment, globals:true) |
| **Quick run command** | `pnpm test -- --run tests/theming/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- --run tests/theming/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-00-01 | 00 | 0 | THEME-01, THEME-02 | unit stub | `pnpm test -- --run tests/theming/useActiveFaction.test.tsx` | ✅ | ✅ green |
| 10-00-02 | 00 | 0 | THEME-03 | component stub | `pnpm test -- --run tests/theming/FactionSummaryCard.test.tsx` | ✅ | ✅ green |
| 10-00-03 | 00 | 0 | UI-01, UI-02 | component stub | `pnpm test -- --run tests/theming/AppSidebar.test.tsx` | ✅ | ✅ green |
| 10-00-04 | 00 | 0 | UI-03 | component stub | `pnpm test -- --run tests/theming/NavItem.test.tsx` | ✅ | ✅ green |
| 10-01-01 | 01 | 1 | THEME-01 | unit | `pnpm test -- --run tests/theming/useActiveFaction.test.tsx` | ✅ | ✅ green |
| 10-01-02 | 01 | 1 | THEME-02 | unit | `pnpm test -- --run tests/theming/useActiveFaction.test.tsx` | ✅ | ✅ green |
| 10-02-01 | 02 | 2 | THEME-03 | component | `pnpm test -- --run tests/theming/FactionSummaryCard.test.tsx` | ✅ | ✅ green |
| 10-02-02 | 02 | 2 | UI-03 | component | `pnpm test -- --run tests/theming/NavItem.test.tsx` | ✅ | ✅ green |
| 10-03-01 | 03 | 3 | UI-01, UI-02 | component | `pnpm test -- --run tests/theming/AppSidebar.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Note: Task 10-00-01 test file renamed from `.ts` → `.tsx` during Plan 10-01 (JSX in wrapper requires tsx extension — Rule 1 auto-fix).*

---

## Wave 0 Requirements

- [x] `tests/theming/useActiveFaction.test.tsx` — 6 real tests covering THEME-01 (DOM mutation) + THEME-02 (localStorage persistence)
- [x] `tests/theming/FactionSummaryCard.test.tsx` — 5 real tests covering THEME-03 (isActive ring + badge, click, keyboard)
- [x] `tests/theming/NavItem.test.tsx` — 3 real tests covering UI-03 (tooltip-when-collapsed) + THEME-01 nav active class
- [x] `tests/theming/AppSidebar.test.tsx` — 2 real tests covering UI-01 + UI-02 (collapse toggle, default state)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Accent color visually shifts on all pages when faction selected | THEME-01 | CSS custom property mutation cannot be tested in jsdom — `style.setProperty` is a no-op in test environment | Run `pnpm tauri dev`, select a faction on Dashboard, navigate to Collection, PaintingProjects, Paints — verify buttons and nav highlight shift color | ⬜ PENDING |
| Persisted accent survives Tauri app restart | THEME-02 | App restart cannot be simulated in Vitest | Select faction, quit app with `pnpm tauri dev`, relaunch — verify same accent color applied on startup | ⬜ PENDING |
| FactionSummaryCard deselect stays on Dashboard (no navigation) | THEME-03 | Router navigation cannot be verified in jsdom without full RouterProvider | Click active card — verify URL stays at `/`, accent returns to zinc | ⬜ PENDING |
| Sidebar collapses to icon-only mode via toggle | UI-01 | Visual collapse requires real layout rendering | Run `pnpm tauri dev`, click sidebar collapse button — verify nav items collapse to icons only | ⬜ PENDING |
| Sidebar collapsed state persists after app restart | UI-02 | App restart cannot be simulated in Vitest | Collapse sidebar, quit, relaunch — verify sidebar stays collapsed | ⬜ PENDING |
| Collapsed sidebar icons show tooltip on hover | UI-03 | Radix Tooltip portal requires real browser | Collapse sidebar, hover over a nav icon — verify tooltip with nav label appears | ⬜ PENDING |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** SIGNED OFF 2026-05-03 — all 9 automated task tests green (219 total passing); 6 manual smoke-test steps pending Phase 10 VERIFICATION

---

## Validation Audit 2026-05-03

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 9 tasks fully covered by automated tests. VALIDATION.md updated from initial draft state (all pending) to reflect actual execution outcome. Test file renamed: `useActiveFaction.test.ts` → `useActiveFaction.test.tsx` (Plan 10-01 Rule 1 auto-fix). AppSidebar stubs trimmed from 3 to 2 real tests (Plan 10-03 Rule 1: localStorage persistence belongs in hook contract, not component test).
