# Phase 132: Update Trustworthiness - Pattern Map

**Mapped:** 2026-06-16
**Files analyzed:** 11 (4 new, 7 modified)
**Analogs found:** 11 / 11 (every file has an in-repo analog)

> Every primitive REL-06/07/08 needs already exists in the repo. This phase is integration + verification, not new infrastructure. The two load-bearing clones are: `preflight_log()` → `append_frontend_log` (Rust), and the existing `relaunch()`/invoke-mock test patterns → the new Vitest specs.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src-tauri/src/lib.rs` (`append_frontend_log` + `tail_trim_if_oversized` + register) | command + utility | file-I/O | `preflight_log()` @ lib.rs:343-363 | exact |
| `src-tauri/src/lib.rs` (`#[cfg(test)]` rust unit test) | test | file-I/O | `repair_heals_crlf_era_checksums` @ lib.rs:1709 | role-match |
| `src/lib/frontendLog.ts` (NEW best-effort invoke wrapper) | utility | request-response | `invoke("ack_successful_launch").catch(()=>{})` in DbHealthGate.tsx:66 | exact |
| `src/lib/globalErrorHandlers.ts` (MODIFY) | utility | event-driven | self (existing `console.error` handlers) | exact |
| `src/components/common/DbHealthGate.tsx` (MODIFY catch) | component | event-driven | self (existing `catch`/`invoke` @ :66-70) | exact |
| `src/components/common/UpdateBanner.tsx` (MODIFY) | component | event-driven | self (manual `relaunch()` @ :44) | exact |
| `src/hooks/useAppUpdate.ts` (MODIFY, optional) | hook | event-driven | self (`installing` state @ :43-47) | exact |
| `src-tauri/tauri.conf.json` (MODIFY updater block) | config | — | self (`plugins.updater` @ :54-59) | exact |
| `tests/error-resilience/frontendLog.test.ts` (NEW) | test | request-response | `DataManagementTab.test.tsx` invoke mock | role-match |
| `tests/error-resilience/UpdateBanner.test.tsx` (NEW) | test | event-driven | `DataManagementTab.test.tsx` relaunch+toast mock | exact (mock set) |
| `scripts/make-local-update.mjs` + `scripts/serve-local-update.mjs` + `src-tauri/local-update.json` (NEW) | config/tooling | batch | `scripts/check-version.mjs` | role-match |

**Test-location correction:** the project test dir is `tests/error-resilience/`, NOT `tests/common/` or `tests/lib/` as the spawning prompt guessed. `globalErrorHandlers.test.ts` and `DbHealthGate.test.tsx` already live there and already exist — **extend** them rather than create new files. `frontendLog.test.ts` and `UpdateBanner.test.tsx` are new files in that same dir.

## Pattern Assignments

### `src-tauri/src/lib.rs` — `append_frontend_log` command (command, file-I/O)

**Analog:** `preflight_log()` at `src-tauri/src/lib.rs:343-363` — copy verbatim, retarget to `frontend.log`, add size-cap, take an owned `String`.

**Exact template to clone** (lib.rs:343-363):
```rust
/// Append a timestamped line to the preflight log file inside app_data_dir.
/// ... best-effort and infallible — logging must never be able to abort startup.
fn preflight_log(line: &str) {
    eprintln!("[hobbyforge] {line}");
    let Some(app_data_dir) = resolve_app_data_dir() else { return };
    let _ = std::fs::create_dir_all(&app_data_dir);
    let log_path = app_data_dir.join("preflight.log");
    let stamped = format!("{}  {}\n", format_iso8601_now(), line);
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        let _ = f.write_all(stamped.as_bytes());
    }
}
```

**Reuse verbatim (D-07 mandate):**
- `resolve_app_data_dir()` @ lib.rs:365-383 — already resolves `%APPDATA%\com.hobbyforge.app` per-OS. Do NOT re-implement.
- `format_iso8601_now()` @ lib.rs:1032-1036 — `time::OffsetDateTime::now_utc().format(Rfc3339)`. Same timestamp format as `preflight.log`.

**Command signature pattern** — the new command is the FIRST `#[tauri::command]` here that takes a frontend-supplied arg and returns `()`. Closest existing arg-taking command for shape is `ack_successful_launch` (lib.rs:1440-1449) but that returns `Result<(),String>`; **deviate deliberately** — return `()` (infallible, fire-and-forget). Security (V5): take ONLY `line: String`, never a path/filename param — the path is hard-coded to `app_data_dir.join("frontend.log")`.

