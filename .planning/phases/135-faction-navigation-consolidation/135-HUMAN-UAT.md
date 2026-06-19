---
status: resolved
phase: 135-faction-navigation-consolidation
source: [135-VERIFICATION.md]
started: 2026-06-17
updated: 2026-06-19
---

## Current Test

[complete — all scenarios approved by user 2026-06-19]

## Tests

### 1. Faction CRUD and theming in Settings → Factions tab
expected: Open Settings → click the "Factions" tab (2nd, between Preferences and Data). The faction list renders with its "Factions / Manage your army factions" header. Editing a faction's color saves and updates the `--faction-accent` theming live; creating a new faction via the tab's "Add Faction" button works; deleting an empty faction works (and a faction with units shows the FK-aware delete guard).
result: [pass]

### 2. Quick Add → Add Faction opens FactionSheet
expected: Click the sidebar Quick Add (+) → "Add Faction". The FactionSheet opens and a faction can be created — independent of the now-removed /factions route.
result: [pass]

### 3. Data Health reachable in ≤ 2 clicks via Settings → Data
expected: The sidebar Management group shows only Spending and Wishlist (no "Data Health"). Settings → Data tab → "Open Data Health" button navigates to the Data Health page. Navigating directly to /data-health still resolves.
result: [pass]

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
