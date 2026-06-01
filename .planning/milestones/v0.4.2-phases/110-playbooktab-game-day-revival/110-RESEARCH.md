# Phase 110: PlaybookTab & Game Day Revival - Research

**Researched:** 2026-06-01
**Domain:** React component integration, Zustand persist migration, pure validation logic extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**INT-01 — PlaybookTab Canonical Data**
- D-01: PlaybookTab already has a working data pipeline (`useDatasheet` → `getUdbUnitDetail` → `PlaybookDatasheet` + `PlaybookStats`). The work is verification and gap-filling: ensure all sections render canonical data when a `udb_unit_id` link exists, and that the stat block (M/T/Sv/W/Ld/OC), weapon profiles, and ability text are never empty/null for linked units.
- D-02: `applyIncomingStats` already auto-populates empty fields on datasheet link. If a user has manually entered stats that differ from canonical, keep user's values (existing behavior is correct — only fills nulls).

**INT-02 — Game Day Weapon Profiles**
- D-03: Add a new collapsible "Weapons" section to `UnitAbilityCard`, positioned between OPG abilities and regular abilities sections. Most tactically relevant data in the most visible spot during gameplay.
- D-04: Reuse the `WeaponTable` component from `PlaybookDatasheet.tsx` — extract it to a shared location (`src/features/units/WeaponTable.tsx`) so both `PlaybookDatasheet` and `UnitAbilityCard` can import it. Same visual treatment: ranged/melee split, stat columns, weapon keywords.
- D-05: Weapon section should default to **collapsed** in Game Day (unlike PlaybookTab where it defaults open), since Game Day cards are compact.

**INT-03 — OPG Key Stability**
- D-06: Change OPG key format from `${unit.unit_id}::${ability.id ?? ability.name}` to `${unit.unit_id}:${ability.name}`.
- D-07: Add a `version` + `migrate` function in Zustand `persist` config for `gameDayStore`. Migration converts existing `usedAbilities` keys where ability name is recoverable, or resets stale entries.
- D-08: Use single colon `:` as separator: `unit_id:ability_name`.

**INT-04 — Enhanced Composition Validation**
- D-09: Extend `computeListWarnings` with three additional soft-warning checks using `udb_unit_keywords` and `udb_units.role`:
  1. DEDICATED TRANSPORT count cannot exceed non-TRANSPORT, non-CHARACTER unit count
  2. EPIC HERO keyword units must be unique (max 1 copy per list)
  3. Role distribution summary (count per role) — informational, not a warning
- D-10: All new checks are soft warnings. The existing BATTLELINE check stays as-is.
- D-11: Query keywords via `getUdbKeywordsByFaction` or similar batch query. Avoid N+1 — fetch all keywords for faction once, check per-unit in pure JS.

### Claude's Discretion
- Exact file structure for extracting `WeaponTable` (could stay in PlaybookDatasheet and be re-exported, or move to a new file)
- Zustand migration version numbering scheme
- Whether to add a dedicated `useUnitKeywords` hook or inline the query in the validation path
- Collapsible animation timing and styling details in Game Day

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INT-01 | PlaybookTab shows canonical unit stats, weapons, and abilities from udb_* tables (replacing null stub) | Pipeline already wired: `useDatasheet` → `getUdbUnitDetail` → `PlaybookDatasheet`. Gap-fill to ensure no empty/null for linked units. |
| INT-02 | Game Day UnitAbilityCard shows weapon profiles from canonical database in a collapsible section | `WeaponTable` exists in `PlaybookDatasheet.tsx` — extract and reuse. `UnitAbilityCard` already calls `useDatasheet` and has `datasheet?.weapons`. |
| INT-03 | Game Day uses stable `unit_id:ability_name` composite keys for OPG toggle persistence | Current key uses `ability.id` (AUTOINCREMENT — changes on re-import). `gameDayStore` needs Zustand `persist` migration `v1 → v2`. |
| INT-04 | Army list validation uses canonical roles/keywords from udb_* for enhanced composition checks | `computeListWarnings` already takes `udb_role`; `ArmyListUnitRow.udb_keywords` already populated from DB join. Need DEDICATED TRANSPORT + EPIC HERO checks added. |
</phase_requirements>

