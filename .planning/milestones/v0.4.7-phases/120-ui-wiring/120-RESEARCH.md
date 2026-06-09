# Phase 120: UI Wiring — Research

**Researched:** 2026-06-08
**Domain:** React Query data layer + SQLite query layer + UI component wiring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Game Day Stratagems (STR-03)**
- D-01: Group by battle phase (Command, Movement, Shooting, Charge, Fight) matching existing `StrategemsTab.tsx` collapsible phase tabs structure.
- D-02: Filter by active army list's selected detachment + always include universal/core stratagems (NULL `faction_id` AND NULL `detachment_id`).
- D-03: Show CP cost badge, turn indicator, and stratagem type on each card. HTML description with `dangerouslySetInnerHTML`.
- D-04: Replace hardcoded empty array in `useStratagemsByDetachment()` with real query against `udb_stratagems`.

**Rules Hub Stratagems Tab (STR-04)**
- D-05: Faction filter + free-text search + optional detachment filter dropdown.
- D-06: Reuse the same card component as Game Day where possible.
- D-07: Replace stub `useStratagemsByFaction()` returning empty array in `RulesHubPage.tsx`.

**Enhancement Picker Migration (ENH-02, ENH-03)**
- D-08: Replace `synced_enhancements` (BSData source) with `udb_enhancements` as sole data source. Rewire `getEnhancementsByFaction()` in `bsdataExtended.ts`.
- D-09: Filter enhancements by the army list's selected detachment (detachment-specific in Wahapedia data).
- D-10: Show name, points cost (from `cost` column), and description (HTML).
- D-11: Preserve existing validation logic (max 3, no duplicates, Epic Heroes excluded).

**Detachment Picker Wiring (DET-03)**
- D-12: Query `udb_detachments` filtered by `faction_id` for the army list's faction. Populate existing `DetachmentPicker.tsx` combobox.
- D-13: Replace stub `useDetachmentsByFaction()` returning empty array.

**PlaybookTab Detachment Abilities (DET-04)**
- D-14: Add new collapsible "Detachment Abilities" section in PlaybookTab after existing Rules section.
- D-15: If unit belongs to a specific detachment context (from an army list), show that detachment's abilities. Otherwise show all detachment abilities for the faction with detachment name grouping.

**Query Layer & Hooks Architecture**
- D-16: Single query file `src/db/queries/udbGameData.ts` covering all four entity types.
- D-17: Single hooks file `src/hooks/useGameData.ts` with six hooks.
- D-18: TypeScript interfaces in `src/types/gameData.ts`: `UdbStratagem`, `UdbEnhancement`, `UdbDetachment`, `UdbDetachmentAbility`.

**HTML Rendering**
- D-19: Use `dangerouslySetInnerHTML` with styled wrapper for description fields (spans with `kwb` class, `br`, `b` tags).

### Claude's Discretion
- React Query key naming conventions for new hooks
- Whether to create a shared `GameDataCard` component or keep `StratagemCard`/`DetachmentCard`/`EnhancementCard` separate
- Exact sorting within phase groups (alphabetical, by CP cost, etc.)
- Empty state messaging when no detachment is selected or faction has no data
- Whether to add a "Detachments" tab to Rules Hub alongside existing stub tabs

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STR-03 | Game Day page shows real stratagems from canonical database grouped by battle phase | D-01..D-04; query design in Architecture Patterns section |
| STR-04 | Rules Hub stratagems tab shows real data from canonical database with search/filter | D-05..D-07; `applyStratagemFilters` reuse analysis |
| ENH-02 | Army list enhancement picker shows descriptions from canonical database | D-08..D-11; `udb_enhancements` schema match |
| ENH-03 | Enhancement points resolved from canonical database (replaces manual input) | D-10; `cost` column is INTEGER, not TEXT |
| DET-03 | Army list detachment picker shows real detachment data from canonical database | D-12..D-13; `udb_detachments` schema match |
| DET-04 | PlaybookTab detachment abilities section shows real data | D-14..D-15; `wahapediaFactionId` already available in PlaybookTab |
</phase_requirements>

---

## Summary

Phase 120 is a pure UI wiring phase: the data already lives in SQLite (imported by Phases 118/119). The work is creating a new query/hook layer pointing at `udb_*` tables, then replacing six inline stub hooks and one BSData query call with real implementations.

