# Phase 132: Update Trustworthiness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-16
**Phase:** 132-update-trustworthiness
**Mode:** `--auto` (gray areas auto-selected; recommended option chosen for each)
**Areas discussed:** NSIS update verification, Auto-relaunch after install, frontend.log mechanism, Log size-cap & boot-failure capture

---

## NSIS update verification (REL-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Documented runbook + local two-build helper | Build N and N+1, sign both, serve local `latest.json`; capture launch/version/data/preflight evidence | ✓ |
| Fully automated CI test | Drive a real NSIS install in CI | |
| Manual one-off, no scripted helper | Hand-assemble the update each time | |

**Auto-selected:** Documented runbook + local two-build helper (recommended).
**Notes:** A real NSIS installer cannot run in jsdom/CI, so verification is an evidence-backed manual procedure (D-01/D-02), with a local-endpoint override that leaves `tauri.conf.json` unchanged (D-03).

---

## Auto-relaunch after install (REL-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-relaunch on install resolve + manual fallback | Call `relaunch()` automatically once `downloadAndInstall` resolves; brief "restarting…" state; manual button if it throws | ✓ |
| Keep manual "Restart now" only | Current behavior | |
| Countdown then auto-relaunch | Visible timer before restart | |

**Auto-selected:** Auto-relaunch on install resolve + manual fallback (recommended).
**Notes:** Removes the manual click REL-07 targets; preserves the no-window-on-update fix by relaunching only after install fully resolves (D-04/D-05/D-06).

---

## frontend.log mechanism (REL-08)

| Option | Description | Selected |
|--------|-------------|----------|
| New infallible Tauri command mirroring `preflight_log` | Reuse `resolve_app_data_dir` + `format_iso8601_now`; handlers call it best-effort | ✓ |
| Add `tauri-plugin-log` dependency | New plugin for file logging | |
| Write from JS via a generic FS plugin | Frontend writes the file directly | |

**Auto-selected:** New infallible Tauri command mirroring `preflight_log` (recommended).
**Notes:** No new dependency; keeps `frontend.log` and `preflight.log` side-by-side with one format; wired into `globalErrorHandlers` alongside `console.error` (D-07/D-08).

---

## Log size-cap & boot-failure capture (REL-08)

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed byte cap (~512KB) tail-trim + log boot failures | Single-file tail-trim on Rust side; also log DbHealthGate/boot failures | ✓ |
| Multi-file rotation (.1/.2) | Rotate logs across files | |
| Cap JS errors only | No boot-failure capture | |

**Auto-selected:** Fixed byte cap tail-trim + boot-failure logging (recommended).
**Notes:** Simplest bound that satisfies "size-capped"; the white-screen/no-render boot failure is the most important case to capture (D-09/D-10).

---

## Claude's Discretion

- Exact form of the local-update helper (script vs documented runbook).
- Precise size-cap value and tail-trim implementation; whether the same cap also applies to `preflight.log`.
- Transitional UI copy/duration for auto-relaunch.

## Deferred Ideas

- Theme-B honesty/de-cruft (Phases 133–135).
- Multi-file rotation / structured (JSON) log format / log upload.
- Cross-platform update verification (app is Windows-only).
