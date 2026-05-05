# Phase 24: Collection Unit Point Calculator with Wargear Selection and Swap Delta Preview — Research

**Researched:** 2026-05-05
**Domain:** SQLite schema extension + React Query state + inline UI delta preview
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Wargear Tracking Model**
- Wargear selections stored per-unit in hobbyforge.db (new `unit_loadouts` + `unit_loadout_wargear` tables)
- Wargear options sourced from rules.db `rw_datasheets_wargear` for linked units; manual text entry fallback for unlinked units
- A "loadout" is a named configuration of wargear per unit (e.g., "Anti-tank loadout", "All-comers")
- Multiple loadouts per unit supported — user saves named loadouts and marks one as active
- Active loadout is what the army list builder uses for display and point calculation

**Points Tiers Approach**
- New `unit_point_tiers` table: stores multiple model-count/points rows per unit (e.g., 5 models = 80pts, 10 models = 160pts)
- Point values are user-entered only (legal constraint — no GW points auto-imported)
- Calculator auto-matches the active model count to the correct tier and derives the effective point value
- Existing `units.points` field becomes the "simple mode" fallback — if no tiers exist, legacy single-value still works
- `points_override` on `army_list_units` remains valid for manual per-list adjustments on top of the calculated value

**Swap Delta Preview UX**
- Delta preview appears inline in the army list unit row when the user considers a change
- Delta triggered by: changing model count tier selection, or swapping between saved loadouts
- Format: colored badge showing +N (green) or -N (red) next to the current effective points
- Preview-before-commit pattern — delta shown as a "what if" before the user confirms the swap
- Army list total updates live as user explores different configurations

**Integration Location**
- Primary UI: new "Loadout" sub-section within PlaybookTab (unit detail sheet)
- Secondary UI: enhanced army list unit row — shows active loadout name + point calculator inline
- Wargear picker: checkbox list grouped by weapon line from linked datasheet; manual add for unlinked
- Entry point for calculator: army list builder "edit unit" popover shows tier selector and loadout swap
- Existing `units.points` field becomes read-only derived value when tiers exist; editable as fallback when no tiers defined

### Claude's Discretion
- Exact table schema for `unit_loadouts` and `unit_loadout_wargear`
- Migration strategy (new migration file number)
- Loadout comparison UI polish (side-by-side vs inline)
- Empty state when unit has no linked datasheet and no manual wargear
- Whether "active loadout" is per-unit global or can differ per army list

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 24 adds three interlocking features to HobbyForge: a points-tier system (multi-bracket model count → points mapping), a named wargear loadout system (saved per unit, one marked active), and an inline delta preview in the army list unit row that shows a colored badge when the user is previewing a different tier or loadout before committing.

All three features share a single architectural decision: they are pure **hobbyforge.db extensions**. No rules.db writes occur. Wargear options are read from rules.db `rw_datasheets_wargear` (already queried by `getFullDatasheet`) when a datasheet link exists, or from a free-text column when it does not. The existing `COALESCE(points_override, u.points, 0)` pattern in `getArmyListWithUnits` and `getArmyListReadiness` must stay intact — the new tier-derived value simply becomes what populates `units.points` at write time, or is applied as a local override in the unit row UI before commit.

The delta preview is pure client-side arithmetic. No new SQL query is needed for preview: the `ArmyListUnitRow` component already holds `effective_points`; computing a candidate value from a selected tier or loadout and diffing against `effective_points` can happen entirely in local state within that row component.

**Primary recommendation:** Three new SQL tables (migration `011_point_tiers_loadouts.sql`), three new query modules, three new React Query hooks, and targeted UI additions to PlaybookTab and ArmyListUnitRow — no Rust changes, no new pages, no router changes.

---

## Standard Stack

