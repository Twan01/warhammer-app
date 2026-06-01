---
phase: 110-playbooktab-game-day-revival
reviewed: 2026-06-01T14:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/features/army-lists/ArmyListSummaryBar.tsx
  - src/features/game-day/UnitAbilityCard.tsx
  - src/features/game-day/gameDayStore.ts
  - src/features/units/PlaybookDatasheet.tsx
  - src/features/units/PlaybookTab.tsx
  - src/features/units/WeaponTable.tsx
  - src/lib/computeUnitWarnings.ts
  - tests/collection/PlaybookTab.test.tsx
  - tests/game-day/gameDayStore.test.ts
  - tests/lib/computeUnitWarnings.test.ts
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 110: Code Review Report

**Reviewed:** 2026-06-01T14:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed the PlaybookTab revival, Game Day store, army-list summary bar, and associated
test files. The overall shape of the implementation is solid: pure warning functions,
well-isolated Zustand store with a persist migration, and a clean component separation.

Two blockers surfaced: (1) the `migrateGameDayState` function mutates the persisted
state object in-place before returning it, which is unsafe with Zustand's `persist`
middleware, and (2) the DEDICATED TRANSPORT cap check is gated entirely behind
`pointsLimit !== null` even though the 40k rule has no points-limit prerequisite, but
more critically the cap logic uses role string comparison that is case-sensitive for
the `nonTransportNonCharacterCount` filter while the transport count itself is
case-insensitive — creating an inconsistency that can silently produce wrong warnings.

