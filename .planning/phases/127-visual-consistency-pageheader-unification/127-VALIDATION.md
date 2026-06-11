---
phase: 127
slug: visual-consistency-pageheader-unification
status: complete
nyquist_compliant: true
wave_0_complete: true
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
| 127-01-01 | 01 | 1 | VIS-01, VIS-02 | — | N/A | unit | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx tests/visual-consistency/Phase127VisualConsistency.test.tsx` | Yes | ✅ green |
| 127-01-02 | 01 | 1 | VIS-03 | — | N/A | unit | `pnpm test -- tests/goals/GoalsPage.test.tsx` | Yes | ✅ green |
| 127-02-01 | 02 | 1 | VIS-03, VIS-04, VIS-09 | — | N/A | unit | `pnpm test -- tests/spending/SpendingPage.test.tsx` | Yes | ✅ green |
| 127-02-02 | 02 | 1 | VIS-05, VIS-08 | — | N/A | unit | `pnpm test -- tests/visual-consistency/Phase127VisualConsistency.test.tsx` | Yes | ✅ green |
| 127-03-01 | 03 | 1 | VIS-06 | — | N/A | unit | `pnpm test -- tests/painting/RecipeCard.test.tsx` | Yes | ✅ green |
| 127-03-02 | 03 | 1 | VIS-07 | — | N/A | unit | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | Yes | ✅ green |

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

**Approval:** approved

---

## Validation Audit 2026-06-11

| Metric | Count |
|--------|-------|
| Gaps found | 6 |
| Resolved | 6 |
| Escalated | 0 |

Tests added: 32 assertions across 6 test files (5 extended, 1 new). All use source-reading pattern (readFileSync) to verify CSS class changes since jsdom doesn't process Tailwind.
