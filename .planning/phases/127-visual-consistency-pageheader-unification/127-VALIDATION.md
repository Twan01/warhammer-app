---
phase: 127
slug: visual-consistency-pageheader-unification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-11
---

# Phase 127 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 127-01-01 | 01 | 1 | VIS-01 | — | N/A | manual | Visual inspection | N/A | ⬜ pending |
| 127-01-02 | 01 | 1 | VIS-02 | — | N/A | manual | Visual inspection | N/A | ⬜ pending |
| 127-01-03 | 01 | 1 | VIS-03 | — | N/A | manual | Visual inspection | N/A | ⬜ pending |
| 127-02-01 | 02 | 1 | VIS-04 | — | N/A | manual | Visual inspection | N/A | ⬜ pending |
| 127-02-02 | 02 | 1 | VIS-05 | — | N/A | manual | Visual inspection | N/A | ⬜ pending |
| 127-02-03 | 02 | 1 | VIS-06 | — | N/A | source | `grep -c "backgroundColor" src/features/recipes/RecipeCard.tsx` returns 0 | N/A | ⬜ pending |
| 127-02-04 | 02 | 1 | VIS-07 | — | N/A | source | `grep "size={14}" src/features/dashboard/DashboardPage.tsx` returns 0 | N/A | ⬜ pending |
| 127-02-05 | 02 | 1 | VIS-08 | — | N/A | source | `grep "max-w-xs" src/features/factions/FactionsEmptyState.tsx` returns match | N/A | ⬜ pending |
| 127-02-06 | 02 | 1 | VIS-09 | — | N/A | source | `grep "flex flex-col gap-6" src/features/data-health/DataHealthPage.tsx` returns match | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. All VIS requirements are CSS/class changes verified by source assertions and visual inspection. No new test files needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PageHeader renders on Rules Hub with border-b and subtitle | VIS-01 | Visual layout — no unit test for CSS rendering | Open Rules Hub page, verify header matches other pages |
| PageHeader renders on Unit Database with border-b and subtitle | VIS-01 | Visual layout | Open Unit Database page, verify header |
| Factions PageHeader has subtitle | VIS-02 | Visual layout | Open Factions page, verify subtitle text |
| Section headings match across Dashboard, Goals, Spending, Data Health | VIS-03 | Visual consistency across pages | Compare heading styles on all 4 pages |
| Spending page spacing matches other pages | VIS-04 | Visual layout | Compare Spending page padding with Dashboard |
| Paints filtered empty state shows icon-pill | VIS-05 | Visual layout | Filter paints to show empty state, compare with Factions empty state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