### Core (all already in project — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | existing | SQLite reads/writes for new tables | Project-standard DB access layer |
| @tanstack/react-query | existing | Server state for loadouts and tiers | Established React Query pattern |
| react | 19 | UI for Loadout section and delta badge | Project stack |
| shadcn/ui | existing | Checkbox, Badge, Select, Collapsible | Project UI library |
| lucide-react | existing | Plus, Trash2, Check icons | Project icon set |
| zod | existing | Loadout/tier form validation | Established form validation |
| react-hook-form | existing | Loadout name input | Established form library |

**Installation:** No new packages required. All dependencies are already present.

---

## Architecture Patterns

### Recommended Project Structure — New Files Only

```
src-tauri/migrations/
  011_point_tiers_loadouts.sql   # Three new tables

src/db/queries/
  unitLoadouts.ts                # CRUD for unit_loadouts + unit_loadout_wargear
  unitPointTiers.ts              # CRUD for unit_point_tiers

src/hooks/
  useUnitLoadouts.ts             # React Query hooks for loadouts
  useUnitPointTiers.ts           # React Query hooks for tiers

src/types/
  unitLoadout.ts                 # UnitLoadout, LoadoutWargear interfaces
  unitPointTier.ts               # UnitPointTier interface

src/features/
  units/
    LoadoutSection.tsx           # New sub-component inserted into PlaybookTab
    TierManager.tsx              # Tier CRUD table in PlaybookTab

  army-lists/
    ArmyListUnitRow.tsx          # MODIFIED: add loadout badge + delta inline
```

### Pattern 1: Three-Table Migration (append-only)

New migration file `011_point_tiers_loadouts.sql`. Migration numbering follows existing sequence (010 is the last). The `rules_001` and `rules_002` files target rules.db; all `00N_` files target hobbyforge.db.

**Recommended schema:**

```sql
-- 011_point_tiers_loadouts.sql

-- Points tiers: multiple model-count→points brackets per unit.
-- If no rows exist for a unit, falls back to units.points (simple mode).
CREATE TABLE IF NOT EXISTS unit_point_tiers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id      INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    model_count  INTEGER NOT NULL,          -- e.g. 5, 10
    points       INTEGER NOT NULL,          -- user-entered, never GW-auto
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (unit_id, model_count)
);

-- Named loadout configurations per unit.
-- is_active: 0|1 integer following project boolean discipline.
-- Only one row per unit_id may have is_active = 1 (enforced at application layer).
CREATE TABLE IF NOT EXISTS unit_loadouts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id    INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    is_active  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Wargear selections within a named loadout.
-- weapon_name mirrors rw_datasheets_wargear.name (TEXT FK-equivalent).
-- is_manual: 1 when the user typed the weapon name (no datasheet link).
CREATE TABLE IF NOT EXISTS unit_loadout_wargear (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    loadout_id   INTEGER NOT NULL REFERENCES unit_loadouts(id) ON DELETE CASCADE,
    weapon_name  TEXT    NOT NULL,
    weapon_line  INTEGER,                   -- rw_datasheets_wargear.line (nullable for manual)
    is_manual    INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**Source:** Project pattern from `001_core_schema.sql` and `010_hobby_goals.sql` — confirmed in codebase.

### Pattern 2: Per-Unit Query Modules (mirrors strategyNotes.ts)

`useStrategyNote` / `upsertStrategyNote` is the canonical reference pattern for per-unit data in this codebase. Loadout hooks must mirror it:

```typescript
// src/hooks/useUnitLoadouts.ts
export const UNIT_LOADOUTS_KEY = (unitId: number) => ["unit-loadouts", unitId] as const;

export function useUnitLoadouts(unitId: number | undefined) {
  return useQuery({
    queryKey: unitId !== undefined ? UNIT_LOADOUTS_KEY(unitId) : (["unit-loadouts"] as const),
    queryFn: () => unitId !== undefined ? getUnitLoadouts(unitId) : Promise.resolve([]),
    enabled: unitId !== undefined,
  });
}

