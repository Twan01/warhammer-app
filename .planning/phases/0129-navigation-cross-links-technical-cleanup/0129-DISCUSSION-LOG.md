# Phase 129: Navigation, Cross-Links & Technical Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 129-Navigation, Cross-Links & Technical Cleanup
**Areas discussed:** Painting Mode Return Nav, Cross-Links, Sidebar Fixes, Technical Cleanup
**Mode:** --auto (all decisions auto-selected)

---

## Painting Mode Return Navigation (NAV-01)

| Option | Description | Selected |
|--------|-------------|----------|
| returnTo search param | TanStack Router search param on painting-mode route | ✓ |
| History-based (navigate(-1)) | Browser history back navigation | |
| localStorage last page | Store originating page in localStorage | |

**Auto-selected:** returnTo search param (recommended default)
**Notes:** Clean, explicit, works with deep links. All 6 entry points pass their current path. Falls back to "/" if param absent.

---

## Collection-to-Database Cross-Link (NAV-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Ghost button in sheet header | Button near unit name in UnitDetailSheet | ✓ |
| Inline text link | Hyperlink within unit details area | |

**Auto-selected:** Ghost button in sheet header (recommended default)
**Notes:** Only shown when unit has canonical_unit_id. Uses BookMarked or ExternalLink icon.

---

## Rules Hub / Unit Database Cross-Links (NAV-03)

| Option | Description | Selected |
|--------|-------------|----------|
| PageHeader actions buttons | Ghost buttons in each page's header area | ✓ |
| Inline banner links | Banner at top of page content | |

**Auto-selected:** PageHeader actions buttons (recommended default)
**Notes:** Simple bidirectional navigation. No context passing needed.

---

## Game Day Sidebar Highlighting (NAV-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Add Game Day to PLAY_NAV | New sidebar entry with pattern matching | ✓ |
| Special-case NavItem matching | Modify NavItem to recognize /game-day/* | |

**Auto-selected:** Add Game Day to PLAY_NAV (recommended default)
**Notes:** NavItem's startsWith matching handles /game-day/$listId automatically. Claude has discretion on whether the link navigates to /army-lists or a /game-day index.

---

## Collapsed Sidebar Dividers (NAV-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Thin border-b dividers | border-border/40 between nav groups | ✓ |
| Dot separators | Small dots between groups | |

**Auto-selected:** Thin border-b dividers (recommended default)
**Notes:** Matches existing border-border/40 pattern used in wordmark and Quick Add borders.

---

## Battle Log Army List Links (NAV-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Clickable Link component | army list name becomes a TanStack Router Link | ✓ |
| Button with navigation | Separate button next to army list name | |

**Auto-selected:** Clickable Link component (recommended default)
**Notes:** Only linked when army list still exists. Deleted lists show italic text as-is.

---

## Technical Cleanup (NAV-07, NAV-08, NAV-09, NAV-10, NAV-11)

All technical cleanup items are straightforward refactoring with clear patterns from existing code:
- NAV-07: Dead code audit and deletion in ArmyListDetailSheet.tsx
- NAV-08: React.memo wrapping following KanbanCard pattern
- NAV-09: Reducer extraction to separate file
- NAV-10: CSS transition verification/enhancement
- NAV-11: Escape hint in StepFocalView active step view

**Auto-selected:** Standard approaches for all (recommended defaults)

---

## Claude's Discretion

- Exact placement of cross-link buttons within PageHeader actions
- Game Day sidebar entry navigation target
- CSS approach for sidebar collapse smoothness
- ArmyListDetailSheet dead code scope (verify before deleting)
- Icon choices for cross-links

## Deferred Ideas

None — discussion stayed within phase scope.
