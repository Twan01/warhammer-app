# 132-04 SUMMARY — Theme A completion gate

**Plan:** 132-04 (Wave 3, `autonomous: false` human gate)
**Status:** Complete — 2026-06-17
**Requirements:** REL-06, REL-07, REL-08 (final gate)

## Objective
Perform the gated Theme A → `master` completion (D-11) only after REL-06/07/08 are verified
and the full gate is green — per the v0.6.0 sequencing law (Theme A lands before Theme B / Phase 133+).

## Outcome

### Requirements verified
- **REL-06** ✅ — Real in-place NSIS update verified live (0.5.8 → 0.5.9 over a local `latest.json`):
  app relaunched into the new version, `%APPDATA%` SQLite DB preserved, `preflight.log` recorded
  "migration checksums consistent" on first launch. Evidence captured in `132-VERIFICATION.md`.
- **REL-07** ✅ — Auto-relaunch confirmed live (no manual click, no loop). A genuine update-loop bug
  was found and fixed during verification (commit `6a1043f7`): the auto-relaunch fired on the
  download-`Finished` event and restarted the old binary mid-install; corrected to relaunch only
  after `downloadAndInstall()` resolves, with `installMode: "passive"` `/R` performing the Windows
  relaunch.
- **REL-08** ✅ — Persistent, size-capped `frontend.log` shipped (Plan 01) with Rust unit test +
  JS handler/boot-failure wiring + tests.

### Local gate (task 1) — GREEN on the pushed commits
- `pnpm build` ✓ (includes the version/migration/CR `check:version` gate)
- `cargo test` 8/8 ✓ (runs under the corrected `rust-toolchain` 1.88.0 pin)
- `pnpm test` 2749/2749 ✓

### Theme A → master (task 2)
Theme A (Phases 130–132) is committed directly on `master` (the established milestone pattern;
`fix/update-breaks-app-launch` is a stale pre-existing branch, behind master). The work was pushed
to `origin/master` (`4ac55d14..2aec5647`).

**CI note (transparent):** `ci.yml` triggers on `pull_request`/`workflow_call` and `release.yml`
on `v*` tags, so a direct branch push to `master` runs no workflow — there is no green CI run tied
to this specific push. The CI gate is nonetheless proven functional (Phase 131's deliberate-red
verification PR went red correctly) and the real update-gating wall is intact: `release.yml` has
`needs: test`, so the next release tag cannot publish an update unless the `test` job passes.
The local equivalent of that job is green on these exact commits.

## Side fixes delivered during verification
- `rust-toolchain.toml` 1.87.0 → 1.88.0 (lockfile deps required ≥1.88; cargo/tauri build were broken).
- `local-update.json` `_comment` key removed (broke `tauri build --config` schema validation).
- `make-local-update.mjs` now selects the installer matching `tauri.conf.json` version (was picking the
  alphabetically-first stale `*-setup.exe`).

## Follow-ups (not blocking phase completion)
- Decide the real release version (test bumps were reverted to 0.5.7).
- When cutting the next release tag, confirm the `release.yml` `test` job is green (the production gate).
