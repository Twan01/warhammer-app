---
phase: 140-close-play-02-03-tail-repoint-rules-hub-datasheetpointstab-f
verified: 2026-06-18T00:00:00Z
status: human_needed
score: 3/3 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the app via `pnpm tauri dev`. Navigate to Rules Hub. Select a faction known to have leader pairs (e.g. Space Marines / SM). Expand a Character-role datasheet that is a Leader. Confirm the 'Leader — Can attach to' section shows real target unit badges, not an empty/missing section."
    expected: "The 'Leader — Can attach to' badges list real canonical target units sourced from udb_leader_targets (e.g. 'Intercessor Squad', 'Tactical Squad', etc.). A non-leader unit (e.g. Intercessor Squad itself when expanded) shows no 'Leader — Can attach to' section at all."
    why_human: "Desktop-app visual confirmation — requires Tauri window, live faction data import, and visual rendering. Cannot be verified with grep or static analysis."
---

# Phase 140: Close PLAY-02/03 Tail Verification Report

**Phase Goal:** The Rules Hub datasheet "Leader — Can attach to" section surfaces real canonical attachment targets (faction-scoped join through udb_units against udb_leader_targets) instead of silently rendering empty off the dead synced_leader_targets table.
**Verified:** 2026-06-18
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DatasheetPointsTab "Leader — Can attach to" reads canonical udb_leader_targets (faction-scoped join through udb_units), not the dead synced_leader_targets table | VERIFIED | Line 8 of DatasheetPointsTab.tsx imports `useLeaderTargetsByFactionCanonical` from `@/hooks/useLeaderTargets`; line 15 imports `CanonicalLeaderTargetRow` from `@/db/queries/leaderTargets`; line 362 calls `useLeaderTargetsByFactionCanonical(factionId)`. The hook calls `getLeaderTargetsByFactionCanonical` which issues the double-join SELECT on `udb_leader_targets` with `WHERE leader_u.faction_id = $1`. |
| 2 | Dead readers removed: useLeaderTargetsByFaction, getLeaderTargetsByFaction, SyncedLeaderTargetRow are absent from src/ and tests/; synced_leader_targets has zero src/ references | VERIFIED | Grep over `src/` and `tests/` for all three dead symbols returns zero matches. Grep for `synced_leader_targets` in `src/` returns zero matches. `useBsdataFaction.ts` now documents "Two hooks" (down from three) and contains only `useModelCountsByFaction` and `useLoadoutOptionsByFaction`. `bsdataExtended.ts` contains no `getLeaderTargetsByFaction` or `SyncedLeaderTargetRow`. `ArmyListsPage.test.tsx` mock no longer contains the stale `getLeaderTargetsByFaction` key. |
| 3 | Data-layer test exists and proves faction-scoped correctness (ordered pairs, cross-faction exclusion, unknown-faction empty) | VERIFIED | `tests/data-layer/leaderTargetsByFaction.test.ts` exists (168 lines), starts with `// @vitest-environment node`, uses `createFullDb()` with full migration chain, seeds 2 factions / 5 udb_units / 3 udb_leader_targets rows, contains three `it` cases covering all three required behaviors. SUMMARY reports 2893 tests passed (full suite green post-merge). |

**Score:** 3/3 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/queries/leaderTargets.ts` | CanonicalLeaderTargetRow type + getLeaderTargetsByFactionCanonical query | VERIFIED | Both exported. Interface has the correct shape (`leader_name: string; faction_id: string \| null; target_name: string`). SQL is the exact double-join pattern from D-02: `udb_leader_targets lt JOIN udb_units leader_u ON leader_u.id = lt.leader_unit_id JOIN udb_units target_u ON target_u.id = lt.target_unit_id WHERE leader_u.faction_id = $1 ORDER BY leader_name, target_name`. `$1` positional bind (no string interpolation). |
| `src/hooks/useLeaderTargets.ts` | useLeaderTargetsByFactionCanonical hook + LEADER_TARGETS_BY_FACTION_KEY factory | VERIFIED | Both exported. Key namespace is `"leader-targets-by-faction-canonical"` (distinct from retired `"leader-targets-by-faction"`). staleTime: Infinity, gcTime: Infinity, enabled: `factionId !== undefined`. Disabled-state sentinel key `["leader-targets-by-faction-canonical", "disabled"]`. |
| `tests/data-layer/leaderTargetsByFaction.test.ts` | Faction-scoped query test (min 60 lines, 3 cases) | VERIFIED | 168 lines. Three `it` cases present and structurally correct. SQL replicated inline with `?` (better-sqlite3); production divergence noted in comment. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/features/rules-hub/DatasheetPointsTab.tsx` | `src/hooks/useLeaderTargets.ts` | `useLeaderTargetsByFactionCanonical(factionId)` call at line 362 | WIRED | Import at line 8, call at line 362, result assigned to `leaderTargets`, passed as prop at line 495 |
| `src/hooks/useLeaderTargets.ts` | `src/db/queries/leaderTargets.ts` | `getLeaderTargetsByFactionCanonical` as queryFn | WIRED | Imported at lines 5–6, used as queryFn in `useLeaderTargetsByFactionCanonical` |
| `src/db/queries/leaderTargets.ts` | `udb_leader_targets JOIN udb_units` (double-join) | SQL WHERE `leader_u.faction_id = $1` | WIRED | SQL confirmed at lines 36–43 of leaderTargets.ts; correct join path and parameterized bind |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `DatasheetPointsTab.tsx` | `leaderTargets` (line 362) | `useLeaderTargetsByFactionCanonical(factionId)` → `getLeaderTargetsByFactionCanonical` → SELECT on `udb_leader_targets` | Yes — double-join SQL on canonical udb tables; no static fallback; empty default `[]` is only the React Query initial state | FLOWING |

