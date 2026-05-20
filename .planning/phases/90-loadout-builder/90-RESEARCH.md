# Phase 90: Loadout Builder - Research

**Researched:** 2026-05-20
**Domain:** Army list UX — Sheet refactor, tier-based points selection, wargear display
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** LoadoutBuilderSheet is a dedicated Sheet component opened from ArmyListUnitRow, NOT an inline expansion. Uses the established sibling portal pattern (Sheet state managed in ArmyListDetailSheet or its parent, opened via callback from the row).
- **D-02:** The existing inline tier selector in ArmyListUnitRow (lines 269-312) is REMOVED and replaced with a compact "Configure" button or icon that opens the LoadoutBuilderSheet.
- **D-03:** The sheet shows two sections: (1) Model Count tier selector with points preview, and (2) Wargear Options read-only list.
- **D-04:** Tier selection writes to `army_list_units.selected_model_count` (per-list, per-unit). The old Phase 24 behavior of writing to `units.points` is REMOVED from this flow.
- **D-05:** A new mutation `useUpdateSelectedModelCount` writes to `selected_model_count` on `army_list_units`. Targeted UPDATE only touching `selected_model_count`. The COALESCE chain already includes `tier.points` so cache invalidation immediately updates `effective_points`.
- **D-06:** When `selected_model_count` is NULL (default), the unit uses the COALESCE chain fallback. The UI shows this as "Default" in the tier selector. A "Clear" action sets `selected_model_count` back to NULL.
- **D-07:** Wargear options queried from `synced_loadout_options` matching on `unit_name` and `faction_id`. New query function `getLoadoutOptionsForUnit(unitName, factionId)` returns grouped results.
- **D-08:** Wargear displayed grouped by `group_name` with badges for `is_default` ("Default") and `is_exclusive` ("Exclusive"). Display-only, no selection persisted.
- **D-09:** If no synced loadout options exist, show "No wargear data available" empty state — not an error.
- **D-10:** The LoadoutBuilderSheet works for ghost units. Tier and wargear lookups use `ghost_unit_name` via COALESCE.
- **D-11:** For ghost units, painting status and match status indicators are hidden. The sheet shows unit name with a "Planned" badge.

### Claude's Discretion

- LoadoutBuilderSheet internal layout, spacing, and responsive behavior
- Query hook naming and cache key design for loadout options
- Whether to use a new hook file or extend useArmyLists.ts for the model count mutation
- Icon choice for the "Configure" trigger button in ArmyListUnitRow
- Whether the old `pendingTierId` / `candidatePoints` / delta preview pattern is kept, adapted, or simplified in the Sheet

### Deferred Ideas (OUT OF SCOPE)

- Wargear selection persistence
- Enhancement assignment UI (Phase 91)
- Leader attachment pairing (Phase 92)
- Ghost unit creation flow (Phase 93)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DL-01 | User can select model count tier for a unit in the army list, and points auto-resolve from synced_unit_point_tiers | `setSelectedModelCount` / `clearSelectedModelCount` query functions already exist in armyLists.ts (Phase 89). `useSetSelectedModelCount` / `useClearSelectedModelCount` hooks also exist. COALESCE chain already handles `tier.points`. Need: new LoadoutBuilderSheet component that surfaces this UI. |
| DL-02 | User can see wargear/loadout options for a unit from BSData (display-only) | `synced_loadout_options` table exists (migration 030). `getLoadoutOptionsByFaction()` exists but is faction-scoped. Need: `getLoadoutOptionsForUnit(unitName, factionId)` query + a hook. |
</phase_requirements>

---

## Summary

Phase 90 delivers the LoadoutBuilderSheet — a sibling-portal Sheet that replaces the Phase 24 inline tier selector with a dedicated configuration panel. The data layer is already complete from Phase 89: `setSelectedModelCount`, `clearSelectedModelCount`, `useSetSelectedModelCount`, and `useClearSelectedModelCount` all exist and are wired. The COALESCE chain in `getArmyListWithUnits` already resolves `tier_points` from `synced_unit_point_tiers`.

