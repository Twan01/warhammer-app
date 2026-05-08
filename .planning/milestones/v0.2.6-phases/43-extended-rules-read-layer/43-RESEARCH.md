# Phase 43: Extended Rules Read Layer - Research

**Researched:** 2026-05-08
**Domain:** TypeScript data layer (types + queries + hooks) + React UI integration for rules.db extended tables
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**PlaybookTab Display Layout**
- Collapsible sections for each data type — matches existing Weapons and Datasheet Abilities pattern (both use `<Collapsible defaultOpen={true}>`)
- Each section has a section label (SECTION_LABEL_CLASS) header + collapsible content
- Sections only render when data exists (same conditional pattern as `hasWeapons`, `hasAnyDatasheetAbility`)

**Data Grouping & Organization**
- **Stratagems**: grouped by `phase` field (Command Phase, Movement Phase, Shooting Phase, Charge Phase, Fight Phase) — matches how players look up stratagems during a game turn sequence
- Stratagems within each phase group sorted alphabetically by name
- Show CP cost, type, turn restriction, and description per stratagem
- **Detachments**: flat list by name — typically 1-3 per faction, no sub-grouping needed
- Show name, legend, and type per detachment
- **Detachment abilities**: grouped under their parent detachment (via `detachment_id` FK) — directly matches SCHEMA-03 requirement
- Show name, legend, and description per detachment ability
- **Shared faction abilities**: flat list sorted by name — these are faction-wide abilities not attached to a specific datasheet
- Show name, legend, and description per shared ability

**Faction Data Linking**
- Reuse existing `useWahapediaFactionId` hook to resolve local faction name → Wahapedia `faction_id`
- All four new hooks take `wahapediaFactionId` as parameter — same pattern as `useDatasheetsByFaction`
- Data only loads when a unit has a linked faction with a resolved Wahapedia faction ID
- When faction can't be resolved (null), sections simply don't render — no error state needed

**Section Ordering in PlaybookTab**
- New sections appear after Datasheet Abilities / Sources, before Personal Ability Notes
- Order: Stratagems → Detachments (with abilities nested) → Shared Abilities
- Separator between each major section (existing pattern)
- Exact insertion point: after `(hasAnyDatasheetAbility || sources.length > 0) && <Separator />` (line ~634), before `<TierManager>`

**Query & Hook Patterns**
- New query file: `src/db/queries/rulesExtended.ts` — keeps extended rules queries separate from datasheet queries
- New hook file: `src/hooks/useRulesExtended.ts` — follows same pattern as `useDatasheet.ts`
- All hooks use `staleTime: Infinity` (rules data is static until re-sync, same as datasheet hooks)
- Query keys: `["stratagems-by-faction", factionId]`, `["detachments-by-faction", factionId]`, `["detachment-abilities", detachmentId]`, `["shared-abilities-by-faction", factionId]`
- `enabled` guard: only when param is defined (same as `useDatasheetsByFaction`)

**Type Definitions**
- Add `RwStratagem`, `RwDetachment`, `RwDetachmentAbility` to `src/types/datasheet.ts`
- `RwAbility` already exists and correctly maps `rw_abilities` — no new type needed for shared abilities
- All fields nullable except `id` and `name` (matching DDL NOT NULL constraints)

### Claude's Discretion
- Exact CSS styling of stratagem/detachment/ability entries within collapsible sections
- Whether to use AbilityEntry sub-component pattern or new sub-components for extended data
- Empty state text when faction has no stratagems/detachments (e.g., "No stratagems found for this faction")
- Whether stratagem phase headers use icons or just text labels

