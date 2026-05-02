# Phase 8: Army List Builder - Research

**Researched:** 2026-05-02
**Domain:** React/TypeScript UI — Army list CRUD, sibling portal pattern, Command palette unit picker, pre-delete warning
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Card-based layout on ArmyListsPage (not a table); each card shows name, faction name, list type badge, total points/limit, battle-ready %
- "New List" button opens a Sheet form (ArmyListSheet) — consistent with UnitSheet/PaintSheet pattern
- Units displayed as compact table rows inside ArmyListDetailSheet (not cards)
- Summary bar between list header and unit table: total points, painted points, battle-ready % — always visible, pinned
- Per-unit points override: inline number input in "Points" column; blank = inherit `unit.points`; saves on blur or Enter; effective_points comes from SQL (COALESCE in SQL, never in JS)
- Per-unit notes: collapsed by default, expand on click (ChevronDown icon)
- "Add Unit" button inside ArmyListDetailSheet opens a Command palette wrapped in a Dialog — rendered as SIBLING to the Sheet at the root layout level (NOT nested inside the Sheet)
- Unit picker pre-filters to units matching the list's `faction_id` by default
- Selecting a unit adds immediately and keeps palette open; user closes manually
- Enhanced UnitDeleteDialog: pre-check for army list membership; two-step flow when count > 0 (shows list names, "Delete Anyway" destructive); unchanged when count = 0
- `ON DELETE CASCADE` on `army_list_units.unit_id` handles DB cleanup — no manual query needed

### Claude's Discretion

