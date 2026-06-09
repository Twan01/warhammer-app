# Phase 120: UI Wiring - Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 11 (3 new, 8 modified)
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/types/gameData.ts` | model/types | — | `src/db/queries/unitDatabase.ts` (inline interfaces) | role-match |
| `src/db/queries/udbGameData.ts` | service/query | request-response | `src/db/queries/unitDatabase.ts` | exact |
| `src/hooks/useGameData.ts` | hook | request-response | `src/hooks/useUnitDatabase.ts` | exact |
| `src/features/game-day/StrategemsTab.tsx` | component | request-response | self (stub swap only) | self |
| `src/features/rules-hub/RulesHubPage.tsx` | component | request-response | self (stub swap only) | self |
| `src/features/rules-hub/applyRulesHubFilters.ts` | utility | transform | self (type fix only) | self |
| `src/features/rules-hub/StratagemCard.tsx` | component | request-response | `src/features/game-day/GameDayStratagemCard.tsx` | exact |
| `src/features/game-day/GameDayStratagemCard.tsx` | component | request-response | `src/features/rules-hub/StratagemCard.tsx` | exact |
| `src/features/army-lists/DetachmentPicker.tsx` | component | request-response | self (stub swap only) | self |
| `src/features/army-lists/EnhancementPickerSheet.tsx` | component | request-response | self (data source migration) | self |
| `src/features/units/PlaybookTab.tsx` | component | request-response | `src/features/rules-hub/DetachmentCard.tsx` (collapsible section) | role-match |

---

## Pattern Assignments

### `src/types/gameData.ts` (model/types, —)

**Analog:** `src/db/queries/unitDatabase.ts` (inline interface pattern, lines 12–88)

**Interface naming pattern** — mirror SQLite column names exactly in snake_case, matching existing `UdbFaction`, `UdbUnitSummary`, etc.:

```typescript
// Pattern: interface name = Udb + PascalCase entity; fields = exact SQLite column names
export interface UdbFaction {
  id: string;         // TEXT PRIMARY KEY
  name: string;
  short_name: string | null;
}
```

**New interfaces to define** — derived from migrations 042 and 043:

```typescript
// udb_stratagems (migration 043): cp_cost is INTEGER NOT NULL DEFAULT 0
export interface UdbStratagem {
  id: string;
  faction_id: string | null;
  detachment_id: string | null;
  name: string;
  type: string | null;
  cp_cost: number;          // INTEGER — NOT string | null like RwStratagem
  turn: string | null;
  phase: string | null;
  description: string;      // NOT NULL in schema
}

// udb_enhancements (migration 043): cost is INTEGER NOT NULL DEFAULT 0
export interface UdbEnhancement {
  id: string;
  faction_id: string;       // NOT NULL in schema
  detachment_id: string | null;
  name: string;
  cost: number;             // "cost" not "points" — breaking change from SyncedEnhancementRow
  description: string;      // NOT NULL in schema
}

// udb_detachments (migration 042)
export interface UdbDetachment {
  id: string;               // TEXT PRIMARY KEY — Wahapedia detachment_id
  faction_id: string;
  name: string;
}

// udb_detachment_abilities (migration 042): description is nullable
export interface UdbDetachmentAbility {
  id: string;
  detachment_id: string;
  faction_id: string;
  name: string;
  description: string | null;   // TEXT (nullable) — guard with && before render
}

// Extended type for JOIN query result (used in PlaybookTab)
export interface UdbDetachmentAbilityWithDetachment extends UdbDetachmentAbility {
  detachment_name: string;
}
```

---

### `src/db/queries/udbGameData.ts` (service/query, request-response)

**Analog:** `src/db/queries/unitDatabase.ts`

**File header pattern** (lines 1–8 of unitDatabase.ts):

```typescript
/**
 * Phase 120 — Game data query layer (stratagems, enhancements, detachments, abilities).
 *
 * All queries target hobbyforge.db (udb_* tables seeded by Phases 118/119 importers).
 * Uses getDb() — NEVER getRulesDb().
 */
