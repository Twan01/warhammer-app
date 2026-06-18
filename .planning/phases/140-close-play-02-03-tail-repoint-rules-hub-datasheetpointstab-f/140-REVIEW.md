---
phase: 140-close-play-02-03-tail-repoint-rules-hub-datasheetpointstab-f
reviewed: 2026-06-18T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/db/queries/leaderTargets.ts
  - src/hooks/useLeaderTargets.ts
  - src/features/rules-hub/DatasheetPointsTab.tsx
  - src/db/queries/bsdataExtended.ts
  - src/hooks/useBsdataFaction.ts
  - tests/data-layer/leaderTargetsByFaction.test.ts
  - tests/army-list/ArmyListsPage.test.tsx
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 140: Code Review Report

**Reviewed:** 2026-06-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 140 repoints the Rules Hub `DatasheetPointsTab` "Leader — Can attach to" section
off the retired synced table (`synced_leader_targets` / `getLeaderTargetsByFaction`) onto
the canonical `udb_leader_targets` join via a new query
(`getLeaderTargetsByFactionCanonical`) and hook (`useLeaderTargetsByFactionCanonical`).
The dead `getLeaderTargetsByFaction` export and its `SyncedLeaderTargetRow` interface were
cleanly removed from `bsdataExtended.ts`, and the corresponding mock was dropped from
`ArmyListsPage.test.tsx`. SQL is correctly parameterized ($1 positional), keys are namespaced
to avoid cache collision, and a focused data-layer test exercises the new join (correct pairs,
cross-faction exclusion, unknown-faction empty result).

The repoint is functionally sound. No correctness or security blockers found. The findings below
concern a latent duplicate-unit-name hazard inherited by the new code (React duplicate-key risk +
name-based filtering), an empty-string `factionId` edge case in the new hook's enabled guard, and
several quality/maintenance items (inline query that should live in the queries layer, dead writer
functions in the reviewed file, mojibake in the test file).

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: React duplicate-key risk and target conflation when unit names are non-unique

**File:** `src/features/rules-hub/DatasheetPointsTab.tsx:223-231` (badge key) and `100-102` (name filter)
**Issue:** `udb_units.name` has **no UNIQUE constraint** — only `id` is the primary key
(`src-tauri/migrations/038_udb_schema.sql:15-17`). The new canonical query returns rows keyed by
unit *names*, not ids:

- The leader-targets badge list renders `key={t.target_name}` (line 225). If a leader can attach to
  two distinct target units that share the same `name` (e.g. a renamed/duplicated datasheet, or a
  unit appearing under multiple sub-faction rows), React emits a duplicate-key warning and may drop
  or mis-reconcile one badge.
- `DatasheetDetail` selects targets via `leaderTargets.filter((l) => l.leader_name === unitName)`
  (lines 100-102). The expanded datasheet detail itself is fetched by id (`getUdbUnitDetail(ds.id)`,
  line 83), but its leader-targets are matched by *name*. If two leader units in the same faction
  share a name, the expanded row shows the **union** of both leaders' targets rather than this unit's.

The query is faction-scoped (not unit-id-scoped) specifically so the JSX could remain name-keyed
(comment at `leaderTargets.ts:6-8`), which is what propagates the name-collision assumption. The old
synced table had the same name-keyed shape, so this is a latent hazard inherited rather than newly
introduced — but the move to the canonical id-keyed source was the moment it could have been fixed.

**Fix:** Carry the stable id through the query and use it as the React key. Minimal change:
```ts
// leaderTargets.ts — add target_u.id to the SELECT
SELECT leader_u.name AS leader_name, leader_u.id AS leader_id,
       leader_u.faction_id, target_u.name AS target_name, target_u.id AS target_id
...
```
```tsx
// DatasheetPointsTab.tsx
{leaderTargets.map((t) => (
  <Badge key={t.target_id} variant="outline" className="text-xs">{t.target_name}</Badge>
))}
```
For the filter, prefer matching on the expanded unit's id (`ds` carries the datasheet id) against
`leader_id` rather than `leader_name === unitName`, eliminating the leader-name conflation.
If duplicate unit names within a faction are provably impossible in the imported data, downgrade to
Info — but that invariant is not enforced by the schema and should not be assumed.

### WR-02: `useLeaderTargetsByFactionCanonical` treats empty-string factionId as enabled

**File:** `src/hooks/useLeaderTargets.ts:54-63`
**Issue:** The enabled guard is `enabled: factionId !== undefined`. An empty string `""` is not
`undefined`, so passing `""` produces an active query with key
`["leader-targets-by-faction-canonical", ""]` and runs `getLeaderTargetsByFactionCanonical("")`
(a wasted DB round-trip that returns no rows). The disabled sentinel
`["leader-targets-by-faction-canonical", "disabled"]` is only reached for `undefined`.

At the sole current call site this is masked: `RulesHubPage.tsx:166-180` gates `DatasheetPointsTab`
behind a `noFaction` check and passes `selectedFactionId!` (non-empty when rendered). So this is not
currently reachable, but the hook's contract is laxer than its only consumer guarantees, and a future
caller passing `""` would silently fire a useless query.

