# Phase 123: Hobby Defaults Tab - Research

**Researched:** 2026-06-10
**Domain:** React settings UI, dnd-kit sortable, JSON serialization in key-value store, Zustand async init
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pipeline Stage Labels (HOB-01)**
- D-01: Store custom labels as JSON map in `app_settings` (key: `pipeline_labels`, value: `{"Built": "Assembled", ...}`). Only overridden labels are stored — missing keys fall back to default name from `PAINTING_STATUS_ORDER`.
- D-02: `PAINTING_STATUS_ORDER` array in `src/types/unit.ts` stays unchanged — source of truth for internal logic, DB values, and ordering. Custom labels are display-only overlay.
- D-03: Utility function `getStageLabel(status: PaintingStatus, settings: AppSettingsMap): string` resolves display labels. Falls back to raw status name when no custom label exists.
- D-04: The 5 customizable labels are the HobbyPipeline *bucket* labels (Not Started / Assembly / Painting / Finishing / Done), not the 11 individual statuses.
- D-05: Consuming components (`HobbyPipeline`, `UnitFilters`, `KanbanBoard`, `StatusPopover`) read `useAppSettings()` and pass through the label resolver. No new context provider needed.

**Pre-Game Checklist Defaults (HOB-02)**
- D-06: Store custom checklist as JSON array in `app_settings` (key: `default_checklist`, value: `[{"text": "Verify army list points"}, ...]`). IDs generated at session-init time.
- D-07: When no custom value exists, fall back to current `DEFAULT_CHECKLIST` in `gameDayStore.ts`.
- D-08: Editor UI: inline editable list with text input + add button, delete buttons per item, drag-to-reorder via existing `@dnd-kit`.
- D-09: `gameDayStore.ts` reads from `app_settings` at session-init time via `getAppSetting("default_checklist")` from query layer, parse JSON, fall back to hardcoded defaults.

**Mission Format Default (HOB-03)**
- D-10: Store a string in `app_settings` (key: `default_mission_format`). Free-text, no enum.
- D-11: `BattleLogSheet` reads the default value from settings and uses it as initial value for `mission` field when creating a new log (not editing).
- D-12: Settings UI: simple text input labeled "Default Mission Format" with placeholder "e.g., Take and Hold, Leviathan, etc."

**Settings UI Layout**
- D-13: All three sections live within the Preferences tab as a "Hobby Defaults" section group, separated from general preferences by a `<Separator />`.
- D-14: Save is instant on change/blur (no explicit Save button).

### Claude's Discretion
- Component file organization within `src/features/settings/` or `src/app/settings/`
- Whether pipeline label fields use inline editing or a form with explicit Save button
- Exact layout and spacing of the hobby defaults section
- How to handle the Zustand store async read from settings (sync init vs. lazy load)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOB-01 | User can rename the 5 painting pipeline stage labels from Settings | Label resolver utility pattern, bucket-level customization, 4 consuming component integrations identified |
| HOB-02 | User can customize default pre-game checklist items from Settings | dnd-kit sortable pattern confirmed from existing usage, gameDayStore init path identified |
| HOB-03 | User can set a default mission format for new battle logs | BattleLogSheet `buildDefaultValues` pattern identified, simple settings read on create only |
</phase_requirements>

---

## Summary

Phase 123 adds a "Hobby Defaults" section to the existing Settings Preferences tab (from Phase 121). The phase requires three sub-features: pipeline bucket label customization (HOB-01), default checklist editor with drag-to-reorder (HOB-02), and default mission format pre-fill (HOB-03). All persistence flows through the Phase 121 `app_settings` key-value store via `useAppSettings()` / `useUpdateSetting()`.

The infrastructure is fully in place from Phase 121. No new packages are required — `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` are all installed, and multiple existing components demonstrate the exact drag-to-reorder pattern needed for HOB-02. The settings hook layer (`useAppSettings`, `useUpdateSetting`) is tested and ready to consume.

The primary complexity lies in HOB-01: four consuming components across different features must be updated to resolve bucket labels dynamically, which means the label resolver utility must be created before any consumer touches it. HOB-02 has a Zustand async init challenge because `getAppSetting` is async but `createDefaultState()` in `gameDayStore.ts` is synchronous — the resolution strategy (lazy load on first access vs. a module-level init) is left to the planner's discretion per D-09.

