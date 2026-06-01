# Phase 110: PlaybookTab & Game Day Revival - Pattern Map

**Mapped:** 2026-06-01
**Files analyzed:** 6 new/modified files
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/units/WeaponTable.tsx` | component | transform | `src/features/units/PlaybookDatasheet.tsx` (lines 108–143) | exact — same component being extracted |
| `src/features/units/PlaybookDatasheet.tsx` | component | request-response | itself | — (import update only) |
| `src/features/units/PlaybookTab.tsx` | component | request-response | itself | — (audit/null-guard fixes only) |
| `src/features/game-day/UnitAbilityCard.tsx` | component | event-driven | `src/features/units/PlaybookDatasheet.tsx` | exact — same Collapsible + WeaponTable usage |
| `src/features/game-day/gameDayStore.ts` | store | event-driven | itself | — (persist version/migrate added) |
| `src/lib/computeUnitWarnings.ts` | utility | transform | itself | — (function extension only) |
| `tests/units/WeaponTable.test.tsx` | test | — | `tests/game-day/gameDayStore.test.ts` | role-match |
| `tests/game-day/UnitAbilityCard.test.tsx` | test | — | `tests/game-day/gameDayStore.test.ts` | role-match |
| `tests/game-day/gameDayStore.test.ts` | test | — | itself | — (extension only) |
| `tests/lib/computeUnitWarnings.test.ts` | test | — | itself | — (extension only) |

---

## Pattern Assignments

### `src/features/units/WeaponTable.tsx` (component, transform) — NEW

**Analog:** `src/features/units/PlaybookDatasheet.tsx` lines 108–143

This is a straight extraction of the existing local `WeaponTable` function. The entire body moves unchanged; only the declaration becomes an exported named function and the `UdbWeapon` type import must be at the top of the new file.

**Full component body to extract** (PlaybookDatasheet.tsx lines 1–4 + 108–143):
```typescript
import type { UdbWeapon } from "@/db/queries/unitDatabase";