---

## Summary

Phase 110 is a **pure integration phase** — no new tables, no new pages, no new Tauri commands. All required data is already present in the database and already flowing through most of the relevant components. The work is:

1. **INT-01:** Audit the PlaybookTab render path to confirm canonical data is surfaced (stat block, weapons, abilities) — the pipeline (`useDatasheet` → `PlaybookDatasheet` → `PlaybookStats`) is already wired. Fix any remaining empty/null display for linked units.
2. **INT-02:** Extract the `WeaponTable` sub-component from `PlaybookDatasheet.tsx` to `src/features/units/WeaponTable.tsx`, then add a collapsed `Collapsible` weapons block to `UnitAbilityCard.tsx`.
3. **INT-03:** Migrate the Zustand `gameDayStore` `usedAbilities` key format from `unit_id::ability.id` to `unit_id:ability_name` using Zustand `persist` `version`/`migrate` API (Zustand 5 syntax).
4. **INT-04:** Extend the pure `computeListWarnings` function with DEDICATED TRANSPORT cap and EPIC HERO uniqueness checks, both soft warnings, using already-available `udb_keywords` string on `ArmyListUnitRow`.

**Primary recommendation:** The INT-03 Zustand migration is the highest-risk task because it modifies persisted localStorage state. Plan this first, test the key-format change and migration path in isolation, then proceed with the UI integration tasks.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Canonical stat/weapon/ability display (INT-01) | Frontend component | DB query layer | Data already in SQLite via `udb_*` tables; rendering is pure React |
| Weapon profiles in Game Day (INT-02) | Frontend component | — | `UnitAbilityCard` already holds `datasheet`; adding UI section is component-only |
| OPG key stability (INT-03) | Zustand persist (localStorage) | — | State is client-local; no DB migration needed — only store migration |
| Enhanced composition validation (INT-04) | Pure JS utility (`computeListWarnings`) | DB query layer | Data already on `ArmyListUnitRow.udb_keywords`; function is pure |

---

## Standard Stack

No new packages are required for this phase. All libraries are already installed.

### Core (already installed)

| Library | Version | Purpose | Why Used Here |
|---------|---------|---------|--------------|
| zustand | ^5.0.12 | Client state + `persist` middleware | `gameDayStore` migration uses `persist` `version`/`migrate` |
| @tanstack/react-query | (project) | Server/DB state | `useDatasheet` caching already in use |
| shadcn/ui Collapsible | (project) | Collapsible sections | `<Collapsible defaultOpen={false}>` for Game Day weapons |
| lucide-react | (project) | ChevronDown icon | Already used in `PlaybookDatasheet` and `UnitAbilityCard` |

**No new npm packages needed for this phase.** [VERIFIED: codebase grep]

---

## Package Legitimacy Audit

> Not applicable — this phase installs no new external packages.

---

## Architecture Patterns

### System Architecture Diagram

```
Army List Page
  └─ ArmyListSummaryBar
        └─ computeListWarnings(context, units)   ← INT-04 adds checks here
              units[].udb_role        (already in ArmyListUnitRow)
              units[].udb_keywords    (already in ArmyListUnitRow, from DB join)

Game Day Page
  └─ UnitsTab
        └─ UnitAbilityCard(unit, listId)
              useDatasheet(unit.unit_id)          ← already wired
              datasheet?.weapons                  ← new: WeaponTable (INT-02)
              opgAbilities[] keys                 ← INT-03: name-based keys
              gameDayStore.usedAbilities          ← persisted, migrated v1→v2

Collection Unit Page
  └─ PlaybookTab(unitId)
        useDatasheet(unitId)                      ← already wired
        └─ PlaybookStats                          ← reads canonical models[0] stats
        └─ PlaybookDatasheet(datasheet)           ← reads canonical weapons + abilities
              WeaponTable (extracted)             ← shared after INT-02
              AbilityEntry
```

### Recommended Project Structure

