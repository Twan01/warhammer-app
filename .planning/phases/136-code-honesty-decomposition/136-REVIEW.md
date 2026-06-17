---
phase: 136-code-honesty-decomposition
reviewed: 2026-06-17T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - src-tauri/migrations/049_drop_promoted_to_reminder.sql
  - src-tauri/src/lib.rs
  - src/features/army-lists/ArmyListDetailHeader.tsx
  - src/features/army-lists/ArmyListDetailPage.tsx
  - src/features/army-lists/ArmyListPortals.tsx
  - src/features/army-lists/ArmyListQuickAdd.tsx
  - src/features/army-lists/ArmyListUnitTable.tsx
  - src/features/army-lists/SnapshotCompareDialog.tsx
  - src/features/army-lists/useArmyListExport.ts
  - src/features/battle-log/BattleLogSheet.tsx
  - src/features/dashboard/DashboardPage.tsx
  - src/features/rules-hub/DatasheetPointsTab.tsx
  - src/features/rules-hub/EnhancementsList.tsx
  - src/features/unit-database/UdbDatasheetSheet.tsx
  - src/features/units/UnitDeleteDialog.tsx
  - src/hooks/useArmyListSnapshots.ts
  - src/hooks/useArmyLists.ts
  - src/hooks/useBsdataFaction.ts
  - src/hooks/useEnhancements.ts
  - src/hooks/useRecipes.ts
  - src/hooks/useUnits.ts
  - src/types/battleLog.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 136: Code Review Report

**Reviewed:** 2026-06-17
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

This phase covered four refactor sub-tasks: HON-08 (WeaponTable dedup), HON-09
(ArmyListDetailPage decomposition into sub-components), HON-10 (routing inline
queries through named React Query hooks with invalidation symmetry), and HON-11
(migration 049 dropping the vestigial `promoted_to_reminder` column).

The decomposition of `ArmyListDetailPage` is structurally sound: the reducer
contract is preserved, portals remain unnested siblings, and `useArmyListExport`
correctly extracts all export handlers without re-introducing `list` nullability
bugs. The migration file and lib.rs registration block are both correct.

One critical bug was found: `useArmyLists.ts` (HON-10 invalidation symmetry)
invalidates the entire `["unit-army-lists"]` prefix, but `useUnits.ts` stores the
per-unit query under the key `["unit-army-lists", unitId]`. A prefix-only
invalidation works correctly here — this is a non-issue — but the HON-10 fix
missed the symmetric path: `useUpdateArmyListUnit` does not invalidate
`["unit-army-lists"]`, leaving `UnitDeleteDialog`'s membership warning stale when
a unit's list membership changes through a unit-update mutation. That said, the
most impactful bug is a genuine cache-key duplication that could cause phantom
stale data and wasted DB queries (see CR-01 below).

Three warnings cover: an unused prop surfaced by the decomposition, a snapshot
diff algorithm edge case that produces wrong output for lists with duplicate unit
names, and a missing `useUpdateArmyListUnit` invalidation.

---

## Critical Issues

### CR-01: Duplicate, divergent cache-key namespaces for leader targets data

**File:** `src/hooks/useLeaderTargets.ts:13-14` and `src/hooks/useBsdataFaction.ts:30-31`

**Issue:** HON-10 introduced `useLeaderTargetsByFaction` in `useBsdataFaction.ts` with
the cache key namespace `"leader-targets-by-faction"`. A pre-existing hook
`useLeaderTargets` in `useLeaderTargets.ts` uses the distinct namespace
`"leader-targets"`. Both hooks call the same underlying function
`getLeaderTargetsByFaction` with the same argument (a faction id string).

`ArmyListDetailPage.tsx:88` continues to use `useLeaderTargets` (old hook).
`DatasheetPointsTab.tsx:362` uses `useLeaderTargetsByFaction` (new hook).
`LeaderAttachmentSheet.tsx:52` also uses `useLeaderTargets` (old hook).

