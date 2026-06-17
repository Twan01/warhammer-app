# Phase 136: Code Honesty & Decomposition - Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 14 new/modified files
**Analogs found:** 14 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/units/WeaponTable.tsx` (enhance) | component | transform | itself (already canonical) | self |
| `src/features/army-lists/ArmyListDetailHeader.tsx` | component | request-response | `ArmyListDetailPage.tsx` lines 471–516 | exact block-move |
| `src/features/army-lists/ArmyListQuickAdd.tsx` | component | request-response | `ArmyListDetailPage.tsx` lines 520–558 | exact block-move |
| `src/features/army-lists/ArmyListUnitTable.tsx` | component | event-driven | `ArmyListDetailPage.tsx` lines 91–133, 575–653 | exact block-move |
| `src/features/army-lists/ArmyListPortals.tsx` | component | event-driven | `ArmyListDetailPage.tsx` lines 712–784 | exact block-move |
| `src/features/army-lists/useArmyListExport.ts` | hook | request-response | `ArmyListDetailPage.tsx` lines 355–424 | exact block-move |
| `src/hooks/useEnhancements.ts` | hook | request-response | `src/hooks/useArmyListSnapshots.ts` | role-match |
| `src/hooks/useArmyListSnapshots.ts` (add `useSnapshotData`) | hook | request-response | existing file — add export | self-extension |
| `src/hooks/useRecipes.ts` (add `useRecipeNamesByUnitIds`) | hook | request-response | existing file — add export | self-extension |
| `src/hooks/useUnits.ts` (add `useUnitArmyLists`) | hook | request-response | `src/hooks/useArmyListSnapshots.ts` | role-match |
| `src/hooks/useArmyLists.ts` (symmetry fix on add/remove) | hook | request-response | itself — extend `onSuccess` | self |
| `src/types/battleLog.ts` (remove field + simplify Omit) | model | — | itself | self |
| `src-tauri/migrations/049_drop_promoted_to_reminder.sql` | migration | — | `047_army_list_unit_wargear.sql` header style | role-match |
| `src-tauri/src/lib.rs` (add Migration block 49) | config | — | lib.rs lines 290–295 (block 48) | exact |

---

## Pattern Assignments

### HON-08: `src/features/units/WeaponTable.tsx` (enhance — component, transform)

**Action:** This file is the canonical target. Merge `UdbWeaponsTable`'s divergent behaviors in. The current 43-line file already has the correct rendering — only the header label `"Rng"` vs `"Range"` and formatting guards differ.

**Current canonical file** (full, lines 1–43):
```typescript
import type { UdbWeapon } from "@/db/queries/unitDatabase";

interface WeaponTableProps {
  weapons: UdbWeapon[];
  statLabel: "BS" | "WS";
}

