---
phase: 132-update-trustworthiness
plan: "02"
subsystem: updater/auto-relaunch
tags: [rel-07, auto-relaunch, tauri-updater, windows-passive, tdd]
dependency_graph:
  requires: [132-01]
  provides: [auto-relaunch-on-install, explicit-windows-installMode]
  affects: [src/components/common/UpdateBanner.tsx, src-tauri/tauri.conf.json]
tech_stack:
  added: []
  patterns: [useEffect-keyed-on-status, relaunch-plus-toast-fallback]
key_files:
  created:
    - tests/error-resilience/UpdateBanner.test.tsx
  modified:
    - src/components/common/UpdateBanner.tsx
    - src-tauri/tauri.conf.json
decisions:
  - "Auto-relaunch implemented in UpdateBanner (component-owned UI decision) via useEffect keyed on status=installing, not in useAppUpdate hook"
  - "Manual Restart Now button and toast.error fallback kept — no dead end on relaunch failure (D-05)"
  - "installMode passive made explicit in tauri.conf.json; pubkey and endpoints untouched (D-03)"
metrics:
  duration: "12m"
  completed_date: "2026-06-16"
  tasks_completed: 2
  files_changed: 3
---

# Phase 132 Plan 02: Auto-Relaunch on Install (REL-07) Summary

**One-liner:** Explicit Windows `installMode: "passive"` in `tauri.conf.json` plus auto-firing `relaunch()` in `UpdateBanner` after `downloadAndInstall` resolves, with honest transitional copy and toast+button fallback on throw.

## What Was Built

### Task 1: Explicit installMode passive in tauri.conf.json (commit 8039d021)

Added `"windows": { "installMode": "passive" }` to the `plugins.updater` object in `src-tauri/tauri.conf.json`. This makes the NSIS `/R` restart behavior explicit — it was already the Tauri default, but making it explicit removes the assumption and ensures the Windows in-place installer performs the actual vN+1 relaunch. `pubkey` and `endpoints` were left byte-for-byte unchanged (D-03). Verified with `node -e` config parse check.

### Task 2: Auto-relaunch + test (commits 29664a35 / 8560df47)

**RED:** Created `tests/error-resilience/UpdateBanner.test.tsx` with 4 cases:
1. `relaunch()` called automatically on `status=installing` (no user click)
2. `toast.error` fires with exact fallback message + manual button stays when relaunch rejects (D-05)
3. Honest transitional copy present in installing branch
4. `relaunch()` NOT called on `status=downloading` (D-06 guard)

Tests 1 and 2 failed (RED confirmed), tests 3 and 4 passed.

**GREEN:** In `UpdateBanner.tsx`:
- Added `useEffect` import alongside `useState`
- Added `useEffect` keyed on `[status]` that fires `relaunch()` when `status === "installing"`, with `.catch(() => toast.error("Restart failed — please close and reopen the app."))` reusing the exact existing fallback message (D-05)
- Updated installing branch copy from "Update installed. Restart the app to apply v{version}." to honest "Update installed — restarting…" (D-05)
- Manual "Restart now" button preserved as fallback when auto-relaunch throws (D-05)

All 4 tests pass. `pnpm build` green.

## TDD Gate Compliance

- RED gate: commit `29664a35` — `test(132-02): add failing UpdateBanner auto-relaunch spec (RED)`
- GREEN gate: commit `8560df47` — `feat(132-02): auto-relaunch on update install + honest transitional state (REL-07)`

## Verification

- `node -e` config check: `plugins.updater.windows.installMode === "passive"` confirmed; pubkey + endpoints intact
- `git diff src-tauri/tauri.conf.json`: additions only, no edits to pubkey/endpoints lines
- `pnpm test -- tests/error-resilience/UpdateBanner.test.tsx`: 4/4 pass
- `pnpm build`: green (TypeScript, Vite)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The `relaunch()` call is a local Tauri plugin call (no network surface). `tauri.conf.json` additions are additive (explicit default only). No threat flags.

## Known Stubs

None.

## Self-Check: PASSED

- `src-tauri/tauri.conf.json` — modified (installMode passive)
- `src/components/common/UpdateBanner.tsx` — modified (auto-relaunch useEffect)
- `tests/error-resilience/UpdateBanner.test.tsx` — created (4 passing tests)
- Commits 8039d021, 29664a35, 8560df47 verified in git log
