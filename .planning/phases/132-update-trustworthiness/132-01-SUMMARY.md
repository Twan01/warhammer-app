---
phase: 132-update-trustworthiness
plan: "01"
subsystem: diagnostics
tags: [REL-08, logging, rust, frontend, error-handling]
dependency_graph:
  requires: []
  provides: [append_frontend_log-command, logFrontend-wrapper, frontend-log-disk-write]
  affects: [src-tauri/src/lib.rs, src/lib/globalErrorHandlers.ts, src/components/common/DbHealthGate.tsx]
tech_stack:
  added: []
  patterns: [infallible-disk-log, fire-and-forget-invoke, tail-trim-size-cap]
key_files:
  created:
    - src/lib/frontendLog.ts
    - tests/error-resilience/frontendLog.test.ts
  modified:
    - src-tauri/src/lib.rs
    - src/lib/globalErrorHandlers.ts
    - src/components/common/DbHealthGate.tsx
    - tests/error-resilience/globalErrorHandlers.test.ts
    - tests/error-resilience/DbHealthGate.test.tsx
decisions:
  - "D-07: New infallible append_frontend_log command clones preflight_log pattern, reuses resolve_app_data_dir + format_iso8601_now"
  - "D-08: globalErrorHandlers call logFrontend alongside console.error — both fire"
  - "D-09: DbHealthGate catch block calls logFrontend([boot-failure]) before setError/setState"
  - "D-10: 512KB cap via tail_trim_if_oversized — keeps newest half-cap, aligns to newline, atomic rename"
  - "V5: append_frontend_log takes only line: String — path is hard-coded to app_data_dir/frontend.log"
metrics:
  duration: "~35 minutes"
  completed: "2026-06-16"
  tasks_completed: 3
  files_modified: 7
requirements: [REL-08]
---

# Phase 132 Plan 01: Persistent Frontend Diagnostics Log Summary

Infallible `append_frontend_log` Tauri command (clone of `preflight_log`) + tail-trim cap + `logFrontend` JS wrapper wired into both global error handlers and the `DbHealthGate` boot-failure path, with Rust and Vitest test coverage.

## What Was Built

### Task 1: append_frontend_log Rust command + tail-trim + unit test
- Added `FRONTEND_LOG_CAP_BYTES: u64 = 512 * 1024` module-level const (D-10).
- Added `tail_trim_if_oversized(path, cap)`: reads file metadata, keeps newest ~half-cap bytes, aligns to next `\n` to avoid fragment lines, atomically renames temp file over original. Swallows every `Result` with `let _ =`.
- Added `#[tauri::command] fn append_frontend_log(line: String)` returning `()` (infallible): clones `preflight_log` pattern, targets `app_data_dir/frontend.log` (hard-coded path — V5), calls `tail_trim_if_oversized` before append, reuses `resolve_app_data_dir()` + `format_iso8601_now()`, mirrors to `eprintln!`.
- Registered `append_frontend_log` in the existing `generate_handler!` block (no ACL entry needed — custom commands are allowed by default).
- Added `#[test] fn frontend_log_tail_trims_over_cap` in `mod tests`: writes well over the cap, asserts file length <= cap after trim and newest sentinel line survives.
- `cargo test frontend_log` exits 0.

### Task 2: logFrontend wrapper + frontendLog.test.ts
- Created `src/lib/frontendLog.ts` exporting `function logFrontend(line: string): void` using `void invoke("append_frontend_log", { line }).catch(() => {})` — fire-and-forget, never throws.
- Created `tests/error-resilience/frontendLog.test.ts` with hoisted invoke mock: asserts call shape `("append_frontend_log", { line: "x" })`, asserts no-throw on rejected invoke, asserts returns void.
- `pnpm test -- tests/error-resilience/frontendLog.test.ts` exits 0.

### Task 3: Wire globalErrorHandlers (D-08) + DbHealthGate boot-failure (D-09)
- `globalErrorHandlers.ts`: imported `logFrontend`, added call in `handleGlobalError` (`[uncaught] msg @ source:line:col\nstack`) and `handleUnhandledRejection` (`[unhandledRejection] reason\nstack`). Existing `console.error` calls unchanged.
- `DbHealthGate.tsx`: imported `logFrontend`, added `logFrontend([boot-failure] DbHealthGate: ${msg})` at top of catch block before `setError`/`setState("failed")` (D-09).
- Extended `globalErrorHandlers.test.ts`: added `vi.mock("@/lib/frontendLog")`, `beforeEach` clearAllMocks, two new tests asserting both handlers call `logFrontend` with correct prefix + message.
- Extended `DbHealthGate.test.tsx`: added `vi.mock("@/lib/frontendLog")`, new test asserting boot-failure path calls `logFrontend` with `[boot-failure]` line containing the error message.
- `pnpm test` passes (2745 tests). `pnpm build` green (strict TS, no unused imports).
- `git diff --exit-code src-tauri/tauri.conf.json` is clean — production config unchanged.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | 1f4e4e1d | feat(132-01): add append_frontend_log Rust command + tail-trim + unit test |
| 2 | e5f7de12 | feat(132-01): add logFrontend wrapper + frontendLog.test.ts |
| 3 | fd10270c | feat(132-01): wire logFrontend into globalErrorHandlers (D-08) + DbHealthGate (D-09) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed overly strict "oldest line absent" assertion in Rust unit test**
- **Found during:** Task 1 verification (`cargo test frontend_log`)
- **Issue:** The test asserted `!trimmed_str.starts_with(first_old)` — but after the tail-trim keeps the newest ~half-cap, it's possible that the trimmed portion still starts with content identical to an old filler line (since all old lines are the same string). The assertion was wrong; the test failed.
- **Fix:** Replaced the assertion with `trimmed_str.len() < content.len() / 2` — verifying that the retained content is much smaller than the original, which proves trimming occurred. The "newest line survives" assertion remains.
- **Files modified:** src-tauri/src/lib.rs (test only)
- **Commit:** 1f4e4e1d

## Known Stubs

None — all wiring is live.

## Threat Flags

No new trust boundaries beyond what the plan's threat model covered. The `append_frontend_log` command takes only `line: String` with a hard-coded path — no traversal surface. The `logFrontend` wrapper swallows all errors.

## Self-Check: PASSED

- src/lib/frontendLog.ts: FOUND
- tests/error-resilience/frontendLog.test.ts: FOUND
- Commit 1f4e4e1d: FOUND
- Commit e5f7de12: FOUND
- Commit fd10270c: FOUND
