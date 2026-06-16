---
phase: 132-update-trustworthiness
plan: "03"
subsystem: updater-tooling
tags: [REL-06, local-update, nsis, runbook, config-safety]
dependency_graph:
  requires: [132-01, 132-02]
  provides: [REL-06-tooling, REL-06-runbook]
  affects: [src-tauri/local-update.json, scripts/make-local-update.mjs, scripts/serve-local-update.mjs, .gitignore, VERIFICATION.md]
tech_stack:
  added: []
  patterns: [node-esm-script, node-http-static-server, tauri-build-config-override, deep-merge-config-safety]
key_files:
  created:
    - scripts/make-local-update.mjs
    - scripts/serve-local-update.mjs
    - src-tauri/local-update.json
    - .planning/phases/132-update-trustworthiness/VERIFICATION.md
  modified:
    - .gitignore
decisions:
  - D-03 satisfied: tauri.conf.json untouched; local-update.json is the throwaway --config override
  - Node built-in node:http used for static server (no npx serve dependency)
  - Throwaway signing key branch documented alongside production key branch
  - rust-toolchain.toml pin blocker documented in VERIFICATION.md
metrics:
  duration: "~18 minutes"
  completed: "2026-06-16"
  tasks_completed: 2
  tasks_total: 3
  files_created: 4
  files_modified: 1
---

# Phase 132 Plan 03: Local Update Tooling & REL-06 Runbook Summary

**One-liner:** Config-safe local two-build NSIS update tooling (`tauri build --config` deep-merge) plus a documented REL-06 runbook with three blank evidence slots awaiting human execution.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Local-update tooling — make/serve scripts + local-update.json + gitignore | 77d2cd33 | scripts/make-local-update.mjs, scripts/serve-local-update.mjs, src-tauri/local-update.json, .gitignore |
| 2 | VERIFICATION.md runbook scaffold (REL-06 evidence template) | 2ac0bcc6 | .planning/phases/132-update-trustworthiness/VERIFICATION.md |

## Pending (Human Checkpoint)

| # | Name | Type | Status |
|---|------|------|--------|
| 3 | Manual REL-06 verification — capture two-build NSIS update evidence | checkpoint:human-verify | BLOCKED — awaiting human execution |

## What Was Delivered

### scripts/make-local-update.mjs

Node ESM script (check-version.mjs style) that:
- Reads the app version from `src-tauri/tauri.conf.json`
- Locates `*-setup.exe` and `*-setup.exe.sig` in `src-tauri/target/release/bundle/nsis/`
- Reads the ENTIRE `.sig` file — that IS the `signature` value in `latest.json` (no re-signing)
- Emits `latest.json` at the repo root with `platforms.windows-x86_64.{signature, url}` pointing at `http://localhost:5183/...`
- Prints next-step instructions; exits 0/1

### scripts/serve-local-update.mjs

Node built-in `node:http` static server (no `npx serve`) that:
- Serves `latest.json` from the repo root and `*-setup.exe` from the NSIS bundle dir
- Supports `Range` requests (needed for large `.exe` downloads)
- Defaults to port 5183 (configurable via `--port`)
- Listens on `127.0.0.1` only
- Handles path-traversal safely (resolves candidate paths under bundleDir, rejects `..` and null bytes)

### src-tauri/local-update.json

Throwaway `--config` override template:
- `endpoints: ["http://localhost:5183/latest.json"]`
- `dangerousInsecureTransportProtocol: true`
- `pubkey: "<<<throwaway placeholder>>>"` — human replaces this with output of `pnpm tauri signer generate`
- `windows.installMode: "passive"` (explicit)

Used via: `pnpm tauri build --config src-tauri/local-update.json`
This deep-merges over `tauri.conf.json` without ever editing it (D-03).

### .gitignore additions

```
throwaway.key
throwaway.key.pub
/latest.json
*-setup.exe
*.sig
```

Keeps the throwaway private key, generated setup.exe artifacts, and the root-level `latest.json` out of version control. The committed `src-tauri/local-update.json` template itself is NOT gitignored (it carries placeholder values only and is a reusable scaffold).

### .planning/phases/132-update-trustworthiness/VERIFICATION.md

Complete REL-06 runbook with:
1. Prerequisites: rust-toolchain blocker note + signing-key branch (Option A: prod key local; Option B: throwaway)
2. Eight step-by-step procedure steps from build-vN through evidence capture
3. Three blank evidence slots (D-02):
   - Evidence A: app reports vN+1
   - Evidence B: pre-existing DB rows survive
   - Evidence C: preflight.log repair/consistency line
4. Config-safety check step: `git diff --exit-code src-tauri/tauri.conf.json`
5. Known boundaries: pre-JS WebView2 crash coverage, Windows auto-exit behavior, signature verification troubleshooting

## Deviations from Plan

### Auto-fixed Issues

None.

### Notes

- The `tauri.conf.json` updater block already had `windows.installMode: "passive"` explicitly set (per prior plan execution) — no change needed, D-03 already satisfied.
- The `_comment` key in `local-update.json` is a non-standard but harmless way to embed a warning; Tauri's deep-merge ignores unknown top-level keys.

## Known Blocker (must resolve before human checkpoint)

`rust-toolchain.toml` pins Rust 1.87.0 but the Cargo.lock dependency tree requires rustc 1.88.0+. `pnpm tauri build` currently fails under the pin. The VERIFICATION.md documents this: bump `rust-toolchain.toml` to `channel = "1.88.0"` (or `"stable"`) and re-green CI before performing the two-build test.

## Known Stubs

None — the tooling scripts are complete; the only intentional blanks are the three evidence slots in VERIFICATION.md (by design, awaiting human execution).

## Threat Flags

None found beyond what the plan's threat model already covers (T-132-08, T-132-09, T-132-10, T-132-SC). The local-update.json carries a placeholder pubkey only; the production pubkey in tauri.conf.json is untouched.

## Self-Check: PASSED

- [x] scripts/make-local-update.mjs exists and passes `node --check`
- [x] scripts/serve-local-update.mjs exists and passes `node --check`
- [x] src-tauri/local-update.json is valid JSON with localhost endpoint + dangerousInsecureTransportProtocol: true
- [x] .planning/phases/132-update-trustworthiness/VERIFICATION.md exists with 27 keyword matches
- [x] git diff --exit-code src-tauri/tauri.conf.json exits 0 (D-03 satisfied)
- [x] Commits 77d2cd33 and 2ac0bcc6 exist in git log
- [x] Task 3 (human checkpoint) NOT fabricated — returned as CHECKPOINT REACHED