The existing UI scaffolding is complete and well-structured. Every stub hook is a local inline function returning `{ data: [], isLoading: false }` — a deliberate, minimal shim requiring only a drop-in replacement. No component layout changes are needed except for PlaybookTab (DET-04), which requires a new collapsible section after the existing `<PlaybookRules />` (which currently returns `null`).

The most nuanced work is the type mismatch between the old `RwStratagem` (from rules.db, string `cp_cost`) and the new `udb_stratagems` schema (integer `cp_cost`). `GameDayStratagemCard` and `StratagemCard` both call `parseInt(stratagem.cp_cost, 10)` on a string field, and `applyStratagemFilters` compares `s.cp_cost === options.cpFilter` where cpFilter is a string. The new `UdbStratagem` type uses `cp_cost: number` — the card components and the filter function need updating to handle integers.

**Primary recommendation:** Create `udbGameData.ts`, `gameData.ts` types, and `useGameData.ts` hooks as a clean new layer, then update each of the six stub call sites one at a time. Update `applyStratagemFilters` and the two card components to accept integer `cp_cost`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Stratagem query by detachment | DB / Query layer | React Query hook | SQLite filter; no backend Rust needed |
| Stratagem query by faction | DB / Query layer | React Query hook | Same pattern |
| Enhancement query by detachment | DB / Query layer | React Query hook | Replaces BSData path |
| Detachment query by faction | DB / Query layer | React Query hook | Single SELECT with FK |
| Detachment abilities query | DB / Query layer | React Query hook | JOIN or two-query pattern |
| HTML description rendering | UI / Component | — | `dangerouslySetInnerHTML` with wrapper |
| Filter logic (search/phase/CP) | Frontend (pure function) | — | Existing `applyStratagemFilters` can be updated in place |
| PlaybookTab section insertion | UI / Component | React Query hook | Stateless display after data arrives |

---

## Standard Stack

No new libraries are needed. This phase uses the established project stack exclusively.

### Core (existing, no install needed)
| Library | Purpose | Pattern Used |
|---------|---------|--------------|
| `@tanstack/react-query` | Server state caching | `useQuery` with `staleTime: Infinity` for reference data |
| `src/db/client.ts` | SQLite singleton | `getDb()` + `$1, $2` positional params |
| Tauri plugin-sql | SQLite bridge | `db.select<T[]>(sql, params)` |

### No Package Legitimacy Audit Required
This phase installs zero new npm packages.

---

## Architecture Patterns

### Data Flow

```
StrategemsTab / RulesHubPage / DetachmentPicker
/ EnhancementPickerSheet / PlaybookTab
        ↓  (hook call)
src/hooks/useGameData.ts
  useStratagemsByDetachment(detachmentId)
  useStratagemsByFaction(factionId)
  useEnhancementsByDetachment(detachmentId)
  useDetachmentsByFaction(factionId)
  useDetachmentAbilities(factionId, detachmentId?)
        ↓  (queryFn)
src/db/queries/udbGameData.ts
  getStratagemsByDetachment(detachmentId)
  getStratagemsByFaction(factionId)
  getEnhancementsByDetachment(detachmentId)
  getDetachmentsByFaction(factionId)
  getDetachmentAbilities(factionId, detachmentId?)
        ↓
DB singleton (getDb()) → hobbyforge.db
  udb_stratagems / udb_enhancements
  udb_detachments / udb_detachment_abilities
```

### Recommended Project Structure (new files)

```
src/
  types/
    gameData.ts              NEW — UdbStratagem, UdbEnhancement, UdbDetachment, UdbDetachmentAbility
  db/queries/
    udbGameData.ts           NEW — five query functions
  hooks/
    useGameData.ts           NEW — six React Query hooks
```

Modified existing files:
```
src/features/game-day/StrategemsTab.tsx
src/features/rules-hub/RulesHubPage.tsx
src/features/rules-hub/applyRulesHubFilters.ts
src/features/rules-hub/StratagemCard.tsx
src/features/game-day/GameDayStratagemCard.tsx
src/features/army-lists/DetachmentPicker.tsx
src/features/army-lists/EnhancementPickerSheet.tsx
src/features/units/PlaybookTab.tsx
```