The primary work is UI: (1) remove the inline tier selector from `ArmyListUnitRow` (lines 269-312), (2) add a compact "Configure" trigger showing the active tier, (3) build `LoadoutBuilderSheet.tsx`, and (4) wire its open/close state as a sibling portal in `ArmyListsPage`. A secondary piece is adding `getLoadoutOptionsForUnit()` to `bsdataExtended.ts` and a corresponding React Query hook for wargear display.

**Primary recommendation:** Build LoadoutBuilderSheet following the UnitPickerDialog sibling portal pattern. Reuse existing mutations — do NOT create new query functions for tier selection. Only add `getLoadoutOptionsForUnit` for the wargear display path (DL-02).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tier selector UI | Frontend (Sheet component) | — | Display and interaction only; mutation is async via hook |
| Wargear display | Frontend (Sheet component) | — | Read-only display of synced_loadout_options |
| Tier persistence | API / DB layer | — | setSelectedModelCount → army_list_units.selected_model_count; already exists |
| Points recalculation | DB (COALESCE) | React Query cache | COALESCE executes in SQL on getArmyListWithUnits re-fetch; never in JS |
| Sheet portal management | Frontend page (ArmyListsPage) | ArmyListDetailSheet callback | Sibling portal pattern — same as UnitPickerDialog |
| Ghost unit handling | Frontend (LoadoutBuilderSheet) | DB (COALESCE on ghost_unit_name) | Conditional rendering based on unit_id == null |

---

## Standard Stack

No new packages required. All dependencies are already in the project.

### Core (existing, all [VERIFIED: codebase])

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Sheet | project standard | LoadoutBuilderSheet container | Established pattern; all Sheets use this |
| React Query (useMutation, useQuery) | project standard | Cache management for tier + wargear | All DB operations go through React Query |
| Lucide React | project standard | "Configure" trigger icon | Project icon standard |
| Badge (shadcn) | project standard | is_default / is_exclusive wargear badges | Consistent with rest of UI |

### No New Packages

The phase introduces zero new dependencies. [VERIFIED: codebase — all needed primitives exist]

---

## Package Legitimacy Audit

No packages are installed in this phase. This section is N/A.

---

## Architecture Patterns

### System Architecture Diagram

```
ArmyListsPage (portal owner)
  ├── ArmyListDetailSheet (open)
  │     └── ArmyListUnitRow (each unit)
  │           └── "Configure" button → callback to page
  └── LoadoutBuilderSheet (sibling portal, NEW)
        ├── Section 1: Tier Selector
        │     ├── Reads: unit.selected_model_count, unit.tier_points, unit.unit_name
        │     ├── Data: getTiersByUnitName(unitName, factionId) → synced_unit_point_tiers
        │     ├── "Default" item when selected_model_count is NULL
        │     ├── Delta preview badge (+N/-N)
        │     ├── Save → useSetSelectedModelCount → invalidate ARMY_LIST_UNITS_KEY
        │     └── Clear → useClearSelectedModelCount → invalidate ARMY_LIST_UNITS_KEY
        └── Section 2: Wargear Options (read-only)
              ├── Data: getLoadoutOptionsForUnit(unitName, factionId) → synced_loadout_options
              ├── Grouped by group_name
              ├── Badges: is_default → "Default", is_exclusive → "Exclusive"
              └── Empty state: "No wargear data available"
```

### Recommended Project Structure

No new directories needed. New files within existing feature:

```
src/
  features/army-lists/
    LoadoutBuilderSheet.tsx      # NEW — sibling portal Sheet
  db/queries/
    bsdataExtended.ts            # EXTEND — add getLoadoutOptionsForUnit()
  hooks/
    useLoadoutOptions.ts         # NEW — or add to useArmyLists.ts
```

All file locations follow established feature module conventions. [VERIFIED: codebase]

### Pattern 1: Sibling Portal Sheet (established pattern)

**What:** Page-level component manages open state for Sheet. Child component triggers via callback prop. Sheet is never nested inside another Sheet.

**When to use:** Any Sheet/Dialog opened from within an already-open Sheet.

**Example (from ArmyListsPage.tsx — [VERIFIED: codebase]):**