export function useActivateLoadout() {
  const qc = useQueryClient();
  return useMutation<void, Error, { loadoutId: number; unitId: number }>({
    mutationFn: ({ loadoutId, unitId }) => activateLoadout(loadoutId, unitId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: UNIT_LOADOUTS_KEY(vars.unitId) });
      // Also invalidate army list units — active loadout name appears there
      qc.invalidateQueries({ queryKey: ["army-lists"] });
    },
  });
}
```

**Source:** `src/hooks/useStrategyNote.ts` — confirmed pattern in codebase.

### Pattern 3: "Activate" as Atomic Two-Step SQL

SQLite has no constraint that enforces at-most-one active row per unit_id without a partial unique index (not used elsewhere in this codebase). The application-layer approach used in similar codebases: a single activation function does two SQL statements:

```typescript
// src/db/queries/unitLoadouts.ts
export async function activateLoadout(loadoutId: number, unitId: number): Promise<void> {
  const db = await getDb();
  // Step 1: deactivate all loadouts for this unit
  await db.execute(
    "UPDATE unit_loadouts SET is_active = 0, updated_at = datetime('now') WHERE unit_id = $1",
    [unitId]
  );
  // Step 2: activate the target
  await db.execute(
    "UPDATE unit_loadouts SET is_active = 1, updated_at = datetime('now') WHERE id = $1",
    [loadoutId]
  );
}
```

Note: these two statements are NOT wrapped in an explicit transaction because `tauri-plugin-sql` does not expose a transaction API via `db.execute` sequences — each `execute` call is auto-committed. The two-step approach is safe here because: (a) this is a local SQLite file, (b) the intermediate state (all inactive) is functionally harmless, and (c) the user can only trigger one activation at a time from the UI.

**Confidence:** HIGH — confirmed by reviewing `tauri-plugin-sql` usage throughout codebase.

### Pattern 4: Delta Preview in Local State (no SQL round-trip)

The delta preview is client-side only. `ArmyListUnitRow` already has `effective_points` from the query. The row gains a local `pendingTierId: number | null` and `pendingLoadoutId: number | null` state. A `candidatePoints` value is computed from those pending selections, then `delta = candidatePoints - effective_points`:

```typescript
// Inside ArmyListUnitRow (conceptual — not final code)
const [pendingTierId, setPendingTierId] = useState<number | null>(null);

const candidatePoints = useMemo(() => {
  if (pendingTierId === null) return unit.effective_points;
  const tier = availableTiers.find(t => t.id === pendingTierId);
  return tier?.points ?? unit.effective_points;
}, [pendingTierId, availableTiers, unit.effective_points]);

