# Phase 46: Manual Overrides & Version Comparison - Research

**Researched:** 2026-05-08
**Domain:** SQLite override storage, diff computation, React Query mutation patterns, PlaybookTab UI extension
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Override storage pattern**
- Wide table (`unit_overrides` in hobbyforge.db), one row per unit, nullable columns for each overridable field
- Fields: `unit_id` (FK to units.id), `points`, `move`, `toughness`, `save`, `wounds`, `leadership`, `objective_control`, `keywords`, `abilities`
- All override columns nullable — NULL means "use imported value"
- UNIQUE constraint on `unit_id` (one override row per unit)
- Matches existing wide-table patterns: `unit_strategy_notes` is wide, `army_list_units` has `points_override`
- COALESCE chain in queries: `COALESCE(unit_overrides.points, u.points, 0)` for effective values
- Separate from `unit_strategy_notes` — strategy notes are personal gameplay notes, overrides are corrections to imported data

**Override UX entry point**
- Enhance existing PlaybookTab stats block with override semantics
- When user manually edits a stat that has an imported (datasheet) value, that edit becomes an override stored in `unit_overrides`
- Override values take priority over imported values via COALESCE
- Points override stored in `unit_overrides.points` — army list SQL can pick it up via extended COALESCE: `COALESCE(alu.points_override, unit_overrides.points, u.points, 0)`
- Keywords and abilities overrides entered via the existing PlaybookTab textarea/input, but stored in `unit_overrides` (not `unit_strategy_notes`) when they represent corrections to imported data
- Clear/reset action to remove an override (revert to imported value)

**Diff view presentation**
- Collapsible section in PlaybookTab sync area (matches existing "Sync details" Collapsible pattern)
- Shows changes since last snapshot: added/removed/changed datasheets, stat changes, keyword changes
- Toast summary after sync completes with change count ("Synced: 3 datasheets changed, 1 removed")
- Uses `rules_snapshot` data (pre-sync capture from Phase 45) compared against current rules.db state (post-sync)
- Diff data computed in TypeScript: read latest snapshot from hobbyforge.db, read current state from rules.db, compare
- Removed/renamed datasheets shown as a distinct alert (OVRD-07)

**Visual override markers**
- Small icon (Pencil from lucide-react, already imported in PlaybookTab) next to stat cells that have user overrides
- Tooltip on hover showing "Manual override — imported value: X"
- Override stat cells get a subtle accent border or background tint to distinguish from imported values
- Consistent with existing compact UI language in PlaybookTab stats block

### Claude's Discretion
- Exact migration number and DDL for `unit_overrides` table
- Diff view layout details (column widths, grouping strategy for changes)
- Whether to show diff inline per-unit or as a faction-wide summary
- Toast message formatting for post-sync change summary
- Whether "clear override" is a button per field or a bulk "reset all" action

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OVRD-01 | User can manually override points for a unit (persists across re-syncs) | unit_overrides.points column; COALESCE in army list queries |
| OVRD-02 | User can manually override stats (M/T/Sv/W/Ld/OC) for a unit (persists across re-syncs) | unit_overrides wide-table columns parallel to unit_strategy_notes |
| OVRD-03 | User can manually override keywords for a unit (persists across re-syncs) | unit_overrides.keywords TEXT column |
| OVRD-04 | User can manually override ability reminders for a unit (persists across re-syncs) | unit_overrides.abilities TEXT column |
| OVRD-05 | Manual overrides are visually distinguished from imported data in the UI | Pencil icon + accent border; Tooltip for imported value; Badge option |
| OVRD-06 | User can see what changed after a re-sync (points, stats, abilities, keywords changes) | computeSyncDiff() function comparing pre-sync snapshot to current rules.db |
| OVRD-07 | User can see if a datasheet was removed or renamed after re-sync | rw_datasheets diff from snapshot_data JSON in rules_snapshot rows |
</phase_requirements>

---

## Summary

