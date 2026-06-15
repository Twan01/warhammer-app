---
status: resolved
trigger: "Every time there is an update now, the installed app won't open anymore and I have to redownload manually the app from GitHub"
created: 2026-06-15T11:05:00Z
updated: 2026-06-15T13:05:00Z
---

## Current Focus

hypothesis: CONFIRMED — sqlx migration CHECKSUM MISMATCH caused by inconsistent CRLF/LF line endings in migration files (core.autocrlf=true, no .gitattributes). The user's hobbyforge.db has checksums computed from an older all-CRLF build; the current working tree has 8 CRLF + 39 LF migration files, so a new release embeds different bytes via include_str! → tauri-plugin-sql migrator computes a different SHA-384 → panics during plugin init → .run() aborts → NO WINDOW. Uninstall+reinstall deletes %APPDATA% DB so a fresh DB records checksums matching that build, which works until the NEXT build flips line endings again. preflight_migration_repair self-heals this on a clean run, but is fragile (swallows errors; depends on running before the plugin and on the embedded line endings being stable).

reasoning_checkpoint:
  hypothesis: "Migration file line endings are unstable across builds (core.autocrlf=true, no .gitattributes). include_str! embeds working-tree bytes, so each release may embed CRLF or LF per file. The user's DB stored SHA-384 checksums from an older all-CRLF build. When a new release embeds different (LF) bytes for the same migration version, tauri-plugin-sql's sqlx migrator detects a checksum mismatch and panics during plugin init, before the window is created — silent no-window failure."
  confirming_evidence:
    - "Production hobbyforge.db: 39 of 47 _sqlx_migrations checksums do NOT match SHA-384 of current on-disk file bytes; the 8 that match are exactly the 8 files with CRLF in the working tree (v12-17,33,38)."
    - "For all 39 mismatching migrations, the stored checksum DOES match the SHA-384 of the CRLF-converted content — proving the DB was written by an all-CRLF build."
    - "git ls-files --eol: index is LF for all, working tree is CRLF for 8 / LF for 39. core.autocrlf=true, no .gitattributes."
    - "Dev logs (tauri-dev-points-fix.log / v0.5.2-manual.log) show '[hobbyforge] migration checksum mismatch on 36 version(s): ... repairing' on cold start — the live repair path firing on exactly this issue."
    - "tauri-plugin-sql runs get_migrations() at plugin .build(); a sqlx VersionMismatch there panics and .run() aborts → no window (matches 'nothing happens, no window')."
  falsification_test: "If line endings were stable across builds, the stored checksums would match the embedded bytes and there would be no mismatch / no panic. The 39-mismatch / 8-match split aligning exactly with CRLF-vs-LF working-tree state would not occur by chance."
  fix_rationale: "Add a .gitattributes forcing migrations/*.sql (and ideally all *.sql) to LF, renormalize the working tree so include_str! always embeds LF, AND harden preflight_migration_repair to be authoritative (retry/busy-timeout, run guaranteed before plugin, never panic). This removes the per-build checksum instability at the source and makes the self-heal reliable for already-corrupted DBs."
  blind_spots: "Have not yet reproduced a real NSIS in-place update on this machine to time the repair vs old-process DB lock. Have not confirmed the CI/release build line-ending state (the actual shipped binaries may differ from local). Repair currently swallows connect errors silently — if the DB is locked at preflight, repair is skipped and the plugin still panics; need to confirm whether that lock path is plausible during update."

