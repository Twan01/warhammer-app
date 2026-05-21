---
status: partial
phase: 94-list-export
source: [94-VERIFICATION.md]
started: 2026-05-21T09:05:00Z
updated: 2026-05-21T09:05:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Clipboard copy produces tournament-style text
expected: Open army list detail sheet > Export > Copy to Clipboard > Paste into text editor — tournament-style formatted text with army name, faction, detachment, units (grouped with leaders), enhancements, and totals
result: [pending]

### 2. Print preview shows only list content
expected: Export > Print > Print preview dialog opens > Click Print button > Browser print dialog opens, preview shows only army list content (no app shell, no dialog chrome)
result: [pending]

### 3. JSON save produces valid versioned file
expected: Export > Save as JSON > Choose destination > Open saved file — valid JSON with format=hobbyforge-army-list, version=1.0, exported_at timestamp, list metadata, units array, enhancements array
result: [pending]

### 4. PDF save produces readable document
expected: Export > Save as PDF > Choose destination > Open saved file — valid PDF with army name header, unit table, enhancements section, totals, and HobbyForge footer
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
