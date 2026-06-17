---
status: partial
phase: 134-no-dead-ends
source: [134-VERIFICATION.md]
started: 2026-06-17
updated: 2026-06-17
---

## Current Test

[awaiting human testing]

## Tests

### 1. Shared Abilities tab renders real data (HON-03)
expected: Open Rules Hub, select a faction with detachment abilities (e.g. Space Marines), click "Shared Abilities" tab. SharedAbilityCard rows appear with real ability names and description text; the legend badge shows the detachment name.
result: [pending]

### 2. Shared Abilities honest empty state for a zero-ability faction (HON-03)
expected: Select a faction with no `udb_detachment_abilities` rows, click "Shared Abilities" with an empty search box. The message "No shared abilities for this faction in the canonical database." appears — never a blank panel.
result: [pending]

### 3. Link unit button is clickable on an unmapped faction (HON-04)
expected: Open a unit whose collection faction has `wahapedia_faction_id = NULL`. The "Link unit" button is visibly enabled (not greyed out); clicking it opens the CollectionFactionLinkDialog.
result: [pending]

### 4. Faction-link flow: map then open scoped picker (HON-04)
expected: In the dialog, select a canonical faction and click "Link & open datasheets". Toast "Faction linked. Datasheets now available." appears; DatasheetPicker opens scoped to the newly-mapped faction's datasheets (not browse-all).
result: [pending]

### 5. Faction-link flow: cancel → browse-all (HON-04)
expected: In the dialog, click "Cancel — browse all instead". DatasheetPicker opens in browse-all mode showing "Type at least 2 characters to search all datasheets."; typing 2+ chars returns results.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
