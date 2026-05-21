# Phase 93: Datasheet Browser + Ghost Units - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 6 (1 new, 2 new tests, 3 modified)
**Analogs found:** 5 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/army-lists/DatasheetBrowserDialog.tsx` | component (dialog) | request-response | `src/features/army-lists/UnitPickerDialog.tsx` | exact |
| `src/features/army-lists/ArmyListsPage.tsx` | component (page) | request-response | Self (existing sibling portal pattern) | exact |
| `src/features/army-lists/ArmyListDetailSheet.tsx` | component (sheet) | request-response | Self (existing "Add Unit" trigger) | exact |
| `src/features/army-lists/ArmyListUnitRow.tsx` | component (row) | request-response | Self (existing conditional rendering) | exact |
| `tests/army-lists/DatasheetBrowserDialog.test.tsx` | test | -- | `tests/army-lists/ArmyListUnitRow.test.tsx` | role-match |
| `tests/army-lists/ArmyListUnitRow.test.tsx` | test (extend) | -- | Self (existing test file) | exact |

## Pattern Assignments

### `src/features/army-lists/DatasheetBrowserDialog.tsx` (NEW component, request-response)

**Analog:** `src/features/army-lists/UnitPickerDialog.tsx` (lines 1-113)

**Imports pattern** (lines 1-17):
```typescript
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
```

**Props interface pattern** (lines 21-28):
```typescript
interface UnitPickerDialogProps {
  open: boolean;
  /** The list to add units to. Null when no list is selected (dialog should be closed in that case). */
  listId: number | null;
  /** Pre-filter by faction_id. Null means show ALL units (e.g. when the list has no faction). */
  factionId: number | null;
  onClose: () => void;
}
```

**Core Dialog + Command palette pattern** (lines 42-113):
```typescript
export function UnitPickerDialog({
  open, listId, factionId, onClose,
}: UnitPickerDialogProps) {
  const { data: units = [] } = useUnits();
  const addUnitToList = useAddUnitToList();

  function handleSelect(unitId: number) {
    if (listId === null) return;
    addUnitToList.mutate(
      { list_id: listId, unit_id: unitId },
      {
        onSuccess: () => {
          toast.success("Unit added.");
          // Do NOT close -- stay open for multi-add (CONTEXT.md decision)
        },
        onError: (err) => {
          console.error("[UnitPickerDialog] Failed to add unit:", err);
          toast.error("Failed to add unit. Please try again.");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 sm:max-w-[480px]">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Add unit to list</DialogTitle>
          <DialogDescription>
            {/* contextual description */}
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search units..." />
          <CommandList>
            <CommandEmpty>No units found.</CommandEmpty>
            <CommandGroup>
              {filteredUnits.map((unit) => (
                <CommandItem
                  key={unit.id}
                  value={`${unit.name}-${unit.id}`}
                  onSelect={() => handleSelect(unit.id)}
                >
                  <span className="flex-1">{unit.name}</span>
                  {unit.category && (
                    <Badge variant="secondary" className="ml-auto">
                      {unit.category}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
```

**Additional hooks to import (from useDatasheet.ts):**
```typescript
// src/hooks/useDatasheet.ts lines 80-93
import { useDatasheetsByFactionWithPoints, useWahapediaFactionId } from "@/hooks/useDatasheet";
// src/hooks/useArmyLists.ts lines 280-292
import { useAddGhostUnitToList } from "@/hooks/useArmyLists";
// src/hooks/useFactions.ts
import { useFactions } from "@/hooks/useFactions";
// src/db/queries/datasheets.ts lines 309-314
import type { DatasheetWithPoints } from "@/db/queries/datasheets";
```

**Faction resolution chain pattern** (from ArmyListDetailSheet lines 68-73):
```typescript
const { data: factions } = useFactions();
const faction = useMemo(
  () => (list?.faction_id ? (factions ?? []).find((f) => f.id === list.faction_id) ?? null : null),
  [factions, list?.faction_id],
);
const { data: wahapediaFactionId } = useWahapediaFactionId(faction?.name);
```

**Key difference from UnitPickerDialog:** DatasheetBrowserDialog uses multiple `CommandGroup` elements (one per role) instead of a single flat `CommandGroup`. The `value` prop must use `${ds.name}-${ds.id}` and `handleSelect` must pass `ds.name` (not `ds.id`) as `ghost_unit_name`.

---

### `src/features/army-lists/ArmyListsPage.tsx` (MODIFIED -- add sibling portal)

**Analog:** Self -- existing sibling portal pattern (lines 30-72, 117-153)

**State declaration pattern** (lines 40-41 for reference):
```typescript
const [unitPickerOpen, setUnitPickerOpen] = useState(false);
const [loadoutUnitId, setLoadoutUnitId] = useState<number | null>(null);
```
Add analogous:
```typescript
const [datasheetBrowserOpen, setDatasheetBrowserOpen] = useState(false);
```

**Handler pattern** (lines 69-70):
```typescript
const openUnitPicker = () => setUnitPickerOpen(true);
const closeUnitPicker = () => setUnitPickerOpen(false);
```
Add analogous:
```typescript
const openDatasheetBrowser = () => setDatasheetBrowserOpen(true);
const closeDatasheetBrowser = () => setDatasheetBrowserOpen(false);
```

**ArmyListDetailSheet prop-passing pattern** (lines 118-127):
```typescript
<ArmyListDetailSheet
  key={selectedList?.id ?? "none-detail"}
  open={selectedListId !== null}
  list={selectedList}
  onClose={closeDetail}
  onEdit={openEdit}
  onDelete={openDelete}
  onAddUnit={openUnitPicker}
  onConfigureUnit={openLoadout}
/>
```
Add `onBrowseDatasheets={openDatasheetBrowser}` prop.

**Sibling portal rendering pattern** (lines 140-145):
```typescript
<UnitPickerDialog
  open={unitPickerOpen}
  listId={selectedListId}
  factionId={selectedList?.faction_id ?? null}
  onClose={closeUnitPicker}
/>
```
Add analogous DatasheetBrowserDialog below, with same prop shape.

---

### `src/features/army-lists/ArmyListDetailSheet.tsx` (MODIFIED -- add trigger button)

**Analog:** Self -- existing "Add Unit" trigger (lines 37-55, 196-205)

**Props interface extension** (lines 37-55):
```typescript
interface ArmyListDetailSheetProps {
  // ... existing props ...
  onAddUnit: () => void;
  onConfigureUnit: (armyListUnitId: number) => void;
}
```
Add `onBrowseDatasheets: () => void;` to the interface.

**Trigger button pattern** (lines 196-205):
```typescript
<div className="flex items-center justify-between px-4 py-2">
  <span className="text-sm font-semibold">Units</span>
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={onAddUnit}
  >
    <Plus className="mr-2 h-4 w-4" /> Add Unit
  </Button>
</div>
```
Add a second button alongside for "Browse Datasheets" using an appropriate icon (e.g., `BookOpen` from lucide-react). The buttons should be in a flex row with `gap-2`.

---

### `src/features/army-lists/ArmyListUnitRow.tsx` (MODIFIED -- ghost unit visual treatment)

**Analog:** Self (lines 63-319)

**Ghost detection point** -- derive `isGhost` at the top of the component:
```typescript
// Line 63: component start
export function ArmyListUnitRow({ unit, ... }: ArmyListUnitRowProps) {
  // Add near line 70:
  const isGhost = unit.unit_id === null;
```

**Name cell to modify** (lines 154-188):
```typescript
{unit.unit_id != null && (
  <MatchStatusIndicator
    unitId={unit.unit_id}
    matchStatus={rulesMapping?.match_status ?? null}
    ambiguousCount={ambiguousCount}
    onClick={() => setMappingSheetOpen(true)}
  />
)}
<span>{unit.unit_name}</span>
```
Add after the `<span>`: `{isGhost && <Badge variant="outline" className="ml-1.5 text-xs">Planned</Badge>}`
Wrap `<span>` with conditional muting: `<span className={isGhost ? "text-muted-foreground" : ""}>`

**Status cell to modify** (lines 222-227):
```typescript
<TableCell className="space-x-1">
  <Badge variant="secondary">{unit.status_painting}</Badge>
  {unit.status_assembly === 1 && (
    <Badge variant="outline">Assembled</Badge>
  )}
</TableCell>
```
Wrap in conditional: `{isGhost ? <span className="text-xs text-muted-foreground">--</span> : (existing badges)}`

**Tactical role select to modify** (lines 190-219):
Hide the tactical role selector for ghost units (no collection context), or keep it visible if ghost units should get roles. The select is already on the row.

**Points cell** (lines 229-256): The Configure button and points input should still render for ghost units (D-07 confirms LoadoutBuilderSheet supports them). The inline points override input can remain.

---

### `tests/army-lists/DatasheetBrowserDialog.test.tsx` (NEW test)

**Analog:** `tests/army-lists/ArmyListUnitRow.test.tsx` (lines 1-163)

**Test file structure pattern** (lines 1-62):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
```

**Mock pattern** (lines 24-61):
```typescript
const mockMutate = vi.fn();
vi.mock("@/hooks/useArmyLists", () => ({
  useAddGhostUnitToList: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useDatasheet", () => ({
  useDatasheetsByFactionWithPoints: () => ({
    data: [
      { id: "ds1", name: "Intercessors", role: "Battleline", points: 80 },
      { id: "ds2", name: "Captain", role: "Character", points: 80 },
    ],
    isLoading: false,
  }),
  useWahapediaFactionId: () => ({ data: "SM" }),
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({
    data: [{ id: 1, name: "Space Marines" }],
    isLoading: false,
  }),
}));
```

**Render helper pattern** (lines 98-126):
```typescript
function renderDialog(props?: Partial<DatasheetBrowserDialogProps>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DatasheetBrowserDialog
        open={true}
        listId={1}
        factionId={1}
        onClose={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  );
}
```

**Test structure pattern** (lines 132-162):
```typescript
describe("DatasheetBrowserDialog", () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it("renders datasheets grouped by role", () => { /* ... */ });
  it("calls useAddGhostUnitToList with ds.name on selection", async () => { /* ... */ });
  it("shows empty state when no faction mapping", () => { /* ... */ });
  it("stays open after selection (multi-add)", async () => { /* ... */ });
});
```

---

### `tests/army-lists/ArmyListUnitRow.test.tsx` (EXTEND existing)

**Analog:** Self (lines 1-163)

**Factory pattern to use** (lines 67-92):
```typescript
function makeUnit(overrides: Partial<ArmyListUnitRowType> = {}): ArmyListUnitRowType {
  return {
    id: 1, list_id: 1, unit_id: 1, ghost_unit_name: null,
    // ... all fields with defaults ...
    ...overrides,
  };
}
```

**Ghost unit factory call:**
```typescript
makeUnit({ unit_id: null, ghost_unit_name: "Intercessors" })
```

**New tests to add after existing describe block:**
```typescript
describe("ArmyListUnitRow -- Ghost unit treatment", () => {
  it("renders 'Planned' badge when unit_id is null", () => {
    renderRow(makeUnit({ unit_id: null, ghost_unit_name: "Intercessors" }));
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("hides painting status for ghost units", () => {
    renderRow(makeUnit({ unit_id: null, ghost_unit_name: "Intercessors" }));
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
  });

  it("still renders Configure button for ghost units", () => {
    renderRow(makeUnit({ unit_id: null, ghost_unit_name: "Intercessors" }));
    expect(screen.getByRole("button", { name: /Configure/ })).toBeInTheDocument();
  });
});
```

---

## Shared Patterns

### Sibling Portal Architecture
**Source:** `src/features/army-lists/ArmyListsPage.tsx` (lines 30-153)
**Apply to:** DatasheetBrowserDialog (render as sibling, never nested in Sheet)
```typescript
// State at page root
const [portalOpen, setPortalOpen] = useState(false);
// Callback passed to Sheet child
<ArmyListDetailSheet onBrowseDatasheets={() => setPortalOpen(true)} />
// Sibling rendering at page root (NEVER inside Sheet)
<DatasheetBrowserDialog open={portalOpen} onClose={() => setPortalOpen(false)} />
```

### Toast Notification Pattern
**Source:** `src/features/army-lists/UnitPickerDialog.tsx` (lines 56-71)
**Apply to:** DatasheetBrowserDialog handleSelect
```typescript
mutate(input, {
  onSuccess: () => toast.success("Unit added."),
  onError: (err) => {
    console.error("[ComponentName] Failed:", err);
    toast.error("Failed to add unit. Please try again.");
  },
});
```

### React Query Hook Usage Pattern
**Source:** `src/hooks/useDatasheet.ts` (lines 80-93)
**Apply to:** DatasheetBrowserDialog
```typescript
// Hooks return { data, isLoading } -- always default data to empty array
const { data: datasheets = [] } = useDatasheetsByFactionWithPoints(wahapediaFactionId ?? undefined);
// Hook is auto-disabled when arg is undefined (enabled: factionId !== undefined)
```

### CommandItem Value Pattern (Pitfall 5 avoidance)
**Source:** `src/features/army-lists/UnitPickerDialog.tsx` (line 96)
**Apply to:** DatasheetBrowserDialog CommandItem elements
```typescript
<CommandItem key={ds.id} value={`${ds.name}-${ds.id}`} onSelect={() => handleSelect(ds)}>
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| -- | -- | -- | All files have exact or self analogs |

All 6 files have strong analogs in the existing codebase. This phase is pure assembly of existing patterns.

## Metadata

**Analog search scope:** `src/features/army-lists/`, `src/hooks/`, `src/db/queries/`, `tests/army-lists/`
**Files scanned:** 10 source files read in detail
**Pattern extraction date:** 2026-05-21