**Primary recommendation:** Ship in two tasks — (1) Settings UI + utility function for all three controls, (2) wire consuming components and stores. The utility function is the integration seam: write it first so all consumers can import it in the same task or subsequent tasks without circular dependency concerns.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Settings persistence (read/write) | API / Backend (SQLite via Tauri) | — | `app_settings` table accessed via `appSettings.ts` query module |
| Settings React Query cache | Frontend Server (React Query) | — | `useAppSettings()` / `useUpdateSetting()` provide global cache |
| Label resolver utility | Frontend (pure utility) | — | Pure function, no side effects, importable anywhere |
| Settings UI (input fields, DnD editor) | Browser / Client | — | React component tree within SettingsPage |
| Pipeline label display in HobbyPipeline | Browser / Client | React Query | Reads `useAppSettings()`, applies resolver at render time |
| Pipeline label display in KanbanColumn | Browser / Client | React Query | Reads `useAppSettings()`, applies resolver at render time |
| Status filter label in UnitFilters | Browser / Client | React Query | Reads `useAppSettings()`, applies resolver at render time |
| StatusPopover label | Browser / Client | React Query | Reads `useAppSettings()`, applies resolver at render time |
| Default checklist init in gameDayStore | Browser / Client (Zustand) | API / Backend | Async read at session-init time from `app_settings` |
| BattleLogSheet mission pre-fill | Browser / Client | React Query | Read from `useAppSettings()` at form init (create mode only) |

---

## Standard Stack

### Core (all already installed) [VERIFIED: codebase grep]

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/core` | 6.3.1 | DnD context, sensors, drag events | Already used by KanbanBoard, RecipeStepList, ArmyListDetailPage |
| `@dnd-kit/sortable` | 10.0.0 | `useSortable`, `SortableContext`, `arrayMove` | Already used for vertical list reorder in RecipeStepList |
| `@dnd-kit/utilities` | 3.2.2 | `CSS.Transform.toString()` for transform style | Used in RecipeStepRow, KanbanCard |
| `useAppSettings` / `useUpdateSetting` | Phase 121 | Settings read/write with React Query | Project-standard settings hook |
| `sonner` toast | project-wide | Error feedback on failed saves | Established error pattern across all features |

### Packages NOT Required
`@dnd-kit/modifiers` (provides `restrictToVerticalAxis`) is **not installed** in this project. [VERIFIED: package.json + node require check]

The UI-SPEC references `restrictToVerticalAxis` — this modifier is unavailable. The planner must choose between: (a) installing `@dnd-kit/modifiers`, or (b) constraining drag axis via `activationConstraint` only (pointer distance threshold already used in KanbanBoard/RecipeStepList). Given that existing vertical lists in the project work without the modifier, option (b) is the simpler path.

### Installation (if @dnd-kit/modifiers chosen)
```bash
npm view @dnd-kit/modifiers version
# verify version before installing
pnpm add @dnd-kit/modifiers
```

---

## Package Legitimacy Audit

> No new packages are required for this phase. All dnd-kit packages (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`) are already installed and in active use within the codebase. No audit table required.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

If `@dnd-kit/modifiers` is added: it is the official companion package published by the dnd-kit team alongside core/sortable. [ASSUMED] — not independently verified via slopcheck in this session since the decision to install it is at planner discretion.

---

## Architecture Patterns

### System Architecture Diagram

```
Settings UI (SettingsPage → Preferences tab → HobbyDefaults section)
    │
    │  read via useAppSettings()   write via useUpdateSetting()
    ▼                                       │
React Query cache ["app-settings"]          │
    │                                       ▼
    │                              SQLite app_settings table
    │                              (key: pipeline_labels / default_checklist / default_mission_format)
    │
    ├──► getStageLabel(status, settings) ──► HOB-01 consumers:
    │         (pure utility, no side effects)    HobbyPipeline (bucket labels)
    │                                           KanbanColumn (column header)
    │                                           UnitFilters (status filter options)
    │                                           StatusPopover (status list items)
    │
    ├──► gameDayStore.createDefaultState() ─► HOB-02:
    │         (reads app_settings async at       ChecklistItem[] for new sessions
    │          session-init, falls back to
    │          DEFAULT_CHECKLIST)
    │
    └──► BattleLogSheet buildDefaultValues() ► HOB-03:
              (reads useAppSettings() at          mission field pre-filled on create
               component mount, create mode only)
```