```
src/
  features/
    units/
      WeaponTable.tsx         # NEW — extracted from PlaybookDatasheet.tsx (INT-02)
      PlaybookDatasheet.tsx   # Updated to import WeaponTable from above
      PlaybookTab.tsx         # Audit only — may need null-guard fixes (INT-01)
      PlaybookStats.tsx       # No changes expected
    game-day/
      UnitAbilityCard.tsx     # Updated: imports WeaponTable, new weapons section, new OPG keys (INT-02, INT-03)
      gameDayStore.ts         # Updated: persist v2 with migrate function (INT-03)
  lib/
    computeUnitWarnings.ts    # Updated: DEDICATED TRANSPORT + EPIC HERO checks (INT-04)

tests/
  units/
    WeaponTable.test.tsx      # NEW (Wave 0 gap)
  game-day/
    gameDayStore.test.ts      # EXTENDED — add migration + new key format tests
    UnitAbilityCard.test.tsx  # NEW (Wave 0 gap) — weapons section render
  lib/
    computeUnitWarnings.test.ts  # EXTENDED — new check scenarios
```

### Pattern 1: WeaponTable Extraction

**What:** The `WeaponTable` sub-component in `PlaybookDatasheet.tsx` is currently `function WeaponTable()` — a local non-exported function. Extract it to `src/features/units/WeaponTable.tsx`.

**When to use:** Any component rendering canonical weapon profiles (currently: `PlaybookDatasheet`, `UnitAbilityCard`).

**Example:**
```typescript
// src/features/units/WeaponTable.tsx
import type { UdbWeapon } from "@/db/queries/unitDatabase";

export function WeaponTable({
  weapons,
  statLabel,
}: {
  weapons: UdbWeapon[];
  statLabel: "BS" | "WS";
}) {
  // ... (identical body from PlaybookDatasheet.tsx)
}
```

```typescript
// src/features/units/PlaybookDatasheet.tsx (updated import)
import { WeaponTable } from "@/features/units/WeaponTable";
```

```typescript
// src/features/game-day/UnitAbilityCard.tsx (new import)
import { WeaponTable } from "@/features/units/WeaponTable";
```

[VERIFIED: codebase — WeaponTable is currently a local function at line 108 of PlaybookDatasheet.tsx]

### Pattern 2: Collapsible Weapons in UnitAbilityCard

**What:** Add a new `<Collapsible defaultOpen={false}>` block inside `UnitAbilityCard`'s content, positioned after OPG abilities and before regular abilities.

**Example:**
```tsx
// In UnitAbilityCard CollapsibleContent — after opgAbilities block
{(rangedWeapons.length > 0 || meleeWeapons.length > 0) && (
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
    </CollapsibleContent>
  </Collapsible>
)}
```

[VERIFIED: codebase — Collapsible, CollapsibleTrigger, CollapsibleContent already imported in UnitAbilityCard.tsx]

### Pattern 3: Zustand persist Migration (INT-03)

**What:** Zustand 5's `persist` middleware supports `version` (integer) and `migrate` (function) options. Increment `version` to 1, provide a `migrate` that converts old `unit_id::ability_id` keys to `unit_id:ability_name`. Since the migration runs without access to the current datasheet state, the safe fallback is to clear unrecognizable keys.

**Critical Zustand 5 syntax:** The `migrate` option type changed between Zustand 4 and 5. In Zustand 5, `migrate` receives `(persistedState: unknown, version: number)` and should return the migrated state (or a Promise). No longer uses `createJSONStorage` required pattern changes.

**Example:**
```typescript
// gameDayStore.ts
export const useGameDayStore = create<GameDayStore>()(
  persist(
    (set) => ({ /* ...actions unchanged... */ }),
    {
      name: "game-day-state",
      version: 1,                          // was implicitly 0
      migrate: (persistedState: unknown, fromVersion: number) => {
        if (fromVersion === 0) {
          // Old keys: "42::17" or "42::ability-name"
          // New keys: "42:Ability Name"
          const old = persistedState as { listStates?: Record<string, GameDayListState> };
          if (old?.listStates) {
            for (const key of Object.keys(old.listStates)) {
              const ls = old.listStates[key];
              if (ls?.usedAbilities) {
                // Keys using "::" double-separator are old format — drop them
                // (ability name is not available at migration time without DB access)
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
    },
  ),
);
```