### Deferred Ideas (OUT OF SCOPE)
- Cache invalidation for new hooks on sync success — Phase 44 (SYNC-05)
- Detachment selection UI (choosing which detachment to play) — future phase, not in v0.2.6 scope
- Stratagem favoriting or custom notes per stratagem — new capability, not in scope
- Filtering stratagems by CP cost or type — could be useful but beyond read-only display scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHEMA-01 | User can view faction stratagems (name, phase, CP cost, description, keywords) in PlaybookTab | `rw_stratagems` table fully populated by sync; `getStratagemsByFaction` query pattern identified; grouping by `phase` field confirmed viable |
| SCHEMA-02 | User can view faction detachments (name, description, rule text) in PlaybookTab | `rw_detachments` table confirmed; flat list pattern; `legend` field maps to "description/rule text" |
| SCHEMA-03 | User can view detachment abilities grouped by detachment in PlaybookTab | `rw_detachment_abilities` has `detachment_id` TEXT FK; grouping requires per-detachment hook call or client-side group after bulk fetch |
| SCHEMA-04 | User can view shared faction abilities (non-datasheet-specific) in PlaybookTab | `rw_abilities` table confirmed; `RwAbility` type already exists; `getSharedAbilitiesByFaction` follows exact same pattern as other faction queries |
| SCHEMA-05 | TypeScript types, query functions, and React Query hooks exist for all four extended data types | Exact type definitions, query signatures, and hook signatures are fully specified in ARCHITECTURE-AUDIT.md |
</phase_requirements>

---

## Summary

Phase 43 is a pure READ path implementation — the sync WRITE path is confirmed complete by the Phase 42 audit. All 12 rw_* tables including `rw_stratagems`, `rw_detachments`, `rw_detachment_abilities`, and `rw_abilities` are populated after sync.

The work is entirely mechanical extension of existing patterns. There is one new file for queries (`src/db/queries/rulesExtended.ts`), one new file for hooks (`src/hooks/useRulesExtended.ts`), three new interfaces in `src/types/datasheet.ts`, and new collapsible sections integrated into PlaybookTab at line ~634.

The single non-trivial design decision is how to handle detachment abilities grouping. The context decision specifies grouping under their parent detachment via `detachment_id`. The most natural implementation calls `useDetachmentAbilitiesByDetachment` per detachment inside the detachments render loop — this requires fetching the detachments list first, then calling a separate hook per detachment. This is a hooks-in-loop pattern which React prohibits at the component level. The resolution is a two-level component split: a `DetachmentSection` sub-component that takes a `detachment` prop and calls `useDetachmentAbilitiesByDetachment` internally, so each sub-component has a stable, unconditional hook call.

**Primary recommendation:** Implement the four query functions, four hooks, and three TypeScript types exactly as specified in ARCHITECTURE-AUDIT.md. Use a `DetachmentSection` sub-component for the per-detachment abilities grouping to avoid hooks-in-loop. Follow all existing visual patterns from Weapons and Datasheet Abilities collapsibles.

---

## Standard Stack

### Core (all pre-existing in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | 5.x | React Query hooks with `staleTime: Infinity` | Established project pattern for all DB-backed data |
| `tauri-plugin-sql` | 2.x | `db.select<T[]>(SQL, [params])` with `$1` positional params | Only SQL client available in Tauri 2 |
| `shadcn/ui Collapsible` | current | `<Collapsible>`, `<CollapsibleTrigger>`, `<CollapsibleContent>` | Already imported in PlaybookTab |
| Lucide React | current | `ChevronDown` icon in collapsible triggers | Already imported in PlaybookTab |

No new dependencies needed. This phase adds no new packages.

**Installation:** No new packages. Zero `pnpm install` needed.

---

## Architecture Patterns

### Recommended File Layout

```
src/types/datasheet.ts                    # Add RwStratagem, RwDetachment, RwDetachmentAbility
src/db/queries/rulesExtended.ts           # NEW — 4 query functions against rules.db
src/hooks/useRulesExtended.ts             # NEW — 4 React Query hooks + exported query keys
src/features/units/PlaybookTab.tsx        # Extend — 3 new collapsible sections + import hooks
```

### Pattern 1: New Type Definitions

Add three interfaces to `src/types/datasheet.ts` alongside existing `RwAbility`. `RwAbility` already exists and covers `rw_abilities` — no new type needed for shared abilities.