---

### Behavioral Spot-Checks

Step 7b SKIPPED — requires running Tauri desktop app. The data-layer test (`tests/data-layer/leaderTargetsByFaction.test.ts`) exercises the SQL query path in isolation via better-sqlite3. Full-suite pass (2893 tests) confirmed by SUMMARY. Visual rendering routed to human verification.

---

### Probe Execution

No probe scripts declared for this phase. Step 7c not applicable.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PLAY-02 | 140-01-PLAN.md | udb_leader_targets table populated from canonical pipeline | SATISFIED (secondary surface completion) | PLAY-02 marked Complete in ROADMAP.md at Phase 137 (canonical pipeline + table). Phase 140 completes the secondary display surface using that table. |
| PLAY-03 | 140-01-PLAN.md | Leader attachment in army-list builder validates against canonical targets | SATISFIED (secondary surface completion) | PLAY-03 marked Complete in ROADMAP.md at Phase 137 (army-list builder repointed). Phase 140 closes the remaining Rules Hub display tail. |

Both requirement IDs are accounted for. REQUIREMENTS.md marks them Complete at Phase 137; Phase 140 is explicitly scoped as the "completion — secondary surface" tail. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | No TBD/FIXME/XXX markers in modified files. No stub returns. No empty implementations. |

**Dead-symbol retirement verified:**
- `bsdataExtended.ts` — `getLeaderTargetsByFaction` and `SyncedLeaderTargetRow` absent (confirmed)
- `useBsdataFaction.ts` — `useLeaderTargetsByFaction` and the old `LEADER_TARGETS_KEY` absent; two live hooks preserved (`useModelCountsByFaction`, `useLoadoutOptionsByFaction`)
- `ArmyListsPage.test.tsx` — stale `getLeaderTargetsByFaction: vi.fn().mockResolvedValue([])` mock key removed
- `synced_leader_targets` — zero references in `src/`

**Known pre-existing limitation (not a regression):** WR-02 (same-name collision) identified in 140-REVIEW.md — if two different units in different factions share the same `leader_name`, the client-side filter `l.leader_name === unitName` could conflate them. This is a pre-existing name-based correlation (D-04, CONTEXT.md) carried forward by design decision and was not introduced by Phase 140.

---

### Human Verification Required

#### 1. Rules Hub Leader Display — Visual End-to-End Confirmation

**Test:** Open the app via `pnpm tauri dev`. Navigate to Rules Hub. Select a faction known to have canonical leader pairs (e.g. Space Marines). Expand a Character-role datasheet that is a Leader unit. Observe the "Leader — Can attach to" section.

**Expected:** The section renders real target unit badges sourced from the canonical `udb_leader_targets` table (e.g. "Intercessor Squad", "Tactical Squad"). A non-leader unit expanded in the same faction shows no "Leader — Can attach to" section (because `leaderTargets.filter(l => l.leader_name === unitName)` returns empty).

**Why human:** Desktop Tauri window required. Depends on live `udb_leader_targets` data having been imported via the Wahapedia pipeline. Visual rendering of badge components cannot be verified with grep or static analysis.

---

### Gaps Summary

No automated gaps. All three must-have truths VERIFIED. All artifacts exist, are substantive, and are wired end-to-end. Data flows from canonical SQLite table through query → hook → component. Dead symbols are confirmed absent.

The only outstanding item is the live-app visual confirmation that the wired-up UI surface renders real badges — classified as human_needed per the VALIDATION.md manual-only verification table and the phase's own post-execution instruction.

---

_Verified: 2026-06-18_
_Verifier: Claude (gsd-verifier)_
