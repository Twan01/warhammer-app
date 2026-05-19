# Phase 82: Restore Execution + Safety Backups - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 82-restore-execution-safety-backups
**Areas discussed:** Restore execution approach, Pre-sync safety backup, Safety backup listing UI, App restart mechanism
**Mode:** --auto (all decisions auto-selected)

---

## Restore Execution Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Single Rust command | `restore_from_backup` does safety backup + sidecar cleanup + file swap atomically in Rust; JS calls `relaunch()` after | ✓ |
| Multi-step JS orchestration | Frontend calls `create_safety_backup`, then a separate `swap_database` command, then `relaunch()` | |
| Combined Rust+restart | Rust command does everything including process restart | |

**User's choice:** [auto] Single Rust command (recommended default)
**Notes:** Keeps destructive file operations in Rust for atomicity guarantees. JS owns restart timing for UX control. Matches existing pattern where Rust does file ops and JS does UX.

---

## Pre-Sync Safety Backup

| Option | Description | Selected |
|--------|-------------|----------|
| At start of useRulesSync mutation | `invoke("create_safety_backup")` before CSV fetching begins; abort sync on failure | ✓ |
| In Rust bulk_sync_rules command | Add safety backup step inside the Rust sync command itself | |
| Optional user toggle | Let user choose whether to create safety backup before sync | |

**User's choice:** [auto] At start of useRulesSync mutation (recommended default)
**Notes:** Simplest integration point, fails early, visible in the hook code. Keeps the Rust sync command focused on its single responsibility.

---

## Safety Backup Listing UI

| Option | Description | Selected |
|--------|-------------|----------|
| Simple collapsible list | New SafetyBackupsList component below BackupCard showing timestamp + size for each backup | ✓ |
| Integrated into BackupCard | Add a collapsible section inside the existing BackupCard | |
| Separate page/tab | Dedicated safety backups management view | |

**User's choice:** [auto] Simple collapsible list (recommended default)
**Notes:** Minimal new UI, consistent with Data Health card layout. Read-only listing — no delete/restore actions in this phase.

---

## App Restart Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| `relaunch()` from plugin-process | Use `@tauri-apps/plugin-process` already installed; add process:allow-restart capability | ✓ |
| Window close + reopen | Close main window and create new one to reinitialize DB connections | |
| Manual restart prompt | Tell user to restart the app manually | |

**User's choice:** [auto] `relaunch()` from plugin-process (recommended default)
**Notes:** Plugin already installed and initialized. Documented Tauri 2 pattern. Full process restart ensures clean DB connection state.

---

## Claude's Discretion

- Component decomposition for SafetyBackupsList
- React Query hook strategy for list_safety_backups
- Loading/empty states for safety backups list
- Progress indicator during restore before relaunch
- Error message wording
- SafetyBackupEntry struct fields

## Deferred Ideas

- Safety backup auto-cleanup (SAF-F02)
- Pre-migration safety backup (SAF-F01)
- Restore from safety backup
- Delete individual safety backups
- Backup diagnostics — Phase 83
