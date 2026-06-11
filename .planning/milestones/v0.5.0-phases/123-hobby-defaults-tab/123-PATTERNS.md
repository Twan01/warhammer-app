# Phase 123: Hobby Defaults Tab - Pattern Map

**Mapped:** 2026-06-10
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/stageLabel.ts` | utility | transform | `src/lib/dates.ts` | role-match |
| `src/features/settings/HobbyDefaultsSection.tsx` | component | request-response | `src/features/game-day/ChecklistTab.tsx` | role-match |
| `src/features/settings/PipelineLabelsEditor.tsx` | component | request-response | `src/app/settings/page.tsx` + `useAppSettings` | role-match |
| `src/features/settings/ChecklistDefaultsEditor.tsx` | component | event-driven | `src/features/recipes/RecipeStepList.tsx` | exact |
| `src/features/settings/MissionFormatEditor.tsx` | component | request-response | `src/app/settings/page.tsx` + `useAppSettings` | role-match |
| `src/app/settings/page.tsx` | component | request-response | itself (existing shell) | exact (modify) |
| `src/features/dashboard/HobbyPipeline.tsx` | component | request-response | itself (existing) | exact (modify) |
| `src/features/battle-log/BattleLogSheet.tsx` | component | request-response | itself (existing) | exact (modify) |
| `src/features/game-day/gameDayStore.ts` | store | event-driven | itself (existing) | exact (modify) |

---

## Pattern Assignments

### `src/lib/stageLabel.ts` (utility, transform)

**Analog:** `src/lib/dates.ts` — pure utility module, exported functions only, no side effects, no React imports.

**Module structure pattern** (`src/lib/dates.ts` lines 1-18):
```ts
/**
 * JSDoc comment describing purpose and phase origin.
 */

/** Single-line JSDoc per export. */
export function todayISO(): string {
  // pure computation, no side effects
}
```

**Core implementation pattern** — follows RESEARCH.md Pattern 3 exactly. The `AppSettingsMap` type is imported from `src/db/queries/appSettings.ts` (line 3):
```ts
import type { AppSettingsMap } from "@/db/queries/appSettings";

export type PipelineBucket = "Not Started" | "Assembly" | "Painting" | "Finishing" | "Done";
export const BUCKET_ORDER: PipelineBucket[] = ["Not Started", "Assembly", "Painting", "Finishing", "Done"];

