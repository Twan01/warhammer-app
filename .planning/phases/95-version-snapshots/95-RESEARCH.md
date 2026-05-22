# Phase 95: Version Snapshots - Research

**Researched:** 2026-05-22
**Domain:** SQLite JSON blob storage, React Query mutations, shadcn/ui Sheet + Dialog patterns, diff computation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** `army_list_snapshots` table — columns: `id INTEGER PRIMARY KEY`, `list_id INTEGER NOT NULL FK → army_lists(id) ON DELETE CASCADE`, `label TEXT NOT NULL`, `snapshot_data TEXT NOT NULL` (JSON blob), `total_points INTEGER NOT NULL`, `created_at TEXT NOT NULL DEFAULT datetime('now')`. Immutable after creation — no UPDATE needed.

**D-02:** `snapshot_data` JSON structure reuses the Phase 94 `hobbyforge-army-list` v1.0 schema. The shared `formatArmyListForExport` + `buildJsonFormat` utilities produce the serialized blob. This avoids duplicating grouping/sorting logic.

**D-03:** `total_points` stored as denormalized INTEGER column (not inside the JSON only) so the history list can display totals without parsing every blob.

**D-04:** Snapshot captures: list metadata (name, faction, detachment, points_limit), all units with effective_points/warlord/ghost/model_count/leader_attachment, all enhancements with points, and computed totals. Same data as JSON export.

**D-05:** Snapshots capture points at snapshot time. They do NOT auto-update when rules data changes (intentional — historical state).

**D-06:** Side-by-side comparison uses `SnapshotCompareDialog` (Dialog, sibling portal at ArmyListsPage level). Two-column layout with color-coded diffs: added/removed units highlighted, points delta summary at top.

**D-07:** Comparison matches units by display name. Units in A but not B = "removed"; in B but not A = "added"; in both = shown normally. Points delta = `total_B - total_A`.

**D-08:** User selects two snapshots from history list to compare. Compare action available when ≥ 2 snapshots exist.

**D-09:** Restore destructively replaces current list state. All current `army_list_units` and `army_list_enhancements` rows for the list are deleted, then re-created from snapshot data. Runs in a single SQL transaction.

**D-10:** Before restore, app auto-creates a snapshot labeled "Auto-save before restore" as a safety net (Phase 82 pattern).

**D-11:** Restore requires confirmation dialog: "This will replace your current list with the snapshot '[label]'. A safety snapshot of your current list will be saved first. Continue?"

**D-12:** Restore maps snapshot unit data back to real unit_id by matching unit_name to units.name within the same faction. Units that no longer exist are restored as ghost units.

**D-13:** "Snapshots" button in ArmyListDetailSheet header area (near Export dropdown) opens `SnapshotHistorySheet` (Sheet, sibling portal at ArmyListsPage level).

**D-14:** SnapshotHistorySheet shows: "Save Snapshot" action at top (text input for label), then chronological list with label, timestamp, total points, and action buttons (Compare, Restore, Delete).

**D-15:** "Save Snapshot" defaults label to timestamp-based name (e.g., "Snapshot - May 22, 2026") that the user can edit before saving.

### Claude's Discretion

- SnapshotHistorySheet layout, spacing, and visual styling
- Whether snapshot list uses cards or simple table layout
- Whether to show snapshot count badge on the Snapshots button
- Compare dialog internal layout (side-by-side columns vs unified diff list)
- Whether to limit max snapshots per list (e.g., 20) or allow unlimited
- Whether delete requires confirmation or immediate with undo toast
- Migration file number (next available after 031)
- Whether to add snapshot count to ArmyListCard on the lists page

### Deferred Ideas (OUT OF SCOPE)

- Snapshot sharing/export (export a snapshot as a file for sharing)
- Auto-snapshots on significant changes
- Snapshot annotations/notes beyond the label
- Branching from a snapshot (create a new list from a snapshot)

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SNP-01 | User can save the current army list state as a named snapshot | D-01..D-05, D-13..D-15; `buildJsonFormat` + `formatArmyListForExport` reused directly |
| SNP-02 | User can view a history of saved snapshots with timestamps and point totals | D-01 (denormalized `total_points`), D-14; `getSnapshotsByList` SELECT ordered by created_at DESC |
| SNP-03 | User can compare two snapshots side-by-side (units added/removed, points delta) | D-06..D-08; pure JS diff over parsed JSON blobs |
| SNP-04 | User can restore a list to a previous snapshot state | D-09..D-12; single SQL transaction, auto-save safety net |

