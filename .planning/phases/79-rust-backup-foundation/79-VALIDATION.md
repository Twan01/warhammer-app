---
phase: 79
slug: rust-backup-foundation
status: approved
nyquist_compliant: false
wave_0_complete: true
created: 2026-05-18
---

# Phase 79 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust built-in test (`#[cfg(test)]` + `#[test]`) |
| **Config file** | None — standard `cargo test` |
| **Quick run command** | `cd src-tauri && cargo test` |
| **Full suite command** | `cd src-tauri && cargo test` |
| **Estimated runtime** | ~30 seconds (includes compile) |

---

## Sampling Rate

- **After every task commit:** Run `cd src-tauri && cargo test`
- **After every plan wave:** Run `cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 79-01-01 | 01 | 1 | EXP-02, EXP-03 | T-79-01 | VACUUM INTO path escaping | build | `cargo check` | N/A | ✅ green |
| 79-01-02 | 01 | 1 | EXP-03 | — | BackupManifest serde roundtrip | unit | `cargo test backup_manifest_serde_roundtrip` | ✅ | ✅ green |
| 79-01-02 | 01 | 1 | EXP-03 | — | format_iso8601_now valid RFC 3339 | unit | `cargo test format_iso8601_now_returns_valid_rfc3339` | ✅ | ✅ green |
| 79-01-02 | 01 | 1 | EXP-04 | — | format_filename_timestamp YYYY-MM-DD-HHMM | unit | `cargo test format_filename_timestamp_matches_pattern` | ✅ | ✅ green |
| 79-01-02 | 01 | 1 | EXP-03 | — | create_backup_zip zip roundtrip | unit | `cargo test create_backup_zip_roundtrip` | ✅ | ✅ green |
| 79-02-01 | 02 | 2 | EXP-01 | T-79-03 | export_backup creates zip | manual | — | — | ✅ manual |
| 79-02-01 | 02 | 2 | EXP-02 | T-79-01 | vacuum_to_temp VACUUM INTO | manual | — | — | ✅ manual |
| 79-02-01 | 02 | 2 | EXP-05 | — | Error path returns Result::Err | manual | — | — | ✅ manual |
| 79-02-01 | 02 | 2 | SAF-01 | — | create_safety_backup creates zip | manual | — | — | ✅ manual |
| 79-02-01 | 02 | 2 | SAF-03 | T-79-04 | Safety backup in app_data_dir/backups/ | manual | — | — | ✅ manual |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Rust `#[cfg(test)]` module added to `src-tauri/src/lib.rs` for unit-testable gaps.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| export_backup creates zip at destination | EXP-01 | Requires Tauri AppHandle + SQLite DB for vacuum_to_temp | `pnpm tauri dev` → devtools → `invoke('export_backup', { destination: '...' })` |
| vacuum_to_temp creates consistent snapshot | EXP-02 | Requires AppHandle to resolve app_data_dir + live DB | Verified via export_backup smoke test |
| Commands return descriptive errors on failure | EXP-05 | Requires AppHandle to trigger error conditions | Invoke with invalid path, verify error string |
| create_safety_backup writes to backups/ | SAF-01 | Requires AppHandle for app_data_dir resolution | `invoke('create_safety_backup')` → check returned path exists |
| Safety backup path is app_data_dir/backups/safety-YYYY-MM-DD-HHMM.zip | SAF-03 | Requires AppHandle for app_data_dir resolution | Verify returned path matches expected pattern |

---

## Validation Audit 2026-05-18

| Metric | Count |
|--------|-------|
| Gaps found | 9 |
| Resolved (automated) | 4 |
| Escalated (manual-only) | 5 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter (partial — 5 manual-only items)

**Approval:** approved 2026-05-18