---

## Critical Type Analysis

### cp_cost: string vs integer

The old `RwStratagem` (rules.db era) typed `cp_cost` as `string | null`. `GameDayStratagemCard` calls `parseInt(stratagem.cp_cost ?? "0", 10)`. `StratagemCard` calls `cpLabel(stratagem.cp_cost)` which accepts `string | null`. `applyStratagemFilters` does `s.cp_cost === options.cpFilter` where cpFilter is `"1" | "2" | "3"`.

The new `UdbStratagem` will have `cp_cost: number` (SQLite INTEGER, migration 043 confirms `cp_cost INTEGER NOT NULL DEFAULT 0`).

**Required adaptations:**
1. `GameDayStratagemCard` — change prop type from `RwStratagem` to `UdbStratagem`. The `parseInt` call becomes unnecessary (already a number). The `cpLabel` helper takes `number` instead of `string | null`.
2. `StratagemCard` in Rules Hub — same prop type change.
3. `applyStratagemFilters` — the cpFilter comparison needs `String(s.cp_cost) === options.cpFilter` or change cpFilter type to `number`.
4. `applyRulesHubFilters.ts` exports `StratagemFilterOptions.cpFilter: string | null` — this can stay as string; just coerce in the filter body.

### Enhancement: SyncedEnhancementRow vs UdbEnhancement

`EnhancementPickerSheet` uses `SyncedEnhancementRow` from `bsdataExtended.ts`:
```ts
interface SyncedEnhancementRow {
  name: string;
  faction_id: string | null;
  detachment_name: string;   // ← string name
  points: number;            // ← "points" field name
}
```

New `UdbEnhancement` from migration 043:
```ts
interface UdbEnhancement {
  id: string;
  faction_id: string;
  detachment_id: string | null;  // ← FK to udb_detachments.id, NOT a name
  name: string;
  cost: number;                  // ← "cost" field name (not "points")
  description: string;
}
```

**Required adaptations:**
1. `EnhancementPickerSheet` references `enhancement.points` — must change to `enhancement.cost`.
2. The existing filter by `detachment_name` in the sheet (line 68-72) must change to filter by `detachment_id`. The `list.detachment_id` field is available on `ArmyList` — this is the correct FK to use.
3. The `addEnhancement.mutate(...)` call passes `enhancement_points: enhancement.points` — must change to `enhancement.cost`.
4. Remove the `useQuery` import of `getEnhancementsByFaction` from `bsdataExtended.ts` — replace with `useEnhancementsByDetachment` from `useGameData.ts` (filtered upstream in SQL, not in the component).

### DetachmentPicker: id type

Current stub returns `{ id: string; name: string }[]`. `udb_detachments.id` is `TEXT PRIMARY KEY` (Wahapedia detachment_id). This matches exactly — the combobox passes the id string back via `onChange(d.id, d.name)`. No type change needed for the picker's output, just the data source.

The `ArmyList.detachment_id` field stores this Wahapedia id already (`string | null`).

### wahapediaFactionId in PlaybookTab (DET-04)

`PlaybookTab` already has `const { data: wahapediaFactionId } = useWahapediaFactionId(localFaction?.name)`. This is the `udb_factions.id` (TEXT, e.g. `"SM"`, `"NEC"`). The `udb_detachment_abilities.faction_id` column is also a `udb_factions.id` FK. So `wahapediaFactionId` can be passed directly to `useDetachmentAbilities(wahapediaFactionId)`.

There is no detachment context available within `PlaybookTab` itself (PlaybookTab shows a collection unit, not an army list unit). D-15 says: "show all detachment abilities for the faction with detachment name grouping" when no detachment context is available. This is the PlaybookTab case.

---

## Pattern 1: Query Functions (udbGameData.ts)

[ASSUMED — follows exact established pattern from `unitDatabase.ts` and `bsdataExtended.ts`]