```rust
#[tauri::command]
fn append_frontend_log(line: String) {
    eprintln!("[hobbyforge][frontend] {line}");
    let Some(app_data_dir) = resolve_app_data_dir() else { return };
    let _ = std::fs::create_dir_all(&app_data_dir);
    let log_path = app_data_dir.join("frontend.log");
    tail_trim_if_oversized(&log_path, FRONTEND_LOG_CAP_BYTES); // D-10
    let stamped = format!("{}  {}\n", format_iso8601_now(), line);
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&log_path) {
        let _ = f.write_all(stamped.as_bytes());
    }
}
```

**Registration** — add to the SINGLE `generate_handler!` block at lib.rs:1495-1506 (currently 10 commands, zero ACL entries needed — project commands are allowed by default):
```rust
.invoke_handler(tauri::generate_handler![
    import_unit_database, export_backup, validate_backup, create_safety_backup,
    get_schema_version, restore_from_backup, list_safety_backups, write_bytes_to_path,
    ack_successful_launch, factory_reset,
    append_frontend_log,   // <-- new (REL-08)
])
```

**Size-cap helper (D-10):** `tail_trim_if_oversized` is net-new (no exact analog), but uses only `std::fs` already in use by `preflight_log`. See RESEARCH Pattern 2 for the reference implementation (read size → keep recent ~half-cap → align to next `\n` → temp-write + rename).

---

### `src-tauri/src/lib.rs` — Rust unit test (test, file-I/O)

**Analog:** `repair_heals_crlf_era_checksums` @ lib.rs:1709-1703 (inside `#[cfg(test)] mod tests` starting at lib.rs:1511, `use super::*;` at :1513).

**Structure to copy** (the temp-dir lifecycle is the load-bearing pattern):
```rust
#[test]
fn frontend_log_tail_trims_over_cap() {
    let temp_dir = std::env::temp_dir().join("hobbyforge_test_frontend_log");
    let _ = std::fs::create_dir_all(&temp_dir);
    let log_path = temp_dir.join("frontend.log");
    let _ = std::fs::remove_file(&log_path);
    // ... write > cap bytes, call tail_trim_if_oversized, assert len <= cap
    //     and that the NEWEST line survived (assert tail content present).
    let _ = std::fs::remove_dir_all(&temp_dir); // cleanup like :1702
}
```
Note: test against `tail_trim_if_oversized(&path, cap)` directly (it takes an explicit path), so no `resolve_app_data_dir()` / `%APPDATA%` dependency in the test — cleaner than going through the command.

---

### `src/lib/frontendLog.ts` (NEW) — best-effort invoke wrapper (utility, request-response)

**Analog:** the fire-and-forget invoke already in `DbHealthGate.tsx:66`:
```ts
invoke("ack_successful_launch").catch(() => {});
```
This is the EXACT pattern for `logFrontend` — `void invoke("append_frontend_log", { line }).catch(() => {})`. Import `invoke` from `@tauri-apps/api/core` (same import as DbHealthGate.tsx:2). Returns `void`, never throws into the caller (D-07/anti-pattern: never reject from the log path or an error handler could loop).

---

### `src/lib/globalErrorHandlers.ts` (MODIFY) — wire disk write (utility, event-driven)

**Analog:** self. Current file (35 lines) has two exported handlers, each calling `console.error` with structured context.

**`handleGlobalError`** @ :8-23 — add a `logFrontend(...)` call ALONGSIDE the existing `console.error` (keep console for dev, D-08). The structured object at :15-22 already has `message`, `source`, location, `stack` to format the line from.

**`handleUnhandledRejection`** @ :25-35 — same: add `logFrontend(...)` next to `console.error`. The reason/stack extraction at :29-33 is the data source.

Both write the console line first (unchanged) then `logFrontend(...)` second.

---

### `src/components/common/DbHealthGate.tsx` (MODIFY) — capture boot failure (component, event-driven)

**Analog:** self. The `catch` block at `:67-70` is the white-screen/no-render path (D-09 acid test):
```ts
} catch (err) {
  setError(err instanceof Error ? err.message : String(err));
  setState("failed");
}
```
Insert `logFrontend(\`[boot-failure] DbHealthGate: ${msg}\`)` at the TOP of the catch (before `setError`). This branch still renders (`DbDiagnosticScreen`), so the invoke will run. `invoke` is already imported (:2); add the `logFrontend` import. The existing `invoke("ack_successful_launch").catch(()=>{})` at :66 is the in-file precedent for best-effort invoke.

