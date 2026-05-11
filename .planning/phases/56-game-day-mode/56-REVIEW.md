---
phase: 56-game-day-mode
reviewed: 2026-05-11T14:30:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/app/game-day/page.tsx
  - src/app/router.tsx
  - src/features/army-lists/ArmyListDetailSheet.tsx
  - src/features/game-day/ChecklistTab.tsx
  - src/features/game-day/GameDayHeader.tsx
  - src/features/game-day/GameDayPage.tsx
  - src/features/game-day/GameDayStratagemCard.tsx
  - src/features/game-day/StrategemsTab.tsx
  - src/features/game-day/UnitAbilityCard.tsx
  - src/features/game-day/UnitsTab.tsx
  - src/features/game-day/gameDayStore.ts
  - tests/game-day/CpTracker.test.tsx
  - tests/game-day/GameDayPage.test.tsx
  - tests/game-day/PreGameChecklist.test.tsx
  - tests/game-day/StratagemsByPhase.test.tsx
  - tests/game-day/UnitAbilityCards.test.tsx
  - tests/game-day/gameDayStore.test.ts
findings:
  critical: 2
  warning: 4
  info: 0
  total: 6
status: issues_found
---

# Phase 56: Code Review Report

**Reviewed:** 2026-05-11T14:30:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 56 adds a Game Day in-game reference view with CP tracking, phase-grouped stratagems, unit ability cards with once-per-game toggles, and a pre-game checklist. The Zustand store with localStorage persistence is well-structured, and the component decomposition is clean. However, there are bugs around OPG ability key collisions, an unchecked negative CP input, duplicate PHASE_STYLES definitions, and a shared mutable default state object that can lead to cross-list data leakage.

## Critical Issues

### CR-01: OPG ability key collision when ability_id is null -- same-name abilities on different units share toggle state

**File:** `src/features/game-day/UnitAbilityCard.tsx:49`
**Issue:** The `key` for OPG ability toggle state is computed as `ability.ability_id ?? ability.name`. When `ability_id` is `null` (the type explicitly allows it: `ability_id: string | null`), the key falls back to `ability.name`. If two different units each have an OPG ability with the same name (e.g., "Oath of Moment" appearing on multiple datasheets, or a faction-wide ability), toggling it on one unit marks it as used on ALL units in the same list because `usedAbilities` is a flat string array on the list state keyed only by this value.

This is a data correctness bug: marking "Oath of Moment" as used on Unit A also shows it as used on Unit B, which is incorrect -- each unit's OPG abilities are independent in-game.
**Fix:** Include the unit identity in the key to namespace per-unit:
```ts
key: `${unit.unit_id}:${ability.ability_id ?? ability.name}`,
```
And pass `unit.unit_id` or `unit.id` through to the toggle call. The `toggleAbilityUsed` store action already accepts an arbitrary string key, so this change is backwards-compatible (old persisted keys simply become orphaned).

### CR-02: Shared mutable DEFAULT_STATE object in useGameDayListState causes cross-list reference leakage

**File:** `src/features/game-day/gameDayStore.ts:147-158`
**Issue:** `DEFAULT_STATE` on line 147 is a module-level singleton object. The `useGameDayListState` hook returns this exact object reference when a list has no persisted state. The `checklistItems` array inside `DEFAULT_STATE` is the same array reference as `DEFAULT_CHECKLIST` (not a copy). If any consumer were to mutate the returned state (e.g., `listState.checklistItems.push(...)` or sort in-place), it would corrupt the shared default for all lists.

While the current Zustand actions produce new arrays via `map()` and spread, this is a latent correctness hazard. Note that `getListState` (line 39) correctly creates a fresh copy of checklist items each time, but `useGameDayListState` does NOT -- it returns the shared singleton. Any future code (or a third-party component) that mutates the returned array will introduce a cross-list contamination bug.
**Fix:** Either return a fresh object from `useGameDayListState`, or freeze `DEFAULT_STATE`:
```ts
const DEFAULT_STATE: GameDayListState = Object.freeze({
  cp: 0,
  prevCp: null,
  startingCp: 0,
  checklistItems: Object.freeze([...DEFAULT_CHECKLIST]),
  usedAbilities: Object.freeze([]),
}) as GameDayListState;
```
Or, more simply, always return via `getListState` which already clones:
```ts
export function useGameDayListState(listId: number): GameDayListState {
  return useGameDayStore((s) => s.listStates[String(listId)]) ?? {
    cp: 0,
    prevCp: null,
    startingCp: 0,
    checklistItems: [...DEFAULT_CHECKLIST.map((item) => ({ ...item }))],
    usedAbilities: [],
  };
}
```