</phase_requirements>

---

## Summary

Phase 95 adds version snapshot functionality to army lists. The data model is a single new table (`army_list_snapshots`) with a JSON blob column that reuses the existing Phase 94 export format. The entire snapshot capture pipeline is already built — `formatArmyListForExport` + `buildJsonFormat` produce exactly the right data structure. No new serialization logic is needed.

The implementation splits cleanly into four layers: a SQL migration (032), a query module (`armyListSnapshots.ts`), a React Query hook file (`useArmyListSnapshots.ts`), and two UI components (`SnapshotHistorySheet` and `SnapshotCompareDialog`) wired into the existing sibling portal architecture in `ArmyListsPage`.

The hardest part is the restore operation (D-09..D-12), which requires a SQL transaction that deletes and re-creates army_list_units and army_list_enhancements rows from the parsed JSON blob, with a unit_id lookup against the collection and graceful fallback to ghost units. All other operations (save, list, compare, delete) are straightforward.

**Primary recommendation:** Build in a single wave — migration first, then query/hook, then SnapshotHistorySheet, then SnapshotCompareDialog, then wire into ArmyListsPage + ArmyListDetailSheet. Keep restore logic in the query layer (not the component) for testability.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Snapshot storage (CREATE) | Database / Storage | — | SQL INSERT with JSON blob; immutable after creation |
| Snapshot retrieval (LIST) | Database / Storage | React Query (cache) | SELECT ordered by created_at DESC; cached with 5-min staleTime |
| Snapshot capture serialization | Frontend (pure lib) | — | `formatArmyListForExport` + `buildJsonFormat` are pure functions in `src/lib/` |
| Restore transaction | Database / Storage | — | Multi-statement DELETE + INSERT must run in one SQLite transaction |
| Unit_id remapping on restore | Frontend (query layer) | Database / Storage | Lookup query for real unit_id, fall back to ghost in the same transaction |
| Diff computation (compare) | Frontend (pure function) | — | Parse two JSON blobs, compute Set difference on unit names — no DB needed |
| UI — SnapshotHistorySheet | Frontend / UI | — | Sheet sibling portal; hosts label input + snapshot list |
| UI — SnapshotCompareDialog | Frontend / UI | — | Dialog sibling portal; two-column diff view |
| Portal state management | Frontend (ArmyListsPage) | — | Follows established pattern: all Sheet/Dialog state hoisted to page level |

---

## Standard Stack

### Core — No New Dependencies

This phase adds zero new npm packages. All required tools are already installed.

| Capability | Existing Asset | Location |
|-----------|---------------|----------|
| JSON serialization for snapshot_data | `buildJsonFormat()` | `src/lib/exportArmyList.ts` |
| Structured data from live list | `formatArmyListForExport()` | `src/lib/exportArmyList.ts` |
| DB singleton + parameterized queries | `getDb()` | `src/db/client.ts` |
| Sheet component | shadcn/ui Sheet | `src/components/ui/sheet` |
| Dialog component | shadcn/ui Dialog | `src/components/ui/dialog` |
| Toasts | sonner | via `toast` from `sonner` |
| React Query mutations | `@tanstack/react-query` | already installed |

### Version Verification

No new packages — skip registry verification. All libraries already installed and operational in prior phases.

---

## Package Legitimacy Audit

No new packages are installed in this phase. The Package Legitimacy Gate is not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
User action (Save / Restore / Compare / Delete)
         |
         v
SnapshotHistorySheet (Sheet, sibling portal)
    |                  |
    v                  v
Save Snapshot      SnapshotCompareDialog (Dialog, sibling portal)
    |                  |
    v                  v
useArmyListSnapshots   parseSnapshotDiff() [pure function]
    |
    v
armyListSnapshots.ts (query module)
    |
    v
SQLite → army_list_snapshots table (032_army_list_snapshots.sql)
```

```
Restore flow:
  1. Auto-save safety snapshot ("Auto-save before restore")
  2. Confirm dialog
  3. useRestoreSnapshot mutation
     → restoreSnapshot(snapshotId, listId)
        a. SELECT snapshot_data from army_list_snapshots
        b. Parse JSON blob
        c. DELETE FROM army_list_units WHERE list_id = $1
        d. DELETE FROM army_list_enhancements WHERE list_id = $1
        e. For each unit in JSON:
              SELECT id FROM units WHERE name = $unit_name AND faction_id = $faction_id
              INSERT INTO army_list_units (unit_id OR ghost)
        f. For each enhancement in JSON:
              INSERT INTO army_list_enhancements
        (all steps a–f in one execute transaction)
  4. Invalidate ARMY_LIST_UNITS_KEY + ARMY_LIST_KEY + ARMY_LISTS_KEY