- Per-unit notes field visibility (inline always vs expand on click) — spec resolved: collapsed by default, expand with ChevronDown
- List-level notes field placement (below header, above units, or footer area) — spec resolved: below unit table, above SheetFooter, with "Save notes" button and "List notes" label
- Exact card dimensions and grid column count for ArmyListsPage — spec resolved: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`
- Column order in detail sheet unit table — spec resolved: Unit Name | Status badge | Points (inline input) | Notes (expand icon) | Remove
- Whether to show a faction filter or sort option on ArmyListsPage above the card grid — not specified, omit unless time permits

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARMY-01 | User can create an army list with name, faction, list type tag, and notes | ArmyListSheet (create mode) using `useCreateArmyList`; `CreateArmyListInput` type; faction Select from `useFactions` |
| ARMY-02 | User can add units from collection to a list and remove them; each unit shows painting status badge and assembled status | `useAddUnitToList`, `useRemoveUnitFromList`; Command palette (Dialog+Command); `ArmyListUnitRow.status_painting`, `painting_percentage` from `getArmyListWithUnits` |
| ARMY-03 | Per-unit points override; blank falls back to `unit.points`; effective points computed via `COALESCE(points_override, unit.points, 0)` in SQL | `updateArmyListUnit` full-replacement UPDATE (NULL-passthrough); `effective_points` field on `ArmyListUnitRow`; inline `<Input type="number">` saves on blur/Enter |
| ARMY-04 | Per-list notes and per-unit-in-list notes both save without leaving the detail sheet | `useUpdateArmyList` for list notes (Save notes button); `useUpdateArmyListUnit` for per-unit notes (auto-save on collapse or explicit action); `UpdateArmyListUnitInput` nullable notes field |
| ARMY-05 | Unit delete warns by count when unit belongs to active army lists | New `getArmyListsByUnitId(unitId)` query in `armyLists.ts`; enhanced `UnitDeleteDialog` with two-step flow; `useQuery` to pre-fetch membership |
| ARMY-06 | Empty state with CTA when no lists exist | `ArmyListsPage` loading/error/empty/populated states; empty state heading and CTA copy from UI-SPEC |
| ARMY-07 | Sidebar nav entry and `/army-lists` route | Add `{ to: "/army-lists", label: "Army Lists", icon: ClipboardList }` to `MAIN_NAV` in `AppSidebar.tsx`; add `armyListsRoute` to `router.tsx` |
</phase_requirements>

---

## Summary

Phase 8 is a pure UI phase — the entire data layer (schema, queries, hooks) was built and verified in Phase 6. All mutations are pre-wired in `src/hooks/useArmyLists.ts` and all query contracts are in `src/db/queries/armyLists.ts`. The implementation work is: (1) building the ArmyListsPage with card grid, (2) building ArmyListDetailSheet with pinned summary bar, unit table, per-unit points override, per-unit notes, and list-level notes, (3) building ArmyListSheet (create/edit form), (4) wiring a sibling Dialog+Command unit picker, (5) wiring the ArmyListDeleteDialog, (6) enhancing UnitDeleteDialog with army list membership pre-check, and (7) adding the route and sidebar nav entry.

The one data layer gap is `getArmyListsByUnitId(unitId)` — needed for the UnitDeleteDialog pre-check. This query does not exist in `armyLists.ts` yet and must be added in Wave 0 or the first plan that touches it. The `updateArmyList` query uses COALESCE for the list-level update (name, faction, notes) but `updateArmyListUnit` uses full-replacement NULL passthrough — these serve different purposes and must NOT be confused.

The critical architectural constraint is the Sibling Sheet/Dialog portal pattern: no Radix portal (Sheet, Dialog, Command) may be nested inside another. The unit picker Command must be wrapped in a Dialog and rendered as a sibling at the ArmyListsPage root, not inside ArmyListDetailSheet. This is established precedent from CollectionPage and is non-negotiable.

**Primary recommendation:** Follow CollectionPage.tsx exactly for page-level state management (selectedListId pattern, sibling portals, `key` props). The ArmyListDetailSheet is the structural analog of UnitDetailSheet; the ArmyListSheet is the analog of UnitSheet/PaintSheet.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React + TypeScript | 18.x / 5.x | Component layer | Project standard |
| @tanstack/react-query | 5.x | Server-state cache | All hooks use this; ARMY_LISTS_KEY pattern established |
| Zustand | 4.x | Ephemeral filter/UI state | collectionFilters / paintInventoryFilters pattern |
| shadcn (new-york/zinc) | n/a | UI components | All components pre-installed; no new installs needed |
| lucide-react | latest | Icons | Established across all feature files |
| react-hook-form + zod | 7.x / 3.x | Form validation | UnitSheet / PaintSheet established this pattern |
| sonner | latest | Toast notifications | Toaster in AppLayout; all mutations use it |
| tauri-plugin-sql | 2.x | SQLite access | All queries via `getDb()` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest + @testing-library/react | latest | Test suite | All new query functions need unit tests; Command palette interaction needs component tests |
| @hookform/resolvers/zod | 3.x | Form schema binding | Use for ArmyListSheet form (same pattern as paintSchema) |

### Alternatives Considered

None — all choices are locked by project precedent.

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/features/army-lists/
├── ArmyListsPage.tsx          # Page root — selectedListId, sibling portals
├── ArmyListCard.tsx            # Card component (card grid item)
├── ArmyListDetailSheet.tsx     # View/manage units in a list
├── ArmyListSheet.tsx           # Create/edit form (Sheet)
├── ArmyListDeleteDialog.tsx    # Confirm delete list
├── ArmyListUnitRow.tsx         # Table row with inline points input + notes expand
├── ArmyListSummaryBar.tsx      # Pinned stats band (total pts, painted pts, battle-ready %)
└── UnitPickerDialog.tsx        # Sibling Dialog wrapping Command palette

src/db/queries/armyLists.ts    # ADD: getArmyListsByUnitId (new query for pre-delete check)
src/features/units/
└── UnitDeleteDialog.tsx        # ENHANCE: two-step warning state
src/components/common/
└── AppSidebar.tsx              # ADD: Army Lists nav entry
src/app/router.tsx             # ADD: armyListsRoute
```

### Pattern 1: selectedListId (page-level state)

**What:** Store the selected list's ID in `useState`, derive the full list object from the cache.
**When to use:** Any page that opens a detail Sheet on row/card click.

