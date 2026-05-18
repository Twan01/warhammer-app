# Phase 79: Rust Backup Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 79-rust-backup-foundation
**Areas discussed:** Export zip structure, Safety backup storage, Validate command scope, Existing backup_database coexistence
**Mode:** --auto (all decisions auto-selected)

---

## Export Zip Structure

| Option | Description | Selected |
|--------|-------------|----------|
| db + metadata.json in zip | VACUUM INTO temp, bundle with metadata.json (app_version, schema_version, created_at, platform, db_size_bytes) | ✓ |
| Raw .db only (no change) | Keep current VACUUM INTO to raw .db file | |
| db + metadata.json + checksums | Add SHA-256 hash verification | |

**Auto-selected:** db + metadata.json in zip (recommended default — matches EXP-02, EXP-03)
**Notes:** Minimal metadata that covers all requirements without overengineering. Platform field useful for cross-OS diagnostics.

---

## Safety Backup Storage

| Option | Description | Selected |
|--------|-------------|----------|
| app_data_dir/backups/ as .zip | Same zip format as manual exports, named safety-YYYY-MM-DD-HHMM.zip | ✓ |
| app_data_dir/backups/ as raw .db | Simpler but inconsistent with export format | |
| Alongside hobbyforge.db | Less organized, clutters app data root | |

**Auto-selected:** app_data_dir/backups/ as .zip (recommended default — matches SAF-03, consistent format)
**Notes:** Same zip format means validate_backup works on safety backups too.

---

## Validate Command Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Zip + metadata presence only | Check zip integrity, metadata.json parseable, hobbyforge.db present | ✓ |
| Full schema validation | Also check PRAGMA user_version and schema compatibility | |
| Checksum verification | Also verify db integrity via PRAGMA integrity_check | |

**Auto-selected:** Zip + metadata presence only (recommended default — schema checks belong to Phase 81)
**Notes:** Phase 81 adds RST-04/RST-05 schema version checks. Phase 79 just proves the archive is structurally sound.

---

## Existing backup_database Coexistence

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as-is, replace in Phase 80 | No breaking changes, BackupCard continues working | ✓ |
| Replace immediately | Risk breaking BackupCard mid-milestone | |
| Wrap old command in new | Unnecessary indirection | |

**Auto-selected:** Keep as-is, replace in Phase 80 (recommended default — safe incremental approach)
**Notes:** Phase 80 rewires BackupCard to use export_backup and removes backup_database.

---

## Claude's Discretion

- Internal helper functions for zip creation (shared between export and safety backup)
- Temp file naming and cleanup strategy
- Error message formatting for validation failures
- Timestamp formatting approach (std vs chrono)

## Deferred Ideas

- Schema version compatibility checks — Phase 81
- Restore execution — Phase 82
- Safety backup auto-cleanup — Future requirement SAF-F02
- Photos/assets in backup — Future requirement EXP-F01