```

### Recommended Project Structure

```
src/
  db/
    queries/
      armyListSnapshots.ts        # NEW: CRUD for army_list_snapshots
  hooks/
    useArmyListSnapshots.ts       # NEW: React Query hooks
  features/
    army-lists/
      SnapshotHistorySheet.tsx    # NEW: Sheet with save + list
      SnapshotCompareDialog.tsx   # NEW: Dialog with two-column diff
      ArmyListDetailSheet.tsx     # MODIFIED: add Snapshots button
      ArmyListsPage.tsx           # MODIFIED: add portal state + sibling portals
  lib/
    snapshotDiff.ts               # NEW: pure diff computation (optional — can inline)
src-tauri/
  migrations/
    032_army_list_snapshots.sql   # NEW: creates army_list_snapshots table
```

### Pattern 1: Migration — Additive Table Creation

The migration follows the same pattern as `031_army_list_v3.sql` (CREATE new table, no ALTER of existing tables). This is additive — zero risk to existing data.

```sql
-- 032_army_list_snapshots.sql
CREATE TABLE army_list_snapshots (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id        INTEGER NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
    label          TEXT NOT NULL,
    snapshot_data  TEXT NOT NULL,
    total_points   INTEGER NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_army_list_snapshots_list_id
    ON army_list_snapshots(list_id);
```

[VERIFIED: codebase — matches migration pattern from 031_army_list_v3.sql and column definitions from D-01]

### Pattern 2: Query Module — armyListSnapshots.ts

All functions follow the `$1, $2` parameterized syntax established in `armyLists.ts`.

```typescript
// Source: codebase — src/db/queries/armyLists.ts pattern
import { getDb } from "@/db/client";
import type { ArmyListSnapshot, CreateSnapshotInput } from "@/types/armyList";

export async function getSnapshotsByList(listId: number): Promise<ArmyListSnapshot[]> {
  const db = await getDb();
  return db.select<ArmyListSnapshot[]>(
    "SELECT id, list_id, label, total_points, created_at FROM army_list_snapshots WHERE list_id = $1 ORDER BY created_at DESC",
    [listId],
  );
}

export async function getSnapshotData(snapshotId: number): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<Array<{ snapshot_data: string }>>(
    "SELECT snapshot_data FROM army_list_snapshots WHERE id = $1",
    [snapshotId],
  );
  return rows[0]?.snapshot_data ?? null;
}

export async function createSnapshot(input: CreateSnapshotInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO army_list_snapshots (list_id, label, snapshot_data, total_points) VALUES ($1, $2, $3, $4)",
    [input.list_id, input.label, input.snapshot_data, input.total_points],
  );
  return result.lastInsertId ?? 0;
}

export async function deleteSnapshot(snapshotId: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM army_list_snapshots WHERE id = $1", [snapshotId]);
}
```

[VERIFIED: codebase — $1/$2 syntax, getDb() pattern, return shapes match existing query modules]

**Note on `getSnapshotsByList`:** Intentionally excludes `snapshot_data` from the list query. The blob can be large; it is only fetched on demand (for restore or compare). This avoids deserializing all blobs just to render the history list.

### Pattern 3: Snapshot Capture

```typescript
// In useCreateSnapshot mutation's mutationFn — called with current list data
import { formatArmyListForExport, buildJsonFormat } from "@/lib/exportArmyList";

