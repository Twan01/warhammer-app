# Phase 3: Collection Module - Research

**Researched:** 2026-05-01
**Domain:** TanStack Table v8 + Zustand + optimistic mutations + shadcn UI composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Layout:**
- Data table, not card grid — dense rows, sortable columns, TanStack Table
- Column headers are sortable (ascending/descending toggle); sort state is ephemeral (session only, like filters)
- Paginated — 25 units per page with page controls at the bottom

**Visible columns (in order):** Name, Faction badge, Category, Painting status, Progress bar, Points, Model count, Active project flag, Actions
- All columns visible by default; no hidden/toggleable columns in v1
- Progress bar driven by `painting_percentage` (shadcn Progress component)
- Active project flag: small icon/badge when `is_active_project = true`

**Faction color accent (POLISH-05):**
- Faction name rendered as a colored Badge — hex from `faction.color_theme` applied as badge background
- NOT the 4px left border pattern from Phase 2 (scoped to Factions page)
- `<Badge style={{ backgroundColor: faction.color_theme }}>Tau Empire</Badge>`

**Inline status update UX (COLL-10):**
- Status badge in table row is clickable → opens Popover with PAINTING_STATUS_ORDER list (Command + Popover, same as CategoryCombobox)
- Current status is highlighted/checked; user picks new status — 2 clicks
- Update is optimistic: badge changes immediately; DB write in background; rollback + Sonner error toast on failure
- Same clickable-badge behavior inside unit detail Sheet

**Unit detail Sheet (COLL-09):**
- Clicking a unit row opens a Sheet (right side panel)
- Content is read-only styled text displaying all unit fields
- "Edit unit" button opens UnitSheet (existing Phase 2 component) for full editing
- Status badge inside drawer is also clickable (same popover pattern)
- `key={unit.id}` on the Sheet content prevents stale state (POLISH-04)

**Filter state (COLL-07):**
- Zustand store — ephemeral, not persisted to URL or localStorage
- Filters: search (name, live), faction (multi-select), status (multi-select), category (multi-select), active project only (toggle)

**Cross-cutting polish (POLISH-01 through POLISH-05):**
- POLISH-01: Delete confirm dialog before destructive actions (reuse UnitDeleteDialog)
- POLISH-02: Skeleton loading state while units fetch
- POLISH-03: Sonner toast on mutation error (Toaster already mounted in AppLayout)
- POLISH-04: `key={unit.id}` on all unit form/sheet instances
- POLISH-05: Faction-color badge in table rows

### Claude's Discretion
- Exact filter UI presentation (dropdown popovers vs. horizontal bar vs. collapsible panel)
- Empty state illustration/icon vs. text-only
- Exact page size options (25 default; whether to offer 10/50 alternatives)
- Column header sort icons
- Popover positioning and animation

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COLL-01 | Collection page shows units in a sortable, paginated table | TanStack Table v8 `useReactTable` with `getSortedRowModel` + `getPaginationRowModel` |
| COLL-02 | Search by unit name (live filter) | TanStack Table `globalFilterFn` or column `filterFn`; Zustand search string; no debounce needed for local data |
| COLL-03 | Filter by faction (multi-select) | Zustand `selectedFactions: number[]`; TanStack Table column filter or `filterRows` custom fn |
| COLL-04 | Filter by painting status (multi-select) | Same Zustand/TanStack filter pattern as COLL-03 |
| COLL-05 | Filter by category (multi-select) | Same pattern |
| COLL-06 | Filter "active project only" toggle | Zustand `activeOnly: boolean`; combined filter passes |
| COLL-07 | Filter state in Zustand (ephemeral) | `zustand` 5.0.12 — `create()` with typed slice; no persist middleware |
| COLL-08 | "Add unit" button opens UnitSheet | Reuse existing `UnitSheet` with `unit={null}` |
| COLL-09 | Clicking a unit row opens detail drawer | New `UnitDetailSheet` component; `side="right"`; read-only display + clickable status badge + Edit/Delete actions |
| COLL-10 | Quick status update — optimistic, 2-click | `useUpdateUnit` with `onMutate`/`onError` for optimistic; Popover + Command pattern from CategoryCombobox |
| COLL-11 | Per-unit progress bar in table | `<Progress value={unit.painting_percentage} />` inside table cell |
| COLL-12 | Empty state when no units | `CollectionEmptyState` component; detect `data.length === 0` after filtering |
| COLL-13 | Delete unit confirms via modal | Reuse `UnitDeleteDialog` (already has correct copy/behavior) |
| POLISH-01 | Delete confirmations on all destructive actions | `UnitDeleteDialog` already built; wire into Actions column and detail Sheet footer |
| POLISH-02 | Loading states (skeletons) | `<Skeleton className="h-10 w-full" />` x5 rows while `isLoading`; table header stays visible |
| POLISH-03 | Error states via Sonner toast | `toast.error(...)` in mutation `onError` callbacks; Toaster mounted in AppLayout |
| POLISH-04 | Forms reset between sessions via `key={entity.id}` | `key={selectedUnit?.id ?? "new"}` on SheetContent and UnitSheet instances |
| POLISH-05 | Faction-color accent | `<Badge style={{ backgroundColor: faction.color_theme }}>` in table rows and detail Sheet header |
</phase_requirements>