## Warnings

### WR-01: setStartingCp accepts negative values from parseInt fallback

**File:** `src/features/game-day/GameDayHeader.tsx:99`
**Issue:** The starting CP input uses `parseInt(e.target.value) || 0` which correctly handles NaN (empty string yields 0), but the `<Input min={0}>` constraint is purely visual -- it does not prevent typing or pasting a negative number. `parseInt("-5")` returns `-5`, which passes the `|| 0` guard and sets both `startingCp` and `cp` to -5. The CP spend button disables at `cp === 0` but a negative starting CP means the user can never spend (button stays disabled) and `gainCp` would increment from -5 to -4, which is confusing.
**Fix:** Clamp the value:
```ts
onChange={(e) =>
  setStartingCp(listId, Math.max(0, parseInt(e.target.value) || 0))
}
```

### WR-02: spendCp does not validate that cost > 0, allowing negative spend (gain via spend)

**File:** `src/features/game-day/gameDayStore.ts:73-79`
**Issue:** `spendCp` subtracts `cost` from `cp` with `Math.max(0, cur.cp - cost)`. If a stratagem had a negative or zero `cp_cost` string that `parseInt` parses to a negative number (e.g., malformed rules data), `spendCp(listId, -1)` would increase CP by 1 instead of decreasing it. The `GameDayStratagemCard` does guard `isFree` for cost === 0, but not for negative values parsed from `stratagem.cp_cost`.
**Fix:** Guard at the store level:
```ts
spendCp: (listId, cost) =>
  set((s) => {
    if (cost <= 0) return {};
    const cur = getListState(s, listId);
    return setListState(s, listId, {
      prevCp: cur.cp,
      cp: Math.max(0, cur.cp - cost),
    });
  }),
```

### WR-03: Duplicate PHASE_STYLES constant defined in two files

**File:** `src/features/game-day/GameDayStratagemCard.tsx:12-18` and `src/features/game-day/StrategemsTab.tsx:18-24`
**Issue:** The exact same `PHASE_STYLES` record is defined in both `GameDayStratagemCard.tsx` and `StrategemsTab.tsx`. If a phase is added or a color is changed, only one file may be updated, leading to inconsistent styling. This violates DRY and is a maintenance footgun.
**Fix:** Extract to a shared constants file (e.g., `src/features/game-day/constants.ts`) and import from both.

### WR-04: listId route param parsed with Number() without NaN guard

**File:** `src/app/game-day/page.tsx:6`
**Issue:** `Number(listId)` where `listId` is a string from the route params. If the URL is manually entered with a non-numeric segment (e.g., `/game-day/abc`), `Number("abc")` returns `NaN`. This `NaN` is passed as `listId` to `GameDayPage`, which calls `useArmyList(NaN)`. The hook has `enabled: id !== undefined` but `NaN !== undefined` is `true`, so the query fires with `getArmyListById(NaN)`, which sends a SQL query with `$1 = NaN`. Depending on the Tauri SQL plugin behavior, this may throw an unhandled error or return undefined, but the route has no `validateSearch` or param validation to catch this early.
**Fix:** Add route param validation:
```ts
const gameDayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/game-day/$listId",
  params: {
    parse: ({ listId }) => ({ listId }),
    stringify: ({ listId }) => ({ listId }),
  },
  component: GameDayPageShell,
});
```
Or validate in the shell component:
```ts
const id = Number(listId);
if (Number.isNaN(id)) return <Navigate to="/army-lists" />;
return <GameDayPage listId={id} />;
```

---

_Reviewed: 2026-05-11T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
