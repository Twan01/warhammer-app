---
phase: 137-canonical-leader-attachment
plan: "04"
subsystem: query
tags: [dead-code-removal, bsdata-extended, synced-leader-targets, play-03]
dependency_graph:
  requires: [137-03 — canonical repoint that orphaned the replaceSyncedLeaderTargets writer]
  provides: [smaller bsdataExtended.ts with dead writer removed; rules-hub read path intact; full suite green]
  affects: [src/db/queries/bsdataExtended.ts]
tech_stack:
  added: []
  patterns: [surgical-dead-code-removal, grep-gate-before-delete]
key_files:
  created: []
  modified:
    - src/db/queries/bsdataExtended.ts
decisions:
  - "D-10 fulfilled: replaceSyncedLeaderTargets (zero callers after Plan 03 repoint) removed; getLeaderTargetsByFaction + SyncedLeaderTargetRow KEPT (rules-hub useBsdataFaction.ts still consumes them)"
  - "BsdataLeaderTarget import removed from bsdataExtended.ts (was only used by the deleted function; type owner parseBsdataExtended.ts untouched)"
  - "synced_leader_targets TABLE left in place — no drop migration this phase (D-10 explicit deferral)"
metrics:
  duration: "8 minutes"
  completed: "2026-06-17T23:55:00Z"
  tasks: 2
  files: 1
---

# Phase 137 Plan 04: Dead Writer Cleanup (D-10) — Summary

**One-liner:** `replaceSyncedLeaderTargets` writer removed from `bsdataExtended.ts` after grep-confirmed zero callers; rules-hub read path (`getLeaderTargetsByFaction` / `SyncedLeaderTargetRow`) kept intact; build + full 2829-test suite green.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove dead replaceSyncedLeaderTargets writer (keep rules-hub read path + table) | 00bb35b1 | src/db/queries/bsdataExtended.ts |
| 2 | Full-suite + parity regression gate after cleanup | (no file changes) | — |

## What Was Built

### `src/db/queries/bsdataExtended.ts` (modified)

- **Removed** `replaceSyncedLeaderTargets` function (lines 98-121): the only writer that performed `DELETE FROM synced_leader_targets` / `INSERT INTO synced_leader_targets`. After Plan 03 repointed all army-list UI onto canonical data via `getLeaderTargetsForList`, this function had zero callers.
- **Removed** `BsdataLeaderTarget` from the import statement (line 6): was only imported to type the `rows` parameter of the deleted function. The type definition in `src/lib/parseBsdataExtended.ts` is untouched — still used by the parser.
- **Kept** `SyncedLeaderTargetRow` interface and `getLeaderTargetsByFaction` function (lines 159-178): still consumed by `useBsdataFaction.ts` → `useLeaderTargetsByFaction` → `DatasheetPointsTab` (rules-hub path, out of scope for this phase). D-10's "if unreferenced" clause was NOT met for these two symbols.
- **Table**: `synced_leader_targets` is left in place. No drop migration added. Migration 050 remains the highest.

### Verification Results

- `grep -rn "replaceSyncedLeaderTargets" src/` — 0 matches (PASS)
- `grep -rn "INSERT INTO synced_leader_targets|DELETE FROM synced_leader_targets" src/` — 0 matches (PASS)
- `pnpm build` — green (✓ built in 11.79s)
- `pnpm check:version` — green (50 migrations, no CR bytes, version 0.5.7 consistent)
- `pnpm test` — 307 test files passed, 2829 tests passed, 0 failed (phase-gate sampling per 137-VALIDATION.md)

## Deviations from Plan

None — plan executed exactly as written. The grep gate confirmed exactly one hit for `replaceSyncedLeaderTargets` (its own definition), enabling safe deletion. `BsdataLeaderTarget` import cleanup was correctly anticipated in the plan's action description.

## Known Stubs

None. This is a pure deletion — no new stubs introduced.

## Threat Flags

None. Pure code deletion; no new data flow, input surface, network endpoint, or auth path introduced.
- T-137-09 mitigated: `getLeaderTargetsByFaction` / `SyncedLeaderTargetRow` kept; `pnpm build` + `pnpm test` confirm rules-hub compiles and passes.
- T-137-10 mitigated: grep gate asserts zero remaining INSERT/DELETE into `synced_leader_targets` in `src/`.

## Self-Check: PASSED

- `src/db/queries/bsdataExtended.ts` exists — confirmed
- `getLeaderTargetsByFaction` and `SyncedLeaderTargetRow` still present in file — confirmed
- `replaceSyncedLeaderTargets` absent from file — confirmed
- `BsdataLeaderTarget` absent from import in bsdataExtended.ts — confirmed
- Migration 050 is still the highest (no drop migration added) — confirmed
- Commit 00bb35b1 exists in git log — confirmed
- `pnpm test` 2829 passed, 0 failed — confirmed
