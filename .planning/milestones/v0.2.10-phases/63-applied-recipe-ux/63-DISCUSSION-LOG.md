# Phase 63: Applied Recipe UX - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 63-Applied Recipe UX
**Areas discussed:** Assignment Entry Point, Recipe Preview Before Apply, Step Checklist Layout, Bulk Apply Flow
**Mode:** --auto (all decisions auto-selected)

---

## Assignment Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| Both UnitDetailSheet and RecipeDetailSheet | Bidirectional — apply from unit side or recipe side | ✓ |
| UnitDetailSheet only | Apply only from unit context | |
| RecipeDetailSheet only | Apply only from recipe context | |

**Auto-selected:** Both entry points (recommended default)
**Notes:** Matches existing bidirectional patterns in the app. UnitDetailSheet shows linked recipes; RecipeDetailSheet shows linked unit. Both directions natural for different workflows.

---

## Recipe Preview Before Apply

| Option | Description | Selected |
|--------|-------------|----------|
| Inline preview in Dialog | SectionedTimeline in a Dialog before confirm | ✓ |
| Separate preview step (wizard) | Multi-step wizard with preview as step 2 | |
| No preview (direct apply) | Apply immediately, review after | |

**Auto-selected:** Inline preview in Dialog (recommended default)
**Notes:** Reuses existing SectionedTimeline component. Simple single-action flow — wizard is overkill for a confirmation dialog.

---

## Step Checklist Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Sectioned accordion with checkboxes | Collapsible sections, checkbox rows, progress bar | ✓ |
| Flat checklist | All steps in one list regardless of sections | |
| Timeline-style (like SectionedTimeline) | Read-only timeline with toggle buttons | |

**Auto-selected:** Sectioned accordion with checkboxes (recommended default)
**Notes:** Maps naturally to computeAssignmentProgress.bySectionId. Flat recipes degrade to simple checklist (no accordion). Accordion keeps long recipes manageable.

---

## Bulk Apply Flow

| Option | Description | Selected |
|--------|-------------|----------|
| From RecipeDetailSheet with unit multi-select | "Apply to Units" button, Dialog with searchable unit picker | ✓ |
| From CollectionPage with row checkboxes | Select units in table, then pick recipe | |
| Dedicated bulk operations page | Separate page for batch recipe management | |

**Auto-selected:** From RecipeDetailSheet with unit multi-select (recommended default)
**Notes:** Natural starting point — user is looking at a recipe and wants to apply it. Already-assigned units dimmed. Uses useBulkCreateAssignments hook.

---

## Claude's Discretion

- Tab vs section placement for applied recipes in UnitDetailSheet
- Delete/remove assignment UX details
- Recipe picker dialog layout
- Loading/error states
- Quick summary display on applied recipe cards

## Deferred Ideas

None — discussion stayed within phase scope
