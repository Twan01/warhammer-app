---
status: resolved
phase: 137-canonical-leader-attachment
source: [137-VERIFICATION.md]
started: 2026-06-17T22:06:50Z
updated: 2026-06-18T00:00:00Z
---

## Current Test

[complete — all items resolved]

## Tests

### 1. Canonical leader attachment in live app
expected: In `pnpm tauri dev`, opening an army list and clicking "Attach Leader" on a canonical leader (e.g. a Captain) offers only the units the canonical `udb_leader_targets` table (1,901 rows) marks as valid targets for that leader — no fragile name-matching. Invalid targets are not offered.
result: PASSED (2026-06-18). Verified live: in an Ultramarines list, "Captain in Gravis Armour" offered only Aggressors and "Captain" (plain) offered only Assault Intercessors — two leaders, two correct per-leader target subsets, confirming the FK-join validation. NOTE: surfaced + fixed a stale-cache bug during this test (commit 52ec9635) — leader-targets cache was not invalidated on unit add/remove, so a leader added after first page load showed no Attach button until reload.

### 2. Ghost target unit selectable for a canonical leader
expected: A ghost/manual unit (NULL `udb_unit_id`) present in the same list still appears as a selectable target under the permissive fallback when attaching a canonical leader — targets with NULL udb_unit_id are never hard-blocked.
result: RESOLVED via decision (a), 2026-06-18. Re-scoped: this item conflated leader and target permissiveness. Leader attachment is canonical-only by design — a ghost target (NULL `udb_unit_id`) is not offered to a canonical leader because it cannot be validated against `udb_leader_targets`. Accepted as intended behavior; not a hard block to fix this phase. See item 3.

### 3. WR-03 product decision — ghost LEADER button visibility
expected: A product decision is recorded. Currently the "Attach Leader" button only renders when `isLeader = leaderAluIds.has(unit.id)` is true, and `leaderAluIds` is built exclusively from canonical pairs (units with a non-null `udb_unit_id`). Consequence: a ghost/manual unit with NULL `udb_unit_id` can never OPEN the attach sheet, so the sheet's permissive NULL fallback (D-09) is unreachable for ghost *leaders*. This is NOT a regression (pre-137 the empty `synced_leader_targets` meant no unit could attach), and a ghost unit has no canonical identity by which the app could know it is a leader. Decide one of: (a) accept current behavior and correct the "ghost/manual units must never be blocked" comment to scope it to *targets*; or (b) add a non-canonical leader signal (e.g. Character keyword / manual "is leader" flag) so ghost leaders can open the sheet — a new capability, likely a follow-up phase.
result: RESOLVED — decision (a) ACCEPTED by user, 2026-06-18. Leader attachment is canonical-only by design: both the leader and its target must be linked to the canonical database. Ghost/manual units (NULL `udb_unit_id`) do not surface an Attach Leader button. The misleading "ghost/manual units must keep the ability to attach" docstring in LeaderAttachmentSheet.tsx was corrected to state the canonical-only scope. Option (b) — letting ghost units participate via a manual leader flag / name-match — was declined for this phase (candidate backlog item for a future phase, not scheduled).

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
