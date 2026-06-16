# Phase 132: Update Trustworthiness - Research

**Researched:** 2026-06-16
**Domain:** Tauri 2 desktop updater (NSIS in-place update + auto-relaunch) + on-disk frontend diagnostics logging
**Confidence:** HIGH (mechanisms verified against official Tauri v2 docs + grounded in existing project code)

## Summary

Phase 132 proves the HobbyForge updater is trustworthy end-to-end and makes a broken launch diagnosable without devtools. All three deliverables sit on top of infrastructure that already exists in the codebase: `preflight_log()` is the exact template for `frontend.log` (REL-08), the `updater`/`process` plugins are already wired (REL-07), and `repair_migration_checksums()` already heals the update-breaks-launch bug (REL-06 verifies the heal holds).

The single most important technical finding drives REL-07: **on Windows, `update.downloadAndInstall()` automatically exits the application during the install step** (documented Windows-installer limitation). The NSIS installer then relaunches the app itself when built with `installMode: "passive"` (the `/R` restart flag). This means the literal change for REL-07 is small — call `relaunch()` automatically after `downloadAndInstall` resolves instead of behind a manual button — but the *real* mechanism that lands the user in the new version on Windows is the NSIS `installMode`, not the JS `relaunch()` call. The `relaunch()` call is the cross-platform-correct safety net and the post-resolve code path; on Windows it is frequently a no-op because the process is already gone. The plan must set `installMode: "passive"` (today the updater config has no `windows` block, so it defaults to passive — but this should be made explicit) and keep a manual-fallback button for the case where the auto-exit/relaunch does not fire.

For REL-06, verification is inherently manual (a real NSIS installer cannot run in jsdom/CI). The cleanest, config-safe mechanism — satisfying D-03's "production endpoint unchanged afterward" constraint — is **`tauri build --config <override.json>`**, which deep-merges a throwaway override (local `http://localhost:PORT/latest.json` endpoint + `dangerousInsecureTransportProtocol: true`) on top of the committed `tauri.conf.json` without ever editing it. A helper script builds vN and vN+1, signs both with `TAURI_SIGNING_PRIVATE_KEY`, assembles `latest.json` from the `.sig` file contents, and serves the bundle directory locally. **Open question / runbook blocker:** the private key matching the committed `pubkey` lives only as a GitHub Actions secret (`secrets.TAURI_SIGNING_PRIVATE_KEY`) — the runbook must state whether the developer has a local copy; if not, the local test must use a freshly generated throwaway keypair (override the `pubkey` in the same `--config` file).

**Primary recommendation:** (1) REL-08 — add an infallible `append_frontend_log` Tauri command cloned from `preflight_log` + a byte-cap tail-trim; wire `globalErrorHandlers` and `DbHealthGate` to best-effort `invoke()` it. No ACL/capability entry needed (custom project commands are allowed by default). (2) REL-07 — auto-call `relaunch()` after `downloadAndInstall` resolves, set `installMode: "passive"` explicitly, keep the manual button as fallback. (3) REL-06 — ship a `--config`-override helper + a documented checklist that captures the three evidence artifacts (version N+1, surviving DB rows, `preflight.log` repair line).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| NSIS install + app exit/restart | OS / NSIS installer | Rust (updater plugin) | The Windows installer owns process replacement + `/R` relaunch; JS only triggers the download/install |
| `relaunch()` after install | Frontend (UpdateBanner) | Rust (process plugin) | JS owns the post-resolve decision to restart; on Windows the installer usually pre-empts it |
| Migration checksum repair | Rust (preflight, before Tauri builder) | — | Must run before tauri-plugin-sql migrator opens the DB (panic-before-window risk) |
| `frontend.log` disk write | Rust (`#[tauri::command]`) | Frontend (invoke caller) | Disk write must be infallible + outside the sandbox; JS provides the message, Rust owns the file |
| Failed-launch capture | Frontend (DbHealthGate failure path) | Rust (log command) | The white-screen case originates in React boot; it invokes the Rust log command |
| Updater check / download state machine | Frontend (`useAppUpdate`) | Rust (updater plugin) | UI state lives in React; the plugin performs the network + crypto |

## Standard Stack

Everything REL-06/07/08 needs is **already installed**. No new dependency is required (and `tauri-plugin-log` is explicitly out of scope per REQUIREMENTS.md "Out of Scope" + D-07).

### Core (already present — versions verified from Cargo.toml / package.json)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tauri-plugin-updater` (Rust) | 2.10.1 | Update check + signed NSIS download/install | Official Tauri updater [CITED: v2.tauri.app/plugin/updater] |
| `@tauri-apps/plugin-updater` (JS) | ^2.10.1 | `check()` / `downloadAndInstall()` JS API | Frontend half of the updater |
| `tauri-plugin-process` (Rust) | 2.3.1 | Process control for `relaunch()` | Official; already wired in `lib.rs` |
| `@tauri-apps/plugin-process` (JS) | ^2.3.1 | `relaunch()` JS API | Already imported in `UpdateBanner.tsx` |
| `@tauri-apps/api/core` `invoke` | ^2.0.0 | Call the new `append_frontend_log` command | Already used across the app (`DbHealthGate` uses it) |
| `std::fs` (Rust std) | — | Append + size-cap the log file | `preflight_log` already uses `OpenOptions::append` |

