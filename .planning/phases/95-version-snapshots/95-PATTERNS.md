# Phase 95: Version Snapshots - Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 8 new/modified files
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src-tauri/migrations/032_army_list_snapshots.sql` | migration | batch | `src-tauri/migrations/031_army_list_v3.sql` | exact |
| `src/types/armyList.ts` | model | — | self (extension) | exact |
| `src/db/queries/armyListSnapshots.ts` | service | CRUD | `src/db/queries/armyLists.ts` | exact |
| `src/hooks/useArmyListSnapshots.ts` | hook | request-response | `src/hooks/useArmyLists.ts` | exact |
| `src/lib/snapshotDiff.ts` | utility | transform | `src/lib/exportArmyList.ts` | role-match |
| `src/features/army-lists/SnapshotHistorySheet.tsx` | component | request-response | `src/features/army-lists/PrintPreviewDialog.tsx` + `ExportDropdown.tsx` | role-match |
| `src/features/army-lists/SnapshotCompareDialog.tsx` | component | request-response | `src/features/army-lists/PrintPreviewDialog.tsx` | exact |
| `src/features/army-lists/ArmyListDetailSheet.tsx` | component | request-response | self (extension) | exact |
| `src/features/army-lists/ArmyListsPage.tsx` | component | request-response | self (extension) | exact |

---

## Pattern Assignments

### `src-tauri/migrations/032_army_list_snapshots.sql` (migration, batch)

**Analog:** `src-tauri/migrations/031_army_list_v3.sql`

**Core migration pattern** (lines 1-62 of analog): additive CREATE TABLE with FK REFERENCES and ON DELETE CASCADE; CREATE INDEX for FK column; no ALTER of existing tables.

```sql
-- 031_army_list_v3.sql conventions:
-- • Comment header: filename, phase, changes list, threat mitigations
-- • REFERENCES with ON DELETE CASCADE for child rows
-- • DEFAULT (datetime('now')) with parentheses for SQLite expression default
-- • AUTOINCREMENT on INTEGER PRIMARY KEY
-- • Inline CHECK constraints in the CREATE TABLE body
-- • CREATE INDEX immediately after CREATE TABLE for every FK column