---

### `src/components/common/UpdateBanner.tsx` (MODIFY) — auto-relaunch (component, event-driven)

**Analog:** self. The manual relaunch is at `:44`:
```ts
onClick={() => { relaunch().catch(() => toast.error("Restart failed — please close and reopen the app.")); }}
```
This is the exact `relaunch()` + `toast.error` fallback to REUSE (D-05) — the message string is already the one the decision specifies. `relaunch` import (:3) and `toast` import (:4) already present; no new deps.

**Change (D-04):** in the `status === "installing"` branch (:36-51), fire `relaunch()` automatically via a `useEffect` keyed on `status === "installing"` (do NOT call during render). Keep the manual "Restart now" button (:40-48) as the fallback when `relaunch()` throws (D-05). Update copy to the transitional "Update installed — restarting…" state (D-05). The `installing` status is set by `useAppUpdate` AFTER `downloadAndInstall` resolves (D-06 — never relaunch before resolve).

**Anti-pattern guard (D-06):** relaunch only on `installing` (post-resolve), never on `downloading`/`Finished` mid-event. On Windows the process auto-exits during install, so this call is the macOS/Linux path + safety net; the real Windows restart is NSIS `installMode: passive`.

---

### `src/hooks/useAppUpdate.ts` (MODIFY, optional) — relaunch-after-install path (hook, event-driven)

**Analog:** self. The `installing` transition is set in TWO places: the `Finished` event handler (:43-45) and after `downloadAndInstall` resolves (:47). The state machine type is at `:4`. If the executor centralizes the auto-relaunch here instead of in `UpdateBanner`, hook it onto the post-resolve `setStatus("installing")` at :47 (after resolve, per D-06). Discretion: RESEARCH puts the relaunch in `UpdateBanner` (component-owned UI decision) — either is acceptable.

---

### `src-tauri/tauri.conf.json` (MODIFY) — explicit installMode (config)

**Analog:** self. `plugins.updater` block at `:54-59`:
```json
"updater": {
  "pubkey": "dW50cnVzdGVk…(unchanged)…",
  "endpoints": ["https://github.com/Twan01/warhammer-app/releases/latest/download/latest.json"]
}
```
Add `"windows": { "installMode": "passive" }` to make the Windows default explicit (RESEARCH A2). **Do NOT touch `pubkey` or `endpoints`** (D-03). The REL-06 local test overrides those via `--config local-update.json`, never by editing this file. `createUpdaterArtifacts: true` already set at `:43`.

---

### `tests/error-resilience/frontendLog.test.ts` (NEW) + `UpdateBanner.test.tsx` (NEW) (test)

**Analog (mock set):** `tests/settings/DataManagementTab.test.tsx:1-70` — the canonical hoisted-mock pattern for this exact trio of Tauri surfaces:
```ts
const mockInvoke = vi.fn();
const mockRelaunch = vi.fn();
const mockToastError = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => mockInvoke(...a) }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: () => mockRelaunch() }));
vi.mock("sonner", () => ({ toast: { success: (...a) => mockToastSuccess(...a), error: (...a) => mockToastError(...a) } }));
// beforeEach: vi.clearAllMocks(); mockInvoke.mockResolvedValue(undefined); mockRelaunch.mockResolvedValue(undefined);
```

- **`frontendLog.test.ts`:** mock `@tauri-apps/api/core` invoke; assert `logFrontend("x")` calls `invoke("append_frontend_log", { line: "x" })` AND that a rejected invoke is swallowed (no throw). Plain-module style like `globalErrorHandlers.test.ts` (no render needed).
- **`UpdateBanner.test.tsx`:** mock `relaunch`, `sonner` toast, and `@/hooks/useAppUpdate` (return `{ status: "installing", version, installUpdate, ... }`). Assert: on `installing`, `relaunch` is called automatically; when `mockRelaunch.mockRejectedValue(...)`, `toast.error` fires AND the manual "Restart now" button is still rendered (D-05). Render/userEvent pattern from `DbHealthGate.test.tsx`.

