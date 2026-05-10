# Requirements: HobbyForge

**Defined:** 2026-05-10
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.

## v0.2.8 Requirements

Requirements for Rules Data Hub / Army Lists 2.0 / Game Day. Each maps to roadmap phases.

### Rules Data Hub

- [x] **RULES-01**: User can view sync status (last sync date, row counts per table, source version, freshness badge)
- [x] **RULES-02**: User can view and trigger sync from the Rules Data Hub page
- [x] **RULES-03**: User can view sync error history with timestamps and error details
- [x] **RULES-04**: User can view sync diff summary (datasheets added/removed/modified/renamed since last sync)
- [ ] **RULES-05**: User can browse stratagems by faction with filters (phase, CP cost, keyword)
- [ ] **RULES-06**: User can browse detachments and detachment abilities by faction
- [ ] **RULES-07**: User can browse shared abilities by faction
- [ ] **RULES-08**: User can search rules data by name/keyword across all rule types
- [x] **RULES-09**: Rules Hub displays clear disclaimer that data is user-provided external data (not official)

### Army Lists 2.0

- [ ] **ARMY-01**: User can select a detachment for an army list
- [ ] **ARMY-02**: User can view the selected detachment's ability in the army list detail
- [ ] **ARMY-03**: User can view relevant stratagems for the selected detachment in the army list
- [ ] **ARMY-04**: User sees a stale-data warning when army list uses rules data older than 30 days
- [ ] **ARMY-05**: User can view list-level rules reminders (user-marked favorites from Playbook)
- [x] **ARMY-06**: Points import design is documented (schema, versioning, deltas, manual override, list impact)

### Game Day Mode

- [ ] **GAME-01**: User can launch Game Day mode from an army list
- [ ] **GAME-02**: User can view detachment stratagems grouped by game phase (Command, Movement, Shooting, Charge, Fight)
- [ ] **GAME-03**: User can track CP spent/remaining during a game
- [ ] **GAME-04**: User can view a pre-game checklist (setup steps, verify-before-play reminders)
- [ ] **GAME-05**: User can view unit ability reminders for units in the selected list
- [ ] **GAME-06**: User can view once-per-game abilities with used/unused toggle
- [ ] **GAME-07**: User can view user-marked reminders from Playbook favorites in Game Day
- [ ] **GAME-08**: User can see painting status of units in the list (contextual readiness signal)

### Playbook Enhancements

- [ ] **PLAY-01**: User can mark any rule (stratagem, ability, detachment ability) as a favorite
- [ ] **PLAY-02**: User can mark any rule as a "Game Day reminder"
- [ ] **PLAY-03**: User can add personal notes to any imported rule without modifying source data
- [ ] **PLAY-04**: Favorites and notes visually distinct from imported data in PlaybookTab

## Future Requirements

### Points Import

- **PTS-01**: User can import points values from external CSV source
- **PTS-02**: User can view points delta after re-import (which units changed, by how much)
- **PTS-03**: User sees outdated-points warning on affected army lists
- **PTS-04**: Manual override always takes priority over imported points

### Advanced Game Day

- **GAME-09**: User can save/resume game state across app restarts
- **GAME-10**: User can track victory points during a game
- **GAME-11**: User can view turn counter with round-specific reminders

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rules legality validation | Not the goal — hobby tool, not competitive rules engine |
| Multi-detachment support | 10th edition standard is single detachment per army |
| Reproduced GW text in UI | Copyright constraint — show user-imported data only |
| Persistent game state in SQLite | v0.2.8 uses Zustand persist (localStorage) — SQLite deferred |
| Real-time auto-sync | Local-first, user triggers manually |
| Points import implementation | Design doc only in v0.2.8; implementation deferred to future |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARMY-06 | Phase 52 | Complete |
| RULES-01 | Phase 53 | Complete |
| RULES-02 | Phase 53 | Complete |
| RULES-03 | Phase 53 | Complete |
| RULES-04 | Phase 53 | Complete |
| RULES-05 | Phase 53 | Pending |
| RULES-06 | Phase 53 | Pending |
| RULES-07 | Phase 53 | Pending |
| RULES-08 | Phase 53 | Pending |
| RULES-09 | Phase 53 | Complete |
| ARMY-01 | Phase 54 | Pending |
| ARMY-02 | Phase 54 | Pending |
| ARMY-03 | Phase 54 | Pending |
| ARMY-04 | Phase 54 | Pending |
| ARMY-05 | Phase 54 | Pending |
| PLAY-01 | Phase 55 | Pending |
| PLAY-02 | Phase 55 | Pending |
| PLAY-03 | Phase 55 | Pending |
| PLAY-04 | Phase 55 | Pending |
| GAME-01 | Phase 56 | Pending |
| GAME-02 | Phase 56 | Pending |
| GAME-03 | Phase 56 | Pending |
| GAME-04 | Phase 56 | Pending |
| GAME-05 | Phase 56 | Pending |
| GAME-06 | Phase 56 | Pending |
| GAME-07 | Phase 56 | Pending |
| GAME-08 | Phase 56 | Pending |

**Coverage:**
- v0.2.8 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-10*
*Last updated: 2026-05-10 after roadmap creation*
