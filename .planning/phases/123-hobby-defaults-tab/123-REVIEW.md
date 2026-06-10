---
phase: 123-hobby-defaults-tab
reviewed: 2026-06-10T12:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src/app/settings/page.tsx
  - src/features/battle-log/BattleLogSheet.tsx
  - src/features/dashboard/HobbyPipeline.tsx
  - src/features/game-day/GameDayPage.tsx
  - src/features/game-day/gameDayStore.ts
  - src/features/settings/ChecklistDefaultsEditor.tsx
  - src/features/settings/HobbyDefaultsSection.tsx
  - src/features/settings/MissionFormatEditor.tsx
  - src/features/settings/PipelineLabelsEditor.tsx
  - src/lib/stageLabel.ts
  - tests/dashboard/HobbyPipeline.test.tsx
  - tests/settings/HobbyDefaultsSection.test.tsx
  - tests/settings/HobbyPipelineIntegration.test.tsx
  - tests/settings/stageLabel.test.ts
findings:
  critical: 1
  warning: 5
  info: 1
  total: 7
status: issues_found
---

# Phase 123: Code Review Report

**Reviewed:** 2026-06-10T12:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 123 introduces the Hobby Defaults tab in Settings: pipeline stage label customization, default pre-game checklist editor with drag-and-drop, and a default mission format field. The new `stageLabel.ts` utility is clean and well-tested. However, there is a misuse of `useMemo` as a side-effect hook that violates React rules, a missing `useEffect` dependency that suppresses re-syncs, an unhandled race condition in the GameDay page, and several lesser issues.

## Critical Issues

### CR-01: useMemo abused as side-effect hook in ChecklistDefaultsEditor

**File:** `src/features/settings/ChecklistDefaultsEditor.tsx:120-122`
**Issue:** `useMemo` is used to call `setItems(initialItems)` -- a state setter -- as a side effect. React explicitly warns that `useMemo` must not have side effects; the render-phase call to `setItems` during a `useMemo` body is undefined behavior. In React 19 strict mode and concurrent rendering, React may call the `useMemo` factory function multiple times or discard its result, causing `setItems` to fire at unpredictable times (or not at all). This can silently desynchronize the local `items` state from the `initialItems` derived from settings.
**Fix:** Replace the `useMemo` with a proper `useEffect`:
```tsx
useEffect(() => {
  setItems(initialItems);
}, [initialItems]);
```

## Warnings

### WR-01: Missing `form` in useEffect dependency array causes stale reset

**File:** `src/features/battle-log/BattleLogSheet.tsx:145-147`
**Issue:** The `useEffect` that calls `form.reset(...)` lists `[log, prefill, missionDefault]` as dependencies but omits `form`. While `react-hook-form`'s `form` object is typically stable across renders, the linter rule `react-hooks/exhaustive-deps` would flag this. More critically, if the `form` instance ever changes (e.g., due to a parent remount), the effect will use a stale reference and the reset will target the wrong form instance.
**Fix:** Add `form` to the dependency array:
```tsx
useEffect(() => {
  form.reset(buildDefaultValues(log, { ...prefill, mission: missionDefault || prefill?.mission || "" }));
}, [form, log, prefill, missionDefault]);
```

### WR-02: Race condition -- unguarded async in useEffect for default checklist

**File:** `src/features/game-day/GameDayPage.tsx:33-38`
**Issue:** The `useEffect` calls `getDefaultChecklist().then(...)` without any cleanup or cancellation guard. If the component unmounts or `listId` changes before the promise resolves, `setDefaultChecklist` will still fire for the old `listId`, potentially initializing a stale session. In fast navigation scenarios (user clicks through multiple army lists quickly), checklist items for the wrong list could be written.
**Fix:** Add a cleanup flag:
```tsx
useEffect(() => {
  const existing = useGameDayStore.getState().listStates[String(listId)];
  if (existing) return;
  let cancelled = false;
  getDefaultChecklist().then((items) => {
    if (!cancelled) {
      useGameDayStore.getState().setDefaultChecklist(listId, items);
    }
  });
  return () => { cancelled = true; };
}, [listId]);
```

