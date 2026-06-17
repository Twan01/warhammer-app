# Phase 134: No Dead Ends - Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 7 (5 modified, 1 new, 1 new test set)
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/rules-hub/RulesHubPage.tsx` | component (page) | request-response | Same file (Stratagems/Detachments tab blocks within it) | exact — same tab pattern, same hook shape |
| `src/features/units/CollectionFactionLinkDialog.tsx` | component (dialog) | request-response | `src/features/unit-database/FactionLinkDialog.tsx` | role-match (inverted direction, string IDs instead of number) |
| `src/features/units/PlaybookStats.tsx` | component | request-response | Same file (existing button, 1-line removal) | exact |
| `src/features/units/PlaybookTab.tsx` | component (container) | request-response | Same file (existing `handlePickerSelect` + `pickerOpen` state pattern) | exact |
| `src/features/units/DatasheetPicker.tsx` | component (picker dialog) | request-response | Same file + `useUdbSearch` from `src/hooks/useUnitDatabase.ts` | exact + hook-match |
| `tests/rules-hub/RulesHubPage.test.tsx` | test | — | Same file (existing test structure) | exact |
| `tests/units/` (3 new test files) | test | — | `tests/units/PlaybookDetachmentAbilities.test.tsx` | role-match |

---

## Pattern Assignments

### `src/features/rules-hub/RulesHubPage.tsx` (HON-03)

**Change type:** Replace stub function + swap hook call + update empty state

**Analog within the same file:** Detachments tab block (lines 253–278) and Stratagems tab block (lines 174–250). The Shared Abilities tab (lines 281–307) already mirrors their structure — only the data source and empty-state copy change.

**Stub to remove** (lines 21–24):
```typescript
// useSharedAbilitiesByFaction: shared abilities are out of Phase 120 scope — stub retained
function useSharedAbilitiesByFaction(_factionId: string | undefined) {
  return { data: [] as { id: string; name: string; description: string | null; legend: string | null; faction_id: string | null }[], isLoading: false };
}
```

**Imports to add** (after existing `useStratagemsByFaction, useDetachmentsByFaction` import on line 20):
```typescript
import { useStratagemsByFaction, useDetachmentsByFaction, useDetachmentAbilities } from "@/hooks/useGameData";
import type { UdbDetachmentAbilityWithDetachment } from "@/types/gameData";
import type { RwAbility } from "@/types/datasheet";
```

**Hook call pattern** (analog: line 57, Detachments tab):
```typescript
// EXISTING (analog on line 57):
const { data: detachments = [], isLoading: detachmentLoading } = useDetachmentsByFaction(selectedFactionId ?? undefined);

// NEW (replace stub call on line 58):
const { data: rawAbilities = [], isLoading: sharedAbilitiesLoading } =
  useDetachmentAbilities(selectedFactionId ?? null);
//                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^
// useDetachmentAbilities accepts string | null (not undefined); ?? null converts
```

**Prop-shape adapter** (add at module scope, after imports):
```typescript
function toRwAbility(a: UdbDetachmentAbilityWithDetachment): RwAbility {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    legend: a.detachment_name,   // displayed as badge in SharedAbilityCard header
    faction_id: a.faction_id,
  };
}
```

**Adapted array** (add after hook calls, before `favoritesMap` memo):
```typescript
const sharedAbilities = rawAbilities.map(toRwAbility);
```

**Empty state pattern** (analog: Detachments tab lines 266–269, exact copy of that structure — update copy only):
```tsx
{filteredAbilities.length === 0 ? (
  <p className="text-sm text-muted-foreground italic">
    {searchText
      ? "No shared abilities match your search."
      : "No shared abilities for this faction in the canonical database."}
  </p>
) : (
  <div className="flex flex-col gap-2">
    {filteredAbilities.map((a) => (
      <SharedAbilityCard key={a.id} ability={a}
        favorite={favoritesMap.get(a.id + ':shared_ability') ?? null}
        note={notesMap.get(a.id + ':shared_ability') ?? null} />
    ))}
  </div>
)}
```

**Count label pattern** (analog: Detachments count label line 262):
```tsx
// Existing Detachments tab (line 262):
<p className="text-xs text-muted-foreground">
  {filteredDetachments.length} detachment{filteredDetachments.length !== 1 ? "s" : ""}
</p>

