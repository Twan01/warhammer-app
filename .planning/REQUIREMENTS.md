# Requirements: HobbyForge v0.2.13

**Defined:** 2026-05-14
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play"
**Source:** GitHub issue #7

## v0.2.13 Requirements

Requirements for Data Integrity, Diagnostics & Product Coherence milestone.

### Data Integrity

- [x] **DI-01**: Applied recipe step progress is keyed by recipe_step_id (not order_index) — reordering steps does not move completion
- [x] **DI-02**: Existing progress rows are migrated safely from order_index to recipe_step_id with section-disambiguated back-fill
- [x] **DI-03**: Recipe metadata, sections, and steps save atomically in a single transaction — partial saves are impossible
- [x] **DI-04**: Recipe graph save preserves existing section/step IDs (non-destructive, same as current five-phase diff)
- [x] **DI-05**: package.json and tauri.conf.json versions match, enforced by a `pnpm check:version` script

### Points & Validation

- [ ] **PV-01**: All army list / Game Day / validation surfaces use a single centralized points resolver function
- [ ] **PV-02**: Points source is labeled in UI (e.g. "95 pts · synced", "100 pts · manual override", "unknown · needs review")
- [ ] **PV-03**: User can see whether a unit's point value was auto-matched or manually confirmed
- [ ] **PV-04**: User can manually confirm or override the unit-to-rules mapping
- [ ] **PV-05**: Duplicate or ambiguous unit-to-rules matches are flagged
- [ ] **PV-06**: List-level warnings (points exceeded, stale source) are shown once in summary panel, not repeated per unit
- [ ] **PV-07**: Unit-level warnings remain attached to relevant unit rows

### Diagnostics

- [x] **DX-01**: Data Health page shows app version, schema versions, last sync date, and sync error count
- [x] **DX-02**: Data Health page shows row counts for key tables (units, recipes, assignments, progress, points)
- [x] **DX-03**: Data Health page flags orphaned progress rows, ambiguous point matches, and stale sync data
- [ ] **DX-04**: Data Health page runs diagnostics without blocking UI (async/lazy)

### Backup

- [x] **BK-01**: User can create a backup of hobbyforge.db from the UI via file picker
- [x] **BK-02**: Backup uses VACUUM INTO for safe SQLite copy (not raw file copy)
- [ ] **BK-03**: Backup status and last backup date are displayed on Data Health page

### Dashboard

- [ ] **DB-01**: Dashboard shows "Next Painting Action" driven by applied recipe progress (step description, time estimate, paint availability)
- [ ] **DB-02**: Dashboard shows "Ready to Play" summary driven by army list validation (points, unpainted count, sync freshness)
- [ ] **DB-03**: Dashboard shows "Data Health" summary (sync age, warnings count, backup status)

### Game Day

- [ ] **GD-01**: Game Day has an "End Game" action that creates a battle log pre-filled with army list, date, and opponent
- [ ] **GD-02**: User can record post-game learnings (what rules were forgotten, MVP/underperformer units)
- [ ] **GD-03**: Forgotten rules from after-action can become future Game Day reminders
- [ ] **GD-04**: Unit/list notes can be updated from the Game Day after-action flow

## Future Requirements

Deferred to v0.3+:

- Restore from backup (connection lifecycle complexity)
- Auto-backup on schedule
- Army list snapshot versioning (freeze list state at game time)
- Per-round VP tracking in Game Day
- After-action analytics (per-mission/faction win rates)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud backup / sync | Local-first by design |
| Restore from backup | Connection lifecycle complexity — deferred to v0.3+ |
| Auto-backup on schedule | Manual backup sufficient for v0.2.13 |
| Real-time auto-sync | Local-first, user triggers manually |
| Competitive list optimization | Not the goal — hobby management focus |
| AI-powered recommendations | Deferred |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DI-01 | Phase 74 | Pending |
| DI-02 | Phase 74 | Pending |
| DI-03 | Phase 75 | Complete |
| DI-04 | Phase 75 | Complete |
| DI-05 | Phase 73 | Complete |
| PV-01 | Phase 76 | Pending |
| PV-02 | Phase 76 | Pending |
| PV-03 | Phase 76 | Pending |
| PV-04 | Phase 76 | Pending |
| PV-05 | Phase 76 | Pending |
| PV-06 | Phase 76 | Pending |
| PV-07 | Phase 76 | Pending |
| DX-01 | Phase 77 | Complete |
| DX-02 | Phase 77 | Complete |
| DX-03 | Phase 77 | Complete |
| DX-04 | Phase 77 | Pending |
| BK-01 | Phase 77 | Complete |
| BK-02 | Phase 77 | Complete |
| BK-03 | Phase 77 | Pending |
| DB-01 | Phase 78 | Pending |
| DB-02 | Phase 78 | Pending |
| DB-03 | Phase 78 | Pending |
| GD-01 | Phase 78 | Pending |
| GD-02 | Phase 78 | Pending |
| GD-03 | Phase 78 | Pending |
| GD-04 | Phase 78 | Pending |

**Coverage:**
- v0.2.13 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-05-14*
*Last updated: 2026-05-14 — traceability mapped during roadmap creation*