```typescript
// Source: ARCHITECTURE-AUDIT.md §3 Phase 43 Gaps

export interface RwStratagem {
  id: string;
  faction_id: string | null;
  name: string;
  type: string | null;
  cp_cost: string | null;
  legend: string | null;
  turn: string | null;
  phase: string | null;
  detachment: string | null;
  detachment_id: string | null;
  description: string | null;
}

export interface RwDetachment {
  id: string;
  faction_id: string | null;
  name: string;
  legend: string | null;
  type: string | null;
}

export interface RwDetachmentAbility {
  id: string;
  faction_id: string | null;
  name: string;
  legend: string | null;
  description: string | null;
  detachment: string | null;
  detachment_id: string | null;
}
```

### Pattern 2: Query Functions (`src/db/queries/rulesExtended.ts`)

All four functions follow the exact template of `getDatasheetsByFaction` — call `getRulesDb()`, call `db.select<T[]>(SQL, [$1])`.

```typescript
// Source: ARCHITECTURE-AUDIT.md §3 + src/db/queries/datasheets.ts pattern

import { getRulesDb } from "@/db/rules-client";
import type { RwAbility, RwStratagem, RwDetachment, RwDetachmentAbility } from "@/types/datasheet";

export async function getStratagemsByFaction(factionId: string): Promise<RwStratagem[]> {
  const db = await getRulesDb();
  return db.select<RwStratagem[]>(
    "SELECT * FROM rw_stratagems WHERE faction_id = $1 ORDER BY name",
    [factionId]
  );
}

export async function getDetachmentsByFaction(factionId: string): Promise<RwDetachment[]> {
  const db = await getRulesDb();
  return db.select<RwDetachment[]>(
    "SELECT * FROM rw_detachments WHERE faction_id = $1 ORDER BY name",
    [factionId]
  );
}

export async function getDetachmentAbilitiesByDetachment(
  detachmentId: string
): Promise<RwDetachmentAbility[]> {
  const db = await getRulesDb();
  return db.select<RwDetachmentAbility[]>(
    "SELECT * FROM rw_detachment_abilities WHERE detachment_id = $1 ORDER BY name",
    [detachmentId]
  );
}

export async function getSharedAbilitiesByFaction(factionId: string): Promise<RwAbility[]> {
  const db = await getRulesDb();
  return db.select<RwAbility[]>(
    "SELECT * FROM rw_abilities WHERE faction_id = $1 ORDER BY name",
    [factionId]
  );
}
```

### Pattern 3: React Query Hooks (`src/hooks/useRulesExtended.ts`)

All four hooks follow the exact template of `useDatasheetsByFaction` — export query key constant, `enabled` guard on param truthiness, `staleTime: Infinity`.

```typescript
// Source: src/hooks/useDatasheet.ts pattern

import { useQuery } from "@tanstack/react-query";
import {
  getStratagemsByFaction,
  getDetachmentsByFaction,
  getDetachmentAbilitiesByDetachment,
  getSharedAbilitiesByFaction,
} from "@/db/queries/rulesExtended";

export const STRATAGEMS_BY_FACTION_KEY = (factionId: string) =>
  ["stratagems-by-faction", factionId] as const;
export const DETACHMENTS_BY_FACTION_KEY = (factionId: string) =>
  ["detachments-by-faction", factionId] as const;
export const DETACHMENT_ABILITIES_KEY = (detachmentId: string) =>
  ["detachment-abilities", detachmentId] as const;
export const SHARED_ABILITIES_BY_FACTION_KEY = (factionId: string) =>
  ["shared-abilities-by-faction", factionId] as const;

export function useStratagemsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId !== undefined
      ? STRATAGEMS_BY_FACTION_KEY(factionId)
      : (["stratagems-by-faction"] as const),
    queryFn: () =>
      factionId !== undefined ? getStratagemsByFaction(factionId) : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
  });
}

// ... same shape for useDetachmentsByFaction, useDetachmentAbilitiesByDetachment,
//     useSharedAbilitiesByFaction
```

### Pattern 4: DetachmentSection Sub-Component (hooks-in-loop resolution)