reasoning_checkpoint (fix phase):
  hypothesis: "CONFIRMED. Unstable CRLF/LF in src-tauri/migrations/*.sql (core.autocrlf=true, no .gitattributes) makes include_str! embed different bytes per build, so the installed DB's stored SHA-384 checksums diverge from a new release's embedded bytes → sqlx VersionMismatch panic at plugin init → no window."
  confirming_evidence:
    - "git ls-files --eol confirms index=LF for all 47 migrations but working tree=CRLF for exactly 8 (012-017, 033, 038) with attr/ empty (no .gitattributes governs them)."
    - "scripts/check-migrations.mjs: 39/47 stored checksums match CRLF content, 8 match LF — the DB was written by an all-CRLF build."
  falsification_test: "If .gitattributes forces LF + renormalize makes all 47 working-tree files LF, then git ls-files --eol must show w/lf for every migration and check-migrations.mjs must report no remaining CRLF-only matches after a heal."
  fix_rationale: "Two-pronged: (1) .gitattributes eol=lf + renormalize removes per-build byte instability at the source (prevents recurrence for all future installs/builds); (2) hardened preflight_migration_repair (busy_timeout, runs+persists before plugin, never panics, logs to file) heals the EXISTING corrupted installed base whose DBs already hold CRLF-era checksums."
  blind_spots: "Cannot run a real NSIS in-place update locally; that end-to-end verification is the user's step. Verifying repair logic via a simulated-corruption DB copy instead."