**Fix:** Tighten the guard to treat empty/falsy ids as disabled, mirroring intent:
```ts
const enabled = factionId !== undefined && factionId !== "";
return useQuery<CanonicalLeaderTargetRow[]>({
  queryKey: enabled
    ? LEADER_TARGETS_BY_FACTION_KEY(factionId!)
    : (["leader-targets-by-faction-canonical", "disabled"] as const),
  queryFn: () => getLeaderTargetsByFactionCanonical(factionId!),
  enabled,
  staleTime: Infinity,
  gcTime: Infinity,
});
```
(The same lax `!== undefined` pattern exists in the sibling hooks in `useBsdataFaction.ts` and
`usePointTiers`; this finding targets the file changed in this phase.)

### WR-03: Inline `getUdbPointsByFaction` query embedded in a component, bypassing the queries layer

**File:** `src/features/rules-hub/DatasheetPointsTab.tsx:28-56`
**Issue:** `getUdbPointsByFaction` is a raw `db.select(...)` SQL query defined inside the component
file and wrapped by an inline `usePointTiers` hook. CLAUDE.md's architecture mandates that DB access
live in `src/db/queries/*.ts` and be surfaced through `src/hooks/use*.ts` with a KEY factory — which
is exactly the pattern Phase 140 (and the HON-10 work in `useBsdataFaction.ts`) applies to the other
faction-scoped reads. This one query is the outlier: it has no KEY factory export, no queries-module
home, and is untested at the data layer, unlike the leader-targets query that got a dedicated test.

This is not a behavior bug — the query is parameterized ($1) and correct — but it is an inconsistency
the phase touched-adjacent code and left in place, and it makes the points-tier read invisible to the
same review/test discipline applied to its siblings.

**Fix:** Move `getUdbPointsByFaction` into `src/db/queries/unitDatabase.ts` (or a dedicated module),
export a `POINT_TIERS_KEY` factory + `usePointTiers` hook from `src/hooks/`, and add a data-layer test
mirroring `leaderTargetsByFaction.test.ts`.

## Info

### IN-01: Dead writer functions remain exported in the reviewed file

**File:** `src/db/queries/bsdataExtended.ts:14-95`
**Issue:** `replaceSyncedEnhancements`, `replaceSyncedLoadoutOptions`, and
`replaceSyncedModelCounts` have **zero production callers** — they are referenced only by
`tests/performance/batchInsert.test.ts`. In the Wahapedia-only pipeline (post-Phase 137) nothing
writes the `synced_*` tables, so these batch-insert writers are dead. They were not introduced by
this phase, but they live in a file this phase edited and represent residual scaffolding from the
retired BSData sync path that parallels the `synced_leader_targets` source just removed.
**Fix:** Track for removal in a dedicated dead-code sweep (and migrate/retire the perf test that is
their only caller). Out of scope to delete here, but flagged for visibility.

### IN-02: Mojibake (encoding corruption) in test file comments and assertions

**File:** `tests/army-list/ArmyListsPage.test.tsx:2, 121, 127`
**Issue:** Em-dashes are rendered as `â€”` mojibake (e.g. `ARMY-06 â€”` line 2,
`describe("ArmyListsPage â€” ARMY-06"...)` line 121, and inline comment line 127). The file is saved
with mis-decoded UTF-8. This does not break the tests (the corruption is in a `describe` label and
comments, not in assertions against rendered text), but it is a quality defect that will keep
re-corrupting on each edit. Pre-existing, but the file was modified in this phase.
**Fix:** Re-save the file as clean UTF-8 and replace `â€”` with `—` (or ASCII `-`).

### IN-03: `usePointTiers` queryFn re-checks `factionId` already guaranteed by `enabled`

**File:** `src/features/rules-hub/DatasheetPointsTab.tsx:42-56`
**Issue:** `usePointTiers` uses `enabled: factionId !== undefined`, yet the `queryFn` still ternaries
on `factionId !== undefined ? getUdbPointsByFaction(factionId) : Promise.resolve([])`. Because the
query never runs while disabled, the `Promise.resolve([])` branch is dead. The sibling
`useLeaderTargetsByFactionCanonical` and `useBsdataFaction` hooks use the cleaner
`queryFn: () => getX(factionId!)` form. Harmless but inconsistent.
**Fix:** Simplify to `queryFn: () => getUdbPointsByFaction(factionId!)` for consistency with the
other faction hooks.

### IN-04: Test SQL is hand-duplicated from production rather than imported

**File:** `tests/data-layer/leaderTargetsByFaction.test.ts:50-59`
**Issue:** `FACTION_LEADER_TARGETS_SQL` is a hand-copied replica of the query in
`getLeaderTargetsByFactionCanonical` (with `?` instead of `$1`). The divergence is documented and
intentional (better-sqlite3 vs tauri-plugin-sql binding syntax), but it means a future change to the
production SELECT (column list, join, ordering) will not be caught by this test — the two can silently
drift. This is an accepted tradeoff given the async Tauri function can't run under node, but worth
noting the test does not actually exercise the shipped function, only a structurally-equivalent copy.
**Fix:** No action required if the divergence is accepted. Optionally, extract the SELECT body to a
shared exported string constant with the placeholder style swapped at the call site, so both paths
stay in lockstep.

---

_Reviewed: 2026-06-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
