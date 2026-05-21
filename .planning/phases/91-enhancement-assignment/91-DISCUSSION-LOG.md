# Phase 91: Enhancement Assignment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 91-enhancement-assignment
**Areas discussed:** Enhancement Picker UX, Character/Epic Hero Detection, Summary Bar Integration, Validation Feedback
**Mode:** --auto (all decisions auto-selected)

---

## Enhancement Picker UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated Sheet (sibling portal) | EnhancementPickerSheet opened from unit row, listing available enhancements filtered by detachment | auto |
| Inline dropdown | Enhancement selector embedded in unit row | |
| Modal dialog | Full-screen dialog for enhancement browsing | |

**Auto-selected:** Dedicated Sheet (sibling portal) — matches established LoadoutBuilderSheet pattern
**Notes:** Consistent with the sibling portal pattern used for LoadoutBuilderSheet. Shows enhancements from synced_enhancements filtered by faction + detachment. Already-assigned enhancements marked/disabled.

---

## Character / Epic Hero Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Keywords from rw_datasheet_keywords | Query rules.db for Character/Epic Hero keywords per unit | auto |
| Hardcoded list | Maintain a static list of character units | |
| Synced field on units table | Add is_character column during sync | |

**Auto-selected:** Keywords from rw_datasheet_keywords — leverages existing rules data without schema changes
**Notes:** Cross-db lookup to rules.db. Ghost units resolved via ghost_unit_name -> rw_datasheets.name join. Enhancement trigger only shown on character (non-Epic-Hero) rows.

---

## Summary Bar Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Separate stat line + combined total | Show "Enhancements: X pts" as separate stat, include in pointsExceeded check | auto |
| Merged into total only | Just add enhancement pts to total number, no breakdown | |

**Auto-selected:** Separate stat line + combined total — gives users visibility into the enhancement cost breakdown
**Notes:** ArmyListSummaryBar gets enhancement data via prop or useEnhancementsByList. computeListWarnings pointsExceeded check includes enhancement total. ArmyListCard also updated for consistency.

---

## Validation Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Preventive (disabled buttons + tooltips) | Block invalid actions before they happen, explain via tooltip | auto |
| Reactive (try then error toast) | Allow the action, show error toast on failure | |

**Auto-selected:** Preventive (disabled buttons + tooltips) — better UX, prevents user frustration
**Notes:** Max 3 per list, no duplicate names, character-only (enforced by trigger visibility), no Epic Heroes. Toast as fallback for concurrent modification edge cases.

---

## Claude's Discretion

- EnhancementPickerSheet layout and spacing
- Whether is_character/is_epic_hero resolved via query JOIN or separate client-side hook
- Icon choice for enhancement trigger in unit row
- Whether to show enhancement badges inline on unit rows
- Query hook file organization

## Deferred Ideas

- Leader attachment visual grouping — Phase 92
- Datasheet browser for ghost units — Phase 93
- Enhancement persistence across snapshots — Phase 95
- Enhancement warnings in Game Day mode — future milestone