```typescript
// Source: established project pattern (src/db/queries/unitDatabase.ts)
import { getDb } from "@/db/client";

export async function getStratagemsByDetachment(
  detachmentId: string,
): Promise<UdbStratagem[]> {
  const db = await getDb();
  // Include universal stratagems (NULL faction_id AND NULL detachment_id)
  // OR stratagems belonging to this specific detachment
  return db.select<UdbStratagem[]>(
    `SELECT id, faction_id, detachment_id, name, type, cp_cost, turn, phase, description
     FROM udb_stratagems
     WHERE detachment_id = $1
        OR (faction_id IS NULL AND detachment_id IS NULL)
     ORDER BY phase, name`,
    [detachmentId],
  );
}

export async function getStratagemsByFaction(
  factionId: string,
): Promise<UdbStratagem[]> {
  const db = await getDb();
  return db.select<UdbStratagem[]>(
    `SELECT id, faction_id, detachment_id, name, type, cp_cost, turn, phase, description
     FROM udb_stratagems
     WHERE faction_id = $1
        OR (faction_id IS NULL AND detachment_id IS NULL)
     ORDER BY phase, name`,
    [factionId],
  );
}

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

export async function getEnhancementsByDetachment(
  detachmentId: string,
): Promise<UdbEnhancement[]> {
  const db = await getDb();
  return db.select<UdbEnhancement[]>(
    `SELECT id, faction_id, detachment_id, name, cost, description
     FROM udb_enhancements
     WHERE detachment_id = $1
     ORDER BY name`,
    [detachmentId],
  );
}

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

### Pattern 2: React Query Hooks (useGameData.ts)

```typescript
// Source: established project pattern (src/hooks/useUnitDatabase.ts)
export const STRATAGEMS_BY_DETACHMENT_KEY = (detachmentId: string) =>
  ["udb-stratagems-detachment", detachmentId] as const;

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

`staleTime: Infinity` is correct for canonical reference data that only changes on re-import.

### Pattern 3: HTML Description Rendering

The existing `PlaybookDatasheet` renders ability descriptions as plain text. The udb descriptions contain HTML with `<span class="kwb">`, `<b>`, `<br>` tags. Use `dangerouslySetInnerHTML` with a `prose-sm` wrapper:

```typescript
// Established pattern: see PlaybookTab existing ability rendering (abilities textarea)
// Safe because data comes from Wahapedia CSV import, not user input
<div
  className="text-sm text-muted-foreground [&_b]:font-semibold [&_.kwb]:text-foreground"
  dangerouslySetInnerHTML={{ __html: description }}
/>
```

The `[&_b]:font-semibold` and `[&_.kwb]:text-foreground` Tailwind arbitrary variants apply styles to embedded HTML elements.

### Pattern 4: Stub Hook Replacement

Each stub is a local inline function at the top of a file. Replacing them follows the same two-step pattern:
1. Remove the local stub function definition.
2. Add an import from `@/hooks/useGameData`.