import { getDb } from "@/db/client";
import type {
  UdbStratagem,
  UdbEnhancement,
  UdbDetachment,
  UdbDetachmentAbilityWithDetachment,
} from "@/types/gameData";
```

**Single-param SELECT pattern** (from unitDatabase.ts lines 137–147):

```typescript
export async function getUdbFactions(locale?: "en" | "fr"): Promise<UdbFaction[]> {
  const db = await getDb();
  return db.select<UdbFaction[]>(
    "SELECT id, name, short_name FROM udb_factions ORDER BY name ASC",
  );
}
```

Apply to `getDetachmentsByFaction`:

```typescript
export async function getDetachmentsByFaction(
  factionId: string,
): Promise<UdbDetachment[]> {
  const db = await getDb();
  return db.select<UdbDetachment[]>(
    `SELECT id, faction_id, name
     FROM udb_detachments
     WHERE faction_id = $1
     ORDER BY name`,
    [factionId],
  );
}
```

**Two-condition WHERE (universal + specific) pattern** — critical for STR-03/STR-04 (Pitfall 4):

```typescript
export async function getStratagemsByDetachment(
  detachmentId: string,
): Promise<UdbStratagem[]> {
  const db = await getDb();
  return db.select<UdbStratagem[]>(
    `SELECT id, faction_id, detachment_id, name, type, cp_cost, turn, phase, description
     FROM udb_stratagems
     WHERE detachment_id = $1
        OR (faction_id IS NULL AND detachment_id IS NULL)
     ORDER BY phase, name`,
    [detachmentId],
  );
}
```

**JOIN query pattern** (from unitDatabase.ts lines 224–254 — Promise.all multi-select, or single JOIN):

```typescript
export async function getDetachmentAbilitiesByFaction(
  factionId: string,
): Promise<UdbDetachmentAbilityWithDetachment[]> {
  const db = await getDb();
  return db.select<UdbDetachmentAbilityWithDetachment[]>(
    `SELECT a.id, a.detachment_id, a.faction_id, a.name, a.description,
            d.name AS detachment_name
     FROM udb_detachment_abilities a
     JOIN udb_detachments d ON d.id = a.detachment_id
     WHERE a.faction_id = $1
     ORDER BY d.name, a.name`,
    [factionId],
  );
}
```

**Positional param convention** — always `$1, $2` (never `?` or named params). Single-element arrays `[factionId]` even for one param.

---

### `src/hooks/useGameData.ts` (hook, request-response)

**Analog:** `src/hooks/useUnitDatabase.ts`

**File header + import pattern** (lines 1–27 of useUnitDatabase.ts):

```typescript
/**
 * Phase 120 — Game data read hooks.
 * staleTime: Infinity — stratagems/enhancements/detachments are canonical reference
 * data that only changes when Wahapedia CSVs are re-imported.
 */
import { useQuery } from "@tanstack/react-query";
import {
  getStratagemsByDetachment,
  getStratagemsByFaction,
  getEnhancementsByDetachment,
  getDetachmentsByFaction,
  getDetachmentAbilitiesByFaction,
} from "@/db/queries/udbGameData";
import type { UdbStratagem, UdbEnhancement, UdbDetachment, UdbDetachmentAbilityWithDetachment } from "@/types/gameData";
```

**Query key factory pattern** (lines 29–36 of useUnitDatabase.ts):

```typescript
export const UDB_FACTIONS_KEY = (locale: Locale) =>
  ["udb-factions", locale] as const;
export const UDB_UNITS_KEY = (factionId: string, locale: Locale) =>
  ["udb-units", factionId, locale] as const;
```

Apply for game data:

```typescript
export const STRATAGEMS_BY_DETACHMENT_KEY = (detachmentId: string) =>
  ["udb-stratagems-detachment", detachmentId] as const;
export const STRATAGEMS_BY_FACTION_KEY = (factionId: string) =>
  ["udb-stratagems-faction", factionId] as const;
export const ENHANCEMENTS_BY_DETACHMENT_KEY = (detachmentId: string) =>
  ["udb-enhancements-detachment", detachmentId] as const;
export const DETACHMENTS_BY_FACTION_KEY = (factionId: string) =>
  ["udb-detachments-faction", factionId] as const;
export const DETACHMENT_ABILITIES_KEY = (factionId: string) =>
  ["udb-detachment-abilities", factionId] as const;
