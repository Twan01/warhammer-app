---
phase: 132
slug: update-trustworthiness
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-16
audited: 2026-06-17
---

# Phase 132 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom); `cargo test` for Rust |
| **Config file** | `vitest.config.ts` / `tests/setup.ts` (existing) |
| **Quick run command** | `pnpm test -- <file>` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~60–120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- <touched test file>`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green + `cargo test` green
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 132-02-01 | 02 | 1 | REL-07 | T-132-05/06 | `installMode: passive` explicit; pubkey/endpoints untouched | config | `node -e` updater-config assertion (plan verify) | ✅ | ✅ green |
| 132-02-02 | 02 | 1 | REL-07 | T-132-05/07 | Auto-relaunch after install resolve; manual fallback on throw; no relaunch while downloading | unit | `pnpm test -- tests/error-resilience/UpdateBanner.test.tsx` | ✅ | ✅ green |
| 132-01-02 | 01 | 1 | REL-08 | T-132-04 | `logFrontend` best-effort fire-and-forget; swallows rejection | unit | `pnpm test -- tests/error-resilience/frontendLog.test.ts` | ✅ | ✅ green |
| 132-01-03 | 01 | 1 | REL-08 | T-132-01 | Frontend errors written to frontend.log best-effort; boot-failure captured | unit | `pnpm test -- tests/error-resilience/globalErrorHandlers.test.ts tests/error-resilience/DbHealthGate.test.tsx` | ✅ | ✅ green |
| 132-01-01 | 01 | 1 | REL-08 | T-132-01/02 | `append_frontend_log` tail-trims at ~512KB cap, newest line retained, no-op on missing path | unit | `cd src-tauri && cargo test frontend_log` | ✅ | ✅ green |
| 132-03-03 | 03 | 2 | REL-06 | T-132-08/10 | Real two-build NSIS update launches into vN+1, data preserved, preflight.log repair line present | manual | see Manual-Only Verifications | n/a | ✅ verified live |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky.*

---

## Wave 0 Requirements

- [x] `tests/error-resilience/UpdateBanner.test.tsx` (NET-NEW) — auto-relaunch fires on install resolve + manual fallback on throw + no-relaunch-while-downloading (REL-07); mocks `@tauri-apps/plugin-process` `relaunch`. **Delivered Plan 02, 4/4 green.**
- [x] `tests/error-resilience/frontendLog.test.ts` (NET-NEW) + extended `tests/error-resilience/globalErrorHandlers.test.ts` & `tests/error-resilience/DbHealthGate.test.tsx` — handlers + boot-failure branch invoke the frontend-log wrapper best-effort (REL-08); mocks `@tauri-apps/api/core` `invoke`. **Delivered Plan 01, green.**
- [x] Rust unit test `frontend_log_tail_trims_over_cap` in `src-tauri/src/lib.rs` `#[cfg(test)]` — `tail_trim_if_oversized` at ~512KB cap, newest line retained, no-op on missing path (REL-08). **Delivered Plan 01, `cargo test frontend_log` green.**

*REL-06 is a manual runbook verification — no Wave 0 automated stub (cannot run a real NSIS installer in jsdom/CI). Verified live 0.5.8 → 0.5.9; evidence in `VERIFICATION.md`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real two-build in-place NSIS update | REL-06 | A real NSIS installer + signed updater artifact cannot run in jsdom/CI | Follow the REL-06 runbook (build vN → install → build vN+1 → serve local `latest.json` via `tauri build --config local-update.json` → trigger in-app update). Capture evidence: (a) app reports vN+1, (b) `%APPDATA%\com.hobbyforge.app` DB rows preserved, (c) `preflight.log` shows the repair/consistency line. Confirm `git diff --exit-code src-tauri/tauri.conf.json` is clean afterward. |
| Auto-relaunch into new version on Windows | REL-07 | Windows NSIS install auto-exits the app; the `/R` passive relaunch can only be observed in a real install | During the REL-06 runbook, confirm the app reopens into vN+1 with no manual click. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (REL-06 documented manual-only)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — 2026-06-17

---

## Validation Audit 2026-06-17

State A audit of the completed phase. All planned Wave 0 tests were delivered during
execution (Plans 01–02) and verified green at audit time; REL-06 verified live.

| Metric | Count |
|--------|-------|
| Requirements (REL-06/07/08) | 3 |
| Automated-covered (REL-07, REL-08) | 2 |
| Manual-only, verified live (REL-06) | 1 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Evidence at audit:**
- `pnpm test` → 2749 passed | 6 skipped | 38 todo (full suite green, includes all 4 error-resilience specs).
- `cd src-tauri && cargo test frontend_log` → 1 passed (`frontend_log_tail_trims_over_cap`).
- Source wiring confirmed: `logFrontend` imported + called in `globalErrorHandlers.ts` (2 sites) and `DbHealthGate.tsx` catch; `append_frontend_log` registered in `generate_handler!`.
- REL-06 verified live (0.5.8 → 0.5.9) with three evidence items captured in `VERIFICATION.md`; REL-07 update-loop bug found & fixed during verification (commit `6a1043f7`).

**Verdict:** Phase 132 is Nyquist-compliant. No gaps; no test generation required.
