# Requirements: HobbyForge v2.6

**Defined:** 2026-05-07
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.

## v2.6 Requirements

Requirements for v2.6 Rules Sync 2.0 / Rules Data Hub. Each maps to roadmap phases.

### Architecture Audit

- [x] **AUDIT-01**: Architecture note confirms all rw_* extended tables (stratagems, detachments, detachment_abilities, abilities) exist and are populated after sync
- [x] **AUDIT-02**: Architecture note documents the full sync data flow (TypeScript fetch to Rust transaction to SQLite)
- [x] **AUDIT-03**: Architecture note identifies all TypeScript type, query, and hook gaps for extended rules data
- [x] **AUDIT-04**: Architecture note proposes migration plan for sync metadata, overrides, and snapshot tables

### Extended Rules Schema

- [ ] **SCHEMA-01**: User can view faction stratagems (name, phase, CP cost, description, keywords) in PlaybookTab
- [ ] **SCHEMA-02**: User can view faction detachments (name, description, rule text) in PlaybookTab
- [ ] **SCHEMA-03**: User can view detachment abilities grouped by detachment in PlaybookTab
- [ ] **SCHEMA-04**: User can view shared faction abilities (non-datasheet-specific) in PlaybookTab
- [ ] **SCHEMA-05**: TypeScript types, query functions, and React Query hooks exist for stratagems, detachments, detachment abilities, and shared abilities

### Sync Pipeline

- [ ] **SYNC-01**: Rust bulk_sync_rules returns per-table row counts after each sync
- [ ] **SYNC-02**: useRulesSync displays per-table row counts in the post-sync confirmation
- [ ] **SYNC-03**: CSV column header validation rejects malformed CSVs before insertion
- [ ] **SYNC-04**: Sync errors are logged to a persistent table with timestamp, error type, and message
- [ ] **SYNC-05**: All new rules query hooks are invalidated on sync success (cache invalidation contract)

### Sync Metadata & Import Tracking

- [ ] **META-01**: User can see last successful sync date and time in the UI
- [ ] **META-02**: User can see per-table row counts from last sync
- [ ] **META-03**: User can see Wahapedia source version/edition
- [ ] **META-04**: User can see sync error history (timestamped list)
- [ ] **META-05**: User can see freshness indicator (stale/fresh badge) on rules-dependent pages
- [ ] **META-06**: Pre-sync snapshot is captured before each re-sync to enable version comparison

### Manual Overrides & Version Comparison

- [ ] **OVRD-01**: User can manually override points for a unit (persists across re-syncs)
- [ ] **OVRD-02**: User can manually override stats (M/T/Sv/W/Ld/OC) for a unit (persists across re-syncs)
- [ ] **OVRD-03**: User can manually override keywords for a unit (persists across re-syncs)
- [ ] **OVRD-04**: User can manually override ability reminders for a unit (persists across re-syncs)
- [ ] **OVRD-05**: Manual overrides are visually distinguished from imported data in the UI
- [ ] **OVRD-06**: User can see what changed after a re-sync (points, stats, abilities, keywords changes)
- [ ] **OVRD-07**: User can see if a datasheet was removed or renamed after re-sync

## Future Requirements

Deferred to v2.7+ per v3.0 roadmap.

### Army Lists 2.0

- **LIST-01**: Army lists support ruleset/source version, detachment, game size, list status
- **LIST-02**: Advanced points handling with imported/tiered/loadout/override precedence
- **LIST-03**: Owned vs wishlist/proxy/duplicate unit types in list entries
- **LIST-04**: Tactical tags per unit in list (anti-tank, screening, fast mover, etc.)
- **LIST-05**: Printable army list export view

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI-powered rule suggestions | Deferred to v3.0 smart features; rules engine is rule-based only |
| Cross-database foreign keys | SQLite limitation; weapon_name TEXT copy pattern continues |
| Wahapedia API integration | No stable API; CSV import is the established pattern |
| Points validation against official sources | Legal/copyright constraint; user enters and overrides points manually |
| ATTACH DATABASE for cross-DB queries | tauri-plugin-sql limitation; dual-query merge pattern continues |
| Real-time sync (auto-fetch on schedule) | Local-first by design; user triggers sync manually |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUDIT-01 | Phase 42 | Complete |
| AUDIT-02 | Phase 42 | Complete |
| AUDIT-03 | Phase 42 | Complete |
| AUDIT-04 | Phase 42 | Complete |
| SCHEMA-01 | Phase 43 | Pending |
| SCHEMA-02 | Phase 43 | Pending |
| SCHEMA-03 | Phase 43 | Pending |
| SCHEMA-04 | Phase 43 | Pending |
| SCHEMA-05 | Phase 43 | Pending |
| SYNC-01 | Phase 44 | Pending |
| SYNC-02 | Phase 44 | Pending |
| SYNC-03 | Phase 44 | Pending |
| SYNC-04 | Phase 44 | Pending |
| SYNC-05 | Phase 44 | Pending |
| META-01 | Phase 45 | Pending |
| META-02 | Phase 45 | Pending |
| META-03 | Phase 45 | Pending |
| META-04 | Phase 45 | Pending |
| META-05 | Phase 45 | Pending |
| META-06 | Phase 45 | Pending |
| OVRD-01 | Phase 46 | Pending |
| OVRD-02 | Phase 46 | Pending |
| OVRD-03 | Phase 46 | Pending |
| OVRD-04 | Phase 46 | Pending |
| OVRD-05 | Phase 46 | Pending |
| OVRD-06 | Phase 46 | Pending |
| OVRD-07 | Phase 46 | Pending |

**Coverage:**
- v2.6 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-07*
*Last updated: 2026-05-07 — roadmap created, traceability confirmed*