The detachment abilities must be grouped per-detachment. Since React prohibits calling hooks in loops, a `DetachmentSection` sub-component resolves this: it receives a single `RwDetachment` prop and calls `useDetachmentAbilitiesByDetachment` unconditionally as its own hook.

```typescript
// Module-local sub-component inside PlaybookTab.tsx

function DetachmentSection({ detachment }: { detachment: RwDetachment }) {
  const { data: abilities = [] } = useDetachmentAbilitiesByDetachment(detachment.id);
  return (
    <div className="flex flex-col gap-2">
      <span className={SECTION_LABEL_CLASS}>{detachment.name}</span>
      {detachment.legend && (
        <p className="text-xs text-muted-foreground">{detachment.legend}</p>
      )}
      {abilities.map((a) => (
        <AbilityEntry key={a.id} ability={a} />
      ))}
    </div>
  );
}
```

`AbilityEntry` currently accepts `RwDatasheetAbility`. For extended data types, either:
- Widen `AbilityEntry` to accept `{ name: string; description: string | null }` (simpler, covers all cases)
- Create a new `ExtendedAbilityEntry` sub-component that matches the `RwDetachmentAbility` / `RwAbility` shapes

The discretion section grants freedom here. Widening `AbilityEntry` to a structural type is cleaner and avoids component duplication.

### Pattern 5: PlaybookTab Collapsible Sections

New sections insert at line ~634, after the existing `(hasAnyDatasheetAbility || sources.length > 0) && <Separator />`, before `<TierManager unitId={unitId} />`.

```typescript
// Pattern mirrors existing Weapons / Datasheet Abilities collapsibles

{hasStratagems && (
  <>
    <Separator />
    <Collapsible defaultOpen={true}>
      <CollapsibleTrigger asChild>
        <button type="button" className="flex items-center justify-between w-full py-2 text-left">
          <span className="text-base font-semibold">Stratagems</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* Phase-grouped stratagem entries */}
      </CollapsibleContent>
    </Collapsible>
  </>
)}
```

`hasStratagems`, `hasDetachments`, `hasSharedAbilities` booleans are derived from the hook results using the same pattern as `hasWeapons` and `hasAnyDatasheetAbility`.

### Stratagem Phase Grouping

`useMemo` groups the stratagems array by `phase` field client-side. The raw Wahapedia `phase` values are strings (e.g. `"Command phase"`, `"Movement phase"`, `"Shooting phase"`). Group by `phase ?? "Other"` to handle null values.

```typescript
const stratagemsByPhase = useMemo(() => {
  const map = new Map<string, RwStratagem[]>();
  for (const s of stratagems ?? []) {
    const key = s.phase ?? "Other";
    const group = map.get(key) ?? [];
    group.push(s);
    map.set(key, group);
  }
  return map;
}, [stratagems]);
```

### Anti-Patterns to Avoid

- **Hooks in loops:** Never call `useDetachmentAbilitiesByDetachment` inside a `.map()` over detachments — React hook rule violation. Always use the `DetachmentSection` sub-component pattern.
- **Fetching all detachment abilities upfront:** Do not fetch all `rw_detachment_abilities WHERE faction_id = $1` and group client-side as an alternative to per-detachment queries. While tempting, it creates a single large query and makes query key invalidation (Phase 44 SYNC-05) harder to target by detachment.
- **Adding to datasheets.ts:** Do not add the new query functions to `src/db/queries/datasheets.ts` — the locked decision is a separate `rulesExtended.ts` file.
- **Importing from rules-client in PlaybookTab:** Components never import DB clients directly. All DB access goes through hooks.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phase-grouped display | Custom sort/group algorithm | `useMemo` + `Map` (standard JS) | Trivial client-side grouping; no library needed |
| Collapsible UI | Custom accordion | `shadcn/ui Collapsible` | Already imported in PlaybookTab, matches existing style |
| Ability text rendering | Custom HTML parser | Plain text — already stripped at sync time by `stripHtml()` | Wahapedia HTML is stripped during sync in `useRulesSync.ts`; descriptions arrive as plain text in rules.db |