Example for `StrategemsTab.tsx`:
```typescript
// REMOVE (lines 11-14):
// Phase 107: stratagems data source (rules.db) eliminated -- EXT-03 deferred
function useStratagemsByDetachment(_detachmentId: string | undefined) {
  return { data: [] as import("@/types/datasheet").RwStratagem[], isLoading: false };
}

// ADD:
import { useStratagemsByDetachment } from "@/hooks/useGameData";
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phase grouping for stratagems | Custom grouping logic | Existing `PHASE_ORDER` + `grouped` useMemo in `StrategemsTab.tsx` | Already works — just needs real data |
| CP cost formatting | Custom formatter | Existing `cpLabel()` in card components | Update signature from string to number only |
| Stratagem filtering | New filter function | Existing `applyStratagemFilters` in `applyRulesHubFilters.ts` | Update cpFilter comparison from string to coercion |
| Enhancement validation | Custom business rules | Existing logic in `EnhancementPickerSheet.tsx` lines 129-151 | D-11 explicitly preserved |
| Detachment combobox | New combobox | Existing `DetachmentPicker.tsx` | Already has search, clear, disabled state |
| HTML sanitization | Custom DOMPurify setup | `dangerouslySetInnerHTML` — data from trusted CSV import, not user input | No XSS risk from internal DB data |

---

## Common Pitfalls

### Pitfall 1: cp_cost integer vs string in filter and card components
**What goes wrong:** `applyStratagemFilters` compares `s.cp_cost === options.cpFilter` where cpFilter is `"1"`. If `s.cp_cost` is `1` (integer from udb_stratagems), this returns `false` for all stratagems.
**Why it happens:** Old `RwStratagem` had `cp_cost: string | null`; new `UdbStratagem` has `cp_cost: number`.
**How to avoid:** In `applyRulesHubFilters.ts`, change the comparison to `String(s.cp_cost) === options.cpFilter` when using UdbStratagem. Also update `cpLabel` helper in both card components to accept `number` instead of `string | null`.
**Warning signs:** CP filter buttons appear to work (no errors) but always show 0 results.

### Pitfall 2: Enhancement detachment matching by name vs id
**What goes wrong:** Current `EnhancementPickerSheet` filters by `e.detachment_name.toLowerCase() === list.detachment_name!.toLowerCase()`. After migration to udb_enhancements, the field is `detachment_id` (not `detachment_name`).
**Why it happens:** BSData used string detachment names; Wahapedia canonical DB uses FK ids.
**How to avoid:** New `getEnhancementsByDetachment(detachmentId)` filters in SQL using `list.detachment_id` (the FK). Component no longer does client-side detachment filtering.
**Warning signs:** Enhancement picker shows 0 enhancements even when the detachment has them in the DB.

### Pitfall 3: faction_id type mismatch (integer vs string) for enhancements
**What goes wrong:** `ArmyList.faction_id` is `number | null` (INTEGER FK to local `factions` table). `udb_enhancements.faction_id` is `TEXT` referencing `udb_factions.id` (e.g., `"SM"`, `"NEC"`). These are different ID spaces.
**Why it happens:** The app has two faction tables — local `factions` and canonical `udb_factions`.
**How to avoid:** Use `list.detachment_id` (a Wahapedia TEXT id) to filter udb_enhancements via `detachment_id` FK. Do not attempt to join through `faction_id`. `EnhancementPickerSheet` already has a workaround note (Pitfall 1 comment on line 45) about the string/int conversion for the old BSData path — the new path avoids this entirely by filtering on detachment_id.
**Warning signs:** Query returns empty or throws FK error.

### Pitfall 4: Universal stratagems shown at wrong scope
**What goes wrong:** Universal/core stratagems (NULL faction_id AND NULL detachment_id) represent rules like "Command Re-roll" that apply to all armies. If the SQL for `getStratagemsByDetachment` omits the OR clause, Game Day shows only detachment-specific stratagems and users cannot access core stratagems.
**Why it happens:** Simple `WHERE detachment_id = $1` misses the NULL-NULL case.
**How to avoid:** Always include `OR (faction_id IS NULL AND detachment_id IS NULL)` in detachment queries. STR-02 (already complete in Phase 119) imported 28 universal stratagems specifically for this purpose.
**Warning signs:** "Command Re-roll", "Rapid Ingress", etc. are absent from Game Day.

### Pitfall 5: PlaybookTab has no detachment context
**What goes wrong:** DET-04 says to show detachment abilities in PlaybookTab. PlaybookTab is a collection unit view — it has no army list context and therefore no `detachment_id`. If code tries to read a detachment_id that doesn't exist, it renders nothing silently.
**Why it happens:** D-15 describes two modes: with detachment context (from army list) and without.
**How to avoid:** PlaybookTab always runs in the "no detachment context" mode (D-15 fallback). Show all detachment abilities for the unit's faction grouped by detachment name. Disable/skip the abilities section if `wahapediaFactionId` is null (no canonical link).
**Warning signs:** Section renders nothing with no error; unit has a faction but `wahapediaFactionId` is undefined because `useWahapediaFactionId` hasn't resolved yet.

### Pitfall 6: DetachmentCard stub still uses old type after wiring
**What goes wrong:** `DetachmentCard.tsx` has its own inline stub `useDetachmentAbilitiesByDetachment` returning `RwDetachmentAbility[]`. If only `RulesHubPage.tsx` is updated and `DetachmentCard.tsx` is not, the detachment tab will show detachment names but no abilities.
**Why it happens:** Two separate stubs need replacing — the one in `RulesHubPage` (for the `useDetachmentsByFaction` hook) and the one inside `DetachmentCard` (for abilities per detachment).
**Warning signs:** Detachment cards expand but show "No abilities found." despite data existing in DB.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `synced_enhancements` (BSData XML parse) | `udb_enhancements` (Wahapedia CSV canonical) | Descriptions now available; points from source of truth |
| `rw_stratagems` / `rw_detachments` in rules.db | `udb_stratagems` / `udb_detachments` in hobbyforge.db | Single-database architecture; no rules.db dependency |
| Stub hooks returning `[]` | Real React Query hooks with `staleTime: Infinity` | Live data; cache-correct |

**Deprecated/outdated:**
- `RwStratagem` type from `src/types/datasheet.ts`: Still used by existing (non-stub) card components and `StrategemsTab`. After this phase, the card components are retargeted to `UdbStratagem`. The `RwStratagem` type itself should remain in the file for historical completeness (it documents the old rules.db shape) but no new code should depend on it.

---

## Open Questions (RESOLVED)

1. **Does `DetachmentPicker` need the `rulesSynced` prop updated?**
   - What we know: The prop controls the empty-state message ("Sync rules from the Rules Hub to load detachments"). The new data source is `udb_detachments`, not rules.db.
   - What's unclear: `rulesSynced` is passed from `ArmyListSheet.tsx`. It may check for rules.db sync status. After this phase, it should check for `udbMeta !== null` instead.
   - Recommendation: Inspect `ArmyListSheet.tsx` during implementation. If `rulesSynced` reflects rules.db sync, update it to check `udbMeta` instead. The empty message should change to "Import rules data via the Rules Hub to load detachments."
   - RESOLVED: Yes — Plan 02-T1 updates the empty message text and prop handling.

2. **Should `StratagemCard` and `GameDayStratagemCard` be refactored into a shared component?**
   - What we know: Both have near-identical layout. D-06 says "reuse the same card component as Game Day where possible." Claude has discretion here.
   - Recommendation: Keep them separate for now to avoid scope creep. The prop type difference (with vs without `onSpendCp`) and the annotation controls difference (StratagemCard has favorites/notes, GameDayStratagemCard doesn't) makes a shared base more complex than helpful in a single phase. Unify in a future quality phase if desired.
   - RESOLVED: No — keep separate. This is a discretion decision per CONTEXT.md.

3. **HTML description field: is it always non-null in practice?**
   - What we know: Migration 043 has `description TEXT NOT NULL` for both `udb_stratagems` and `udb_enhancements`. `udb_detachment_abilities.description` is `TEXT` (nullable).
   - Recommendation: For stratagems and enhancements, render description directly. For detachment abilities, guard with `{description && <div dangerouslySetInnerHTML=.../>}`.
   - RESOLVED: NOT NULL for stratagems/enhancements (render directly), nullable for detachment abilities (guard with conditional).

---

## Validation Architecture

> `workflow.nyquist_validation` not explicitly false — included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest section) |
| Quick run command | `pnpm test -- tests/game-data/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STR-03 | `getStratagemsByDetachment` includes universal stratagems | unit | `pnpm test -- tests/game-data/udbGameData.test.ts` | No — Wave 0 |
| STR-03 | `useStratagemsByDetachment` disabled when detachmentId undefined | unit | `pnpm test -- tests/game-data/useGameData.test.ts` | No — Wave 0 |
| STR-04 | `applyStratagemFilters` cp filter coerces integer correctly | unit | `pnpm test -- tests/rules-hub/applyRulesHubFilters.test.ts` | No — Wave 0 |
| ENH-02 | Enhancement picker shows description from udb_enhancements | integration | manual / future | — |
| ENH-03 | `enhancement.cost` (not `enhancement.points`) shown in picker | unit | `pnpm test -- tests/game-data/udbGameData.test.ts` | No — Wave 0 |
| DET-03 | `getDetachmentsByFaction` returns sorted detachment names | unit | `pnpm test -- tests/game-data/udbGameData.test.ts` | No — Wave 0 |
| DET-04 | `getDetachmentAbilitiesByFaction` JOIN returns detachment_name | unit | `pnpm test -- tests/game-data/udbGameData.test.ts` | No — Wave 0 |

