# Phase 124: Data Management Tab - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 124-data-management-tab
**Mode:** --auto (all decisions auto-resolved)
**Areas discussed:** Data Health link, Factory reset scope & confirmation, Preference export format, Preference import validation

---

## Data Health Link (DAT-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Simple navigation link | Button/link that navigates to /data-health | ✓ |
| Inline status summary + link | Show current health status with clickable card | |
| Embedded mini-dashboard | Show key metrics inline in the Data tab | |

**Auto-selected:** Simple navigation link (recommended default)
**Rationale:** The Data Health page already has comprehensive diagnostics. Duplicating status info in Settings adds complexity without value. A clean link with brief description keeps the Data tab focused on management actions.

---

## Factory Reset Scope & Confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| DB file delete + relaunch | Delete hobbyforge.db, let migration plugin recreate on restart | ✓ |
| Per-table DELETE statements | Run DELETE FROM on each user data table | |
| Backup-restore to empty state | Export empty backup, restore it via existing flow | |

**Auto-selected:** DB file delete + relaunch (recommended default)
**Rationale:** With 43+ migrations, running individual DELETEs is fragile and requires maintaining a reset script. Deleting the DB file and relaunching is atomic, reliable, and self-healing via Tauri's auto-migration. Safety backup created before deletion matches the restore flow precedent.

**Confirmation flow auto-selected:** Type-to-confirm (e.g., "RESET")
**Rationale:** Multi-step confirmation with typed phrase is the strongest accidental-click prevention. Matches common patterns for destructive actions in desktop apps.

---

## Preference Export Format

| Option | Description | Selected |
|--------|-------------|----------|
| Versioned JSON with flat map | `{ version, exported_at, settings: {...} }` | ✓ |
| Raw key-value dump | `{ key: value, key: value }` | |
| Full app state export | Include more than just app_settings | |

**Auto-selected:** Versioned JSON with flat map (recommended default)
**Rationale:** Version field enables future format evolution. Exported_at timestamp helps users identify which export is newer. Flat settings map mirrors the `AppSettingsMap` type exactly, making import/export symmetric.

---

## Preference Import Validation

| Option | Description | Selected |
|--------|-------------|----------|
| All-or-nothing with pre-validation | Validate entire file before writing any values | ✓ |
| Best-effort partial import | Import valid keys, skip invalid ones | |
| Strict schema validation | Reject if any unknown keys present | |

**Auto-selected:** All-or-nothing with pre-validation (recommended default)
**Rationale:** Partial imports could leave settings in an inconsistent state. Pre-validation is simple (check version field + settings is object) and gives clear error feedback.

---

## Claude's Discretion

- Layout and visual hierarchy within the Data tab
- Exact confirmation phrase text for factory reset
- Loading/spinner UX during reset
- Error handling for file I/O failures
- Card grouping for export/import controls

## Deferred Ideas

None
