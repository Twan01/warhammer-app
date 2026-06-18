# Phase 140: Close PLAY-02/03 Tail — Rules Hub Leader Display - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 140-close-play-02-03-tail-repoint-rules-hub-datasheetpointstab-f
**Mode:** `--auto` (all gray areas auto-selected; recommended option chosen for each)
**Areas discussed:** Query location & dead-code retirement, Return shape, Dead-table DROP migration, Test coverage

---

## Query location & dead-code retirement

| Option | Description | Selected |
|--------|-------------|----------|
| New canonical fn in `leaderTargets.ts` + retire dead `bsdataExtended` reader/type | Co-locate the faction-scoped `udb_leader_targets` query with Phase 137's canonical module; delete the now-zero-caller `getLeaderTargetsByFaction`/`SyncedLeaderTargetRow`/`useLeaderTargetsByFaction` | ✓ |
| Repoint the existing `getLeaderTargetsByFaction` in `bsdataExtended.ts` in place | Keep the function name, swap its SQL/source table to `udb_leader_targets` | |
| Inline the query inside `DatasheetPointsTab` | No shared module; query lives in the component | |

**Auto choice:** New canonical fn + retire dead readers (recommended default).
**Notes:** Finishes STATE.md D-10's deliberately-deferred cleanup ("readers KEPT — rules-hub still consumes"); after this phase rules-hub no longer consumes the synced-table path.

---

## Return shape (component churn minimization)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep identical `{ leader_name, faction_id, target_name }` shape | New canonical type mirrors old `SyncedLeaderTargetRow`; component body unchanged, only import + hook swap | ✓ |
| Return id-keyed pairs (like `getLeaderTargetsForList`) | Would require rewriting the component's filter/render logic | |

**Auto choice:** Keep identical shape (recommended default — lowest risk).

---

## Dead-table DROP migration

| Option | Description | Selected |
|--------|-------------|----------|
| No DROP migration this phase — only retire dead readers | Keep scope to the read-path repoint; defer dropping `synced_leader_targets` | ✓ |
| Add migration 051 to DROP `synced_leader_targets` | Fully removes the dead table; re-triggers the parity gate | |

**Auto choice:** No DROP this phase (recommended default).
**Notes:** Table has zero writers (Phase 137) and will have zero readers post-repoint; the DROP adds migration/parity risk to a narrow tail-closure — deferred (see CONTEXT.md Deferred Ideas).

---

## Test coverage (Nyquist)

| Option | Description | Selected |
|--------|-------------|----------|
| Data-layer test for the faction-scoped join (required) + component render test (discretion) | In-memory DB + full migration chain; assert pairs returned per faction; optional component test for section render | ✓ |
| Component test only | Skip the data-layer query test | |
| No new tests | Rely on existing suite | |

**Auto choice:** Data-layer test required, component test at discretion (recommended default).
**Notes:** Mirror `tests/data-layer/leader-targets.test.ts`.

---

## Claude's Discretion

- Exact new function/hook/type names (must read as canonical, not "synced").
- Whether to add the optional `DatasheetPointsTab` component render test.

## Deferred Ideas

- DROP `synced_leader_targets` table in a future schema-cleanup phase (would re-trigger the parity gate).
- Broader dead-query sweep of any other `synced_*` readers in `bsdataExtended.ts`.