**Extend (do not recreate):**
- `tests/error-resilience/globalErrorHandlers.test.ts` (exists, 93 lines) — add a `logFrontend` mock + assert both handlers call it alongside `console.error`.
- `tests/error-resilience/DbHealthGate.test.tsx` (exists) — `getDb`/`select` mock already present (:12-37); add a failure case asserting `logFrontend`/`invoke("append_frontend_log", …)` fires in the catch.

---

### `scripts/make-local-update.mjs` + `serve-local-update.mjs` + `src-tauri/local-update.json` (NEW, tooling)

**Analog:** `scripts/check-version.mjs` — the established Node ESM script style: `import { … } from 'node:fs'`, `fileURLToPath(import.meta.url)` to resolve `root`, read `package.json` + `src-tauri/tauri.conf.json`, `process.exit(0|1)`. Use Node built-in `node:http` for the static server (NOT `npx serve` — RESEARCH SUS note). `local-update.json` is a throwaway `--config` override (gitignore it); see RESEARCH "Local-test config override" for its shape (local `endpoints`, `dangerousInsecureTransportProtocol: true`, throwaway `pubkey`). These are REL-06 verification-only and never ship.

## Shared Patterns

### Infallible disk write (REL-08 backbone)
**Source:** `src-tauri/src/lib.rs::preflight_log()` @ :343-363
**Apply to:** `append_frontend_log` (Rust) and, transitively, every JS caller via `logFrontend`.
**Rule:** `Option`-guard `resolve_app_data_dir()`, `create_dir_all`, `OpenOptions::new().create(true).append(true)`, swallow every `Result` with `let _ =`. Mirror to `eprintln!`. Never return `Result` for the log path — logging must never abort anything (D-07).

### Best-effort frontend → Rust invoke
**Source:** `src/components/common/DbHealthGate.tsx:66` — `invoke("ack_successful_launch").catch(() => {})`
**Apply to:** `frontendLog.ts`, and the call sites in `globalErrorHandlers.ts` + `DbHealthGate.tsx`.
**Rule:** `void invoke(cmd, args).catch(() => {})` — fire-and-forget, always `.catch`, never `await` in a hot/error path (prevents error-handler loops).

### relaunch() + toast fallback
**Source:** `src/components/common/UpdateBanner.tsx:44` — `relaunch().catch(() => toast.error("Restart failed — please close and reopen the app."))`
**Apply to:** the auto-relaunch path (D-04/D-05). Reuse the exact message + the manual button as the no-dead-end fallback.

### Reused timestamp + path helpers (D-07 mandate)
**Source:** `format_iso8601_now()` @ lib.rs:1032-1036, `resolve_app_data_dir()` @ lib.rs:365-383
**Apply to:** `append_frontend_log`, so `frontend.log` and `preflight.log` share dir + format.

### Tauri-surface mock set (tests)
**Source:** `tests/settings/DataManagementTab.test.tsx:11-49,62-70`
**Apply to:** all new/extended specs touching invoke, relaunch, or toast. Hoisted `const mock… = vi.fn()` + `vi.mock(...)` factory + `beforeEach` `vi.clearAllMocks()` + `mockResolvedValue(undefined)` defaults.

### Node ESM script scaffold
**Source:** `scripts/check-version.mjs`
**Apply to:** `make-local-update.mjs`, `serve-local-update.mjs` (root-relative path resolution, `process.exit`).

## No Analog Found

| File / unit | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tail_trim_if_oversized` (Rust) | utility | file-I/O | No existing size-cap/tail-trim logic in the repo; uses only `std::fs` already used by `preflight_log`. Build per RESEARCH Pattern 2. |
| REL-06 NSIS two-build verification | (manual) | — | Cannot run in jsdom/CI; no automatable analog. Documented runbook + captured evidence (D-02) in `VERIFICATION.md`. Regression is guarded by the existing `repair_heals_crlf_era_checksums` Rust test. |

## Metadata

**Analog search scope:** `src-tauri/src/lib.rs`, `src/lib/`, `src/components/common/`, `src/hooks/`, `src-tauri/tauri.conf.json`, `tests/error-resilience/`, `tests/settings/`, `scripts/`
**Files scanned:** 13 (lib.rs targeted ranges, globalErrorHandlers, UpdateBanner, useAppUpdate, DbHealthGate, main.tsx, tauri.conf.json, check-version.mjs, globalErrorHandlers.test.ts, DataManagementTab.test.tsx, DbHealthGate.test.tsx)
**Pattern extraction date:** 2026-06-16
