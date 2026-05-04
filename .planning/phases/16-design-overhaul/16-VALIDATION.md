---
phase: 16
slug: design-overhaul
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 |
| **Config file** | `vite.config.ts` (vitest config inline) |
| **Quick run command** | `npx vitest run --reporter=verbose 2>&1 \| tail -20` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` (full suite ~20s — no subset needed)
- **After every plan wave:** Run `npx vitest run` — baseline must remain 279 passing
- **Before `/gsd:verify-work`:** Full suite green + manual visual review of all 7 pages

---

## Per-Task Verification Map

Phase 16 has no formal requirement IDs — the goal is "significantly improved visual design." Existing tests serve as regression guards; manual visual review is the primary quality gate.

| Behavior | Test Type | Automated Command | File Exists | Status |
|----------|-----------|-------------------|-------------|--------|
| NavItem active state uses `bg-faction-accent` | unit | `npx vitest run tests/theming/NavItem.test.tsx` | ✅ | ⬜ pending |
| AppSidebar collapse toggle works | unit | `npx vitest run tests/theming/AppSidebar.test.tsx` | ✅ | ⬜ pending |
| AppSidebar Spending nav entry renders | unit | `npx vitest run tests/app-shell/AppSidebar.test.tsx` | ✅ | ⬜ pending |
| DashboardPage renders without error | integration | `npx vitest run tests/dashboard/DashboardPage.test.tsx` | ✅ | ⬜ pending |
| UnitGallery renders card grid | unit | `npx vitest run tests/collection/UnitGallery.test.tsx` | ✅ | ⬜ pending |
| SpendingPage renders with stats | unit | `npx vitest run tests/spending/SpendingPage.test.tsx` | ✅ | ⬜ pending |
| Full regression suite baseline | integration | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No new test stubs required. Phase 16 is purely visual — no new logic, hooks, or data flows.

*Existing infrastructure covers all phase requirements. The 279 passing tests serve as regression guards.*

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Geist Sans renders across all pages | Font rendering is visual | Open app, navigate all 7 pages, verify Geist Sans applies |
| Page headings visually dominant | Typography hierarchy is visual | Check every page h1 is clearly larger than card titles |
| Sidebar wordmark renders correctly | Visual layout check | Confirm HobbyForge wordmark at top of sidebar (expanded mode) |
| Sidebar section groupings visible | Visual layout check | Confirm Manage / Inventory / Tracking sections are visually distinct |
| Empty states polished across all pages | Copy and icon review | Open each page with no data, verify headline + helper text |
| Dashboard welcome screen renders | First-run visual check | Confirm wordmark + CTA on empty Dashboard |
| tabular-nums applied to percentages and numbers | Visual alignment check | Open Collection + Spending, verify numbers align in columns |
| No regressions in drag-and-drop (Kanban) | Functional regression | Drag a card between Kanban columns; verify it works |
| UnitDetailSheet interior unchanged | Functional regression | Open a unit, verify all sheet tabs work correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (regression suite) or documented manual check
- [ ] Sampling continuity: full suite run after every plan wave
- [ ] Wave 0 note: no stubs needed — existing infrastructure sufficient
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s (full suite)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