---

## Summary

Phase 3 is the primary user-facing interface: a paginated, sortable, filterable unit table with inline status updates, a detail drawer, and full CRUD. The Phase 2 code base is the foundation — `UnitSheet`, `UnitDeleteDialog`, `CategoryCombobox`, `useUnits`, and all shadcn UI components are already installed and ready to compose.

Two new dependencies are required: `@tanstack/react-table` (v8.21.3, currently NOT in package.json) for the table engine, and `zustand` (v5.0.12, also NOT in package.json) for ephemeral filter state. Both are well-established, have no React 19 compatibility issues, and integrate cleanly with the existing TanStack Query setup.

The most technically nuanced area is the optimistic status update (COLL-10): `useUpdateUnit` uses a COALESCE SQL pattern which means the mutation only needs to send `{ id, status_painting }` — but the rollback must use `queryClient.setQueryData` to immediately restore the previous value before re-invalidating. The `CategoryCombobox` pattern is the exact template to follow for the status Popover.

Faction data is NOT included in the `getUnits()` SQL query (SELECT * FROM units — no JOIN). The component layer must resolve faction name and color from a parallel `useFactions()` call using a lookup map, exactly as `FactionsPage.tsx` already does.

**Primary recommendation:** Build in plan order (table → filters → detail drawer → form/delete/polish). Each plan builds on stable foundations from the previous. Wire the route at the start of plan 03-01 by replacing the `CollectionPage` placeholder.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-table` | 8.21.3 | Headless table engine — sorting, pagination, filtering | De facto standard for React tables; headless means full shadcn UI control |
| `zustand` | 5.0.12 | Ephemeral filter state store | Minimal boilerplate, no Provider wrapper needed, works with React 19 |
| `react-hook-form` + `zod` | 7.74.0 / 4.4.1 | Form validation (already installed) | Already in project; reuse `unitSchema` and `UnitFormValues` |

### Supporting (already installed — no new installs)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | 5.100.6 | Data fetching and cache | All unit/faction data via hooks |
| `lucide-react` | 0.460.0 | Icons (sort, active-project, empty state) | ChevronUp/Down, ChevronsUpDown, Flame/Star, PackageSearch |
| `sonner` | 2.0.7 | Error toasts (already wired) | Mutation failures, status rollback |
| shadcn/ui | all installed | Table, Sheet, Badge, Progress, Skeleton, Popover, Command, Dialog, Button, Input | All UI composition |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Table | AG Grid, react-table v6 | AG Grid has community license friction; v6 is outdated |
| Zustand | Jotai, useReducer+Context | Jotai is equally valid but adds another dep; Context requires Provider; Zustand is already the ecosystem recommendation in CONTEXT.md |
| Client-side filter | Server-side filter | getUnits() returns all units — no API layer to filter server-side; client-side is correct architecture for this dataset size |

**Installation (new packages only):**
```bash
pnpm add @tanstack/react-table zustand
```

**Version verification (confirmed against npm registry 2026-05-01):**
- `@tanstack/react-table`: 8.21.3 (latest)
- `zustand`: 5.0.12 (latest)

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── features/units/
│   ├── UnitTable.tsx              # TanStack Table + columns definition
│   ├── UnitTableColumns.tsx       # Column definitions (separate file for clarity)
│   ├── UnitFilters.tsx            # Filter bar component
│   ├── UnitDetailSheet.tsx        # Read-only detail drawer (new)
│   ├── StatusPopover.tsx          # Clickable status badge + Command popover (COLL-10)
│   ├── CollectionEmptyState.tsx   # Empty state (COLL-12)
│   ├── collectionFilters.ts       # Zustand store (COLL-07)
│   ├── UnitSheet.tsx              # EXISTING — reuse unchanged
│   ├── UnitDeleteDialog.tsx       # EXISTING — reuse unchanged
│   ├── CategoryCombobox.tsx       # EXISTING — reuse unchanged
│   └── unitSchema.ts              # EXISTING — reuse unchanged
└── app/collection/
    └── page.tsx                   # Replace placeholder with real CollectionPage
```

