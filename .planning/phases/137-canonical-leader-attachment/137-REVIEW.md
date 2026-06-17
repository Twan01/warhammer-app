---
phase: 137-canonical-leader-attachment
reviewed: 2026-06-17T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - scripts/build-unit-db.ts
  - scripts/download-wahapedia.ts
  - scripts/lib/types.ts
  - src-tauri/migrations/050_udb_leader_targets.sql
  - src-tauri/src/lib.rs
  - src/db/queries/bsdataExtended.ts
  - src/db/queries/leaderTargets.ts
  - src/features/army-lists/ArmyListDetailPage.tsx
  - src/features/army-lists/ArmyListUnitRow.tsx
  - src/features/army-lists/ArmyListUnitTable.tsx
  - src/features/army-lists/LeaderAttachmentSheet.tsx
  - src/hooks/useLeaderTargets.ts
  - tests/army-lists/LeaderAttachmentSheet.test.tsx
  - tests/data-layer/leader-targets.test.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 137: Code Review Report

**Reviewed:** 2026-06-17
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 137 introduces the `udb_leader_targets` table (migration 050), populates it through the Rust importer from `Datasheets_leader.csv`, rewires the army-list leader-attachment UI off fragile name-matching onto a canonical FK join, and threads the `isLeader` prop chain down from page to row.

The overall design is sound and correctly implements the NULL-permissive / empty-Set distinction. Two blockers were found: `Datasheets_leader.csv` is absent from `REQUIRED_CSVs` in the build script, meaning a cold checkout silently gets zero leader-target data and the build succeeds without warning; and the 5-table join in `getLeaderTargetsForList` contains a latent correctness bug under unit-sharing (one `units` row whose `udb_unit_id` is pointed at by multiple `army_list_units` rows will produce duplicates that can render a non-target as valid). Four warnings cover the Rust FK-OFF/FK-ON lifecycle boundary, a `staleTime: Infinity` cache hygiene gap, a missing test assertion, and a dead import. Three info items round out style and documentation gaps.

---

## Critical Issues

### CR-01: `Datasheets_leader.csv` absent from `REQUIRED_CSVs` — silent empty table on fresh checkout

**File:** `scripts/build-unit-db.ts:65-76`

**Issue:** `REQUIRED_CSVs` lists ten files that are checked for existence before the pipeline runs. `Datasheets_leader.csv` is not in that list. When the file is absent (fresh clone, incomplete download), `readCsvFile` returns an empty array (or throws, depending on implementation), Step 7b emits `Parsed 0 leader attachment pairs`, and the build succeeds with `leader_targets: []` baked into `unit_database.json`. The Rust importer then writes zero rows to `udb_leader_targets`. Every leader in the UI falls through to the permissive NULL fallback, silently showing all units as attachable — indistinguishable from the correct "no canonical data" path. The A1 warning at line 354-361 only fires when rows are present but zero pairs are emitted; it does not fire when the CSV file is simply missing (zero rows, zero pairs, no warning).

`download-wahapedia.ts` line 41 correctly downloads `Datasheets_leader.csv` — the omission is only in the build-time guard.

**Fix:** Add `"Datasheets_leader.csv"` to `REQUIRED_CSVs`:

```ts
const REQUIRED_CSVs = [
  "Factions.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Datasheets_wargear.csv",
  "Datasheets_models_cost.csv",
  "Detachment_abilities.csv",
  "Stratagems.csv",
  "Enhancements.csv",
  "Datasheets_leader.csv",   // ← add this
] as const;
```

---

### CR-02: 5-table join produces duplicate `target_alu_id` when a single `units` row is referenced by multiple `army_list_units` rows in the same list

**File:** `src/db/queries/leaderTargets.ts:43-55`

**Issue:** The join path is:

```
army_list_units leader_alu
  JOIN units leader_u ON leader_u.id = leader_alu.unit_id
  JOIN udb_leader_targets lt ON lt.leader_unit_id = leader_u.udb_unit_id
  JOIN units target_u ON target_u.udb_unit_id = lt.target_unit_id
  JOIN army_list_units target_alu ON target_alu.unit_id = target_u.id AND target_alu.list_id = $1
WHERE leader_alu.list_id = $1
```

If a player adds the same unit (same `unit_id`, hence same `units` row, hence same `udb_unit_id`) to a list twice (two separate `army_list_units` rows), **both** target-side `army_list_units` rows match the last JOIN. For each canonical `(leader_unit_id, target_unit_id)` pair in `udb_leader_targets`, the query emits **two rows** — one for each duplicate target `army_list_units` entry. `LeaderAttachmentSheet` builds `validTargetIds` as a `Set` (so the caller-side dedup is fine), but `ArmyListDetailPage` builds `leaderAluIds` from `.map(p => p.leader_alu_id)` (line 128 — array, not Set construction by value). More importantly: if a user adds the same *leader* unit twice, both leader `army_list_units` ids appear in `leader_alu_id`, which is intentional — but the cross-product also inflates `target_alu_id` entries, potentially surfacing **non-target** units as valid targets in a future query that does not deduplicate.

