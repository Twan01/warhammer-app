---
phase: 140-close-play-02-03-tail-repoint-rules-hub-datasheetpointstab-f
reviewed: 2026-06-18T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/db/queries/leaderTargets.ts
  - src/db/queries/bsdataExtended.ts
  - src/hooks/useLeaderTargets.ts
  - src/hooks/useBsdataFaction.ts
  - src/features/rules-hub/DatasheetPointsTab.tsx
  - tests/data-layer/leaderTargetsByFaction.test.ts
  - tests/army-list/ArmyListsPage.test.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 140: Code Review Report

**Reviewed:** 2026-06-18
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 140 closes an audit gap by adding a faction-scoped canonical leader-target
query (`getLeaderTargetsByFactionCanonical`) over `udb_leader_targets` double-joined
through `udb_units`, a matching React Query hook, and repointing `DatasheetPointsTab`
off the dead `synced_leader_targets` table. The dead readers
(`getLeaderTargetsByFaction`, `SyncedLeaderTargetRow`, `useLeaderTargetsByFaction`)
were confirmed removed — a full-tree grep finds zero residual references, and the only
mentions of `synced_leader_targets` / the old `leader-targets-by-faction` key are in
explanatory comments.

The implementation is largely sound. The SQL is correctly parameterized (`$1`
positional bind, no interpolation — confirms T-140-01), the join path matches the
migration schema (`050_udb_leader_targets.sql` composite PK; `038_udb_schema.sql`
`udb_units.name NOT NULL`), the hook follows the KEY-factory + `staleTime: Infinity`
convention, and the disabled-state sentinel key is namespaced to avoid collision with
the retired key. No critical (security/data-loss/crash) defects were found.

The findings below are correctness-robustness and maintainability concerns: a test
that validates a hand-copied query rather than the production function, a name-based
JOIN/filter pattern that silently drops valid pairs on name collisions, and the
unused-environment ergonomics of the empty-string faction edge.

## Warnings

### WR-01: Data-layer test validates a copied query string, not the production function

**File:** `tests/data-layer/leaderTargetsByFaction.test.ts:50-59`
**Issue:** `FACTION_LEADER_TARGETS_SQL` is a hand-copied duplicate of the SQL in
`getLeaderTargetsByFactionCanonical` (`src/db/queries/leaderTargets.ts:36-41`) with
`$1` swapped for `?`. The comment frames this as "intentional" because better-sqlite3
uses `?` binding — and that binding-token swap genuinely is required. But the
consequence is that the test exercises a *parallel copy* of the SELECT/JOIN/ORDER BY
body, not the production query. If a future edit changes the production JOIN path,
column aliases, or ORDER BY (e.g. dropping `leader_u.faction_id` from the projection,
or changing join keys), the test will still pass against its stale copy and give false
confidence. The two strings can drift silently.
**Fix:** Extract the SQL body into a single shared exported constant and parameterize
only the bind token, so the test and production consume the same source of truth:
```ts
// leaderTargets.ts
export const LEADER_TARGETS_BY_FACTION_SELECT = (bind: string) =>
  `SELECT leader_u.name AS leader_name, leader_u.faction_id, target_u.name AS target_name
   FROM udb_leader_targets lt
   JOIN udb_units leader_u ON leader_u.id = lt.leader_unit_id
   JOIN udb_units target_u ON target_u.id = lt.target_unit_id
   WHERE leader_u.faction_id = ${bind}
   ORDER BY leader_name, target_name`;
// production: getDb().select(LEADER_TARGETS_BY_FACTION_SELECT("$1"), [factionId])
// test:       db.prepare(LEADER_TARGETS_BY_FACTION_SELECT("?")).all("FA")
```
If sharing is rejected on project grounds, at minimum add a guard test that asserts the
production string and the test string are byte-identical except for the bind token.

### WR-02: Name-based filter in DatasheetDetail silently drops pairs when two units in a faction share a name

**File:** `src/features/rules-hub/DatasheetPointsTab.tsx:99-102`
**Issue:** The query returns id-derived rows but projects only `leader_name` /
`target_name` (strings). `DatasheetDetail` then re-correlates by name:
`leaderTargets.filter((l) => l.leader_name === unitName)` where `unitName = ds.name`.
The canonical table is keyed on unit *ids*, but once collapsed to names the UI can no
longer distinguish two distinct `udb_units` rows that share a display name within the
same faction. If such a name collision exists (data-quality audits in this project have
repeatedly found duplicate/near-duplicate datasheet names), the badge list shown for one
expanded datasheet would merge the targets of both same-named leaders — over-reporting
attach targets — and the `target_name`-keyed `<Badge>` render (line 225) would also
collapse two distinct same-named targets into one badge, under-reporting. This is a
correctness risk that only surfaces on collision, so it is a latent bug rather than an
always-wrong one.
**Fix:** Carry the ids through the row shape and filter/key on them instead of names:
```ts
export interface CanonicalLeaderTargetRow {
  leader_unit_id: string;
  leader_name: string;
  faction_id: string | null;
  target_unit_id: string;
  target_name: string;
}
// SELECT ... leader_u.id AS leader_unit_id, target_u.id AS target_unit_id ...
// filter: leaderTargets.filter((l) => l.leader_unit_id === ds.id)
// badge key: key={t.target_unit_id}
```
This makes the join id-faithful end-to-end and removes the name-collision ambiguity.