### Pattern 1: TanStack Table v8 Setup

**What:** Headless table engine that manages sort, pagination, and filter state internally. React renders into shadcn Table primitives.

**When to use:** Whenever a table needs sorting, pagination, or filtering managed as a unit.

**Core hook signature:**
```typescript
// Source: TanStack Table v8 docs / npm @tanstack/react-table 8.21.3
const table = useReactTable({
  data,               // Unit[] — all units from useUnits()
  columns,            // ColumnDef<Unit>[] — defined in UnitTableColumns.tsx
  state: {
    sorting,
    pagination,
    globalFilter,     // drives name search (COLL-02)
  },
  onSortingChange: setSorting,
  onPaginationChange: setPagination,
  onGlobalFilterChange: setGlobalFilter,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  globalFilterFn: "includesString",  // built-in for name search
  initialState: {
    pagination: { pageSize: 25 },
    sorting: [{ id: "name", desc: false }],
  },
});
```

**CRITICAL NOTE:** TanStack Table handles sort/pagination/filter. However, faction/category/status multi-select filters and the active-project toggle are NOT standard TanStack column filters — they operate on Zustand state and are applied via a pre-filter step: **filter the raw `data` array before passing to `useReactTable`**. This is simpler and more predictable than custom filterFn implementations for multi-select.

### Pattern 2: Pre-filter data before TanStack Table

**What:** Apply Zustand filter values to the raw `data: Unit[]` before it enters `useReactTable`. TanStack Table then handles sort/pagination on the already-filtered array. Only `globalFilter` (name search) flows through TanStack's built-in filter model.

**When to use:** Multi-value filters where TanStack's built-in filterFn composition would add complexity without benefit.

```typescript
// In UnitTable.tsx or CollectionPage
const { data: rawUnits } = useUnits();
const { search, factions, statuses, categories, activeOnly } = useCollectionFilters();

const filteredUnits = useMemo(() => {
  return (rawUnits ?? []).filter((unit) => {
    if (activeOnly && !unit.is_active_project) return false;
    if (factions.length > 0 && !factions.includes(unit.faction_id)) return false;
    if (statuses.length > 0 && !statuses.includes(unit.status_painting)) return false;
    if (categories.length > 0 && !categories.includes(unit.category ?? "")) return false;
    if (search && !unit.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
}, [rawUnits, activeOnly, factions, statuses, categories, search]);

// Pass filteredUnits as `data` to useReactTable
```

### Pattern 3: Zustand Filter Store

**What:** Ephemeral store for filter UI state. No persist middleware.

```typescript
// src/features/units/collectionFilters.ts
// Source: Zustand 5.x docs
import { create } from "zustand";
import type { PaintingStatus } from "@/types/unit";

interface CollectionFiltersState {
  search: string;
  factions: number[];            // faction_id values
  statuses: PaintingStatus[];
  categories: string[];
  activeOnly: boolean;
  setSearch: (v: string) => void;
  toggleFaction: (id: number) => void;
  toggleStatus: (s: PaintingStatus) => void;
  toggleCategory: (c: string) => void;
  toggleActiveOnly: () => void;
  clearAll: () => void;
}

export const useCollectionFilters = create<CollectionFiltersState>((set) => ({
  search: "",
  factions: [],
  statuses: [],
  categories: [],
  activeOnly: false,
  setSearch: (v) => set({ search: v }),
  toggleFaction: (id) => set((s) => ({
    factions: s.factions.includes(id) ? s.factions.filter((f) => f !== id) : [...s.factions, id],
  })),
  toggleStatus: (status) => set((s) => ({
    statuses: s.statuses.includes(status) ? s.statuses.filter((x) => x !== status) : [...s.statuses, status],
  })),
  toggleCategory: (cat) => set((s) => ({
    categories: s.categories.includes(cat) ? s.categories.filter((c) => c !== cat) : [...s.categories, cat],
  })),
  toggleActiveOnly: () => set((s) => ({ activeOnly: !s.activeOnly })),
  clearAll: () => set({ search: "", factions: [], statuses: [], categories: [], activeOnly: false }),
}));
```