### WR-03: MissionFormatEditor saves empty string instead of deleting the setting

**File:** `src/features/settings/MissionFormatEditor.tsx:14-19`
**Issue:** When the user clears the mission format input and blurs, `handleBlur` saves `trimmed` which is `""` (empty string). This persists an empty-string row in `app_settings`. Downstream in `BattleLogSheet.tsx:133`, the check `settings?.["default_mission_format"]` is truthy for `""` in the settings map (since `AppSettingsMap` stores all values as strings and `""` is retrieved from the DB as a string). However, this is inconsistent with how `PipelineLabelsEditor` handles the "reset to default" case (it deletes the key from the JSON object). The empty string will be used as the mission pre-fill, overriding the `prefill?.mission` fallback on line 146.

Wait -- re-examining: `""` is falsy in JS, so `settings?.["default_mission_format"]` evaluates to `""` which is falsy, so `missionDefault` on line 133 would be `""`. Then on line 146 the spread `mission: missionDefault || prefill?.mission || ""` correctly falls back. So the downstream behavior is accidentally correct, but the DB still accumulates a dead row with `value=""`. This is a minor data hygiene issue but not a runtime bug.
**Fix:** Skip the save when the value is empty, or delete the setting:
```tsx
function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
  const trimmed = e.target.value.trim();
  if (!trimmed) {
    // Optionally delete the setting instead of saving empty string
    return;
  }
  updateSetting.mutate(
    { key: "default_mission_format", value: trimmed },
    { onError: () => toast.error("Could not save setting. Try again.") },
  );
}
```

### WR-04: PipelineLabelsEditor double-parses JSON on every render

**File:** `src/features/settings/PipelineLabelsEditor.tsx:14-22, 39`
**Issue:** `parseLabels()` is called once at line 39 (during render) and again inside `handleBlur` (line 27). The render-time call on line 39 runs `JSON.parse` on every render without memoization. While not a correctness bug, it means every keystroke or re-render re-parses the JSON. More importantly, `parseLabels()` returns a fresh object each time, and if `handleBlur` fires in the same render cycle, `existing` in `handleBlur` could be stale relative to the most recent save (because React Query invalidation is async).
**Fix:** Memoize the parsed labels:
```tsx
const parsed = useMemo(() => {
  const raw = settings["pipeline_labels"];
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, string>; }
  catch { return {}; }
}, [settings["pipeline_labels"]]);
```

### WR-05: getDefaultChecklist does not validate parsed array entries

**File:** `src/features/game-day/gameDayStore.ts:220-222`
**Issue:** The `JSON.parse(raw)` result is cast as `Array<{ text: string }>` without runtime validation. If the stored JSON is `[{"text": 123}, null, "hello"]`, the `.map` call would produce checklist items with non-string `text` values or crash on null entries. The `ChecklistDefaultsEditor` always writes well-formed data, but a manual DB edit or data corruption could cause a runtime error.
**Fix:** Add minimal runtime validation:
```tsx
const parsed = JSON.parse(raw);
if (!Array.isArray(parsed)) return DEFAULT_CHECKLIST.map((item) => ({ ...item }));
return parsed
  .filter((entry): entry is { text: string } =>
    entry != null && typeof entry === "object" && typeof entry.text === "string"
  )
  .map((entry) => ({
    id: crypto.randomUUID(),
    text: entry.text,
    checked: false,
  }));
```

## Info

### IN-01: Redundant ternary in BattleLogSheet submit button label

**File:** `src/features/battle-log/BattleLogSheet.tsx:642`
**Issue:** The ternary `isEdit ? "Update Game" : isPrefilled ? "Log Game" : "Log Game"` has identical true/false branches for the inner ternary -- both return `"Log Game"`. The `isPrefilled` check is dead logic here.
**Fix:** Simplify to:
```tsx
{isEdit ? "Update Game" : "Log Game"}
```

---

_Reviewed: 2026-06-10T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
