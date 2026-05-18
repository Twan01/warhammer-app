# Requirements: HobbyForge

**Defined:** 2026-05-18
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with reliable backup/restore so local data is always recoverable.

## v0.2.14 Requirements

Requirements for Backup 2.0 milestone. Each maps to roadmap phases.

### Backup Export

- [ ] **EXP-01**: User can export a structured backup (.zip) from Data Health page
- [ ] **EXP-02**: Backup contains hobbyforge.db created via VACUUM INTO (not file copy)
- [ ] **EXP-03**: Backup contains metadata.json with app version, schema version (migration count), timestamp, and platform
- [ ] **EXP-04**: Backup filename is timestamped (hobbyforge-backup-YYYY-MM-DD-HHMM.zip)
- [ ] **EXP-05**: User receives success/failure feedback after export

### Restore / Import

- [x] **RST-01**: User can select a backup .zip file to restore from Data Health page
- [x] **RST-02**: App validates backup manifest and metadata before restore
- [x] **RST-03**: User sees a preview of what will be restored (app version, schema version, date, size)
- [x] **RST-04**: App rejects backups with schema version newer than current app
- [x] **RST-05**: App warns if backup schema is older (but allows restore)
- [ ] **RST-06**: Automatic safety backup is created before any restore
- [ ] **RST-07**: Restore replaces hobbyforge.db atomically (sidecar cleanup + file swap)
- [ ] **RST-08**: App restarts after successful restore to reinitialize DB connections
- [x] **RST-09**: Restore does not proceed without explicit user confirmation

### Backup Status

- [x] **STS-01**: Data Health shows last backup date and age (e.g., "2 days ago")
- [x] **STS-02**: Backup health indicator (healthy / recommended / overdue / never backed up)
- [x] **STS-03**: BackupCard links to export and restore actions
- [x] **STS-04**: Dashboard DataHealthSummaryCard reflects backup status

### Safety Backups

- [ ] **SAF-01**: Automatic safety backup created before restore (part of RST-06)
- [ ] **SAF-02**: Automatic safety backup created before Wahapedia rules sync
- [ ] **SAF-03**: Safety backups stored in app data directory with auto-generated names
- [ ] **SAF-04**: User can see safety backups in Data Health

### Backup Diagnostics

- [ ] **DGN-01**: Data Health flags "never backed up" state
- [ ] **DGN-02**: Data Health flags backup older than configurable threshold
- [ ] **DGN-03**: Data Health flags backup version mismatch (backup from different app version)
- [ ] **DGN-04**: Diagnostic details available without overwhelming normal users

## Future Requirements

### Backup Enhancements

- **EXP-F01**: Backup includes photos/assets alongside database
- **RST-F01**: Selective restore (choose which tables to restore)
- **SAF-F01**: Pre-migration safety backup (before app updates with schema changes)
- **SAF-F02**: Safety backup auto-cleanup (cap at N backups, oldest deleted)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud sync / multi-device | Local-first by design |
| Encrypted backups | Complexity without clear need for personal tool |
| Automatic scheduled backups | Manual + safety backups sufficient; explicit out of scope per issue |
| Multi-device conflict resolution | Single-user, local-first |
| rules.db in backup | Fully regenerable via Wahapedia sync; doubles archive size for zero recovery value |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EXP-01 | Phase 79 | Pending |
| EXP-02 | Phase 79 | Pending |
| EXP-03 | Phase 79 | Pending |
| EXP-04 | Phase 79 | Pending |
| EXP-05 | Phase 79 | Pending |
| RST-01 | Phase 81 | Complete |
| RST-02 | Phase 81 | Complete |
| RST-03 | Phase 81 | Complete |
| RST-04 | Phase 81 | Complete |
| RST-05 | Phase 81 | Complete |
| RST-06 | Phase 82 | Pending |
| RST-07 | Phase 82 | Pending |
| RST-08 | Phase 82 | Pending |
| RST-09 | Phase 81 | Complete |
| STS-01 | Phase 80 | Complete |
| STS-02 | Phase 80 | Complete |
| STS-03 | Phase 80 | Complete |
| STS-04 | Phase 80 | Complete |
| SAF-01 | Phase 79 | Pending |
| SAF-02 | Phase 82 | Pending |
| SAF-03 | Phase 79 | Pending |
| SAF-04 | Phase 82 | Pending |
| DGN-01 | Phase 83 | Pending |
| DGN-02 | Phase 83 | Pending |
| DGN-03 | Phase 83 | Pending |
| DGN-04 | Phase 83 | Pending |

**Coverage:**
- v0.2.14 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-05-18*
*Last updated: 2026-05-18 after roadmap creation*
