---
status: partial
phase: 138-player-journey-depth
source: [138-VERIFICATION.md]
started: 2026-06-18
updated: 2026-06-18
---

## Current Test

[awaiting human testing]

## Tests

### 1. Comparison diff-highlight rendering
expected: On `/unit-database/compare` with 2–3 units selected, cells whose values differ across columns are tinted with the faction accent (`bg-faction-accent/15`); identical cells stay neutral. Covers stats, weapons, abilities, keywords, and points.
result: [pending]

### 2. Compare selection cap of 3
expected: Selecting a 3rd unit fills the compare tray; the "add to compare" (GitCompare) toggle on every other `UdbUnitRow` becomes visibly disabled (dimmed / not-allowed cursor) and cannot add a 4th. The sticky "Compare (N)" action bar enables at 2 and navigates to the compare page.
result: [pending]

### 3. Owned-badge → filtered Collection deep link
expected: Clicking the "Owned ×N" badge on a Unit Database row (and on the datasheet header) navigates to the Collection filtered to exactly that canonical unit's owned models. When the filter yields results they show; the row click behind the badge does NOT also open the datasheet (stopPropagation). A filtered-but-empty result shows the "no units match your filters" state with a Clear control — not the false "empty collection" state (CR-02 fix).
result: [pending]

### 4. Cross-faction search owned badges
expected: In the Unit Database global search (cross-faction `UdbSearchResults`), units the user owns show an "Owned ×N" badge — not just within the faction-filtered browser. Counts update after adding/removing a collection unit (invalidation of `["udb-ownership-all"]`).
result: [pending]

### 5. Dashboard goal-progress widget
expected: The dashboard left column (after "Hobby Health"/"By Faction") shows a "Hobby Goals" section: each active goal renders a progress bar (count / target) + period label, accent fill for in-progress and gold for completed. With zero goals, an empty state links to the Goals page ("Set a hobby goal →"). Logging a painting session updates the progress without a manual refresh.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
