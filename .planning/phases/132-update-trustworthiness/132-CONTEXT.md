# Phase 132: Update Trustworthiness - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning

> ⚙️ Captured in `--auto` mode: gray areas auto-selected, recommended option chosen for each.
> All decisions below are the recommended defaults — review before planning if you disagree.

<domain>
## Phase Boundary

This phase proves the **updater is trustworthy end-to-end** and makes a **broken launch diagnosable without devtools**. Phases 130–131 made the build refuse to ship on schema/version drift and put CI between every change and the updater; Phase 132 is where that infrastructure pays off — a real two-build NSIS update is performed, the app relaunches itself into the new version, and frontend failures land in a persistent on-disk log. **Theme A merges to `master` at the end of this phase.**

Three concrete deliverables (REL-06, REL-07, REL-08 — from ROADMAP success criteria):
1. **Verify** a real in-place NSIS update end-to-end with a local `latest.json` (two builds): the updated app launches, existing `%APPDATA%` data is preserved, and `preflight.log` records the repair/consistency outcome.
2. **Auto-relaunch** after an update downloads and installs — into the new version, with no manual restart.
3. **Persist frontend diagnostics** — frontend errors and failed-launch conditions are written to a persistent, size-capped `frontend.log` alongside the existing `preflight.log`.

**In scope:** the verification runbook + local-update helper tooling; making the post-install relaunch automatic (currently a manual "Restart now" click); a disk-backed, size-capped `frontend.log` fed by the global error handlers and boot-failure paths; the Theme A → `master` merge at phase end.

**Out of scope (own phases / already done):** the CI gate and version/migration parity gates (Phases 130–131, done); the checksum-repair logic itself (`repair_migration_checksums` already exists and is unit-tested); any Theme-B honesty/de-cruft work (Phases 133+).

</domain>

<decisions>
## Implementation Decisions

