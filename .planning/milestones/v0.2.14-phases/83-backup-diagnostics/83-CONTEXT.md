# Phase 83: Backup Diagnostics - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase upgrades the BackupCard on the Data Health page to surface actionable backup health diagnostics. Four signals: "never backed up" flag, staleness threshold flagging (overdue), version mismatch detection (backup made with a different app version), and progressive disclosure so healthy-state users see a clean green state while diagnostic details are available on expansion. No new pages, routes, or database changes — this is a frontend-only phase extending existing backup status infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Diagnostic Location
- **D-01:** Expand the existing `BackupCard` component with a collapsible diagnostic detail section below the current status line. No new component — all backup diagnostics live within BackupCard. This keeps all backup information colocated and avoids fragmenting the Data Health page layout.

### Version Mismatch Detection
- **D-02:** Extend the `BackupStatus` interface in `useDiagnostics.ts` to include `app_version: string`. When `handleBackup` succeeds in BackupCard, store the current `getVersion()` result alongside `date`, `path`, `success` in localStorage.
- **D-03:** On load, compare the stored `app_version` against the current app version from `getVersion()`. If they differ, show a version mismatch diagnostic. This requires no new Rust code — the version is already available from `@tauri-apps/api/app`.
- **D-04:** The version mismatch is informational, not blocking. It tells the user "your backup was made with a different version" so they know the backup may not reflect the current schema. It does NOT prevent creating a new backup.

### Progressive Disclosure
- **D-05:** Use shadcn/ui `Collapsible` primitive for the expandable diagnostic detail section. Collapsed state: just the existing tier dot + age label (current behavior). Expanded state: diagnostic detail rows showing exact age in days, app version of last backup vs current, schema version of last backup if available.
- **D-06:** The collapsible trigger is a small chevron or "Details" link next to the status line. It should not draw attention when the backup is healthy — progressive disclosure means the default state is clean.
- **D-07:** When backup status is "healthy" and no version mismatch exists, the collapsible details section shows all-green confirmations (backup age, version match). When issues exist (overdue, never, version mismatch), the collapsed status line already signals the problem via the tier dot color, and expansion provides specifics.

### Staleness Thresholds
- **D-08:** Thresholds remain code constants in `backupFreshness.ts` (7 days healthy, 30 days recommended boundary). "Configurable" means easy to change in code, not user-configurable via settings UI. No settings UI for this — that would be scope creep.

### Dashboard Integration
- **D-09:** The `DataHealthSummaryCard` on the Dashboard already shows backup tier dot + label. Phase 83 adds version mismatch awareness: if a version mismatch is detected, append a small warning icon or "(outdated)" text next to the backup label on the dashboard card. This is the only dashboard change.

### Claude's Discretion
- Exact layout of diagnostic detail rows within the collapsible section
- Whether to use `Collapsible` from shadcn/ui directly or wrap in a small helper
- CSS styling for the detail rows (follow existing card patterns)
- Whether the chevron icon is ChevronDown or a text "Details" link
- Whether to store `schema_version` in BackupStatus localStorage (nice-to-have, not required — current schema version is available from `useSchemaVersions()`)
- Loading state handling while `getVersion()` resolves for the version comparison
- Error message wording for version mismatch diagnostic text

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backup freshness infrastructure
- `src/lib/backupFreshness.ts` — `getBackupFreshness()`, `getBackupAgeLabel()`, `BACKUP_FRESHNESS_DOT_CLASS` — the four-tier system (healthy/recommended/overdue/never) that Phase 83 extends with diagnostic details.
- `src/hooks/useDiagnostics.ts` — `useBackupStatus()`, `BackupStatus` interface, `BACKUP_STORAGE_KEY` — localStorage-based backup metadata that needs `app_version` extension.

### Data Health page
- `src/features/data-health/BackupCard.tsx` — Primary target for diagnostic expansion. Contains `handleBackup()` (line 44) where `app_version` write goes, tier computation (line 128), and the JSX layout to extend with collapsible details.
- `src/features/data-health/DataHealthPage.tsx` — Page layout. No structural changes needed — BackupCard expands in place.

### Dashboard
- `src/features/dashboard/DataHealthSummaryCard.tsx` — Backup status row (line 52-55) that may get version mismatch indicator.

### App version API
- `@tauri-apps/api/app` — `getVersion()` already used in `src/features/data-health/VersionInfoCard.tsx` (line 49). Same API for version comparison.

### Types
- `src/types/backup.ts` — `BackupManifest` interface with `app_version`, `schema_version`. Reference for what version info is available.

### Requirements
- `.planning/REQUIREMENTS.md` — DGN-01 (never-backed-up flag), DGN-02 (staleness threshold), DGN-03 (version mismatch), DGN-04 (progressive disclosure).

### Prior phase context
- `.planning/phases/80-export-ui-backup-status/80-CONTEXT.md` — D-01/D-02 (freshness tiers), D-03 (BackupCard layout), D-06/D-07 (DataHealthSummaryCard backup display).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getBackupFreshness()` + `getBackupAgeLabel()` — Already compute tier and human-readable age. Phase 83 uses these for the collapsed state and extends with detail rows.
- `useBackupStatus()` — Reads localStorage backup metadata. Interface needs `app_version` field addition.
- `getVersion()` from `@tauri-apps/api/app` — Already used in VersionInfoCard. Provides current app version for comparison.
- `useSchemaVersions()` — Returns current hobbyforge + rules schema versions. Available for showing "current schema version" in diagnostic details.
- shadcn/ui `Collapsible` — Available in the component library for progressive disclosure.

### Established Patterns
- Color-coded status dots: `<span className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[tier]}`} />` — used in BackupCard, DataHealthSummaryCard, VersionInfoCard.
- localStorage for backup metadata: `BACKUP_STORAGE_KEY` → JSON `BackupStatus` — established in Phase 77, extended in Phase 80.
- `getVersion()` with `useEffect` + `useState` pattern — used in VersionInfoCard for async version fetch.
- Card layout: icon + text left, action buttons right — BackupCard's existing structure.

### Integration Points
- `BackupCard.handleBackup` (line 44) → Add `app_version` to the localStorage write after successful backup.
- `BackupCard` JSX (line 132-188) → Add `Collapsible` wrapper around diagnostic detail rows below the status line.
- `BackupStatus` interface (useDiagnostics.ts line 55) → Add optional `app_version?: string` field (optional for backward compat with existing localStorage entries).
- `DataHealthSummaryCard` backup row (line 52-55) → Conditionally append version mismatch indicator.

</code_context>

<specifics>
## Specific Ideas

- The diagnostic detail section should feel like an "advanced info" panel — not a dashboard-level summary. Most users will never expand it. The collapsed state (tier dot + age label) is the primary interface.
- Version mismatch should use warm amber tone (not red) since it's informational. A backup from a previous version still restores — the user just needs to know it may not match current schema.
- "Never backed up" state should be more prominent than other diagnostics — it's the most actionable. Consider making it a subtle call-to-action rather than just a red dot.

</specifics>

<deferred>
## Deferred Ideas

- User-configurable staleness thresholds (settings UI) — future enhancement
- Backup scheduling / auto-backup reminders — future enhancement
- Schema migration compatibility check at diagnostic level (can this backup actually restore?) — future enhancement
- Safety backup age diagnostics (similar staleness tracking for auto safety backups) — future enhancement

</deferred>

---

*Phase: 83-Backup Diagnostics*
*Context gathered: 2026-05-19*
