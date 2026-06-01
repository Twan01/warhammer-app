---
phase: 104
plan: 3
status: complete
started: 2026-05-30
completed: 2026-05-30
commits:
  - "feat(104): add datasheet detail sheet with stat block, weapons, and abilities"
---

# Plan 104-03 Summary: Datasheet Detail Sheet

Created three components for the unit datasheet detail view:

- **UdbStatBlock** — grid table rendering M/T/SV/W/LD/OC stats with multi-profile support and inv save display
- **UdbWeaponsTable** — weapon stat grid with keyword display, shared between ranged (BS) and melee (WS) sections
- **UdbDatasheetSheet** — full datasheet Sheet panel with stat block, composition/points, collapsible weapon and ability sections, keyword badges, and damaged profile

All components follow the existing PlaybookDatasheet patterns. DatabaseBrowserPage wiring is deferred to after Plan 02 completes.