### NSIS in-place update verification (REL-06)
- **D-01:** Verification is a **documented, repeatable manual runbook** (a real NSIS installer can't run in jsdom/CI), backed by a **helper that produces a local two-build update**: build version N, build version N+1, sign both (minisign — the updater `pubkey` is already configured), and emit/serve a local `latest.json` pointing at the N+1 artifact. Prefer a small script (e.g. `scripts/make-local-update.*`) over hand-assembly so the procedure is reproducible. The planner/executor picks the exact form (mjs script vs documented commands) provided it yields a real installable `latest.json`.
- **D-02:** The verification **evidence** that must be captured (so REL-06 is provably met, not just claimed): (a) the updated app launches and reports version N+1, (b) pre-existing `%APPDATA%\com.hobbyforge.app` data (DB rows) survive the update, and (c) the `preflight.log` excerpt showing the repair/consistency outcome for the update. Record this evidence in the phase verification output.
- **D-03:** Temporarily pointing the updater at a **local** `latest.json` for the test must not corrupt the shipped config — use a local override (env/temporary endpoint or a throwaway build), and confirm the production endpoint in `tauri.conf.json` (`.../releases/latest/download/latest.json`) is unchanged afterward.

### Auto-relaunch after install (REL-07)
- **D-04:** Make the relaunch **automatic**: once `update.downloadAndInstall(...)` resolves (the `Finished`/installing state), call `relaunch()` **without** requiring the user to click. Today `UpdateBanner` only relaunches on a manual "Restart now" click — that manual step is exactly what REL-07 removes.
- **D-05:** Keep a **safety net**: show a brief, honest transitional state ("Update installed — restarting…") and, if `relaunch()` throws, fall back to the existing manual "Restart now" button + toast ("Restart failed — please close and reopen the app."). Auto-relaunch must never leave the user stuck with no path forward.
- **D-06:** **Preserve the no-window-on-update fix.** The relaunch path must not reintroduce the silent "no window after update" bug (root-caused to checksum drift, healed by `repair_migration_checksums`; covered by the `repair_heals_crlf_era_checksums` test). Relaunch only after install fully resolves so the next launch hits the repaired DB.

### Persistent frontend diagnostics log (REL-08)
- **D-07:** Add a **new infallible Tauri command** that mirrors the existing `preflight_log` rather than pulling in `tauri-plugin-log`. It writes timestamped lines to `app_data_dir/frontend.log`, **reusing `resolve_app_data_dir()` and `format_iso8601_now()`**, is best-effort/infallible (logging must never abort anything), and registers in the existing `generate_handler!` list. This keeps `frontend.log` and `preflight.log` side-by-side in the same `%APPDATA%\com.hobbyforge.app` dir with one consistent format.
- **D-08:** Wire the existing **`globalErrorHandlers`** (`handleGlobalError` / `handleUnhandledRejection`, set on `window.onerror` / `window.onunhandledrejection` in `main.tsx`) to invoke this command best-effort **in addition to** their current `console.error`. The console line stays for dev; the disk line is what makes a packaged failure diagnosable.
- **D-09:** **Capture failed-launch conditions, not just JS errors.** A white-screen / failed boot (e.g. the `DbHealthGate` failure path) must also write to `frontend.log`, since "diagnosable without devtools" is meaningless if the worst failure mode — the app never renders — leaves no trace.

### Log size-cap strategy (REL-08 "size-capped")
- **D-10:** Bound `frontend.log` with a **fixed byte cap (~512 KB) and tail-trim on the Rust side**: before/append, if the file exceeds the cap, retain the most recent portion (single-file tail-trim) — no multi-file rotation. Simplest bound that satisfies "size-capped" while keeping the newest, most relevant lines. The exact cap value is the executor's call within reason.

### Theme A merge
- **D-11:** **Theme A merges to `master` at the end of this phase** (per the ROADMAP sequencing law). The merge happens only after REL-06/07/08 are verified and CI is green — this is the gated payoff of Phases 130–132, not a mid-phase step.

### Claude's Discretion
- The exact form of the local-update helper (script vs documented runbook), the precise size-cap value and tail-trim implementation, the transitional UI copy/duration for auto-relaunch, and whether the same cap is also applied to `preflight.log` (cheap if so) are the planner/executor's call, provided the three success criteria and the evidence in D-02 hold.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 132: Update Trustworthiness" — goal + 3 success criteria (the authoritative acceptance bar) and the **Theme A → master merge** note.
- `.planning/REQUIREMENTS.md` — REL-06, REL-07, REL-08 (full requirement text); note the **Sequencing law**: Theme A merges to `master` at the end of this phase.
- `.planning/phases/131-ci-test-gate/131-CONTEXT.md` — prior phase; the CI gate that must be green before the Theme A merge.
- `.planning/phases/130-migration-parity-release-gate/130-CONTEXT.md` — the checksum/parity gate; explains why the repair path exists.

### Updater & relaunch
- `src-tauri/tauri.conf.json` — `plugins.updater` (`pubkey`, production `endpoints`), `bundle.createUpdaterArtifacts: true`; the config the local-`latest.json` test must temporarily override and then leave unchanged (D-03).
- `src/hooks/useAppUpdate.ts` — the `check()` / `downloadAndInstall()` state machine (`installing` is the post-install state to hook auto-relaunch onto).
- `src/components/common/UpdateBanner.tsx` — current manual "Restart now" → `relaunch()` (the manual step REL-07 removes); error/retry/installing UI to evolve.
- `src-tauri/src/lib.rs` — `tauri_plugin_updater` + `tauri_plugin_process` init; `repair_migration_checksums` + the `repair_heals_crlf_era_checksums` test (the no-window-on-update fix to preserve, D-06).

### Diagnostics logging
- `src-tauri/src/lib.rs` — `preflight_log()` (the pattern to mirror for `frontend.log`), `resolve_app_data_dir()`, `format_iso8601_now()`, and the `generate_handler!` command list (where the new command registers).
- `src/lib/globalErrorHandlers.ts` — `handleGlobalError` / `handleUnhandledRejection` to extend with a best-effort disk write (D-08).
- `src/main.tsx` — where the handlers are installed (`window.onerror` / `window.onunhandledrejection`).
- `src/components/common/DbHealthGate.tsx` — the boot-failure path that must also write to `frontend.log` (D-09).

No external ADRs/specs — requirements fully captured in the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src-tauri/src/lib.rs::preflight_log()` — exact template for `frontend.log`: best-effort, infallible, `app_data_dir`-anchored, timestamped, mirrors to stderr. The new command is essentially `preflight_log` pointed at `frontend.log` + a size-cap (D-07/D-10).
- `resolve_app_data_dir()` + `format_iso8601_now()` — already resolve `%APPDATA%\com.hobbyforge.app` and ISO timestamps; reuse verbatim so both logs share a dir and format.
- `relaunch` from `@tauri-apps/plugin-process` — already imported and used in `UpdateBanner`, `BackupCard`, `DataManagementTab`; the auto-relaunch reuses the same call, just triggered automatically.
- `src/lib/globalErrorHandlers.ts` — already centralizes uncaught-error + rejection handling (extracted for testability); the disk-write hook lands here, not in `main.tsx`.

### Established Patterns
- Diagnostics-to-disk because **stderr/stdout are invisible in a packaged GUI release** (stated in the `preflight_log` doc comment) — this is the whole rationale for `frontend.log`.
- Tauri commands are `#[tauri::command]` fns registered in one `generate_handler!` block (~10 commands today); the frontend-log command follows that pattern.
- Updater plugins (`updater` + `process`) are already wired in `lib.rs` and `package.json` (`@tauri-apps/plugin-updater ^2.10.1`, `plugin-process ^2.3.1`) — no new dependency needed for relaunch.

### Integration Points
- Frontend → Rust: `globalErrorHandlers` + `DbHealthGate` call the new `invoke('append_frontend_log', …)` best-effort.
- Updater flow: `useAppUpdate` `installing` state → auto `relaunch()` in `UpdateBanner` (with manual fallback).
- Release/verification: local `latest.json` + signed two-build artifacts exercise the real `tauri_plugin_updater` path against `tauri.conf.json`'s updater config.

</code_context>

<specifics>
## Specific Ideas

- "A broken launch is diagnosable without devtools" (ROADMAP goal) — the acid test for REL-08 is the **white-screen/no-render** case (D-09): if the app never mounts, `frontend.log` must still contain the boot failure. JS-error-only logging would miss the worst case.
- The existential driver of the whole milestone is the recurring "update breaks launch" bug (root-caused to migration checksum drift from unstable line endings). Phase 132 is the **proof** that the fix holds in a real update (REL-06) — capture the `preflight.log` repair line as evidence (D-02).
- Auto-relaunch must be honest and reversible: a visible "Updated — restarting…" state plus a manual fallback if `relaunch()` fails (D-05) — never a silent dead-end.

</specifics>

<deferred>
## Deferred Ideas

- Theme-B honesty/de-cruft work (remove fake sync/freshness UI, Shared Abilities tab, dead-end "Link unit", Factions/Data-Health consolidation) — Phases 133–135.
- Multi-file log rotation / structured (JSON) log format / log upload — not needed; a single tail-trimmed `frontend.log` satisfies "size-capped" (D-10).
- Applying the same size-cap to `preflight.log` — optional, cheap if folded in, but not required by REL-06/07/08.
- Cross-platform (macOS/Linux) update verification — the app is Windows-only; NSIS verification is Windows-specific by design.

None blocking — discussion stayed within the REL-06/07/08 boundary.

</deferred>

---

*Phase: 132-update-trustworthiness*
*Context gathered: 2026-06-16*