const delta = candidatePoints - unit.effective_points;
```

Only on "Confirm" does the mutation fire: `useUpdateUnit` to update `units.points` (derived from tier), OR `useUpdateArmyListUnit` to set `points_override`. The chosen approach (see Open Questions below) affects which mutation fires.

### Pattern 5: Grouping Wargear by `line` Field

The wargear picker groups weapons by the `line` field from `rw_datasheets_wargear`. This is already done in `PlaybookTab.tsx` for display (ranged vs melee split uses `w.type`). For the loadout picker, group by `line` then render each group's `name` entries as checkboxes. The `line` field is an integer in the DB used by Wahapedia to group weapon options for the same weapon slot.

```typescript
// Group wargear from FullDatasheet.wargear by line
const wargearByLine = useMemo(() => {
  const groups = new Map<number, RwDatasheetWargear[]>();
  for (const w of datasheet?.wargear ?? []) {
    const bucket = groups.get(w.line) ?? [];
    bucket.push(w);
    groups.set(w.line, bucket);
  }
  return groups;
}, [datasheet?.wargear]);
```

**Source:** `src/features/units/PlaybookTab.tsx` lines 420-421, `rw_datasheets_wargear` schema — confirmed.

### Pattern 6: units.points Derivation at Save Time

The CONTEXT.md decision is: when tiers exist, `units.points` becomes the "derived/read-only" effective value. The cleanest implementation: when the user sets an active tier (either from PlaybookTab or army list row), fire `useUpdateUnit` with `{ id: unitId, points: tier.points }`. This keeps the existing `COALESCE(alu.points_override, u.points, 0)` pattern in `getArmyListWithUnits` working without any SQL changes. No new JOIN column needed on `army_list_units`.

**Critical:** This means `units.points` is overwritten to the tier's points value when a tier is activated. The UnitSheet form should detect `hasTiers` and render the points field as read-only (disabled Input) in that case.

### Anti-Patterns to Avoid

- **Adding a `active_tier_id` FK to units table:** Unnecessary — the tier's points are written directly to `units.points` on activation. Adds complexity without benefit.
- **Computing delta in SQL:** Wasteful round-trip for a purely visual preview. All tier/loadout data is already in client memory.
- **Wrapping two-step activation in a Rust command:** The two-step approach works at the JS layer; no new Rust commands needed.
- **Nesting the loadout picker Dialog inside PlaybookTab's Sheet:** Violates the sibling portal pattern. Any Dialog opened from PlaybookTab must be hoisted to CollectionPage (same pattern as `DatasheetImportDialog`).
- **Using UNIQUE partial index for is_active:** Not used elsewhere in codebase; prefer application-layer enforcement for consistency.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checkbox list for wargear | Custom checkbox component | shadcn `Checkbox` + `Label` | Already in project; consistent UX |
| Colored delta badge | Custom span with inline style | shadcn `Badge` with `variant` or className condition | `cn("text-green-600")` / `cn("text-red-600")` — matches design system |
| Tier table CRUD | Custom table | shadcn `Table` with inline edit row | Same pattern as ArmyListUnitRow inline edit |
| Active loadout "radio" behavior | Complex radio group state | Two-step `activateLoadout` mutation + `is_active` column | Simpler than a form radio group with separate save button |
| Cross-DB join (hobbyforge + rules) | SQL ATTACH | Client-side merge in React (query both, join in JS) | Project pattern — `getFullDatasheet` reads rules.db, unit loadout reads hobbyforge.db; merge in component |

**Key insight:** The project never does cross-DB SQL joins — each DB has its own client singleton, and data from both is merged in the React hook/component layer. The LoadoutSection must follow this: fetch `useUnitLoadouts(unitId)` from hobbyforge.db and `useDatasheet(unitId)` from rules.db separately, then merge the wargear options in the component.

---

## Common Pitfalls

### Pitfall 1: Breaking the COALESCE Point Chain

**What goes wrong:** If the new tier system writes to a column other than `units.points`, or introduces a separate `active_tier_points` column, the existing `COALESCE(alu.points_override, u.points, 0)` in `getArmyListWithUnits` and `getArmyListReadiness` returns the wrong value without any SQL errors.

**Why it happens:** Two sources of truth for effective points.

**How to avoid:** Write tier-activated points directly to `units.points` via `useUpdateUnit`. The COALESCE chain is unchanged.

**Warning signs:** Army list total no longer matches the sum of visible point values; `ArmyListReadiness` query returns stale data.

### Pitfall 2: updateArmyListUnit Full-Replacement Contract

**What goes wrong:** If ArmyListUnitRow calls `updateArmyListUnit` to confirm a tier swap but only passes `points_override` without the current `notes`, the notes field is wiped to null.

**Why it happens:** `updateArmyListUnit` is a full-replacement UPDATE (`SET points_override=$2, notes=$3`) — not COALESCE. This is documented in `armyLists.ts` comments.

**How to avoid:** Always pass both `points_override` AND `notes` when calling `useUpdateArmyListUnit`. Read the current `unit.notes` from the row prop.

**Warning signs:** Unit notes disappearing after confirming a tier change from the army list.

### Pitfall 3: Stale Wargear Options After rules.db Sync

**What goes wrong:** The user syncs rules.db, which updates wargear names. Saved `unit_loadout_wargear.weapon_name` strings are now stale (old name no longer matches any `rw_datasheets_wargear.name`).

**Why it happens:** `weapon_name` is stored as a denormalized TEXT copy, not a FK into rules.db.

**How to avoid:** This is a known and accepted tradeoff (cross-DB FK impossible). Surface a warning badge in the LoadoutSection when saved weapon names no longer appear in the current `getFullDatasheet` wargear list (set difference check in JS). The user can manually remove stale entries.

**Warning signs:** Wargear checkbox appears unchecked even though user previously selected it.

### Pitfall 4: Radix Portal Nesting for Loadout Picker

**What goes wrong:** If a Dialog (loadout name input or wargear picker) is rendered inside PlaybookTab, which is itself inside a Sheet, Radix UI will nest two portals, causing focus trapping and z-index issues.

**Why it happens:** PlaybookTab is rendered inside the UnitDetailSheet Sheet.

**How to avoid:** Any Dialog opened from the LoadoutSection must follow the `DatasheetImportDialog` pattern — hoist the open/close state to `CollectionPage`, pass it down as props. The Dialog itself is a sibling of the Sheet in the DOM tree.

**Warning signs:** Clicking outside the inner Dialog closes the outer Sheet; keyboard focus escapes unexpectedly.

### Pitfall 5: delta Badge During isPending State

**What goes wrong:** The delta badge shows "+20" but the mutation has already fired and invalidated the query — the badge persists briefly showing an incorrect delta against the new baseline.

**Why it happens:** React Query invalidation is async; `effective_points` doesn't update until the refetch resolves.

**How to avoid:** Reset `pendingTierId`/`pendingLoadoutId` to null in `onSuccess` of the mutation. The badge only shows when pending state is non-null, so clearing it immediately hides the badge before the refetch completes.

### Pitfall 6: UNIQUE Constraint on (unit_id, model_count)

**What goes wrong:** User tries to add a second tier for the same model count (e.g., 10 models at 160pts, then edits to 10 models at 180pts via a new insert). SQLite throws a UNIQUE constraint violation.

**Why it happens:** `UNIQUE(unit_id, model_count)` is enforced at DB level.

**How to avoid:** The tier CRUD must use an UPDATE (not INSERT) when the model_count already exists. Use `INSERT OR REPLACE` or check before inserting. Prefer `INSERT OR REPLACE INTO unit_point_tiers (unit_id, model_count, points)` to handle both insert and update atomically.

---

## Code Examples

Verified patterns from codebase:

### Query key factory (mirrors useStrategyNote)
```typescript
// src/hooks/useUnitLoadouts.ts
export const UNIT_LOADOUTS_KEY = (unitId: number) => ["unit-loadouts", unitId] as const;
export const UNIT_POINT_TIERS_KEY = (unitId: number) => ["unit-point-tiers", unitId] as const;
```

### INSERT OR REPLACE for tier upsert
```typescript
// src/db/queries/unitPointTiers.ts
export async function upsertUnitPointTier(input: {
  unit_id: number;
  model_count: number;
  points: number;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO unit_point_tiers (unit_id, model_count, points)
     VALUES ($1, $2, $3)`,
    [input.unit_id, input.model_count, input.points]
  );
}
```
Source: SQLite `INSERT OR REPLACE` — handles UNIQUE(unit_id, model_count) constraint cleanly.

### Wargear checkbox grouping (conceptual)
```typescript
// LoadoutSection.tsx — group wargear by line for checkbox display
const wargearGroups = useMemo(() => {
  const groups: Map<number, RwDatasheetWargear[]> = new Map();
  for (const w of datasheet?.wargear ?? []) {
    if (!groups.has(w.line)) groups.set(w.line, []);
    groups.get(w.line)!.push(w);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b);
}, [datasheet?.wargear]);
```
Source: PlaybookTab.tsx ranged/melee split pattern, `rw_datasheets_wargear` schema.

### Delta badge rendering
```typescript
// ArmyListUnitRow.tsx delta badge (conceptual)
{delta !== 0 && (
  <Badge
    variant="outline"
    className={delta > 0 ? "text-destructive border-destructive" : "text-green-600 border-green-600"}
  >
    {delta > 0 ? `+${delta}` : `${delta}`}
  </Badge>
)}
```
Source: shadcn Badge usage pattern from ArmyListDetailSheet.tsx; sign convention: adding points costs more (red), removing points saves (green).

### Active tier derivation for units.points
```typescript
// When user confirms a tier selection:
await updateUnit.mutateAsync({
  id: unitId,
  points: selectedTier.points,   // writes to units.points — feeds COALESCE chain
});
// Then clear the pending state:
setPendingTierId(null);
```
Source: `useUpdateUnit` hook pattern from `src/hooks/useUnits.ts`; COALESCE chain from `getArmyListWithUnits`.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Single `units.points` integer | `unit_point_tiers` table with UNIQUE(unit_id, model_count) | Tiers are additive; simple mode still works via fallback |
| No named loadout concept | `unit_loadouts` + `unit_loadout_wargear` tables | One active loadout per unit (global, not per-list — see Open Questions) |
| Points override only in army list | Tier-derived `units.points` + `points_override` override on top | Full-replacement UPDATE contract on army_list_units unchanged |

---

## Open Questions

1. **Is "active loadout" per-unit global or per-army-list?**
   - What we know: CONTEXT.md leaves this to Claude's discretion. The `unit_loadouts.is_active` column approach is global (one active per unit across all army lists).
   - What's unclear: Whether users want different wargear loadouts in different army lists for the same unit.
   - Recommendation: Ship as global (simpler, one `is_active` per unit). A per-list approach would require a `army_list_unit_loadout_id` FK on `army_list_units`, adding a third table join to the existing `getArmyListWithUnits` query. Defer per-list loadouts to a future phase if requested.

2. **Delta preview triggers tier-level or loadout-level confirm for units.points write?**
   - What we know: The confirmed decisions say the delta triggers from "changing model count tier selection OR swapping between saved loadouts." The confirm path for tiers naturally writes `units.points = tier.points`. Swapping loadouts only changes which wargear is selected — loadouts do not themselves carry a points value.
   - What's unclear: Does swapping a loadout also change effective points (since different wargear can affect points brackets in real WH40k)?
   - Recommendation: Loadout swaps are purely cosmetic in this phase (they select which wargear is tracked, not a separate points value). The delta preview in the army list row is primarily tier-driven. Loadout swaps show the active loadout name in the row but do not change `effective_points`.

3. **Should `units.points` UnitSheet field become read-only when tiers exist?**
   - What we know: CONTEXT.md says "becomes read-only derived value when tiers exist; editable as fallback when no tiers defined."
   - Recommendation: Detect `hasTiers = tiers.length > 0` and disable the points Input in UnitSheet with a tooltip "Managed by point tiers." Requires `useUnitPointTiers(unit.id)` to be called in UnitSheet — add it.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (jsdom environment) |
| Quick run command | `pnpm test -- tests/collection/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

Phase 24 has no formal requirement IDs assigned. Derived from CONTEXT.md decisions:

| Derived Req | Behavior | Test Type | Automated Command | File Exists? |
|-------------|----------|-----------|-------------------|-------------|
| TIER-01 | `upsertUnitPointTier` inserts tier row with correct unit_id/model_count/points | unit | `pnpm test -- tests/collection/unitPointTierQueries.test.ts -x` | ❌ Wave 0 |
| TIER-02 | `getUnitPointTiers` returns rows sorted by model_count ASC | unit | `pnpm test -- tests/collection/unitPointTierQueries.test.ts -x` | ❌ Wave 0 |
| TIER-03 | `deleteUnitPointTier` removes the correct row | unit | `pnpm test -- tests/collection/unitPointTierQueries.test.ts -x` | ❌ Wave 0 |
| LOAD-01 | `getUnitLoadouts` returns all loadouts for a unit including wargear | unit | `pnpm test -- tests/collection/unitLoadoutQueries.test.ts -x` | ❌ Wave 0 |
| LOAD-02 | `activateLoadout` sets is_active=1 on target and 0 on all others for same unit | unit | `pnpm test -- tests/collection/unitLoadoutQueries.test.ts -x` | ❌ Wave 0 |
| LOAD-03 | `createLoadout` and `deleteLoadout` round-trip | unit | `pnpm test -- tests/collection/unitLoadoutQueries.test.ts -x` | ❌ Wave 0 |
| DELTA-01 | Delta computation: candidatePoints - effective_points correct for positive and negative cases | unit | `pnpm test -- tests/army-list/deltaPreview.test.ts -x` | ❌ Wave 0 |
| COALESCE-01 | getArmyListWithUnits still returns COALESCE(points_override, u.points, 0) unchanged | unit (existing) | `pnpm test -- tests/army-list/armyListQueries.test.ts -x` | ✅ existing |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/collection/ tests/army-list/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/collection/unitPointTierQueries.test.ts` — covers TIER-01, TIER-02, TIER-03
- [ ] `tests/collection/unitLoadoutQueries.test.ts` — covers LOAD-01, LOAD-02, LOAD-03
- [ ] `tests/army-list/deltaPreview.test.ts` — covers DELTA-01 (pure function test, no DB mock needed if delta is extracted to a `computeDelta` utility)

*(No framework install gaps — Vitest and RTL already present)*

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src-tauri/migrations/001_core_schema.sql` — units, army_list_units, unit_strategy_notes schema; COALESCE pattern and FK conventions confirmed
- Codebase: `src/db/queries/armyLists.ts` — `COALESCE(alu.points_override, u.points, 0)` contract, full-replacement UPDATE contract
- Codebase: `src/features/army-lists/ArmyListUnitRow.tsx` — full-replacement pitfall documented in comments
- Codebase: `src/features/units/PlaybookTab.tsx` — wargear grouping by line/type, Radix portal pattern, sibling portal hoist
- Codebase: `src-tauri/migrations/rules_002_wargear_abilities.sql` — `rw_datasheets_wargear` schema (datasheet_id, line, line_in_wargear, name, type)
- Codebase: `src/types/datasheet.ts` — `RwDatasheetWargear` interface confirmed; `FullDatasheet.wargear` array
- Codebase: `src/hooks/useStrategyNote.ts` — canonical per-unit hook pattern
- Codebase: `src/hooks/useArmyLists.ts` — cache invalidation patterns, `UpdateArmyListUnitVariables` shape

### Secondary (MEDIUM confidence)
- SQLite documentation: `INSERT OR REPLACE` for UNIQUE constraint upsert — standard SQLite behavior, widely verified
- tauri-plugin-sql behavior: no transaction API via JS `db.execute` — inferred from absence of transaction usage in all 8 hobbyforge.db migrations and query files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries confirmed present
- Schema design: HIGH — follows existing migration patterns exactly; three tables, clear FK chain
- Architecture patterns: HIGH — all patterns derived from existing codebase code, not assumptions
- Delta preview: HIGH — client-side arithmetic, no new SQL needed
- Pitfalls: HIGH — all derived from documented comments and existing code contracts
- Open questions: MEDIUM — discretion items flagged, recommendations made

**Research date:** 2026-05-05
**Valid until:** 2026-08-05 (stable stack — 90 days)