export function WeaponTable({ weapons, statLabel }: { weapons: UdbWeapon[]; statLabel: "BS" | "WS" }) {
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
        const skill = w.skill ? `${w.skill}+` : "—";
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

---

### `src/features/units/PlaybookDatasheet.tsx` (component, request-response) — MODIFIED

**Change:** Replace local `function WeaponTable` with an import. One line removed, one import added.

**Import to add** (after line 4):
```typescript
import { WeaponTable } from "@/features/units/WeaponTable";
```

**Function to remove** (lines 107–143): the entire local `function WeaponTable` block.

All existing `<WeaponTable weapons={...} statLabel={...} />` call sites at lines 40 and 46 are unchanged — they now resolve via the import.

---

### `src/features/units/PlaybookTab.tsx` (component, request-response) — AUDIT/FIX

**Change:** Verify null-guard coverage for INT-01. No structural changes expected.

**Key verification path** (lines 159–176): `applyIncomingStats` only fires during `handlePickerSelect`. For already-linked units, stats display via `statValue(key)` (line 123) which reads local state initialized in the `useEffect` at lines 86–96 from `strategy_notes`. If stats are null in the DB, they show null even when `datasheet` is non-null.

**Pattern to follow if a fix is needed** — the existing `importedStatValue` function (lines 135–141) already reads canonical stats from `datasheet?.models[0]`. A null-guard fallback could use this in the `statValue` call, returning `importedStatValue(key)` when the local state value is null and `hasDatasheetLink` is true:
```typescript
function statValue(key: StatKey): number | null {
  // existing switch ...
  // If local state null and datasheet linked, fall back to canonical
  const local = /* existing switch result */;
  if (local === null && hasDatasheetLink) return importedStatValue(key);
  return local;
}
```

---

### `src/features/game-day/UnitAbilityCard.tsx` (component, event-driven) — MODIFIED

**Analog:** `src/features/units/PlaybookDatasheet.tsx` lines 26–52 (weapons collapsible pattern)

**Import to add** (after line 16):
```typescript
import { WeaponTable } from "@/features/units/WeaponTable";
```

**OPG key fix** (line 50 — change `::` to `:`, drop `ability.id`):
```typescript
// BEFORE (line 50):
key: `${unit.unit_id}::${ability.id ?? ability.name}`,

// AFTER:
key: `${unit.unit_id}:${ability.name}`,
```

**Weapons section to insert** (after the `opgAbilities` block that ends around line 119, before the `regularAbilities` block at line 121). Follow the compact Game Day collapsible style, not the PlaybookDatasheet full-size style:
```tsx
{/* Weapons section — defaultOpen={false} per D-05 (Game Day cards are compact) */}
{(() => {
  const rangedWeapons = (datasheet?.weapons ?? []).filter((w) => w.category === "Ranged");
  const meleeWeapons = (datasheet?.weapons ?? []).filter((w) => w.category === "Melee" || (w.category !== "Ranged" && w.range === "Melee"));
  if (rangedWeapons.length === 0 && meleeWeapons.length === 0) return null;
  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger asChild>
        <button type="button" className="flex items-center justify-between w-full py-1 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Weapons
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-2">
          {rangedWeapons.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Ranged</span>
              <WeaponTable weapons={rangedWeapons} statLabel="BS" />
            </div>
          )}
          {meleeWeapons.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Melee</span>
              <WeaponTable weapons={meleeWeapons} statLabel="WS" />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
})()}
```

**Anti-pattern note:** The outer `<CollapsibleTrigger>` at line 75 uses `[&[data-state=open]>svg:last-child]:rotate-180`. The inner trigger's `<ChevronDown>` must use a scoped `className` that avoids being a `last-child` of the outer trigger, or use the `asChild` + scoped class pattern above.

---

### `src/features/game-day/gameDayStore.ts` (store, event-driven) — MODIFIED

**Analog:** `src/features/game-day/gameDayStore.ts` lines 64–148 (existing `persist` config)

**Current persist config** (line 147):
```typescript
{ name: "game-day-state" }
```

**Updated persist config** — add `version` and `migrate` (replace line 147):
```typescript
{
  name: "game-day-state",
  version: 1,  // was implicitly 0; increment triggers migration
  migrate: (persistedState: unknown, fromVersion: number) => {
    if (fromVersion === 0) {
      // Old keys used "::" double colon: "42::17" or "42::ability-name"
      // New keys use single colon: "42:Ability Name"
      // Ability name is NOT available at migration time (no DB access in migrate).
      // Drop all old-format keys to avoid stale ghost toggles. One-time loss is acceptable per D-07.
      const old = persistedState as { listStates?: Record<string, GameDayListState> };
      if (old?.listStates) {
        for (const ls of Object.values(old.listStates)) {
          if (ls?.usedAbilities) {
            ls.usedAbilities = ls.usedAbilities.filter(
              (k: string) => !k.includes("::")
            );
          }
        }
      }
      return old as GameDayStore;
    }
    return persistedState as GameDayStore;
  },
}
```

**Types already present in the file** (`GameDayStore`, `GameDayListState`) — no new type imports needed. The `migrate` function references them via cast only.

---

### `src/lib/computeUnitWarnings.ts` (utility, transform) — MODIFIED

**Analog:** `src/lib/computeUnitWarnings.ts` lines 81–112 (existing `computeListWarnings` body pattern)

**Signature change** (line 83 — extend the Pick type):
```typescript
// BEFORE:
units: Array<Pick<ArmyListUnitRow, "udb_role" | "unit_id">> = [],

// AFTER:
units: Array<Pick<ArmyListUnitRow, "udb_role" | "unit_id" | "udb_unit_id" | "udb_keywords">> = [],
```

**New checks to append** inside `computeListWarnings`, after the existing BATTLELINE block (after line 108), before `return { hard, soft }`:
```typescript
// DEDICATED TRANSPORT cap (INT-04, D-09)
// Transport count must not exceed non-transport, non-character unit count
if (context.pointsLimit !== null) {
  const linkedUnits = units.filter((u) => u.unit_id !== null);
  const transportCount = linkedUnits.filter(
    (u) => u.udb_role?.toLowerCase() === "dedicated transport"
  ).length;
  const nonTransportNonCharacterCount = linkedUnits.filter(
    (u) =>
      u.udb_role?.toLowerCase() !== "dedicated transport" &&
      u.udb_role?.toLowerCase() !== "character"
  ).length;
  if (transportCount > 0 && transportCount > nonTransportNonCharacterCount) {
    soft.push(
      `Too many Dedicated Transports (${transportCount} vs ${nonTransportNonCharacterCount} non-transport/character)`
    );
  }
}

// EPIC HERO uniqueness (INT-04, D-09)
// Epic Hero units must appear at most once per list (keyed by udb_unit_id)
if (context.pointsLimit !== null) {
  const epicHeroUdbIds = units
    .filter(
      (u) =>
        u.unit_id !== null &&
        u.udb_keywords?.toLowerCase().includes("epic hero")
    )
    .map((u) => u.udb_unit_id)
    .filter((id): id is string => id !== null);

  const hasDupes = epicHeroUdbIds.some(
    (id, idx) => epicHeroUdbIds.indexOf(id) !== idx
  );
  if (hasDupes) {
    soft.push("Epic Hero fielded more than once");
  }
}
```

**Caller site to update:** `computeListHealthStats` at line 149 passes `units` (typed as `ArmyListUnitRow[]`) — the full type already includes `udb_unit_id` and `udb_keywords`, so this call site requires no code change. The TypeScript compiler will validate it automatically.

Check `ArmyListSummaryBar.tsx` — it calls `computeListWarnings` directly and must pass `udb_unit_id` and `udb_keywords` in the Pick. If it currently passes the full `ArmyListUnitRow[]`, no change needed.

---

## Shared Patterns

### Collapsible Section Pattern
**Source:** `src/features/units/PlaybookDatasheet.tsx` lines 26–52 and `src/features/game-day/UnitAbilityCard.tsx` lines 74–84
**Apply to:** `UnitAbilityCard.tsx` new weapons section

The pattern uses `<Collapsible defaultOpen={...}>` wrapping a `<CollapsibleTrigger asChild>` button with a `<ChevronDown>` that rotates via `data-[state=open]:rotate-180`. The key difference between PlaybookTab (defaultOpen=true) and Game Day (defaultOpen=false) is captured in D-05.

```tsx
// Full collapsible section skeleton
<Collapsible defaultOpen={false}>
  <CollapsibleTrigger asChild>
    <button type="button" className="flex items-center justify-between w-full py-1 text-left">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Section Label
      </span>
      <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
    </button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* content */}
  </CollapsibleContent>
</Collapsible>
```

### Pure Function Extension Pattern
**Source:** `src/lib/computeUnitWarnings.ts` lines 97–109 (BATTLELINE check)
**Apply to:** INT-04 DEDICATED TRANSPORT and EPIC HERO checks

All list-level checks follow the same guard structure: wrap in `if (context.pointsLimit !== null)`, filter to `unit_id !== null` for linked-only counting, use lowercase comparison for role names, push string message to `soft[]`.

### Zustand Persist Pattern
**Source:** `src/features/game-day/gameDayStore.ts` lines 64–148
**Apply to:** `gameDayStore.ts` migration

Current store uses bare `{ name: "game-day-state" }` — the addition of `version: 1` and `migrate` follows Zustand 5's `PersistOptions` type. The `migrate` function receives `(persistedState: unknown, fromVersion: number)` and must return the store type (synchronously).

### Test Factory Pattern
**Source:** `tests/lib/computeUnitWarnings.test.ts` lines 13–43
**Apply to:** New test files for WeaponTable, UnitAbilityCard

Use a `makeUnit(overrides)` factory function that provides all required fields with healthy defaults. Each test case only specifies the overrides relevant to the scenario under test. The `ArmyListUnitRow` type at `src/types/armyList.ts` lines 55–72 shows all fields the factory must cover — note `udb_unit_id`, `udb_keywords`, and `udb_role` are all included.

For Game Day tests, use `useGameDayStore.setState({ listStates: {} })` in `beforeEach` to reset store state (pattern from `tests/game-day/gameDayStore.test.ts` line 12).

---

## No Analog Found

None — all files have direct analogs or are modifications of existing files.

---

## Metadata

**Analog search scope:** `src/features/units/`, `src/features/game-day/`, `src/lib/`, `src/types/`, `tests/`
**Files read:** 9
**Pattern extraction date:** 2026-06-01