Phase 46 is entirely within the existing codebase's established patterns. The override table (`unit_overrides`) mirrors `unit_strategy_notes` as a wide nullable-column table in hobbyforge.db, shielded from sync destruction. The COALESCE precedence chain (`army_list_unit.points_override → unit_overrides.points → units.points`) extends the pattern already live in `armyLists.ts`. The diff view leverages the `rules_snapshot` infrastructure shipped in Phase 45 — `capturePreSyncSnapshot()` already stores `{id, name}` pairs for all 7 simple-PK tables including `rw_datasheets`, which is exactly what OVRD-06 and OVRD-07 need.

The UI surface is PlaybookTab, which already has every dependency imported: `Pencil`, `Tooltip`/`TooltipContent`/`TooltipTrigger`, `Badge`, `Collapsible`/`CollapsibleContent`/`CollapsibleTrigger`, and the stats edit-mode toggle. The override work is additive — introduce `useUnitOverride` hook + query module, wire the stats cells to check `unit_overrides`, and extend the "Sync details" collapsible with a diff section.

**Primary recommendation:** Implement in three waves — (1) migration + query module + hook, (2) PlaybookTab stats block with override display and entry, (3) diff view and toast summary. Each wave is independently testable.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | project version | SQLite reads/writes via `getDb()` | Established project pattern; all DB access goes through this |
| @tanstack/react-query | project version | Server state, mutation + invalidation | All data hooks use this; `useUnitOverride` follows same pattern |
| lucide-react | project version | Pencil icon already imported in PlaybookTab | Already in use; no new dependency |
| shadcn/ui Tooltip | project version | "Imported value: X" hover text | Already used in PlaybookTab freshness dot |
| shadcn/ui Badge | project version | Override indicator option | Already imported in PlaybookTab error history |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | project version | Input validation schema for overrides | If a dedicated OverrideSheet form is added |
| sonner (toast) | project version | Post-sync diff summary toast | Already used via `toast.success()` in PlaybookTab `handleSyncClick` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Wide table | EAV (one row per field) | EAV is more flexible but requires multi-row reads/writes; wide table matches existing codebase pattern and allows simple COALESCE in SQL |
| TypeScript diff | SQL diff (subquery) | Cross-DB FK limitation prevents SQL-level diff between hobbyforge.db snapshot and rules.db; TypeScript diff is the only viable approach |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

New files for this phase:

```
src/
  db/queries/
    unitOverrides.ts        # getUnitOverride, upsertUnitOverride, deleteUnitOverride
  hooks/
    useUnitOverride.ts      # useUnitOverride(unitId), useUpsertUnitOverride, useDeleteUnitOverride
  lib/
    computeSyncDiff.ts      # pure computeSyncDiff(snapshot, currentDatasheets) function
  types/
    unitOverride.ts         # UnitOverride interface + UpsertUnitOverrideInput type
  features/units/
    PlaybookTab.tsx         # MODIFIED — override markers + diff collapsible section

src-tauri/migrations/
  017_unit_overrides.sql    # CREATE TABLE unit_overrides
```

### Pattern 1: Wide-Table Override Schema

**What:** One row per unit with nullable columns per overridable field. UNIQUE constraint on `unit_id`. NULL = "not overridden, use imported value."

**When to use:** When the full set of override fields is bounded and known at schema time. Enables COALESCE directly in SQL.

**Migration DDL (migration 017 — next after 016_rules_snapshot.sql):**
```sql
-- 017_unit_overrides.sql — Phase 46 (OVRD-01 to OVRD-04)
-- Wide-table override row per unit. NULL = "use imported value".
-- Separate from unit_strategy_notes (personal gameplay notes).
-- References units.id in hobbyforge.db — NOT rw_datasheets.id.
CREATE TABLE IF NOT EXISTS unit_overrides (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id           INTEGER NOT NULL UNIQUE REFERENCES units(id) ON DELETE CASCADE,
    points            INTEGER,
    move              INTEGER,
    toughness         INTEGER,
    save              INTEGER,
    wounds            INTEGER,
    leadership        INTEGER,
    objective_control INTEGER,
    keywords          TEXT,
    abilities         TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Key design notes:
- `ON DELETE CASCADE` — when a unit is deleted, its overrides row goes with it. Consistent with army_list_units which also cascades on unit delete.
- `UNIQUE` on `unit_id` allows `INSERT OR REPLACE` or the existing select-then-insert/update pattern.
- Integer stats mirror `unit_strategy_notes` column types (INTEGER, not TEXT). `save` stores the raw integer; UI appends "+" at display time — same convention as PlaybookTab today.
- `keywords` and `abilities` are TEXT (free-form), same as `unit_strategy_notes`.

### Pattern 2: Query Module (unitOverrides.ts)

```typescript
// Source: codebase — mirrors strategyNotes.ts select-then-upsert pattern
import { getDb } from "@/db/client";
import type { UnitOverride, UpsertUnitOverrideInput } from "@/types/unitOverride";