### Recommended Project Structure
```
src/
  features/
    settings/
      HobbyDefaultsSection.tsx     # new: wrapper for all 3 sub-sections
      PipelineLabelsEditor.tsx     # new: 5 bucket label inputs
      ChecklistDefaultsEditor.tsx  # new: DnD sortable checklist editor
      MissionFormatEditor.tsx      # new: single input for mission format
  lib/
    stageLabel.ts                  # new: getStageLabel() + getBucketLabel() utilities
  app/
    settings/
      page.tsx                     # existing: add HobbyDefaultsSection + Separator
```

### Pattern 1: Instant Save on Blur (HOB-01, HOB-03)

**What:** Input renders with `defaultValue` (uncontrolled) from settings map. On `onBlur`, call `useUpdateSetting().mutate()`. No Save button.
**When to use:** Single-field settings where transient editing state does not need to be reflected elsewhere in real time.

```tsx
// Source: CONTEXT.md D-14; UI-SPEC interaction patterns
function PipelineLabelInput({ bucket, settings, onSave }: Props) {
  const defaultVal = settings["pipeline_labels"]
    ? (JSON.parse(settings["pipeline_labels"]) as Record<string, string>)[bucket] ?? bucket
    : bucket;

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const trimmed = e.target.value.trim();
    const label = trimmed || bucket; // empty reverts to default

    // Load existing map, merge, save
    const existing: Record<string, string> = settings["pipeline_labels"]
      ? JSON.parse(settings["pipeline_labels"])
      : {};

    if (label === bucket) {
      delete existing[bucket]; // remove override to save space
    } else {
      existing[bucket] = label;
    }
    onSave(JSON.stringify(existing));
  }

  return (
    <Input
      key={defaultVal} // re-mount when settings load to pick up defaultValue
      defaultValue={defaultVal}
      placeholder={bucket}
      className="max-w-xs"
      onBlur={handleBlur}
    />
  );
}
```

**Key pitfall:** `defaultValue` on an uncontrolled input does not update when `settings` changes unless the component is remounted (via `key` prop). Use `key={defaultVal}` or switch to controlled (`value` + `onChange`).

### Pattern 2: Sortable Vertical List (HOB-02)

**What:** dnd-kit `DndContext` + `SortableContext` + `useSortable` per row + `arrayMove` on drag end. Pattern is identical to `RecipeStepList`.
**When to use:** Any vertically ordered list that needs drag-to-reorder.

```tsx
// Source: src/features/recipes/RecipeStepList.tsx (existing project pattern)
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const oldIndex = items.findIndex((i) => i.id === active.id);
  const newIndex = items.findIndex((i) => i.id === over.id);
  const reordered = arrayMove(items, oldIndex, newIndex);
  saveItems(reordered); // instant save after reorder
}
```

```tsx
// Per-row via useSortable (source: RecipeStepRow.tsx pattern)
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
```

### Pattern 3: Label Resolver Utility (HOB-01)

**What:** Pure function that resolves bucket display labels. Not component-scoped — lives in `src/lib/stageLabel.ts` so it is importable by any consumer.

```ts
// Source: CONTEXT.md D-03, D-04
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

**Consumers call:** `getBucketLabel(bucket, settings)` where `settings` comes from `useAppSettings().data ?? {}`.

Note: HOB-01 scope is bucket labels only (5 buckets). `StatusPopover` and `UnitFilters` use the 11 individual `PAINTING_STATUS_ORDER` statuses — these are NOT customizable in this phase (D-02). The CONTEXT.md lists them as integration points for label resolver, but the resolver only covers bucket-level names. For `UnitFilters` and `StatusPopover`, the individual status names remain hardcoded (the internal values are the display values, unchanged per D-02). These two components do NOT need changes in Phase 123.

### Pattern 4: BattleLogSheet Mission Pre-fill (HOB-03)

**What:** `BattleLogSheet` already accepts a `prefill?: Partial<BattleLogFormValues>` prop and passes it to `buildDefaultValues`. The simplest integration is to read the setting in the parent component that renders `BattleLogSheet` and pass it as `prefill={{ mission: settingValue }}` when `log === null`.

**Alternative:** Read `useAppSettings()` inside `BattleLogSheet` directly and merge into `buildDefaultValues`. This is self-contained and avoids prop drilling.

```tsx
// Source: BattleLogSheet.tsx buildDefaultValues pattern + CONTEXT.md D-11
// Inside BattleLogSheet, add:
const { data: settings } = useAppSettings();

