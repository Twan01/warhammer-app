---
phase: 127
slug: visual-consistency-pageheader-unification
status: draft
nyquist_compliant: true
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
| 127-01-01 | 01 | 1 | VIS-01, VIS-02 | — | N/A | source | `pnpm build && grep -c "PageHeader" src/features/rules-hub/RulesHubPage.tsx \| grep -v "^0$"` | N/A | ⬜ pending |
| 127-01-02 | 01 | 1 | VIS-03 | — | N/A | source | `pnpm build && grep -c "text-sm font-semibold uppercase tracking-widest" src/features/goals/GoalsPage.tsx \| grep -v "^0$"` | N/A | ⬜ pending |
| 127-02-01 | 02 | 1 | VIS-03, VIS-04, VIS-09 | — | N/A | source | `pnpm build && grep -c "max-w-3xl" src/features/spending/SpendingPage.tsx \| grep "^0$"` | N/A | ⬜ pending |
| 127-02-02 | 02 | 1 | VIS-05, VIS-08 | — | N/A | source | `pnpm build && grep -c "rounded-xl bg-muted/40 p-4" src/features/paints/PaintsPage.tsx \| grep -v "^0$" && grep -c "max-w-xs" src/features/factions/FactionsEmptyState.tsx \| grep -v "^0$"` | N/A | ⬜ pending |
| 127-03-01 | 03 | 1 | VIS-06 | — | N/A | source | `pnpm build && grep -c "backgroundColor" src/features/recipes/RecipeCard.tsx \| grep "^0$"` | N/A | ⬜ pending |
| 127-03-02 | 03 | 1 | VIS-07 | — | N/A | source | `pnpm build && grep -c "size={14}" src/features/dashboard/DashboardPage.tsx \| grep "^0$"` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. All VIS requirements are CSS/class changes verified by source assertions and build checks. No new test files needed.

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

- [x] All tasks have `<automated>` verify with source assertions
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
