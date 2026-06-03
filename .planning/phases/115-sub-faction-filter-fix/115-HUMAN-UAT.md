---
status: partial
phase: 115-sub-faction-filter-fix
source: [115-VERIFICATION.md]
started: 2026-06-03
updated: 2026-06-03
---

## Current Test

[awaiting human testing]

## Tests

### 1. Database browser sub-faction filter (SUB-01)
expected: Selecting a sub-faction (e.g. Ultramarines) shows both sub-faction-specific units AND generic parent faction units (sub_faction IS NULL)
result: [pending]

### 2. Army list unit picker sub-faction filter (SUB-02)
expected: Opening the unit picker with a sub-faction filter active shows generic parent faction units alongside sub-faction-specific units
result: [pending]

### 3. Collection browser sub-faction filter (SUB-03)
expected: Applying a sub-faction filter in the collection view shows generic parent faction units — they are not hidden by the sub-faction filter
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