```typescript
// Mirrors CollectionPage.tsx lines 48-52
const [selectedListId, setSelectedListId] = useState<number | null>(null);
const { data: allLists } = useArmyLists();
const selectedList = useMemo(
  () => selectedListId !== null ? (allLists ?? []).find((l) => l.id === selectedListId) ?? null : null,
  [allLists, selectedListId]
);
```

### Pattern 2: Sibling Portal Pattern (non-negotiable)

**What:** All Radix portals (Sheet, Dialog) rendered as siblings at the page root, never nested.
**When to use:** Everywhere. Nesting Radix portals breaks focus management and z-index stacking.

```tsx
// ArmyListsPage.tsx root return — mirrors CollectionPage.tsx lines 137-159
return (
  <div className="flex flex-col gap-6 p-6">
    {/* page content */}

    {/* SIBLINGS — not nested */}
    <ArmyListDetailSheet
      key={selectedList?.id ?? "none-detail"}
      open={selectedListId !== null}
      list={selectedList}
      onClose={() => setSelectedListId(null)}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onAddUnit={() => setUnitPickerOpen(true)}
    />
    <ArmyListSheet
      key={editingList?.id ?? "new-edit"}
      open={sheetOpen}
      list={editingList}
      onClose={closeSheet}
    />
    <ArmyListDeleteDialog
      key={deletingList?.id ?? "none-delete"}
      open={deleteDialogOpen}
      list={deletingList}
      onClose={closeDeleteDialog}
    />
    {/* Unit picker — Dialog wrapping Command, triggered from within the detail sheet */}
    <UnitPickerDialog
      open={unitPickerOpen}
      listId={selectedListId}
      factionId={selectedList?.faction_id ?? null}
      onClose={() => setUnitPickerOpen(false)}
    />
  </div>
);
```

### Pattern 3: Per-Unit Points Override Input

**What:** Uncontrolled-ish number input that saves on blur/Enter; empty string maps to null (clear override).
**Critical:** `updateArmyListUnit` is full-replacement (NOT COALESCE). Passing `points_override: null` clears back to inherited.

```typescript
// ArmyListUnitRow — points override save handler
function handlePointsBlur(alu: ArmyListUnitRow, rawValue: string) {
  const numeric = rawValue === "" ? null : Number(rawValue);
  updateArmyListUnit.mutate({
    id: alu.id,
    list_id: alu.list_id,
    points_override: numeric,
    notes: alu.notes,  // preserve existing notes
  });
}
// Input element
<Input
  type="number"
  className="w-20 h-7 text-sm"
  placeholder="—"
  defaultValue={alu.points_override ?? ""}
  onBlur={(e) => handlePointsBlur(alu, e.target.value)}
  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
/>
```

### Pattern 4: Summary Bar Calculation

**What:** Sum `effective_points` across all `ArmyListUnitRow` entries. SQL computes it; never recompute in JS.
**When to use:** Inside ArmyListDetailSheet, recalculates automatically when `useArmyListWithUnits` cache invalidates.

```typescript
// Derive from cached data — never add COALESCE logic in JS
const totalPoints = useMemo(
  () => (units ?? []).reduce((sum, u) => sum + u.effective_points, 0),
  [units]
);
const paintedPoints = useMemo(
  () => (units ?? []).reduce((sum, u) => u.status_painting === "Complete" ? sum + u.effective_points : sum, 0),
  [units]
);
const battleReadyPct = totalPoints > 0 ? Math.round((paintedPoints / totalPoints) * 100) : 0;
```

Note: "battle-ready" for points purposes uses `status_painting === "Complete"` (or painting_percentage === 100). Verify against seed data / existing usage — `status_painting` is a string field ("Not Started", "In Progress", "Complete", etc.). Check existing CollectionPage/Dashboard for the exact string values used.

### Pattern 5: Pre-Delete Warning (UnitDeleteDialog enhancement)

**What:** Query army list membership when the dialog opens; show warning state if count > 0.
**New query needed:** `getArmyListsByUnitId(unitId)` — returns `{ id: number; name: string }[]`.