CREATE TABLE army_list_enhancements (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id             INTEGER NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
    army_list_unit_id   INTEGER NOT NULL REFERENCES army_list_units(id) ON DELETE CASCADE,
    enhancement_name    TEXT NOT NULL,
    enhancement_points  INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Apply this directly to the new `army_list_snapshots` table schema from D-01. The `snapshot_data` column is TEXT NOT NULL (JSON blob); `total_points` is INTEGER NOT NULL (denormalized, D-03).

---

### `src/types/armyList.ts` (model, extension)

**Analog:** `src/types/armyList.ts` (self — append new interfaces)

**Existing interface pattern** (lines 17-28, 107-149): `export interface` with JSDoc comment, field-level comments for non-obvious decisions, `Omit<>` pattern for Create inputs, separate interface for inputs.

```typescript
// Pattern: Entity interface + CreateInput (no id, no created_at)
export interface ArmyListEnhancement {
  id: number;
  list_id: number;
  army_list_unit_id: number;
  enhancement_name: string;
  enhancement_points: number;
  created_at: string;
}

export interface AddEnhancementInput {
  list_id: number;
  army_list_unit_id: number;
  enhancement_name: string;
  enhancement_points: number;
}
```

New interfaces to append: `ArmyListSnapshot` (without `snapshot_data` — excluded from list queries per Pitfall 2) and `CreateSnapshotInput` (includes `snapshot_data`).

---

### `src/db/queries/armyListSnapshots.ts` (service, CRUD)

**Analog:** `src/db/queries/armyLists.ts`

**Imports pattern** (lines 1-12 of analog):
```typescript
import { getDb } from "@/db/client";
import type { ... } from "@/types/armyList";
```

**SELECT query pattern** (lines 52-58 of analog — single-row fetch):
```typescript
export async function getArmyListById(id: number): Promise<ArmyList | null> {
  const db = await getDb();
  const rows = await db.select<ArmyList[]>(
    "SELECT * FROM army_lists WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}
```

**INSERT pattern returning lastInsertId** (lines 94-102 of analog):
```typescript
export async function createArmyList(input: CreateArmyListInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO army_lists (name, faction_id, points_limit, list_type, notes, detachment_id, detachment_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [input.name, input.faction_id, input.points_limit, input.list_type, input.notes, input.detachment_id ?? null, input.detachment_name ?? null]
  );
  return result.lastInsertId ?? 0;
}
```

**DELETE pattern** (lines 163-167 of analog):
```typescript
export async function deleteArmyList(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM army_lists WHERE id = $1", [id]);
}
```

**Sequential execute() for multi-step operations** (lines 202-211 of analog — warlord pattern):
```typescript
// Each statement is a separate db.execute() call — no BEGIN/COMMIT as single string
// (Tauri plugin-sql requirement — see A1 in RESEARCH.md)
await db.execute(
  `UPDATE army_list_units SET is_warlord = CASE WHEN id = $1 THEN 1 ELSE 0 END WHERE list_id = $2`,
  [armyListUnitId, listId],
);
```

**Critical for `getSnapshotsByList`:** Explicitly SELECT `id, list_id, label, total_points, created_at` — NOT `SELECT *` — to exclude the `snapshot_data` blob from list queries (Pitfall 2 in RESEARCH.md).

**Critical for `restoreSnapshot`:** Run `createSnapshot()` (auto-save) BEFORE the DELETE statement (Pitfall 3). Sequential execute() calls — no transaction wrapper. See RESEARCH Pattern 4.

---

### `src/hooks/useArmyListSnapshots.ts` (hook, request-response)

**Analog:** `src/hooks/useArmyLists.ts`

**Imports pattern** (lines 1-36 of analog):
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ... } from "@/db/queries/armyLists";
import type { ... } from "@/types/armyList";
```

**Query key factory pattern** (lines 48-60 of analog):
```typescript
export const ARMY_LISTS_KEY = ["army-lists"] as const;
export const ARMY_LIST_KEY = (id: number) => ["army-lists", id] as const;
export const ARMY_LIST_UNITS_KEY = (id: number) => ["army-lists", id, "units"] as const;
```

New key: `export const SNAPSHOTS_KEY = (listId: number) => ["army-list-snapshots", listId] as const;`

**useQuery with enabled guard** (lines 74-80 of analog):
```typescript
export function useArmyListWithUnits(listId: number | undefined) {
  return useQuery({
    queryKey: listId !== undefined ? ARMY_LIST_UNITS_KEY(listId) : ARMY_LISTS_KEY,
    queryFn: () => (listId !== undefined ? getArmyListWithUnits(listId) : Promise.resolve([])),
    enabled: listId !== undefined,
  });
}
```

**useMutation with multi-key invalidation** (lines 148-160 of analog):
```typescript
export function useAddUnitToList() {
  const qc = useQueryClient();
  return useMutation<number, Error, AddUnitToListInput>({
    mutationFn: addUnitToList,
    onSuccess: (_insertedId, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}
```

**`useRestoreSnapshot` must invalidate these keys after restore** (from RESEARCH Pattern 6):
- `SNAPSHOTS_KEY(listId)`
- `ARMY_LIST_UNITS_KEY(listId)`
- `ARMY_LIST_KEY(listId)`
- `ARMY_LISTS_KEY`
- `["army-list-readiness"]`
- `["army-list-enhancements", listId]`

---

### `src/lib/snapshotDiff.ts` (utility, transform)

**Analog:** `src/lib/exportArmyList.ts`

**Pure function module pattern** (lines 1-10, 48-114 of analog):
```typescript
/**
 * Phase N — [Purpose]. Pure functions: no side effects, no DB, no async.
 */

export interface ExportData { ... }

export function formatArmyListForExport(
  list: ArmyList,
  units: ArmyListUnitRow[],
  enhancements: ArmyListEnhancement[],
  factionName: string | null,
): ExportData { ... }
```

New module exports: typed interfaces (`SnapshotUnit`, `SnapshotDiff`, `ParsedSnapshot`) and one pure function `computeSnapshotDiff(a, b): SnapshotDiff`. Uses `Set<string>` keyed on unit name (D-07). Diff matches by `unit.name` from the parsed JSON blob shape (`buildJsonFormat` output `units[].name`).

---

### `src/features/army-lists/SnapshotHistorySheet.tsx` (component, request-response)

**Analog:** `src/features/army-lists/ExportDropdown.tsx` (for header button pattern) + `src/features/army-lists/PrintPreviewDialog.tsx` (for Sheet/Dialog structure)

**Sheet imports pattern** (lines 1-13 of ArmyListDetailSheet.tsx):
```typescript
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
```

**Prop-callback pattern for sibling portal** (lines 52-90 of ArmyListDetailSheet.tsx):
```typescript
interface ArmyListDetailSheetProps {
  open: boolean;
  list: ArmyList | null;
  onClose: () => void;
  // ...
  onPrintPreview: () => void;  // ← callback, NOT open state
}
```

**Toast notifications pattern**:
```typescript
import { toast } from "sonner";
// onSuccess: toast.success("Snapshot saved.");
// onError: toast.error("Failed to save snapshot.");
```

**Data passed via props (not hooks inside component)**: PrintPreviewDialog receives `list`, `units`, `enhancements`, `factionName` from ArmyListsPage — all already loaded at page level. SnapshotHistorySheet receives `listId`, `list`, `units`, `enhancements`, `factionName` props for capture; uses `useSnapshotsByList(listId)` internally for the snapshot list.

**Save handler pattern** (from RESEARCH Code Examples):
```typescript
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

---

### `src/features/army-lists/SnapshotCompareDialog.tsx` (component, request-response)

**Analog:** `src/features/army-lists/PrintPreviewDialog.tsx` (exact sibling portal Dialog pattern)

**Dialog imports pattern** (lines 12-30 of PrintPreviewDialog.tsx):
```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
```

**Null guard + early return pattern** (lines 55-66 of PrintPreviewDialog.tsx):
```typescript
if (!list || !exportData) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl print:hidden">
        <DialogHeader>
          <DialogTitle>Print Preview</DialogTitle>
          <DialogDescription>No list selected.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
```

**onOpenChange close pattern** (lines 72-73 of PrintPreviewDialog.tsx):
```typescript
<Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
  <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto print:hidden">
```

**useMemo for derived data** (lines 50-53 of PrintPreviewDialog.tsx):
```typescript
const exportData = useMemo(() => {
  if (!list) return null;
  return formatArmyListForExport(list, units, enhancements, factionName);
}, [list, units, enhancements, factionName]);
```

SnapshotCompareDialog fetches `snapshot_data` for each of two selected IDs using two guarded `useQuery` hooks (`enabled: compareSnapshotIds !== null`). Diff computed via `computeSnapshotDiff()` with `useMemo`. Two-column layout for added/removed/common units with color-coded diff rows.

---

### `src/features/army-lists/ArmyListDetailSheet.tsx` (modification — add Snapshots button)

**Analog:** self (existing file, lines 52-93)

**Adding new callback prop** — follow the `onPrintPreview` pattern (lines 86-90):
```typescript
/**
 * Phase 95 — Opens the sibling-portal SnapshotHistorySheet.
 * This Sheet does NOT own the dialog state.
 */
onOpenSnapshots: () => void;
```

Add to destructured props in the function signature (line 93):
```typescript
export function ArmyListDetailSheet({
  open, list, onClose, onEdit, onDelete, onAddUnit, onConfigureUnit, onEnhanceUnit, onAttachLeader, onBrowseDatasheets, onPrintPreview, onOpenSnapshots,
}: ArmyListDetailSheetProps)
```

**Button placement:** In the same header area as `<ExportDropdown>`. Pattern: `<Button variant="outline" size="sm" onClick={onOpenSnapshots}>`.

---

### `src/features/army-lists/ArmyListsPage.tsx` (modification — add portal state + sibling portals)

**Analog:** self (existing file, lines 35-210)

**Portal state block pattern** (lines 40-50 of ArmyListsPage.tsx):
```typescript
const [datasheetBrowserOpen, setDatasheetBrowserOpen] = useState(false);
const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
```

New state to add (following the same pattern):
```typescript
const [snapshotHistoryOpen, setSnapshotHistoryOpen] = useState(false);
const [compareSnapshotIds, setCompareSnapshotIds] = useState<[number, number] | null>(null);
```

**Handler pattern** (lines 95-98 of ArmyListsPage.tsx):
```typescript
const openPrintPreview = () => setPrintPreviewOpen(true);
const closePrintPreview = () => setPrintPreviewOpen(false);
```

**closeDetail cleanup pattern** (line 86 of ArmyListsPage.tsx):
```typescript
const closeDetail = () => { setSelectedListId(null); setUnitPickerOpen(false); setLoadoutUnitId(null); setEnhancementUnitId(null); setLeaderUnitId(null); setDatasheetBrowserOpen(false); setPrintPreviewOpen(false); };
// → Also add: setSnapshotHistoryOpen(false); setCompareSnapshotIds(null);
```

**Sibling portal JSX pattern** (lines 143-210 of ArmyListsPage.tsx):
```tsx
{/* Sibling portals at page root — Pitfall 1 (never nested) */}
<ArmyListDetailSheet
  ...
  onPrintPreview={openPrintPreview}
  onOpenSnapshots={openSnapshotHistory}  {/* new */}
/>
<PrintPreviewDialog
  open={printPreviewOpen}
  list={selectedList}
  units={selectedListUnits ?? []}
  enhancements={selectedListEnhancements ?? []}
  factionName={selectedListFactionName}
  onClose={closePrintPreview}
/>
{/* New portals: */}
<SnapshotHistorySheet
  open={snapshotHistoryOpen}
  listId={selectedListId}
  list={selectedList}
  units={selectedListUnits ?? []}
  enhancements={selectedListEnhancements ?? []}
  factionName={selectedListFactionName}
  onClose={closeSnapshotHistory}
  onCompare={openSnapshotCompare}
/>
<SnapshotCompareDialog
  open={compareSnapshotIds !== null}
  snapshotIds={compareSnapshotIds}
  onClose={closeSnapshotCompare}
/>
```

---

## Shared Patterns

### DB Query Parameterization
**Source:** `src/db/queries/armyLists.ts` (all functions)
**Apply to:** `src/db/queries/armyListSnapshots.ts`
- All parameters use `$1, $2` positional syntax — never string interpolation
- `getDb()` called at the top of every function (not cached between calls)
- SELECT returns typed array `db.select<T[]>()`, execute returns `QueryResult` with `lastInsertId`

### React Query Cache Key Pattern
**Source:** `src/hooks/useArmyLists.ts` (lines 48-60)
**Apply to:** `src/hooks/useArmyListSnapshots.ts`
```typescript
export const ARMY_LISTS_KEY = ["army-lists"] as const;
export const ARMY_LIST_KEY = (id: number) => ["army-lists", id] as const;
// Snapshot equivalent:
export const SNAPSHOTS_KEY = (listId: number) => ["army-list-snapshots", listId] as const;
```

### Toast Notification Pattern
**Source:** `src/features/army-lists/ArmyListDetailSheet.tsx`
**Apply to:** `SnapshotHistorySheet.tsx`, `SnapshotCompareDialog.tsx`
```typescript
import { toast } from "sonner";
// Success: toast.success("Snapshot saved.");
// Error: toast.error("Failed to save snapshot.");
```

### Sibling Portal Architecture
**Source:** `src/features/army-lists/ArmyListsPage.tsx` (lines 35-210)
**Apply to:** All new Sheet/Dialog components
- ALL Sheet/Dialog open state lives in ArmyListsPage
- Components receive open state + onClose callback via props
- Components NEVER own their own open state
- Comment: `{/* Sibling portals at page root — Pitfall 1 (never nested) */}`

### Confirmation Dialog Pattern
**Source:** `src/features/army-lists/ArmyListDeleteDialog.tsx` (apply same approach)
**Apply to:** Restore confirmation in `SnapshotHistorySheet`
- Use shadcn/ui `AlertDialog` or `Dialog` with confirm/cancel buttons
- Confirm text per D-11: "This will replace your current list with the snapshot '[label]'. A safety snapshot of your current list will be saved first. Continue?"

---

## Test Patterns

### Query Module Test Pattern
**Source:** `tests/army-list/armyListQueries.test.ts`
**Apply to:** `tests/army-list/armyListSnapshots.test.ts`

```typescript
// Top of file — before imports
const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// Import functions AFTER mock declaration
import { createSnapshot, getSnapshotsByList, deleteSnapshot, restoreSnapshot } from "@/db/queries/armyListSnapshots";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("armyListSnapshots — getSnapshotsByList", () => {
  it("SELECT excludes snapshot_data (Pitfall 2)", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getSnapshotsByList(1);
    const [sql] = selectMock.mock.calls[0];
    expect(sql).not.toMatch(/snapshot_data/);
    expect(sql).toMatch(/ORDER BY created_at DESC/);
  });
});
```

### Pure Function Test Pattern
**Source:** `tests/army-list/deltaPreview.test.ts` or `tests/army-list/computeListHealthStats.test.ts`
**Apply to:** `tests/army-list/snapshotDiff.test.ts`
- No mocks needed — pure functions
- Test added/removed/common unit sets and pointsDelta arithmetic
- Cover edge cases: empty snapshots, units in both snapshots, swapped A/B

### Dialog Component Test Pattern
**Source:** `tests/army-lists/PrintPreviewDialog.test.tsx`
**Apply to:** `tests/army-lists/SnapshotCompareDialog.test.tsx` (if created)

```typescript
vi.mock("@/lib/snapshotDiff", () => ({
  computeSnapshotDiff: vi.fn(() => ({
    pointsDelta: 50,
    unitsAdded: [{ name: "Aggressors", points: 100 }],
    unitsRemoved: [],
    unitsCommon: [],
  })),
}));
```

---

## No Analog Found

All files have close analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/hooks/`, `src/features/army-lists/`, `src/lib/`, `src/types/`, `src-tauri/migrations/`, `tests/army-list*/`
**Files scanned:** 12 source files read directly
**Pattern extraction date:** 2026-05-22
