---
phase: 11
slug: dashboard-command-center
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-03
completed: 2026-05-03
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.5 + @testing-library/react ^16.3.2 |
| **Config file** | `vitest.config.ts` (jsdom environment, globals:true) |
| **Quick run command** | `pnpm test -- --run tests/dashboard/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds (quick), ~30 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- --run tests/dashboard/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-00-01 | 00 | 0 | UI-07 | unit stub | `pnpm test -- --run tests/dashboard/useCountUp.test.ts` | ✅ | ✅ green |
| 11-01-01 | 01 | 1 | UI-07 | unit | `pnpm test -- --run tests/dashboard/useCountUp.test.ts` | ✅ | ✅ green |
| 11-01-02 | 01 | 1 | UI-07 | unit | `pnpm test -- --run tests/dashboard/useCountUp.test.ts` | ✅ | ✅ green |
| 11-01-03 | 01 | 1 | UI-07 | unit | `pnpm test -- --run tests/dashboard/useCountUp.test.ts` | ✅ | ✅ green |
| 11-02-01 | 02 | 2 | UI-07 | component | `pnpm test -- --run tests/dashboard/DashboardPage.test.tsx` | ✅ | ✅ green |
| 11-02-02 | 02 | 2 | UI-08 | component | `pnpm test -- --run tests/dashboard/DashboardPage.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/dashboard/useCountUp.test.ts` — stub file with `.skip` bodies for all 3 hook unit tests (UI-07)

*`tests/dashboard/DashboardPage.test.tsx` already exists — no new file needed for component tests (UI-07 integration + UI-08 ring class).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Counter animation visually animates from 0 → target at 600ms in live Tauri app | UI-07 | jsdom doesn't render visual frames; animation timing is visual | `pnpm tauri dev` → navigate to Dashboard → observe hero cards count up over ~600ms | ✅ PASS (2026-05-03) |
| Active FactionSummaryCard ring color matches selected faction accent | UI-08 | CSS custom property rendering requires real browser | `pnpm tauri dev` → click a faction card star → confirm ring color matches faction color | ✅ PASS (2026-05-03) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** SIGNED OFF 2026-05-03 — all 6 manual smoke-test steps PASS; 219 automated tests green

---

## Validation Audit 2026-05-03

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All requirements fully covered by automated tests. No auditor needed.