### Pattern 4: Optimistic Status Update (COLL-10)

**What:** Immediate badge update on click, rollback on DB error. Uses `useQueryClient.setQueryData` for rollback, not just invalidation.

**CRITICAL PITFALL:** `useUpdateUnit` currently has no `onMutate`/`onError` for optimistic — it only uses `onSuccess`. The optimistic update must be implemented at the component level using `useMutation` override or a wrapper approach. The simplest correct pattern:

```typescript
// In StatusPopover.tsx
const qc = useQueryClient();
const updateUnit = useUpdateUnit();

function handleStatusSelect(newStatus: PaintingStatus) {
  setOpen(false);
  // 1. Snapshot previous value for rollback
  const previous = qc.getQueryData<Unit[]>(UNITS_KEY);
  // 2. Optimistically update the cache
  qc.setQueryData<Unit[]>(UNITS_KEY, (old) =>
    old?.map((u) => u.id === unit.id ? { ...u, status_painting: newStatus } : u) ?? []
  );
  // 3. Fire the mutation — on error, rollback
  updateUnit.mutate(
    { id: unit.id, status_painting: newStatus },
    {
      onError: () => {
        qc.setQueryData(UNITS_KEY, previous); // rollback
        toast.error("Status update failed. The change has been reverted.");
      },
    }
  );
}
```

**Note on COALESCE in updateUnit SQL:** The existing `updateUnit` SQL uses `COALESCE($param, column)` — passing only `{ id, status_painting }` works correctly because `??  null` fallback for all other fields means COALESCE keeps the existing DB value. Sending only the changed field is safe.

### Pattern 5: Faction Lookup in Table

**What:** `getUnits()` does NOT join faction data (SELECT * FROM units — no JOIN). Resolve faction name and color_theme from a lookup map, same technique as `FactionsPage.tsx`.

```typescript
// In UnitTable.tsx or CollectionPage
const { data: factions } = useFactions();

const factionMap = useMemo(() => {
  const map = new Map<number, Faction>();
  for (const f of factions ?? []) map.set(f.id, f);
  return map;
}, [factions]);

// In column definition:
cell: ({ row }) => {
  const faction = factionMap.get(row.original.faction_id);
  if (!faction) return null;
  return (
    <Badge style={{ backgroundColor: faction.color_theme }}>
      {faction.name}
    </Badge>
  );
}
```

### Pattern 6: TanStack Table Column Definition

```typescript
// src/features/units/UnitTableColumns.tsx
import { ColumnDef } from "@tanstack/react-table";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

export function buildColumns(
  factionMap: Map<number, Faction>,
  onRowClick: (unit: Unit) => void,
  onDelete: (unit: Unit) => void,
): ColumnDef<Unit>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} label="Name" />,
      cell: ({ row }) => <span className="text-sm">{row.original.name}</span>,
    },
    {
      id: "faction",
      accessorFn: (row) => factionMap.get(row.faction_id)?.name ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Faction" />,
      cell: ({ row }) => {
        const faction = factionMap.get(row.original.faction_id);
        if (!faction) return null;
        return <Badge style={{ backgroundColor: faction.color_theme }}>{faction.name}</Badge>;
      },
      enableSorting: true,
    },
    {
      accessorKey: "category",
      header: "Category",
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.category}</span>,
    },
    {
      accessorKey: "status_painting",
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => <StatusPopover unit={row.original} />,
    },
    {
      accessorKey: "painting_percentage",
      header: "Progress",
      enableSorting: false,
      cell: ({ row }) => <Progress value={row.original.painting_percentage} className="h-2 w-20" />,
    },
    {
      accessorKey: "points",
      header: ({ column }) => <SortableHeader column={column} label="Points" />,
      cell: ({ row }) => <span className="text-sm">{row.original.points ?? "—"}</span>,
    },
    {
      accessorKey: "model_count",
      header: ({ column }) => <SortableHeader column={column} label="Models" />,
      cell: ({ row }) => <span className="text-sm">{row.original.model_count ?? "—"}</span>,
    },
    {
      id: "active",
      accessorKey: "is_active_project",
      header: "Active",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.is_active_project ? (
          <Flame className="h-4 w-4 text-primary" aria-label="Active project" />
        ) : null,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => <UnitTableActions unit={row.original} onDelete={onDelete} />,
    },
  ];
}
```

