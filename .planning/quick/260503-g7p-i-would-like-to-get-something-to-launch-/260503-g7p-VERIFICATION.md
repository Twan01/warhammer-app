---
phase: quick-260503-g7p
verified: 2026-05-03T12:10:00Z
status: human_needed
score: 4/5 must-haves verified
human_verification:
  - test: "Double-click launch.bat — HobbyForge window opens"
    expected: "HobbyForge app opens within ~3 seconds, cmd window closes/detaches"
    why_human: "Cannot invoke GUI app from verification shell; requires desktop interaction"
  - test: "Double-click HobbyForge Desktop shortcut — app opens with correct icon"
    expected: "App opens, shortcut shows HobbyForge icon (not generic .bat icon)"
    why_human: "Icon rendering and shortcut wiring require visual + desktop interaction"
---

# Quick Task 260503-g7p: Launcher Verification Report

**Task Goal:** Give the user a frictionless, no-terminal way to launch HobbyForge on Windows 11.
**Verified:** 2026-05-03T12:10:00Z
**Status:** human_needed (all automated checks pass; 2 items require human smoke test)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can double-click `launch.bat` and HobbyForge opens (~3 sec, no terminal interaction) | ? HUMAN | File exists, wiring correct, exe exists — cannot invoke GUI from verifier |
| 2 | `launch.bat` auto-builds via `pnpm tauri build` if `.exe` is missing | VERIFIED | `if exist "%EXE%"` branch + `pnpm tauri build` fallback at lines 6–48 |
| 3 | User can double-click `launch-dev.bat` for dev server with hot reload | VERIFIED | `%PNPM_CMD% tauri dev` at line 14; `cd /d %~dp0` at line 2 |
| 4 | `scripts/create-desktop-shortcut.ps1` creates a Desktop shortcut with app icon | VERIFIED | Shortcut confirmed at `C:\Users\antoi\OneDrive\Bureau\HobbyForge.lnk` (1930 bytes, created 2026-05-03) |
| 5 | Both `.bat` files use `%~dp0` absolute-path resolution | VERIFIED | `%~dp0` present in both `launch.bat` (line 4) and `launch-dev.bat` (line 2) |

**Score:** 4/5 automated truths verified (truth #1 needs human confirmation)

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `launch.bat` | VERIFIED | 49 lines; contains `hobbyforge-scaffold.exe`, `pnpm tauri build`, `start ""`, `%~dp0` |
| `launch-dev.bat` | VERIFIED | 15 lines; contains `tauri dev` (via `%PNPM_CMD%`), `%~dp0`, banner message, `pause` |
| `scripts/create-desktop-shortcut.ps1` | VERIFIED | 25 lines; `WScript.Shell`, `TargetPath`, `IconLocation`, `launch.bat`, `icon.ico` all present |
| `.gitignore` update | VERIFIED | Line 29: `# launch-local.bat` comment block present |
| `src-tauri\icons\icon.ico` | VERIFIED | Exists at expected path for shortcut icon |
| `src-tauri\target\release\hobbyforge-scaffold.exe` | VERIFIED | Exists — prebuilt exe is present, immediate launch is available |

---

## Key Link Verification

| From | To | Via | Status | Notes |
|------|----|-----|--------|-------|
| `launch.bat` | `hobbyforge-scaffold.exe` | `%~dp0src-tauri\target\release\...` | VERIFIED | Pattern `src-tauri.*target.*release.*hobbyforge-scaffold\.exe` matches line 4 |
| `launch.bat` | `pnpm tauri build` | if-not-exist fallback | VERIFIED | `pnpm tauri build` at line 36; fallback branch lines 12–48 |
| `launch-dev.bat` | `pnpm tauri dev` | `%PNPM_CMD% tauri dev` | VERIFIED | Uses indirection variable for pnpm discovery; `tauri dev` literal present |
| `scripts/create-desktop-shortcut.ps1` | `launch.bat` | `$target = Join-Path $repoRoot 'launch.bat'` then `$shortcut.TargetPath = $target` | VERIFIED | Variable indirection — functionally correct |
| `scripts/create-desktop-shortcut.ps1` | `src-tauri\icons\icon.ico` | `$icon = Join-Path $repoRoot 'src-tauri\icons\icon.ico'` then `$shortcut.IconLocation = $icon` | VERIFIED | Variable indirection — functionally correct; icon.ico confirmed on disk |

Note: Two key-link patterns in the PLAN used literal-string matching (`TargetPath.*launch\.bat`, `IconLocation.*icon\.ico`) that do not match because the ps1 uses variable indirection. This is a pattern-specificity issue in the plan, not a functional defect. The wiring is correct.

---

## Desktop Shortcut Note

The shortcut was confirmed present at `C:\Users\antoi\OneDrive\Bureau\HobbyForge.lnk` (1930 bytes). The desktop path resolves to OneDrive\Bureau due to French locale + OneDrive folder redirection — the PowerShell script correctly uses `[Environment]::GetFolderPath('Desktop')` which resolves this automatically. A naive path check against `C:\Users\antoi\Desktop\` would show false-negative.

---

## Release Exe Status

`src-tauri\target\release\hobbyforge-scaffold.exe` is present on disk. The note about "release exe does not yet exist" in the verification prompt does not reflect current state — the exe exists. `launch.bat` will take the fast path (direct launch, no build required).

---

## Anti-Patterns Found

None. No TODOs, placeholders, empty handlers, or console.log stubs in any of the three files.

---

## Human Verification Required

### 1. Double-click production launch

**Test:** Navigate to `C:\Documents\Claude Apps\Warhammer App\` in File Explorer, double-click `launch.bat`.
**Expected:** HobbyForge window opens within ~3 seconds. The cmd window should close (detached via `start ""`). App shows dashboard with faction summary cards.
**Why human:** Cannot invoke a GUI application from within the verification shell environment.

### 2. Desktop shortcut icon and launch

**Test:** Go to the Desktop (or `C:\Users\antoi\OneDrive\Bureau\`), find `HobbyForge.lnk`, and check its icon. Double-click it.
**Expected:** Shortcut shows the HobbyForge app icon (not a generic .bat icon). App opens correctly when double-clicked.
**Why human:** Icon rendering and visual confirmation require human inspection. Shortcut file exists and was created 2026-05-03 with correct `$shortcut.IconLocation` set.

---

## Summary

All launcher files are in place, substantive, and correctly wired:

- `launch.bat` — production launcher with exe fast-path and `pnpm tauri build` fallback, both present and correctly referencing `hobbyforge-scaffold.exe` via `%~dp0`
- `launch-dev.bat` — dev launcher running `pnpm tauri dev` with pnpm-path discovery for File Explorer invocation
- `scripts/create-desktop-shortcut.ps1` — creates `.lnk` via `WScript.Shell` COM with correct `TargetPath`, `WorkingDirectory`, and `IconLocation`
- Desktop shortcut confirmed present at the system-resolved Desktop path
- `.gitignore` updated with user-local launcher comment block
- Prebuilt exe confirmed present — first launch will be immediate, no build wait

The only remaining items are human smoke tests: confirming the GUI window actually appears on double-click, and that the shortcut icon renders correctly (not a generic .bat icon).

---

_Verified: 2026-05-03T12:10:00Z_
_Verifier: Claude (gsd-verifier)_