### WR-03: Empty-string factionId is treated as "enabled" and produces a real (empty-result) query

**File:** `src/hooks/useLeaderTargets.ts:54-63` (also `src/hooks/useBsdataFaction.ts:36-57`)
**Issue:** The enabled/disabled gate uses `factionId !== undefined`. An empty string
`""` is `!== undefined`, so it is treated as a valid faction: the hook becomes enabled,
fires `getLeaderTargetsByFactionCanonical("")`, and caches under
`["leader-targets-by-faction-canonical", ""]`. In the current call site this is masked
because `RulesHubPage.tsx:180` renders `DatasheetPointsTab` only when `!noFaction` and
passes `selectedFactionId!`, so `""` should not reach it — but the hook's contract
(`factionId: string | undefined`) advertises that any string is acceptable, and `""`
is not a meaningful faction. This is a brittleness/robustness issue: a future caller
passing a default-empty faction id would issue a pointless DB round-trip and pollute the
cache with an empty-key entry. The same loose check exists in the sibling
`useBsdataFaction` hooks.
**Fix:** Treat empty/falsy faction ids as disabled:
```ts
const isEnabled = factionId != null && factionId !== "";
return useQuery({
  queryKey: isEnabled
    ? LEADER_TARGETS_BY_FACTION_KEY(factionId)
    : (["leader-targets-by-faction-canonical", "disabled"] as const),
  queryFn: () => getLeaderTargetsByFactionCanonical(factionId!),
  enabled: isEnabled,
  ...
});
```

## Info

### IN-01: `ORDER BY` references SELECT aliases — portable here, but relies on SQLite alias-in-ORDER-BY support

**File:** `src/db/queries/leaderTargets.ts:41`
**Issue:** `ORDER BY leader_name, target_name` orders by the projected aliases rather
than the qualified columns. SQLite (production) and better-sqlite3 (test) both accept
this, so it is correct for this codebase. Noting only because alias-in-ORDER-BY is not
universal SQL and the "NO DISTINCT" comment (line 26) makes ordering load-bearing for
the deterministic test assertions in `leaderTargetsByFaction.test.ts:129-138`.
**Fix:** Optional — qualify as `ORDER BY leader_u.name, target_u.name` for explicitness;
no behavior change.

### IN-02: Unused-import surface — verify `bulk_sync_rules` / importer still populates `udb_leader_targets`

**File:** `src/db/queries/leaderTargets.ts:31-44`
**Issue:** The new query assumes `udb_leader_targets` is populated by the Rust importer
(per migration `050` comment "data arrives via the Rust udb import"). This is outside
the reviewed file set, so I could not confirm a live writer exists in the current
Wahapedia-only pipeline. If the importer does not populate this table, the new
DatasheetPointsTab section will always render empty (the `leaderTargets.length > 0`
guard at `DatasheetPointsTab.tsx:216` hides it silently) — a correctness gap that would
masquerade as "feature working, faction just has no leaders."
**Fix:** Confirm `src-tauri/src/lib.rs` (or the udb importer module) inserts into
`udb_leader_targets`; if not, this phase ships a permanently-empty UI section.

### IN-03: `ArmyListsPage.test.tsx` has mojibake in comments/test names but is otherwise untouched by this phase

**File:** `tests/army-list/ArmyListsPage.test.tsx:1,121,127` (em-dash rendered as `â€”`)
**Issue:** The file contains encoding corruption (`ARMY-06 â€”`, `ArmyListsPage â€”`)
where em-dashes were mangled to Latin-1/UTF-8 mojibake. The test logic is unaffected
and this file appears in scope only incidentally (it does not reference any Phase 140
symbol — its `vi.mock("@/db/queries/bsdataExtended")` mocks only `getEnhancementsByFaction`,
which the leader-targets removal did not touch). Cosmetic, but worth a cleanup pass since
test names surface in CI output.
**Fix:** Re-save the file as UTF-8 and replace `â€”` with `—`.

---

_Reviewed: 2026-06-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