export function WeaponTable({ weapons, statLabel }: WeaponTableProps) {
  return (
    <div className="flex flex-col">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1 border-b border-border">
        {["Name", "Rng", "A", statLabel, "S", "AP", "D"].map((h) => (
          <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-center first:text-left">
            {h}
          </span>
        ))}
      </div>
      {weapons.map((w, i) => {
        const range = w.range && /^\d+$/.test(w.range) ? `${w.range}"` : (w.range ?? "—");
        const skill = w.skill ? (w.skill.endsWith("+") ? w.skill : `${w.skill}+`) : "—";
        return (
          <div key={`${w.unit_id}-${w.weapon_group}-${w.line_order}-${i}`} className="border-b border-border last:border-0">
            <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1.5 items-center">
              <span className="text-sm font-medium truncate">{w.name}</span>
              <span className="text-xs text-center tabular-nums">{range}</span>
              <span className="text-xs text-center tabular-nums">{w.attacks ?? "—"}</span>
              <span className="text-xs text-center tabular-nums">{skill}</span>
              <span className="text-xs text-center tabular-nums">{w.strength ?? "—"}</span>
              <span className="text-xs text-center tabular-nums">{w.ap ?? "0"}</span>
              <span className="text-xs text-center tabular-nums">{w.damage ?? "—"}</span>
            </div>
            {w.keywords && (
              <p className="px-2 pb-1.5 text-xs text-muted-foreground leading-relaxed">
                {w.keywords}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Differences to win over `UdbWeaponsTable`:**
- Header: keep `"Rng"` (canonical), not `"Range"` (`UdbWeaponsTable` line 16)
- Range: keep `${w.range}"` suffix guard (canonical line 20), not raw `w.range ?? "—"` (Udb line 32)
- Skill: keep `endsWith("+")` guard (canonical line 21), not raw `w.skill ?? "—"` (Udb line 38)
- Keywords: keep `leading-relaxed` (canonical line 34), not `italic` (Udb line 51)
- Row key: keep composite `${w.unit_id}-${w.weapon_group}-${w.line_order}-${i}` (canonical line 23), not `w.id` (Udb line 26)

**Smoke check after HON-08 complete:**
- `grep -rn "function WeaponTable" src/` must return exactly 1 result (canonical file only)
- `grep -rn "UdbWeaponsTable" src/` must return 0 results

---

### HON-08 consumer migration: `src/features/unit-database/UdbDatasheetSheet.tsx`

**Action:** Change import from `UdbWeaponsTable` (lines 154, 164 per research) to `WeaponTable` from `@/features/units/WeaponTable`. No prop changes needed — same `weapons` + `statLabel` shape.

**Import change pattern** (from `UdbWeaponsTable.tsx` line 1 style → canonical style):
```typescript
// Before:
import { UdbWeaponsTable } from "@/features/unit-database/UdbWeaponsTable";
// After:
import { WeaponTable } from "@/features/units/WeaponTable";
```

---

### HON-08 consumer migration: `src/features/rules-hub/DatasheetPointsTab.tsx`

**Action:** Delete the local `function WeaponTable` (lines 306–361). Add import from `@/features/units/WeaponTable`. Update the two call sites at lines 190 and 202 which already use the local name — they continue to work unchanged after the local function is deleted and the import is added.

**Import to add** (at top of file, alongside existing `useQuery` and query imports):
```typescript
import { WeaponTable } from "@/features/units/WeaponTable";
```

---

### HON-09: `src/features/army-lists/ArmyListDetailHeader.tsx` (component, request-response)

**Analog:** `ArmyListDetailPage.tsx` lines 471–516

**Props contract:**
```typescript
interface ArmyListDetailHeaderProps {
  list: ArmyList;
  faction: Faction | null;
  onEdit: () => void;
  onGameDay: () => void;
  onDelete: () => void;
}
```

**Block to move — header JSX** (ArmyListDetailPage.tsx lines 471–516):
```typescript
// The <div className="flex items-center gap-2"> back-link block (lines 473–480)
// + the <PageHeader ...> block with faction badge + Edit/GameDay/Delete actions (lines 482–516)
// Replace: dispatch({ type: "OPEN_EDIT", list }) → props.onEdit()
// Replace: dispatch({ type: "OPEN_DELETE", list }) → props.onDelete()
// Replace: navigate(…) → props.onGameDay()
```

**Imports pattern** (copy from ArmyListDetailPage.tsx, keep only what the header needs):
```typescript
import { Link } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import type { ArmyList } from "@/types/armyList";
import type { Faction } from "@/types/faction";
```

---

### HON-09: `src/features/army-lists/ArmyListQuickAdd.tsx` (component, request-response)

**Analog:** `ArmyListDetailPage.tsx` lines 520–558

**Props contract:**
```typescript
interface ArmyListQuickAddProps {
  quickAddSearch: string;
  setQuickAddSearch: (v: string) => void;
  quickAddResults: Array<{ type: "collection"; id: number; name: string; category: string | null; points: number | null }>;
  onAdd: (unitId: number) => void;
  onOpenUnitPicker: () => void;
  onOpenDatasheetBrowser: () => void;
}
```

**Imports pattern:**
```typescript
import { Search, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
```

---

### HON-09: `src/features/army-lists/ArmyListUnitTable.tsx` (component, event-driven)

**Analog:** `ArmyListDetailPage.tsx` lines 91–133 (SortableUnitRow) + lines 575–653 (DndContext block)

**Block to move:** `SortableUnitRow` function (lines 91–133) + the DndContext + Table + unit row iteration block (lines ~575–653). `SortableUnitRow` is used exclusively in this block — move it with the block.

**Props contract:**
```typescript
interface ArmyListUnitTableProps {
  unitsByCategory: Array<[string, Array<{ unit: ArmyListUnitRowType; isIndentedLeader: boolean }>]>;
  collapsedCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
  leaderNameMap: Map<number, string>;
  leaderTargets: SyncedLeaderTargetRow[];
  listEnhancements: ArmyListEnhancement[];
  listId: number;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  onRemove: (armyListUnitId: number) => void;
  onConfigure: (armyListUnitId: number) => void;
  onEnhance: (armyListUnitId: number) => void;
  onAttachLeader: (armyListUnitId: number) => void;
  onToggleWarlord: (armyListUnitId: number) => void;
}
```

**Imports pattern** (DnD + Table + ArmyListUnitRow only):
```typescript
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ArmyListUnitRow } from "./ArmyListUnitRow";
import type { ArmyListUnitRow as ArmyListUnitRowType, ArmyListEnhancement } from "@/types/armyList";
import type { SyncedLeaderTargetRow } from "@/db/queries/bsdataExtended";
```

---

### HON-09: `src/features/army-lists/ArmyListPortals.tsx` (component, event-driven)

**Analog:** `ArmyListDetailPage.tsx` lines 712–784

**Block to move:** All 9 sibling Sheet/Dialog components (lines 712–784). Pass `state` (the full `DetailPortalState` object) + `dispatch` as a props bundle — no logic changes, `dispatch` calls stay identical.

**Props contract:**
```typescript
import type { DetailPortalState, DetailPortalAction } from "./armyListDetailReducer";

interface ArmyListPortalsProps {
  state: DetailPortalState;
  dispatch: React.Dispatch<DetailPortalAction>;
  list: ArmyList;
  listId: number;
  totalPoints: number;
  units: ArmyListUnitRowType[];
  listEnhancements: ArmyListEnhancement[];
  factionName: string | null;
  loadoutUnit: ArmyListUnitRowType | null;
  enhancementUnit: ArmyListUnitRowType | null;
  leaderUnit: ArmyListUnitRowType | null;
  handleDeleteClose: () => void;
  handleDeleted: () => void;
}
```

**Dispatch calls stay unchanged** — `dispatch({ type: "CLOSE_SHEET" })` etc. are used verbatim. No callback wrapping needed.

**Imports pattern** (all 9 portal components already imported in ArmyListDetailPage.tsx lines 69–82):
```typescript
import { ArmyListSheet } from "./ArmyListSheet";
import { ArmyListDeleteDialog } from "./ArmyListDeleteDialog";
import { UnitPickerDialog } from "./UnitPickerDialog";
import { LoadoutBuilderSheet } from "./LoadoutBuilderSheet";
import { EnhancementPickerSheet } from "./EnhancementPickerSheet";
import { LeaderAttachmentSheet } from "./LeaderAttachmentSheet";
import { DatasheetBrowserDialog } from "./DatasheetBrowserDialog";
import { PrintPreviewDialog } from "./PrintPreviewDialog";
import { SnapshotHistorySheet } from "./SnapshotHistorySheet";
import { SnapshotCompareDialog } from "./SnapshotCompareDialog";
import type { DetailPortalState, DetailPortalAction } from "./armyListDetailReducer";
```

---

### HON-09: `src/features/army-lists/useArmyListExport.ts` (hook, request-response)

**Analog:** `ArmyListDetailPage.tsx` lines 355–424 (the three `useCallback` export handlers)

**Block to move:** `handleCopyToClipboard` (lines 355–365), `handleSaveJson` (lines 367–383), `handleSavePdf` (lines 385–424).

**Hook shape to produce:**
```typescript
export function useArmyListExport({
  list,
  units,
  listEnhancements,
  faction,
  listWargear,
  locale,
}: {
  list: ArmyList | undefined | null;
  units: ArmyListUnitRowType[];
  listEnhancements: ArmyListEnhancement[];
  faction: Faction | null;
  listWargear: ArmyListUnitWargear[];
  locale: string;
}) {
  const handleCopyToClipboard = useCallback(async () => { ... }, [list, units, listEnhancements, faction]);
  const handleSaveJson = useCallback(async () => { ... }, [list, units, listEnhancements, faction]);
  const handleSavePdf = useCallback(async () => { ... }, [list, units, listEnhancements, faction, listWargear, locale]);
  return { handleCopyToClipboard, handleSaveJson, handleSavePdf };
}
```

**Imports pattern** (Tauri plugin imports from ArmyListDetailPage.tsx lines 48–51):
```typescript
import { useCallback } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import {
  formatArmyListForExport, buildClipboardText, buildJsonFormat,
  slugify, dateStamp,
} from "@/lib/exportArmyList";
import { generateBattleRosterPdf } from "@/lib/exportArmyListPdf";
import { assembleRoster } from "@/lib/exportRoster";
```

---

### HON-09: `ArmyListDetailPage.tsx` (orchestrator — post-extraction shape)

After all five block-moves the orchestrator retains:
- imports (trimmed to what the orchestrator still uses)
- all hook calls (`useArmyListWithUnits`, `useArmyList`, etc. — lines 141–155)
- `useReducer` (line 157) and state destructuring (lines 158–163)
- all derived memos: `faction`, `wahapediaFactionId`, `factionIdStr`, `leaderTargets`, `groupedUnits`, `unitsByCategory`, `leaderNameMap`, `totalPoints` (lines 165–216)
- local state: `notesDraft`, `collapsedCategories`, `quickAddSearch` (lines 218–220)
- effects + DnD sensors (lines 222–230)
- `quickAddResults` memo (lines 233–242)
- portal derived objects: `loadoutUnit`, `enhancementUnit`, `leaderUnit`, `factionName` (lines 244–254)
- all remaining handlers: `handleToggleWarlord`, `handleDragEnd`, `toggleCategory`, `handleRemoveUnit`, `handleSaveListNotes`, `handleDetachmentSelect`, `handleDetachmentClear`, `handleDeleteClose`, `handleDeleted` (and `handleSaveListNotes`)
- loading/empty state renders
- the return JSX that composes the extracted children

Target: ~220–240 lines. Call `useArmyListExport` in the orchestrator, pass its return values down.

---

### HON-10: `src/hooks/useEnhancements.ts` (new hook file, request-response)

**Analog:** `src/hooks/useArmyListSnapshots.ts` — same pattern: `KEY` factory + `useQuery` with `enabled` guard, no mutations for read-only BSData tables.

**Concrete pattern to copy from `useArmyListSnapshots.ts` lines 1–48:**
```typescript
import { useQuery } from "@tanstack/react-query";
import { getEnhancementsByFaction } from "@/db/queries/bsdataExtended";

export const ENHANCEMENTS_BY_FACTION_KEY = (factionId: string) =>
  ["enhancements-by-faction", factionId] as const;

export function useEnhancementsByFaction(factionId: string) {
  return useQuery({
    queryKey: ENHANCEMENTS_BY_FACTION_KEY(factionId),
    queryFn: () => getEnhancementsByFaction(factionId),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
```

`staleTime: Infinity` / `gcTime: Infinity` — copied from the inline `useQuery` in `EnhancementsList.tsx` lines 8–13. BSData tables are not user-mutable; no mutation symmetry concern.

**Consumer change in `EnhancementsList.tsx`:**
```typescript
// Before (lines 1–13):
import { useQuery } from "@tanstack/react-query";
import { getEnhancementsByFaction } from "@/db/queries/bsdataExtended";
// ...
const { data: enhancements = [], isLoading } = useQuery({
  queryKey: ["enhancements-by-faction", factionId] as const,
  queryFn: () => getEnhancementsByFaction(factionId),
  staleTime: Infinity, gcTime: Infinity,
});

// After:
import { useEnhancementsByFaction } from "@/hooks/useEnhancements";
// ...
const { data: enhancements = [], isLoading } = useEnhancementsByFaction(factionId);
```

---

### HON-10: `src/hooks/useArmyListSnapshots.ts` (extend — add `useSnapshotData`)

**Analog:** existing `useSnapshotsByList` function in the same file (lines 42–48) — same enabled-guard pattern.

**Addition after line 48** (after `useSnapshotsByList`):
```typescript
export const SNAPSHOT_DATA_KEY = (id: number | null) =>
  ["snapshot-data", id] as const;

export function useSnapshotData(id: number | null, enabled: boolean) {
  return useQuery({
    queryKey: SNAPSHOT_DATA_KEY(id),
    queryFn: () => getSnapshotData(id!),
    enabled: id !== null && enabled,
  });
}
```

`getSnapshotData` must be added to the import block at the top (line 16 imports from `@/db/queries/armyListSnapshots`).

**Consumer change in `SnapshotCompareDialog.tsx`:** replace the two inline `useQuery({ queryKey: ["snapshot-data", idA] ... })` calls with `useSnapshotData(idA, open)` and `useSnapshotData(idB, open)`.

---

### HON-10: `src/hooks/useRecipes.ts` (extend — add `useRecipeNamesByUnitIds`)

**Analog:** existing `useRecipe` (lines 25–31) — parameterized key factory with `enabled` guard.

**Addition after `useRecipe` (after line 31):**
```typescript
export const RECIPE_NAMES_BY_UNIT_KEY = (ids: number[]) =>
  ["recipes", "by-unit", ...ids] as const;

export function useRecipeNamesByUnitIds(ids: number[]) {
  return useQuery({
    queryKey: ids.length > 0 ? RECIPE_NAMES_BY_UNIT_KEY(ids) : ["recipes", "by-unit", "disabled"],
    queryFn: () => getRecipeNamesByUnitIds(ids),
    enabled: ids.length > 0,
  });
}
```

`getRecipeNamesByUnitIds` must be added to the import block (line 4 imports from `@/db/queries/recipes`).

**Invalidation symmetry confirmed:** `useCreateRecipe`, `useUpdateRecipe`, `useDeleteRecipe`, `useDuplicateRecipe` all already invalidate `{ queryKey: ["recipes", "by-unit"] }` prefix (lines 40, 53, 63, 83) — the new key is covered.

**Consumer change in `DashboardPage.tsx`:** replace the two inline `useQuery` calls:
1. `useQuery({ queryKey: ["recipes", "by-unit", focusUnitId ?? 0], queryFn: () => getRecipeNamesByUnitIds([focusUnitId]) })` → `useRecipeNamesByUnitIds(focusUnitId ? [focusUnitId] : [])`
2. `useQuery({ queryKey: ["recipes", primaryAssignment.recipe_id], queryFn: () => getRecipeById(...) })` → `useRecipe(primaryAssignment?.recipe_id)` (already exported from `useRecipes.ts` line 25)

---

### HON-10: `src/hooks/useUnits.ts` (extend — add `useUnitArmyLists`)

**Analog:** `useUnit` in the same file (lines 25–31) — nullable `id` with `enabled` guard pattern.

**Addition after `useDeleteUnit` (after line 97):**
```typescript
export const UNIT_ARMY_LISTS_KEY = (unitId: number | null) =>
  ["unit-army-lists", unitId] as const;

export function useUnitArmyLists(unitId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: unitId !== null ? UNIT_ARMY_LISTS_KEY(unitId) : ["unit-army-lists", "disabled"],
    queryFn: () => getArmyListsByUnitId(unitId!),
    enabled: unitId !== null && enabled,
  });
}
```

`getArmyListsByUnitId` must be added to the import block (line 3 imports from `@/db/queries/units`).

**Consumer change in `UnitDeleteDialog.tsx`:** replace the inline `useQuery({ queryKey: ["unit-army-lists", unit?.id ?? "none"], ... })` with `useUnitArmyLists(unit?.id ?? null, open)`.

---

### HON-10: `src/hooks/useArmyLists.ts` (symmetry fix — `useAddUnitToList` + `useRemoveUnitFromList`)

**Pattern:** Copy the `invalidateListWithReadiness` helper call already used in both mutations (lines 161, 179), and add a `UNIT_ARMY_LISTS_KEY` prefix invalidation.

**`useAddUnitToList` onSuccess** (current line 161):
```typescript
onSuccess: (_insertedId, variables) => {
  invalidateListWithReadiness(qc, variables.list_id);
  // ADD:
  qc.invalidateQueries({ queryKey: ["unit-army-lists"] }); // symmetry fix — HON-10
},
```

**`useRemoveUnitFromList` onSuccess** (current line 179):
```typescript
onSuccess: (_, variables) => {
  invalidateListWithReadiness(qc, variables.list_id);
  // ADD:
  qc.invalidateQueries({ queryKey: ["unit-army-lists"] }); // symmetry fix — HON-10
},
```

The `["unit-army-lists"]` prefix invalidation covers all `["unit-army-lists", unitId]` entries (React Query prefix matching). No key factory import needed — string prefix used directly, same pattern as `["army-list-readiness"]` prefix invalidation on line 150.

---

### HON-10: `src/features/rules-hub/DatasheetPointsTab.tsx` (3 hook bypasses)

The three inline `useQuery` calls (for `getModelCountsByFaction`, `getLoadoutOptionsByFaction`, `getLeaderTargetsByFaction`) are in a component whose file also needs HON-08 work. These are BSData read-only tables — new hooks follow the `useEnhancementsByFaction` pattern exactly (`staleTime: Infinity`). Create in a new file or append to an existing BSData hook file.

**New hooks — pattern copied from `useEnhancementsByFaction`:**
```typescript
// src/hooks/useBsdataFaction.ts  (or append to useDatasheet.ts if preferred)
import { useQuery } from "@tanstack/react-query";
import {
  getModelCountsByFaction,
  getLoadoutOptionsByFaction,
  getLeaderTargetsByFaction,
} from "@/db/queries/bsdataExtended";

export const MODEL_COUNTS_KEY = (factionId: string) =>
  ["model-counts-by-faction", factionId] as const;

export function useModelCountsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId ? MODEL_COUNTS_KEY(factionId) : ["model-counts-by-faction", "disabled"],
    queryFn: () => getModelCountsByFaction(factionId!),
    enabled: factionId !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

// Same shape for useLoadoutOptionsByFaction (LOADOUT_OPTIONS_KEY)
// and useLeaderTargetsByFaction (LEADER_TARGETS_KEY)
```

---

### HON-11: `src/types/battleLog.ts` (model — field removal)

**Current file** (full, lines 1–40) already read. Changes are minimal:

**Line 34 — remove:**
```typescript
  promoted_to_reminder: number;  // DELETE this line
```

**Line 39 — simplify Omit (current → new):**
```typescript
// Current line 39:
export type CreateBattleLogInput = Omit<BattleLog, "id" | "created_at" | "promoted_to_reminder">;
// New line 39:
export type CreateBattleLogInput = Omit<BattleLog, "id" | "created_at">;
```

`UpdateBattleLogInput` (line 40: `CreateBattleLogInput & { id: number }`) requires no change.

---

### HON-11: `src-tauri/migrations/049_drop_promoted_to_reminder.sql` (migration, DDL)

**Header style analog:** `047_army_list_unit_wargear.sql` lines 1–15 (comment block + explanation + constraints note).

**Full migration content to write (LF line endings — use Write tool):**
```sql
-- Migration 049: Remove vestigial promoted_to_reminder column (HON-11).
--
-- The "surface forgotten rules as reminders" feature was never built.
-- Zero reads or writes of this column exist in src/ or src-tauri/ —
-- only the type field (src/types/battleLog.ts line 34) and its
-- CreateBattleLogInput Omit referenced it.
--
-- SQLite ALTER TABLE DROP COLUMN requires SQLite >= 3.35.0.
-- Tauri's bundled SQLite is well above 3.35 (D-11 in CONTEXT.md).
-- The column is INTEGER NOT NULL DEFAULT 0 with no FK references —
-- a straightforward drop with no cascade surface.
--
-- No explicit BEGIN/COMMIT: the Tauri plugin-sql runner wraps each
-- migration in its own transaction (documented in migration 033).
ALTER TABLE battle_logs DROP COLUMN promoted_to_reminder;
```

---

### HON-11: `src-tauri/src/lib.rs` (config — add Migration block 49)

**Analog:** lines 290–295 (Migration block 48, the most recent):
```rust
        Migration {
            version: 48,
            description: "consolidate_factions",
            sql: include_str!("../migrations/048_consolidate_factions.sql"),
            kind: MigrationKind::Up,
        },
```

**New block to add immediately after** (after the closing `},` of block 48):
```rust
        Migration {
            version: 49,
            description: "drop_promoted_to_reminder",
            sql: include_str!("../migrations/049_drop_promoted_to_reminder.sql"),
            kind: MigrationKind::Up,
        },
```

The `description` string is the filename without the number prefix and `.sql` suffix — follow the same convention as block 48 (`"consolidate_factions"` from `048_consolidate_factions.sql`).

---

## Shared Patterns

### React Query Hook Shape (applies to all HON-10 new hooks)

**Source:** `src/hooks/useRecipes.ts` lines 18–31, `src/hooks/useArmyListSnapshots.ts` lines 31–48, `src/hooks/useUnits.ts` lines 12–31

Every hook file exports:
1. A `*_KEY` constant or factory at module top (e.g. `export const RECIPES_KEY = ["recipes"] as const;`)
2. A parameterized factory for ID-scoped queries (e.g. `export const RECIPE_KEY = (id: number) => ["recipes", id] as const;`)
3. A `use*` function wrapping `useQuery` with an `enabled` guard when the param is nullable
4. Mutations export `*_KEY` from the same file and call `qc.invalidateQueries({ queryKey: KEY })` in `onSuccess`

**Nullable-param enabled guard pattern** (from `useRecipes.ts` lines 25–31):
```typescript
export function useRecipe(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? RECIPE_KEY(id) : ["recipes", "disabled"],
    queryFn: () => (id !== undefined ? getRecipeById(id) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
}
```

**BSData read-only pattern** (staleTime: Infinity — from `EnhancementsList.tsx` lines 8–13):
```typescript
useQuery({
  queryKey: ...,
  queryFn: ...,
  staleTime: Infinity,
  gcTime: Infinity,
});
```

### Reducer-Dispatch Contract (applies to ArmyListPortals HON-09)

**Source:** `src/features/army-lists/armyListDetailReducer.ts` (full file, 133 lines)

- `DetailPortalState` and `DetailPortalAction` are exported from `armyListDetailReducer.ts`
- `dispatch` is typed as `React.Dispatch<DetailPortalAction>`
- All portal components call `dispatch({ type: "..." })` directly — no callback wrapping
- Pass `state` (the full `DetailPortalState` object after destructuring) + `dispatch` as props to `ArmyListPortals`

### Sub-Component Props Pattern (applies to all HON-09 children)

**Source:** `src/features/units/PlaybookTab.tsx` lines 37–39 (the `PlaybookTabProps` interface)

- Props are typed with an inline `interface` named `[ComponentName]Props`
- Callback props use `() => void` for simple triggers, `(id: number) => void` for ID-parameterized
- No implicit prop spreading — all props named explicitly

### Migration Comment Header (applies to 049 migration)

**Source:** `src-tauri/migrations/047_army_list_unit_wargear.sql` lines 1–15

Style:
- First line: `-- Migration NNN: <human description> (<ticket-id>).`
- Blank comment line
- Multi-line explanation of purpose
- Explicit note about any constraints/caveats (transaction handling, FK state)

---

## No Analog Found

All files have a close match in the codebase. No new external patterns required.

---

## Build Sequence (per RESEARCH.md recommendation)

1. **HON-08** — Enhance `WeaponTable.tsx`, migrate `DatasheetPointsTab` (delete shadow copy, add import), re-point `UdbDatasheetSheet`, delete `UdbWeaponsTable.tsx`. `pnpm build` after each sub-step.
2. **HON-11** — Write `049_drop_promoted_to_reminder.sql` (LF), update `lib.rs` Migration block 49, remove field from `battleLog.ts`. Single atomic commit. `pnpm check:version` to verify parity gate.
3. **HON-09** — Extract five blocks from `ArmyListDetailPage.tsx` one at a time, each as a separate revertable commit. Order: Header → QuickAdd → useArmyListExport → UnitTable → Portals → orchestrator trim.
4. **HON-10** — Add new hook files/exports, update consumers. Verify symmetry fix by adding invalidations to `useAddUnitToList` and `useRemoveUnitFromList`.

---

## Metadata

**Analog search scope:** `src/features/army-lists/`, `src/features/units/`, `src/features/rules-hub/`, `src/hooks/`, `src/types/`, `src-tauri/migrations/`, `src-tauri/src/lib.rs`
**Files scanned:** 14 source files read directly
**Pattern extraction date:** 2026-06-17
