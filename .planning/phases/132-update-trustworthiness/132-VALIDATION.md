---
phase: 132
slug: update-trustworthiness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-16
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
| 132-XX-XX | XX | 1 | REL-07 | — | Auto-relaunch after install resolve; manual fallback on throw | unit | `pnpm test -- tests/common/UpdateBanner.test.tsx` | ❌ W0 | ⬜ pending |
| 132-XX-XX | XX | 1 | REL-08 | — | Frontend errors written to frontend.log best-effort; boot-failure captured | unit | `pnpm test -- tests/lib/globalErrorHandlers.test.ts` | ❌ W0 | ⬜ pending |
| 132-XX-XX | XX | 1 | REL-08 | — | append_frontend_log tail-trims at size cap | unit | `cargo test` (Rust, in `src-tauri`) | ❌ W0 | ⬜ pending |
| 132-XX-XX | XX | 2 | REL-06 | — | Real two-build NSIS update launches into vN+1, data preserved, preflight.log repair line present | manual | see Manual-Only Verifications | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · final Task IDs assigned by planner.*

---

## Wave 0 Requirements

- [ ] `tests/common/UpdateBanner.test.tsx` — assert auto-relaunch fires on install resolve + manual fallback on throw (REL-07); mock `@tauri-apps/plugin-process` `relaunch` (pattern: `tests/settings/DataManagementTab.test.tsx`).
- [ ] `tests/lib/globalErrorHandlers.test.ts` — assert handlers invoke the frontend-log wrapper best-effort (REL-08); mock `@tauri-apps/api/core` `invoke`.
- [ ] Rust unit test in `src-tauri/src/lib.rs` `#[cfg(test)]` — `append_frontend_log` tail-trim at ~512KB cap (REL-08).

*REL-06 is a manual runbook verification — no Wave 0 automated stub (cannot run a real NSIS installer in jsdom/CI).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real two-build in-place NSIS update | REL-06 | A real NSIS installer + signed updater artifact cannot run in jsdom/CI | Follow the REL-06 runbook (build vN → install → build vN+1 → serve local `latest.json` via `tauri build --config local-update.json` → trigger in-app update). Capture evidence: (a) app reports vN+1, (b) `%APPDATA%\com.hobbyforge.app` DB rows preserved, (c) `preflight.log` shows the repair/consistency line. Confirm `git diff --exit-code src-tauri/tauri.conf.json` is clean afterward. |
| Auto-relaunch into new version on Windows | REL-07 | Windows NSIS install auto-exits the app; the `/R` passive relaunch can only be observed in a real install | During the REL-06 runbook, confirm the app reopens into vN+1 with no manual click. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (REL-06 documented manual-only)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
