# Phase 77: Data Health Page + Backup/Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 77-Data Health Page + Backup/Export
**Areas discussed:** Page Location & Navigation, VACUUM INTO Backup Implementation, Diagnostic Detection Logic, Async Loading Pattern
**Mode:** --auto (all decisions auto-selected)

---

## Page Location & Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| New `/data-health` route | Dedicated route in sidebar Management group | ✓ |
| Repurpose Settings page | Replace the placeholder Settings page | |
| Tab within Settings | Add as a tab inside a future Settings page | |

**User's choice:** [auto] New `/data-health` route (recommended default)
**Notes:** Settings is a distinct concern; Data Health deserves its own navigation entry in the Management sidebar group.

---

## VACUUM INTO Backup Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| New Rust command | Direct sqlx connection like `bulk_sync_rules`, runs `VACUUM INTO` | ✓ |
| SQL plugin execute | Try `VACUUM INTO` through tauri-plugin-sql execute() | |
| File system copy | Raw fs::copy with WAL checkpoint | |

**User's choice:** [auto] New Rust command (recommended default)
**Notes:** STATE.md already identified this as a blocker — tauri-plugin-sql uses a connection pool which doesn't work for VACUUM INTO. The `bulk_sync_rules` pattern proves direct sqlx works. Raw copy is explicitly ruled unsafe by accumulated decisions.

---

## Diagnostic Detection Logic

| Option | Description | Selected |
|--------|-------------|----------|
| SQL-based typed diagnostics | Separate query functions returning typed results with severity | ✓ |
| Single diagnostic JSON blob | One big query returning all diagnostics | |

**User's choice:** [auto] SQL-based typed diagnostics (recommended default)
**Notes:** Separate functions allow independent loading and align with the one-hook-per-concern pattern. Cross-DB queries needed for ambiguous match detection (hobbyforge.db units vs rules.db datasheet_points).

---

## Async Loading Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Independent React Query hooks | Three hooks loading independently with per-section spinners | ✓ |
| Single useDataHealth hook | One hook returning all data at once | |

**User's choice:** [auto] Independent React Query hooks (recommended default)
**Notes:** Matches existing hook-per-concern pattern. Page renders skeleton immediately while counts and flags populate async (DX-04 requirement).

---

## Claude's Discretion

- Page layout and section ordering
- Card styling and visual hierarchy for diagnostic severity
- Whether diagnostic flags link to affected data or just show descriptions
- Loading skeleton design
- Whether to show a "Re-run diagnostics" button

## Deferred Ideas

- Restore from backup (v0.3+)
- Auto-backup on schedule (v0.3+)
- Database export to JSON/CSV
- Diagnostic auto-fix buttons
