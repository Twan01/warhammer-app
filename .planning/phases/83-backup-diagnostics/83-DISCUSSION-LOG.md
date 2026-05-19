# Phase 83: Backup Diagnostics - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 83-Backup Diagnostics
**Areas discussed:** Diagnostic location, Version mismatch data source, Progressive disclosure pattern, Threshold configurability
**Mode:** --auto (all decisions auto-selected)

---

## Diagnostic Location

| Option | Description | Selected |
|--------|-------------|----------|
| Expand BackupCard | Add collapsible diagnostic detail section within existing BackupCard | ✓ |
| Separate component | Create a new BackupDiagnosticsCard component below BackupCard | |

**Auto-selected:** Expand BackupCard (recommended default)
**Notes:** BackupCard already shows freshness tier and age. Colocating diagnostics avoids page layout fragmentation.

---

## Version Mismatch Data Source

| Option | Description | Selected |
|--------|-------------|----------|
| Extend BackupStatus localStorage | Add app_version to existing localStorage write on backup success | ✓ |
| Read from last backup file | Validate the most recent backup zip to extract version info | |

**Auto-selected:** Extend BackupStatus localStorage (recommended default)
**Notes:** No Rust changes needed. getVersion() already available from @tauri-apps/api/app. Optional field for backward compat.

---

## Progressive Disclosure Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn/ui Collapsible | Collapsible primitive wrapping diagnostic detail rows below status line | ✓ |
| Tooltip on hover | Show details in a tooltip when hovering over the status line | |
| Always visible | Show all diagnostic details inline without collapse | |

**Auto-selected:** shadcn/ui Collapsible (recommended default)
**Notes:** Matches DGN-04 requirement — details available on expansion, clean green state by default.

---

## Threshold Configurability

| Option | Description | Selected |
|--------|-------------|----------|
| Code constants only | Keep 7/30 day thresholds as constants in backupFreshness.ts | ✓ |
| User settings UI | Add settings page for custom thresholds | |

**Auto-selected:** Code constants only (recommended default)
**Notes:** "Configurable" means easy-to-change code, not user-facing settings. Settings UI would be scope creep.

---

## Claude's Discretion

- Exact layout of diagnostic detail rows
- CSS styling and chevron icon choice
- Whether to store schema_version in BackupStatus
- Loading state handling for async getVersion()
- Error message wording for version mismatch

## Deferred Ideas

- User-configurable staleness thresholds (settings UI)
- Backup scheduling / auto-backup reminders
- Schema migration compatibility check at diagnostic level
- Safety backup age diagnostics