```typescript
// Page owns state
const [loadoutUnitId, setLoadoutUnitId] = useState<number | null>(null);
const loadoutUnit = selectedList
  ? (units ?? []).find((u) => u.id === loadoutUnitId) ?? null
  : null;

// Passed as callback to ArmyListDetailSheet
<ArmyListDetailSheet
  onConfigureUnit={(id) => setLoadoutUnitId(id)}
  ...
/>

// Sibling portal — NOT inside ArmyListDetailSheet
<LoadoutBuilderSheet
  open={loadoutUnitId !== null}
  unit={loadoutUnit}
  listId={selectedListId}
  onClose={() => setLoadoutUnitId(null)}
/>
```

### Pattern 2: Tier Selector with "Default" Item

**What:** Select where first item is "Default" (representing NULL), followed by synced tiers. Selecting "Default" calls `useClearSelectedModelCount`; selecting a tier calls `useSetSelectedModelCount`.

**Key detail:** The `useSetSelectedModelCount` and `useClearSelectedModelCount` hooks already exist in `useArmyLists.ts` and invalidate the correct cache keys. No new mutations needed.

**Example:**

```typescript
// Source: src/hooks/useArmyLists.ts [VERIFIED: codebase]
const setModelCount = useSetSelectedModelCount();
const clearModelCount = useClearSelectedModelCount();

// On Select change:
function handleTierChange(value: string) {
  if (value === "__default__") {
    clearModelCount.mutate({ army_list_unit_id: unit.id, list_id: listId });
  } else {
    setModelCount.mutate({
      army_list_unit_id: unit.id,
      count: Number(value),
      list_id: listId,
    });
  }
}
```

### Pattern 3: TEXT-Based Synced Table Lookup (name + faction_id)

**What:** All synced table queries use TEXT unit_name + TEXT faction_id. No integer FKs across DBs. faction_id must be cast from integer to TEXT when sourced from `units.faction_id`.

**Example (from getLoadoutOptionsByFaction — [VERIFIED: codebase]):**

```typescript
// New function to add to bsdataExtended.ts
export async function getLoadoutOptionsForUnit(
  unitName: string,
  factionId: string | null,
): Promise<SyncedLoadoutOptionRow[]> {
  const db = await getDb();
  return db.select<SyncedLoadoutOptionRow[]>(
    `SELECT group_name, option_name, is_default, is_exclusive
     FROM synced_loadout_options
     WHERE unit_name = $1
       AND (faction_id IS NULL OR faction_id = $2)
     ORDER BY group_name, option_name`,
    [unitName, factionId],
  );
}
```

### Pattern 4: Tier Query by Name (for ghost unit support)

**What:** `useUnitPointTiers` queries by `unit_id` (integer PK). Ghost units have no `unit_id`, so for LoadoutBuilderSheet a parallel query by name is needed.

**New query function to add to syncedUnitPoints.ts (already has `getPointTiersByFaction`):**

```typescript
// New targeted query — reads synced_unit_point_tiers by unit name + faction
export async function getTiersByUnitName(
  unitName: string,
  factionId: string | null,
): Promise<Array<{ model_count: number; points: number }>> {
  const db = await getDb();
  return db.select(
    `SELECT model_count, points
     FROM synced_unit_point_tiers
     WHERE unit_name = $1
       AND (faction_id IS NULL OR faction_id = $2)
     ORDER BY model_count ASC`,
    [unitName, factionId],
  );
}
```

This handles both owned units (COALESCE(u.name) = unit_name) and ghost units (ghost_unit_name = unit_name). [VERIFIED: armyLists.ts COALESCE pattern]

### Pattern 5: Configure Trigger Label in Unit Row

**What:** The row trigger shows the active tier compactly, not just an icon.

**Spec (from CONTEXT.md Specific Ideas):** Show "5 models • 130pts" when a tier is selected. Show "Configure" when none selected.

**Implementation:**

```typescript
// In ArmyListUnitRow, replacing lines 269-312
const tierLabel = unit.selected_model_count !== null && unit.tier_points !== null
  ? `${unit.selected_model_count} models • ${unit.tier_points}pts`
  : "Configure";

<Button
  type="button"
  variant="outline"
  size="sm"
  className="h-7 text-xs mt-1"
  onClick={onConfigure}  // callback to parent
>
  <Settings2 className="h-3 w-3 mr-1" />
  {tierLabel}
</Button>
```

### Anti-Patterns to Avoid

