---
phase: 19
slug: analytics-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~3–5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-00-stubs | 00 | 0 | ANLY-04/05/06 | unit stubs | `pnpm test -- tests/analytics/computeHobbyAnalytics.test.ts` | ❌ Wave 0 | ⬜ pending |
| 19-00-stubs | 00 | 0 | ANLY-07 | unit stubs | `pnpm test -- tests/analytics/analyticsQueries.test.ts` | ❌ Wave 0 | ⬜ pending |
| 19-00-stubs | 00 | 0 | ANLY-04/05 | unit stubs | `pnpm test -- tests/analytics/useHobbyAnalytics.test.ts` | ❌ Wave 0 | ⬜ pending |
| 19-analytics-ts | 01 | 1 | ANLY-04/05/06 | unit | `pnpm test -- tests/analytics/computeHobbyAnalytics.test.ts` | ❌ Wave 0 | ⬜ pending |
| 19-analytics-ts | 01 | 1 | ANLY-07 | unit | `pnpm test -- tests/analytics/analyticsQueries.test.ts` | ❌ Wave 0 | ⬜ pending |
| 19-hook | 01 | 1 | ANLY-04/05 | unit | `pnpm test -- tests/analytics/useHobbyAnalytics.test.ts` | ❌ Wave 0 | ⬜ pending |
| 19-dashboard | 02 | 2 | ANLY-04/05 | manual smoke | Live Tauri app — HOBBY HEALTH section visible with correct values | N/A | ⬜ pending |
| 19-spending-chart | 02 | 2 | ANLY-06/07 | manual smoke | Live Tauri app — Monthly Trend chart visible between hero and breakdown | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/analytics/computeHobbyAnalytics.test.ts` — stubs for ANLY-04 (velocity: 0 sessions, single day, multi-month), ANLY-05 (streak: 0, active, gap), ANLY-06 (monthlyData: 12 entries, gaps filled, labels)
- [ ] `tests/analytics/analyticsQueries.test.ts` — stubs for ANLY-07 (mock verifying NULL purchase_date exclusion in SQL, HOBBY_ANALYTICS_KEY === `["hobby-analytics"]`)
- [ ] `tests/analytics/useHobbyAnalytics.test.ts` — cache key contract stub (mirrors `tests/spending/useSpendingStats.test.ts` pattern)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HOBBY HEALTH section renders in live Tauri app between Progress and By Faction sections | ANLY-04/05 | Tauri IPC + SQLite integration; no jsdom/Vitest coverage for live DB calls | Open app → Dashboard → confirm "HOBBY HEALTH" section label + velocity + streak cards visible |
| Velocity and streak values update when a new journal session is logged | ANLY-04/05 | Reactivity/invalidation test requires real Tauri runtime | Log session from UnitDetailSheet Journal tab → return to Dashboard → verify velocity/streak updated |
| Monthly Trend bar chart renders correctly with real spend data | ANLY-06/07 | Visual chart rendering requires real browser (no jsdom SVG) | Open Spending page → confirm bar chart section "Monthly Trend" appears between hero card and Breakdown |
| NULL purchase_date entries excluded from chart (not shown as Jan 1970) | ANLY-07 | Requires live DB with mix of NULL and non-NULL purchase_dates | Add unit with no purchase_date → check chart shows no "1970" bar |
| X-axis labels disambiguate years when window crosses calendar year | ANLY-06 | Visual label inspection only | If app has data spanning 2 years, confirm older months show year suffix (e.g. "Jan '25") |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