The current `validTargetIds = new Set(...)` construction in `LeaderAttachmentSheet` is safe because it only uses `.has()`, but `leaderAluIds` in `ArmyListDetailPage` consumes the array via `new Set(pairs.map(...))` — that specific usage is fine. The real risk is that today's query is one join away from a semantic bug: adding a `DISTINCT` guard is cheap insurance.

**Fix:** Add `DISTINCT` to the SELECT:

```sql
SELECT DISTINCT
  leader_alu.id AS leader_alu_id,
  target_alu.id AS target_alu_id
FROM army_list_units leader_alu
...
```

---

## Warnings

### WR-01: FK-ON state after commit failure — `PRAGMA foreign_keys = ON` restores against a moved connection

**File:** `src-tauri/src/lib.rs:1082-1089`

**Issue:** After `tx.commit()`, the code issues `PRAGMA foreign_keys = ON` against `conn` (the raw connection). If the commit failed, the `?` at line 1089 returns early before the checkpoint at 1092-1095 — but crucially `foreign_keys = ON` is still executed on line 1085 (`let _ = ...`), so that part is safe. The actual concern is ordering: the FK restore on line 1085-1087 runs against `conn`, which is the connection *outside* the transaction. FK checks are session-scoped in SQLite. Because `PRAGMA foreign_keys = OFF` was set on `conn` at line 754 and the transaction `tx` is derived from `conn`, any rollback leaves `conn` with FK checks still OFF. After a rollback the `conn` is dropped at end of function, so no further statements can execute on it — the FK-OFF state cannot leak to another statement on this connection. However the `PRAGMA foreign_keys = ON` at line 1085 is inside a `let _ =` (best-effort) — if it fails, the function still returns `Ok(counts)` (or propagates the commit error), but FK state is not fully restored. This is low probability but creates an invisible correctness gap if `conn` is ever re-used after a commit/checkpoint error path.

The cleanup would be cleaner with `defer`-style RAII, but for this codebase the minimal fix is: move the FK restore before the `commit_result?` propagation and after `commit_result` is bound (which is already done), and add an explicit error log if the FK restore fails:

```rust
let commit_result = tx.commit().await.map_err(|e| format!("commit udb: {e}"));

// Restore FK unconditionally — log if it fails (conn may be in unknown state)
if let Err(e) = sqlx::query("PRAGMA foreign_keys = ON")
    .execute(&mut conn)
    .await
{
    eprintln!("[hobbyforge] WARN: failed to restore foreign_keys ON after udb import: {e}");
}

commit_result?;
```

---

### WR-02: `staleTime: Infinity` on `useLeaderTargets` is never invalidated after a UDB import

**File:** `src/hooks/useLeaderTargets.ts:34-35`

**Issue:** `staleTime: Infinity` and `gcTime: Infinity` mean the `["leader-targets", listId]` query result is never re-fetched within a session. This is documented as "canonical data — immutable between imports." However, the UDB import completes asynchronously (spawned task in `lib.rs` setup hook) and emits a `"udb-import-complete"` Tauri event. If the user opens an army list *before* the import completes (race on slow disks or first launch), the hook fetches and caches an empty result set; when the import finishes, the cache is never invalidated because `staleTime: Infinity` prevents any background refetch and no code listens for the `"udb-import-complete"` event to call `queryClient.invalidateQueries`.

Other hooks (e.g., `useUdbMeta`) presumably handle this by listening for the event — but `useLeaderTargets` does not. The result: on first-launch race, leader attachment buttons do not appear for any unit until the user navigates away and back (cache GC requires a full page reload).

**Fix:** Either listen for `"udb-import-complete"` in `ArmyListDetailPage` and invalidate `["leader-targets", listId]`, or use a finite `staleTime` (e.g., `5 * 60 * 1000`) that tolerates a single re-fetch on revisit. The `Infinity` is reasonable for sessions where the import is already complete before the page is visited (the common case), but the race window is real.

---

### WR-03: `leaderAluIds` in `ArmyListDetailPage` — ghost/manual units with `udb_unit_id: null` are silently excluded from the `isLeader` Set, but the `Attach Leader` button depends on it

**File:** `src/features/army-lists/ArmyListDetailPage.tsx:127-129`

**Issue:**

```ts
const leaderAluIds = useMemo(() => {
  return new Set((leaderTargetPairs ?? []).map((p) => p.leader_alu_id));
}, [leaderTargetPairs]);
```

`leaderTargetPairs` only contains rows returned by the canonical join. Because the join requires `leader_u.udb_unit_id IS NOT NULL` (it fails the `JOIN udb_leader_targets` if null), ghost/manual units are never in `leaderTargetPairs`. Therefore ghost leaders never appear in `leaderAluIds`, meaning `isLeader` is always `false` for them, and the `Attach Leader` button never renders for ghost units.

The permissive NULL fallback in `LeaderAttachmentSheet` correctly shows all target units when `unit.udb_unit_id == null` — but the user can never open the sheet for a ghost leader because `isLeader` is false and the button is hidden. This contradicts the design intent in the sheet's own header comment ("ghost/manual units must never be blocked from attaching").

