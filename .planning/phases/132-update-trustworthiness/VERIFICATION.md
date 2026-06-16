# REL-06 Verification Runbook — Real In-Place NSIS Update

**Phase:** 132 — Update Trustworthiness
**Requirement:** REL-06
**Status:** PENDING HUMAN EXECUTION

> This runbook cannot be automated. A real NSIS installer cannot run in jsdom/CI.
> A human must follow these steps on a Windows machine and capture the three evidence
> items below. The runbook uses a config-safe `--config` override that never edits
> the committed `src-tauri/tauri.conf.json` (D-03).

---

## Prerequisites

### 1. Rust toolchain

> KNOWN BLOCKER: `rust-toolchain.toml` currently pins Rust 1.87.0, but the Cargo.lock
> dependency tree requires rustc 1.88.0+, so `pnpm tauri build` will fail under the pin.
> BEFORE performing the real two-build verification, bump `rust-toolchain.toml` to
> `channel = "1.88.0"` (or `"stable"` if 1.88+ is the current stable), re-green CI
> on `master`, and confirm the build succeeds locally.

### 2. Signing-key branch (choose one)

#### Option A — Production private key available locally

The committed `pubkey` in `tauri.conf.json` corresponds to a private key stored as a
GitHub Actions secret (`secrets.TAURI_SIGNING_PRIVATE_KEY`). If you have a local copy
of that private key, you can sign local builds with it.

- No `pubkey` override is needed in `src-tauri/local-update.json`.
- Remove the placeholder `pubkey` line from `src-tauri/local-update.json` before building
  (so the production pubkey from `tauri.conf.json` is used after the deep-merge).
- Set env vars before building:
  ```powershell
  $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content .\production.key -Raw
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<password>"
  ```

#### Option B — Production key NOT available locally (CI-only secret)

This is the expected case. Generate a throwaway keypair:

```powershell
pnpm tauri signer generate -- -w .\throwaway.key
```

This prints a public key like:
```
Public key: dW50cnVzdGVkIGNvbW1lbnQ6...
```

Open `src-tauri/local-update.json` and replace the `pubkey` placeholder with the printed
public key. Do NOT commit the updated `local-update.json` with the real pubkey — it is
a template file only. The throwaway private key file (`throwaway.key`) is gitignored.

Set the signing env vars:
```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content .\throwaway.key -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
```

---

## Step-by-Step Procedure

### Step 1 — Build and install vN (current version)

The current version is what is deployed in `tauri.conf.json`. Build it with the
local-update override so the updater polls localhost:

```powershell
pnpm tauri build --config src-tauri/local-update.json
```

This deep-merges `src-tauri/local-update.json` over `tauri.conf.json`:
- Overrides the `endpoints` to `http://localhost:5183/latest.json`
- Enables `dangerousInsecureTransportProtocol: true`
- Overrides `pubkey` with the throwaway public key (Option B), or leaves it as the
  production pubkey (Option A)
- Sets `installMode: "passive"` (explicit, matches the default)

The committed `tauri.conf.json` is NOT edited. Verify now:

```powershell
git diff --exit-code src-tauri/tauri.conf.json
# Must print nothing and exit 0
```

Install the vN artifact from:
```
src-tauri\target\release\bundle\nsis\HobbyForge_<vN>_x64-setup.exe
```

Launch vN and use the app briefly to create some data (paint entries, units in collection,
etc.) so `%APPDATA%\com.hobbyforge.app\hobbyforge.db` has rows to verify after the update.

Note a row count or a sample record for the evidence section below.

### Step 2 — Bump version to vN+1

In **both** `package.json` and `src-tauri/tauri.conf.json`, increment the patch version
(e.g. `0.5.7` → `0.5.8`). Do not commit this bump yet — the check-version pre-commit hook
will verify parity when you do commit.

### Step 3 — Build vN+1 with the local-update override

With the signing env vars set (from Prerequisites), run:

```powershell
pnpm tauri build --config src-tauri/local-update.json
```

This produces:
```
src-tauri\target\release\bundle\nsis\HobbyForge_<vN+1>_x64-setup.exe
src-tauri\target\release\bundle\nsis\HobbyForge_<vN+1>_x64-setup.exe.sig
```

The `.sig` file is the minisign signature of the installer, produced by
`createUpdaterArtifacts: true` in `tauri.conf.json`. Its ENTIRE contents become the
`signature` value in `latest.json` — do NOT re-sign.

### Step 4 — Emit latest.json

```powershell
node scripts/make-local-update.mjs
```

This reads the `.sig` file, reads the installer filename, and writes `latest.json` to
the repo root with the `windows-x86_64` platform entry:
```json
{
  "version": "<vN+1>",
  "notes": "Local update verification build (REL-06)",
  "pub_date": "<ISO timestamp>",
  "platforms": {
    "windows-x86_64": {
      "signature": "<entire contents of *.sig file>",
      "url": "http://localhost:5183/HobbyForge_<vN+1>_x64-setup.exe"
    }
  }
}
```