**Key insight:** All display text is already HTML-stripped during sync (confirmed in ARCHITECTURE-AUDIT.md §2 Step 2). No additional sanitization is needed in the read path. The `stripHtml()` call in `getFullDatasheet` is a safeguard for the older sync path — the new query functions can trust that `rw_stratagems`, `rw_detachments`, `rw_detachment_abilities`, and `rw_abilities` already contain clean text.

---

## Common Pitfalls

### Pitfall 1: Hooks-in-Loop for Detachment Abilities
**What goes wrong:** Rendering detachments with `.map()` and calling `useDetachmentAbilitiesByDetachment` inside the map callback — React will throw a "hooks called conditionally/in loops" error.
**Why it happens:** Each detachment has its own abilities query keyed by `detachment.id`. The natural implementation looks like `.map(det => { const { data } = useDetachmentAbilitiesByDetachment(det.id); ... })` which violates React's Rules of Hooks.
**How to avoid:** Implement `DetachmentSection` as a proper sub-component. Each sub-component instance gets its own hook call at the top level of that component.
**Warning signs:** TypeScript/lint won't catch this. The error only surfaces at runtime or in tests when the hooks fire.

### Pitfall 2: Stale Cache After Sync (SYNC-05 is Phase 44's job)
**What goes wrong:** User runs a rules sync, new data is inserted, but `useStratagemsByFaction` still returns old cached results because `useRulesSync.onSuccess` doesn't yet invalidate the new query keys.
**Why it happens:** The Phase 42 audit confirmed that `useRulesSync.ts` only invalidates three keys — the four new keys from Phase 43 are NOT in that list. This is intentional: SYNC-05 is deferred to Phase 44.
**How to avoid:** This is a known, accepted gap. The Phase 43 UI will show stale data after sync until Phase 44 is implemented. No special handling needed in Phase 43 — document the known gap in code comments.
**Warning signs:** After a sync, stratagem/detachment counts don't update without page reload.

### Pitfall 3: Wahapedia `phase` Field Casing
**What goes wrong:** Phase grouping logic does exact string comparison on `phase` values (e.g. `"Command phase"` vs `"Command Phase"`) and groups split because of inconsistent casing.
**Why it happens:** Wahapedia CSV data may use inconsistent casing for phase names. The sync does not normalize these values.
**How to avoid:** Use case-insensitive comparison or normalize the key in the `useMemo` grouping (e.g., `s.phase?.toLowerCase() ?? "other"`). Display the normalized label with proper title-case formatting.

### Pitfall 4: `faction_id` in `rw_stratagems` is NOT a Formal FK
**What goes wrong:** Assuming `faction_id` in `rw_stratagems` refers to `rw_factions.id` with FK enforcement — there is no formal FK constraint (confirmed in ARCHITECTURE-AUDIT.md §1). Orphaned rows (stratagems with `faction_id` not matching any faction) won't cause errors but will show up in queries.
**Why it happens:** The DDL for `rw_stratagems`, `rw_detachments`, `rw_detachment_abilities`, and `rw_abilities` all use TEXT `faction_id` without `REFERENCES rw_factions(id)`. This mirrors the wargear table design (deliberate — these tables are synced independently).
**How to avoid:** Trust the data from Wahapedia but be aware that `WHERE faction_id = $1` may return zero rows legitimately (faction has no stratagems). Handle the empty array case with a "No stratagems found" empty state or simply not rendering the section.

### Pitfall 5: `AbilityEntry` Type Mismatch
**What goes wrong:** Passing `RwDetachmentAbility` or `RwAbility` to `AbilityEntry` which currently expects `RwDatasheetAbility` — TypeScript type error because the shape differs.
**Why it happens:** `AbilityEntry` was built for `RwDatasheetAbility` which has `datasheet_id` and `line` fields. `RwDetachmentAbility` and `RwAbility` use `id: string` as the key.
**How to avoid:** Either widen `AbilityEntry` to accept a structural `{ name: string; description: string | null }` interface, or create a second sub-component. The structural approach avoids duplication. Key prop changes from `${datasheet_id}-${line}` to `id`.