```

**Disabled-when-null hook pattern** (lines 53–65 of useUnitDatabase.ts):

```typescript
export function useUdbUnits(factionId: string | null) {
  const locale = useLocaleStore((s) => s.locale);
  return useQuery({
    queryKey:
      factionId !== null
        ? UDB_UNITS_KEY(factionId, locale)
        : (["udb-units", "disabled"] as const),
    queryFn: () =>
      factionId !== null ? getUdbUnitsByFaction(factionId, locale) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
  });
}
```

Apply for `useStratagemsByDetachment(detachmentId: string | undefined)`:

```typescript
export function useStratagemsByDetachment(detachmentId: string | undefined) {
  return useQuery({
    queryKey: detachmentId
      ? STRATAGEMS_BY_DETACHMENT_KEY(detachmentId)
      : (["udb-stratagems-detachment", "disabled"] as const),
    queryFn: () => getStratagemsByDetachment(detachmentId!),
    enabled: !!detachmentId,
    staleTime: Infinity,
  });
}
```

All six hooks follow the same pattern with `staleTime: Infinity`. The `useDetachmentAbilities` hook takes `factionId: string | null` matching PlaybookTab's `wahapediaFactionId` which can be null before resolution.

---

### `src/features/game-day/StrategemsTab.tsx` (component, stub swap)

**Change:** Remove local stub function (lines 11–14), add import, update `RwStratagem` type references to `UdbStratagem`.

**Stub removal pattern** — exact lines to delete:

```typescript
// REMOVE lines 11-14:
// Phase 107: stratagems data source (rules.db) eliminated -- EXT-03 deferred
// Stub hook returns empty array until stratagems are added to canonical DB
function useStratagemsByDetachment(_detachmentId: string | undefined) {
  return { data: [] as import("@/types/datasheet").RwStratagem[], isLoading: false };
}
```

**Import to add:**

```typescript
import { useStratagemsByDetachment } from "@/hooks/useGameData";
import type { UdbStratagem } from "@/types/gameData";
```

**Type reference update** (line 56 of StrategemsTab.tsx — `RwStratagem[]` in grouped useMemo):

```typescript
// BEFORE:
const map = new Map<string, RwStratagem[]>();
// AFTER:
const map = new Map<string, UdbStratagem[]>();
```

Also remove the `import type { RwStratagem } from "@/types/datasheet"` line (line 19) if no longer used.

The `PHASE_ORDER`, `grouped` useMemo, and all JSX remain unchanged — they already work correctly with any object having a `phase` field.

---

### `src/features/rules-hub/RulesHubPage.tsx` (component, stub swap + type wiring)

**Analog:** self — three stubs at lines 20–28 to replace.

**Stubs to remove** (lines 19–28):

```typescript
// REMOVE lines 19-28:
import type { RwDetachmentAbility, RwStratagem } from "@/types/datasheet";
function useStratagemsByFaction(_factionId: string | undefined) {
  return { data: [] as RwStratagem[], isLoading: false };
}
function useDetachmentsByFaction(_factionId: string | undefined) {
  return { data: [] as (import("@/types/datasheet").RwDetachment)[], isLoading: false };
}
function useSharedAbilitiesByFaction(_factionId: string | undefined) {
  return { data: [] as RwDetachmentAbility[], isLoading: false };
}
```

**Imports to add:**

```typescript
import {
  useStratagemsByFaction,
  useDetachmentsByFaction,
} from "@/hooks/useGameData";
import type { UdbStratagem, UdbDetachment } from "@/types/gameData";
```

Note: `useSharedAbilitiesByFaction` remains a stub (shared abilities are not part of Phase 120 scope — still deferred).

**applyStratagemFilters call** (line 74) — update generic type from `RwStratagem[]` to `UdbStratagem[]` after fixing the filter function.

**DetachmentCard prop type** — `detachment` prop changes from `RwDetachment` to `UdbDetachment`. The DetachmentCard component itself also needs updating (see below).

---

### `src/features/rules-hub/applyRulesHubFilters.ts` (utility, type fix)

**Analog:** self — single cp_cost comparison fix.

**Current problematic line** (line 22):

```typescript
// BEFORE (string === string):
result = result.filter((s) => s.cp_cost === options.cpFilter);
```

**Fix** — coerce integer to string for comparison, and update function signature:

```typescript
// AFTER: import UdbStratagem; update param type; coerce cp_cost
import type { UdbStratagem } from "@/types/gameData";

export interface StratagemFilterOptions {
  searchText: string;
  phaseFilter: string | null;
  cpFilter: string | null;   // cpFilter stays string ("1"|"2"|"3") — UI doesn't change
}

