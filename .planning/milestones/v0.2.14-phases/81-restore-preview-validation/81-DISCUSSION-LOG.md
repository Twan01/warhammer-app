# Phase 81: Restore Preview + Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 81-restore-preview-validation
**Areas discussed:** Entry point placement, Preview display format, Schema compatibility UX, Confirmation gate design
**Mode:** --auto (all decisions auto-selected)

---

## Entry Point Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Button on BackupCard | Co-locate with existing export button on Data Health | ✓ |
| Separate RestoreCard | New card below BackupCard dedicated to restore | |
| Toolbar action | Button in page header toolbar | |

**Auto-selected:** Button on BackupCard (recommended default)
**Rationale:** BackupCard already owns backup-related actions. Co-locating keeps the UX consistent.

---

## Preview Display Format

| Option | Description | Selected |
|--------|-------------|----------|
| AlertDialog modal | File picker → dialog shows manifest details with confirm/cancel | ✓ |
| Inline expansion | BackupCard expands to show preview details below | |
| Separate page/route | Navigate to a dedicated restore preview page | |

**Auto-selected:** AlertDialog modal (recommended default)
**Rationale:** Matches existing AlertDialog pattern used for destructive action confirmation across the app. No new UI paradigm.

---

## Schema Compatibility UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in preview dialog | Red error (newer) / amber warning (older) banners within the same dialog | ✓ |
| Separate validation step | Two-dialog flow: validation result → then preview | |
| Toast-only | Show compatibility as toast notifications | |

**Auto-selected:** Inline in preview dialog (recommended default)
**Rationale:** Single dialog keeps the flow simple. RST-04 requires blocking newer versions, RST-05 requires warning-but-allow for older.

---

## Confirmation Gate Design

| Option | Description | Selected |
|--------|-------------|----------|
| Named destructive action | Button says "Replace current database" with data loss explanation | ✓ |
| Generic confirm | Standard "Confirm" / "Cancel" buttons | |
| Type-to-confirm | User types "RESTORE" to enable the button | |

**Auto-selected:** Named destructive action (recommended default)
**Rationale:** RST-09 requires explicit confirmation naming the destructive action. Consistent with existing delete dialogs (e.g., FactionDeleteDialog, UnitDeleteDialog).

---

## Claude's Discretion

- Component decomposition (inline vs extracted RestorePreviewDialog)
- React Query hook vs raw invoke for validate_backup
- Loading state UX (spinner placement)
- Exact warning/error message wording
- Placeholder behavior for restore action until Phase 82

## Deferred Ideas

- Actual restore execution — Phase 82
- Safety backup before restore — Phase 82
- Backup diagnostics — Phase 83
- Selective restore — Future requirement RST-F01