---

## Code Examples

### Query Function (verified from `src/db/queries/datasheets.ts` pattern)

```typescript
// Exact pattern match — getRulesDb() + db.select<T[]>(SQL, [params])
export async function getStratagemsByFaction(factionId: string): Promise<RwStratagem[]> {
  const db = await getRulesDb();
  return db.select<RwStratagem[]>(
    "SELECT * FROM rw_stratagems WHERE faction_id = $1 ORDER BY name",
    [factionId]
  );
}
```

### Hook (verified from `src/hooks/useDatasheet.ts` pattern)

```typescript
// Exact pattern match — staleTime: Infinity, enabled guard, fallback queryKey
export function useStratagemsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId !== undefined
      ? STRATAGEMS_BY_FACTION_KEY(factionId)
      : (["stratagems-by-faction"] as const),
    queryFn: () =>
      factionId !== undefined ? getStratagemsByFaction(factionId) : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
  });
}
```

### PlaybookTab Hook Wiring

```typescript
// In PlaybookTab body — wahapediaFactionId already resolved via useWahapediaFactionId
const { data: stratagems = [] } = useStratagemsByFaction(wahapediaFactionId ?? undefined);
const { data: detachments = [] } = useDetachmentsByFaction(wahapediaFactionId ?? undefined);
const { data: sharedAbilities = [] } = useSharedAbilitiesByFaction(wahapediaFactionId ?? undefined);

const hasStratagems = stratagems.length > 0;
const hasDetachments = detachments.length > 0;
const hasSharedAbilities = sharedAbilities.length > 0;
```

Note: `wahapediaFactionId` in PlaybookTab is typed `string | null | undefined` from the `useWahapediaFactionId` hook. The `?? undefined` coercion converts `null` to `undefined` so the hooks' `enabled` guard (which checks `!== undefined`) works correctly.

### Stratagem Phase Grouping

