# Requirements: HobbyForge v0.2.18

**Defined:** 2026-05-20
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play"

## v0.2.18 Requirements

Requirements for Army Lists 3.0 — Smart List Builder. Each maps to roadmap phases.

### Data Layer & Foundation

- [ ] **DL-01**: User can select model count tier for a unit in the army list, and points auto-resolve from synced_unit_point_tiers
- [ ] **DL-02**: User can see wargear/loadout options for a unit from BSData (display-only — wargear is free in 10th ed)
- [ ] **DL-03**: Units in army list display in stable insertion order (newest at bottom)
- [ ] **DL-04**: User can designate one unit as Warlord in the army list

### Enhancements

- [ ] **ENH-01**: User can browse detachment enhancements and assign one to a character unit, points auto-added to list total
- [ ] **ENH-02**: List validates enhancement rules: max 3 per army, no duplicates, character-only, excluded from Epic Heroes
- [ ] **ENH-03**: Enhancement points shown separately in army list summary bar with breakdown

### Leader Attachment

- [ ] **LDR-01**: User can attach a character unit as leader to a valid target unit, with valid pairings shown from synced_leader_targets
- [ ] **LDR-02**: Attached leader shown visually grouped with their target unit in the list

### Browsing & Planning

- [ ] **BRW-01**: User can browse all faction datasheets from army list context (not just owned collection)
- [ ] **BRW-02**: User can add unowned datasheets as "planned" units in the list, clearly marked vs owned
- [ ] **BRW-03**: Ghost/planned units do not appear in Collection, Dashboard stats, or Kanban

### Export

- [ ] **EXP-01**: User can copy army list as formatted text to clipboard (for Discord/forums)
- [ ] **EXP-02**: User can view a print-friendly layout and print via browser print dialog
- [ ] **EXP-03**: User can export army list as structured JSON file via save dialog
- [ ] **EXP-04**: User can export army list as PDF file via jsPDF

### Version Snapshots

- [ ] **SNP-01**: User can save the current army list state as a named snapshot
- [ ] **SNP-02**: User can view a history of saved snapshots with timestamps and point totals
- [ ] **SNP-03**: User can compare two snapshots side-by-side (units added/removed, points delta)
- [ ] **SNP-04**: User can restore a list to a previous snapshot state

## Future Requirements

Deferred to next milestone. Tracked but not in current roadmap.

### Advanced List Building

- **ADV-01**: Crusade roster tracking with experience and battle honors
- **ADV-02**: BattleScribe .rosz import for list migration
- **ADV-03**: Kill Team list support

## Out of Scope

| Feature | Reason |
|---------|--------|
| Competitive list optimization / net-listing | Explicitly not the goal — hobby tool, not competitive optimizer |
| Real-time auto-sync of rules data | Local-first, user triggers manually |
| Multi-game-system support | 40K 10th edition only |
| Cloud sync / sharing via account | Local-first by design |
| Points auto-update without user action | User must trigger sync; stale data is flagged, not auto-fixed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| — | — | Pending |

**Coverage:**
- v0.2.18 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20

---
*Requirements defined: 2026-05-20*
*Last updated: 2026-05-20 after initial definition*