// Modify DEFAULT_VALUES construction:
const defaultMission = (!log && settings?.["default_mission_format"]) ? settings["default_mission_format"] : "";
const DEFAULT_VALUES_WITH_MISSION = { ...DEFAULT_VALUES, mission: defaultMission };

// Then in buildDefaultValues, use DEFAULT_VALUES_WITH_MISSION for the create path
```

The `useEffect` that calls `form.reset(buildDefaultValues(log, prefill))` when `log` or `prefill` changes must also account for settings loading: trigger reset when `settings` becomes available (add `settings` to the dependency array).

### Pattern 5: gameDayStore Async Init (HOB-02, D-09)

**What:** `createDefaultState()` is currently synchronous and returns a clone of the hardcoded `DEFAULT_CHECKLIST`. D-09 requires it to read from `app_settings` instead.

**Challenge:** `getAppSetting` is async; Zustand `getListState` is a synchronous getter used during sync state access. A full async init inside the Zustand store is non-trivial.

**Recommended approach (deferred to planner):** Lazy async load — expose a new `initDefaultsFromSettings(listId, items)` Zustand action. The component that first renders the Game Day session for a list calls `getAppSetting("default_checklist")` via the React Query cache or a one-time async call, then calls `initDefaultsFromSettings(listId, parsed)` if the list state has never been initialized. This keeps the Zustand store synchronous; the async work happens in the React component layer.

**Simple alternative:** Use the existing `prefill`-style approach — `useGameDayListState` already returns `createDefaultState()` as the fallback when `state.listStates[listId]` is undefined. The Game Day page component can detect this case and trigger an async settings read to replace the defaults.

### Anti-Patterns to Avoid

- **Storing all 11 status labels in `pipeline_labels`:** The editable labels are only the 5 bucket names. Storing individual PAINTING_STATUS_ORDER status labels would change internal DB values. Do not conflate bucket display labels with status internal values.
- **Controlled input with settings as source of truth during typing:** Using `value={settings["pipeline_labels"]}` as a controlled input causes every keystroke to be saved. Use `defaultValue` (uncontrolled) + `onBlur` save.
- **Forgetting `key` prop on defaultValue inputs:** Without remounting via `key`, inputs that render before settings load will keep their initial empty `defaultValue` even after settings arrive.
- **Mutating DEFAULT_CHECKLIST directly in gameDayStore:** The `createDefaultState()` function clones DEFAULT_CHECKLIST with `map((item) => ({ ...item }))`. The async init must produce a new array with new IDs, not reference the stored `id` values from settings (D-06 states IDs are generated at session-init time, not stored).
- **Adding label resolver to StatusPopover for individual statuses:** StatusPopover shows the 11 individual statuses (unchanged per D-02). Only the 5 bucket labels are customizable. Do not add resolver calls to StatusPopover or UnitFilters status list.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-to-reorder sortable list | Custom mouse event handlers | `@dnd-kit/sortable` (already installed) | Handles accessibility, keyboard nav, touch, drag overlay — already proven in 4 places in codebase |
| Array reorder after drag | Splice + insert logic | `arrayMove` from `@dnd-kit/sortable` | Handles edge cases, already imported in RecipeStepList |
| JSON serialize/deserialize app_settings values | Custom format | `JSON.stringify` / `JSON.parse` with try-catch | Consistent with project convention; `app_settings.value` is TEXT; all type coercion in hook layer |
| Settings cache invalidation | Manual state sync | `useUpdateSetting()` mutation with `qc.invalidateQueries` | Already handles cache invalidation; all components reading `useAppSettings()` update automatically |
| Toast on save error | Custom error UI | `sonner` toast (already used project-wide) | Consistent error experience |

**Key insight:** Every pattern needed by this phase already exists in the codebase. The phase is pure feature extension, not infrastructure.

---

## Common Pitfalls

### Pitfall 1: Uncontrolled Input / defaultValue Stale After Settings Load

**What goes wrong:** Pipeline label inputs or mission format input render before `useAppSettings()` returns data. With `defaultValue=""`, the input initializes empty. When settings load, React does not update an uncontrolled input's displayed value.

**Why it happens:** `defaultValue` only sets the initial DOM value on mount. If the component mounts during the React Query loading state, the input is empty and stays empty even after data arrives.

**How to avoid:** Use `key={resolvedDefaultValue}` on the `<Input>` element so it remounts when the resolved value changes. Or render the input section inside `{!isLoading && !isError && (...)` so inputs only mount after settings are ready (consistent with the existing SettingsPage loading guard).

**Warning signs:** Inputs that appear blank even after settings have loaded.

---

### Pitfall 2: JSON Parse Failure Silently Breaking Display

**What goes wrong:** If `app_settings["pipeline_labels"]` contains malformed JSON (e.g., from a manual DB edit or migration issue), `JSON.parse()` throws and the entire settings display breaks.

**Why it happens:** All `app_settings` values are stored as raw TEXT. There is no schema enforcement on the value column.

**How to avoid:** Always wrap `JSON.parse` in try-catch in the label resolver and return the default value on error. The label resolver utility should never throw.

**Warning signs:** Pipeline labels all show as empty or the bucket names disappear from the dashboard.

---

### Pitfall 3: gameDayStore Existing Sessions Not Affected by Default Changes

**What goes wrong:** A user customizes their default checklist, but an already-initialized session (one that exists in `listStates[listId]`) doesn't reflect the new defaults.

**Why it happens:** `createDefaultState()` is only called when `listStates[listId]` is `undefined`. An existing session already has its `checklistItems` set and Zustand persists them in localStorage. Changing the defaults in `app_settings` does NOT retroactively update existing sessions.

**Why this is correct behavior:** D-07 says "new Game Day sessions start with the customized checklist." Existing sessions are intentional in-progress work — overwriting them would be destructive.

**Warning signs:** None — this is expected behavior. But the Settings UI description copy must reflect it: "Items copied into every **new** Game Day session." (UI-SPEC already has this wording.)

---

### Pitfall 4: @dnd-kit/modifiers Not Installed

**What goes wrong:** UI-SPEC references `restrictToVerticalAxis` modifier but `@dnd-kit/modifiers` is not in `package.json`. Importing it will cause a build error.

**Why it happens:** The UI-SPEC was written referencing the full dnd-kit API surface, but this project only installed the subset it needed.

**How to avoid:** Either install `@dnd-kit/modifiers` (`pnpm add @dnd-kit/modifiers`) or omit the modifier entirely. The existing recipe and kanban DnD patterns work correctly without it — users cannot drag horizontally in a vertical list because there are no horizontal drop targets. The axis restriction is cosmetic, not functional.

**Warning signs:** TypeScript/build error: `Cannot find module '@dnd-kit/modifiers'`.

---

### Pitfall 5: BattleLogSheet Mission Pre-fill Triggered on Edit Mode

**What goes wrong:** The settings-based default mission format appears when editing an existing battle log, overwriting the actual recorded mission.

**Why it happens:** `buildDefaultValues` is called with both the `log` object (edit) and `prefill` (create). The settings read must be conditional on `log === null`.

**How to avoid:** Per D-11: apply the setting default only when `log === null`. The `buildDefaultValues` function already handles this — `DEFAULT_VALUES.mission = ""` is only used on the create path. The settings value must replace the empty string default only when `!log`.

**Warning signs:** Users editing existing battle logs see their settings default in the mission field instead of the logged mission.

---

## Code Examples

### Checklist Item Type for settings (display-only, no IDs stored)

```ts
// Source: CONTEXT.md D-06
// Stored in app_settings as JSON: [{"text": "Verify army list points"}, ...]
export interface DefaultChecklistEntry {
  text: string;
}
```

### Checklist initialization in gameDayStore (async approach)

```ts
// Source: CONTEXT.md D-09; gameDayStore.ts createDefaultState() pattern
import { getAppSetting } from "@/db/queries/appSettings";

async function getDefaultChecklist(): Promise<ChecklistItem[]> {
  try {
    const raw = await getAppSetting("default_checklist");
    if (!raw) return DEFAULT_CHECKLIST.map((item) => ({ ...item }));
    const entries = JSON.parse(raw) as Array<{ text: string }>;
    return entries.map((e) => ({
      id: crypto.randomUUID(),  // IDs generated at session-init, not stored
      text: e.text,
      checked: false,
    }));
  } catch {
    return DEFAULT_CHECKLIST.map((item) => ({ ...item }));
  }
}
```

### HobbyPipeline integration (HOB-01)

```tsx
// Source: HobbyPipeline.tsx + CONTEXT.md D-05
import { useAppSettings } from "@/hooks/useAppSettings";
import { getBucketLabel, BUCKET_ORDER } from "@/lib/stageLabel";

export function HobbyPipeline({ units }: HobbyPipelineProps) {
  const { data: settings = {} } = useAppSettings();
  // ...
  return (
    // ... existing JSX
    {BUCKET_ORDER.map((bucket) => (
      <li key={bucket} ...>
        <span className="text-xs text-muted-foreground text-center">
          {getBucketLabel(bucket, settings)}  {/* was: {bucket} */}
        </span>
        // ...
      </li>
    ))}
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded bucket labels in HobbyPipeline | Dynamic labels from app_settings via resolver | Phase 123 | HobbyPipeline, KanbanColumn headers can show custom names |
| Hardcoded DEFAULT_CHECKLIST cloned on every session | DEFAULT_CHECKLIST replaced by user-configured list from app_settings | Phase 123 | New Game Day sessions use custom checklist |
| BattleLogSheet mission always starts empty | BattleLogSheet mission pre-fills from settings if set | Phase 123 | Fewer keystrokes for players with a regular mission format |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | StatusPopover and UnitFilters do NOT need label resolver integration (they show individual status names, not bucket names — not customizable per D-02) | Architecture, Anti-Patterns | If scope expands to individual status names, 2 more components need updating |
| A2 | `@dnd-kit/modifiers` absence is acceptable — vertical axis restriction is omittable without functional regression | Standard Stack, Pitfall 4 | If modifiers are required, one `pnpm add` solves it; negligible risk |
| A3 | BattleLogSheet `useAppSettings` can be called inside the component directly (not passed via prop) without creating prop-drilling or circular dependency issues | Architecture Patterns (Pattern 4) | If BattleLogSheet caller already has settings data, prop passing is equally valid |

---

## Open Questions (RESOLVED)

1. **gameDayStore async init strategy**
   - What we know: `createDefaultState()` is synchronous; `getAppSetting` is async; Zustand store is initialized synchronously from localStorage persist.
   - What's unclear: Whether the lazy async init should be triggered from the store itself (e.g., an async `initListIfNeeded` action) or from the React component layer (Game Day page calls async fetch + calls `initListState` Zustand action).
   - RESOLVED: Component-layer approach — Game Day page reads `useAppSettings()` (already in React Query cache), detects no existing list state, and calls a new Zustand action `setDefaultItems(listId, items)` with the parsed checklist. This avoids making the store dependent on an async import.

2. **KanbanColumn bucket label integration scope**
   - What we know: KanbanColumn shows individual `status: PaintingStatus` as column headers (the 11 statuses, not 5 buckets). HobbyPipeline shows the 5 bucket labels.
   - What's unclear: The CONTEXT.md D-05 lists KanbanBoard as a consumer of the label resolver, but the bucket grouping only exists in HobbyPipeline. KanbanColumn headers show individual status names (e.g., "Built", "Primed") — these are not the customizable bucket labels.
   - RESOLVED: KanbanColumn does NOT need HOB-01 integration. Only HobbyPipeline (bucket labels) needs updating. CONTEXT.md D-05 updated to reflect this scope boundary.

---

## Environment Availability

Step 2.6: SKIPPED — no new external tools, services, or CLI utilities. All dependencies are already installed packages in the existing Node.js project. [VERIFIED: package.json]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + React Testing Library 16.3.2 |
| Config file | `vite.config.ts` (vitest inline config) |
| Quick run command | `pnpm test -- tests/settings/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOB-01 | `getBucketLabel()` returns custom label when set in settings | unit | `pnpm test -- tests/settings/stageLabel.test.ts` | ❌ Wave 0 |
| HOB-01 | `getBucketLabel()` falls back to bucket name when no override | unit | `pnpm test -- tests/settings/stageLabel.test.ts` | ❌ Wave 0 |
| HOB-01 | `getBucketLabel()` handles malformed JSON without throwing | unit | `pnpm test -- tests/settings/stageLabel.test.ts` | ❌ Wave 0 |
| HOB-01 | HobbyPipeline renders custom bucket label from settings | component | `pnpm test -- tests/settings/HobbyDefaultsSection.test.tsx` | ❌ Wave 0 |
| HOB-02 | ChecklistDefaultsEditor shows items, allows add/delete | component | `pnpm test -- tests/settings/HobbyDefaultsSection.test.tsx` | ❌ Wave 0 |
| HOB-02 | Delete button disabled when only 1 item remains | component | `pnpm test -- tests/settings/HobbyDefaultsSection.test.tsx` | ❌ Wave 0 |
| HOB-02 | `getDefaultChecklist()` returns DEFAULT_CHECKLIST when no setting | unit | `pnpm test -- tests/settings/stageLabel.test.ts` | ❌ Wave 0 |
| HOB-03 | MissionFormatEditor saves on blur | component | `pnpm test -- tests/settings/HobbyDefaultsSection.test.tsx` | ❌ Wave 0 |
| HOB-03 | BattleLogSheet pre-fills mission field on create when setting exists | component | `pnpm test -- tests/battle-log/BattleLogSheet.test.tsx` | ❌ Wave 0 (check for existing) |
| HOB-03 | BattleLogSheet does NOT pre-fill mission on edit | component | `pnpm test -- tests/battle-log/BattleLogSheet.test.tsx` | ❌ Wave 0 (check for existing) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/settings/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/settings/stageLabel.test.ts` — covers HOB-01 label resolver unit tests (getBucketLabel)
- [ ] `tests/settings/HobbyDefaultsSection.test.tsx` — covers HOB-01 UI, HOB-02 add/delete/min-item, HOB-03 save on blur
- [ ] `tests/battle-log/BattleLogSheet.test.tsx` — covers HOB-03 mission pre-fill behavior (check if file exists first)

---

## Security Domain

> `security_enforcement` not explicitly set to false in config — defaulting to enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — local desktop app, single user |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a — single user |
| V5 Input Validation | yes | Zod not used here; text inputs are display labels, no SQL injection surface (parameterized queries via Tauri plugin-sql) |
| V6 Cryptography | no | n/a |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JSON injection in app_settings value | Tampering | try-catch in all JSON.parse calls; malformed values fall back to defaults |
| XSS via custom label rendered in JSX | Spoofing | React JSX auto-escapes string interpolation — custom labels rendered as text nodes, not innerHTML |
| Prototype pollution via JSON.parse | Tampering | Labels are read as `Record<string, string>` — not spread into prototype-sensitive objects; low risk in practice |

No significant security surface area for this phase — local SQLite read/write with no network exposure.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct reads — `src/hooks/useAppSettings.ts`, `src/db/queries/appSettings.ts`, `src/features/dashboard/HobbyPipeline.tsx`, `src/features/game-day/gameDayStore.ts`, `src/features/battle-log/BattleLogSheet.tsx`, `src/features/painting-projects/KanbanColumn.tsx`, `src/features/units/StatusPopover.tsx`, `src/features/units/UnitFilters.tsx`
- dnd-kit usage patterns — `src/features/recipes/RecipeStepList.tsx`, `src/features/recipes/RecipeStepRow.tsx`, `src/features/painting-projects/KanbanBoard.tsx`
- Phase context — `.planning/phases/123-hobby-defaults-tab/123-CONTEXT.md` (locked decisions)
- Phase UI spec — `.planning/phases/123-hobby-defaults-tab/123-UI-SPEC.md`
- Phase 121 context — `.planning/phases/121-settings-foundation/121-CONTEXT.md`
- Package versions — `package.json` (dnd-kit versions, testing framework versions)

### Secondary (MEDIUM confidence)
- REQUIREMENTS.md — HOB-01/02/03 requirement text
- STATE.md — accumulated context and key decisions

### Tertiary (LOW confidence)
- None — all claims verified against codebase or context files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json
- Architecture: HIGH — all integration points verified by reading source files
- Pitfalls: HIGH — derived from direct code reading (uncontrolled inputs, gameDayStore sync init, etc.)
- Validation architecture: MEDIUM — test file locations inferred from existing pattern (tests/ mirrors src/ structure)

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (stable stack — no fast-moving dependencies)
