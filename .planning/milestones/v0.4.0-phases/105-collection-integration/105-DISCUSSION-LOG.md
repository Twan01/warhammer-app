# Phase 105: Collection Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 105-collection-integration
**Areas discussed:** Add-from-Database flow, Name-matching backfill, Badge presentation, Data Health diagnostics, Collection page changes
**Mode:** --auto (all decisions auto-selected)

---

## Add-from-Database Flow Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| Database browser datasheet sheet | Button on UdbDatasheetSheet opens UnitSheet in create mode with pre-fill | ✓ |
| Collection page "Add from DB" button | New button on collection page opens a database picker | |
| Both entry points | Available from both database browser and collection page | |

**Auto-selected:** Database browser datasheet sheet (recommended — matches COL-01 "browse/search → pick unit → add to collection" flow)
**Notes:** The datasheet sheet already shows full unit details; adding a button there is the natural entry point.

---

## Pre-fill Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Full pre-fill (name, faction, category, points, model_count) | Maximum convenience, all database fields mapped | ✓ |
| Minimal pre-fill (name, faction only) | Less assumption, more user control | |

**Auto-selected:** Full pre-fill (recommended — reduces manual data entry, all fields remain editable)
**Notes:** category derived from udb_units.role, model_count from composition min_models.

---

## Name-Matching Backfill Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Case-insensitive exact match + faction scope | Conservative, low false-positive rate | ✓ |
| Fuzzy/LIKE matching | More matches but risk of false positives | |
| No automatic backfill | Users link manually | |

**Auto-selected:** Case-insensitive exact match + faction scope (recommended — conservative, advisory-only)
**Notes:** Unmatched units remain NULL and appear in Data Health diagnostics.

---

## Ownership Badge Style

| Option | Description | Selected |
|--------|-------------|----------|
| "Owned ×N" count badge | Shows quantity, more informative | ✓ |
| Checkmark icon only | Binary owned/not-owned | |
| Colored dot indicator | Subtle, minimal space | |

**Auto-selected:** "Owned ×N" count badge (recommended — quantity is useful information for hobbyists who own multiples)

---

## Readiness Badge Style

| Option | Description | Selected |
|--------|-------------|----------|
| Aggregate worst-status badge | Green/amber/gray based on painting status of owned copies | ✓ |
| Per-copy breakdown | Show count per status level | |
| No readiness on browser rows | Keep browser clean, readiness on collection page only | |

**Auto-selected:** Aggregate worst-status badge (recommended — quick signal without clutter)

---

## Data Health Diagnostic

| Option | Description | Selected |
|--------|-------------|----------|
| Warning-severity count of unlinked units | Consistent with existing diagnostic pattern | ✓ |
| Info-severity suggestion | Less alarming | |
| Actionable linking wizard | Full bulk-link UI from Data Health | |

**Auto-selected:** Warning-severity count (recommended — consistent with existing pattern, actionable without scope creep)

---

## Claude's Discretion

- Badge styling details (color, variant, position)
- "Add to Collection" button placement within datasheet sheet
- Collection page "linked" indicator (nice-to-have)
- Navigation from collection unit to database entry (nice-to-have)
- Faction mapping implementation (new column vs join)

## Deferred Ideas

- Bulk linking wizard from Data Health page
- Army list points from database FK (Phase 106)
- Collection page linked icon
- Navigate collection → database entry
