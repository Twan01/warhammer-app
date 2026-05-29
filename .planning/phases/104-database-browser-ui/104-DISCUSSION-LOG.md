# Phase 104: Database Browser UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 104-database-browser-ui
**Areas discussed:** Navigation placement, Page architecture, Unit list display, Datasheet detail view, Search UX, Filter state management, Query layer
**Mode:** --auto (all decisions auto-selected)

---

## Navigation Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Play group (after Rules Hub) | Reference tool for game prep, alongside Rules Hub and Game Day | ✓ |
| Command group (near Collection) | Closer to collection data, but Collection is about owned units | |
| New "Reference" group | Would fragment the sidebar with a single-item group | |

**Auto-selected:** Play group — database browser is a game reference tool, same category as Rules Hub.

---

## Page Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Single page with faction picker + content area | Mirrors Rules Hub pattern, no route changes mid-browse | ✓ |
| Multi-page flow (separate routes per level) | More URL-addressable but heavier navigation overhead | |
| Master-detail split view | Full two-panel layout, but overkill for mobile-width windows | |

**Auto-selected:** Single page — consistent with Rules Hub, simpler routing, keeps context while browsing.

---

## Unit List Display

| Option | Description | Selected |
|--------|-------------|----------|
| Role-grouped with collapsible headers | Matches GW codex structure, easy to find unit types | ✓ |
| Flat alphabetical list | Simpler but loses organizational context | |
| Tabbed by role | Too many tabs (9 roles), cluttered | |

**Auto-selected:** Role-grouped collapsible headers — matches GW index organization and the BUI-02 requirement.

---

## Datasheet Detail View

| Option | Description | Selected |
|--------|-------------|----------|
| Sheet overlay (right drawer) | Consistent with app-wide pattern, preserves scroll position | ✓ |
| Inline expansion in list | Can only see one at a time, pushes content around | |
| Full page route | Loses browse context, requires back navigation | |

**Auto-selected:** Sheet overlay — matches UnitDetailSheet, UnitSheet, and other detail views across the app.

---

## Search UX

| Option | Description | Selected |
|--------|-------------|----------|
| Top-of-page search bar, replaces content when active | Clear mode switch, no confusion about scope | ✓ |
| Persistent search that filters within faction | Limited to one faction at a time, doesn't fulfill BUI-04 (cross-faction) | |
| Command palette (Ctrl+K) | Discoverable but hidden, not ideal for primary feature | |

**Auto-selected:** Top-of-page search bar with content replacement — fulfills BUI-04 cross-faction requirement directly.

---

## Filter State Management

| Option | Description | Selected |
|--------|-------------|----------|
| Zustand store | Matches rulesHubFilters.ts and collectionFilters.ts patterns | ✓ |
| URL search params | Shareable but no URL sharing in desktop app | |
| Component state | Resets on navigation, poor UX | |

**Auto-selected:** Zustand store — consistent with established filter patterns in the app.

---

## Query Layer

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated query module + hooks | Clean separation, follows project conventions | ✓ |
| Reuse existing datasheet hooks | Different data source (udb_* vs rw_*), would create confusion | |

**Auto-selected:** Dedicated `unitDatabase.ts` query module + `useUnitDatabase.ts` hooks — clean boundary from legacy rw_* queries.

---

## Claude's Discretion

- Exact layout proportions (faction picker width, unit list density)
- Whether faction picker is a left sidebar panel or a top-level selector bar
- Stat block table styling details
- Empty states and error states
- Keyboard navigation within the unit list

## Deferred Ideas

- "Add to Collection" button on datasheet — Phase 105
- Ownership/readiness badges — Phase 105
- Unit comparison view — v2 (ADV-01)
- Faction overview page — v2 (ADV-02)