- **Nesting LoadoutBuilderSheet inside ArmyListDetailSheet:** Causes Radix portal stacking issues. The sibling portal pattern exists precisely to avoid this. [VERIFIED: ArmyListsPage.tsx comment "Pitfall 1"]
- **Creating a new mutation for model count:** `useSetSelectedModelCount` and `useClearSelectedModelCount` already exist in `useArmyLists.ts`. Do not duplicate them.
- **Writing tier selection to `units.points`:** The Phase 24 behavior wrote to the collection-level unit. D-04 explicitly removes this. The new path writes only to `army_list_units.selected_model_count`.
- **Querying `synced_unit_point_tiers` by `unit_id` integer:** The table has no `unit_id` column — it joins by name. Use `getTiersByUnitName(unitName, factionId)`.
- **Passing `faction_id` as integer to synced table queries:** Must cast to TEXT (`CAST(u.faction_id AS TEXT)`) or pass the string form from `ArmyListUnitRow.faction_id`. [VERIFIED: armyLists.ts lines 82-86]
- **Full-replacement UPDATE for model count:** The `setSelectedModelCount` function does a targeted UPDATE (`SET selected_model_count = $2 WHERE id = $1`) — this is correct for a nullable column with a clear function. Do NOT use the `updateArmyListUnit` full-replacement path (which would require passing all fields). [VERIFIED: armyLists.ts line 271]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Model count persistence | Custom SQL UPDATE with all fields | `setSelectedModelCount` / `clearSelectedModelCount` (already exist) | Phase 89 added these exact functions |
| Cache invalidation after tier change | Manual cache clear | `useSetSelectedModelCount` invalidates ARMY_LIST_UNITS_KEY, ARMY_LIST_KEY, ARMY_LISTS_KEY, dashboard-stats, army-list-readiness | Hook already wires all 5 keys |
| Points COALESCE in JS | JS if-chain summing points fields | SQL COALESCE in `getArmyListWithUnits` → `effective_points` | Rule: never reimplement COALESCE in JS |
| Grouped wargear display | Grouping in component via reduce | Group in SQL `ORDER BY group_name, option_name` + group-by in render | SQL ordering makes JS grouping trivial |

---

## Common Pitfalls

### Pitfall 1: faction_id Type Mismatch in Synced Table Queries

**What goes wrong:** `ArmyListUnitRow.faction_id` is `number | null`. Synced tables store `faction_id` as TEXT. Passing a number directly to the query returns zero rows.

**Why it happens:** The schema stores `CAST(u.faction_id AS TEXT)` in synced tables (migration design decision for cross-DB compat). The TS type on the joined row is still `number | null`.

**How to avoid:** In `getLoadoutOptionsForUnit` and `getTiersByUnitName`, accept `factionId: string | null`. At the call site, convert: `String(unit.faction_id)` or `unit.faction_id !== null ? String(unit.faction_id) : null`.

**Warning signs:** Query returns empty array even though sync has run and faction data is present.

### Pitfall 2: Full-Replacement UPDATE Conflict

**What goes wrong:** `updateArmyListUnit` (the existing full-replacement function) overwrites `tactical_role`, `points_override`, and `notes` with whatever is passed. If LoadoutBuilderSheet calls it to "update" the tier selection, it will silently null out the other fields.

**Why it happens:** Phase 89 added `setSelectedModelCount` as a TARGETED update to avoid this exact problem. The targeted function only touches `selected_model_count`.

**How to avoid:** Always use `setSelectedModelCount` / `clearSelectedModelCount` for tier changes. Never route tier persistence through `updateArmyListUnit`.

**Warning signs:** Notes and points_override disappear after configuring a tier.

### Pitfall 3: useSetSelectedModelCount Already Exists — Don't Duplicate

**What goes wrong:** Implementer creates a new `useUpdateSelectedModelCount` hook, unaware that `useSetSelectedModelCount` already exists in `useArmyLists.ts`.

**Why it happens:** CONTEXT.md D-05 says "A new mutation `useUpdateSelectedModelCount`..." but Phase 89 already shipped `useSetSelectedModelCount` with identical semantics.

**How to avoid:** Use `useSetSelectedModelCount` (already exists, line 347 of `useArmyLists.ts`). If the name conflicts with CONTEXT.md wording, the existing hook is the correct one — it writes to `selected_model_count` as specified.

