# Phase 91: Enhancement Assignment - Research

**Researched:** 2026-05-21
**Domain:** Army Lists UI — Enhancement picker, character keyword detection, points summary integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** EnhancementPickerSheet is a dedicated Sheet opened from ArmyListUnitRow, same sibling portal pattern as LoadoutBuilderSheet. Only character units (non-Epic-Hero) show the trigger.
- **D-02:** Sheet lists detachment enhancements filtered by `faction_id` + `detachment_name` from `synced_enhancements` (via `getEnhancementsByFaction`, further filtered client-side by the list's selected detachment).
- **D-03:** Already-assigned enhancements are marked "Assigned to [unit name]" and their Assign button is disabled. A "Remove" action exists for the enhancement on the target unit if any.
- **D-04:** Character/Epic Hero status from `rw_datasheet_keywords` in rules.db. A new utility function resolves character/epic-hero status by unit name.
- **D-05:** Ghost units use `ghost_unit_name` for the name-based join. No datasheet found = enhancement assignment blocked with "No rules data" message.
- **D-06:** Enhancement trigger only appears on character unit rows in ArmyListUnitRow. Non-character and Epic Hero units do not show the trigger.
- **D-07:** ArmyListSummaryBar shows breakdown: unit points + enhancement points = total.
- **D-08:** `pointsExceeded` / `computeListWarnings` must include enhancement points in the total.
- **D-09:** ArmyListCard also includes enhancement points in its total display.
- **D-10:** Validation is preventive — invalid assignments are blocked at the UI level. Assign button is disabled with a tooltip explaining why.
- **D-11:** Validation rules: (1) max 3 enhancements per list; (2) no duplicate names; (3) target must be a Character; (4) not an Epic Hero. All checked in the sheet.
- **D-12:** Toast notification as fallback for concurrent-modification edge cases in `onError`.

### Claude's Discretion

- EnhancementPickerSheet internal layout, spacing, and list presentation
- Whether `is_character`/`is_epic_hero` are computed in the army list query (JOIN to rules.db) or resolved client-side via a separate hook
- Icon choice for the enhancement trigger button in ArmyListUnitRow
- Whether to show enhancement assignments inline in the unit row (small badge) or only in the sheet and summary bar
- Query hook file organization (extend useArmyLists.ts or create a new useEnhancements.ts)

### Deferred Ideas (OUT OF SCOPE)

- Leader attachment visual grouping — Phase 92
- Datasheet browser for ghost units — Phase 93
- Enhancement selection persistence across list versions/snapshots — Phase 95
- Enhancement-specific warnings in Game Day mode — future milestone
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENH-01 | User can browse detachment enhancements and assign one to a character unit, points auto-added to list total | EnhancementPickerSheet + useAddEnhancement; getEnhancementsByFaction already exists |
| ENH-02 | List validates enhancement rules: max 3 per army, no duplicates, character-only, excluded from Epic Heroes | Client-side validation in sheet using useEnhancementsByList count + keyword detection |
| ENH-03 | Enhancement points shown separately in army list summary bar with breakdown | ArmyListSummaryBar prop extension + computeListHealthStats modification |
</phase_requirements>

---

## Summary

Phase 91 is a pure UI + integration phase. All data layer infrastructure (table, queries, hooks, tests) was fully delivered in Phase 89. The remaining work is: (1) a new `EnhancementPickerSheet` component following the `LoadoutBuilderSheet` sibling portal pattern, (2) a keyword-detection utility querying `rw_datasheet_keywords` in rules.db to determine Character/Epic Hero status by unit name, (3) a trigger button on `ArmyListUnitRow` for eligible character units, and (4) integration of enhancement points into `ArmyListSummaryBar`, `computeListHealthStats`, and `ArmyListCard`.

The most design-sensitive decision is D-04: how to get Character/Epic Hero status per unit row. The rules.db lookup requires a name-based join through `rw_datasheets` (by unit name) to reach `rw_datasheet_keywords`. No existing utility covers this path — one must be added in `src/db/queries/datasheets.ts` and wrapped as a React Query hook. This lookup is a cross-DB read from rules.db via `getRulesDb()`, which is the established pattern already used throughout the codebase.

The summary bar integration requires adding an `enhancements` prop (or fetching inline) to `ArmyListSummaryBar` and threading `enhancementPoints` through `computeListHealthStats` / `computeListWarnings` so the points-exceeded check is accurate. `ArmyListCard` computes `totalPoints` inline and must be similarly updated.

**Primary recommendation:** Implement in 4 waves: (W0) keyword detection utility + hook; (W1) EnhancementPickerSheet + trigger in ArmyListUnitRow; (W2) summary bar + computeListHealthStats integration; (W3) ArmyListCard update + tests.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Enhancement picker sheet UI | Frontend (React component) | — | Pure UI, no backend needed — data layer already in hobbyforge.db |
| Character/Epic Hero detection | Frontend (React Query hook) | rules.db (read-only) | Name-based lookup in rw_datasheet_keywords via getRulesDb(), same pattern as existing datasheet queries |
| Enhancement assignment mutation | Frontend (React Query mutation) | hobbyforge.db | useAddEnhancement already exists; sheet just calls it |
| Validation logic | Frontend (component-level) | — | Preventive: disable button with tooltip; purely derived from useEnhancementsByList count + keyword detection |
| Enhancement points in total | Frontend (pure function + component) | — | computeListHealthStats is a pure function — add enhancementPoints param |
| Summary bar display | Frontend (React component) | — | ArmyListSummaryBar receives enhancement data as prop |

---

## Standard Stack

No new packages are required. This phase uses exclusively the project's existing stack.

### Core (already installed)
| Library | Purpose | Notes |
|---------|---------|-------|
| React 19 + TypeScript 5 | Component + types | Project standard |
| TanStack Query | Data fetching / caching | useEnhancementsByList already in useArmyLists.ts |
| shadcn/ui (Sheet, Badge, Button, Tooltip) | UI primitives | LoadoutBuilderSheet is the direct template |
| Lucide React | Icons | Icon for enhancement trigger — Sparkles or Wand2 |
| Sonner | Toast notifications | onError fallback (D-12) |
| Vitest + RTL | Tests | Existing test infrastructure |

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
ArmyListsPage (portal host)
  ├── ArmyListDetailSheet
  │     └── ArmyListUnitRow  ──[onEnhance callback]──►  ArmyListsPage
  │           • shows trigger button only when is_character && !is_epic_hero
  │           • shows enhancement badge if unit has assignment
  │
  ├── LoadoutBuilderSheet (existing sibling portal)
  │
  └── EnhancementPickerSheet  ◄──  (new sibling portal, same pattern)
        • receives: open, unit (ArmyListUnitRow), list (ArmyList), onClose
        • reads: useEnhancementsByFactionDetachment (filtered from getEnhancementsByFaction)
        • reads: useEnhancementsByList (for validation + "assigned to" display)
        • reads: useUnitKeywords (new hook — character/epic hero status)
        • writes: useAddEnhancement / useRemoveEnhancement (already implemented)
        • validates: max 3, no duplicates, not Epic Hero — all in UI before mutate
        • blocked state when no detachment selected on the list

ArmyListSummaryBar
  • NEW prop: enhancements: ArmyListEnhancement[]  (or fetched inline via useEnhancementsByList)
  • Derived: enhancementTotal = sum(enhancement_points)
  • Display: "850 + 60 enh = 910 pts" or second Stat line

computeListHealthStats(units, pointsLimit, freshness, enhancementTotal?)
  • totalPoints = unitPoints + enhancementTotal
  • pointsExceeded uses combined total

ArmyListCard
  • totalPoints += enhancementTotal
  • Requires useEnhancementsByList per card (N+1 acceptable per existing comment)
```

### Recommended Project Structure

No new directories. New/modified files:

```
src/
  db/queries/
    datasheets.ts              # ADD: getUnitKeywords(unitName) → {isCharacter, isEpicHero}
  hooks/
    useUnitKeywords.ts         # NEW: React Query hook wrapping getUnitKeywords
    useArmyLists.ts            # no change needed — hooks already exist
  features/army-lists/
    EnhancementPickerSheet.tsx # NEW: sibling portal sheet
    ArmyListUnitRow.tsx        # MODIFY: add enhancement trigger + badge
    ArmyListDetailSheet.tsx    # MODIFY: add onEnhanceUnit callback prop
    ArmyListSummaryBar.tsx     # MODIFY: accept enhancements prop, show breakdown
    ArmyListCard.tsx           # MODIFY: include enhancementTotal in totalPoints
    ArmyListsPage.tsx          # MODIFY: add enhancementUnitId state + portal
  lib/
    computeUnitWarnings.ts     # MODIFY: computeListHealthStats accepts enhancementTotal

tests/army-list/
  enhancementPickerSheet.test.tsx    # NEW: component tests (ENH-01, ENH-02)
  computeListHealthStats.test.ts     # NEW or extend existing: ENH-03 points math
```

### Pattern 1: Sibling Portal (LoadoutBuilderSheet reference)

**What:** The parent page (`ArmyListsPage`) owns the sheet's open/closed state and the selected unit. Child components fire callbacks upward, never own portals.

**When to use:** Always for Sheet/Dialog components that can conflict with nested z-index stacking.

**Example (from LoadoutBuilderSheet integration):**
```typescript
// ArmyListsPage.tsx — existing pattern to replicate for enhancement sheet
const [loadoutUnitId, setLoadoutUnitId] = useState<number | null>(null);
const openLoadout = (armyListUnitId: number) => setLoadoutUnitId(armyListUnitId);
const closeLoadout = () => setLoadoutUnitId(null);

// New parallel state for enhancement sheet
const [enhancementUnitId, setEnhancementUnitId] = useState<number | null>(null);
const openEnhancement = (armyListUnitId: number) => setEnhancementUnitId(armyListUnitId);
const closeEnhancement = () => setEnhancementUnitId(null);

// In JSX (sibling portals):
<LoadoutBuilderSheet
  open={loadoutUnitId !== null}
  unit={loadoutUnit}
  listId={selectedListId}
  listFactionId={selectedList?.faction_id ?? null}
  onClose={closeLoadout}
/>
<EnhancementPickerSheet
  open={enhancementUnitId !== null}
  unit={enhancementUnit}
  list={selectedList}
  onClose={closeEnhancement}
/>
```

### Pattern 2: Character/Epic Hero Detection via rules.db keywords

**What:** Query `rw_datasheet_keywords` by unit name (joining through `rw_datasheets`). Returns `{ isCharacter: boolean; isEpicHero: boolean }`.

**When to use:** In `ArmyListUnitRow` to decide whether to show the enhancement trigger, and inside `EnhancementPickerSheet` as a secondary guard.

**SQL approach for the new query:**
```typescript
// Source: codebase inspection — rw_datasheet_keywords schema (rules_001_schema.sql)
// Add to src/db/queries/datasheets.ts
export async function getUnitKeywords(
  unitName: string,
): Promise<{ isCharacter: boolean; isEpicHero: boolean }> {
  const db = await getRulesDb();
  const rows = await db.select<{ keyword: string }[]>(
    `SELECT k.keyword
     FROM rw_datasheets d
     JOIN rw_datasheet_keywords k ON k.datasheet_id = d.id
     WHERE LOWER(d.name) = LOWER($1)
       AND k.keyword IN ('Character', 'Epic Hero')`,
    [unitName],
  );
  return {
    isCharacter: rows.some((r) => r.keyword === "Character"),
    isEpicHero: rows.some((r) => r.keyword === "Epic Hero"),
  };
}
```

**Hook pattern (new file `src/hooks/useUnitKeywords.ts`):**
```typescript
// Source: codebase inspection — mirrors useLoadoutOptions.ts hook pattern
export function useUnitKeywords(unitName: string | undefined) {
  return useQuery({
    queryKey: unitName !== undefined
      ? ["unit-keywords", unitName] as const
      : ["unit-keywords"] as const,
    queryFn: () =>
      unitName !== undefined
        ? getUnitKeywords(unitName)
        : Promise.resolve({ isCharacter: false, isEpicHero: false }),
    enabled: unitName !== undefined,
    staleTime: Infinity, // keyword data only changes on re-sync
  });
}
```

**Ghost unit handling:** `ghost_unit_name` is already the canonical Wahapedia name per the Phase 89 contract. The same query works — pass `unit.unit_name` (which is `COALESCE(u.name, alu.ghost_unit_name)` from `getArmyListWithUnits`).

### Pattern 3: Enhancement Points in computeListHealthStats

**What:** Add `enhancementTotal` parameter so total points include enhancement points for the points-exceeded check.

**When to use:** D-08 — any time list point total is computed for display or validation.

```typescript
// Source: codebase inspection — computeUnitWarnings.ts
// Modified signature (backward-compatible with default 0):
export function computeListHealthStats(
  units: ArmyListUnitRow[],
  pointsLimit: number | null,
  freshness: SyncFreshness,
  enhancementTotal = 0,  // NEW optional param
): ListHealthStats {
  const unitPoints = units.reduce((sum, u) => sum + u.effective_points, 0);
  const totalPoints = unitPoints + enhancementTotal;  // CHANGED
  // ... rest unchanged, but pointsExceeded now uses combined total
}
```

### Pattern 4: Enhancement Picker Sheet — Detachment Filter

**What:** `getEnhancementsByFaction` returns ALL enhancements for a faction. Client-side filter narrows to the list's selected detachment.

**Critical:** `synced_enhancements` stores `faction_id` as TEXT (same pattern as `synced_unit_points`). Do not pass a number.

```typescript
// Source: codebase inspection — bsdataExtended.ts
// Inside EnhancementPickerSheet:
const { data: allEnhancements } = useQuery({
  queryKey: ["enhancements-by-faction", factionIdStr],
  queryFn: () => factionIdStr ? getEnhancementsByFaction(factionIdStr) : Promise.resolve([]),
  enabled: !!factionIdStr,
  staleTime: 5 * 60 * 1000,
});

// Client-side detachment filter:
const detachmentEnhancements = useMemo(
  () => (allEnhancements ?? []).filter(
    (e) => e.detachment_name === list?.detachment_name
  ),
  [allEnhancements, list?.detachment_name],
);
```

### Pattern 5: Preventive Validation with Disabled Button + Tooltip

**What:** Check constraints before enabling the Assign button. Tooltip explains the reason when disabled.

```typescript
// Source: codebase inspection — existing tooltip pattern in ArmyListUnitRow.tsx
const assignDisabledReason: string | null = (() => {
  if (listEnhancements.length >= 3) return "Max 3 enhancements per army";
  if (listEnhancements.some(e => e.enhancement_name === enhancement.name))
    return "Enhancement already assigned";
  if (isEpicHero) return "Epic Heroes cannot receive enhancements";
  return null;
})();

<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <Button disabled={!!assignDisabledReason} onClick={handleAssign}>
        Assign
      </Button>
    </span>
  </TooltipTrigger>
  {assignDisabledReason && <TooltipContent>{assignDisabledReason}</TooltipContent>}
</Tooltip>
```

### Anti-Patterns to Avoid

- **Passing faction_id as a number to synced table queries:** `synced_enhancements.faction_id` is TEXT. Always `String(unit.faction_id)` or `String(list.faction_id)` before passing. This is Pitfall 1 established in Phase 90 research.
- **Nesting EnhancementPickerSheet inside ArmyListDetailSheet:** Portal must be at ArmyListsPage level. ArmyListDetailSheet already has a Sheet wrapper — nesting creates z-index and scroll conflicts.
- **Computing character/epic-hero status outside React Query:** Keyword lookup is async and slow. Always cache with `useQuery` and `staleTime: Infinity`.
- **Checking `is_warlord` to determine Epic Hero:** `is_warlord` is a per-list designation, not a rules property. Epic Hero status comes from `rw_datasheet_keywords.keyword = 'Epic Hero'`.
- **Missing the no-detachment guard:** If `list.detachment_name` is null, `detachmentEnhancements` will always be empty (the filter `e.detachment_name === null` will match nothing since the DB stores actual names). Show a prompt: "Select a detachment first".
- **Applying enhancement total to ArmyListReadiness:** `getArmyListReadiness` is a batch SQL query used for the dashboard readiness badge — it does NOT need to be modified for Phase 91. That is a separate display context.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sheet UI container | Custom modal | shadcn/ui `Sheet` | Same component LoadoutBuilderSheet uses — scroll, close behavior, accessibility already handled |
| Tooltip on disabled button | Custom hover state | shadcn/ui `Tooltip` wrapping a `span` | Disabled buttons don't fire mouse events — must wrap in `span` for tooltip to fire (existing pattern in ArmyListUnitRow) |
| Enhancement assignment CRUD | Custom SQL | `useAddEnhancement` / `useRemoveEnhancement` (Phase 89) | Already implemented, tested, and cache-invalidation wired |
| Keyword lookup SQL | New table/column | `rw_datasheet_keywords` via `getRulesDb()` | Rules data already synced; query is a name join |
| Faction ID resolution | Manual lookup | `useWahapediaFactionId` (existing hook) | Already handles alias mapping, normalization — used by ArmyListDetailSheet today |

**Key insight:** The data layer is fully delivered. 100% of new work is UI composition and plumbing. No new DB tables, no new SQL migrations.

---

## Common Pitfalls

### Pitfall 1: faction_id Type Mismatch in synced_enhancements Query
**What goes wrong:** Calling `getEnhancementsByFaction(unit.faction_id)` with `unit.faction_id` as a number. The query returns empty results silently because `faction_id` is stored as TEXT.
**Why it happens:** `army_lists.faction_id` is INTEGER; `synced_enhancements.faction_id` is TEXT. Tauri plugin-sql does not coerce types.
**How to avoid:** Always convert: `String(list?.faction_id ?? "")`. Follow the `LoadoutBuilderSheet` pattern — it does this on line 83.
**Warning signs:** Enhancement list is always empty even when enhancements are synced.

### Pitfall 2: Disabled Button Without span Wrapper Suppresses Tooltip
**What goes wrong:** `<Tooltip><TooltipTrigger asChild><Button disabled>...</Button></TooltipTrigger></Tooltip>` — the tooltip never appears on hover because disabled buttons do not fire pointer events.
**Why it happens:** HTML spec — disabled form controls do not receive mouse events.
**How to avoid:** Wrap the disabled button in a `<span>`: `<TooltipTrigger asChild><span><Button disabled>...</Button></span></TooltipTrigger>`. This is the established pattern already in use in `ArmyListUnitRow.tsx`.
**Warning signs:** Tooltip content never shows when button is disabled.

### Pitfall 3: useEnhancementsByList Key Mismatch
**What goes wrong:** Calling `useEnhancementsByList` with `undefined` listId causes the hook to be disabled, missing the validation count.
**Why it happens:** The sheet may mount before `list` prop is populated if portal state is managed carelessly.
**How to avoid:** Gate the `EnhancementPickerSheet` render on `unit !== null && list !== null` (same as `LoadoutBuilderSheet` gates on `unit`).
**Warning signs:** Max 3 validation never triggers; duplicate check always passes.

### Pitfall 4: Ghost Units with No Datasheet Match
**What goes wrong:** `getUnitKeywords("Some Custom Name")` returns `{ isCharacter: false, isEpicHero: false }` — the trigger button is suppressed even for a character ghost unit because the name doesn't match a Wahapedia datasheet.
**Why it happens:** Ghost unit names may not match Wahapedia canonical names exactly.
**How to avoid:** Per D-05, this is the correct behavior — "no datasheet found = enhancement assignment blocked with No rules data message." Do NOT show the trigger for ghost units where keyword lookup returns false for Character. Document this in the component's JSDoc.
**Warning signs:** Characters added as ghost units can't get enhancements — this is EXPECTED and correct.

### Pitfall 5: Enhancement Removal Cascades from Unit Deletion
**What goes wrong:** Assuming enhancement needs to be manually removed when the unit is removed from the list.
**Why it happens:** Developer writes a cleanup step in `handleRemoveUnit`.
**How to avoid:** Do nothing — `army_list_enhancements.army_list_unit_id` has `ON DELETE CASCADE` (from migration 031). SQLite cascades the delete automatically when the unit row is deleted. Adding a manual cleanup step would attempt a double-delete.
**Warning signs:** Extra DELETE call in `handleRemoveUnit`.

### Pitfall 6: computeListHealthStats Caller Breakage
**What goes wrong:** Adding `enhancementTotal` as a required param to `computeListHealthStats` breaks existing callers.
**Why it happens:** There are at least 2 call sites: `ArmyListSummaryBar` and internal `computeListWarnings` usage in tests.
**How to avoid:** Make the new param optional with a default of `0`: `enhancementTotal = 0`. Existing callers need no changes; only ArmyListSummaryBar and ArmyListCard explicitly pass it.
**Warning signs:** TypeScript errors at existing call sites.

### Pitfall 7: ArmyListCard Enhancement Fetch (N+1)
**What goes wrong:** Calling `useEnhancementsByList` inside `ArmyListCard` for every card.
**Why it happens:** D-09 requires enhancement points in card total.
**How to avoid:** This is acceptable — the existing codebase already has an N+1 `useArmyListWithUnits` per card (documented comment in `ArmyListsPage.tsx`: "N+1 hook usage is acceptable at personal-use scale"). Follow the same pattern: call `useEnhancementsByList(list.id)` inside the `ArmyListCardWrapper` and pass `enhancementTotal` as a prop to `ArmyListCard`.
**Warning signs:** Trying to batch the fetch — overengineering for a personal tool.

---

## Code Examples

### New query function — getUnitKeywords
```typescript
// Source: codebase inspection — datasheets.ts + rules_001_schema.sql
// Add to src/db/queries/datasheets.ts
export interface UnitKeywordStatus {
  isCharacter: boolean;
  isEpicHero: boolean;
}

export async function getUnitKeywords(
  unitName: string,
): Promise<UnitKeywordStatus> {
  try {
    const db = await getRulesDb();
    const rows = await db.select<{ keyword: string }[]>(
      `SELECT k.keyword
       FROM rw_datasheets d
       JOIN rw_datasheet_keywords k ON k.datasheet_id = d.id
       WHERE LOWER(d.name) = LOWER($1)
         AND k.keyword IN ('Character', 'Epic Hero')`,
      [unitName],
    );
    return {
      isCharacter: rows.some((r) => r.keyword === "Character"),
      isEpicHero: rows.some((r) => r.keyword === "Epic Hero"),
    };
  } catch {
    // rules.db may not be synced — return safe defaults
    return { isCharacter: false, isEpicHero: false };
  }
}
```

### ArmyListsPage — enhancement portal state addition
```typescript
// Source: codebase inspection — ArmyListsPage.tsx existing loadout portal pattern
// Replicate for enhancements:
const [enhancementUnitId, setEnhancementUnitId] = useState<number | null>(null);
const enhancementUnit = enhancementUnitId !== null
  ? (selectedListUnits ?? []).find((u) => u.id === enhancementUnitId) ?? null
  : null;
const openEnhancement = (armyListUnitId: number) => setEnhancementUnitId(armyListUnitId);
const closeEnhancement = () => setEnhancementUnitId(null);

// In closeDetail, add: setEnhancementUnitId(null);
```

### ArmyListDetailSheet — new prop + callback
```typescript
// Source: codebase inspection — ArmyListDetailSheet.tsx onConfigureUnit pattern
interface ArmyListDetailSheetProps {
  // ... existing props ...
  onEnhanceUnit: (armyListUnitId: number) => void; // NEW
}
// In unit row render:
<ArmyListUnitRow
  unit={alu}
  // ... existing props ...
  onConfigure={() => onConfigureUnit(alu.id)}
  onEnhance={() => onEnhanceUnit(alu.id)}  // NEW
/>
```

### ArmyListSummaryBar — enhancement breakdown display
```typescript
// Source: codebase inspection — ArmyListSummaryBar.tsx Stat component pattern
// D-07: "850 + 60 enh = 910 pts" or a second Stat line
interface ArmyListSummaryBarProps {
  units: ArmyListUnitRow[];
  pointsLimit: number | null;
  freshness: SyncFreshness;
  enhancements: ArmyListEnhancement[]; // NEW
}

// Inside component:
const enhancementTotal = enhancements.reduce((s, e) => s + e.enhancement_points, 0);
const stats = useMemo(
  () => computeListHealthStats(units, pointsLimit, freshness, enhancementTotal),
  [units, pointsLimit, freshness, enhancementTotal],
);

// Points display:
const pointsValue = (() => {
  const combined = stats.totalPoints; // unitPoints + enhancementTotal now
  if (pointsLimit !== null) return `${combined} / ${pointsLimit} pts`;
  return `${combined} pts`;
})();

// Additional Stat line when enhancements exist:
{enhancementTotal > 0 && (
  <Stat
    label="Enhancements"
    value={`${enhancementTotal} pts (${enhancements.length})`}
  />
)}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| No enhancement tracking | Phase 89: `army_list_enhancements` table with full CRUD | Data layer complete |
| No character detection in lists | Phase 91: `rw_datasheet_keywords` lookup per unit name | New utility needed |
| Points total = unit points only | Phase 91: unit points + enhancement points | `computeListHealthStats` extension |

**Nothing deprecated for this phase.**

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Epic Hero keyword is stored as the exact string `'Epic Hero'` (two words, title case) in rw_datasheet_keywords | Architecture Patterns, Pattern 2 | The query returns wrong results; Epic Heroes could receive enhancements. Verify against a synced rules.db. |
| A2 | Character keyword is stored as the exact string `'Character'` (single word, title case) | Architecture Patterns, Pattern 2 | Character detection fails; trigger never appears. |
| A3 | `list.detachment_name` in `ArmyList` matches `synced_enhancements.detachment_name` exactly (no case or spacing difference) | Architecture Patterns, Pattern 4 | Client-side detachment filter returns empty. Mitigation: use case-insensitive comparison in the filter. |

---

## Open Questions (RESOLVED)

1. **Exact keyword casing in rules.db** — RESOLVED
   - What we know: `rw_datasheet_keywords` is synced from Wahapedia CSV. The schema stores keyword as TEXT.
   - What's unclear: Whether Wahapedia CSV uses "Character" or "CHARACTER" or "character". The `getFullDatasheet` query does not normalize keyword case.
   - Resolution: Use `LOWER(k.keyword) IN ('character', 'epic hero')` in the `getUnitKeywords` query to be case-insensitive. Accepted in Plan 91-01 Task 1.

2. **Enhancement trigger when rules.db is not synced** — RESOLVED
   - What we know: D-05 says "no datasheet found = enhancement assignment blocked with No rules data message."
   - What's unclear: Whether the trigger button itself should be hidden or visible-but-blocked.
   - Resolution: When `useUnitKeywords` returns `{ isCharacter: false, isEpicHero: false }` (safe defaults from unsynced rules.db), the enhancement trigger is suppressed (hidden) on the unit row. This aligns with D-06 ("trigger only appears on character unit rows") — if we can't confirm character status, we don't show the trigger. For ghost units, the same behavior applies. D-05's "No rules data message" refers to the sheet interior state if somehow opened, not a separate visible-but-blocked path. This falls within Claude's Discretion per CONTEXT.md.

---

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. This phase is purely code changes to existing TypeScript/React files. No CLIs, databases beyond the existing SQLite, or new runtimes required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest config inline) |
| Quick run command | `pnpm test -- tests/army-list/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENH-01 | EnhancementPickerSheet renders list of detachment enhancements | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx` | ❌ Wave 0 |
| ENH-01 | Assign button calls useAddEnhancement with correct params | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx` | ❌ Wave 0 |
| ENH-01 | Enhancement points appear in list total immediately after assign | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx` | ❌ Wave 0 |
| ENH-02 | Assign button disabled when list already has 3 enhancements | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx` | ❌ Wave 0 |
| ENH-02 | Assign button disabled for duplicate enhancement name | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx` | ❌ Wave 0 |
| ENH-02 | Assign button disabled for Epic Hero (isEpicHero = true) | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx` | ❌ Wave 0 |
| ENH-03 | computeListHealthStats includes enhancementTotal in totalPoints | unit | `pnpm test -- tests/army-list/computeListHealthStats.test.ts` | ❌ Wave 0 |
| ENH-03 | ArmyListSummaryBar shows enhancement breakdown stat line | unit | `pnpm test -- tests/army-list/enhancementSummaryBar.test.tsx` | ❌ Wave 0 |
| ENH-03 | pointsExceeded reflects combined unit + enhancement points | unit | `pnpm test -- tests/army-list/computeListHealthStats.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/army-list/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/army-list/enhancementPickerSheet.test.tsx` — covers ENH-01, ENH-02
- [ ] `tests/army-list/computeListHealthStats.test.ts` — covers ENH-03 points math
- [ ] `tests/army-list/enhancementSummaryBar.test.tsx` — covers ENH-03 display

*(Existing `armyListEnhancements.test.ts` and `armyListHookInvalidations.test.ts` from Phase 89 cover the data layer — no modifications needed)*

---

## Security Domain

This phase has no security-sensitive surface: no user input reaches SQL (mutations use Phase 89 parameterized queries), no cross-origin requests, no authentication flows, no file system access. The only new data path is a read from rules.db via `getUnitKeywords`, which follows the established `getRulesDb()` pattern with parameterized queries.

ASVS V5 (Input Validation) is satisfied by the existing parameterized query pattern. No other ASVS categories apply.

---

## Sources

### Primary (HIGH confidence — codebase inspection)
- `src/db/queries/armyLists.ts` — complete enhancement CRUD (addEnhancement, removeEnhancement, getEnhancementsByList)
- `src/hooks/useArmyLists.ts` — useAddEnhancement, useRemoveEnhancement, useEnhancementsByList hooks with cache invalidation
- `src/features/army-lists/LoadoutBuilderSheet.tsx` — canonical sibling portal template
- `src/features/army-lists/ArmyListsPage.tsx` — sibling portal pattern for state management
- `src/features/army-lists/ArmyListSummaryBar.tsx` — current stats display to extend
- `src/lib/computeUnitWarnings.ts` — computeListHealthStats to extend
- `src/types/armyList.ts` — ArmyListEnhancement, AddEnhancementInput types
- `src/db/queries/bsdataExtended.ts` — getEnhancementsByFaction, faction_id TEXT pattern
- `src-tauri/migrations/031_army_list_v3.sql` — army_list_enhancements table with CASCADE
- `src-tauri/migrations/030_bsdata_extended.sql` — synced_enhancements schema
- `src-tauri/migrations/rules_001_schema.sql` — rw_datasheet_keywords schema

---

## Metadata

**Confidence breakdown:**
- Existing data layer: HIGH — code confirmed in place, tests exist
- EnhancementPickerSheet architecture: HIGH — direct template (LoadoutBuilderSheet) confirmed
- Character/Epic Hero detection SQL: HIGH — rw_datasheet_keywords schema confirmed; keyword string casing is ASSUMED (A1, A2)
- Summary bar integration: HIGH — computeListHealthStats is a pure function with documented signature; extension approach is straightforward
- Test scope: HIGH — follows Vitest + RTL patterns already in use across tests/army-list/

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (stable codebase, all dependencies already present)