export async function getUnitOverride(unitId: number): Promise<UnitOverride | null> {
  const db = await getDb();
  const rows = await db.select<UnitOverride[]>(
    "SELECT * FROM unit_overrides WHERE unit_id = $1 LIMIT 1",
    [unitId],
  );
  return rows[0] ?? null;
}

export async function upsertUnitOverride(input: UpsertUnitOverrideInput): Promise<void> {
  const db = await getDb();
  const existing = await db.select<{ id: number }[]>(
    "SELECT id FROM unit_overrides WHERE unit_id = $1",
    [input.unit_id],
  );
  if (existing.length > 0) {
    await db.execute(
      `UPDATE unit_overrides SET
         points=$2, move=$3, toughness=$4, save=$5, wounds=$6,
         leadership=$7, objective_control=$8, keywords=$9, abilities=$10,
         updated_at=datetime('now')
       WHERE unit_id=$1`,
      [
        input.unit_id, input.points ?? null, input.move ?? null,
        input.toughness ?? null, input.save ?? null, input.wounds ?? null,
        input.leadership ?? null, input.objective_control ?? null,
        input.keywords ?? null, input.abilities ?? null,
      ],
    );
  } else {
    await db.execute(
      `INSERT INTO unit_overrides
         (unit_id, points, move, toughness, save, wounds, leadership, objective_control, keywords, abilities)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        input.unit_id, input.points ?? null, input.move ?? null,
        input.toughness ?? null, input.save ?? null, input.wounds ?? null,
        input.leadership ?? null, input.objective_control ?? null,
        input.keywords ?? null, input.abilities ?? null,
      ],
    );
  }
}

export async function deleteUnitOverride(unitId: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM unit_overrides WHERE unit_id = $1", [unitId]);
}
```

**Note on select-then-upsert vs INSERT OR REPLACE:** The codebase uses select-then-insert/update in `strategyNotes.ts` because `unit_strategy_notes` has no UNIQUE index. `unit_overrides` DOES have `UNIQUE(unit_id)`, so `INSERT OR REPLACE` is also valid. Either pattern works; the select-then-upsert pattern is more explicit and consistent with the rest of the codebase.

### Pattern 3: React Query Hook (useUnitOverride.ts)

```typescript
// Source: codebase — mirrors useStrategyNote.ts pattern exactly
export const UNIT_OVERRIDE_KEY = (unitId: number) => ["unit-override", unitId] as const;

export function useUnitOverride(unitId: number | undefined) {
  return useQuery({
    queryKey: unitId !== undefined ? UNIT_OVERRIDE_KEY(unitId) : (["unit-override"] as const),
    queryFn: () => unitId !== undefined ? getUnitOverride(unitId) : Promise.resolve(null),
    enabled: unitId !== undefined,
    staleTime: Infinity,  // Only changes via useUpsertUnitOverride in same component
  });
}

export function useUpsertUnitOverride() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpsertUnitOverrideInput>({
    mutationFn: upsertUnitOverride,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: UNIT_OVERRIDE_KEY(variables.unit_id) });
      // Also invalidate army list queries — unit_overrides.points affects effective_points
      qc.invalidateQueries({ queryKey: ["army-list"], exact: false });
    },
  });
}

export function useDeleteUnitOverride() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteUnitOverride,
    onSuccess: (_, unitId) => {
      qc.invalidateQueries({ queryKey: UNIT_OVERRIDE_KEY(unitId) });
      qc.invalidateQueries({ queryKey: ["army-list"], exact: false });
    },
  });
}
```

**Cache invalidation:** `useUpsertUnitOverride` and `useDeleteUnitOverride` MUST both invalidate `["army-list"]` (cache invalidation symmetry rule). The army list `getArmyListWithUnits` query uses `COALESCE(alu.points_override, u.points, 0)` today — it needs extending to `COALESCE(alu.points_override, unit_overrides.points, u.points, 0)` once unit_overrides is available. This requires a LEFT JOIN on unit_overrides.

### Pattern 4: Army List Query Extension

`getArmyListWithUnits` and `getArmyListReadiness` in `armyLists.ts` must be updated:

```sql
-- getArmyListWithUnits — add LEFT JOIN and extend COALESCE
SELECT
  alu.id, alu.list_id, alu.unit_id, alu.points_override, alu.notes, alu.created_at,
  u.name AS unit_name,
  u.points AS unit_points,
  u.faction_id,
  u.status_assembly,
  u.status_painting,
  u.painting_percentage,
  COALESCE(alu.points_override, uo.points, u.points, 0) AS effective_points
FROM army_list_units alu
JOIN units u ON u.id = alu.unit_id
LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
WHERE alu.list_id = $1
ORDER BY alu.created_at ASC
```

Same LEFT JOIN + COALESCE extension applies to `getArmyListReadiness`.

### Pattern 5: Diff Computation (computeSyncDiff.ts)

**What:** Pure TypeScript function comparing pre-sync snapshot to current rules.db state.

**Input:**
- `snapshot`: `RulesSnapshotRow[]` from `getLatestSnapshot()` (called BEFORE sync in `useRulesSync.mutationFn`)
- `currentDatasheets`: `{ id: string; name: string }[]` from rules.db AFTER sync

**Key insight about snapshot_data:** `capturePreSyncSnapshot()` stores `JSON.stringify([{id, name}, ...])` in `snapshot_data` for `rw_datasheets`. After sync, query `SELECT id, name FROM rw_datasheets` and compare the two sets.

```typescript
// Source: codebase pattern — pure function, no side effects
export interface SyncDiff {
  added: { id: string; name: string }[];
  removed: { id: string; name: string }[];
  renamed: { id: string; oldName: string; newName: string }[];
  total_changed: number;
}

export function computeSyncDiff(
  snapshotData: string | null,          // from rules_snapshot.snapshot_data for rw_datasheets
  currentDatasheets: { id: string; name: string }[],
): SyncDiff {
  if (!snapshotData) {
    return { added: [], removed: [], renamed: [], total_changed: 0 };
  }
  const before: { id: string; name: string }[] = JSON.parse(snapshotData);
  const beforeMap = new Map(before.map((d) => [d.id, d.name]));
  const afterMap = new Map(currentDatasheets.map((d) => [d.id, d.name]));

  const added = currentDatasheets.filter((d) => !beforeMap.has(d.id));
  const removed = before.filter((d) => !afterMap.has(d.id));
  const renamed = currentDatasheets.filter((d) => {
    const oldName = beforeMap.get(d.id);
    return oldName !== undefined && oldName !== d.name;
  }).map((d) => ({ id: d.id, oldName: beforeMap.get(d.id)!, newName: d.name }));

  return {
    added,
    removed,
    renamed,
    total_changed: added.length + removed.length + renamed.length,
  };
}
```

**Where to call it:** In `useRulesSync.mutationFn`, AFTER the `invoke("bulk_sync_rules")` call:
1. Get snapshot row for `rw_datasheets` from the pre-sync snapshot already captured.
2. Query `getRulesDb().select("SELECT id, name FROM rw_datasheets ORDER BY id")`.
3. Call `computeSyncDiff(snapshotRow.snapshot_data, currentDatasheets)`.
4. Return diff as part of mutation result alongside `rowCounts`.
5. Toast summary in `onSuccess` includes diff count.

**Storing diff for the diff collapsible:** The diff must be accessible after `handleSyncClick` completes. Options:
- Return it from `mutationFn` (extends `{ wahapediaVersion, rowCounts }` return type to include `diff: SyncDiff`).
- Store in component local state in PlaybookTab's `onSuccess` callback.

The second option (local state) is simpler — no hook API change needed.

### Pattern 6: PlaybookTab Override Markers

The stats display section (lines 624-658 in PlaybookTab.tsx) renders a row of 6 cells. Each cell currently shows a label + value. With overrides, each cell additionally shows a Pencil icon + Tooltip when `overrideRow[statKey] !== null`.

**Override state loading:** `useUnitOverride(unitId)` called alongside `useStrategyNote(unitId)`. Both return `null` when no row exists.

**Determining whether a stat is overridden:**
- Override = `overrideRow !== null && overrideRow[mappedKey] !== null`
- Imported (base) value = the stat from `unit_strategy_notes` OR the linked datasheet model

**Visual indicator per stat cell:**
```tsx
{/* Override badge — only when unit_overrides has a non-null value for this key */}
{isOverridden && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Pencil className="h-2.5 w-2.5 text-primary absolute top-1 right-1" aria-label="Manual override" />
      </TooltipTrigger>
      <TooltipContent side="top">
        Manual override — imported value: {formatStatValue(key, importedValue)}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

Cell container gets `border-primary` when overridden (already uses conditional border class at line 628-630).

### Anti-Patterns to Avoid

- **Storing overrides in rules.db:** rules.db is fully DELETEd on every sync. Any row there is lost. Overrides MUST be in hobbyforge.db.
- **FK to rw_datasheets.id from unit_overrides:** Cross-DB FKs are not supported in SQLite. `unit_overrides.unit_id` references `units.id` (hobbyforge.db), NOT `rw_datasheets.id`.
- **Computing diff in Rust:** The diff needs rules.db data (current state) and hobbyforge.db data (snapshot). Dual-DB access in Rust is more complex than dual-query merge in TypeScript. Use TypeScript.
- **Mutating `unit_strategy_notes` for overrides:** The CONTEXT.md decision is explicit: overrides go to `unit_overrides`, not `unit_strategy_notes`. Two separate concerns, two separate tables.
- **Invalidating only `unit-override` key on upsert:** Points override affects `effective_points` in army list queries — MUST also invalidate `["army-list"]` (cache invalidation symmetry rule from accumulated context).
- **Using SELECT COUNT(\*) for diff:** The snapshot stores `{id, name}` pairs for `rw_datasheets`, enabling name-change detection (OVRD-07). A count-only comparison would miss renames. Use the full snapshot_data JSON.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upsert logic | Custom "replace if exists" SQL | select-then-insert/update pattern from `strategyNotes.ts` | Established pattern; works without UNIQUE index requirement; consistent codebase |
| Tooltip wrapper | Custom hover state | shadcn/ui `Tooltip`/`TooltipContent`/`TooltipTrigger` | Already imported in PlaybookTab; zero extra bundle cost |
| Diff algorithm | Custom text diff | Simple Set-based add/remove/rename in TypeScript | The snapshot stores structured `{id, name}` pairs — no text diff needed, just Map lookups |
| Points precedence | Custom priority logic | SQL `COALESCE(alu.points_override, uo.points, u.points, 0)` | Already established pattern in `armyLists.ts`; extend, don't duplicate |
| Override row detection | Manual null checks per field | `overrideRow !== null && overrideRow[key] !== null` | Straightforward — no abstraction needed |

**Key insight:** The snapshot infrastructure from Phase 45 already provides exactly the data structure needed for OVRD-06 and OVRD-07. `capturePreSyncSnapshot()` stores `{ id, name }` pairs for `rw_datasheets` as JSON — the diff function just needs to compare that JSON against a post-sync `SELECT id, name FROM rw_datasheets`.

---

## Common Pitfalls

### Pitfall 1: Forgetting the army list COALESCE extension
**What goes wrong:** `unit_overrides.points` is saved but army list `effective_points` ignores it because `getArmyListWithUnits` still uses `COALESCE(alu.points_override, u.points, 0)`.
**Why it happens:** The query lives in `armyLists.ts`, separate from the unit_overrides work. Easy to miss.
**How to avoid:** Update BOTH `getArmyListWithUnits` AND `getArmyListReadiness` in the same task that ships the `unit_overrides` table. Add a LEFT JOIN on `unit_overrides`.
**Warning signs:** Army list shows `units.points` even after user set an override on the unit.

### Pitfall 2: Diff uses pre-sync snapshot but snapshot is captured BEFORE sync
**What goes wrong:** The diff shows wrong results if the snapshot is read AFTER the sync (rules.db already has new data).
**Why it happens:** `capturePreSyncSnapshot()` stores the state immediately before `invoke("bulk_sync_rules")`. The snapshot row exists in hobbyforge.db. Calling `getLatestSnapshot()` AFTER the sync returns the last pre-sync snapshot correctly — that's the design. But if implementer re-reads snapshot after sync thinking it will give "before" state, it's still correct because `cleanOldSnapshots(3)` only prunes old groups.
**How to avoid:** Read the snapshot BEFORE the `invoke()` call (or after — both work correctly because the snapshot is in hobbyforge.db, not rules.db). Read current post-sync state from rules.db AFTER invoke.
**Warning signs:** Diff always shows 0 changes even after a sync that fetched new data.

### Pitfall 3: Override markers appear for `unit_strategy_notes` values, not true overrides
**What goes wrong:** PlaybookTab currently stores user-entered stats in `unit_strategy_notes`. With phase 46, "override" means the value in `unit_overrides` (a correction to imported data), not just any manually entered stat. The Pencil icon should ONLY appear when `unit_overrides` has a non-null value for that field.
**Why it happens:** Both tables store the same stat fields. Easy to conflate "user entered something in strategy notes" with "user has an active override".
**How to avoid:** Check `overrideRow !== null && overrideRow[mappedKey] !== null` specifically for `unit_overrides`. Do not use `strategyNoteRow[key] !== null` as the override signal.
**Warning signs:** Every stat cell with any value shows the override Pencil icon.

### Pitfall 4: `ON DELETE CASCADE` on unit_overrides vs. unit_strategy_notes
**What goes wrong:** `unit_strategy_notes` has no `ON DELETE CASCADE` (existing schema). `unit_overrides` must have `ON DELETE CASCADE` (CONTEXT.md pattern decision) so deleting a unit cleans up its overrides row.
**Why it happens:** Copy-pasting from strategyNotes.ts SQL which lacks the cascade.
**How to avoid:** Include `REFERENCES units(id) ON DELETE CASCADE` in the migration DDL explicitly. Do not omit it as "matching" the strategy notes pattern — this is a deliberate difference.
**Warning signs:** `PRAGMA foreign_keys = ON` enforcement (enabled in `client.ts`) may block unit deletion if orphaned override rows exist.

### Pitfall 5: Missing cache invalidation for ["army-list"] on override mutations
**What goes wrong:** User sets a points override. Army list page still shows old effective_points until page refresh.
**Why it happens:** Developer invalidates `UNIT_OVERRIDE_KEY(unitId)` but forgets `["army-list"]`.
**How to avoid:** Apply cache invalidation symmetry rule: if useUpsertUnitOverride invalidates a key, useDeleteUnitOverride must too, AND both must invalidate `["army-list"]` because effective_points computation changes.
**Warning signs:** Army list correct after full page reload but stale after override entry without reload.

### Pitfall 6: Stats stored as INTEGER in unit_overrides but rw_datasheet_models stores TEXT
**What goes wrong:** Imported stats in `rw_datasheet_models` store M, Sv, Ld as TEXT (e.g. `"6\""`, `"3+"`, `"6+"`). `unit_overrides` stores INTEGER (same convention as `unit_strategy_notes`). When showing "imported value: X" in the Tooltip, the imported value comes from the linked datasheet model's TEXT field, which must be coerced via `coerceStatToNumber()` (already defined in PlaybookTab, line 319).
**How to avoid:** Use `formatStatValue(key, importedValue)` (already defined in PlaybookTab, line 81) for display. Use `coerceStatToNumber()` (line 319) when deriving the numeric imported value from the TEXT datasheet field.
**Warning signs:** Tooltip shows "imported value: null" even when datasheet has a valid value.

---

## Code Examples

Verified patterns from the existing codebase:

### COALESCE points precedence (army list query extension)
```sql
-- Source: src/db/queries/armyLists.ts — existing pattern, extended for unit_overrides
COALESCE(alu.points_override, uo.points, u.points, 0) AS effective_points
-- Requires: LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
```

### Override marker in stat cell
```tsx
// Source: PlaybookTab.tsx pattern — relative-positioned cell container
<div
  key={key}
  className={`flex-1 flex flex-col items-center justify-center min-h-[44px] border ${
    isOverridden ? "border-primary bg-primary/5" : statsEditMode ? "border-primary" : "border-border"
  } rounded-sm bg-card gap-1 px-1 py-2 relative`}
>
  <span className="text-[10px] font-semibold text-muted-foreground uppercase">{key}</span>
  {isOverridden && (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Pencil className="h-2.5 w-2.5 text-primary absolute top-1 right-1 cursor-help" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="top">
          Manual override — imported value: {formatStatValue(key, importedStatValue(key))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )}
  {/* value display or input */}
</div>
```

### Snapshot diff retrieval pattern
```typescript
// Source: src/db/queries/rulesSnapshot.ts — getLatestSnapshot already implemented
// Call BEFORE sync in useRulesSync.mutationFn to capture pre-sync state:
const snapshot = await getLatestSnapshot();
const datasheetSnapshotRow = snapshot.find((r) => r.table_name === "rw_datasheets");

// After invoke("bulk_sync_rules"), query current state:
const rulesDb = await getRulesDb();
const currentDatasheets = await rulesDb.select<{ id: string; name: string }[]>(
  "SELECT id, name FROM rw_datasheets ORDER BY id",
  [],
);

const diff = computeSyncDiff(datasheetSnapshotRow?.snapshot_data ?? null, currentDatasheets);
```

### Diff collapsible in PlaybookTab (placement)
```tsx
{/* After existing "Sync errors" Collapsible, within the syncMeta && syncMeta.last_sync_at block */}
{lastSyncDiff && lastSyncDiff.total_changed > 0 && (
  <Collapsible>
    <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
      <ChevronDown className="h-3 w-3" />
      <span>Changes since last sync ({lastSyncDiff.total_changed})</span>
    </CollapsibleTrigger>
    <CollapsibleContent className="pt-1.5 pl-4">
      {/* added/removed/renamed datasheet lists */}
    </CollapsibleContent>
  </Collapsible>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Architecture Audit proposed EAV for unit_overrides | Wide table with nullable columns decided in CONTEXT.md | Phase 46 planning | Simpler COALESCE, matches existing patterns |
| bulk_sync_rules returned () | Returns SyncResult with per-table counts | Phase 44 | Accurate row counts for UI display |
| No pre-sync snapshot | rules_snapshot table + capturePreSyncSnapshot() | Phase 45 | Enables Phase 46 diff view |

**Deprecated/outdated:**
- Architecture Audit Section 4 EAV proposal for unit_overrides: superseded by the wide-table decision in CONTEXT.md.

---

## Open Questions

1. **Should `unit_overrides.save` allow TEXT for saves with special notation (e.g., invulnerable saves)?**
   - What we know: `unit_strategy_notes.save` is INTEGER (strips "+" at display time per migration 004 comment). `rw_datasheet_models.Sv` is TEXT. Current PlaybookTab already uses INTEGER for save throughout.
   - What's unclear: Whether users would want to record invulnerable saves (e.g., "4++" = 4 integer). These are distinct from the base save.
   - Recommendation: Use INTEGER for `unit_overrides.save`, consistent with `unit_strategy_notes`. Invulnerable saves are not in scope for OVRD-01 to OVRD-04.

2. **Where to store `lastSyncDiff` state in PlaybookTab?**
   - What we know: The diff is computed in `mutationFn` (or `onSuccess`) of `useRulesSync`. PlaybookTab's `handleSyncClick` receives `data` in the `onSuccess` callback.
   - What's unclear: Whether diff state should be React state in PlaybookTab or returned from the hook.
   - Recommendation: `const [lastSyncDiff, setLastSyncDiff] = useState<SyncDiff | null>(null)` in PlaybookTab; set in `handleSyncClick`'s `onSuccess`. This is simpler than extending the hook return type.

3. **Should the diff persist across PlaybookTab unmounts?**
   - What we know: PlaybookTab is mounted per unit. Navigating away clears local state.
   - What's unclear: Whether users expect to see the diff after navigating between units.
   - Recommendation: Ephemeral local state is fine — if user navigates away, the diff is lost. The sync data itself is persistent in rules.db. Users can see that data changed by looking at the datasheets. The diff view is a convenience "what just changed" display, not a permanent audit log.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | none — see vite.config.ts |
| Quick run command | `pnpm test -- tests/collection/unitOverrideQueries.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OVRD-01 | upsertUnitOverride saves points column | unit | `pnpm test -- tests/collection/unitOverrideQueries.test.ts` | Wave 0 |
| OVRD-02 | upsertUnitOverride saves stat columns (M/T/Sv/W/Ld/OC) | unit | `pnpm test -- tests/collection/unitOverrideQueries.test.ts` | Wave 0 |
| OVRD-03 | upsertUnitOverride saves keywords column | unit | `pnpm test -- tests/collection/unitOverrideQueries.test.ts` | Wave 0 |
| OVRD-04 | upsertUnitOverride saves abilities column | unit | `pnpm test -- tests/collection/unitOverrideQueries.test.ts` | Wave 0 |
| OVRD-05 | Override markers visible in stats cells | manual-only | N/A — visual indicator | N/A |
| OVRD-06 | computeSyncDiff returns correct added/removed/renamed | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | Wave 0 |
| OVRD-07 | computeSyncDiff identifies removed datasheets | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | Wave 0 |
| OVRD-07 | computeSyncDiff identifies renamed datasheets | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/collection/unitOverrideQueries.test.ts tests/datasheet/computeSyncDiff.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/collection/unitOverrideQueries.test.ts` — covers OVRD-01 to OVRD-04 (getUnitOverride, upsertUnitOverride, deleteUnitOverride)
- [ ] `tests/datasheet/computeSyncDiff.test.ts` — covers OVRD-06 and OVRD-07 (added, removed, renamed datasheets; null snapshotData edge case)

---

## Sources

### Primary (HIGH confidence)
- `src/features/units/PlaybookTab.tsx` — direct code inspection; stats block, edit mode, sync collapsibles, imported components
- `src/db/queries/strategyNotes.ts` — select-then-upsert pattern that unit_overrides will replicate
- `src/db/queries/armyLists.ts` — `COALESCE(alu.points_override, u.points, 0)` pattern to extend
- `src/db/queries/rulesSnapshot.ts` — `capturePreSyncSnapshot`, `getLatestSnapshot` APIs; snapshot_data JSON structure for rw_datasheets
- `src-tauri/migrations/016_rules_snapshot.sql` — confirmed `rules_snapshot` table DDL (hobbyforge.db)
- `src-tauri/migrations/004_unit_playbook_stats.sql` — stat column types (INTEGER) and convention for `save` field
- `.planning/phases/42-architecture-audit/ARCHITECTURE-AUDIT.md` — Section 4 migration proposal; cross-DB constraint documentation
- `.planning/phases/46-manual-overrides-version-comparison/46-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- `src/hooks/useStrategyNote.ts` — `staleTime: Infinity` + `STRATEGY_NOTE_KEY` pattern; verified as reference
- `src/hooks/useRulesSync.ts` — `onSuccess` invalidation list; `handleSyncClick` onSuccess callback structure

### Tertiary (LOW confidence)
- None — all findings are from direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all libraries already in use
- Architecture: HIGH — patterns directly sourced from existing code
- Pitfalls: HIGH — derived from specific codebase constraints (cross-DB FK limit, INTEGER stat convention, cache invalidation rules) all verified in code

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (stable local-first codebase; 30-day window applies)