**Warning signs:** Two hooks doing the same thing; duplicate cache invalidation logic.

### Pitfall 4: Tier Data Source Confusion

**What goes wrong:** Using `useUnitPointTiers(unit.unit_id)` (which queries `unit_point_tiers` table — the user-managed per-collection tiers from Phase 24) instead of the synced `synced_unit_point_tiers` table.

**Why it happens:** Both tables store (model_count, points) pairs. The names are similar. The LoadoutBuilderSheet must use SYNCED tiers (from rules sync), not collection-level user-managed tiers.

**How to avoid:** Query `synced_unit_point_tiers` via `getTiersByUnitName(unit.unit_name, factionId)`. The `useUnitPointTiers` hook is NOT used in the LoadoutBuilderSheet.

**Warning signs:** Tier selector shows user-added custom tiers instead of official GW point costs; ghost units show no tiers (because `useUnitPointTiers` requires a non-null `unit_id`).

### Pitfall 5: ArmyListDetailSheet Cannot Own LoadoutBuilderSheet State

**What goes wrong:** Putting `loadoutOpen` state inside `ArmyListDetailSheet` and rendering `<LoadoutBuilderSheet>` inside its JSX. This nests a Sheet inside a Sheet.

**Why it happens:** Feels natural — "the detail sheet knows which unit to configure."

**How to avoid:** State must live in `ArmyListsPage`. The pattern:
1. `ArmyListDetailSheet` receives `onConfigureUnit: (armyListUnitId: number) => void` prop
2. `ArmyListUnitRow` receives `onConfigure: () => void` prop (no args — the row knows its own ID)
3. `ArmyListsPage` owns `loadoutUnitId` state and renders `<LoadoutBuilderSheet>` as a sibling

### Pitfall 6: points_override Warning Note Display

**What goes wrong:** The points_override note (from CONTEXT.md Specifics: "Points manually overridden — tier selection won't affect displayed points until override is cleared") is not shown, confusing users who set a points_override and see the tier selector have no effect.

**Why it happens:** The COALESCE chain prioritizes `points_override` over `tier.points`. So if `points_override` is set, selecting a tier truly has no effect on `effective_points`.

**How to avoid:** In LoadoutBuilderSheet, check `unit.points_override !== null`. If true, show an info callout explaining the override is active.

---

## Code Examples

### Query: getLoadoutOptionsForUnit (new function in bsdataExtended.ts)

```typescript
// Source: bsdataExtended.ts pattern [VERIFIED: codebase]
export async function getLoadoutOptionsForUnit(
  unitName: string,
  factionId: string | null,
): Promise<SyncedLoadoutOptionRow[]> {
  const db = await getDb();
  return db.select<SyncedLoadoutOptionRow[]>(
    `SELECT group_name, option_name, is_default, is_exclusive
     FROM synced_loadout_options
     WHERE unit_name = $1
       AND (faction_id IS NULL OR faction_id = $2)
     ORDER BY group_name, option_name`,
    [unitName, factionId],
  );
}
```

### Query: getTiersByUnitName (new function in syncedUnitPoints.ts)

```typescript
// Source: syncedUnitPoints.ts pattern [VERIFIED: codebase]
export async function getTiersByUnitName(
  unitName: string,
  factionId: string | null,
): Promise<Array<{ model_count: number; points: number }>> {
  const db = await getDb();
  return db.select(
    `SELECT model_count, points
     FROM synced_unit_point_tiers
     WHERE unit_name = $1
       AND (faction_id IS NULL OR faction_id = $2)
     ORDER BY model_count ASC`,
    [unitName, factionId],
  );
}
```

### Hook: useLoadoutOptionsForUnit

```typescript
// Suggested cache key pattern following ARMY_LIST_UNITS_KEY style [VERIFIED: codebase]
export const LOADOUT_OPTIONS_KEY = (unitName: string, factionId: string | null) =>
  ["loadout-options", unitName, factionId] as const;

export function useLoadoutOptionsForUnit(
  unitName: string | undefined,
  factionId: string | null | undefined,
) {
  return useQuery({
    queryKey: unitName !== undefined
      ? LOADOUT_OPTIONS_KEY(unitName, factionId ?? null)
      : (["loadout-options"] as const),
    queryFn: () =>
      unitName !== undefined
        ? getLoadoutOptionsForUnit(unitName, factionId ?? null)
        : Promise.resolve([]),
    enabled: unitName !== undefined,
    staleTime: 5 * 60 * 1000,  // wargear data only changes on sync
  });
}
```

