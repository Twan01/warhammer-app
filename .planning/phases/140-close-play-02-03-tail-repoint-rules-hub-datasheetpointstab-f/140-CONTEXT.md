# Phase 140: Close PLAY-02/03 Tail — Rules Hub Leader Display - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

> Captured in `--auto` mode: all gray areas auto-selected, recommended option chosen for each. See DISCUSSION-LOG.md for the auto-selection trail.

<domain>
## Phase Boundary

The Rules Hub datasheet view (`DatasheetPointsTab`) "Leader — Can attach to" section must surface real canonical leader→target pairs from `udb_leader_targets` instead of silently rendering empty off the dead `synced_leader_targets` table.

This is a **narrow audit-gap closure** (v0.6.0 milestone audit, integration warning on the `DatasheetPointsTab` seam). Phase 137 repointed the *army-list builder* surface (`LeaderAttachmentSheet`) to the canonical pipeline but left the *read-only Rules Hub display* still reading the dead table — the unfinished tail of Phase 136's deferred CR-01.

**In scope:**
- A faction-scoped query against `udb_leader_targets` (JOIN `udb_units` twice) returning leader→target pairs for a faction.
- A canonical React Query hook wrapping that query.
- Repointing `DatasheetPointsTab` to consume canonical leader targets.
- Retiring the now-zero-caller dead readers (`getLeaderTargetsByFaction`, `SyncedLeaderTargetRow`, `useLeaderTargetsByFaction`).
- A data-layer test proving the faction-scoped join returns correct pairs.

**Out of scope:**
- Dropping the `synced_leader_targets` table itself (deferred — see Deferred Ideas).
- Any change to the army-list builder leader-attachment path (already correct per Phase 137).
- Visual/layout redesign of the leader-targets section (badge rendering stays as-is).

</domain>

<decisions>
## Implementation Decisions

