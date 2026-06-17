# Phase 137: Canonical Leader Attachment - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Make leader attachment in the army-list builder validate against **real canonical
attachment pairs** from Wahapedia, instead of the current fragile name matching
against an empty table. Two requirements, one gating the other:

1. **PLAY-02 (gates PLAY-03)** — Ship a `udb_leader_targets` table (composite PK,
   both columns FK → `udb_units(id)` ON DELETE CASCADE), populated from Wahapedia
   `Datasheets_leader.csv` through the existing canonical pipeline:
   `download-wahapedia.ts` → `build-unit-db.ts` (bundled JSON) → Rust
   `import_unit_database_inner` → SQLite. The CSV gives `leader_id|attached_id`
   pairs — **both are `udb_units.id` values** (1,918 pairs verified live 2026-06-15).

2. **PLAY-03** — Repoint the existing Phase-92 `LeaderAttachmentSheet` UI off
   name-matching onto the canonical FK join. Only valid leader→target pairs are
   permitted, with a **graceful fallback for units that have a NULL `udb_unit_id`**
   (ghost/manual units never lose the ability to attach).

Adding the new migration re-triggers the Phase-130 parity/release gate — proving
the gate works on a real new migration is itself a success criterion.

**Out of scope (own phases):** unit comparison view (PLAY-01, Phase 138);
Collection ⇆ Unit Database loop (PLAY-04, Phase 138); dashboard goal progress
(PLAY-05, Phase 138); pipeline FK/orphan validation at scale (DAT, Phase 139).

</domain>

<decisions>
## Implementation Decisions

> `--auto` run: every gray area below was auto-resolved with the recommended
> default, grounded in the existing research (`ARCHITECTURE.md` §Q2, §Q3 and
> the Theme-C rows of `PITFALLS.md`). The Explore scout confirmed exact file
> locations and one **factual correction** to the research (migration number).
> Auto-decision log is in `137-DISCUSSION-LOG.md`.

### Table strategy (PLAY-02)
- **D-01:** Create a **new canonical `udb_leader_targets` table** — do NOT repurpose
  `synced_leader_targets`. The synced table is name-keyed (TEXT), fed only by the
  removed BSData sync (`replaceSyncedLeaderTargets` never called post-v0.4.7), and
  is therefore **empty**. The canonical CSV gives id pairs, so we join by id exactly
  as points already resolve through `udb_unit_id`. *(auto: recommended — research
  Q2; name matching is the same fragility migration 046 fixed for factions)*
- **D-02:** Schema per `ARCHITECTURE.md` §Q2 — composite PK `(leader_unit_id,
  target_unit_id)`, both `TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE`,
  plus the two single-column indexes. Mirrors the `udb_unit_keywords` composite-PK
  child-table pattern. No surrogate id.

### Migration number — FACTUAL CORRECTION
- **D-03:** The new migration is **`050_udb_leader_targets.sql`**, NOT `048` as
  written in ROADMAP success-criterion #1 and `ARCHITECTURE.md` §Q2. Migrations
  `048_consolidate_factions.sql` and `049_drop_promoted_to_reminder.sql` already
  exist on disk (the latter landed in Phase 136). Use the **next free number, 050**;
  never reuse a taken number. The ROADMAP/research "048" text is stale — the
  *intent* ("a new migration re-triggers the Phase-130 parity gate") still holds.
  *(auto: factual — confirmed by `ls src-tauri/migrations/`)*
