# Phase 80: Export UI + Backup Status - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 80-Export UI + Backup Status
**Mode:** --auto (fully autonomous)
**Areas discussed:** Health indicator thresholds, BackupCard layout, Save dialog format, Dashboard integration, Old command removal, localStorage schema

---

## Health Indicator Thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| 7/30 day tiers | Healthy ≤7d, Recommended 8-30d, Overdue >30d, Never | ✓ |
| 14/60 day tiers | Healthy ≤14d, Recommended 15-60d, Overdue >60d | |
| 3/14 day tiers | Healthy ≤3d, Recommended 4-14d, Overdue >14d | |

**Auto-selected:** 7/30 day tiers — weekly backup cadence is reasonable for a hobby app
**Notes:** Mirrors getSyncFreshness pattern. Pure function in shared utility.

---

## BackupCard Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Color dot badge | Add dot inline with age text, keep existing layout | ✓ |
| Full redesign | New multi-section card with progress/history | |
| Badge chip | Pill-shaped badge with tier name | |

**Auto-selected:** Color dot badge — minimal structural change, consistent with DataHealthSummaryCard sync dots
**Notes:** Existing Card layout is clean and functional, just needs the health indicator added.

---

## Save Dialog Format Change

| Option | Description | Selected |
|--------|-------------|----------|
| Direct migration | .zip extension, HobbyForge Backup filter, HHMM timestamp | ✓ |
| Dual format | Offer both .db and .zip in dialog | |

**Auto-selected:** Direct migration — old .db format has no backwards compatibility need
**Notes:** Filename convention from Phase 79 D-03: hobbyforge-backup-YYYY-MM-DD-HHMM.zip

---

## Dashboard DataHealthSummaryCard

| Option | Description | Selected |
|--------|-------------|----------|
| Color dot pattern | Same dot + text pattern as sync freshness | ✓ |
| Icon swap | Change HardDrive icon color instead | |
| Separate row | Add dedicated backup health row | |

**Auto-selected:** Color dot pattern — reuses existing visual language, consistent UX
**Notes:** Parallel BACKUP_FRESHNESS_DOT_CLASS map or shared with sync if tiers align.

---

## Old Command Removal

| Option | Description | Selected |
|--------|-------------|----------|
| Remove now | Delete backup_database from lib.rs in this phase | ✓ |
| Deprecate | Keep but mark deprecated, remove later | |

**Auto-selected:** Remove now — no other callers after BackupCard migrates
**Notes:** Clean dead code removal. Phase 79 D-12 explicitly preserved it for Phase 80 to remove.

---

## localStorage Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Keep shape | Same { date, path, success } — path just ends in .zip | ✓ |
| Extend shape | Add tier, manifest fields | |

**Auto-selected:** Keep shape — no migration needed, minimal change
**Notes:** The BackupManifest from validate_backup is for restore flow (Phase 81), not status display.

---

## Claude's Discretion

- Separate backupFreshness.ts vs extending syncFreshness.ts
- Exact Tailwind color classes for each tier
- Dot placement (before/after text) in BackupCard
- Minor layout tweaks for visual consistency

## Deferred Ideas

- Restore UI on BackupCard — Phase 81
- Schema compatibility checks — Phase 81
- Safety backup before sync — Phase 82
- Backup history list — Future
- Auto-backup scheduling — Future
