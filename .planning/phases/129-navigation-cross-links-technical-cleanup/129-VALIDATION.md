---
phase: 129
slug: navigation-cross-links-technical-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-11
---

# Phase 129 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `vitest.config.ts` |
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 129-01-01 | 01 | 1 | NAV-01 | manual | Visual: painting mode returns to originating page | ⬜ pending |
| 129-01-02 | 01 | 1 | NAV-11 | manual | Visual: Escape hint visible in StepFocalView | ⬜ pending |
| 129-02-01 | 02 | 1 | NAV-02 | manual | Visual: "View Datasheet" link in UnitDetailSheet | ⬜ pending |
| 129-02-02 | 02 | 1 | NAV-03 | manual | Visual: cross-links between Rules Hub and Unit DB | ⬜ pending |
| 129-02-03 | 02 | 1 | NAV-06 | manual | Visual: Battle Log rows link to army lists | ⬜ pending |
| 129-03-01 | 03 | 1 | NAV-07 | unit | `pnpm build` (no dead imports) | ⬜ pending |
| 129-03-02 | 03 | 1 | NAV-08 | unit | `pnpm build` (memo export type) | ⬜ pending |
| 129-03-03 | 03 | 1 | NAV-09 | unit | `pnpm build` (reducer extracted) | ⬜ pending |
| 129-04-01 | 04 | 2 | NAV-04 | manual | Visual: Game Day sidebar highlight | ⬜ pending |
| 129-04-02 | 04 | 2 | NAV-05 | manual | Visual: collapsed sidebar dividers | ⬜ pending |
| 129-04-03 | 04 | 2 | NAV-10 | manual | Visual: sidebar collapse transition | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or fixtures needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Painting Mode returns to originator | NAV-01 | Requires multi-page navigation | Enter PM from Collection, exit, verify return to Collection |
| Cross-links visible | NAV-02, NAV-03, NAV-06 | Visual link placement | Check sheets/pages for link presence |
| Sidebar highlight | NAV-04 | Route state dependent | Navigate to Game Day, check sidebar |
| Sidebar dividers | NAV-05 | Visual CSS | Collapse sidebar, check dividers |
| Sidebar transition | NAV-10 | CSS animation | Toggle collapse, observe smoothness |
| Escape hint | NAV-11 | Visual text placement | Enter PM, check footer text |

---

## Validation Sign-Off

- [ ] All tasks have automated or manual verification mapped
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
