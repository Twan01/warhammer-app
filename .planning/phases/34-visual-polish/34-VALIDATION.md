---
phase: 34
slug: visual-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/dashboard/DashboardPage.test.tsx tests/dashboard/FactionSummaryCard.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/dashboard/DashboardPage.test.tsx tests/dashboard/FactionSummaryCard.test.tsx`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-00-01 | 00 | 0 | VIS-01 | unit | `pnpm test -- tests/dashboard/FactionSummaryCard.test.tsx` | ❌ W0 | ⬜ pending |
| 34-00-02 | 00 | 0 | VIS-02 | unit | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ❌ W0 | ⬜ pending |
| 34-01-01 | 01 | 1 | VIS-01 | unit | `pnpm test -- tests/dashboard/FactionSummaryCard.test.tsx` | ❌ W0 | ⬜ pending |
| 34-01-02 | 01 | 1 | VIS-01 | unit (existing UI-08) | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ✅ | ⬜ pending |
| 34-01-03 | 01 | 1 | VIS-02 | unit | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ❌ W0 | ⬜ pending |
| 34-01-04 | 01 | 1 | VIS-03 | manual | Visual inspection in running app | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/dashboard/FactionSummaryCard.test.tsx` — stubs for VIS-01 (top band presence, card min-w-[220px], Star icon removed, activate button has aria-label, active state has ring-2 ring-faction-accent + bg-faction-accent/10)
- [ ] Add VIS-02 assertion to `tests/dashboard/DashboardPage.test.tsx` — hero wrapper div with radial gradient is present in populated state

*Existing infrastructure covers VIS-03 — CSS-only hover transitions are visually verified, not unit tested.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hover shadow transition visible | VIS-03 | CSS `:hover` pseudo-class not triggerable in JSDOM | Hover over any dashboard card in running app; verify shadow deepens smoothly |
| Radial gradient visible without obscuring text | VIS-02 | Visual appearance cannot be asserted via className alone | View dashboard with active faction; confirm subtle gradient behind hero area |
| Top color band visually clips to rounded corners | VIS-01 | Visual corner clipping is rendering-engine behavior | Inspect FactionCards in running app; confirm band follows rounded-xl corners |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
