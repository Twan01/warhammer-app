# Requirements: HobbyForge v2.1 Visual Command

**Defined:** 2026-05-02
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.

## v2.1 Requirements

### Faction Dynamic Theming

- [x] **THEME-01**: User can select an active faction and the UI accent color (buttons, badges, status rings, highlights) shifts to that faction's theme color across the entire app immediately
- [x] **THEME-02**: Active faction selection persists after closing and reopening the app
- [x] **THEME-03**: User can set the active faction from the Dashboard

### Visual / UX

- [x] **UI-01**: User can collapse the sidebar to icon-only mode via a toggle control
- [x] **UI-02**: Sidebar collapsed/expanded state persists across app restarts
- [x] **UI-03**: Icons in collapsed sidebar show a tooltip with the nav label on hover
- [x] **UI-04**: User can switch the Collection page between table view and gallery view using a view toggle
- [x] **UI-05**: Gallery view displays unit cards with unit name, faction badge, painting-status ring, and painted percentage
- [x] **UI-06**: Switching between table and gallery view preserves all active filters (no filter reset on toggle)
- [x] **UI-07**: Dashboard hero section shows animated stat counters for total units, painted count, and battle-ready percentage
- [x] **UI-08**: Dashboard faction summary section displays cards with faction-accent color accents driven by the active theme

### Hobby Journal

- [x] **JOUR-01**: User can log a painting session per unit with date, duration in minutes, and optional notes
- [x] **JOUR-02**: User can view all painting sessions for a unit in the unit detail sheet, sorted newest first
- [x] **JOUR-03**: User can delete a painting session entry
- [x] **JOUR-04**: User can attach a photo to a unit with a stage label (e.g. "Primed", "Base coat", "Finished") and optional caption
- [x] **JOUR-05**: User can view the photo timeline for a unit as a chronological gallery of thumbnails with stage labels
- [x] **JOUR-06**: Deleting a unit removes its associated photo files from disk alongside the DB rows

### Spending Tracker

- [ ] **SPEND-01**: User can log a purchase price and purchase date per unit in the unit detail sheet
- [ ] **SPEND-02**: User can log a purchase price per paint pot in the paint detail sheet
- [ ] **SPEND-03**: User can view a Spending page showing total hobby spend (units + paints combined)
- [ ] **SPEND-04**: Spending page breaks down total spend by faction
- [ ] **SPEND-05**: Spending values are stored as integer pence in SQLite and displayed as formatted currency throughout the UI

## Future Requirements (v2.2+)

### Hobby Journal (deferred)

- **JOUR-07**: Export unit journal (sessions + photos) as a printable PDF or image
- **JOUR-08**: Photo before/after comparison slider for a unit

### Spending (deferred)

- **SPEND-06**: Spending trend chart over time (monthly/quarterly)
- **SPEND-07**: Import purchase history from CSV

### Theming (deferred)

- **THEME-04**: Custom faction color picker (override default hex per faction)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live stopwatch timer in session log | Manual duration entry after the session is the right desktop UX — timer adds complexity for minimal value |
| Multi-currency / FX conversion | Single-currency personal tool; locale formatting handles display |
| Receipt scanning / OCR | No camera/scanner integration; manual entry only |
| Budget alerts or spending limits | Passive tracking only; no notification system |
| Barcode scanning for purchases | No hardware integration |
| AI-powered features (recipe generator, spend analysis) | Deferred per PROJECT.md |
| Social sharing / export of journal to community | Local-first by design |
| Cloud backup of photos | Local filesystem only; no cloud |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| THEME-01 | Phase 10 | Complete |
| THEME-02 | Phase 10 | Complete |
| THEME-03 | Phase 10 | Complete |
| UI-01 | Phase 10 | Complete |
| UI-02 | Phase 10 | Complete |
| UI-03 | Phase 10 | Complete |
| UI-07 | Phase 11 | Complete |
| UI-08 | Phase 11 | Complete |
| UI-04 | Phase 12 | Complete |
| UI-05 | Phase 12 | Complete |
| UI-06 | Phase 12 | Complete |
| JOUR-01 | Phase 13 | Complete |
| JOUR-02 | Phase 13 | Complete |
| JOUR-03 | Phase 13 | Complete |
| JOUR-04 | Phase 13 | Complete |
| JOUR-05 | Phase 13 | Complete |
| JOUR-06 | Phase 13 | Complete |
| SPEND-01 | Phase 14 | Pending |
| SPEND-02 | Phase 14 | Pending |
| SPEND-03 | Phase 14 | Pending |
| SPEND-04 | Phase 14 | Pending |
| SPEND-05 | Phase 14 | Pending |

**Coverage:**
- v2.1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-02*
*Last updated: 2026-05-02 — traceability corrected to match ROADMAP.md phase assignments (Phase 10: THEME+UI-01..03, Phase 11: UI-07..08, Phase 12: UI-04..06, Phase 13: JOUR-01..06, Phase 14: SPEND-01..05)*
