# Requirements: HobbyForge v2.2 Full Circle

**Defined:** 2026-05-04
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.

## v2.2 Requirements

### Battle Log

- [x] **BATTLE-01**: User can log a game with opponent faction, mission name, result (Win/Loss/Draw), and date
- [x] **BATTLE-02**: User can select which of their army lists was used when logging a game
- [x] **BATTLE-03**: User can add optional notes to a game log entry (MVP unit, lessons learned)
- [x] **BATTLE-04**: User can view all logged games in a chronological list
- [x] **BATTLE-05**: User can delete a game log entry

### Wishlist

- [ ] **WISH-01**: User can add a wishlist item with a name, faction, and optional estimated cost in pence
- [ ] **WISH-02**: User can view all wishlist items on a dedicated page
- [ ] **WISH-03**: User can delete a wishlist item
- [ ] **WISH-04**: User can add optional notes to a wishlist item (e.g. "wait for sale", "for Crusade roster")

### Analytics

- [ ] **ANLY-01**: User can create a painting goal with a target unit count and timeframe (this month / this quarter)
- [ ] **ANLY-02**: Goal progress is calculated by counting distinct units with at least one painting session during the goal period
- [ ] **ANLY-03**: User can view all active and completed goals with a progress bar
- [x] **ANLY-04**: Dashboard shows hobby velocity — average units worked on per month from journal session history
- [x] **ANLY-05**: Dashboard shows current painting streak — consecutive calendar days with at least one journal session
- [x] **ANLY-06**: Spending page shows a monthly spend trend chart combining unit and paint purchases
- [x] **ANLY-07**: Spend trend chart uses purchase_date for both units and paints (new purchase_date column on paints)

### Display

- [ ] **DISP-01**: Collection page has a "Battle Ready" quick-filter showing only fully-painted and assembled units
- [ ] **DISP-02**: User can enter Showcase Mode to view all painted units in a full-screen gallery with app chrome hidden
- [ ] **DISP-03**: User can exit Showcase Mode to return to the normal app view

### Enrichment

- [x] **ENRCH-01**: User can write custom lore notes for a faction (chapter backstory, homeworld, custom name)
- [x] **ENRCH-02**: User can write custom lore notes for an individual unit (character history, battle honours)
- [x] **ENRCH-03**: User can record the primer/undercoat used on a unit (free-text, e.g. "Chaos Black", "Wraithbone")
- [x] **ENRCH-04**: Undercoat and lore notes fields are visible and editable in the unit detail sheet

## Future Requirements (v3.0)

### Advanced Play

- **CRUS-01**: User can track a Crusade campaign — missions, results, Crusade points, unit veterancy, battle honours
- **CRUS-02**: User can log unit scars and upgrade abilities earned during a Crusade campaign
- **CRUS-03**: Crusade roster shows unit experience and current battle tally

### Collection Planning

- **SPRUE-01**: User can log unbuilt kits (sprues) with box name, faction, and number of minis in the box
- **SPRUE-02**: Pile of shame view shows unbuilt + partially built units combined

### Smart Features

- **SMART-01**: Points Budget Planner — set a points limit and see the strongest battle-ready list from owned units
- **SMART-02**: "What to paint next" suggestion — cross-reference goals, army lists, and painting status to suggest the highest-value unit to paint
- **SMART-03**: Export army list as a printable PDF or plain-text format for the games table

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live stopwatch timer in session log | Manual duration entry after the session is the right desktop UX |
| Multi-currency / FX conversion | Single-currency personal tool |
| Receipt scanning / OCR | No camera/scanner integration |
| Budget alerts or spending limits | Passive tracking only |
| Barcode scanning | No hardware integration |
| AI features (recipe generator, spend analysis) | Deferred per PROJECT.md |
| Social sharing / export of journal | Local-first by design |
| Cloud backup of photos | Local filesystem only |
| Real-time multiplayer / cloud sync | Local-first by design |
| macOS / Linux builds | Windows-only |
| Official GW rules / datasheets / points | Legal/copyright constraint — never in scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENRCH-01 | Phase 17 | Complete |
| ENRCH-02 | Phase 17 | Complete |
| ENRCH-03 | Phase 17 | Complete |
| ENRCH-04 | Phase 17 | Complete |
| BATTLE-01 | Phase 18 | Complete |
| BATTLE-02 | Phase 18 | Complete |
| BATTLE-03 | Phase 18 | Complete |
| BATTLE-04 | Phase 18 | Complete |
| BATTLE-05 | Phase 18 | Complete |
| ANLY-04 | Phase 19 | Complete |
| ANLY-05 | Phase 19 | Complete |
| ANLY-06 | Phase 19 | Complete |
| ANLY-07 | Phase 19 | Complete |
| WISH-01 | Phase 20 | Pending |
| WISH-02 | Phase 20 | Pending |
| WISH-03 | Phase 20 | Pending |
| WISH-04 | Phase 20 | Pending |
| ANLY-01 | Phase 21 | Pending |
| ANLY-02 | Phase 21 | Pending |
| ANLY-03 | Phase 21 | Pending |
| DISP-01 | Phase 22 | Pending |
| DISP-02 | Phase 22 | Pending |
| DISP-03 | Phase 22 | Pending |

**Coverage:**
- v2.2 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-04*
*Last updated: 2026-05-04 after initial definition*