// Shared Abilities — same pattern already in place at line 290–292 (keep as-is):
<p className="text-xs text-muted-foreground">
  {filteredAbilities.length} {filteredAbilities.length === 1 ? "ability" : "abilities"}
</p>
```

**Loading skeleton pattern** (analog: lines 225–230, copy exactly):
```tsx
{sharedAbilitiesLoading ? (
  <div className="flex flex-col gap-2">
    {[0, 1, 2].map((i) => (
      <Skeleton key={i} className="h-[80px] w-full rounded-lg" />
    ))}
  </div>
) : ( ... )}
```

**Favorites/notes wiring** (already in place at line 301 — do not change):
```tsx
<SharedAbilityCard key={a.id} ability={a}
  favorite={favoritesMap.get(a.id + ':shared_ability') ?? null}
  note={notesMap.get(a.id + ':shared_ability') ?? null} />
```

---

### `src/features/units/CollectionFactionLinkDialog.tsx` (NEW — HON-04)

**Analog:** `src/features/unit-database/FactionLinkDialog.tsx` (all 86 lines)

**Critical difference from analog:** `FactionLinkDialog` takes `factions: Faction[]` (collection factions, `id: number`) and calls `onConfirm(factionId: number)`. The new dialog takes `udbFactions: UdbFaction[]` (canonical factions, `id: string`) and calls `onConfirm(wahapediaFactionId: string)`. Do NOT use `Number(selectedId)` — the IDs are already strings ("SM", "NEC").

**Imports pattern** (copy from `FactionLinkDialog.tsx` lines 1–19, swap `Faction` type):
```typescript
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { UdbFaction } from "@/db/queries/unitDatabase";
```

**Props interface pattern** (analog: `FactionLinkDialog.tsx` lines 21–32, invert direction):
```typescript
// ANALOG (FactionLinkDialog.tsx lines 21–32):
export function FactionLinkDialog({
  open, onOpenChange, factions, udbFactionName, onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factions: Faction[];            // <-- collection factions, id: number
  udbFactionName: string;
  onConfirm: (factionId: number) => void;  // <-- number
})

// NEW (inverted):
export function CollectionFactionLinkDialog({
  open, onOpenChange, collectionFactionName, udbFactions, onConfirm, isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionFactionName: string;
  udbFactions: UdbFaction[];       // <-- canonical factions, id: string
  onConfirm: (wahapediaFactionId: string) => void;  // <-- string
  isPending?: boolean;
})
```

**State + handlers pattern** (analog: `FactionLinkDialog.tsx` lines 34–46):
```typescript
// ANALOG:
const [selectedId, setSelectedId] = useState<string>("");

function handleConfirm() {
  const id = Number(selectedId);  // <-- DO NOT copy this; UDB ids are strings
  if (!id) return;
  onConfirm(id);
  setSelectedId("");
}

function handleOpenChange(next: boolean) {
  if (!next) setSelectedId("");
  onOpenChange(next);
}

// NEW:
const [selectedId, setSelectedId] = useState<string>("");

function handleConfirm() {
  if (!selectedId) return;         // <-- string guard, no Number() conversion
  onConfirm(selectedId);
  setSelectedId("");
}