### Wave 0 Gaps
- [ ] `tests/game-data/udbGameData.test.ts` — covers query function SQL contracts (mocked DB)
- [ ] `tests/game-data/useGameData.test.ts` — covers hook `enabled` guard behavior
- [ ] `tests/rules-hub/applyRulesHubFilters.test.ts` — covers integer cp_cost coercion

*(DB query functions must mock `getDb()` per project testing convention — Tauri APIs unavailable in jsdom)*

---

## Security Domain

No new security surface introduced. All data comes from the trusted canonical `hobbyforge.db` (imported from Wahapedia CSVs by the app itself). The `dangerouslySetInnerHTML` usage is consistent with existing patterns in the codebase and does not present XSS risk because the HTML content is written at import time by a controlled pipeline, not by user input.

ASVS V5 Input Validation: not applicable — no user-supplied HTML.

---

## Project Constraints (from CLAUDE.md)

- Parameterized queries use `$1, $2` positional syntax (Tauri plugin-sql requirement)
- TypeScript strict mode: `noUnusedLocals`, `noUnusedParameters` — remove all stub function parameters once hooks are imported
- Path alias `@/` resolves to `src/`
- No ESLint/Prettier — do not add
- Booleans stored as `0 | 1` integers — not relevant here (no boolean columns in udb_stratagems/enhancements/detachments)
- FK enforcement is ON via `PRAGMA foreign_keys = ON` in `client.ts` — udb_stratagems/enhancements have FK to udb_detachments; detachment must exist before stratagem/enhancement query
- React Query hooks: one hook file per entity group; export query key constants
- `staleTime: Infinity` appropriate for canonical reference data
- Tauri APIs must be mocked in tests (no native bridge in jsdom)

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src-tauri/migrations/042_udb_detachments.sql` — exact schema for `udb_detachments` and `udb_detachment_abilities`
- Codebase inspection: `src-tauri/migrations/043_udb_stratagems_enhancements.sql` — exact schema for `udb_stratagems` and `udb_enhancements`
- Codebase inspection: `src/features/game-day/StrategemsTab.tsx` — stub hook location, prop interface, grouping logic
- Codebase inspection: `src/features/rules-hub/RulesHubPage.tsx` — three stub hook locations, filter wiring
- Codebase inspection: `src/features/rules-hub/DetachmentCard.tsx` — fourth stub hook location (abilities per card)
- Codebase inspection: `src/features/army-lists/DetachmentPicker.tsx` — stub hook, combobox interface
- Codebase inspection: `src/features/army-lists/EnhancementPickerSheet.tsx` — BSData query call, validation logic, field names
- Codebase inspection: `src/features/units/PlaybookTab.tsx` — `wahapediaFactionId` availability, insertion point after `<PlaybookRules />`
- Codebase inspection: `src/features/rules-hub/applyRulesHubFilters.ts` — cp_cost string comparison
- Codebase inspection: `src/hooks/useUnitDatabase.ts` — hook pattern with `staleTime: Infinity`
- Codebase inspection: `src/db/queries/unitDatabase.ts` — query function pattern
- Codebase inspection: `src/types/datasheet.ts` — `RwStratagem.cp_cost: string | null`
- Codebase inspection: `src/types/armyList.ts` — `ArmyList.detachment_id: string | null`
- `.planning/phases/120-ui-wiring/120-CONTEXT.md` — all locked decisions D-01 through D-19

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SQL for `getStratagemsByDetachment` uses `OR (faction_id IS NULL AND detachment_id IS NULL)` to include universals | Architecture Patterns | Universal stratagems absent from Game Day; STR-02 data wasted |
| A2 | `staleTime: Infinity` is correct for udb game data hooks | Standard Stack | Stale data after re-import; mitigation: invalidate on bulk_sync_rules command |
| A3 | `dangerouslySetInnerHTML` requires no sanitization given trusted DB source | Architecture Patterns | XSS risk if data source changes to include user-supplied HTML |
| A4 | `DetachmentCard` stub is the only remaining stub for abilities (not a 5th stub elsewhere) | Common Pitfalls | Abilities remain empty in Rules Hub detachments tab |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing patterns fully documented in codebase
- Architecture: HIGH — all schemas verified from migration files; all stubs located by inspection
- Pitfalls: HIGH — type mismatches confirmed by direct file reading; cp_cost and detachment_name/id discrepancies are concrete

**Research date:** 2026-06-08
**Valid until:** 2026-07-08 (stable — SQLite schema and React Query patterns don't change)