### Pattern 7: UnitSheet Reuse for Edit from Detail Drawer

**What:** UnitSheet is already fully built. The detail drawer ("UnitDetailSheet") holds its own `open` state for UnitSheet and passes the selected unit.

```typescript
// In UnitDetailSheet.tsx — simplified state model
const [editSheetOpen, setEditSheetOpen] = useState(false);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

// Footer:
<Button variant="default" onClick={() => setEditSheetOpen(true)}>Edit Unit</Button>
<Button variant="ghost" className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>Delete Unit</Button>

// Mounted outside the Sheet so stacking doesn't cause z-index issues:
<UnitSheet key={unit.id} open={editSheetOpen} unit={unit} onClose={() => setEditSheetOpen(false)} />
<UnitDeleteDialog key={unit.id} open={deleteDialogOpen} unit={unit} onClose={() => { setDeleteDialogOpen(false); onClose(); }} />
```

### Pattern 8: Rendering TanStack Table into shadcn Table

```typescript
// Standard TanStack Table v8 render pattern with shadcn Table primitives
<Table>
  <TableHeader>
    {table.getHeaderGroups().map((headerGroup) => (
      <TableRow key={headerGroup.id}>
        {headerGroup.headers.map((header) => (
          <TableHead key={header.id} style={{ width: header.getSize() }}>
            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
          </TableHead>
        ))}
      </TableRow>
    ))}
  </TableHeader>
  <TableBody>
    {table.getRowModel().rows.length === 0 ? (
      <TableRow>
        <TableCell colSpan={columns.length}>
          <CollectionEmptyState onAdd={onAdd} isFiltered={hasActiveFilters} />
        </TableCell>
      </TableRow>
    ) : (
      table.getRowModel().rows.map((row) => (
        <TableRow
          key={row.id}
          className="hover:bg-muted/50 cursor-pointer"
          onClick={() => onRowClick(row.original)}
          aria-label={`View ${row.original.name}`}
        >
          {row.getVisibleCells().map((cell) => (
            <TableCell key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
      ))
    )}
  </TableBody>
</Table>
```

### Anti-Patterns to Avoid

- **Joining faction data in SQL:** `getUnits()` returns units only. Do NOT modify the query to JOIN — use a client-side lookup map from `useFactions()`.
- **Passing filters through TanStack filterFn for multi-select:** Use pre-filtered `data` array instead. TanStack's `columnFilterFn` composition for multi-select is verbose; the `useMemo` pre-filter is cleaner.
- **Using `onSuccess` for optimistic rollback:** `onSuccess` fires after the DB write confirms — by then the cache is stale. Rollback requires `onError` with `setQueryData` at the call site.
- **Mounting UnitSheet inside SheetContent of UnitDetailSheet:** Two nested `<Sheet>` components can create stacking/portal issues. Mount UnitSheet as a sibling in the parent, not inside the detail Sheet.
- **Calling `form.reset()` with stale unit data:** Always use `key={unit.id}` to force fresh component mount instead of relying on `useEffect` + `form.reset()` (POLISH-04 pattern already established).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table sorting logic | Custom sort comparators + state | `@tanstack/react-table` getSortedRowModel | Handles nulls, locale, type coercion correctly |
| Table pagination | Manual slice() + page index | `@tanstack/react-table` getPaginationRowModel | Edge case: last page with fewer rows, page count display |
| Filter store | useState + prop drilling | Zustand `useCollectionFilters` store | Avoids deep prop threading from page → table → filter bar |
| Optimistic cache update | Manual state clone | `queryClient.setQueryData` + `getQueryData` snapshot | TanStack Query owns the cache; setting data directly is the supported API |
| Status list ordering | Alphabetical sort | `PAINTING_STATUS_ORDER` constant | Already defined in `src/types/unit.ts`; ensures Kanban-consistent ordering |

**Key insight:** The table, filter, and optimistic update behaviors each have subtle edge cases. All three have battle-tested library solutions already in or planned for the project.

---

