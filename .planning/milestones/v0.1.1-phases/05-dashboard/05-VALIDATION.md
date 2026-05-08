---
phase: 5
slug: dashboard
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-01
audited: 2026-05-03
---

# Phase 5 — Validation Strategy

> Per-phase validation contract. All Wave 0 stubs filled and green.
> Phase shipped 2026-05-01. Audit confirmed compliant 2026-05-03.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react + jsdom |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run tests/dashboard/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds (dashboard suite: 43 tests) |

---

## Sampling Rate

Phase 5 is complete and shipped. Retroactive audit confirmed all automated tests green.

- **Dashboard suite:** `npx vitest run tests/dashboard/` — 43 tests, ~5s
- **Full suite:** 210 tests green (no regressions from Phase 5 tests)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | DASH-07 | unit | `npx vitest run tests/dashboard/useDashboardStats.test.ts` | ✅ exists | ✅ green |
| 05-01-02 | 01 | 1 | DASH-01,03,04 | unit | `npx vitest run tests/dashboard/computeStats.test.ts` | ✅ exists | ✅ green |
| 05-02-01 | 02 | 1 | DASH-01 | manual | build passes + visual inspect | Manual | ✅ verified |
| 05-02-02 | 02 | 1 | DASH-03,04 | manual | build passes + visual inspect | Manual | ✅ verified |
| 05-02-03 | 02 | 1 | DASH-05,06 | manual | build passes + visual inspect | Manual | ✅ verified |
| 05-03-01 | 03 | 2 | DASH-02 | manual | build passes + visual inspect | Manual | ✅ verified |
| 05-03-02 | 03 | 2 | DASH-08 | manual | build passes + visual inspect | Manual | ✅ verified |
| 05-03-03 | 03 | 2 | DASH-07 | unit | `npx vitest run tests/dashboard/useDashboardStats.test.ts` | ✅ exists | ✅ green |
| — | — | — | DASH-01..08 assembly | component | `npx vitest run tests/dashboard/DashboardPage.test.tsx` | ✅ exists | ✅ green |
| — | — | — | DASH-06 relativeTime | unit | `npx vitest run tests/dashboard/relativeTime.test.ts` | ✅ exists | ✅ green |

*Status: ✅ green · Manual — verified in human checkpoint*

---

## Wave 0 Requirements

- [x] `tests/dashboard/computeStats.test.ts` — DASH-01 totalModels/fullyPainted/battleReadyPoints/activeProjectsCount (5), DASH-02 factionStats (6), DASH-03 paintingPct (2), DASH-04 assemblyPct/basingPct (2), DASH-05 activeProjects (3), DASH-06 recentlyUpdated (3), DASH-08 empty state (2) — 23 tests green
- [x] `tests/dashboard/relativeTime.test.ts` — DASH-06 all 5 time ranges (minutes, hours, days, weeks, months) + SQLite datetime normalization — 14 tests green
- [x] `tests/dashboard/useDashboardStats.test.ts` — DASH-07 `DASHBOARD_STATS_KEY` constant contract (2 tests green)
- [x] `tests/dashboard/DashboardPage.test.tsx` — DASH-01..08 full page assembly, empty state, error state (3 tests green)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| Stat cards update after unit status change | DASH-01, DASH-07 | Live Tauri app + real SQLite mutation | ✅ Verified in 05-03 checkpoint |
| Faction card click navigates with filter | DASH-02 | Live router + Zustand state | ✅ Verified in 05-03 checkpoint |
| Unit row click opens detail Sheet | DASH-05, DASH-06 | Live Sheet component | ✅ Verified in 05-03 checkpoint |
| Empty state shown when no units | DASH-08 | Live app with empty DB | ✅ Verified in 05-03 checkpoint |
| Recently Updated shows correct order | DASH-06 | Time-sequenced DB mutations | ✅ Verified in 05-03 checkpoint |

---

## Validation Audit 2026-05-03

| Metric | Count |
|--------|-------|
| Requirements audited | DASH-01..08 (8 requirements) |
| Gaps found | 0 |
| Already green (automated) | 43 tests across 4 files |
| Already verified (manual-only) | 5 behaviors |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 all complete: 43 tests green across 4 test files
- [x] No watch-mode flags
- [x] Feedback latency < 10s (dashboard suite ~5s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** compliant 2026-05-03