Result: for any faction that is viewed in both the DatasheetPointsTab and the
Army List detail simultaneously, React Query maintains two independent cache
entries pointing at the same DB data, fetches from the DB twice (one per
namespace), and keeps two stale-time clocks. More critically, the `staleTime` on
the two hooks is inconsistent: `useLeaderTargets` uses 5 minutes,
`useLeaderTargetsByFaction` uses `Infinity`. Any future invalidation written for
one key namespace (e.g., after a rules sync) will silently not invalidate the
other, causing the data they display to diverge.

The intent of HON-10 was to canonicalize query routing. Leaving two competing
implementations of the same query with different namespaces and different
`staleTime` values is the opposite of canonicalization and makes the invalidation
symmetry guarantee hollow.

**Fix:** Delete `src/hooks/useLeaderTargets.ts` (the pre-existing, non-HON-10
hook). Update all three call sites to import from `useBsdataFaction`:

```typescript
// ArmyListDetailPage.tsx and LeaderAttachmentSheet.tsx — replace:
import { useLeaderTargets } from "@/hooks/useLeaderTargets";
// …
const { data: leaderTargets } = useLeaderTargets(factionIdStr);

// With:
import { useLeaderTargetsByFaction } from "@/hooks/useBsdataFaction";
// …
const { data: leaderTargets } = useLeaderTargetsByFaction(factionIdStr ?? undefined);
```

Note: `useLeaderTargetsByFaction` takes `string | undefined`; callers currently
pass `string | null`. The adapter is trivial: pass `factionIdStr ?? undefined`.

---

## Warnings

### WR-01: `listId` prop declared but never consumed in `ArmyListUnitTable`

**File:** `src/features/army-lists/ArmyListUnitTable.tsx:82`

**Issue:** The `ArmyListUnitTableProps` interface declares `listId: number` at
line 82, but the body of `ArmyListUnitTable` (lines 92–187) never references it.
The prop is passed at the call site (`ArmyListDetailPage.tsx:357`) and flows into
nothing. With strict TypeScript (`noUnusedLocals`) this would normally be caught,
but it slips through because the unused field is on a destructured *interface*, not
a standalone variable — the destructuring pattern at line 92–106 simply does not
include `listId`.

If the prop was needed during a prior incarnation and was retained by accident
during the HON-09 decomposition, it becomes dead interface surface that misleads
future readers into thinking the table needs a `listId` for some purpose (e.g.,
navigation). If it is genuinely needed in the future the omission from
destructuring is a latent bug.

**Fix:** Either remove `listId` from the interface and the call site, or destructure
it in the component body if it serves a future purpose. Prefer removal:

```typescript
// ArmyListUnitTable.tsx — remove from interface:
interface ArmyListUnitTableProps {
  unitsByCategory: ...;
  // listId: number;  <-- remove
  ...
}

// ArmyListDetailPage.tsx line 357 — remove the prop:
<ArmyListUnitTable
  unitsByCategory={unitsByCategory}
  // listId={listId}  <-- remove
  ...
/>
```

---

### WR-02: Snapshot diff pairing algorithm produces wrong output for duplicate unit names

**File:** `src/features/army-lists/SnapshotCompareDialog.tsx:152-166`

**Issue:** The "common units" display block (lines 152–166) pairs each `unitsCommon`
entry with its B-snapshot counterpart using a counted-index approach: for the
i-th occurrence of a name in `diff.unitsCommon`, it finds the i-th occurrence of
that name in `parsedB!.units`. However `diff.unitsCommon` is computed by
`computeSnapshotDiff` (in `src/lib/snapshotDiff.ts`, not reviewed here), which
presumably does a set-intersection on names. If a unit appears twice in both
snapshots (e.g., two "Tactical Squad" entries), the pairing relies on array
order being consistent between `unitsCommon` and `parsedB.units`. There is no
guarantee they share the same order — `parsedB.units` preserves the JSON-parsed
order from the snapshot blob, while `unitsCommon` follows the diff library's
output order.

The fallback `?? bUnitsWithName[0]` on line 159 silently masks the mismatch
instead of flagging it, meaning the wrong points value is silently shown for the
second (and later) duplicate entry.

For the common case of army lists with no duplicate unit names, there is no
visible bug. The issue only manifests when a user has the same unit in a list
more than once — a valid and common scenario (e.g., three Tactical Squads).