## Common Pitfalls

### Pitfall 1: SQLite 0|1 booleans vs TypeScript boolean

**What goes wrong:** `unit.is_active_project` is `0 | 1` (not `boolean`). Checking `if (unit.is_active_project)` works, but `unit.is_active_project === true` fails. Passing a boolean to `updateUnit` mutation for boolean fields requires coercion.

**Why it happens:** SQLite stores booleans as INTEGER. The `Unit` type reflects this with `0 | 1` literals (see `src/types/unit.ts`).

**How to avoid:** Use `!!unit.is_active_project` for boolean checks. When sending mutations from StatusPopover, only send `status_painting` — no boolean coercion needed. For delete dialog and detail sheet, use `!!` coercion consistently.

**Warning signs:** TypeScript strict mode will catch `boolean` vs `0 | 1` mismatches in mutation payloads — treat these as real errors.

### Pitfall 2: COALESCE prevents clearing nullable fields

**What goes wrong:** `updateUnit` SQL uses `COALESCE($param, column)`. If you send `null` for a field, COALESCE keeps the existing DB value — you cannot clear a field to NULL via the current `updateUnit` function.

**Why it happens:** The COALESCE pattern was designed for partial updates (only send what changed).

**How to avoid:** For the status popover, only send `{ id, status_painting: newStatus }` — all other fields will be `?? null` which COALESCE handles correctly by keeping their current values. This is the correct partial-update pattern.

**Warning signs:** Only matters for "clear this optional field" flows — not relevant to Phase 3 (status update only sends the status field).

### Pitfall 3: Faction data absent from units query

**What goes wrong:** `getUnits()` is `SELECT * FROM units` — no faction name or color_theme. Attempting to access `unit.faction_name` or `unit.color_theme` returns `undefined`.

**Why it happens:** Units table only stores `faction_id` FK, not denormalized faction data.

**How to avoid:** Always fetch `useFactions()` alongside `useUnits()` and build a `Map<number, Faction>` lookup. Both queries are cached by TanStack Query; the combined data cost is minimal.

**Warning signs:** Faction badge renders blank or throws if faction lookup returns undefined — add null-guard: `if (!faction) return null`.

### Pitfall 4: Nested Sheet z-index / portal stacking

**What goes wrong:** Mounting `<UnitSheet>` inside `<SheetContent>` of the detail Sheet causes Radix Portal stacking issues — the edit Sheet may appear behind the detail Sheet, or focus management breaks.

**Why it happens:** Radix UI `Sheet` uses a Portal that appends to `<body>`. Two nested Portals can conflict in stacking order.

**How to avoid:** Mount `UnitSheet` and `UnitDeleteDialog` as siblings of `UnitDetailSheet` in `CollectionPage`, not as children of `SheetContent`. The detail Sheet closes or stays open while edit Sheet opens — both live at the same DOM level.

### Pitfall 5: Row click event propagating to action buttons

**What goes wrong:** Clicking the "Delete" icon button in the Actions column also fires the row's `onClick` handler, causing the detail Sheet to open simultaneously with the delete dialog.

**Why it happens:** Event bubbling — `<TableRow onClick={openDetail}>` captures all clicks including those on child buttons.

**How to avoid:** In the Actions column cell renderer, call `event.stopPropagation()` on button clicks. Example:
```typescript
<Button onClick={(e) => { e.stopPropagation(); onDelete(unit); }}>
  <Trash2 className="h-4 w-4" aria-label={`Delete ${unit.name}`} />
</Button>
```

### Pitfall 6: Stale selected unit in detail Sheet when units refetch

**What goes wrong:** User opens detail Sheet for unit A, status update fires, TanStack Query invalidates `["units"]` and refetches. The `selectedUnit` state in CollectionPage still holds the old snapshot — Sheet shows stale data.

**Why it happens:** `useState<Unit | null>` holds a reference to the unit at the time of click; invalidation doesn't update this state.

**How to avoid:** Keep `selectedUnitId: number | null` in state (not the full unit object). Derive the current unit with `useMemo(() => units?.find(u => u.id === selectedUnitId), [units, selectedUnitId])`. This way the detail Sheet always shows post-refetch data.

---

## Code Examples

### SortableHeader helper