```typescript
// Add to src/db/queries/armyLists.ts
export async function getArmyListsByUnitId(unitId: number): Promise<{ id: number; name: string }[]> {
  const db = await getDb();
  return db.select<{ id: number; name: string }[]>(
    `SELECT al.id, al.name
     FROM army_list_units alu
     JOIN army_lists al ON al.id = alu.list_id
     WHERE alu.unit_id = $1`,
    [unitId]
  );
}
```

UnitDeleteDialog enhancement — add useQuery inside the dialog, conditional render:

```typescript
// Within enhanced UnitDeleteDialog
const { data: memberLists = [] } = useQuery({
  queryKey: ["unit-army-lists", unit?.id],
  queryFn: () => unit ? getArmyListsByUnitId(unit.id) : Promise.resolve([]),
  enabled: open && unit !== null,
});

const isInLists = memberLists.length > 0;
// Render warning state if isInLists, simple confirm otherwise
```

### Pattern 6: Command Palette Unit Picker

**What:** Dialog wrapping Command; pre-filtered by faction_id; adds unit on select, stays open.
**The key insight:** `cmdk` (used by shadcn Command) requires `ResizeObserver` and `scrollIntoView` polyfills — both are already in `tests/setup.ts`, so tests work without additional setup.

```tsx
// UnitPickerDialog — simplified structure
<Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
  <DialogContent className="p-0 sm:max-w-[480px]">
    <Command>
      <CommandInput placeholder="Search units..." />
      <CommandList>
        <CommandEmpty>No units found in this faction.</CommandEmpty>
        <CommandGroup>
          {filteredUnits.map((unit) => (
            <CommandItem
              key={unit.id}
              value={unit.name}
              onSelect={() => {
                addUnitToList.mutate({ list_id: listId!, unit_id: unit.id });
                // Do NOT close — keep open for multi-add
              }}
            >
              {unit.name}
              <Badge variant="secondary" className="ml-auto">{unit.category}</Badge>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </DialogContent>
</Dialog>
```

### Pattern 7: ArmyListSheet (create/edit form)

**What:** Standard Sheet form, mirrors PaintSheet/UnitSheet.
**Fields:** Name (required), Faction (Select, nullable), List Type (Select: Casual/Learning/Narrative/Competitive/Test), Points Limit (number, optional), Notes (Textarea, optional).

```typescript
// src/features/army-lists/armyListSchema.ts
import { z } from "zod";
export const armyListSchema = z.object({
  name: z.string().min(1, "Name is required"),
  faction_id: z.number().nullable(),
  list_type: z.string().nullable(),
  points_limit: z.number().nullable(),
  notes: z.string().nullable(),
});
export type ArmyListFormValues = z.infer<typeof armyListSchema>;
```

### Anti-Patterns to Avoid

- **Nesting Radix portals:** Never put `<Dialog>` or `<Sheet>` inside `<SheetContent>`. Always render at page root as siblings.
- **COALESCE in JS for points:** `effective_points` is computed in SQL. Never re-implement `COALESCE(points_override, unit.points, 0)` in JavaScript.
- **Using COALESCE in `updateArmyListUnit`:** This is full-replacement — both `points_override` AND `notes` must be passed every time. If you only update `notes`, still pass the current `points_override` value.
- **Forgetting `key` prop on sibling portals:** `key={selectedList?.id ?? "none-detail"}` forces fresh mount when switching lists, preventing stale form/scroll state.
- **Using `INSERT OR IGNORE` for `addUnitToList`:** Duplicates are intentionally allowed (same unit can appear multiple times in a list). No ON CONFLICT clause.
- **Calling `updateArmyList` to save per-unit notes:** Per-unit notes go through `updateArmyListUnit` (army_list_units row). List-level notes go through `updateArmyList` (army_lists row).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom alert system | `toast.success / toast.error` from sonner | Already wired in AppLayout |
| Form validation | Manual input checks | `react-hook-form` + `zod` + `@hookform/resolvers/zod` | Pattern from UnitSheet/PaintSheet |
| Search/filter in Command | Custom filter logic | `CommandInput` + shadcn `Command` filtering | cmdk handles filtering natively by `value` prop |
| Query cache invalidation | Manual re-fetches | `qc.invalidateQueries` patterns already in useArmyLists.ts | All mutations pre-wired |
| Points calculation | JS COALESCE | `effective_points` from SQL | DB already computes it correctly |
| Skeleton loading | Custom shimmer CSS | `<Skeleton>` component from shadcn | Already installed |