```typescript
const stratagemsByPhase = useMemo(() => {
  const map = new Map<string, RwStratagem[]>();
  for (const s of stratagems) {
    const key = s.phase ?? "Other";
    const group = map.get(key) ?? [];
    group.push(s);
    map.set(key, group);
  }
  return map;
}, [stratagems]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fetch all abilities for a faction in one query | Per-type queries (stratagems, detachments, abilities separate) | Phase 43 design | Query keys are narrower; Phase 44 cache invalidation targets only affected keys |
| Single `abilities` field on strategy note (personal text) | Personal Ability Notes + Datasheet Abilities (synced) + new extended types | Phases 9→15→43 | Layered: synced read-only data above user-editable notes |

**Known limitation (not deprecated, just constrained):**
- `useDetachmentAbilitiesByDetachment` is keyed by `detachmentId` — Phase 44 must invalidate by prefix (`exact: false`) for all `["detachment-abilities", *]` keys on sync, since each detachment gets its own cache entry.

---

## Open Questions

1. **Stratagem `phase` field values from Wahapedia**
   - What we know: field exists in DDL as TEXT, HTML-stripped at sync, values like "Command phase" expected
   - What's unclear: exact set of phase strings in live Wahapedia data (could include "Any phase", "Your opponent's X phase", etc.)
   - Recommendation: Use `phase ?? "Other"` as the group key; display all groups found. If grouping produces unexpected bucket names, the user still sees all stratagems — just in a differently-labeled group. Investigate further by inspecting actual synced data in rules.db post-sync.

2. **`AbilityEntry` widening vs. new sub-component**
   - What we know: current `AbilityEntry` accepts `RwDatasheetAbility`; extended types have different fields
   - What's unclear: whether callers outside PlaybookTab use `AbilityEntry` (it is module-local, not exported)
   - Recommendation: `AbilityEntry` is module-local (confirmed line 789 comment "NOT exported"). Widen its prop type to `{ name: string; description: string | null }` — structural widening is safe and eliminates duplication.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (jsdom environment) |
| Quick run command | `pnpm test -- tests/datasheet/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHEMA-05 | `getStratagemsByFaction` calls `getRulesDb` + correct SQL with `$1` | unit | `pnpm test -- tests/datasheet/rulesExtendedQueries.test.ts` | ❌ Wave 0 |
| SCHEMA-05 | `getDetachmentsByFaction` calls `getRulesDb` + correct SQL | unit | `pnpm test -- tests/datasheet/rulesExtendedQueries.test.ts` | ❌ Wave 0 |
| SCHEMA-05 | `getDetachmentAbilitiesByDetachment` calls `getRulesDb` + correct SQL | unit | `pnpm test -- tests/datasheet/rulesExtendedQueries.test.ts` | ❌ Wave 0 |
| SCHEMA-05 | `getSharedAbilitiesByFaction` calls `getRulesDb` + correct SQL | unit | `pnpm test -- tests/datasheet/rulesExtendedQueries.test.ts` | ❌ Wave 0 |
| SCHEMA-05 | `useStratagemsByFaction(undefined)` stays idle; `useStratagemsByFaction("SM")` fires | unit | `pnpm test -- tests/datasheet/useRulesExtended.test.tsx` | ❌ Wave 0 |
| SCHEMA-01 | PlaybookTab renders Stratagems section when hook returns data | unit | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ (extend) |
| SCHEMA-02 | PlaybookTab renders Detachments section when hook returns data | unit | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ (extend) |
| SCHEMA-04 | PlaybookTab renders Shared Abilities section when hook returns data | unit | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ (extend) |
| SCHEMA-01/02/03/04 | Sections absent when wahapediaFactionId is null | unit | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ (extend) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/datasheet/ tests/collection/PlaybookTab.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/datasheet/rulesExtendedQueries.test.ts` — covers SCHEMA-05 (query functions): mock `@/db/rules-client`, assert SQL strings and params for all four functions
- [ ] `tests/datasheet/useRulesExtended.test.tsx` — covers SCHEMA-05 (hooks): mock `@/db/queries/rulesExtended`, assert `enabled`/`idle` behavior, `staleTime: Infinity`

Existing `tests/collection/PlaybookTab.test.tsx` needs extension: add `vi.mock("@/hooks/useRulesExtended", ...)` and test cases for rendered/hidden sections. The file already exists — it is not a Wave 0 gap.

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/42-architecture-audit/ARCHITECTURE-AUDIT.md` — Complete DDL for all 12 rw_* tables; exact type definitions, query signatures, hook signatures for Phase 43; sync data flow confirming write path complete
- `src/types/datasheet.ts` — Existing `RwAbility` type confirmed; existing type patterns verified
- `src/db/queries/datasheets.ts` — Exact query pattern: `getRulesDb()` + `db.select<T[]>(SQL, [$1])`
- `src/hooks/useDatasheet.ts` — Exact hook pattern: `staleTime: Infinity`, `enabled` guard, fallback queryKey
- `src/features/units/PlaybookTab.tsx` — Integration target; insertion point (line ~634); `AbilityEntry` sub-component at line 789; existing Collapsible pattern confirmed

### Secondary (MEDIUM confidence)
- `tests/datasheet/datasheetQueries.test.ts` — Confirmed test pattern: mock `@/db/rules-client`, assert SQL string + params
- `tests/datasheet/useDatasheet.test.tsx` — Confirmed hook test pattern: `renderHook` + `makeWrapper`
- `tests/collection/PlaybookTab.test.tsx` — Confirmed component test pattern for extension

### Tertiary (LOW confidence)
- None. All findings sourced from direct code inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are pre-existing; zero new dependencies
- Architecture: HIGH — exact patterns verified from four source files; ARCHITECTURE-AUDIT.md provides spec-level detail
- Pitfalls: HIGH — hooks-in-loop pitfall verified against React rules; type mismatch verified from AbilityEntry source; stale cache gap confirmed in audit

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (stable internal codebase; no external library concerns)
