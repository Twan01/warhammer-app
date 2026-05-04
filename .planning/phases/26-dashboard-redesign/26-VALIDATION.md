---
phase: 26
slug: dashboard-redesign
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/dashboard/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~8 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/dashboard/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 0 | DASH-06 | unit | `pnpm test -- tests/dashboard/computeRecentActivity.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 0 | DASH-06 | unit (mock) | `pnpm test -- tests/dashboard/recentActivityQuery.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 0 | DASH-04 | unit | `pnpm test -- tests/dashboard/computeStats.test.ts` | ✅ extend | ⬜ pending |
| 26-02-01 | 02 | 1 | DASH-04/06 | unit | `pnpm test -- tests/dashboard/` | ✅ after W0 | ⬜ pending |
| 26-02-02 | 02 | 1 | DASH-05 | unit | `pnpm test -- tests/dashboard/computeStats.test.ts` | ✅ existing | ⬜ pending |
| 26-03-01 | 03 | 2 | DASH-01–06 | manual + unit | `pnpm test` | ✅ after W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/dashboard/computeRecentActivity.test.ts` — stubs for DASH-06 (merge, sort, slice, 4 event types, session date normalization)
- [ ] `tests/dashboard/recentActivityQuery.test.ts` — stubs for `getRecentActivity()` SQL with mocked DB (mirrors `tests/hobby-journal/paintingSessionQueries.test.ts` pattern)
- [ ] `tests/dashboard/computeStats.test.ts` — extend existing file with 2–3 assertions covering new `units: Unit[]` field on `ComputedDashboardStats` (DASH-04 support)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PageHeader shows "Hobby Command Center" with correct dynamic subtitle | DASH-01 | Requires live Tauri app with SQLite data | Launch `pnpm tauri dev`, navigate to Dashboard, confirm subtitle shows correct counts |
| Quick Add button opens UnitSheet overlay | DASH-02 | Requires Tauri window + Radix Sheet portal | Click Quick Add, confirm UnitSheet opens without navigation |
| Log Session button opens LogSessionSheet with unit picker | DASH-02 | Requires Tauri window + form rendering | Click Log Session, confirm sheet opens, unit picker shows active projects first |
| CurrentFocusCard shows most recently updated active project | DASH-03 | Requires SQLite data with is_active_project=1 units | Confirm focus card shows correct unit with StatusBadge and next-action hint |
| HobbyPipeline shows all 11 stage counts accurately | DASH-04 | Requires populated SQLite data across multiple stages | Verify each stage bubble count matches collection page filter count |
| FactionSummaryCard shows painting % + battle-ready pts | DASH-05 | Requires Tauri window with faction data | Confirm all three values visible on each faction card |
| Recent Activity feed shows last 10 events chronologically | DASH-06 | Requires Tauri window with sessions + battles | Add a unit, log a session, log a battle; confirm they appear in feed in order |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