- **D-04:** Authoring discipline (from Phase-136 D-11/D-12, still binding): **LF
  line endings** on the migration file (CRLF caused the prior checksum-drift/update
  incident), and bump the migration count **together** across `lib.rs`
  `Migration{}` registration, `tests/data-layer/db-helpers.ts` migration list, and
  the `scripts/check-version.mjs` invariant — in one move (PITFALLS #3 class).

### Pipeline wiring (PLAY-02) — `ARCHITECTURE.md` §Q2 steps
- **D-05:** Three coordinated edits, exactly as research specifies:
  1. `scripts/download-wahapedia.ts` — add `"Datasheets_leader.csv"` to the CSV list.
  2. `scripts/build-unit-db.ts` — parse step mirroring the keywords step: keep only
     pairs where **both** ids are in `validUnitIds` (drops Legends-filtered/unknown
     units — the existing guard), dedup, sort deterministically
     (`leader_unit_id` then `target_unit_id`), emit a new `leader_targets` array
     into `UnitDatabaseJson`.
  3. `src-tauri/src/lib.rs` `import_unit_database_inner` — add `udb_leader_targets`
     to the reverse-FK DELETE list, an INSERT loop over `payload.leader_targets`,
     the field on the `UnitDatabasePayload` serde struct, and the count on
     `UdbImportResult`.

### Version-skip avoidance — CRITICAL
- **D-06:** Add the new `leader_targets` array to the **content-hash input** that
  produces the bundled JSON `version`. The Rust importer **skips import entirely
  when `udb_meta.version` already matches** `payload.version` — so without a
  version bump, existing installs (and dev DBs) would create the empty table and
  never populate it. This is the single highest-risk step. *(auto: recommended —
  research Q2 explicitly flags it; "table exists but empty after update" is the
  failure mode)*

### Validation query shape (PLAY-03)
- **D-07:** New query module `src/db/queries/leaderTargets.ts` exposing a **batch,
  list-level** function — `getLeaderTargetsForList(listId)` — that joins
  `army_list_units → units → udb_leader_targets` and returns valid
  `(leader army_list_unit id, target army_list_unit id)` pairs directly. Consume it
  via a **page-level `useMemo` Map**, never a per-row/per-leader hook. This honors
  the Phase-136 HON-10/HON-08 hook discipline and avoids the N+1 hooks-in-loop
  anti-pattern (PITFALLS #8). *(auto: recommended over per-leader
  `getLeaderTargetIdsForLeader`)*
- **D-08:** **Rewrite** `src/hooks/useLeaderTargets.ts` to key off the canonical
  data (listId / `udb_unit_id`) with `staleTime: Infinity` (canonical, immutable
  between imports). Repoint `LeaderAttachmentSheet.tsx` (lines ~57–70) off the
  `unit_name`/`leader_name` string compare onto the id-based valid-target set.

### NULL `udb_unit_id` fallback (PLAY-03 success-criterion #2)
- **D-09:** When the **leader** unit has a NULL `udb_unit_id` (ghost units, manually
  added units, or canonical units whose datasheet has no leader rows), fall back to
  **permissive**: allow the attachment UI to proceed with **no canonical
  restriction** rather than blocking the user, and surface a quiet advisory (e.g.
  "no canonical attachment data — validation unavailable for this unit"). Targets
  with NULL `udb_unit_id` are simply absent from the canonical valid set but remain
  selectable under the same permissive fallback. Rationale: the milestone goal is
  *replace fragile matching*, not *lock out unlinked units* — never make the builder
  less usable than before for manual/ghost workflows. *(auto: recommended — the
  criterion explicitly requires a graceful NULL fallback; blocking would be a
  regression)*

### Legacy synced plumbing
- **D-10:** Remove the now-dead name-keyed path: delete
  `getLeaderTargetsByFaction` / `SyncedLeaderTargetRow` usage (and the unused
  `replaceSyncedLeaderTargets` if nothing else references it) once the hook is
  repointed. **Leave the empty `synced_leader_targets` table in place** — do NOT
  add a drop migration for it this phase (avoids unnecessary migration churn and a
  second parity-gate bump in one phase; it is inert). *(auto: recommended — honest
  cleanup of dead code without speculative schema churn)*

### Claude's Discretion
- Exact TypeScript type/interface names for the new `leader_targets` JSON shape
  (`UdbLeaderTargetRow`) and the query return row.
- Exact wording/placement of the permissive-fallback advisory in
  `LeaderAttachmentSheet`.
- Whether to keep a thin `getLeaderTargetIdsForLeader(udbUnitId)` helper alongside
  the batch query if a non-list caller needs it (planner/researcher to confirm
  caller surface).
- Batch INSERT chunk size in the Rust importer (follow the existing udb loops).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & implementation guidance (primary)
- `.planning/research/ARCHITECTURE.md` §Q2 — full design for `udb_leader_targets`:
  why a new table over `synced_leader_targets`, exact `CREATE TABLE`/index SQL,
  ON DELETE CASCADE rationale, and the three-edit pipeline wiring
  (`download-wahapedia.ts` → `build-unit-db.ts` → `lib.rs`) **including the
  content-hash/version-bump requirement**. NOTE: this doc says migration "048" —
  the correct number is **050** (see D-03).
- `.planning/research/ARCHITECTURE.md` §Q3 (query/hook layer) — new
  `src/db/queries/leaderTargets.ts`, the batch `getLeaderTargetsForList(listId)`
  shape, the `useLeaderTargets.ts` rewrite, page-level Map (no hooks-in-loop).
- `.planning/research/ARCHITECTURE.md` lines 43–44 — confirmation that the current
  name-match path is starved (empty `synced_leader_targets`, sync removed v0.4.7).
- `.planning/research/PITFALLS.md` — Theme-C / Phase-Specific Warnings rows:
  hooks-in-loop (#8), lost invalidation/symmetry, migration-count parity across
  `lib.rs`/`db-helpers.ts`/`check-version.mjs`, CRLF checksum drift.

### Conventions & precedents
- `.planning/phases/136-code-honesty-decomposition/136-CONTEXT.md` D-11/D-12 —
  binding migration discipline (LF endings, update parity gate in one move) for
  the prior new migration (049); the same gate now fires for 050.
- `CLAUDE.md` §Database patterns — never edit existing migrations; filename-ordered;
  `$1,$2` params; booleans `0|1`; `PRAGMA foreign_keys = ON` per connection.
- `.planning/PROJECT.md` line 436 — `units.udb_unit_id` is `ON DELETE SET NULL`
  (collection units survive re-import) — the FK the leader join hangs off, and the
  source of the NULL case D-09 must handle.

### Target source files (confirmed by scout — file:line)
- `src-tauri/migrations/038_udb_schema.sql:14-23` (`udb_units` PK `id TEXT`),
  `:68-73` (`udb_unit_keywords` composite-PK pattern to mirror).
- `src-tauri/migrations/042_udb_detachments.sql` (udb child-table FK precedent).
- `scripts/download-wahapedia.ts` — CSV list (add `Datasheets_leader.csv`).
- `scripts/build-unit-db.ts:64-75` (REQUIRED_CSVs), `:830-848`
  (`UnitDatabaseJson` assembly — add `leader_targets`; add to content hash).
- `src-tauri/src/lib.rs:642-673` (`UnitDatabasePayload` struct), `:693-1070`
  (`import_unit_database_inner` — DELETE list + INSERT loop), `:724-741`
  (version-skip guard — the reason D-06 matters).
- `src-tauri/tauri.conf.json:43-46` (resource bundling of `unit_database.json` —
  single file, no new resource entry needed).
- `src/features/army-lists/LeaderAttachmentSheet.tsx:44-70` (name-match logic to
  repoint), `:136-142` (`leader_attached_to_id` existing-leader check).
- `src/hooks/useLeaderTargets.ts:13-22` (hook to rewrite).
- `src/db/queries/bsdataExtended.ts:185-202` (`getLeaderTargetsByFaction` to retire).
- `src/db/queries/unitDatabase.ts:154-265` (udb child-query patterns to follow),
  `src/db/queries/armyLists.ts:63-102` (army-list join already exposes
  `u.udb_unit_id` — the join key).
- `tests/data-layer/db-helpers.ts`, `scripts/check-version.mjs` — parity gate to
  bump for migration 050.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Canonical pipeline** (`download-wahapedia.ts` → `build-unit-db.ts` →
  `lib.rs import_unit_database_inner`): every step already exists for 14+ udb
  arrays; `leader_targets` is one more array following the keywords/detachments
  precedent end-to-end.
- **`udb_unit_keywords` composite-PK migration** — exact template for the new
  table (two NOT NULL FK columns, composite PK, ON DELETE CASCADE).
- **Army-list join** (`armyLists.ts:63-102`) already selects `u.udb_unit_id` per
  row — the batch leader-target query joins straight onto it.
- **Page-level `useMemo` Map** idiom (reaffirmed in Phase 136 HON-10) — the
  N+1-safe way to attach per-row valid-target data.

### Established Patterns
- Bundled-JSON import is **version-gated**: import is a no-op when
  `udb_meta.version == payload.version`. Any new array MUST feed the content hash.
- udb child tables: `*_unit_id TEXT ... REFERENCES udb_units(id) ON DELETE CASCADE`;
  Rust importer DELETEs in reverse-FK order with FK off, re-inserts, rebuilds FTS.
- Migration count must agree across `lib.rs` / `db-helpers.ts` / `check-version.mjs`
  (the Phase-130 gate); new migration files use LF endings.

### Integration Points
- New migration 050 → re-triggers Phase-130 parity/release gate (success criterion
  #3 — this is intentional proof the gate works on a real migration).
- `LeaderAttachmentSheet` is the only consumer of the leader-target data; the
  Phase-136 (HON-09) `ArmyListUnitTable` decomposition left this seam clean to
  repoint.
- `units.udb_unit_id` NULL (ghost/manual units, or `ON DELETE SET NULL` after a
  re-import that dropped a unit) is the fallback path D-09 must handle gracefully.

</code_context>

<specifics>
## Specific Ideas

- `Datasheets_leader.csv` shape is `leader_id|attached_id`, **both Wahapedia
  datasheet ids = `udb_units.id`** (1,918 pairs verified live 2026-06-15). Join by
  id; no name normalization anywhere in the new path.
- Deterministic sort + dedup of pairs before emit, so the JSON (and its content
  hash) is reproducible across builds.

</specifics>

<deferred>
## Deferred Ideas

- **Drop `synced_leader_targets` table** — now fully dead (empty, name-keyed, no
  writer). Left in place this phase to avoid a second parity-gate migration bump;
  candidate for a future data-cleanup phase (Theme D / DAT) alongside other
  vestigial-schema removals.
- **Surface "this leader can lead X / can be led by Y" in the Unit Database
  browser** (read-only datasheet enrichment from the new table) — a new
  user-facing capability, belongs with Player-Journey Depth (Phase 138) or later,
  not in this validation-only phase.

</deferred>

---

*Phase: 137-canonical-leader-attachment*
*Context gathered: 2026-06-17*