**Key insight:** The entire data layer is pre-built and verified (Phase 6, 157 tests green). The only new data work is `getArmyListsByUnitId` (one SELECT query) plus the corresponding hook or inline query usage.

---

## Common Pitfalls

### Pitfall 1: Nested Radix Portals

**What goes wrong:** ArmyListDetailSheet opens; user clicks "Add Unit"; if UnitPickerDialog is rendered inside SheetContent, the Dialog portal conflicts with the Sheet portal — focus trapping breaks, backdrop z-index is wrong, Escape key behavior is unpredictable.
**Why it happens:** Developers put the Dialog where it logically belongs (near the trigger), not where it architecturally must live.
**How to avoid:** `unitPickerOpen` state lives at ArmyListsPage level. "Add Unit" button calls `onAddUnit()` prop passed down from the page. UnitPickerDialog renders as a sibling at the page root.
**Warning signs:** Dialog opens behind the Sheet, or closing the Dialog also closes the Sheet.

### Pitfall 2: Stale `points_override` on Save

**What goes wrong:** User edits points but not notes. Handler sends `{ id, list_id, points_override: newValue, notes: undefined }`. The full-replacement UPDATE sets `notes = undefined` (likely undefined / runtime error or clears notes).
**Why it happens:** `updateArmyListUnit` is NOT COALESCE — both fields must be in every call.
**How to avoid:** `ArmyListUnitRow` has the current values. Always read `alu.notes` from the row and pass it alongside the changed field: `{ id: alu.id, list_id: alu.list_id, points_override: newValue, notes: alu.notes }`.

### Pitfall 3: `faction_id` nullable in army list

**What goes wrong:** Pre-filtering the Command palette by `faction_id` — if the list has `faction_id: null`, `units.filter(u => u.faction_id === null)` will match nothing useful, or worse, mis-filter.
**Why it happens:** `army_lists.faction_id` is nullable (SET NULL on faction delete).
**How to avoid:** When `selectedList.faction_id === null`, show ALL units in the picker (no faction filter), or show an inline note that all units are shown because no faction is set.

### Pitfall 4: `status_painting` string matching for battle-ready

**What goes wrong:** Battle-ready % calculates to 0% or 100% unexpectedly.
**Why it happens:** The exact string value for "fully painted" is `"Complete"` (from `PAINTING_STATUS_ORDER`). Do not compare against `"Painted"`, `"Done"`, `"100%"`, etc.
**How to avoid:** Check `unit.status_painting === "Complete"` OR use `painting_percentage === 100` — both are available on `ArmyListUnitRow`. Decide one approach and use it consistently.

### Pitfall 5: `updateArmyList` COALESCE does not clear notes

**What goes wrong:** User deletes all text from the list-level notes field and saves. Because `updateArmyList` uses `COALESCE($6, notes)`, passing `null` or `""` does not clear the notes.
**Why it happens:** List-level COALESCE pattern (partial update) vs. unit-row full-replacement pattern.
**How to avoid:** For list-level notes save, if the field is blank, pass `""` (empty string) not `null` — the COALESCE will retain the old value if null. Alternatively, treat empty string as "no notes" in the UI and never send null for notes in the save handler. Confirm behavior in a quick smoke test.

### Pitfall 6: `key` prop omission on ArmyListSheet in edit mode

**What goes wrong:** User opens "Edit List A", form shows A's data. User closes, opens "Edit List B", form still shows A's data.
**Why it happens:** React reuses the component instance; `useEffect` reset only fires if deps change.
**How to avoid:** `<ArmyListSheet key={editingList?.id ?? "new-edit"} ... />` — identical to the existing `UnitSheet key` pattern.