[VERIFIED: codebase — current gameDayStore.ts uses `persist` with only `{ name: "game-day-state" }`, no version field. Zustand 5.0.12 confirmed.]

### Pattern 4: OPG Key Format in UnitAbilityCard

**What:** Change the key derivation to use `ability.name` instead of `ability.id`.

**Before:**
```typescript
key: `${unit.unit_id}::${ability.id ?? ability.name}`,
```

**After:**
```typescript
key: `${unit.unit_id}:${ability.name}`,
```

[VERIFIED: codebase — UnitAbilityCard.tsx line 51: `key: \`${unit.unit_id}::${ability.id ?? ability.name}\``]

### Pattern 5: Enhanced computeListWarnings (INT-04)

**What:** The function already receives `units: Array<Pick<ArmyListUnitRow, "udb_role" | "unit_id">>`. For the new checks, the Pick type needs to also include `"udb_keywords"` since that field is already populated in `ArmyListUnitRow` by the SQL join in `armyLists.ts`.

**The `udb_keywords` field** already contains comma-separated non-faction keywords (e.g., `"Infantry, Character, Epic Hero"`). The EPIC HERO check just needs a case-insensitive string search.

**Example:**
```typescript
// Updated signature
export function computeListWarnings(
  context: WarningContext,
  units: Array<Pick<ArmyListUnitRow, "udb_role" | "unit_id" | "udb_keywords">> = [],
): UnitWarnings {
  // ... existing checks ...

  // INT-04: EPIC HERO uniqueness
  if (context.pointsLimit !== null) {
    const epicHeroUnits = units.filter(
      (u) => u.unit_id !== null &&
        u.udb_keywords?.toLowerCase().includes("epic hero")
    );
    // Count by udb_unit_id would be ideal, but ArmyListUnitRow.unit_id
    // is the collection unit ID — multiple collection units for same udb unit
    // would each have different unit_ids. Check name-based duplicates via
    // a separate pass if needed, or use udb_unit_id from ArmyListUnitRow.
    // Simplest: flag if any name appears more than once in epic heroes.
    // NOTE: ArmyListUnitRow already has udb_unit_id — consider adding it to Pick.
  }
```

**Important nuance (EPIC HERO check):** The correct uniqueness key for EPIC HERO is `udb_unit_id` (the canonical unit ID), not `unit_id` (the collection unit ID). A player could theoretically own the same Epic Hero twice in their collection but should only field it once. To count correctly, the `Pick` type should also include `"udb_unit_id"`.

**Revised Pick type for `computeListWarnings`:**
```typescript
units: Array<Pick<ArmyListUnitRow, "udb_role" | "unit_id" | "udb_unit_id" | "udb_keywords">> = []
```

[VERIFIED: codebase — `ArmyListUnitRow` has `udb_unit_id: string | null` and `udb_keywords: string | null`, both populated by armyLists.ts SQL join]

### Anti-Patterns to Avoid

- **Fetching keywords inside `computeListWarnings`:** This is a pure function — no DB, no hooks. All data must be passed in from the caller. The `udb_keywords` string is already on `ArmyListUnitRow` from the existing SQL join — no new query needed.
- **Using `ability.id` for OPG keys:** The `id` field on `UdbAbility` is an AUTOINCREMENT integer reassigned on every `bulk_sync_rules` import. It must never be used as a persistence key.
- **Nesting `<Collapsible>` without proper trigger scoping:** The outer `UnitAbilityCard` is itself a `<Collapsible>`. The inner weapons collapsible must use its own independent state and not conflict with the outer trigger's `data-[state]` attribute.
- **Migrating Zustand state via localStorage directly:** Use the `migrate` option in `persist` — do not read/write `localStorage` manually in a `useEffect`. The `migrate` function runs automatically before hydration.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persist state migration | Custom `useEffect` + JSON.parse of localStorage | Zustand `persist` `version`/`migrate` | Runs before hydration, atomic, race-condition-free |
| Weapon stat table UI | Custom table HTML | Extract existing `WeaponTable` from `PlaybookDatasheet.tsx` | Already pixel-perfect; consistent column widths |
| Keyword presence check | SQL query inside `computeListWarnings` | `udb_keywords` string already on `ArmyListUnitRow` | Data is pre-joined by `getArmyListWithUnits()` SQL |
| Collapsible animation | CSS transitions | shadcn `Collapsible` + `CollapsibleContent` | Already used throughout the app |