### Hook: useTiersByUnitName

```typescript
export const SYNCED_TIERS_BY_NAME_KEY = (unitName: string, factionId: string | null) =>
  ["synced-tiers-by-name", unitName, factionId] as const;

export function useTiersByUnitName(
  unitName: string | undefined,
  factionId: string | null | undefined,
) {
  return useQuery({
    queryKey: unitName !== undefined
      ? SYNCED_TIERS_BY_NAME_KEY(unitName, factionId ?? null)
      : (["synced-tiers-by-name"] as const),
    queryFn: () =>
      unitName !== undefined
        ? getTiersByUnitName(unitName, factionId ?? null)
        : Promise.resolve([]),
    enabled: unitName !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}
```

### Wargear Grouped Display Pattern

```typescript
// Group by group_name — SQL ordering makes this O(n) [VERIFIED: bsdataExtended.ts pattern]
function groupByGroupName(options: SyncedLoadoutOptionRow[]) {
  const groups = new Map<string, SyncedLoadoutOptionRow[]>();
  for (const opt of options) {
    const group = groups.get(opt.group_name) ?? [];
    group.push(opt);
    groups.set(opt.group_name, group);
  }
  return groups;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tier selection writes to `units.points` (collection-level) | Tier selection writes to `army_list_units.selected_model_count` (per-list) | Phase 89 | Each army list can have a different tier for the same unit |
| Inline tier selector in unit row | Dedicated LoadoutBuilderSheet opened via Configure button | Phase 90 | Declutters unit row; consolidates all loadout config |
| `getLoadoutOptionsByFaction` (faction-wide) | `getLoadoutOptionsForUnit` (unit+faction targeted) | Phase 90 (new) | Precise query for a single unit; avoids loading all faction data |

**Deprecated/outdated in this phase:**
- **Inline tier selector (ArmyListUnitRow lines 269-312):** Replaced by the Configure trigger + LoadoutBuilderSheet. The `pendingTierId` / `candidatePoints` state and `updateUnit.mutate` call (which wrote to `units.points`) are removed entirely.

---

## Open Questions

1. **Where to host `useTiersByUnitName` and `useLoadoutOptionsForUnit` hooks?**
   - What we know: Claude's discretion per CONTEXT.md.
   - What's unclear: Whether to extend `useArmyLists.ts` (already large at 435 lines) or create `useLoadoutOptions.ts`.
   - Recommendation: Create `src/hooks/useLoadoutOptions.ts` for the two new hooks. Keeps `useArmyLists.ts` from growing further; matches the `useUnitPointTiers.ts` single-entity pattern.

2. **Delta preview behavior in the Sheet**
   - What we know: CONTEXT.md says the old `pendingTierId` pattern "is kept, adapted, or simplified in the Sheet" — Claude's discretion.
   - What's unclear: Whether to preview on hover (too complex) or on selection-before-save.
   - Recommendation: Show delta badge immediately on Select change (same as old pattern), with a "Save" button to commit. This aligns with ArmyListUnitRow's existing notes save pattern.

3. **faction_id for ghost units in tier/wargear queries**
   - What we know: Ghost units have `unit_id = null` and `faction_id = null` in the joined row (per armyList.ts comment). The army list itself has `faction_id`.
   - What's unclear: Should the query fall back to the army list's faction_id when the unit's faction_id is null?
   - Recommendation: Pass the army list's `faction_id` (as string) to `LoadoutBuilderSheet` as a prop. Use `unit.faction_id !== null ? String(unit.faction_id) : listFactionId` for queries. This ensures ghost units can still resolve tiers/wargear from the list's faction context.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely UI component work with no new external dependencies or CLI tools required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest config inline) |
| Quick run command | `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DL-01 | Tier selector renders available tiers from synced data | unit | `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx` | ❌ Wave 0 |
| DL-01 | Selecting a tier calls useSetSelectedModelCount with correct args | unit | `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx` | ❌ Wave 0 |
| DL-01 | Selecting "Default" calls useClearSelectedModelCount | unit | `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx` | ❌ Wave 0 |
| DL-01 | Configure trigger in unit row shows active tier label | unit | `pnpm test -- tests/army-lists/ArmyListUnitRow.test.tsx` | ❌ Wave 0 |
| DL-02 | Wargear section renders options grouped by group_name | unit | `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx` | ❌ Wave 0 |
| DL-02 | "No wargear data available" shown when options array is empty | unit | `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx` | ❌ Wave 0 |
| DL-02 | is_default=1 shows "Default" badge; is_exclusive=1 shows "Exclusive" badge | unit | `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/army-lists/LoadoutBuilderSheet.test.tsx` — covers DL-01 (tier selector) + DL-02 (wargear display)
- [ ] `tests/army-lists/ArmyListUnitRow.test.tsx` — covers DL-01 (Configure trigger label)

