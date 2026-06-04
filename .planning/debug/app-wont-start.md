---
status: investigating
trigger: "App won't start - window never appears after v0.4.3 shipped"
created: 2026-06-01T12:00:00Z
updated: 2026-06-01T12:00:00Z
---

## Current Focus

hypothesis: Multiple concurrent causes — (1) block_on in setup hook can deadlock with Tauri runtime under certain conditions, (2) corrupted WebView2 cache, (3) stale user_version=40 vs expected=41
test: Examined code changes, DB state, WebView2 cache, process list
expecting: Code-level fix for block_on + cache clearing instructions
next_action: Report findings and propose fix

## Symptoms

expected: App window appears after double-clicking icon
actual: No window appears, app seems to hang/crash silently
errors: Unknown - no visible error
reproduction: Double-click app icon
started: After shipping v0.4.3 (code simplification refactor + French translations)

## Eliminated

- hypothesis: H1 - useUnitPhotos.ts lazy singleton caches rejection and blocks startup
  evidence: The lazy singleton is only called from React Query queryFn callbacks, never at module load time. Cannot block window creation.
  timestamp: 2026-06-01T12:15:00Z

- hypothesis: v0.4.3 code changes caused the issue
  evidence: git diff shows only frontend refactoring, French translations, FTS5 SQL tweak. No Cargo.lock changes. No Rust behavioral changes.
  timestamp: 2026-06-01T12:10:00Z

- hypothesis: user_version mismatch (40 vs 41) prevents window
  evidence: DbHealthGate shows diagnostic screen on mismatch, does NOT prevent Tauri window from appearing
  timestamp: 2026-06-01T12:20:00Z

## Evidence

- timestamp: 2026-06-01T12:10:00Z
  checked: v0.4.3 code diff (44d8451..f94d231)
  found: Only frontend refactoring, French translations, FTS5 SQL tweak. No Cargo.lock changes. No Rust behavioral changes.
  implication: v0.4.3 code changes cannot cause "window won't appear"

- timestamp: 2026-06-01T12:15:00Z
  checked: useUnitPhotos.ts lazy singleton
  found: Missing .catch() reset (unlike client.ts), but only called from React Query queryFn, not at module load
  implication: Cannot block app startup. Low severity - only affects photo loading after rejection

- timestamp: 2026-06-01T12:20:00Z
  checked: hobbyforge.db PRAGMA user_version
  found: user_version=40 but EXPECTED_SCHEMA_VERSION=41
  implication: DbHealthGate would show diagnostic screen, NOT prevent window creation. Indicates incomplete startup last time.

- timestamp: 2026-06-01T12:25:00Z
  checked: WebView2 cache at %LOCALAPPDATA%\com.hobbyforge.app\EBWebView
  found: 135MB cache exists
  implication: Corrupted cache is a known Tauri Windows issue causing window not to appear

- timestamp: 2026-06-01T12:30:00Z
  checked: Rust setup hook in lib.rs
  found: block_on(import_unit_database_inner) runs synchronously during setup, blocking main thread. Uses sqlx with busy_timeout=30s. If DB locked by stale process, hangs for 30s+ with no window.
  implication: Primary suspect for "window never appears" - main thread blocked during window creation

- timestamp: 2026-06-01T12:35:00Z
  checked: hobbyforge.db.broken file exists
  found: Previous DB corruption event occurred
  implication: Confirms history of startup issues

- timestamp: 2026-06-01T12:40:00Z
  checked: TypeScript build and Vite build
  found: Both compile clean with no errors
  implication: Frontend code is valid

## Resolution

root_cause: Two concurrent issues. PRIMARY: tauri::async_runtime::block_on(import_unit_database_inner) in the setup hook blocks the main thread before the window is created. If the DB is locked by a stale process or the sqlx connection takes time, the window never appears (hangs for 30s+ on busy_timeout). SECONDARY: Corrupted WebView2 cache at %LOCALAPPDATA%\com.hobbyforge.app\EBWebView\ (135MB) can independently prevent window creation. Both are recurring environmental issues, not caused by v0.4.3 code changes.
fix: (1) Replace block_on with tauri::async_runtime::spawn in setup hook so window appears immediately, (2) Clear WebView2 cache, (3) Fix user_version sync (currently 40, expected 41)
verification:
files_changed: []