```typescript
// Pattern from UI-SPEC: ChevronUp / ChevronDown / ChevronsUpDown for sort state
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { Column } from "@tanstack/react-table";

function SortableHeader<T>({ column, label }: { column: Column<T>; label: string }) {
  const sorted = column.getIsSorted();
  return (
    <button
      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground"
      onClick={() => column.toggleSorting(sorted === "asc")}
      aria-label={`Sort by ${label}${sorted === "asc" ? " (A–Z)" : sorted === "desc" ? " (Z–A)" : ""}`}
    >
      {label}
      {sorted === "asc" ? (
        <ChevronUp className="h-3 w-3" />
      ) : sorted === "desc" ? (
        <ChevronDown className="h-3 w-3" />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}
```

### Pagination controls

```typescript
// UI-SPEC: "< Prev [page N of M] Next >" with Button variant="outline" size="sm"
<div className="flex items-center justify-end gap-2 py-2">
  <Button
    variant="outline"
    size="sm"
    onClick={() => table.previousPage()}
    disabled={!table.getCanPreviousPage()}
  >
    Prev
  </Button>
  <span className="text-sm text-muted-foreground">
    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
  </span>
  <Button
    variant="outline"
    size="sm"
    onClick={() => table.nextPage()}
    disabled={!table.getCanNextPage()}
  >
    Next
  </Button>
</div>
```

### Active-only toggle button

```typescript
// UI-SPEC: variant changes on active state; same label text both states
<Button
  variant={activeOnly ? "default" : "outline"}
  size="sm"
  onClick={toggleActiveOnly}
>
  Active only
</Button>
```

### Skeleton loading rows