export function applyStratagemFilters(
  stratagems: UdbStratagem[],      // was: RwStratagem[]
  options: StratagemFilterOptions
): UdbStratagem[] {
  let result = stratagems;
  if (options.phaseFilter) {
    result = result.filter((s) => s.phase === options.phaseFilter);
  }
  if (options.cpFilter) {
    result = result.filter((s) => String(s.cp_cost) === options.cpFilter);  // coerce integer
  }
  if (options.searchText) {
    const lower = options.searchText.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        (s.type ?? "").toLowerCase().includes(lower)  // UdbStratagem has type not legend
    );
  }
  return result;
}
```

Note: `RwStratagem` has a `legend` field used for search; `UdbStratagem` does not. Replace `s.legend` search with `s.type` or omit.

---

### `src/features/rules-hub/StratagemCard.tsx` (component, prop type migration)

**Analog:** `src/features/game-day/GameDayStratagemCard.tsx`

**cpLabel function** — currently accepts `string | null` (line 29–32). Update to accept `number`:

```typescript
// BEFORE:
function cpLabel(cost: string | null): string {
  if (!cost || cost === "0") return "Free";
  return `${cost} CP`;
}

// AFTER:
function cpLabel(cost: number): string {
  if (cost === 0) return "Free";
  return `${cost} CP`;
}
```

**Props type update** (line 34–38):

```typescript
// BEFORE:
import type { RwStratagem } from "@/types/datasheet";
interface StratagemCardProps {
  stratagem: RwStratagem;
  ...
}