---

## Common Pitfalls

### Pitfall 1: Zustand 5 persist `migrate` Type Signature

**What goes wrong:** Using Zustand 4's `migrate` signature pattern in Zustand 5 causes TypeScript errors or silently broken migration.

**Why it happens:** Zustand 5 changed the `PersistOptions` type. The `migrate` function now receives `(persistedState: unknown, version: number)` and returns `S | Promise<S>`.

**How to avoid:** In `gameDayStore.ts`, declare the migrate function with explicit types. Test by manually setting `localStorage["game-day-state"]` to a v0 JSON blob and verifying the store hydrates with migrated keys.

**Warning signs:** TypeScript error on the `migrate` property, or old `::` keys still present after page reload.

### Pitfall 2: Double-Colon Keys Still in localStorage After Migration

**What goes wrong:** If a user's stored state has `usedAbilities: ["42::17"]`, the migration should clear this entry since the ability name is not recoverable at migration time (no DB access).

**Why it happens:** The ability's `name` is not stored in the old key — only the AUTOINCREMENT `id`. Without a DB lookup during migration, the name-based equivalent cannot be reconstructed.

**How to avoid:** Filter out any key containing `"::"` during migration (these are all old-format). Users lose their current OPG toggle state (acceptable per D-07 — one-time migration). Document this in a code comment.

**Warning signs:** OPG abilities show "Used" for wrong units after an update.

### Pitfall 3: `computeListWarnings` Caller Sites Must Pass Extended Pick

**What goes wrong:** `computeListWarnings` is called from `ArmyListSummaryBar.tsx` and `computeListHealthStats` (which calls it internally). Both must pass the new fields (`udb_unit_id`, `udb_keywords`) in the Pick type.

**Why it happens:** TypeScript's Pick type only enforces what's declared. If the caller passes `units` typed as the old Pick (without `udb_keywords`), the new checks silently receive `undefined` and skip entirely.

**How to avoid:** Update the function signature first, then fix the call sites. TypeScript will flag all callers that don't provide the new fields. `computeListHealthStats` receives `ArmyListUnitRow[]` (the full type) and passes it through — this already includes all fields, so `computeListHealthStats` may need no change.

**Warning signs:** DEDICATED TRANSPORT and EPIC HERO checks never fire even when they should.

### Pitfall 4: Outer vs. Inner Collapsible in UnitAbilityCard

**What goes wrong:** Adding a nested `<Collapsible>` inside an already-collapsible card causes click event bubbling or CSS `data-[state]` attribute conflicts.

**Why it happens:** The outer `<CollapsibleTrigger>` has `[&[data-state=open]>svg:last-child]:rotate-180` — if the inner trigger also has a ChevronDown as `last-child`, both chevrons rotate together.

**How to avoid:** Give the inner trigger its own scoped class, or ensure the `last-child` selector only applies to direct children. The existing pattern in `PlaybookDatasheet.tsx` uses a separate `className` on the inner trigger button — follow that pattern.

**Warning signs:** Both chevrons rotate simultaneously when clicking the weapon section trigger.

### Pitfall 5: INT-01 Verification Scope

**What goes wrong:** Assuming the PlaybookTab is "already working" without verifying the null-guard cases for newly-linked units.

**Why it happens:** `PlaybookDatasheet` renders nothing when `datasheet` is null/undefined — correct. But `PlaybookStats` reads from `data?.move` (strategy note, not canonical) for display. A newly-linked unit with no strategy note entries would show empty stats even after linking.