**Fix:** Key the pairing by a stable compound identity rather than name. If the
snapshot blob stores a per-unit stable id (e.g., `army_list_unit_id`), use that.
Otherwise, accept that duplicate-name pairing is ambiguous and document the
limitation. At minimum, remove the silent fallback to `bUnitsWithName[0]` and
instead render "—" when the pairing index overflows:

```typescript
const unitB = bUnitsWithName[matchIndex]; // no fallback — undefined means no match
// ...
<TableCell ...>{unitB?.points ?? "—"}</TableCell>
```

---

### WR-03: `useUpdateArmyListUnit` does not invalidate `["unit-army-lists"]`, breaking HON-10 symmetry

**File:** `src/hooks/useArmyLists.ts:199-205`

**Issue:** HON-10 added `["unit-army-lists"]` invalidation to `useAddUnitToList`
(line 163) and `useRemoveUnitFromList` (line 184). The goal was to keep
`UnitDeleteDialog`'s membership query (`useUnitArmyLists`) fresh after any list
membership change.

`useUpdateArmyListUnit` (lines 199–205) also mutates `army_list_units` rows —
specifically `points_override` and `notes` — but does not invalidate
`["unit-army-lists"]`. While those fields do not change which units are members of
which lists, any future change to `updateArmyListUnit` that touches membership
(e.g., re-assigning a unit to a different list) will be silently missing the
invalidation. More importantly, the HON-10 comment at lines 163 and 184 documents
this as a symmetry fix, implying all `army_list_units` mutations should carry it.
The omission is inconsistent with the stated contract.

**Fix:** Add the invalidation to `useUpdateArmyListUnit`'s `onSuccess`:

```typescript
export function useUpdateArmyListUnit() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateArmyListUnitVariables>({
    mutationFn: ({ list_id: _list_id, ...rest }) => updateArmyListUnit(rest),
    onSuccess: (_, variables) => {
      invalidateListWithReadiness(qc, variables.list_id);
      qc.invalidateQueries({ queryKey: ["unit-army-lists"] }); // HON-10 symmetry
    },
  });
}
```

---

## Info

### IN-01: `ArmyListDetailPage` passes `list?.id` but `list` is guaranteed non-null at that point

**File:** `src/features/army-lists/ArmyListDetailPage.tsx:59`

**Issue:** Line 59 reads `useListWargear(list?.id)` using optional chaining. At
this point in the component, `list` may be `undefined` (it is loaded by
`useArmyList`), so the optional chain is needed. However, the pattern creates a
subtle inconsistency: `listId` (the prop) is always a `number`, but `list?.id` is
`number | undefined`. The hook is properly guarded by its `enabled: listId !==
undefined` check, so there is no bug — but using `listId` directly (which is
always defined) is clearer and avoids the unnecessary optional chain:

```typescript
const { data: listWargear } = useListWargear(listId);
```

This is minor; the current code is correct.

---

### IN-02: `SortableUnitRow` wraps `ArmyListUnitRow` in a double-table pattern that breaks semantic HTML

**File:** `src/features/army-lists/ArmyListUnitTable.tsx:49-67`

**Issue:** `SortableUnitRow` renders a `<tr>` with a `colSpan={5}` `<td>`, then
inside that `<td>` immediately creates a new `<table><tbody>` before rendering
`ArmyListUnitRow`. The dnd-kit drag scaffold needs a `<tr>` as the root for
`setNodeRef`, but nesting a `<table>` inside a `<td>` is non-standard and causes
browsers to insert an implicit anonymous table structure. The row may not align
with the outer `<Table>` column widths depending on computed widths.

This was likely pre-existing before this phase, but the decomposition of
`ArmyListUnitTable` into its own file makes it more visible. It is not a
regression introduced by this phase, and fixing it would require a larger dnd-kit
structural change. Noting it for future cleanup.

**Fix:** Investigate dnd-kit's `DragOverlay` pattern as an alternative — it allows
dnd without requiring the draggable element to be a table row, eliminating the
double-table nesting.

---

_Reviewed: 2026-06-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
