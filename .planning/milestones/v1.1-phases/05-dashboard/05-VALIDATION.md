---
phase: 5
slug: dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (already configured — vite.config.ts) |
| **Config file** | `vitest.config.ts` or `vite.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | DASH-07 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | DASH-01,03,04 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | DASH-01 | manual | build passes + visual inspect | N/A | ⬜ pending |
| 05-02-02 | 02 | 1 | DASH-03,04 | manual | build passes + visual inspect | N/A | ⬜ pending |
| 05-02-03 | 02 | 1 | DASH-05,06 | manual | build passes + visual inspect | N/A | ⬜ pending |
| 05-03-01 | 03 | 2 | DASH-02 | manual | build passes + visual inspect | N/A | ⬜ pending |
| 05-03-02 | 03 | 2 | DASH-08 | manual | build passes + visual inspect | N/A | ⬜ pending |
| 05-03-03 | 03 | 2 | DASH-07 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/dashboard/computeStats.test.ts` — unit tests for `computeStats()` pure function covering: totalModels, fullyPainted, battleReadyPoints, activeProjectsCount, paintingPct, assemblyPct, basingPct, factionStats, activeProjects, recentlyUpdated, and the zero-state (empty units array)
- [ ] `tests/dashboard/relativeTime.test.ts` — unit tests for relative time formatter covering all 5 cases: minutes (<1h), hours (<24h), days (<7d), weeks (<4w), months (≥4w), plus the SQLite datetime string normalization (space→T+Z)

*Existing vitest infrastructure covers the rest — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stat cards update after unit status change | DASH-01, DASH-07 | Requires live Tauri app + real SQLite mutation | 1. Open dashboard. 2. Note "Fully Painted" count. 3. Navigate to Collection, change a unit to "Completed". 4. Return to Dashboard. 5. Verify count increased by 1. |
| Faction card click navigates with filter | DASH-02 | Requires live router + Zustand state | 1. Click a faction card on dashboard. 2. Verify Collection page opens with only that faction's units shown. |
| Unit row click opens detail Sheet | DASH-05, DASH-06 | Requires live Sheet component | 1. Click a unit row in Active Projects list. 2. Verify UnitDetailSheet slides open showing that unit's details. |
| Empty state shown when no units | DASH-08 | Requires live app with empty DB | 1. Delete all units. 2. Navigate to Dashboard. 3. Verify "Your collection is empty" + "Go to Collection" button shown. |
| Recently Updated shows correct order | DASH-06 | Requires time-sequenced DB mutations | 1. Update 6 units in sequence. 2. Dashboard should show last 5 by updated_at, most recent first. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