```typescript
// UI-SPEC: 5 skeleton rows; table header stays visible; filter bar stays interactive
{isLoading && (
  <TableBody>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell colSpan={columns.length}>
          <Skeleton className="h-10 w-full" />
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-table v6 (imperative) | TanStack Table v8 (headless hooks) | 2021 v7, 2022 v8 | Fully composable with any UI library |
| Zustand v4 `create()` with Provider | Zustand v5 `create()` (no Provider) | 2024 | Simpler — no ZustandProvider wrapper needed |
| TanStack Query v4 `useQuery` | TanStack Query v5 (already in project) | 2023 | `isPending` replaces `isLoading` for mutations |

**Deprecated/outdated:**
- `react-table` (v6/v7 package name): replaced by `@tanstack/react-table`. Do NOT install `react-table`.
- Zustand v4's `createContext()` helper: not needed in v5.
- `@tanstack/react-table` `filterRows` API (v7): v8 uses `getFilteredRowModel()` + column `filterFn`.

---

## Open Questions

1. **Clear filters button text placement**
   - What we know: UI-SPEC specifies "Clear filters" as `variant="ghost" size="sm"` positioned right of filter row, visible only when any filter active.
   - What's unclear: Whether it should be `justify-end` or right-aligned within the flex row.
   - Recommendation: Use `ml-auto` within the filter flex row to push it to the right end.

2. **UnitDeleteDialog copy mismatch**
   - What we know: Existing `UnitDeleteDialog` has description text "This will permanently delete [name]" and confirm button "Delete". UI-SPEC specifies "Delete unit?" title, longer body copy, and "Delete unit" confirm button.
   - What's unclear: Whether to update the existing component or extend it for Phase 3.
   - Recommendation: The existing `UnitDeleteDialog` is used by FactionsPage too. Extend the component to accept optional `title`/`description`/`confirmLabel` props, defaulting to Phase 2 values; Phase 3 callers pass the Phase 3 copy. This keeps backward compatibility.

3. **selectedUnitId driving detail Sheet**
   - What we know: Keeping `selectedUnitId` in state (rather than full `Unit`) prevents stale Sheet data after refetch.
   - What's unclear: Whether `useUnits()` is already fetched at the page level or needs a second call from within the detail Sheet.
   - Recommendation: Fetch once at `CollectionPage` level, derive `selectedUnit` from it. Pass `selectedUnit` down to `UnitDetailSheet` as a prop.

---

## Validation Architecture

### Test Framework

No test framework is currently installed (no vitest, jest, or testing-library in package.json, no test directories). `nyquist_validation` is enabled in config.json.

| Property | Value |
|----------|-------|
| Framework | None installed — Wave 0 must add vitest + @testing-library/react |
| Config file | None — Wave 0 creates `vitest.config.ts` |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COLL-02 | Name search live-filters rows | unit | `pnpm vitest run tests/collection/unitFilters.test.ts -t "search"` | Wave 0 |
| COLL-03 | Faction multi-select filters rows | unit | `pnpm vitest run tests/collection/unitFilters.test.ts -t "faction"` | Wave 0 |
| COLL-04 | Status multi-select filters rows | unit | `pnpm vitest run tests/collection/unitFilters.test.ts -t "status"` | Wave 0 |
| COLL-05 | Category multi-select filters rows | unit | `pnpm vitest run tests/collection/unitFilters.test.ts -t "category"` | Wave 0 |
| COLL-06 | Active-only toggle filters rows | unit | `pnpm vitest run tests/collection/unitFilters.test.ts -t "active"` | Wave 0 |
| COLL-07 | Zustand store updates correctly | unit | `pnpm vitest run tests/collection/collectionFilters.test.ts` | Wave 0 |
| COLL-10 | Optimistic status update + rollback | unit | `pnpm vitest run tests/collection/StatusPopover.test.ts` | Wave 0 |
| COLL-12 | Empty state renders when no units | unit | `pnpm vitest run tests/collection/UnitTable.test.ts -t "empty"` | Wave 0 |
| COLL-09 | Detail Sheet opens on row click | integration | manual — Tauri WebView required | manual |
| COLL-01 | Table sorts and paginates | integration | manual — TanStack Table interaction | manual |
| POLISH-01 | Delete confirm appears before delete | integration | manual — dialog interaction in browser | manual |
| POLISH-02 | Skeleton renders during isLoading | unit | `pnpm vitest run tests/collection/UnitTable.test.ts -t "loading"` | Wave 0 |
| POLISH-04 | key={unit.id} prevents stale Sheet | manual | manual — switch units, verify form data resets | manual |
| POLISH-05 | Faction badge uses color_theme | unit | `pnpm vitest run tests/collection/UnitTable.test.ts -t "faction badge"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run tests/collection/ --reporter=verbose`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/collection/unitFilters.test.ts` — covers COLL-02 through COLL-06 (pre-filter logic)
- [ ] `tests/collection/collectionFilters.test.ts` — covers COLL-07 Zustand store
- [ ] `tests/collection/StatusPopover.test.ts` — covers COLL-10 optimistic + rollback
- [ ] `tests/collection/UnitTable.test.ts` — covers COLL-12 empty state, POLISH-02 skeleton, POLISH-05 badge
- [ ] `vitest.config.ts` — framework config
- [ ] `tests/setup.ts` — shared test setup (jsdom, testing-library matchers)
- [ ] Framework install: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom`

---

## Sources

### Primary (HIGH confidence)
- `package.json` (project) — confirmed `@tanstack/react-table` and `zustand` NOT installed; all shadcn UI components ARE installed
- `src/features/units/CategoryCombobox.tsx` — Popover + Command + shouldFilter pattern confirmed as template for StatusPopover
- `src/hooks/useUnits.ts` — `useUpdateUnit` mutation structure confirmed; no `onMutate`/`onError` for optimistic
- `src/db/queries/units.ts` — COALESCE pattern confirmed; getUnits() is SELECT * (no JOIN)
- `src/types/unit.ts` — `0 | 1` boolean type confirmed; `PAINTING_STATUS_ORDER` confirmed
- npm registry — `@tanstack/react-table` 8.21.3 (latest), `zustand` 5.0.12 (latest), React 19 peer dep satisfied

### Secondary (MEDIUM confidence)
- TanStack Table v8 public API — `useReactTable`, `getCoreRowModel`, `getSortedRowModel`, `getPaginationRowModel`, `getFilteredRowModel`, `flexRender`, `ColumnDef` — confirmed against npm package description and peer deps; full API docs not fetched but v8 has been stable since 2022

### Tertiary (LOW confidence — for validation)
- Zustand v5 `create()` no-Provider API — confirmed by npm package description; specific v5 API surface not fetched from official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed versions from npm registry; both packages not yet in project
- Architecture: HIGH — directly derived from existing code patterns (CategoryCombobox, FactionsPage, useUnits) and project decisions in CONTEXT.md
- Pitfalls: HIGH — Pitfalls 1-4 confirmed from existing codebase (types, SQL, Phase 2 patterns); Pitfalls 5-6 are common React patterns

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (stable libraries; TanStack Table v8 has been stable for 2+ years)
