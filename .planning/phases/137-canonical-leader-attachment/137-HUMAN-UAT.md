---
status: partial
phase: 137-canonical-leader-attachment
source: [137-VERIFICATION.md]
started: 2026-06-17T22:06:50Z
updated: 2026-06-17T22:06:50Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Canonical leader attachment in live app
expected: In `pnpm tauri dev`, opening an army list and clicking "Attach Leader" on a canonical leader (e.g. a Captain) offers only the units the canonical `udb_leader_targets` table (1,901 rows) marks as valid targets for that leader — no fragile name-matching. Invalid targets are not offered.
result: [pending]

### 2. Ghost target unit selectable for a canonical leader
expected: A ghost/manual unit (NULL `udb_unit_id`) present in the same list still appears as a selectable target under the permissive fallback when attaching a canonical leader — targets with NULL udb_unit_id are never hard-blocked.
result: [pending]

### 3. WR-03 product decision — ghost LEADER button visibility
expected: A product decision is recorded. Currently the "Attach Leader" button only renders when `isLeader = leaderAluIds.has(unit.id)` is true, and `leaderAluIds` is built exclusively from canonical pairs (units with a non-null `udb_unit_id`). Consequence: a ghost/manual unit with NULL `udb_unit_id` can never OPEN the attach sheet, so the sheet's permissive NULL fallback (D-09) is unreachable for ghost *leaders*. This is NOT a regression (pre-137 the empty `synced_leader_targets` meant no unit could attach), and a ghost unit has no canonical identity by which the app could know it is a leader. Decide one of: (a) accept current behavior and correct the "ghost/manual units must never be blocked" comment to scope it to *targets*; or (b) add a non-canonical leader signal (e.g. Character keyword / manual "is leader" flag) so ghost leaders can open the sheet — a new capability, likely a follow-up phase.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