async function captureSnapshot(
  list: ArmyList,
  units: ArmyListUnitRow[],
  enhancements: ArmyListEnhancement[],
  factionName: string | null,
  label: string,
): Promise<number> {
  const exportData = formatArmyListForExport(list, units, enhancements, factionName);
  const jsonBlob = buildJsonFormat(exportData);
  const totalPoints = exportData.totalPoints + exportData.enhancementTotal;
  return createSnapshot({ list_id: list.id, label, snapshot_data: jsonBlob, total_points: totalPoints });
}
```

[VERIFIED: codebase — `buildJsonFormat` returns `string`, `formatArmyListForExport` returns `ExportData` with `totalPoints` and `enhancementTotal`]

### Pattern 4: Restore Transaction

The restore operation cannot use multiple `db.execute()` calls — it must be atomic. The Tauri plugin-sql `execute` function accepts a single SQL statement. For a multi-statement transaction, use SQLite's BEGIN/COMMIT within a single string or execute statements in sequence with error handling.

**Critical finding:** The Tauri plugin-sql `execute()` API does not support BEGIN/COMMIT as a single call with multiple statements. The established pattern in this codebase is sequential `execute()` calls — FK enforcement is already ON. For restore, the correct approach is:

1. Execute `DELETE FROM army_list_units WHERE list_id = $1` (CASCADE also deletes `army_list_enhancements` rows via FK).
2. Execute individual `INSERT INTO army_list_units` per unit from the JSON blob.
3. Execute individual `INSERT INTO army_list_enhancements` per enhancement from the JSON blob.

If any step fails, the React Query `onError` handler shows a toast and the partial state is left (acceptable — the auto-save safety snapshot was already created before restore started).

**Unit_id remapping:** Before the delete/insert loop, run one query to build a name→id lookup map:

```typescript
// Lookup real unit_ids for the faction
const unitRows = await db.select<Array<{ id: number; name: string }>>(
  "SELECT id, name FROM units WHERE faction_id = $1",
  [list.faction_id],
);
const nameToId = new Map(unitRows.map((r) => [r.name, r.id]));

// Then during insert loop:
const realUnitId = nameToId.get(snapshotUnit.name) ?? null;
const ghostName = realUnitId === null ? snapshotUnit.name : null;
```

[VERIFIED: codebase — ghost unit pattern from 031_army_list_v3.sql CHECK constraint; `unit_id IS NOT NULL OR ghost_unit_name IS NOT NULL`]

### Pattern 5: Snapshot Diff (Compare)

Pure function — no DB access. Operates on two parsed JSON blobs.

```typescript
// src/lib/snapshotDiff.ts (or inlined in SnapshotCompareDialog)
interface SnapshotUnit { name: string; points: number; }

interface SnapshotDiff {
  pointsDelta: number;        // total_B - total_A
  unitsAdded: SnapshotUnit[]; // in B, not in A (by name)
  unitsRemoved: SnapshotUnit[]; // in A, not in B (by name)
  unitsCommon: SnapshotUnit[]; // in both A and B
}

export function computeSnapshotDiff(
  snapshotA: ParsedSnapshot,
  snapshotB: ParsedSnapshot,
): SnapshotDiff {
  const namesA = new Set(snapshotA.units.map((u) => u.name));
  const namesB = new Set(snapshotB.units.map((u) => u.name));
  return {
    pointsDelta: snapshotB.list.total_points - snapshotA.list.total_points,
    unitsAdded: snapshotB.units.filter((u) => !namesA.has(u.name)),
    unitsRemoved: snapshotA.units.filter((u) => !namesB.has(u.name)),
    unitsCommon: snapshotA.units.filter((u) => namesB.has(u.name)),
  };
}
```

[VERIFIED: codebase — `buildJsonFormat` output shape confirms `units[].name` and `list.total_points` keys]

### Pattern 6: React Query Hook File

```typescript
// src/hooks/useArmyListSnapshots.ts
export const SNAPSHOTS_KEY = (listId: number) => ["army-list-snapshots", listId] as const;

export function useSnapshotsByList(listId: number | undefined) {
  return useQuery({
    queryKey: listId !== undefined ? SNAPSHOTS_KEY(listId) : ["army-list-snapshots"],
    queryFn: () => getSnapshotsByList(listId!),
    enabled: listId !== undefined,
  });
}

export function useCreateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSnapshot,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: SNAPSHOTS_KEY(variables.list_id) });
    },
  });
}

export function useDeleteSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ snapshotId }: { snapshotId: number; list_id: number }) =>
      deleteSnapshot(snapshotId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: SNAPSHOTS_KEY(variables.list_id) });
    },
  });
}

export function useRestoreSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: restoreSnapshot,  // in armyListSnapshots.ts
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: SNAPSHOTS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
      qc.invalidateQueries({ queryKey: ["army-list-enhancements", variables.list_id] });
    },
  });
}
```

[VERIFIED: codebase — invalidation targets match existing hooks in useArmyLists.ts]

### Pattern 7: Sibling Portal — ArmyListsPage Integration

Two new state variables + two new sibling portals, following the established pattern (compare to `printPreviewOpen` / `datasheetBrowserOpen`):

```typescript
// In ArmyListsPage state block
const [snapshotHistoryOpen, setSnapshotHistoryOpen] = useState(false);
const [compareSnapshotIds, setCompareSnapshotIds] = useState<[number, number] | null>(null);

