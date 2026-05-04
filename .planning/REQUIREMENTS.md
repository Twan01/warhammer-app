# Requirements: HobbyForge v2.3 Hobby Command Center

**Defined:** 2026-05-04
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.

## v2.3 Requirements

### Design Foundation

- [ ] **DSFD-01**: User sees consistent visual surfaces using defined design tokens (Forge Black, Gunmetal, Panel Elevated, Battle Gold) as CSS variables across all pages
- [ ] **DSFD-02**: User sees a consistent page header on every main page via a shared `PageHeader` component (title, subtitle, action buttons row)
- [ ] **DSFD-03**: User sees enriched MetricCards that show an icon, value, label, and optional progress bar or trend indicator — not just a number on a plain card
- [ ] **DSFD-04**: User sees painting status represented by a consistent colored `StatusBadge` component throughout the app (collection, gallery, kanban, army lists)

### Dashboard Redesign

- [ ] **DASH-01**: Dashboard header shows the title "Hobby Command Center" with a dynamic subtitle summarizing active hobby state (e.g. "2 active projects · 8 models tracked · 0 battle-ready points")
- [ ] **DASH-02**: User can click Quick Add or Log Session action buttons from the dashboard header without leaving the dashboard
- [ ] **DASH-03**: Dashboard shows a `CurrentFocusCard` as the primary visual anchor — displaying the most recently active project with its painting stages, progress, and a next-action suggestion
- [ ] **DASH-04**: Dashboard shows a visual `HobbyPipeline` strip — unit counts at each stage from Owned to Battle Ready — replacing the isolated percentage stat cards
- [ ] **DASH-05**: Dashboard faction cards are upgraded to show painting progress percentage and battle-ready point count alongside the existing unit count
- [ ] **DASH-06**: Dashboard shows a Recent Activity feed derived from existing data — last N events including units added/updated, sessions logged, and battles recorded

### Navigation & Quick Add

- [ ] **NAV-01**: Sidebar group labels are renamed to hobby-native names: **Command** (Dashboard, Collection, Projects), **Workshop** (Paints, Recipes), **Play** (Army Lists, Battle Log), **Management** (Factions, Spending)
- [ ] **NAV-02**: A Quick Add button in the sidebar opens a dropdown menu with 8 creation actions: Add Unit, Add Faction, Add Paint, Add Recipe, Create Project, Log Session, Add Purchase, Log Battle
- [ ] **NAV-03**: Each Quick Add action opens the corresponding create Sheet as an overlay — the user stays on the current page without navigating

### Collection

- [ ] **COLL-01**: Collection gallery cards display a photo thumbnail sourced from the unit's most recent journal photo when one exists, or a faction-colored placeholder
- [ ] **COLL-02**: Collection gallery cards and table rows use the unified `StatusBadge` for painting status display

### Projects

- [ ] **PROJ-01**: Painting project kanban cards are enriched to show last-updated date, linked recipe name (if linked), and journal photo count for the project unit
- [ ] **PROJ-02**: Each kanban card shows a next-action hint derived from the unit's current painting stage (e.g. "Ready to prime", "Start base coating")
- [ ] **PROJ-03**: User can open a Log Session sheet directly from a shortcut on a kanban card without navigating to the unit detail

### Workshop

- [ ] **WKSP-01**: Paint list entries display a color swatch with consistent visual treatment using the design token color system
- [ ] **WKSP-02**: Recipe cards show a compact paint swatch strip — all linked paints visible at a glance on the card

### Play Layer

- [ ] **PLAY-01**: Army List detail shows a readiness panel with battle-ready points, total points, readiness percentage, and a list of which units are blocking full readiness
- [ ] **PLAY-02**: Battle Log entries display the linked army list's name alongside its current battle-ready point count

## Deferred from v2.2

Features planned in v2.2 but deferred to a future milestone:

### Wishlist

- **WISH-01**: User can add a wishlist item with a name, faction, and optional estimated cost in pence
- **WISH-02**: User can view all wishlist items on a dedicated page
- **WISH-03**: User can delete a wishlist item
- **WISH-04**: User can add optional notes to a wishlist item (e.g. "wait for sale", "for Crusade roster")

### Analytics Goals

- **ANLY-01**: User can create a painting goal with a target unit count and timeframe (this month / this quarter)
- **ANLY-02**: Goal progress is calculated by counting distinct units with at least one painting session during the goal period
- **ANLY-03**: User can view all active and completed goals with a progress bar

### Display

- **DISP-01**: Collection page has a "Battle Ready" quick-filter showing only fully-painted and assembled units
- **DISP-02**: User can enter Showcase Mode to view all painted units in a full-screen gallery with app chrome hidden
- **DISP-03**: User can exit Showcase Mode to return to the normal app view

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
| Command palette (Cmd+K) | Dropdown Quick Add chosen as the simpler interaction model |
| Stage-based projects view | Existing dnd-kit kanban enriched, not replaced |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DSFD-01 | TBD | Pending |
| DSFD-02 | TBD | Pending |
| DSFD-03 | TBD | Pending |
| DSFD-04 | TBD | Pending |
| DASH-01 | TBD | Pending |
| DASH-02 | TBD | Pending |
| DASH-03 | TBD | Pending |
| DASH-04 | TBD | Pending |
| DASH-05 | TBD | Pending |
| DASH-06 | TBD | Pending |
| NAV-01 | TBD | Pending |
| NAV-02 | TBD | Pending |
| NAV-03 | TBD | Pending |
| COLL-01 | TBD | Pending |
| COLL-02 | TBD | Pending |
| PROJ-01 | TBD | Pending |
| PROJ-02 | TBD | Pending |
| PROJ-03 | TBD | Pending |
| WKSP-01 | TBD | Pending |
| WKSP-02 | TBD | Pending |
| PLAY-01 | TBD | Pending |
| PLAY-02 | TBD | Pending |

**Coverage:**
- v2.3 requirements: 22 total
- Mapped to phases: TBD (roadmapper will fill)
- Unmapped: 22 ⚠️

---
*Requirements defined: 2026-05-04*
*Last updated: 2026-05-04 after initial definition*