function handleOpenChange(next: boolean) {
  if (!next) setSelectedId("");
  onOpenChange(next);
}
```

**JSX structure pattern** (analog: `FactionLinkDialog.tsx` lines 48–86):
```tsx
// ANALOG structure (copy, change copy/props):
<Dialog open={open} onOpenChange={handleOpenChange}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Match Faction to Database</DialogTitle>
      <DialogDescription>
        "<span className="font-medium text-foreground">{collectionFactionName}</span>"
        has no canonical match yet. Select the matching army from the Unit Database
        so datasheets can be linked.
      </DialogDescription>
    </DialogHeader>

    <Select value={selectedId} onValueChange={setSelectedId}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select canonical army..." />
      </SelectTrigger>
      <SelectContent>
        {udbFactions.map((f) => (
          <SelectItem key={f.id} value={f.id}>   {/* value is already string */}
            {f.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <DialogFooter>
      <Button variant="outline" onClick={() => handleOpenChange(false)}>
        Cancel — browse all instead
      </Button>
      <Button disabled={!selectedId || isPending} onClick={handleConfirm}>
        Link &amp; open datasheets
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

No icon on the confirm button (omit the `Link2` icon used in the analog to keep the file lean).

---

### `src/features/units/PlaybookStats.tsx` (HON-04)

**Change type:** 1-line removal only.

**Location:** Line 85.

**Before:**
```tsx
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={onPickerOpen}
  disabled={!wahapediaFactionId}
>
  {hasDatasheetLink ? "Re-link" : "Link unit"}
</Button>
```

**After:**
```tsx
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={onPickerOpen}
>
  {hasDatasheetLink ? "Re-link unit" : "Link unit"}
</Button>
```

Note: UI-SPEC.md specifies "Re-link unit" (not just "Re-link") for the already-linked state — update the label copy at the same time.

No other changes to this file. The `wahapediaFactionId` prop and `onPickerOpen` prop signatures stay unchanged.

---

### `src/features/units/PlaybookTab.tsx` (HON-04)

**Change type:** Add state, add handlers, add dialog JSX, change `onPickerOpen` prop value.

**Analog within same file:** `pickerOpen` state (line 90), `handlePickerSelect` async handler (lines 158–173), `DatasheetPicker` JSX (lines 303–305). The new `factionLinkOpen` state and `handleFactionLinkConfirm` follow the exact same shape.

**New imports to add** (after existing imports):
```typescript
import { CollectionFactionLinkDialog } from "@/features/units/CollectionFactionLinkDialog";
import { useUpdateFaction } from "@/hooks/useFactions";
import { useWahapediaFactions } from "@/hooks/useDatasheet";
```

**New state** (add alongside `pickerOpen` on line 90):
```typescript
const [pickerOpen, setPickerOpen] = useState(false);    // existing
const [factionLinkOpen, setFactionLinkOpen] = useState(false);  // new
```

**New hooks** (add alongside existing `useUdbMeta`, `useDatasheet` calls):
```typescript
const updateFaction = useUpdateFaction();
const { data: udbFactions = [] } = useWahapediaFactions();
```

**New handler — intercepts `onPickerOpen`** (add before `handlePickerSelect`):
```typescript
function handlePickerOpen() {
  if (wahapediaFactionId) {
    setPickerOpen(true);           // existing path — faction is mapped
  } else {
    setFactionLinkOpen(true);      // new path — faction is not mapped
  }
}
```

**New async handler — faction link confirm** (add after `handlePickerOpen`):
```typescript
async function handleFactionLinkConfirm(wahapediaFactionId: string) {
  if (!localFaction) return;
  try {
    await updateFaction.mutateAsync({
      id: localFaction.id,
      wahapedia_faction_id: wahapediaFactionId,
    });
    setFactionLinkOpen(false);
    setPickerOpen(true);           // open picker with now-resolved factionId
    toast.success("Faction linked. Datasheets now available.");
  } catch {
    toast.error("Failed to link faction. Please try again.");
  }
}
```

**Change to `PlaybookStats` prop** (line 267 — swap lambda for named handler):
```tsx
// BEFORE (line 267):
onPickerOpen={() => setPickerOpen(true)}

// AFTER:
onPickerOpen={handlePickerOpen}
```

**New dialog JSX** (add alongside the existing `DatasheetPicker` JSX at lines 303–305):
```tsx
<CollectionFactionLinkDialog
  open={factionLinkOpen}
  onOpenChange={(open) => {
    setFactionLinkOpen(open);
    if (!open) setPickerOpen(true);  // "browse all" path: close dialog → open picker (factionId=undefined)
  }}
  collectionFactionName={localFaction?.name ?? "this faction"}
  udbFactions={udbFactions}
  onConfirm={handleFactionLinkConfirm}
  isPending={updateFaction.isPending}
/>
```

**Auto-open useEffect caveat** (line 114–119 — do NOT change):
The existing `useEffect` that auto-opens the picker (`setPickerOpen(true)`) fires when `hasDatasheetLink === false` and all stats are empty. This only runs when `udbMeta` is truthy, and it bypasses `handlePickerOpen`. When a faction is unmapped and auto-open fires, `DatasheetPicker` opens in browse-all mode (since `wahapediaFactionId ?? undefined` resolves to `undefined`). This is acceptable UX — the user gets the browse-all path automatically. Do not modify the `useEffect`.

---

### `src/features/units/DatasheetPicker.tsx` (HON-04)

**Change type:** Add browse-all path using `useUdbSearch` when `factionId` is `undefined`.

**New import** (add after existing `useDatasheetsByFaction` import on line 12):
```typescript
import { useDatasheetsByFaction } from "@/hooks/useDatasheet";    // existing
import { useUdbSearch } from "@/hooks/useUnitDatabase";            // new
```

**Hook pattern** (analog: `useUdbSearch` in `src/hooks/useUnitDatabase.ts` lines 91–99):
```typescript
// useUdbSearch is disabled for queries shorter than 2 chars:
export function useUdbSearch(query: string) {
  return useQuery({
    queryKey: UDB_SEARCH_KEY(query),
    queryFn: () => searchUdbUnits(query),
    enabled: query.trim().length >= 2,   // <-- min 2 chars
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
```

**Replace the single hook call** (line 40) with dual-hook + branch:
```typescript
// BEFORE (line 40):
const { data: datasheets = [] } = useDatasheetsByFaction(factionId);

// AFTER:
const isBrowseAll = factionId === undefined;
const { data: factionDatasheets = [] } = useDatasheetsByFaction(factionId);
const { data: searchResults = [] } = useUdbSearch(isBrowseAll ? search : "");

// Normalise both paths into the same shape the filtered useMemo expects:
const datasheets = isBrowseAll
  ? searchResults.map((r) => ({ id: r.unit_id, name: r.name, role: r.faction_name }))
  : factionDatasheets;
```

**`UdbSearchResult` shape** (from `src/db/queries/unitDatabase.ts`):
```typescript
export interface UdbSearchResult {
  unit_id: string;    // same as udb_units.id — safe to pass to onSelect()
  name: string;
  faction_name: string;
  keywords: string;
}
```

**Description copy update** (analog: line 54 — change conditionally):
```tsx
// BEFORE (line 53–55):
<DialogDescription>
  Searching {factionName} datasheets
</DialogDescription>

// AFTER:
<DialogDescription>
  {isBrowseAll ? "Search all datasheets" : `Searching ${factionName} datasheets`}
</DialogDescription>
```

**Empty state + prompt** (analog: lines 79–83 — extend with browse-all prompt):
```tsx
// BEFORE (lines 79–83):
{filtered.length === 0 && (
  <p className="px-3 py-4 text-sm text-muted-foreground text-center">
    No datasheets found. Try a different search term.
  </p>
)}

// AFTER:
{filtered.length === 0 && (
  <p className="px-3 py-4 text-sm text-muted-foreground text-center">
    {isBrowseAll && search.trim().length < 2
      ? "Type at least 2 characters to search all datasheets."
      : "No datasheets found. Try a different search term."}
  </p>
)}
```

**`filtered` useMemo** (line 42–46) — no change needed. The normalized `datasheets` array already has `name` for substring matching:
```typescript
const filtered = useMemo(() => {
  const needle = search.trim().toLowerCase();
  if (needle === "") return datasheets;    // browse-all: returns [] until useUdbSearch fires
  return datasheets.filter((d) => d.name.toLowerCase().includes(needle));
}, [search, datasheets]);
```

---

## Shared Patterns

### React Query hook pattern (staleTime: Infinity for static reference data)

**Source:** `src/hooks/useGameData.ts` lines 48–61 (`useStratagemsByFaction`)
**Apply to:** All new hook calls added in HON-03 and HON-04

```typescript
// Pattern: disabled query key + enabled guard + staleTime:Infinity for static data
export function useStratagemsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId
      ? STRATAGEMS_BY_FACTION_KEY(factionId)
      : (["udb-stratagems-faction", "disabled"] as const),
    queryFn: () =>
      factionId ? getStratagemsByFaction(factionId) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
```

`useDetachmentAbilities` (already in `useGameData.ts` lines 120–133) follows the same pattern but takes `string | null` — pass `selectedFactionId ?? null`.

### useMutation + invalidation pattern

**Source:** `src/hooks/useFactions.ts` lines 36–45 (`useUpdateFaction`)
**Apply to:** `PlaybookTab.handleFactionLinkConfirm`

```typescript
export function useUpdateFaction() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateFactionInput>({
    mutationFn: updateFaction,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: FACTIONS_KEY });
      qc.invalidateQueries({ queryKey: FACTION_KEY(variables.id) });
    },
  });
}
```

After `updateFaction.mutateAsync({ id, wahapedia_faction_id: "SM" })` resolves: `FACTIONS_KEY` invalidation triggers `useFactions()` re-fetch → `localFaction.wahapedia_faction_id` updates → `wahapediaFactionId` in `PlaybookTab` is no longer null → `useDatasheetsByFaction` is now enabled. No manual additional invalidation needed.

### Dialog open/reset state pattern

**Source:** `src/features/unit-database/FactionLinkDialog.tsx` lines 43–46
**Apply to:** `CollectionFactionLinkDialog`

```typescript
function handleOpenChange(next: boolean) {
  if (!next) setSelectedId("");   // always reset Select on close
  onOpenChange(next);
}
```

### Toast pattern

**Source:** `src/features/units/PlaybookTab.tsx` lines 166–168 and 172
**Apply to:** `handleFactionLinkConfirm`

```typescript
toast.success("Playbook saved");       // success variant
toast.error(`Failed to save playbook: ${errorMessage(err)}`);  // error variant
```

New copy per UI-SPEC.md:
- Success: `"Faction linked. Datasheets now available."`
- Error: `"Failed to link faction. Please try again."`

### `$1/$2` parameterized query convention

**Source:** `src/db/queries/factions.ts` (all query functions)
**Apply to:** No new SQL queries in this phase. All writes go through existing `updateFaction`.

The COALESCE guard in `updateFaction` means passing `wahapedia_faction_id: "SM"` sets the value; passing `null` preserves the existing value. Always pass the explicit string from the dialog confirm handler — never `undefined`.

---

## No Analog Found

None. All files in this phase have strong analogs in the codebase.

---

## Test Patterns

### Existing test to update: `tests/rules-hub/RulesHubPage.test.tsx`

**Analog structure** (the file already exists — see lines 1–117):

Mock shape to update — add `useGameData` mock for `useDetachmentAbilities`:
```typescript
vi.mock("@/hooks/useGameData", () => ({
  useStratagemsByFaction: vi.fn(() => ({ data: [], isLoading: false })),
  useDetachmentsByFaction: vi.fn(() => ({ data: [], isLoading: false })),
  useDetachmentAbilities: vi.fn(() => ({ data: [], isLoading: false })),  // ADD
}));
```

New test cases to add (HON-03):
```typescript
describe("RulesHubPage — HON-03: Shared Abilities tab", () => {
  it("calls useDetachmentAbilities when a faction is selected", ...);
  it("renders SharedAbilityCard when abilities are returned", ...);
  it("shows honest empty state when faction has zero abilities", ...);
  it("shows search-filtered empty state when searchText is non-empty", ...);
});
```

### New test files for HON-04

**Analog:** `tests/units/PlaybookDetachmentAbilities.test.tsx` (all 200 lines) — same structure:
1. `vi.mock` all hooks at the top
2. Fixture data as typed constants
3. `wrapper` helper with `QueryClient`
4. `renderComponent` helper
5. `describe` blocks per acceptance criterion

**`tests/units/PlaybookStats.test.tsx`** (new):
```typescript
// Pattern from PlaybookDetachmentAbilities.test.tsx lines 27–29:
vi.mock("@/hooks/useGameData", () => ({ ... }));

// Key test:
it("Link unit button is enabled when wahapediaFactionId is null", () => {
  render(<PlaybookStats {...props} wahapediaFactionId={null} />, { wrapper });
  const btn = screen.getByRole("button", { name: /link unit/i });
  expect(btn).not.toBeDisabled();
});
```

**`tests/units/CollectionFactionLinkDialog.test.tsx`** (new):
```typescript
// Pattern: render with udbFactions list, verify Select renders items,
// verify confirm button disabled until selection, verify onConfirm called with string id
it("calls onConfirm with the selected UDB faction id (string)", async () => { ... });
it("confirm button is disabled when no selection is made", () => { ... });
it("renders all udbFactions as SelectItem options", () => { ... });
```

**`tests/units/DatasheetPicker.test.tsx`** (new):
```typescript
// Key test for HON-04 D-06:
it("shows prompt when factionId is undefined and search is empty", () => {
  render(<DatasheetPicker factionId={undefined} ... />, { wrapper });
  expect(screen.getByText(/type at least 2 characters/i)).toBeInTheDocument();
});
it("calls useUdbSearch when factionId is undefined", () => { ... });
```

---

## Metadata

**Analog search scope:** `src/features/rules-hub/`, `src/features/units/`, `src/features/unit-database/`, `src/hooks/`, `tests/rules-hub/`, `tests/units/`
**Files read:** 11 source files + 2 test files
**Pattern extraction date:** 2026-06-17
