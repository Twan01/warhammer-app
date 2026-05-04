---
phase: 260504-lhf-the-shortcut-isn-t-working-anymore
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src-tauri/target/release/hobbyforge-scaffold.exe
autonomous: false
requirements:
  - SHORTCUT-FIX-01
user_setup: []

must_haves:
  truths:
    - "Double-clicking C:/Users/antoi/OneDrive/Bureau/HobbyForge.lnk launches the app without panic"
    - "The release exe at src-tauri/target/release/hobbyforge-scaffold.exe is rebuilt from current source (lib.rs with migrations 1-8 hobbyforge.db + 1-2 rules.db)"
    - "App startup does NOT crash with PluginInitialization('sql', 'migration 7 was previously applied but is missing in the resolved migrations')"
    - "The main window opens and the Dashboard route renders"
  artifacts:
    - path: "src-tauri/target/release/hobbyforge-scaffold.exe"
      provides: "Rebuilt release binary aligned with current migration list"
  key_links:
    - from: "HobbyForge.lnk (desktop shortcut)"
      to: "src-tauri/target/release/hobbyforge-scaffold.exe"
      via: "Windows shortcut target path (already correct — no change needed)"
      pattern: "target/release/hobbyforge-scaffold.exe"
    - from: "src-tauri/src/lib.rs (current working tree)"
      to: "rebuilt hobbyforge-scaffold.exe"
      via: "pnpm tauri build compilation"
      pattern: "get_migrations.*Migration.*version: 8"
---

<objective>
Rebuild the release executable from the current source so the desktop shortcut works again.

Purpose: The shortcut points at a stale exe (built 10:04 AM, before migration 7 was committed at 10:39 AM). Dev server has since applied migrations 7 and 8 to `hobbyforge.db`, so the stale exe panics on startup with `PluginInitialization("sql", "migration 7 was previously applied but is missing in the resolved migrations")`. Rebuilding from the current source (which already declares migrations 1-8) realigns the exe with the DB state.

Output: Fresh `src-tauri/target/release/hobbyforge-scaffold.exe` that launches successfully via the existing desktop shortcut.

Scope: NO source code changes. NO migration file changes. NO shortcut changes. Pure rebuild + verification.
</objective>

<execution_context>
@C:/Users/antoi/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/antoi/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

<diagnosis>
Root cause already established by user:
- Desktop shortcut: `C:\Users\antoi\OneDrive\Bureau\HobbyForge.lnk` → `src-tauri\target\release\hobbyforge-scaffold.exe`
- Stale exe (built 10:04 AM today) only knows migrations 1-6 for `hobbyforge.db`
- Commit `474eeec` (10:39 AM today) added migration 7 to `get_migrations()`
- Dev server (`pnpm tauri dev`) at 15:39 compiled with full migration list (1-8) and applied them to `hobbyforge.db`
- Result: live DB has migrations 7 and 8 applied; stale exe sees them in `__migrations` table but not in its own resolved list → `PluginInitialization` panic
- Fix: `pnpm tauri build` recompiles the exe from current source so its migration list matches the DB

Current working tree (already correct, do NOT modify):
- `src-tauri/src/lib.rs` — declares migrations 1-8 for hobbyforge.db, 1-2 for rules.db, full `bulk_sync_rules` command
- `src-tauri/migrations/rules_002_wargear_abilities.sql` — new file, referenced via `include_str!`
- These compiled successfully under `pnpm tauri dev` at 15:39 → known good source

Panic stack (from user):
```
thread 'main' panicked at src\lib.rs:70:10:
error while running tauri application: PluginInitialization("sql", "migration 7 was previously applied but is missing in the resolved migrations")
```

Where exe lives: `src-tauri/target/release/hobbyforge-scaffold.exe`
Where shortcut lives: `C:/Users/antoi/OneDrive/Bureau/HobbyForge.lnk`
Shortcut target: already correct — points at the exe path above.
</diagnosis>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rebuild the release executable</name>
  <files>src-tauri/target/release/hobbyforge-scaffold.exe</files>
  <action>
Run a full Tauri production build from the project root to recompile `hobbyforge-scaffold.exe` against the current `src-tauri/src/lib.rs` (which declares migrations 1-8 for hobbyforge.db and 1-2 for rules.db).

Steps:
1. Confirm working directory is `C:/Documents/Claude Apps/Warhammer App` (project root with package.json).
2. Confirm no `pnpm tauri dev` instance is currently running — a dev process would lock the exe and cause the build to fail with a "file in use" error. If running, ask the user to stop it.
3. Run: `pnpm tauri build`
   - This first runs `pnpm build` (TypeScript check + Vite build) per package.json `tauri.beforeBuildCommand`, then compiles the Rust binary in release mode.
   - Expected duration: 3-8 minutes for a clean release build (Rust release compilation is slow); incremental rebuild may be faster.
   - Use a long timeout (600000 ms / 10 minutes) on the Bash call. Consider `run_in_background: true` and monitor.