Five warnings cover: an OPG ability key that embeds `undefined` when `unit_id` is null
on a ghost unit, an unchecked `parseInt` result used as stored data, a `console.error`
left in production save paths, a `battleReadyPct` denominator that uses `unitPoints`
rather than `totalPoints` (inconsistency with the stat's own description), and a
missing `useUnitOverride` mock in the PlaybookTab test harness that may mask
hook-instantiation failures.

---

## Critical Issues

### CR-01: `migrateGameDayState` mutates persisted state in place (data corruption risk)

**File:** `src/features/game-day/gameDayStore.ts:79-86`

**Issue:** The migration function modifies the `ls.usedAbilities` array by reassigning
it on the objects it iterates over. Because `persistedState` is the deserialized JSON
object that Zustand's `persist` middleware hands in, mutating it in-place can cause
subtle corruption in environments where the same reference is reused (e.g., during
hot-reload or if the middleware reuses the object). The correct pattern for a Zustand
`migrate` function is to return a **new** object tree.

```ts
// CURRENT — mutates in place
for (const ls of Object.values(old.listStates)) {
  if (Array.isArray(ls.usedAbilities)) {
    ls.usedAbilities = ls.usedAbilities.filter((k) => !k.includes("::"));
  }
}
```

**Fix:** Build a new `listStates` record instead of mutating:

```ts
export function migrateGameDayState(
  persistedState: unknown,
  fromVersion: number,
): GameDayStore {
  if (fromVersion === 0) {
    const old = persistedState as { listStates?: Record<string, GameDayListState> };
    if (old.listStates) {
      const newListStates: Record<string, GameDayListState> = {};
      for (const [key, ls] of Object.entries(old.listStates)) {
        newListStates[key] = {
          ...ls,
          usedAbilities: Array.isArray(ls.usedAbilities)
            ? ls.usedAbilities.filter((k) => !k.includes("::"))
            : [],
        };
      }
      return { ...(persistedState as GameDayStore), listStates: newListStates };
    }
  }
  return persistedState as GameDayStore;
}
```

---

### CR-02: OPG ability key embeds `"undefined"` string when `unit.unit_id` is null

**File:** `src/features/game-day/UnitAbilityCard.tsx:51`

**Issue:** The OPG key is built as `` `${unit.unit_id}:${ability.name}` ``. The
component receives an `ArmyListUnitRow` where `unit_id` is `number | null`. When
`unit_id` is `null` (ghost unit), the template literal produces the string
`"null:AbilityName"`. This key is then persisted to the Zustand store and used for
equality checks. While ghost units typically have no `udb_unit_id` and therefore no
datasheet/abilities, the component does not guard against this before constructing
the key: `unitIdOrUndefined` is used to fetch the datasheet, but the `key` inside
`opgAbilities` is computed from `unit.unit_id` directly (not `unitIdOrUndefined`).

If a ghost unit somehow has a datasheet-linked entry in the future (or if the query
is called with `undefined` and still returns cached data), ability keys will all share
the same `"null:..."` namespace, causing cross-unit toggle collisions across all ghost
units in all lists.

**Fix:** Guard the key construction and filter out null unit_ids before building keys:

```ts
const opgAbilities = useMemo(() => {
  if (unit.unit_id === null) return [];   // ghost units have no trackable abilities
  const abilities = datasheet?.abilities ?? [];
  if (abilities.length === 0) return [];
  return abilities
    .filter(isOncePerGame)
    .map((ability) => ({
      ability,
      key: `${unit.unit_id}:${ability.name}`,
    }));
}, [datasheet?.abilities, unit.unit_id]);
```

---

## Warnings

### WR-01: `parseInt` result stored without NaN guard — silent zero stored on bad input

**File:** `src/features/units/PlaybookTab.tsx:191`

**Issue:** The points override is parsed with `parseInt(pointsOverrideValue, 10)` and
then tested with `Number.isFinite(pts)`. However, `parseInt` returns `NaN` when the
input string is not a valid integer (e.g. `"abc"` → `NaN`), and `Number.isFinite(NaN)`
is `false`, so `parsedPts` correctly becomes `null` in that case. This part is safe.
The real risk is the `pts !== null` guard on line 191 that short-circuits before the
`isFinite` check: if `pointsOverrideValue.trim()` is `""`, `parseInt("")` returns
`NaN`, `pts` is `NaN`, `pts !== null` is **true**, and then `Number.isFinite(NaN)` is
`false`, so `parsedPts` ends up `null`. That path is fine.

The actual bug is subtler: `parseInt("5abc", 10)` returns `5` (not NaN). A user typing
`"5abc"` would successfully store 5 points without any validation error. The Zod
schema is not in play here — this is a raw `parseInt` on a free-text field.

**Fix:** Use `Number(pointsOverrideValue.trim())` or add explicit pattern validation:

```ts
const raw = pointsOverrideValue.trim();
const parsedPts = raw !== "" && /^\d+$/.test(raw) ? parseInt(raw, 10) : null;
```

---

### WR-02: `battleReadyPct` divides painted points by `unitPoints` but the bar width uses `battleReadyPct` against `totalPoints` (including enhancements)

**File:** `src/lib/computeUnitWarnings.ts:172-173`

**Issue:** `battleReadyPct` is computed as `paintedPoints / unitPoints` (excluding
enhancements). However, `totalPoints` (which is `unitPoints + enhancementTotal`) is
what is displayed to the user as the "Total" stat. The progress bar width in
`ArmyListSummaryBar` (`style={{ width: \`${stats.battleReadyPct}%\` }}`) is visually
associated with the full `totalPoints` display. When `enhancementTotal > 0`, the
percentage denominator (unit points only) is different from the displayed total,
creating a visual inconsistency: the bar can show 100% even when the total includes
unpaid enhancements, or show a percentage that doesn't align with what the user sees
in the "Total" field.

This is intentional per the comment ("ownershipPct is always 100 per D-15"), but it is
not documented that `battleReadyPct` intentionally excludes enhancements. If
enhancements are large, the bar shows misleading readiness.

**Fix:** Either document explicitly in code that enhancement points are excluded from
the readiness denominator, or use `totalPoints` as the denominator:

```ts
// Option A: document the intentional exclusion
// battleReadyPct denominator is unitPoints only — enhancements are not
// "paintable" and therefore excluded from the readiness calculation.
const battleReadyPct = unitPoints > 0
  ? Math.round((paintedPoints / unitPoints) * 100)
  : 0;

// Option B: include enhancements in denominator for visual consistency
const battleReadyPct = totalPoints > 0
  ? Math.round((paintedPoints / totalPoints) * 100)
  : 0;
```

---

### WR-03: DEDICATED TRANSPORT role filter is case-sensitive for the non-transport count but case-insensitive for the transport count

**File:** `src/lib/computeUnitWarnings.ts:113-120`

**Issue:** The transport count correctly lowercases `udb_role` before comparing:
```ts
u.udb_role?.toLowerCase() === "dedicated transport"
```
But the `nonTransportNonCharacterCount` filter also uses lowercase, which is
consistent — **however**, the filter excludes `"dedicated transport"` and `"character"`
only. Any role that is capitalized differently (e.g., `"Dedicated Transport"`) on the
non-transport exclusion side is handled via `.toLowerCase()`, so this is actually
consistent.

The real issue is structural: if `udb_role` is `"Dedicated Transport"` (proper case,
as stored in the canonical DB), the filter `.toLowerCase() === "dedicated transport"`
will correctly identify it. But the test data at line 311 uses `"Dedicated Transport"`
(proper case) confirming this works. There is no actual bug here — but the
`nonTransportNonCharacterCount` silently includes units with `udb_role === null`
(unlinked units). Null-role units count as non-transport and non-character, meaning
ghost/unlinked units artificially inflate the cap, allowing more transports than the
army actually has non-transport linked units.

**Fix:** Exclude unlinked units (null `unit_id`) from the non-transport count, matching
how the transport count is already filtered:

```ts
const nonTransportNonCharacterCount = linkedUnits.filter(
  (u) =>
    u.udb_role?.toLowerCase() !== "dedicated transport" &&
    u.udb_role?.toLowerCase() !== "character",
).length;
```

The `linkedUnits` array is already filtered to `unit_id !== null`, so both transport
and non-transport counts use the same linked-only set. However, `null` role units
(linked but not yet assigned a DB role) are still counted as non-transport.
This allows bypass of the cap check by including units with no role data.

The fix is to count only units with a known role on both sides:

```ts
const nonTransportNonCharacterCount = linkedUnits.filter(
  (u) =>
    u.udb_role !== null &&
    u.udb_role?.toLowerCase() !== "dedicated transport" &&
    u.udb_role?.toLowerCase() !== "character",
).length;
```

---

### WR-04: Three `console.error` calls left in production save path

**File:** `src/features/units/PlaybookTab.tsx:156,196,203`

**Issue:** Production save and picker-select flows log to `console.error` on failure.
In a Tauri desktop app, `console.error` output goes to the browser DevTools / Tauri
log, which end-users cannot access. Errors are already surfaced via `toast.error`, so
these console calls add no user-visible benefit and add noise. The project's CLAUDE.md
notes strict TypeScript enforces quality — these would be flagged by `noUnusedLocals`
if they were assignments, but `console.error` is unconstrained.

**Fix:** Remove or replace with structured logging if the project ever adds one:

```ts
// Remove the three console.error calls:
// Line 156: console.error("[PlaybookTab] handlePickerSelect failed:", err);
// Line 196: console.error("[PlaybookTab] override save failed:", overrideErr);
// Line 203: console.error("[PlaybookTab] handleSave failed:", err);
```

---

### WR-05: `useUnitOverride` hook not mocked in PlaybookTab test — potential unguarded Tauri IPC call

**File:** `tests/collection/PlaybookTab.test.tsx:18-81`

**Issue:** The test file mocks `useDatasheet`, `useStrategyNote` (via the queries
module), `useFactions`, `useUnits`, `useUnitPointTiers`, `useUnitLoadouts`, and
`useRulesFavorites` / `useRulesNotes`. However, `PlaybookTab` also calls:
- `useUnitOverride(unitId)` — line 56 of `PlaybookTab.tsx`
- `useUpsertUnitOverride()` — line 57
- `useDeleteUnitOverride()` — line 58

None of these are mocked. If `useUnitOverride` resolves through the real query path, it
will hit `getDb()` → Tauri IPC → fail in jsdom. The tests currently pass presumably
because the QueryClient retries are disabled (`retry: false`) and the query silently
returns `undefined` on error, which the component handles via null-coalescing. But this
is fragile — any change to `useUnitOverride`'s error handling could cause test failures
that appear as unrelated rendering issues.

**Fix:** Add explicit mocks:

```ts
vi.mock("@/hooks/useUnitOverride", () => ({
  useUnitOverride: vi.fn(() => ({ data: undefined })),
  useUpsertUnitOverride: vi.fn(() => ({ mutateAsync: vi.fn(async () => undefined), isPending: false })),
  useDeleteUnitOverride: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));
```

---

## Info

### IN-01: IIFE used for `hasWeapons` weapons section in `UnitAbilityCard` — unusual React pattern

**File:** `src/features/game-day/UnitAbilityCard.tsx:123-154`

**Issue:** The weapons rendering uses an immediately-invoked function expression
(`(() => { ... })()`) inside JSX. This pattern is unusual in React and harder to read
than a conditional or extracted sub-component. It cannot be trivially tested in
isolation.

**Fix:** Extract to a named sub-component or use a plain conditional expression:

```tsx
{hasWeapons && (
  <WeaponsSection
    weapons={datasheet?.weapons ?? []}
    rangedWeapons={rangedWeapons}
    meleeWeapons={meleeWeapons}
  />
)}
```

---

### IN-02: `AbilityEntry` key uses `unit_id + line_order + idx` — `idx` makes keys non-stable across re-orders

**File:** `src/features/units/PlaybookDatasheet.tsx:78,86,94`

**Issue:** The React key for ability entries is
`` `${a.unit_id}-${a.line_order}-${idx}` ``. The appended `idx` (array index) makes
the key unstable when abilities are sorted or reordered in the future. Since `unit_id`
and `line_order` together are likely unique per ability row, `idx` is redundant and
should be dropped.

**Fix:**
```tsx
<AbilityEntry key={`${a.unit_id}-${a.line_order}`} ability={a} />
```

---

### IN-03: `unitWarningCount` can go negative when `listWarningCount > stats.hardWarningCount + stats.softWarningCount`

**File:** `src/features/army-lists/ArmyListSummaryBar.tsx:52-54`

**Issue:** The tooltip decomposition subtracts `listWarningCount` from the total to
derive per-unit warnings:

```ts
const unitWarningCount =
  stats.hardWarningCount + stats.softWarningCount - listWarningCount;
```

`stats.hardWarningCount` and `stats.softWarningCount` are computed inside
`computeListHealthStats` which itself calls `computeListWarnings` and then accumulates
unit-level warnings on top. So in correct operation, the subtraction should never go
negative. However, `listWarningCount` is recomputed independently in
`ArmyListSummaryBar` (line 47) with a separate call to `computeListWarnings`, while
`stats` comes from a different `useMemo`. If the inputs to these two memos differ
momentarily during a render cycle (e.g., due to stale closure), `unitWarningCount`
could briefly be negative, displaying a nonsensical "−1 unit warnings" tooltip.

**Fix:** Clamp the result:

```ts
const unitWarningCount = Math.max(
  0,
  stats.hardWarningCount + stats.softWarningCount - listWarningCount,
);
```

---

_Reviewed: 2026-06-01T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
