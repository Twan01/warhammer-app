---
status: complete
phase: 14-spending-tracker
source:
  - .planning/phases/14-spending-tracker/14-00-SUMMARY.md
  - .planning/phases/14-spending-tracker/14-01-SUMMARY.md
  - .planning/phases/14-spending-tracker/14-02-SUMMARY.md
  - .planning/phases/14-spending-tracker/14-03-SUMMARY.md
started: 2026-05-04T08:00:00Z
updated: 2026-05-04T08:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Start the production app fresh from the desktop shortcut. App boots without errors, migration 006 completes silently (no crash), and the Spending page loads correctly.
result: pass

### 2. Unit price field in UnitSheet
expected: Open the Add/Edit Unit sheet (click + or pencil icon). A purchase price field appears accepting integer pence, with placeholder "e.g. 1250 for £12.50" and helper text "Enter amount in pence (100 = £1.00)".
result: pass

### 3. Unit price formatted in Details tab
expected: Enter 1250 in a unit's price field and save. Open that unit's detail sheet → Details tab. The Purchase Price row shows "£12.50" (not the raw integer 1250, not "—").
result: pass

### 4. Paint price field in PaintSheet
expected: Open the Add/Edit Paint sheet. A purchase price field appears with step=1 integers, placeholder "e.g. 350 for £3.50", and helper text "Enter amount in pence (100 = £1.00)".
result: pass

### 5. Spending sidebar navigation and hero card
expected: The sidebar shows a "Spending" entry with a wallet icon between Paints and Army Lists. Clicking it navigates to /spending and shows a hero card titled "Total Hobby Spend" with the formatted grand total (e.g. £12.50).
result: pass

### 6. Faction breakdown table
expected: The Spending page shows a breakdown table with a row for each of the 4 factions (all always visible, showing £0.00 for zero spend) and a separate "Paints" row at the bottom showing total spend on owned paints.
result: pass

### 7. Auto-refresh on mutation
expected: With the Spending page open, add or update a unit's price. The Total Hobby Spend and faction totals update automatically without navigating away or refreshing the page.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