### Query location & dead-code retirement
- **D-01:** Add a new faction-scoped query function to the canonical `src/db/queries/leaderTargets.ts` module (co-located with Phase 137's `getLeaderTargetsForList`), e.g. `getLeaderTargetsByFactionCanonical(factionId)`. Canonical reads stay together; the dead `bsdataExtended.ts` read path is not extended.
- **D-02:** The query joins `udb_leader_targets` to `udb_units` twice and filters on the leader's faction:
  ```sql
  SELECT leader_u.name AS leader_name, leader_u.faction_id, target_u.name AS target_name
  FROM udb_leader_targets lt
  JOIN udb_units leader_u ON leader_u.id = lt.leader_unit_id
  JOIN udb_units target_u ON target_u.id = lt.target_unit_id
  WHERE leader_u.faction_id = $1
  ORDER BY leader_name, target_name
  ```
  Parameterized via `$1` positional bind (no string interpolation), matching project SQL conventions.
- **D-03:** Once `DatasheetPointsTab` consumes the canonical query, the synced-table readers become dead and are removed in this phase: `getLeaderTargetsByFaction` + `SyncedLeaderTargetRow` (`src/db/queries/bsdataExtended.ts`) and `useLeaderTargetsByFaction` + its KEY (`src/hooks/useBsdataFaction.ts`). This finishes the cleanup that STATE.md decision **D-10** deliberately deferred ("getLeaderTargetsByFaction+SyncedLeaderTargetRow KEPT — rules-hub still consumes"). After this phase, rules-hub no longer consumes them.

### Return shape (component churn minimization)
- **D-04:** Keep the row shape **identical** to the old `SyncedLeaderTargetRow` — `{ leader_name: string; faction_id: string | null; target_name: string }` — exported as a new canonical type from `leaderTargets.ts`. `DatasheetPointsTab`'s body (filter `leader_name === unitName`, render `target_name` badges) stays unchanged; only the type import and the hook call swap. Lowest-risk repoint.

### Hook layer
- **D-05:** Add a faction-keyed canonical hook in `src/hooks/useLeaderTargets.ts` (next to the existing `useLeaderTargets(listId)`), e.g. `useLeaderTargetsByFactionCanonical(factionId)`, with `staleTime: Infinity` / `gcTime: Infinity` (canonical data is immutable between imports) and `enabled` guarded on `factionId`. Mirrors the existing `useBsdataFaction` hook ergonomics so the `DatasheetPointsTab` call site changes minimally.

### Test coverage (Nyquist)
- **D-06:** Required: a data-layer test (`tests/data-layer/`, node env, full migration chain) that seeds `udb_units` + `udb_leader_targets` and asserts the faction-scoped query returns the expected leader→target pairs filtered by faction (and excludes other factions). Mirror the structure of `tests/data-layer/leader-targets.test.ts`.

### Claude's Discretion
- A `DatasheetPointsTab` component render test asserting the "Leader — Can attach to" section appears for a leader with targets is welcome but optional — the data-layer test is the Nyquist-critical coverage.
- Exact new function/hook/type names are at the planner/executor's discretion as long as they read as canonical (not "synced").

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The gap source (why this phase exists)
- `.planning/v0.6.0-MILESTONE-AUDIT.md` — integration warning on the "Rules Hub leader display (DatasheetPointsTab)" seam; specifies the exact fix (replace `useLeaderTargetsByFaction` with a faction-scoped `udb_leader_targets` query, JOIN `udb_units` twice, `WHERE leader_u.faction_id = $1`).

### The canonical pattern to follow (Phase 137)
- `src/db/queries/leaderTargets.ts` — Phase 137 canonical leader-target query module; `getLeaderTargetsForList` shows the `udb_leader_targets` ↔ `udb_units` double-join idiom. New faction-scoped fn lives here.
- `src/hooks/useLeaderTargets.ts` — canonical hook module; new faction hook lives here.
- `src-tauri/migrations/050_udb_leader_targets.sql` — schema of `udb_leader_targets` (composite PK `leader_unit_id`/`target_unit_id`, both FK → `udb_units` ON DELETE CASCADE).
- `tests/data-layer/leader-targets.test.ts` — test harness pattern (in-memory DB, full migration chain, PRAGMA FK ON) to mirror for the new query test.

### The surface being fixed
- `src/features/rules-hub/DatasheetPointsTab.tsx` — the component to repoint (currently imports `useLeaderTargetsByFaction`; `DatasheetDetail`/`DatasheetContent` filter `leader_name === unitName` and render `target_name`).

### Dead readers to retire
- `src/db/queries/bsdataExtended.ts` §`getLeaderTargetsByFaction` / `SyncedLeaderTargetRow` (lines ~159–176) — remove after repoint.
- `src/hooks/useBsdataFaction.ts` §`useLeaderTargetsByFaction` + `LEADER_TARGETS_KEY` — remove after repoint.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getUdbPointsByFaction` (in `DatasheetPointsTab.tsx`) and `getLeaderTargetsForList` (`leaderTargets.ts`) — both model the `udb_units.faction_id` filter and the `udb_leader_targets` double-join; the new query is a direct combination of the two.
- `useBsdataFaction.ts` hooks — the `staleTime/gcTime: Infinity` + `enabled: factionId !== undefined` + KEY-factory pattern to replicate for the new canonical faction hook.

### Established Patterns
- Faction-scoped Rules Hub reads return flat rows the component filters client-side by `unit_name`/`leader_name` (it fetches once at tab level, then filters per expanded datasheet) — preserve this; do NOT introduce a per-row hook (D-07 hooks-in-loop rule from Phase 137).
- Canonical data uses `staleTime/gcTime: Infinity` (immutable between imports).
- Parameterized `$1` positional binds; `PRAGMA foreign_keys = ON` is set per connection.

### Integration Points
- `DatasheetPointsTab` is the only consumer of `useLeaderTargetsByFaction`; once swapped, the synced-table read path has zero callers (confirmed by the audit and STATE.md D-10).
- The leader-targets badge section (`<Link/> Leader — Can attach to`) renders only when the filtered array is non-empty — so the bug today is a silently-empty section, not a crash. Post-fix it populates from canonical data.

</code_context>

<specifics>
## Specific Ideas

The audit dictated the fix shape almost exactly; this phase is mechanical: combine the faction-filter idiom (`getUdbPointsByFaction`) with the leader double-join idiom (`getLeaderTargetsForList`), keep the row shape stable, repoint the one consumer, delete the dead readers, prove it with a data-layer test.

</specifics>

<deferred>
## Deferred Ideas

- **DROP `synced_leader_targets` table** — after this phase the table has zero readers and zero writers (writer removed in Phase 137 per D-10). A migration (051) to drop it would finish the "honest schema" goal and usefully re-trigger the Phase-130 parity gate, but it adds migration/parity risk beyond this narrow read-path repoint. Defer to a future schema-cleanup phase.
- **Audit other lingering `synced_*` dead-table readers** — if any other `bsdataExtended.ts` synced-table queries are also dead post-Wahapedia-pipeline, a broader dead-query sweep belongs in its own cleanup phase, not here.

</deferred>

---

*Phase: 140-close-play-02-03-tail-repoint-rules-hub-datasheetpointstab-f*
*Context gathered: 2026-06-18*
