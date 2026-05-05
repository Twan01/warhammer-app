# Requirements: HobbyForge v2.4

**Defined:** 2026-05-05
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play"

## v2.4 Requirements

Requirements for Premium Dashboard UX & Visual Polish. Each maps to roadmap phases.

### Dashboard Layout & Navigation

- [ ] **LAYOUT-01**: Dashboard uses asymmetric CSS grid with 2-column bento layout on desktop, stacking cleanly on narrow windows (min 900px)
- [ ] **LAYOUT-02**: StatCards navigate to their relevant page when clicked (Collection, Projects, Battle Log, Spending)
- [ ] **LAYOUT-03**: Dashboard pipeline displays 5 grouped buckets (Not Started / Assembly / Painting / Finishing / Done) with counts, mapped from 11 painting statuses

### Dashboard Panels

- [ ] **PANEL-01**: CurrentFocusCard displays unit photo thumbnail (or faction-colored fallback), unit name, faction, model count, and points value
- [ ] **PANEL-02**: CurrentFocusCard provides action buttons: Open Unit and Log Progress (opens LogSessionSheet with unit preselected)
- [ ] **PANEL-03**: ActiveProjectsPanel shows up to 5 active painting projects with photo thumbnail, name, progress percentage, last updated, and quick actions (Open, Log Session)
- [ ] **PANEL-04**: ArmyReadinessCard displays per-faction battle-ready points with a target selector (500 / 1000 / 1500 / 2000 pts)
- [ ] **PANEL-05**: ArmyReadinessCard shows progress bar per faction toward selected target with owned-vs-ready breakdown

### Photo Integration

- [ ] **PHOTO-01**: CurrentFocusCard, ActiveProjectsPanel, and RecentActivityFeed display unit photo thumbnails from existing journal photos
- [ ] **PHOTO-02**: All photo-bearing dashboard components use a consistent fallback (faction-colored placeholder with icon) when no photo exists

### Visual Polish

- [ ] **VIS-01**: FactionSummaryCard upgraded to larger cards with dominant faction accent color band and clear active/focus indicator (not just a star)
- [ ] **VIS-02**: Dashboard hero area has premium visual depth with subtle radial gradient background
- [ ] **VIS-03**: Card surfaces use elevated/hover hierarchy (panel-elevated token, shadow transitions)

### Data & Intelligence

- [ ] **DATA-01**: LogSessionSheet includes an optional painting status field that updates the unit's status_painting on submit
- [ ] **DATA-02**: Log Session status update correctly invalidates dashboard-stats, units, and painting-sessions query caches
- [ ] **DATA-03**: Spending page displays cost per completed model metric (total spend / fully painted model count)
- [ ] **DATA-04**: Spending page displays painted vs unpainted collection value split
- [ ] **DATA-05**: User can see which units are associated with a given recipe and vice versa
- [ ] **DATA-06**: CurrentFocusCard shows linked recipe name when a recipe is associated with the focus unit

## Future Requirements

Deferred to v2.5+.

### Wishlist & Goals

- **WISH-01**: User can create hobby goals with target dates
- **WISH-02**: User can maintain a wishlist of desired units/paints
- **WISH-03**: Dashboard shows goal progress

### Display & Showcase

- **DISP-01**: Battle Ready collection filter preset
- **DISP-02**: Showcase Mode for completed units

## Out of Scope

| Feature | Reason |
|---------|--------|
| Drag-to-resize dashboard cards | Full product unto itself; adds significant bundle weight; designed hierarchy IS the information architecture |
| Per-model photo gallery (sub-unit) | HobbyForge tracks at unit level; per-model is a data model overhaul |
| AI recipe suggestions | Requires LLM API calls — violates local-first, no-network constraint |
| Cloud photo sync | Hard incompatibility with local-first architecture |
| Budget alerts / spending forecasting | Settings/preferences surface overhead for single-user app |
| Animated spending charts (stock ticker) | D3 animation complexity for no new data insight; static charts sufficient |
| Full-screen painting timer | Different mental model than dashboard; LogSessionSheet covers session logging |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | Phase 30 | Pending |
| LAYOUT-02 | Phase 30 | Pending |
| LAYOUT-03 | Phase 30 | Pending |
| PANEL-01 | Phase 31 | Pending |
| PANEL-02 | Phase 31 | Pending |
| PANEL-03 | Phase 31 | Pending |
| PHOTO-01 | Phase 31 | Pending |
| PHOTO-02 | Phase 31 | Pending |
| PANEL-04 | Phase 32 | Pending |
| PANEL-05 | Phase 32 | Pending |
| DATA-01 | Phase 33 | Pending |
| DATA-02 | Phase 33 | Pending |
| DATA-03 | Phase 33 | Pending |
| DATA-04 | Phase 33 | Pending |
| DATA-05 | Phase 33 | Pending |
| DATA-06 | Phase 33 | Pending |
| VIS-01 | Phase 34 | Pending |
| VIS-02 | Phase 34 | Pending |
| VIS-03 | Phase 34 | Pending |

**Coverage:**
- v2.4 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 after roadmap creation — traceability complete*