---

## Code Examples

Verified patterns from existing source files:

### Page-level state (CollectionPage.tsx — direct model)

```typescript
// src/features/units/CollectionPage.tsx lines 48-60
const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
const selectedUnit = useMemo(
  () => (selectedUnitId !== null ? (units ?? []).find((u) => u.id === selectedUnitId) ?? null : null),
  [units, selectedUnitId]
);
const [editSheetOpen, setEditSheetOpen] = useState(false);
const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
```

### Sheet structure (UnitDetailSheet.tsx — model for ArmyListDetailSheet)

```typescript
// src/features/units/UnitDetailSheet.tsx lines 67-73
<Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
  <SheetContent
    side="right"
    key={unit?.id ?? "none"}
    className="overflow-y-auto sm:max-w-md"
  >
```

ArmyListDetailSheet should use `className="overflow-y-auto sm:max-w-[600px]"` (wider per UI-SPEC).

### Form structure (PaintSheet.tsx / UnitSheet.tsx — model for ArmyListSheet)

```typescript
// PaintSheet.tsx pattern — useEffect reset + zodResolver
const form = useForm<ArmyListFormValues>({
  resolver: zodResolver(armyListSchema),
  defaultValues: buildDefaultValues(list),
});
useEffect(() => {
  form.reset(buildDefaultValues(list));
}, [list, form]);
```

### Mutation hook shape (useArmyLists.ts — lines 55-64)

```typescript
export function useCreateArmyList() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateArmyListInput>({
    mutationFn: createArmyList,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
```

### UpdateArmyListUnitVariables shape (useArmyLists.ts — lines 132-145)

```typescript
export interface UpdateArmyListUnitVariables extends UpdateArmyListUnitInput {
  list_id: number;  // needed for targeted invalidation
}
// mutationFn destructures out list_id before passing to query:
mutationFn: ({ list_id: _list_id, ...rest }) => updateArmyListUnit(rest),
```

### ResizeObserver polyfill already in place (tests/setup.ts)

