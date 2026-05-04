---
phase: 260504-lhf-the-shortcut-isn-t-working-anymore
plan: "01"
type: quick-task
tags: [build, release, hotfix]
key-files:
  modified:
    - src-tauri/target/release/hobbyforge-scaffold.exe
decisions:
  - "No source changes required — pure rebuild to realign exe migration list with live DB"
  - "Running dev process (target/debug/) does not lock release exe — build proceeded without killing it"
metrics:
  duration: "~7 minutes (1m 45s Rust compile, rest frontend + bundle)"
  completed: "2026-05-04T15:55:25"
  tasks_completed: 1
  tasks_total: 2
  files_changed: 1
---

# Quick Task 260504-lhf: The Shortcut Isn't Working Anymore — Summary

**One-liner:** Rebuilt release exe (migration list 1-8) to fix PluginInitialization panic caused by stale 10:04 AM binary conflicting with migrations 7-8 applied by dev server at 15:39.

## What Was Done

Task 1 only (Task 2 is a human-verify checkpoint — awaiting user confirmation).

### Task 1: Rebuild the release executable — COMPLETE

Ran `pnpm tauri build` from project root. Build completed successfully with exit code 0.

**Build timeline:**
- Frontend (TypeScript check + Vite build): ~12 seconds
- Rust release compilation (incremental): ~1 minute 45 seconds
- Bundle (MSI + NSIS installer): ~1 minute

**Exe before rebuild:**
- Path: `src-tauri/target/release/hobbyforge-scaffold.exe`
- LastWriteTime: **2026-05-04 10:04:20** (stale — built before migrations 7+8 were committed)

**Exe after rebuild:**
- LastWriteTime: **2026-05-04 15:55:25** (fresh — includes migrations 1-8 for hobbyforge.db, 1-2 for rules.db)

**Bundle artifacts confirmed:**
- `src-tauri/target/release/bundle/msi/HobbyForge_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/HobbyForge_0.1.0_x64-setup.exe`

## Root Cause (Pre-diagnosed)

Stale exe (10:04 AM) only declared migrations 1-6. Commit `474eeec` (10:39 AM) added migration 7 to `get_migrations()`. Dev server at 15:39 applied migrations 7 and 8 to `hobbyforge.db`. The `__migrations` table recorded them as applied, but the stale exe didn't include them in its own resolved list — triggering:

```
PluginInitialization("sql", "migration 7 was previously applied but is missing in the resolved migrations")
```

## Source Integrity

No source files were modified by this plan. Pre-existing working-tree modifications (datasheets.ts, lib.rs, etc.) are unchanged — those are from prior work, not from this build task.

## Running Process Note

A `hobbyforge-scaffold` process (PID 32572) was running at build time. It was the **debug** build (`target/debug/`) from `pnpm tauri dev` at 15:39 — not the release exe. The release exe was not locked, so the build proceeded without interruption.

## Task 2 — Pending Human Verification

The user needs to:
1. Double-click `C:\Users\antoi\OneDrive\Bureau\HobbyForge.lnk`
2. Confirm the app opens without the PluginInitialization panic
3. Confirm the Dashboard renders

## Deviations from Plan

None. Plan executed exactly as written. Pure rebuild, no source changes.

## Self-Check

- [x] `src-tauri/target/release/hobbyforge-scaffold.exe` exists with timestamp 2026-05-04 15:55:25
- [x] Bundle artifacts exist (MSI + NSIS)
- [x] No source files modified by this plan
- [x] Build exit code: 0