4. On completion, verify:
   - The command exited with code 0.
   - `src-tauri/target/release/hobbyforge-scaffold.exe` exists and its `LastWriteTime` is from the current build (newer than the 10:04 AM stale build).
   - Bundle artifacts under `src-tauri/target/release/bundle/` (msi/nsis) were also produced — these are the installer artifacts; not needed for shortcut to work, but their presence confirms a complete build.

Why `pnpm tauri build` and not `cargo build --release` directly:
- `pnpm tauri build` runs the frontend build first (Vite produces `dist/` which Tauri embeds via `frontendDist` config). A bare `cargo build --release` would bundle a stale or empty frontend.
- Tauri CLI also handles signing, icon embedding, and bundle generation in one pass.

Do NOT:
- Modify any source file (lib.rs, migration .sql files, Cargo.toml, package.json).
- Edit, recreate, or repoint the desktop shortcut — its target path is already correct.
- Run `cargo clean` first — incremental builds are faster and the build artifacts are not stale at the source level (only the final exe is stale).
- Use `pnpm tauri dev` as a "fix" — dev mode produces a debug exe in `target/debug/` which is not where the shortcut points.

Edge case: if the build fails because the exe is locked by a running app instance, kill `hobbyforge-scaffold.exe` from Task Manager (or via `taskkill /F /IM hobbyforge-scaffold.exe` in PowerShell) and re-run.
  </action>
  <verify>
    <automated>powershell -Command "if (Test-Path 'src-tauri/target/release/hobbyforge-scaffold.exe') { (Get-Item 'src-tauri/target/release/hobbyforge-scaffold.exe').LastWriteTime } else { Write-Error 'exe missing' }"</automated>
  </verify>
  <done>
`pnpm tauri build` completed with exit code 0. `src-tauri/target/release/hobbyforge-scaffold.exe` exists with a `LastWriteTime` matching the current build session (clearly newer than the 10:04 AM stale build). No source files were modified by this task.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Verify the desktop shortcut launches the app</name>
  <what-built>
A freshly compiled `hobbyforge-scaffold.exe` in `src-tauri/target/release/` that includes migrations 1-8 for hobbyforge.db and 1-2 for rules.db — matching the migrations already applied to the live `hobbyforge.db` by the dev server.
  </what-built>
  <how-to-verify>
1. Make sure no `pnpm tauri dev` instance and no other HobbyForge window is running (the build's exe must be the one launched).
2. Double-click the desktop shortcut: `C:\Users\antoi\OneDrive\Bureau\HobbyForge.lnk`
3. Expected: a HobbyForge window opens within ~2-5 seconds. The Dashboard route renders. No panic dialog appears.
4. Specifically confirm there is NO error popup containing the text:
   `PluginInitialization("sql", "migration 7 was previously applied but is missing in the resolved migrations")`
5. Quick smoke test (optional but recommended): click into the Collection page, then the Dashboard page. Both should render without runtime errors. This confirms the rebuilt exe can read the DB that the dev server has been writing to.
6. If the window opens and renders, the fix is confirmed and the shortcut is working again.

If the panic still appears:
- Inspect the panic message — if it references a different migration number, capture the exact text.
- Check `src-tauri/target/release/hobbyforge-scaffold.exe` `LastWriteTime` — if it's still the 10:04 AM stamp, the build did not actually replace the exe (file lock during build).
- Report findings; do NOT delete `hobbyforge.db` as a workaround — the root cause is the exe, not the DB.
  </how-to-verify>
  <resume-signal>Type "approved" once the app launches via the shortcut without panic, or describe any error you see (exact text of any popup helps).</resume-signal>
</task>

</tasks>

<verification>
- Build artifact: `src-tauri/target/release/hobbyforge-scaffold.exe` `LastWriteTime` is from the current session.
- Runtime: shortcut launches the app without `PluginInitialization` panic.
- Source integrity: `git status` shows no new modifications introduced by this plan beyond the build output (build output is gitignored under `target/`).
</verification>

<success_criteria>
- [ ] `pnpm tauri build` completed successfully (exit code 0).
- [ ] `src-tauri/target/release/hobbyforge-scaffold.exe` rebuilt with current timestamp.
- [ ] Desktop shortcut launches the app without crashing.
- [ ] No source files modified by this plan.
- [ ] User confirms (Task 2 checkpoint) the app loads and the Dashboard renders.
</success_criteria>

<output>
After completion, create `.planning/quick/260504-lhf-the-shortcut-isn-t-working-anymore/260504-lhf-SUMMARY.md` documenting:
- Final build duration
- Old vs new exe LastWriteTime
- Confirmation that no source files were touched
- User's verification result
</output>