// AFTER:
import type { UdbStratagem } from "@/types/gameData";
interface StratagemCardProps {
  stratagem: UdbStratagem;
  ...
}
```

**Description rendering** — `RwStratagem.description` was `string | null`; `UdbStratagem.description` is `string NOT NULL`. The existing guard `{stratagem.description && <p>...` stays valid but is now always truthy.

**HTML description pattern** (D-19) — the description field contains HTML. Change plain `<p>` to `dangerouslySetInnerHTML` wrapper:

```typescript
// BEFORE:
{stratagem.description && <p>{stratagem.description}</p>}

// AFTER:
{stratagem.description && (
  <div
    className="[&_b]:font-semibold [&_.kwb]:text-foreground"
    dangerouslySetInnerHTML={{ __html: stratagem.description }}
  />
)}
```

Remove `legend` references — `UdbStratagem` has no `legend` field.

---

### `src/features/game-day/GameDayStratagemCard.tsx` (component, prop type migration)

**Analog:** `src/features/rules-hub/StratagemCard.tsx` — same changes, mirror exactly.

**cpLabel function** — same fix as StratagemCard above (line 25–28).

**Props type** (line 30–33):

```typescript
// BEFORE:
import type { RwStratagem } from "@/types/datasheet";
interface GameDayStratagemCardProps {
  stratagem: RwStratagem;
  ...
}

// AFTER:
import type { UdbStratagem } from "@/types/gameData";
interface GameDayStratagemCardProps {
  stratagem: UdbStratagem;
  ...
}
```

**parseInt removal** (line 39) — `cp_cost` is now a `number`, not a string:

```typescript
// BEFORE:
const cost = parseInt(stratagem.cp_cost ?? "0", 10) || 0;

// AFTER:
const cost = stratagem.cp_cost;   // already number
```

**HTML description + turn indicator** (D-03) — add `turn` badge and `dangerouslySetInnerHTML`:

```typescript
// Add turn indicator badge in CollapsibleTrigger (after phase badge):
{stratagem.turn && (
  <Badge variant="outline" className="shrink-0 border-transparent bg-muted text-muted-foreground text-xs">
    {stratagem.turn}
  </Badge>
)}

// Description in CollapsibleContent:
<div
  className="[&_b]:font-semibold [&_.kwb]:text-foreground"
  dangerouslySetInnerHTML={{ __html: stratagem.description }}
/>
```

Remove `legend` references.

---

### `src/features/army-lists/DetachmentPicker.tsx` (component, stub swap)

**Analog:** self — minimal change, stub at lines 14–17.

**Stub to remove** (lines 14–17):

```typescript
// REMOVE:
// Phase 107: detachments data source (rules.db) eliminated -- EXT-03 deferred
function useDetachmentsByFaction(_factionId: string | undefined) {
  return { data: [] as { id: string; name: string }[] };
}
```

**Import to add:**

```typescript
import { useDetachmentsByFaction } from "@/hooks/useGameData";
```

**emptyMessage update** — the `!rulesSynced` branch referenced rules.db sync. After wiring, it should reference udb import state. The `rulesSynced` prop is passed from `ArmyListSheet.tsx` — inspect whether it checks `udbMeta !== null` during implementation (Research open question 1). Update message string:

```typescript
// BEFORE:
const emptyMessage = !rulesSynced
  ? "Sync rules from the Rules Hub to load detachments."
  : ...

// AFTER (if rulesSynced prop is updated to reflect udbMeta):
const emptyMessage = !rulesSynced
  ? "Import rules data via the Rules Hub to load detachments."
  : ...
```

**No type changes needed** — `UdbDetachment.id` is `TEXT` and the combobox already uses `string` id. The `onChange(d.id, d.name)` call at line 94 is unchanged.

---

### `src/features/army-lists/EnhancementPickerSheet.tsx` (component, data source migration)

**Analog:** self — lines 19–72 need rewriting; lines 77–244 (JSX + validation) preserved.

**Import block changes** (lines 1–23):

```typescript
// REMOVE:
import { useQuery } from "@tanstack/react-query";
import { getEnhancementsByFaction } from "@/db/queries/bsdataExtended";
import type { SyncedEnhancementRow } from "@/db/queries/bsdataExtended";

// ADD:
import { useEnhancementsByDetachment } from "@/hooks/useGameData";
import type { UdbEnhancement } from "@/types/gameData";
```

**Data fetch replacement** (lines 45–72):

```typescript
// REMOVE (lines 45-72 — faction string coercion, old useQuery, client-side detachment filter):
const factionIdStr = unit?.faction_id != null ? String(unit.faction_id) : ...
const { data: factionEnhancements = [] } = useQuery<SyncedEnhancementRow[]>({
  queryKey: ["enhancements-by-faction", factionIdStr],
  queryFn: () => getEnhancementsByFaction(factionIdStr!),
  ...
});
const detachmentEnhancements = useMemo(() => {
  if (!list?.detachment_name) return [];
  return factionEnhancements.filter(
    (e) => e.detachment_name.toLowerCase() === list.detachment_name!.toLowerCase(),
  );
}, [factionEnhancements, list?.detachment_name]);

// ADD — filter is now done in SQL using detachment_id FK (Pitfall 2 fix):
const { data: detachmentEnhancements = [] } = useEnhancementsByDetachment(
  list?.detachment_id ?? undefined,
);
```

**Field name changes in JSX** (lines 161, 162, 224 — `enhancement.points` → `enhancement.cost`, `list.detachment_name` → `list.detachment_id` guards):

```typescript
// BEFORE (line 161):
<Badge variant="secondary">{enhancement.points} pts</Badge>
// AFTER:
<Badge variant="secondary">{enhancement.cost} pts</Badge>

// BEFORE (line 224):
enhancement_points: enhancement.points,
// AFTER:
enhancement_points: enhancement.cost,
```

**Description rendering** (D-10) — add HTML description below the points badge:

```typescript
// Add inside the enhancement card div, after the existing badge row:
{enhancement.description && (
  <div
    className="text-xs text-muted-foreground [&_b]:font-semibold [&_.kwb]:text-foreground"
    dangerouslySetInnerHTML={{ __html: enhancement.description }}
  />
)}
```

**Validation logic preserved** (lines 129–151) — `isMaxed`, `isDuplicate`, `isEpicHero` checks remain unchanged.

**Guard updates** — replace `list.detachment_name` existence checks with `list.detachment_id`:

```typescript
// BEFORE (line 68, 106, 113, 120):
if (!list?.detachment_name) return [];
factionIdStr && !list?.detachment_name && ...
factionIdStr && list?.detachment_name && detachmentEnhancements.length === 0 && ...

// AFTER:
list?.detachment_id  // use detachment_id as the presence guard
```

Note: The `SheetDescription` text (line 91) also references `list.detachment_name` for display — keep that for human-readable display, but use `list.detachment_id` for the data fetch guard.

---

### `src/features/units/PlaybookTab.tsx` (component, new section insertion)

**Analog:** `src/features/rules-hub/DetachmentCard.tsx` (collapsible section pattern, lines 98–135)

**Insertion point** — line 234: after `<PlaybookRules />`, before `<TierManager>`.

**New section pattern** — collapsible section using same shadcn/ui components as DetachmentCard and StrategemsTab:

```typescript
// Add import at top:
import { useDetachmentAbilities } from "@/hooks/useGameData";
import type { UdbDetachmentAbilityWithDetachment } from "@/types/gameData";

// Insertion after line 234 (<PlaybookRules />):
{wahapediaFactionId && (
  <PlaybookDetachmentAbilities factionId={wahapediaFactionId} />
)}
```

**New sub-component** (define above `PlaybookTab` function, or in a separate file `PlaybookDetachmentAbilities.tsx`):

```typescript
function PlaybookDetachmentAbilities({ factionId }: { factionId: string }) {
  const { data: abilities = [], isLoading } = useDetachmentAbilities(factionId);

  // Group by detachment_name (D-15: always show all detachments for faction in PlaybookTab)
  const grouped = useMemo(() => {
    const map = new Map<string, UdbDetachmentAbilityWithDetachment[]>();
    for (const a of abilities) {
      if (!map.has(a.detachment_name)) map.set(a.detachment_name, []);
      map.get(a.detachment_name)!.push(a);
    }
    return map;
  }, [abilities]);

  if (isLoading || abilities.length === 0) return null;

  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 ...">
        <span className="flex-1 font-medium text-sm">Detachment Abilities</span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 mt-2">
        {[...grouped.entries()].map(([detachmentName, detachmentAbilities]) => (
          <div key={detachmentName}>
            <p className="text-xs font-semibold text-muted-foreground mb-1">{detachmentName}</p>
            {detachmentAbilities.map((a) => (
              <div key={a.id} className="text-sm mb-2">
                <p className="font-semibold">{a.name}</p>
                {a.description && (
                  <div
                    className="text-muted-foreground [&_b]:font-semibold [&_.kwb]:text-foreground"
                    dangerouslySetInnerHTML={{ __html: a.description }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

**Imports needed in PlaybookTab.tsx** — add `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`, `ChevronDown` if not already present. The `useMemo` import is already present (line 1).

---

### `src/features/rules-hub/DetachmentCard.tsx` (component, stub swap + type migration)

**Analog:** self — stub at lines 9–12; prop type `RwDetachment` → `UdbDetachment`.

**Stub to remove** (lines 9–12):

```typescript
// REMOVE:
// Phase 107: detachment abilities data source (rules.db) eliminated -- EXT-03 deferred
function useDetachmentAbilitiesByDetachment(_detachmentId: string) {
  return { data: [] as import("@/types/datasheet").RwDetachmentAbility[], isLoading: false };
}
```

**Import to add:**

```typescript
import { useDetachmentAbilities } from "@/hooks/useGameData";
import type { UdbDetachment, UdbDetachmentAbilityWithDetachment } from "@/types/gameData";
```

**Hook call update** (line 90) — `useDetachmentAbilitiesByDetachment(detachment.id)` becomes a faction-scoped query, filtering client-side by `detachment.id`, OR a new `useDetachmentAbilitiesByDetachment(id)` hook can be added to `useGameData.ts` that queries `udb_detachment_abilities WHERE detachment_id = $1`. The latter is cleaner for this per-card use:

```typescript
// New query function to add in udbGameData.ts:
export async function getDetachmentAbilitiesByDetachment(
  detachmentId: string,
): Promise<UdbDetachmentAbility[]> {
  const db = await getDb();
  return db.select<UdbDetachmentAbility[]>(
    `SELECT id, detachment_id, faction_id, name, description
     FROM udb_detachment_abilities
     WHERE detachment_id = $1
     ORDER BY name`,
    [detachmentId],
  );
}
```

**Prop type update** (line 82–86):

```typescript
// BEFORE:
interface DetachmentCardProps {
  detachment: RwDetachment;
  ...
}
// AFTER:
interface DetachmentCardProps {
  detachment: UdbDetachment;
  ...
}
```

**Ability annotation IDs** — `RwDetachmentAbility.id` was a string; `UdbDetachmentAbility.id` is also a string. The `favoritesMap.get(ability.id + ':detachment_ability')` pattern (lines 92, 127) is unchanged.

**Description rendering** — update from plain text to HTML (D-19):

```typescript
// BEFORE (line 67):
{ability.description && (
  <p className="text-muted-foreground mt-0.5">{ability.description}</p>
)}
// AFTER:
{ability.description && (
  <div
    className="text-muted-foreground mt-0.5 [&_b]:font-semibold [&_.kwb]:text-foreground"
    dangerouslySetInnerHTML={{ __html: ability.description }}
  />
)}
```

Remove `ability.legend` reference (line 69) — `UdbDetachmentAbility` has no `legend` field.

---

## Shared Patterns

### 1. Query Function Structure
**Source:** `src/db/queries/unitDatabase.ts` lines 137–147
**Apply to:** All functions in `udbGameData.ts`

```typescript
export async function getFoo(param: string): Promise<FooType[]> {
  const db = await getDb();
  return db.select<FooType[]>(
    `SELECT col1, col2 FROM table WHERE faction_id = $1 ORDER BY name`,
    [param],
  );
}
```

Rules: `$1/$2` positional params; `getDb()` not `getRulesDb()`; explicit column list in SELECT (no `SELECT *` for new queries).

### 2. Disabled-When-Null Hook
**Source:** `src/hooks/useUnitDatabase.ts` lines 53–65
**Apply to:** All six hooks in `useGameData.ts`

```typescript
export function useFoo(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? FOO_KEY(id) : (["foo", "disabled"] as const),
    queryFn: () => getFoo(id!),
    enabled: !!id,
    staleTime: Infinity,
  });
}
```

### 3. HTML Description Rendering (dangerouslySetInnerHTML)
**Source:** Established per D-19 (Research section); consistent with existing PlaybookTab renders
**Apply to:** All card components rendering stratagem/enhancement/detachment ability descriptions

```typescript
{description && (
  <div
    className="text-sm text-muted-foreground [&_b]:font-semibold [&_.kwb]:text-foreground"
    dangerouslySetInnerHTML={{ __html: description }}
  />
)}
```

For nullable description fields (`udb_detachment_abilities.description`): always guard with `{description && ...}`. For NOT NULL fields (stratagems, enhancements): guard is optional but harmless.

### 4. Stub Hook Removal
**Source:** All five stub locations in the codebase
**Apply to:** StrategemsTab.tsx, RulesHubPage.tsx (×3), DetachmentPicker.tsx, DetachmentCard.tsx

Pattern: delete the local inline function + its comment; add named import from `@/hooks/useGameData`; remove the unused `_` prefix parameter that TypeScript strict mode required.

### 5. Collapsible Section
**Source:** `src/features/game-day/StrategemsTab.tsx` lines 145–167; `src/features/rules-hub/DetachmentCard.tsx` lines 98–135
**Apply to:** New PlaybookTab detachment abilities section

```typescript
<Collapsible defaultOpen={false}>
  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border bg-card px-4 py-3 text-left [&[data-state=open]>svg:last-child]:rotate-180">
    <span className="flex-1 font-medium text-sm">{sectionTitle}</span>
    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
  </CollapsibleTrigger>
  <CollapsibleContent className="mt-2 flex flex-col gap-2">
    {/* content */}
  </CollapsibleContent>
</Collapsible>
```

---

## No Analog Found

All files in this phase have close analogs. No files require patterns from RESEARCH.md alone.

---

## Critical Type Change Summary

| Field | Old Type | New Type | Affected Files |
|---|---|---|---|
| `stratagem.cp_cost` | `string \| null` | `number` | `StratagemCard.tsx`, `GameDayStratagemCard.tsx`, `applyRulesHubFilters.ts`, `StrategemsTab.tsx` |
| `enhancement.points` | `number` | `enhancement.cost: number` | `EnhancementPickerSheet.tsx` (field rename) |
| `detachment.id` type | same | same (no change) | `DetachmentPicker.tsx` (no type change needed) |
| `detachment.description` rendering | plain text | `dangerouslySetInnerHTML` | `DetachmentCard.tsx`, `PlaybookTab.tsx` new section |

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/hooks/`, `src/features/game-day/`, `src/features/rules-hub/`, `src/features/army-lists/`, `src/features/units/`, `src/types/`, `src-tauri/migrations/`
**Files scanned:** 14 source files + 2 migration files
**Pattern extraction date:** 2026-06-08
