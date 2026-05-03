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
  duration_minutes: 2
  completed_date: "2026-05-03"
  tasks_completed: 2
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

Awaiting user verification (Task 3 checkpoint). User has not yet confirmed whether the shortcut was created and whether the icon applied correctly.

## Known Quirk: Icon Cache

If the Desktop shortcut shows a generic `.bat` icon rather than the HobbyForge icon, right-click Desktop → Refresh. Windows icon cache sometimes needs a nudge after new `.lnk` files are created.

## Important: Keeping the Launcher Up to Date

`launch.bat` uses the **prebuilt exe** at `src-tauri\target\release\hobbyforge-scaffold.exe`. After any code change that should be reflected in the production launch:

```
pnpm tauri build
```

This refreshes the exe. Until you rebuild, `launch.bat` will keep launching the old binary. Alternatively, delete the exe to force an automatic rebuild on next double-click (the fallback branch triggers).

`launch-dev.bat` always reflects the latest code because `pnpm tauri dev` compiles on start.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All expected files present on disk. Both task commits confirmed in git history:
- `15c4b23` — feat(quick-260503-g7p-01): add production and dev bat launchers
- `4bfdb04` — feat(quick-260503-g7p-01): add desktop shortcut creator and document launcher overrides in gitignore

Pending: Task 3 (manual smoke test checkpoint) awaiting user verification.