### Supporting (build/verification tooling for REL-06)
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `tauri signer generate` | bundled in `@tauri-apps/cli` ^2.0.0 | Generate a throwaway minisign keypair for local testing | Only if the production private key is not available locally |
| `tauri build --config <file>` | bundled in CLI | Deep-merge a local-updater override without touching `tauri.conf.json` | REL-06 local two-build test (satisfies D-03) |
| a static file server | e.g. `npx serve` or a tiny Node/PS one-liner | Serve `latest.json` + the N+1 `.exe` over `http://localhost:PORT` | REL-06 local endpoint |

> Note on `npx serve`: this auto-downloads an unpinned package. Prefer a committed tiny static-server script (`scripts/serve-local-update.mjs` using Node's built-in `http`) over `npx serve` to avoid pulling an unverified package at verification time. The executor may also use `python -m http.server` if Python is available.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `append_frontend_log` command (D-07) | `tauri-plugin-log` | Rejected by D-07 + REQUIREMENTS "Out of Scope": adds a dependency for a single-user tool; the hand-rolled FS write already exists as `preflight_log` |
| `tauri build --config override.json` (D-03) | Edit `tauri.conf.json` then revert | Rejected: editing the committed config risks leaving a local endpoint or throwaway pubkey behind — exactly what D-03 forbids. `--config` deep-merges and never mutates the file. |
| Local HTTP + `dangerousInsecureTransportProtocol` | Host on a real HTTPS endpoint / GitHub pre-release | More setup; the local HTTP override is the documented local-test path [CITED: zenn.dev/monkuma local-update guide] |

**Installation:** None required — all runtime packages are present. Verify with:
```bash
# already in Cargo.toml: tauri-plugin-updater 2.10.1, tauri-plugin-process 2.3.1
# already in package.json: @tauri-apps/plugin-updater ^2.10.1, @tauri-apps/plugin-process ^2.3.1
```

## Package Legitimacy Audit

> No external packages are installed in this phase. All runtime dependencies (updater, process, api/core) are already present and were vetted in prior phases. The only *new* tooling is build-time CLI usage (`tauri signer`, `tauri build --config`) from the already-installed `@tauri-apps/cli`, plus an optional local static server.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@tauri-apps/plugin-updater` | npm | mature (2.x) | high | github.com/tauri-apps/plugins-workspace | n/a (already installed) | Approved (pre-existing) |
| `@tauri-apps/plugin-process` | npm | mature (2.x) | high | github.com/tauri-apps/plugins-workspace | n/a (already installed) | Approved (pre-existing) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none — but DO NOT introduce `npx serve` at verification time; use a committed Node `http` server script or `python -m http.server` instead.

## Architecture Patterns

### System Architecture Diagram

```
REL-08  frontend.log write path
────────────────────────────────────────────────────────────────
 window.onerror / onunhandledrejection ─┐
 (globalErrorHandlers.ts)               │
 DbHealthGate "failed" state ───────────┤── best-effort ──> invoke("append_frontend_log", {line})
 (white-screen / no-render case)        │   (.catch(()=>{}))         │
                                         │                            ▼
                                         │              #[tauri::command] append_frontend_log
                                         │              ├─ resolve_app_data_dir()      (reuse)
                                         │              ├─ format_iso8601_now()        (reuse)
                                         │              ├─ size-cap: if file > CAP, tail-trim
                                         │              └─ OpenOptions::append -> %APPDATA%\com.hobbyforge.app\frontend.log
                                         └─ console.error (kept for dev)


REL-07  update + auto-relaunch path (Windows NSIS)
────────────────────────────────────────────────────────────────
 useAppUpdate.check() ──> Update available ──> installUpdate()
        │
        ▼
 update.downloadAndInstall(onEvent)
   Started ─> Progress ─> Finished(installing)
        │
        ▼
 [WINDOWS] install step runs ─> app process AUTO-EXITS  ◄── documented Windows limitation
        │                                                    NSIS (installMode:"passive", /R) relaunches NEW version
        ▼
 await resolves ─> setStatus("installing") ─> relaunch()   ◄── safety net; on Windows process is usually already gone
        │                                        │
        │                                        └─ on throw: keep manual "Restart now" button + toast (D-05)
        ▼
 NEW launch ─> preflight_migration_repair() heals checksum drift (REL-06 evidence) ─> window appears


REL-06  local two-build verification (manual, config-safe)
────────────────────────────────────────────────────────────────
 build vN  ──install──> run vN (creates %APPDATA% DB with rows)
 build vN+1 (signed) ──> .exe + .exe.sig in target/release/bundle/nsis
        │
        ▼
 assemble latest.json {version:N+1, platforms.windows-x86_64.{signature:<.sig contents>, url:http://localhost:PORT/...-setup.exe}}
        │
        ▼
 serve bundle dir on http://localhost:PORT
        │
 run vN built with `--config local-update.json`  (endpoint -> localhost, dangerousInsecureTransportProtocol:true)
        │  check() ─> downloadAndInstall() ─> auto-exit + NSIS relaunch
        ▼
 EVIDENCE: (a) app reports vN+1   (b) DB rows survive   (c) preflight.log shows repair/consistency line
 (production tauri.conf.json endpoint NEVER edited — D-03 satisfied)
```

### Recommended Project Structure
```
src-tauri/src/lib.rs        # + append_frontend_log command, + register in generate_handler!
src/lib/frontendLog.ts      # NEW: tiny best-effort logFrontend(line) wrapper around invoke (testable, mockable)
src/lib/globalErrorHandlers.ts   # call logFrontend(...) in addition to console.error (D-08)
src/components/common/DbHealthGate.tsx  # call logFrontend(...) on "failed" state (D-09)
src/hooks/useAppUpdate.ts    # (optional) expose a relaunch-after-install path
src/components/common/UpdateBanner.tsx  # auto-relaunch + transitional "restarting…" + manual fallback (D-04/D-05)
src-tauri/tauri.conf.json    # add plugins.updater.windows.installMode = "passive" (explicit)
scripts/make-local-update.mjs    # NEW: build N/N+1, sign, emit latest.json (D-01)
scripts/serve-local-update.mjs   # NEW: tiny http static server (avoid npx serve)
src-tauri/local-update.json      # NEW throwaway --config override (gitignored or committed-as-template), local endpoint
.planning/phases/132-.../VERIFICATION.md  # the documented runbook + captured evidence (D-02)
```

### Pattern 1: Infallible disk-log Tauri command (clone of `preflight_log`)
**What:** A `#[tauri::command]` that appends a timestamped line to `frontend.log`, reusing `resolve_app_data_dir()` + `format_iso8601_now()`, never erroring.
**When to use:** REL-08 — invoked best-effort from JS error/boot-failure paths.
**Example:**
```rust
// Source: pattern mirrors existing src-tauri/src/lib.rs::preflight_log() (lines 343-363)
const FRONTEND_LOG_CAP_BYTES: u64 = 512 * 1024; // D-10

#[tauri::command]
fn append_frontend_log(line: String) {
    // Best-effort + infallible: returns () so a JS-side failure never rejects in a way
    // that could cascade. Mirrors preflight_log's "logging must never abort anything".
    let Some(app_data_dir) = resolve_app_data_dir() else { return };
    let _ = std::fs::create_dir_all(&app_data_dir);
    let log_path = app_data_dir.join("frontend.log");

    // Size-cap (D-10): tail-trim BEFORE append if over cap.
    tail_trim_if_oversized(&log_path, FRONTEND_LOG_CAP_BYTES);

    let stamped = format!("{}  {}\n", format_iso8601_now(), line);
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&log_path) {
        let _ = f.write_all(stamped.as_bytes());
    }
    eprintln!("[hobbyforge][frontend] {line}"); // mirror to stderr for dev, like preflight_log
}
```
Then register in the existing block (`lib.rs` ~line 1495):
```rust
.invoke_handler(tauri::generate_handler![
    import_unit_database, export_backup, validate_backup, create_safety_backup,
    get_schema_version, restore_from_backup, list_safety_backups, write_bytes_to_path,
    ack_successful_launch, factory_reset,
    append_frontend_log,        // <-- new
])
```

### Pattern 2: Size-cap tail-trim with std::fs (D-10)
**What:** Keep only the most-recent N bytes when the file exceeds the cap (single file, no rotation).
**When to use:** REL-08 "size-capped". Called at the top of `append_frontend_log`.
**Example:**
```rust
// Source: idiomatic std::fs — read current size, retain a recent tail. No external crate.
fn tail_trim_if_oversized(path: &std::path::Path, cap: u64) {
    let Ok(meta) = std::fs::metadata(path) else { return }; // file may not exist yet
    if meta.len() <= cap { return; }
    // Keep the most recent ~half-cap so we trim infrequently, not on every append.
    let keep = (cap / 2) as usize;
    let Ok(bytes) = std::fs::read(path) else { return };
    let start = bytes.len().saturating_sub(keep);
    // Align to the next line boundary so the first retained line isn't a fragment.
    let aligned = bytes[start..].iter().position(|&b| b == b'\n').map(|i| start + i + 1).unwrap_or(start);
    let tail = &bytes[aligned..];
    // Atomic-ish replace: write to a temp then rename (best-effort).
    let tmp = path.with_extension("log.tmp");
    if std::fs::write(&tmp, tail).is_ok() {
        let _ = std::fs::rename(&tmp, path);
    }
}
```

### Pattern 3: Best-effort frontend log wrapper (testable)
**What:** A tiny JS module so the disk write is mockable in Vitest and never throws into caller code paths.
**When to use:** REL-08 D-08/D-09 — imported by `globalErrorHandlers.ts` and `DbHealthGate.tsx`.
**Example:**
```ts
// src/lib/frontendLog.ts
import { invoke } from "@tauri-apps/api/core";

/** Best-effort, infallible frontend->disk log. Never throws into the caller. */
export function logFrontend(line: string): void {
  // Fire-and-forget; swallow all errors (non-Tauri env, command missing, etc.).
  void invoke("append_frontend_log", { line }).catch(() => {});
}
```
Then in `globalErrorHandlers.ts`, add alongside the existing `console.error`:
```ts
import { logFrontend } from "@/lib/frontendLog";
// inside handleGlobalError:
logFrontend(`[uncaught] ${String(message)} @ ${source ?? "?"}:${lineno ?? 0}:${colno ?? 0}${error?.stack ? "\n" + error.stack : ""}`);
// inside handleUnhandledRejection:
logFrontend(`[unhandledRejection] ${reason}${stack ? "\n" + stack : ""}`);
```
And in `DbHealthGate.tsx` `catch` block (the "failed" / white-screen case, D-09):
```ts
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  logFrontend(`[boot-failure] DbHealthGate: ${msg}`);   // <-- D-09: capture the no-render case
  setError(msg);
  setState("failed");
}
```

### Pattern 4: Auto-relaunch after install (REL-07, D-04/D-05)
**What:** Trigger `relaunch()` automatically once install resolves; on Windows the NSIS installer (passive mode) does the real restart, so `relaunch()` is the cross-platform path + safety net.
**Example:**
```ts
// In UpdateBanner.tsx / useAppUpdate.ts — after downloadAndInstall resolves (status "installing"):
// On Windows the process is typically already exiting here; this call is correct on macOS/Linux
// and harmless on Windows. Keep the manual fallback for the rare no-exit case (D-05).
try {
  await relaunch();
} catch (e) {
  // D-05: never a dead end — surface a manual path.
  toast.error("Restart failed — please close and reopen the app.");
  // (keep the existing "Restart now" button visible as fallback)
}
```
And make `installMode` explicit in `tauri.conf.json` (currently absent → defaults to passive):
```json
"updater": {
  "pubkey": "…(unchanged)…",
  "endpoints": ["https://github.com/Twan01/warhammer-app/releases/latest/download/latest.json"],
  "windows": { "installMode": "passive" }
}
```

### Anti-Patterns to Avoid
- **Calling `relaunch()` BEFORE `downloadAndInstall` resolves:** On Windows the app auto-exits mid-install; a premature relaunch races the installer and can leave the user on the old version (the exact symptom of tauri issue #5861). Relaunch only after install resolves (D-06 — next launch hits the repaired DB).
- **Editing `tauri.conf.json` for the local test then reverting:** Violates D-03; a forgotten revert ships a `localhost` endpoint or a throwaway pubkey to users. Use `tauri build --config local-update.json` instead.
- **Making `append_frontend_log` return `Result<…>` and `.await`-ing it in a hot path:** Logging must be best-effort and non-blocking (D-07). Return `()` and fire-and-forget from JS.
- **Throwing from the log wrapper:** If `logFrontend` rejects, an error handler could itself error → loop. Always `.catch(()=>{})`.
- **Multi-file log rotation:** Out of scope (Deferred Ideas). A single tail-trimmed file satisfies "size-capped" (D-10).
- **`npx serve` at verification time:** auto-downloads an unpinned package; use a committed Node `http` script or `python -m http.server`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Update download + signature verification | Custom HTTP + minisign check | `tauri-plugin-updater` (present) | Crypto + endpoint placeholder handling is already correct & audited |
| App restart after update | Custom `Command::new(exe)` spawn | `relaunch()` from plugin-process + NSIS `installMode` | Windows process handoff is installer-driven (`/R`); rolling your own races the installer |
| ISO timestamps / app-data path | New helpers | `format_iso8601_now()` + `resolve_app_data_dir()` (present) | D-07 mandates reuse so both logs share dir + format |
| Infallible disk append | New logging stack / `tauri-plugin-log` | Clone `preflight_log()` | The pattern already exists, is unit-test-adjacent, and avoids a dependency (REQUIREMENTS "Out of Scope") |
| latest.json signature | Re-sign by hand | `.sig` file emitted by `createUpdaterArtifacts` | The signature IS the contents of the generated `.sig` file — copy it verbatim |

**Key insight:** Every primitive REL-06/07/08 needs is already in the repo. This phase is integration + verification, not new infrastructure. The risk is in the Windows-specific update *sequencing* (auto-exit vs relaunch), not in any missing library.

## Runtime State Inventory

> This is a feature/verification phase, not a rename/refactor. Included for completeness because REL-06 touches `%APPDATA%` state.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `%APPDATA%\com.hobbyforge.app\hobbyforge.db` (+ `-wal`/`-shm` sidecars), `preflight.log`, `.launch-sentinel`, `backups/` | REL-06 must verify DB rows SURVIVE the update (no migration/code touches this — verification only) |
| Live service config | None — fully offline app, single bundled DB | None — verified by absence of any network sync surface (REQUIREMENTS "Out of Scope": no sync) |
| OS-registered state | NSIS install registry entry + Start Menu shortcut (managed by installer) | None to change; the installer owns these. `installMode: passive` adds `/NS` (no new shortcuts in passive) |
| Secrets/env vars | `TAURI_SIGNING_PRIVATE_KEY` (GitHub Actions secret, in `release.yml`) | **Runbook must state local availability** — see Open Questions. New `frontend.log` introduces NO secret. |
| Build artifacts | `target/release/bundle/nsis/*-setup.exe` + `*.sig` | Produced by the REL-06 helper; throwaway, gitignore them |

**New on-disk artifact this phase adds:** `%APPDATA%\com.hobbyforge.app\frontend.log` — sits beside `preflight.log`, same format, tail-trimmed at ~512 KB.

## Common Pitfalls

### Pitfall 1: Expecting `relaunch()` to run on Windows after install
**What goes wrong:** Code assumes `await downloadAndInstall(); await relaunch();` runs `relaunch()` — but on Windows the process is auto-killed during install, so the line never executes.
**Why it happens:** "Due to a limitation of Windows installers, the application is automatically exited when the install step is executed." [CITED: v2.tauri.app/plugin/updater]
**How to avoid:** Rely on NSIS `installMode: "passive"` (the `/R` flag) for the actual Windows restart; treat the JS `relaunch()` as the macOS/Linux path + a best-effort safety net. Verify the new-version launch via REL-06's real two-build test, not via a unit test of the JS call.
**Warning signs:** Manual testing shows the app closes and reopens on the OLD version, or closes and does not reopen.

### Pitfall 2: New-version launch panics before the window appears (the bug this milestone exists to kill)
**What goes wrong:** After update, migration checksum drift makes the sqlx migrator panic at `.build()` — no window, silent failure.
**Why it happens:** Line-ending / file-byte drift changes the SHA-384 checksum vs the stored `_sqlx_migrations` row (root cause of "update breaks launch").
**How to avoid:** Already mitigated — `preflight_migration_repair()` runs BEFORE the Tauri builder and heals it (`repair_heals_crlf_era_checksums` test). REL-06's evidence requirement (D-02c) is precisely capturing the `preflight.log` repair/consistency line to PROVE the heal fired in a real update. Do not relaunch until install fully resolves (D-06) so the next launch hits the repaired DB.
**Warning signs:** `preflight.log` shows "migration checksum mismatch … repairing" (expected/good) vs a missing window with no log line (regression).

### Pitfall 3: Local private key mismatch breaks the local update test
**What goes wrong:** The local N+1 build is signed with a key whose public half ≠ the `pubkey` in config, so `check()`/`downloadAndInstall` fail signature verification.
**Why it happens:** The production private key is a CI secret; the developer may not have it locally.
**How to avoid:** In the `--config` override, set BOTH the local `endpoints` AND a throwaway `pubkey` that matches a freshly `tauri signer generate`d key, and sign the local builds with that throwaway private key. The production `pubkey` in `tauri.conf.json` stays untouched (D-03).
**Warning signs:** Updater error like "signature verification failed" / "invalid signature".

### Pitfall 4: `frontend.log` not written because React never mounted
**What goes wrong:** A true white-screen (boot crash) leaves no log because the JS that would call `invoke` never ran.
**Why it happens:** If the crash is before `DbHealthGate` or before the error handlers attach, nothing invokes the command.
**How to avoid:** D-09 specifically wires the `DbHealthGate` "failed" branch (which DOES render, via `DbDiagnosticScreen`) to `logFrontend(...)`. `window.onerror`/`onunhandledrejection` are attached at the very top of `main.tsx` (before `createRoot`), so they catch most pre-render JS errors. Accept that a crash *before any JS executes* (e.g. WebView2 fails to load the bundle) is still covered by the Rust-side `preflight_log` + `.launch-sentinel`/WebView2-heal path, not `frontend.log` — document this boundary.
**Warning signs:** White screen with an empty `frontend.log` but a populated `preflight.log` — expected for pre-JS crashes; the two logs are complementary.

### Pitfall 5: Custom command assumed to need an ACL/capability entry
**What goes wrong:** Plan adds a `capabilities/default.json` permission for `append_frontend_log` and it fails (no such permission exists) or wastes effort.
**Why it happens:** Confusing plugin commands (which need `plugin:allow-…` ACL entries) with project-defined `#[tauri::command]`s.
**How to avoid:** Project-defined custom commands registered via `generate_handler!` are callable from the frontend **without any capability entry** — the existing commands (`ack_successful_launch`, `export_backup`, etc.) have NO ACL entries in `capabilities/default.json` and work. Only the `core:`/plugin namespaces need ACL. [VERIFIED: codebase — `capabilities/default.json` lists zero entries for the 10 existing custom commands].
**Warning signs:** Searching for a non-existent `allow-append-frontend-log` permission.

## Code Examples

### latest.json for the local two-build test (REL-06)
```json
{
  "version": "0.5.8",
  "notes": "Local update verification build",
  "pub_date": "2026-06-16T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "<<< paste the ENTIRE contents of HobbyForge_0.5.8_x64-setup.exe.sig >>>",
      "url": "http://localhost:5173/HobbyForge_0.5.8_x64-setup.exe"
    }
  }
}
```
> The `signature` value is literally the text inside the `.sig` file produced next to the installer. The target key for Windows NSIS is `windows-x86_64`. [CITED: v2.tauri.app/plugin/updater; zenn.dev local-update guide]

### Local-test config override (`src-tauri/local-update.json`, used via `--config`)
```json
{
  "plugins": {
    "updater": {
      "endpoints": ["http://localhost:5173/latest.json"],
      "dangerousInsecureTransportProtocol": true,
      "pubkey": "<<< throwaway pubkey if production private key unavailable locally >>>",
      "windows": { "installMode": "passive" }
    }
  }
}
```
Build vN with the override so it polls localhost:
```bash
# vN build that will receive the update (signed with the matching throwaway key)
TAURI_SIGNING_PRIVATE_KEY="$(cat ./throwaway.key)" \
TAURI_SIGNING_PRIVATE_KEY_PASSWORD="…" \
pnpm tauri build --config src-tauri/local-update.json
```
> `--config` deep-merges over `tauri.conf.json`; the committed file is never modified (D-03). [CITED: v2.tauri.app/develop/configuration-files]

### Generating a throwaway signing key (if production key not local)
```bash
pnpm tauri signer generate -- -w ./throwaway.key
# prints the public key -> paste into local-update.json "pubkey"
# sign builds by exporting TAURI_SIGNING_PRIVATE_KEY + _PASSWORD before `tauri build`
```
[CITED: v2.tauri.app/plugin/updater signing section]

### Verifying production config is unchanged after the test (D-03 acceptance)
```bash
git diff --exit-code src-tauri/tauri.conf.json && echo "PROD CONFIG UNCHANGED ✓"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri v1 `tauri::updater` core API + `installer` events | Tauri v2 `@tauri-apps/plugin-updater` `check()`/`downloadAndInstall(cb)` + `plugin-process` `relaunch()` | Tauri 2.0 | This project is already on v2 APIs — v1 docs/snippets do NOT apply |
| Manual "Restart now" button (current `UpdateBanner`) | Auto-relaunch after install + transitional state + fallback | This phase (REL-07) | Removes the manual click |
| stderr/console-only frontend errors | Persistent `frontend.log` on disk | This phase (REL-08) | Packaged failures become diagnosable without devtools |

**Deprecated/outdated:**
- Any Tauri **v1** updater snippet (e.g. `appWindow`, `checkUpdate` from `@tauri-apps/api/updater`): does not exist in v2. Ignore v1 docs entirely.
- `dialog: true` built-in updater dialog (v1): v2 uses the custom-UI flow already implemented in `UpdateBanner`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The production private key matching the committed `pubkey` is NOT available on the dev machine (only as a CI secret) | Open Questions / Pitfall 3 | If it IS available locally, the runbook can sign with it and skip the throwaway-key + `pubkey` override — simpler. Low risk; the throwaway-key path works either way. |
| A2 | `installMode` is currently absent and defaults to `"passive"` | Pattern 4 | Docs say passive is the default; if a different default applied, the Windows restart might require user interaction. Making it explicit removes the assumption. [CITED but worth confirming on the actual build.] |
| A3 | A pre-JS WebView2 load failure cannot write `frontend.log` (only the Rust `preflight.log`/sentinel path covers it) | Pitfall 4 | If wrong, we'd be under-claiming coverage — safe direction. Documented as a known boundary. |
| A4 | ~512 KB cap with half-cap tail-trim is acceptable | Pattern 2 / D-10 | D-10 explicitly leaves the exact value to the executor "within reason" — low risk. |
| A5 | The local static server can run on a port the updater can reach with `dangerousInsecureTransportProtocol` | Code Examples | If HTTP is blocked, fall back to a self-signed HTTPS localhost; low risk, documented alternative exists. |

## Open Questions

1. **Is the production updater private key available locally for the REL-06 test?**
   - What we know: `release.yml` consumes it as `secrets.TAURI_SIGNING_PRIVATE_KEY`; the matching `pubkey` is committed in `tauri.conf.json`.
   - What's unclear: whether the developer holds a local copy of that private key.
   - Recommendation: The runbook should branch — (a) if local key available, sign with it and use the real `pubkey` (no override needed for pubkey); (b) if not, `tauri signer generate` a throwaway key and override `pubkey` in `local-update.json`. Either path leaves `tauri.conf.json` untouched (D-03). Plan a `checkpoint:human-verify` to confirm which branch applies.

2. **Should the same size-cap be applied to `preflight.log`?**
   - What we know: D-10 + Claude's Discretion mark this optional/cheap.
   - What's unclear: whether `preflight.log` can grow unbounded in practice (it only writes on repair/boot events, so growth is slow).
   - Recommendation: Fold a shared `tail_trim_if_oversized` helper and apply to both for symmetry — cheap, and the helper is written once. Executor's call.

3. **Does `installInstall` auto-exit fire reliably enough that the manual fallback is ever needed on Windows?**
   - What we know: Docs say Windows auto-exits; the NSIS `/R` restarts.
   - What's unclear: edge cases (elevation prompts, AV interference) where neither exit nor relaunch fires.
   - Recommendation: Keep the manual "Restart now" + toast fallback unconditionally (D-05). Don't remove it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@tauri-apps/cli` (`tauri signer`, `tauri build --config`) | REL-06 build/sign | ✓ (devDep) | ^2.0.0 | — |
| `tauri-plugin-updater` / `-process` (Rust + JS) | REL-07 | ✓ | 2.10.1 / 2.3.1 | — |
| Rust toolchain (Tauri build) | REL-06 real installer | ✓ (project builds release in CI w/ 1.87.0) | 1.87.0 pinned in release.yml | — |
| NSIS bundler | REL-06 `-setup.exe` | ✓ (`createUpdaterArtifacts: true`, `targets: all`) | — | — |
| Updater private key (matching committed pubkey) | REL-06 signing | **? UNKNOWN** | — | `tauri signer generate` throwaway key + override `pubkey` via `--config` |
| Local static HTTP server | REL-06 local endpoint | partial (no committed server) | — | committed `scripts/serve-local-update.mjs` (Node `http`) OR `python -m http.server` |

**Missing dependencies with no fallback:** none hard-blocking.
**Missing dependencies with fallback:**
- Local signing key — fallback is a throwaway generated key (fully covered).
- Static server — fallback is a tiny committed Node script (avoid `npx serve`).

## Validation Architecture

> `workflow.nyquist_validation` not explicitly false → section included. Note: REL-06 is inherently MANUAL (a real NSIS installer cannot run in jsdom/CI). Automated tests cover REL-07/REL-08's *logic*; REL-06 is a documented checklist + captured evidence.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + React Testing Library 16 (jsdom) for frontend; `cargo test` for Rust |
| Config file | `vitest.config.ts` (root); `tests/setup.ts` global setup |
| Quick run command | `pnpm test -- tests/error-resilience/globalErrorHandlers.test.ts` |
| Full suite command | `pnpm test` (Vitest) + `cargo test` (run in `src-tauri/`) + `pnpm build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REL-08 | `globalErrorHandlers` invoke `append_frontend_log` best-effort (mock `@tauri-apps/api/core`) | unit | `pnpm test -- tests/error-resilience/globalErrorHandlers.test.ts` | ✅ extend existing |
| REL-08 | `DbHealthGate` failure path calls `logFrontend` | unit | `pnpm test -- tests/error-resilience/DbHealthGate*.test.tsx` | ❌ Wave 0 |
| REL-08 | `logFrontend` swallows invoke rejection (no throw) | unit | `pnpm test -- tests/error-resilience/frontendLog.test.ts` | ❌ Wave 0 |
| REL-08 | `append_frontend_log` appends + tail-trims over cap | rust unit | `cargo test --manifest-path src-tauri/Cargo.toml frontend_log` | ❌ Wave 0 |
| REL-07 | `UpdateBanner` auto-relaunches on `installing`, falls back to toast+button on throw (mock `relaunch`) | unit | `pnpm test -- tests/error-resilience/UpdateBanner.test.tsx` | ❌ Wave 0 |
| REL-06 | Two-build NSIS update launches vN+1, DB rows survive, `preflight.log` shows repair | **manual** | documented runbook + captured evidence (D-02) | n/a (manual) |
| REL-06 (regression guard) | checksum repair heals drift | rust unit (exists) | `cargo test --manifest-path src-tauri/Cargo.toml repair_heals_crlf_era_checksums` | ✅ exists |

### Sampling Rate
- **Per task commit:** the relevant quick `pnpm test -- <file>` for the touched area.
- **Per wave merge:** `pnpm test` + `cargo test`.
- **Phase gate:** Full suite green (`pnpm test` + `cargo test` + `pnpm build`) AND the manual REL-06 evidence captured, before `/gsd:verify-work` and the Theme A → master merge (D-11).

### Wave 0 Gaps
- [ ] `tests/error-resilience/frontendLog.test.ts` — `logFrontend` fire-and-forget + swallows rejection (mock `@tauri-apps/api/core` invoke, per existing `DataManagementTab.test.tsx` pattern)
- [ ] `tests/error-resilience/UpdateBanner.test.tsx` — auto-relaunch on `installing`; on `relaunch` throw → toast.error + manual button still rendered (mock `@tauri-apps/plugin-process` `relaunch`, `sonner` toast, `useAppUpdate`)
- [ ] `tests/error-resilience/DbHealthGate*.test.tsx` — failed state calls `logFrontend` (mock invoke + getDb to throw)
- [ ] Rust: `append_frontend_log` / `tail_trim_if_oversized` unit test in `lib.rs` `#[cfg(test)]` (write > cap bytes, assert file ≤ cap and newest line retained)
- [ ] `VERIFICATION.md` runbook scaffold for REL-06 evidence (D-02)
- [ ] (No framework install needed — Vitest + cargo test already present)

## Security Domain

> `security_enforcement` not set to false → included. This phase touches code-signing (updater), local disk writes, and a temporary local HTTP endpoint.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user offline desktop app; no auth |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | `append_frontend_log` takes a `String` written to a FIXED path (`app_data_dir/frontend.log`) — no caller-controlled path → no path traversal. Do NOT accept a filename param. |
| V6 Cryptography | yes | Update signature verification is handled by `tauri-plugin-updater` (minisign). NEVER hand-roll. Keep the production `pubkey` untouched (D-03). |
| V10 Malicious Code / Supply Chain | yes | `dangerousInsecureTransportProtocol` + throwaway key are LOCAL-TEST-ONLY via `--config`; must never reach the committed config or a release. |

### Known Threat Patterns for {Tauri NSIS updater + local FS log}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via log filename | Tampering | `append_frontend_log` writes a hard-coded path; takes only `line: String`, no path input |
| Log as exfiltration of secrets | Information Disclosure | Log lines are error messages/stacks; do not log DB contents or env vars. Tail-trim caps disk growth (D-10) |
| Shipping `localhost`/insecure endpoint to users | Tampering / Supply Chain | Use `--config` override (never edit `tauri.conf.json`); assert `git diff --exit-code` after the test (D-03) |
| Unsigned/forged update accepted | Spoofing | minisign signature verified by updater plugin against `pubkey`; CI signing key scoped to release job only (verified in Phase 131) |
| Premature relaunch races installer → old version | Tampering (integrity of running version) | Relaunch only after install resolves (D-06); rely on NSIS `installMode: passive` `/R` for Windows restart |

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/lib.rs` (read in full) — `preflight_log`, `resolve_app_data_dir`, `format_iso8601_now`, `repair_migration_checksums` + `repair_heals_crlf_era_checksums` test, `generate_handler!` block, updater/process plugin wiring.
- `src/hooks/useAppUpdate.ts`, `src/components/common/UpdateBanner.tsx`, `src/lib/globalErrorHandlers.ts`, `src/main.tsx`, `src/components/common/DbHealthGate.tsx`, `src/components/common/DbDiagnosticScreen.tsx` (read in full).
- `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `package.json`, `src-tauri/capabilities/default.json`, `.github/workflows/release.yml`, `scripts/check-version.mjs` (read in full).
- `tests/error-resilience/globalErrorHandlers.test.ts`, `tests/settings/DataManagementTab.test.tsx` (mock patterns for invoke/relaunch/toast).
- https://v2.tauri.app/plugin/updater/ — `check`/`downloadAndInstall`/`relaunch` API, `latest.json` schema, `installMode` (passive default), **Windows auto-exit on install**, signing with `TAURI_SIGNING_PRIVATE_KEY`, `createUpdaterArtifacts` → `-setup.exe` + `.sig`.
- https://v2.tauri.app/develop/configuration-files/ — `tauri build --config` deep-merge behavior (D-03 mechanism).

### Secondary (MEDIUM confidence)
- https://zenn.dev/monkuma/articles/c947bca541cb48?locale=en — concrete local two-build verification procedure (signer generate, latest.json with .sig contents, localhost serve, `dangerousInsecureTransportProtocol`, `installMode: passive`).
- https://github.com/tauri-apps/tauri/issues/5861, https://github.com/tauri-apps/tauri/issues/4220 — Windows "old version after update" / "relaunch never runs" symptoms confirming the auto-exit sequencing pitfall.
- https://github.com/tauri-apps/tauri/issues/6955 + commit df89ccc — NSIS passive mode `/P` `/R` `/NS` flags (installer-driven restart).

### Tertiary (LOW confidence)
- https://ratulmaharaj.com/posts/tauri-automatic-updates/, https://thatgurjot.com/til/tauri-auto-updater/ — community walkthroughs (corroborate the above; not load-bearing).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and version-verified from Cargo.toml/package.json.
- Architecture (REL-08 log command, REL-07 relaunch flow): HIGH — directly mirrors existing `preflight_log` and existing `relaunch` usage; APIs verified against official v2 docs.
- REL-07 Windows sequencing (auto-exit + NSIS restart): HIGH — explicitly documented in official updater docs and corroborated by multiple maintainer issues.
- REL-06 local verification mechanism: HIGH for the `--config`/local-endpoint approach; the ONE open variable is local availability of the signing private key (A1/Open Q1).
- Pitfalls: HIGH — grounded in official docs + the project's own no-window-on-update root-cause history.

**Research date:** 2026-06-16
**Valid until:** 2026-07-16 (Tauri 2 updater/process APIs are stable; re-verify if upgrading plugin major versions)