**How to avoid:** Trace the stat display path in `PlaybookTab.tsx` carefully. Stats are stored in `strategy_notes` table (user-editable), not fetched live from `udb_unit_models`. The `applyIncomingStats` function populates the strategy note fields only on datasheet link. If the user already has a strategy note with nulls, `applyIncomingStats` is NOT re-called on page load — it only fires during `handlePickerSelect`. Verify this behavior matches INT-01's success criteria ("no longer empty for linked units").

---

## Code Examples

### Zustand 5 persist with version and migrate
```typescript
// Source: gameDayStore.ts (existing), plus Zustand 5 persist API
export const useGameDayStore = create<GameDayStore>()(
  persist(
    (set) => ({ ...actions }),
    {
      name: "game-day-state",
      version: 1,
      migrate: (persistedState: unknown, fromVersion: number) => {
        if (fromVersion === 0) {
          const old = persistedState as Partial<Pick<GameDayStore, "listStates">>;
          if (old?.listStates) {
            for (const ls of Object.values(old.listStates)) {
              if (ls?.usedAbilities) {
                // Drop all old-format keys (contain "::" double colon)
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
    },
  ),
);
```

### computeListWarnings extended signature
```typescript
// Updated Pick — adds udb_unit_id + udb_keywords
export function computeListWarnings(
  context: WarningContext,
  units: Array<Pick<ArmyListUnitRow, "udb_role" | "unit_id" | "udb_unit_id" | "udb_keywords">> = [],
): UnitWarnings {
  // ... existing BATTLELINE check ...

  // DEDICATED TRANSPORT cap (D-09)
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

  // EPIC HERO uniqueness (D-09)
  if (context.pointsLimit !== null) {
    const epicHeroUdbIds = units
      .filter(
        (u) =>
          u.unit_id !== null &&
          u.udb_keywords?.toLowerCase().includes("epic hero")
      )
      .map((u) => u.udb_unit_id)
      .filter((id): id is string => id !== null);

    const epicHeroDupes = epicHeroUdbIds.filter(
      (id, idx) => epicHeroUdbIds.indexOf(id) !== idx
    );
    if (epicHeroDupes.length > 0) {
      soft.push("Epic Hero fielded more than once");
    }
  }
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/game-day/gameDayStore.test.ts tests/lib/computeUnitWarnings.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-01 | PlaybookTab renders canonical weapons/abilities when datasheet linked | Component/integration | `pnpm test -- tests/units/PlaybookDatasheet.test.tsx` | ❌ Wave 0 |
| INT-02 | UnitAbilityCard shows collapsed weapons section when datasheet has weapons | Component | `pnpm test -- tests/game-day/UnitAbilityCard.test.tsx` | ❌ Wave 0 |
| INT-02 | WeaponTable renders ranged/melee columns correctly | Unit | `pnpm test -- tests/units/WeaponTable.test.tsx` | ❌ Wave 0 |
| INT-03 | OPG key uses `unit_id:ability_name` format (no double colon) | Unit | `pnpm test -- tests/game-day/gameDayStore.test.ts` | ✅ (extend) |
| INT-03 | Zustand persist migration drops `::` keys from v0 state | Unit | `pnpm test -- tests/game-day/gameDayStore.test.ts` | ✅ (extend) |
| INT-04 | DEDICATED TRANSPORT count soft warning fires correctly | Unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ✅ (extend) |
| INT-04 | EPIC HERO uniqueness soft warning fires correctly | Unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ✅ (extend) |
| INT-04 | No warnings when DEDICATED TRANSPORT and EPIC HERO rules are satisfied | Unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ✅ (extend) |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/game-day/gameDayStore.test.ts tests/lib/computeUnitWarnings.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/units/WeaponTable.test.tsx` — covers INT-02 (extracted WeaponTable renders ranged/melee columns)
- [ ] `tests/game-day/UnitAbilityCard.test.tsx` — covers INT-02 (weapon section collapsed by default) and INT-03 (new key format in rendered output)
- [ ] `tests/units/PlaybookDatasheet.test.tsx` — covers INT-01 (PlaybookDatasheet renders weapons and abilities from datasheet prop)