fix_action: Commit 1 — add .gitattributes (eol=lf for *.sql and src-tauri/migrations/**) + git add --renormalize. Commit 2 — harden preflight_migration_repair in lib.rs.
test: scripts/check-migrations.mjs realignment; simulated-corruption repair on a DB copy; pnpm build; cargo check
expecting: All migrations w/lf in working tree; repair heals deterministically; clean build + cargo check
next_action: Apply commit 2 — harden preflight_migration_repair (busy_timeout, runs+persists before plugin, never panics, file logging). check-migrations.mjs after LF-normalize shows ALL 47 prod-DB checksums now match CRLF / none match LF — the installed base needs the repair to heal all 47 before plugin init.

## Symptoms

expected: After installing an update, double-clicking the app opens it normally
actual: Nothing happens at all — no window, no error dialog
errors: None visible
reproduction: Install an app update over the existing installation, then launch
started: Recurring on every update ("now")
recurrence: A fresh manual download/reinstall from GitHub works fine until the NEXT update, then breaks again
update_flow: User reports "notification only" — installs the new version manually from GitHub Releases. Note: the Tauri updater plugin IS configured (endpoint: github.com/Twan01/warhammer-app/releases/latest/download/latest.json), so updates may also be applied in-place by the updater.

## Eliminated

- hypothesis: Stale EXPECTED_SCHEMA_VERSION=44 (vs 47) in DbHealthGate blocks the window
  evidence: DbHealthGate reads MAX(version) FROM _sqlx_migrations (47 on updated DBs) and requires >= 44, so the gate PASSES on updated installs. Even when it fails, it renders DbDiagnosticScreen — a window appears. Cannot cause a no-window failure. (Worth fixing for hygiene, not the cause.)
  timestamp: 2026-06-15T11:55:00Z

- hypothesis: A backfill migration (045/046) or 047 fails against a populated DB
  evidence: 045/046 are guarded conditional UPDATEs (WHERE ... IS NULL); 047 is CREATE TABLE IF NOT EXISTS — all idempotent and reference existing columns. Apply identically on fresh and populated DBs. Not the cause.
  timestamp: 2026-06-15T11:58:00Z

- hypothesis: Out-of-order migration numbering (038 listed after 039 on disk) causes a sqlx ordering panic
  evidence: Registered versions in get_migrations() are contiguous 1..47 and committed in chronological order (038 May 29 before 039 May 30). On-disk Glob sort is cosmetic. No ordering violation.
  timestamp: 2026-06-15T12:00:00Z

- hypothesis: WebView2 cache corruption is the primary cause
  evidence: Self-healing sentinel (preflight_webview_heal + ack_successful_launch) already clears the cache after an incomplete launch. The real first-launch-after-update failure is a native sqlx panic BEFORE any UI, independent of WebView2.
  timestamp: 2026-06-15T12:02:00Z

## Evidence

- timestamp: 2026-06-15T11:45:00Z
  checked: scripts/check-migrations.mjs against production %APPDATA%\com.hobbyforge.app\hobbyforge.db
  found: 39 of 47 _sqlx_migrations recorded checksums do NOT match SHA-384 of the current on-disk migration file bytes. The 8 that DO match (v12-17, 33, 38) are exactly the files that have CRLF in the working tree.
  implication: The DB's stored checksums were computed against different byte content than the current build embeds — the precondition for a sqlx VersionMismatch panic.

- timestamp: 2026-06-15T11:48:00Z
  checked: Per-migration LF-hash vs CRLF-hash comparison
  found: For all 39 mismatching migrations, the stored checksum matches the SHA-384 of the CRLF-converted content. For the 8 matching ones the file already has CRLF on disk so as-is == stored.
  implication: The user's DB was migrated by an OLDER release where every migration file was embedded with CRLF line endings. The current tree is mostly LF, so a new build embeds LF for those 39 → checksum diverges → panic.

- timestamp: 2026-06-15T11:50:00Z
  checked: git ls-files --eol src-tauri/migrations/ ; git config core.autocrlf ; .gitattributes
  found: index = LF for all; working tree = CRLF for 8 files, LF for 39. core.autocrlf=true. No .gitattributes anywhere in the repo.
  implication: Migration-file line endings are unstable per checkout/build. include_str! embeds working-tree bytes, so the SHA-384 the migrator computes depends on the build machine's checkout state. The stored-vs-embedded checksum mismatch RECURS on essentially every release — the exact "breaks on every update" signature.

- timestamp: 2026-06-15T11:52:00Z
  checked: tauri-dev-points-fix.log and tauri-dev-v0.5.2-manual.log
  found: Cold starts log "[hobbyforge] migration checksum mismatch on 36 version(s): [...] — repairing" then "repaired successfully". The number (36) differs from production (39) because dev was built at a different time with a slightly different line-ending mix.
  implication: Live repair path firing on exactly this bug. It self-heals when it runs cleanly — why dev survives, and why a fresh reinstall works until the next build flips line endings again.

- timestamp: 2026-06-15T11:54:00Z
  checked: run() startup order in lib.rs (preflight_webview_heal -> preflight_migration_repair -> Builder.setup -> tauri_plugin_sql with get_migrations())
  found: tauri-plugin-sql runs the migrator at plugin build/init. A sqlx checksum mismatch returns MigrateError::VersionMismatch, surfaced as a panic; .run() then aborts via .expect(). No window is ever created.
  implication: Explains "nothing happens, no window, no dialog" precisely — a native panic before the webview mounts, NOT a React/DbHealthGate path (those would still show a window).

- timestamp: 2026-06-15T11:56:00Z
  checked: preflight_migration_repair / repair_migration_checksums error handling
  found: Repair swallows all errors via eprintln! (invisible in a GUI), connects with a fresh sqlx connection with NO busy_timeout, and only repairs versions present in the current code list. If the DB is locked (e.g., old process during an in-place update) repair is silently skipped, after which the plugin still panics.
  implication: The self-heal is fragile. Even with line endings fixed, repair should be hardened (busy_timeout, never let a transient lock skip the repair) so an already-corrupted DB recovers deterministically.

- timestamp: 2026-06-15T11:00:00Z
  checked: Prior debug session .planning/debug/app-wont-start.md (v0.4.3, "window never appears")
  found: Concluded root cause = block_on in setup hook + WebView2 cache corruption + user_version mismatch. BUT files_changed: [] — no fix was ever applied/committed.
  implication: Same failure mode is recurring because the prior diagnosis was never remediated. Strong overlap with current report.

- timestamp: 2026-06-15T11:01:00Z
  checked: src-tauri/src/lib.rs setup hook (line ~1393-1431)
  found: block_on(import_unit_database_inner) was REPLACED with tauri::async_runtime::spawn (line 1405) — comment: "Spawned async so the window appears immediately — block_on here caused..."
  implication: Prior PRIMARY suspect (main-thread block during window creation) appears FIXED. Window should now appear regardless of import. So a silent no-window failure now points elsewhere (panic during setup before window, or WebView2-level failure).

- timestamp: 2026-06-15T11:02:00Z
  checked: src/components/common/DbHealthGate.tsx and migration files count
  found: EXPECTED_SCHEMA_VERSION = 44, but src-tauri/migrations/ now contains 47 files (001..047). DbHealthGate blocks/render-diverts when user_version < EXPECTED_SCHEMA_VERSION. sync_user_version (lib.rs:441) sets user_version = migration_count.
  implication: EXPECTED_SCHEMA_VERSION is STALE (44 vs 47). Needs verification of whether this gate diverts rendering vs prevents window. Note: a too-LOW expected value would NOT trigger the < gate on updated installs, so this alone may not block — but the drift indicates the version-sync invariant is not being maintained per release.

- timestamp: 2026-06-15T11:03:00Z
  checked: src-tauri/tauri.conf.json
  found: Updater plugin configured with pubkey + GitHub latest.json endpoint; createUpdaterArtifacts: true. SQL plugin preloads sqlite:hobbyforge.db. Migrations run automatically at startup in filename order.
  implication: Update path involves NSIS in-place upgrade that preserves %APPDATA% DB + %LOCALAPPDATA% WebView2 cache. Clean reinstall (uninstall first) clears these — explaining why fresh download works but in-place update breaks.

## Resolution

root_cause: |
  Silent no-window-on-update is a NATIVE sqlx migration checksum-mismatch panic, caused by
  unstable CRLF/LF line endings in src-tauri/migrations/*.sql. The repo has core.autocrlf=true
  and NO .gitattributes, so the working-tree line endings of migration files differ between
  checkouts/builds (currently 8 files CRLF, 39 files LF). Because migrations are embedded with
  include_str! (raw working-tree bytes), each release can embed different byte content for the
  same migration version. The user's hobbyforge.db, written by an earlier all-CRLF build, stored
  SHA-384 checksums of the CRLF content. A newer release embeds LF content for 39 of 47 migrations,
  so tauri-plugin-sql's sqlx migrator computes a different checksum, raises MigrateError::VersionMismatch
  at plugin init, and .run() aborts via .expect() — BEFORE the window is created. Uninstalling deletes
  %APPDATA%\com.hobbyforge.app\hobbyforge.db, so a fresh install re-records checksums that match THAT
  build's bytes and launches fine — until the next release flips line endings again. The existing
  preflight_migration_repair self-heals this when it runs cleanly (seen in dev logs) but is fragile
  (errors swallowed, no busy_timeout, best-effort before the plugin), so it does not reliably save a
  production update.
fix: |
  APPLIED (OPTION A — full durable fix), 3 atomic commits on branch fix/update-breaks-app-launch:

  Commit 1 (74de1a69) build: force LF line endings for SQL migration files
    - Added repo-root .gitattributes: `*.sql text eol=lf` + `src-tauri/migrations/** text eol=lf`.
    - Renormalized the working tree. NOTE: `git add --renormalize` only normalizes the INDEX (already
      LF), so it did not change the working-tree bytes that include_str! reads. The 8 CRLF files
      (012-017, 033, 038) were forced to LF by deleting them and re-checking them out through the new
      eol=lf smudge filter. Verified all 47 migration files are now PURE LF on disk (tr -cd '\r' == 0).
    - Effect: every future build/checkout (CI, user's release machine, fresh clones) embeds identical
      LF bytes, eliminating the per-release checksum drift at the source. Protects fresh installs.

  Commit 2 (19e2c05f) fix: make preflight migration repair authoritative for corrupted installs
    - busy_timeout(10s) on the repair connection (and sync_user_version connection) so a transient
      lock during an NSIS in-place update no longer silently skips the repair.
    - wal_checkpoint(TRUNCATE) after the checksum UPDATEs so corrected checksums are persisted into the
      main DB file BEFORE the SQL plugin opens it (plugin runs the sqlx migrator at .build()).
    - Never panics: replaced db_path.parent().unwrap() with a graceful Err; block_on body only logs.
    - File logging to app_data_dir/preflight.log (stderr is invisible in a packaged GUI release),
      covering repaired / already-consistent / repair-failed outcomes.
    - Added repair_heals_crlf_era_checksums test (seeds CRLF-era checksums, asserts heal to LF +
      idempotency). This repair is what saves the EXISTING installed base (DBs holding all-CRLF
      checksums) on the first launch of the fixed release.

  Commit 3 (5c91509d) fix(db-health): bump EXPECTED_SCHEMA_VERSION 44 -> 47 (optional hygiene)
    - Aligned the DbHealthGate constant + its test with the 47-migration set. Was a `<` gate so it
      never caused the no-launch bug, but the stale value meant a genuinely under-migrated DB (v44-46)
      would not be flagged.

  NOT DONE (intentionally, out of scope / not locally verifiable): useAppUpdate relaunch() after
  downloadAndInstall — a separate UX item, left untouched to avoid scope creep.
verification: |
  Done locally (the real end-to-end NSIS in-place update is the USER's step):
  - scripts/check-migrations.mjs after LF-normalize: all 47 migration files now fileHasCR=false; the
    production %APPDATA% DB shows ALL 47 stored checksums match CRLF and NONE match LF — i.e. that DB
    was written by an all-CRLF build and WOULD panic against a clean LF build. This proves the
    hardened preflight repair is REQUIRED for the installed base, not optional.
  - cargo check (src-tauri): PASSES clean.
  - cargo test (src-tauri): 7/7 PASS, including the new repair_heals_crlf_era_checksums simulated-
    corruption test (heals all rows to LF bytes; second run is a no-op).
  - pnpm build (tsc + vite): PASSES (only the pre-existing >500kB chunk-size warning).
  - vitest tests/error-resilience/DbHealthGate.test.tsx: 5/5 PASS (incl. the version assertion).
  - PRE-EXISTING, NOT caused by this fix: migration-parity / db-helpers tests fail because
    tests/data-layer/db-helpers.ts HOBBYFORGE_MIGRATIONS stops at 046 (missing 047_army_list_unit_
    wargear.sql, added with the wargear feature). Out of scope for this session; flagged for cleanup.
  REMAINING (user's step): ship a real update over an existing install and confirm it launches without
  a manual reinstall, and that app_data_dir/preflight.log records "repaired successfully".
files_changed:
  - .gitattributes (new — LF for *.sql and src-tauri/migrations/**)
  - src-tauri/src/lib.rs (preflight_log helper; busy_timeout + wal_checkpoint + no-panic + file logging in preflight_migration_repair/repair_migration_checksums/sync_user_version; new repair test)
  - src/components/common/DbHealthGate.tsx (EXPECTED_SCHEMA_VERSION 44 -> 47)
  - tests/error-resilience/DbHealthGate.test.tsx (version assertion 44 -> 47)

## Specialist Review

specialist_hint: rust
verdict: LOOKS_GOOD
reviewed: src-tauri/src/lib.rs preflight_migration_repair / repair_migration_checksums / sync_user_version (commit 19e2c05f)
findings:
  - Panic prevention is sound. busy_timeout(10s) closes the silent-skip-on-lock hole; all production paths return Result; block_on body only logs; table_exists uses unwrap_or(false). The one residual Err path (DB genuinely unopenable after 10s) is correctly documented as accepted — there is no way to both heal and avoid panic if the DB can't be opened at all, and it is strictly better than the original.
  - WAL persistence is correct. Each UPDATE autocommits (no open txn), so rows are durable in the WAL before the connection drops; wal_checkpoint(TRUNCATE) folds WAL into the main file (best-effort, non-fatal). The plugin opens a fresh sqlx connection AFTER the preflight connection is dropped — no cross-connection hazard.
  - No unwrap/expect on any preflight production path (parent().unwrap() replaced with a match). The .expect() calls in setup() run AFTER the plugin builds — out of scope, unrelated to the migration panic.
  - Path resolution matches: resolve_app_data_dir() and the plugin's app_data_dir() both resolve to %APPDATA%\com.hobbyforge.app\hobbyforge.db via the shared identifier, so the preflight heals the same file the plugin opens.
  - Minor non-blocking notes: PRAGMA user_version uses string-formatting (unavoidable — PRAGMA values can't be bound; u32 makes it injection-safe). Repair + sync_user_version open two sequential connections (harmless).
conclusion: No changes recommended. The hardened repair correctly prevents the VersionMismatch panic for the corrupted installed base.
