---
phase: 10
slug: theming-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-02
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~12 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-00-01 | 00 | 0 | THEME-01, THEME-02 | unit | `npx vitest run tests/theming/useActiveFaction.test.ts` | ❌ W0 | ⬜ pending |
| 10-00-02 | 00 | 0 | THEME-03 | component | `npx vitest run tests/theming/FactionSummaryCard.test.tsx` | ❌ W0 | ⬜ pending |
| 10-00-03 | 00 | 0 | UI-01, UI-02 | component | `npx vitest run tests/theming/AppSidebar.test.tsx` | ❌ W0 | ⬜ pending |
| 10-00-04 | 00 | 0 | UI-03 | component | `npx vitest run tests/theming/NavItem.test.tsx` | ❌ W0 | ⬜ pending |
| 10-01-01 | 01 | 1 | THEME-01 | unit | `npx vitest run tests/theming/useActiveFaction.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | THEME-02 | unit | `npx vitest run tests/theming/useActiveFaction.test.ts -t "persistence"` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | THEME-03 | component | `npx vitest run tests/theming/FactionSummaryCard.test.tsx` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | UI-03 | component | `npx vitest run tests/theming/NavItem.test.tsx` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 3 | UI-01, UI-02, UI-03 | component | `npx vitest run tests/theming/AppSidebar.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/theming/useActiveFaction.test.ts` — unit tests: sync localStorage init, DOM setProperty call, persistence, deselect restores zinc default
- [ ] `tests/theming/FactionSummaryCard.test.tsx` — component tests: `isActive=true` renders ring + badge; `isActive=false` renders neither; `onActivate` called on click; keyboard Enter/Space activation
- [ ] `tests/theming/NavItem.test.tsx` — component tests: Tooltip rendered when `collapsed=true`, not rendered when `collapsed=false`, active link class applied when route matches
- [ ] `tests/theming/AppSidebar.test.tsx` — component test: collapse toggle button present, clicking changes `data-collapsed` attribute

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Accent color visually shifts on all pages when faction selected | THEME-01 | CSS custom property mutation cannot be tested in jsdom — `style.setProperty` is a no-op in test environment | Run `pnpm tauri dev`, select a faction on Dashboard, navigate to Collection, PaintingProjects, Paints — verify buttons and nav highlight shift color |
| Persisted accent survives Tauri app restart | THEME-02 | App restart cannot be simulated in Vitest | Select faction, quit app with `pnpm tauri dev`, relaunch — verify same accent color applied on startup |
| FactionSummaryCard deselect stays on Dashboard (no navigation) | THEME-03 | Router navigation cannot be verified in jsdom without full RouterProvider | Click active card — verify URL stays at `/`, accent returns to zinc |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 12s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