---

## Open Questions (RESOLVED)

1. **INT-01: Is there a real rendering gap or just the picker flow?**
   - What we know: `PlaybookDatasheet` correctly renders when `datasheet` is non-null. `PlaybookStats` reads stats from `strategy_notes` (user-editable), not live from `udb_unit_models`.
   - What's unclear: If a user links a unit via picker, `applyIncomingStats` fires and populates the stats form. But if the user opens the PlaybookTab on an already-linked unit and the strategy note was never saved, their stat fields would be null — even though canonical data exists. This is potentially a rendering gap not covered by the current pipeline.
   - **Resolution:** Plan 02 Task 2 adds a `statValue` fallback that returns canonical data when local state is null and the unit is linked. This is the correct approach — test during implementation and apply the fallback.

2. **INT-04: Role distribution summary — informational display location**
   - What we know: D-09 mentions "role distribution summary (count per role) — informational, not a warning". But `computeListWarnings` only returns `hard[]` and `soft[]` strings. A role distribution map is a different shape of data.
   - **Resolution:** Compute role distribution inline in `ArmyListSummaryBar.tsx` from the `units` array directly, NOT in `computeListWarnings`. This matches the existing `roleCounts` pattern already in that component. Render as a single `text-xs text-muted-foreground` line per UI-SPEC. Added as Plan 02 Task 3.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — pure code changes, no new tools, CLI utilities, or services required)

---

## Security Domain

No new auth, session, input validation, or cryptography concerns. This phase is read-only data display and client-local state migration.

ASVS V5 (Input Validation): The `udb_keywords` string is read from the database (already sanitized at import time) and processed only via `toLowerCase().includes()` — no user-supplied input enters the validation path.

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/features/units/PlaybookDatasheet.tsx` — `WeaponTable` implementation at line 108
- Codebase: `src/features/game-day/UnitAbilityCard.tsx` — current OPG key at line 51, existing Collapsible imports
- Codebase: `src/features/game-day/gameDayStore.ts` — current persist config (no version), `usedAbilities: string[]`
- Codebase: `src/lib/computeUnitWarnings.ts` — existing `computeListWarnings` signature and BATTLELINE check
- Codebase: `src/types/armyList.ts` — `ArmyListUnitRow` with `udb_keywords`, `udb_role`, `udb_unit_id`
- Codebase: `src/db/queries/unitDatabase.ts` — `getUdbKeywordsByFaction`, `UdbWeapon`, `UdbAbility` types
- Codebase: `src/hooks/useDatasheet.ts` — pipeline confirmed wired to udb_* tables since Phase 107
- Codebase: `tests/lib/computeUnitWarnings.test.ts` — test patterns and `makeUnit` factory

### Secondary (MEDIUM confidence)

- Zustand 5 `persist` API: `version`/`migrate` options confirmed present in Zustand 5.x [ASSUMED — based on training knowledge; verified that project uses `^5.0.12`]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Zustand 5's `persist` middleware accepts `version` (integer) and `migrate` (function) options with signature `(persistedState: unknown, version: number) => S \| Promise<S>` | Standard Stack, Pattern 3 | If API differs, gameDayStore migration code would need revision. Mitigate: check Zustand 5 CHANGELOG or type definitions before implementing. |
| A2 | The `usedAbilities` key format `"unit_id::ability_id"` is the only old format in production — no intermediate formats exist | Pattern 3 | If users ran a pre-release with a different format, migration would be incomplete. Risk is LOW since all users are on production releases. |

---

## Metadata

**Confidence breakdown:**
- INT-01 PlaybookTab pipeline: HIGH — codebase fully inspected
- INT-02 WeaponTable extraction: HIGH — source component at known line; import pattern clear
- INT-03 OPG key migration: HIGH (code pattern) / MEDIUM (Zustand 5 `migrate` API) — see A1
- INT-04 Validation extension: HIGH — `udb_keywords` already on `ArmyListUnitRow`, pure function extension

**Research date:** 2026-06-01
**Valid until:** 2026-07-01 (stable stack, no fast-moving dependencies)