Test mocking pattern (from existing tests — [VERIFIED: codebase]):
- Mock `useSetSelectedModelCount` / `useClearSelectedModelCount` via `vi.mock("@/hooks/useArmyLists")`
- Mock `useLoadoutOptionsForUnit` / `useTiersByUnitName` via `vi.mock("@/hooks/useLoadoutOptions")`
- Use `makeUnit()` factory pattern matching `ArmyListUnitRow` interface (same pattern as `ArmyListSummaryBar.test.tsx`)

---

## Security Domain

This phase introduces no authentication, session, access control, cryptography, or input validation beyond what exists. No ASVS categories apply. The only data written is `selected_model_count` (an integer) to a local SQLite database via parameterized queries — consistent with existing security posture.

---

## Sources

### Primary (HIGH confidence — [VERIFIED: codebase])

- `src/db/queries/armyLists.ts` — `setSelectedModelCount`, `clearSelectedModelCount` confirmed at lines 269-287; COALESCE chain at lines 76-86; `clearArmyListDetachment` pattern at lines 135-145
- `src/hooks/useArmyLists.ts` — `useSetSelectedModelCount` (line 347), `useClearSelectedModelCount` (line 375); cache key patterns; invalidation lists
- `src/types/armyList.ts` — `ArmyListUnitRow` type; `selected_model_count: number | null`, `tier_points: number | null` confirmed
- `src/features/army-lists/ArmyListsPage.tsx` — Sibling portal pattern confirmed; `loadoutUnit` state management pattern
- `src/features/army-lists/ArmyListDetailSheet.tsx` — `onAddUnit` callback prop pattern (template for `onConfigureUnit`)
- `src/features/army-lists/ArmyListUnitRow.tsx` — Inline tier selector at lines 269-312 confirmed for removal
- `src/db/queries/bsdataExtended.ts` — `getLoadoutOptionsByFaction` pattern; `SyncedLoadoutOptionRow` interface
- `src/db/queries/syncedUnitPoints.ts` — `getPointTiersByFaction` pattern for `getTiersByUnitName`
- `src-tauri/migrations/030_bsdata_extended.sql` — `synced_loadout_options` schema confirmed (unit_name, faction_id, group_name, option_name, is_default, is_exclusive)
- `src-tauri/migrations/029_synced_point_tiers.sql` — `synced_unit_point_tiers` schema confirmed (unit_name, faction_id, model_count, points)
- `src/lib/resolveUnitPoints.ts` — `PointsSourceChip` usage pattern; `resolveUnitPoints` reusable in Sheet

### Secondary (MEDIUM confidence)

None — all findings sourced directly from codebase.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | LoadoutBuilderSheet portal state is best owned by ArmyListsPage rather than ArmyListDetailSheet | Architecture Patterns | If ArmyListDetailSheet is refactored to not live inside ArmyListsPage, the callback chain would need revisiting — low risk at current architecture |
| A2 | Ghost units should use the army list's faction_id as fallback when unit.faction_id is null | Open Questions #3 | Query would return no tiers/wargear for ghost units if wrong faction is passed — would show empty state instead |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all primitives verified in codebase
- Architecture: HIGH — sibling portal pattern, tier queries, and mutation hooks all verified from existing code
- Pitfalls: HIGH — all identified from reading the actual code paths and Phase 89 comments

**Research date:** 2026-05-20
**Valid until:** 2026-06-20 (stable codebase; no external dependencies)