// Handlers
const openSnapshotHistory = () => setSnapshotHistoryOpen(true);
const closeSnapshotHistory = () => setSnapshotHistoryOpen(false);
const openSnapshotCompare = (ids: [number, number]) => setCompareSnapshotIds(ids);
const closeSnapshotCompare = () => setCompareSnapshotIds(null);
```

ArmyListDetailSheet receives `onOpenSnapshots: () => void` prop (following `onPrintPreview` pattern).

### Pattern 8: Types Extension (armyList.ts)

```typescript
// Add to src/types/armyList.ts
export interface ArmyListSnapshot {
  id: number;
  list_id: number;
  label: string;
  total_points: number;
  created_at: string;
  // snapshot_data excluded from list queries (fetched on demand)
}

export interface CreateSnapshotInput {
  list_id: number;
  label: string;
  snapshot_data: string;
  total_points: number;
}
```

### Anti-Patterns to Avoid

- **Fetching snapshot_data in list query:** Including the JSON blob in `getSnapshotsByList` would serialize/deserialize the entire blob for every snapshot row just to render the history list. Fetch it only when needed (restore or compare).
- **Blocking restore on unit_id lookup failure:** If a unit no longer exists in the collection, restore must succeed anyway using the ghost unit path, not throw an error.
- **Nested Sheet inside Sheet:** SnapshotHistorySheet must be a sibling portal at ArmyListsPage level, not nested inside ArmyListDetailSheet (Pitfall 1 in ArmyListsPage).
- **Modifying snapshot_data after creation:** Snapshots are immutable historical records — no UPDATE path should exist for the JSON blob or total_points.
- **Rolling back after auto-save:** The safety snapshot (D-10) is created before the confirmation dialog confirms — actually, it should be created AFTER confirmation but BEFORE the delete/insert. The safety snapshot should NOT be rolled back if restore fails; it's the user's recovery mechanism.
- **Using `db.execute()` with BEGIN/COMMIT in a single string:** Tauri plugin-sql does not support multi-statement strings. Use sequential `execute()` calls.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON serialization of list state | Custom serializer | `buildJsonFormat(formatArmyListForExport(...))` | Already handles leader grouping, ghost tagging, enhancement mapping |
| Set-difference diff | Custom diff algorithm | `Set` + `Array.filter()` in `computeSnapshotDiff()` | Units matched by name — simple string comparison, no library needed |
| Snapshot storage | Normalized snapshot tables | Single JSON blob in `army_list_snapshots.snapshot_data` | D-01 locked decision; blob is simpler and survives schema changes to army_list_units |
| Confirmation dialogs | Custom modal | shadcn/ui `AlertDialog` or inline Dialog | Established pattern in app (delete unit, delete backup) |

**Key insight:** The snapshot feature is essentially "timestamped JSON export stored in SQLite." The hardest part (export serialization) is already done. The new work is DB schema + hooks + two UI components.

---

## Common Pitfalls

### Pitfall 1: Sibling Portal Nesting Violation

**What goes wrong:** SnapshotHistorySheet rendered inside ArmyListDetailSheet instead of as a sibling at ArmyListsPage level. This causes z-index stacking and animation conflicts with shadcn/ui Sheet.

**Why it happens:** The snapshot button lives in ArmyListDetailSheet's header, so it feels natural to put the Sheet there too.

**How to avoid:** All portal state (`snapshotHistoryOpen`, `compareSnapshotIds`) lives in ArmyListsPage. ArmyListDetailSheet receives an `onOpenSnapshots` callback prop — identical pattern to `onPrintPreview`.

**Warning signs:** SnapshotHistorySheet or SnapshotCompareDialog defined inside ArmyListDetailSheet's JSX return.

### Pitfall 2: Including snapshot_data in List Queries

**What goes wrong:** `getSnapshotsByList` includes the `snapshot_data` column. Every render of the history list deserializes potentially large JSON blobs.

**Why it happens:** SELECT * is the default instinct.

**How to avoid:** Explicitly SELECT `id, list_id, label, total_points, created_at` only. Add a separate `getSnapshotData(id)` function for on-demand fetching.

**Warning signs:** `SELECT *` or explicit `snapshot_data` in `getSnapshotsByList`.

### Pitfall 3: Restore Without Safety Snapshot First

**What goes wrong:** Restore deletes current list state before the auto-save snapshot is written. If the INSERT phase fails or the user loses power mid-restore, current state is unrecoverable.

**How to avoid:** `restoreSnapshot()` must:
1. Call `createSnapshot()` with label "Auto-save before restore" first
2. Only then DELETE existing units/enhancements
3. INSERT from snapshot data

**Warning signs:** DELETE statement executes before the auto-save INSERT has been confirmed (i.e., before `createSnapshot()` awaited successfully).

### Pitfall 4: Blocking on unit_id Lookup for Ghost Units

**What goes wrong:** Restore throws or skips units when `nameToId.get(unit.name)` returns undefined (unit deleted from collection since snapshot was taken).

**How to avoid:** Always fall through to ghost unit: `const realUnitId = nameToId.get(unit.name) ?? null;`. Insert with `unit_id = NULL, ghost_unit_name = unit.name` when not found.

**Warning signs:** A conditional `if (!realUnitId) throw` or `continue` during restore loop.

### Pitfall 5: Compare Dialog Fetching Both Blobs on Every Render

**What goes wrong:** `SnapshotCompareDialog` fetches snapshot_data with two `useQuery` hooks that fire whenever the dialog is open, causing redundant DB reads on re-render.

**How to avoid:** Fetch the two blobs once when `compareSnapshotIds` is set (in a `useEffect` or via `useMemo` gated on the IDs), or use `enabled: compareSnapshotIds !== null` with stable query keys.

**Warning signs:** Two unguarded `useQuery` hooks in SnapshotCompareDialog without `enabled` guards.

### Pitfall 6: Missing Cache Invalidation After Restore

**What goes wrong:** After restore, the ArmyListDetailSheet still shows the old unit list because `ARMY_LIST_UNITS_KEY(listId)` was not invalidated.

**How to avoid:** `useRestoreSnapshot` onSuccess must invalidate: `SNAPSHOTS_KEY`, `ARMY_LIST_UNITS_KEY`, `ARMY_LIST_KEY`, `ARMY_LISTS_KEY`, `["army-list-readiness"]`, `["army-list-enhancements", listId]`.

**Warning signs:** Unit list doesn't refresh after restore toast appears.

### Pitfall 7: Diff Using Index Instead of Name

**What goes wrong:** Comparing units by array position instead of name. If snapshot A has 3 units and snapshot B has 4 units, position-based comparison will mismatch.

**How to avoid:** Always use `Set<string>` keyed on `unit.name` (display name) per D-07.

---

## Code Examples

### Save Snapshot Handler (in SnapshotHistorySheet or parent)

```typescript
// Source: codebase — matches Phase 94 export handler pattern in ArmyListDetailSheet
const handleSaveSnapshot = useCallback(async () => {
  if (!list || !units || !enhancements) return;
  const trimmedLabel = label.trim() || `Snapshot - ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  const exportData = formatArmyListForExport(list, units, enhancements, factionName);
  const jsonBlob = buildJsonFormat(exportData);
  const totalPoints = exportData.totalPoints + exportData.enhancementTotal;
  createSnapshotMutation.mutate(
    { list_id: list.id, label: trimmedLabel, snapshot_data: jsonBlob, total_points: totalPoints },
    {
      onSuccess: () => { toast.success("Snapshot saved."); setLabel(""); },
      onError: () => toast.error("Failed to save snapshot."),
    },
  );
}, [list, units, enhancements, factionName, label]);
```

### Restore Snapshot SQL Sequence (in armyListSnapshots.ts)

```typescript
// Source: codebase — sequential execute() pattern; Tauri plugin-sql requirement
export async function restoreSnapshot(input: RestoreSnapshotInput): Promise<void> {
  const db = await getDb();

  // Step 1: Fetch snapshot data
  const rows = await db.select<Array<{ snapshot_data: string }>>(
    "SELECT snapshot_data FROM army_list_snapshots WHERE id = $1",
    [input.snapshot_id],
  );
  if (!rows[0]) throw new Error("Snapshot not found");
  const parsed = JSON.parse(rows[0].snapshot_data);

  // Step 2: Build unit_id lookup for the faction
  const unitRows = await db.select<Array<{ id: number; name: string }>>(
    "SELECT id, name FROM units WHERE faction_id = $1",
    [input.faction_id],
  );
  const nameToId = new Map(unitRows.map((r: { id: number; name: string }) => [r.name, r.id]));

  // Step 3: Delete current state (CASCADE removes army_list_enhancements)
  await db.execute("DELETE FROM army_list_units WHERE list_id = $1", [input.list_id]);

  // Step 4: Re-insert units from snapshot
  for (const unit of parsed.units) {
    const realUnitId = nameToId.get(unit.name) ?? null;
    const ghostName = realUnitId === null ? unit.name : null;
    await db.execute(
      `INSERT INTO army_list_units (list_id, unit_id, ghost_unit_name, is_warlord, points_override)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.list_id, realUnitId, ghostName, unit.is_warlord ? 1 : 0, null],
    );
  }

  // Step 5: Re-insert enhancements (if any) — requires mapping by unit name to new IDs
  // Enhancement assignment to new unit IDs requires a second lookup after insert
  // (this is the most complex part — see pitfall notes)
}
```

**Note on enhancement restore:** Re-inserting enhancements requires the new `army_list_units.id` values for each unit. Since SQLite doesn't return multiple `lastInsertId` values in a loop cheaply, the approach is: after inserting all units, SELECT the new rows by (list_id, COALESCE(ghost_unit_name, ...) matching unit name), build a name→new_id map, then insert enhancements. Alternatively, enhancements can be omitted from restore in the first plan and added as a follow-up task (depends on complexity budget).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Normalized snapshot tables (snapshot_units, snapshot_enhancements) | Single JSON blob in snapshot_data | D-01 (this phase) | Simpler schema; blob is immutable and self-contained; no JOIN needed to read a snapshot |
| Custom diff algorithm | Set-based name matching | D-07 (this phase) | No library needed; units matched by display name |

**Not applicable in this phase:**
- No deprecated patterns being replaced
- No migration of existing data (additive schema only)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `db.execute()` does not support multi-statement strings with BEGIN/COMMIT in Tauri plugin-sql; sequential calls must be used | Architecture Patterns / Pattern 4 | If wrong, a proper transaction is possible and would be safer; but the sequential approach still works correctly in the happy path |
| A2 | `army_list_enhancements` rows are CASCADE-deleted when `army_list_units` rows are deleted (from migration 031) | Pattern 4 (Restore) | If wrong, orphaned enhancement rows remain after restore DELETE, causing FK integrity issues on next insert |

**Verification for A2:** Confirmed from `031_army_list_v3.sql`: `army_list_unit_id INTEGER NOT NULL REFERENCES army_list_units(id) ON DELETE CASCADE`. CASCADE confirmed. [VERIFIED: codebase]

**Verification for A1:** [ASSUMED — based on codebase patterns observed; no explicit Tauri plugin-sql multi-statement docs checked in this session. All existing query modules use single `execute()` calls per statement. The established pattern is safe regardless.]

---

## Open Questions

1. **Enhancement restore complexity**
   - What we know: Enhancements reference `army_list_unit_id` (the DB row ID of the unit). After delete+re-insert, new row IDs are generated. The snapshot JSON has unit names but not the new IDs.
   - What's unclear: Is the complexity budget sufficient to implement enhancement restore in one plan, or should it be a separate task?
   - Recommendation: Plan the enhancement restore as its own task (within the same wave). The unit name → new_id lookup after insert is a clear pattern. Budget ~30 lines of SQL + TypeScript.

2. **Max snapshot limit**
   - What we know: Claude's discretion per CONTEXT.md. Unlimited snapshots in SQLite costs nothing at personal-use scale.
   - What's unclear: Whether a 20-snapshot limit would be better UX.
   - Recommendation: No limit initially. If the list grows long, add a "Showing last 20" note.

3. **Delete confirmation**
   - What we know: Claude's discretion. Other delete actions in app use confirmation dialogs (ArmyListDeleteDialog) or immediate delete (unit remove).
   - Recommendation: Immediate delete with undo toast (sonner toast with action button) — lighter UX for a non-destructive operation (the snapshot data is redundant by definition).

---

## Environment Availability

All dependencies are already installed. No new external dependencies.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@tanstack/react-query` | useArmyListSnapshots.ts | Yes | already installed | — |
| shadcn/ui Sheet | SnapshotHistorySheet | Yes | already installed | — |
| shadcn/ui Dialog | SnapshotCompareDialog | Yes | already installed | — |
| sonner | toast notifications | Yes | already installed | — |
| SQLite via Tauri plugin-sql | army_list_snapshots table | Yes | operational | — |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (inferred from setup.ts + package.json) |
| Quick run command | `pnpm test -- tests/army-list/armyListSnapshots.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SNP-01 | `createSnapshot()` inserts correct SQL with label, blob, total_points | unit | `pnpm test -- tests/army-list/armyListSnapshots.test.ts` | Wave 0 |
| SNP-01 | `captureSnapshot()` calls `buildJsonFormat` and `createSnapshot` with correct args | unit | `pnpm test -- tests/army-list/armyListSnapshots.test.ts` | Wave 0 |
| SNP-02 | `getSnapshotsByList()` SELECTs without `snapshot_data`, ordered DESC | unit | `pnpm test -- tests/army-list/armyListSnapshots.test.ts` | Wave 0 |
| SNP-03 | `computeSnapshotDiff()` returns correct added/removed/common/delta | unit | `pnpm test -- tests/army-list/snapshotDiff.test.ts` | Wave 0 |
| SNP-04 | `restoreSnapshot()` deletes existing units then re-inserts from JSON | unit | `pnpm test -- tests/army-list/armyListSnapshots.test.ts` | Wave 0 |
| SNP-04 | Restore falls back to ghost unit when unit_id lookup fails | unit | `pnpm test -- tests/army-list/armyListSnapshots.test.ts` | Wave 0 |
| SNP-04 | Auto-save snapshot is created before delete during restore | unit | `pnpm test -- tests/army-list/armyListSnapshots.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/army-list/armyListSnapshots.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/army-list/armyListSnapshots.test.ts` — covers SNP-01, SNP-02, SNP-04 (query layer)
- [ ] `tests/army-list/snapshotDiff.test.ts` — covers SNP-03 (pure diff function)

*(Existing `tests/army-list/armyListQueries.test.ts` and `tests/army-lists/PrintPreviewDialog.test.tsx` serve as structural templates for new test files)*

---

## Security Domain

> `security_enforcement` is not explicitly set to false — section included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local desktop app — no auth layer |
| V3 Session Management | no | Local desktop app — no sessions |
| V4 Access Control | no | Single-user local app |
| V5 Input Validation | yes | Snapshot label: validate non-empty, max length before INSERT |
| V6 Cryptography | no | No encryption needed for local SQLite data |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed JSON in snapshot_data during restore | Tampering / Repudiation | `JSON.parse()` wrapped in try/catch; error thrown and caught by React Query onError |
| Snapshot label with special SQL characters | Tampering | Parameterized `$1/$2` syntax — no string interpolation in SQL |
| Restore silently truncating enhancements | Tampering | Enhancement restore step included in plan and tested |

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/db/queries/armyLists.ts` — parameterized query patterns, execute() usage, FK constraints
- Codebase: `src/lib/exportArmyList.ts` — `formatArmyListForExport`, `buildJsonFormat`, `ExportData` interface
- Codebase: `src/hooks/useArmyLists.ts` — React Query hook patterns, invalidation targets
- Codebase: `src/types/armyList.ts` — type interfaces, SQLite boolean pattern
- Codebase: `src-tauri/migrations/031_army_list_v3.sql` — CASCADE behavior confirmed for army_list_enhancements
- Codebase: `src/features/army-lists/ArmyListsPage.tsx` — sibling portal architecture, state machine
- Codebase: `src/features/army-lists/ArmyListDetailSheet.tsx` — header layout, prop callback pattern, export integration
- Codebase: `src/features/army-lists/ExportDropdown.tsx` — button pattern for header area
- Codebase: `src/features/army-lists/PrintPreviewDialog.tsx` — Dialog sibling portal pattern for SnapshotCompareDialog
- Codebase: `.planning/phases/95-version-snapshots/95-CONTEXT.md` — all locked decisions (D-01..D-15)

### Secondary (MEDIUM confidence)

- CONTEXT.md D-10 description of Phase 82 safety backup pattern — not re-verified from Phase 82 code, but pattern is described precisely in locked decisions.

### Tertiary (LOW confidence)

- None — all claims verified from codebase or CONTEXT.md locked decisions.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; all existing tools verified in codebase
- Architecture: HIGH — directly derived from reading ArmyListsPage, ArmyListDetailSheet, existing query modules, and migration files
- Pitfalls: HIGH — derived from actual code patterns (031 migration, existing hooks, PrintPreviewDialog)
- Restore complexity: MEDIUM — enhancement re-insertion after delete+re-insert is the one genuinely complex piece; approach is correct but implementation details need careful execution

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (stable stack; no external dependencies)