The design either needs: (a) a separate mechanism to mark ghost units as leaders (e.g., a user-settable flag or a fallback that shows the Attach Leader button for all Character/non-Epic-Hero units regardless of canonical data), or (b) documentation that ghost units cannot use the leader attachment flow. Currently the code and comments are contradictory.

**Fix (minimal):** Show the Attach Leader button for any unit that lacks a `udb_unit_id` and has the Character keyword (consistent with the enhance trigger logic):

```ts
// In ArmyListUnitRow.tsx
const isLeader = (leaderAluIds?.has(unit.id) ?? false)
  || (unit.udb_unit_id == null && isCharacter && !isEpicHero);
```

Or add explicit documentation that ghost leaders are out of scope for canonical attachment.

---

### WR-04: Dead import — `useLeaderTargets` imported in `ArmyListDetailPage.tsx` at line 37 but `leaderTargetPairs` is only used for the `leaderAluIds` derived Set; the hook call is valid, but `wahapediaFactionId` (line 85) is computed from `faction?.wahapedia_faction_id` and then only used as a prop to `DetachmentPicker` (line 388), not passed into leader target resolution — no bug, but the Phase 92 `factionId`-keyed hook is still referenced in `bsdataExtended.ts:165-176` (`getLeaderTargetsByFaction` / `synced_leader_targets`) which is entirely untouched dead code

**File:** `src/db/queries/bsdataExtended.ts:159-176`

**Issue:** `getLeaderTargetsByFaction` (lines 165-176) queries `synced_leader_targets`, a Phase 92 table. After Phase 137 the canonical source of truth for leader targets is `udb_leader_targets`. `getLeaderTargetsByFaction` is no longer called anywhere in the codebase (the hook `useLeaderTargets` now calls `getLeaderTargetsForList` from `leaderTargets.ts`). The `SyncedLeaderTargetRow` interface (lines 159-163) and the function are dead code. Leaving them risks a future developer re-wiring the old name-matching path.

**Fix:** Remove `SyncedLeaderTargetRow` and `getLeaderTargetsByFaction` from `bsdataExtended.ts`, along with the corresponding `synced_leader_targets` table query if the migration table itself is no longer populated.

---

## Info

### IN-01: Test 2 counts the leader itself as an "Attach Leader" target — test assertion may be wrong or document a surprising UX behavior

**File:** `tests/army-lists/LeaderAttachmentSheet.test.tsx:196-199`, `224-234`

**Issue:** In Test 2 (lines 196-199), the permissive path renders `units = [leader, unit1, unit2]` and asserts `attachButtons.length === 3` — meaning the leader is shown as a valid target for itself. Similarly at lines 224-234, `units = [leader, unit1, unit2, unit3]` and the assertion is 4 buttons. The component's `validTargetUnits` in permissive mode is `units` without excluding `unit` (the leader itself). A leader attaching to itself is semantically nonsensical but the test validates it as expected behavior. If this is intentional, a comment explaining why self-attachment is allowed in permissive mode would avoid future confusion. If it is unintentional, `LeaderAttachmentSheet.tsx` line 74-77 should filter out `unit.id` from `units`:

```ts
const validTargetUnits = useMemo(() => {
  if (validTargetIds === null) return units.filter((u) => u.id !== unit?.id);
  return units.filter((u) => validTargetIds.has(u.id));
}, [units, validTargetIds, unit]);
```

---

### IN-02: Content hash line 866 in `build-unit-db.ts` is very long and will cause formatting issues in editors, but more importantly the hash object keys are not alphabetically sorted — rely on object literal insertion order

**File:** `scripts/build-unit-db.ts:866`

**Issue:** The hash input at line 866 uses an object literal with keys in definition order. JavaScript `JSON.stringify` of an object serializes keys in insertion order (for string keys), which is deterministic within a single V8 process. However, the hash is used to detect data changes (content-addressed versioning). If the key order of this object literal is ever refactored (e.g., `leaderTargets` moved earlier), the hash changes even if the data is identical, triggering an unnecessary full re-import. This is a latent maintenance trap rather than an active bug.

**Fix:** Sort hash input keys alphabetically or document the insertion-order dependency with a comment.

---

### IN-03: `build-unit-db.ts` Step 7b comment "ASSUMED column name per A1" (lines 342-343)

**File:** `scripts/build-unit-db.ts:342-343`

**Issue:** The inline comments `// ASSUMED column name per A1 — confirmed at build time` for `leader_id` and `attached_id` are provisional. The A1 warning at lines 354-361 will catch the case where the CSV exists but has different column names, which is good. However, "confirmed at build time" is misleading — the build does not fail on wrong column names; it only warns. If the actual Wahapedia column names differ, the build succeeds silently with zero pairs and no error is raised (CR-01 expands on this).

**Fix:** Update the comment to accurately describe the behavior: "Build continues with 0 pairs if columns are named differently — check the A1 warning in build output." No code change required.

---

_Reviewed: 2026-06-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