```typescript
// tests/setup.ts — polyfills for cmdk (Command) in jsdom
globalThis.ResizeObserver = class ResizeObserver { observe(){} unobserve(){} disconnect(){} }
Element.prototype.scrollIntoView = function () {};
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Derive object from ID on every query | Cache ID in state, derive object from cached list | Phase 3 established this; must be followed |
| Optimistic toggle with setQueryData | Only on owned toggle (paint); army list mutations use plain invalidate | Army list mutations don't need optimistic — no inline toggle |
| Nested dialog in sheet | Sibling portal pattern | Non-negotiable; established Phase 3 |

---

## Open Questions

1. **Battle-ready threshold for points**
   - What we know: `ArmyListUnitRow` has both `status_painting` (string) and `painting_percentage` (number)
   - What's unclear: Should painted points count units where `status_painting === "Complete"` or `painting_percentage === 100`? These can differ if a user has 100% painting_percentage but status is "In Progress"
   - Recommendation: Use `status_painting === "Complete"` — it's the canonical "done" state. Document in code.

2. **`updateArmyList` COALESCE and clearing notes**
   - What we know: The query uses `COALESCE($6, notes)` — passing null won't clear notes
   - What's unclear: Is the intended behavior to support clearing list notes to empty?
   - Recommendation: Treat empty string as the "no notes" state in the form. Never pass null for notes to `updateArmyList` — pass `""` for empty. Add a comment in the save handler.

3. **Faction filter on ArmyListsPage**
   - What we know: CONTEXT.md marks this as Claude's discretion; UI-SPEC does not specify a filter bar for the page
   - What's unclear: Should there be a faction filter above the card grid?
   - Recommendation: Omit from initial implementation. The card grid is small enough that a visual scan is sufficient. Can be added in a later phase.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

Current baseline: 21 test files, 157 tests, all passing (verified 2026-05-02).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARMY-01 | `createArmyList` INSERT SQL and returned ID | unit | `npx vitest run tests/army-list/armyListQueries.test.ts -t "createArmyList"` | Wave 0 |
| ARMY-02 | `addUnitToList` INSERT; `removeUnitFromList` DELETE; `getArmyListWithUnits` JOIN | unit | `npx vitest run tests/army-list/armyListQueries.test.ts` | Wave 0 (extends existing) |
| ARMY-03 | `updateArmyListUnit` full-replacement, null clears | unit | `npx vitest run tests/army-list/armyListQueries.test.ts -t "updateArmyListUnit"` | Already exists (`tests/foundation/armyListQueries.test.ts`) |
| ARMY-04 | Per-unit notes and list notes save | unit (query) + component | `npx vitest run tests/army-list/` | Wave 0 |
| ARMY-05 | `getArmyListsByUnitId` returns correct list names | unit | `npx vitest run tests/army-list/armyListQueries.test.ts -t "getArmyListsByUnitId"` | Wave 0 |
| ARMY-05 | UnitDeleteDialog renders warning state when lists returned | component | `npx vitest run tests/army-list/UnitDeleteDialog.test.tsx` | Wave 0 |
| ARMY-06 | ArmyListsPage renders empty state | component | `npx vitest run tests/army-list/ArmyListsPage.test.tsx` | Wave 0 |
| ARMY-07 | `/army-lists` route registered; nav entry present | manual smoke test | — | Manual |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose` (full suite, <10s)
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/army-list/armyListQueries.test.ts` — covers `getArmyListsByUnitId` (new query); the existing foundation file (`tests/foundation/armyListQueries.test.ts`) already covers the other query functions and should NOT be duplicated
- [ ] `tests/army-list/UnitDeleteDialog.test.tsx` — covers ARMY-05 warning state (two-step flow)
- [ ] `tests/army-list/ArmyListsPage.test.tsx` — covers ARMY-06 empty state, loading state, card render

---

## Sources

### Primary (HIGH confidence)

All findings are derived from direct code inspection of the existing codebase — no external sources required. All contracts are confirmed from:

- `src/hooks/useArmyLists.ts` — all mutation hooks, query keys, `RemoveUnitFromListInput`, `UpdateArmyListUnitVariables`
- `src/db/queries/armyLists.ts` — all query SQL contracts; full-replacement vs COALESCE distinction confirmed
- `src/types/armyList.ts` — `ArmyListUnitRow` shape including `effective_points`, `status_painting`, `painting_percentage`
- `src/features/units/CollectionPage.tsx` — selectedUnitId pattern, sibling portal render order
- `src/features/units/UnitDetailSheet.tsx` — Sheet structure, SheetHeader/SheetFooter pattern
- `src/features/units/UnitDeleteDialog.tsx` — existing dialog to enhance
- `src/features/units/UnitSheet.tsx` — form pattern (react-hook-form + zod + useEffect reset)
- `src/features/paints/PaintsPage.tsx` — filter state pattern, optimistic toggle pattern
- `src/features/paints/PaintSheet.tsx` — sheet form pattern
- `src/components/common/AppSidebar.tsx` — MAIN_NAV array structure; `ClipboardList` or `ListChecks` icon needed
- `src/app/router.tsx` — flat route registration pattern
- `tests/setup.ts` — ResizeObserver + scrollIntoView polyfills confirmed for Command tests
- `vitest.config.ts` — test framework config confirmed
- `.planning/phases/08-army-list-builder/08-CONTEXT.md` — locked decisions
- `.planning/phases/08-army-list-builder/08-UI-SPEC.md` — layout contracts, copy, spacing
- `.planning/config.json` — `nyquist_validation: true` confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries pre-installed and in active use
- Architecture: HIGH — all patterns verified from existing source files; no speculation
- Pitfalls: HIGH — derived from explicit decisions in STATE.md and code contracts
- Validation: HIGH — test infrastructure live (157 tests passing); Wave 0 gaps are additive only

**Research date:** 2026-05-02
**Valid until:** 2026-06-02 (stable stack; library versions not changing)
