---
phase: quick-260503-g7p
plan: "01"
subsystem: launcher
tags: [launcher, windows, bat, powershell, desktop-shortcut, ux]
dependency_graph:
  requires: []
  provides: [double-click-launcher, desktop-shortcut]
  affects: []
tech_stack:
  added: []
  patterns: [Windows batch %~dp0 path resolution, WScript.Shell COM shortcut]
key_files:
  created:
    - launch.bat
    - launch-dev.bat
    - scripts/create-desktop-shortcut.ps1
  modified:
    - .gitignore
decisions:
  - "Used start \"\" \"%EXE%\" in launch.bat to detach exe from cmd window — direct invocation would block cmd until app closes"
  - "launch.bat falls back to pnpm tauri build (not tauri dev) — production launch needs a built exe, not a Vite+Cargo dev server"
  - "Desktop shortcut uses WScript.Shell COM in PowerShell (not a .bat) — .lnk file creation requires COM, awkward in pure cmd"
  - ".gitignore block left commented-out — canonical launchers are checked in; block documents optional personal variant pattern"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-03"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 1
---

# Quick Task 260503-g7p: No-Terminal Launcher Summary

**One-liner:** Windows batch launchers + PowerShell shortcut creator giving HobbyForge a double-click production launch path without any new dependencies.

## What Was Built

### launch.bat — production launcher

Double-click this from File Explorer (or via Desktop shortcut) to launch HobbyForge instantly.

- Resolves all paths via `%~dp0` so it works no matter where the cmd window's cwd is
- Checks for `src-tauri\target\release\hobbyforge-scaffold.exe`; if found, detaches it with `start "" "%EXE%"` and exits immediately (no lingering cmd window)
- If the exe is missing, prints "HobbyForge isn't built yet — building now..." and runs `pnpm tauri build`, then launches
- If pnpm isn't on PATH, prints a clear error and pauses so the user can read it

### launch-dev.bat — dev launcher

Double-click for hot-reload development sessions.

- `cd /d %~dp0` to set cwd to repo root before invoking pnpm
- Streams `pnpm tauri dev` output so compile errors are visible
- `pause` at the end keeps the window open if the dev server crashes

### scripts/create-desktop-shortcut.ps1 — one-time shortcut creator

Run once to pin a `HobbyForge.lnk` shortcut on the Windows Desktop.

- `$repoRoot = Split-Path -Parent $PSScriptRoot` for portable path resolution
- Creates `.lnk` via `WScript.Shell` COM with `TargetPath = launch.bat`, `WorkingDirectory = $repoRoot`, `IconLocation = src-tauri\icons\icon.ico`
- Validates `launch.bat` exists before proceeding; fails cleanly with `Write-Error` if not
- Invoke with: `powershell -ExecutionPolicy Bypass -File scripts\create-desktop-shortcut.ps1`

### .gitignore — user-local override documentation

Added commented-out block documenting that users can create `launch-local.bat` / `launch-dev-local.bat` personal variants without affecting git. The canonical launchers remain tracked.

## Desktop Shortcut Status

Complete. Shortcut created successfully at `C:\Users\antoi\OneDrive\Bureau\HobbyForge.lnk`.

## Known Quirk: Icon Cache

If the Desktop shortcut shows a generic `.bat` icon rather than the HobbyForge icon, right-click Desktop → Refresh. Windows icon cache sometimes needs a nudge after new `.lnk` files are created.

## Important: Keeping the Launcher Up to Date

`launch.bat` uses the **prebuilt exe** at `src-tauri\target\release\hobbyforge-scaffold.exe`. After any code change that should be reflected in the production launch:

```
pnpm tauri build
```

This refreshes the exe. Until you rebuild, `launch.bat` will keep launching the old binary. Alternatively, delete the exe to force an automatic rebuild on next double-click (the fallback branch triggers).

`launch-dev.bat` always reflects the latest code because `pnpm tauri dev` compiles on start.

## pnpm PATH Issue: Discovered and Fixed During Smoke Test

**Found during:** Task 3 manual smoke test (human checkpoint)

**Issue:** When `launch.bat` is invoked from File Explorer (double-click or Desktop shortcut), Windows launches it in a context where the user's PATH does not include pnpm. pnpm is installed via Node and added to PATH during terminal sessions, but that PATH population does not occur in the File Explorer shell context. As a result, `launch.bat` silently failed — the `where pnpm` check returned errorlevel 1, which triggered the "pnpm not found" error path even though pnpm was installed.

Additionally, the release exe did not yet exist (no `pnpm tauri build` had been run), so the fallback build path was the only execution route — compounding the PATH problem.

**Fix applied (commit 03009ad):** Both `launch.bat` and `launch-dev.bat` were updated to probe two common pnpm install locations before reporting "not found":
1. `%APPDATA%\npm\pnpm.cmd` (npm global install path)
2. `%LOCALAPPDATA%\pnpm\pnpm.cmd` (pnpm standalone install path)

If either exists, `PNPM_CMD` is set to the absolute path so pnpm works regardless of PATH. The `where pnpm` check is now a preliminary probe; the resolved absolute path is used for all actual invocations.

**Files modified:** `launch.bat`, `launch-dev.bat`

**Commit:** `03009ad`

**Status:** Full production launch will be confirmed after the first `pnpm tauri build` completes and the exe exists at `src-tauri\target\release\hobbyforge-scaffold.exe`. The PATH resolution fix means both launchers will work correctly in File Explorer context.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pnpm not on PATH when launched from File Explorer**
- **Found during:** Task 3 (human smoke test checkpoint)
- **Issue:** File Explorer does not inherit the terminal PATH where pnpm is registered; launchers silently failed with "pnpm not found" even though pnpm was installed
- **Fix:** Both bat files now probe `%APPDATA%\npm\pnpm.cmd` and `%LOCALAPPDATA%\pnpm\pnpm.cmd` as fallback absolute paths before reporting failure
- **Files modified:** `launch.bat`, `launch-dev.bat`
- **Commit:** `03009ad`

## Self-Check: PASSED

All expected files present on disk. All three task commits confirmed in git history:
- `15c4b23` — feat(quick-260503-g7p-01): add production and dev bat launchers
- `4bfdb04` — feat(quick-260503-g7p-01): add desktop shortcut creator and document launcher overrides in gitignore
- `03009ad` — fix(launcher): handle pnpm not on PATH when launched from File Explorer

Desktop shortcut confirmed at `C:\Users\antoi\OneDrive\Bureau\HobbyForge.lnk`. Full end-to-end launch pending first `pnpm tauri build` to produce the exe.