export function getBucketLabel(bucket: PipelineBucket, settings: AppSettingsMap): string {
  const raw = settings["pipeline_labels"];
  if (!raw) return bucket;
  try {
    const map = JSON.parse(raw) as Record<string, string>;
    return map[bucket] || bucket;
  } catch {
    return bucket;
  }
}
```

**Note:** The existing `HobbyPipeline.tsx` already defines `type Bucket` and `BUCKET_ORDER` locally (lines 16-18). The new `stageLabel.ts` should export `BUCKET_ORDER` as the canonical source so `HobbyPipeline` can import from it instead of re-declaring.

---

### `src/features/settings/HobbyDefaultsSection.tsx` (component, request-response)

**Analog:** `src/app/settings/page.tsx` — section wrapper inside a tab, reads `useAppSettings()`, renders sub-components conditionally after loading.

**Imports pattern** (modeled on `src/app/settings/page.tsx` lines 1-3):
```tsx
import { Separator } from "@/components/ui/separator";
import { useAppSettings } from "@/hooks/useAppSettings";
import { PipelineLabelsEditor } from "./PipelineLabelsEditor";
import { ChecklistDefaultsEditor } from "./ChecklistDefaultsEditor";
import { MissionFormatEditor } from "./MissionFormatEditor";
```

**Core pattern** — section group with heading and separator, no loading state (parent `SettingsPage` already guards via `isLoading` / `isError` before rendering any content in the preferences tab, `src/app/settings/page.tsx` lines 18-30):
```tsx
export function HobbyDefaultsSection() {
  const { data: settings = {} } = useAppSettings();

  return (
    <div className="space-y-6">
      <Separator />
      <div>
        <h3 className="text-base font-semibold">Hobby Defaults</h3>
        <p className="text-muted-foreground text-sm">
          Customize pipeline stage labels, default pre-game checklist, and mission format.
        </p>
      </div>
      <PipelineLabelsEditor settings={settings} />
      <Separator />
      <ChecklistDefaultsEditor settings={settings} />
      <Separator />
      <MissionFormatEditor settings={settings} />
    </div>
  );
}
```

---

### `src/features/settings/PipelineLabelsEditor.tsx` (component, request-response)

**Analog:** `src/app/settings/page.tsx` for structure; RESEARCH.md Pattern 1 for instant-save uncontrolled input.

**Imports pattern**:
```tsx
import { Input } from "@/components/ui/input";
import { useUpdateSetting } from "@/hooks/useAppSettings";
import { toast } from "sonner";
import type { AppSettingsMap } from "@/db/queries/appSettings";
import { BUCKET_ORDER, type PipelineBucket } from "@/lib/stageLabel";
```

**Instant-save on blur pattern** (from RESEARCH.md Pattern 1 + `BattleLogSheet.tsx` error handling at lines 192-195):
```tsx
export function PipelineLabelsEditor({ settings }: { settings: AppSettingsMap }) {
  const updateSetting = useUpdateSetting();

  function handleBlur(bucket: PipelineBucket, value: string) {
    const trimmed = value.trim();
    const label = trimmed || bucket; // empty reverts to default
    const existing: Record<string, string> = settings["pipeline_labels"]
      ? (() => { try { return JSON.parse(settings["pipeline_labels"]); } catch { return {}; } })()
      : {};
    if (label === bucket) {
      delete existing[bucket];
    } else {
      existing[bucket] = label;
    }
    updateSetting.mutate(
      { key: "pipeline_labels", value: JSON.stringify(existing) },
      { onError: () => toast.error("Failed to save label.") },
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Pipeline Stage Labels</p>
        <p className="text-xs text-muted-foreground">Rename the 5 pipeline stages shown on the Dashboard.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {BUCKET_ORDER.map((bucket) => {
          const parsed = settings["pipeline_labels"]
            ? (() => { try { return JSON.parse(settings["pipeline_labels"]) as Record<string, string>; } catch { return {}; } })()
            : {};
          const currentLabel = parsed[bucket] ?? bucket;
          return (
            <div key={bucket} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{bucket}</label>
              <Input
                key={currentLabel}          // remount when settings load — see RESEARCH.md Pitfall 1
                defaultValue={currentLabel}
                placeholder={bucket}
                className="max-w-xs"
                onBlur={(e) => handleBlur(bucket, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Key:** `key={currentLabel}` on `<Input>` forces remount when settings first load (RESEARCH.md Pitfall 1). `onBlur` saves to `app_settings` via `useUpdateSetting()`.

---

### `src/features/settings/ChecklistDefaultsEditor.tsx` (component, event-driven)

**Analog:** `src/features/recipes/RecipeStepList.tsx` — exact dnd-kit sortable vertical list pattern.

**Imports pattern** (`src/features/recipes/RecipeStepList.tsx` lines 1-19):
```tsx
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUpdateSetting } from "@/hooks/useAppSettings";
import type { AppSettingsMap } from "@/db/queries/appSettings";
import { DEFAULT_CHECKLIST } from "@/features/game-day/gameDayStore";
```

**Sensor setup** (copy exactly from `src/features/recipes/RecipeStepList.tsx` lines 29-32):
```tsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);
```

**DnD context + SortableContext** (copy exactly from `src/features/recipes/RecipeStepList.tsx` lines 67-79):
```tsx
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext
    items={items.map((i) => i.id)}
    strategy={verticalListSortingStrategy}
  >
    {items.map((item) => (
      <SortableChecklistItem key={item.id} item={item} onDelete={...} canDelete={items.length > 1} />
    ))}
  </SortableContext>
</DndContext>
```

**handleDragEnd** (copy structure from `src/features/recipes/RecipeStepList.tsx` lines 34-41):
```tsx
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const oldIndex = items.findIndex((i) => i.id === active.id);
  const newIndex = items.findIndex((i) => i.id === over.id);
  if (oldIndex === -1 || newIndex === -1) return;
  const reordered = arrayMove(items, oldIndex, newIndex);
  saveItems(reordered);
}
```

**Per-row sortable hook** (copy structure from `src/features/recipes/RecipeStepRow.tsx` lines 33-40):
```tsx
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
```

**Add item pattern** (copy from `src/features/game-day/ChecklistTab.tsx` lines 21-26 and 83-99):
```tsx
// State
const [newItemText, setNewItemText] = useState("");

function handleAddItem() {
  const trimmed = newItemText.trim();
  if (!trimmed) return;
  const next = [...items, { id: crypto.randomUUID(), text: trimmed }];
  saveItems(next);
  setNewItemText("");
}
// JSX
<Input
  placeholder="Add a checklist item..."
  value={newItemText}
  onChange={(e) => setNewItemText(e.target.value)}
  onKeyDown={(e) => { if (e.key === "Enter") handleAddItem(); }}
  className="h-9 flex-1"
/>
<Button variant="outline" size="sm" onClick={handleAddItem} disabled={!newItemText.trim()}>
  <Plus className="h-4 w-4" />
</Button>
```

**saveItems helper** — persists to `app_settings`, strips `id` before storing (D-06: IDs are not stored):
```tsx
function saveItems(next: Array<{ id: string; text: string }>) {
  const toStore = next.map(({ text }) => ({ text }));
  updateSetting.mutate(
    { key: "default_checklist", value: JSON.stringify(toStore) },
    { onError: () => toast.error("Failed to save checklist.") },
  );
}
```

**Parse settings on mount** — initialize local items from `settings["default_checklist"]` with try-catch, falling back to `DEFAULT_CHECKLIST`:
```tsx
const items = useMemo(() => {
  const raw = settings["default_checklist"];
  if (!raw) return DEFAULT_CHECKLIST.map((i) => ({ id: crypto.randomUUID(), text: i.text }));
  try {
    const entries = JSON.parse(raw) as Array<{ text: string }>;
    return entries.map((e) => ({ id: crypto.randomUUID(), text: e.text }));
  } catch {
    return DEFAULT_CHECKLIST.map((i) => ({ id: crypto.randomUUID(), text: i.text }));
  }
}, [settings["default_checklist"]]);  // stable key: only re-derive when settings change
```

**Note:** `useMemo` on settings key avoids re-generating UUIDs on every render. IDs are ephemeral display IDs only; never persisted (D-06).

---

### `src/features/settings/MissionFormatEditor.tsx` (component, request-response)

**Analog:** Same as `PipelineLabelsEditor.tsx` — single uncontrolled input with instant save on blur.

**Imports pattern**:
```tsx
import { Input } from "@/components/ui/input";
import { useUpdateSetting } from "@/hooks/useAppSettings";
import { toast } from "sonner";
import type { AppSettingsMap } from "@/db/queries/appSettings";
```

**Core pattern** (single-field variant of PipelineLabelsEditor):
```tsx
export function MissionFormatEditor({ settings }: { settings: AppSettingsMap }) {
  const updateSetting = useUpdateSetting();
  const currentValue = settings["default_mission_format"] ?? "";

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const trimmed = e.target.value.trim();
    updateSetting.mutate(
      { key: "default_mission_format", value: trimmed },
      { onError: () => toast.error("Failed to save mission format.") },
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Default Mission Format</p>
        <p className="text-xs text-muted-foreground">Pre-fills the Mission field on new battle logs.</p>
      </div>
      <Input
        key={currentValue}               // remount when settings load — RESEARCH.md Pitfall 1
        defaultValue={currentValue}
        placeholder="e.g., Take and Hold, Leviathan, etc."
        className="max-w-xs"
        onBlur={handleBlur}
      />
    </div>
  );
}
```

---

### `src/app/settings/page.tsx` (component — modify existing)

**File:** `src/app/settings/page.tsx` (lines 1-48 — full file, already read)

**Modification pattern** — add `HobbyDefaultsSection` inside the `preferences` tab content, after the existing `<h2>` and general preferences block. Insert a `<Separator />` visually separating general preferences from hobby defaults.

**Current preferences tab content** (lines 17-30) that gets extended:
```tsx
<TabsContent value="preferences" className="mt-4">
  {isLoading ? (
    <Skeleton className="h-4 w-48" />
  ) : isError ? (
    <p className="text-destructive text-sm">
      Could not load settings. Restart the app to try again.
    </p>
  ) : (
    <>
      <h2 className="text-lg font-semibold">Preferences</h2>
      <p className="text-muted-foreground text-sm">
        Language, currency, default faction, and points target — coming in the next update.
      </p>
      {/* ADD HERE: <HobbyDefaultsSection /> */}
    </>
  )}
</TabsContent>
```

**Key:** `HobbyDefaultsSection` renders only inside the `isLoading/isError` success branch — inputs only mount after settings are ready, solving Pitfall 1 at the page level.

---

### `src/features/dashboard/HobbyPipeline.tsx` (component — modify existing)

**File:** `src/features/dashboard/HobbyPipeline.tsx` (lines 1-80 — full file, already read)

**Current bucket label render** (lines 67-68):
```tsx
<span className="text-xs text-muted-foreground text-center">
  {bucket}
</span>
```

**Modification pattern** — add `useAppSettings` import + `getBucketLabel` call:
```tsx
// Add to imports:
import { useAppSettings } from "@/hooks/useAppSettings";
import { getBucketLabel } from "@/lib/stageLabel";
// Note: import BUCKET_ORDER from stageLabel instead of re-declaring locally (line 18)

// Add inside component body:
const { data: settings = {} } = useAppSettings();

// Change render (line 67-68):
<span className="text-xs text-muted-foreground text-center">
  {getBucketLabel(bucket, settings)}
</span>
```

**Also remove** the local `type Bucket` (line 16) and `BUCKET_ORDER` (line 18) declarations and import them from `@/lib/stageLabel` instead. The local `BUCKET_GROUPS` and `BUCKET_BUBBLE_CLASS` stay unchanged.

---

### `src/features/battle-log/BattleLogSheet.tsx` (component — modify existing)

**File:** `src/features/battle-log/BattleLogSheet.tsx` (lines 1-647 — full file, already read)

**Current DEFAULT_VALUES.mission** (line 58): `mission: "",`

**Current buildDefaultValues create path** (line 115):
```tsx
return { ...DEFAULT_VALUES, battle_date: todayISO(), ...prefill };
```

**Current useEffect for form reset** (lines 142-144):
```tsx
useEffect(() => {
  form.reset(buildDefaultValues(log, prefill));
}, [log, prefill]);
```

**Modification pattern** — read settings inside the component, pass mission default only on create:
```tsx
// Add to imports:
import { useAppSettings } from "@/hooks/useAppSettings";

// Add inside BattleLogSheet component body (after line 133):
const { data: settings } = useAppSettings();

// Modify buildDefaultValues call or derive mission before calling:
// Replace the create-path return in buildDefaultValues (or inline at call sites):
const missionDefault = (!log && settings?.["default_mission_format"]) 
  ? settings["default_mission_format"] 
  : "";

// Change useEffect dependency to include settings, and pass mission as prefill:
useEffect(() => {
  form.reset(buildDefaultValues(log, { mission: missionDefault, ...prefill }));
}, [log, prefill, missionDefault]);
```

**Pitfall guard** (RESEARCH.md Pitfall 5): `!log` condition ensures default only applies on create, never edit.

---

### `src/features/game-day/gameDayStore.ts` (store — modify existing)

**File:** `src/features/game-day/gameDayStore.ts` (lines 1-200 — full file, already read)

**Current synchronous init** (lines 186-194):
```ts
function createDefaultState(): GameDayListState {
  return {
    cp: 0,
    cpHistory: [],
    startingCp: 0,
    checklistItems: DEFAULT_CHECKLIST.map((item) => ({ ...item })),
    usedAbilities: [],
  };
}
```

**Modification pattern** — component-layer async init (RESEARCH.md Open Question 1 recommendation). Add a new Zustand action `setDefaultChecklist(listId, items)` alongside existing actions:

```ts
// In the GameDayStore interface, add:
setDefaultChecklist: (listId: number, items: ChecklistItem[]) => void;

// In the store implementation, add:
setDefaultChecklist: (listId, items) =>
  set((s) => {
    const key = String(listId);
    // Only set if this list has never been initialized (no existing state)
    if (s.listStates[key]) return s;  // don't overwrite in-progress session
    return {
      listStates: {
        ...s.listStates,
        [key]: { ...createDefaultState(), checklistItems: items },
      },
    };
  }),
```

**Async helper function** — add alongside `getAppSetting` import from query layer (see `src/db/queries/appSettings.ts` line 13):
```ts
import { getAppSetting } from "@/db/queries/appSettings";

export async function getDefaultChecklist(): Promise<ChecklistItem[]> {
  try {
    const raw = await getAppSetting("default_checklist");
    if (!raw) return DEFAULT_CHECKLIST.map((item) => ({ ...item }));
    const entries = JSON.parse(raw) as Array<{ text: string }>;
    return entries.map((e) => ({
      id: crypto.randomUUID(),
      text: e.text,
      checked: false,
    }));
  } catch {
    return DEFAULT_CHECKLIST.map((item) => ({ ...item }));
  }
}
```

**Usage in GameDayPage** — call `getDefaultChecklist()` on mount and trigger `setDefaultChecklist`:
```tsx
// In GameDayPage.tsx, after list loads:
const { setDefaultChecklist } = useGameDayStore();
const listState = useGameDayListState(listId);

useEffect(() => {
  if (!listState || !useGameDayStore.getState().listStates[String(listId)]) {
    getDefaultChecklist().then((items) => setDefaultChecklist(listId, items));
  }
}, [listId]);
```

---

## Shared Patterns

### Settings Read Pattern
**Source:** `src/hooks/useAppSettings.ts` lines 10-15
**Apply to:** All new settings editor components, `HobbyPipeline.tsx`, `BattleLogSheet.tsx`
```ts
const { data: settings = {} } = useAppSettings();
// settings is AppSettingsMap = Record<string, string>
// default {} avoids null checks; hook is backed by React Query cache
```

### Settings Write Pattern
**Source:** `src/hooks/useAppSettings.ts` lines 17-25
**Apply to:** All new settings editor components (PipelineLabelsEditor, ChecklistDefaultsEditor, MissionFormatEditor)
```ts
const updateSetting = useUpdateSetting();
updateSetting.mutate(
  { key: "your_key", value: "serialized_string" },
  { onError: () => toast.error("Failed to save.") },
);
// onSuccess: cache invalidated automatically → all useAppSettings() consumers re-render
```

### JSON Serialize/Deserialize in app_settings
**Source:** `src/db/queries/appSettings.ts` lines 13-20; RESEARCH.md Pattern 3
**Apply to:** `stageLabel.ts`, `PipelineLabelsEditor.tsx`, `ChecklistDefaultsEditor.tsx`, `gameDayStore.ts`
```ts
// Always wrap JSON.parse in try-catch; return safe default on error
try {
  const parsed = JSON.parse(raw) as ExpectedType;
  // use parsed
} catch {
  // fall back to hardcoded default — never throw
}
```

### Toast Error Pattern
**Source:** `src/features/battle-log/BattleLogSheet.tsx` lines 192-195
**Apply to:** All settings mutation calls
```ts
} catch {
  toast.error("Something went wrong. Please try again.");
}
// For mutation onError:
{ onError: () => toast.error("Failed to save.") }
```

### Instant-Save Uncontrolled Input
**Source:** RESEARCH.md Pattern 1; `src/app/settings/page.tsx` load guard (lines 18-26)
**Apply to:** `PipelineLabelsEditor.tsx`, `MissionFormatEditor.tsx`
```tsx
<Input
  key={resolvedDefaultValue}   // forces remount when settings load
  defaultValue={resolvedDefaultValue}
  placeholder={fallbackText}
  onBlur={(e) => handleSave(e.target.value)}
/>
```

### dnd-kit Vertical Sortable List
**Source:** `src/features/recipes/RecipeStepList.tsx` lines 1-88 (full file read)
**Apply to:** `ChecklistDefaultsEditor.tsx`
- Copy sensor setup verbatim (lines 29-32)
- Copy `DndContext` + `SortableContext` structure (lines 67-79)
- Copy `handleDragEnd` with `arrayMove` (lines 34-41)
- Per-row: copy `useSortable` + `CSS.Transform.toString` from `RecipeStepRow.tsx` lines 33-40

---

## Test Files

| Test File | Analog | Notes |
|-----------|--------|-------|
| `tests/settings/stageLabel.test.ts` | `tests/` structure (no direct analog exists) | Unit tests for `getBucketLabel`: custom label, fallback, malformed JSON |
| `tests/settings/HobbyDefaultsSection.test.tsx` | `tests/settings/SettingsPage.test.tsx` (Phase 121) | Component tests: label render, add/delete checklist, mission blur-save |
| `tests/battle-log/BattleLogSheet.test.tsx` | Check if exists first | HOB-03 mission pre-fill create vs. edit guard |

---

## No Analog Found

No files in this phase lack a close analog. All patterns exist in the codebase.

---

## Metadata

**Analog search scope:** `src/features/`, `src/hooks/`, `src/db/queries/`, `src/lib/`, `src/app/settings/`
**Files scanned:** 12 source files read directly
**Pattern extraction date:** 2026-06-10