Verify the output looks correct (non-empty signature, correct version, localhost URL).

### Step 5 — Start the local update server

```powershell
node scripts/serve-local-update.mjs
```

Leave this running. It serves:
- `http://localhost:5183/latest.json` (from repo root)
- `http://localhost:5183/HobbyForge_<vN+1>_x64-setup.exe` (from NSIS bundle dir)

### Step 6 — Launch vN and trigger the in-app update

Launch the installed vN app (the one installed in Step 1 that polls localhost). In the
app, navigate to the update banner or use the update check button. The updater will:

1. Check `http://localhost:5183/latest.json`
2. See version vN+1 is available
3. Download the installer from localhost
4. Verify the minisign signature against the `pubkey` in the local-update override
5. Run the NSIS installer in passive mode (`installMode: "passive"`)

> WINDOWS NOTE (Pitfall 1): On Windows, the app process AUTO-EXITS during the NSIS
> install step. This is documented Windows-installer behavior. The NSIS installer
> relaunches the new version via the `/R` passive restart flag. The JS `relaunch()` call
> is a cross-platform safety net; on Windows the process is usually already gone by the
> time it runs. This is EXPECTED — do not mistake it for a crash.

The new vN+1 app should relaunch automatically with NO manual click (REL-07 observed live).

### Step 7 — Capture evidence (D-02)

After the updated app relaunches, capture all three evidence items in the section below.

### Step 8 — Config-safety check (D-03)

```powershell
git diff --exit-code src-tauri/tauri.conf.json
```

Must exit 0 and print nothing. If this fails, the production config was accidentally
modified — investigate before proceeding.

---

## Evidence (fill in during the checkpoint)

### Evidence A — App version after update

> (Capture a screenshot or paste the version string from the About page / window title)

```
App version after update: [FILL IN — must read vN+1, e.g. "0.5.8"]
```

### Evidence B — Pre-existing DB rows survive the update

> (Paste a row count or a sample record from the DB as seen in the app's UI after update.
> These rows were created in Step 1 before the update.)

```
Pre-update data still present after update:
  Table:   [FILL IN — e.g. "paints" / "collection" / "army_lists"]
  Count:   [FILL IN — e.g. "12 paint entries"]
  Sample:  [FILL IN — e.g. "Paint: Abaddon Black (id=1) present"]
```

### Evidence C — preflight.log repair/consistency line

> (Paste the relevant lines from %APPDATA%\com.hobbyforge.app\preflight.log after the
> update and relaunch. The repair or consistency line proves the checksum-repair fix
> fired correctly on the first launch after the update — this is the REL-06 "update
> breaks launch" proof.)
>
> Location: %APPDATA%\com.hobbyforge.app\preflight.log
> Expected: a line containing "migration checksum" (either "mismatch … repairing" or
> "all checksums consistent") from the preflight_migration_repair() run.

```
preflight.log excerpt (from the vN+1 first launch):

[FILL IN — paste the relevant log line(s)]

Example of what to look for:
  "... migration checksum mismatch for <name> — repairing"  (repair fired, good)
  "... all migration checksums consistent"                    (no repair needed, also good)
```

### Config-safety confirmation (D-03)

```
git diff --exit-code src-tauri/tauri.conf.json output: [FILL IN — must be "exit 0 / no output"]
```

---

## Known Boundaries

### Pre-JS WebView2 crashes (Pitfall 4)

A crash that occurs before WebView2 loads the app bundle (e.g. WebView2 itself fails)
cannot write to `frontend.log` because no JS has run. These failures are covered by the
Rust-side `preflight.log` and the `.launch-sentinel` / WebView2-heal path, not
`frontend.log`. This is a documented boundary, not a gap.

### Windows auto-exit during NSIS install

During the NSIS install step, Windows auto-exits the vN app process. The installer
relaunches vN+1 via the `/R` passive-mode restart flag. If the vN+1 window does not
appear within ~30 seconds, check:
1. The NSIS installer completed (check Add/Remove Programs for the updated version).
2. `preflight.log` for startup errors.
3. The `pubkey` in `local-update.json` matches the key used to sign the vN+1 build.

### Signature verification failure

If the updater logs "signature verification failed" or similar:
- Confirm `TAURI_SIGNING_PRIVATE_KEY` was set when building vN+1.
- Confirm the `pubkey` in `src-tauri/local-update.json` matches the key used for signing.
- Re-run `node scripts/make-local-update.mjs` and confirm `latest.json` has a non-empty
  `signature` field (the full multi-line `.sig` file contents).

---

## Verification Sign-Off

- [ ] Evidence A filled in (app reports vN+1)
- [ ] Evidence B filled in (pre-existing DB rows present)
- [ ] Evidence C filled in (preflight.log repair/consistency line pasted)
- [ ] Config-safety confirmed (`git diff --exit-code src-tauri/tauri.conf.json` clean)
- [ ] App relaunched with NO manual click (REL-07 confirmed live)

When all boxes are checked, return to the GSD checkpoint with "approved".
